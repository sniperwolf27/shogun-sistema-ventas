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

    @staticmethod
    def registrar_cambio(pedido_numero, campo, valor_anterior, valor_nuevo,
                         usuario_email, usuario_nombre):
        """
        Inserta una fila en pedido_historial registrando un cambio de campo.
        Los valores se convierten a str para compatibilidad con columnas TEXT.
        Retorna el id generado o None si falla silenciosamente.
        """
        query = """
            INSERT INTO pedido_historial
                (pedido_numero, campo_cambiado, valor_anterior, valor_nuevo,
                 usuario_email, usuario_nombre)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        val_ant = str(valor_anterior) if valor_anterior is not None else None
        val_nvo = str(valor_nuevo)    if valor_nuevo    is not None else None
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (
                pedido_numero, campo, val_ant, val_nvo,
                usuario_email, usuario_nombre
            ))
            row = cursor.fetchone()
            return str(row['id']) if row else None
