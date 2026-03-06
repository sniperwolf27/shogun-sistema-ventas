"""
Database Module — Compatibility Re-exports
===========================================
This file has been refactored. All repositories now live in their own modules:

    app.models.db_manager          → DatabaseManager
    app.models.categorias          → CategoriasRepository
    app.models.productos           → ProductosRepository
    app.models.personalizaciones   → PersonalizacionesRepository
    app.models.pedidos             → PedidosRepository
    app.models.clientes            → ClientesRepository
    app.models.estadisticas        → EstadisticasRepository
    app.models.extras              → ComentariosRepository, AdjuntosRepository
    app.models.historial           → HistorialRepository

This file re-exports all of the above for backwards compatibility so existing
import statements in routes still work unchanged.
"""

from app.models.db_manager import DatabaseManager
from app.models.categorias import CategoriasRepository
from app.models.productos import ProductosRepository
from app.models.personalizaciones import PersonalizacionesRepository
from app.models.pedidos import PedidosRepository
from app.models.clientes import ClientesRepository
from app.models.estadisticas import EstadisticasRepository
from app.models.extras import ComentariosRepository, AdjuntosRepository
from app.models.historial import HistorialRepository

__all__ = [
    'DatabaseManager',
    'CategoriasRepository',
    'ProductosRepository',
    'PersonalizacionesRepository',
    'PedidosRepository',
    'ClientesRepository',
    'EstadisticasRepository',
    'ComentariosRepository',
    'AdjuntosRepository',
    'HistorialRepository',
]
