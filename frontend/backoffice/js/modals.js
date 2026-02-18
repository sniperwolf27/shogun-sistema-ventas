/**
 * MODAL SYSTEM + NOTIFICATIONS + CONFIRM DIALOG
 * Apple HIG: CSS classes, no inline styles, unified toast system
 */

(function () {
    const path = window.location.pathname;
    if (path === '/login' || path === '/' || path === '/formulario') return;

    let modalManager;

    // ===== HELPERS =====

    function val(v, fallback) { return v != null && v !== '' ? v : (fallback || '-'); }
    function money(v) { return typeof formatearMoneda === 'function' ? formatearMoneda(v) : 'RD$' + (v || 0); }
    function badge(s) { return typeof getEstadoBadge === 'function' ? getEstadoBadge(s) : s; }
    function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

    function closeModal(modal) {
        if (modalManager) modalManager.close(modal);
    }

    function selectOpts(options, selected) {
        return options.map(o => `<option value="${o}" ${o === selected ? 'selected' : ''}>${o}</option>`).join('');
    }

    function ddmmToIso(dd) { if (!dd || !dd.includes('/')) return ''; const p = dd.split('/'); return `${p[2]}-${p[1]}-${p[0]}`; }
    function isoToDdmm(iso) { if (!iso || !iso.includes('-')) return ''; const p = iso.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }

    function fileIcon(mime) {
        if (!mime) return 'fa-file';
        if (mime.includes('image')) return 'fa-image';
        if (mime.includes('video')) return 'fa-video';
        if (mime.includes('audio')) return 'fa-music';
        if (mime.includes('pdf')) return 'fa-file-pdf';
        if (mime.includes('text')) return 'fa-file-alt';
        return 'fa-file';
    }

    function fileSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function formatDate(d) {
        return d ? new Date(d).toLocaleString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    }

    function modalLoadingHTML(sizeClass) {
        return `<div class="modal-content ${sizeClass}"><div class="modal-body"><div class="modal-loading active"><div class="loading-spinner"></div><p>Cargando...</p></div></div></div>`;
    }

    // ===== MODAL MANAGER =====

    class ModalManager {
        constructor() {
            this.activeModal = null;
            this._previousFocus = null;
            this._focusTrapHandler = null;
            this.overlay = this._createOverlay();
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.activeModal) this.closeActive(); });
        }
        _createOverlay() {
            let ov = document.querySelector('.modal-overlay');
            if (!ov) { ov = document.createElement('div'); ov.className = 'modal-overlay'; document.body.appendChild(ov); }
            ov.addEventListener('click', () => this.closeActive());
            ov._modalManager = this;
            return ov;
        }
        open(modal) {
            if (this.activeModal) this.close(this.activeModal);
            this._previousFocus = document.activeElement;
            this.activeModal = modal;
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            this.overlay.classList.add('active');
            modal.classList.add('active');
            document.body.classList.add('modal-open');
            // Focus trap
            this._focusTrapHandler = (e) => {
                if (e.key !== 'Tab') return;
                const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (!focusable.length) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
                } else {
                    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            };
            document.addEventListener('keydown', this._focusTrapHandler);
            // Auto-focus first focusable element
            requestAnimationFrame(() => {
                const first = modal.querySelector('button, [href], input, select, textarea');
                if (first) first.focus();
            });
        }
        close(modal) {
            // Animated close
            modal.classList.add('closing');
            this.overlay.classList.add('closing');
            if (this._focusTrapHandler) {
                document.removeEventListener('keydown', this._focusTrapHandler);
                this._focusTrapHandler = null;
            }
            const onEnd = () => {
                modal.classList.remove('active', 'closing');
                this.overlay.classList.remove('active', 'closing');
                modal.removeAttribute('role');
                modal.removeAttribute('aria-modal');
                document.body.classList.remove('modal-open');
                this.activeModal = null;
                if (this._previousFocus) { this._previousFocus.focus(); this._previousFocus = null; }
            };
            modal.addEventListener('animationend', onEnd, { once: true });
            // Fallback if no animation
            setTimeout(onEnd, 350);
        }
        closeActive() { if (this.activeModal) this.close(this.activeModal); }
    }

    // ===== CONFIRM DIALOG (replaces native confirm()) =====

    class ConfirmDialog {
        constructor() {
            this.modal = document.createElement('div');
            this.modal.className = 'modal';
            document.body.appendChild(this.modal);
        }

        show({ title = 'Confirmar', message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning' }) {
            return new Promise((resolve) => {
                const iconClass = type === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-question';
                const btnClass = type === 'danger' ? 'btn-danger' : 'btn-primary';

                this.modal.innerHTML = `
                <div class="modal-content modal-sm">
                    <div class="modal-header">
                        <h2 class="modal-title">${esc(title)}</h2>
                        <button class="modal-close" data-close><i class="fas fa-xmark"></i></button>
                    </div>
                    <div class="modal-body">
                        <div class="confirm-dialog-icon ${type}">
                            <i class="fas ${iconClass}"></i>
                        </div>
                        <p class="confirm-dialog-message">${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-cancel>${esc(cancelText)}</button>
                        <button class="btn ${btnClass}" data-confirm>${esc(confirmText)}</button>
                    </div>
                </div>`;

                modalManager.open(this.modal);

                const cleanup = (result) => {
                    closeModal(this.modal);
                    resolve(result);
                };

                this.modal.querySelector('[data-confirm]').onclick = () => cleanup(true);
                this.modal.querySelector('[data-cancel]').onclick = () => cleanup(false);
                this.modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => cleanup(false));
            });
        }
    }

    // ===== RENDER COMMENTS (shared) =====

    function renderComentarios(comentarios, pedidoId, deleteHandler) {
        if (!comentarios || comentarios.length === 0) {
            return '<p class="comment-empty">Sin comentarios</p>';
        }
        return comentarios.map(c => `
            <div class="comment-card">
                <div class="comment-header">
                    <span class="comment-author">${esc(c.autor_nombre)}</span>
                    <div class="comment-meta">
                        <span class="comment-date">${formatDate(c.created_at)}</span>
                        <button class="btn-inline danger" data-action="${deleteHandler}" data-id="${c.id}" data-pedido="${pedidoId}" title="Eliminar"><i class="far fa-trash-can"></i></button>
                    </div>
                </div>
                <div class="comment-body">${esc(c.texto)}</div>
            </div>
        `).join('');
    }

    // ===== RENDER ATTACHMENTS (shared) =====

    function renderAdjuntos(adjuntos, pedidoId, deleteHandler) {
        if (!adjuntos || adjuntos.length === 0) {
            return '<p class="attachment-empty">Sin adjuntos</p>';
        }
        return adjuntos.map(a => `
            <div class="attachment-row">
                <i class="fas ${fileIcon(a.tipo_mime)} attachment-icon"></i>
                <div class="attachment-info">
                    <div class="attachment-name">${esc(a.nombre_original)}</div>
                    <div class="attachment-meta">${fileSize(a.tamano_bytes)} ${a.subido_por_nombre ? '· ' + esc(a.subido_por_nombre) : ''} ${a.created_at ? '· ' + formatDate(a.created_at) : ''}</div>
                </div>
                <button class="btn-inline accent" data-action="descargarAdjuntoUI" data-id="${a.id}" title="Descargar"><i class="fa-solid fa-arrow-down"></i></button>
                <button class="btn-inline danger" data-action="${deleteHandler}" data-id="${a.id}" data-pedido="${pedidoId}" title="Eliminar"><i class="far fa-trash-can"></i></button>
            </div>
        `).join('');
    }

    // ===== VER PEDIDO =====

    class VerPedidoModal {
        constructor() {
            this.modal = document.createElement('div');
            this.modal.className = 'modal';
            document.body.appendChild(this.modal);
        }

        async open(id) {
            this.modal.innerHTML = modalLoadingHTML('modal-xl');
            modalManager.open(this.modal);

            try {
                const p = await api.getPedido(id);
                if (!p) { this.modal.innerHTML = '<div class="modal-content"><div class="modal-body"><p class="comment-error">Pedido no encontrado</p></div></div>'; return; }

                const delayClass = p.dias_retraso > 0 ? ' detail-value danger' : '';

                this.modal.innerHTML = `
                <div class="modal-content modal-xl">
                    <div class="modal-header">
                        <h2 class="modal-title"><i class="far fa-file-lines"></i> Pedido ${esc(p.id)}</h2>
                        <button class="modal-close" data-close><i class="fas fa-xmark"></i></button>
                    </div>
                    <div class="modal-body">
                        <div class="summary-strip">
                            <div class="summary-chip accent">
                                <div class="summary-chip-label">Total</div>
                                <div class="summary-chip-value">${money(p.precio_total)}</div>
                            </div>
                            <div class="summary-chip success">
                                <div class="summary-chip-label">Producción</div>
                                <div>${badge(p.estatus_produccion)}</div>
                            </div>
                            <div class="summary-chip warning">
                                <div class="summary-chip-label">Pago</div>
                                <div>${badge(p.estatus_pago)}</div>
                            </div>
                        </div>

                        <div class="detail-section">
                            <div class="section-title"><i class="far fa-user"></i> Cliente</div>
                            <div class="detail-grid">
                                <div class="detail-item"><div class="detail-label">Nombre</div><div class="detail-value">${esc(p.cliente)}</div></div>
                                <div class="detail-item"><div class="detail-label">Teléfono</div><div class="detail-value">${esc(p.telefono)}</div></div>
                                <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${val(p.email)}</div></div>
                                <div class="detail-item"><div class="detail-label">Dirección</div><div class="detail-value">${val(p.direccion)}</div></div>
                            </div>
                        </div>

                        <div class="detail-section">
                            <div class="section-title"><i class="fa-solid fa-shirt"></i> Producto</div>
                            <div class="detail-grid">
                                <div class="detail-item"><div class="detail-label">Producto</div><div class="detail-value">${esc(p.producto)}</div></div>
                                <div class="detail-item"><div class="detail-label">SKU</div><div class="detail-value">${esc(p.sku)}</div></div>
                                <div class="detail-item"><div class="detail-label">Talla</div><div class="detail-value">${val(p.talla)}</div></div>
                                <div class="detail-item"><div class="detail-label">Color</div><div class="detail-value">${val(p.color)}</div></div>
                                <div class="detail-item"><div class="detail-label">Personalización</div><div class="detail-value">${val(p.personalizacion)}</div></div>
                                ${p.puntadas ? `<div class="detail-item"><div class="detail-label">Puntadas</div><div class="detail-value">${Number(p.puntadas).toLocaleString()}</div></div>` : ''}
                            </div>
                        </div>

                        <div class="detail-section">
                            <div class="section-title"><i class="far fa-credit-card"></i> Financiero</div>
                            <div class="detail-grid">
                                <div class="detail-item"><div class="detail-label">Precio Venta</div><div class="detail-value">${money(p.precio_producto)}</div></div>
                                <div class="detail-item"><div class="detail-label">Personalización</div><div class="detail-value">${money(p.precio_person)}</div></div>
                                <div class="detail-item"><div class="detail-label">Envío</div><div class="detail-value">${money(p.precio_envio)}</div></div>
                                <div class="detail-item"><div class="detail-label">Total Cliente</div><div class="detail-value highlight">${money(p.precio_total)}</div></div>
                            </div>
                            <div class="cost-divider">
                                <div class="cost-label">Costos</div>
                                <div class="detail-grid">
                                    <div class="detail-item"><div class="detail-label">Costo Prenda</div><div class="detail-value">${money(p.costo_producto)}</div></div>
                                    <div class="detail-item"><div class="detail-label">Mano de Obra</div><div class="detail-value">${money(p.costo_mano_obra)}</div></div>
                                    ${p.costos_adicionales > 0 ? `<div class="detail-item"><div class="detail-label">Costos Adicionales</div><div class="detail-value">${money(p.costos_adicionales)}</div></div>` : ''}
                                    <div class="detail-item"><div class="detail-label">Costo Total</div><div class="detail-value text-semibold">${money(p.costo_total)}</div></div>
                                </div>
                            </div>
                            <div class="profit-bar ${p.ganancia >= 0 ? 'positive' : 'negative'}">
                                <span class="profit-label">Ganancia Neta</span>
                                <span class="profit-value">${money(p.ganancia)}</span>
                                ${p.precio_total > 0 ? `<span class="profit-margin">${(p.ganancia / p.precio_total * 100).toFixed(1)}%</span>` : ''}
                            </div>
                        </div>

                        <div class="detail-section">
                            <div class="section-title"><i class="far fa-calendar"></i> Fechas</div>
                            <div class="detail-grid">
                                <div class="detail-item"><div class="detail-label">Pago</div><div class="detail-value">${val(p.fecha_pago)}</div></div>
                                <div class="detail-item"><div class="detail-label">Compromiso</div><div class="detail-value">${val(p.fecha_compromiso)}</div></div>
                                <div class="detail-item"><div class="detail-label">Entrega Real</div><div class="detail-value">${val(p.fecha_entrega_real)}</div></div>
                                <div class="detail-item"><div class="detail-label">Retraso</div><div class="${delayClass}">${p.dias_retraso > 0 ? p.dias_retraso + ' días' : 'Sin retraso'}</div></div>
                            </div>
                        </div>

                        ${p.grupo_pedido ? `
                        <div class="detail-section" id="grupoPedidoSection">
                            <div class="section-title"><i class="fas fa-layer-group"></i> Grupo <span class="grupo-badge-inline">${esc(p.grupo_pedido)}</span></div>
                            <div id="grupoPedidoLista"><em class="comment-empty">Cargando pedidos del grupo...</em></div>
                        </div>` : ''}

                        <div class="detail-section">
                            <div class="section-title"><i class="fa-solid fa-paperclip"></i> Adjuntos</div>
                            <div id="adjuntosLista"><em class="attachment-empty">Cargando...</em></div>
                            <div class="upload-bar">
                                <input type="file" id="adjuntoInput" class="visually-hidden-input" multiple>
                                <button class="btn btn-primary btn-sm" id="btnAddFile"><i class="fa-solid fa-arrow-up"></i> Subir archivo</button>
                                <span class="upload-status" id="adjuntoStatus"></span>
                            </div>
                        </div>

                        <div class="detail-section">
                            <div class="section-title"><i class="far fa-comments"></i> Comentarios</div>
                            <div id="comentariosLista"><em class="comment-empty">Cargando...</em></div>
                            <div class="comment-input-row">
                                <input id="nuevoComentario" class="form-control" placeholder="Escribe un comentario...">
                                <button class="btn btn-primary btn-sm" id="btnAddComment"><i class="far fa-paper-plane"></i></button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-close>Cerrar</button>
                        <button class="btn btn-primary" data-edit><i class="far fa-pen-to-square"></i> Editar</button>
                    </div>
                </div>`;

                this.modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeModal(this.modal));
                this.modal.querySelector('[data-edit]').onclick = () => { closeModal(this.modal); editarPedidoModal.open(id); };

                this._loadComentarios(id);
                this._loadAdjuntos(id);
                if (p.grupo_pedido) this._loadGrupo(id, p.grupo_pedido);

                document.getElementById('btnAddComment').onclick = async () => {
                    const input = document.getElementById('nuevoComentario');
                    const texto = input.value.trim();
                    if (!texto) return;
                    input.disabled = true;
                    try { await api.crearComentario(id, texto); input.value = ''; this._loadComentarios(id); }
                    catch (e) { showNotification(e.message, 'error'); }
                    input.disabled = false;
                };

                document.getElementById('nuevoComentario').addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') document.getElementById('btnAddComment').click();
                });

                document.getElementById('btnAddFile').onclick = () => document.getElementById('adjuntoInput').click();
                document.getElementById('adjuntoInput').onchange = async (e) => {
                    const files = e.target.files;
                    if (!files.length) return;
                    const status = document.getElementById('adjuntoStatus');
                    for (const file of files) {
                        status.textContent = `Subiendo ${file.name}...`;
                        try { await api.subirAdjunto(id, file); }
                        catch (err) { showNotification(`Error subiendo ${file.name}: ${err.message}`, 'error'); }
                    }
                    status.textContent = '';
                    e.target.value = '';
                    this._loadAdjuntos(id);
                };
            } catch (e) {
                this.modal.innerHTML = `<div class="modal-content"><div class="modal-body"><p class="comment-error">Error: ${esc(e.message)}</p></div><div class="modal-footer"><button class="btn btn-secondary" data-close>Cerrar</button></div></div>`;
                this.modal.querySelector('[data-close]').onclick = () => closeModal(this.modal);
            }
        }

        async _loadComentarios(pedidoId) {
            const container = document.getElementById('comentariosLista');
            if (!container) return;
            try {
                const comentarios = await api.getComentarios(pedidoId);
                container.innerHTML = renderComentarios(comentarios, pedidoId, 'eliminarComentarioUI');
            } catch (e) {
                container.innerHTML = '<p class="comment-error">Error cargando comentarios</p>';
            }
        }

        async _loadAdjuntos(pedidoId) {
            const container = document.getElementById('adjuntosLista');
            if (!container) return;
            try {
                const adjuntos = await api.getAdjuntos(pedidoId);
                container.innerHTML = renderAdjuntos(adjuntos, pedidoId, 'eliminarAdjuntoUI');
            } catch (e) {
                container.innerHTML = '<p class="attachment-error">Error cargando adjuntos</p>';
            }
        }

        async _loadGrupo(pedidoId, grupoId) {
            const container = document.getElementById('grupoPedidoLista');
            if (!container) return;
            try {
                const pedidos = await api.getPedidosByGrupo(grupoId);
                if (!pedidos || pedidos.length <= 1) {
                    const section = document.getElementById('grupoPedidoSection');
                    if (section) section.style.display = 'none';
                    return;
                }
                container.innerHTML = pedidos.map(p => `
                    <div class="grupo-pedido-item ${p.id === pedidoId ? 'grupo-current' : ''}">
                        <div class="grupo-pedido-info">
                            <strong>${esc(p.id)}</strong>
                            <span>${esc(p.producto || '')}${p.talla ? ' · ' + esc(p.talla) : ''}</span>
                            ${badge(p.estatus_produccion)}
                        </div>
                        ${p.id !== pedidoId ? `<button class="btn-inline accent" data-action="abrirDetallesPedido" data-id="${esc(p.id)}" title="Ver pedido">Ver →</button>` : '<span class="grupo-current-tag">Este pedido</span>'}
                    </div>`).join('');
            } catch (e) {
                container.innerHTML = '<p class="comment-error">Error cargando grupo</p>';
            }
        }
    }

    // ===== EDITAR PEDIDO =====

    class EditarPedidoModal {
        constructor() {
            this.modal = document.createElement('div');
            this.modal.className = 'modal';
            document.body.appendChild(this.modal);
        }

        async open(id) {
            this.modal.innerHTML = modalLoadingHTML('modal-lg');
            modalManager.open(this.modal);

            try {
                const p = await api.getPedido(id);
                if (!p) return;

                // Mejora 7: Transiciones de estado válidas
                const VALID_TRANSITIONS = {
                    'En Producción':          ['En Producción', 'Listo para Envío', 'Bloqueado - Sin Dirección', 'Cancelado'],
                    'Listo para Envío':       ['Listo para Envío', 'En Camino', 'En Producción', 'Cancelado'],
                    'En Camino':              ['En Camino', 'Entregado', 'Listo para Envío', 'Cancelado'],
                    'Entregado':              ['Entregado'],
                    'Bloqueado - Sin Dirección': ['Bloqueado - Sin Dirección', 'En Producción', 'Cancelado'],
                    'Cancelado':              ['Cancelado', 'En Producción']
                };
                const allEstados = ['En Producción', 'Listo para Envío', 'En Camino', 'Entregado', 'Bloqueado - Sin Dirección', 'Cancelado'];
                const estadosProd = VALID_TRANSITIONS[p.estatus_produccion] || allEstados;
                const estadosPago = ['Recibido', 'Pendiente', 'Parcial', 'Reembolsado'];
                const bancos = ['Popular', 'Banreservas', 'BHD', 'Efectivo', 'Transferencia'];
                const canales = ['WhatsApp', 'Instagram', 'Facebook', 'Referido', 'Tienda'];

                this.modal.innerHTML = `
                <div class="modal-content modal-lg">
                    <div class="modal-header">
                        <h2 class="modal-title"><i class="far fa-pen-to-square"></i> Editar ${esc(id)}</h2>
                        <button class="modal-close" data-close><i class="fas fa-xmark"></i></button>
                    </div>
                    <div class="modal-body">
                        <div id="editError" class="edit-error"></div>
                        <form id="editForm">
                            <div class="edit-grid-2">
                                <div><label class="edit-label">Estado Producción</label><select name="estatus_produccion" class="form-control">${selectOpts(estadosProd, p.estatus_produccion)}</select></div>
                                <div><label class="edit-label">Estado Pago</label><select name="estatus_pago" class="form-control">${selectOpts(estadosPago, p.estatus_pago)}</select></div>
                            </div>
                            <div class="edit-grid-2">
                                <div><label class="edit-label">Cliente</label><input name="cliente" class="form-control" value="${esc(p.cliente)}"></div>
                                <div><label class="edit-label">Teléfono</label><input name="telefono" class="form-control" value="${esc(p.telefono)}"></div>
                            </div>
                            <div class="edit-grid-2">
                                <div><label class="edit-label">Email <span class="optional">(opcional)</span></label><input name="email" class="form-control" value="${esc(p.email || '')}" placeholder="No requerido"></div>
                                <div><label class="edit-label">Color</label><input name="color" class="form-control" value="${esc(p.color || '')}" placeholder="Ej: Negro, Blanco, Rojo"></div>
                            </div>
                            <div class="edit-row"><label class="edit-label">Dirección</label><textarea name="direccion" class="form-control" rows="2">${esc(p.direccion || '')}</textarea></div>
                            <div class="edit-row"><label class="edit-label">Detalles Personalización</label><textarea name="personalizacion" class="form-control" rows="2" placeholder="Detalles del bordado/diseño...">${esc(p.personalizacion || '')}</textarea></div>
                            <div class="edit-grid-3">
                                <div><label class="edit-label">Precio Venta (RD$)</label><input name="precio_producto" type="number" step="0.01" class="form-control" value="${p.precio_producto || 0}"></div>
                                <div><label class="edit-label">Costos Adicionales</label><input name="costos_adicionales" type="number" step="0.01" class="form-control" value="${p.costos_adicionales || 0}"></div>
                                <div><label class="edit-label">Envío</label><input name="precio_envio" type="number" step="0.01" class="form-control" value="${p.precio_envio || 0}"></div>
                            </div>
                            <div class="edit-grid-2">
                                <div><label class="edit-label">Método Pago</label><select name="banco" class="form-control">${selectOpts(bancos, p.banco)}</select></div>
                                <div><label class="edit-label">Canal</label><select name="canal" class="form-control">${selectOpts(canales, p.canal)}</select></div>
                            </div>
                            <div><label class="edit-label">Fecha Entrega Real</label><input type="date" name="fecha_entrega_real" class="form-control" value="${ddmmToIso(p.fecha_entrega_real)}"></div>
                        </form>

                        <div class="modal-section-divider">
                            <div class="modal-section-title"><i class="fa-solid fa-paperclip"></i> Adjuntos</div>
                            <div id="editAdjuntosLista"><em class="attachment-empty">Cargando...</em></div>
                            <div class="upload-bar">
                                <input type="file" id="editAdjuntoInput" class="visually-hidden-input" multiple>
                                <button type="button" class="btn btn-primary btn-sm" id="btnEditAddFile"><i class="fa-solid fa-arrow-up"></i> Subir</button>
                                <span class="upload-status" id="editAdjuntoStatus"></span>
                            </div>
                        </div>

                        <div class="modal-section-divider">
                            <div class="modal-section-title"><i class="far fa-comments"></i> Comentarios</div>
                            <div id="editComentariosLista"><em class="comment-empty">Cargando...</em></div>
                            <div class="comment-input-row">
                                <input id="editNuevoComentario" class="form-control" placeholder="Escribe un comentario...">
                                <button type="button" class="btn btn-primary btn-sm" id="btnEditAddComment"><i class="far fa-paper-plane"></i></button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-close>Cancelar</button>
                        <button class="btn btn-success" id="btnSaveEdit"><i class="fas fa-check"></i> Guardar</button>
                    </div>
                </div>`;

                this.modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeModal(this.modal));

                this._loadComentarios(id);
                this._loadAdjuntos(id);

                document.getElementById('btnEditAddComment').onclick = async () => {
                    const input = document.getElementById('editNuevoComentario');
                    const texto = input.value.trim();
                    if (!texto) return;
                    input.disabled = true;
                    try { await api.crearComentario(id, texto); input.value = ''; this._loadComentarios(id); }
                    catch (e) { showNotification(e.message, 'error'); }
                    input.disabled = false;
                };
                document.getElementById('editNuevoComentario').addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') document.getElementById('btnEditAddComment').click();
                });

                document.getElementById('btnEditAddFile').onclick = () => document.getElementById('editAdjuntoInput').click();
                document.getElementById('editAdjuntoInput').onchange = async (e) => {
                    const files = e.target.files;
                    if (!files.length) return;
                    const status = document.getElementById('editAdjuntoStatus');
                    for (const file of files) {
                        status.textContent = `Subiendo ${file.name}...`;
                        try { await api.subirAdjunto(id, file); } catch (err) { showNotification(`Error: ${err.message}`, 'error'); }
                    }
                    status.textContent = '';
                    e.target.value = '';
                    this._loadAdjuntos(id);
                };

                document.getElementById('btnSaveEdit').onclick = async () => {
                    const btn = document.getElementById('btnSaveEdit');
                    if (btn.disabled) return;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...';
                    document.getElementById('editError').style.display = 'none';

                    const form = document.getElementById('editForm');
                    const fd = new FormData(form);
                    const obj = {};
                    for (const [k, v] of fd.entries()) { obj[k] = v.trim(); }
                    if (obj.fecha_entrega_real) { obj.fecha_entrega_real = isoToDdmm(obj.fecha_entrega_real); }

                    try {
                        const res = await api.updatePedido(id, obj);
                        if (res && res.success) {
                            closeModal(this.modal);
                            showNotification('Pedido actualizado', 'success');
                            await cargarPedidos();
                            if (typeof highlightPedidoRow === 'function') highlightPedidoRow(id);
                        } else {
                            document.getElementById('editError').style.display = 'block';
                            document.getElementById('editError').textContent = res?.error || 'Error al guardar';
                        }
                    } catch (e) {
                        document.getElementById('editError').style.display = 'block';
                        document.getElementById('editError').textContent = e.message;
                    } finally {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-check"></i> Guardar';
                    }
                };
            } catch (e) {
                this.modal.innerHTML = `<div class="modal-content"><div class="modal-body"><p class="comment-error">Error: ${esc(e.message)}</p></div></div>`;
            }
        }

        async _loadComentarios(pedidoId) {
            const container = document.getElementById('editComentariosLista');
            if (!container) return;
            try {
                const comentarios = await api.getComentarios(pedidoId);
                container.innerHTML = renderComentarios(comentarios, pedidoId, 'eliminarComentarioEditUI');
            } catch (e) { container.innerHTML = '<p class="comment-error">Error cargando comentarios</p>'; }
        }

        async _loadAdjuntos(pedidoId) {
            const container = document.getElementById('editAdjuntosLista');
            if (!container) return;
            try {
                const adjuntos = await api.getAdjuntos(pedidoId);
                container.innerHTML = renderAdjuntos(adjuntos, pedidoId, 'eliminarAdjuntoEditUI');
            } catch (e) { container.innerHTML = '<p class="attachment-error">Error cargando adjuntos</p>'; }
        }
    }

    // ===== ELIMINAR PEDIDO =====

    class EliminarPedidoModal {
        constructor() {
            this.modal = document.createElement('div');
            this.modal.className = 'modal';
            document.body.appendChild(this.modal);
        }

        async open(id) {
            this.modal.innerHTML = modalLoadingHTML('modal-md');
            modalManager.open(this.modal);

            try {
                const p = await api.getPedido(id);
                if (!p) return;

                this.modal.innerHTML = `
                <div class="modal-content modal-md">
                    <div class="modal-header">
                        <h2 class="modal-title"><i class="fa-solid fa-triangle-exclamation"></i> Eliminar Pedido</h2>
                        <button class="modal-close" data-close><i class="fas fa-xmark"></i></button>
                    </div>
                    <div class="modal-body text-center">
                        <div class="delete-icon-circle">
                            <i class="fas fa-trash"></i>
                        </div>
                        <p class="confirm-dialog-message">¿Estás seguro de eliminar este pedido?<br><strong>Esta acción no se puede deshacer.</strong></p>
                        <table class="delete-summary">
                            <tr><td class="label-cell">Pedido</td><td class="value-cell text-semibold">${esc(p.id)}</td></tr>
                            <tr><td class="label-cell">Cliente</td><td class="value-cell">${esc(p.cliente)}</td></tr>
                            <tr><td class="label-cell">Producto</td><td class="value-cell">${esc(p.producto)}</td></tr>
                            <tr><td class="label-cell">Total</td><td class="value-cell text-bold">${money(p.precio_total)}</td></tr>
                        </table>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-close>Cancelar</button>
                        <button class="btn btn-danger" id="btnConfirmDelete"><i class="fas fa-trash-can"></i> Eliminar</button>
                    </div>
                </div>`;

                this.modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeModal(this.modal));

                document.getElementById('btnConfirmDelete').onclick = async () => {
                    const btn = document.getElementById('btnConfirmDelete');
                    if (btn.disabled) return;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Eliminando...';
                    try {
                        const res = await api.deletePedido(id);
                        if (res && res.success) {
                            closeModal(this.modal);
                            showNotification('Pedido eliminado', 'success');
                            await cargarPedidos();
                        } else {
                            showNotification(res?.error || 'Error al eliminar', 'error');
                        }
                    } catch (e) {
                        showNotification(e.message, 'error');
                    } finally {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-trash-can"></i> Eliminar';
                    }
                };
            } catch (e) {
                closeModal(this.modal);
                showNotification(e.message, 'error');
            }
        }
    }

    // ===== CLIENTE PROFILE PANEL (Mejora 2) =====

    class ClienteProfileModal {
        constructor() {
            this.modal = document.createElement('div');
            this.modal.className = 'modal';
            document.body.appendChild(this.modal);
        }

        async open(telefono) {
            this.modal.innerHTML = modalLoadingHTML('modal-lg');
            modalManager.open(this.modal);

            try {
                const perfil = await api.getClientePerfil(telefono);
                if (!perfil) {
                    this.modal.innerHTML = `<div class="modal-content modal-lg"><div class="modal-body"><p class="comment-error">Cliente no encontrado</p></div><div class="modal-footer"><button class="btn btn-secondary" data-close>Cerrar</button></div></div>`;
                    this.modal.querySelector('[data-close]').onclick = () => closeModal(this.modal);
                    return;
                }

                this.modal.innerHTML = `
                <div class="modal-content modal-lg">
                    <div class="modal-header">
                        <h2 class="modal-title"><i class="far fa-user"></i> ${esc(perfil.nombre || telefono)}</h2>
                        <button class="modal-close" data-close><i class="fas fa-xmark"></i></button>
                    </div>
                    <div class="modal-body">
                        <div class="summary-strip">
                            <div class="summary-chip accent">
                                <div class="summary-chip-label">Pedidos</div>
                                <div class="summary-chip-value">${perfil.pedidos || 0}</div>
                            </div>
                            <div class="summary-chip success">
                                <div class="summary-chip-label">Total gastado</div>
                                <div class="summary-chip-value">${money(perfil.total_gastado)}</div>
                            </div>
                            <div class="summary-chip warning">
                                <div class="summary-chip-label">Tipo</div>
                                <div class="summary-chip-value">${esc(perfil.tipo || 'Regular')}</div>
                            </div>
                        </div>

                        <div class="detail-section">
                            <div class="section-title"><i class="far fa-address-card"></i> Contacto</div>
                            <div class="detail-grid">
                                <div class="detail-item"><div class="detail-label">Teléfono</div><div class="detail-value">${esc(perfil.telefono || telefono)}</div></div>
                                ${perfil.email ? `<div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${esc(perfil.email)}</div></div>` : ''}
                                ${perfil.ultimo_pedido ? `<div class="detail-item"><div class="detail-label">Último pedido</div><div class="detail-value">${esc(perfil.ultimo_pedido)}</div></div>` : ''}
                            </div>
                        </div>

                        <div class="detail-section">
                            <div class="section-title"><i class="far fa-rectangle-list"></i> Últimos pedidos</div>
                            <div class="cliente-pedidos-lista">
                                ${(perfil.pedidos_recientes || []).length === 0
                                    ? '<p class="comment-empty">Sin pedidos registrados</p>'
                                    : (perfil.pedidos_recientes || []).map(p => `
                                        <div class="grupo-pedido-item">
                                            <div class="grupo-pedido-info">
                                                <strong>${esc(p.id)}</strong>
                                                <span>${esc(p.producto || '')}${p.talla ? ' · ' + esc(p.talla) : ''}</span>
                                                ${badge(p.estatus_produccion)}
                                            </div>
                                            <button class="btn-inline accent" data-action="abrirDetallesPedido" data-id="${esc(p.id)}" title="Ver pedido">Ver →</button>
                                        </div>`).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-close>Cerrar</button>
                    </div>
                </div>`;

                this.modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeModal(this.modal));
            } catch (e) {
                this.modal.innerHTML = `<div class="modal-content modal-lg"><div class="modal-body"><p class="comment-error">Error: ${esc(e.message)}</p></div><div class="modal-footer"><button class="btn btn-secondary" data-close>Cerrar</button></div></div>`;
                this.modal.querySelector('[data-close]').onclick = () => closeModal(this.modal);
            }
        }
    }

    // ===== UNIFIED TOAST NOTIFICATIONS (Apple HIG - top center, with blur) =====

    window.showNotification = function (message, type = 'info', duration = 3000) {
        const icons = { success: 'circle-check', error: 'circle-exclamation', info: 'circle-info', warning: 'triangle-exclamation' };

        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <i class="fas fa-${icons[type] || icons.info} toast-icon" aria-hidden="true"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-dismiss" aria-label="Cerrar notificación"><i class="fas fa-xmark" aria-hidden="true"></i></button>
            <div class="toast-progress" style="animation-duration:${duration}ms"></div>`;
        container.appendChild(toast);

        const dismiss = () => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        };

        toast.querySelector('.toast-dismiss').addEventListener('click', dismiss);

        while (container.children.length > 4) {
            container.removeChild(container.firstChild);
        }

        setTimeout(dismiss, duration);
    };

    // ===== INIT =====

    let verPedidoModal, editarPedidoModal, eliminarPedidoModal, confirmDialog, clienteProfileModal;

    document.addEventListener('DOMContentLoaded', () => {
        modalManager = new ModalManager();
        verPedidoModal = new VerPedidoModal();
        editarPedidoModal = new EditarPedidoModal();
        eliminarPedidoModal = new EliminarPedidoModal();
        confirmDialog = new ConfirmDialog();
        clienteProfileModal = new ClienteProfileModal();

        window.abrirDetallesPedido = (id) => verPedidoModal.open(id);
        window.abrirEdicionPedido = (id) => editarPedidoModal.open(id);
        window.abrirEliminarPedido = (id) => eliminarPedidoModal.open(id);
        window.abrirPerfilCliente = (telefono) => clienteProfileModal.open(telefono);

        // Expose confirmDialog globally
        window.showConfirm = (opts) => confirmDialog.show(opts);

        // Global helpers - VER modal
        window.eliminarComentarioUI = async (commentId, pedidoId) => {
            const ok = await confirmDialog.show({ title: 'Eliminar comentario', message: 'Se eliminará este comentario permanentemente.', confirmText: 'Eliminar', type: 'danger' });
            if (!ok) return;
            try { await api.eliminarComentario(commentId); verPedidoModal._loadComentarios(pedidoId); showNotification('Comentario eliminado', 'success'); }
            catch (e) { showNotification(e.message, 'error'); }
        };

        window.descargarAdjuntoUI = async (adjuntoId) => {
            try {
                const res = await api.getAdjuntoUrl(adjuntoId);
                if (res && res.url) {
                    const a = document.createElement('a');
                    a.href = res.url; a.target = '_blank'; a.download = res.nombre || 'archivo';
                    document.body.appendChild(a); a.click(); a.remove();
                } else { showNotification('No se pudo obtener la URL', 'error'); }
            } catch (e) { showNotification(e.message, 'error'); }
        };

        window.eliminarAdjuntoUI = async (adjuntoId, pedidoId) => {
            const ok = await confirmDialog.show({ title: 'Eliminar archivo', message: 'Se eliminará este archivo permanentemente.', confirmText: 'Eliminar', type: 'danger' });
            if (!ok) return;
            try { await api.eliminarAdjunto(adjuntoId); verPedidoModal._loadAdjuntos(pedidoId); showNotification('Archivo eliminado', 'success'); }
            catch (e) { showNotification(e.message, 'error'); }
        };

        // Global helpers - EDITAR modal
        window.eliminarComentarioEditUI = async (commentId, pedidoId) => {
            const ok = await confirmDialog.show({ title: 'Eliminar comentario', message: 'Se eliminará este comentario permanentemente.', confirmText: 'Eliminar', type: 'danger' });
            if (!ok) return;
            try { await api.eliminarComentario(commentId); editarPedidoModal._loadComentarios(pedidoId); showNotification('Comentario eliminado', 'success'); }
            catch (e) { showNotification(e.message, 'error'); }
        };

        window.eliminarAdjuntoEditUI = async (adjuntoId, pedidoId) => {
            const ok = await confirmDialog.show({ title: 'Eliminar archivo', message: 'Se eliminará este archivo permanentemente.', confirmText: 'Eliminar', type: 'danger' });
            if (!ok) return;
            try { await api.eliminarAdjunto(adjuntoId); editarPedidoModal._loadAdjuntos(pedidoId); showNotification('Archivo eliminado', 'success'); }
            catch (e) { showNotification(e.message, 'error'); }
        };

        // Event delegation for dynamically rendered comment/attachment actions
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const fn = window[action];
            if (typeof fn !== 'function') return;
            const id = btn.dataset.id;
            const pedidoId = btn.dataset.pedido;
            fn(id, pedidoId);
        });
    });
})();
