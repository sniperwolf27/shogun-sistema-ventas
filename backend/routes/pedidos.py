"""
Routes - Pedidos
Endpoints con control de acceso por roles
"""

from flask import Blueprint, request, jsonify
from models.database_manager import PedidosRepository
from utils.auth_decorators import require_auth, require_role, admin_only

pedidos_bp = Blueprint('pedidos', __name__)

@pedidos_bp.route('/pedidos', methods=['GET'])
@require_auth
def obtener_pedidos(user):
    """GET /api/pedidos - Admin y vendedor pueden ver pedidos"""
    try:
        pedidos = PedidosRepository.get_all()
        return jsonify(pedidos), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pedidos_bp.route('/pedidos/<pedido_id>', methods=['GET'])
@require_auth
def obtener_pedido(user, pedido_id):
    """GET /api/pedidos/<id> - Admin y vendedor pueden ver un pedido"""
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
    """POST /api/pedidos - Solo admin puede crear pedidos"""
    try:
        data = request.json
        
        campos_requeridos = [
            'producto_sku', 'talla', 'nombre_cliente', 
            'telefono', 'direccion', 'canal', 'banco', 'estatus_pago'
        ]
        
        for campo in campos_requeridos:
            if not data.get(campo):
                return jsonify({
                    'success': False,
                    'error': f'Campo requerido faltante: {campo}'
                }), 400
        
        resultado = PedidosRepository.create(data)
        
        return jsonify({
            'success': True,
            'pedido_id': resultado['id'],
            'created_by': user['email']
        }), 201
        
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pedidos_bp.route('/pedidos/<pedido_id>', methods=['PUT'])
@require_auth
def actualizar_pedido(user, pedido_id):
    """PUT /api/pedidos/<id> - Admin y vendedor pueden actualizar"""
    try:
        data = request.json
        actualizado = PedidosRepository.update(pedido_id, data)
        
        if not actualizado:
            return jsonify({'success': False, 'error': 'Pedido no encontrado'}), 404
        
        return jsonify({
            'success': True,
            'updated_by': user['email']
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pedidos_bp.route('/pedidos/<pedido_id>', methods=['DELETE'])
@admin_only
def eliminar_pedido(user, pedido_id):
    """DELETE /api/pedidos/<id> - Solo admin puede eliminar"""
    try:
        eliminado = PedidosRepository.delete(pedido_id)
        
        if not eliminado:
            return jsonify({'success': False, 'error': 'Pedido no encontrado'}), 404
        
        return jsonify({
            'success': True,
            'deleted_by': user['email']
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pedidos_bp.route('/pedidos/pendientes', methods=['GET'])
@require_auth
def obtener_pendientes(user):
    """GET /api/pedidos/pendientes - Admin y vendedor"""
    try:
        pendientes = PedidosRepository.get_pendientes()
        return jsonify(pendientes), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pedidos_bp.route('/pedidos/buscar', methods=['GET'])
@require_auth
def buscar_pedidos(user):
    """GET /api/pedidos/buscar?q=<termino> - Admin y vendedor"""
    try:
        termino = request.args.get('q', '')
        
        if not termino:
            return jsonify({'error': 'ParÃ¡metro "q" requerido'}), 400
        
        resultados = PedidosRepository.buscar(termino)
        return jsonify(resultados), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
