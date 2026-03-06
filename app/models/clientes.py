"""
Repository — Clientes
"""
from app.models.db_manager import DatabaseManager


class ClientesRepository:

    @staticmethod
    def get_all():
        query = """
            SELECT DISTINCT ON (cliente_telefono)
                cliente_telefono as telefono,
                cliente_nombre as nombre,
                cliente_email as email,
                MAX(created_at) OVER (PARTITION BY cliente_telefono) as ultimo_pedido
            FROM pedidos
            ORDER BY cliente_telefono, created_at DESC
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query)
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def search(q):
        """Search clients by phone or name — powers the autocomplete endpoint."""
        query = """
            SELECT DISTINCT ON (cliente_telefono)
                cliente_telefono as telefono,
                cliente_nombre as nombre,
                cliente_email as email,
                cliente_email as email,
                direccion_envio as direccion
            FROM pedidos
            WHERE cliente_telefono ILIKE %(q)s OR cliente_nombre ILIKE %(q)s
            ORDER BY cliente_telefono, created_at DESC
            LIMIT 10
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, {'q': f'%{q}%'})
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_profile(telefono):
        """Retrieve a client profile with aggregated stats and recent orders."""
        profile_query = """
            SELECT
                MAX(cliente_nombre) as nombre,
                MAX(cliente_email) as email,
                MAX(cliente_telefono) as telefono,
                COUNT(*) as pedidos,
                COALESCE(SUM(CASE WHEN estado_produccion NOT IN ('Cancelado') THEN precio_total ELSE 0 END), 0) as total_gastado,
                MAX(fecha_pago::text) as ultimo_pedido,
                CASE
                    WHEN COUNT(*) >= 10 THEN 'VIP'
                    WHEN COUNT(*) >= 5  THEN 'Frecuente'
                    ELSE 'Regular'
                END as tipo
            FROM pedidos
            WHERE cliente_telefono = %s
        """
        recents_query = """
            SELECT numero_pedido as id, producto_nombre as producto,
                   talla_seleccionada::text as talla,
                   estado_produccion::text as estatus_produccion,
                   precio_total, created_at
            FROM pedidos
            WHERE cliente_telefono = %s
            ORDER BY created_at DESC
            LIMIT 5
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(profile_query, (telefono,))
            profile = dict(cursor.fetchone())
            if not profile or not profile.get('nombre'):
                return None
            profile['total_gastado'] = float(profile['total_gastado'])

            cursor.execute(recents_query, (telefono,))
            pedidos_recientes = []
            for row in cursor.fetchall():
                r = dict(row)
                if r.get('precio_total') is not None:
                    r['precio_total'] = float(r['precio_total'])
                if r.get('created_at') and hasattr(r['created_at'], 'isoformat'):
                    r['created_at'] = r['created_at'].isoformat()
                pedidos_recientes.append(r)

            profile['pedidos_recientes'] = pedidos_recientes
            return profile
