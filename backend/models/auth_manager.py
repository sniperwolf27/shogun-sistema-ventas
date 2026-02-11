"""
Authentication Middleware
Sistema de autenticación usando JWT
"""

from functools import wraps
from flask import request, jsonify
import jwt
from datetime import datetime, timedelta
import os

# Clave secreta para JWT (cambiar en producción)
JWT_SECRET = os.environ.get('JWT_SECRET', 'cambiar-en-produccion-super-secreto')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION = 24  # horas

class AuthManager:
    """Gestor de autenticación"""
    
    # Usuarios hardcodeados (para empezar rápido)
    # TODO: Mover a base de datos
    USERS = {
        'admin': {
            'password': 'admin123',
            'role': 'admin',
            'name': 'Administrador'
        },
        'vendedor': {
            'password': 'vendedor123',
            'role': 'vendedor',
            'name': 'Vendedor'
        }
    }
    
    @staticmethod
    def authenticate(username, password):
        """Autenticar usuario"""
        user = AuthManager.USERS.get(username)
        
        if not user:
            return None
        
        # TODO: Usar bcrypt en producción
        if user['password'] != password:
            return None
        
        return {
            'username': username,
            'role': user['role'],
            'name': user['name']
        }
    
    @staticmethod
    def create_token(user_data):
        """Crear JWT token"""
        payload = {
            'username': user_data['username'],
            'role': user_data['role'],
            'name': user_data['name'],
            'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION),
            'iat': datetime.utcnow()
        }
        
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return token
    
    @staticmethod
    def verify_token(token):
        """Verificar JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def get_current_user():
        """Obtener usuario actual del request"""
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return None
        
        try:
            token = auth_header.split(' ')[1]  # Bearer <token>
            return AuthManager.verify_token(token)
        except:
            return None


def login_required(f):
    """Decorator para rutas que requieren autenticación"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = AuthManager.get_current_user()
        
        if not user:
            return jsonify({'error': 'No autorizado'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function


def admin_required(f):
    """Decorator para rutas que requieren rol admin"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = AuthManager.get_current_user()
        
        if not user:
            return jsonify({'error': 'No autorizado'}), 401
        
        if user.get('role') != 'admin':
            return jsonify({'error': 'Permiso denegado - Se requiere rol admin'}), 403
        
        return f(*args, **kwargs)
    
    return decorated_function
