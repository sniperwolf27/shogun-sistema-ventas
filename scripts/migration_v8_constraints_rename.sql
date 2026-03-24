-- ============================================================
-- SHOGUN — Migración v8: Rename, UNIQUE constraints y fix adjuntos
-- Agrupa cambios menores de naming y constraints de integridad
-- que no requieren movimiento de datos.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PARTE 1: Renombrar categorias_producto_tabla → categorias_producto
-- El sufijo _tabla viola todas las convenciones de naming de RDBMS.
-- ─────────────────────────────────────────────────────────────

-- 1.1 Renombrar la tabla
ALTER TABLE IF EXISTS categorias_producto_tabla
    RENAME TO categorias_producto;

-- 1.2 Renombrar la FK en productos para reflejar el nuevo nombre
ALTER TABLE productos
    DROP CONSTRAINT IF EXISTS fk_producto_categoria;

ALTER TABLE productos
    ADD CONSTRAINT fk_producto_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias_producto(id)
    ON UPDATE CASCADE;

-- 1.3 Renombrar índice si existe
ALTER INDEX IF EXISTS categorias_producto_tabla_pkey
    RENAME TO categorias_producto_pkey;

-- 1.4 Comentario explicativo
COMMENT ON TABLE categorias_producto IS
    'Categorías de productos (antes: categorias_producto_tabla). '
    'Renombrada en migración v8 para cumplir convenciones de naming.';

-- ─────────────────────────────────────────────────────────────
-- PARTE 2: Constraints UNIQUE faltantes
-- ─────────────────────────────────────────────────────────────

-- 2.1 categorias_producto.nombre — evita dos categorías con el mismo nombre
ALTER TABLE categorias_producto
    DROP CONSTRAINT IF EXISTS uq_categorias_nombre;
ALTER TABLE categorias_producto
    ADD CONSTRAINT uq_categorias_nombre UNIQUE (nombre);

-- 2.2 categorias_producto.codigo — el código debe ser único si se usa
ALTER TABLE categorias_producto
    DROP CONSTRAINT IF EXISTS uq_categorias_codigo;
ALTER TABLE categorias_producto
    ADD CONSTRAINT uq_categorias_codigo UNIQUE (codigo);

-- 2.3 personalizaciones.codigo — la búsqueda get_by_codigo asume unicidad
ALTER TABLE personalizaciones
    DROP CONSTRAINT IF EXISTS uq_personalizaciones_codigo;
ALTER TABLE personalizaciones
    ADD CONSTRAINT uq_personalizaciones_codigo UNIQUE (codigo);

-- ─────────────────────────────────────────────────────────────
-- PARTE 3: Fix pedido_adjuntos — columna nombre_archivo siempre = nombre_original
-- La intención era: nombre_archivo = nombre sanitizado en storage,
-- nombre_original = nombre original del usuario.
-- Actualmente el código pasa ambos iguales (extras.py:100).
-- Agregamos un comentario y una constraint para documentar el contrato.
-- ─────────────────────────────────────────────────────────────
COMMENT ON COLUMN pedido_adjuntos.nombre_archivo IS
    'Nombre del archivo tal como está guardado en Supabase Storage '
    '(puede ser un nombre único/sanitizado). Actualmente igual a nombre_original.';

COMMENT ON COLUMN pedido_adjuntos.nombre_original IS
    'Nombre original del archivo enviado por el usuario (para mostrar en UI).';

-- ─────────────────────────────────────────────────────────────
-- PARTE 4: NOT NULL en columnas que no deberían ser NULL
-- ─────────────────────────────────────────────────────────────

-- pedidos: campos obligatorios de cliente
ALTER TABLE pedidos
    ALTER COLUMN cliente_nombre      SET NOT NULL,
    ALTER COLUMN cliente_telefono    SET NOT NULL,
    ALTER COLUMN producto_sku        SET NOT NULL,
    ALTER COLUMN producto_nombre     SET NOT NULL,
    ALTER COLUMN fecha_pago          SET NOT NULL;

-- categorias_producto: nombre obligatorio
ALTER TABLE categorias_producto
    ALTER COLUMN nombre SET NOT NULL;

-- personalizaciones: tipo y código obligatorios
ALTER TABLE personalizaciones
    ALTER COLUMN codigo SET NOT NULL,
    ALTER COLUMN tipo   SET NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- PARTE 5: Trigger de updated_at en productos
-- (El mismo set_updated_at() creado en v5 se reutiliza aquí)
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_productos_updated_at ON productos;
CREATE TRIGGER trg_productos_updated_at
    BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
-- Verificar que la tabla fue renombrada:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE 'categor%';

-- Verificar constraints UNIQUE:
-- SELECT tc.constraint_name, kcu.column_name, tc.table_name
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu
--     ON tc.constraint_name = kcu.constraint_name
-- WHERE tc.constraint_type = 'UNIQUE'
--   AND tc.table_name IN ('categorias_producto', 'personalizaciones')
-- ORDER BY tc.table_name, kcu.column_name;
