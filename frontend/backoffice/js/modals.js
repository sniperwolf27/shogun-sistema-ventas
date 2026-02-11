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
                                <div class="detail-item"><div class="detail-label">Personalización</div><div class="detail-value">${val(p.personalizacion)}</div></div>
                            </div>
                        </div>

                        <div class="detail-section">
                            <div class="section-title"><i class="fas fa-dollar-sign"></i> Financiero</div>
                            <div class="detail-grid">
                                <div class="detail-item"><div class="detail-label">Producto</div><div class="detail-value">${money(p.precio_producto)}</div></div>
                                <div class="detail-item"><div class="detail-label">Personalización</div><div class="detail-value">${money(p.precio_person)}</div></div>
                                <div class="detail-item"><div class="detail-label">Envío</div><div class="detail-value">${money(p.precio_envio)}</div></div>
                                <div class="detail-item"><div class="detail-label">Ganancia</div><div class="detail-value" style="color:#28a745;font-weight:700;">${money(p.ganancia)}</div></div>
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
                    </div>
                    <div class="modal-footer">
                        <button class="btn-modal btn-secondary" data-close>Cerrar</button>
                        <button class="btn-modal btn-primary" data-edit><i class="fas fa-edit"></i> Editar</button>
                    </div>
                </div>`;

                this.modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeModal(this.modal));
                this.modal.querySelector('[data-edit]').onclick = () => { closeModal(this.modal); editarPedidoModal.open(id); };
            } catch (e) {
                this.modal.innerHTML = `<div class="modal-content"><div class="modal-body"><p style="color:#dc3545;">Error: ${esc(e.message)}</p></div><div class="modal-footer"><button class="btn-modal btn-secondary" data-close>Cerrar</button></div></div>`;
                this.modal.querySelector('[data-close]').onclick = () => closeModal(this.modal);
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
                                <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Email</label><input name="email" class="form-control" value="${esc(p.email || '')}"></div>
                                <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Método Pago</label><select name="banco" class="form-control">${selectOpts(bancos, p.banco)}</select></div>
                            </div>
                            <div style="margin-bottom:14px;"><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Dirección</label><textarea name="direccion" class="form-control" rows="2">${esc(p.direccion || '')}</textarea></div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                                <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Canal</label><select name="canal" class="form-control">${selectOpts(canales, p.canal)}</select></div>
                                <div><label style="display:block;font-size:.82em;font-weight:600;color:#555;margin-bottom:4px;">Fecha Entrega Real</label><input type="date" name="fecha_entrega_real" class="form-control" value="${ddmmToIso(p.fecha_entrega_real)}"></div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-modal btn-secondary" data-close>Cancelar</button>
                        <button class="btn-modal btn-success" id="btnSaveEdit"><i class="fas fa-save"></i> Guardar</button>
                    </div>
                </div>`;

                this.modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeModal(this.modal));

                document.getElementById('btnSaveEdit').onclick = async () => {
                    const fd = new FormData(document.getElementById('editForm'));
                    const obj = {};
                    for (const [k, v] of fd.entries()) {
                        if (v.trim()) obj[k] = v.trim();
                    }
                    if (obj.fecha_entrega_real) obj.fecha_entrega_real = isoToDdmm(obj.fecha_entrega_real);

                    const btn = document.getElementById('btnSaveEdit');
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

                    try {
                        const res = await api.updatePedido(id, obj);
                        if (res && res.success) {
                            closeModal(this.modal);
                            showNotification('Pedido actualizado', 'success');
                            await cargarPedidos();
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

    // ===== TOAST NOTIFICATIONS =====

    window.showNotification = function (message, type = 'info', duration = 3000) {
        const colors = { success: '#28a745', error: '#dc3545', info: '#2F5496', warning: '#ffc107' };
        const icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle', warning: 'exclamation-triangle' };

        const toast = document.createElement('div');
        toast.style.cssText = `position:fixed;bottom:20px;right:20px;padding:14px 20px;background:white;border-left:4px solid ${colors[type]};border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);display:flex;align-items:center;gap:10px;z-index:10000;font-size:.95em;animation:slideUp .3s ease;max-width:400px;`;
        toast.innerHTML = `<i class="fas fa-${icons[type]}" style="color:${colors[type]};font-size:1.2em;"></i><span>${message}</span>`;
        document.body.appendChild(toast);

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
    });
})();
