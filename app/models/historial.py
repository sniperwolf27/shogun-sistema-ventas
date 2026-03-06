"""
Repository — Historial de Cambios de Estado
"""
from app.models.db_manager import DatabaseManager


class HistorialRepository:

    @staticmethod
    def get_by_pedido(pedido_id):
        query = """
            SELECT id, pedido_numero, campo_cambiado, valor_anterior, valor_nuevo,
                   usuario_email, usuario_nombre, created_at
            FROM pedido_historial
            WHERE pedido_numero = %s
            ORDER BY created_at ASC
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (pedido_id,))
            results = []
            for row in cursor.fetchall():
                r = dict(row)
                if r.get('id'):
                    r['id'] = str(r['id'])
                if r.get('created_at') and hasattr(r['created_at'], 'isoformat'):
                    r['created_at'] = r['created_at'].isoformat()
                results.append(r)
            return results
