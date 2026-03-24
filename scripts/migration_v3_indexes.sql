-- ============================================================
-- SHOGUN — Migración v3: Índices de rendimiento
-- Ejecutar en Supabase SQL Editor (son operaciones no-destructivas,
-- se pueden aplicar en producción con CREATE INDEX CONCURRENTLY).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TABLA: pedidos
-- ─────────────────────────────────────────────────────────────

-- 1. Filtrado por estado_produccion + canal (listado backoffice get_all)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_estado_canal
    ON pedidos (estado_produccion, canal);

-- 2. Índice parcial para activos (excluye filas que ya no se consultan frecuentemente)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_activos_created
    ON pedidos (created_at DESC)
    WHERE estado_produccion NOT IN ('Entregado', 'Cancelado');

-- 3. Búsqueda por teléfono (check_duplicado, buscar, clientes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_telefono
    ON pedidos (cliente_telefono);

-- 4. Búsqueda por SKU (check_duplicado)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_sku
    ON pedidos (producto_sku);

-- 5. check_duplicado compuesto: teléfono + SKU + talla + estado (activos recientes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_duplicado_check
    ON pedidos (cliente_telefono, producto_sku, talla_seleccionada, created_at DESC)
    WHERE estado_produccion NOT IN ('Entregado', 'Cancelado');

-- 6. Alertas de retraso (fecha_compromiso sobre pedidos activos)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_fecha_compromiso_activo
    ON pedidos (fecha_compromiso ASC)
    WHERE estado_produccion NOT IN ('Entregado', 'Cancelado')
      AND fecha_compromiso IS NOT NULL;

-- 7. Analytics y estadísticas (range sobre fecha_pago)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_fecha_pago
    ON pedidos (fecha_pago);

-- 8. Agrupamiento de pedidos multi-item (get_by_grupo)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_grupo_pedido
    ON pedidos (grupo_pedido)
    WHERE grupo_pedido IS NOT NULL;

-- 9. Top productos (GROUP BY producto_nombre, producto_sku)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_producto_nombre_sku
    ON pedidos (producto_nombre, producto_sku);

-- 10. Timeline analytics (created_at::date range)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_created_at_date
    ON pedidos (created_at DESC);

-- 11. Búsqueda full-text sobre nombre de cliente (reemplaza ILIKE)
--     Requiere que la columna sea TEXT/VARCHAR (lo es).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_cliente_nombre_gin
    ON pedidos USING gin(to_tsvector('spanish', cliente_nombre));

-- ─────────────────────────────────────────────────────────────
-- TABLA: productos
-- ─────────────────────────────────────────────────────────────

-- 12. Filtrado por categoría (dashboard backoffice)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_productos_categoria_activo
    ON productos (categoria_id)
    WHERE activo = true;

-- ─────────────────────────────────────────────────────────────
-- TABLAS: pedido_comentarios / pedido_adjuntos / pedido_historial
-- Supabase crea índices en FK automáticamente, pero verificamos.
-- ─────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comentarios_pedido_numero
    ON pedido_comentarios (pedido_numero);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adjuntos_pedido_numero
    ON pedido_adjuntos (pedido_numero);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_historial_pedido_numero
    ON pedido_historial (pedido_numero);

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN: listar todos los índices de pedidos
-- ─────────────────────────────────────────────────────────────
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'pedidos'
-- ORDER BY indexname;
