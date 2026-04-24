"""
Tigris S3-Compatible Storage Helper
Upload/download/delete files via boto3 S3 API pointing to Tigris endpoint
"""
import os
import uuid
from pathlib import Path
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

TIGRIS_ENDPOINT = os.environ.get('TIGRIS_ENDPOINT', 'https://t3.storageapi.dev')
TIGRIS_ACCESS_KEY_ID = os.environ.get('TIGRIS_ACCESS_KEY_ID', '')
TIGRIS_SECRET_ACCESS_KEY = os.environ.get('TIGRIS_SECRET_ACCESS_KEY', '')
BUCKET_NAME = os.environ.get('TIGRIS_BUCKET_NAME', 'shogun-sistema-de-ventas-do9svn')


def _s3_client():
    return boto3.client(
        's3',
        endpoint_url=TIGRIS_ENDPOINT,
        aws_access_key_id=TIGRIS_ACCESS_KEY_ID,
        aws_secret_access_key=TIGRIS_SECRET_ACCESS_KEY,
        region_name='auto',
        config=Config(signature_version='s3v4'),
    )


def upload_file(pedido_numero, file_obj, filename, content_type='application/octet-stream'):
    """
    Upload a file to Tigris storage.
    Returns storage_path (S3 object key) on success, raises on error.
    """
    if not TIGRIS_ACCESS_KEY_ID or not TIGRIS_SECRET_ACCESS_KEY:
        raise ValueError("TIGRIS_ACCESS_KEY_ID / TIGRIS_SECRET_ACCESS_KEY not configured")

    safe_name = Path(filename).name
    unique_name = f"{uuid.uuid4().hex[:8]}_{safe_name}"
    storage_path = f"pedidos/{pedido_numero}/{unique_name}"

    file_data = file_obj.read()

    _s3_client().put_object(
        Bucket=BUCKET_NAME,
        Key=storage_path,
        Body=file_data,
        ContentType=content_type,
    )

    return storage_path


def get_signed_url(storage_path, expires_in=3600):
    """
    Generate a presigned URL for downloading a private file.
    expires_in: seconds (default 1 hour)
    """
    if not TIGRIS_ACCESS_KEY_ID or not TIGRIS_SECRET_ACCESS_KEY:
        raise ValueError("TIGRIS_ACCESS_KEY_ID / TIGRIS_SECRET_ACCESS_KEY not configured")

    url = _s3_client().generate_presigned_url(
        'get_object',
        Params={'Bucket': BUCKET_NAME, 'Key': storage_path},
        ExpiresIn=expires_in,
    )
    return url


def delete_file(storage_path):
    """Delete a file from Tigris storage. Returns True on success."""
    if not TIGRIS_ACCESS_KEY_ID or not TIGRIS_SECRET_ACCESS_KEY:
        raise ValueError("TIGRIS_ACCESS_KEY_ID / TIGRIS_SECRET_ACCESS_KEY not configured")

    try:
        _s3_client().delete_object(Bucket=BUCKET_NAME, Key=storage_path)
        return True
    except ClientError:
        return False
