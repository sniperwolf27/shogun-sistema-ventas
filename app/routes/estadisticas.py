"""Routes - Estadisticas"""
import traceback
from flask import Blueprint, request, jsonify
from app.models.database import EstadisticasRepository
from app.auth.decorators import require_auth

estadisticas_bp = Blueprint('estadisticas', __name__)


@estadisticas_bp.route('/estadisticas', methods=['GET'])
@require_auth
def obtener_estadisticas(user):
    try:
        stats = EstadisticasRepository.get_generales(request.args.get('desde'), request.args.get('hasta'))
        return jsonify(stats), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@estadisticas_bp.route('/estadisticas/canales', methods=['GET'])
@require_auth
def ventas_por_canal(user):
    try:
        data = EstadisticasRepository.get_ventas_por_canal(request.args.get('desde'), request.args.get('hasta'))
        return jsonify(data), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@estadisticas_bp.route('/estadisticas/estados', methods=['GET'])
@require_auth
def ventas_por_estado(user):
    try:
        return jsonify(EstadisticasRepository.get_ventas_por_estado()), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
