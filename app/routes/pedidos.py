"""Routes - Pedidos"""
from flask import Blueprint, request, jsonify
from app.models.database import PedidosRepository
from app.auth.decorators import require_auth, admin_only

pedidos_bp = Blueprint('pedidos', __name__)


@pedidos_bp.route('/pedidos', methods=['GET'])
@require_auth
def obtener_pedidos(user):
    try:
        return jsonify(PedidosRepository.get_all()), 200
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
        actualizado = PedidosRepository.update(pedido_id, data)
        if not actualizado:
            return jsonify({'success': False, 'error': 'Pedido no encontrado'}), 404
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
