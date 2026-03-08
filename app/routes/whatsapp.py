"""
Routes - WhatsApp Webhook (Meta Cloud API)

Endpoints:
  GET  /webhook/whatsapp  — verificación del webhook por Meta
  POST /webhook/whatsapp  — recepción de mensajes y eventos

Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
"""
import os
import hmac
import hashlib
import logging
from flask import Blueprint, request, jsonify, current_app

logger = logging.getLogger(__name__)

whatsapp_bp = Blueprint('whatsapp', __name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _verify_signature(payload: bytes, signature_header: str | None) -> bool:
    """
    Valida la firma X-Hub-Signature-256 que Meta incluye en cada POST.
    Si WHATSAPP_APP_SECRET no está configurado se omite la verificación (solo dev).
    """
    app_secret = os.environ.get('WHATSAPP_APP_SECRET', '')
    if not app_secret:
        logger.warning('WHATSAPP_APP_SECRET no configurado — firma no verificada')
        return True

    if not signature_header or not signature_header.startswith('sha256='):
        return False

    expected = 'sha256=' + hmac.new(
        app_secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)


# ─── GET /webhook/whatsapp ────────────────────────────────────────────────────

@whatsapp_bp.route('/webhook/whatsapp', methods=['GET'])
def verify_webhook():
    """
    Meta llama a este endpoint cuando registras el webhook en el panel de
    desarrolladores para confirmar que la URL es válida.

    Parámetros query que envía Meta:
      hub.mode          — siempre "subscribe"
      hub.verify_token  — el token que definiste en el panel
      hub.challenge     — número que debes devolver tal cual
    """
    mode      = request.args.get('hub.mode')
    token     = request.args.get('hub.verify_token')
    challenge = request.args.get('hub.challenge')

    verify_token = os.environ.get('WHATSAPP_VERIFY_TOKEN', '')

    if mode == 'subscribe' and token == verify_token:
        logger.info('Webhook de WhatsApp verificado correctamente')
        return challenge, 200

    logger.warning('Verificación de webhook fallida — token incorrecto o mode inválido')
    return jsonify({'error': 'Forbidden'}), 403


# ─── POST /webhook/whatsapp ───────────────────────────────────────────────────

@whatsapp_bp.route('/webhook/whatsapp', methods=['POST'])
def receive_webhook():
    """
    Meta envía aquí todos los eventos: mensajes entrantes, acuses de lectura,
    cambios de estado, etc.
    """
    # 1. Verificar firma HMAC
    signature = request.headers.get('X-Hub-Signature-256')
    if not _verify_signature(request.data, signature):
        logger.error('Firma X-Hub-Signature-256 inválida')
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Bad Request'}), 400

    # 2. Confirmar que es un evento de WhatsApp Business
    if data.get('object') != 'whatsapp_business_account':
        return jsonify({'status': 'ignored'}), 200

    # 3. Recorrer entradas y cambios
    for entry in data.get('entry', []):
        for change in entry.get('changes', []):
            if change.get('field') != 'messages':
                continue

            value = change.get('value', {})
            _process_messages(value)
            _process_statuses(value)

    # Meta espera siempre un 200 rápido
    return jsonify({'status': 'ok'}), 200


# ─── Procesamiento ────────────────────────────────────────────────────────────

def _process_messages(value: dict):
    """Procesa mensajes entrantes del cliente."""
    messages  = value.get('messages', [])
    contacts  = value.get('contacts', [])
    metadata  = value.get('metadata', {})

    phone_number_id = metadata.get('phone_number_id')

    # Mapa rápido de wa_id → nombre del contacto
    contact_map = {c['wa_id']: c.get('profile', {}).get('name', '') for c in contacts}

    for msg in messages:
        msg_type   = msg.get('type')         # text | image | audio | document | ...
        from_phone = msg.get('from')          # número del cliente (sin +)
        msg_id     = msg.get('id')
        timestamp  = msg.get('timestamp')
        nombre     = contact_map.get(from_phone, '')

        if msg_type == 'text':
            texto = msg.get('text', {}).get('body', '')
            _handle_text_message(
                phone_number_id=phone_number_id,
                from_phone=from_phone,
                nombre=nombre,
                msg_id=msg_id,
                timestamp=timestamp,
                texto=texto,
            )

        elif msg_type == 'image':
            media_id = msg.get('image', {}).get('id')
            caption  = msg.get('image', {}).get('caption', '')
            logger.info(
                'Imagen recibida de %s (%s) | media_id=%s | caption=%s',
                nombre, from_phone, media_id, caption
            )

        elif msg_type == 'document':
            doc      = msg.get('document', {})
            media_id = doc.get('id')
            filename = doc.get('filename', '')
            logger.info(
                'Documento recibido de %s (%s) | media_id=%s | filename=%s',
                nombre, from_phone, media_id, filename
            )

        elif msg_type in ('audio', 'video', 'sticker', 'location', 'contacts', 'interactive', 'button', 'order', 'reaction'):
            logger.info('Mensaje tipo "%s" de %s (%s)', msg_type, nombre, from_phone)

        else:
            logger.info('Tipo de mensaje desconocido "%s" de %s', msg_type, from_phone)


def _handle_text_message(
    phone_number_id: str,
    from_phone: str,
    nombre: str,
    msg_id: str,
    timestamp: str,
    texto: str,
):
    """
    Lógica principal para mensajes de texto entrantes.
    Aquí puedes buscar al cliente en la BD, actualizar el estado de un pedido, etc.
    """
    logger.info(
        'Mensaje de texto | de=%s (%s) | texto=%s',
        nombre, from_phone, texto
    )

    # ── Punto de extensión ──────────────────────────────────────────────────
    # Ejemplo: buscar el pedido asociado al número y actualizar su estado
    #
    # from app.models.pedidos import PedidosRepository
    # pedidos = PedidosRepository.get_by_telefono(from_phone)
    # if pedidos:
    #     logger.info('Cliente con %d pedido(s) activo(s)', len(pedidos))
    #
    # Ejemplo: enviar respuesta automática
    # _send_text(phone_number_id, from_phone, '¡Gracias! Tu mensaje fue recibido.')
    # ────────────────────────────────────────────────────────────────────────


def _process_statuses(value: dict):
    """Procesa acuses de entrega/lectura de mensajes enviados por nosotros."""
    for status in value.get('statuses', []):
        msg_id     = status.get('id')
        recipient  = status.get('recipient_id')
        estado     = status.get('status')   # sent | delivered | read | failed
        timestamp  = status.get('timestamp')

        if estado == 'failed':
            errors = status.get('errors', [])
            logger.error(
                'Mensaje %s falló al enviarse a %s | errores=%s',
                msg_id, recipient, errors
            )
        else:
            logger.info(
                'Estado de mensaje %s → %s | destinatario=%s',
                msg_id, estado, recipient
            )


# ─── Envío de mensajes (util) ─────────────────────────────────────────────────

def _send_text(phone_number_id: str, to: str, body: str) -> dict | None:
    """
    Envía un mensaje de texto simple usando la API de WhatsApp Cloud.
    Requiere WHATSAPP_TOKEN en las variables de entorno.
    """
    import requests  # ya en requirements.txt

    token   = os.environ.get('WHATSAPP_TOKEN', '')
    version = os.environ.get('WHATSAPP_API_VERSION', 'v21.0')

    if not token:
        logger.error('WHATSAPP_TOKEN no configurado — no se puede enviar mensaje')
        return None

    url = f'https://graph.facebook.com/{version}/{phone_number_id}/messages'
    payload = {
        'messaging_product': 'whatsapp',
        'recipient_type':    'individual',
        'to':                to,
        'type':              'text',
        'text':              {'preview_url': False, 'body': body},
    }
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type':  'application/json',
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        logger.error('Error al enviar mensaje de WhatsApp: %s', e)
        return None
