-- ============================================================
-- SHOGUN — Migración v7: Columnas GENERATED en productos
-- Convierte costo_total, margen_dinero y margen_porcentaje de
-- columnas manuales a GENERATED ALWAYS AS (STORED), eliminando
-- la posibilidad de que queden desincronizadas después de un UPDATE.
--
-- IMPORTANTE: PostgreSQL no permite ALTER sobre una GENERATED column.
-- El proceso es: DROP → ADD con GENERATED.
-- Esto es seguro porque los valores son derivados y se recalculan.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PARTE 1: Verificar estado actual de las columnas
-- (Ejecuta esto primero para confirmar si ya son GENERATED)
-- ─────────────────────────────────────────────────────────────
-- SELECT column_name, generation_expression, is_generated
-- FROM information_schema.columns
-- WHERE table_name = 'productos'
--   AND column_name IN ('costo_total', 'margen_dinero', 'margen_porcentaje');

-- ─────────────────────────────────────────────────────────────
-- PARTE 2: Reemplazar con GENERATED ALWAYS AS
-- ─────────────────────────────────────────────────────────────

-- 2.1 costo_total = costo_material + costo_mano_obra
ALTER TABLE productos DROP COLUMN IF EXISTS costo_total;
ALTER TABLE productos
    ADD COLUMN costo_total NUMERIC(12, 2)
    GENERATED ALWAYS AS (
        COALESCE(costo_material, 0) + COALESCE(costo_mano_obra, 0)
    ) STORED;

COMMENT ON COLUMN productos.costo_total IS
    'Costo total del producto = costo_material + costo_mano_obra. '
    'Columna GENERATED — nunca escribir directamente.';

-- 2.2 margen_dinero = precio_base - costo_total
ALTER TABLE productos DROP COLUMN IF EXISTS margen_dinero;
ALTER TABLE productos
    ADD COLUMN margen_dinero NUMERIC(12, 2)
    GENERATED ALWAYS AS (
        precio_base - (COALESCE(costo_material, 0) + COALESCE(costo_mano_obra, 0))
    ) STORED;

COMMENT ON COLUMN productos.margen_dinero IS
    'Margen de ganancia en unidad monetaria = precio_base - costo_total. '
    'Columna GENERATED — nunca escribir directamente.';

-- 2.3 margen_porcentaje = margen_dinero / precio_base * 100
ALTER TABLE productos DROP COLUMN IF EXISTS margen_porcentaje;
ALTER TABLE productos
    ADD COLUMN margen_porcentaje NUMERIC(8, 4)
    GENERATED ALWAYS AS (
        CASE
            WHEN precio_base > 0 THEN
                (precio_base - (COALESCE(costo_material, 0) + COALESCE(costo_mano_obra, 0)))
                / precio_base * 100
            ELSE 0
        END
    ) STORED;

COMMENT ON COLUMN productos.margen_porcentaje IS
    'Margen de ganancia en porcentaje. Columna GENERATED — nunca escribir directamente.';

-- ─────────────────────────────────────────────────────────────
-- PARTE 3: Documentar costo_mano_obra en pedidos como obsoleto
-- (La columna ya existe; la marcamos con un comentario mientras
--  se decide si eliminar o reutilizar.)
-- ─────────────────────────────────────────────────────────────
COMMENT ON COLUMN pedidos.costo_mano_obra IS
    'DEPRECATED: Siempre 0 en la lógica actual. El costo de mano de obra '
    'de personalización va en costo_personalizacion. Pendiente de eliminación.';

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
-- SELECT sku, nombre, precio_base, costo_material, costo_mano_obra,
--        costo_total, margen_dinero, margen_porcentaje
-- FROM productos
-- ORDER BY nombre
-- LIMIT 10;
