/**
 * SHOGUN — Parámetros Module v5.0
 * Gestión de Productos, Categorías y Personalizaciones
 * Apple HIG: ModalManager integration, keyboard nav, contextual empty states
 */

let productosCache = [];
let categoriasCache = [];
let personalizacionesCache = [];
let paramTabActivo = 'productos';

// ═══════════════════════════════════════════════════════════════
// MODAL HELPER — Uses the global ModalManager from modals.js
// ═══════════════════════════════════════════════════════════════

function paramOpenModal(modal) {
    // Prefer the global ModalManager (created by modals.js on DOMContentLoaded)
    if (typeof window.showConfirm === 'function') {
        // ModalManager is initialised — grab it via the overlay it owns
        const overlay = document.querySelector('.modal-overlay');
        if (overlay && overlay._modalManager) {
            overlay._modalManager.open(modal);
            return;
        }
    }
    // Fallback: lightweight manual open (same visual result)
    const overlay = document.querySelector('.modal-overlay') || (() => {
        const ov = document.createElement('div');
        ov.className = 'modal-overlay';
        document.body.appendChild(ov);
        return ov;
    })();
    overlay.classList.add('active');
    modal.classList.add('active');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    document.body.classList.add('modal-open');
    overlay.onclick = () => paramCloseModal(modal);
    // Auto-focus first input
    requestAnimationFrame(() => {
        const first = modal.querySelector('input, select, textarea');
        if (first) first.focus();
    });
}

function paramCloseModal(modal) {
    modal.classList.add('closing');
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.classList.add('closing');
    const onEnd = () => {
        modal.classList.remove('active', 'closing');
        if (overlay) overlay.classList.remove('active', 'closing');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        modal.remove();
    };
    modal.addEventListener('animationend', onEnd, { once: true });
    setTimeout(onEnd, 350);
}

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('parametros-section')) return;

    // Tab listeners
    document.querySelectorAll('.param-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            cambiarTabParametros(tab.dataset.paramTab);
        });
    });

    // Event delegation for param card actions
    document.getElementById('parametros-section').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        switch (action) {
            case 'editar-producto': editarProducto(id); break;
            case 'toggle-producto': toggleProducto(id, btn.dataset.activo === 'true'); break;
            case 'editar-categoria': editarCategoria(id); break;
            case 'toggle-categoria': toggleCategoria(id, btn.dataset.activo === 'true'); break;
            case 'editar-personalizacion': editarPersonalizacion(id); break;
            case 'toggle-personalizacion': togglePersonalizacion(id, btn.dataset.activo === 'true'); break;
        }
    });

    // Keyboard navigation for param cards
    document.getElementById('parametros-section').addEventListener('keydown', (e) => {
        const card = e.target.closest('.param-card');
        if (!card) return;
        const grid = card.closest('.param-grid');
        if (!grid) return;
        const cards = [...grid.querySelectorAll('.param-card')];
        const idx = cards.indexOf(card);

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const next = cards[idx + 1];
            if (next) next.focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = cards[idx - 1];
            if (prev) prev.focus();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const editBtn = card.querySelector('[data-action^="editar"]');
            if (editBtn) editBtn.click();
        }
    });

    // Escape to close param modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.querySelector('.modal.active');
            if (modal && modal.closest('body')) paramCloseModal(modal);
        }
    });
});

function cambiarTabParametros(tipo) {
    paramTabActivo = tipo;

    document.querySelectorAll('.param-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.paramTab === tipo);
    });

    document.querySelectorAll('.param-content').forEach(content => {
        content.classList.toggle('active', content.dataset.paramContent === tipo);
    });

    if (tipo === 'productos') cargarProductos();
    else if (tipo === 'categorias') cargarCategorias();
    else if (tipo === 'personalizaciones') cargarPersonalizaciones();
}

// ═══════════════════════════════════════════════════════════════
// CONTEXTUAL EMPTY STATE SVGs
// ═══════════════════════════════════════════════════════════════

function emptyProductosSVG() {
    return `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="16" y="20" width="48" height="40" rx="6" stroke="var(--text-quaternary)" stroke-width="2" fill="none"/>
        <path d="M16 32h48" stroke="var(--text-quaternary)" stroke-width="2"/>
        <circle cx="40" cy="46" r="8" stroke="var(--text-quaternary)" stroke-width="2" stroke-dasharray="4 3" fill="none"/>
        <path d="M37 46h6M40 43v6" stroke="var(--text-quaternary)" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
}

function emptyCategoriasSVG() {
    return `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="22" width="24" height="16" rx="4" stroke="var(--text-quaternary)" stroke-width="2" fill="none"/>
        <rect x="44" y="22" width="24" height="16" rx="4" stroke="var(--text-quaternary)" stroke-width="2" fill="none"/>
        <rect x="28" y="44" width="24" height="16" rx="4" stroke="var(--text-quaternary)" stroke-width="2" fill="none"/>
        <circle cx="24" cy="30" r="2" fill="var(--text-quaternary)"/>
        <circle cx="56" cy="30" r="2" fill="var(--text-quaternary)"/>
        <circle cx="40" cy="52" r="2" fill="var(--text-quaternary)"/>
    </svg>`;
}

function emptyPersonalizacionesSVG() {
    return `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="20" stroke="var(--text-quaternary)" stroke-width="2" fill="none"/>
        <path d="M30 38c3-6 14-6 20 0" stroke="var(--text-quaternary)" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path d="M32 44c2 4 12 4 16 0" stroke="var(--text-quaternary)" stroke-width="2" stroke-linecap="round" fill="none"/>
        <circle cx="36" cy="34" r="1.5" fill="var(--text-quaternary)"/>
        <circle cx="44" cy="34" r="1.5" fill="var(--text-quaternary)"/>
    </svg>`;
}

function emptySearchSVG() {
    return `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="35" cy="35" r="16" stroke="var(--text-quaternary)" stroke-width="2" fill="none"/>
        <path d="M47 47l12 12" stroke="var(--text-quaternary)" stroke-width="2" stroke-linecap="round"/>
        <path d="M29 35h12M35 29v12" stroke="var(--text-quaternary)" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    </svg>`;
}

function emptyErrorSVG() {
    return `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="20" stroke="var(--danger)" stroke-width="2" fill="none" opacity="0.5"/>
        <path d="M40 30v14" stroke="var(--danger)" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="40" cy="50" r="2" fill="var(--danger)"/>
    </svg>`;
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTOS
// ═══════════════════════════════════════════════════════════════

async function cargarProductos() {
    const container = document.getElementById('productos-grid');
    if (!container) return;

    container.innerHTML = renderParamSkeleton(6);

    try {
        productosCache = await api.getProductos(true) || [];
        renderProductos(productosCache);
    } catch (error) {
        console.error('Error cargando productos:', error);
        container.innerHTML = renderParamError('Error al cargar productos');
    }
}

function renderProductos(productos) {
    const container = document.getElementById('productos-grid');
    if (!container) return;

    if (!productos || !productos.length) {
        container.innerHTML = renderParamEmpty(emptyProductosSVG(), 'No hay productos registrados', 'Crea tu primer producto para comenzar');
        return;
    }

    container.innerHTML = productos.map(p => `
        <div class="param-card ${p.activo === false ? 'inactive' : ''}" data-producto-id="${p.id}" tabindex="0">
            <div class="param-name">${esc(p.nombre)}</div>
            <div class="param-meta">
                <div><strong>SKU:</strong> ${esc(p.sku)}</div>
                <div><strong>Precio:</strong> ${formatearMoneda(p.precio_base)}</div>
                <div><strong>Costo:</strong> ${formatearMoneda(p.costo_material)}</div>
                <div><strong>Producción:</strong> ${p.tiempo_produccion_dias || 7} días</div>
                <div><strong>Stock:</strong> ${p.stock || 0} unidades</div>
            </div>
            <div class="param-actions">
                <button class="btn btn-sm btn-secondary" data-action="editar-producto" data-id="${p.id}">
                    <i class="fas fa-pen-to-square"></i> Editar
                </button>
                <button class="btn btn-sm ${p.activo === false ? 'btn-success' : 'btn-danger'}" data-action="toggle-producto" data-id="${p.id}" data-activo="${p.activo !== false}">
                    <i class="fas ${p.activo === false ? 'fa-circle-check' : 'fa-circle-pause'}"></i> ${p.activo === false ? 'Activar' : 'Desactivar'}
                </button>
            </div>
        </div>
    `).join('');
}

async function toggleProducto(id, activo) {
    try {
        await api.toggleProducto(id, !activo);
        showNotification(`Producto ${!activo ? 'activado' : 'desactivado'}`, 'success');
        cargarProductos();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function editarProducto(id) {
    const producto = productosCache.find(p => p.id === id);
    if (!producto) return;
    abrirModalProducto(producto);
}

function nuevoProducto() {
    abrirModalProducto(null);
}

function abrirModalProducto(producto) {
    const isEdit = !!producto;
    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.innerHTML = `
        <div class="modal-content modal-md">
            <div class="modal-header">
                <h2 class="modal-title">${isEdit ? 'Editar' : 'Nuevo'} Producto</h2>
                <button class="modal-close" data-close aria-label="Cerrar"><i class="fas fa-xmark"></i></button>
            </div>
            <div class="modal-body">
                <div id="productoError" class="modal-alert alert-danger" style="display:none;"></div>
                <form id="productoForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Nombre <span class="required">*</span></label>
                            <input type="text" name="nombre" class="form-control" value="${esc(producto?.nombre || '')}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">SKU <span class="required">*</span></label>
                            <input type="text" name="sku" class="form-control" value="${esc(producto?.sku || '')}" required ${isEdit ? 'readonly' : ''}>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Precio Base (RD$) <span class="required">*</span></label>
                            <input type="number" name="precio_base" class="form-control" value="${producto?.precio_base || ''}" min="0" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Costo Material (RD$)</label>
                            <input type="number" name="costo_material" class="form-control" value="${producto?.costo_material || '0'}" min="0" step="0.01">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Tiempo Producción (días)</label>
                            <input type="number" name="tiempo_produccion_dias" class="form-control" value="${producto?.tiempo_produccion_dias || '7'}" min="1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Stock</label>
                            <input type="number" name="stock" class="form-control" value="${producto?.stock || '0'}" min="0">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descripción</label>
                        <textarea name="descripcion" class="form-control" rows="2">${esc(producto?.descripcion || '')}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" data-close>Cancelar</button>
                <button class="btn btn-primary" id="btnSaveProducto">
                    <i class="fas fa-check"></i> Guardar cambios
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    paramOpenModal(modal);

    // Close handlers
    modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => paramCloseModal(modal));

    document.getElementById('btnSaveProducto').onclick = async () => {
        const btn = document.getElementById('btnSaveProducto');
        const errorDiv = document.getElementById('productoError');
        const form = document.getElementById('productoForm');

        if (!form.checkValidity()) { form.reportValidity(); return; }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...';
        errorDiv.style.display = 'none';

        const formData = new FormData(form);
        const data = {
            nombre: formData.get('nombre').trim(),
            sku: formData.get('sku').trim(),
            precio_base: parseFloat(formData.get('precio_base')) || 0,
            costo_material: parseFloat(formData.get('costo_material')) || 0,
            tiempo_produccion_dias: parseInt(formData.get('tiempo_produccion_dias')) || 7,
            stock: parseInt(formData.get('stock')) || 0,
            descripcion: formData.get('descripcion').trim()
        };

        try {
            if (isEdit) {
                await api.updateProducto(producto.id, data);
                showNotification('Producto actualizado', 'success');
            } else {
                await api.createProducto(data);
                showNotification('Producto creado', 'success');
            }
            paramCloseModal(modal);
            cargarProductos();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'flex';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Guardar cambios';
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// CATEGORÍAS
// ═══════════════════════════════════════════════════════════════

async function cargarCategorias() {
    const container = document.getElementById('categorias-grid');
    if (!container) return;

    container.innerHTML = renderParamSkeleton(4);

    try {
        categoriasCache = await api.getCategorias(true) || [];
        renderCategorias(categoriasCache);
    } catch (error) {
        console.error('Error cargando categorías:', error);
        container.innerHTML = renderParamError('Error al cargar categorias');
    }
}

function renderCategorias(categorias) {
    const container = document.getElementById('categorias-grid');
    if (!container) return;

    if (!categorias || !categorias.length) {
        container.innerHTML = renderParamEmpty(emptyCategoriasSVG(), 'No hay categorias registradas', 'Organiza tus productos con categorias');
        return;
    }

    container.innerHTML = categorias.map(c => `
        <div class="param-card ${c.activo === false ? 'inactive' : ''}" data-categoria-id="${c.id}" tabindex="0">
            <div class="param-name">${esc(c.nombre)}</div>
            <div class="param-meta">
                <div><strong>Código:</strong> ${esc(c.codigo)}</div>
                <div>${c.descripcion || 'Sin descripción'}</div>
            </div>
            <div class="param-actions">
                <button class="btn btn-sm btn-secondary" data-action="editar-categoria" data-id="${c.id}">
                    <i class="fas fa-pen-to-square"></i> Editar
                </button>
                <button class="btn btn-sm ${c.activo === false ? 'btn-success' : 'btn-danger'}" data-action="toggle-categoria" data-id="${c.id}" data-activo="${c.activo !== false}">
                    <i class="fas ${c.activo === false ? 'fa-circle-check' : 'fa-circle-pause'}"></i> ${c.activo === false ? 'Activar' : 'Desactivar'}
                </button>
            </div>
        </div>
    `).join('');
}

async function toggleCategoria(id, activo) {
    try {
        await api.toggleCategoria(id, !activo);
        showNotification(`Categoría ${!activo ? 'activada' : 'desactivada'}`, 'success');
        cargarCategorias();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function editarCategoria(id) {
    const categoria = categoriasCache.find(c => c.id === id);
    if (!categoria) return;
    abrirModalCategoria(categoria);
}

function nuevaCategoria() {
    abrirModalCategoria(null);
}

function abrirModalCategoria(categoria) {
    const isEdit = !!categoria;
    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.innerHTML = `
        <div class="modal-content modal-sm">
            <div class="modal-header">
                <h2 class="modal-title">${isEdit ? 'Editar' : 'Nueva'} Categoría</h2>
                <button class="modal-close" data-close aria-label="Cerrar"><i class="fas fa-xmark"></i></button>
            </div>
            <div class="modal-body">
                <div id="categoriaError" class="modal-alert alert-danger" style="display:none;"></div>
                <form id="categoriaForm">
                    <div class="form-group">
                        <label class="form-label">Nombre <span class="required">*</span></label>
                        <input type="text" name="nombre" class="form-control" value="${esc(categoria?.nombre || '')}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Código <span class="required">*</span></label>
                        <input type="text" name="codigo" class="form-control" value="${esc(categoria?.codigo || '')}" required ${isEdit ? 'readonly' : ''}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descripción</label>
                        <textarea name="descripcion" class="form-control" rows="2">${esc(categoria?.descripcion || '')}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" data-close>Cancelar</button>
                <button class="btn btn-primary" id="btnSaveCategoria">
                    <i class="fas fa-check"></i> Guardar cambios
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    paramOpenModal(modal);

    modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => paramCloseModal(modal));

    document.getElementById('btnSaveCategoria').onclick = async () => {
        const btn = document.getElementById('btnSaveCategoria');
        const errorDiv = document.getElementById('categoriaError');
        const form = document.getElementById('categoriaForm');

        if (!form.checkValidity()) { form.reportValidity(); return; }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...';
        errorDiv.style.display = 'none';

        const formData = new FormData(form);
        const data = {
            nombre: formData.get('nombre').trim(),
            codigo: formData.get('codigo').trim(),
            descripcion: formData.get('descripcion').trim()
        };

        try {
            if (isEdit) {
                await api.updateCategoria(categoria.id, data);
                showNotification('Categoría actualizada', 'success');
            } else {
                await api.createCategoria(data);
                showNotification('Categoría creada', 'success');
            }
            paramCloseModal(modal);
            cargarCategorias();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'flex';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Guardar cambios';
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// PERSONALIZACIONES
// ═══════════════════════════════════════════════════════════════

async function cargarPersonalizaciones() {
    const container = document.getElementById('personalizaciones-grid');
    if (!container) return;

    container.innerHTML = renderParamSkeleton(4);

    try {
        personalizacionesCache = await api.getPersonalizaciones(true) || [];
        renderPersonalizaciones(personalizacionesCache);
    } catch (error) {
        console.error('Error cargando personalizaciones:', error);
        container.innerHTML = renderParamError('Error al cargar personalizaciones');
    }
}

function renderPersonalizaciones(personalizaciones) {
    const container = document.getElementById('personalizaciones-grid');
    if (!container) return;

    if (!personalizaciones || !personalizaciones.length) {
        container.innerHTML = renderParamEmpty(emptyPersonalizacionesSVG(), 'No hay personalizaciones registradas', 'Agrega opciones de personalizacion');
        return;
    }

    container.innerHTML = personalizaciones.map(p => {
        const esPuntadas = p.metodo_calculo === 'puntadas';
        return `
        <div class="param-card ${p.activo === false ? 'inactive' : ''}" data-personalizacion-id="${p.id}" tabindex="0">
            <div class="param-name">${esc(p.tipo)}</div>
            <div class="param-meta">
                <div><strong>Código:</strong> ${esc(p.codigo)}</div>
                <div><strong>Método:</strong> ${esPuntadas ? 'Por puntadas' : 'Precio fijo'}</div>
                ${esPuntadas
                    ? `<div><strong>Costo/1K puntadas:</strong> ${formatearMoneda(p.costo_por_mil_puntadas)}</div>`
                    : `<div><strong>Precio:</strong> ${formatearMoneda(p.precio)}</div>`
                }
            </div>
            <div class="param-actions">
                <button class="btn btn-sm btn-secondary" data-action="editar-personalizacion" data-id="${p.id}">
                    <i class="fas fa-pen-to-square"></i> Editar
                </button>
                <button class="btn btn-sm ${p.activo === false ? 'btn-success' : 'btn-danger'}" data-action="toggle-personalizacion" data-id="${p.id}" data-activo="${p.activo !== false}">
                    <i class="fas ${p.activo === false ? 'fa-circle-check' : 'fa-circle-pause'}"></i> ${p.activo === false ? 'Activar' : 'Desactivar'}
                </button>
            </div>
        </div>
    `}).join('');
}

async function togglePersonalizacion(id, activo) {
    try {
        await api.togglePersonalizacion(id, !activo);
        showNotification(`Personalización ${!activo ? 'activada' : 'desactivada'}`, 'success');
        cargarPersonalizaciones();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function editarPersonalizacion(id) {
    const personalizacion = personalizacionesCache.find(p => p.id === id);
    if (!personalizacion) return;
    abrirModalPersonalizacion(personalizacion);
}

function nuevaPersonalizacion() {
    abrirModalPersonalizacion(null);
}

function abrirModalPersonalizacion(personalizacion) {
    const isEdit = !!personalizacion;
    const modal = document.createElement('div');
    modal.className = 'modal';

    const esPuntadas = personalizacion?.metodo_calculo === 'puntadas';

    modal.innerHTML = `
        <div class="modal-content modal-md">
            <div class="modal-header">
                <h2 class="modal-title">${isEdit ? 'Editar' : 'Nueva'} Personalización</h2>
                <button class="modal-close" data-close aria-label="Cerrar"><i class="fas fa-xmark"></i></button>
            </div>
            <div class="modal-body">
                <div id="personalizacionError" class="modal-alert alert-danger" style="display:none;"></div>
                <form id="personalizacionForm">
                    <div class="form-group">
                        <label class="form-label">Tipo/Nombre <span class="required">*</span></label>
                        <input type="text" name="tipo" class="form-control" value="${esc(personalizacion?.tipo || '')}" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Código <span class="required">*</span></label>
                            <input type="text" name="codigo" class="form-control" value="${esc(personalizacion?.codigo || '')}" required ${isEdit ? 'readonly' : ''}>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Método de Cálculo</label>
                            <select name="metodo_calculo" class="form-control" id="metodoCalculo">
                                <option value="fijo" ${!esPuntadas ? 'selected' : ''}>Precio Fijo</option>
                                <option value="puntadas" ${esPuntadas ? 'selected' : ''}>Por Puntadas</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row" id="precioFijoRow" style="${esPuntadas ? 'display:none;' : ''}">
                        <div class="form-group">
                            <label class="form-label">Precio (RD$)</label>
                            <input type="number" name="precio" class="form-control" value="${personalizacion?.precio || '0'}" min="0" step="0.01">
                        </div>
                    </div>
                    <div class="form-row" id="puntadasRow" style="${!esPuntadas ? 'display:none;' : ''}">
                        <div class="form-group">
                            <label class="form-label">Costo por 1K puntadas (RD$)</label>
                            <input type="number" name="costo_por_mil_puntadas" class="form-control" value="${personalizacion?.costo_por_mil_puntadas || '0'}" min="0" step="0.01">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" data-close>Cancelar</button>
                <button class="btn btn-primary" id="btnSavePersonalizacion">
                    <i class="fas fa-check"></i> Guardar cambios
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    paramOpenModal(modal);

    // Toggle between calculation methods
    const metodoSelect = document.getElementById('metodoCalculo');
    metodoSelect.onchange = () => {
        const esPunt = metodoSelect.value === 'puntadas';
        document.getElementById('precioFijoRow').style.display = esPunt ? 'none' : 'flex';
        document.getElementById('puntadasRow').style.display = esPunt ? 'flex' : 'none';
    };

    modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => paramCloseModal(modal));

    document.getElementById('btnSavePersonalizacion').onclick = async () => {
        const btn = document.getElementById('btnSavePersonalizacion');
        const errorDiv = document.getElementById('personalizacionError');
        const form = document.getElementById('personalizacionForm');

        if (!form.checkValidity()) { form.reportValidity(); return; }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...';
        errorDiv.style.display = 'none';

        const formData = new FormData(form);
        const metodo = formData.get('metodo_calculo');
        const data = {
            tipo: formData.get('tipo').trim(),
            codigo: formData.get('codigo').trim(),
            metodo_calculo: metodo,
            precio: metodo === 'fijo' ? (parseFloat(formData.get('precio')) || 0) : 0,
            costo_por_mil_puntadas: metodo === 'puntadas' ? (parseFloat(formData.get('costo_por_mil_puntadas')) || 0) : 0
        };

        try {
            if (isEdit) {
                await api.updatePersonalizacion(personalizacion.id, data);
                showNotification('Personalización actualizada', 'success');
            } else {
                await api.createPersonalizacion(data);
                showNotification('Personalización creada', 'success');
            }
            paramCloseModal(modal);
            cargarPersonalizaciones();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'flex';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Guardar cambios';
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

function esc(s) {
    return s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderParamSkeleton(count) {
    return Array.from({ length: count }, (_, i) => `
        <div class="param-card skeleton-card" style="animation-delay:${i * 0.08}s;">
            <div class="skeleton skeleton-text skeleton-text-60"></div>
            <div class="skeleton skeleton-text skeleton-text-80"></div>
            <div class="skeleton skeleton-text skeleton-text-50"></div>
        </div>
    `).join('');
}

function renderParamEmpty(svgHtml, title, subtitle) {
    return `
        <div class="empty-state grid-full-span">
            ${svgHtml}
            <h3>${title}</h3>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
    `;
}

function renderParamError(mensaje) {
    return `
        <div class="empty-state empty-state-error grid-full-span">
            ${emptyErrorSVG()}
            <h3>${mensaje}</h3>
            <p>Intenta recargar la página</p>
        </div>
    `;
}
