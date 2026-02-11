/**
 * UTILIDADES GLOBALES
 * Funciones helper reutilizables
 */

/**
 * Formatear nÃºmeros como moneda
 */
function formatearMoneda(valor) {
    if (!valor && valor !== 0) return 'RD$0';
    
    const numero = parseFloat(valor);
    
    if (isNaN(numero)) return 'RD$0';
    
    return 'RD$' + numero.toLocaleString('es-DO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

/**
 * Obtener badge HTML para estados
 */
function getEstadoBadge(estado) {
    const colores = {
        'Recibido': 'success',
        'Entregado': 'success',
        'En Camino': 'info',
        'Listo para EnvÃ­o': 'warning',
        'En ProducciÃ³n': 'primary',
        'Pendiente': 'warning',
        'Parcial': 'warning',
        'Bloqueado - Sin DirecciÃ³n': 'danger',
        'Bloqueado': 'danger',
        'Cancelado': 'danger',
        'Reembolsado': 'danger'
    };
    
    const color = colores[estado] || 'secondary';
    
    return `<span class="badge badge-${color}">${estado}</span>`;
}

/**
 * Formatear fecha DD/MM/YYYY
 */
function formatearFecha(fecha) {
    if (!fecha) return '-';
    
    if (fecha === 'Pendiente') return 'Pendiente';
    
    // Si ya viene en formato DD/MM/YYYY, retornarla
    if (typeof fecha === 'string' && fecha.includes('/')) {
        return fecha;
    }
    
    // Si es objeto Date
    if (fecha instanceof Date) {
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const anio = fecha.getFullYear();
        return `${dia}/${mes}/${anio}`;
    }
    
    return fecha;
}

/**
 * Calcular dÃ­as entre dos fechas
 */
function calcularDias(fecha1, fecha2) {
    const f1 = new Date(fecha1);
    const f2 = new Date(fecha2);
    
    const diferencia = Math.abs(f2 - f1);
    const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
    
    return dias;
}

/**
 * Validar email
 */
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validar telÃ©fono dominicano
 */
function validarTelefono(telefono) {
    // Formato: 809-555-0000 o 8095550000
    const regex = /^(809|829|849)[-\s]?\d{3}[-\s]?\d{4}$/;
    return regex.test(telefono);
}

/**
 * Sanitizar texto (prevenir XSS)
 */
function sanitizarTexto(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

/**
 * Debounce para bÃºsquedas
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Mostrar loading spinner
 */
function showLoading(show = true) {
    let spinner = document.getElementById('loading-spinner');
    
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'loading-spinner';
        spinner.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            ">
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                ">
                    <div style="
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #2F5496;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 15px;
                    "></div>
                    <p style="margin: 0; color: #666;">Cargando...</p>
                </div>
            </div>
        `;
        document.body.appendChild(spinner);
        
        // Agregar animaciÃ³n
        if (!document.getElementById('spinner-animation')) {
            const style = document.createElement('style');
            style.id = 'spinner-animation';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    spinner.style.display = show ? 'block' : 'none';
}

/**
 * Confirmar acciÃ³n
 */
function confirmar(mensaje, callback) {
    if (confirm(mensaje)) {
        callback();
    }
}

/**
 * Copiar al portapapeles
 */
async function copiarAlPortapapeles(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        showNotification('Copiado al portapapeles', 'success', 2000);
    } catch (err) {
        console.error('Error al copiar:', err);
        showNotification('Error al copiar', 'error');
    }
}

/**
 * Descargar como archivo
 */
function descargarArchivo(contenido, nombreArchivo, tipo = 'text/plain') {
    const blob = new Blob([contenido], { type: tipo });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
