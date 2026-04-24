"""
supabase_helper.py — shim de compatibilidad
Delega al nuevo jwt_helper (auth propia, sin Supabase).
"""
from app.auth.jwt_helper import get_current_user, verify_token, login


class SupabaseHelper:

    @staticmethod
    def get_user_from_token():
        from flask import request
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        token = auth_header[7:]
        return verify_token(token)

    @staticmethod
    def get_user_role(auth_user_id):
        return None

    @staticmethod
    def get_current_user():
        return get_current_user()
