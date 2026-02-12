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
            try:
                cls._pool = psycopg2.pool.ThreadedConnectionPool(minconn=1, maxconn=20, dsn=database_url)
                print("[DB] Connection pool initialized")
            except Exception as e:
                print(f"[DB] WARNING: Could not connect to database: {e}")
                print("[DB] App will retry on first request")
                cls._pending_url = database_url

    @classmethod
    def _ensure_pool(cls):
        """Lazy retry if initial connection failed"""
        if cls._pool is None and hasattr(cls, '_pending_url'):
            cls._pool = psycopg2.pool.ThreadedConnectionPool(minconn=1, maxconn=20, dsn=cls._pending_url)

    @classmethod
    @contextmanager
    def get_connection(cls):
        cls._ensure_pool()
        if cls._pool is None:
            raise Exception("Database not available")
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
# CATEGORÍAS DE PRODUCTO
# ==============================================================================

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
        # Validate SKU uniqueness
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute("SELECT id FROM productos WHERE sku = %s", (data['sku'],))
            if cursor.fetchone():
                raise ValueError(f"El SKU '{data['sku']}' ya existe")

        query = """
            INSERT INTO productos (sku, nombre, categoria, precio_base, costo_material, costo_mano_obra, tiempo_produccion_dias)
            VALUES (%(sku)s, %(nombre)s, %(categoria)s, %(precio_base)s, %(costo_material)s, %(costo_mano_obra)s, %(tiempo_produccion_dias)s)
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
        # If SKU is being changed, validate no duplicates
        new_sku = data.get('sku')
        if new_sku:
            check_query = "SELECT id FROM productos WHERE sku = %s AND id != %s"
            with DatabaseManager.get_cursor() as cursor:
                cursor.execute(check_query, (new_sku, product_id))
                if cursor.fetchone():
                    raise ValueError(f"El SKU '{new_sku}' ya existe en otro producto")

        query = """
            UPDATE productos SET
                sku = %(sku)s, nombre = %(nombre)s, categoria = %(categoria)s,
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
    def sku_exists(sku, exclude_id=None):
        """Check if SKU already exists (for validation)"""
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
        if p.get('costo_por_mil_puntadas') is not None:
            p['costo_por_mil_puntadas'] = float(p['costo_por_mil_puntadas'])
        for f in ['created_at', 'updated_at']:
            if p.get(f) and hasattr(p[f], 'isoformat'):
                p[f] = p[f].isoformat()
        return p

    @staticmethod
    def get_all(include_inactive=False):
        where = "" if include_inactive else "WHERE activo = true"
        query = f"""
            SELECT id, codigo, tipo, descripcion, precio, tiempo_adicional_dias,
                   metodo_calculo, costo_por_mil_puntadas, activo
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
            INSERT INTO personalizaciones (codigo, tipo, descripcion, precio, tiempo_adicional_dias,
                                           metodo_calculo, costo_por_mil_puntadas)
            VALUES (%(codigo)s, %(tipo)s, %(descripcion)s, %(precio)s, %(tiempo_adicional_dias)s,
                    %(metodo_calculo)s, %(costo_por_mil_puntadas)s)
            RETURNING id, codigo, tipo
        """
        # Defaults
        if 'metodo_calculo' not in data:
            data['metodo_calculo'] = 'fijo'
        if 'costo_por_mil_puntadas' not in data:
            data['costo_por_mil_puntadas'] = 0
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
                precio = %(precio)s, tiempo_adicional_dias = %(tiempo_adicional_dias)s,
                metodo_calculo = %(metodo_calculo)s, costo_por_mil_puntadas = %(costo_por_mil_puntadas)s
            WHERE id = %(id)s
            RETURNING id, codigo, tipo
        """
        data['id'] = pid
        if 'metodo_calculo' not in data:
            data['metodo_calculo'] = 'fijo'
        if 'costo_por_mil_puntadas' not in data:
            data['costo_por_mil_puntadas'] = 0
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
                      'costo_total', 'ganancia', 'precio_person', 'costo_person',
                      'costo_mano_obra', 'costos_adicionales']:
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
        color,
        personalizacion_codigo,
        personalizacion_detalles as personalizacion,
        personalizacion_puntadas as puntadas,
        fecha_pago, fecha_compromiso, fecha_entrega_real,
        dias_produccion, dias_retraso,
        precio_producto,
        precio_personalizacion as precio_person,
        precio_envio, precio_total,
        costo_producto,
        costo_personalizacion as costo_person,
        costo_mano_obra,
        COALESCE(costos_adicionales, 0) as costos_adicionales,
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
        puntadas = int(data.get('personalizacion_puntadas', 0) or 0)

        if data.get('personalizacion_tipo') and data['personalizacion_tipo'] != 'ninguna':
            pers = PersonalizacionesRepository.get_by_codigo(data['personalizacion_tipo'])
            if pers:
                personalizacion_id = pers['id']

                if pers.get('metodo_calculo') == 'puntadas':
                    # Bordado: precio_personalizacion = 0 (no fixed price)
                    precio_personalizacion = 0
                    costo_personalizacion = 0
                else:
                    precio_personalizacion = float(pers['precio'])
                    costo_personalizacion = precio_personalizacion * 0.5

        # Mano de obra desde puntadas
        costo_por_mil = float(data.get('costo_por_mil_puntadas', 0) or 0)
        costo_mano_obra = (puntadas / 1000) * costo_por_mil if puntadas > 0 and costo_por_mil > 0 else 0

        # Costos adicionales
        costos_adicionales = float(data.get('costos_adicionales', 0) or 0)

        # Precio de venta: si viene del form (bordados), usarlo; si no, usar precio_base del producto
        precio_venta = float(data.get('precio_venta', 0) or 0)
        if precio_venta <= 0:
            precio_venta = float(producto['precio_base'])

        dias = int(str(data.get('tiempo_estimado', '7')).split()[0])
        fecha_pago = datetime.now().date()
        fecha_compromiso = fecha_pago + timedelta(days=dias)

        pedido_data = {
            'cliente_nombre': data['nombre_cliente'],
            'cliente_telefono': data['telefono'],
            'cliente_email': data.get('email') or None,
            'direccion_envio': data['direccion'],
            'producto_id': producto['id'],
            'producto_sku': data['producto_sku'],
            'producto_nombre': data.get('producto_nombre', producto['nombre']),
            'talla': data['talla'],
            'color': data.get('color') or None,
            'personalizacion_id': personalizacion_id,
            'personalizacion_codigo': data.get('personalizacion_tipo') if personalizacion_id else None,
            'personalizacion_detalles': data.get('personalizacion_detalles') or None,
            'personalizacion_puntadas': puntadas,
            'fecha_pago': fecha_pago,
            'fecha_compromiso': fecha_compromiso,
            'precio_producto': precio_venta,
            'precio_personalizacion': precio_personalizacion,
            'precio_envio': float(data.get('costo_envio', 200)),
            'costo_producto': float(producto.get('costo_material', 0) or producto.get('costo_total', 0) or 0),
            'costo_personalizacion': costo_personalizacion,
            'costo_mano_obra': costo_mano_obra,
            'costos_adicionales': costos_adicionales,
            'canal': data['canal'],
            'metodo_pago': data['banco'],
            'estado_pago': data['estatus_pago']
        }

        query = """
            INSERT INTO pedidos (
                cliente_nombre, cliente_telefono, cliente_email, direccion_envio,
                producto_id, producto_sku, producto_nombre, talla_seleccionada,
                color,
                personalizacion_id, personalizacion_codigo, personalizacion_detalles,
                personalizacion_puntadas,
                fecha_pago, fecha_compromiso,
                precio_producto, precio_personalizacion, precio_envio,
                costo_producto, costo_personalizacion, costo_mano_obra, costos_adicionales,
                canal, metodo_pago, estado_pago
            ) VALUES (
                %(cliente_nombre)s, %(cliente_telefono)s, %(cliente_email)s, %(direccion_envio)s,
                %(producto_id)s, %(producto_sku)s, %(producto_nombre)s, %(talla)s::talla,
                %(color)s,
                %(personalizacion_id)s, %(personalizacion_codigo)s, %(personalizacion_detalles)s,
                %(personalizacion_puntadas)s,
                %(fecha_pago)s, %(fecha_compromiso)s,
                %(precio_producto)s, %(precio_personalizacion)s, %(precio_envio)s,
                %(costo_producto)s, %(costo_personalizacion)s, %(costo_mano_obra)s, %(costos_adicionales)s,
                %(canal)s::canal_venta, %(metodo_pago)s::metodo_pago, %(estado_pago)s::estado_pago
            )
            RETURNING numero_pedido, fecha_compromiso, precio_total, ganancia
        """

        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, pedido_data)
            result = cursor.fetchone()
            return {
                'id': result['numero_pedido'],
                'fecha_entrega': result['fecha_compromiso'].strftime('%d/%m/%Y'),
                'total': float(result['precio_total']),
                'ganancia': float(result['ganancia'])
            }

    @staticmethod
    def update(pedido_id, data):
        campos = []
        params = {'pedido_id': pedido_id}

        # Simple text fields
        simple_fields = {
            'cliente': 'cliente_nombre',
            'telefono': 'cliente_telefono',
            'direccion': 'direccion_envio',
            'personalizacion': 'personalizacion_detalles',
            'color': 'color',
        }
        for key, col in simple_fields.items():
            if key in data:
                placeholder = f'%({key})s'
                campos.append(f'{col} = {placeholder}')
                params[key] = data[key] if data[key] else None

        # Email: explicitly allow empty/null
        if 'email' in data:
            campos.append('cliente_email = %(email)s')
            params['email'] = data['email'] if data['email'] else None

        # ENUM fields
        enum_fields = {
            'estatus_produccion': ('estado_produccion', 'estado_produccion'),
            'estatus_pago': ('estado_pago', 'estado_pago'),
            'banco': ('metodo_pago', 'metodo_pago'),
            'canal': ('canal', 'canal_venta'),
        }
        for key, (col, enum_name) in enum_fields.items():
            if key in data and data[key]:
                placeholder = f'%({key})s'
                campos.append(f"{col} = {placeholder}::{enum_name}")
                params[key] = data[key]

        # Date field
        if 'fecha_entrega_real' in data:
            val = data['fecha_entrega_real']
            if val and '/' in val:
                partes = val.split('/')
                if len(partes) == 3:
                    try:
                        params['fecha_entrega'] = date(int(partes[2]), int(partes[1]), int(partes[0]))
                        campos.append('fecha_entrega_real = %(fecha_entrega)s')
                    except (ValueError, IndexError):
                        pass
            elif not val:
                campos.append('fecha_entrega_real = NULL')

        # Numeric financial fields (editable for corrections)
        numeric_fields = {
            'precio_producto': 'precio_producto',
            'costo_mano_obra': 'costo_mano_obra',
            'costos_adicionales': 'costos_adicionales',
            'precio_envio': 'precio_envio',
            'costo_producto': 'costo_producto',
        }
        for key, col in numeric_fields.items():
            if key in data and data[key] is not None and data[key] != '':
                try:
                    params[key] = float(data[key])
                    campos.append(f'{col} = %({key})s')
                except (ValueError, TypeError):
                    pass

        if not campos:
            return True

        query = f"UPDATE pedidos SET {', '.join(campos)} WHERE numero_pedido = %(pedido_id)s RETURNING numero_pedido"
        try:
            with DatabaseManager.get_cursor() as cursor:
                cursor.execute(query, params)
                row = cursor.fetchone()
                return row is not None
        except Exception as e:
            print(f"[PEDIDO UPDATE ERROR] pedido={pedido_id} query={query} error={e}")
            raise

    @staticmethod
    def delete(pedido_id):
        query = "DELETE FROM pedidos WHERE numero_pedido = %s RETURNING numero_pedido"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (pedido_id,))
            return cursor.fetchone() is not None

    @staticmethod
    def get_pendientes():
        query = """
            SELECT id, cliente, telefono, producto, precio_total,
                   estatus_produccion, estatus_pago, dias_retraso,
                   fecha_compromiso, direccion, personalizacion_codigo,
                   personalizacion, email, talla, canal, color,
                   motivos, motivo_pendiente, categoria_pendiente
            FROM vista_pedidos_pendientes
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query)
            results = []
            for row in cursor.fetchall():
                p = dict(row)
                if p.get('precio_total') is not None:
                    p['precio_total'] = float(p['precio_total'])
                if p.get('fecha_compromiso') and isinstance(p['fecha_compromiso'], date):
                    p['fecha_compromiso'] = p['fecha_compromiso'].strftime('%d/%m/%Y')
                if p.get('fecha_pago') and isinstance(p.get('fecha_pago'), date):
                    p['fecha_pago'] = p['fecha_pago'].strftime('%d/%m/%Y')
                results.append(p)
            return results

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


# ==============================================================================
# COMENTARIOS
# ==============================================================================

class ComentariosRepository:

    @staticmethod
    def _format(row):
        if not row:
            return None
        c = dict(row)
        if c.get('id'):
            c['id'] = str(c['id'])
        if c.get('created_at') and hasattr(c['created_at'], 'isoformat'):
            c['created_at'] = c['created_at'].isoformat()
        return c

    @staticmethod
    def get_by_pedido(pedido_numero):
        query = """
            SELECT id, pedido_numero, autor_email, autor_nombre, texto, created_at
            FROM pedido_comentarios
            WHERE pedido_numero = %s
            ORDER BY created_at DESC
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (pedido_numero,))
            return [ComentariosRepository._format(row) for row in cursor.fetchall()]

    @staticmethod
    def create(pedido_numero, autor_email, autor_nombre, texto):
        query = """
            INSERT INTO pedido_comentarios (pedido_numero, autor_email, autor_nombre, texto)
            VALUES (%s, %s, %s, %s)
            RETURNING id, pedido_numero, autor_email, autor_nombre, texto, created_at
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (pedido_numero, autor_email, autor_nombre, texto))
            return ComentariosRepository._format(cursor.fetchone())

    @staticmethod
    def delete(comment_id):
        query = "DELETE FROM pedido_comentarios WHERE id = %s RETURNING id"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (comment_id,))
            return cursor.fetchone() is not None


# ==============================================================================
# ADJUNTOS
# ==============================================================================

class AdjuntosRepository:

    @staticmethod
    def _format(row):
        if not row:
            return None
        a = dict(row)
        if a.get('id'):
            a['id'] = str(a['id'])
        if a.get('created_at') and hasattr(a['created_at'], 'isoformat'):
            a['created_at'] = a['created_at'].isoformat()
        return a

    @staticmethod
    def get_by_pedido(pedido_numero):
        query = """
            SELECT id, pedido_numero, nombre_archivo, nombre_original,
                   tipo_mime, tamano_bytes, storage_path,
                   subido_por_email, subido_por_nombre, created_at
            FROM pedido_adjuntos
            WHERE pedido_numero = %s
            ORDER BY created_at DESC
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (pedido_numero,))
            return [AdjuntosRepository._format(row) for row in cursor.fetchall()]

    @staticmethod
    def create(pedido_numero, nombre_original, tipo_mime, tamano_bytes, storage_path, email, nombre):
        query = """
            INSERT INTO pedido_adjuntos
                (pedido_numero, nombre_archivo, nombre_original, tipo_mime, tamano_bytes, storage_path, subido_por_email, subido_por_nombre)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, pedido_numero, nombre_archivo, nombre_original, tipo_mime, tamano_bytes, storage_path, created_at
        """
        # nombre_archivo = last part of storage_path
        nombre_archivo = storage_path.split('/')[-1] if '/' in storage_path else storage_path
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (pedido_numero, nombre_archivo, nombre_original, tipo_mime, tamano_bytes, storage_path, email, nombre))
            return AdjuntosRepository._format(cursor.fetchone())

    @staticmethod
    def get_by_id(adjunto_id):
        query = "SELECT * FROM pedido_adjuntos WHERE id = %s"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (adjunto_id,))
            return AdjuntosRepository._format(cursor.fetchone())

    @staticmethod
    def delete(adjunto_id):
        query = "DELETE FROM pedido_adjuntos WHERE id = %s RETURNING storage_path"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (adjunto_id,))
            row = cursor.fetchone()
            if row:
                return row['storage_path']
            return None
