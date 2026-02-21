/**
 * PEDIDOS MODULE — Redesigned
 * Apple HIG: context bar, pill tab filters, urgency dots, inline state popover, mobile cards
 */

let pedidosCache = [];
let currentPage = 1;
let perPage = 25;
let totalPedidos = 0;
let totalPages = 1;
let currentFilters = { q: '', estado: '', canal: '' };
let _undoTimer = null;
let _popoverPedidoId = null; // which pedido the popover belongs to

// ─── Urgency helpers ──────────────────────────────────────────────────────────

function getUrgencyLevel(pedido) {
    const retraso = parseInt(pedido.dias_retraso) || 0;
    // dias_retraso is stored as positive int in DB when late
    if (retraso > 0) return 'red';
    // Calculate days remaining from fecha_compromiso
    if (pedido.fecha_compromiso) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const comp = new Date(pedido.fecha_compromiso);
        comp.setHours(0, 0, 0, 0);
        const diff = Math.round((comp - hoy) / 86400000);
        if (diff <= 0) return 'red';
        if (diff <= 1) return 'orange';
        if (diff <= 3) return 'yellow';
    }
    return 'none';
}

function getDiasBadgeHTML(pedido) {
    const estado = pedido.estatus_produccion || '';
    if (['Entregado', 'Cancelado'].includes(estado)) return '';

    const retraso = parseInt(pedido.dias_retraso) || 0;
    if (retraso > 0) {
        return `<span class="dias-badge dias-retraso" title="${retraso} día${retraso !== 1 ? 's' : ''} de retraso">−${retraso}d</span>`;
    }
    if (pedido.fecha_compromiso) {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const comp = new Date(pedido.fecha_compromiso); comp.setHours(0, 0, 0, 0);
        const diff = Math.round((comp - hoy) / 86400000);
        if (diff <= 0) return `<span class="dias-badge dias-retraso" title="Vence hoy">Hoy</span>`;
        if (diff <= 1) return `<span class="dias-badge dias-urgente" title="Vence mañana">+1d</span>`;
        if (diff <= 3) return `<span class="dias-badge dias-pronto" title="${diff} días restantes">+${diff}d</span>`;
    }
    return '';
}

// ─── Canal icon ───────────────────────────────────────────────────────────────

function getCanalIcon(canal) {
    const icons = {
        'WhatsApp': '<i class="fab fa-whatsapp" title="WhatsApp" style="color:#25D366"></i>',
        'Instagram': '<i class="fab fa-instagram" title="Instagram" style="color:#C13584"></i>',
        'Facebook': '<i class="fab fa-facebook" title="Facebook" style="color:#1877F2"></i>',
        'Referido': '<i class="fas fa-user-group" title="Referido" style="color:var(--text-tertiary)"></i>',
        'Tienda': '<i class="fas fa-store" title="Tienda" style="color:var(--accent)"></i>',
    };
    return icons[canal] || `<i class="fas fa-circle-dot" title="${canal || '—'}" style="color:var(--text-quaternary)"></i>`;
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function emptyPedidosSVG() {
    return `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="14" y="18" width="52" height="44" rx="6" stroke="var(--text-quaternary)" stroke-width="2" fill="none"/>
        <path d="M14 30h52" stroke="var(--text-quaternary)" stroke-width="2"/>
        <rect x="22" y="36" width="16" height="2" rx="1" fill="var(--text-quaternary)" opacity="0.5"/>
        <rect x="22" y="42" width="24" height="2" rx="1" fill="var(--text-quaternary)" opacity="0.3"/>
        <rect x="22" y="48" width="12" height="2" rx="1" fill="var(--text-quaternary)" opacity="0.2"/>
    </svg>`;
}

function emptySearchSVG() {
    return `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="35" cy="35" r="16" stroke="var(--text-quaternary)" stroke-width="2" fill="none"/>
        <path d="M47 47l12 12" stroke="var(--text-quaternary)" stroke-width="2" stroke-linecap="round"/>
        <path d="M29 35h12M35 29v12" stroke="var(--text-quaternary)" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
    </svg>`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function showTableSkeleton() {
    const tbody = document.querySelector('#tabla-pedidos tbody');
    if (!tbody) return;
    tbody.innerHTML = Array.from({ length: 7 }, () => `
        <tr class="table-skeleton-row">
            <td><div class="skeleton skeleton-cb"></div></td>
            <td><div class="skeleton skeleton-sm"></div></td>
            <td><div class="skeleton skeleton-md"></div></td>
            <td><div class="skeleton skeleton-lg"></div></td>
            <td><div class="skeleton skeleton-badge"></div></td>
            <td><div class="skeleton skeleton-sm"></div></td>
        </tr>
    `).join('');

    // Mobile skeleton
    const mobileContainer = document.getElementById('pedidoCardsMobile');
    if (mobileContainer) {
        mobileContainer.innerHTML = Array.from({ length: 5 }, () => `
            <div class="pedido-card pedido-card-skeleton">
                <div class="skeleton skeleton-sm" style="width:60%"></div>
                <div class="skeleton skeleton-md" style="width:80%;margin-top:8px"></div>
                <div class="skeleton skeleton-badge" style="margin-top:12px"></div>
            </div>
        `).join('');
    }
}

// ─── Load resumen operativo ───────────────────────────────────────────────────

async function cargarResumenOperativo() {
    try {
        const data = await api.getResumenOperativo();
        const el = {
            activos: document.getElementById('ck-activos'),
            listos: document.getElementById('ck-listos'),
            atrasados: document.getElementById('ck-atrasados'),
            sinCobrar: document.getElementById('ck-sin-cobrar'),
        };
        if (el.activos) el.activos.textContent = data.activos ?? 0;
        if (el.listos) el.listos.textContent = data.listos_envio ?? 0;
        if (el.atrasados) {
            el.atrasados.textContent = data.atrasados ?? 0;
            // Visually pulse if there are delayed orders
            const card = el.atrasados.closest('.context-kpi-card');
            if (card) card.classList.toggle('ck-pulsing', (data.atrasados || 0) > 0);
        }
        if (el.sinCobrar) el.sinCobrar.textContent = data.sin_cobrar ?? 0;
    } catch (e) {
        console.warn('[resumen-operativo]', e);
    }
}

// ─── Load pedidos ─────────────────────────────────────────────────────────────

async function cargarPedidos(page = 1) {
    currentPage = page;
    currentFilters.q = (document.getElementById('searchPedidos')?.value || '').trim();
    currentFilters.canal = document.getElementById('filterCanal')?.value || '';
    try {
        showTableSkeleton();
        const result = await api.getPedidos({ page, limit: perPage, ...currentFilters });
        pedidosCache = result.pedidos || [];
        totalPedidos = result.total || 0;
        totalPages = result.pages || 1;
        renderizarTablaPedidos(result);
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        if (typeof showNotification === 'function') showNotification('Error al cargar pedidos', 'error');
        const tbody = document.querySelector('#tabla-pedidos tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="table-empty-cell">
            <div class="empty-state empty-state-error">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="20" stroke="var(--danger)" stroke-width="2" fill="none" opacity="0.5"/><path d="M40 30v14" stroke="var(--danger)" stroke-width="2.5" stroke-linecap="round"/><circle cx="40" cy="50" r="2" fill="var(--danger)"/></svg>
                <h3>Error al cargar pedidos</h3><p>Intenta recargar la página</p>
            </div>
        </td></tr>`;
    }
}

// ─── Render table ─────────────────────────────────────────────────────────────

function renderizarTablaPedidos(data) {
    const tbody = document.querySelector('#tabla-pedidos tbody');
    const mobileContainer = document.getElementById('pedidoCardsMobile');
    if (!tbody && !mobileContainer) return;

    const pedidos = data.pedidos || [];
    const total = data.total ?? 0;
    const pages = data.pages ?? 1;
    const page = data.page ?? currentPage;

    // Update result count
    const countEl = document.getElementById('table-result-count');
    if (countEl) {
        if (total === 0) {
            countEl.textContent = '0 pedidos';
        } else {
            const startIdx = (page - 1) * perPage + 1;
            const endIdx = Math.min(page * perPage, total);
            countEl.textContent = `${startIdx}–${endIdx} de ${total}`;
        }
    }

    if (!pedidos.length) {
        const isFiltered = currentFilters.q || currentFilters.estado || currentFilters.canal;
        const svg = isFiltered ? emptySearchSVG() : emptyPedidosSVG();
        const msg = isFiltered ? 'Sin resultados para esta búsqueda' : 'No hay pedidos para mostrar';
        const sub = isFiltered ? 'Intenta con otros filtros' : 'Los pedidos aparecerán aquí';
        const emptyHTML = `<div class="empty-state">${svg}<h3>${msg}</h3><p>${sub}</p></div>`;

        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="table-empty-cell">${emptyHTML}</td></tr>`;
        if (mobileContainer) mobileContainer.innerHTML = emptyHTML;
        renderPagination(0, 1, 1);
        return;
    }

    const isAdmin = Auth.isAdmin();

    // Desktop table
    if (tbody) {
        tbody.innerHTML = pedidos.map(p => crearFilaPedido(p, isAdmin)).join('');

        // Mark grupo rows
        const grupoCount = {};
        pedidos.forEach(p => { if (p.grupo_pedido) grupoCount[p.grupo_pedido] = (grupoCount[p.grupo_pedido] || 0) + 1; });
        tbody.querySelectorAll('tr[data-pedido-id]').forEach(row => {
            const id = row.dataset.pedidoId;
            const pedido = pedidos.find(p => String(p.id) === String(id));
            if (pedido && pedido.grupo_pedido && grupoCount[pedido.grupo_pedido] > 1) {
                row.classList.add('grupo-row');
            }
        });
    }

    // Mobile cards
    if (mobileContainer) {
        mobileContainer.innerHTML = pedidos.map(p => crearCardMobile(p, isAdmin)).join('');
    }

    renderPagination(total, pages, page);
}

// ─── Row template (desktop, 5 columns) ───────────────────────────────────────

function crearFilaPedido(pedido, isAdmin) {
    const urgency = getUrgencyLevel(pedido);
    const urgencyDot = urgency !== 'none'
        ? `<span class="urgency-dot urgency-${urgency}" title="Urgencia: ${urgency}"></span>`
        : '';

    const alerta = (!pedido.direccion || pedido.direccion === 'Pendiente') ? 'row-alert' : '';
    const deleteBtn = isAdmin
        ? `<button class="btn-icon btn-danger" data-action="delete" data-id="${pedido.id}" title="Eliminar pedido" aria-label="Eliminar pedido ${pedido.id}"><i class="far fa-trash-can" aria-hidden="true"></i></button>`
        : '';

    const canalIcon = getCanalIcon(pedido.canal);
    const fechaStr = pedido.fecha_pago ? formatearFechaCorta(pedido.fecha_pago) : '—';
    const grupoIcon = pedido.grupo_pedido
        ? `<span class="grupo-badge" title="Grupo: ${pedido.grupo_pedido}"><i class="fas fa-layer-group"></i></span> `
        : '';

    const diasBadge = getDiasBadgeHTML(pedido);

    // Payment badge — with explicit 'Pago:' label so it's not confused with production state
    // NOTE: 'Recibido' is the paid state in estado_pago enum (no 'Pagado' value exists)
    const pagoEstado = pedido.estatus_pago || '';
    const pagoBadge = pagoEstado === 'Recibido'
        ? ''
        : `<span class="row-pago-label">Pago:</span><span class="badge-pago badge-pago-pendiente" title="Estado de pago: ${pagoEstado}">${pagoEstado}</span>`;

    return `
        <tr class="${alerta}" data-pedido-id="${pedido.id}" tabindex="0">
            <td class="col-urgency" data-label="">
                <label class="checkbox-touch-target"><input type="checkbox" class="order-checkbox" value="${pedido.id}"></label>
                ${urgencyDot}
            </td>
            <td data-label="Pedido">
                <strong>${pedido.id}</strong>
                <div class="row-meta">${canalIcon} ${fechaStr}</div>
            </td>
            <td data-label="Cliente">
                <button class="btn-cliente-link" data-action="verClientePerfil" data-telefono="${pedido.telefono || ''}" title="Ver perfil del cliente">${pedido.cliente || ''}</button>
                ${pedido.telefono ? `<div class="row-meta">${pedido.telefono}</div>` : ''}
            </td>
            <td data-label="Producto">
                ${grupoIcon}${pedido.producto || ''}${pedido.color ? ' · ' + pedido.color : ''}
                <div class="row-meta"><span class="badge badge-secondary">${pedido.talla || ''}</span></div>
            </td>
            <td data-label="Estado">
                <div class="estado-produccion-cell">
                    <span class="row-state-label">Producción</span>
                    <button class="estado-badge-btn" data-action="toggleEstado" data-id="${pedido.id}" title="Click para cambiar estado de producción" aria-haspopup="listbox">
                        ${getEstadoBadge(pedido.estatus_produccion)}
                    </button>
                </div>
                ${pagoBadge ? `<div class="estado-pago-cell">${pagoBadge}</div>` : ''}
                ${diasBadge}
            </td>
            <td class="actions td-actions">
                <button class="btn-icon btn-info" data-action="view" data-id="${pedido.id}" title="Ver pedido" aria-label="Ver pedido ${pedido.id}"><i class="far fa-eye" aria-hidden="true"></i></button>
                <button class="btn-icon btn-warning" data-action="edit" data-id="${pedido.id}" title="Editar pedido" aria-label="Editar pedido ${pedido.id}"><i class="far fa-pen-to-square" aria-hidden="true"></i></button>
                ${deleteBtn}
            </td>
        </tr>`;
}

// ─── Mobile card template ─────────────────────────────────────────────────────

function crearCardMobile(pedido, isAdmin) {
    const urgency = getUrgencyLevel(pedido);
    const urgencyBar = urgency !== 'none' ? `urgency-bar-${urgency}` : '';
    const diasBadge = getDiasBadgeHTML(pedido);
    const canalIcon = getCanalIcon(pedido.canal);
    const fechaStr = pedido.fecha_pago ? formatearFechaCorta(pedido.fecha_pago) : '';

    return `
        <div class="pedido-card ${urgencyBar}" data-pedido-id="${pedido.id}">
            <div class="pedido-card-header">
                <div class="pedido-card-id">
                    <strong>#${pedido.id}</strong>
                    <span class="pedido-card-meta">${canalIcon} ${fechaStr}</span>
                </div>
                <div class="pedido-card-actions">
                    <button class="btn-icon btn-info btn-sm" data-action="view" data-id="${pedido.id}" aria-label="Ver pedido"><i class="far fa-eye"></i></button>
                    <button class="btn-icon btn-warning btn-sm" data-action="edit" data-id="${pedido.id}" aria-label="Editar pedido"><i class="far fa-pen-to-square"></i></button>
                </div>
            </div>
            <div class="pedido-card-body">
                <div class="pedido-card-cliente">
                    <button class="btn-cliente-link" data-action="verClientePerfil" data-telefono="${pedido.telefono || ''}">${pedido.cliente || '—'}</button>
                </div>
                <div class="pedido-card-producto">${pedido.producto || '—'}${pedido.color ? ' · ' + pedido.color : ''} <span class="badge badge-secondary">${pedido.talla || ''}</span></div>
            </div>
            <div class="pedido-card-footer">
                <button class="estado-badge-btn" data-action="toggleEstado" data-id="${pedido.id}" title="Click para cambiar estado">
                    ${getEstadoBadge(pedido.estatus_produccion)}
                </button>
                ${diasBadge}
                <strong class="pedido-card-total">${formatearMoneda(pedido.precio_total)}</strong>
            </div>
        </div>`;
}

// ─── Estado Popover — Portal Architecture ────────────────────────────────────
//
// ROOT CAUSE FIX:
//   Bug 1: --surface-elevated was undefined → transparent background fixed in tokens.css
//   Bug 2: position:fixed offsets must NOT add scrollX/scrollY — they are viewport-relative
//   Bug 3: popover lived inside the table DOM → ancestor stacking context could clip it
//
// SOLUTION:
//   1. Portal: move popover to document.body on first open (never inside table ancestor)
//   2. Pure viewport math: use getBoundingClientRect() directly without scroll offset
//   3. Edge detection: flip to open upward or left if near viewport boundary
//   4. Auto-close on scroll + resize to avoid orphaned popovers

let _popoverPortalMounted = false;

function _getOrCreatePopover() {
    let popover = document.getElementById('estadoPopover');
    if (!popover) return null;

    // Mount to body exactly once (portal pattern)
    if (!_popoverPortalMounted || popover.parentElement !== document.body) {
        document.body.appendChild(popover);
        _popoverPortalMounted = true;
    }
    return popover;
}

function toggleEstadoPopover(pedidoId, triggerEl) {
    const popover = _getOrCreatePopover();
    if (!popover) return;

    // Toggle closed if same trigger clicked again
    if (_popoverPedidoId === pedidoId && popover.classList.contains('popover-visible')) {
        cerrarEstadoPopover();
        return;
    }

    _popoverPedidoId = pedidoId;

    // Mark current state option
    const pedido = pedidosCache.find(p => String(p.id) === String(pedidoId));
    popover.querySelectorAll('.estado-popover-opt').forEach(btn => {
        btn.classList.toggle('current', btn.dataset.estadoVal === (pedido?.estatus_produccion || ''));
    });

    // Show offscreen first to measure dimensions correctly
    popover.style.visibility = 'hidden';
    popover.style.display = 'block';
    popover.classList.remove('popover-visible');

    const triggerRect = triggerEl.getBoundingClientRect();
    const popW = popover.offsetWidth || 210;
    const popH = popover.offsetHeight || 240;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 6;

    // X: align left edge with trigger, flip left if overflows right
    let x = triggerRect.left;
    if (x + popW > vw - 12) {
        x = triggerRect.right - popW;
    }
    x = Math.max(12, x); // never off left edge

    // Y: open below trigger by default, flip upward if insufficient space below
    let y = triggerRect.bottom + GAP;
    if (y + popH > vh - 12) {
        y = triggerRect.top - popH - GAP;
    }
    y = Math.max(12, y);

    // Apply position (position:fixed — viewport relative, NO scrollX/Y addition)
    popover.style.left = x + 'px';
    popover.style.top = y + 'px';
    popover.style.visibility = '';

    // Trigger animation via class (reliable vs display toggle)
    requestAnimationFrame(() => {
        popover.classList.add('popover-visible');
    });
}

function cerrarEstadoPopover() {
    const popover = document.getElementById('estadoPopover');
    if (!popover) return;
    popover.classList.remove('popover-visible');
    // Allow animation to complete before hiding
    popover.addEventListener('transitionend', function onEnd() {
        if (!popover.classList.contains('popover-visible')) {
            popover.style.display = 'none';
        }
        popover.removeEventListener('transitionend', onEnd);
    }, { once: true });
    _popoverPedidoId = null;
}

async function actualizarEstadoInline(pedidoId, nuevoEstado) {
    cerrarEstadoPopover();
    try {
        const res = await api.updatePedido(pedidoId, { estatus_produccion: nuevoEstado });
        if (res && res.success) {
            // Optimistic update of cache
            const p = pedidosCache.find(x => String(x.id) === String(pedidoId));
            if (p) p.estatus_produccion = nuevoEstado;

            // Update just the badge in the DOM (no full reload)
            document.querySelectorAll(`[data-pedido-id="${pedidoId}"] .estado-badge-btn`).forEach(btn => {
                btn.innerHTML = getEstadoBadge(nuevoEstado);
            });

            // Refresh context bar counts
            cargarResumenOperativo();

            if (typeof showNotification === 'function')
                showNotification(`Pedido ${pedidoId} → <strong>${nuevoEstado}</strong>`, 'success', 3000);
        } else {
            if (typeof showNotification === 'function') showNotification(res?.error || 'Error al actualizar', 'error');
        }
    } catch (e) {
        if (typeof showNotification === 'function') showNotification(e.message, 'error');
    }
}

// Auto-close popover on scroll or resize (avoids orphaned UI)
window.addEventListener('scroll', () => { if (_popoverPedidoId) cerrarEstadoPopover(); }, { passive: true, capture: true });
window.addEventListener('resize', () => { if (_popoverPedidoId) cerrarEstadoPopover(); }, { passive: true });



// ─── Date formatting helper ───────────────────────────────────────────────────

function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return '';
    try {
        // Split to avoid UTC timezone shifting: "2026-02-15" → [2026, 2, 15]
        const parts = String(fechaStr).split('T')[0].split('-');
        if (parts.length < 3) return '';
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short' });
    } catch { return ''; }
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function renderPagination(total, pages, page) {
    const container = document.getElementById('paginationControls');
    if (!container) return;
    if (pages <= 1) { container.innerHTML = ''; return; }

    let html = `<button class="pagination-btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Página anterior"><i class="fas fa-chevron-left"></i></button>`;
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(pages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

    if (startPage > 1) { html += `<button class="pagination-btn" data-page="1">1</button>`; if (startPage > 2) html += `<span class="pagination-info">...</span>`; }
    for (let i = startPage; i <= endPage; i++) html += `<button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    if (endPage < pages) { if (endPage < pages - 1) html += `<span class="pagination-info">...</span>`; html += `<button class="pagination-btn" data-page="${pages}">${pages}</button>`; }

    html += `<button class="pagination-btn" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="Página siguiente"><i class="fas fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

function goToPage(page) {
    cargarPedidos(page);
    const table = document.querySelector('.table-container');
    if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Bulk selection ───────────────────────────────────────────────────────────

function updateBulkSelection() {
    const checkboxes = document.querySelectorAll('#tabla-pedidos tbody .order-checkbox');
    const selectAll = document.getElementById('select-all-checkbox');
    const checked = document.querySelectorAll('#tabla-pedidos tbody .order-checkbox:checked');
    const count = checked.length;
    if (selectAll) selectAll.checked = checkboxes.length > 0 && count === checkboxes.length;

    const bar = document.getElementById('bulkActionBar');
    const countEl = document.getElementById('bulkCount');
    if (bar) bar.style.display = count > 0 ? 'flex' : 'none';
    if (countEl) countEl.textContent = `${count} seleccionado${count !== 1 ? 's' : ''}`;
}

function toggleSelectAll() {
    const selectAll = document.getElementById('select-all-checkbox');
    document.querySelectorAll('#tabla-pedidos tbody .order-checkbox').forEach(cb => cb.checked = selectAll.checked);
    updateBulkSelection();
}

// ─── Row highlight ────────────────────────────────────────────────────────────

function highlightPedidoRow(pedidoId) {
    setTimeout(() => {
        document.querySelectorAll(`[data-pedido-id="${pedidoId}"]`).forEach(el => {
            el.style.transition = 'background .3s var(--ease-spring)';
            el.style.background = 'var(--success-soft)';
            setTimeout(() => { el.style.background = ''; }, 2500);
        });
    }, 150);
}

// ─── Modal delegates ──────────────────────────────────────────────────────────

function verPedido(id) { if (typeof abrirDetallesPedido === 'function') abrirDetallesPedido(id); }
function verClientePerfil(telefono) { if (typeof abrirPerfilCliente === 'function') abrirPerfilCliente(telefono); }
function editarPedido(id) { if (typeof abrirEdicionPedido === 'function') abrirEdicionPedido(id); }

async function eliminarPedido(id) {
    if (typeof abrirEliminarPedido === 'function') {
        abrirEliminarPedido(id);
    } else if (typeof showConfirm === 'function') {
        const ok = await showConfirm({ title: 'Eliminar pedido', message: 'Se eliminará el pedido ' + id + ' permanentemente.', confirmText: 'Eliminar', type: 'danger' });
        if (!ok) return;
        ejecutarEliminarConUndo(id);
    }
}

function ejecutarEliminarConUndo(id) {
    const newTotal = Math.max(0, totalPedidos - 1);
    const newPages = Math.max(1, Math.ceil(newTotal / perPage));
    pedidosCache = pedidosCache.filter(p => p.id !== id);
    renderizarTablaPedidos({ pedidos: pedidosCache, total: newTotal, page: currentPage, pages: newPages });

    if (_undoTimer) clearTimeout(_undoTimer.timer);

    showUndoNotification(`Pedido ${id} eliminado`, async () => {
        cargarPedidos(currentPage);
        _undoTimer = null;
    }, async () => {
        try {
            await api.deletePedido(id);
            totalPedidos = newTotal;
            totalPages = newPages;
        } catch (e) {
            cargarPedidos(currentPage);
            if (typeof showNotification === 'function') showNotification('Error al eliminar: ' + e.message, 'error');
        }
        _undoTimer = null;
    });
}

function showUndoNotification(message, onUndo, onCommit, duration = 5000) {
    let container = document.querySelector('.toast-container');
    if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }

    const toast = document.createElement('div');
    toast.className = 'toast warning';
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <i class="fas fa-trash-can toast-icon" aria-hidden="true"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-undo-btn" aria-label="Deshacer">Deshacer</button>
        <button class="toast-dismiss" aria-label="Cerrar"><i class="fas fa-xmark" aria-hidden="true"></i></button>
        <div class="toast-progress" style="animation-duration:${duration}ms"></div>`;
    container.appendChild(toast);

    let undone = false;
    const dismiss = () => { toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 300); };

    toast.querySelector('.toast-undo-btn').addEventListener('click', () => {
        undone = true; clearTimeout(timer); onUndo(); dismiss();
        if (typeof showNotification === 'function') showNotification('Acción deshecha', 'success', 2000);
    });
    toast.querySelector('.toast-dismiss').addEventListener('click', () => { if (!undone) { clearTimeout(timer); onCommit(); } dismiss(); });

    const timer = setTimeout(() => { if (!undone) onCommit(); dismiss(); }, duration);
    _undoTimer = { timer };
}

function aplicarFiltros() { cargarPedidos(1); }

// ─── Event listeners ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

    // Search
    const searchInput = document.getElementById('searchPedidos');
    if (searchInput) searchInput.addEventListener('input', debounce(aplicarFiltros, 300));

    // Canal filter
    const filterCanal = document.getElementById('filterCanal');
    if (filterCanal) filterCanal.addEventListener('change', aplicarFiltros);

    // Pill tabs — state filter
    document.querySelectorAll('.estado-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.estado-pill').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            currentFilters.estado = btn.dataset.estado || '';
            cargarPedidos(1);
        });
    });

    // Context bar KPI click — jump to filter
    document.querySelectorAll('.context-kpi-card').forEach(card => {
        card.addEventListener('click', () => {
            const urgencia = card.dataset.urgencia;
            // Map urgencia to an estado filter
            const map = {
                'activos': '',         // show all non-terminal (rely on pill "Todos" then sort)
                'listos': 'Listo para Envío',
                'atrasados': '',       // custom: set q to flag; handled below
                'sin-cobrar': '',      // no direct estado filter, just reload
            };
            // For now set state filter to matching pill
            if (urgencia === 'listos') {
                const pill = document.querySelector('.estado-pill[data-estado="Listo para Envío"]');
                if (pill) pill.click();
            } else if (urgencia === 'atrasados') {
                // Filter "Todos" but indicate atrasados context
                const pill = document.querySelector('.estado-pill[data-estado=""]');
                if (pill) pill.click();
                if (typeof showNotification === 'function')
                    showNotification('Mostrando todos los pedidos — ordena por urgencia con el punto rojo', 'info', 3000);
            } else {
                const pill = document.querySelector('.estado-pill[data-estado=""]');
                if (pill) pill.click();
            }
        });
    });

    // Per-page selector
    const perPageSelect = document.getElementById('perPageSelect');
    if (perPageSelect) {
        perPageSelect.addEventListener('change', () => {
            perPage = parseInt(perPageSelect.value) || 25;
            cargarPedidos(1);
        });
    }

    // Bulk actions
    const btnBulkApply = document.getElementById('btnBulkApply');
    const btnBulkDeselect = document.getElementById('btnBulkDeselect');

    if (btnBulkApply) {
        btnBulkApply.addEventListener('click', async () => {
            const estado = document.getElementById('bulkEstadoSelect')?.value;
            if (!estado) { if (typeof showNotification === 'function') showNotification('Selecciona un estado', 'warning'); return; }
            const checked = document.querySelectorAll('#tabla-pedidos tbody .order-checkbox:checked');
            const ids = Array.from(checked).map(cb => cb.value);
            if (!ids.length) return;

            const ok = await showConfirm({ title: 'Cambio masivo', message: `¿Cambiar ${ids.length} pedido${ids.length !== 1 ? 's' : ''} a "${estado}"?`, confirmText: 'Aplicar', type: 'warning' });
            if (!ok) return;

            try {
                const res = await api.bulkUpdateEstado(ids, estado);
                if (res && res.success) {
                    const idsTexto = ids.length <= 6 ? ids.join(', ') : ids.slice(0, 5).join(', ') + ` +${ids.length - 5} más`;
                    if (typeof showNotification === 'function')
                        showNotification(`${res.updated} pedido${res.updated !== 1 ? 's' : ''} → <strong>${estado}</strong><br><small style="opacity:.8">${idsTexto}</small>`, 'success', 5000);
                    document.getElementById('bulkEstadoSelect').value = '';
                    document.querySelectorAll('#tabla-pedidos .order-checkbox').forEach(cb => { cb.checked = false; });
                    updateBulkSelection();
                    cargarPedidos(currentPage);
                    cargarResumenOperativo();
                } else {
                    if (typeof showNotification === 'function') showNotification(res?.error || 'Error al actualizar', 'error');
                }
            } catch (e) {
                if (typeof showNotification === 'function') showNotification(e.message, 'error');
            }
        });
    }

    if (btnBulkDeselect) {
        btnBulkDeselect.addEventListener('click', () => {
            document.querySelectorAll('#tabla-pedidos .order-checkbox').forEach(cb => { cb.checked = false; });
            updateBulkSelection();
        });
    }

    // Pagination
    const paginationContainer = document.getElementById('paginationControls');
    if (paginationContainer) {
        paginationContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-page]');
            if (!btn || btn.disabled) return;
            goToPage(parseInt(btn.dataset.page));
        });
    }

    // Estado popover — options click
    const popover = document.getElementById('estadoPopover');
    if (popover) {
        popover.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-estado-val]');
            if (!btn || !_popoverPedidoId) return;
            actualizarEstadoInline(_popoverPedidoId, btn.dataset.estadoVal);
        });
    }

    // Close popover on outside click or Escape
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#estadoPopover') && !e.target.closest('[data-action="toggleEstado"]')) {
            cerrarEstadoPopover();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarEstadoPopover();
    });

    // Table event delegation
    const tabla = document.querySelector('#tabla-pedidos');
    if (tabla) {
        tabla.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            e.stopPropagation();
            if (action === 'view') verPedido(id);
            else if (action === 'edit') editarPedido(id);
            else if (action === 'delete') eliminarPedido(id);
            else if (action === 'verClientePerfil') verClientePerfil(btn.dataset.telefono);
            else if (action === 'toggleEstado') toggleEstadoPopover(id, btn);
        });

        tabla.addEventListener('change', (e) => {
            if (e.target.classList.contains('order-checkbox')) updateBulkSelection();
        });

        tabla.addEventListener('keydown', (e) => {
            const row = e.target.closest('tr[data-pedido-id]');
            if (!row) return;
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); verPedido(row.dataset.pedidoId); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); const next = row.nextElementSibling; if (next?.dataset.pedidoId) next.focus(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); const prev = row.previousElementSibling; if (prev?.dataset.pedidoId) prev.focus(); }
        });
    }

    // Mobile cards event delegation
    const mobileContainer = document.getElementById('pedidoCardsMobile');
    if (mobileContainer) {
        mobileContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            e.stopPropagation();
            if (action === 'view') verPedido(id);
            else if (action === 'edit') editarPedido(id);
            else if (action === 'verClientePerfil') verClientePerfil(btn.dataset.telefono);
            else if (action === 'toggleEstado') toggleEstadoPopover(id, btn);
        });
    }
});
