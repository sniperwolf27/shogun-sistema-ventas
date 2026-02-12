/**
 * MODAL SYSTEM + NOTIFICATIONS
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

    // Date converters
    function ddmmToIso(dd) { if (!dd || !dd.includes('/')) return ''; const p = dd.split('/'); return `${p[2]}-${p[1]}-${p[0]}`; }
    function isoToDdmm(iso) { if (!iso || !iso.includes('-')) return ''; const p = iso.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }

    // ===== MODAL MANAGER =====

    class ModalManager {
        constructor() {
            this.activeModal = null;
            this.overlay = this._createOverlay();
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.activeModal) this.closeActive(); });
        }
        _createOverlay() {
            let ov = document.querySelector('.modal-overlay');
            if (!ov) { ov = document.createElement('div'); ov.className = 'modal-overlay'; document.body.appendChild(ov); }
            ov.addEventListener('click', () => this.closeActive());
            return ov;
        }
        open(modal) {
            if (this.activeModal) this.close(this.activeModal);
            this.activeModal = modal;
            this.overlay.classList.add('active');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        close(modal) {
            modal.classList.remove('active');
            this.overlay.classList.remove('active');
            document.body.style.overflow = '';
            this.activeModal = null;
        }
        closeActive() { if (this.activeModal) this.close(this.activeModal); }
    }

    // ===== VER PEDIDO =====

    class VerPedidoModal {
        constructor() {
            this.modal = document.createElement('div');
            this.modal.className = 'modal';
            document.body.appendChild(this.modal);
        }

        async open(id) {
            this.modal.innerHTML = '<div class="modal-content" style="max-width:720px;"><div class="modal-body" style="text-align:center;padding:40px;"><div class="loading-spinner" style="width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #2F5496;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 12px;"></div><p>Cargando...</p></div></div>';
            modalManager.open(this.modal);

            try {
                const p = await api.getPedido(id);
                if (!p) { this.modal.innerHTML = '<div class="modal-content"><div class="modal-body"><p style="color:#dc3545;">Pedido no encontrado</p></div></div>'; return; }

                this.modal.innerHTML = `
                <div class="modal-content" style="max-width:720px;">
                    <div class="modal-header">
                        <h2 class="modal-title"><i class="fas fa-receipt"></i> Pedido ${esc(p.id)}</h2>
                        <button class="modal-close" data-close><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
                            <div style="flex:1;padding:12px;background:#f0f4ff;border-radius:8px;text-align:center;">
                                <div style="font-size:.8em;color:#666;">Total</div>
                                <div style="font-size:1.4em;font-weight:700;color:#2F5496;">${money(p.precio_total)}</div>
                            </div>
                            <div style="flex:1;padding:12px;background:#f0fff4;border-radius:8px;text-align:center;">
                                <div style="font-size:.8em;color:#666;">Producción</div>
                                <div>${badge(p.estatus_produccion)}</div>
                            </div>
                            <div style="flex:1;padding:12px;background:#fff8f0;border-radius:8px;text-align:center;">
                                <div style="font-size:.8em;color:#666;">Pago</div>
                                <div>${badge(p.estatus_pago)}</div>
                            </div>
                        </div>

                        <div class="detail-section">
                            <div class="section-title"><i class="fas fa-user"></i> Cliente</div>
                            <div class="detail-grid">
                                <div class="detail-item"><div class="detail-label">Nombre</div><div class="detail-value">${esc(p.cliente)}</div></div>
                                <div class="detail-item"><div class="detail-label">Teléfono</div><div class="detail-value">${esc(p.telefono)}</div></div>
                                <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${val(p.email)}</div></div>
                                <div class="detail-item"><div class="detail-label">Dirección</div><div class="detail-value">${val(p.direccion)}</div></div>
                            </div>
                        </div>

                        <div class="detail-section">
                            <div class="section-title"><i class="fas fa-tshirt"></i> Producto</div>
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
                            <div class="section-title"><i class="fas fa-dollar-sign"></i> Financiero</div>
                            <div class="detail-grid">
                                <div class="detail-item"><div class="detail-label">Precio Venta</div><div class="detail-value">${money(p.precio_producto)}</div></div>
                                <div class="detail-item"><div class="detail-label">Personalización</div><div class="detail-value">${money(p.precio_person)}</div></div>
                                <div class="detail-item"><div class="detail-label">Envío</div><div class="detail-value">${money(p.precio_envio)}</div></div>
                                <div class="detail-item"><div class="detail-label">Total Cliente</div><div class="detail-value" style="font-weight:700;color:#2F5496;">${money(p.precio_total)}</div></div>
                            </div>
                            <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e0e0e0;">
                                <div style="font-size:.85em;font-weight:600;color:#666;margin-bottom:8px;">Costos</div>
                                <div class="detail-grid">
                                    <div class="detail-item"><div class="detail-label">Costo Prenda</div><div class="detail-value">${money(p.costo_producto)}</div></div>
                                    <div class="detail-item"><div class="detail-label">Mano de Obra</div><div class="detail-value">${money(p.costo_mano_obra)}</div></div>
                                    ${p.costos_adicionales > 0 ? `<div class="detail-item"><div class="detail-label">Costos Adicionales</div><div class="detail-value">${money(p.costos_adicionales)}</div></div>` : ''}
                                    <div class="detail-item"><div class="detail-label">Costo Total</div><div class="detail-value" style="font-weight:600;">${money(p.costo_total)}</div></div>
                                </div>
                            </div>
                            <div style="margin-top:12px;padding:12px;background:${p.ganancia >= 0 ? '#f0fff4' : '#fff5f5'};border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-weight:600;">Ganancia Neta</span>
                                <span style="font-size:1.3em;font-weight:700;color:${p.ganancia >= 0 ? '#28a745' : '#dc3545'};">${money(p.ganancia)}</span>
                                ${p.precio_total > 0 ? `<span style="font-weight:600;color:#6f42c1;">${(p.ganancia / p.precio_total * 100).toFixed(1)}%</span>` : ''}
                            </div>
                        </div>

                        <div class="detail-section">
                            <div class="section-title"><i class="fas fa-calendar"></i> Fechas</div>
                            <div class="detail-grid">
                                <div class="detail-item"><div class="detail-label">Pago</div><div class="detail-value">${val(p.fecha_pago)}</div></div>
                                <div class="detail-item"><div class="detail-label">Compromiso</div><div class="detail-value">${val(p.fecha_compromiso)}</div></div>
                                <div class="detail-item"><div class="detail-label">Entrega Real</div><div class="detail-value">${val(p.fecha_entrega_real)}</div></div>
                                <div class="detail-item"><div class="detail-label">Retraso</div><div class="detail-value" style="${p.dias_retraso > 0 ? 'color:#dc3545;font-weight:700' : ''}">${p.dias_retraso > 0 ? p.dias_retraso + ' días' : 'Sin retraso'}</div></div>
                            </div>
                        </div>

                        <!-- ADJUNTOS -->
                        <div class="detail-section">
                            <div class="section-title"><i class="fas fa-paperclip"></i> Adjuntos</div>
                            <div id="adjuntosLista" style="margin-bottom:12px;"><em style="color:#999;">Cargando...</em></div>
                            <div style="display:flex;gap:8px;align-items:center;">
                                <input type="file" id="adjuntoInput" style="display:none;" multiple>
                                <button class="btn-modal btn-primary" style="font-size:.85em;padding:8px 14px;" id="btnAddFile"><i class="fas fa-upload"></i> Subir archivo</button>
                                <span id="adjuntoStatus" style="font-size:.82em;color:#666;"></span>
                            </div>
                        </div>

                        <!-- COMENTARIOS -->
                        <div class="detail-section">
                            <div class="section-title"><i class="fas fa-comments"></i> Comentarios</div>
                            <div id="comentariosLista" style="margin-bottom:12px;"><em style="color:#999;">Cargando...</em></div>
                            <div style="display:flex;gap:8px;">
                                <input id="nuevoComentario" class="form-control" placeholder="Escribe un comentario..." style="flex:1;">
                                <button class="btn-modal btn-primary" style="padding:8px 16px;" id="btnAddComment"><i class="fas fa-paper-plane"></i></button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-modal btn-secondary" data-close>Cerrar</button>
                        <button class="btn-modal btn-primary" data-edit><i class="fas fa-edit"></i> Editar</button>
                    </div>
                </div>`;

                this.modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeModal(this.modal));
                this.modal.querySelector('[data-edit]').onclick = () => { closeModal(this.modal); editarPedidoModal.open(id); };

                // --- Load comments ---
                this._loadComentarios(id);

                // --- Add comment ---
                document.getElementById('btnAddComment').onclick = async () => {
                    const input = document.getElementById('nuevoComentario');
                    const texto = input.value.trim();
                    if (!texto) return;
                    input.disabled = true;
                    try {
                        await api.crearComentario(id, texto);
                        input.value = '';
                        this._loadComentarios(id);
                    } catch (e) {
                        showNotification(e.message, 'error');
                    }
                    input.disabled = false;
                };

                // Enter key to submit
                document.getElementById('nuevoComentario').addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') document.getElementById('btnAddComment').click();
                });

                // --- Load attachments ---
                this._loadAdjuntos(id);

                // --- Upload file ---
                document.getElementById('btnAddFile').onclick = () => document.getElementById('adjuntoInput').click();
                document.getElementById('adjuntoInput').onchange = async (e) => {
                    const files = e.target.files;
                    if (!files.length) return;
                    const status = document.getElementById('adjuntoStatus');
                    for (const file of files) {
                        status.textContent = `Subiendo ${file.name}...`;
                        try {
                            await api.subirAdjunto(id, file);
                        } catch (err) {
                            showNotification(`Error subiendo ${file.name}: ${err.message}`, 'error');
                        }
                    }
                    status.textContent = '';
                    e.target.value = '';
                    this._loadAdjuntos(id);
                };
            } catch (e) {
                this.modal.innerHTML = `<div class="modal-content"><div class="modal-body"><p style="color:#dc3545;">Error: ${esc(e.message)}</p></div><div class="modal-footer"><button class="btn-modal btn-secondary" data-close>Cerrar</button></div></div>`;
                this.modal.querySelector('[data-close]').onclick = () => closeModal(this.modal);
            }
        }

        async _loadComentarios(pedidoId) {
            const container = document.getElementById('comentariosLista');
            if (!container) return;
            try {
                const comentarios = await api.getComentarios(pedidoId);
                if (!comentarios || comentarios.length === 0) {
                    container.innerHTML = '<p style="color:#999;font-size:.9em;">Sin comentarios</p>';
                    return;
                }
                container.innerHTML = comentarios.map(c => {
                    const fecha = c.created_at ? new Date(c.created_at).toLocaleString('es-DO', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
                    return `<div style="padding:10px 12px;background:#f8f9fa;border-radius:8px;margin-bottom:8px;border-left:3px solid #2F5496;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                            <span style="font-weight:600;font-size:.85em;color:#2F5496;">${esc(c.autor_nombre)}</span>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="font-size:.75em;color:#999;">${fecha}</span>
                                <button onclick="eliminarComentarioUI('${c.id}','${pedidoId}')" style="background:none;border:none;cursor:pointer;color:#dc3545;font-size:.8em;" title="Eliminar"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                        <div style="font-size:.9em;">${esc(c.texto)}</div>
                    </div>`;
                }).join('');
            } catch (e) {
                container.innerHTML = '<p style="color:#dc3545;font-size:.85em;">Error cargando comentarios</p>';
            }
        }

        async _loadAdjuntos(pedidoId) {
            const container = document.getElementById('adjuntosLista');
            if (!container) return;
            try {
                const adjuntos = await api.getAdjuntos(pedidoId);
                if (!adjuntos || adjuntos.length === 0) {
                    container.innerHTML = '<p style="color:#999;font-size:.9em;">Sin adjuntos</p>';
                    return;
                }
                const iconMap = {
                    'image': 'fa-image', 'video': 'fa-video', 'audio': 'fa-music',
                    'application/pdf': 'fa-file-pdf', 'text': 'fa-file-alt'
                };
                function fileIcon(mime) {
                    if (!mime) return 'fa-file';
                    for (const [k, v] of Object.entries(iconMap)) { if (mime.includes(k)) return v; }
                    return 'fa-file';
                }
                function fileSize(bytes) {
                    if (!bytes) return '';
                    if (bytes < 1024) return bytes + ' B';
                    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
                    return (bytes / 1048576).toFixed(1) + ' MB';
                }

                container.innerHTML = adjuntos.map(a => {
                    const fecha = a.created_at ? new Date(a.created_at).toLocaleString('es-DO', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
                    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f8f9fa;border-radius:8px;margin-bottom:6px;">
                        <i class="fas ${fileIcon(a.tipo_mime)}" style="font-size:1.2em;color:#2F5496;width:20px;text-align:center;"></i>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:.88em;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(a.nombre_original)}</div>
                            <div style="font-size:.75em;color:#999;">${fileSize(a.tamano_bytes)} · ${esc(a.subido_por_nombre)} · ${fecha}</div>
                        </div>
                        <button onclick="descargarAdjuntoUI('${a.id}')" style="background:none;border:none;cursor:pointer;color:#2F5496;font-size:1em;" title="Descargar"><i class="fas fa-download"></i></button>
                        <button onclick="eliminarAdjuntoUI('${a.id}','${pedidoId}')" style="background:none;border:none;cursor:pointer;color:#dc3545;font-size:.9em;" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </div>`;
                }).join('');
            } catch (e) {
                container.innerHTML = '<p style="color:#dc3545;font-size:.85em;">Error cargando adjuntos</p>';
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
            this.modal.innerHTML = '<div class="modal-content" style="max-width:660px;"><div class="modal-body" style="text-align:center;padding:40px;"><div class="loading-spinner" style="width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #2F5496;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 12px;"></div><p>Cargando...</p></div></div>';
            modalManager.open(this.modal);

            try {
                const p = await api.getPedido(id);
                if (!p) return;

                const estadosProd = ['En Producción', 'Listo para Envío', 'En Camino', 'Entregado', 'Bloqueado - Sin Dirección', 'Cancelado'];
                const estadosPago = ['Recibido', 'Pendiente', 'Parcial', 'Reembolsado'];
                const bancos = ['Popular', 'Banreservas', 'BHD', 'Efectivo', 'Transferencia'];
                const canales = ['WhatsApp', 'Instagram', 'Facebook', 'Referido', 'Tienda'];

                this.modal.innerHTML = `
                <div class="modal-content" style="max-width:660px;">
                    <div class="modal-header">
                        <h2 class="modal-title"><i class="fas fa-edit"></i> Editar ${esc(id)}</h2>
                        <button class="modal-close" data-close><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <div id="editError" style="display:none;padding:12px;background:#f8d7da;color:#721c24;border-radius:8px;margin-bottom:16px;"></div>
                        <form id="editForm">
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                                <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Estado Producción</label><select name="estatus_produccion" class="form-control">${selectOpts(estadosProd, p.estatus_produccion)}</select></div>
                                <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Estado Pago</label><select name="estatus_pago" class="form-control">${selectOpts(estadosPago, p.estatus_pago)}</select></div>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                                <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Cliente</label><input name="cliente" class="form-control" value="${esc(p.cliente)}"></div>
                                <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Teléfono</label><input name="telefono" class="form-control" value="${esc(p.telefono)}"></div>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                                <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Email <span style="color:#999;font-weight:400;">(opcional)</span></label><input name="email" class="form-control" value="${esc(p.email || '')}" placeholder="No requerido"></div>
                                <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Color</label><input name="color" class="form-control" value="${esc(p.color || '')}" placeholder="Ej: Negro, Blanco, Rojo"></div>
                            </div>
                            <div style="margin-bottom:14px;"><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Dirección</label><textarea name="direccion" class="form-control" rows="2">${esc(p.direccion || '')}</textarea></div>
                            <div style="margin-bottom:14px;"><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Detalles Personalización</label><textarea name="personalizacion" class="form-control" rows="2" placeholder="Detalles del bordado/diseño...">${esc(p.personalizacion || '')}</textarea></div>
                            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px;">
                                <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Precio Venta (RD$)</label><input name="precio_producto" type="number" step="0.01" class="form-control" value="${p.precio_producto || 0}"></div>
                                <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Costos Adicionales</label><input name="costos_adicionales" type="number" step="0.01" class="form-control" value="${p.costos_adicionales || 0}"></div>
                                <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Envío</label><input name="precio_envio" type="number" step="0.01" class="form-control" value="${p.precio_envio || 0}"></div>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                                <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Método Pago</label><select name="banco" class="form-control">${selectOpts(bancos, p.banco)}</select></div>
                                <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Canal</label><select name="canal" class="form-control">${selectOpts(canales, p.canal)}</select></div>
                            </div>
                            <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Fecha Entrega Real</label><input type="date" name="fecha_entrega_real" class="form-control" value="${ddmmToIso(p.fecha_entrega_real)}"></div>
                        </form>

                        <!-- ADJUNTOS en edición -->
                        <div style="margin-top:20px;padding-top:16px;border-top:2px solid #e0e0e0;">
                            <div style="font-size:1em;font-weight:600;color:#333;margin-bottom:10px;display:flex;align-items:center;gap:8px;"><i class="fas fa-paperclip" style="color:#2F5496;"></i> Adjuntos</div>
                            <div id="editAdjuntosLista" style="margin-bottom:10px;"><em style="color:#999;font-size:.9em;">Cargando...</em></div>
                            <div style="display:flex;gap:8px;align-items:center;">
                                <input type="file" id="editAdjuntoInput" style="display:none;" multiple>
                                <button type="button" class="btn-modal btn-primary" style="font-size:.82em;padding:6px 12px;" id="btnEditAddFile"><i class="fas fa-upload"></i> Subir</button>
                                <span id="editAdjuntoStatus" style="font-size:.8em;color:#666;"></span>
                            </div>
                        </div>

                        <!-- COMENTARIOS en edición -->
                        <div style="margin-top:16px;padding-top:16px;border-top:2px solid #e0e0e0;">
                            <div style="font-size:1em;font-weight:600;color:#333;margin-bottom:10px;display:flex;align-items:center;gap:8px;"><i class="fas fa-comments" style="color:#2F5496;"></i> Comentarios</div>
                            <div id="editComentariosLista" style="margin-bottom:10px;"><em style="color:#999;font-size:.9em;">Cargando...</em></div>
                            <div style="display:flex;gap:8px;">
                                <input id="editNuevoComentario" class="form-control" placeholder="Escribe un comentario..." style="flex:1;padding:8px 12px;font-size:.9em;">
                                <button type="button" class="btn-modal btn-primary" style="padding:8px 14px;" id="btnEditAddComment"><i class="fas fa-paper-plane"></i></button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-modal btn-secondary" data-close>Cancelar</button>
                        <button class="btn-modal btn-success" id="btnSaveEdit"><i class="fas fa-save"></i> Guardar</button>
                    </div>
                </div>`;

                this.modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeModal(this.modal));

                // --- Load comments and attachments ---
                this._loadComentarios(id);
                this._loadAdjuntos(id);

                // --- Add comment ---
                document.getElementById('btnEditAddComment').onclick = async () => {
                    const input = document.getElementById('editNuevoComentario');
                    const texto = input.value.trim();
                    if (!texto) return;
                    input.disabled = true;
                    try {
                        await api.crearComentario(id, texto);
                        input.value = '';
                        this._loadComentarios(id);
                    } catch (e) { showNotification(e.message, 'error'); }
                    input.disabled = false;
                };
                document.getElementById('editNuevoComentario').addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') document.getElementById('btnEditAddComment').click();
                });

                // --- Upload file ---
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

                // --- Save form ---
                document.getElementById('btnSaveEdit').onclick = async () => {
                    const btn = document.getElementById('btnSaveEdit');
                    // Disable IMMEDIATELY to prevent double-click
                    if (btn.disabled) return;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                    document.getElementById('editError').style.display = 'none';

                    const form = document.getElementById('editForm');
                    const fd = new FormData(form);
                    const obj = {};

                    // Include ALL fields, even empty ones (so backend can clear values)
                    for (const [k, v] of fd.entries()) {
                        obj[k] = v.trim();
                    }

                    // Convert date from ISO to DD/MM/YYYY for backend
                    if (obj.fecha_entrega_real) {
                        obj.fecha_entrega_real = isoToDdmm(obj.fecha_entrega_real);
                    }

                    try {
                        const res = await api.updatePedido(id, obj);
                        if (res && res.success) {
                            closeModal(this.modal);
                            showNotification('Pedido actualizado', 'success');
                            await cargarPedidos();
                            // Highlight updated row
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
                        btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
                    }
                };
            } catch (e) {
                this.modal.innerHTML = `<div class="modal-content"><div class="modal-body"><p style="color:#dc3545;">Error: ${esc(e.message)}</p></div></div>`;
            }
        }

        async _loadComentarios(pedidoId) {
            const container = document.getElementById('editComentariosLista');
            if (!container) return;
            try {
                const comentarios = await api.getComentarios(pedidoId);
                if (!comentarios || comentarios.length === 0) { container.innerHTML = '<p style="color:#999;font-size:.85em;">Sin comentarios</p>'; return; }
                container.innerHTML = comentarios.map(c => {
                    const fecha = c.created_at ? new Date(c.created_at).toLocaleString('es-DO', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
                    return `<div style="padding:8px 10px;background:#f8f9fa;border-radius:6px;margin-bottom:6px;border-left:3px solid #2F5496;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                            <span style="font-weight:600;font-size:.82em;color:#2F5496;">${esc(c.autor_nombre)}</span>
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:.72em;color:#999;">${fecha}</span>
                                <button onclick="eliminarComentarioEditUI('${c.id}','${pedidoId}')" style="background:none;border:none;cursor:pointer;color:#dc3545;font-size:.75em;" title="Eliminar"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                        <div style="font-size:.85em;">${esc(c.texto)}</div>
                    </div>`;
                }).join('');
            } catch (e) { container.innerHTML = '<p style="color:#dc3545;font-size:.82em;">Error cargando comentarios</p>'; }
        }

        async _loadAdjuntos(pedidoId) {
            const container = document.getElementById('editAdjuntosLista');
            if (!container) return;
            try {
                const adjuntos = await api.getAdjuntos(pedidoId);
                if (!adjuntos || adjuntos.length === 0) { container.innerHTML = '<p style="color:#999;font-size:.85em;">Sin adjuntos</p>'; return; }
                function fileIcon(mime) {
                    if (!mime) return 'fa-file';
                    if (mime.includes('image')) return 'fa-image';
                    if (mime.includes('pdf')) return 'fa-file-pdf';
                    if (mime.includes('video')) return 'fa-video';
                    return 'fa-file';
                }
                function fileSize(b) { if (!b) return ''; if (b < 1024) return b+' B'; if (b < 1048576) return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(1)+' MB'; }
                container.innerHTML = adjuntos.map(a => `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:#f8f9fa;border-radius:6px;margin-bottom:4px;">
                    <i class="fas ${fileIcon(a.tipo_mime)}" style="color:#2F5496;width:16px;text-align:center;"></i>
                    <div style="flex:1;min-width:0;"><div style="font-size:.82em;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(a.nombre_original)}</div><div style="font-size:.72em;color:#999;">${fileSize(a.tamano_bytes)}</div></div>
                    <button onclick="descargarAdjuntoUI('${a.id}')" style="background:none;border:none;cursor:pointer;color:#2F5496;font-size:.9em;" title="Descargar"><i class="fas fa-download"></i></button>
                    <button onclick="eliminarAdjuntoEditUI('${a.id}','${pedidoId}')" style="background:none;border:none;cursor:pointer;color:#dc3545;font-size:.8em;" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>`).join('');
            } catch (e) { container.innerHTML = '<p style="color:#dc3545;font-size:.82em;">Error cargando adjuntos</p>'; }
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
            this.modal.innerHTML = '<div class="modal-content" style="max-width:480px;"><div class="modal-body" style="text-align:center;padding:40px;"><div class="loading-spinner" style="width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #dc3545;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 12px;"></div><p>Cargando...</p></div></div>';
            modalManager.open(this.modal);

            try {
                const p = await api.getPedido(id);
                if (!p) return;

                this.modal.innerHTML = `
                <div class="modal-content" style="max-width:480px;">
                    <div class="modal-header" style="border-bottom-color:#f8d7da;">
                        <h2 class="modal-title" style="color:#dc3545;"><i class="fas fa-exclamation-triangle"></i> Eliminar Pedido</h2>
                        <button class="modal-close" data-close><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body" style="text-align:center;">
                        <div style="width:60px;height:60px;background:#f8d7da;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                            <i class="fas fa-trash" style="font-size:1.5em;color:#dc3545;"></i>
                        </div>
                        <p style="margin-bottom:16px;">¿Estás seguro de eliminar este pedido?<br><strong>Esta acción no se puede deshacer.</strong></p>
                        <table style="width:100%;text-align:left;font-size:.9em;border-collapse:collapse;">
                            <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;color:#666;">Pedido</td><td style="padding:8px;font-weight:600;">${esc(p.id)}</td></tr>
                            <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;color:#666;">Cliente</td><td style="padding:8px;">${esc(p.cliente)}</td></tr>
                            <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;color:#666;">Producto</td><td style="padding:8px;">${esc(p.producto)}</td></tr>
                            <tr><td style="padding:8px;color:#666;">Total</td><td style="padding:8px;font-weight:700;">${money(p.precio_total)}</td></tr>
                        </table>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-modal btn-secondary" data-close>Cancelar</button>
                        <button class="btn-modal btn-danger" id="btnConfirmDelete"><i class="fas fa-trash"></i> Eliminar</button>
                    </div>
                </div>`;

                this.modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeModal(this.modal));

                document.getElementById('btnConfirmDelete').onclick = async () => {
                    const btn = document.getElementById('btnConfirmDelete');
                    if (btn.disabled) return;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

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
                        btn.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
                    }
                };
            } catch (e) {
                closeModal(this.modal);
                showNotification(e.message, 'error');
            }
        }
    }

    // ===== TOAST NOTIFICATIONS (stacking) =====

    window.showNotification = function (message, type = 'info', duration = 3000) {
        const colors = { success: '#28a745', error: '#dc3545', info: '#2F5496', warning: '#ffc107' };
        const icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle', warning: 'exclamation-triangle' };

        // Ensure stacking container exists
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10000;display:flex;flex-direction:column-reverse;gap:8px;max-width:400px;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.style.cssText = `padding:14px 20px;background:white;border-left:4px solid ${colors[type]};border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);display:flex;align-items:center;gap:10px;font-size:.95em;animation:slideUp .3s ease;`;
        toast.innerHTML = `<i class="fas fa-${icons[type]}" style="color:${colors[type]};font-size:1.2em;flex-shrink:0;"></i><span>${message}</span>`;
        container.appendChild(toast);

        // Max 4 visible toasts
        while (container.children.length > 4) {
            container.removeChild(container.firstChild);
        }

        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, duration);
    };

    // ===== INIT =====

    let verPedidoModal, editarPedidoModal, eliminarPedidoModal;

    document.addEventListener('DOMContentLoaded', () => {
        modalManager = new ModalManager();
        verPedidoModal = new VerPedidoModal();
        editarPedidoModal = new EditarPedidoModal();
        eliminarPedidoModal = new EliminarPedidoModal();

        window.abrirDetallesPedido = (id) => verPedidoModal.open(id);
        window.abrirEdicionPedido = (id) => editarPedidoModal.open(id);
        window.abrirEliminarPedido = (id) => eliminarPedidoModal.open(id);

        // Global helpers for comments/attachments - VER modal
        window.eliminarComentarioUI = async (commentId, pedidoId) => {
            if (!confirm('¿Eliminar este comentario?')) return;
            try {
                await api.eliminarComentario(commentId);
                verPedidoModal._loadComentarios(pedidoId);
                showNotification('Comentario eliminado', 'success');
            } catch (e) {
                showNotification(e.message, 'error');
            }
        };

        window.descargarAdjuntoUI = async (adjuntoId) => {
            try {
                const res = await api.getAdjuntoUrl(adjuntoId);
                if (res && res.url) {
                    const a = document.createElement('a');
                    a.href = res.url;
                    a.target = '_blank';
                    a.download = res.nombre || 'archivo';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                } else {
                    showNotification('No se pudo obtener la URL', 'error');
                }
            } catch (e) {
                showNotification(e.message, 'error');
            }
        };

        window.eliminarAdjuntoUI = async (adjuntoId, pedidoId) => {
            if (!confirm('¿Eliminar este archivo?')) return;
            try {
                await api.eliminarAdjunto(adjuntoId);
                verPedidoModal._loadAdjuntos(pedidoId);
                showNotification('Archivo eliminado', 'success');
            } catch (e) {
                showNotification(e.message, 'error');
            }
        };

        // Global helpers - EDITAR modal
        window.eliminarComentarioEditUI = async (commentId, pedidoId) => {
            if (!confirm('¿Eliminar este comentario?')) return;
            try {
                await api.eliminarComentario(commentId);
                editarPedidoModal._loadComentarios(pedidoId);
                showNotification('Comentario eliminado', 'success');
            } catch (e) { showNotification(e.message, 'error'); }
        };

        window.eliminarAdjuntoEditUI = async (adjuntoId, pedidoId) => {
            if (!confirm('¿Eliminar este archivo?')) return;
            try {
                await api.eliminarAdjunto(adjuntoId);
                editarPedidoModal._loadAdjuntos(pedidoId);
                showNotification('Archivo eliminado', 'success');
            } catch (e) { showNotification(e.message, 'error'); }
        };
    });
})();
