"""Error Handlers"""
from flask import jsonify
from datetime import datetime


def register_error_handlers(app):

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Recurso no encontrado'}), 404

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

    @app.route('/api/debug/routes')
    def debug_routes():
        """List all registered routes - useful for diagnosing 404s"""
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                'endpoint': rule.endpoint,
                'methods': sorted(list(rule.methods - {'OPTIONS', 'HEAD'})),
                'path': str(rule)
            })
        routes.sort(key=lambda r: r['path'])
        return jsonify({
            'total_routes': len(routes),
            'routes': routes
        })
