"""
Routes - Productos y Personalizaciones (Parametrización)
"""

from flask import Blueprint, request, jsonify
from models.database_manager import ProductosRepository, PersonalizacionesRepository
from utils.auth_decorators import require_auth, admin_only

productos_bp = Blueprint('productos', __name__)


# --- Productos ---

@productos_bp.route('/productos', methods=['GET'])
def obtener_productos():
    try:
        # Only admins can see inactive products
        include_inactive = False
        user = None
        try:
            from utils.supabase_helper import SupabaseHelper
            user = SupabaseHelper.get_current_user()
            if user and user.get('rol') == 'admin' and request.args.get('all') == 'true':
                include_inactive = True
        except:
            pass

        productos = ProductosRepository.get_all(include_inactive=include_inactive)
        return jsonify(productos), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@productos_bp.route('/productos', methods=['POST'])
@admin_only
def crear_producto(user):
    try:
        data = request.json
        for campo in ['sku', 'nombre', 'categoria', 'precio_base', 'costo_material', 'costo_mano_obra']:
            if not data.get(campo) and data.get(campo) != 0:
                return jsonify({'success': False, 'error': f'Campo requerido: {campo}'}), 400

        resultado = ProductosRepository.create(data)
        return jsonify({'success': True, 'producto': resultado}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/productos/<product_id>', methods=['PUT'])
@admin_only
def actualizar_producto(user, product_id):
    try:
        data = request.json
        resultado = ProductosRepository.update(product_id, data)
        if not resultado:
            return jsonify({'success': False, 'error': 'Producto no encontrado'}), 404
        return jsonify({'success': True, 'producto': resultado}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/productos/<product_id>/toggle', methods=['PATCH'])
@admin_only
def toggle_producto(user, product_id):
    try:
        data = request.json
        activo = data.get('activo', False)
        ok = ProductosRepository.toggle_active(product_id, activo)
        if not ok:
            return jsonify({'success': False, 'error': 'Producto no encontrado'}), 404
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# --- Personalizaciones ---

@productos_bp.route('/personalizaciones', methods=['GET'])
def obtener_personalizaciones():
    try:
        include_inactive = False
        try:
            from utils.supabase_helper import SupabaseHelper
            user = SupabaseHelper.get_current_user()
            if user and user.get('rol') == 'admin' and request.args.get('all') == 'true':
                include_inactive = True
        except:
            pass

        items = PersonalizacionesRepository.get_all(include_inactive=include_inactive)
        return jsonify(items), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@productos_bp.route('/personalizaciones', methods=['POST'])
@admin_only
def crear_personalizacion(user):
    try:
        data = request.json
        for campo in ['codigo', 'tipo', 'precio']:
            if not data.get(campo) and data.get(campo) != 0:
                return jsonify({'success': False, 'error': f'Campo requerido: {campo}'}), 400

        resultado = PersonalizacionesRepository.create(data)
        return jsonify({'success': True, 'personalizacion': resultado}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/personalizaciones/<pid>', methods=['PUT'])
@admin_only
def actualizar_personalizacion(user, pid):
    try:
        data = request.json
        resultado = PersonalizacionesRepository.update(pid, data)
        if not resultado:
            return jsonify({'success': False, 'error': 'Personalización no encontrada'}), 404
        return jsonify({'success': True, 'personalizacion': resultado}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/personalizaciones/<pid>/toggle', methods=['PATCH'])
@admin_only
def toggle_personalizacion(user, pid):
    try:
        data = request.json
        activo = data.get('activo', False)
        ok = PersonalizacionesRepository.toggle_active(pid, activo)
        if not ok:
            return jsonify({'success': False, 'error': 'Personalización no encontrada'}), 404
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
