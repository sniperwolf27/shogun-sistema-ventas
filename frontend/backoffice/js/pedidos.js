/**
 * PEDIDOS MODULE
 * Apple HIG: skeleton loading, pagination, keyboard nav, event delegation
 */

let pedidosCache = [];
let currentPage = 1;
let perPage = 25;
let totalPedidos = 0;
let totalPages = 1;
let currentFilters = { q: '', estado: '', canal: '' };
let _undoTimer = null;

// Contextual empty state SVGs for the pedidos table
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

function showTableSkeleton() {
    const tbody = document.querySelector('#tabla-pedidos tbody');
    if (!tbody) return;
    tbody.innerHTML = Array.from({ length: 6 }, () => `
        <tr class="table-skeleton-row">
            <td><div class="skeleton skeleton-cb"></div></td>
            <td><div class="skeleton skeleton-sm"></div></td>
            <td><div class="skeleton skeleton-md"></div></td>
            <td><div class="skeleton skeleton-lg"></div></td>
            <td><div class="skeleton skeleton-sm"></div></td>
            <td><div class="skeleton skeleton-badge"></div></td>
            <td><div class="skeleton skeleton-sm"></div></td>
        </tr>
    `).join('');
}

async function cargarPedidos(page = 1) {
    currentPage = page;
    // Sync filters from DOM so callers don't need to pass them
    currentFilters.q = (document.getElementById('searchPedidos')?.value || '').trim();
    currentFilters.estado = document.getElementById('filterEstado')?.value || '';
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
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="table-empty-cell">
            <div class="empty-state empty-state-error">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="20" stroke="var(--danger)" stroke-width="2" fill="none" opacity="0.5"/><path d="M40 30v14" stroke="var(--danger)" stroke-width="2.5" stroke-linecap="round"/><circle cx="40" cy="50" r="2" fill="var(--danger)"/></svg>
                <h3>Error al cargar pedidos</h3>
                <p>Intenta recargar la página</p>
            </div>
        </td></tr>`;
    }
}

function renderizarTablaPedidos(data) {
    const tbody = document.querySelector('#tabla-pedidos tbody');
    if (!tbody) return;

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
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty-cell">
            <div class="empty-state">${svg}<h3>${msg}</h3><p>${sub}</p></div>
        </td></tr>`;
        renderPagination(0, 1, 1);
        return;
    }

    const isAdmin = Auth.isAdmin();
    tbody.innerHTML = pedidos.map(p => crearFilaPedido(p, isAdmin)).join('');

    // M5: Resaltar visualmente filas del mismo grupo
    const grupoCount = {};
    pedidos.forEach(p => { if (p.grupo_pedido) grupoCount[p.grupo_pedido] = (grupoCount[p.grupo_pedido] || 0) + 1; });
    tbody.querySelectorAll('tr[data-pedido-id]').forEach(row => {
        const id = row.dataset.pedidoId;
        const pedido = pedidos.find(p => String(p.id) === String(id));
        if (pedido && pedido.grupo_pedido && grupoCount[pedido.grupo_pedido] > 1) {
            row.classList.add('grupo-row');
        }
    });

    renderPagination(total, pages, page);
}

function renderPagination(total, pages, page) {
    const container = document.getElementById('paginationControls');
    if (!container) return;

    if (pages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Prev button
    html += `<button class="pagination-btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Página anterior">
        <i class="fas fa-chevron-left"></i>
    </button>`;

    // Page numbers — show max 5 around current
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(pages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        html += `<button class="pagination-btn" data-page="1">1</button>`;
        if (startPage > 2) html += `<span class="pagination-info">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    if (endPage < pages) {
        if (endPage < pages - 1) html += `<span class="pagination-info">...</span>`;
        html += `<button class="pagination-btn" data-page="${pages}">${pages}</button>`;
    }

    // Next button
    html += `<button class="pagination-btn" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="Página siguiente">
        <i class="fas fa-chevron-right"></i>
    </button>`;

    container.innerHTML = html;
}

function goToPage(page) {
    cargarPedidos(page);
    const table = document.querySelector('.table-container');
    if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function crearFilaPedido(pedido, isAdmin) {
    const alerta = (!pedido.direccion || pedido.direccion === 'Pendiente') ? 'row-alert' : '';
    const deleteBtn = isAdmin
        ? `<button class="btn-icon btn-danger" data-action="delete" data-id="${pedido.id}" title="Eliminar pedido" aria-label="Eliminar pedido ${pedido.id}"><i class="far fa-trash-can" aria-hidden="true"></i></button>`
        : '';
    const grupoIcon = pedido.grupo_pedido
        ? `<span class="grupo-badge" title="Grupo: ${pedido.grupo_pedido}"><i class="fas fa-layer-group"></i></span> `
        : '';

    return `
        <tr class="${alerta}" data-pedido-id="${pedido.id}" tabindex="0">
            <td data-label="">
                <label class="checkbox-touch-target"><input type="checkbox" class="order-checkbox" value="${pedido.id}"></label>
            </td>
            <td data-label="ID"><strong>${pedido.id}</strong></td>
            <td data-label="Cliente"><button class="btn-cliente-link" data-action="verClientePerfil" data-telefono="${pedido.telefono || ''}" title="Ver perfil del cliente">${pedido.cliente || ''}</button></td>
            <td data-label="Producto">${grupoIcon}${pedido.producto || ''}${pedido.color ? ' · ' + pedido.color : ''}<br><span class="badge badge-secondary">${pedido.talla || ''}</span></td>
            <td data-label="Total"><strong>${formatearMoneda(pedido.precio_total)}</strong></td>
            <td data-label="Estado">${getEstadoBadge(pedido.estatus_produccion)}</td>
            <td class="actions td-actions">
                <button class="btn-icon btn-info" data-action="view" data-id="${pedido.id}" title="Ver pedido" aria-label="Ver pedido ${pedido.id}"><i class="far fa-eye" aria-hidden="true"></i></button>
                <button class="btn-icon btn-warning" data-action="edit" data-id="${pedido.id}" title="Editar pedido" aria-label="Editar pedido ${pedido.id}"><i class="far fa-pen-to-square" aria-hidden="true"></i></button>
                ${deleteBtn}
            </td>
        </tr>`;
}

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
    const checkboxes = document.querySelectorAll('#tabla-pedidos tbody .order-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
}

function highlightPedidoRow(pedidoId) {
    setTimeout(() => {
        const row = document.querySelector(`tr[data-pedido-id="${pedidoId}"]`);
        if (row) {
            row.style.transition = 'background .3s var(--ease-spring)';
            row.style.background = 'var(--success-soft)';
            setTimeout(() => { row.style.background = ''; }, 2500);
        }
    }, 150);
}

function verPedido(id) {
    if (typeof abrirDetallesPedido === 'function') abrirDetallesPedido(id);
}

function verClientePerfil(telefono) {
    if (typeof abrirPerfilCliente === 'function') abrirPerfilCliente(telefono);
}

function editarPedido(id) {
    if (typeof abrirEdicionPedido === 'function') abrirEdicionPedido(id);
}

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
    // Optimistic removal from current page
    const pedido = pedidosCache.find(p => p.id === id);
    pedidosCache = pedidosCache.filter(p => p.id !== id);
    const newTotal = Math.max(0, totalPedidos - 1);
    const newPages = Math.max(1, Math.ceil(newTotal / perPage));
    renderizarTablaPedidos({ pedidos: pedidosCache, total: newTotal, page: currentPage, pages: newPages });

    // Cancel any previous undo timer
    if (_undoTimer) { clearTimeout(_undoTimer.timer); }

    // Show undo toast
    showUndoNotification(`Pedido ${id} eliminado`, async () => {
        // Undo: reload current page from server
        cargarPedidos(currentPage);
        _undoTimer = null;
    }, async () => {
        // Commit: actually delete on server after timeout
        try {
            await api.deletePedido(id);
            totalPedidos = newTotal;
            totalPages = newPages;
        } catch (e) {
            // Restore on server delete failure
            cargarPedidos(currentPage);
            if (typeof showNotification === 'function') showNotification('Error al eliminar: ' + e.message, 'error');
        }
        _undoTimer = null;
    });
}

function showUndoNotification(message, onUndo, onCommit, duration = 5000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

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
    const dismiss = () => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-undo-btn').addEventListener('click', () => {
        undone = true;
        clearTimeout(timer);
        onUndo();
        dismiss();
        if (typeof showNotification === 'function') showNotification('Acción deshecha', 'success', 2000);
    });

    toast.querySelector('.toast-dismiss').addEventListener('click', () => {
        if (!undone) { clearTimeout(timer); onCommit(); }
        dismiss();
    });

    const timer = setTimeout(() => {
        if (!undone) onCommit();
        dismiss();
    }, duration);

    _undoTimer = { timer };
}

function aplicarFiltros() {
    cargarPedidos(1);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchPedidos');
    if (searchInput) searchInput.addEventListener('input', debounce(aplicarFiltros, 300));

    const filterEstado = document.getElementById('filterEstado');
    if (filterEstado) filterEstado.addEventListener('change', aplicarFiltros);

    const filterCanal = document.getElementById('filterCanal');
    if (filterCanal) filterCanal.addEventListener('change', aplicarFiltros);

    // Per-page selector
    const perPageSelect = document.getElementById('perPageSelect');
    if (perPageSelect) {
        perPageSelect.addEventListener('change', () => {
            perPage = parseInt(perPageSelect.value) || 25;
            cargarPedidos(1);
        });
    }

    // Bulk action buttons
    const btnBulkApply = document.getElementById('btnBulkApply');
    const btnBulkDeselect = document.getElementById('btnBulkDeselect');

    if (btnBulkApply) {
        btnBulkApply.addEventListener('click', async () => {
            const estado = document.getElementById('bulkEstadoSelect')?.value;
            if (!estado) {
                if (typeof showNotification === 'function') showNotification('Selecciona un estado', 'warning');
                return;
            }
            const checked = document.querySelectorAll('#tabla-pedidos tbody .order-checkbox:checked');
            const ids = Array.from(checked).map(cb => cb.value);
            if (!ids.length) return;

            const ok = await showConfirm({
                title: 'Cambio masivo',
                message: `¿Cambiar ${ids.length} pedido${ids.length !== 1 ? 's' : ''} a "${estado}"?`,
                confirmText: 'Aplicar',
                type: 'warning'
            });
            if (!ok) return;

            try {
                const res = await api.bulkUpdateEstado(ids, estado);
                if (res && res.success) {
                    // M9: Feedback enriquecido con lista de IDs afectados
                    const idsTexto = ids.length <= 6
                        ? ids.join(', ')
                        : ids.slice(0, 5).join(', ') + ` +${ids.length - 5} más`;
                    if (typeof showNotification === 'function')
                        showNotification(
                            `${res.updated} pedido${res.updated !== 1 ? 's' : ''} → <strong>${estado}</strong><br><small style="opacity:.8">${idsTexto}</small>`,
                            'success',
                            5000
                        );
                    document.getElementById('bulkEstadoSelect').value = '';
                    document.querySelectorAll('#tabla-pedidos .order-checkbox').forEach(cb => { cb.checked = false; });
                    updateBulkSelection();
                    cargarPedidos(currentPage);
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

    // Pagination click delegation
    const paginationContainer = document.getElementById('paginationControls');
    if (paginationContainer) {
        paginationContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-page]');
            if (!btn || btn.disabled) return;
            goToPage(parseInt(btn.dataset.page));
        });
    }

    // Event delegation for table actions (Apple HIG: no inline onclick)
    const tabla = document.querySelector('#tabla-pedidos');
    if (tabla) {
        tabla.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (action === 'view') verPedido(id);
            else if (action === 'edit') editarPedido(id);
            else if (action === 'delete') eliminarPedido(id);
            else if (action === 'verClientePerfil') verClientePerfil(btn.dataset.telefono);
        });

        // Checkbox delegation
        tabla.addEventListener('change', (e) => {
            if (e.target.classList.contains('order-checkbox')) updateBulkSelection();
        });

        // Keyboard navigation for table rows
        tabla.addEventListener('keydown', (e) => {
            const row = e.target.closest('tr[data-pedido-id]');
            if (!row) return;

            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const id = row.dataset.pedidoId;
                verPedido(id);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = row.nextElementSibling;
                if (next && next.dataset.pedidoId) next.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = row.previousElementSibling;
                if (prev && prev.dataset.pedidoId) prev.focus();
            }
        });
    }
});
