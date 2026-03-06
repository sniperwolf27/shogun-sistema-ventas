"""
Repository — Estadísticas
All analytics queries consolidated here.
"""
from datetime import date
from app.models.db_manager import DatabaseManager


def _date_range(desde, hasta):
    """Parse optional date strings, defaulting to current month."""
    try:
        d_desde = date.fromisoformat(desde) if desde else date.today().replace(day=1)
        d_hasta = date.fromisoformat(hasta) if hasta else date.today()
    except ValueError:
        d_desde = date.today().replace(day=1)
        d_hasta = date.today()
    return d_desde, d_hasta


class EstadisticasRepository:

    @staticmethod
    def get_generales(desde=None, hasta=None):
        d_desde, d_hasta = _date_range(desde, hasta)
        query = """
            SELECT
                COUNT(*) FILTER (WHERE estado_produccion NOT IN ('Cancelado'))
                    AS total_pedidos,
                COALESCE(SUM(precio_total) FILTER (WHERE estado_produccion NOT IN ('Cancelado')), 0)
                    AS total_ventas,
                COALESCE(SUM(ganancia)     FILTER (WHERE estado_produccion NOT IN ('Cancelado')), 0)
                    AS total_ganancia,
                COALESCE(AVG(
                    CASE WHEN precio_total > 0 THEN ganancia / precio_total * 100 END
                ) FILTER (WHERE estado_produccion NOT IN ('Cancelado')), 0)
                    AS margen_promedio,
                COUNT(*) FILTER (WHERE estado_produccion = 'Entregado')
                    AS pedidos_entregados,
                COUNT(*) FILTER (WHERE estado_pago = 'Pendiente' AND estado_produccion NOT IN ('Cancelado'))
                    AS pedidos_pendientes
            FROM pedidos
            WHERE fecha_pago BETWEEN %(desde)s AND %(hasta)s
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, {'desde': d_desde, 'hasta': d_hasta})
            r = dict(cursor.fetchone())
            for f in ['total_ventas', 'total_ganancia', 'margen_promedio']:
                if r.get(f) is not None:
                    r[f] = float(r[f])
            # Add alias that frontend ticket calc also reads
            r['ventas_totales'] = r['total_ventas']
            return r

    @staticmethod
    def get_ventas_por_canal(desde=None, hasta=None):
        d_desde, d_hasta = _date_range(desde, hasta)
        query = """
            SELECT canal::text AS canal,
                   COUNT(*) AS pedidos,
                   COALESCE(SUM(precio_total), 0) AS ventas
            FROM pedidos
            WHERE fecha_pago BETWEEN %(desde)s AND %(hasta)s
              AND estado_produccion != 'Cancelado'
            GROUP BY canal ORDER BY ventas DESC
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, {'desde': d_desde, 'hasta': d_hasta})
            return [
                {
                    'canal': r['canal'],
                    'total_pedidos': r['pedidos'],   # frontend reads c.total_pedidos
                    'ventas': float(r['ventas'])
                }
                for r in cursor.fetchall()
            ]

    @staticmethod
    def get_ventas_por_estado(desde=None, hasta=None):
        d_desde, d_hasta = _date_range(desde, hasta)
        query = """
            SELECT estado_produccion::text AS estado, COUNT(*) AS cantidad
            FROM pedidos
            WHERE fecha_pago BETWEEN %(desde)s AND %(hasta)s
            GROUP BY estado_produccion
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, {'desde': d_desde, 'hasta': d_hasta})
            return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def get_timeline(desde=None, hasta=None):
        d_desde, d_hasta = _date_range(desde, hasta)
        query = """
            SELECT DATE_TRUNC('day', created_at)::date AS dia,
                   COUNT(*) AS pedidos,
                   COALESCE(SUM(precio_total), 0) AS ventas
            FROM pedidos
            WHERE created_at::date BETWEEN %(desde)s AND %(hasta)s
              AND estado_produccion != 'Cancelado'
            GROUP BY dia ORDER BY dia
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, {'desde': d_desde, 'hasta': d_hasta})
            return [
                {
                    'fecha': str(r['dia']),   # frontend reads d.fecha
                    'pedidos': r['pedidos'],
                    'ventas': float(r['ventas'])
                }
                for r in cursor.fetchall()
            ]

    @staticmethod
    def get_top_productos(desde=None, hasta=None, limit=5):
        d_desde, d_hasta = _date_range(desde, hasta)
        query = """
            SELECT producto_nombre AS producto, producto_sku AS sku,
                   COUNT(*) AS cantidad,
                   COALESCE(SUM(precio_total), 0) AS ventas
            FROM pedidos
            WHERE fecha_pago BETWEEN %(desde)s AND %(hasta)s
              AND estado_produccion != 'Cancelado'
            GROUP BY producto_nombre, producto_sku
            ORDER BY cantidad DESC
            LIMIT %(limit)s
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, {'desde': d_desde, 'hasta': d_hasta, 'limit': limit})
            rows = [{
                'producto': r['producto'],
                'sku': r['sku'],
                'total_vendidos': r['cantidad'],   # frontend reads total_vendidos
                'ingresos': float(r['ventas']),     # frontend reads ingresos
            } for r in cursor.fetchall()]
            # Add percentage relative to the top item
            max_ing = rows[0]['ingresos'] if rows else 1
            for row in rows:
                row['pct'] = round((row['ingresos'] / max_ing) * 100, 1) if max_ing else 0
            return rows

    @staticmethod
    def get_resumen_operativo():
        """Fast aggregate for the live Pedidos context bar."""
        query = """
            SELECT
                COUNT(*) FILTER (WHERE estado_produccion NOT IN ('Entregado','Cancelado')) AS activos,
                COUNT(*) FILTER (WHERE dias_retraso > 0 AND estado_produccion NOT IN ('Entregado','Cancelado')) AS retrasados,
                COUNT(*) FILTER (WHERE estado_pago = 'Pendiente' AND estado_produccion NOT IN ('Cancelado')) AS sin_pago,
                COUNT(*) FILTER (WHERE estado_produccion = 'Listo para Envío') AS listos_envio,
                COUNT(*) FILTER (WHERE estado_produccion = 'Recibido') AS recibidos,
                COUNT(*) FILTER (WHERE estado_produccion = 'En Producción') AS en_produccion,
                COUNT(*) FILTER (WHERE estado_produccion = 'En Camino') AS en_camino
            FROM pedidos
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query)
            r = dict(cursor.fetchone())
            # Normalize key names to match what the frontend context bar reads
            return {
                'activos':     r.get('activos', 0),
                'atrasados':   r.get('retrasados', 0),   # frontend reads atrasados
                'sin_cobrar':  r.get('sin_pago', 0),     # frontend reads sin_cobrar
                'listos_envio': r.get('listos_envio', 0),
                'recibidos':   r.get('recibidos', 0),
                'en_produccion': r.get('en_produccion', 0),
                'en_camino':   r.get('en_camino', 0),
            }

    @staticmethod
    def get_dashboard(desde=None, hasta=None):
        """
        Consolidated endpoint: returns all dashboard data in a single call.
        Replaces the 5 separate API calls the frontend was making.
        """
        return {
            'generales': EstadisticasRepository.get_generales(desde, hasta),
            'canales': EstadisticasRepository.get_ventas_por_canal(desde, hasta),
            'estados': EstadisticasRepository.get_ventas_por_estado(desde, hasta),
            'timeline': EstadisticasRepository.get_timeline(desde, hasta),
            'top_productos': EstadisticasRepository.get_top_productos(desde, hasta),
        }
