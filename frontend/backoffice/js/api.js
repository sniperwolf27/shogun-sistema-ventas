/**
 * API MODULE
 */

const api = {

    async request(endpoint, options = {}) {
        const token = Auth.getToken();
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const response = await fetch(API_BASE + endpoint, { ...options, headers });

        if (response.status === 401) {
            Auth.clearSession();
            window.location.href = '/login';
            return null;
        }
        if (response.status === 403) {
            const data = await response.json();
            throw new Error(data.error || 'Sin permisos');
        }

        return response.json();
    },

    // --- Pedidos ---
    getPedidos() { return this.request('/pedidos'); },
    getPedido(id) { return this.request('/pedidos/' + id); },
    createPedido(data) { return this.request('/pedidos', { method: 'POST', body: JSON.stringify(data) }); },
    updatePedido(id, data) { return this.request('/pedidos/' + id, { method: 'PUT', body: JSON.stringify(data) }); },
    deletePedido(id) { return this.request('/pedidos/' + id, { method: 'DELETE' }); },
    getPedidosPendientes() { return this.request('/pedidos/pendientes'); },
    buscarPedidos(q) { return this.request('/pedidos/buscar?q=' + encodeURIComponent(q)); },

    // --- Productos ---
    getProductos(all) { return this.request('/productos' + (all ? '?all=true' : '')); },
    createProducto(data) { return this.request('/productos', { method: 'POST', body: JSON.stringify(data) }); },
    updateProducto(id, data) { return this.request('/productos/' + id, { method: 'PUT', body: JSON.stringify(data) }); },
    toggleProducto(id, activo) { return this.request('/productos/' + id + '/toggle', { method: 'PATCH', body: JSON.stringify({ activo }) }); },

    // --- Personalizaciones ---
    getPersonalizaciones(all) { return this.request('/personalizaciones' + (all ? '?all=true' : '')); },
    createPersonalizacion(data) { return this.request('/personalizaciones', { method: 'POST', body: JSON.stringify(data) }); },
    updatePersonalizacion(id, data) { return this.request('/personalizaciones/' + id, { method: 'PUT', body: JSON.stringify(data) }); },
    togglePersonalizacion(id, activo) { return this.request('/personalizaciones/' + id + '/toggle', { method: 'PATCH', body: JSON.stringify({ activo }) }); },

    // --- Clientes ---
    getClientes() { return this.request('/clientes'); },

    // --- Estadísticas ---
    getEstadisticas(desde, hasta) {
        let params = '';
        if (desde || hasta) {
            const p = new URLSearchParams();
            if (desde) p.set('desde', desde);
            if (hasta) p.set('hasta', hasta);
            params = '?' + p.toString();
        }
        return this.request('/estadisticas' + params);
    },
    getVentasPorCanal(desde, hasta) {
        let params = '';
        if (desde || hasta) {
            const p = new URLSearchParams();
            if (desde) p.set('desde', desde);
            if (hasta) p.set('hasta', hasta);
            params = '?' + p.toString();
        }
        return this.request('/estadisticas/canales' + params);
    },
    getVentasPorEstado() { return this.request('/estadisticas/estados'); }
};
