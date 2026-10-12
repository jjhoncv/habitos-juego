/* El sótano, las llaves y las puertas con candado.
   - En el pasillo hay una puerta nueva: "Puerta del sótano". Abajo está oscuro (un foco con cordón que
     se jala saltando o desde su etiqueta), con cajas, estantes, telarañas y una caldera vieja.
   - Dos puertas de la casa tienen candado: el ALTILLO (pasillo) y el TALLER DE PAPÁ (sala). Sus llaves
     están en el sótano, donde no llegas: detrás de una reja (laberinto de cajas) y dentro del ducto de la
     caldera (una compuerta que se abre con una cajita sobre el botón, y un ratoncito sentado en la llave).
   - Ahí juegas COMO LA CACHORRITA (A.controlar del motor): flechas o palanca para moverla, O olfatear
     (marca el rastro), B ladrar, Z saltar bajito y Q volver a ser tú. Ella trae la llave en la boca.
   - Las llaves se guardan entre días: H.progreso.guardar({ llaves: { altillo, taller }, sotano: {…} }).
   - Vida libre: nada es obligatorio. Pistas: un ruido en el sótano, la cachorrita olfatea las puertas. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.motor.nino || !H.progreso) return;
  const A = H.motor.api;
  const { THREE, PI } = A;
  const $ = (s) => document.querySelector(s);
  const nina = () => !!(A.perfil && A.perfil.genero === 'nina');
  const g = (o, a) => (nina() ? a : o);
  const nom = () => (A.perfil && A.perfil.mascota && A.perfil.mascota.nombre) || 'Molly';
  const yo = () => (A.perfil && A.perfil.nombre) || A.CFG.nombre || 'Dani';
  const ang = (a) => { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const MIS = ['sotano', 'altillo', 'taller'];
  const LUGAR = { altillo: 'el altillo', taller: 'el taller de papá' };

  // ---------- progreso guardado entre días
  const prog = () => { const p = H.progreso.cargar(); return { llaves: Object.assign({}, p.llaves), sotano: Object.assign({}, p.sotano) }; };
  const tieneLlave = (k) => !!prog().llaves[k];
  function guardarLlave(k) { const p = prog(); p.llaves[k] = true; H.progreso.guardar({ llaves: p.llaves }); }
  function guardarSotano(c) { const p = prog(); H.progreso.guardar({ sotano: Object.assign(p.sotano, c) }); }
  const abierta = (k) => !!(prog().sotano.abiertas || {})[k];

  // ---------- estado de la visita (se reinicia al construir cada escena)
  const R = {
    D: null, foco: false, luces: null, ctl: null, carga: null, llaves: {}, caja: null, compuerta: null, raton: null,
    palo: null, colsNino: [], colPalo: null, colCompuerta: null, avisos: {}, ladrar: 0, olfato: 0, sigue: true,
  };

  // ================================================================ la cachorrita en mis lugares
  function crearMolly(E, x, z, ry) {
    const D = A.crearPerro(A.perfil.mascota.color);
    D.voz = 'perro'; D.root.position.set(x, 0, z); D.root.rotation.y = ry || 0;
    E.scene.add(D.root); E.npcs.push(D);
    R.D = D;
    return D;
  }
  function irHacia(Q, x, z, v, dt, r) {
    const q = Q.root.position, dx = x - q.x, dz = z - q.z, d = Math.hypot(dx, dz);
    if (d < (r || 0.06)) return true;
    const k = Math.min(1, v * dt / d);
    A.moverEn(Q.root, dx * k, dz * k, 0.18);
    Q.root.rotation.y += ang(Math.atan2(dx, dz) - Q.root.rotation.y) * Math.min(1, dt * 8);
    Q.anim = 'caminar'; Q.vel = Math.min(1, v / 3);
    return false;
  }
  function seguir(D, dt) {
    const P = A.P, p = P.root.position, ry = P.root.rotation.y;
    const tx = p.x - Math.sin(ry) * 0.85 + Math.cos(ry) * 0.45, tz = p.z - Math.cos(ry) * 0.85 - Math.sin(ry) * 0.45;
    const q = D.root.position, d = Math.hypot(tx - q.x, tz - q.z);
    if (d > 8) { q.x = tx; q.z = tz; }
    if (d > 0.4) irHacia(D, tx, tz, d > 2.5 ? 3.6 : d > 1 ? 2.6 : 1.4, dt);
    else {
      D.root.rotation.y += ang(Math.atan2(p.x - q.x, p.z - q.z) - D.root.rotation.y) * Math.min(1, dt * 4);
      if (D.anim === 'caminar') D.anim = 'quieto';
    }
  }

  // ================================================================ jugar como la cachorrita
  // Usa A.controlar del motor (ver PIZARRA). Si el motor no lo tuviera, un respaldo simple:
  // el motor mueve al niño, aquí se le devuelve a su sitio y el movimiento pasa a la cachorrita.
  const respaldo = { on: false, pos: null, ry: 0, cols: null };
  const controlando = () => !!R.ctl;
  function tomarControl(reto) {
    const D = R.D;
    if (!D || R.ctl) return;
    R.ctl = { reto, t: 0 };
    D.anim = 'feliz'; D.salto = 0.55; A.sfx('ladrido');
    if (A.controlar) {
      A.controlar(D, { vel: 3.0, radio: 0.17, nombre: nom(), alSaltar: saltarPerro, alSalir: () => { if (R.ctl) soltar(true); } });
    } else {
      respaldo.on = true; respaldo.pos = A.P.root.position.clone(); respaldo.ry = A.P.root.rotation.y;
      A.enfocar(() => (R.D ? { x: R.D.root.position.x, z: R.D.root.position.z, peso: 1 } : null));
    }
    hud(true);
    A.decir(A.P, `¡Tú puedes, ${nom()}!`, 2.2);
    A.avisar(`Ahora juegas con ${nom()}: muévela con ${A.tactil ? 'la palanca' : 'las flechas'}. ${A.tactil ? 'Botones: Olfatear, Ladrar, Saltar.' : 'O olfatear · B ladrar · Z saltar · Q volver.'}`, 'bien');
    A.evento('sotanoControl', { on: true, reto });
  }
  function soltar(desdeMotor) {
    if (!R.ctl) return;
    R.ctl = null;
    if (A.controlar && !desdeMotor && A.controlado) A.controlar(null);
    if (respaldo.on) { respaldo.on = false; A.enfocar(null); }
    hud(false);
    A.evento('sotanoControl', { on: false });
  }
  function saltarPerro() {
    const D = R.D;
    if (!D || D.salto > 0) return false;
    D.salto = 0.55; A.sfx('salto');
    return true;
  }
  function ladrar() {
    const D = R.D;
    if (!D || R.ladrar > 0) return false;
    R.ladrar = 0.6;
    A.sfx('ladrido'); D.anim = 'feliz'; D.salto = Math.max(D.salto, 0.3);
    A.evento('sotanoLadra', {});
    const ra = R.raton;
    if (ra && ra.fase === 'sentado' && dist(D.root.position, ra.g.position) < 2.0) {
      ra.fase = 'huye'; ra.t = 0;
      A.avisar('¡El ratoncito se asustó y se fue corriendo por su huequito!', 'bien');
    }
    return true;
  }
  // olfatear: deja ver el rastro (lucecitas en el piso) hacia lo que hay que buscar
  function olfatear() {
    const D = R.D;
    if (!D || R.olfato > 0) return false;
    R.olfato = 1.2;
    D.anim = 'comer'; setTimeout(() => { if (R.D === D && D.anim === 'comer') D.anim = 'quieto'; }, 900);
    A.sfx('roce');
    const ruta = rastro();
    if (!ruta.length) { A.decir(D, 'Snif, snif…', 1.4, false); return true; }
    const pts = [{ x: D.root.position.x, z: D.root.position.z }].concat(ruta);
    let n = 0;
    for (let i = 0; i < pts.length - 1 && n < 70; i++) {
      const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z), pasos = Math.max(1, Math.floor(L / 0.3));
      for (let k = 0; k < pasos; k++, n++) {
        const f = k / pasos;
        A.emitir(new THREE.Vector3(a.x + (b.x - a.x) * f, 0.06, a.z + (b.z - a.z) * f), '#b6f57a', new THREE.Vector3(0, 0.12, 0), 2.6 + n * 0.02, 0.05, 0, 0.95);
      }
    }
    A.evento('sotanoOlfatea', { puntos: n });
    return true;
  }
  const P2 = (x, z) => ({ x, z });
  // camino de olor según el reto y cómo va
  function rastro() {
    const D = R.D, ctl = R.ctl;
    const q = D.root.position;
    let ruta;
    if (R.carga) ruta = [P2(A.P.root.position.x, A.P.root.position.z)];
    else if (!ctl) return [];
    else if (ctl.reto === 'altillo') ruta = RUTA_ALTILLO;
    else if (!R.compuerta.abierta) ruta = [P2(R.caja.x, R.caja.z), P2(BOTON.x, BOTON.z)];
    else ruta = RUTA_TALLER;
    if (R.carga && ctl && ctl.reto === 'altillo' && q.z < -0.7) ruta = RUTA_ALTILLO.slice(0, -1).reverse().concat(ruta);
    else if (R.carga && ctl && ctl.reto === 'taller' && q.z < -2.9) ruta = RUTA_TALLER.slice(0, -1).reverse().concat(ruta);
    else if (!R.carga) {
      // desde el punto del camino más cercano a ella
      let bi = 0, bd = 1e9;
      ruta.forEach((p, i) => { const d = Math.hypot(p.x - q.x, p.z - q.z); if (d < bd) { bd = d; bi = i; } });
      ruta = ruta.slice(bi);
    }
    return ruta;
  }

  // ---------- HUD "juegas con la cachorrita" y sus botones (también táctiles)
  function crearHud() {
    if ($('#sotHud')) return;
    document.body.insertAdjacentHTML('beforeend', `
<div class="sot-hud" id="sotHud" hidden role="group" aria-label="Juegas con tu cachorrita">
  <p class="sot-quien"><span class="sot-pata" aria-hidden="true"></span><span id="sotQuien">Juegas con tu cachorrita</span></p>
  <div class="sot-botones">
    <button type="button" id="bOlfatear">Olfatear <kbd>O</kbd></button>
    <button type="button" id="bLadrar">Ladrar <kbd>B</kbd></button>
    <button type="button" id="bSaltarPerro" class="solo-toque">Saltar</button>
    <button type="button" id="bSoltar" class="sec">Volver <kbd>Q</kbd></button>
  </div>
</div>`);
    const boton = (id, f) => {
      const b = $(id);
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', (e) => { e.preventDefault(); if (R.ctl) f(); b.blur(); });
    };
    boton('#bOlfatear', olfatear);
    boton('#bLadrar', ladrar);
    boton('#bSaltarPerro', saltarPerro);
    boton('#bSoltar', () => { soltar(); A.decir(A.P, `¡Ven, ${nom()}!`, 1.6); });
  }
  function hud(on) {
    crearHud();
    $('#sotQuien').textContent = `Juegas con ${nom()}`;
    $('#sotHud').hidden = !on;
    document.documentElement.classList.toggle('sot-perro', !!on);
  }

  A.alTecla((e) => {
    if (!R.ctl || e.repeat) return false;
    if (e.code === 'KeyO') return olfatear() || true;
    if (e.code === 'KeyB') return ladrar() || true;
    if (e.code === 'KeyQ' || e.code === 'Escape') { soltar(); A.decir(A.P, `¡Ven, ${nom()}!`, 1.6); return true; }
    if (!A.controlar && (e.code === 'KeyZ' || e.code === 'KeyJ')) return saltarPerro() || true;
    return false;
  });

  // ================================================================ el sótano
  // 12 × 8: x de -6 a 6, z de -4 (fondo) a 4. Escalera a la derecha; reja con laberinto atrás a la izquierda;
  // caldera y ducto atrás a la derecha; foco al centro.
  const REJA = { x: -2.6, z: -0.6, hueco: -4.2 };
  const LLAVE_A = P2(-3.3, -3.55);
  const RUTA_ALTILLO = [P2(-4.2, -0.2), P2(-4.2, -1.05), P2(-3.05, -1.05), P2(-3.05, -2.3), P2(-5.45, -2.3), P2(-5.45, -3.55), LLAVE_A];
  const BOTON = P2(0.2, -1.9);
  const CAJA0 = P2(-1.1, 0.4);
  const BOCA = { x1: 2.4, x2: 3.0, z: -2.95 };
  const LLAVE_T = P2(4.45, -3.55);
  const RUTA_TALLER = [P2(2.7, -2.4), P2(2.7, -3.5), LLAVE_T];
  const ESCALERA = { x: 5.45, pie: 2.9 };

  function construirSotano() {
    const E = A.nuevaEscena('sotano', 'Sótano', 12, 8, { piso: '#5b524a', pared: '#4c4652', cielo: '#0d0f18', zocalo: false });
    const sc = E.scene;
    const { box, cil, bola } = A;
    // piso de cemento con manchas y un techo bajo con vigas
    [[-2, 1.5, 1.6], [2.5, 0.8, 1.1], [-4, 2.8, 0.9], [1, 2.9, 1.3]].forEach(([x, z, r]) => cil(sc, r, r, 0.01, '#51493f', x, 0.006, z, { sombra: false, seg: 12 }));
    [-4, -1.5, 1, 3.5].forEach((x) => box(sc, 0.22, 0.22, 8.2, '#3a3029', x, 2.5, 0, { sombra: false }));
    // la escalera (sube hacia el fondo, a la derecha)
    for (let i = 0; i < 10; i++) {
      const z = 3.1 - i * 0.4, y = 0.12 + i * 0.24;
      box(sc, 0.95, 0.08, 0.38, '#7a5a3f', ESCALERA.x, y, z);
      box(sc, 0.95, y, 0.06, '#5b4636', ESCALERA.x, y / 2, z + 0.17);
    }
    box(sc, 0.06, 1.0, 4.1, '#6b4a33', ESCALERA.x - 0.5, 1.6, 1.1, { rx: -0.54 });
    box(sc, 1.1, 0.12, 0.7, '#6b4a33', ESCALERA.x, 2.5, -1.15);
    E.solido(ESCALERA.x, 1.05, 1.0, 4.4);
    // luz que baja de la puerta de arriba
    const luzArriba = new THREE.PointLight('#ffd9a0', 0.55, 6); luzArriba.position.set(ESCALERA.x, 2.6, -1.0); sc.add(luzArriba);

    // estante con frascos (izquierda, adelante)
    box(sc, 0.45, 2.0, 2.6, '#6b4a33', -5.7, 1.0, 2.2);
    [0.45, 1.05, 1.65].forEach((y) => box(sc, 0.5, 0.05, 2.6, '#8a5a3b', -5.62, y, 2.2));
    ['#d9a35b', '#de5546', '#9fd18b', '#f2c14e', '#c98e6a'].forEach((c, i) => [0.58, 1.18].forEach((y, k) => cil(sc, 0.08, 0.08, 0.2, null, -5.6, y, 1.2 + i * 0.45 + k * 0.1, { mat: A.matB(c, 0.85) })));
    E.solido(-5.7, 2.2, 0.5, 2.6);
    // cajas viejas apiladas
    const cajas = [[-3.6, 3.1, 0.8, 0.6, 0.7], [-3.6, 3.1, 0.6, 0.45, 0.5, 0.7], [-2.6, 3.3, 0.6, 0.5, 0.5], [3.4, 3.2, 0.9, 0.6, 0.6], [3.4, 3.2, 0.6, 0.4, 0.45, 0.6]];
    cajas.forEach(([x, z, w, h, d, y0]) => {
      box(sc, w, h, d, '#b08a5a', x, (y0 || 0) + h / 2, z);
      box(sc, w + 0.01, 0.05, 0.08, '#d8b77d', x, (y0 || 0) + h - 0.04, z);
    });
    E.solido(-3.6, 3.1, 0.8, 0.5); E.solido(-2.6, 3.3, 0.6, 0.5); E.solido(3.4, 3.2, 0.9, 0.6);
    // bicicleta vieja colgada y una alfombra enrollada
    cil(sc, 0.12, 0.12, 1.4, '#8f73cf', 1.8, 0.12, 3.4, { rz: PI / 2 });
    // telarañas en las esquinas
    const telarana = (x, y, z, ry) => {
      const gr = new THREE.Group(); gr.position.set(x, y, z); gr.rotation.y = ry; sc.add(gr);
      for (let i = 0; i < 5; i++) box(gr, 0.012, 0.012, 0.7, null, 0, 0, 0, { mat: A.matB('#e8e8f0', 0.55), sombra: false, rx: -0.5 + i * 0.25, ry: 0.78 });
      [0.15, 0.3, 0.45].forEach((r) => cil(gr, r, r, 0.006, null, 0, -r * 0.3, r * 0.3, { mat: A.matB('#e8e8f0', 0.35), sombra: false, seg: 6, rx: 0.9 }));
    };
    telarana(-5.85, 2.45, -3.85, 0); telarana(5.85, 2.45, -3.85, -PI / 2); telarana(-5.85, 2.45, 3.6, PI / 2);

    // ---------- reto 1: la reja y el laberinto de cajas (llave del altillo)
    const metal = '#8d939c';
    for (let x = -5.95; x <= REJA.x + 0.01; x += 0.2) {
      if (Math.abs(x - REJA.hueco) < 0.4) { box(sc, 0.04, 1.35, 0.04, metal, x, 1.2, REJA.z); continue; }   // barrotes doblados: el hueco de abajo
      box(sc, 0.04, 1.9, 0.04, metal, x, 0.95, REJA.z);
    }
    for (let z = -3.95; z <= REJA.z + 0.01; z += 0.2) box(sc, 0.04, 1.9, 0.04, metal, REJA.x, 0.95, z);
    box(sc, 3.4, 0.05, 0.05, metal, -4.3, 1.9, REJA.z); box(sc, 3.4, 0.05, 0.05, metal, -4.3, 0.55, REJA.z, { sombra: false });
    box(sc, 0.05, 0.05, 3.4, metal, REJA.x, 1.9, -2.3); box(sc, 0.05, 0.05, 3.4, metal, REJA.x, 0.55, -2.3);
    box(sc, 0.16, 0.2, 0.08, '#d9b23a', -3.3, 1.0, REJA.z + 0.06);   // candado de la reja
    // la reja: el niño no pasa; la cachorrita sí, por el hueco de abajo
    E.solido(-5.3, REJA.z, 1.4, 0.12);     // de -6.0 a -4.6
    E.solido(-3.2, REJA.z, 1.2, 0.12);     // de -3.8 a -2.6
    E.solido(REJA.x, -2.3, 0.12, 3.4);
    R.colsNino = [{ x1: -4.62, x2: -3.78, z1: REJA.z - 0.06, z2: REJA.z + 0.06 }];   // el hueco: solo para ella
    // laberinto de cajas detrás de la reja
    const cajaL = (x1, x2, zc) => {
      for (let x = x1; x < x2 - 0.05; x += 0.55) { const w = Math.min(0.55, x2 - x); box(sc, w - 0.03, 0.5 + ((x * 7) % 2 > 1 ? 0.15 : 0), 0.42, (x * 5) % 2 > 1 ? '#a57f50' : '#b8925f', x + w / 2, 0.27, zc); }
      E.solido((x1 + x2) / 2, zc, x2 - x1, 0.4);
    };
    cajaL(-6.0, -3.5, -1.67);
    cajaL(-5.0, -2.6, -2.93);
    // un palo de escoba atravesado en el pasillo del medio: hay que saltarlo
    R.palo = cil(sc, 0.03, 0.03, 0.9, '#c9a46a', -4.3, 0.12, -2.3, { rx: PI / 2 });
    box(sc, 0.18, 0.12, 0.06, '#e3c46a', -4.3, 0.12, -1.86);
    R.colPalo = { x1: -4.36, x2: -4.24, z1: -2.73, z2: -1.87 };
    // la llave del altillo (dorada, con cinta roja)
    R.llaves.altillo = llaveMesh(sc, LLAVE_A, '#e8c15a', '#de5546');

    // ---------- reto 2: la caldera, el ducto, la cajita y el ratoncito (llave del taller)
    cil(sc, 0.65, 0.7, 1.9, '#6d4b3b', 1.3, 0.95, -3.3);
    cil(sc, 0.7, 0.7, 0.12, '#4a3328', 1.3, 1.95, -3.3);
    const ventanita = box(sc, 0.32, 0.22, 0.05, null, 1.3, 0.55, -2.62, { mat: A.matB('#ff8a3a'), sombra: false });
    cil(sc, 0.12, 0.12, 0.8, '#7d838c', 1.3, 2.3, -3.3);
    box(sc, 3.6, 0.3, 0.3, '#7d838c', 3.1, 2.55, -3.6, { sombra: false });
    E.solido(1.3, -3.3, 1.4, 1.4);
    const luzCaldera = new THREE.PointLight('#ff9a4a', 0.5, 4.5); luzCaldera.position.set(1.3, 0.7, -2.2); sc.add(luzCaldera);
    // el ducto: un túnel bajito de metal a lo largo del fondo; su boca tiene una compuerta
    box(sc, 0.4, 0.9, 0.12, '#9aa0aa', 2.2, 0.45, BOCA.z);
    box(sc, 1.9, 0.9, 0.12, '#9aa0aa', 3.95, 0.45, BOCA.z);
    box(sc, 2.9, 0.1, 1.1, '#8d939c', 3.45, 0.95, -3.45);
    box(sc, 0.12, 0.9, 1.05, '#9aa0aa', 4.95, 0.45, -3.45);
    for (let x = 2.1; x < 4.9; x += 0.5) box(sc, 0.05, 0.92, 0.13, '#6d737c', x, 0.46, BOCA.z + 0.005, { sombra: false });
    E.solido(2.2, BOCA.z, 0.4, 0.16);
    E.solido(3.95, BOCA.z, 1.9, 0.16);
    E.solido(5.0, -3.45, 0.16, 1.1);
    const comp = new THREE.Group(); comp.position.set(BOCA.x1, 0.62, BOCA.z + 0.08); sc.add(comp);
    box(comp, 0.6, 0.6, 0.05, '#c2453a', 0.3, -0.3, 0);
    box(comp, 0.08, 0.08, 0.06, '#f2c14e', 0.5, -0.3, 0.03);
    R.compuerta = { g: comp, abierta: false, a: 0 };
    R.colCompuerta = { x1: BOCA.x1, x2: BOCA.x2, z1: BOCA.z - 0.08, z2: BOCA.z + 0.08 };
    E.cols.push(R.colCompuerta);
    R.colsNino.push({ x1: BOCA.x1, x2: BOCA.x2, z1: BOCA.z - 0.1, z2: BOCA.z + 0.12 });
    // el botón del piso y la cajita para empujar
    const boton = cil(sc, 0.3, 0.32, 0.06, '#c2453a', BOTON.x, 0.03, BOTON.z, { seg: 16 });
    box(sc, 0.08, 0.5, 0.08, '#7d838c', BOTON.x + 0.45, 0.25, BOTON.z - 0.3);
    box(sc, 0.7, 0.04, 0.04, '#7d838c', BOTON.x + 0.8, 0.5, BOTON.z - 0.3, { sombra: false });
    const cajita = new THREE.Group(); sc.add(cajita);
    box(cajita, 0.44, 0.34, 0.44, '#c9a46a', 0, 0.17, 0);
    box(cajita, 0.45, 0.05, 0.1, '#e9d4a3', 0, 0.3, 0);
    R.caja = { g: cajita, x: CAJA0.x, z: CAJA0.z, puesta: false, boton, colNino: null };
    cajita.position.set(CAJA0.x, 0, CAJA0.z);
    R.caja.colNino = { x1: 0, x2: 0, z1: 0, z2: 0 };
    R.colsNino.push(R.caja.colNino);
    // el ratoncito sentado sobre la llave del taller (plateada, con cinta azul)
    R.llaves.taller = llaveMesh(sc, LLAVE_T, '#c8ccd2', '#3d9bd4');
    const raton = new THREE.Group(); raton.position.set(LLAVE_T.x + 0.05, 0, LLAVE_T.z); raton.rotation.y = -PI / 2; sc.add(raton);
    box(raton, 0.14, 0.1, 0.2, '#9a9a9a', 0, 0.07, 0);
    box(raton, 0.09, 0.08, 0.09, '#a8a8a8', 0, 0.09, 0.13);
    [-1, 1].forEach((s) => cil(raton, 0.035, 0.035, 0.01, '#f2a7b5', s * 0.04, 0.15, 0.12, { rx: PI / 2 }));
    box(raton, 0.015, 0.015, 0.2, '#f2a7b5', 0, 0.04, -0.17, { rx: 0.3 });
    bola(raton, 0.012, '#111', 0.025, 0.11, 0.18); bola(raton, 0.012, '#111', -0.025, 0.11, 0.18);
    R.raton = { g: raton, fase: 'sentado', t: 0 };
    E.updates.push((dt, r) => {
      ventanita.material = A.matB(Math.sin(r * 3) > 0 ? '#ff8a3a' : '#ff7a2a');
      luzCaldera.intensity = 0.45 + Math.sin(r * 5) * 0.05;
      if (R.raton && R.raton.fase === 'sentado') R.raton.g.position.y = Math.abs(Math.sin(r * 2)) * 0.01;
    });

    // ---------- el foco
    const cable = box(sc, 0.015, 0.5, 0.015, '#222', 0, 2.35, 0.4, { sombra: false });
    const bombilla = bola(sc, 0.11, '#fff6c8', 0, 2.05, 0.4, 1);
    const cordon = box(sc, 0.01, 0.75, 0.01, '#e8e2d0', 0.12, 1.65, 0.4, { sombra: false });
    bola(sc, 0.03, '#de5546', 0.12, 1.27, 0.4);
    const luzFoco = new THREE.PointLight('#ffe2a8', 0, 13); luzFoco.position.set(0, 1.95, 0.4); sc.add(luzFoco);
    const luzCerca = new THREE.PointLight('#a9b8ff', 0.6, 3.8); sc.add(luzCerca);   // los ojos se acostumbran a la oscuridad
    R.luces = { foco: luzFoco, cerca: luzCerca, bombilla, cordon, cable };
    R.foco = !!prog().sotano.foco;
    pintarFoco();

    agregarIntersSotano(E);
    E.inicio = { pos: [4.5, 3.0], rot: -PI / 2 };
    const D = crearMolly(E, 4.9, 3.5, -PI / 2);
    E.alEntrar = () => {
      const p = prog();
      guardarSotano({ visitas: (p.sotano.visitas || 0) + 1 });
      if (!R.foco) A.decir(A.P, `Está muy oscuro… me da un poquito de miedo. Menos mal que ${nom()} está conmigo.`, 3.6);
      else A.decir(A.P, '¡El sótano! Aquí hay muchas cosas viejas.', 2.6);
      D.anim = 'feliz'; D.salto = 0.55; A.sfx('ladrido');
      if (!p.llaves.altillo || !p.llaves.taller) setTimeout(() => { if (R.D === D && A.escena && A.escena.nombre === 'sotano') A.decir(D, 'Snif, snif… ¡Guau!', 1.8); }, 3800);
    };
    return E;
  }
  function llaveMesh(sc, p, c, cinta) {
    const gr = new THREE.Group(); gr.position.set(p.x, 0.05, p.z); sc.add(gr);
    A.cil(gr, 0.07, 0.07, 0.03, c, -0.12, 0, 0, { seg: 10 });
    A.box(gr, 0.24, 0.03, 0.04, c, 0.05, 0, 0);
    A.box(gr, 0.04, 0.03, 0.07, c, 0.14, 0, 0.04);
    A.box(gr, 0.04, 0.03, 0.05, c, 0.07, 0, 0.03);
    A.box(gr, 0.05, 0.02, 0.12, cinta, -0.2, 0.01, 0.02, { ry: 0.5 });
    return gr;
  }
  function pintarFoco() {
    const L = R.luces;
    if (!L) return;
    L.foco.intensity = R.foco ? 1.0 : 0;
    L.bombilla.material = R.foco ? A.matB('#fff2b0') : A.mat('#8a8676');
  }
  function prenderFoco() {
    if (R.foco) return;
    R.foco = true; pintarFoco();
    guardarSotano({ foco: true });
    A.sfx('click');
    if (R.luces) { R.luces.cordon.position.y = 1.5; setTimeout(() => { if (R.luces) R.luces.cordon.position.y = 1.65; }, 300); }
    A.cambiar({ animo: 4 });
    A.decir(A.P, '¡Ahora sí se ve todo! Ya no da tanto miedo.', 2.6);
    A.evento('sotanoFoco', { on: true });
  }

  function agregarIntersSotano(E) {
    const it = (nombre, en, mira, radio, extra) => { const x = A.etiquetaInter(nombre, en, mira, radio, Object.assign({ album: 'Sótano' }, extra)); E.inters.push(x); return x; };
    const libreReto = (k) => !tieneLlave(k) && !R.ctl && !R.carga;
    it('Foco', [0.3, 1.0], [0, 0.4], 1.1, {
      alto: 2.4,
      rotulo: () => (R.foco ? 'Foco' : 'Foco (salta y jala el cordón)'),
      abrir: () => ({
        titulo: 'El foco del sótano',
        texto: R.foco ? 'El foco alumbra todo el sótano.' : 'El cordón del foco cuelga alto. Si saltas (Z) debajo, lo alcanzas… o te estiras bien.',
        opciones: R.foco ? [] : [{ texto: 'Estirarte y jalar el cordón', nota: 'Clic: ¡luz!', min: 1, anim: 'estirarse', dur: 1.2, esfuerzo: false, progreso: 'Jalando el cordón', alTerminar: prenderFoco }],
      }),
    });
    it('Escalera', [ESCALERA.x - 1.0, ESCALERA.pie], [ESCALERA.x, ESCALERA.pie], 1.0, {
      abrir: () => ({
        titulo: 'La escalera', texto: 'Sube al pasillo de la casa.',
        opciones: [{ texto: 'Subir al pasillo', nota: R.carga ? `${nom()} todavía tiene la llave en la boca.` : `${nom()} sube contigo.`, min: 1, anim: 'saludar', dur: 0.6, esfuerzo: false, progreso: 'Subiendo', alTerminar: subirDelSotano }],
      }),
    });
    it('Reja', [REJA.hueco + 0.4, REJA.z + 0.75], [REJA.hueco + 0.4, REJA.z], 1.2, {
      alto: 2.1,
      abrir: () => {
        if (tieneLlave('altillo')) return { titulo: 'La reja', texto: `Detrás ya no queda nada: la llave del altillo la tienes tú, gracias a ${nom()}.`, opciones: [] };
        return {
          titulo: 'Una reja con candado',
          texto: `Detrás de la reja, entre cajas, algo brilla: ¡una llave con cinta roja! Tú no cabes… pero abajo hay un hueco del tamaño de ${nom()}.`,
          opciones: [{ texto: `Pedirle ayuda a ${nom()}`, nota: `Juegas con ${nom()}: entra por el hueco, cruza el laberinto y trae la llave.`, bloqueado: libreReto('altillo') ? null : `${nom()} está ocupada.`,
            min: 1, anim: 'senalar', dur: 0.8, esfuerzo: false, progreso: `¡Busca, ${nom()}!`, alTerminar: () => tomarControl('altillo') }],
        };
      },
    });
    it('Compuerta del ducto', [2.7, -2.1], [2.7, BOCA.z], 1.1, {
      alto: 1.3,
      abrir: () => {
        if (tieneLlave('taller')) return { titulo: 'El ducto de la caldera', texto: 'El ducto ya está vacío. ¡Ni el ratoncito volvió!', opciones: [] };
        return {
          titulo: 'El ducto de la caldera',
          texto: R.compuerta.abierta
            ? `La compuerta está abierta. Al fondo del ducto chillan: ¡un ratoncito sentado sobre una llave! Es muy bajito para ti, no para ${nom()}.`
            : `La compuerta está cerrada. Tiene un cable hasta ese botón rojo del piso: algo pesado encima la abriría. Adentro se escucha "¡iii, iii!".`,
          opciones: [{ texto: `Pedirle ayuda a ${nom()}`, nota: R.compuerta.abierta ? 'Ladrando, el ratoncito se va.' : `${nom()} puede empujar la cajita hasta el botón.`, bloqueado: libreReto('taller') ? null : `${nom()} está ocupada.`,
            min: 1, anim: 'senalar', dur: 0.8, esfuerzo: false, progreso: `¡Vamos, ${nom()}!`, alTerminar: () => tomarControl('taller') }],
        };
      },
    });
    it('Cajas viejas', [-3.1, 2.4], [-3.4, 3.1], 1.0, {
      abrir: () => ({
        titulo: 'Cajas viejas', texto: 'Dicen "Navidad", "Ropa de bebé" y "Juguetes de papá".',
        opciones: [{ texto: 'Mirar los juguetes de papá', nota: 'Un trompo, canicas y un carrito de lata.', min: 4, ef: { animo: 5 }, anim: 'buscar', dur: 2.2, esfuerzo: false, progreso: 'Mirando juguetes viejos',
          alTerminar: () => A.decir(A.P, '¡Un trompo! Papá jugaba con esto cuando era chico.', 2.6) }],
      }),
    });
    it('Caldera vieja', [0.2, -2.2], [1.3, -3.0], 1.0, {
      abrir: () => ({
        titulo: 'La caldera vieja', texto: 'Hace "brrrum" y calienta el agua de la casa. Está caliente: se mira de lejos, no se toca.',
        opciones: [{ texto: 'Mirarla de lejos', nota: 'Las cosas calientes no se tocan.', min: 2, anim: 'quieto', dur: 1.4, esfuerzo: false, progreso: 'Brrrum, brrrum…' }],
      }),
    });
  }

  function subirDelSotano() {
    soltar();
    if (R.carga) entregar();
    if (H.perro) H.perro.modo = 'sigue';
    A.irA('pasillo', { desde: 'sotano', titulo: 'Pasillo' });
  }

  // ---------- la cajita que empuja la cachorrita
  function empujarCaja() {
    const C = R.caja, D = R.D;
    if (!C || C.puesta || !D) return;
    const q = D.root.position, med = 0.22 + 0.17;
    let dx = C.x - q.x, dz = C.z - q.z;
    if (Math.abs(dx) >= med || Math.abs(dz) >= med) return;
    let nx = C.x, nz = C.z;
    if (Math.abs(dx) > Math.abs(dz)) nx = q.x + Math.sign(dx || 1) * med; else nz = q.z + Math.sign(dz || 1) * med;
    // que no atraviese paredes ni muebles
    const ok = (x, z) => x > -2.2 && x < 3.8 && z > -2.5 && z < 3.0 && !A.escena.cols.some((c) => c !== R.colCompuerta && x + 0.22 > c.x1 && x - 0.22 < c.x2 && z + 0.22 > c.z1 && z - 0.22 < c.z2);
    if (ok(nx, nz)) { C.x = nx; C.z = nz; }
    else {
      // la caja no se mueve: la cachorrita no la atraviesa
      dx = q.x - C.x; dz = q.z - C.z;
      if (Math.abs(dx) > Math.abs(dz)) q.x = C.x + Math.sign(dx || 1) * med; else q.z = C.z + Math.sign(dz || 1) * med;
    }
    C.g.position.set(C.x, 0, C.z);
    if (Math.hypot(C.x - BOTON.x, C.z - BOTON.z) < 0.32) {
      C.puesta = true; C.x = BOTON.x; C.z = BOTON.z; C.g.position.set(C.x, 0.04, C.z);
      C.boton.position.y = 0.01;
      abrirCompuerta();
    }
  }
  function abrirCompuerta() {
    const K = R.compuerta;
    if (K.abierta) return;
    K.abierta = true;
    const i = A.escena.cols.indexOf(R.colCompuerta);
    if (i >= 0) A.escena.cols.splice(i, 1);
    A.sfx('abrir');
    A.avisar('¡Clac! La cajita pisa el botón y la compuerta del ducto se abre.', 'bien');
    A.evento('sotanoCompuerta', {});
  }
  function colsDelNino(on) {
    const E = A.escena;
    R.colsNino.forEach((c) => {
      const i = E.cols.indexOf(c);
      if (on && i < 0) E.cols.push(c);
      if (!on && i >= 0) E.cols.splice(i, 1);
    });
  }

  function actualizarSotano(dt, r) {
    const D = R.D, P = A.P;
    if (!D) return;
    R.ladrar = Math.max(0, R.ladrar - dt);
    R.olfato = Math.max(0, R.olfato - dt);
    // la luz: oscuro con el foco apagado (las luces del motor se fijan cada cuadro, después del motor)
    const E = A.escena;
    const foco = R.foco;
    if (E.hemi) E.hemi.intensity = foco ? 0.42 : 0.14;
    if (E.sol) E.sol.intensity = foco ? 0.18 : 0.04;
    const f = R.ctl ? D.root.position : P.root.position;
    R.luces.cerca.position.set(f.x, 1.6, f.z + 0.3);
    R.luces.cerca.intensity = foco ? 0 : 0.7;
    // saltando debajo del cordón se prende el foco
    if (!foco && !R.ctl && A.salto && A.salto.enAire && A.salto.y > 0.2 && Math.hypot(P.root.position.x - 0.12, P.root.position.z - 0.4) < 0.7) prenderFoco();
    // lo que bloquea solo al niño: la reja, la boca del ducto y la cajita
    const C = R.caja;
    if (C.colNino) Object.assign(C.colNino, { x1: C.x - 0.24, x2: C.x + 0.24, z1: C.z - 0.24, z2: C.z + 0.24 });
    colsDelNino(!R.ctl);
    // el palo de escoba: solo se pasa saltando
    const iP = E.cols.indexOf(R.colPalo);
    const saltando = D.salto > 0.08;
    if (saltando && iP >= 0) E.cols.splice(iP, 1);
    if (!saltando && iP < 0) {
      const q = D.root.position, c = R.colPalo;
      // si cae justo encima del palo, no queda atrapada: el palo se pone después
      if (!(q.x > c.x1 - 0.17 && q.x < c.x2 + 0.17 && q.z > c.z1 - 0.17 && q.z < c.z2 + 0.17)) E.cols.push(c);
    }

    if (R.ctl) {
      R.ctl.t += dt;
      if (respaldo.on) moverRespaldo(dt);
      empujarCaja();
      const q = D.root.position;
      // pistas cortas, una vez cada una
      const pista = (k, txt) => { if (!R.avisos[k]) { R.avisos[k] = true; A.avisar(txt); } };
      if (R.ctl.reto === 'altillo' && q.z < -1.9 && q.x < -4.0 && q.x > -4.8 && !saltando) pista('palo', 'Un palo de escoba en el camino: ¡salta (Z) para pasarlo!');
      if (R.ctl.reto === 'taller' && !R.compuerta.abierta && R.ctl.t > 2 && dist(q, R.caja) < 1.2) pista('caja', 'Empuja la cajita caminando contra ella, hasta el botón rojo.');
      if (R.ctl.t > 14 && !R.carga) pista('olfato', `¿Perdida? Olfatea (${A.tactil ? 'botón Olfatear' : 'tecla O'}) y sigue el rastro verde.`);
    } else seguirOTraer(dt);

    // el ratoncito que se asusta y se va por su hueco
    const ra = R.raton;
    if (ra && ra.fase === 'sentado' && R.ctl && dist(D.root.position, ra.g.position) < 0.7 && !R.avisos.raton) {
      R.avisos.raton = true;
      A.avisar(`El ratoncito no se mueve de la llave. ¡Ládrale! (${A.tactil ? 'botón Ladrar' : 'tecla B'})`);
    }
    if (ra && ra.fase === 'huye') {
      ra.t += dt;
      ra.g.position.x += dt * 2.4; ra.g.rotation.y = PI / 2;
      if (ra.g.position.x > 4.85) { ra.fase = 'fuera'; ra.g.visible = false; }
    }
    // recoger la llave con la boca
    if (!R.carga && R.ctl) {
      const k = R.ctl.reto, m = R.llaves[k], libre = k === 'altillo' || (ra && ra.fase !== 'sentado');
      if (m && m.parent && dist(D.root.position, m.position) < 0.42) {
        if (!libre) { if (!R.avisos.ratonLlave) { R.avisos.ratonLlave = true; A.decir(D, '¡Grrr!', 1.2, false); } }
        else {
          R.carga = k;
          m.parent.remove(m);
          m.position.set(0, -0.08, 0.27); m.rotation.set(0, PI / 2, 0); m.scale.setScalar(1.15);
          D.cabeza.add(m);
          D.anim = 'feliz'; D.salto = 0.55; A.sfx('moneda');
          A.avisar(`¡${nom()} tiene la llave en la boca! Llévasela a ${yo()}.`, 'bien');
          A.evento('sotanoLlave', { llave: k, fase: 'boca' });
        }
      }
    }
    // entregar la llave al niño
    if (R.carga && dist(D.root.position, P.root.position) < 1.0) entregar();
  }
  function seguirOTraer(dt) {
    const D = R.D;
    if (!D) return;
    if (A.estado().accion) { D.anim = 'feliz'; return; }
    seguir(D, dt);
  }
  function entregar() {
    const k = R.carga, D = R.D;
    R.carga = null;
    const m = R.llaves[k];
    if (m && m.parent) m.parent.remove(m);
    soltar();
    guardarLlave(k);
    D.anim = 'feliz'; D.salto = 0.55; A.sfx('ladrido');
    A.banner('bien', '¡Una llave!', k === 'altillo' ? 'La llave del altillo' : 'La llave del taller de papá', `${nom()} te la trajo en la boca.`);
    A.sfx('logro');
    A.cambiar({ animo: 8, confianza: 4 });
    if (H.perro && H.perro.cambiarVinculo) H.perro.cambiarVinculo(4);
    A.decir(A.P, `¡Gracias, ${nom()}! ¡Eres la mejor ayudante!`, 2.6);
    A.anotar(`En el sótano, ${nom()} encontró la llave de ${LUGAR[k]} y me la trajo.`, 'bien');
    A.evento('sotanoLlave', { llave: k, fase: 'entregada' });
    const p = prog();
    if (p.llaves.altillo && p.llaves.taller && H.logros) H.logros.lograr('llavero');
    setTimeout(() => A.avisar(k === 'altillo' ? 'La puerta del altillo está en el pasillo.' : 'La puerta del taller de papá está en la sala.'), 1800);
  }
  // respaldo sin A.controlar: lo que el motor movió al niño se lo pasamos a la cachorrita
  function moverRespaldo() {
    const P = A.P, p = P.root.position, o = respaldo.pos;
    const dx = p.x - o.x, dz = p.z - o.z;
    p.x = o.x; p.z = o.z; P.root.rotation.y = respaldo.ry; P.anim = 'quieto';
    if (dx || dz) {
      const D = R.D, k = 1.3;
      A.moverEn(D.root, dx * k, dz * k, 0.17);
      D.root.rotation.y = Math.atan2(dx, dz); D.anim = 'caminar'; D.vel = 1;
    } else if (R.D.anim === 'caminar') R.D.anim = 'quieto';
  }

  // ================================================================ las puertas con candado (pasillo y sala)
  const PUERTAS = {
    altillo: { lugar: 'pasillo', x: -2.0, ancho: 0.9, color: '#9e6b47', letrero: 'Altillo', titulo: 'El altillo' },
    taller: { lugar: 'sala', x: 3.3, ancho: 0.95, color: '#5b7a8a', letrero: 'Taller', titulo: 'El taller de papá' },
  };
  const SOTANO_X = 2.95;
  function puertaPared(E, x, ancho, color, conCandado) {
    const sc = E.scene, z = -E.d / 2 + 0.02;
    A.box(sc, ancho + 0.16, 2.2, 0.06, '#6b4a33', x, 1.1, z, { sombra: false });
    A.box(sc, ancho, 2.08, 0.08, color, x, 1.04, z + 0.02, { sombra: false });
    A.box(sc, ancho * 0.7, 0.6, 0.09, new THREE.Color(color).multiplyScalar(0.85).getStyle(), x, 1.45, z + 0.025, { sombra: false });
    A.box(sc, 0.07, 0.07, 0.12, '#e8c15a', x + ancho / 2 - 0.13, 1.0, z + 0.06, { sombra: false });
    let candado = null;
    if (conCandado) {
      candado = new THREE.Group(); candado.position.set(x + ancho / 2 - 0.13, 0.82, z + 0.1); E.scene.add(candado);
      A.box(candado, 0.16, 0.14, 0.06, '#d9b23a', 0, 0, 0);
      A.cil(candado, 0.06, 0.06, 0.03, '#9aa0aa', 0, 0.09, 0, { rx: PI / 2, seg: 10 });
      A.box(candado, 0.03, 0.05, 0.065, '#1d2340', 0, -0.01, 0.002);
    }
    return candado;
  }
  function letrero(E, x, y, txt, color) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    const c = cv.getContext('2d');
    c.fillStyle = color || '#f6e3b4'; c.fillRect(0, 0, 256, 64);
    c.fillStyle = '#3a2a20'; c.font = 'bold 36px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 128, 34);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.155), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
    m.position.set(x, y, -E.d / 2 + 0.08); E.scene.add(m);
  }
  function puertaConLlave(E, k) {
    const D = PUERTAS[k];
    const candado = puertaPared(E, D.x, D.ancho, D.color, true);
    letrero(E, D.x, 2.32, D.letrero);
    E.refrescos.push(() => { candado.visible = !abierta(k); });
    E.inters.push(A.etiquetaInter(`Puerta del ${k === 'altillo' ? 'altillo' : 'taller'}`, [D.x, -E.d / 2 + 0.75], [D.x, -E.d / 2], 0.9, {
      alto: 2.3,
      abrir: () => {
        const llave = tieneLlave(k), ya = abierta(k);
        if (!llave) {
          const molly = H.perro && H.perro.D && A.escena && A.escena.npcs.includes(H.perro.D);
          if (molly) { H.perro.D.anim = 'feliz'; A.sfx('ladrido'); }
          return {
            titulo: `${D.titulo}: cerrado con candado`,
            texto: k === 'altillo'
              ? `La puerta del altillo, donde la abuela guarda sus recuerdos, está cerrada con candado. Mamá dice que la llave se perdió en el sótano…${molly ? ` ${nom()} olfatea la puerta y mira hacia el sótano.` : ''}`
              : `El taller de papá está cerrado con candado. Papá cuenta que un ratoncito se llevó la llave al ducto de la caldera, en el sótano.${molly ? ` ${nom()} olfatea el piso, ¡snif, snif!` : ''}`,
            opciones: [],
          };
        }
        return {
          titulo: D.titulo,
          texto: ya ? 'La puerta ya no tiene candado.' : `¡Tienes la llave que te trajo ${nom()}! Clic, clic… el candado se abre.`,
          opciones: [{ texto: ya ? 'Entrar' : 'Abrir con la llave y entrar', nota: k === 'altillo' ? 'Una escalerita sube al altillo.' : 'Huele a madera y a pintura.', min: 1, anim: 'saludar', dur: 0.7, esfuerzo: false, progreso: ya ? 'Entrando' : 'Abriendo el candado',
            alTerminar: () => entrarA(k) }],
        };
      },
    }));
  }
  function entrarA(k) {
    if (!abierta(k)) {
      const p = prog(); guardarSotano({ abiertas: Object.assign({}, p.sotano.abiertas, { [k]: true }) });
      A.sfx('abrir');
    }
    if (H.perro) H.perro.modo = 'sigue';
    A.irA(k, { desde: PUERTAS[k].lugar, titulo: PUERTAS[k].titulo, tips: k === 'altillo'
      ? ['Aquí la abuela guarda sus recuerdos.', 'Mira todo con cuidado.', 'Para volver, usa la escalerita.']
      : ['El taller de papá: madera, pintura y herramientas.', 'Las herramientas filudas solo con papá.', 'Para volver, usa la puerta.'] });
  }
  function puertaSotano(E) {
    puertaPared(E, SOTANO_X, 0.95, '#6b5a4a', false);
    letrero(E, SOTANO_X, 2.32, 'Sótano', '#d9cdb6');
    E.inters.push(A.etiquetaInter('Puerta del sótano', [SOTANO_X, -E.d / 2 + 0.75], [SOTANO_X, -E.d / 2], 0.9, {
      alto: 2.3,
      activo: () => A.S.fase !== 'colegio',
      abrir: () => {
        const p = prog(), faltan = !p.llaves.altillo || !p.llaves.taller;
        return {
          titulo: 'La puerta del sótano',
          texto: !p.sotano.visitas ? `Una escalera baja a lo oscuro. Abajo se escucha un ruidito: "¡iii, iii!"… ¿Bajas con ${nom()}?`
            : faltan ? 'La escalera baja al sótano. Allá abajo todavía hay algo que encontrar.' : 'La escalera baja al sótano: cajas, la caldera y el foco.',
          opciones: [{ texto: `Bajar al sótano con ${nom()}`, nota: p.sotano.foco ? 'El foco ya está arreglado.' : 'Está oscurito: no vas solo, vas con ella.', min: 1, anim: 'saludar', dur: 0.6, esfuerzo: false, progreso: 'Bajando',
            alTerminar: bajarAlSotano }],
        };
      },
    }));
  }
  function bajarAlSotano() {
    if (H.perro) H.perro.modo = 'sigue';
    A.irA('sotano', { desde: 'pasillo', titulo: 'Sótano', tips: [`${nom()} baja contigo.`, 'Hay un foco con cordón en el centro.', 'Cuando quieras volver, sube por la escalera.'] });
  }

  // ================================================================ el altillo y el taller
  function construirAltillo() {
    const E = A.nuevaEscena('altillo', 'El altillo', 8, 6, { piso: '#a0784f', pared: '#d9c3a0', cielo: '#2a2238' });
    const sc = E.scene, { box, cil, bola } = A;
    // vigas del techo inclinado, pegadas a la pared del fondo (no tapan la cámara)
    [-3, -1, 1, 3].forEach((x) => box(sc, 0.14, 0.14, 1.6, '#6b4a33', x, 2.25, -2.4, { rx: -0.6, sombra: false }));
    box(sc, 8.0, 0.14, 0.14, '#6b4a33', 0, 2.5, -2.95, { sombra: false });
    // ventana redonda con luz de la tarde
    cil(sc, 0.5, 0.5, 0.06, '#ffffff', 0, 1.7, -2.97, { rx: PI / 2, seg: 20 });
    cil(sc, 0.42, 0.42, 0.07, null, 0, 1.7, -2.96, { rx: PI / 2, seg: 20, mat: A.matB('#ffe3a0') });
    const luz = new THREE.PointLight('#ffd89a', 0.9, 9); luz.position.set(0, 1.6, -1.8); sc.add(luz);
    box(sc, 1.2, 0.004, 1.6, null, 0.1, 0.012, -1.6, { mat: A.matB('#fff0c2', 0.3), sombra: false });
    // baúl de la abuela
    box(sc, 1.2, 0.55, 0.65, '#7a4a2a', -2.4, 0.28, -2.4);
    box(sc, 1.22, 0.12, 0.67, '#8a5a3b', -2.4, 0.6, -2.4);
    [-0.4, 0.4].forEach((k) => box(sc, 0.06, 0.58, 0.68, '#d9b23a', -2.4 + k, 0.3, -2.4));
    E.solido(-2.4, -2.4, 1.2, 0.65);
    // mecedora
    box(sc, 0.6, 0.06, 0.55, '#8a5a3b', 2.6, 0.45, -1.6);
    box(sc, 0.6, 0.7, 0.06, '#8a5a3b', 2.6, 0.8, -1.88);
    [-0.27, 0.27].forEach((k) => box(sc, 0.05, 0.08, 0.8, '#6b4a33', 2.6 + k, 0.06, -1.6, { rx: 0.1 }));
    E.solido(2.6, -1.65, 0.65, 0.7);
    // caja de música, maniquí con sombrero, cajas y fotos
    box(sc, 0.6, 0.6, 0.6, '#b08a5a', 2.9, 0.3, 1.8); box(sc, 0.3, 0.16, 0.22, '#c2453a', 2.9, 0.68, 1.8); box(sc, 0.28, 0.02, 0.2, '#f2c14e', 2.9, 0.77, 1.8);
    E.solido(2.9, 1.8, 0.6, 0.6);
    cil(sc, 0.04, 0.04, 1.3, '#5b4636', -3.2, 0.65, 1.2); box(sc, 0.4, 0.6, 0.22, '#8f73cf', -3.2, 1.35, 1.2);
    cil(sc, 0.32, 0.32, 0.03, '#3a2a20', -3.2, 1.9, 1.2, { seg: 16 }); cil(sc, 0.16, 0.18, 0.18, '#3a2a20', -3.2, 1.99, 1.2, { seg: 16 });
    E.solido(-3.2, 1.2, 0.5, 0.5);
    A.cuadro(E, -0.9, 1.5, 0.5, 0.4, '#c98e6a'); A.cuadro(E, 1.0, 1.5, 0.4, 0.5, '#9fd18b');
    const it = (n, en, mira, radio, extra) => E.inters.push(A.etiquetaInter(n, en, mira, radio, Object.assign({ album: 'Altillo' }, extra)));
    it('Baúl de la abuela', [-2.4, -1.5], [-2.4, -2.4], 1.0, {
      abrir: () => ({
        titulo: 'El baúl de la abuela', texto: 'Adentro hay un álbum de fotos, cartas con cintas y un tejido a medio hacer.',
        opciones: [{ texto: 'Mirar las fotos antiguas', nota: `¡Mamá de chiquita, con trenzas y un perrito parecido a ${nom()}!`, min: 6, ef: { animo: 7, confianza: 3 }, anim: 'leer', dur: 3.0, esfuerzo: false, progreso: 'Mirando fotos',
          alTerminar: () => { A.decir(A.P, `¡Mamá tenía mi edad aquí! Y su perrito se parece a ${nom()}.`, 3); A.anotar('En el altillo vi fotos de mamá cuando era chiquita.', 'bien'); } }],
      }),
    });
    it('Caja de música', [2.9, 1.0], [2.9, 1.8], 1.0, {
      abrir: () => ({
        titulo: 'La caja de música', texto: 'Es de la abuela. Tiene una bailarina chiquita adentro.',
        opciones: [{ texto: 'Darle cuerda', nota: 'Suena una canción suavecita.', min: 3, ef: { animo: 5 }, anim: 'quieto', dur: 2.4, esfuerzo: false, progreso: 'Tilín, tilín…',
          pasos: [{ dur: 0.2, min: 0, alTerminar: () => A.sfx('feliz') }, { anim: 'quieto', dur: 2.4, min: 3, progreso: 'Tilín, tilín…' }] }],
      }),
    });
    it('Mecedora', [2.6, -0.8], [2.6, -1.6], 0.9, {
      abrir: () => ({
        titulo: 'La mecedora', texto: 'Aquí la abuela tejía mirando por la ventana redonda.',
        opciones: [{ texto: 'Mecerte un ratito', nota: `${nom()} se echa a tus pies.`, min: 5, ef: { energia: 4, animo: 4 }, anim: 'quieto', dur: 2.6, esfuerzo: false, progreso: 'Meciéndote' }],
      }),
    });
    it('Sombrero del abuelo', [-2.5, 1.2], [-3.2, 1.2], 1.0, {
      abrir: () => ({
        titulo: 'El sombrero del abuelo', texto: 'Un sombrero grandote y un saco morado.',
        opciones: [{ texto: 'Probártelo', nota: '¡Te queda enorme!', min: 3, ef: { animo: 6 }, anim: 'saludar', dur: 1.8, esfuerzo: false, progreso: 'Probándote el sombrero',
          alTerminar: () => A.decir(A.P, '¡Me tapa hasta los ojos! Jajaja.', 2.4) }],
      }),
    });
    it('Escalerita', [0, 2.4], [0, 3.0], 1.0, {
      abrir: () => ({ titulo: 'La escalerita', texto: 'Baja al pasillo.', opciones: [{ texto: 'Bajar al pasillo', min: 1, anim: 'saludar', dur: 0.6, esfuerzo: false, progreso: 'Bajando', alTerminar: () => volverDe('altillo') }] }),
    });
    box(sc, 0.9, 0.05, 0.6, '#6b4a33', 0, 0.02, 3.0, { sombra: false });
    E.inicio = { pos: [0, 2.2], rot: PI };
    crearMolly(E, 0.8, 2.4, PI);
    E.alEntrar = () => { A.decir(A.P, '¡El altillo de la abuela! Huele a cosas antiguas.', 2.6); if (R.D) { R.D.anim = 'feliz'; R.D.salto = 0.55; } };
    return E;
  }
  function construirTaller() {
    const E = A.nuevaEscena('taller', 'Taller de papá', 8, 6, { piso: '#9a9690', pared: '#b8c4c9', cielo: '#1d2340' });
    const sc = E.scene, { box, cil, bola } = A;
    const luz = new THREE.PointLight('#fff4e0', 0.7, 10); luz.position.set(0, 2.3, 0); sc.add(luz);
    // tablero de herramientas
    box(sc, 3.0, 1.2, 0.05, '#c9a46a', -1.2, 1.6, -2.96);
    [[-2.3, '#9aa0aa', 0.06, 0.45], [-1.8, '#de5546', 0.1, 0.35], [-1.3, '#9aa0aa', 0.25, 0.06], [-0.7, '#3d9bd4', 0.08, 0.4], [-0.2, '#f2c14e', 0.3, 0.1]].forEach(([x, c, w, h]) => box(sc, w, h, 0.04, c, x, 1.6, -2.92));
    // mesa de trabajo y casita para pájaros
    box(sc, 2.6, 0.08, 0.9, '#8a5a3b', -1.2, 0.85, -2.4);
    [[-2.4, -2.0], [-2.4, -2.8], [0, -2.0], [0, -2.8]].forEach(([x, z]) => box(sc, 0.08, 0.85, 0.08, '#6b4a33', x, 0.42, z));
    E.solido(-1.2, -2.4, 2.6, 0.9);
    const casita = new THREE.Group(); casita.position.set(-1.0, 0.89, -2.4); sc.add(casita);
    const pared = box(casita, 0.36, 0.32, 0.3, '#d8b77d', 0, 0.16, 0);
    [-1, 1].forEach((s) => box(casita, 0.24, 0.03, 0.34, '#a57f50', s * 0.1, 0.38, 0, { rz: -s * 0.6 }));
    cil(casita, 0.05, 0.05, 0.02, '#3a2a20', 0, 0.18, 0.16, { rx: PI / 2 });
    E.refrescos.push(() => { pared.material = A.mat(prog().sotano.casita ? '#5b8fd1' : '#d8b77d'); });
    // bicicleta vieja, radio y latas de pintura
    cil(sc, 0.32, 0.32, 0.04, '#353b48', 2.4, 0.33, -2.6, { seg: 16 }); cil(sc, 0.32, 0.32, 0.04, '#353b48', 3.4, 0.33, -2.6, { seg: 16 });
    box(sc, 1.0, 0.05, 0.05, '#de5546', 2.9, 0.6, -2.6, { rz: 0.15 }); box(sc, 0.05, 0.45, 0.05, '#de5546', 2.5, 0.55, -2.6);
    E.solido(2.9, -2.6, 1.5, 0.4);
    box(sc, 0.5, 0.3, 0.22, '#6b4a33', 2.9, 0.95, 1.6); cil(sc, 0.08, 0.08, 0.02, '#f2c14e', 2.8, 0.95, 1.72, { rx: PI / 2 });
    box(sc, 0.8, 0.8, 0.5, '#8a5a3b', 2.9, 0.4, 1.6); E.solido(2.9, 1.6, 0.8, 0.5);
    [['#3d9bd4', -3.0], ['#de5546', -2.7], ['#f2c14e', -2.85]].forEach(([c, x], i) => cil(sc, 0.12, 0.12, 0.22, c, x, 0.11, 1.8 + (i === 2 ? 0.25 : 0)));
    E.solido(-2.85, 1.9, 0.6, 0.6);
    const it = (n, en, mira, radio, extra) => E.inters.push(A.etiquetaInter(n, en, mira, radio, Object.assign({ album: 'Taller' }, extra)));
    it('Casita para pájaros', [-1.0, -1.55], [-1.0, -2.4], 1.0, {
      abrir: () => {
        const hecha = !!prog().sotano.casita;
        return {
          titulo: 'La casita para pájaros', texto: hecha ? 'Tu casita azul ya está lista. ¡Papá se va a poner feliz!' : 'Papá la dejó a medio hacer. Le falta lijarla y pintarla. Solo lija y pincel: nada filudo.',
          opciones: hecha ? [] : [{ texto: 'Lijarla y pintarla de azul', nota: 'Con calma y cuidado.', min: 15, ef: { animo: 8, motivacion: 6 }, anim: 'cocinar', dur: 4, progreso: 'Lijando y pintando',
            alTerminar: () => { guardarSotano({ casita: true }); A.refrescar(); A.habito('Terminar lo que empiezas'); A.decir(A.P, '¡Quedó lindísima! Se la voy a mostrar a papá.', 2.6); } }],
        };
      },
    });
    it('Radio vieja', [2.9, 0.8], [2.9, 1.6], 1.0, {
      abrir: () => ({
        titulo: 'La radio de papá', texto: 'Una radio antigua con una perilla dorada.',
        opciones: [{ texto: 'Prenderla y bailar', nota: `${nom()} mueve la cola.`, min: 3, ef: { animo: 6, energia: -2 }, anim: 'aplaudir', dur: 2.4, esfuerzo: false, progreso: '¡Música!',
          pasos: [{ dur: 0.2, min: 0, alTerminar: () => { A.sfx('feliz'); if (R.D) { R.D.anim = 'feliz'; R.D.salto = 0.55; } } }, { anim: 'aplaudir', dur: 2.4, min: 3, progreso: '¡Música!' }] }],
      }),
    });
    it('Bicicleta de papá', [2.9, -1.8], [2.9, -2.6], 1.0, {
      abrir: () => ({ titulo: 'La bicicleta de papá', texto: 'Con esta bici aprendió a montar papá cuando era chico. Le falta aire a las llantas.',
        opciones: [{ texto: 'Mirarla bien', nota: 'Un día papá te enseña.', min: 2, ef: { animo: 3 }, anim: 'agacharse', dur: 1.6, esfuerzo: false, progreso: 'Mirando la bici' }] }),
    });
    it('Tablero de herramientas', [-1.9, -1.55], [-1.9, -2.9], 0.8, {
      abrir: () => ({ titulo: 'Las herramientas', texto: 'Martillo, sierra, destornilladores… Las filudas y pesadas se usan solo con papá.',
        opciones: [{ texto: 'Mirar sin tocar', nota: 'Así se cuida uno.', min: 2, anim: 'quieto', dur: 1.2, esfuerzo: false, progreso: 'Mirando' }] }),
    });
    it('Puerta', [0, 2.4], [0, 3.0], 1.0, {
      abrir: () => ({ titulo: 'La puerta del taller', texto: 'Vuelve a la sala.', opciones: [{ texto: 'Volver a la sala', min: 1, anim: 'saludar', dur: 0.6, esfuerzo: false, progreso: 'Saliendo', alTerminar: () => volverDe('taller') }] }),
    });
    E.inicio = { pos: [0, 2.2], rot: PI };
    crearMolly(E, 0.8, 2.4, PI);
    E.alEntrar = () => { A.decir(A.P, '¡El taller de papá! Aquí arregla todo.', 2.4); if (R.D) { R.D.anim = 'feliz'; R.D.salto = 0.55; } };
    return E;
  }
  function volverDe(k) {
    if (H.perro) H.perro.modo = 'sigue';
    A.irA(PUERTAS[k].lugar, { desde: k });
  }

  // ================================================================ ganchos
  A.alConstruir((nombre, E, desde) => {
    if (R.ctl) soltar(true);
    if (!MIS.includes(nombre)) { R.D = null; R.carga = null; R.llaves = {}; R.raton = null; R.caja = null; R.compuerta = null; R.luces = null; }
    R.avisos = {};
    if (nombre === 'pasillo') { puertaSotano(E); puertaConLlave(E, 'altillo'); }
    if (nombre === 'sala') puertaConLlave(E, 'taller');
    // al volver de mis lugares apareces frente a la puerta (y la cachorrita detrás)
    const vuelta = (nombre === 'pasillo' && (desde === 'sotano' || desde === 'altillo')) || (nombre === 'sala' && desde === 'taller');
    if (vuelta) {
      const x = desde === 'sotano' ? SOTANO_X : PUERTAS[desde].x;
      A.P.root.position.set(x, 0, -E.d / 2 + 0.9);
      A.P.root.rotation.y = 0;
      const D = H.perro && H.perro.D;
      if (D && E.npcs.includes(D)) D.root.position.set(x + 0.6, 0, -E.d / 2 + 1.3);
    }
  });
  A.alActualizar((dt, r) => {
    const E = A.escena;
    if (!E || A.estado().cargando) return;
    if (E.nombre === 'sotano') { actualizarSotano(dt, r); return; }
    if ((E.nombre === 'altillo' || E.nombre === 'taller') && R.D) { seguirOTraer(dt); return; }
    if (E.nombre === 'pasillo') ruido(dt);
  });
  // la pista del ruido: una vez al día, si todavía faltan llaves
  let tRuido = 0;
  function ruido(dt) {
    const S = A.S, st = A.estado();
    if (S.f.sotRuido || S.fase === 'colegio' || S.fase === 'prologo' || st.tutorial || st.panel || st.accion || st.visita || st.cine) { tRuido = 0; return; }
    const p = prog();
    if (p.llaves.altillo && p.llaves.taller) return;
    tRuido += dt;
    if (tRuido < 6) return;
    S.f.sotRuido = true;
    A.sfx('golpe');
    A.decir(A.P, p.sotano.visitas ? '¡Otra vez ese ruidito en el sótano! ¿Será el ratoncito?' : '¿Qué fue ese ruido? Vino de la puerta del sótano…', 3);
    const D = H.perro && H.perro.D;
    if (D && E_tiene(D)) { D.anim = 'feliz'; A.sfx('ladrido'); }
  }
  const E_tiene = (D) => !!(A.escena && A.escena.npcs.includes(D));

  A.registrarEscena('sotano', 'Sótano', construirSotano);
  A.registrarEscena('altillo', 'El altillo', construirAltillo);
  A.registrarEscena('taller', 'Taller de papá', construirTaller);
  crearHud();

  // para otros módulos y las pruebas
  H.sotano = {
    get R() { return R; },
    get controlando() { return controlando(); },
    tomarControl, soltar, olfatear, ladrar, saltar: saltarPerro, bajarAlSotano, entrarA,
    llaves: () => prog().llaves,
    // dar una llave desde otro módulo o una prueba (k = 'altillo' | 'taller')
    darLlave: (k, origen) => { if (!PUERTAS[k] || tieneLlave(k)) return false; guardarLlave(k); A.evento('sotanoLlave', { llave: k, fase: 'entregada', origen: origen || null }); return true; },
    PUNTOS: { REJA, LLAVE_A, RUTA_ALTILLO, BOTON, CAJA0, BOCA, LLAVE_T, RUTA_TALLER, SOTANO_X, PUERTAS },
  };
})();
