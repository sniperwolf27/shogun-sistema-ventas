"""
Repository — Pedidos
Shared helper _build_item_data() eliminates duplicate logic between
create() and create_multi() (previously copied verbatim).
"""
from datetime import datetime, date, timedelta
from app.models.db_manager import DatabaseManager
from app.models.productos import ProductosRepository
from app.models.personalizaciones import PersonalizacionesRepository


# ── Shared field projection used in every SELECT ────────────────────────────
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
    grupo_pedido,
    created_at
"""

_INSERT_FIELDS = """
    INSERT INTO pedidos (
        cliente_nombre, cliente_telefono, cliente_email, direccion_envio,
        producto_id, producto_sku, producto_nombre, talla_seleccionada, color,
        personalizacion_id, personalizacion_codigo, personalizacion_detalles,
        personalizacion_puntadas,
        fecha_pago, fecha_compromiso,
        precio_producto, precio_personalizacion, precio_envio,
        costo_producto, costo_personalizacion, costo_mano_obra, costos_adicionales,
        canal, metodo_pago, estado_pago
        {extra_cols}
    ) VALUES (
        %(cliente_nombre)s, %(cliente_telefono)s, %(cliente_email)s, %(direccion_envio)s,
        %(producto_id)s, %(producto_sku)s, %(producto_nombre)s, %(talla)s::talla, %(color)s,
        %(personalizacion_id)s, %(personalizacion_codigo)s, %(personalizacion_detalles)s,
        %(personalizacion_puntadas)s,
        %(fecha_pago)s, %(fecha_compromiso)s,
        %(precio_producto)s, %(precio_personalizacion)s, %(precio_envio)s,
        %(costo_producto)s, %(costo_personalizacion)s, %(costo_mano_obra)s, %(costos_adicionales)s,
        %(canal)s::canal_venta, %(metodo_pago)s::metodo_pago, %(estado_pago)s::estado_pago
        {extra_vals}
    )
    RETURNING numero_pedido, fecha_compromiso, precio_total, ganancia
"""


def _format_pedido(row):
    """Convert raw DB row to dict with proper types."""
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


def _build_item_data(item_data, shared_data, producto, pers_cache=None, precio_envio=None):
    """
    Shared business logic for a single order item.
    Called by both create() and create_multi() to eliminate duplication.

    item_data:   dict with product/customization/sizing fields
    shared_data: dict with customer info (may be same as item_data for single orders)
    producto:    already-fetched product dict
    pers_cache:  optional dict of {codigo: pers} to avoid extra DB queries
    precio_envio: explicit shipping cost (overrides item_data value when provided)
    """
    puntadas = int(item_data.get('personalizacion_puntadas', 0) or 0)
    personalizacion_id = None
    precio_personalizacion = 0
    costo_personalizacion = 0

    tipo_pers = item_data.get('personalizacion_tipo')
    if tipo_pers and tipo_pers != 'ninguna':
        if pers_cache and tipo_pers in pers_cache:
            pers = pers_cache[tipo_pers]
        else:
            pers = PersonalizacionesRepository.get_by_codigo(tipo_pers)

        if pers:
            personalizacion_id = pers['id']
            if pers.get('metodo_calculo') == 'puntadas':
                precio_personalizacion = 0
                costo_personalizacion = 0
            else:
                precio_personalizacion = float(pers['precio'])
                costo_personalizacion = precio_personalizacion * 0.5

    costo_por_mil = float(item_data.get('costo_por_mil_puntadas', 0) or 0)
    costo_mano_obra = (puntadas / 1000) * costo_por_mil if puntadas > 0 and costo_por_mil > 0 else 0
    costos_adicionales = float(item_data.get('costos_adicionales', 0) or 0)

    precio_venta = float(item_data.get('precio_venta', 0) or 0)
    if precio_venta <= 0:
        precio_venta = float(producto['precio_base'])

    tiempo_str = item_data.get('tiempo_estimado', shared_data.get('tiempo_estimado', '7'))
    dias = int(str(tiempo_str).split()[0])
    fecha_pago = datetime.now().date()
    fecha_compromiso = fecha_pago + timedelta(days=dias)

    if precio_envio is None:
        precio_envio = float(item_data.get('costo_envio', shared_data.get('costo_envio', 200)) or 200)

    return {
        'cliente_nombre': shared_data['nombre_cliente'],
        'cliente_telefono': shared_data['telefono'],
        'cliente_email': shared_data.get('email') or None,
        'direccion_envio': shared_data['direccion'],
        'producto_id': producto['id'],
        'producto_sku': item_data.get('producto_sku', shared_data.get('producto_sku')),
        'producto_nombre': item_data.get('producto_nombre', producto['nombre']),
        'talla': item_data.get('talla', shared_data.get('talla')),
        'color': item_data.get('color') or None,
        'personalizacion_id': personalizacion_id,
        'personalizacion_codigo': tipo_pers if personalizacion_id else None,
        'personalizacion_detalles': item_data.get('personalizacion_detalles') or None,
        'personalizacion_puntadas': puntadas,
        'fecha_pago': fecha_pago,
        'fecha_compromiso': fecha_compromiso,
        'precio_producto': precio_venta,
        'precio_personalizacion': precio_personalizacion,
        'precio_envio': precio_envio,
        'costo_producto': float(producto.get('costo_material', 0) or 0),
        'costo_personalizacion': costo_personalizacion,
        'costo_mano_obra': costo_mano_obra,
        'costos_adicionales': costos_adicionales,
        'canal': shared_data['canal'],
        'metodo_pago': shared_data['banco'],
        'estado_pago': shared_data['estatus_pago'],
    }


class PedidosRepository:

    # Expose for tests / other modules
    _SELECT_FIELDS = _SELECT_FIELDS

    @staticmethod
    def _format_pedido(row):
        return _format_pedido(row)

    # ── Queries ─────────────────────────────────────────────────────────────

    @staticmethod
    def get_all(page=1, limit=25, q=None, estado=None, canal=None):
        conditions = []
        filter_params = {}
        if q:
            conditions.append(
                "(cliente_nombre ILIKE %(q)s OR numero_pedido ILIKE %(q)s "
                "OR producto_nombre ILIKE %(q)s OR cliente_telefono ILIKE %(q)s)"
            )
            filter_params['q'] = f'%{q}%'
        if estado:
            conditions.append("estado_produccion::text = %(estado)s")
            filter_params['estado'] = estado
        if canal:
            conditions.append("canal::text = %(canal)s")
            filter_params['canal'] = canal

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        offset = (page - 1) * limit
        page_params = {**filter_params, 'limit': limit, 'offset': offset}

        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) as total FROM pedidos {where}", filter_params)
            total = cursor.fetchone()['total']
            cursor.execute(
                f"SELECT {_SELECT_FIELDS} FROM pedidos {where} "
                f"ORDER BY created_at DESC LIMIT %(limit)s OFFSET %(offset)s",
                page_params
            )
            pedidos = [_format_pedido(row) for row in cursor.fetchall()]
        return {
            'pedidos': pedidos,
            'total': total,
            'page': page,
            'limit': limit,
            'pages': max(1, -(-total // limit))
        }

    @staticmethod
    def get_by_id(pedido_id):
        query = f"SELECT {_SELECT_FIELDS} FROM pedidos WHERE numero_pedido = %s"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (pedido_id,))
            return _format_pedido(cursor.fetchone())

    @staticmethod
    def create(data):
        """Single-item order creation."""
        producto = ProductosRepository.get_by_sku(data['producto_sku'])
        if not producto:
            raise ValueError(f"Producto no encontrado: {data['producto_sku']}")

        pedido_data = _build_item_data(data, data, producto)

        query = _INSERT_FIELDS.format(extra_cols='', extra_vals='')
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
    def create_multi(items, shared_data):
        """
        Create multiple orders linked by grupo_pedido.
        Uses batch SKU fetch to avoid N+1 queries.
        """
        # Generate group ID
        with DatabaseManager.get_cursor(dict_cursor=False) as cursor:
            cursor.execute("SELECT generar_grupo_pedido()")
            row = cursor.fetchone()
            grupo_id = row[0] if row else None

        if not grupo_id:
            grupo_id = 'G' + datetime.now().strftime('%Y%m%d%H%M%S')

        # Batch-fetch all referenced products (eliminates N+1)
        skus = {item['producto_sku'] for item in items}
        productos_map = ProductosRepository.get_by_skus(skus)

        # Batch-fetch personalizaciones
        codigos = {
            item['personalizacion_tipo']
            for item in items
            if item.get('personalizacion_tipo') and item['personalizacion_tipo'] != 'ninguna'
        }
        pers_map = PersonalizacionesRepository.get_by_codigos(codigos)

        resultados = []
        envio_total = float(shared_data.get('costo_envio', 200) or 200)

        query = _INSERT_FIELDS.format(
            extra_cols=', grupo_pedido',
            extra_vals=', %(grupo_pedido)s'
        )

        for idx, item in enumerate(items):
            sku = item['producto_sku']
            producto = productos_map.get(sku)
            if not producto:
                raise ValueError(f"Producto no encontrado: {sku}")

            # Only the first item gets the shipping cost
            precio_envio = envio_total if idx == 0 else 0
            pedido_data = _build_item_data(
                item, shared_data, producto,
                pers_cache=pers_map,
                precio_envio=precio_envio
            )
            pedido_data['grupo_pedido'] = grupo_id

            with DatabaseManager.get_cursor() as cursor:
                cursor.execute(query, pedido_data)
                result = cursor.fetchone()
                resultados.append({
                    'id': result['numero_pedido'],
                    'producto': item.get('producto_nombre', producto['nombre']),
                    'total': float(result['precio_total']),
                    'ganancia': float(result['ganancia'])
                })

        return {
            'grupo_pedido': grupo_id,
            'pedidos': resultados,
            'total_grupo': sum(r['total'] for r in resultados),
            'cantidad': len(resultados)
        }

    @staticmethod
    def update(pedido_id, data):
        campos = []
        params = {'pedido_id': pedido_id}

        simple_fields = {
            'cliente': 'cliente_nombre',
            'telefono': 'cliente_telefono',
            'direccion': 'direccion_envio',
            'personalizacion': 'personalizacion_detalles',
            'color': 'color',
        }
        for key, col in simple_fields.items():
            if key in data:
                campos.append(f'{col} = %({key})s')
                params[key] = data[key] if data[key] else None

        if 'email' in data:
            campos.append('cliente_email = %(email)s')
            params['email'] = data['email'] if data['email'] else None

        enum_fields = {
            'estatus_produccion': ('estado_produccion', 'estado_produccion'),
            'estatus_pago': ('estado_pago', 'estado_pago'),
            'banco': ('metodo_pago', 'metodo_pago'),
            'canal': ('canal', 'canal_venta'),
        }
        for key, (col, enum_name) in enum_fields.items():
            if key in data and data[key]:
                campos.append(f"{col} = %({key})s::{enum_name}")
                params[key] = data[key]

        if 'fecha_entrega_real' in data:
            val = data['fecha_entrega_real']
            if val and '/' in val:
                partes = val.split('/')
                if len(partes) == 3:
                    try:
                        params['fecha_entrega'] = date(
                            int(partes[2]), int(partes[1]), int(partes[0])
                        )
                        campos.append('fecha_entrega_real = %(fecha_entrega)s')
                    except (ValueError, IndexError):
                        pass
            elif not val:
                campos.append('fecha_entrega_real = NULL')

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

        # ── Puntadas recalculation ────────────────────────────────────────────
        # When the stitch count changes, recalculate costo_mano_obra and let
        # the DB trigger update precio_total / ganancia automatically.
        if 'puntadas' in data and data['puntadas'] is not None and data['puntadas'] != '':
            try:
                nuevas_puntadas = int(data['puntadas'])
                campos.append('personalizacion_puntadas = %(puntadas)s')
                params['puntadas'] = nuevas_puntadas

                # Only recalc costo_mano_obra if not also explicitly sent
                if 'costo_mano_obra' not in data:
                    # Fetch the personalizacion's cost-per-1k from the order itself
                    with DatabaseManager.get_cursor() as cursor:
                        cursor.execute(
                            """SELECT p.costo_por_mil_puntadas
                               FROM personalizaciones p
                               JOIN pedidos pe ON pe.personalizacion_id = p.id
                               WHERE pe.numero_pedido = %(pid)s AND p.metodo_calculo = 'puntadas'""",
                            {'pid': pedido_id}
                        )
                        row = cursor.fetchone()
                    costo_mil = float(row['costo_por_mil_puntadas']) if row else 0
                    nuevo_costo_mo = (nuevas_puntadas / 1000) * costo_mil if costo_mil > 0 else 0
                    campos.append('costo_mano_obra = %(costo_mano_obra_calc)s')
                    params['costo_mano_obra_calc'] = nuevo_costo_mo
            except (ValueError, TypeError):
                pass

        if not campos:
            return True

        query = (
            f"UPDATE pedidos SET {', '.join(campos)} "
            f"WHERE numero_pedido = %(pedido_id)s "
            f"RETURNING numero_pedido, precio_total, ganancia"
        )
        try:
            with DatabaseManager.get_cursor() as cursor:
                cursor.execute(query, params)
                row = cursor.fetchone()
                if not row:
                    return False
                return {
                    'success': True,
                    'precio_total': float(row['precio_total']),
                    'ganancia': float(row['ganancia']),
                }
        except Exception as e:
            print(f"[PEDIDO UPDATE ERROR] pedido={pedido_id} error={e}")
            raise

    @staticmethod
    def delete(pedido_id):
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(
                "DELETE FROM pedidos WHERE numero_pedido = %s RETURNING numero_pedido",
                (pedido_id,)
            )
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
                results.append(p)
            return results

    @staticmethod
    def buscar(query_text):
        query = f"""
            SELECT {_SELECT_FIELDS}
            FROM pedidos
            WHERE cliente_nombre ILIKE %(q)s OR numero_pedido ILIKE %(q)s
               OR producto_nombre ILIKE %(q)s OR cliente_telefono ILIKE %(q)s
            ORDER BY created_at DESC
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, {'q': f'%{query_text}%'})
            return [_format_pedido(row) for row in cursor.fetchall()]

    @staticmethod
    def check_duplicado(telefono, sku, talla, days=7):
        fecha_limite = datetime.now() - timedelta(days=days)
        query = f"""
            SELECT {_SELECT_FIELDS}
            FROM pedidos
            WHERE cliente_telefono = %(telefono)s
              AND producto_sku = %(sku)s
              AND talla_seleccionada::text = %(talla)s
              AND estado_produccion NOT IN ('Entregado', 'Cancelado')
              AND created_at >= %(fecha_limite)s
            ORDER BY created_at DESC LIMIT 3
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, {
                'telefono': telefono, 'sku': sku,
                'talla': talla, 'fecha_limite': fecha_limite
            })
            return [_format_pedido(row) for row in cursor.fetchall()]

    @staticmethod
    def get_alertas_retraso(dias_antes=2):
        fecha_hasta = date.today() + timedelta(days=dias_antes)
        fecha_desde = date.today() - timedelta(days=7)
        query = """
            SELECT numero_pedido as id, cliente_nombre as cliente, producto_nombre as producto,
                   talla_seleccionada::text as talla, fecha_compromiso,
                   estado_produccion::text as estatus_produccion, cliente_telefono as telefono,
                   CASE WHEN fecha_compromiso < CURRENT_DATE THEN 'vencido'
                        WHEN fecha_compromiso = CURRENT_DATE THEN 'hoy'
                        ELSE 'proximo' END as urgencia
            FROM pedidos
            WHERE estado_produccion NOT IN ('Entregado', 'Cancelado')
              AND fecha_compromiso IS NOT NULL
              AND fecha_compromiso BETWEEN %(desde)s AND %(hasta)s
            ORDER BY fecha_compromiso ASC LIMIT 20
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, {'desde': fecha_desde, 'hasta': fecha_hasta})
            results = []
            for row in cursor.fetchall():
                r = dict(row)
                if r.get('fecha_compromiso') and isinstance(r['fecha_compromiso'], date):
                    r['fecha_compromiso'] = r['fecha_compromiso'].strftime('%d/%m/%Y')
                results.append(r)
            return results

    @staticmethod
    def bulk_update_estado(ids, nuevo_estado):
        if not ids:
            return 0
        placeholders = ','.join(['%s'] * len(ids))
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(
                f"UPDATE pedidos SET estado_produccion = %s::estado_produccion "
                f"WHERE numero_pedido IN ({placeholders}) RETURNING numero_pedido",
                [nuevo_estado] + list(ids)
            )
            return len(cursor.fetchall())

    @staticmethod
    def get_by_grupo(grupo_id):
        query = f"""
            SELECT {_SELECT_FIELDS}
            FROM pedidos WHERE grupo_pedido = %s
            ORDER BY created_at ASC
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (grupo_id,))
            return [_format_pedido(row) for row in cursor.fetchall()]
