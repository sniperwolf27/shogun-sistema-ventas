-- ============================================================
-- SHOGUN — Migración v4: Tabla configuracion
-- Centraliza los parámetros de negocio que antes estaban
-- hardcodeados en el código Python (magic numbers).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PARTE 1: Crear tabla
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracion (
    clave       TEXT        PRIMARY KEY,
    valor       TEXT        NOT NULL,
    descripcion TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: solo admins pueden modificar (ajustar según política de Supabase)
-- ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- PARTE 2: Insertar valores iniciales
-- Usa ON CONFLICT para que re-ejecutar la migración sea seguro.
-- ─────────────────────────────────────────────────────────────
INSERT INTO configuracion (clave, valor, descripcion) VALUES
    (
        'envio_costo_default',
        '200',
        'Costo de envío predeterminado (MXN) cuando el operador no especifica uno.'
    ),
    (
        'personalizacion_margen_fijo',
        '0.5',
        'Fracción del precio de venta que se usa como costo para personalizaciones de precio fijo '
        '(ej. DTF, serigrafía). 0.5 = 50 %.'
    ),
    (
        'dias_produccion_default',
        '7',
        'Días hábiles de producción que se asumen si el operador no indica otro valor.'
    ),
    (
        'cliente_vip_min_pedidos',
        '10',
        'Cantidad mínima de pedidos para clasificar a un cliente como VIP.'
    ),
    (
        'cliente_frecuente_min_pedidos',
        '5',
        'Cantidad mínima de pedidos para clasificar a un cliente como Frecuente '
        '(por debajo → Regular).'
    )
ON CONFLICT (clave) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- PARTE 3: Función helper para leer un parámetro con default
-- (útil para triggers y funciones PL/pgSQL que necesiten config)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cfg_get(p_clave TEXT, p_default TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        (SELECT valor FROM configuracion WHERE clave = p_clave),
        p_default
    );
$$;

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
-- SELECT * FROM configuracion ORDER BY clave;
-- SELECT cfg_get('envio_costo_default', '200');
