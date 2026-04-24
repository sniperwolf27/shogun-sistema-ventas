"""
Authorization Decorators
"""
from functools import wraps
from flask import jsonify
from app.auth.jwt_helper import get_current_user


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'No autenticado', 'code': 'AUTH_REQUIRED'}), 401
        if not user.get('activo'):
            return jsonify({'error': 'Usuario inactivo', 'code': 'USER_INACTIVE'}), 403
        return f(user=user, *args, **kwargs)
    return decorated


def admin_only(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'No autenticado', 'code': 'AUTH_REQUIRED'}), 401
        if not user.get('activo'):
            return jsonify({'error': 'Usuario inactivo', 'code': 'USER_INACTIVE'}), 403
        if user.get('rol') != 'admin':
            return jsonify({'error': 'Requiere rol de administrador', 'code': 'ADMIN_REQUIRED'}), 403
        return f(user=user, *args, **kwargs)
    return decorated
