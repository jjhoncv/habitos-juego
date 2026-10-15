/* Juego libre y creativo (Ola 2, CREATIVO): sin metas, solo por gusto.
   - Decorar tu cuarto: en el dormitorio, el baúl de adornos abre un panel grande para elegir el color de la pared,
     la alfombra, el cubrecama, el cuadro y un adorno (planta, lámpara, osito…). Se ve en 3D al instante y se guarda
     en progreso.decoracion. Algunos adornos se desbloquean con los premios de las estrellas (H.premios).
   - Vestir a la cachorrita: collar y ropita entre lo que ya ganaste (H.perro.ponerCollar / ponerRopa).
   - Fotos para el álbum: botón Foto (o tecla P) guarda una miniatura de la escena en progreso.fotos (máximo 12);
     se ven en la pestaña "Fotos" del álbum (logros.js). */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.motor.nino || !H.progreso) return;
  const A = H.motor.api;
  const { THREE, PI } = A;
  const $ = (s) => document.querySelector(s);

  const nom = () => (A.perfil && A.perfil.mascota ? A.perfil.mascota.nombre : 'tu cachorrita');
  const gx = (o, a) => (A.perfil && A.perfil.genero === 'nina' ? a : o);
  const MAX_FOTOS = 12;

  // ---------- catálogo. premio = id de H.premios que lo desbloquea (sin premio = libre desde el principio)
  const CATS = {
    pared: { nombre: 'Pared', icono: '🎨', ops: [
      { id: 'menta', nombre: 'Menta', color: '#9fd0c4' },
      { id: 'celeste', nombre: 'Celeste', color: '#a9d3f2' },
      { id: 'rosada', nombre: 'Rosada', color: '#f6c6d2' },
      { id: 'amarilla', nombre: 'Amarilla', color: '#f7e3a1' },
      { id: 'lila', nombre: 'Lila', color: '#cdbfe8', premio: 'collar-rojo' },
      { id: 'noche', nombre: 'Azul noche', color: '#6474b4', premio: 'collar-celeste' },
    ] },
    alfombra: { nombre: 'Alfombra', icono: '🧶', ops: [
      { id: 'amarilla', nombre: 'Amarilla', color: '#f2c14e' },
      { id: 'celeste', nombre: 'Celeste', color: '#8fc7ea' },
      { id: 'verde', nombre: 'Verde', color: '#8fd18a' },
      { id: 'lunares', nombre: 'Con lunares', dibujo: 'lunares' },
      { id: 'arcoiris', nombre: 'Arcoíris', dibujo: 'rayas', premio: 'panuelo' },
      { id: 'huellitas', nombre: 'Huellitas', dibujo: 'huellitas', premio: 'truco-saludar' },
    ] },
    cama: { nombre: 'Cubrecama', icono: '🛏️', ops: [
      { id: 'azul', nombre: 'Azul', color: '#4a90d9' },
      { id: 'verde', nombre: 'Verde', color: '#5cb87a' },
      { id: 'rosada', nombre: 'Rosada', color: '#f28fb3' },
      { id: 'naranja', nombre: 'Naranja', color: '#f2a65a' },
      { id: 'cuadros', nombre: 'A cuadros', dibujo: 'cuadros' },
      { id: 'estrellas', nombre: 'Con estrellas', dibujo: 'estrellas', premio: 'casita-linda' },
    ] },
    cuadro: { nombre: 'Cuadro', icono: '🖼️', ops: [
      { id: 'paisaje', nombre: 'Paisaje', dibujo: 'paisaje' },
      { id: 'sol', nombre: 'Sol feliz', dibujo: 'sol' },
      { id: 'perrita', nombre: 'Mi cachorrita', dibujo: 'perrita' },
      { id: 'arcoiris', nombre: 'Arcoíris', dibujo: 'arcoiris' },
      { id: 'cohete', nombre: 'Cohete', dibujo: 'cohete' },
      { id: 'dino', nombre: 'Dinosaurio', dibujo: 'dino', premio: 'truco-rodar' },
      { id: 'castillo', nombre: 'Castillo', dibujo: 'castillo', premio: 'gorrito' },
      { id: 'midibujo', nombre: 'Mi dibujo', mio: true },          // PINTAR (Ronda 4): tu último dibujo (H.pintar)
      { id: 'nuevo', nombre: 'Dibujar uno nuevo', nuevo: true },   // abre la hoja; no se guarda como cuadro
    ] },
    adorno: { nombre: 'Adorno', icono: '🪴', ops: [
      { id: 'nada', nombre: 'Nada', dibujo: 'nada' },
      { id: 'planta', nombre: 'Planta', dibujo: 'planta' },
      { id: 'lampara', nombre: 'Lámpara', dibujo: 'lampara' },
      { id: 'oso', nombre: 'Osito', dibujo: 'oso' },
      { id: 'pecera', nombre: 'Pecera', dibujo: 'pecera', premio: 'collar-estrellas' },
      { id: 'banderines', nombre: 'Banderines', dibujo: 'banderines', premio: 'banderines' },
    ] },
  };
  const POR_DEFECTO = { pared: 'menta', alfombra: 'amarilla', cama: 'azul', cuadro: 'paisaje', adorno: 'nada' };
  const TABS = ['pared', 'alfombra', 'cama', 'cuadro', 'adorno', 'perrita'];

  const premioDe = (id) => (H.premios && id ? H.premios.lista().find((p) => p.id === id) : null);
  const libre = (op) => !op.premio || !!(H.premios && H.premios.tiene(op.premio));
  const estrellasDe = (op) => { const p = premioDe(op.premio); return p && p.estrellas != null ? p.estrellas : null; };
  const textoCandado = (op) => { const n = estrellasDe(op); return n != null ? `Con ${n} ★` : 'Pronto'; };
  const buscar = (cat, id) => CATS[cat] && CATS[cat].ops.find((o) => o.id === id);

  function decoracion() {
    const d = H.progreso.cargar().decoracion || {};
    const out = {};
    Object.keys(POR_DEFECTO).forEach((k) => { const op = buscar(k, d[k]); out[k] = op && libre(op) ? op.id : POR_DEFECTO[k]; });
    return out;
  }

  // ---------- dibujos simples en un lienzo (cuadros, alfombras, cubrecamas y las vistas del panel)
  function lienzo(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function estrella(x, cx, cy, r, color) {
    x.fillStyle = color; x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    x.closePath(); x.fill();
  }
  const circ = (x, cx, cy, r, c) => { x.fillStyle = c; x.beginPath(); x.arc(cx, cy, r, 0, PI * 2); x.fill(); };
  const ARCO = ['#e8504a', '#f39a3c', '#f6d04d', '#5cbf6b', '#4a9be0', '#8f73cf'];
  function dibujar(tipo, w, h) {
    const c = lienzo(w || 256, h || 192), x = c.getContext('2d'), W = c.width, Hh = c.height;
    const fondo = (col) => { x.fillStyle = col; x.fillRect(0, 0, W, Hh); };
    switch (tipo) {
      case 'paisaje':
        fondo('#4a90d9'); circ(x, W * 0.78, Hh * 0.25, Hh * 0.12, '#ffe066');
        x.fillStyle = '#f6e3b4'; x.fillRect(W * 0.13, Hh * 0.38, W * 0.5, Hh * 0.35);
        x.fillStyle = '#58a86b'; x.beginPath(); x.moveTo(0, Hh); x.lineTo(W * 0.3, Hh * 0.62); x.lineTo(W * 0.6, Hh); x.fill();
        x.beginPath(); x.moveTo(W * 0.4, Hh); x.lineTo(W * 0.75, Hh * 0.55); x.lineTo(W, Hh); x.fill(); break;
      case 'sol': {
        fondo('#a9dcf5'); const cx = W / 2, cy = Hh / 2, r = Hh * 0.24;
        x.strokeStyle = '#f6b93b'; x.lineWidth = Hh * 0.05; x.lineCap = 'round';
        for (let i = 0; i < 12; i++) { const a = i * PI / 6; x.beginPath(); x.moveTo(cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r * 1.3); x.lineTo(cx + Math.cos(a) * r * 1.75, cy + Math.sin(a) * r * 1.75); x.stroke(); }
        circ(x, cx, cy, r, '#ffd84d'); circ(x, cx - r * 0.35, cy - r * 0.15, r * 0.1, '#5a3b1e'); circ(x, cx + r * 0.35, cy - r * 0.15, r * 0.1, '#5a3b1e');
        x.strokeStyle = '#5a3b1e'; x.lineWidth = Hh * 0.03; x.beginPath(); x.arc(cx, cy + r * 0.1, r * 0.45, 0.2 * PI, 0.8 * PI); x.stroke();
        circ(x, cx - r * 0.6, cy + r * 0.25, r * 0.12, '#f7a07a'); circ(x, cx + r * 0.6, cy + r * 0.25, r * 0.12, '#f7a07a'); break;
      }
      case 'perrita': {
        fondo('#ffd9e4'); const col = (A.perfil && A.perfil.mascota && A.perfil.mascota.color) || '#f1ece2';
        const cx = W / 2, cy = Hh * 0.55, r = Hh * 0.3;
        x.fillStyle = '#a0704a'; x.beginPath(); x.ellipse(cx - r * 0.95, cy - r * 0.1, r * 0.32, r * 0.6, 0.3, 0, PI * 2); x.fill();
        x.beginPath(); x.ellipse(cx + r * 0.95, cy - r * 0.1, r * 0.32, r * 0.6, -0.3, 0, PI * 2); x.fill();
        circ(x, cx, cy, r, col); x.strokeStyle = '#5a3b1e'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, r, 0, PI * 2); x.stroke();
        circ(x, cx - r * 0.38, cy - r * 0.15, r * 0.11, '#2b2b2b'); circ(x, cx + r * 0.38, cy - r * 0.15, r * 0.11, '#2b2b2b');
        circ(x, cx, cy + r * 0.2, r * 0.15, '#2b2b2b'); x.fillStyle = '#e8687a'; x.beginPath(); x.ellipse(cx, cy + r * 0.55, r * 0.13, r * 0.18, 0, 0, PI * 2); x.fill();
        [[0.15, 0.2], [0.85, 0.25], [0.12, 0.8], [0.88, 0.82]].forEach(([u, v]) => estrella(x, W * u, Hh * v, Hh * 0.06, '#f28fb3')); break;
      }
      case 'arcoiris':
        fondo('#bfe6fb');
        ARCO.forEach((col, i) => { x.strokeStyle = col; x.lineWidth = Hh * 0.07; x.beginPath(); x.arc(W / 2, Hh * 0.95, Hh * (0.68 - i * 0.07), PI, 0); x.stroke(); });
        [[0.18, 0.88], [0.82, 0.88]].forEach(([u, v]) => { circ(x, W * u, Hh * v, Hh * 0.1, '#fff'); circ(x, W * u - Hh * 0.1, Hh * v + 4, Hh * 0.08, '#fff'); circ(x, W * u + Hh * 0.1, Hh * v + 4, Hh * 0.08, '#fff'); }); break;
      case 'cohete': {
        fondo('#22305e'); [[0.1, 0.15], [0.3, 0.8], [0.85, 0.2], [0.75, 0.75], [0.55, 0.12], [0.15, 0.55]].forEach(([u, v]) => estrella(x, W * u, Hh * v, Hh * 0.035, '#ffe066'));
        const cx = W / 2; x.fillStyle = '#f1f1f1'; x.beginPath(); x.ellipse(cx, Hh * 0.48, W * 0.09, Hh * 0.3, 0, 0, PI * 2); x.fill();
        x.fillStyle = '#e8504a'; x.beginPath(); x.moveTo(cx - W * 0.085, Hh * 0.33); x.quadraticCurveTo(cx, Hh * 0.02, cx + W * 0.085, Hh * 0.33); x.fill();
        x.beginPath(); x.moveTo(cx - W * 0.09, Hh * 0.6); x.lineTo(cx - W * 0.17, Hh * 0.8); x.lineTo(cx - W * 0.07, Hh * 0.72); x.fill();
        x.beginPath(); x.moveTo(cx + W * 0.09, Hh * 0.6); x.lineTo(cx + W * 0.17, Hh * 0.8); x.lineTo(cx + W * 0.07, Hh * 0.72); x.fill();
        circ(x, cx, Hh * 0.45, Hh * 0.07, '#4a9be0');
        x.fillStyle = '#f6a23c'; x.beginPath(); x.moveTo(cx - W * 0.05, Hh * 0.77); x.lineTo(cx, Hh * 0.97); x.lineTo(cx + W * 0.05, Hh * 0.77); x.fill(); break;
      }
      case 'dino': {
        fondo('#fff1c9'); x.fillStyle = '#5cb87a';
        x.beginPath(); x.ellipse(W * 0.48, Hh * 0.62, W * 0.22, Hh * 0.18, 0, 0, PI * 2); x.fill();
        x.beginPath(); x.moveTo(W * 0.62, Hh * 0.55); x.quadraticCurveTo(W * 0.72, Hh * 0.2, W * 0.78, Hh * 0.22); x.lineTo(W * 0.8, Hh * 0.34); x.quadraticCurveTo(W * 0.74, Hh * 0.4, W * 0.7, Hh * 0.62); x.fill();
        circ(x, W * 0.8, Hh * 0.25, Hh * 0.09, '#5cb87a');
        x.beginPath(); x.moveTo(W * 0.28, Hh * 0.6); x.lineTo(W * 0.08, Hh * 0.72); x.lineTo(W * 0.3, Hh * 0.7); x.fill();
        [0.36, 0.56].forEach((u) => x.fillRect(W * u, Hh * 0.72, W * 0.06, Hh * 0.18));
        x.fillStyle = '#f6a23c'; [0.34, 0.42, 0.5, 0.58].forEach((u) => { x.beginPath(); x.moveTo(W * u, Hh * 0.46); x.lineTo(W * (u + 0.035), Hh * 0.36); x.lineTo(W * (u + 0.07), Hh * 0.46); x.fill(); });
        circ(x, W * 0.82, Hh * 0.23, Hh * 0.025, '#2b2b2b'); break;
      }
      case 'castillo': {
        fondo('#cde8fb'); x.fillStyle = '#c9b8e8';
        x.fillRect(W * 0.25, Hh * 0.45, W * 0.5, Hh * 0.45); x.fillRect(W * 0.15, Hh * 0.3, W * 0.14, Hh * 0.6); x.fillRect(W * 0.71, Hh * 0.3, W * 0.14, Hh * 0.6);
        x.fillStyle = '#e8687a'; [[0.15, 0.3], [0.71, 0.3]].forEach(([u, v]) => { x.beginPath(); x.moveTo(W * u - 4, Hh * v); x.lineTo(W * (u + 0.07), Hh * (v - 0.22)); x.lineTo(W * (u + 0.14) + 4, Hh * v); x.fill(); });
        x.fillStyle = '#8a5a3b'; x.beginPath(); x.arc(W / 2, Hh * 0.75, W * 0.07, PI, 0); x.fill(); x.fillRect(W / 2 - W * 0.07, Hh * 0.75, W * 0.14, Hh * 0.15);
        x.fillStyle = '#f6d04d'; x.fillRect(W * 0.2, Hh * 0.42, W * 0.04, Hh * 0.07); x.fillRect(W * 0.76, Hh * 0.42, W * 0.04, Hh * 0.07);
        x.fillStyle = '#58a86b'; x.fillRect(0, Hh * 0.9, W, Hh * 0.1); break;
      }
      case 'lunares':
        fondo('#f6a9c0'); for (let i = 0; i < 7; i++) for (let j = 0; j < 6; j++) circ(x, (i + (j % 2) * 0.5 + 0.25) * W / 7, (j + 0.5) * Hh / 6, Math.min(W, Hh) * 0.035, '#fff'); break;
      case 'rayas':
        ARCO.forEach((col, i) => { x.fillStyle = col; x.fillRect(0, i * Hh / 6, W, Hh / 6 + 1); }); break;
      case 'huellitas':
        fondo('#bde3c8');
        for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
          const cx = (i + 0.5 + (j % 2) * 0.3) * W / 5, cy = (j + 0.5) * Hh / 4, r = Math.min(W, Hh) * 0.045;
          circ(x, cx, cy + r * 0.4, r, '#6b4a33'); [-1.1, -0.4, 0.4, 1.1].forEach((d, k) => circ(x, cx + d * r, cy - r * (k === 0 || k === 3 ? 0.4 : 0.95), r * 0.42, '#6b4a33'));
        } break;
      case 'cuadros':
        fondo('#f7f3ea'); x.fillStyle = 'rgba(222,85,70,.75)';
        for (let i = 0; i < 8; i += 2) { x.fillRect(i * W / 8, 0, W / 8, Hh); x.fillRect(0, i * Hh / 8, W, Hh / 8); } break;
      case 'estrellas':
        fondo('#2f3f7a'); for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) estrella(x, (i + 0.5 + (j % 2) * 0.25) * W / 5, (j + 0.5) * Hh / 5, Math.min(W, Hh) * 0.06, '#ffe066'); break;
      // vistas de los adornos (solo para el panel)
      case 'nada': fondo('#f4e7d4'); x.strokeStyle = '#b7c3d6'; x.lineWidth = 6; x.beginPath(); x.arc(W / 2, Hh / 2, Hh * 0.28, 0, PI * 2); x.moveTo(W / 2 - Hh * 0.2, Hh / 2 + Hh * 0.2); x.lineTo(W / 2 + Hh * 0.2, Hh / 2 - Hh * 0.2); x.stroke(); break;
      case 'planta': fondo('#eaf6ee'); x.fillStyle = '#c56b4a'; x.fillRect(W * 0.4, Hh * 0.6, W * 0.2, Hh * 0.3); circ(x, W * 0.5, Hh * 0.45, Hh * 0.18, '#3f8f5a'); circ(x, W * 0.6, Hh * 0.33, Hh * 0.13, '#58a86b'); circ(x, W * 0.4, Hh * 0.36, Hh * 0.12, '#2f7a4b'); break;
      case 'lampara': fondo('#fff4d6'); circ(x, W / 2, Hh * 0.32, Hh * 0.3, 'rgba(255,214,120,.45)'); x.fillStyle = '#f6c453'; x.beginPath(); x.moveTo(W * 0.38, Hh * 0.38); x.lineTo(W * 0.62, Hh * 0.38); x.lineTo(W * 0.56, Hh * 0.15); x.lineTo(W * 0.44, Hh * 0.15); x.fill(); x.fillStyle = '#6b4a33'; x.fillRect(W * 0.49, Hh * 0.38, W * 0.02, Hh * 0.45); x.fillRect(W * 0.42, Hh * 0.83, W * 0.16, Hh * 0.05); break;
      case 'oso': fondo('#fde9d9'); [[0.38, 0.22], [0.62, 0.22]].forEach(([u, v]) => circ(x, W * u, Hh * v, Hh * 0.08, '#a0704a')); circ(x, W / 2, Hh * 0.68, Hh * 0.22, '#a0704a'); circ(x, W / 2, Hh * 0.35, Hh * 0.17, '#b5835a'); circ(x, W / 2, Hh * 0.4, Hh * 0.07, '#e8cfa8'); circ(x, W * 0.45, Hh * 0.31, Hh * 0.02, '#2b2b2b'); circ(x, W * 0.55, Hh * 0.31, Hh * 0.02, '#2b2b2b'); break;
      case 'pecera': fondo('#e3f2fb'); x.fillStyle = 'rgba(120,190,240,.6)'; x.fillRect(W * 0.25, Hh * 0.25, W * 0.5, Hh * 0.5); x.strokeStyle = '#7a9bb8'; x.lineWidth = 3; x.strokeRect(W * 0.25, Hh * 0.25, W * 0.5, Hh * 0.5); x.fillStyle = '#f39a3c'; x.beginPath(); x.ellipse(W * 0.48, Hh * 0.5, W * 0.07, Hh * 0.06, 0, 0, PI * 2); x.fill(); x.beginPath(); x.moveTo(W * 0.55, Hh * 0.5); x.lineTo(W * 0.62, Hh * 0.43); x.lineTo(W * 0.62, Hh * 0.57); x.fill(); x.fillStyle = '#3f8f5a'; x.fillRect(W * 0.3, Hh * 0.55, W * 0.03, Hh * 0.2); break;
      case 'banderines': fondo('#fff7ec'); x.strokeStyle = '#6b4a33'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, Hh * 0.25); x.quadraticCurveTo(W / 2, Hh * 0.45, W, Hh * 0.25); x.stroke(); for (let i = 0; i < 6; i++) { const u = (i + 0.5) / 6, y0 = Hh * (0.25 + 0.2 * Math.sin(u * PI) * 0.95); x.fillStyle = ARCO[i]; x.beginPath(); x.moveTo(W * u - W * 0.06, y0); x.lineTo(W * u + W * 0.06, y0); x.lineTo(W * u, y0 + Hh * 0.28); x.fill(); } break;
      default: fondo('#ddd');
    }
    return c;
  }
  const TEXTURAS = {};
  function textura(tipo, w, h) {
    const k = tipo + w + 'x' + h;
    if (!TEXTURAS[k]) TEXTURAS[k] = new THREE.CanvasTexture(dibujar(tipo, w, h));
    return TEXTURAS[k];
  }
  const VISTAS = {};
  const vista = (tipo) => VISTAS[tipo] || (VISTAS[tipo] = dibujar(tipo, 160, 120).toDataURL());

  // ---------- materiales propios (los del motor se comparten por color: nunca se modifican)
  const sm = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0, flatShading: true }, o));
  const MAT = { pared: sm({ color: '#9fd0c4' }), alfombra: sm({ color: '#f2c14e' }), cama: sm({ color: '#4a90d9' }), cuadro: sm({ color: '#ffffff' }) };
  function pintarMat(m, op, w, h) {
    if (op.dibujo) { m.map = textura(op.dibujo, w, h); m.color.set('#ffffff'); } else { m.map = null; m.color.set(op.color); }
    m.needsUpdate = true;
  }

  // ---------- la escena del dormitorio: busca las piezas que se decoran y pone el baúl de adornos
  const R = { E: null };
  const hex = (m) => (m && m.material && m.material.color ? m.material.color.getHexString() : '');
  const cerca = (a, b, t) => Math.abs(a - b) < (t || 0.05);
  function prepararCuarto(E) {
    const sc = E.scene;
    R.E = E; R.paredes = []; R.cama = []; R.alfombra = null; R.lienzo = null; R.dentro = null; R.rincon = null; R.colRincon = null; R.luz = null; R.pez = null;
    sc.children.forEach((o) => {
      if (!o.isMesh) return;
      const c = hex(o), p = o.position;
      if (c === '9fd0c4') { R.paredes.push(o); o.material = MAT.pared; o.userData.deco = 'pared'; }
      else if (c === 'f2c14e' && cerca(p.y, 0.011, 0.01) && o.geometry.parameters && cerca(o.geometry.parameters.width, 3.2)) { R.alfombra = o; o.material = MAT.alfombra; o.userData.deco = 'alfombra'; }
      else if (c === '4a90d9' && cerca(p.x, -2.5) && cerca(p.y, 1.85)) { R.lienzo = o; o.userData.mat0 = o.material; o.userData.deco = 'cuadro'; }
      else if (c === 'f6e3b4' && p.x < -2.5 && p.x > -2.7 && p.y > 1.7 && p.y < 1.9) R.dentro = o;
    });
    // el cubrecama: los grupos de la cama tendida y destendida (piezas azules bajas a la izquierda)
    sc.children.forEach((g) => {
      if (!g.isGroup || g === A.P.root) return;
      g.children.forEach((m) => { if (m.isMesh && hex(m) === '4a90d9' && m.position.y < 1 && m.position.x < -1.4) { m.material = MAT.cama; m.userData.deco = 'cama'; R.cama.push(m); } });
    });
    // el baúl de adornos, junto a la pared de la izquierda (a los pies de la cama)
    const baul = new THREE.Group(); baul.position.set(-3.6, 0, -0.35); sc.add(baul);
    A.box(baul, 0.5, 0.36, 0.62, '#8f73cf', 0, 0.18, 0);
    A.box(baul, 0.54, 0.08, 0.66, '#f2c14e', 0, 0.4, 0);
    A.box(baul, 0.04, 0.12, 0.12, '#f2c14e', 0.26, 0.28, 0);
    [[-0.12], [0.12]].forEach(([z]) => A.box(baul, 0.52, 0.04, 0.06, '#6f56b0', 0, 0.18, z, { sombra: false }));
    E.solido(-3.6, -0.35, 0.56, 0.68);
    E.inters.push(A.etiquetaInter('Decorar mi cuarto', [-2.95, -0.25], [-3.6, -0.35], 1.0, {
      alto: 1.0,
      abrir: () => ({
        titulo: 'Tu baúl de adornos', texto: `Aquí guardas tus adornos. ¡Tu cuarto, a tu gusto!`,
        opciones: [
          { texto: 'Decorar mi cuarto', icono: '🎨', nota: 'Pared, alfombra, cama, cuadro y adornos.', min: 2, dur: 0.6, anim: 'agacharse', esfuerzo: false, progreso: 'Abriendo el baúl', alTerminar: () => abrir('pared') },
          { texto: `Vestir a ${nom()}`, icono: '🐶', nota: 'Su collar y su ropita.', min: 2, dur: 0.6, anim: 'agacharse', esfuerzo: false, progreso: 'Buscando su ropita', alTerminar: () => abrir('perrita') },
          { texto: 'Tomar una foto del cuarto', icono: '📷', nota: 'Se guarda en tu álbum.', min: 0, dur: 0.3, anim: 'senalar', esfuerzo: false, progreso: '¡Sonríe!', alTerminar: () => setTimeout(tomarFoto, 250) },
        ],
      }),
    }));
    aplicarTodo();
  }
  function aplicar(cat, id) {
    if (!R.E || !A.escena || A.escena !== R.E) return;
    const op = buscar(cat, id);
    if (!op) return;
    if (cat === 'pared') pintarMat(MAT.pared, op);
    else if (cat === 'alfombra') pintarMat(MAT.alfombra, op, 256, 192);
    else if (cat === 'cama') pintarMat(MAT.cama, op, 256, 256);
    else if (cat === 'cuadro' && R.lienzo) {
      const tx = op.mio && H.pintar ? H.pintar.textura() : null;   // PINTAR: "Mi dibujo"
      if (id === 'paisaje' || (op.mio && !tx) || op.nuevo) { R.lienzo.material = R.lienzo.userData.mat0; if (R.dentro) R.dentro.visible = true; }
      else if (tx) { MAT.cuadro.map = tx; MAT.cuadro.color.set('#ffffff'); MAT.cuadro.needsUpdate = true; R.lienzo.material = MAT.cuadro; if (R.dentro) R.dentro.visible = false; }
      else { pintarMat(MAT.cuadro, op, 256, 192); R.lienzo.material = MAT.cuadro; if (R.dentro) R.dentro.visible = false; }
    } else if (cat === 'adorno') ponerAdorno(id);
  }
  function aplicarTodo() { const d = decoracion(); Object.keys(d).forEach((k) => aplicar(k, d[k])); }

  // el adorno del rincón (entre la cama y el cesto) o los banderines en la pared del fondo
  const RINCON = { x: -3.55, z: 0.75 };
  function ponerAdorno(id) {
    const E = R.E, sc = E.scene;
    if (R.rincon) { R.rincon.parent.remove(R.rincon); R.rincon = null; }
    if (R.colRincon) { const i = E.cols.indexOf(R.colRincon); if (i >= 0) E.cols.splice(i, 1); R.colRincon = null; }
    R.luz = null; R.pez = null;
    if (id === 'nada') return;
    const g = new THREE.Group(); g.name = 'adorno-' + id; R.rincon = g; sc.add(g);
    if (id === 'banderines') {
      // una tira de banderines de colores sobre la ventana y la caja de juguetes
      const n = 9, x1 = -0.6, x2 = 2.4, z = -3.45;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), x = x1 + (x2 - x1) * u, y = 2.38 - Math.sin(u * PI) * 0.18;
        const t = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 3), sm({ color: ARCO[i % ARCO.length] }));
        t.rotation.x = PI; t.rotation.y = PI / 6; t.position.set(x, y - 0.12, z); t.scale.z = 0.3; g.add(t);
      }
      const cuerda = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1 + 0.2, 0.015, 0.015), sm({ color: '#6b4a33' }));
      cuerda.position.set((x1 + x2) / 2, 2.32, z); g.add(cuerda);
      return;
    }
    g.position.set(RINCON.x, 0, RINCON.z);
    if (id === 'planta') {
      A.cil(g, 0.2, 0.15, 0.4, '#c56b4a', 0, 0.2, 0);
      A.bola(g, 0.3, '#3f8f5a', 0, 0.62, 0); A.bola(g, 0.22, '#58a86b', 0.15, 0.85, 0.05); A.bola(g, 0.18, '#2f7a4b', -0.14, 0.8, -0.08);
    } else if (id === 'lampara') {
      A.cil(g, 0.16, 0.18, 0.05, '#6b4a33', 0, 0.025, 0);
      A.cil(g, 0.025, 0.025, 1.2, '#6b4a33', 0, 0.62, 0);
      const pant = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 0.28, 16, 1, true), sm({ color: '#f6c453', emissive: '#f6b53b', emissiveIntensity: 0.55, side: THREE.DoubleSide }));
      pant.position.y = 1.3; g.add(pant);
      R.luz = new THREE.PointLight('#ffd38a', 0.6, 4.5); R.luz.position.set(0.3, 1.25, 0); g.add(R.luz);
    } else if (id === 'oso') {
      A.bola(g, 0.2, '#a0704a', 0, 0.2, 0, 1); A.bola(g, 0.15, '#b5835a', 0, 0.47, 0.02, 1);
      A.bola(g, 0.055, '#a0704a', -0.1, 0.6, 0, 1); A.bola(g, 0.055, '#a0704a', 0.1, 0.6, 0, 1);
      A.bola(g, 0.06, '#e8cfa8', 0.13, 0.44, 0.02, 1);
      A.bola(g, 0.07, '#a0704a', 0.1, 0.12, 0.14, 1); A.bola(g, 0.07, '#a0704a', 0.1, 0.12, -0.14, 1);
      g.rotation.y = PI / 2;
    } else if (id === 'pecera') {
      A.box(g, 0.5, 0.5, 0.5, '#8a5a3b', 0, 0.25, 0);
      const vidrio = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.34), new THREE.MeshStandardMaterial({ color: '#8fd0f5', transparent: true, opacity: 0.45, roughness: 0.1 }));
      vidrio.position.y = 0.67; g.add(vidrio);
      R.pez = A.bola(g, 0.05, '#f39a3c', 0, 0.66, 0, 1); R.pez.scale.set(1.5, 1, 0.7);
      A.bola(g, 0.04, '#3f8f5a', -0.12, 0.54, 0.08);
    }
    R.colRincon = { x1: RINCON.x - 0.3, x2: RINCON.x + 0.3, z1: RINCON.z - 0.3, z2: RINCON.z + 0.3 };
    E.cols.push(R.colRincon);
  }
  A.alActualizar((dt) => {
    if (!R.E || A.escena !== R.E) return;
    if (R.luz) R.luz.intensity = H.dia4 && H.dia4.apagon ? 0 : 0.6;
    if (R.pez) { R.pez.userData.t = (R.pez.userData.t || 0) + dt; const t = R.pez.userData.t; R.pez.position.x = Math.sin(t * 0.9) * 0.14; R.pez.rotation.y = Math.cos(t * 0.9) > 0 ? 0 : PI; }
  });

  A.alConstruir((nombre, E) => {
    if (nombre === 'dormitorio') { try { prepararCuarto(E); } catch (e) { console.warn('creativo', e); } } else if (R.E && R.E !== E) R.E = null;
    // en el menú de la cachorrita: vestirla
    const it = E.inters.find((i) => i.nombre === nom() && typeof i.posicion === 'function' && !i.creativo);
    if (it) {
      it.creativo = true;
      const abrirAntes = it.abrir;
      it.abrir = function () {
        const def = abrirAntes.apply(this, arguments);
        if (def && Array.isArray(def.opciones)) def.opciones.push({ texto: `Vestir a ${nom()}`, icono: '🎀', nota: 'Collar y ropita de tus premios.', min: 0, dur: 0.5, anim: 'agacharse', esfuerzo: false, progreso: 'Buscando su ropita', alTerminar: () => abrir('perrita') });
        return def;
      };
    }
  });

  // ---------- la cachorrita: collar y ropita (entre lo que ya ganaste)
  const premiosDe = (tipo) => (H.premios ? H.premios.lista().filter((p) => p.tipo === tipo) : []);
  function opcionesPerrita() {
    const collares = [{ id: 'sin-collar', nombre: 'Sin collar', color: null, tiene: true }].concat(premiosDe('collar'));
    const ropas = [{ id: 'sin-ropa', nombre: 'Sin ropita', tiene: true }].concat(premiosDe('ropa'));
    return { collares, ropas };
  }
  function vestir(tipo, id) {
    if (!H.perro) return false;
    const { collares, ropas } = opcionesPerrita();
    if (tipo === 'collar') {
      const c = collares.find((x) => x.id === id);
      if (!c || !c.tiene) return false;
      H.perro.ponerCollar(c.color || null);
    } else {
      const r = ropas.find((x) => x.id === id);
      if (!r || !r.tiene) return false;
      H.perro.ponerRopa(id === 'sin-ropa' ? null : id);
    }
    const D = H.perro.D;
    if (D) { D.anim = 'feliz'; D.salto = 0.55; }
    A.sfx('guauTierno');
    return true;
  }

  // ---------- elegir un adorno del cuarto
  function elegir(cat, id) {
    const op = buscar(cat, id);
    if (!op || !libre(op)) return false;
    const d = Object.assign({}, H.progreso.cargar().decoracion || {}, { [cat]: id });
    H.progreso.guardar({ decoracion: d });
    aplicar(cat, id);
    A.sfx('sube');
    A.evento('decorar', { cat, id });
    return true;
  }

  // ---------- el panel grande
  document.body.insertAdjacentHTML('beforeend', `
<div class="deco" id="deco" hidden><div class="deco-hoja" role="dialog" aria-labelledby="decoTitulo">
  <div class="deco-cab"><h2 id="decoTitulo">Decorar mi cuarto</h2>
    <div class="deco-botones"><button class="btn sec deco-foto" type="button" id="decoFoto">📷 Foto</button><button class="btn" type="button" id="decoListo">¡Listo!</button></div></div>
  <nav class="deco-tabs" id="decoTabs"></nav>
  <p class="deco-msg" id="decoMsg" aria-live="polite"></p>
  <div class="deco-grid" id="decoGrid"></div>
</div></div>
<button class="b-foto" id="bFoto" type="button" hidden aria-label="Tomar una foto (tecla P)"><span aria-hidden="true">📷</span><span>Foto</span></button>
<div class="foto-flash" id="fotoFlash" hidden></div>
<div class="foto-mini" id="fotoMini" hidden><img alt="" id="fotoMiniImg" /><span id="fotoMiniTxt">¡Foto guardada en tu álbum!</span></div>`);

  const P0 = { tab: 'pared', abierto: false, soloPerrita: false };
  function abrir(tab) {
    const enCuarto = !!R.E && A.escena === R.E;
    P0.soloPerrita = !enCuarto;
    P0.tab = enCuarto ? (TABS.includes(tab) ? tab : 'pared') : 'perrita';
    P0.abierto = true;
    $('#deco').hidden = false;
    document.documentElement.classList.add('deco-on');
    A.bloquear('creativo', true);
    $('#decoMsg').textContent = '';
    pintar();
    A.sfx('abrir');
    return true;
  }
  function cerrar() {
    if (!P0.abierto) return;
    P0.abierto = false;
    $('#deco').hidden = true;
    document.documentElement.classList.remove('deco-on');
    A.bloquear('creativo', false);
    if (!P0.soloPerrita) A.decir(A.P, gx('¡Me encanta cómo quedó mi cuarto!', '¡Me encanta cómo quedó mi cuarto!'), 2.2);
  }
  const ficha = (attrs, img, nombre, sel, bloq, txtBloq) => `<button type="button" class="deco-op${sel ? ' sel' : ''}${bloq ? ' bloq' : ''}" ${attrs} aria-pressed="${sel}"${bloq ? ' aria-disabled="true"' : ''}>
      <span class="deco-vista">${img}${bloq ? '<span class="deco-candado" aria-hidden="true">🔒</span>' : ''}</span>
      <span class="deco-nom">${nombre}</span>${bloq ? `<span class="deco-falta">${txtBloq}</span>` : ''}</button>`;
  function pintar() {
    const tabs = P0.soloPerrita ? ['perrita'] : TABS;
    $('#decoTitulo').textContent = P0.soloPerrita || P0.tab === 'perrita' ? `Vestir a ${nom()}` : 'Decorar mi cuarto';
    $('#decoTabs').hidden = tabs.length < 2;
    $('#decoTabs').innerHTML = tabs.map((t) => `<button type="button" data-tab="${t}" aria-selected="${t === P0.tab}"><span aria-hidden="true">${t === 'perrita' ? '🐶' : CATS[t].icono}</span>${t === 'perrita' ? nom() : CATS[t].nombre}</button>`).join('');
    let html = '';
    if (P0.tab === 'perrita') {
      const { collares, ropas } = opcionesPerrita();
      const col = H.perro ? H.perro.collar : null, ropa = H.perro ? H.perro.ropa : null;
      const vCollar = (c) => (c.color ? `<span class="deco-collar" style="--c:${c.color}">${c.id === 'collar-estrellas' ? '★' : ''}</span>` : '<span class="deco-collar nada"></span>');
      const vRopa = (r) => `<span class="deco-ropa">${r.id === 'panuelo' ? '🧣' : r.id === 'gorrito' ? '🎉' : '·'}</span>`;
      html = `<h3 class="deco-sub">Collar</h3>` + collares.map((c) => ficha(`data-collar="${c.id}"`, vCollar(c), c.nombre.replace(/^Collar /, 'Collar '), (c.color || null) === (col || null), !c.tiene, c.estrellas != null ? `Con ${c.estrellas} ★` : 'Pronto')).join('')
        + `<h3 class="deco-sub">Ropita</h3>` + ropas.map((r) => ficha(`data-ropa="${r.id}"`, vRopa(r), r.nombre, (r.id === 'sin-ropa' ? null : r.id) === (ropa || null), !r.tiene, r.estrellas != null ? `Con ${r.estrellas} ★` : 'Pronto')).join('');
    } else {
      const d = decoracion();
      html = CATS[P0.tab].ops.map((op) => ficha(`data-cat="${P0.tab}" data-id="${op.id}"`,
        op.mio || op.nuevo ? vistaDibujo(op) : op.dibujo ? `<img src="${vista(op.dibujo)}" alt="" />` : `<span class="deco-color" style="background:${op.color}"></span>`,
        op.nombre, d[P0.tab] === op.id, !libre(op), textoCandado(op))).join('');
    }
    $('#decoGrid').innerHTML = html;
  }
  // PINTAR: la vista de "Mi dibujo" y "Dibujar uno nuevo"
  function vistaDibujo(op) {
    const d = op.mio && H.pintar ? H.pintar.dibujoCuadro() : null;
    return d ? `<img src="${d.data}" alt="" />` : '<span class="deco-color" style="background:#fff;display:grid;place-items:center;font-size:34px">✏️</span>';
  }
  function avisoCandado(n) {
    const m = $('#decoMsg');
    m.textContent = n != null ? `Se abre cuando juntes ${n} estrellas. ¡Tú puedes!` : 'Muy pronto lo vas a tener.';
    m.classList.remove('salta'); void m.offsetWidth; m.classList.add('salta');
    A.sfx('tic');
  }
  $('#decoTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; P0.tab = b.dataset.tab; $('#decoMsg').textContent = ''; pintar(); A.sfx('click'); });
  $('#decoGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.deco-op'); if (!b) return;
    if (b.dataset.cat) {
      const op = buscar(b.dataset.cat, b.dataset.id);
      // PINTAR: "Dibujar uno nuevo" (o "Mi dibujo" sin dibujos todavía) abre la hoja en blanco
      if (op && (op.nuevo || (op.mio && !(H.pintar && H.pintar.dibujos().length)))) {
        if (H.pintar) H.pintar.abrir({ titulo: 'Un cuadro para mi cuarto', alGuardar: (data, d) => { H.pintar.ponerEnCuarto(d.id); pintar(); } });
        return;
      }
      if (!libre(op)) { avisoCandado(estrellasDe(op)); return; }
      elegir(b.dataset.cat, b.dataset.id); $('#decoMsg').textContent = '';
    } else if (b.dataset.collar || b.dataset.ropa) {
      const tipo = b.dataset.collar ? 'collar' : 'ropa', id = b.dataset.collar || b.dataset.ropa;
      const { collares, ropas } = opcionesPerrita();
      const x = (tipo === 'collar' ? collares : ropas).find((q) => q.id === id);
      if (!x || !x.tiene) { avisoCandado(x ? x.estrellas : null); return; }
      vestir(tipo, id); $('#decoMsg').textContent = `¡A ${nom()} le queda precioso!`;
    }
    pintar();
  });
  $('#decoListo').addEventListener('click', cerrar);
  $('#decoFoto').addEventListener('click', () => { cerrar(); setTimeout(tomarFoto, 200); });

  // ---------- fotos
  const fotos = () => { const f = H.progreso.cargar().fotos; return Array.isArray(f) ? f : []; };
  function puedeFoto() {
    const st = A.estado();
    return st.jugando && !st.cargando && !st.cine && !P0.abierto && !document.body.classList.contains('en-partido');
  }
  let tomando = false;
  function tomarFoto() {
    return new Promise((res) => {
      if (tomando || !puedeFoto()) return res(null);
      tomando = true;
      const gl = $('#juego');
      let intentos = 0;
      const capturar = () => requestAnimationFrame(() => {
        // justo después del render del motor (mismo cuadro): el lienzo todavía tiene la imagen
        let src = null;
        try {
          const W = 320, Hh = Math.max(1, Math.round(W * gl.height / Math.max(1, gl.width)));
          const c = lienzo(W, Hh), x = c.getContext('2d');
          x.drawImage(gl, 0, 0, W, Hh);
          const px = x.getImageData(0, 0, W, Hh).data;
          let suma = 0; for (let i = 0; i < px.length; i += 4 * 61) suma += px[i] + px[i + 1] + px[i + 2];
          if (suma === 0 && intentos++ < 4) return capturar();
          src = c.toDataURL('image/jpeg', 0.6);
        } catch (e) { console.warn('creativo foto', e); }
        tomando = false;
        if (!src) return res(null);
        res(guardarFoto(src));
      });
      capturar();
    });
  }
  function guardarFoto(src) {
    const S = A.S, dia = A.diaDeHoy ? A.diaDeHoy() : null;
    const f = { src, lugar: A.escena ? A.escena.titulo : '', dia: dia ? dia.nombre : '', hora: A.hora(S.min), t: Date.now() };
    let lista = [f].concat(fotos());
    const quito = lista.length > MAX_FOTOS;
    lista = lista.slice(0, MAX_FOTOS);
    H.progreso.guardar({ fotos: lista });
    // si el almacenamiento está lleno, se quitan las más antiguas hasta que quepa
    while (lista.length > 1 && fotos().length !== lista.length) { lista = lista.slice(0, lista.length - 1); H.progreso.guardar({ fotos: lista }); }
    // flash suave y sonido de cámara
    const fl = $('#fotoFlash'); fl.hidden = false; fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
    setTimeout(() => { fl.hidden = true; }, 650);
    A.sfx('tic'); setTimeout(() => A.sfx('click'), 90);
    $('#fotoMiniImg').src = src;
    $('#fotoMiniTxt').textContent = quito ? `¡Foto guardada! (Tu álbum guarda ${MAX_FOTOS}: se fue la más antigua.)` : '¡Foto guardada en tu álbum!';
    const mini = $('#fotoMini'); mini.hidden = false; clearTimeout(mini._t); mini._t = setTimeout(() => { mini.hidden = true; }, 2600);
    A.evento('foto', { lugar: f.lugar, total: lista.length });
    return f;
  }
  function borrarFoto(i) {
    const l = fotos(); if (i < 0 || i >= l.length) return false;
    l.splice(i, 1); H.progreso.guardar({ fotos: l }); return true;
  }
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // para la pestaña "Fotos" del álbum (logros.js)
  function fotosHTML() {
    const l = fotos();
    if (!l.length) return '<div class="al-carta al-sinfotos"><b>Todavía no hay fotos</b><span>Toca el botón 📷 Foto (o la tecla P) para guardar un momento bonito.</span></div>';
    return l.map((f, i) => `<figure class="al-foto"><img src="${esc(f.src)}" alt="Foto: ${esc(f.lugar)}" /><figcaption><b>${esc(f.lugar)}</b><span>${esc(f.dia)}${f.dia ? ' · ' : ''}${esc(f.hora)}</span></figcaption><button type="button" class="al-foto-quitar" data-borrar-foto="${i}" aria-label="Quitar esta foto">Quitar</button></figure>`).join('');
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-borrar-foto]');
    if (!b) return;
    borrarFoto(Number(b.dataset.borrarFoto));
    const g = $('#alGrid'); if (g) g.innerHTML = fotosHTML();
    const t = $('#alTitulo'); if (t) t.textContent = `Fotos · ${fotos().length} de ${MAX_FOTOS}`;
  });

  $('#bFoto').addEventListener('click', () => { $('#bFoto').blur(); tomarFoto(); });
  setInterval(() => {
    const hud = $('#hud'), ver = A.estado().jugando && !!hud && !hud.hidden;
    if ($('#bFoto').hidden === ver) $('#bFoto').hidden = !ver;
  }, 400);

  A.alTecla((e) => {
    if (P0.abierto) { if (/^(Escape|Enter)$/.test(e.code)) cerrar(); return true; }
    if (e.code === 'KeyP' && !e.repeat && !A.estado().panel && puedeFoto()) { tomarFoto(); return true; }
    return false;
  });

  H.creativo = {
    abrir, cerrar, elegir, vestir, decoracion, tomarFoto, fotos, borrarFoto, fotosHTML, MAX_FOTOS, CATS,
    get abierto() { return P0.abierto; },
    opcionesPerrita, libre: (cat, id) => { const op = buscar(cat, id); return !!op && libre(op); },
    get piezas() { return R; },
  };
})();
