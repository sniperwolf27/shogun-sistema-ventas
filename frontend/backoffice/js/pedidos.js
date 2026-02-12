/**
 * PEDIDOS MODULE
 */

let pedidosCache = [];

async function cargarPedidos() {
    try {
        showLoading(true);
        const pedidos = await api.getPedidos();
        pedidosCache = pedidos || [];
        renderizarTablaPedidos(pedidosCache);
        showLoading(false);
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        if (typeof showNotification === 'function') showNotification('Error al cargar pedidos', 'error');
        showLoading(false);
    }
}

function renderizarTablaPedidos(pedidos) {
    const tbody = document.querySelector('#tabla-pedidos tbody');
    if (!tbody) return;

    if (!pedidos || !pedidos.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;"><i class="fas fa-inbox" style="font-size:3em;display:block;margin-bottom:12px;"></i>No hay pedidos para mostrar</td></tr>';
        return;
    }

    const isAdmin = Auth.isAdmin();
    tbody.innerHTML = pedidos.map(p => crearFilaPedido(p, isAdmin)).join('');
}

function crearFilaPedido(pedido, isAdmin) {
    const alerta = (!pedido.direccion || pedido.direccion === 'Pendiente') ? 'row-alert' : '';
    const deleteBtn = isAdmin
        ? `<button class="btn-icon btn-danger" onclick="eliminarPedido('${pedido.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>`
        : '';

    return `
        <tr class="${alerta}" data-pedido-id="${pedido.id}">
            <td data-label="ID"><strong>${pedido.id}</strong></td>
            <td data-label="Cliente">${pedido.cliente || ''}</td>
            <td data-label="Producto">${pedido.producto || ''}${pedido.color ? ' · ' + pedido.color : ''}<br><small style="color:#666;">Talla: ${pedido.talla || ''}</small></td>
            <td data-label="Total"><strong>${formatearMoneda(pedido.precio_total)}</strong></td>
            <td data-label="Estado">${getEstadoBadge(pedido.estatus_produccion)}</td>
            <td class="actions td-actions">
                <button class="btn-icon btn-info" onclick="verPedido('${pedido.id}')" title="Ver"><i class="fas fa-eye"></i></button>
                <button class="btn-icon btn-warning" onclick="editarPedido('${pedido.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                ${deleteBtn}
            </td>
        </tr>`;
}

/**
 * Highlight a row briefly after update
 */
function highlightPedidoRow(pedidoId) {
    setTimeout(() => {
        const row = document.querySelector(`tr[data-pedido-id="${pedidoId}"]`);
        if (row) {
            row.style.transition = 'background .3s ease';
            row.style.background = '#d4edda';
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
    } else if (confirm('¿Eliminar pedido ' + id + '?')) {
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
});
