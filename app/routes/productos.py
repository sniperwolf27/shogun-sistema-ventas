"""Routes - Productos, Personalizaciones y Categorías"""
from flask import Blueprint, request, jsonify
from app.models.database import ProductosRepository, PersonalizacionesRepository, CategoriasRepository
from app.auth.decorators import admin_only
from app.auth.supabase_helper import SupabaseHelper

productos_bp = Blueprint('productos', __name__)


# --- Categorías ---

@productos_bp.route('/categorias', methods=['GET'])
def obtener_categorias():
    try:
        include_inactive = False
        try:
            user = SupabaseHelper.get_current_user()
            if user and user.get('rol') == 'admin' and request.args.get('all') == 'true':
                include_inactive = True
        except Exception:
            pass
        return jsonify(CategoriasRepository.get_all(include_inactive=include_inactive)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@productos_bp.route('/categorias', methods=['POST'])
@admin_only
def crear_categoria(user):
    try:
        data = request.json
        if not data.get('nombre'):
            return jsonify({'success': False, 'error': 'Campo requerido: nombre'}), 400
        return jsonify({'success': True, 'categoria': CategoriasRepository.create(data)}), 201
    except Exception as e:
        error_msg = str(e)
        if 'unique' in error_msg.lower() or 'duplicate' in error_msg.lower():
            return jsonify({'success': False, 'error': 'Ya existe una categoría con ese nombre'}), 400
        return jsonify({'success': False, 'error': error_msg}), 500


@productos_bp.route('/categorias/<cat_id>', methods=['PUT'])
@admin_only
def actualizar_categoria(user, cat_id):
    try:
        resultado = CategoriasRepository.update(cat_id, request.json)
        if not resultado:
            return jsonify({'success': False, 'error': 'Categoría no encontrada'}), 404
        return jsonify({'success': True, 'categoria': resultado}), 200
    except Exception as e:
        error_msg = str(e)
        if 'unique' in error_msg.lower() or 'duplicate' in error_msg.lower():
            return jsonify({'success': False, 'error': 'Ya existe una categoría con ese nombre'}), 400
        return jsonify({'success': False, 'error': error_msg}), 500


@productos_bp.route('/categorias/<cat_id>/toggle', methods=['PATCH'])
@admin_only
def toggle_categoria(user, cat_id):
    try:
        activo = request.json.get('activo', False)
        ok = CategoriasRepository.toggle_active(cat_id, activo)
        if not ok:
            return jsonify({'success': False, 'error': 'Categoría no encontrada'}), 404
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# --- Productos ---

@productos_bp.route('/productos', methods=['GET'])
def obtener_productos():
    try:
        include_inactive = False
        try:
            user = SupabaseHelper.get_current_user()
            if user and user.get('rol') == 'admin' and request.args.get('all') == 'true':
                include_inactive = True
        except Exception:
            pass
        return jsonify(ProductosRepository.get_all(include_inactive=include_inactive)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@productos_bp.route('/productos/validar-sku', methods=['GET'])
@admin_only
def validar_sku(user):
    """Validate if a SKU is available"""
    try:
        sku = request.args.get('sku', '')
        exclude_id = request.args.get('exclude', '')
        if not sku:
            return jsonify({'valid': False, 'error': 'SKU vacío'}), 400
        exists = ProductosRepository.sku_exists(sku, exclude_id or None)
        return jsonify({'valid': not exists, 'exists': exists}), 200
    except Exception as e:
        return jsonify({'valid': False, 'error': str(e)}), 500


@productos_bp.route('/productos', methods=['POST'])
@admin_only
def crear_producto(user):
    try:
        data = request.json
        for campo in ['sku', 'nombre', 'categoria', 'precio_base', 'costo_material', 'costo_mano_obra']:
            if not data.get(campo) and data.get(campo) != 0:
                return jsonify({'success': False, 'error': f'Campo requerido: {campo}'}), 400
        return jsonify({'success': True, 'producto': ProductosRepository.create(data)}), 201
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/productos/<product_id>', methods=['PUT'])
@admin_only
def actualizar_producto(user, product_id):
    try:
        resultado = ProductosRepository.update(product_id, request.json)
        if not resultado:
            return jsonify({'success': False, 'error': 'Producto no encontrado'}), 404
        return jsonify({'success': True, 'producto': resultado}), 200
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/productos/<product_id>/toggle', methods=['PATCH'])
@admin_only
def toggle_producto(user, product_id):
    try:
        activo = request.json.get('activo', False)
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
            user = SupabaseHelper.get_current_user()
            if user and user.get('rol') == 'admin' and request.args.get('all') == 'true':
                include_inactive = True
        except Exception:
            pass
        return jsonify(PersonalizacionesRepository.get_all(include_inactive=include_inactive)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@productos_bp.route('/personalizaciones', methods=['POST'])
@admin_only
def crear_personalizacion(user):
    try:
        data = request.json
        for campo in ['codigo', 'tipo']:
            if not data.get(campo) and data.get(campo) != 0:
                return jsonify({'success': False, 'error': f'Campo requerido: {campo}'}), 400
        if data.get('metodo_calculo') == 'puntadas':
            data.setdefault('precio', 0)
        elif not data.get('precio') and data.get('precio') != 0:
            return jsonify({'success': False, 'error': 'Campo requerido: precio'}), 400
        return jsonify({'success': True, 'personalizacion': PersonalizacionesRepository.create(data)}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/personalizaciones/<pid>', methods=['PUT'])
@admin_only
def actualizar_personalizacion(user, pid):
    try:
        resultado = PersonalizacionesRepository.update(pid, request.json)
        if not resultado:
            return jsonify({'success': False, 'error': 'Personalización no encontrada'}), 404
        return jsonify({'success': True, 'personalizacion': resultado}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/personalizaciones/<pid>/toggle', methods=['PATCH'])
@admin_only
def toggle_personalizacion(user, pid):
    try:
        activo = request.json.get('activo', False)
        ok = PersonalizacionesRepository.toggle_active(pid, activo)
        if not ok:
            return jsonify({'success': False, 'error': 'Personalización no encontrada'}), 404
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
