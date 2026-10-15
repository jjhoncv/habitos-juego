/* Pintar (Ronda 4, PINTAR): una hoja en blanco con colores, como Paint, para dibujar con el dedo o el mouse.
   H.pintar.abrir({ titulo, fondo?, plantilla?, alGuardar(dataURL, dibujo) })
     - fondo: un dibujo anterior (dataURL) para seguir pintándolo, o un color ('#fff6dd').
     - plantilla: 'agua' | 'animales' | 'solar' (temas de la feria): líneas suaves para colorear.
   Guarda en progreso.dibujos = [{ id, titulo, fecha, dia, data (JPEG chico) }] (el más nuevo primero, máx. 10).
   También: la pestaña "Dibujos" del álbum (dibujosHTML) y el cuadro "Mi dibujo" del cuarto (textura, ponerEnCuarto). */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.progreso) return;
  const A = H.motor && H.motor.api;
  const $ = (s) => document.querySelector(s);
  const MAX = 10;
  const W = 800, Hh = 600;          // tamaño interno de la hoja (4:3)
  const GW = 480, GH = 360;         // tamaño guardado
  const COLORES = [
    ['#1d2340', 'Negro'], ['#de5546', 'Rojo'], ['#f39a3c', 'Naranja'], ['#f6d04d', 'Amarillo'],
    ['#5cbf6b', 'Verde'], ['#2a7d4f', 'Verde oscuro'], ['#4a9be0', 'Celeste'], ['#2f4fb5', 'Azul'],
    ['#8f73cf', 'Morado'], ['#f28fb3', 'Rosado'], ['#8a5a3b', 'Marrón'], ['#f1c29b', 'Piel'],
  ];
  const GROSORES = [[7, 'Delgado'], [16, 'Mediano'], [32, 'Grueso']];
  const sfx = (n) => { try { if (A) A.sfx(n); } catch (e) { /* sin sonido */ } };
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- la hoja
  document.body.insertAdjacentHTML('beforeend', `
<div class="pintar" id="pintar" hidden role="dialog" aria-labelledby="piTitulo">
  <div class="pi-cab">
    <h2 id="piTitulo">Mi dibujo</h2>
    <div class="pi-acc">
      <button type="button" class="pi-b" id="piDeshacer" aria-label="Deshacer"><span aria-hidden="true">↩️</span><span>Deshacer</span></button>
      <button type="button" class="pi-b" id="piNueva" aria-label="Hoja nueva"><span aria-hidden="true">📄</span><span>Hoja nueva</span></button>
      <button type="button" class="pi-b pi-guardar" id="piGuardar"><span aria-hidden="true">💾</span><span>Guardar</span></button>
      <button type="button" class="pi-b pi-cerrar" id="piCerrar" aria-label="Cerrar"><span aria-hidden="true">✕</span></button>
    </div>
  </div>
  <div class="pi-cuerpo">
    <div class="pi-mesa" id="piMesa"><div class="pi-hoja" id="piHoja">
      <canvas id="piBase" width="${W}" height="${Hh}"></canvas>
      <canvas id="piTrazo" width="${W}" height="${Hh}"></canvas>
    </div></div>
    <div class="pi-paleta" id="piPaleta" role="toolbar" aria-label="Colores y pinceles">
      <div class="pi-colores">${COLORES.map(([c, n], i) => `<button type="button" class="pi-color${i === 0 ? ' sel' : ''}" data-color="${c}" style="--c:${c}" aria-label="${n}" aria-pressed="${i === 0}"></button>`).join('')}</div>
      <div class="pi-pinceles">
        ${GROSORES.map(([g, n], i) => `<button type="button" class="pi-grosor${i === 1 ? ' sel' : ''}" data-grosor="${g}" aria-label="Pincel ${n.toLowerCase()}" aria-pressed="${i === 1}"><i style="--g:${Math.round(g * 0.7) + 4}px"></i></button>`).join('')}
        <button type="button" class="pi-borrador" id="piBorrador" aria-pressed="false" aria-label="Borrador"><span aria-hidden="true">🧽</span><span>Borrar</span></button>
      </div>
    </div>
  </div>
  <div class="pi-aviso" id="piAviso" hidden><div class="pi-aviso-caja">
    <p id="piAvisoTxt">¿Guardamos tu dibujo?</p>
    <div class="pi-aviso-b"><button type="button" class="pi-b pi-guardar" id="piAvisoSi">Sí, guardar</button><button type="button" class="pi-b" id="piAvisoNo">No, salir</button></div>
  </div></div>
  <div class="pi-listo" id="piListo" hidden>¡Dibujo guardado! 🎉</div>
</div>`);

  const base = $('#piBase'), trazo = $('#piTrazo');
  const gb = base.getContext('2d'), gt = trazo.getContext('2d');
  const E = { abierto: false, op: null, color: COLORES[0][0], grosor: 16, borrar: false, trazos: [], actual: null, fondoImg: null, sucio: false, puntero: null };

  // ---------- plantillas para colorear (líneas suaves)
  function plantilla(g, tipo) {
    g.save();
    g.strokeStyle = '#c3cbd9'; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
    const circ = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); };
    const linea = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
    const titulo = (t) => { g.fillStyle = '#c3cbd9'; g.font = 'bold 44px Trebuchet MS, sans-serif'; g.textAlign = 'center'; g.fillText(t, W / 2, 62); };
    if (tipo === 'agua') {
      titulo('El ciclo del agua');
      circ(120, 170, 55);                                                      // sol
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; linea([[120 + Math.cos(a) * 70, 170 + Math.sin(a) * 70], [120 + Math.cos(a) * 95, 170 + Math.sin(a) * 95]]); }
      [[520, 150, 45], [575, 130, 55], [635, 155, 45]].forEach(([x, y, r]) => circ(x, y, r));   // nube
      [[530, 240], [575, 270], [620, 235], [600, 320], [550, 330]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x, y - 16); g.quadraticCurveTo(x + 12, y + 4, x, y + 8); g.quadraticCurveTo(x - 12, y + 4, x, y - 16); g.stroke(); });   // gotas
      linea([[440, 470], [600, 330], [760, 470]]);                             // montaña
      g.beginPath(); g.moveTo(0, 480); for (let x = 0; x <= W; x += 40) g.quadraticCurveTo(x + 10, 465, x + 20, 480), g.quadraticCurveTo(x + 30, 495, x + 40, 480); g.stroke();   // mar
      g.setLineDash([14, 14]);
      g.beginPath(); g.moveTo(230, 450); g.quadraticCurveTo(260, 260, 440, 170); g.stroke();   // el agua sube
      g.setLineDash([]);
      linea([[425, 160], [445, 168], [432, 186]]);
    } else if (tipo === 'animales') {
      titulo('Animales del Perú');
      linea([[0, 430], [180, 250], [330, 400], [470, 230], [640, 420], [W, 330]]);   // la sierra
      g.beginPath(); g.ellipse(200, 470, 70, 40, 0, 0, Math.PI * 2); g.stroke();    // llama
      linea([[250, 450], [262, 360]]); circ(268, 345, 20);
      linea([[160, 505], [160, 555]]); linea([[240, 505], [240, 555]]);
      linea([[450, 140], [520, 160], [590, 140]]); circ(520, 158, 12);               // cóndor
      g.beginPath(); g.moveTo(560, 560); g.quadraticCurveTo(W / 2 + 200, 500, W, 540); g.stroke();   // río
      g.beginPath(); g.ellipse(650, 545, 50, 18, -0.2, 0, Math.PI * 2); g.stroke();  // delfín
    } else if (tipo === 'solar') {
      titulo('El sistema solar');
      circ(90, 330, 85);                                                       // sol
      [180, 250, 330, 420, 520, 620].forEach((r, i) => { g.beginPath(); g.arc(90, 330, r, -0.55, 0.55); g.stroke(); circ(90 + r, 330, [10, 16, 18, 14, 34, 28][i]); });
    }
    g.restore();
  }
  function pintarBase() {
    const op = E.op || {};
    gb.fillStyle = op.fondo && /^#/.test(op.fondo) ? op.fondo : '#ffffff';
    gb.fillRect(0, 0, W, Hh);
    if (op.plantilla) plantilla(gb, op.plantilla);
  }
  // ---------- los trazos (se guardan para poder deshacer)
  function trazar(g, t) {
    g.save();
    g.globalCompositeOperation = t.borrar ? 'destination-out' : 'source-over';
    g.strokeStyle = g.fillStyle = t.color; g.lineWidth = t.grosor; g.lineCap = 'round'; g.lineJoin = 'round';
    const p = t.puntos;
    if (p.length === 1) { g.beginPath(); g.arc(p[0][0], p[0][1], t.grosor / 2, 0, Math.PI * 2); g.fill(); }
    else { g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.stroke(); }
    g.restore();
  }
  function redibujar() {
    gt.clearRect(0, 0, W, Hh);
    if (E.fondoImg) gt.drawImage(E.fondoImg, 0, 0, W, Hh);
    E.trazos.forEach((t) => trazar(gt, t));
  }
  function punto(e) {
    const r = trazo.getBoundingClientRect();
    return [Math.round((e.clientX - r.left) * W / r.width), Math.round((e.clientY - r.top) * Hh / r.height)];
  }
  trazo.addEventListener('pointerdown', (e) => {
    if (E.puntero != null) return;           // un solo dedo a la vez
    e.preventDefault();
    E.puntero = e.pointerId;
    try { trazo.setPointerCapture(e.pointerId); } catch (x) { /* nada */ }
    E.actual = { color: E.color, grosor: E.borrar ? E.grosor * 1.6 : E.grosor, borrar: E.borrar, puntos: [punto(e)] };
    E.trazos.push(E.actual);
    trazar(gt, E.actual);
    E.sucio = true;
  });
  trazo.addEventListener('pointermove', (e) => {
    if (e.pointerId !== E.puntero || !E.actual) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    (evs.length ? evs : [e]).forEach((ev) => {
      const q = punto(ev), p = E.actual.puntos, u = p[p.length - 1];
      if (Math.abs(q[0] - u[0]) + Math.abs(q[1] - u[1]) < 2) return;
      p.push(q);
      trazar(gt, { color: E.actual.color, grosor: E.actual.grosor, borrar: E.actual.borrar, puntos: [u, q] });
    });
  });
  const soltar = (e) => { if (e.pointerId !== E.puntero) return; E.puntero = null; E.actual = null; };
  trazo.addEventListener('pointerup', soltar);
  trazo.addEventListener('pointercancel', soltar);
  trazo.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------- la paleta
  function marcar(sel, el) { document.querySelectorAll(sel).forEach((b) => { const on = b === el; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on); }); }
  $('#piPaleta').addEventListener('click', (e) => {
    const c = e.target.closest('[data-color]'), g = e.target.closest('[data-grosor]'), b = e.target.closest('#piBorrador');
    if (c) { E.color = c.dataset.color; E.borrar = false; marcar('.pi-color', c); $('#piBorrador').classList.remove('sel'); $('#piBorrador').setAttribute('aria-pressed', 'false'); $('#piHoja').style.setProperty('--pc', E.color); sfx('click'); }
    if (g) { E.grosor = Number(g.dataset.grosor); marcar('.pi-grosor', g); sfx('click'); }
    if (b) { E.borrar = !E.borrar; b.classList.toggle('sel', E.borrar); b.setAttribute('aria-pressed', E.borrar); if (E.borrar) marcar('.pi-color', null); else marcar('.pi-color', document.querySelector(`.pi-color[data-color="${E.color}"]`)); sfx('click'); }
    $('#pintar').classList.toggle('borrando', E.borrar);
  });
  function deshacer() { if (!E.trazos.length) return false; E.trazos.pop(); redibujar(); sfx('tic'); return true; }
  function hojaNueva() { E.trazos = []; E.fondoImg = null; E.sucio = false; redibujar(); sfx('abrir'); }
  $('#piDeshacer').addEventListener('click', deshacer);
  $('#piNueva').addEventListener('click', hojaNueva);
  $('#piGuardar').addEventListener('click', () => guardar());
  $('#piCerrar').addEventListener('click', () => intentarCerrar());
  $('#piAvisoSi').addEventListener('click', () => { $('#piAviso').hidden = true; guardar(); });
  $('#piAvisoNo').addEventListener('click', () => { $('#piAviso').hidden = true; cerrar(); });

  // ---------- abrir y cerrar
  function abrir(op) {
    op = Object.assign({ titulo: 'Mi dibujo' }, op || {});
    E.op = op; E.trazos = []; E.actual = null; E.puntero = null; E.fondoImg = null; E.sucio = false;
    $('#piTitulo').textContent = op.titulo;
    $('#piAviso').hidden = true; $('#piListo').hidden = true;
    pintarBase(); redibujar();
    if (op.fondo && /^data:image/.test(op.fondo)) {
      const img = new Image();
      img.onload = () => { if (E.op === op) { E.fondoImg = img; redibujar(); } };
      img.src = op.fondo;
    }
    E.abierto = true;
    $('#pintar').hidden = false;
    document.documentElement.classList.add('pintar-on');
    if (A) A.bloquear('pintar', true);
    sfx('abrir');
    if (A && A.evento) A.evento('pintar', { abierto: true, titulo: op.titulo });
    return true;
  }
  function cerrar() {
    if (!E.abierto) return;
    E.abierto = false;
    $('#pintar').hidden = true;
    document.documentElement.classList.remove('pintar-on');
    if (A) A.bloquear('pintar', false);
    const op = E.op; E.op = null;
    if (A && A.evento) A.evento('pintar', { abierto: false });
    if (op && typeof op.alCerrar === 'function') { try { op.alCerrar(); } catch (e) { console.warn('pintar.alCerrar', e); } }
  }
  function intentarCerrar() {
    if (E.sucio && E.trazos.length) { $('#piAviso').hidden = false; sfx('tic'); return; }
    cerrar();
  }

  // ---------- guardar
  const dibujos = () => { const d = H.progreso.cargar().dibujos; return Array.isArray(d) ? d : []; };
  function imagen() {
    const c = document.createElement('canvas'); c.width = GW; c.height = GH;
    const g = c.getContext('2d');
    g.drawImage(base, 0, 0, GW, GH); g.drawImage(trazo, 0, 0, GW, GH);
    return c.toDataURL('image/jpeg', 0.72);
  }
  function guardarLista(lista) {
    // si no cabe en el almacenamiento, suelta los más viejos
    for (let n = lista.length; n >= 1; n--) {
      const l = lista.slice(0, n);
      try {
        const p = Object.assign(H.progreso.cargar(), { dibujos: l });
        localStorage.setItem('habitos-progreso-v1', JSON.stringify(p));
        return l;
      } catch (e) { /* lleno: prueba con menos */ }
    }
    return null;
  }
  function guardar() {
    if (!E.abierto) return null;
    const data = imagen();
    const pr = H.progreso.cargar();
    const ahora = new Date();
    const dibujo = {
      id: 'd' + ahora.getTime().toString(36), titulo: E.op.titulo || 'Mi dibujo',
      fecha: H.progreso.hoyISO ? H.progreso.hoyISO(ahora) : ahora.toISOString().slice(0, 10), dia: pr.dia || 1, data,
    };
    guardarLista([dibujo].concat(dibujos()).slice(0, MAX));
    E.sucio = false;
    const op = E.op;
    sfx('logro');
    const l = $('#piListo'); l.hidden = false; l.classList.remove('salta'); void l.offsetWidth; l.classList.add('salta');
    if (A && A.evento) A.evento('dibujo', { id: dibujo.id, titulo: dibujo.titulo, total: dibujos().length });
    if (A && A.anotar) A.anotar(`Hiciste un dibujo: ${dibujo.titulo}.`, 'bien');
    if (op && typeof op.alGuardar === 'function') { try { op.alGuardar(data, dibujo); } catch (e) { console.warn('pintar.alGuardar', e); } }
    refrescarAlbum();
    setTimeout(() => { if (E.op === op) { l.hidden = true; cerrar(); if (A && A.P) A.decir(A.P, '¡Me quedó lindo!', 2.2); } }, 1100);
    return dibujo;
  }
  function borrar(id) {
    const l = dibujos().filter((d) => d.id !== id);
    guardarLista(l);
    if (!l.length) H.progreso.guardar({ dibujos: [] });
    refrescarAlbum();
  }

  // ---------- el cuadro del cuarto (creativo.js) y texturas para el 3D
  const TEX = {};
  function textura(id) {
    const T = window.THREE; if (!T) return null;
    const l = dibujos(); if (!l.length) return null;
    const pid = id || (H.progreso.cargar().decoracion || {}).cuadroDibujo;
    const d = l.find((x) => x.id === pid) || l[0];
    if (!TEX[d.id]) TEX[d.id] = new T.TextureLoader().load(d.data);
    return TEX[d.id];
  }
  function dibujoCuadro() {
    const l = dibujos(), pid = (H.progreso.cargar().decoracion || {}).cuadroDibujo;
    return l.find((x) => x.id === pid) || l[0] || null;
  }
  function ponerEnCuarto(id) {
    const d = Object.assign({}, H.progreso.cargar().decoracion || {}, { cuadro: 'midibujo', cuadroDibujo: id });
    H.progreso.guardar({ decoracion: d });
    if (H.creativo && H.creativo.elegir) H.creativo.elegir('cuadro', 'midibujo');
    return true;
  }

  // ---------- la pestaña "Dibujos" del álbum (logros.js)
  function dibujosHTML() {
    const l = dibujos(), enCuarto = (H.progreso.cargar().decoracion || {}).cuadro === 'midibujo' ? (dibujoCuadro() || {}).id : null;
    const nuevo = '<button type="button" class="al-carta pi-nuevo" data-pi-nuevo="1"><b>✏️ Dibujar algo nuevo</b><span>Una hoja en blanco y muchos colores.</span></button>';
    return nuevo + l.map((d) => `<figure class="al-foto pi-dib" data-dibujo="${esc(d.id)}"><img src="${esc(d.data)}" alt="Dibujo: ${esc(d.titulo)}" />
      <figcaption><b>${esc(d.titulo)}</b><span>Día ${esc(d.dia)}${d.id === enCuarto ? ' · 🖼️ en tu cuarto' : ''}</span></figcaption>
      <div class="pi-dib-b"><button type="button" class="pi-mini" data-pi-cuarto="${esc(d.id)}">🖼️ En mi cuarto</button><button type="button" class="al-foto-quitar" data-pi-borrar="${esc(d.id)}" aria-label="Quitar este dibujo">Quitar</button></div></figure>`).join('');
  }
  function refrescarAlbum() {
    const g = $('#alGrid'), sel = document.querySelector('.al-tabs [data-t="dibujos"][aria-selected="true"]');
    if (!g || !sel) return;
    g.innerHTML = dibujosHTML();
    const t = $('#alTitulo'); if (t) t.textContent = `Dibujos · ${dibujos().length} de ${MAX}`;
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-pi-nuevo],[data-pi-cuarto],[data-pi-borrar]');
    if (!t) return;
    if (t.dataset.piNuevo) abrir({ titulo: 'Mi dibujo' });
    else if (t.dataset.piCuarto) {
      ponerEnCuarto(t.dataset.piCuarto); refrescarAlbum(); sfx('sube');
      if (A && A.avisar) A.avisar('¡Tu dibujo ya está colgado en tu cuarto!', 'bien');
    } else if (t.dataset.piBorrar) borrar(t.dataset.piBorrar);
  });

  // mientras la hoja está abierta, el teclado es de la hoja
  if (A) A.alTecla((e) => {
    if (!E.abierto) return false;
    if (e.code === 'Escape') intentarCerrar();
    else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) deshacer();
    return true;
  });

  H.pintar = {
    abrir, cerrar, guardar, deshacer, hojaNueva, dibujos, borrar, textura, dibujoCuadro, ponerEnCuarto, dibujosHTML, MAX, COLORES,
    get abierto() { return E.abierto; },
    get trazos() { return E.trazos.length; },
  };
  window.Habitos = Object.assign(window.Habitos || {}, { pintar: H.pintar });
})();
