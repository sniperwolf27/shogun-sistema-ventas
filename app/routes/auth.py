"""Routes - Auth"""
from flask import Blueprint, jsonify
from app.auth.supabase_helper import SupabaseHelper

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        user = SupabaseHelper.get_current_user()
        if not user:
            return jsonify({'success': False, 'error': 'No autenticado'}), 401
        if not user.get('activo', False):
            return jsonify({'success': False, 'error': 'Usuario inactivo'}), 403
        return jsonify({
            'success': True,
            'user': {'email': user.get('email'), 'nombre': user.get('nombre'), 'rol': user.get('rol')}
        }), 200
    except Exception as e:
        print(f"Error en /login: {e}")
        return jsonify({'success': False, 'error': 'Error interno del servidor'}), 500


@auth_bp.route('/verify', methods=['GET'])
def verify():
    try:
        user = SupabaseHelper.get_current_user()
        if not user:
            return jsonify({'success': False, 'error': 'Token invalido o expirado', 'code': 'INVALID_TOKEN'}), 401
        return jsonify({
            'success': True,
            'user': {'email': user.get('email'), 'nombre': user.get('nombre'), 'rol': user.get('rol'), 'activo': user.get('activo')}
        }), 200
    except Exception as e:
        print(f"Error en /verify: {e}")
        return jsonify({'success': False, 'error': 'Error verificando token'}), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'success': True, 'message': 'Sesion cerrada'}), 200
