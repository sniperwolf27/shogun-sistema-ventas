"""
Repository — Productos
"""
from app.models.db_manager import DatabaseManager

# Campos comunes a todos los SELECT (con JOIN a categorías)
_PRODUCTO_FIELDS = """
    p.id, p.sku, p.nombre,
    p.categoria_id, c.nombre AS categoria,
    p.precio_base, p.costo_material, p.costo_mano_obra,
    p.costo_total, p.margen_dinero, p.margen_porcentaje,
    p.tiempo_produccion_dias, p.activo, p.created_at, p.updated_at
"""

_PRODUCTO_JOIN = "LEFT JOIN categorias_producto c ON c.id = p.categoria_id"


class ProductosRepository:

    @staticmethod
    def _format(row):
        if not row:
            return None
        p = dict(row)
        if p.get('id'):
            p['id'] = str(p['id'])
        if p.get('categoria_id') is not None:
            p['categoria_id'] = str(p['categoria_id'])
        for f in ['precio_base', 'costo_material', 'costo_mano_obra',
                  'costo_total', 'margen_dinero', 'margen_porcentaje']:
            if p.get(f) is not None:
                p[f] = float(p[f])
        for f in ['created_at', 'updated_at']:
            if p.get(f) and hasattr(p[f], 'isoformat'):
                p[f] = p[f].isoformat()
        return p

    @staticmethod
    def get_all(include_inactive=False):
        where = "" if include_inactive else "WHERE p.activo = true"
        query = f"""
            SELECT {_PRODUCTO_FIELDS}
            FROM productos p
            {_PRODUCTO_JOIN}
            {where}
            ORDER BY p.nombre
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query)
            return [ProductosRepository._format(row) for row in cursor.fetchall()]

    @staticmethod
    def get_by_sku(sku):
        query = f"""
            SELECT {_PRODUCTO_FIELDS}
            FROM productos p
            {_PRODUCTO_JOIN}
            WHERE p.sku = %s AND p.activo = true
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (sku,))
            return ProductosRepository._format(cursor.fetchone())

    @staticmethod
    def get_by_skus(skus):
        """Batch-fetch multiple products by SKU — avoids N+1 in create_multi."""
        if not skus:
            return {}
        placeholders = ','.join(['%s'] * len(skus))
        query = f"""
            SELECT {_PRODUCTO_FIELDS}
            FROM productos p
            {_PRODUCTO_JOIN}
            WHERE p.sku IN ({placeholders}) AND p.activo = true
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, list(skus))
            return {
                ProductosRepository._format(row)['sku']: ProductosRepository._format(row)
                for row in cursor.fetchall()
            }

    @staticmethod
    def get_by_id(product_id):
        query = f"""
            SELECT {_PRODUCTO_FIELDS}
            FROM productos p
            {_PRODUCTO_JOIN}
            WHERE p.id = %s
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (product_id,))
            return ProductosRepository._format(cursor.fetchone())

    @staticmethod
    def create(data):
        # Validate SKU uniqueness
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute("SELECT id FROM productos WHERE sku = %s", (data['sku'],))
            if cursor.fetchone():
                raise ValueError(f"El SKU '{data['sku']}' ya existe")

        params = {
            'sku': data['sku'],
            'nombre': data['nombre'],
            'categoria_id': data.get('categoria_id') or None,
            'precio_base': data.get('precio_base', 0),
            'costo_material': data.get('costo_material', 0),
            'costo_mano_obra': data.get('costo_mano_obra', 0),
            'tiempo_produccion_dias': data.get('tiempo_produccion_dias', 7),
        }

        query = """
            INSERT INTO productos (sku, nombre, categoria_id, precio_base, costo_material,
                                   costo_mano_obra, tiempo_produccion_dias)
            VALUES (%(sku)s, %(nombre)s, %(categoria_id)s, %(precio_base)s, %(costo_material)s,
                    %(costo_mano_obra)s, %(tiempo_produccion_dias)s)
            RETURNING id, sku, nombre
        """

        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, params)
            result = dict(cursor.fetchone())
            if result.get('id'):
                result['id'] = str(result['id'])
            return result

    @staticmethod
    def update(product_id, data):
        new_sku = data.get('sku')
        if new_sku:
            with DatabaseManager.get_cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM productos WHERE sku = %s AND id != %s",
                    (new_sku, product_id)
                )
                if cursor.fetchone():
                    raise ValueError(f"El SKU '{new_sku}' ya existe en otro producto")

        params = {
            'id': product_id,
            'sku': data.get('sku'),
            'nombre': data.get('nombre'),
            'categoria_id': data.get('categoria_id') or None,
            'precio_base': data.get('precio_base', 0),
            'costo_material': data.get('costo_material', 0),
            'costo_mano_obra': data.get('costo_mano_obra', 0),
            'tiempo_produccion_dias': data.get('tiempo_produccion_dias', 7),
        }

        query = """
            UPDATE productos SET
                sku = %(sku)s, nombre = %(nombre)s, categoria_id = %(categoria_id)s,
                precio_base = %(precio_base)s, costo_material = %(costo_material)s,
                costo_mano_obra = %(costo_mano_obra)s,
                tiempo_produccion_dias = %(tiempo_produccion_dias)s
            WHERE id = %(id)s
            RETURNING id, sku, nombre
        """
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
    def sku_exists(sku, exclude_id=None):
        if exclude_id:
            query = "SELECT id FROM productos WHERE sku = %s AND id != %s"
            params = (sku, exclude_id)
        else:
            query = "SELECT id FROM productos WHERE sku = %s"
            params = (sku,)
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchone() is not None

    @staticmethod
    def toggle_active(product_id, activo):
        query = "UPDATE productos SET activo = %s WHERE id = %s RETURNING id"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (activo, product_id))
            return cursor.fetchone() is not None

    @staticmethod
    def delete(product_id):
        return ProductosRepository.toggle_active(product_id, False)
