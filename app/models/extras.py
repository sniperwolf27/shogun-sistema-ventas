"""
Repository — Comentarios y Adjuntos de Pedidos
"""
from app.models.db_manager import DatabaseManager


class ComentariosRepository:

    @staticmethod
    def get_by_pedido(pedido_id):
        query = """
            SELECT id, pedido_numero, autor_email, autor_nombre, texto, created_at
            FROM pedido_comentarios
            WHERE pedido_numero = %s ORDER BY created_at ASC
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
    def create(pedido_numero, autor_email, autor_nombre, texto):
        query = """
            INSERT INTO pedido_comentarios (pedido_numero, autor_email, autor_nombre, texto)
            VALUES (%s, %s, %s, %s) RETURNING id, created_at
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (pedido_numero, autor_email, autor_nombre, texto))
            r = dict(cursor.fetchone())
            if r.get('id'):
                r['id'] = str(r['id'])
            if r.get('created_at') and hasattr(r['created_at'], 'isoformat'):
                r['created_at'] = r['created_at'].isoformat()
            return r

    @staticmethod
    def delete(comment_id):
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(
                "DELETE FROM pedido_comentarios WHERE id = %s RETURNING id",
                (comment_id,)
            )
            return cursor.fetchone() is not None


class AdjuntosRepository:

    @staticmethod
    def get_by_pedido(pedido_id):
        query = """
            SELECT id, pedido_numero, nombre_original, tipo_mime, tamano_bytes,
                   storage_path, subido_por_email, subido_por_nombre as subido_por_nombre, created_at
            FROM pedido_adjuntos
            WHERE pedido_numero = %s ORDER BY created_at DESC
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
    def get_by_id(adjunto_id):
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM pedido_adjuntos WHERE id = %s",
                (adjunto_id,)
            )
            row = cursor.fetchone()
            if not row:
                return None
            r = dict(row)
            if r.get('id'):
                r['id'] = str(r['id'])
            return r

    @staticmethod
    def create(pedido_numero, nombre_original, tipo_mime, tamano_bytes,
               storage_path, email, nombre):
        query = """
            INSERT INTO pedido_adjuntos
                (pedido_numero, nombre_archivo, nombre_original, tipo_mime, tamano_bytes,
                 storage_path, subido_por_email, subido_por_nombre)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (
                pedido_numero, nombre_original, nombre_original, tipo_mime, tamano_bytes,
                storage_path, email, nombre
            ))
            r = dict(cursor.fetchone())
            if r.get('id'):
                r['id'] = str(r['id'])
            return r

    @staticmethod
    def delete(adjunto_id):
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(
                "SELECT storage_path FROM pedido_adjuntos WHERE id = %s",
                (adjunto_id,)
            )
            row = cursor.fetchone()
            if not row:
                return None
            cursor.execute("DELETE FROM pedido_adjuntos WHERE id = %s", (adjunto_id,))
            return row['storage_path']
