/**
 * SHOGUN — Parámetros Module v4.0
 * Gestión de Productos, Categorías y Personalizaciones
 * Apple HIG: Claridad, Jerarquía, Consistencia
 */

let productosCache = [];
let categoriasCache = [];
let personalizacionesCache = [];
let paramTabActivo = 'productos';

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // Solo inicializar si estamos en la página de backoffice
    if (!document.getElementById('parametros-section')) return;

    // Event listeners para tabs de parámetros
    document.querySelectorAll('.param-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tipo = tab.dataset.paramTab;
            cambiarTabParametros(tipo);
        });
    });
});

function cambiarTabParametros(tipo) {
    paramTabActivo = tipo;

    // Actualizar tabs visuales
    document.querySelectorAll('.param-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.paramTab === tipo);
    });

    // Mostrar contenido correspondiente
    document.querySelectorAll('.param-content').forEach(content => {
        content.classList.toggle('active', content.dataset.paramContent === tipo);
    });

    // Cargar datos según el tab
    if (tipo === 'productos') cargarProductos();
    else if (tipo === 'categorias') cargarCategorias();
    else if (tipo === 'personalizaciones') cargarPersonalizaciones();
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
        container.innerHTML = renderParamEmpty('No hay productos registrados');
        return;
    }

    container.innerHTML = productos.map(p => `
        <div class="param-card ${p.activo === false ? 'inactive' : ''}" data-producto-id="${p.id}">
            <div class="param-name">${esc(p.nombre)}</div>
            <div class="param-meta">
                <div><strong>SKU:</strong> ${esc(p.sku)}</div>
                <div><strong>Precio:</strong> ${formatearMoneda(p.precio_base)}</div>
                <div><strong>Costo:</strong> ${formatearMoneda(p.costo_material)}</div>
                <div><strong>Producción:</strong> ${p.tiempo_produccion_dias || 7} días</div>
                <div><strong>Stock:</strong> ${p.stock || 0} unidades</div>
            </div>
            <div class="param-actions">
                <button class="btn btn-sm btn-secondary" onclick="editarProducto('${p.id}')">
                    <i class="fas fa-pen-to-square"></i> Editar
                </button>
                <button class="btn btn-sm ${p.activo === false ? 'btn-success' : 'btn-danger'}" onclick="toggleProducto('${p.id}', ${p.activo !== false})">
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
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', isEdit ? 'Editar producto' : 'Nuevo producto');

    modal.innerHTML = `
        <div class="modal-content" style="max-width:520px;">
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
                <button class="btn-modal btn-secondary" data-close>Cancelar</button>
                <button class="btn-modal btn-primary" id="btnSaveProducto">
                    <i class="fas fa-check"></i> Guardar cambios
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Mostrar modal
    const overlay = document.querySelector('.modal-overlay') || document.createElement('div');
    overlay.className = 'modal-overlay active';
    if (!document.querySelector('.modal-overlay')) document.body.appendChild(overlay);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Event listeners
    modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => cerrarModal(modal));
    overlay.onclick = () => cerrarModal(modal);

    document.getElementById('btnSaveProducto').onclick = async () => {
        const btn = document.getElementById('btnSaveProducto');
        const errorDiv = document.getElementById('productoError');
        const form = document.getElementById('productoForm');

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

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
            cerrarModal(modal);
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
        container.innerHTML = renderParamError('Error al cargar categorías');
    }
}

function renderCategorias(categorias) {
    const container = document.getElementById('categorias-grid');
    if (!container) return;

    if (!categorias || !categorias.length) {
        container.innerHTML = renderParamEmpty('No hay categorías registradas');
        return;
    }

    container.innerHTML = categorias.map(c => `
        <div class="param-card ${c.activo === false ? 'inactive' : ''}" data-categoria-id="${c.id}">
            <div class="param-name">${esc(c.nombre)}</div>
            <div class="param-meta">
                <div><strong>Código:</strong> ${esc(c.codigo)}</div>
                <div>${c.descripcion || 'Sin descripción'}</div>
            </div>
            <div class="param-actions">
                <button class="btn btn-sm btn-secondary" onclick="editarCategoria('${c.id}')">
                    <i class="fas fa-pen-to-square"></i> Editar
                </button>
                <button class="btn btn-sm ${c.activo === false ? 'btn-success' : 'btn-danger'}" onclick="toggleCategoria('${c.id}', ${c.activo !== false})">
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
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', isEdit ? 'Editar categoría' : 'Nueva categoría');

    modal.innerHTML = `
        <div class="modal-content" style="max-width:440px;">
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
                <button class="btn-modal btn-secondary" data-close>Cancelar</button>
                <button class="btn-modal btn-primary" id="btnSaveCategoria">
                    <i class="fas fa-check"></i> Guardar cambios
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const overlay = document.querySelector('.modal-overlay') || document.createElement('div');
    overlay.className = 'modal-overlay active';
    if (!document.querySelector('.modal-overlay')) document.body.appendChild(overlay);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => cerrarModal(modal));
    overlay.onclick = () => cerrarModal(modal);

    document.getElementById('btnSaveCategoria').onclick = async () => {
        const btn = document.getElementById('btnSaveCategoria');
        const errorDiv = document.getElementById('categoriaError');
        const form = document.getElementById('categoriaForm');

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

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
            cerrarModal(modal);
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
        container.innerHTML = renderParamEmpty('No hay personalizaciones registradas');
        return;
    }

    container.innerHTML = personalizaciones.map(p => {
        const esPuntadas = p.metodo_calculo === 'puntadas';
        return `
        <div class="param-card ${p.activo === false ? 'inactive' : ''}" data-personalizacion-id="${p.id}">
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
                <button class="btn btn-sm btn-secondary" onclick="editarPersonalizacion('${p.id}')">
                    <i class="fas fa-pen-to-square"></i> Editar
                </button>
                <button class="btn btn-sm ${p.activo === false ? 'btn-success' : 'btn-danger'}" onclick="togglePersonalizacion('${p.id}', ${p.activo !== false})">
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
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', isEdit ? 'Editar personalización' : 'Nueva personalización');

    const esPuntadas = personalizacion?.metodo_calculo === 'puntadas';

    modal.innerHTML = `
        <div class="modal-content" style="max-width:480px;">
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
                <button class="btn-modal btn-secondary" data-close>Cancelar</button>
                <button class="btn-modal btn-primary" id="btnSavePersonalizacion">
                    <i class="fas fa-check"></i> Guardar cambios
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const overlay = document.querySelector('.modal-overlay') || document.createElement('div');
    overlay.className = 'modal-overlay active';
    if (!document.querySelector('.modal-overlay')) document.body.appendChild(overlay);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Toggle entre métodos de cálculo
    const metodoSelect = document.getElementById('metodoCalculo');
    metodoSelect.onchange = () => {
        const esPunt = metodoSelect.value === 'puntadas';
        document.getElementById('precioFijoRow').style.display = esPunt ? 'none' : 'flex';
        document.getElementById('puntadasRow').style.display = esPunt ? 'flex' : 'none';
    };

    modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => cerrarModal(modal));
    overlay.onclick = () => cerrarModal(modal);

    document.getElementById('btnSavePersonalizacion').onclick = async () => {
        const btn = document.getElementById('btnSavePersonalizacion');
        const errorDiv = document.getElementById('personalizacionError');
        const form = document.getElementById('personalizacionForm');

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

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
            cerrarModal(modal);
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

function cerrarModal(modal) {
    modal.classList.remove('active');
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => modal.remove(), 300);
}

function esc(s) {
    return s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderParamSkeleton(count) {
    return Array.from({ length: count }, (_, i) => `
        <div class="param-card skeleton-card" style="animation-delay:${i * 0.08}s;">
            <div class="skeleton skeleton-text" style="width:60%;margin-bottom:12px;"></div>
            <div class="skeleton skeleton-text" style="width:80%;"></div>
            <div class="skeleton skeleton-text" style="width:50%;margin-top:8px;"></div>
        </div>
    `).join('');
}

function renderParamEmpty(mensaje) {
    return `
        <div class="empty-state" style="grid-column:1/-1;padding:48px;">
            ${emptyStateSVG()}
            <h3>${mensaje}</h3>
        </div>
    `;
}

function renderParamError(mensaje) {
    return `
        <div class="empty-state" style="grid-column:1/-1;padding:48px;color:var(--danger);">
            <i class="fas fa-circle-exclamation" style="font-size:48px;margin-bottom:16px;"></i>
            <h3>${mensaje}</h3>
        </div>
    `;
}
