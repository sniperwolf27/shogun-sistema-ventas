"""
SHOGUN - Application Factory
"""
import os
from flask import Flask
from flask_cors import CORS

from config import config


def create_app(config_name=None):
    """Create and configure the Flask application."""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')

    # static_folder points to frontend/ at project root
    app = Flask(
        __name__,
        static_folder=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend'),
        static_url_path='/static'
    )

    app.config.from_object(config[config_name])

    CORS(app)

    # Initialize database
    from app.models.database import DatabaseManager
    DatabaseManager.initialize(app.config['DATABASE_URL'])

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.pedidos import pedidos_bp
    from app.routes.productos import productos_bp
    from app.routes.clientes import clientes_bp
    from app.routes.estadisticas import estadisticas_bp
    from app.routes.pages import pages_bp

    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(pedidos_bp, url_prefix='/api')
    app.register_blueprint(productos_bp, url_prefix='/api')
    app.register_blueprint(clientes_bp, url_prefix='/api')
    app.register_blueprint(estadisticas_bp, url_prefix='/api')
    app.register_blueprint(pages_bp)

    # Error handlers
    from app.routes.errors import register_error_handlers
    register_error_handlers(app)

    return app
