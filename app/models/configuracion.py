"""
Repository — Configuración del sistema
=======================================
Tabla key-value que centraliza parámetros de negocio que antes estaban
hardcodeados en el código (magic numbers).

Funciona con graceful fallback: si la tabla aún no existe (migración pendiente)
o si una clave no se encuentra, devuelve el valor por defecto definido en
DEFAULTS.  Esto garantiza que el sistema no rompe antes de ejecutar la
migración v4.

Uso:
    from app.models.configuracion import ConfiguracionRepository as Cfg

    envio = Cfg.get('envio_costo_default', float)   # → 200.0
    margen = Cfg.get('personalizacion_margen_fijo', float)  # → 0.5
"""
from app.models.db_manager import DatabaseManager


class ConfiguracionRepository:

    # Valores de fallback — se usan cuando la tabla no existe todavía
    # o cuando la clave no está en la tabla.
    DEFAULTS: dict[str, str] = {
        'envio_costo_default':              '200',
        'personalizacion_margen_fijo':      '0.5',
        'dias_produccion_default':          '7',
        'cliente_vip_min_pedidos':          '10',
        'cliente_frecuente_min_pedidos':    '5',
    }

    # Cache en memoria para el proceso actual.
    # Se invalida manualmente al hacer PUT en la tabla.
    _cache: dict[str, str] = {}

    # ── Lectura ─────────────────────────────────────────────────────────────

    @classmethod
    def get(cls, clave: str, as_type=str):
        """
        Devuelve el valor de 'clave' convertido a as_type.
        Prioridad: cache → DB → DEFAULTS.
        Nunca lanza excepción; ante cualquier error retorna el default.
        """
        if clave not in cls._cache:
            cls._cache[clave] = cls._fetch_from_db(clave)

        raw = cls._cache.get(clave) or cls.DEFAULTS.get(clave)
        if raw is None:
            return None
        try:
            return as_type(raw)
        except (ValueError, TypeError):
            return raw

    @classmethod
    def _fetch_from_db(cls, clave: str) -> str | None:
        try:
            with DatabaseManager.get_cursor() as cursor:
                cursor.execute(
                    "SELECT valor FROM configuracion WHERE clave = %s",
                    (clave,)
                )
                row = cursor.fetchone()
                return row['valor'] if row else cls.DEFAULTS.get(clave)
        except Exception:
            # Tabla aún no existe (migración pendiente) — usar default
            return cls.DEFAULTS.get(clave)

    @classmethod
    def get_all(cls) -> list[dict]:
        """Devuelve todas las claves de configuración (admin backoffice)."""
        try:
            with DatabaseManager.get_cursor() as cursor:
                cursor.execute(
                    "SELECT clave, valor, descripcion, updated_at "
                    "FROM configuracion ORDER BY clave"
                )
                rows = []
                for row in cursor.fetchall():
                    r = dict(row)
                    if r.get('updated_at') and hasattr(r['updated_at'], 'isoformat'):
                        r['updated_at'] = r['updated_at'].isoformat()
                    rows.append(r)
                return rows
        except Exception:
            # Fallback: devuelve los defaults como si fueran filas de DB
            return [
                {'clave': k, 'valor': v, 'descripcion': None, 'updated_at': None}
                for k, v in cls.DEFAULTS.items()
            ]

    # ── Escritura ────────────────────────────────────────────────────────────

    @classmethod
    def set(cls, clave: str, valor: str) -> bool:
        """
        Inserta o actualiza una clave de configuración.
        Invalida el cache para esa clave.
        """
        try:
            with DatabaseManager.get_cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO configuracion (clave, valor, updated_at)
                    VALUES (%(clave)s, %(valor)s, now())
                    ON CONFLICT (clave) DO UPDATE
                        SET valor = EXCLUDED.valor,
                            updated_at = now()
                    """,
                    {'clave': clave, 'valor': str(valor)}
                )
            cls.invalidate(clave)
            return True
        except Exception as e:
            print(f"[CONFIG] Error al guardar {clave}: {e}")
            return False

    # ── Cache ────────────────────────────────────────────────────────────────

    @classmethod
    def invalidate(cls, clave: str | None = None) -> None:
        """Borra el cache de una clave específica o de todas."""
        if clave:
            cls._cache.pop(clave, None)
        else:
            cls._cache.clear()
