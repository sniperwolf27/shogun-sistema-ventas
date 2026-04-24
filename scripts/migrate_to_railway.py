"""
migrate_to_railway.py -- Migracion total Supabase -> Railway PostgreSQL

Uso:
    python scripts/migrate_to_railway.py

Variables de entorno (o editarlas aqui abajo):
    SOURCE_DATABASE_URL  -- URL de Supabase (origen)
    DEST_DATABASE_URL    -- URL de Railway  (destino)
    TEMP_PASSWORD        -- contrasena temporal para todos los usuarios migrados
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import psycopg2
import psycopg2.extras
from datetime import datetime
import bcrypt

# -- Configuracion -----------------------------------------------------------
SOURCE_URL = os.environ.get('SOURCE_DATABASE_URL', '')
DEST_URL = os.environ.get('DEST_DATABASE_URL', '')
TEMP_PASSWORD = os.environ.get('TEMP_PASSWORD', 'Shogun2026!')


def log(msg): print(f"  {msg}")
def section(title): print(f"\n{'='*60}\n  {title}\n{'='*60}")


# -- Conectar ----------------------------------------------------------------
def connect(url, label):
    section(f"Conectando a {label}")
    conn = psycopg2.connect(url)
    conn.autocommit = False
    log(f"[OK] Conexion a {label} exitosa")
    return conn


# -- Leer ENUMs desde Supabase -----------------------------------------------
def read_enums(src_conn):
    section("Leyendo tipos ENUM desde Supabase")
    cur = src_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT t.typname AS enum_name,
               e.enumlabel AS enum_value
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        ORDER BY t.typname, e.enumsortorder
    """)
    rows = cur.fetchall()
    enums = {}
    for row in rows:
        enums.setdefault(row['enum_name'], []).append(row['enum_value'])
    for name, vals in enums.items():
        log(f"  ENUM {name}: {vals}")
    return enums


# -- Leer funciones desde Supabase -------------------------------------------
def read_functions(src_conn):
    section("Leyendo funciones desde Supabase")
    cur = src_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT p.proname AS func_name, pg_get_functiondef(p.oid) AS definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
    """)
    funcs = {row['func_name']: row['definition'] for row in cur.fetchall()}
    for name in sorted(funcs.keys()):
        log(f"  Funcion encontrada: {name}")
    return funcs


# -- Leer datos de una tabla -------------------------------------------------
def read_table(src_conn, table, order_by='created_at'):
    cur = src_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(f"SELECT * FROM {table} ORDER BY {order_by}")
    except Exception:
        cur.execute(f"SELECT * FROM {table}")
    rows = [dict(r) for r in cur.fetchall()]
    log(f"  {table}: {len(rows)} filas")
    return rows


# -- Limpiar schema existente en Railway -------------------------------------
def drop_existing_schema(dest_conn):
    section("Limpiando schema previo en Railway (si existe)")
    cur = dest_conn.cursor()
    # Drop en orden inverso de FK
    tables = [
        'pedido_historial', 'pedido_adjuntos', 'pedido_comentarios',
        'pedidos', 'grupos_pedido', 'productos', 'clientes',
        'personalizaciones', 'categorias_producto', 'configuracion', 'usuarios',
    ]
    for t in tables:
        cur.execute(f"DROP TABLE IF EXISTS {t} CASCADE;")
        log(f"  dropped {t}")
    # Drop ENUMs
    for e in ['canal_venta', 'metodo_pago', 'estado_pago', 'estado_produccion',
              'talla', 'categoria_producto']:
        cur.execute(f"DROP TYPE IF EXISTS {e} CASCADE;")
    # Drop functions
    for fn in ['set_updated_at', 'actualizar_updated_at', 'actualizar_usuarios_updated_at',
               'cfg_get', 'generar_numero_pedido', 'generar_grupo_pedido',
               'calcular_dias_retraso', 'calcular_totales_pedido', 'propagar_cambio_sku']:
        cur.execute(f"DROP FUNCTION IF EXISTS {fn} CASCADE;")
    dest_conn.commit()
    log("[OK] Schema previo eliminado")


# -- Crear schema en Railway -------------------------------------------------
def create_schema(dest_conn, enums, funcs):
    section("Creando schema en Railway")
    cur = dest_conn.cursor()

    # Extensiones
    log("Activando extensiones...")
    cur.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
    cur.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

    # ENUMs
    log("Creando tipos ENUM...")
    for enum_name, values in enums.items():
        vals_sql = ', '.join(f"'{v}'" for v in values)
        cur.execute(f"""
            DO $$ BEGIN
                CREATE TYPE {enum_name} AS ENUM ({vals_sql});
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """)
        log(f"  [OK] {enum_name}")

    # Funciones basicas (sin dependencia de tablas)
    log("Creando funciones de utilidad...")
    for fn in ['set_updated_at', 'actualizar_updated_at', 'actualizar_usuarios_updated_at']:
        if fn in funcs:
            cur.execute(funcs[fn])
            log(f"  [OK] {fn}")

    # Tabla configuracion (debe existir antes que cfg_get)
    log("Creando tabla configuracion...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS configuracion (
            clave       TEXT        PRIMARY KEY,
            valor       TEXT        NOT NULL,
            descripcion TEXT,
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    log("  [OK] configuracion")

    # cfg_get (requiere que configuracion exista)
    if 'cfg_get' in funcs:
        cur.execute(funcs['cfg_get'])
        log("  [OK] cfg_get")

    # categorias_producto (UUID PK, como en Supabase)
    log("Creando tabla categorias_producto...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS categorias_producto (
            id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
            nombre      TEXT        NOT NULL,
            codigo      VARCHAR(50),
            descripcion TEXT,
            activo      BOOLEAN     NOT NULL DEFAULT true,
            CONSTRAINT uq_categorias_nombre UNIQUE (nombre),
            CONSTRAINT uq_categorias_codigo UNIQUE (codigo)
        );
    """)
    log("  [OK] categorias_producto")

    # personalizaciones (UUID PK)
    log("Creando tabla personalizaciones...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS personalizaciones (
            id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
            codigo                 TEXT        NOT NULL,
            tipo                   TEXT        NOT NULL,
            descripcion            TEXT,
            precio                 NUMERIC(12, 2) DEFAULT 0,
            tiempo_adicional_dias  INTEGER     DEFAULT 0,
            metodo_calculo         TEXT        DEFAULT 'fijo',
            costo_por_mil_puntadas NUMERIC(12, 2) DEFAULT 0,
            activo                 BOOLEAN     NOT NULL DEFAULT true,
            created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_personalizaciones_codigo UNIQUE (codigo)
        );
    """)
    log("  [OK] personalizaciones")

    # clientes (BIGSERIAL PK, como en Supabase)
    log("Creando tabla clientes...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS clientes (
            id                BIGSERIAL   PRIMARY KEY,
            telefono          TEXT        NOT NULL,
            nombre            TEXT        NOT NULL,
            email             TEXT,
            direccion_default TEXT,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_clientes_telefono UNIQUE (telefono)
        );
    """)
    cur.execute("""
        DROP TRIGGER IF EXISTS trg_clientes_updated_at ON clientes;
        CREATE TRIGGER trg_clientes_updated_at
            BEFORE UPDATE ON clientes
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)
    log("  [OK] clientes")

    # grupos_pedido (TEXT PK)
    log("Creando tabla grupos_pedido...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS grupos_pedido (
            id           TEXT        PRIMARY KEY,
            cliente_id   BIGINT      REFERENCES clientes(id) ON UPDATE CASCADE,
            canal        canal_venta,
            metodo_pago  metodo_pago,
            estado_pago  estado_pago,
            precio_envio NUMERIC(12, 2) NOT NULL DEFAULT 0,
            costo_envio  NUMERIC(12, 2) NOT NULL DEFAULT 0,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_by   TEXT
        );
    """)
    log("  [OK] grupos_pedido")

    # productos (UUID PK, categoria_id UUID FK, columnas GENERATED)
    log("Creando tabla productos...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS productos (
            id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
            sku                    TEXT        NOT NULL UNIQUE,
            nombre                 TEXT        NOT NULL,
            categoria_id           UUID        REFERENCES categorias_producto(id) ON UPDATE CASCADE,
            precio_base            NUMERIC(12, 2) NOT NULL DEFAULT 0,
            costo_material         NUMERIC(12, 2) NOT NULL DEFAULT 0,
            costo_mano_obra        NUMERIC(12, 2) NOT NULL DEFAULT 0,
            costo_total            NUMERIC(12, 2) GENERATED ALWAYS AS (
                                       COALESCE(costo_material, 0) + COALESCE(costo_mano_obra, 0)
                                   ) STORED,
            margen_dinero          NUMERIC(12, 2) GENERATED ALWAYS AS (
                                       precio_base - (COALESCE(costo_material, 0) + COALESCE(costo_mano_obra, 0))
                                   ) STORED,
            margen_porcentaje      NUMERIC(8, 4)  GENERATED ALWAYS AS (
                                       CASE WHEN precio_base > 0 THEN
                                           (precio_base - (COALESCE(costo_material, 0) + COALESCE(costo_mano_obra, 0)))
                                           / precio_base * 100
                                       ELSE 0 END
                                   ) STORED,
            tiempo_produccion_dias INTEGER     NOT NULL DEFAULT 7,
            activo                 BOOLEAN     NOT NULL DEFAULT true,
            created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    cur.execute("""
        DROP TRIGGER IF EXISTS trg_productos_updated_at ON productos;
        CREATE TRIGGER trg_productos_updated_at
            BEFORE UPDATE ON productos
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)
    if 'propagar_cambio_sku' in funcs:
        cur.execute(funcs['propagar_cambio_sku'])
        cur.execute("""
            DROP TRIGGER IF EXISTS trg_propagar_sku ON productos;
            CREATE TRIGGER trg_propagar_sku
                BEFORE UPDATE ON productos
                FOR EACH ROW EXECUTE FUNCTION propagar_cambio_sku();
        """)
    log("  [OK] productos")

    # Funciones para pedidos
    if 'generar_numero_pedido' in funcs:
        cur.execute(funcs['generar_numero_pedido'])
        log("  [OK] generar_numero_pedido (desde Supabase)")
    else:
        cur.execute("""
            CREATE OR REPLACE FUNCTION generar_numero_pedido()
            RETURNS TRIGGER LANGUAGE plpgsql AS $$
            DECLARE
                ultimo_numero INTEGER;
            BEGIN
                IF NEW.numero_pedido IS NOT NULL THEN
                    RETURN NEW;
                END IF;
                SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM 2) AS INTEGER)), 0)
                INTO ultimo_numero FROM pedidos WHERE numero_pedido ~ '^P[0-9]+$';
                NEW.numero_pedido := 'P' || LPAD((ultimo_numero + 1)::TEXT, 4, '0');
                RETURN NEW;
            END;
            $$;
        """)
        log("  [OK] generar_numero_pedido (nueva)")

    if 'generar_grupo_pedido' in funcs:
        cur.execute(funcs['generar_grupo_pedido'])
        log("  [OK] generar_grupo_pedido (desde Supabase)")

    if 'calcular_dias_retraso' in funcs:
        cur.execute(funcs['calcular_dias_retraso'])
        log("  [OK] calcular_dias_retraso (desde Supabase)")
    else:
        cur.execute("""
            CREATE OR REPLACE FUNCTION calcular_dias_retraso()
            RETURNS TRIGGER LANGUAGE plpgsql AS $$
            BEGIN
                IF NEW.fecha_entrega_real IS NOT NULL THEN
                    NEW.dias_retraso = GREATEST(0, NEW.fecha_entrega_real - NEW.fecha_compromiso);
                ELSIF NEW.fecha_compromiso IS NOT NULL AND CURRENT_DATE > NEW.fecha_compromiso THEN
                    NEW.dias_retraso = (CURRENT_DATE - NEW.fecha_compromiso);
                ELSE
                    NEW.dias_retraso = 0;
                END IF;
                RETURN NEW;
            END;
            $$;
        """)
        log("  [OK] calcular_dias_retraso (nueva)")

    # Trigger de precio_total/ganancia (no existe en Supabase como funcion separada)
    cur.execute("""
        CREATE OR REPLACE FUNCTION calcular_totales_pedido()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            NEW.precio_total :=
                COALESCE(NEW.precio_producto, 0)
                + COALESCE(NEW.precio_personalizacion, 0)
                + COALESCE(NEW.precio_envio, 0);
            NEW.costo_total :=
                COALESCE(NEW.costo_producto, 0)
                + COALESCE(NEW.costo_personalizacion, 0)
                + COALESCE(NEW.costo_mano_obra, 0)
                + COALESCE(NEW.costos_adicionales, 0)
                + COALESCE(NEW.costo_envio, 0);
            NEW.ganancia := NEW.precio_total - NEW.costo_total;
            RETURN NEW;
        END;
        $$;
    """)
    log("  [OK] calcular_totales_pedido")

    # pedidos (UUID PK, numero_pedido UNIQUE)
    log("Creando tabla pedidos...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS pedidos (
            id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
            numero_pedido          VARCHAR(50) UNIQUE,
            cliente_nombre         TEXT        NOT NULL,
            cliente_telefono       TEXT        NOT NULL,
            cliente_email          TEXT,
            direccion_envio        TEXT,
            cliente_id             BIGINT      REFERENCES clientes(id) ON UPDATE CASCADE,
            producto_id            UUID        REFERENCES productos(id),
            producto_sku           TEXT        NOT NULL,
            producto_nombre        TEXT        NOT NULL,
            talla_seleccionada     talla,
            color                  VARCHAR(50),
            personalizacion_id     UUID        REFERENCES personalizaciones(id),
            personalizacion_codigo TEXT,
            personalizacion_detalles TEXT,
            personalizacion_puntadas INTEGER   DEFAULT 0,
            fecha_pago             DATE        NOT NULL DEFAULT CURRENT_DATE,
            fecha_compromiso       DATE,
            fecha_entrega_real     DATE,
            precio_producto        NUMERIC(12, 2) DEFAULT 0,
            precio_personalizacion NUMERIC(12, 2) DEFAULT 0,
            precio_envio           NUMERIC(12, 2) DEFAULT 200,
            precio_total           NUMERIC(12, 2) DEFAULT 0,
            costo_producto         NUMERIC(12, 2) DEFAULT 0,
            costo_personalizacion  NUMERIC(12, 2) DEFAULT 0,
            dias_produccion        INTEGER,
            dias_retraso           INTEGER     DEFAULT 0,
            canal                  canal_venta,
            metodo_pago            metodo_pago,
            estado_produccion      estado_produccion DEFAULT 'Recibido',
            estado_pago            estado_pago DEFAULT 'Recibido',
            created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            costo_mano_obra        NUMERIC(12, 2) DEFAULT 0,
            costos_adicionales     NUMERIC(12, 2) DEFAULT 0,
            grupo_pedido           TEXT        REFERENCES grupos_pedido(id) ON DELETE SET NULL,
            costo_envio            NUMERIC(12, 2) DEFAULT 0,
            costo_total            NUMERIC(12, 2) DEFAULT 0,
            ganancia               NUMERIC(12, 2) DEFAULT 0
        );
    """)
    cur.execute("""
        DROP TRIGGER IF EXISTS trigger_generar_numero_pedido ON pedidos;
        CREATE TRIGGER trigger_generar_numero_pedido
            BEFORE INSERT ON pedidos
            FOR EACH ROW EXECUTE FUNCTION generar_numero_pedido();

        DROP TRIGGER IF EXISTS trigger_calcular_dias_retraso ON pedidos;
        CREATE TRIGGER trigger_calcular_dias_retraso
            BEFORE INSERT OR UPDATE ON pedidos
            FOR EACH ROW EXECUTE FUNCTION calcular_dias_retraso();

        DROP TRIGGER IF EXISTS trigger_pedidos_updated_at ON pedidos;
        CREATE TRIGGER trigger_pedidos_updated_at
            BEFORE UPDATE ON pedidos
            FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

        DROP TRIGGER IF EXISTS trg_pedidos_totales ON pedidos;
        CREATE TRIGGER trg_pedidos_totales
            BEFORE INSERT OR UPDATE ON pedidos
            FOR EACH ROW EXECUTE FUNCTION calcular_totales_pedido();
    """)
    log("  [OK] pedidos + triggers")

    # pedido_comentarios (UUID PK)
    log("Creando tabla pedido_comentarios...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS pedido_comentarios (
            id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
            pedido_numero  TEXT        NOT NULL,
            autor_email    TEXT,
            autor_nombre   TEXT,
            texto          TEXT        NOT NULL,
            created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    log("  [OK] pedido_comentarios")

    # pedido_adjuntos (UUID PK)
    log("Creando tabla pedido_adjuntos...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS pedido_adjuntos (
            id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
            pedido_numero    TEXT        NOT NULL,
            nombre_original  TEXT        NOT NULL,
            nombre_archivo   TEXT        NOT NULL,
            tipo_mime        TEXT,
            tamano_bytes     BIGINT,
            storage_path     TEXT,
            subido_por_email TEXT,
            subido_por_nombre TEXT,
            created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    log("  [OK] pedido_adjuntos")

    # pedido_historial (UUID PK)
    log("Creando tabla pedido_historial...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS pedido_historial (
            id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
            pedido_numero   TEXT        NOT NULL,
            campo_cambiado  TEXT,
            valor_anterior  TEXT,
            valor_nuevo     TEXT,
            usuario_email   TEXT,
            usuario_nombre  TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    log("  [OK] pedido_historial")

    # usuarios (UUID PK + password_hash para auth propio)
    log("Creando tabla usuarios...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
            auth_user_id  UUID,
            email         TEXT        NOT NULL UNIQUE,
            nombre        TEXT        NOT NULL,
            rol           TEXT        NOT NULL DEFAULT 'vendedor',
            activo        BOOLEAN     NOT NULL DEFAULT true,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
            password_hash TEXT
        );
    """)
    if 'actualizar_usuarios_updated_at' in funcs:
        cur.execute("""
            DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
            CREATE TRIGGER trg_usuarios_updated_at
                BEFORE UPDATE ON usuarios
                FOR EACH ROW EXECUTE FUNCTION actualizar_usuarios_updated_at();
        """)
    log("  [OK] usuarios")

    dest_conn.commit()
    log("\n[OK] Schema creado correctamente")


# -- Crear indices -----------------------------------------------------------
def create_indexes(dest_conn):
    section("Creando indices")
    cur = dest_conn.cursor()
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_pedidos_estado_canal ON pedidos (estado_produccion, canal)",
        "CREATE INDEX IF NOT EXISTS idx_pedidos_activos_created ON pedidos (created_at DESC) WHERE estado_produccion NOT IN ('Entregado', 'Cancelado')",
        "CREATE INDEX IF NOT EXISTS idx_pedidos_telefono ON pedidos (cliente_telefono)",
        "CREATE INDEX IF NOT EXISTS idx_pedidos_sku ON pedidos (producto_sku)",
        "CREATE INDEX IF NOT EXISTS idx_pedidos_duplicado_check ON pedidos (cliente_telefono, producto_sku, talla_seleccionada, created_at DESC) WHERE estado_produccion NOT IN ('Entregado', 'Cancelado')",
        "CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_compromiso_activo ON pedidos (fecha_compromiso ASC) WHERE estado_produccion NOT IN ('Entregado', 'Cancelado') AND fecha_compromiso IS NOT NULL",
        "CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_pago ON pedidos (fecha_pago)",
        "CREATE INDEX IF NOT EXISTS idx_pedidos_grupo_pedido ON pedidos (grupo_pedido) WHERE grupo_pedido IS NOT NULL",
        "CREATE INDEX IF NOT EXISTS idx_pedidos_producto_nombre_sku ON pedidos (producto_nombre, producto_sku)",
        "CREATE INDEX IF NOT EXISTS idx_pedidos_created_at_date ON pedidos (created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos (cliente_id)",
        "CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_nombre_gin ON pedidos USING gin(to_tsvector('spanish', cliente_nombre))",
        "CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON pedidos (numero_pedido)",
        "CREATE INDEX IF NOT EXISTS idx_productos_categoria_activo ON productos (categoria_id) WHERE activo = true",
        "CREATE INDEX IF NOT EXISTS idx_clientes_nombre_gin ON clientes USING gin(to_tsvector('spanish', nombre))",
        "CREATE INDEX IF NOT EXISTS idx_comentarios_pedido_numero ON pedido_comentarios (pedido_numero)",
        "CREATE INDEX IF NOT EXISTS idx_adjuntos_pedido_numero ON pedido_adjuntos (pedido_numero)",
        "CREATE INDEX IF NOT EXISTS idx_historial_pedido_numero ON pedido_historial (pedido_numero)",
    ]
    for idx_sql in indexes:
        try:
            cur.execute(idx_sql)
            name = idx_sql.split('idx_')[1].split(' ')[0] if 'idx_' in idx_sql else '?'
            log(f"  [OK] {name}")
        except Exception as e:
            dest_conn.rollback()
            log(f"  [WARN] index error: {e}")
    dest_conn.commit()
    log("[OK] Indices creados")


# -- Insertar filas ----------------------------------------------------------
def insert_rows(dest_conn, table, rows, columns=None):
    if not rows:
        log(f"  {table}: 0 filas (saltando)")
        return
    cur = dest_conn.cursor()
    if columns is None:
        columns = list(rows[0].keys())

    placeholders = ', '.join(['%s'] * len(columns))
    col_list = ', '.join(f'"{c}"' for c in columns)
    query = f'INSERT INTO {table} ({col_list}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'

    values = [[row.get(c) for c in columns] for row in rows]
    try:
        psycopg2.extras.execute_batch(cur, query, values, page_size=500)
        dest_conn.commit()
        log(f"  [OK] {table}: {len(rows)} filas insertadas")
    except Exception as e:
        dest_conn.rollback()
        log(f"  [ERROR] {table}: {e}")
        raise


# -- Migrar datos en orden FK -----------------------------------------------
def migrate_data(src_conn, dest_conn, temp_password):
    section("Migrando datos")

    cur = dest_conn.cursor()

    # Deshabilitar triggers que recalculan para copiar datos exactos
    cur.execute("ALTER TABLE pedidos DISABLE TRIGGER trg_pedidos_totales;")
    cur.execute("ALTER TABLE pedidos DISABLE TRIGGER trigger_calcular_dias_retraso;")
    cur.execute("ALTER TABLE pedidos DISABLE TRIGGER trigger_generar_numero_pedido;")
    dest_conn.commit()

    # 1. configuracion
    rows = read_table(src_conn, 'configuracion', order_by='clave')
    insert_rows(dest_conn, 'configuracion', rows)

    # 2. categorias_producto (puede venir como categorias_producto_tabla si no se ejecuto v8)
    try:
        rows = read_table(src_conn, 'categorias_producto', order_by='id')
    except Exception:
        rows = read_table(src_conn, 'categorias_producto_tabla', order_by='id')
    insert_rows(dest_conn, 'categorias_producto', rows,
                columns=['id', 'nombre', 'codigo', 'descripcion', 'activo'])

    # 3. personalizaciones — excluir columnas que no existen en destino
    rows = read_table(src_conn, 'personalizaciones', order_by='id')
    pers_cols = ['id', 'codigo', 'tipo', 'descripcion', 'precio', 'tiempo_adicional_dias',
                 'metodo_calculo', 'costo_por_mil_puntadas', 'activo', 'created_at', 'updated_at']
    pers_cols = [c for c in pers_cols if rows and c in rows[0]]
    insert_rows(dest_conn, 'personalizaciones', rows, columns=pers_cols)

    # 4. clientes
    rows = read_table(src_conn, 'clientes', order_by='id')
    insert_rows(dest_conn, 'clientes', rows,
                columns=['id', 'telefono', 'nombre', 'email', 'direccion_default',
                         'created_at', 'updated_at'])

    # 5. grupos_pedido
    rows = read_table(src_conn, 'grupos_pedido', order_by='created_at')
    insert_rows(dest_conn, 'grupos_pedido', rows,
                columns=['id', 'cliente_id', 'canal', 'metodo_pago', 'estado_pago',
                         'precio_envio', 'costo_envio', 'created_at', 'created_by'])

    # 6. productos -- excluir columnas GENERATED
    rows = read_table(src_conn, 'productos', order_by='id')
    prod_cols = ['id', 'sku', 'nombre', 'categoria_id', 'precio_base',
                 'costo_material', 'costo_mano_obra', 'tiempo_produccion_dias',
                 'activo', 'created_at', 'updated_at']
    prod_cols = [c for c in prod_cols if rows and c in rows[0]]
    insert_rows(dest_conn, 'productos', rows, columns=prod_cols)

    # 7. pedidos -- copiar todos los campos calculados tal cual
    rows = read_table(src_conn, 'pedidos', order_by='created_at')
    pedido_cols = [
        'id', 'numero_pedido',
        'cliente_nombre', 'cliente_telefono', 'cliente_email', 'direccion_envio', 'cliente_id',
        'producto_id', 'producto_sku', 'producto_nombre',
        'talla_seleccionada', 'color',
        'personalizacion_id', 'personalizacion_codigo', 'personalizacion_detalles',
        'personalizacion_puntadas',
        'fecha_pago', 'fecha_compromiso', 'fecha_entrega_real',
        'dias_produccion', 'dias_retraso',
        'precio_producto', 'precio_personalizacion', 'precio_envio', 'precio_total',
        'costo_producto', 'costo_personalizacion', 'costo_mano_obra', 'costos_adicionales',
        'costo_envio', 'costo_total', 'ganancia',
        'canal', 'metodo_pago', 'estado_pago', 'estado_produccion',
        'grupo_pedido', 'created_at', 'updated_at',
    ]
    if rows:
        pedido_cols = [c for c in pedido_cols if c in rows[0]]
    insert_rows(dest_conn, 'pedidos', rows, columns=pedido_cols)

    # 8. pedido_comentarios
    rows = read_table(src_conn, 'pedido_comentarios', order_by='id')
    insert_rows(dest_conn, 'pedido_comentarios', rows,
                columns=['id', 'pedido_numero', 'autor_email', 'autor_nombre', 'texto', 'created_at'])

    # 9. pedido_adjuntos
    rows = read_table(src_conn, 'pedido_adjuntos', order_by='id')
    adj_cols = ['id', 'pedido_numero', 'nombre_original', 'nombre_archivo',
                'tipo_mime', 'tamano_bytes', 'storage_path',
                'subido_por_email', 'subido_por_nombre', 'created_at']
    adj_cols = [c for c in adj_cols if rows and c in rows[0]]
    insert_rows(dest_conn, 'pedido_adjuntos', rows, columns=adj_cols)

    # 10. pedido_historial
    rows = read_table(src_conn, 'pedido_historial', order_by='id')
    hist_cols = ['id', 'pedido_numero', 'campo_cambiado', 'valor_anterior',
                 'valor_nuevo', 'usuario_email', 'usuario_nombre', 'created_at']
    hist_cols = [c for c in hist_cols if rows and c in rows[0]]
    insert_rows(dest_conn, 'pedido_historial', rows, columns=hist_cols)

    # 11. usuarios -- migrar con contrasena temporal bcrypt
    section("Migrando usuarios (contrasena temporal)")
    src_cur = src_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    src_cur.execute("SELECT * FROM usuarios")
    usuarios_src = src_cur.fetchall()
    log(f"  Usuarios encontrados: {len(usuarios_src)}")

    pw_hash = bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    dest_cur = dest_conn.cursor()

    for u in usuarios_src:
        u = dict(u)
        dest_cur.execute("""
            INSERT INTO usuarios (id, auth_user_id, email, nombre, rol, activo, created_at, updated_at, password_hash)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (email) DO NOTHING
        """, (
            u.get('id'),
            u.get('auth_user_id'),
            u.get('email', ''),
            u.get('nombre', u.get('email', 'Usuario')),
            u.get('rol', 'vendedor'),
            u.get('activo', True),
            u.get('created_at'),
            u.get('updated_at'),
            pw_hash,
        ))
        log(f"  [OK] Usuario migrado: {u.get('email')} (rol: {u.get('rol')})")

    dest_conn.commit()

    # Re-habilitar triggers
    cur.execute("ALTER TABLE pedidos ENABLE TRIGGER trg_pedidos_totales;")
    cur.execute("ALTER TABLE pedidos ENABLE TRIGGER trigger_calcular_dias_retraso;")
    cur.execute("ALTER TABLE pedidos ENABLE TRIGGER trigger_generar_numero_pedido;")
    dest_conn.commit()


# -- Actualizar secuencias ---------------------------------------------------
def reset_sequences(dest_conn):
    section("Actualizando secuencias")
    cur = dest_conn.cursor()
    # Solo tablas con BIGSERIAL
    for table, col in [('clientes', 'id')]:
        cur.execute(f"""
            SELECT setval(
                pg_get_serial_sequence('{table}', '{col}'),
                COALESCE((SELECT MAX({col}) FROM {table}), 1),
                true
            )
        """)
        log(f"  [OK] {table}.{col}")
    dest_conn.commit()
    log("[OK] Secuencias actualizadas")


# -- Verificacion final -------------------------------------------------------
def verify_migration(dest_conn):
    section("Verificacion final")
    cur = dest_conn.cursor()
    tables = [
        'configuracion', 'categorias_producto', 'personalizaciones', 'clientes',
        'grupos_pedido', 'productos', 'pedidos', 'pedido_comentarios',
        'pedido_adjuntos', 'pedido_historial', 'usuarios'
    ]
    for t in tables:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        count = cur.fetchone()[0]
        log(f"  {t}: {count} filas")


# -- Main -------------------------------------------------------------------
def main():
    print("\n" + "="*60)
    print("  SHOGUN -- Migracion Supabase -> Railway PostgreSQL")
    print("="*60)
    print(f"\n  Origen : Supabase")
    print(f"  Destino : Railway")
    print(f"  Fecha   : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Contrasena temporal para usuarios: {TEMP_PASSWORD}")

    src_conn = None
    dest_conn = None

    try:
        src_conn = connect(SOURCE_URL, 'Supabase')
        dest_conn = connect(DEST_URL, 'Railway')

        enums = read_enums(src_conn)
        funcs = read_functions(src_conn)

        drop_existing_schema(dest_conn)
        create_schema(dest_conn, enums, funcs)
        create_indexes(dest_conn)
        migrate_data(src_conn, dest_conn, TEMP_PASSWORD)
        reset_sequences(dest_conn)
        verify_migration(dest_conn)

        print("\n" + "="*60)
        print("  [OK] MIGRACION COMPLETADA EXITOSAMENTE")
        print("="*60)
        print(f"\n  IMPORTANTE: Todos los usuarios fueron migrados con")
        print(f"  la contrasena temporal: {TEMP_PASSWORD}")
        print(f"  Cambiala desde el backoffice o directamente en la DB.")
        print(f"\n  Proximos pasos:")
        print(f"  1. Verificar que la app funciona con el nuevo DATABASE_URL")
        print(f"  2. Hacer login con la contrasena temporal y cambiarla")
        print(f"  3. (Opcional) Cancelar el proyecto en Supabase")
        print()

    except Exception as e:
        print(f"\n  [ERROR]: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        if src_conn: src_conn.close()
        if dest_conn: dest_conn.close()


if __name__ == '__main__':
    main()
