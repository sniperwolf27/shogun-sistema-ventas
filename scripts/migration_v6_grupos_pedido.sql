-- ============================================================
-- SHOGUN — Migración v6: Tabla grupos_pedido
-- Formaliza la entidad "grupo de pedido" (multi-item order)
-- que actualmente existe solo como un TEXT libre en pedidos.grupo_pedido
-- sin tabla de cabecera, sin FK y sin metadata.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PARTE 1: Crear tabla grupos_pedido
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grupos_pedido (
    id           TEXT        PRIMARY KEY,         -- ej. 'G20240301120000' o UUID
    cliente_id   BIGINT      REFERENCES clientes(id) ON UPDATE CASCADE,
    canal        canal_venta,
    metodo_pago  metodo_pago,
    estado_pago  estado_pago,
    precio_envio NUMERIC(12, 2) NOT NULL DEFAULT 0,
    costo_envio  NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by   TEXT                              -- email del operador que creó el grupo
);

COMMENT ON TABLE grupos_pedido IS
    'Cabecera de un pedido multi-item. Cada fila de pedidos con el mismo '
    'grupo_pedido pertenece a este grupo. El envío y datos compartidos '
    'del cliente se almacenan aquí para evitar duplicación.';

-- ─────────────────────────────────────────────────────────────
-- PARTE 2: Poblar desde grupos ya existentes en pedidos
-- ─────────────────────────────────────────────────────────────
INSERT INTO grupos_pedido (id, cliente_id, canal, metodo_pago, estado_pago,
                           precio_envio, costo_envio, created_at)
SELECT DISTINCT ON (p.grupo_pedido)
    p.grupo_pedido                          AS id,
    c.id                                    AS cliente_id,
    p.canal,
    p.metodo_pago,
    p.estado_pago,
    COALESCE(p.precio_envio, 0)             AS precio_envio,
    COALESCE(p.costo_envio,  0)             AS costo_envio,
    MIN(p.created_at) OVER (PARTITION BY p.grupo_pedido) AS created_at
FROM pedidos p
LEFT JOIN clientes c ON c.telefono = p.cliente_telefono
WHERE p.grupo_pedido IS NOT NULL
ORDER BY p.grupo_pedido, p.created_at ASC
ON CONFLICT (id) DO NOTHING;

-- Verificar grupos migrados:
-- SELECT COUNT(*) FROM grupos_pedido;

-- ─────────────────────────────────────────────────────────────
-- PARTE 3: Agregar FK desde pedidos → grupos_pedido
-- ─────────────────────────────────────────────────────────────
ALTER TABLE pedidos
    DROP CONSTRAINT IF EXISTS fk_pedidos_grupo_pedido;

ALTER TABLE pedidos
    ADD CONSTRAINT fk_pedidos_grupo_pedido
    FOREIGN KEY (grupo_pedido) REFERENCES grupos_pedido(id)
    ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
-- SELECT
--     g.id,
--     COUNT(p.numero_pedido)          AS items,
--     SUM(p.precio_total)             AS total_grupo,
--     g.precio_envio,
--     g.created_at
-- FROM grupos_pedido g
-- JOIN pedidos p ON p.grupo_pedido = g.id
-- GROUP BY g.id
-- ORDER BY g.created_at DESC
-- LIMIT 20;
