# 🍎 Auditoría Apple HIG — Shogun Sistema de Ventas

**Fecha**: 2026-02-21  
**Versión auditada**: Backoffice principal (index.html + CSS + JS)  
**Referencia**: [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

---

## 📊 Resumen Ejecutivo

El proyecto Shogun tiene una **base sólida** que ya implementa muchos principios HIG correctamente:

### ✅ Lo que ya cumple bien
- Design tokens centralizados (colores, tipografía, spacing, radii, motion)
- Colores semánticos Apple (system blue, green, red, orange)
- Dark mode con superficies gris oscuro (no negro puro) — correcto per HIG
- Touch targets de 44px mínimo
- `prefers-reduced-motion` respetado
- `prefers-color-scheme` respetado para el tema inicial
- Vibrancy effect en header con `backdrop-filter`
- Bottom sheets en mobile para modales
- Keyboard shortcuts (⌘K para búsqueda)
- Skip-link de accesibilidad
- SR-only labels
- Focus-visible con outline azul accent
- Tabular numbers para datos financieros
- Skeleton loading (shimmer)
- Safe area insets para iPhone con notch

### ❌ Hallazgos a corregir (19 items)

| Prioridad | Cant. | Descripción |
|-----------|-------|-------------|
| 🔴 Crítica | 5 | Violaciones directas de HIG que afectan UX/accesibilidad |
| 🟡 Media | 8 | Inconsistencias que reducen la calidad percibida |
| 🟢 Leve | 6 | Refinamientos para alcanzar el nivel Apple nativo |

---

## 🔴 CRÍTICAS (5 items)

### C1. Header icon buttons violan el touch target mínimo de 44px
**Archivo**: `styles.css` línea 530-542  
**HIG**: [Pointing and tapping](https://developer.apple.com/design/human-interface-guidelines/pointing-and-tapping)  
**Problema**: `.header-icon-btn` tiene `width: 34px; height: 34px;` — 10px inferior al mínimo de 44px de Apple.  
**Riesgo**: En iOS, los usuarios fallarán al tocar estos botones frecuentemente.  
**Solución**: Aumentar a 44px mínimo, o mantener el visual de 34px pero añadir padding invisible para el área de toque.

### C2. `.drawer-close` viola touch target mínimo
**Archivo**: `styles.css` línea 2476  
**Problema**: `width: 32px; height: 32px;` — el botón de cerrar del drawer tiene solo 32px.  
**Solución**: Aumentar a mínimo 44px.

### C3. `.alerta-close` sin touch target mínimo
**Archivo**: `styles.css` línea 2293-2294  
**Problema**: `padding: 2px 6px` — el área de toque es minúscula.  
**Solución**: Añadir `min-width` y `min-height` de 44px.

### C4. ~~Modal overlay no cierra al hacer clic fuera~~ ✅ YA CUMPLE
**HIG**: [Modality](https://developer.apple.com/design/human-interface-guidelines/modality)  
**Estado**: Verificado. `ModalManager._createOverlay()` ya implementa dismiss-on-overlay-click, Escape key, y focus trap.

### C5. Falta `aria-live` en contenedores dinámicos
**HIG**: [Accessibility > Dynamic content](https://developer.apple.com/design/human-interface-guidelines/accessibility)  
**Problema**: Los contenedores que se actualizan dinámicamente (`#tabla-pedidos tbody`, `#lista-pendientes`, `#productos-grid`) no tienen `aria-live` para screen readers.

---

## 🟡 MEDIAS (8 items)

### M1. Botones pill (radius-full) inconsistentes con HIG macOS
**Archivo**: `styles.css` línea 24  
**HIG**: [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)  
**Problema**: `.btn` usa `border-radius: var(--radius-full)` (pill shape). En macOS/iPadOS HIG, los botones prominentes usan `radius-lg` (~12-16px), no pill. Pills son para badges/tags. Solo los botones de iPhone nativo (como "Get" en App Store) usan pills, y son muy compactos.  
**Impacto**: El CTA "Nuevo Pedido" y otros botones se ven más iOS que macOS. Para un backoffice que se usa principalmente en desktop, `radius-lg` es más apropiado.

### M2. Hover con `opacity: 0.85` en `.btn:hover` no es patrón Apple
**HIG**: Apple usa cambio de luminosidad/saturación, no opacidad.  
**Solución**: Ya lo corrigen en `.btn-primary:hover` con `opacity: 1`, pero el fallback `.btn:hover { opacity: 0.85 }` afecta a botones que no tienen override específico.

### M3. Tab badge no tiene accesibilidad completa
**Archivo**: `index.html` línea 138  
**Problema**: `<span class="tab-badge" id="tabPendientesBadge" aria-label="pedidos pendientes">` está vacío inicialmente y se oculta con `style="display:none;"`. Cuando se muestra, necesita `role="status"` para ser anunciado por screen readers.

### M4. Sort indicators usan CSS borders en vez de SF Symbols/icons
**HIG**: [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)  
**Problema**: Los indicadores de ordenamiento en la tabla usan triángulos CSS (borders). Apple recomienda usar iconos vectoriales (chevron.up / chevron.down).

### M5. Input de búsqueda sin clear button
**HIG**: [Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields)  
**Problema**: El campo de búsqueda no tiene un botón "X" para limpiar, que es estándar en HIG.

### M6. Selects no usan el patrón Apple nativo de menus
**HIG**: [Menus](https://developer.apple.com/design/human-interface-guidelines/menus)  
**Nota**: Los `<select>` nativos del browser ya siguen HIG en Safari/macOS. En otros browsers, el styling custom con chevron SVG es aceptable. Solo verificar que el tamaño mínimo sea 44px en mobile.

### M7. Charts no respetan colores semánticos en dark mode
**Problema**: Chart.js charts pueden no actualizar sus colores al cambiar de tema. Verificar que `updateChartsTheme()` actualiza correctamente.

### M8. Transiciones de tab sin feedback háptico visual
**HIG**: [Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)  
**Problema**: La transición de tabs es solo un fade-in. Apple recomienda un feedback visual más tangible al cambiar tabs — el tab seleccionado debería tener una transición con spring curve suave.

---

## 🟢 LEVES (6 items)

### L1. Font Awesome en vez de SF Symbols
**HIG**: [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)  
**Nota**: SF Symbols solo están disponibles nativamente en Apple platforms. En web, Font Awesome con `Regular` (outline) weight es un reemplazo aceptable. El proyecto ya usa correctamente `far fa-*` (Regular) para la mayoría de iconos, lo cual se asemeja al peso Regular de SF Symbols. ✅ Aceptable.

### L2. Satoshi + DM Sans en vez de SF Pro
**HIG**: [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)  
**Nota**: SF Pro no se puede cargar en web para non-Apple devices. Satoshi es un excelente sustituto para SF Pro Display, y DM Sans para SF Pro Text. La fallback chain `-apple-system, BlinkMacSystemFont, 'SF Pro'` asegura que en Safari/macOS se use la fuente nativa. ✅ Buena implementación.

### L3. `line-height: 1.47` del body es ligeramente alto
**HIG**: Apple usa `line-height` de ~1.29-1.41 para body text (SF Pro Text 15px → 20px leading = 1.33).  
**Valor recomendado**: `1.4` para body, `1.29` para display text.

### L4. Skeleton bars no usan shimmer animation en todos los casos
**Problema**: `.skeleton-bar` tiene background estático, solo `.skeleton` tiene shimmer. Los skeleton bars deberían animar.

### L5. Onboarding panel podría usar presentación modal nativa
**HIG**: [Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)  
**Nota**: Apple prefiere onboarding inline (no modal) que se integre con el contenido. El panel actual es inline, lo cual es correcto. Solo mejorar con progressive disclosure.

### L6. No hay feedback visual al copiar al portapapeles
**HIG**: [Providing feedback](https://developer.apple.com/design/human-interface-guidelines/providing-feedback)  
**Nota**: El código muestra un toast notification. Verificar que incluye el ícono de checkmark. ✅ Implementado.

---

## 📐 Correcciones Implementadas

Las siguientes correcciones se aplican directamente al código.
