"""
SHOGUN - Sistema de Gestión de Ventas
Backend Principal
"""

from flask import Flask, jsonify, send_from_directory, redirect
from flask_cors import CORS
from datetime import datetime

from models.database_manager import DatabaseManager
from routes.auth import auth_bp
from routes.pedidos import pedidos_bp
from routes.productos import productos_bp
from routes.clientes import clientes_bp
from routes.estadisticas import estadisticas_bp
from config import Config

app = Flask(__name__, static_folder='../frontend')
app.config.from_object(Config)

CORS(app)

DatabaseManager.initialize(app.config['DATABASE_URL'])

app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(pedidos_bp, url_prefix='/api')
app.register_blueprint(productos_bp, url_prefix='/api')
app.register_blueprint(clientes_bp, url_prefix='/api')
app.register_blueprint(estadisticas_bp, url_prefix='/api')


# --- Pages ---

@app.route('/')
def index():
    return redirect('/login')

@app.route('/login')
def login_page():
    return send_from_directory('../frontend', 'login.html')

@app.route('/backoffice')
def backoffice():
    return send_from_directory('../frontend/backoffice', 'index.html')

@app.route('/formulario')
def formulario():
    return send_from_directory('../frontend/formulario', 'index.html')


# --- Static assets ---

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('../frontend/backoffice/css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('../frontend/backoffice/js', filename)

@app.route('/formulario/js/<path:filename>')
def serve_formulario_js(filename):
    return send_from_directory('../frontend/formulario/js', filename)

@app.route('/formulario/css/<path:filename>')
def serve_formulario_css(filename):
    return send_from_directory('../frontend/formulario/css', filename)


# --- Health & errors ---

@app.route('/health')
def health_check():
    try:
        from models.database_manager import PedidosRepository
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

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Recurso no encontrado'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Error interno del servidor'}), 500


if __name__ == '__main__':
    port = app.config.get('PORT', 5000)
    print(f"SHOGUN v4.0 | http://localhost:{port}/login")
    app.run(host=app.config.get('HOST', '0.0.0.0'), port=port, debug=app.config.get('DEBUG', True))
