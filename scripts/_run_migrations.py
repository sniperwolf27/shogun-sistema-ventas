"""
Ejecutor de migraciones SQL contra Supabase.
Uso: python scripts/_run_migrations.py

Parser aware de dollar-quoting ($$) para no romper funciones PL/pgSQL.
"""
import sys, os, re

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import psycopg2

DB_URL = (
    "postgresql://postgres.namjhrpumgywarhjxjxx:"
    "opiTZPycouTpR02d@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
)

# (label, ruta, autocommit_global)
# autocommit se fuerza True para archivos que usan CREATE INDEX CONCURRENTLY.
MIGRATIONS = [
    ("v3 - Indices de rendimiento",          "scripts/migration_v3_indexes.sql",            True),
    ("v4 - Tabla configuracion",             "scripts/migration_v4_configuracion.sql",       False),
    ("v5 - Tabla clientes",                  "scripts/migration_v5_clientes.sql",            False),
    ("v6 - Tabla grupos_pedido",             "scripts/migration_v6_grupos_pedido.sql",       False),
    ("v7 - Columnas GENERATED en productos", "scripts/migration_v7_productos_generated.sql", False),
    ("v8 - Rename y constraints",            "scripts/migration_v8_constraints_rename.sql",  False),
]

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def split_statements(sql: str) -> list[str]:
    """
    Divide SQL en sentencias individuales respetando:
      - Bloques dollar-quoted ($$...$$, $BODY$...$BODY$)
      - Comentarios de linea (--)
      - Comentarios de bloque (/* ... */)
    """
    statements = []
    current: list[str] = []
    i = 0
    n = len(sql)
    dollar_tag = None  # si estamos dentro de un bloque $$

    while i < n:
        # Dentro de dollar-quote: buscar cierre del tag
        if dollar_tag is not None:
            end = sql.find(dollar_tag, i)
            if end == -1:
                current.append(sql[i:])
                i = n
            else:
                end_pos = end + len(dollar_tag)
                current.append(sql[i:end_pos])
                i = end_pos
                dollar_tag = None
            continue

        # Comentario de línea
        if sql[i:i+2] == '--':
            end = sql.find('\n', i)
            if end == -1:
                i = n
            else:
                i = end + 1
            continue

        # Comentario de bloque
        if sql[i:i+2] == '/*':
            end = sql.find('*/', i+2)
            if end == -1:
                i = n
            else:
                i = end + 2
            continue

        # Inicio de dollar-quote: buscar tag $...$
        if sql[i] == '$':
            m = re.match(r'\$([A-Za-z_]*)\$', sql[i:])
            if m:
                tag = m.group(0)
                current.append(sql[i:i+len(tag)])
                i += len(tag)
                dollar_tag = tag
                continue

        # Fin de sentencia
        if sql[i] == ';':
            stmt = ''.join(current).strip()
            if stmt:
                statements.append(stmt)
            current = []
            i += 1
            continue

        current.append(sql[i])
        i += 1

    # Resto sin ; final
    stmt = ''.join(current).strip()
    if stmt:
        statements.append(stmt)

    return statements


def run_migration(label, rel_path, global_autocommit):
    sql_path = os.path.join(BASE_DIR, rel_path)
    print(f"\n{'='*64}")
    print(f"  {label}")
    print(f"  {rel_path}")
    print(f"{'='*64}")

    with open(sql_path, encoding='utf-8') as f:
        raw = f.read()

    statements = split_statements(raw)

    # Determinar qué sentencias necesitan autocommit=True (CONCURRENTLY)
    ok = skip = 0
    errs = []

    conn = psycopg2.connect(DB_URL)

    for stmt in statements:
        if not stmt:
            continue

        needs_autocommit = global_autocommit or 'CONCURRENTLY' in stmt.upper()
        preview = stmt.replace('\n', ' ')[:72]

        conn.autocommit = needs_autocommit

        try:
            with conn.cursor() as cur:
                cur.execute(stmt)
            if not needs_autocommit:
                conn.commit()
            print(f"  OK    {preview}")
            ok += 1

        except psycopg2.errors.DuplicateTable:
            if not needs_autocommit:
                conn.rollback()
            print(f"  SKIP  (tabla ya existe)          {preview[:45]}")
            skip += 1
        except psycopg2.errors.DuplicateObject:
            if not needs_autocommit:
                conn.rollback()
            print(f"  SKIP  (objeto ya existe)         {preview[:45]}")
            skip += 1
        except psycopg2.errors.UndefinedTable as e:
            if not needs_autocommit:
                conn.rollback()
            print(f"  SKIP  (tabla no existe aun)      {preview[:45]}")
            print(f"        {str(e).strip()[:80]}")
            skip += 1
        except psycopg2.errors.InvalidTableDefinition as e:
            if not needs_autocommit:
                conn.rollback()
            print(f"  SKIP  (def invalida / ya GENERATED) {preview[:40]}")
            print(f"        {str(e).strip()[:80]}")
            skip += 1
        except Exception as e:
            if not needs_autocommit:
                try:
                    conn.rollback()
                except Exception:
                    pass
            msg = str(e).strip().replace('\n', ' ')
            print(f"  ERR   {preview[:60]}")
            print(f"        {msg[:100]}")
            errs.append((preview, msg))

    conn.close()
    print(f"\n  Resultado: {ok} OK | {skip} skipped | {len(errs)} errores")
    return ok, skip, errs


if __name__ == '__main__':
    total_ok = total_skip = total_err = 0
    for args in MIGRATIONS:
        ok, skip, errs = run_migration(*args)
        total_ok  += ok
        total_skip += skip
        total_err  += len(errs)

    print(f"\n{'='*64}")
    print(f"  TOTAL: {total_ok} OK | {total_skip} skipped | {total_err} errores")
    print(f"{'='*64}")
    sys.exit(0 if total_err == 0 else 1)
