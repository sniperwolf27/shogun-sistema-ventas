"""
Routes - Auth
AutenticaciÃ³n basada en Supabase Auth (JWT ES256)
El backend solo verifica y autoriza
"""

from flask import Blueprint, request, jsonify
from utils.supabase_helper import SupabaseHelper

# Blueprint
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    POST /api/login
    El frontend ya se autenticÃ³ con Supabase.
    AquÃ­ solo validamos el usuario y devolvemos su info.
    """
    try:
        user = SupabaseHelper.get_current_user()

        if not user:
            return jsonify({
                'success': False,
                'error': 'No autenticado'
            }), 401

        if not user.get('activo', False):
            return jsonify({
                'success': False,
                'error': 'Usuario inactivo'
            }), 403

        return jsonify({
            'success': True,
            'user': {
                'email': user.get('email'),
                'nombre': user.get('nombre'),
                'rol': user.get('rol')
            }
        }), 200

    except Exception as e:
        print(f"Error en /login: {e}")
        return jsonify({
            'success': False,
            'error': 'Error interno del servidor'
        }), 500


@auth_bp.route('/verify', methods=['GET'])
def verify():
    """
    GET /api/verify
    Verifica si el token enviado es vÃ¡lido
    """
    try:
        user = SupabaseHelper.get_current_user()

        if not user:
            return jsonify({
                'success': False,
                'error': 'Token invÃ¡lido o expirado',
                'code': 'INVALID_TOKEN'
            }), 401

        return jsonify({
            'success': True,
            'user': {
                'email': user.get('email'),
                'nombre': user.get('nombre'),
                'rol': user.get('rol'),
                'activo': user.get('activo')
            }
        }), 200

    except Exception as e:
        print(f"Error en /verify: {e}")
        return jsonify({
            'success': False,
            'error': 'Error verificando token',
            'code': 'VERIFICATION_ERROR'
        }), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    POST /api/logout
    El logout real se hace en el frontend con Supabase
    """
    return jsonify({
        'success': True,
        'message': 'SesiÃ³n cerrada'
    }), 200
