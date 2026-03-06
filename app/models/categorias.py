"""
Repository — Categorías de Producto
"""
from app.models.db_manager import DatabaseManager


class CategoriasRepository:

    @staticmethod
    def get_all(include_inactive=False):
        where = "" if include_inactive else "WHERE activo = true"
        query = f"SELECT id, nombre, descripcion, activo FROM categorias_producto_tabla {where} ORDER BY nombre"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query)
            results = []
            for row in cursor.fetchall():
                r = dict(row)
                if r.get('id'):
                    r['id'] = str(r['id'])
                results.append(r)
            return results

    @staticmethod
    def create(data):
        query = """
            INSERT INTO categorias_producto_tabla (nombre, descripcion)
            VALUES (%(nombre)s, %(descripcion)s)
            RETURNING id, nombre
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, data)
            r = dict(cursor.fetchone())
            if r.get('id'):
                r['id'] = str(r['id'])
            return r

    @staticmethod
    def update(cat_id, data):
        query = """
            UPDATE categorias_producto_tabla
            SET nombre = %(nombre)s, descripcion = %(descripcion)s
            WHERE id = %(id)s
            RETURNING id, nombre
        """
        data['id'] = cat_id
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, data)
            row = cursor.fetchone()
            if row:
                r = dict(row)
                if r.get('id'):
                    r['id'] = str(r['id'])
                return r
            return None

    @staticmethod
    def toggle_active(cat_id, activo):
        query = "UPDATE categorias_producto_tabla SET activo = %s WHERE id = %s RETURNING id"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (activo, cat_id))
            return cursor.fetchone() is not None
