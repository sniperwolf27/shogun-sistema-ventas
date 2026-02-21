"""Error Handlers"""
from flask import jsonify, request, send_from_directory
from datetime import datetime
import os


def register_error_handlers(app):

    @app.errorhandler(404)
    def not_found(error):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Recurso no encontrado'}), 404
        frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'frontend')
        return send_from_directory(frontend_dir, '404.html'), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Error interno del servidor'}), 500

    @app.route('/health')
    def health_check():
        try:
            from app.models.database import PedidosRepository
            PedidosRepository.get_all()
            db_status = 'connected'
        except Exception as e:
            db_status = f'error: {str(e)}'

        return jsonify({
            'status': 'ok',
            'timestamp': datetime.now().isoformat(),
            'version': '4.0',
            'database': db_status
        })
