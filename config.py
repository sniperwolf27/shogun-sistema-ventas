"""
Configuration - Shogun Sistema de Ventas
"""
import os


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = False

    # Database
    DATABASE_URL = os.environ.get('DATABASE_URL', '')
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

    # Supabase
    SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://namjhrpumgywarhjxjxx.supabase.co')

    # Server
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5000))

    # Business defaults
    COSTO_ENVIO_DEFAULT = 200
    TIEMPO_PRODUCCION_BASE = 7


class DevelopmentConfig(Config):
    DEBUG = True
    DATABASE_URL = os.environ.get('DATABASE_URL') or \
        'postgresql://postgres.namjhrpumgywarhjxjxx:opiTZPycouTpR02d@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)


class ProductionConfig(Config):
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig,
}
