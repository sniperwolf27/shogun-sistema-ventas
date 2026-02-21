"""Routes - Pedidos"""
from flask import Blueprint, request, jsonify
from app.models.database import PedidosRepository
from app.auth.decorators import require_auth, admin_only

pedidos_bp = Blueprint('pedidos', __name__)


@pedidos_bp.route('/pedidos', methods=['GET'])
@require_auth
def obtener_pedidos(user):
    try:
        page = max(1, int(request.args.get('page', 1)))
        limit = min(max(1, int(request.args.get('limit', 25))), 500)
        q = request.args.get('q', '').strip() or None
        estado = request.args.get('estado', '').strip() or None
        canal = request.args.get('canal', '').strip() or None
        return jsonify(PedidosRepository.get_all(page=page, limit=limit, q=q, estado=estado, canal=canal)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pedidos_bp.route('/pedidos/check-duplicado', methods=['GET'])
@require_auth
def check_duplicado(user):
    telefono = request.args.get('telefono', '').strip()
    sku = request.args.get('sku', '').strip()
    talla = request.args.get('talla', '').strip()
    if not all([telefono, sku, talla]):
        return jsonify({'duplicados': []}), 200
    try:
        duplicados = PedidosRepository.check_duplicado(telefono, sku, talla)
        return jsonify({'duplicados': duplicados}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pedidos_bp.route('/pedidos/alertas', methods=['GET'])
@require_auth
def obtener_alertas_retraso(user):
    try:
        return jsonify(PedidosRepository.get_alertas_retraso()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pedidos_bp.route('/pedidos/pendientes', methods=['GET'])
@require_auth
def obtener_pendientes(user):
    try:
        return jsonify(PedidosRepository.get_pendientes()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pedidos_bp.route('/pedidos/buscar', methods=['GET'])
@require_auth
def buscar_pedidos(user):
    try:
        termino = request.args.get('q', '')
        if not termino:
            return jsonify({'error': 'Parametro "q" requerido'}), 400
        return jsonify(PedidosRepository.buscar(termino)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pedidos_bp.route('/pedidos/bulk', methods=['PATCH'])
@require_auth
def bulk_update_pedidos(user):
    data = request.json or {}
    ids = data.get('ids', [])
    nuevo_estado = data.get('estatus_produccion', '')
    if not ids:
        return jsonify({'success': False, 'error': 'IDs requeridos'}), 400
    if not nuevo_estado:
        return jsonify({'success': False, 'error': 'Estado requerido'}), 400
    if len(ids) > 100:
        return jsonify({'success': False, 'error': 'Máximo 100 pedidos por operación'}), 400
    try:
        updated = PedidosRepository.bulk_update_estado(ids, nuevo_estado)
        return jsonify({'success': True, 'updated': updated}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pedidos_bp.route('/pedidos/por-grupo/<grupo_id>', methods=['GET'])
@require_auth
def pedidos_por_grupo(user, grupo_id):
    try:
        return jsonify(PedidosRepository.get_by_grupo(grupo_id)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pedidos_bp.route('/pedidos/<pedido_id>', methods=['GET'])
@require_auth
def obtener_pedido(user, pedido_id):
    try:
        pedido = PedidosRepository.get_by_id(pedido_id)
        if pedido is None:
            return jsonify({'error': 'Pedido no encontrado'}), 404
        return jsonify(pedido), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pedidos_bp.route('/pedidos', methods=['POST'])
@admin_only
def crear_pedido(user):
    try:
        data = request.json
        for campo in ['producto_sku', 'talla', 'nombre_cliente', 'telefono', 'direccion', 'canal', 'banco', 'estatus_pago']:
            if not data.get(campo):
                return jsonify({'success': False, 'error': f'Campo requerido faltante: {campo}'}), 400
        resultado = PedidosRepository.create(data)
        return jsonify({'success': True, 'pedido_id': resultado['id'], 'created_by': user['email']}), 201
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pedidos_bp.route('/pedidos/<pedido_id>', methods=['PUT'])
@require_auth
def actualizar_pedido(user, pedido_id):
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        # Mejora 9: Get current state before update for historial
        pedido_antes = None
        try:
            pedido_antes = PedidosRepository.get_by_id(pedido_id)
        except:
            pass

        actualizado = PedidosRepository.update(pedido_id, data)
        if not actualizado:
            return jsonify({'success': False, 'error': 'Pedido no encontrado'}), 404

        # Mejora 9: Log changes to historial
        if pedido_antes:
            try:
                from app.models.database import HistorialRepository
                field_map = {
                    'estatus_produccion': 'estatus_produccion',
                    'estatus_pago': 'estatus_pago',
                    'cliente': 'cliente',
                    'telefono': 'telefono',
                    'email': 'email',
                    'direccion': 'direccion',
                    'banco': 'banco',
                    'canal': 'canal',
                    'color': 'color',
                    'precio_producto': 'precio_producto',
                    'precio_envio': 'precio_envio',
                    'costos_adicionales': 'costos_adicionales',
                    'fecha_entrega_real': 'fecha_entrega_real',
                }
                for field_key, pedido_key in field_map.items():
                    if field_key in data:
                        old_val = pedido_antes.get(pedido_key, '')
                        new_val = data[field_key]
                        if str(old_val or '').strip() != str(new_val or '').strip():
                            HistorialRepository.registrar_cambio(
                                pedido_numero=pedido_id,
                                campo=field_key,
                                valor_anterior=old_val,
                                valor_nuevo=new_val,
                                usuario_email=user.get('email', ''),
                                usuario_nombre=user.get('nombre', '')
                            )
            except Exception as hist_err:
                print(f"[HISTORIAL] Warning: {hist_err}")

        return jsonify({'success': True, 'updated_by': user['email']}), 200
    except Exception as e:
        print(f"[PUT /pedidos/{pedido_id}] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@pedidos_bp.route('/pedidos/<pedido_id>', methods=['DELETE'])
@admin_only
def eliminar_pedido(user, pedido_id):
    try:
        eliminado = PedidosRepository.delete(pedido_id)
        if not eliminado:
            return jsonify({'success': False, 'error': 'Pedido no encontrado'}), 404
        return jsonify({'success': True, 'deleted_by': user['email']}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pedidos_bp.route('/pedidos/multi', methods=['POST'])
@admin_only
def crear_pedido_multi(user):
    """POST /api/pedidos/multi - Crear pedido con múltiples artículos"""
    try:
        data = request.json
        items = data.get('items', [])
        shared = data.get('shared', {})

        if not items or len(items) == 0:
            return jsonify({'success': False, 'error': 'Se requiere al menos un artículo'}), 400

        # Validate shared fields
        for campo in ['nombre_cliente', 'telefono', 'direccion', 'canal', 'banco', 'estatus_pago']:
            if not shared.get(campo):
                return jsonify({'success': False, 'error': f'Campo requerido faltante: {campo}'}), 400

        # Validate each item
        for i, item in enumerate(items):
            if not item.get('producto_sku'):
                return jsonify({'success': False, 'error': f'Artículo #{i+1}: producto requerido'}), 400
            if not item.get('talla'):
                return jsonify({'success': False, 'error': f'Artículo #{i+1}: talla requerida'}), 400

        resultado = PedidosRepository.create_multi(items, shared)
        return jsonify({
            'success': True,
            'grupo_pedido': resultado['grupo_pedido'],
            'pedidos': resultado['pedidos'],
            'total': resultado['total_grupo'],
            'cantidad': resultado['cantidad'],
            'created_by': user['email']
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        print(f"[POST /pedidos/multi] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# NOTE: /pedidos/pendientes and /pedidos/buscar are registered ABOVE
# the wildcard /pedidos/<pedido_id> route to prevent Flask from
# matching "pendientes" or "buscar" as a pedido_id parameter.
