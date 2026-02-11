"""
Supabase Helper
- Verifica JWT de Supabase (ES256 / JWKS)
- Obtiene rol del usuario desde PostgreSQL
- Compatible con cursores tuple o dict
"""

import requests
from jose import jwt
from flask import request
from models.database_manager import DatabaseManager

# ðŸ”— URL de tu proyecto Supabase
SUPABASE_URL = "https://namjhrpumgywarhjxjxx.supabase.co"

# ðŸ”‘ JWKS (public keys)
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# Cargar keys pÃºblicas UNA sola vez
jwks = requests.get(JWKS_URL).json()


class SupabaseHelper:

    @staticmethod
    def get_user_from_token():
        """Extrae y valida el JWT de Supabase"""
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]

        try:
            payload = jwt.decode(
                token,
                jwks,
                algorithms=["ES256"],
                audience="authenticated",
                issuer=f"{SUPABASE_URL}/auth/v1"
            )
            return payload

        except Exception as e:
            print("Token invÃ¡lido:", e)
            return None

    @staticmethod
    def get_user_role(auth_user_id):
        """Obtiene rol, estado y datos del usuario desde la DB"""
        query = """
            SELECT rol, activo, nombre, email
            FROM usuarios
            WHERE auth_user_id = %s
        """

        try:
            with DatabaseManager.get_cursor() as cursor:
                cursor.execute(query, (auth_user_id,))
                result = cursor.fetchone()

                if not result:
                    return None

                # âœ”ï¸ Compatible con dict o tuple
                if isinstance(result, dict):
                    return {
                        'rol': result.get('rol'),
                        'activo': result.get('activo'),
                        'nombre': result.get('nombre'),
                        'email': result.get('email')
                    }

                # tuple
                return {
                    'rol': result[0],
                    'activo': result[1],
                    'nombre': result[2],
                    'email': result[3]
                }

        except Exception as e:
            print(f"Error en get_user_role: {e}")
            return None

    @staticmethod
    def get_current_user():
        """Devuelve el usuario autenticado completo"""
        payload = SupabaseHelper.get_user_from_token()

        if not payload:
            return None

        auth_user_id = payload.get("sub")

        if not auth_user_id:
            return None

        user_info = SupabaseHelper.get_user_role(auth_user_id)

        # Usuario existe en Auth pero no en DB
        if not user_info:
            email = payload.get("email", "unknown")
            return {
                'auth_user_id': auth_user_id,
                'email': email,
                'nombre': email.split("@")[0],
                'rol': 'vendedor',
                'activo': True
            }

        return {
            'auth_user_id': auth_user_id,
            'email': user_info['email'],
            'nombre': user_info['nombre'],
            'rol': user_info['rol'],
            'activo': user_info['activo']
        }
