"""
Routes - Pedido Comentarios y Adjuntos
"""
import traceback
from flask import Blueprint, request, jsonify
from app.models.database import ComentariosRepository, AdjuntosRepository
from app.auth.decorators import require_auth
from app.auth import storage as supabase_storage

pedido_extras_bp = Blueprint('pedido_extras', __name__)


# ========== COMENTARIOS ==========

@pedido_extras_bp.route('/pedidos/<pedido_numero>/comentarios', methods=['GET'])
@require_auth
def get_comentarios(user, pedido_numero):
    try:
        return jsonify(ComentariosRepository.get_by_pedido(pedido_numero)), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@pedido_extras_bp.route('/pedidos/<pedido_numero>/comentarios', methods=['POST'])
@require_auth
def crear_comentario(user, pedido_numero):
    try:
        data = request.json
        texto = (data or {}).get('texto', '').strip()
        if not texto:
            return jsonify({'success': False, 'error': 'Texto requerido'}), 400

        comentario = ComentariosRepository.create(
            pedido_numero=pedido_numero,
            autor_email=user['email'],
            autor_nombre=user['nombre'],
            texto=texto
        )
        return jsonify({'success': True, 'comentario': comentario}), 201
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@pedido_extras_bp.route('/comentarios/<comment_id>', methods=['DELETE'])
@require_auth
def eliminar_comentario(user, comment_id):
    try:
        ok = ComentariosRepository.delete(comment_id)
        if not ok:
            return jsonify({'success': False, 'error': 'Comentario no encontrado'}), 404
        return jsonify({'success': True}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ========== ADJUNTOS ==========

@pedido_extras_bp.route('/pedidos/<pedido_numero>/adjuntos', methods=['GET'])
@require_auth
def get_adjuntos(user, pedido_numero):
    try:
        return jsonify(AdjuntosRepository.get_by_pedido(pedido_numero)), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@pedido_extras_bp.route('/pedidos/<pedido_numero>/adjuntos', methods=['POST'])
@require_auth
def subir_adjunto(user, pedido_numero):
    """Upload file to Supabase Storage + save metadata in DB"""
    try:
        if 'archivo' not in request.files:
            return jsonify({'success': False, 'error': 'No se envió archivo'}), 400

        archivo = request.files['archivo']
        if not archivo.filename:
            return jsonify({'success': False, 'error': 'Archivo vacío'}), 400

        # Max 10MB
        archivo.seek(0, 2)
        size = archivo.tell()
        archivo.seek(0)
        if size > 10 * 1024 * 1024:
            return jsonify({'success': False, 'error': 'Archivo muy grande (máx 10MB)'}), 400

        content_type = archivo.content_type or 'application/octet-stream'

        # Upload to Supabase Storage
        storage_path = supabase_storage.upload_file(
            pedido_numero=pedido_numero,
            file_obj=archivo,
            filename=archivo.filename,
            content_type=content_type
        )

        # Save metadata in DB
        adjunto = AdjuntosRepository.create(
            pedido_numero=pedido_numero,
            nombre_original=archivo.filename,
            tipo_mime=content_type,
            tamano_bytes=size,
            storage_path=storage_path,
            email=user['email'],
            nombre=user['nombre']
        )

        return jsonify({'success': True, 'adjunto': adjunto}), 201

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@pedido_extras_bp.route('/adjuntos/<adjunto_id>/download', methods=['GET'])
@require_auth
def descargar_adjunto(user, adjunto_id):
    """Generate signed URL for downloading"""
    try:
        adjunto = AdjuntosRepository.get_by_id(adjunto_id)
        if not adjunto:
            return jsonify({'error': 'Adjunto no encontrado'}), 404

        signed_url = supabase_storage.get_signed_url(adjunto['storage_path'], expires_in=3600)

        return jsonify({
            'success': True,
            'url': signed_url,
            'nombre': adjunto['nombre_original']
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@pedido_extras_bp.route('/adjuntos/<adjunto_id>', methods=['DELETE'])
@require_auth
def eliminar_adjunto(user, adjunto_id):
    """Delete file from Storage + DB"""
    try:
        storage_path = AdjuntosRepository.delete(adjunto_id)
        if not storage_path:
            return jsonify({'success': False, 'error': 'Adjunto no encontrado'}), 404

        # Delete from Supabase Storage
        try:
            supabase_storage.delete_file(storage_path)
        except Exception as e:
            print(f"[WARN] Could not delete from storage: {e}")

        return jsonify({'success': True}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
