let currentUser = null;
let selectedFacturaId = null;
let selectedChipNombre = 'Energía eléctrica';

function $(id) { return document.getElementById(id); }

function showRegister(e) { e && e.preventDefault(); $('login-form').style.display = 'none'; $('register-form').style.display = 'block'; }
function showLogin(e) { e && e.preventDefault(); $('register-form').style.display = 'none'; $('login-form').style.display = 'block'; }

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red');
  return data;
}

async function doRegister() {
  const nombre = $('reg-nombre').value.trim();
  const email = $('reg-email').value.trim();
  const password = $('reg-password').value;
  $('register-error').textContent = '';
  if (!nombre || !email || !password) { $('register-error').textContent = 'Completa todos los campos'; return; }
  try {
    const user = await api('/auth/registro', { method: 'POST', body: JSON.stringify({ nombre, email, password }) });
    currentUser = user;
    enterApp();
  } catch (err) { $('register-error').textContent = err.message; }
}

async function doLogin() {
  const email = $('login-email').value.trim();
  const password = $('login-password').value;
  $('login-error').textContent = '';
  try {
    const user = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    currentUser = user;
    enterApp();
  } catch (err) { $('login-error').textContent = err.message; }
}

async function doLogout() {
  await api('/auth/logout', { method: 'POST' });
  currentUser = null;
  $('app-shell').style.display = 'none';
  $('register-form').style.display = 'none';
  $('login-form').style.display = 'block';
  $('login-email').value = '';
  $('login-password').value = '';
  $('login-error').textContent = '';
  $('auth-screen').style.display = 'flex';
}

function enterApp() {
  $('auth-screen').style.display = 'none';
  $('app-shell').style.display = 'flex';
  $('user-name').textContent = currentUser.nombre;
  $('user-avatar').textContent = currentUser.nombre.slice(0, 2).toUpperCase();
  $('cuenta-email').textContent = currentUser.email;
  $('page-sub').textContent = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  loadFacturas();
  loadHogar();
  loadConfig();
}

function nav(id, el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  $('panel-' + id).classList.add('active');
  const titles = { dashboard: 'Panel principal', facturas: 'Facturas', historial: 'Historial de pagos', config: 'Configuración' };
  $('page-title').textContent = titles[id];
  if (id === 'historial') loadHistorial();
  if (id === 'config') { loadConfig(); loadHogar(); }
}

function fmtMoney(n) { return '$' + Number(n).toLocaleString('es-CO'); }
function fmtDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }); }

function iconFor(nombre) {
  const n = (nombre || '').toLowerCase();
  if (n.includes('energ') || n.includes('luz')) return 'ti-bolt';
  if (n.includes('agua') || n.includes('acueducto')) return 'ti-droplet';
  if (n.includes('gas')) return 'ti-flame';
  if (n.includes('internet') || n.includes('wifi')) return 'ti-wifi';
  if (n.includes('móvil') || n.includes('movil') || n.includes('tel')) return 'ti-device-mobile';
  if (n.includes('tv') || n.includes('cable')) return 'ti-device-tv';
  if (n.includes('seguro')) return 'ti-shield';
  return 'ti-file-invoice';
}

function diasParaVencer(fecha) {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const venc = new Date(fecha + 'T00:00:00');
  return Math.round((venc - hoy) / (1000 * 60 * 60 * 24));
}

function billItemHTML(f) {
  return `<div class="bill-item" onclick="openDetail(${f.id})">
    <div class="bill-icon"><i class="ti ${iconFor(f.nombre_servicio)}"></i></div>
    <div class="bill-info">
      <div class="bill-name">${f.nombre_servicio}</div>
      <div class="bill-meta">${f.empresa || 'Sin empresa'} &middot; ${f.estado === 'pagada' ? 'Pagada' : 'Vence ' + fmtDate(f.fecha_vencimiento)}</div>
    </div>
    <div class="bill-right">
      <div class="bill-amount">${fmtMoney(f.valor_estimado)}</div>
      <div class="badge badge-${f.estado}">${f.estado.charAt(0).toUpperCase() + f.estado.slice(1)}</div>
    </div>
  </div>`;
}

async function loadFacturas() {
  try {
    const { facturas, resumen } = await api('/facturas');
    const statsHTML = `
      <div class="stat-card"><div class="stat-label">Total mes</div><div class="stat-num" style="color:var(--brand)">${fmtMoney(resumen.total)}</div></div>
      <div class="stat-card"><div class="stat-label">Pagadas</div><div class="stat-num" style="color:var(--green)">${resumen.pagadas}</div></div>
      <div class="stat-card"><div class="stat-label">Pendientes</div><div class="stat-num" style="color:var(--amber)">${resumen.pendientes}</div></div>
      <div class="stat-card"><div class="stat-label">Vencidas</div><div class="stat-num" style="color:var(--red)">${resumen.vencidas}</div></div>
    `;
    $('stats-row').innerHTML = statsHTML;
    $('stats-row-facturas').innerHTML = `
      <div class="stat-card"><div class="stat-label">Pendientes</div><div class="stat-num" style="color:var(--amber)">${resumen.pendientes}</div></div>
      <div class="stat-card"><div class="stat-label">Vencidas</div><div class="stat-num" style="color:var(--red)">${resumen.vencidas}</div></div>
      <div class="stat-card"><div class="stat-label">Pagadas</div><div class="stat-num" style="color:var(--green)">${resumen.pagadas}</div></div>
    `;
    const pendientes = facturas.filter(f => f.estado !== 'pagada');
    const pagadas = facturas.filter(f => f.estado === 'pagada');
    $('list-pendientes').innerHTML = pendientes.length ? pendientes.map(billItemHTML).join('') : '<div class="empty-msg">No tienes facturas pendientes</div>';
    $('list-pagadas').innerHTML = pagadas.length ? pagadas.map(billItemHTML).join('') : '<div class="empty-msg">Aún no hay facturas pagadas este mes</div>';
    $('list-todas').innerHTML = facturas.length ? facturas.map(billItemHTML).join('') : '<div class="empty-msg">No hay facturas registradas</div>';
  } catch (err) { console.error(err); }
}

async function loadHistorial() {
  try {
    const pagos = await api('/facturas/historial/pagos');
    $('list-historial').innerHTML = pagos.length
      ? pagos.map(p => `<div class="bill-item" style="cursor:default">
          <div class="bill-icon" style="background:var(--green-lt);color:var(--green)"><i class="ti ti-check"></i></div>
          <div class="bill-info"><div class="bill-name">${p.nombre_servicio}</div><div class="bill-meta">${p.empresa || ''} &middot; Pagado el ${fmtDate(p.fecha_pago.slice(0,10))}</div></div>
          <div class="bill-right"><div class="bill-amount" style="color:var(--green)">${fmtMoney(p.valor_pagado)}</div></div>
        </div>`).join('')
      : '<div class="empty-msg">Aún no hay pagos registrados</div>';
    if (pagos.length) {
      const total = pagos.reduce((s, p) => s + p.valor_pagado, 0);
      $('total-historial').style.display = 'flex';
      $('total-historial-val').textContent = fmtMoney(total);
    } else {
      $('total-historial').style.display = 'none';
    }
  } catch (err) { console.error(err); }
}

// ── CONFIGURACIÓN / ALERTAS (RF-04) ──
async function loadConfig() {
  try {
    const config = await api('/config');
    setToggleState('toggle-3dias', config.alerta_3_dias);
    setToggleState('toggle-1dia', config.alerta_1_dia);
    setToggleState('toggle-vencimiento', config.alerta_vencimiento);
    setToggleState('toggle-correo', config.notificar_correo);
  } catch (err) { console.error(err); }
}

function setToggleState(id, value) {
  const el = $(id);
  if (!el) return;
  el.classList.toggle('on', !!value);
}

async function toggleAlerta(el, campo) {
  const nuevoValor = !el.classList.contains('on');
  el.classList.toggle('on', nuevoValor);
  try {
    await api('/config', { method: 'PUT', body: JSON.stringify({ [campo]: nuevoValor }) });
  } catch (err) {
    el.classList.toggle('on', !nuevoValor);
    console.error(err);
  }
}

// ── HOGAR (RF-08) ──
async function loadHogar() {
  try {
    const hogar = await api('/hogar');
    $('hogar-nombre').textContent = hogar.nombre;
    $('hogar-miembros-count').textContent = `${hogar.miembros.length} miembro${hogar.miembros.length !== 1 ? 's' : ''} activo${hogar.miembros.length !== 1 ? 's' : ''}`;
    $('lista-miembros').innerHTML = hogar.miembros.map(m => `
      <div class="config-item">
        <div><div class="ci-title">${m.nombre}</div><div class="ci-sub">${m.email} &middot; ${m.rol === 'admin' ? 'Administrador' : 'Miembro'}</div></div>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

async function editarHogar() {
  const nombreActual = $('hogar-nombre').textContent;
  const nuevoNombre = prompt('Nuevo nombre del hogar:', nombreActual);
  if (!nuevoNombre || nuevoNombre.trim() === '') return;
  try {
    await api('/hogar', { method: 'PUT', body: JSON.stringify({ nombre: nuevoNombre.trim() }) });
    loadHogar();
  } catch (err) { alert(err.message); }
}

async function invitarMiembro() {
  const email = prompt('Correo del usuario a invitar (debe estar registrado en PagaYa):');
  if (!email) return;
  try {
    const r = await api('/hogar/invitar', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
    alert(`${r.nombre} fue agregado al hogar`);
    loadHogar();
  } catch (err) { alert(err.message); }
}

// ── MODAL NUEVA FACTURA ──
function openModal() {
  $('new-error').textContent = '';
  ['new-empresa','new-valor','new-fecha','new-ref'].forEach(id => $(id).value = '');
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('sel'));
  const first = document.querySelector('.chip');
  first.classList.add('sel');
  selectedChipNombre = first.dataset.nombre;
  $('modal-new').classList.add('open');
}
function closeModal() { $('modal-new').classList.remove('open'); }
function selChip(el) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  selectedChipNombre = el.dataset.nombre;
}

async function saveFactura() {
  const empresa = $('new-empresa').value.trim();
  const valor_estimado = parseFloat($('new-valor').value);
  const fecha_vencimiento = $('new-fecha').value;
  const referencia_pago = $('new-ref').value.trim();
  $('new-error').textContent = '';
  if (!valor_estimado || !fecha_vencimiento) {
    $('new-error').textContent = 'Completa al menos el valor y la fecha de vencimiento';
    return;
  }
  try {
    await api('/facturas', { method: 'POST', body: JSON.stringify({ nombre_servicio: selectedChipNombre, empresa, valor_estimado, fecha_vencimiento, referencia_pago }) });
    closeModal();
    loadFacturas();
  } catch (err) { $('new-error').textContent = err.message; }
}

// ── DETALLE DE FACTURA ──
async function openDetail(id) {
  try {
    const f = await api('/facturas/' + id);
    selectedFacturaId = id;
    $('d-svc').textContent = f.nombre_servicio;
    $('d-amount').textContent = fmtMoney(f.valor_estimado);
    $('d-date').textContent = 'Vence el ' + fmtDate(f.fecha_vencimiento);
    $('d-badge').textContent = f.estado.charAt(0).toUpperCase() + f.estado.slice(1);
    $('d-empresa').textContent = f.empresa || 'Sin especificar';
    $('d-ref').textContent = f.referencia_pago || 'Sin referencia';
    $('d-mes').textContent = new Date(f.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

    const alertBox = $('d-alert');
    if (f.estado === 'pendiente') {
      const dias = diasParaVencer(f.fecha_vencimiento);
      alertBox.style.display = 'flex';
      $('d-alert-txt').textContent = dias === 0 ? 'Vence hoy.' : dias > 0 ? `Vence en ${dias} día${dias !== 1 ? 's' : ''}.` : `Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}.`;
    } else if (f.estado === 'vencida') {
      const dias = Math.abs(diasParaVencer(f.fecha_vencimiento));
      alertBox.style.display = 'flex';
      $('d-alert-txt').textContent = `Venció hace ${dias} día${dias !== 1 ? 's' : ''}. ¡Paga cuanto antes!`;
    } else {
      alertBox.style.display = 'none';
    }

    const pagarBtn = $('d-pagar-btn');
    pagarBtn.style.display = f.estado === 'pagada' ? 'none' : 'flex';
    pagarBtn.onclick = () => marcarPagada(id);
    $('d-eliminar-btn').onclick = () => eliminarFactura(id);

    $('modal-detail').classList.add('open');
  } catch (err) { console.error(err); }
}
function closeDetail() { $('modal-detail').classList.remove('open'); }

async function marcarPagada(id) {
  try {
    await api('/facturas/' + id + '/pagar', { method: 'POST', body: JSON.stringify({}) });
    closeDetail();
    loadFacturas();
  } catch (err) { console.error(err); }
}

async function eliminarFactura(id) {
  if (!confirm('¿Eliminar esta factura?')) return;
  try {
    await api('/facturas/' + id, { method: 'DELETE' });
    closeDetail();
    loadFacturas();
  } catch (err) { console.error(err); }
}

(async function checkSession() {
  try {
    const user = await api('/auth/yo');
    currentUser = user;
    enterApp();
  } catch (err) {
    $('auth-screen').style.display = 'flex';
  }
})();
