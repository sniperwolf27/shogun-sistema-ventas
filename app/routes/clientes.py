"""Routes - Clientes"""
from flask import Blueprint, request, jsonify
from app.models.database import ClientesRepository
from app.auth.decorators import require_auth

clientes_bp = Blueprint('clientes', __name__)


@clientes_bp.route('/clientes', methods=['GET'])
@require_auth
def obtener_clientes(user):
    try:
        return jsonify(ClientesRepository.get_all()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@clientes_bp.route('/clientes/perfil', methods=['GET'])
@require_auth
def obtener_perfil_cliente(user):
    telefono = request.args.get('telefono', '').strip()
    if not telefono:
        return jsonify({'error': 'Teléfono requerido'}), 400
    try:
        perfil = ClientesRepository.get_perfil(telefono)
        if not perfil:
            return jsonify({'error': 'Cliente no encontrado'}), 404
        return jsonify(perfil), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
