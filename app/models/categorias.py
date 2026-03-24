"""
Repository — Categorías de Producto
"""
from app.models.db_manager import DatabaseManager


class CategoriasRepository:

    @staticmethod
    def get_all(include_inactive=False):
        where = "" if include_inactive else "WHERE activo = true"
        query = f"""
            SELECT id, nombre, codigo, descripcion, activo
            FROM categorias_producto {where}
            ORDER BY nombre
        """
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
            INSERT INTO categorias_producto (nombre, codigo, descripcion)
            VALUES (%(nombre)s, %(codigo)s, %(descripcion)s)
            RETURNING id, nombre, codigo
        """
        params = {
            'nombre': data.get('nombre'),
            'codigo': data.get('codigo') or None,
            'descripcion': data.get('descripcion') or None,
        }
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, params)
            r = dict(cursor.fetchone())
            if r.get('id'):
                r['id'] = str(r['id'])
            return r

    @staticmethod
    def update(cat_id, data):
        query = """
            UPDATE categorias_producto
            SET nombre = %(nombre)s, codigo = %(codigo)s, descripcion = %(descripcion)s
            WHERE id = %(id)s
            RETURNING id, nombre, codigo
        """
        params = {
            'id': cat_id,
            'nombre': data.get('nombre'),
            'codigo': data.get('codigo') or None,
            'descripcion': data.get('descripcion') or None,
        }
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, params)
            row = cursor.fetchone()
            if row:
                r = dict(row)
                if r.get('id'):
                    r['id'] = str(r['id'])
                return r
            return None

    @staticmethod
    def toggle_active(cat_id, activo):
        query = "UPDATE categorias_producto SET activo = %s WHERE id = %s RETURNING id"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (activo, cat_id))
            return cursor.fetchone() is not None
