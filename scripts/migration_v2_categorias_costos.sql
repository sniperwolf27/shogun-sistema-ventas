-- ============================================================
-- SHOGUN — Migración v2: Categorías FK + Costos unificados
-- Ejecutar en Supabase SQL Editor EN ORDEN
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PARTE 1: Agregar campo codigo a categorias_producto_tabla
-- ─────────────────────────────────────────────────────────────
ALTER TABLE categorias_producto_tabla
    ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);

-- ─────────────────────────────────────────────────────────────
-- PARTE 2: Migrar productos.categoria (texto) → categoria_id (FK)
-- ─────────────────────────────────────────────────────────────

-- 2.1 Agregar columna FK
ALTER TABLE productos
    ADD COLUMN IF NOT EXISTS categoria_id INTEGER;

-- 2.2 Poblar desde el nombre de categoría existente
UPDATE productos p
SET categoria_id = c.id
FROM categorias_producto_tabla c
WHERE c.nombre = p.categoria::text
  AND p.categoria_id IS NULL;

-- 2.3 Ver productos que no tuvieron match (ejecuta esto para verificar antes de continuar)
-- SELECT sku, nombre, categoria FROM productos WHERE categoria_id IS NULL;

-- 2.4 Agregar constraint FK (permite NULL temporalmente para no perder productos huérfanos)
ALTER TABLE productos
    DROP CONSTRAINT IF EXISTS fk_producto_categoria;

ALTER TABLE productos
    ADD CONSTRAINT fk_producto_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias_producto_tabla(id);

-- 2.5 Eliminar columna de texto antigua (SOLO ejecutar cuando hayas verificado el paso 2.3)
-- ALTER TABLE productos DROP COLUMN IF EXISTS categoria;

-- ─────────────────────────────────────────────────────────────
-- PARTE 3: Agregar costo_envio a la tabla pedidos
-- ─────────────────────────────────────────────────────────────

-- 3.1 Nueva columna: costo real de logística que paga la empresa
ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS costo_envio NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- 3.2 Inicializar con el valor de precio_envio para pedidos existentes
UPDATE pedidos
SET costo_envio = COALESCE(precio_envio, 0)
WHERE costo_envio = 0;

-- ─────────────────────────────────────────────────────────────
-- PARTE 4: Actualizar fórmula de costo_total para incluir costo_envio
--
-- Supabase suele usar columnas GENERATED o un trigger.
-- Ejecuta primero esta query para ver qué tipo es:
--   SELECT column_name, generation_expression
--   FROM information_schema.columns
--   WHERE table_name = 'pedidos' AND column_name = 'costo_total';
-- ─────────────────────────────────────────────────────────────

-- OPCIÓN A: Si costo_total es una columna GENERATED:
-- (psql no permite ALTER sobre generated columns directamente — hay que recrearla)
-- ALTER TABLE pedidos DROP COLUMN costo_total;
-- ALTER TABLE pedidos ADD COLUMN costo_total NUMERIC(12,2)
--     GENERATED ALWAYS AS (
--         COALESCE(costo_producto, 0)
--         + COALESCE(costo_personalizacion, 0)
--         + COALESCE(costo_mano_obra, 0)
--         + COALESCE(costos_adicionales, 0)
--         + COALESCE(costo_envio, 0)
--     ) STORED;

-- OPCIÓN B: Si costo_total lo actualiza un TRIGGER, reemplaza la función:
-- Primero muestra el trigger actual:
--   SELECT trigger_name, event_manipulation, action_statement
--   FROM information_schema.triggers WHERE event_object_table = 'pedidos';

-- Luego actualiza la función del trigger para incluir costo_envio:
-- CREATE OR REPLACE FUNCTION calcular_costo_total_pedido()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.costo_total := COALESCE(NEW.costo_producto, 0)
--                      + COALESCE(NEW.costo_personalizacion, 0)
--                      + COALESCE(NEW.costo_mano_obra, 0)
--                      + COALESCE(NEW.costos_adicionales, 0)
--                      + COALESCE(NEW.costo_envio, 0);
--     NEW.ganancia := COALESCE(NEW.precio_total, 0) - NEW.costo_total;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ─────────────────────────────────────────────────────────────
-- SELECT
--     p.sku, p.nombre,
--     p.categoria_id, c.nombre AS categoria_nombre,
--     p.precio_base, p.costo_material
-- FROM productos p
-- LEFT JOIN categorias_producto_tabla c ON c.id = p.categoria_id
-- ORDER BY p.nombre;
