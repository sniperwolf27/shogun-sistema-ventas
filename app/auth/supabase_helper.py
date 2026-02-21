"""
Supabase Helper - JWT verification + user role lookup
"""
import os
import requests
from jose import jwt
from flask import request
from app.models.database import DatabaseManager

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://namjhrpumgywarhjxjxx.supabase.co')
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# Load public keys once at import
try:
    jwks = requests.get(JWKS_URL, timeout=10).json()
except Exception as e:
    print(f"[WARNING] Could not load JWKS: {e}")
    jwks = {"keys": []}


class SupabaseHelper:

    @staticmethod
    def get_user_from_token():
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(
                token, jwks,
                algorithms=["ES256"],
                audience="authenticated",
                issuer=f"{SUPABASE_URL}/auth/v1"
            )
            return payload
        except Exception as e:
            print(f"Token invalid: {e}")
            return None

    @staticmethod
    def get_user_role(auth_user_id):
        query = "SELECT rol, activo, nombre, email FROM usuarios WHERE auth_user_id = %s"
        try:
            with DatabaseManager.get_cursor() as cursor:
                cursor.execute(query, (auth_user_id,))
                result = cursor.fetchone()
                if not result:
                    return None
                if isinstance(result, dict):
                    return {k: result.get(k) for k in ('rol', 'activo', 'nombre', 'email')}
                return {'rol': result[0], 'activo': result[1], 'nombre': result[2], 'email': result[3]}
        except Exception as e:
            print(f"Error in get_user_role: {e}")
            return None

    @staticmethod
    def get_current_user():
        payload = SupabaseHelper.get_user_from_token()
        if not payload:
            return None

        auth_user_id = payload.get("sub")
        if not auth_user_id:
            return None

        user_info = SupabaseHelper.get_user_role(auth_user_id)

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
