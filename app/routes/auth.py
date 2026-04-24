"""Routes - Auth (custom JWT, sin Supabase)"""
from flask import Blueprint, jsonify, request
from app.auth.jwt_helper import login, get_current_user, change_password
from app.auth.decorators import require_auth

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def do_login():
    try:
        body = request.get_json(silent=True) or {}
        email = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''

        if not email or not password:
            return jsonify({'success': False, 'error': 'Email y contraseña requeridos'}), 400

        result = login(email, password)
        if not result:
            return jsonify({'success': False, 'error': 'Credenciales incorrectas'}), 401

        return jsonify({'success': True, **result}), 200
    except Exception as e:
        print(f"Error en /login: {e}")
        return jsonify({'success': False, 'error': 'Error interno del servidor'}), 500


@auth_bp.route('/verify', methods=['GET'])
def verify():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'success': False, 'error': 'Token inválido o expirado',
                            'code': 'INVALID_TOKEN'}), 401
        return jsonify({
            'success': True,
            'user': {
                'email': user.get('email'),
                'nombre': user.get('nombre'),
                'rol': user.get('rol'),
                'activo': user.get('activo'),
            }
        }), 200
    except Exception as e:
        print(f"Error en /verify: {e}")
        return jsonify({'success': False, 'error': 'Error verificando token'}), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'success': True, 'message': 'Sesión cerrada'}), 200


@auth_bp.route('/change-password', methods=['POST'])
@require_auth
def do_change_password(user):
    try:
        body = request.get_json(silent=True) or {}
        new_password = body.get('new_password') or ''
        if len(new_password) < 8:
            return jsonify({'success': False, 'error': 'La contraseña debe tener al menos 8 caracteres'}), 400
        ok = change_password(user['email'], new_password)
        if not ok:
            return jsonify({'success': False, 'error': 'Error al actualizar contraseña'}), 500
        return jsonify({'success': True, 'message': 'Contraseña actualizada'}), 200
    except Exception as e:
        print(f"Error en /change-password: {e}")
        return jsonify({'success': False, 'error': 'Error interno del servidor'}), 500
