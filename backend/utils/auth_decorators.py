"""
Authorization Decorators
Control de acceso con cÃ³digos HTTP correctos (401 vs 403)
"""

from functools import wraps
from flask import jsonify
from utils.supabase_helper import SupabaseHelper

def require_auth(f):
    """Requiere autenticaciÃ³n - 401 si no autenticado"""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = SupabaseHelper.get_current_user()
        
        if not user:
            return jsonify({'error': 'No autenticado', 'code': 'AUTH_REQUIRED'}), 401
        
        if not user.get('activo'):
            return jsonify({'error': 'Usuario inactivo', 'code': 'USER_INACTIVE'}), 403
        
        return f(user=user, *args, **kwargs)
    
    return decorated


def require_role(*allowed_roles):
    """Requiere uno de los roles - 401 si no auth, 403 si sin permisos"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = SupabaseHelper.get_current_user()
            
            if not user:
                return jsonify({'error': 'No autenticado', 'code': 'AUTH_REQUIRED'}), 401
            
            if not user.get('activo'):
                return jsonify({'error': 'Usuario inactivo', 'code': 'USER_INACTIVE'}), 403
            
            if user.get('rol') not in allowed_roles:
                return jsonify({
                    'error': 'Acceso denegado',
                    'code': 'INSUFFICIENT_PERMISSIONS',
                    'required_roles': list(allowed_roles),
                    'your_role': user.get('rol')
                }), 403
            
            return f(user=user, *args, **kwargs)
        
        return decorated
    return decorator


def admin_only(f):
    """Solo admins - 401 si no auth, 403 si no es admin"""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = SupabaseHelper.get_current_user()
        
        if not user:
            return jsonify({'error': 'No autenticado', 'code': 'AUTH_REQUIRED'}), 401
        
        if not user.get('activo'):
            return jsonify({'error': 'Usuario inactivo', 'code': 'USER_INACTIVE'}), 403
        
        if user.get('rol') != 'admin':
            return jsonify({
                'error': 'Requiere rol de administrador',
                'code': 'ADMIN_REQUIRED',
                'your_role': user.get('rol')
            }), 403
        
        return f(user=user, *args, **kwargs)
    
    return decorated
