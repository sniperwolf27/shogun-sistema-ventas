/**
 * UTILIDADES GLOBALES
 * Funciones helper reutilizables
 */

/* ═══════ TEMA (Dark Mode + prefers-color-scheme) ═══════ */
function initTheme() {
    const saved = localStorage.getItem('theme');
    let theme;

    if (saved) {
        // Manual override persists
        theme = saved;
    } else {
        // First visit: respect OS preference
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'far fa-moon';

    // Listen for OS theme changes (only applies if user hasn't set a manual override)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('theme')) return; // manual override active
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        const ic = document.querySelector('#themeToggle i');
        if (ic) ic.className = newTheme === 'dark' ? 'fas fa-sun' : 'far fa-moon';
        if (typeof updateChartsTheme === 'function') updateChartsTheme();
    });
}

function toggleDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    const iconClass = isDark ? 'far fa-moon' : 'fas fa-sun';
    // Update all theme toggle icons (header, dropdown, mobile menu)
    document.querySelectorAll('#themeToggle i, #dropdownThemeToggle i, #mobileThemeToggle i').forEach(icon => {
        icon.className = iconClass;
    });

    if (typeof updateChartsTheme === 'function') updateChartsTheme();
}

/* ═══════ OS-AWARE KBD HINT ═══════ */
function setupKbdHint() {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    const kbdHint = document.querySelector('.kbd-hint');
    if (kbdHint) {
        kbdHint.innerHTML = isMac ? '<kbd>⌘</kbd><kbd>K</kbd>' : '<kbd>Ctrl</kbd><kbd>K</kbd>';
    }
}

/* ═══════ NOTIFICACIONES ═══════ */
/* Unified notification system is defined in modals.js.
   This fallback only runs if modals.js hasn't loaded yet. */
if (typeof window.showNotification !== 'function') {
    window.showNotification = function (message, type) {
        console.log(`[${type}] ${message}`);
    };
}

/* ═══════ SKELETONS ═══════ */
function showStatsSkeleton() {
    ['stat-total', 'stat-ventas', 'stat-ganancia', 'stat-pendientes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = '...'; el.classList.add('skeleton-loading'); }
    });
}

function showCardsSkeleton(containerId, count) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = Array.from({ length: count }, () =>
        '<div class="pendiente-card skeleton-card-placeholder"><div class="skeleton-bar skeleton-bar-lg"></div><div class="skeleton-bar skeleton-bar-sm"></div></div>'
    ).join('');
}

/* ═══════ EMPTY STATE SVG ═══════ */
function emptyStateSVG() {
    return `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="20" stroke="var(--text-quaternary)" stroke-width="2" fill="none"/>
        <path d="M30 46c2-3 6-4 10-4s8 1 10 4" stroke="var(--text-quaternary)" stroke-width="2" stroke-linecap="round" fill="none"/>
        <circle cx="34" cy="35" r="2" fill="var(--text-quaternary)"/>
        <circle cx="46" cy="35" r="2" fill="var(--text-quaternary)"/>
    </svg>`;
}

/* ═══════ FILTROS PERSISTENTES ═══════ */
const FilterStore = {
    save(key, value) { localStorage.setItem('filter_' + key, value); },
    load(key) { return localStorage.getItem('filter_' + key) || ''; }
};

/**
 * Formatear numeros como moneda
 */
function formatearMoneda(valor) {
    if (!valor && valor !== 0) return 'RD$0';

    const numero = parseFloat(valor);

    if (isNaN(numero)) return 'RD$0';

    return 'RD$' + numero.toLocaleString('es-DO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

/**
 * Obtener badge HTML para estados
 */
function getEstadoBadge(estado) {
    const colores = {
        'Recibido': 'info',
        'Entregado': 'success',
        'En Camino': 'info',
        'Listo para Envio': 'warning',
        'Listo para Envío': 'warning',
        'En Produccion': 'primary',
        'En Producción': 'primary',
        'Pendiente': 'warning',
        'Parcial': 'warning',
        'Bloqueado - Sin Direccion': 'danger',
        'Bloqueado - Sin Dirección': 'danger',
        'Bloqueado': 'danger',
        'Cancelado': 'danger',
        'Reembolsado': 'danger'
    };

    const color = colores[estado] || 'secondary';

    return `<span class="badge badge-${color}">${estado}</span>`;
}

/**
 * Formatear fecha DD/MM/YYYY
 */
function formatearFecha(fecha) {
    if (!fecha) return '-';

    if (fecha === 'Pendiente') return 'Pendiente';

    // Si ya viene en formato DD/MM/YYYY, retornarla
    if (typeof fecha === 'string' && fecha.includes('/')) {
        return fecha;
    }

    // Si es objeto Date
    if (fecha instanceof Date) {
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const anio = fecha.getFullYear();
        return `${dia}/${mes}/${anio}`;
    }

    return fecha;
}

/**
 * Calcular dias entre dos fechas
 */
function calcularDias(fecha1, fecha2) {
    const f1 = new Date(fecha1);
    const f2 = new Date(fecha2);

    const diferencia = Math.abs(f2 - f1);
    const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

    return dias;
}

/**
 * Validar email
 */
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validar telefono dominicano
 */
function validarTelefono(telefono) {
    // Formato: 809-555-0000 o 8095550000
    const regex = /^(809|829|849)[-\s]?\d{3}[-\s]?\d{4}$/;
    return regex.test(telefono);
}

/**
 * Formatear teléfono dominicano → xxx-xxx-xxxx
 * Handles bare digits, dashes, spaces, or +1 prefix.
 * Returns '—' for empty/null values.
 */
function formatTelefono(raw) {
    if (!raw) return '—';
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length === 10) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits[0] === '1') {
        // +1 country code
        return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    // Non-standard length — return as-is without mangling
    return raw;
}

/**
 * Sanitizar texto (prevenir XSS)
 */
function sanitizarTexto(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

/**
 * Debounce para busquedas
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Mostrar loading spinner (legacy - kept for backward compatibility)
 * Prefer inline skeleton loaders instead of fullscreen blocking.
 */
function showLoading(show = true) {
    // No-op: replaced by inline skeleton loaders (showTableSkeleton, showStatsSkeleton, etc.)
}

/**
 * Copiar al portapapeles
 */
async function copiarAlPortapapeles(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        showNotification('Copiado al portapapeles', 'success', 2000);
    } catch (err) {
        console.error('Error al copiar:', err);
        showNotification('Error al copiar', 'error');
    }
}

/**
 * Descargar como archivo
 */
function descargarArchivo(contenido, nombreArchivo, tipo = 'text/plain') {
    const blob = new Blob([contenido], { type: tipo });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
