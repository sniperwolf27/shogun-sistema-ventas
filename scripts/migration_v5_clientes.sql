-- ============================================================
-- SHOGUN — Migración v5: Tabla clientes
-- Normaliza la entidad Cliente que actualmente vive duplicada
-- en cada fila de pedidos.
--
-- ESTRATEGIA: migración no-destructiva en 4 pasos.
-- Los pasos comentados al final (DROP COLUMN) son opcionales
-- y solo deben ejecutarse DESPUÉS de validar que toda la
-- aplicación ya lee desde clientes.id y no desde las columnas
-- denormalizadas de pedidos.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PARTE 1: Crear tabla clientes
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
    id                BIGSERIAL   PRIMARY KEY,
    telefono          TEXT        NOT NULL,
    nombre            TEXT        NOT NULL,
    email             TEXT,
    direccion_default TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_clientes_telefono UNIQUE (telefono)
);

-- Índice de búsqueda por nombre (full-text, usado en autocomplete)
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_gin
    ON clientes USING gin(to_tsvector('spanish', nombre));

-- Trigger de updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clientes_updated_at ON clientes;
CREATE TRIGGER trg_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- PARTE 2: Poblar desde pedidos existentes
-- Usa DISTINCT ON para tomar el registro más reciente de cada
-- teléfono (nombre, email, dirección más actualizados).
-- ─────────────────────────────────────────────────────────────
INSERT INTO clientes (telefono, nombre, email, direccion_default, created_at)
SELECT DISTINCT ON (cliente_telefono)
    cliente_telefono,
    cliente_nombre,
    cliente_email,
    direccion_envio,
    MIN(created_at) OVER (PARTITION BY cliente_telefono)
FROM pedidos
WHERE cliente_telefono IS NOT NULL
  AND cliente_telefono != ''
ORDER BY cliente_telefono, created_at DESC
ON CONFLICT (telefono) DO NOTHING;

-- Verificar cuántos clientes se crearon:
-- SELECT COUNT(*) FROM clientes;

-- ─────────────────────────────────────────────────────────────
-- PARTE 3: Agregar FK cliente_id a pedidos
-- ─────────────────────────────────────────────────────────────

-- 3.1 Agregar columna nullable (para no romper inserts existentes)
ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS cliente_id BIGINT;

-- 3.2 Poblar cliente_id desde clientes via teléfono
UPDATE pedidos p
SET cliente_id = c.id
FROM clientes c
WHERE c.telefono = p.cliente_telefono
  AND p.cliente_id IS NULL;

-- 3.3 Verificar pedidos huérfanos (teléfono sin match en clientes)
-- SELECT numero_pedido, cliente_telefono
-- FROM pedidos
-- WHERE cliente_id IS NULL;

-- 3.4 Agregar FK (permite NULL para pedidos muy viejos sin teléfono)
ALTER TABLE pedidos
    DROP CONSTRAINT IF EXISTS fk_pedidos_cliente;

ALTER TABLE pedidos
    ADD CONSTRAINT fk_pedidos_cliente
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    ON UPDATE CASCADE;

-- Índice en FK (acelera JOINs y búsquedas por cliente)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_cliente_id
    ON pedidos (cliente_id);

-- ─────────────────────────────────────────────────────────────
-- PARTE 4: (OPCIONAL — ejecutar solo cuando el código esté
-- actualizado para usar clientes.id en lugar de las columnas
-- denormalizadas)
-- ─────────────────────────────────────────────────────────────
-- ALTER TABLE pedidos DROP COLUMN IF EXISTS cliente_nombre;
-- ALTER TABLE pedidos DROP COLUMN IF EXISTS cliente_email;
-- ALTER TABLE pedidos DROP COLUMN IF EXISTS direccion_envio;
-- (Mantener cliente_telefono como snapshot histórico del número
--  al momento del pedido, por si el cliente cambia de teléfono.)

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ─────────────────────────────────────────────────────────────
-- SELECT
--     c.id, c.telefono, c.nombre,
--     COUNT(p.numero_pedido) AS pedidos,
--     SUM(p.precio_total)    AS total_gastado
-- FROM clientes c
-- LEFT JOIN pedidos p ON p.cliente_id = c.id
-- GROUP BY c.id
-- ORDER BY pedidos DESC
-- LIMIT 20;
