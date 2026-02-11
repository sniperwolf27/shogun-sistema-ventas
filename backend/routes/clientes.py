"""
Routes - Clientes
Endpoints API usando PostgreSQL
"""

from flask import Blueprint, jsonify
from models.database_manager import ClientesRepository

clientes_bp = Blueprint('clientes', __name__)

@clientes_bp.route('/clientes', methods=['GET'])
def obtener_clientes():
    """GET /api/clientes - Obtener base de datos de clientes"""
    try:
        clientes = ClientesRepository.get_all()
        return jsonify(clientes), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
