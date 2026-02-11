"""
Routes - Estadísticas
"""

from flask import Blueprint, request, jsonify
from models.database_manager import EstadisticasRepository
from utils.auth_decorators import require_auth
import traceback

estadisticas_bp = Blueprint('estadisticas', __name__)


@estadisticas_bp.route('/estadisticas', methods=['GET'])
@require_auth
def obtener_estadisticas(user):
    try:
        fecha_desde = request.args.get('desde')
        fecha_hasta = request.args.get('hasta')
        stats = EstadisticasRepository.get_generales(fecha_desde, fecha_hasta)
        return jsonify(stats), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@estadisticas_bp.route('/estadisticas/canales', methods=['GET'])
@require_auth
def ventas_por_canal(user):
    try:
        fecha_desde = request.args.get('desde')
        fecha_hasta = request.args.get('hasta')
        data = EstadisticasRepository.get_ventas_por_canal(fecha_desde, fecha_hasta)
        return jsonify(data), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@estadisticas_bp.route('/estadisticas/estados', methods=['GET'])
@require_auth
def ventas_por_estado(user):
    try:
        data = EstadisticasRepository.get_ventas_por_estado()
        return jsonify(data), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
