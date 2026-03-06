/**
 * API MODULE — Shogun Backoffice
 * Centralized HTTP client with auth headers, error handling, and SWR-style caching.
 */

// ── Simple in-memory cache for SWR pattern ───────────────────────────────────
const _cache = new Map();
const _CACHE_TTL = 30_000; // 30 seconds

function _cacheGet(key) {
    const entry = _cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > _CACHE_TTL) { _cache.delete(key); return null; }
    return entry.data;
}
function _cacheSet(key, data) { _cache.set(key, { data, ts: Date.now() }); }
function _cacheInvalidate(prefix) {
    for (const key of _cache.keys()) {
        if (key.startsWith(prefix)) _cache.delete(key);
    }
}

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

    async requestCached(endpoint, ttl = _CACHE_TTL) {
        const cached = _cacheGet(endpoint);
        if (cached) return cached;
        const data = await this.request(endpoint);
        if (data) _cacheSet(endpoint, data);
        return data;
    },

    // ── Pedidos ───────────────────────────────────────────────────────────────
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
    createPedido(data) {
        _cacheInvalidate('/pedidos');
        _cacheInvalidate('/estadisticas');
        return this.request('/pedidos', { method: 'POST', body: JSON.stringify(data) });
    },
    updatePedido(id, data) {
        _cacheInvalidate('/pedidos');
        _cacheInvalidate('/estadisticas');
        return this.request('/pedidos/' + id, { method: 'PUT', body: JSON.stringify(data) });
    },
    deletePedido(id) {
        _cacheInvalidate('/pedidos');
        _cacheInvalidate('/estadisticas');
        return this.request('/pedidos/' + id, { method: 'DELETE' });
    },
    getPedidosPendientes() { return this.request('/pedidos/pendientes'); },
    buscarPedidos(q) { return this.request('/pedidos/buscar?q=' + encodeURIComponent(q)); },
    checkDuplicado(telefono, sku, talla) {
        return this.request(`/pedidos/check-duplicado?telefono=${encodeURIComponent(telefono)}&sku=${encodeURIComponent(sku)}&talla=${encodeURIComponent(talla)}`);
    },
    getAlertasRetraso() { return this.request('/pedidos/alertas'); },
    bulkUpdateEstado(ids, estatus_produccion) {
        _cacheInvalidate('/pedidos');
        return this.request('/pedidos/bulk', { method: 'PATCH', body: JSON.stringify({ ids, estatus_produccion }) });
    },
    getPedidosByGrupo(grupoId) { return this.request('/pedidos/por-grupo/' + encodeURIComponent(grupoId)); },

    // ── Productos ─────────────────────────────────────────────────────────────
    getProductos(all) {
        const url = '/productos' + (all ? '?all=true' : '');
        return this.requestCached(url);
    },
    createProducto(data) {
        _cacheInvalidate('/productos');
        return this.request('/productos', { method: 'POST', body: JSON.stringify(data) });
    },
    updateProducto(id, data) {
        _cacheInvalidate('/productos');
        return this.request('/productos/' + id, { method: 'PUT', body: JSON.stringify(data) });
    },
    toggleProducto(id, activo) {
        _cacheInvalidate('/productos');
        return this.request('/productos/' + id + '/toggle', { method: 'PATCH', body: JSON.stringify({ activo }) });
    },
    validarSku(sku, excludeId) {
        let url = '/productos/validar-sku?sku=' + encodeURIComponent(sku);
        if (excludeId) url += '&exclude=' + encodeURIComponent(excludeId);
        return this.request(url);
    },

    // ── Categorías ────────────────────────────────────────────────────────────
    getCategorias(all) {
        const url = '/categorias' + (all ? '?all=true' : '');
        return this.requestCached(url);
    },
    createCategoria(data) {
        _cacheInvalidate('/categorias');
        return this.request('/categorias', { method: 'POST', body: JSON.stringify(data) });
    },
    updateCategoria(id, data) {
        _cacheInvalidate('/categorias');
        return this.request('/categorias/' + id, { method: 'PUT', body: JSON.stringify(data) });
    },
    toggleCategoria(id, activo) {
        _cacheInvalidate('/categorias');
        return this.request('/categorias/' + id + '/toggle', { method: 'PATCH', body: JSON.stringify({ activo }) });
    },

    // ── Personalizaciones ─────────────────────────────────────────────────────
    getPersonalizaciones(all) {
        const url = '/personalizaciones' + (all ? '?all=true' : '');
        return this.requestCached(url);
    },
    createPersonalizacion(data) {
        _cacheInvalidate('/personalizaciones');
        return this.request('/personalizaciones', { method: 'POST', body: JSON.stringify(data) });
    },
    updatePersonalizacion(id, data) {
        _cacheInvalidate('/personalizaciones');
        return this.request('/personalizaciones/' + id, { method: 'PUT', body: JSON.stringify(data) });
    },
    togglePersonalizacion(id, activo) {
        _cacheInvalidate('/personalizaciones');
        return this.request('/personalizaciones/' + id + '/toggle', { method: 'PATCH', body: JSON.stringify({ activo }) });
    },

    // ── Clientes ──────────────────────────────────────────────────────────────
    getClientes() { return this.request('/clientes'); },
    getClientePerfil(telefono) {
        return this.request('/clientes/perfil?telefono=' + encodeURIComponent(telefono));
    },

    /**
     * Autocomplete clientes by phone or name.
     * Min 3 chars. Returns [{telefono, nombre, email, direccion}].
     */
    autocompleteClientes(q) {
        if (!q || q.length < 3) return Promise.resolve([]);
        return this.request('/clientes/autocomplete?q=' + encodeURIComponent(q));
    },

    // ── Estadísticas ──────────────────────────────────────────────────────────
    getEstadisticas(desde, hasta) {
        const p = new URLSearchParams();
        if (desde) p.set('desde', desde);
        if (hasta) p.set('hasta', hasta);
        const qs = p.toString();
        return this.request('/estadisticas' + (qs ? '?' + qs : ''));
    },
    getVentasPorCanal(desde, hasta) {
        const p = new URLSearchParams();
        if (desde) p.set('desde', desde);
        if (hasta) p.set('hasta', hasta);
        const qs = p.toString();
        return this.request('/estadisticas/canales' + (qs ? '?' + qs : ''));
    },
    getVentasPorEstado(desde, hasta) {
        const p = new URLSearchParams();
        if (desde) p.set('desde', desde);
        if (hasta) p.set('hasta', hasta);
        const qs = p.toString();
        return this.request('/estadisticas/estados' + (qs ? '?' + qs : ''));
    },
    getTimeline(desde, hasta) {
        const p = new URLSearchParams();
        if (desde) p.set('desde', desde);
        if (hasta) p.set('hasta', hasta);
        const qs = p.toString();
        return this.request('/estadisticas/timeline' + (qs ? '?' + qs : ''));
    },
    getTopProductos(desde, hasta) {
        const p = new URLSearchParams();
        if (desde) p.set('desde', desde);
        if (hasta) p.set('hasta', hasta);
        const qs = p.toString();
        return this.request('/estadisticas/productos' + (qs ? '?' + qs : ''));
    },
    getResumenOperativo() { return this.request('/estadisticas/resumen-operativo'); },

    /**
     * CONSOLIDATED dashboard endpoint — replaces 5 separate calls.
     * Returns { generales, canales, estados, timeline, top_productos }
     */
    getDashboard(desde, hasta) {
        const p = new URLSearchParams();
        if (desde) p.set('desde', desde);
        if (hasta) p.set('hasta', hasta);
        const qs = p.toString();
        const url = '/estadisticas/dashboard' + (qs ? '?' + qs : '');
        return this.requestCached(url);
    },

    // ── Comentarios ───────────────────────────────────────────────────────────
    getComentarios(pedidoId) { return this.request('/pedidos/' + pedidoId + '/comentarios'); },
    crearComentario(pedidoId, texto) {
        return this.request('/pedidos/' + pedidoId + '/comentarios', {
            method: 'POST',
            body: JSON.stringify({ texto })
        });
    },
    eliminarComentario(id) { return this.request('/comentarios/' + id, { method: 'DELETE' }); },

    // ── Adjuntos ──────────────────────────────────────────────────────────────
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
