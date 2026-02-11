"""
Database Manager + Repositories - PostgreSQL
"""

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from datetime import datetime, date, timedelta


class DatabaseManager:
    _pool = None

    @classmethod
    def initialize(cls, database_url):
        if cls._pool is None:
            cls._pool = psycopg2.pool.ThreadedConnectionPool(minconn=1, maxconn=20, dsn=database_url)

    @classmethod
    @contextmanager
    def get_connection(cls):
        if cls._pool is None:
            raise Exception("Database pool not initialized")
        conn = cls._pool.getconn()
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cls._pool.putconn(conn)

    @classmethod
    @contextmanager
    def get_cursor(cls, dict_cursor=True):
        with cls.get_connection() as conn:
            cursor_factory = RealDictCursor if dict_cursor else None
            cursor = conn.cursor(cursor_factory=cursor_factory)
            try:
                yield cursor
            finally:
                cursor.close()

    @classmethod
    def close_all(cls):
        if cls._pool:
            cls._pool.closeall()


# ==============================================================================
# PRODUCTOS
# ==============================================================================

class ProductosRepository:

    @staticmethod
    def _format(row):
        if not row:
            return None
        p = dict(row)
        if p.get('id'):
            p['id'] = str(p['id'])
        for f in ['precio_base', 'costo_material', 'costo_mano_obra', 'costo_total', 'margen_dinero', 'margen_porcentaje']:
            if p.get(f) is not None:
                p[f] = float(p[f])
        for f in ['created_at', 'updated_at']:
            if p.get(f) and hasattr(p[f], 'isoformat'):
                p[f] = p[f].isoformat()
        return p

    @staticmethod
    def get_all(include_inactive=False):
        where = "" if include_inactive else "WHERE activo = true"
        query = f"""
            SELECT id, sku, nombre, categoria::text, precio_base, costo_material, costo_mano_obra,
                   costo_total, margen_dinero, margen_porcentaje, tiempo_produccion_dias, activo,
                   created_at, updated_at
            FROM productos {where}
            ORDER BY nombre
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query)
            return [ProductosRepository._format(row) for row in cursor.fetchall()]

    @staticmethod
    def get_by_sku(sku):
        query = "SELECT * FROM productos WHERE sku = %s AND activo = true"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (sku,))
            return ProductosRepository._format(cursor.fetchone())

    @staticmethod
    def get_by_id(product_id):
        query = "SELECT * FROM productos WHERE id = %s"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (product_id,))
            return ProductosRepository._format(cursor.fetchone())

    @staticmethod
    def create(data):
        query = """
            INSERT INTO productos (sku, nombre, categoria, precio_base, costo_material, costo_mano_obra, tiempo_produccion_dias)
            VALUES (%(sku)s, %(nombre)s, %(categoria)s::categoria_producto, %(precio_base)s, %(costo_material)s, %(costo_mano_obra)s, %(tiempo_produccion_dias)s)
            RETURNING id, sku, nombre
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, data)
            result = dict(cursor.fetchone())
            if result.get('id'):
                result['id'] = str(result['id'])
            return result

    @staticmethod
    def update(product_id, data):
        query = """
            UPDATE productos SET
                nombre = %(nombre)s, categoria = %(categoria)s::categoria_producto,
                precio_base = %(precio_base)s, costo_material = %(costo_material)s,
                costo_mano_obra = %(costo_mano_obra)s, tiempo_produccion_dias = %(tiempo_produccion_dias)s
            WHERE id = %(id)s
            RETURNING id, sku, nombre
        """
        data['id'] = product_id
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
    def toggle_active(product_id, activo):
        query = "UPDATE productos SET activo = %s WHERE id = %s RETURNING id"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (activo, product_id))
            return cursor.fetchone() is not None

    @staticmethod
    def delete(product_id):
        return ProductosRepository.toggle_active(product_id, False)


# ==============================================================================
# PERSONALIZACIONES
# ==============================================================================

class PersonalizacionesRepository:

    @staticmethod
    def _format(row):
        if not row:
            return None
        p = dict(row)
        if p.get('id'):
            p['id'] = str(p['id'])
        if p.get('precio') is not None:
            p['precio'] = float(p['precio'])
        for f in ['created_at', 'updated_at']:
            if p.get(f) and hasattr(p[f], 'isoformat'):
                p[f] = p[f].isoformat()
        return p

    @staticmethod
    def get_all(include_inactive=False):
        where = "" if include_inactive else "WHERE activo = true"
        query = f"""
            SELECT id, codigo, tipo, descripcion, precio, tiempo_adicional_dias, activo
            FROM personalizaciones {where}
            ORDER BY tipo
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query)
            return [PersonalizacionesRepository._format(row) for row in cursor.fetchall()]

    @staticmethod
    def get_by_codigo(codigo):
        query = "SELECT * FROM personalizaciones WHERE codigo = %s AND activo = true"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (codigo,))
            return PersonalizacionesRepository._format(cursor.fetchone())

    @staticmethod
    def get_by_id(pid):
        query = "SELECT * FROM personalizaciones WHERE id = %s"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (pid,))
            return PersonalizacionesRepository._format(cursor.fetchone())

    @staticmethod
    def create(data):
        query = """
            INSERT INTO personalizaciones (codigo, tipo, descripcion, precio, tiempo_adicional_dias)
            VALUES (%(codigo)s, %(tipo)s, %(descripcion)s, %(precio)s, %(tiempo_adicional_dias)s)
            RETURNING id, codigo, tipo
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, data)
            result = dict(cursor.fetchone())
            if result.get('id'):
                result['id'] = str(result['id'])
            return result

    @staticmethod
    def update(pid, data):
        query = """
            UPDATE personalizaciones SET
                tipo = %(tipo)s, descripcion = %(descripcion)s,
                precio = %(precio)s, tiempo_adicional_dias = %(tiempo_adicional_dias)s
            WHERE id = %(id)s
            RETURNING id, codigo, tipo
        """
        data['id'] = pid
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
    def toggle_active(pid, activo):
        query = "UPDATE personalizaciones SET activo = %s WHERE id = %s RETURNING id"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (activo, pid))
            return cursor.fetchone() is not None


# ==============================================================================
# PEDIDOS
# ==============================================================================

class PedidosRepository:

    @staticmethod
    def _format_pedido(row):
        if not row:
            return None
        pedido = dict(row)
        for field in ['fecha_pago', 'fecha_compromiso', 'fecha_entrega_real']:
            if pedido.get(field) and isinstance(pedido[field], date):
                pedido[field] = pedido[field].strftime('%d/%m/%Y')
        for field in ['precio_producto', 'precio_personalizacion', 'precio_envio',
                      'precio_total', 'costo_producto', 'costo_personalizacion',
                      'costo_total', 'ganancia', 'precio_person', 'costo_person']:
            if pedido.get(field) is not None:
                pedido[field] = float(pedido[field])
        return pedido

    _SELECT_FIELDS = """
        numero_pedido as id,
        cliente_nombre as cliente,
        cliente_telefono as telefono,
        cliente_email as email,
        direccion_envio as direccion,
        producto_sku as sku,
        producto_nombre as producto,
        talla_seleccionada::text as talla,
        personalizacion_codigo,
        personalizacion_detalles as personalizacion,
        fecha_pago, fecha_compromiso, fecha_entrega_real,
        dias_produccion, dias_retraso,
        precio_producto,
        precio_personalizacion as precio_person,
        precio_envio, precio_total,
        costo_producto,
        costo_personalizacion as costo_person,
        costo_total, ganancia,
        canal::text,
        metodo_pago::text as banco,
        estado_produccion::text as estatus_produccion,
        estado_pago::text as estatus_pago,
        created_at
    """

    @staticmethod
    def get_all():
        query = f"SELECT {PedidosRepository._SELECT_FIELDS} FROM pedidos ORDER BY created_at DESC"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query)
            return [PedidosRepository._format_pedido(row) for row in cursor.fetchall()]

    @staticmethod
    def get_by_id(pedido_id):
        query = f"SELECT {PedidosRepository._SELECT_FIELDS} FROM pedidos WHERE numero_pedido = %s"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (pedido_id,))
            return PedidosRepository._format_pedido(cursor.fetchone())

    @staticmethod
    def create(data):
        producto = ProductosRepository.get_by_sku(data['producto_sku'])
        if not producto:
            raise ValueError(f"Producto no encontrado: {data['producto_sku']}")

        personalizacion_id = None
        precio_personalizacion = 0
        costo_personalizacion = 0

        if data.get('personalizacion_tipo') and data['personalizacion_tipo'] != 'ninguna':
            pers = PersonalizacionesRepository.get_by_codigo(data['personalizacion_tipo'])
            if pers:
                personalizacion_id = pers['id']
                precio_personalizacion = float(pers['precio'])
                costo_personalizacion = precio_personalizacion * 0.5

        dias = int(str(data.get('tiempo_estimado', '7')).split()[0])
        fecha_pago = datetime.now().date()
        fecha_compromiso = fecha_pago + timedelta(days=dias)

        pedido_data = {
            'cliente_nombre': data['nombre_cliente'],
            'cliente_telefono': data['telefono'],
            'cliente_email': data.get('email'),
            'direccion_envio': data['direccion'],
            'producto_id': producto['id'],
            'producto_sku': data['producto_sku'],
            'producto_nombre': data.get('producto_nombre', producto['nombre']),
            'talla': data['talla'],
            'personalizacion_id': personalizacion_id,
            'personalizacion_codigo': data.get('personalizacion_tipo') if personalizacion_id else None,
            'personalizacion_detalles': data.get('personalizacion_detalles'),
            'fecha_pago': fecha_pago,
            'fecha_compromiso': fecha_compromiso,
            'precio_producto': float(producto['precio_base']),
            'precio_personalizacion': precio_personalizacion,
            'precio_envio': float(data.get('costo_envio', 200)),
            'costo_producto': float(producto['costo_total']),
            'costo_personalizacion': costo_personalizacion,
            'canal': data['canal'],
            'metodo_pago': data['banco'],
            'estado_pago': data['estatus_pago']
        }

        query = """
            INSERT INTO pedidos (
                cliente_nombre, cliente_telefono, cliente_email, direccion_envio,
                producto_id, producto_sku, producto_nombre, talla_seleccionada,
                personalizacion_id, personalizacion_codigo, personalizacion_detalles,
                fecha_pago, fecha_compromiso,
                precio_producto, precio_personalizacion, precio_envio,
                costo_producto, costo_personalizacion,
                canal, metodo_pago, estado_pago
            ) VALUES (
                %(cliente_nombre)s, %(cliente_telefono)s, %(cliente_email)s, %(direccion_envio)s,
                %(producto_id)s, %(producto_sku)s, %(producto_nombre)s, %(talla)s::talla,
                %(personalizacion_id)s, %(personalizacion_codigo)s, %(personalizacion_detalles)s,
                %(fecha_pago)s, %(fecha_compromiso)s,
                %(precio_producto)s, %(precio_personalizacion)s, %(precio_envio)s,
                %(costo_producto)s, %(costo_personalizacion)s,
                %(canal)s::canal_venta, %(metodo_pago)s::metodo_pago, %(estado_pago)s::estado_pago
            )
            RETURNING numero_pedido, fecha_compromiso, precio_total
        """

        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, pedido_data)
            result = cursor.fetchone()
            return {
                'id': result['numero_pedido'],
                'fecha_entrega': result['fecha_compromiso'].strftime('%d/%m/%Y'),
                'total': float(result['precio_total'])
            }

    @staticmethod
    def update(pedido_id, data):
        campos = []
        params = {'pedido_id': pedido_id}
        field_map = {
            'cliente': ('cliente_nombre', None),
            'telefono': ('cliente_telefono', None),
            'email': ('cliente_email', None),
            'direccion': ('direccion_envio', None),
            'estatus_produccion': ('estado_produccion', '::estado_produccion'),
            'estatus_pago': ('estado_pago', '::estado_pago'),
            'banco': ('metodo_pago', '::metodo_pago'),
            'canal': ('canal', '::canal_venta'),
        }

        for key, (col, cast) in field_map.items():
            if key in data:
                cast_str = cast or ''
                campos.append(f'{col} = %({key}s){cast_str}')
                params[key] = data[key]

        if data.get('fecha_entrega_real'):
            partes = data['fecha_entrega_real'].split('/')
            if len(partes) == 3:
                params['fecha_entrega'] = date(int(partes[2]), int(partes[1]), int(partes[0]))
                campos.append('fecha_entrega_real = %(fecha_entrega)s')

        if not campos:
            return True

        query = f"UPDATE pedidos SET {', '.join(campos)} WHERE numero_pedido = %(pedido_id)s RETURNING numero_pedido"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchone() is not None

    @staticmethod
    def delete(pedido_id):
        query = "DELETE FROM pedidos WHERE numero_pedido = %s RETURNING numero_pedido"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (pedido_id,))
            return cursor.fetchone() is not None

    @staticmethod
    def get_pendientes():
        query = """
            SELECT numero_pedido as id, cliente_nombre as cliente, producto_nombre as producto,
                   precio_total, estado_produccion::text as estatus_produccion, dias_retraso,
                   fecha_compromiso, direccion_envio as direccion,
                   CASE
                       WHEN estado_produccion = 'Bloqueado - Sin Direccion' THEN 'Sin direccion de envio'
                       WHEN dias_retraso > 0 THEN dias_retraso || ' dias de retraso'
                       ELSE 'Revision pendiente'
                   END AS motivo_pendiente
            FROM pedidos
            WHERE estado_produccion = 'Bloqueado - Sin Direccion'
               OR (estado_produccion NOT IN ('Entregado', 'Cancelado') AND dias_retraso > 0)
            ORDER BY dias_retraso DESC NULLS LAST, fecha_compromiso ASC
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query)
            return [PedidosRepository._format_pedido(row) for row in cursor.fetchall()]

    @staticmethod
    def buscar(query_text):
        query = f"""
            SELECT {PedidosRepository._SELECT_FIELDS}
            FROM pedidos
            WHERE cliente_nombre ILIKE %(q)s OR numero_pedido ILIKE %(q)s
               OR producto_nombre ILIKE %(q)s OR cliente_telefono ILIKE %(q)s
            ORDER BY created_at DESC
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, {'q': f'%{query_text}%'})
            return [PedidosRepository._format_pedido(row) for row in cursor.fetchall()]


# ==============================================================================
# CLIENTES
# ==============================================================================

class ClientesRepository:

    @staticmethod
    def get_all():
        query = """
            SELECT nombre, telefono, email, total_pedidos as pedidos,
                   total_gastado, ultimo_pedido, tipo_cliente as tipo
            FROM vista_clientes
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query)
            clientes = []
            for row in cursor.fetchall():
                c = dict(row)
                if c.get('total_gastado'):
                    c['total_gastado'] = float(c['total_gastado'])
                if c.get('ultimo_pedido') and isinstance(c['ultimo_pedido'], date):
                    c['ultimo_pedido'] = c['ultimo_pedido'].strftime('%d/%m/%Y')
                clientes.append(c)
            return clientes


# ==============================================================================
# ESTADISTICAS
# ==============================================================================

class EstadisticasRepository:

    @staticmethod
    def get_generales(fecha_desde=None, fecha_hasta=None):
        conditions = []
        params = {}
        if fecha_desde:
            conditions.append("fecha_pago >= %(desde)s")
            params['desde'] = fecha_desde
        if fecha_hasta:
            conditions.append("fecha_pago <= %(hasta)s")
            params['hasta'] = fecha_hasta
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        query = f"""
            SELECT
                COUNT(*) AS total_pedidos,
                COALESCE(SUM(precio_total), 0) AS ventas_totales,
                COALESCE(SUM(ganancia), 0) AS ganancia_neta,
                COALESCE(AVG(CASE WHEN precio_total > 0 THEN ganancia / precio_total * 100 END), 0) AS margen_promedio,
                COUNT(*) FILTER (WHERE estado_produccion NOT IN ('Entregado', 'Cancelado')) AS pedidos_pendientes,
                COUNT(*) FILTER (WHERE estado_produccion = 'Entregado') AS pedidos_entregados
            FROM pedidos {where}
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, params)
            row = cursor.fetchone()
            if row:
                stats = dict(row)
                for f in ['ventas_totales', 'ganancia_neta', 'margen_promedio']:
                    if stats.get(f) is not None:
                        stats[f] = round(float(stats[f]), 2)
                return stats
        return {'total_pedidos': 0, 'ventas_totales': 0, 'ganancia_neta': 0,
                'margen_promedio': 0, 'pedidos_pendientes': 0, 'pedidos_entregados': 0}

    @staticmethod
    def get_ventas_por_canal(fecha_desde=None, fecha_hasta=None):
        conditions = []
        params = {}
        if fecha_desde:
            conditions.append("fecha_pago >= %(desde)s")
            params['desde'] = fecha_desde
        if fecha_hasta:
            conditions.append("fecha_pago <= %(hasta)s")
            params['hasta'] = fecha_hasta
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        query = f"""
            SELECT canal::text, COUNT(*) as total, COALESCE(SUM(precio_total), 0) as ventas
            FROM pedidos {where}
            GROUP BY canal ORDER BY ventas DESC
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, params)
            return [{'canal': r['canal'], 'total': r['total'], 'ventas': round(float(r['ventas']), 2)} for r in cursor.fetchall()]

    @staticmethod
    def get_ventas_por_estado():
        query = """
            SELECT estado_produccion::text as estado, COUNT(*) as total
            FROM pedidos GROUP BY estado_produccion
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query)
            return [{'estado': r['estado'], 'total': r['total']} for r in cursor.fetchall()]
