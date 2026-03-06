"""Routes - Estadisticas"""
import traceback
from flask import Blueprint, request, jsonify
from app.models.estadisticas import EstadisticasRepository
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
        return jsonify(EstadisticasRepository.get_ventas_por_estado(
            request.args.get('desde'), request.args.get('hasta')
        )), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@estadisticas_bp.route('/estadisticas/timeline', methods=['GET'])
@require_auth
def ventas_timeline(user):
    try:
        data = EstadisticasRepository.get_timeline(
            request.args.get('desde'), request.args.get('hasta')
        )
        return jsonify(data), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@estadisticas_bp.route('/estadisticas/productos', methods=['GET'])
@require_auth
def top_productos(user):
    try:
        data = EstadisticasRepository.get_top_productos(
            request.args.get('desde'), request.args.get('hasta')
        )
        return jsonify(data), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@estadisticas_bp.route('/estadisticas/resumen-operativo', methods=['GET'])
@require_auth
def resumen_operativo(user):
    """Live operative counts for the Pedidos context bar."""
    try:
        data = EstadisticasRepository.get_resumen_operativo()
        return jsonify(data), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@estadisticas_bp.route('/estadisticas/dashboard', methods=['GET'])
@require_auth
def dashboard_consolidado(user):
    """
    Consolidated dashboard endpoint.
    Returns generales + canales + estados + timeline + top_productos in one call.
    Replaces the 5 separate API calls the frontend was making on Dashboard load.
    """
    try:
        data = EstadisticasRepository.get_dashboard(
            request.args.get('desde'),
            request.args.get('hasta')
        )
        return jsonify(data), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
