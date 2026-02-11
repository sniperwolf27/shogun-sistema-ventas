"""Routes - Clientes"""
from flask import Blueprint, jsonify
from app.models.database import ClientesRepository

clientes_bp = Blueprint('clientes', __name__)


@clientes_bp.route('/clientes', methods=['GET'])
def obtener_clientes():
    try:
        return jsonify(ClientesRepository.get_all()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
