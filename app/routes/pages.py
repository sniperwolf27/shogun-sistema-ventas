"""Routes - Page serving & static assets"""
import os
from flask import Blueprint, send_from_directory, redirect

# Resolve frontend/ directory relative to project root
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'frontend')
FRONTEND_DIR = os.path.abspath(FRONTEND_DIR)

pages_bp = Blueprint('pages', __name__)


# --- HTML Pages ---

@pages_bp.route('/')
def index():
    return redirect('/login')


@pages_bp.route('/login')
def login_page():
    return send_from_directory(FRONTEND_DIR, 'login.html')


@pages_bp.route('/backoffice')
def backoffice():
    return send_from_directory(os.path.join(FRONTEND_DIR, 'backoffice'), 'index.html')


@pages_bp.route('/formulario')
def formulario():
    return send_from_directory(os.path.join(FRONTEND_DIR, 'formulario'), 'index.html')


# --- Static assets ---

@pages_bp.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'backoffice', 'css'), filename)


@pages_bp.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'backoffice', 'js'), filename)


@pages_bp.route('/formulario/js/<path:filename>')
def serve_formulario_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'formulario', 'js'), filename)


@pages_bp.route('/formulario/css/<path:filename>')
def serve_formulario_css(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'formulario', 'css'), filename)
