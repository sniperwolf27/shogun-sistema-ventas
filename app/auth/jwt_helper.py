"""
JWT Helper — auth propio sin Supabase
Firma HS256 con SECRET_KEY, lookup por email en tabla usuarios.
"""
import os
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt, JWTError
from flask import request

from app.models.db_manager import DatabaseManager

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
ALGORITHM = 'HS256'
TOKEN_EXPIRE_HOURS = 24 * 7  # 7 días


def _get_user_by_email(email: str):
    with DatabaseManager.get_cursor() as cur:
        cur.execute(
            "SELECT id, email, password_hash, nombre, rol, activo FROM usuarios WHERE email = %s",
            (email,)
        )
        row = cur.fetchone()
        return dict(row) if row else None


def login(email: str, password: str):
    """Verifica credenciales y devuelve un JWT firmado, o None si fallan."""
    user = _get_user_by_email(email)
    if not user:
        return None
    if not user.get('activo'):
        return None
    pw_hash = user.get('password_hash')
    if not pw_hash:
        return None
    if not bcrypt.checkpw(password.encode('utf-8'), pw_hash.encode('utf-8')):
        return None

    payload = {
        'sub': email,
        'nombre': user['nombre'],
        'rol': user['rol'],
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {
        'access_token': token,
        'user': {
            'email': user['email'],
            'nombre': user['nombre'],
            'rol': user['rol'],
        }
    }


def verify_token(token: str):
    """Verifica el JWT y devuelve el payload, o None si es inválido."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user():
    """Lee el Bearer token del request y devuelve el usuario completo, o None."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header[7:]
    payload = verify_token(token)
    if not payload:
        return None

    email = payload.get('sub')
    if not email:
        return None

    user = _get_user_by_email(email)
    if not user:
        return None

    return {
        'email': user['email'],
        'nombre': user['nombre'],
        'rol': user['rol'],
        'activo': user['activo'],
    }


def change_password(email: str, new_password: str) -> bool:
    """Actualiza el password_hash de un usuario. Devuelve True si tuvo éxito."""
    pw_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    try:
        with DatabaseManager.get_cursor() as cur:
            cur.execute(
                "UPDATE usuarios SET password_hash = %s WHERE email = %s",
                (pw_hash, email)
            )
        return True
    except Exception:
        return False
