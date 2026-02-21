"""
Supabase Storage Helper
Upload/download files via Supabase Storage REST API
Uses service_role key to bypass RLS
"""
import os
import requests
import uuid
from pathlib import Path

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://namjhrpumgywarhjxjxx.supabase.co')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
BUCKET_NAME = 'pedido-adjuntos'

STORAGE_BASE = f"{SUPABASE_URL}/storage/v1"


def _headers(content_type=None):
    """Headers for Supabase Storage API using service_role key"""
    h = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    }
    if content_type:
        h['Content-Type'] = content_type
    return h


def upload_file(pedido_numero, file_obj, filename, content_type='application/octet-stream'):
    """
    Upload a file to Supabase Storage.
    Returns storage_path on success, raises on error.
    """
    if not SUPABASE_SERVICE_KEY:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY not configured")

    # Sanitize and build unique path: pedidos/{pedido_numero}/{uuid}_{filename}
    safe_name = Path(filename).name  # strip any directory traversal
    unique_name = f"{uuid.uuid4().hex[:8]}_{safe_name}"
    storage_path = f"pedidos/{pedido_numero}/{unique_name}"

    url = f"{STORAGE_BASE}/object/{BUCKET_NAME}/{storage_path}"

    file_data = file_obj.read()

    response = requests.post(
        url,
        headers=_headers(content_type),
        data=file_data
    )

    if response.status_code not in (200, 201):
        error_detail = response.text
        raise Exception(f"Storage upload failed ({response.status_code}): {error_detail}")

    return storage_path


def get_signed_url(storage_path, expires_in=3600):
    """
    Generate a signed URL for downloading a private file.
    expires_in: seconds (default 1 hour)
    """
    if not SUPABASE_SERVICE_KEY:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY not configured")

    url = f"{STORAGE_BASE}/object/sign/{BUCKET_NAME}/{storage_path}"

    response = requests.post(
        url,
        headers={**_headers('application/json')},
        json={'expiresIn': expires_in}
    )

    if response.status_code != 200:
        raise Exception(f"Signed URL failed ({response.status_code}): {response.text}")

    data = response.json()
    signed_path = data.get('signedURL', '')

    # Build full URL
    if signed_path.startswith('/'):
        return f"{SUPABASE_URL}/storage/v1{signed_path}"
    return signed_path


def delete_file(storage_path):
    """Delete a file from storage"""
    if not SUPABASE_SERVICE_KEY:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY not configured")

    url = f"{STORAGE_BASE}/object/{BUCKET_NAME}"

    response = requests.delete(
        url,
        headers={**_headers('application/json')},
        json={'prefixes': [storage_path]}
    )

    return response.status_code in (200, 201)
