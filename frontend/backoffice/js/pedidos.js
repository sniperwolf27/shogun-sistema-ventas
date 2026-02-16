/**
 * PEDIDOS MODULE
 * Apple HIG: skeleton loading, proper checkbox, CSS variables for colors
 */

let pedidosCache = [];

function showTableSkeleton() {
    const tbody = document.querySelector('#tabla-pedidos tbody');
    if (!tbody) return;
    tbody.innerHTML = Array.from({ length: 6 }, () => `
        <tr>
            <td><div class="skeleton" style="width:16px;height:16px;border-radius:3px;"></div></td>
            <td><div class="skeleton" style="width:60%;"></div></td>
            <td><div class="skeleton" style="width:80%;"></div></td>
            <td><div class="skeleton" style="width:70%;"></div></td>
            <td><div class="skeleton" style="width:50%;"></div></td>
            <td><div class="skeleton" style="width:80px;height:22px;border-radius:9999px;"></div></td>
            <td><div class="skeleton" style="width:60px;"></div></td>
        </tr>
    `).join('');
}

async function cargarPedidos() {
    try {
        showTableSkeleton();
        const pedidos = await api.getPedidos();
        pedidosCache = pedidos || [];
        renderizarTablaPedidos(pedidosCache);
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        if (typeof showNotification === 'function') showNotification('Error al cargar pedidos', 'error');
        const tbody = document.querySelector('#tabla-pedidos tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-tertiary);">Error al cargar pedidos</td></tr>';
    }
}

function renderizarTablaPedidos(pedidos) {
    const tbody = document.querySelector('#tabla-pedidos tbody');
    if (!tbody) return;

    if (!pedidos || !pedidos.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-tertiary);"><i class="far fa-inbox" style="font-size:3em;display:block;margin-bottom:12px;"></i>No hay pedidos para mostrar</td></tr>';
        return;
    }

    const isAdmin = Auth.isAdmin();
    tbody.innerHTML = pedidos.map(p => crearFilaPedido(p, isAdmin)).join('');
}

function crearFilaPedido(pedido, isAdmin) {
    const alerta = (!pedido.direccion || pedido.direccion === 'Pendiente') ? 'row-alert' : '';
    const deleteBtn = isAdmin
        ? `<button class="btn-icon btn-danger" data-action="delete" data-id="${pedido.id}" title="Eliminar"><i class="far fa-trash-can" aria-hidden="true"></i></button>`
        : '';

    return `
        <tr class="${alerta}" data-pedido-id="${pedido.id}">
            <td data-label="">
                <input type="checkbox" class="order-checkbox" value="${pedido.id}">
            </td>
            <td data-label="ID"><strong>${pedido.id}</strong></td>
            <td data-label="Cliente">${pedido.cliente || ''}</td>
            <td data-label="Producto">${pedido.producto || ''}${pedido.color ? ' · ' + pedido.color : ''}<br><span class="badge badge-secondary">${pedido.talla || ''}</span></td>
            <td data-label="Total"><strong>${formatearMoneda(pedido.precio_total)}</strong></td>
            <td data-label="Estado">${getEstadoBadge(pedido.estatus_produccion)}</td>
            <td class="actions td-actions">
                <button class="btn-icon btn-info" data-action="view" data-id="${pedido.id}" title="Ver"><i class="far fa-eye" aria-hidden="true"></i></button>
                <button class="btn-icon btn-warning" data-action="edit" data-id="${pedido.id}" title="Editar"><i class="far fa-pen-to-square" aria-hidden="true"></i></button>
                ${deleteBtn}
            </td>
        </tr>`;
}

function updateBulkSelection() {
    const checkboxes = document.querySelectorAll('#tabla-pedidos tbody .order-checkbox');
    const selectAll = document.getElementById('select-all-checkbox');
    const checked = document.querySelectorAll('#tabla-pedidos tbody .order-checkbox:checked');
    if (selectAll) selectAll.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
}

function toggleSelectAll() {
    const selectAll = document.getElementById('select-all-checkbox');
    const checkboxes = document.querySelectorAll('#tabla-pedidos tbody .order-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
}

/**
 * Highlight a row briefly after update
 */
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

function editarPedido(id) {
    if (typeof abrirEdicionPedido === 'function') abrirEdicionPedido(id);
}

async function eliminarPedido(id) {
    if (typeof abrirEliminarPedido === 'function') {
        abrirEliminarPedido(id);
    } else if (typeof showConfirm === 'function') {
        const ok = await showConfirm({ title: 'Eliminar pedido', message: 'Se eliminara el pedido ' + id + ' permanentemente.', confirmText: 'Eliminar', type: 'danger' });
        if (!ok) return;
        try {
            await api.deletePedido(id);
            if (typeof showNotification === 'function') showNotification('Pedido eliminado', 'success');
            await cargarPedidos();
        } catch (e) {
            if (typeof showNotification === 'function') showNotification(e.message, 'error');
        }
    }
}

function aplicarFiltros() {
    const search = (document.getElementById('searchPedidos')?.value || '').toLowerCase().trim();
    const estado = document.getElementById('filterEstado')?.value || '';
    const canal = document.getElementById('filterCanal')?.value || '';

    let resultados = [...pedidosCache];

    if (search) {
        resultados = resultados.filter(p =>
            (p.id || '').toLowerCase().includes(search) ||
            (p.cliente || '').toLowerCase().includes(search) ||
            (p.producto || '').toLowerCase().includes(search) ||
            (p.telefono || '').includes(search)
        );
    }
    if (estado) resultados = resultados.filter(p => p.estatus_produccion === estado);
    if (canal) resultados = resultados.filter(p => p.canal === canal);

    renderizarTablaPedidos(resultados);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchPedidos');
    if (searchInput) searchInput.addEventListener('input', debounce(aplicarFiltros, 300));

    const filterEstado = document.getElementById('filterEstado');
    if (filterEstado) filterEstado.addEventListener('change', aplicarFiltros);

    const filterCanal = document.getElementById('filterCanal');
    if (filterCanal) filterCanal.addEventListener('change', aplicarFiltros);

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
        });

        // Checkbox delegation
        tabla.addEventListener('change', (e) => {
            if (e.target.classList.contains('order-checkbox')) updateBulkSelection();
        });
    }
});
