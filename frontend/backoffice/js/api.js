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
    getPedidos(params = {}) {
        const p = new URLSearchParams();
        if (params.page) p.set('page', params.page);
        if (params.limit) p.set('limit', params.limit);
        if (params.q) p.set('q', params.q);
        if (params.estado) p.set('estado', params.estado);
        if (params.canal) p.set('canal', params.canal);
        const qs = p.toString();
        return this.request('/pedidos' + (qs ? '?' + qs : ''));
    },
    getPedido(id) { return this.request('/pedidos/' + id); },
    createPedido(data) { return this.request('/pedidos', { method: 'POST', body: JSON.stringify(data) }); },
    updatePedido(id, data) { return this.request('/pedidos/' + id, { method: 'PUT', body: JSON.stringify(data) }); },
    deletePedido(id) { return this.request('/pedidos/' + id, { method: 'DELETE' }); },
    getPedidosPendientes() { return this.request('/pedidos/pendientes'); },
    buscarPedidos(q) { return this.request('/pedidos/buscar?q=' + encodeURIComponent(q)); },
    checkDuplicado(telefono, sku, talla) {
        return this.request(`/pedidos/check-duplicado?telefono=${encodeURIComponent(telefono)}&sku=${encodeURIComponent(sku)}&talla=${encodeURIComponent(talla)}`);
    },
    getAlertasRetraso() { return this.request('/pedidos/alertas'); },
    bulkUpdateEstado(ids, estatus_produccion) {
        return this.request('/pedidos/bulk', { method: 'PATCH', body: JSON.stringify({ ids, estatus_produccion }) });
    },
    getPedidosByGrupo(grupoId) { return this.request('/pedidos/por-grupo/' + encodeURIComponent(grupoId)); },

    // --- Productos ---
    getProductos(all) { return this.request('/productos' + (all ? '?all=true' : '')); },
    createProducto(data) { return this.request('/productos', { method: 'POST', body: JSON.stringify(data) }); },
    updateProducto(id, data) { return this.request('/productos/' + id, { method: 'PUT', body: JSON.stringify(data) }); },
    toggleProducto(id, activo) { return this.request('/productos/' + id + '/toggle', { method: 'PATCH', body: JSON.stringify({ activo }) }); },
    validarSku(sku, excludeId) {
        let url = '/productos/validar-sku?sku=' + encodeURIComponent(sku);
        if (excludeId) url += '&exclude=' + encodeURIComponent(excludeId);
        return this.request(url);
    },

    // --- Categorías ---
    getCategorias(all) { return this.request('/categorias' + (all ? '?all=true' : '')); },
    createCategoria(data) { return this.request('/categorias', { method: 'POST', body: JSON.stringify(data) }); },
    updateCategoria(id, data) { return this.request('/categorias/' + id, { method: 'PUT', body: JSON.stringify(data) }); },
    toggleCategoria(id, activo) { return this.request('/categorias/' + id + '/toggle', { method: 'PATCH', body: JSON.stringify({ activo }) }); },

    // --- Personalizaciones ---
    getPersonalizaciones(all) { return this.request('/personalizaciones' + (all ? '?all=true' : '')); },
    createPersonalizacion(data) { return this.request('/personalizaciones', { method: 'POST', body: JSON.stringify(data) }); },
    updatePersonalizacion(id, data) { return this.request('/personalizaciones/' + id, { method: 'PUT', body: JSON.stringify(data) }); },
    togglePersonalizacion(id, activo) { return this.request('/personalizaciones/' + id + '/toggle', { method: 'PATCH', body: JSON.stringify({ activo }) }); },

    // --- Clientes ---
    getClientes() { return this.request('/clientes'); },
    getClientePerfil(telefono) { return this.request('/clientes/perfil?telefono=' + encodeURIComponent(telefono)); },

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
    getVentasPorEstado(desde, hasta) {
        let params = '';
        if (desde || hasta) {
            const p = new URLSearchParams();
            if (desde) p.set('desde', desde);
            if (hasta) p.set('hasta', hasta);
            params = '?' + p.toString();
        }
        return this.request('/estadisticas/estados' + params);
    },

    // --- Comentarios ---
    getComentarios(pedidoId) { return this.request('/pedidos/' + pedidoId + '/comentarios'); },
    crearComentario(pedidoId, texto) { return this.request('/pedidos/' + pedidoId + '/comentarios', { method: 'POST', body: JSON.stringify({ texto }) }); },
    eliminarComentario(id) { return this.request('/comentarios/' + id, { method: 'DELETE' }); },

    // --- Adjuntos ---
    getAdjuntos(pedidoId) { return this.request('/pedidos/' + pedidoId + '/adjuntos'); },
    async subirAdjunto(pedidoId, file) {
        const token = Auth.getToken();
        const fd = new FormData();
        fd.append('archivo', file);
        const response = await fetch(API_BASE + '/pedidos/' + pedidoId + '/adjuntos', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: fd
        });
        if (response.status === 401) { Auth.clearSession(); window.location.href = '/login'; return null; }
        return response.json();
    },
    getAdjuntoUrl(id) { return this.request('/adjuntos/' + id + '/download'); },
    eliminarAdjunto(id) { return this.request('/adjuntos/' + id, { method: 'DELETE' }); }
};
