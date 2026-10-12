/* La piscina: un patio nuevo detrás del jardín (portón en la cerca de la derecha).
   - Tú te quedas en el borde (un adulto te cuida); la cachorrita sí nada.
   - Desafíos en primera persona: ves desde tus ojos y le dices por dónde ir con botones grandes
     (Adelante, Izquierda, Derecha, ¡Ven!, ¡Bucea!, ¡Sal!) o con el teclado. Ella nada por casillas.
   - Retos: el juguete hundido (bucear y traerlo), las 3 pelotitas (sin chocar el patito), el aro, la escalerita.
   - Si se equivoca, se confunde con ternura y lo vuelve a intentar. Al lograrlo: celebración, vínculo y ánimo.
   - Al salir se sacude el agua… ¡y te moja!
   - Progreso: H.progreso.guardar({ piscina: { retos: { juguete, pelotas, aro, escalera }, veces } }). */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.progreso) return;
  const A = H.motor.api;
  const { THREE, PI } = A;
  const h = (hh, mm) => hh * 60 + (mm || 0);
  const nina = () => !!(A.perfil && A.perfil.genero === 'nina');
  const g = (o, a) => (nina() ? a : o);
  const nom = () => (A.perfil && A.perfil.mascota && A.perfil.mascota.nombre) || 'Molly';
  const yo = () => (A.perfil && A.perfil.nombre) || A.CFG.nombre || 'Dani';
  const ang = (a) => { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; };
  const girar = (Q, obj, dt, k) => { Q.root.rotation.y += ang(obj - Q.root.rotation.y) * Math.min(1, dt * (k || 8)); };
  const suave = (k) => k * k * (3 - 2 * k);
  const diaHoy = () => { const d = H.progreso.cargar().dia || 1; return ((d - 1) % 7) + 1; };
  const conPapa = () => diaHoy() >= 6;   // el fin de semana te cuida papá; entre semana, mamá
  const adulto = () => (conPapa() ? 'papá' : 'mamá');
  const Adulto = () => (conPapa() ? 'Papá' : 'Mamá');

  // ---------- medidas de la piscina (hundida en el piso)
  const POOL = { x1: -2.6, x2: 3.4, z1: -3.0, z2: 0.4 };
  const PC = { x: (POOL.x1 + POOL.x2) / 2, z: (POOL.z1 + POOL.z2) / 2 };
  const AGUA = -0.1, FONDO = -0.75;
  const YN = AGUA - 0.36, YF = FONDO + 0.03;   // altura de las patitas al nadar / al bucear
  const COLS = 6, FILAS = 3;
  const CX = (c) => -2.1 + c, CZ = (r) => -2.5 + r;
  const KC = 2;                                 // tu columna (estás parado frente a ella)
  const BORDE = { x: CX(KC), z: 1.05 };
  const ESCALERA = { c: 5, r: 1, x: 3.25, z: CZ(1) };
  const PORTON = { x: 4.3, z: 2.75 };           // en el jardín

  const RETOS = {
    juguete: { titulo: 'El juguete hundido', nota: 'Bucea justo encima y te lo trae.', ini: [2, 2],
      meta: () => `El huesito de ${nom()} se hundió. ¿Ves las burbujitas? Llévala justo encima y dile "¡Bucea!".` },
    pelotas: { titulo: 'Las 3 pelotitas', nota: '¡Sin chocar con el patito!', ini: [2, 2],
      meta: () => `Lleva a ${nom()} hasta cada pelotita. ¡Cuidado con los patitos flotadores: no los choques!` },
    aro: { titulo: 'El aro flotante', nota: 'Pasar por el hueco del aro.', ini: [2, 2],
      meta: () => `Haz que ${nom()} pase por el hueco del aro. El hueco mira a los costados: entra con Izquierda o Derecha.` },
    escalera: { titulo: 'La escalerita', nota: 'Guíala y dile ¡Sal!', ini: [0, 0],
      meta: () => `${nom()} quiere salir. Llévala hasta la escalerita de metal y dile "¡Sal!".` },
  };
  const ORDEN_RETOS = ['juguete', 'pelotas', 'aro', 'escalera'];

  // ---------- estado
  const R = {
    E: null, D: null, adulto: null, agua: null, aguaBase: null, anillos: [], marca: null,
    activo: false, reto: null, items: [], errores: 0, logrados: [], t0: 0, menuT: 0,
  };
  const M = { en: 'deck', c: KC, r: 2, anim: null, cola: [], buffer: null, lleva: null, feliz: 0, onda: 0 };
  const guardado = () => (H.progreso.cargar().piscina || {});
  const retos = () => Object.assign({ juguete: false, pelotas: false, aro: false, escalera: false }, guardado().retos || {});

  // ---------- el portón en el jardín
  function cartel(txt, ancho, alto, fondo, tinta) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = Math.round(256 * alto / ancho);
    const cx = cv.getContext('2d');
    cx.fillStyle = fondo; cx.fillRect(0, 0, cv.width, cv.height);
    cx.fillStyle = tinta; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    const lineas = txt.split('\n');
    const fs = Math.min(cv.height / (lineas.length + 0.6), 46);
    cx.font = `bold ${fs}px sans-serif`;
    lineas.forEach((l, i) => cx.fillText(l, cv.width / 2, cv.height / 2 + (i - (lineas.length - 1) / 2) * fs * 1.1));
    const tex = new THREE.CanvasTexture(cv);
    return new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshBasicMaterial({ map: tex }));
  }
  function puedeIr() {
    if (A.llueve) return 'Está lloviendo: hoy la piscina está cerrada.';
    if (A.S.min >= h(19)) return 'Ya está oscureciendo. La piscina es de día.';
    return null;
  }
  function portonJardin(E) {
    const sc = E.scene, x = 4.9, z = PORTON.z;
    [-0.48, 0.48].forEach((k) => A.box(sc, 0.12, 1.35, 0.12, '#2f6fa6', x, 0.67, z + k));
    A.box(sc, 0.06, 0.06, 0.9, '#3d9bd4', x - 0.02, 1.0, z);
    A.box(sc, 0.06, 0.06, 0.9, '#3d9bd4', x - 0.02, 0.25, z);
    for (let i = -3; i <= 3; i++) A.box(sc, 0.04, 0.75, 0.04, '#3d9bd4', x - 0.02, 0.62, z + i * 0.12, { sombra: false });
    const s = cartel('PISCINA', 0.9, 0.3, '#3d9bd4', '#ffffff');
    s.position.set(x - 0.1, 1.55, z); s.rotation.y = -PI / 2; sc.add(s);
    // un flotador colgado en el poste
    const fl = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.06, 8, 16), A.mat('#de5546'));
    fl.position.set(x - 0.12, 0.95, z + 0.62); fl.rotation.y = PI / 2; sc.add(fl);
    E.solido(x, z, 0.25, 1.0);
    E.inters.push(A.etiquetaInter('Portón de la piscina', [PORTON.x, PORTON.z], [5.2, PORTON.z], 0.9, {
      album: 'Piscina',
      abrir: () => {
        const no = puedeIr();
        return {
          titulo: 'El portón de la piscina',
          texto: `Detrás del portón está la piscina. ${Adulto()} va contigo: a la piscina nunca se va solo.`,
          opciones: [{ texto: `Ir a la piscina con ${adulto()} y ${nom()}`, nota: `Tú te quedas en el borde; ${nom()} sí nada.`, bloqueado: no,
            min: 2, anim: 'saludar', dur: 0.8, esfuerzo: false, progreso: '¡A la piscina!', alTerminar: ir }],
        };
      },
    }));
  }
  function ir() {
    if (puedeIr()) return;
    if (H.perro) H.perro.modo = 'sigue';
    A.irA('piscina', { desde: 'jardin', titulo: 'Piscina', tips: [`${Adulto()} te acompaña y te cuida.`, `Tú te quedas en el borde: solo ${nom()} se mete al agua.`, 'Ve al borde de la piscina para los desafíos.'] });
  }
  function volver() {
    if (R.activo) return;
    if (H.perro) H.perro.modo = 'sigue';
    A.irA('jardin', { titulo: 'Jardín' });
  }

  // ---------- la escena
  function construirPiscina() {
    const E = A.nuevaEscena('piscina', 'Piscina', 12, 9, {
      exterior: true, piso: '#eadfc8', pared: '#f2f2ee', alto: 1.1, cielo: '#9fd3f0', zocalo: false,
      puertas: [{ lado: 'izq', c: 2.6, ancho: 1.4, salida: true, a: 'jardin', nombre: 'Jardín' }],
    });
    const sc = E.scene;
    const { box, cil, bola } = A;
    E.conPerro = true;
    // el piso tiene un hueco donde va la piscina
    const piso = sc.children.find((o) => o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.height === 0.2 && Math.abs(o.position.y + 0.1) < 1e-6);
    if (piso) {
      const { width: W, depth: D } = piso.geometry.parameters, px = piso.position.x, pz = piso.position.z;
      const L = px - W / 2, Rr = px + W / 2, T = pz - D / 2, B = pz + D / 2, c = '#eadfc8';
      piso.visible = false;
      box(sc, POOL.x1 - L, 0.2, D, c, (L + POOL.x1) / 2, -0.1, pz, { sombra: false });
      box(sc, Rr - POOL.x2, 0.2, D, c, (POOL.x2 + Rr) / 2, -0.1, pz, { sombra: false });
      box(sc, POOL.x2 - POOL.x1, 0.2, POOL.z1 - T, c, PC.x, -0.1, (T + POOL.z1) / 2, { sombra: false });
      box(sc, POOL.x2 - POOL.x1, 0.2, B - POOL.z2, c, PC.x, -0.1, (POOL.z2 + B) / 2, { sombra: false });
    }
    // baldosas del deck (rayitas)
    for (let x = -5.5; x <= 5.5; x += 1) {
      if (x < POOL.x1 - 0.3 || x > POOL.x2 + 0.3) box(sc, 0.02, 0.005, 9, '#d8cbb0', x, 0.003, 0, { sombra: false });
      else { box(sc, 0.02, 0.005, 4.5 + POOL.z1 - 0.3, '#d8cbb0', x, 0.003, (-4.5 + POOL.z1 - 0.3) / 2, { sombra: false }); box(sc, 0.02, 0.005, 4.5 - POOL.z2 - 0.3, '#d8cbb0', x, 0.003, (4.5 + POOL.z2 + 0.3) / 2, { sombra: false }); }
    }
    // la piscina por dentro: paredes y fondo de baldosas celestes
    const pw = POOL.x2 - POOL.x1, pd = POOL.z2 - POOL.z1, ph = -FONDO;
    box(sc, pw, 0.06, pd, '#8fd3ea', PC.x, FONDO - 0.03, PC.z, { sombra: false });
    box(sc, pw, ph, 0.06, '#7cc8e2', PC.x, FONDO / 2, POOL.z1 - 0.03, { sombra: false });
    box(sc, pw, ph, 0.06, '#7cc8e2', PC.x, FONDO / 2, POOL.z2 + 0.03, { sombra: false });
    box(sc, 0.06, ph, pd, '#7cc8e2', POOL.x1 - 0.03, FONDO / 2, PC.z, { sombra: false });
    box(sc, 0.06, ph, pd, '#7cc8e2', POOL.x2 + 0.03, FONDO / 2, PC.z, { sombra: false });
    // franja de baldosas azules arriba y líneas del fondo
    box(sc, pw, 0.1, 0.02, '#2f7fb8', PC.x, -0.06, POOL.z1 + 0.005, { sombra: false });
    box(sc, pw, 0.1, 0.02, '#2f7fb8', PC.x, -0.06, POOL.z2 - 0.005, { sombra: false });
    box(sc, 0.02, 0.1, pd, '#2f7fb8', POOL.x1 + 0.005, -0.06, PC.z, { sombra: false });
    box(sc, 0.02, 0.1, pd, '#2f7fb8', POOL.x2 - 0.005, -0.06, PC.z, { sombra: false });
    [-1, 1].forEach((k) => box(sc, pw - 1, 0.01, 0.12, '#3d8fc4', PC.x, FONDO + 0.005, PC.z + k * 0.85, { sombra: false }));
    // borde de baldosas blancas (lo que pisas)
    const bw = 0.3;
    box(sc, pw + bw * 2, 0.05, bw, '#f7f3ea', PC.x, 0.025, POOL.z1 - bw / 2);
    box(sc, pw + bw * 2, 0.05, bw, '#f7f3ea', PC.x, 0.025, POOL.z2 + bw / 2);
    box(sc, bw, 0.05, pd, '#f7f3ea', POOL.x1 - bw / 2, 0.025, PC.z);
    box(sc, bw, 0.05, pd, '#f7f3ea', POOL.x2 + bw / 2, 0.025, PC.z);
    E.solido(PC.x, PC.z, pw + 0.5, pd + 0.5);   // el niño NO se mete al agua

    // el agua: transparente y con olitas
    const geo = new THREE.PlaneGeometry(pw, pd, 30, 17);
    const agua = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#3fb8e6', transparent: true, opacity: 0.66, roughness: 0.12, metalness: 0.15, depthWrite: false }));
    agua.rotation.x = -PI / 2; agua.position.set(PC.x, AGUA, PC.z); agua.renderOrder = 2;
    sc.add(agua);
    R.agua = agua; R.aguaBase = Float32Array.from(geo.attributes.position.array);
    // anillos de onda (se reusan)
    R.anillos = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 24), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.x = -PI / 2; m.position.y = AGUA + 0.01; m.visible = false; m.renderOrder = 3;
      sc.add(m); R.anillos.push({ m, t: 0, vida: 0, max: 1 });
    }
    // marca amarilla de ayuda (después de equivocarse dos veces)
    R.marca = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 28), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    R.marca.rotation.x = -PI / 2; R.marca.position.y = AGUA + 0.02; R.marca.visible = false; R.marca.renderOrder = 3;
    sc.add(R.marca);

    // la escalerita de metal (a la derecha)
    const ex = ESCALERA.x, ez = ESCALERA.z, metal = '#c8ccd2';
    [-0.22, 0.22].forEach((k) => {
      cil(sc, 0.025, 0.025, 0.95, metal, ex, FONDO / 2 + 0.25, ez + k);
      cil(sc, 0.025, 0.025, 0.55, metal, ex + 0.27, 0.62, ez + k, { rz: PI / 2 });
      cil(sc, 0.025, 0.025, 0.9, metal, ex + 0.54, 0.43, ez + k);
    });
    [-0.6, -0.38, -0.16].forEach((y) => box(sc, 0.08, 0.03, 0.44, metal, ex - 0.02, y, ez, { sombra: false }));
    E.solido(ex + 0.54, ez, 0.2, 0.6);

    // afuera: pasto, árboles y la pared de la casa
    box(sc, 60, 0.1, 40, '#6fa65d', 0, -0.16, -24, { sombra: false });
    [[-8, -7, 2.2], [-2, -8.5, 2.6], [5, -7.5, 2.2], [10, -5, 2.4], [-10, 1, 2.0], [9, 3, 2.0]].forEach(([x, z, a], i) => A.arbol(sc, x, z, 0, a, ['#3f8f5a', '#2f7a4b', '#58a86b'][i % 3]));
    // sombrilla y reposeras
    const sx = -4.4, sz = -1.0;
    cil(sc, 0.04, 0.04, 2.2, '#f4f1ea', sx, 1.1, sz);
    cil(sc, 0.06, 1.35, 0.45, '#de5546', sx, 2.25, sz, { seg: 10 });
    cil(sc, 0.05, 0.7, 0.24, '#ffffff', sx, 2.4, sz, { seg: 10 });
    bola(sc, 0.06, '#f2c14e', sx, 2.5, sz);
    E.solido(sx, sz, 0.2, 0.2);
    const reposera = (x, z, color) => {
      box(sc, 0.62, 0.06, 1.1, color, x, 0.4, z + 0.15);
      box(sc, 0.62, 0.06, 0.62, color, x, 0.66, z - 0.55, { rx: -0.9 });
      [[-0.26, 0.6], [0.26, 0.6], [-0.26, -0.35], [0.26, -0.35]].forEach(([a, b]) => box(sc, 0.05, 0.4, 0.05, '#ffffff', x + a, 0.2, z + b));
      E.solido(x, z, 0.7, 1.5);
    };
    reposera(-4.6, 2.0, '#3d9bd4');
    reposera(-3.4, -3.0, '#f2c14e');
    box(sc, 0.6, 0.02, 0.4, '#f28fb3', -3.4, 0.44, -2.7, { sombra: false });   // toalla
    // flotadores en el piso y plantas
    [[4.8, -3.6, '#de5546'], [5.2, -2.6, '#9ff0c4']].forEach(([x, z, c]) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 8, 18), A.mat(c));
      t.rotation.x = -PI / 2; t.position.set(x, 0.1, z); t.castShadow = true; sc.add(t);
    });
    [[5.3, 3.6], [-5.4, -3.8], [1.0, -3.95]].forEach(([x, z]) => {
      cil(sc, 0.22, 0.17, 0.4, '#c56b4a', x, 0.2, z);
      bola(sc, 0.32, '#3f8f5a', x, 0.62, z, 1);
      E.solido(x, z, 0.5, 0.5);
    });
    // letrero de seguridad
    const s = cartel('Siempre con\nun adulto', 1.0, 0.5, '#ffffff', '#2f6fa6');
    s.position.set(1.0, 1.05, -4.42); sc.add(s);
    [-0.45, 0.45].forEach((k) => box(sc, 0.05, 1.3, 0.05, '#9aa0aa', 1.0 + k, 0.65, -4.45));

    // el adulto que te cuida, sentado en la reposera
    const ad = conPapa() ? A.crearPapa() : A.crearMama();
    ad.root.position.set(-4.6, 0, 2.15); ad.root.rotation.y = PI / 2 + 0.5;
    ad.sentado = true;
    sc.add(ad.root); E.npcs.push(ad);
    R.adulto = ad;
    // la cachorrita
    const D = A.crearPerro(A.perfil.mascota.color);
    D.voz = 'perro'; D.root.position.set(-4.0, 0, 2.4); D.root.rotation.y = PI / 2;
    sc.add(D.root); E.npcs.push(D);
    R.D = D; R.E = E;
    Object.assign(M, { en: 'deck', c: KC, r: 2, anim: null, cola: [], buffer: null, lleva: null, feliz: 0, onda: 0 });
    R.activo = false; R.reto = null; R.items = []; R.errores = 0;

    agregarInters(E);
    E.updates.push((dt, t) => olas(dt, t));
    E.inicio = { pos: [-5.0, 2.6], rot: PI / 2 };
    E.alEntrar = () => {
      A.decir(ad, `¡Qué rico día! Yo te cuido. Tú en el borde: solo ${nom()} se mete al agua.`, 3.4);
      D.anim = 'feliz'; D.salto = 0.55; A.sfx('ladrido');
    };
    return E;
  }

  function agregarInters(E) {
    const it = (nombre, en, mira, radio, extra) => { const x = A.etiquetaInter(nombre, en, mira, radio, Object.assign({ album: 'Piscina' }, extra)); E.inters.push(x); return x; };
    it('Borde de la piscina', [BORDE.x, BORDE.z + 0.1], [BORDE.x, PC.z], 1.1, { activo: () => !R.activo, abrir: () => menu(true) });
    it(Adulto(), [-3.8, 2.2], [-4.6, 2.15], 1.0, {
      alto: 1.6,
      abrir: () => ({
        titulo: Adulto(), texto: `${Adulto()}: "Aquí estoy, mirándote. En la piscina siempre con un adulto, ¿ya? Tú en el borde y ${nom()} nada."`,
        opciones: [
          { texto: 'Prometer que te quedas en el borde', nota: 'Cuidarte también es un hábito.', min: 2, ef: { confianza: 3 }, anim: 'saludar', dur: 1.2, esfuerzo: false, progreso: '¡Prometido!',
            alTerminar: () => A.decir(R.adulto, `¡Gracias, ${yo()}! Así me quedo tranquil${conPapa() ? 'o' : 'a'}.`, 2.6) },
          { texto: 'Volver al jardín', nota: `${nom()} viene contigo.`, min: 2, anim: 'saludar', dur: 0.8, esfuerzo: false, progreso: 'De vuelta', alTerminar: volver },
        ],
      }),
    });
    it('Portón', [-5.3, 2.6], [-6, 2.6], 0.9, {
      activo: () => !R.activo,
      abrir: () => ({
        titulo: 'El portón', texto: 'Por aquí se vuelve al jardín.',
        opciones: [{ texto: 'Volver al jardín', nota: `${adulto()} y ${nom()} vienen contigo.`, min: 2, anim: 'saludar', dur: 0.8, esfuerzo: false, progreso: 'De vuelta', alTerminar: volver }],
      }),
    });
  }

  // ---------- el menú de desafíos
  function menu(desdeBorde) {
    const hechos = retos();
    const cansada = H.perro && H.perro.necesidades && H.perro.necesidades.energia < 12 ? `${nom()} está muy cansada. Déjala descansar un ratito.` : null;
    const ops = ORDEN_RETOS.map((id) => ({
      texto: `${hechos[id] ? '✓ ' : ''}${RETOS[id].titulo}`, nota: RETOS[id].nota, bloqueado: desdeBorde ? cansada : null,
      min: desdeBorde ? 2 : 0, anim: desdeBorde ? 'senalar' : 'quieto', dur: desdeBorde ? 0.6 : 0.2, esfuerzo: false, progreso: '¡A nadar!',
      alTerminar: () => empezar(id),
    }));
    if (!desdeBorde) ops.push({ texto: `Que ${nom()} salga del agua`, nota: 'Va a la escalerita y sale.', min: 0, anim: 'quieto', dur: 0.2, esfuerzo: false, progreso: '¡Sal!', alTerminar: () => orden('sal') });
    return {
      titulo: desdeBorde ? 'Desafíos en la piscina' : '¿Qué hacemos ahora?',
      texto: desdeBorde
        ? `Tú te quedas en el borde y miras con tus propios ojos. ${nom()} nada y tú le dices por dónde ir.`
        : `${nom()} sigue en el agua, feliz. ¿Otro desafío?`,
      opciones: ops,
    };
  }

  // ---------- HUD con las órdenes
  let hud = null, gotas = null;
  function crearHud() {
    if (hud) return;
    hud = document.createElement('div');
    hud.id = 'piscHud'; hud.className = 'pisc-hud'; hud.hidden = true;
    hud.innerHTML = `
      <div class="pisc-meta"><b id="piscTitulo"></b><span id="piscTexto"></span><small id="piscCuenta"></small></div>
      <div class="pisc-pad" role="group" aria-label="Por dónde nada">
        <button type="button" class="pisc-b pisc-adelante" data-o="adelante"><span class="pisc-f">▲</span>Adelante<kbd>↑</kbd></button>
        <button type="button" class="pisc-b pisc-izq" data-o="izq"><span class="pisc-f">◀</span>Izquierda<kbd>←</kbd></button>
        <button type="button" class="pisc-b pisc-ven" data-o="ven"><span class="pisc-f">▼</span>¡Ven!<kbd>↓</kbd></button>
        <button type="button" class="pisc-b pisc-der" data-o="der"><span class="pisc-f">▶</span>Derecha<kbd>→</kbd></button>
      </div>
      <div class="pisc-acc" role="group" aria-label="Qué hace">
        <button type="button" class="pisc-b pisc-bucea" data-o="bucea"><span class="pisc-f">◎</span>¡Bucea!<kbd>B</kbd></button>
        <button type="button" class="pisc-b pisc-sal" data-o="sal"><span class="pisc-f">⇧</span>¡Sal!<kbd>Enter</kbd></button>
        <button type="button" class="pisc-b pisc-menu" data-o="menu">Desafíos<kbd>M</kbd></button>
      </div>`;
    document.body.appendChild(hud);
    hud.querySelectorAll('button').forEach((b) => {
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => { b.blur(); const o = b.dataset.o; if (o === 'menu') abrirMenu(); else orden(o); });
    });
    gotas = document.createElement('div');
    gotas.id = 'piscGotas'; gotas.className = 'pisc-gotas'; gotas.hidden = true;
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('i');
      s.style.left = (5 + Math.random() * 90) + '%'; s.style.top = (5 + Math.random() * 70) + '%';
      s.style.animationDelay = (Math.random() * 0.4) + 's';
      const t = 14 + Math.random() * 26; s.style.width = t + 'px'; s.style.height = t * 1.3 + 'px';
      gotas.appendChild(s);
    }
    document.body.appendChild(gotas);
  }
  const $ = (s) => document.querySelector(s);
  function texto(t, cuenta) {
    if (!hud) return;
    if (t != null) $('#piscTexto').textContent = t;
    if (cuenta != null) $('#piscCuenta').textContent = cuenta;
  }
  function pintarHud() {
    if (!hud) return;
    const r = R.reto ? RETOS[R.reto] : null;
    $('#piscTitulo').textContent = r ? r.titulo : `${nom()} en la piscina`;
    texto(r ? r.meta() : `Elige otro desafío o dile "¡Sal!" para que salga por la escalerita.`, cuentaTxt());
  }
  function cuentaTxt() {
    if (R.reto === 'pelotas') { const n = R.items.filter((i) => i.tipo === 'pelota' && !i.lista).length; return `Pelotitas: ${3 - n} de 3`; }
    if (R.reto === 'juguete') return M.lleva ? '¡Ya lo tiene!' : '';
    return '';
  }
  function abrirMenu() {
    if (!R.activo || M.en !== 'agua' || ocupada()) return;
    A.abrirPanel(menu(false));
  }

  // ---------- sesión en primera persona
  function mirar() {
    const q = R.D ? R.D.root.position : PC;
    return { x: PC.x * 0.35 + q.x * 0.65, y: AGUA - 0.15, z: PC.z * 0.35 + q.z * 0.65 };
  }
  function empezar(id) {
    if (!R.E || A.escena !== R.E) return;
    if (!R.activo) {
      R.activo = true; R.t0 = A.S.min; R.logrados = [];
      crearHud();
      A.P.root.position.set(BORDE.x, 0, BORDE.z); A.P.root.rotation.y = PI;
      A.bloquear('piscina', true);
      if (A.camaraPrimeraPersona) A.camaraPrimeraPersona(true, { mirar, alto: 0.05, suave: 2.5 });
      document.documentElement.classList.add('pisc-on');
      hud.hidden = false;
      A.decir(R.adulto, '¡Yo te cuido! Tú quédate en el borde.', 2.6);
    }
    quitarItems();
    R.reto = id; R.errores = 0; R.marca.visible = false;
    pintarHud();
    texto(`${nom()} va a su lugar…`);
    const [c, r] = RETOS[id].ini;
    const listo = () => { ponerItems(id); pintarHud(); };
    if (M.en === 'agua') rutaA(c, r, listo);
    else saltarAlAgua(c, r, listo);
  }
  function terminarSesion() {
    if (!R.activo) return;
    R.activo = false; R.reto = null;
    quitarItems();
    R.marca.visible = false;
    if (A.camaraPrimeraPersona) A.camaraPrimeraPersona(false);
    A.bloquear('piscina', false);
    document.documentElement.classList.remove('pisc-on');
    if (hud) hud.hidden = true;
    A.S.min = Math.max(A.S.min, R.t0) + 12;
    A.cambiar({ animo: 4 });
    const pr = guardado();
    H.progreso.guardar({ piscina: Object.assign({}, pr, { retos: retos(), veces: (pr.veces || 0) + 1 }) });
    const xs = R.logrados.map((k) => RETOS[k].titulo.toLowerCase());
    A.anotar(xs.length ? `Piscina con ${nom()}: lograron ${xs.join(', ')}. ¡Qué buen equipo!` : `Piscina con ${nom()}: ella nadó y tú la guiaste desde el borde.`, 'bien');
    A.evento('piscina', { logrados: R.logrados.slice() });
  }

  // ---------- objetos de cada desafío
  function ponerItems(id) {
    quitarItems();
    const sc = R.E.scene;
    const item = (tipo, c, r, mesh, extra) => { R.items.push(Object.assign({ tipo, c, r, m: mesh }, extra || {})); sc.add(mesh); return mesh; };
    if (id === 'juguete') {
      const gr = new THREE.Group();
      A.box(gr, 0.26, 0.06, 0.07, '#ff7a59', 0, 0, 0);
      [-1, 1].forEach((k) => [-1, 1].forEach((j) => A.bola(gr, 0.05, '#ff7a59', k * 0.14, 0, j * 0.04)));
      gr.position.set(CX(4), FONDO + 0.05, CZ(0)); gr.rotation.y = 0.6;
      item('juguete', 4, 0, gr);
    } else if (id === 'pelotas') {
      [[0, 1, '#f2c14e'], [3, 0, '#de5546'], [5, 2, '#8f73cf']].forEach(([c, r, col]) => {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), A.mat(col));
        b.position.set(CX(c), AGUA + 0.06, CZ(r));
        item('pelota', c, r, b);
      });
      [[1, 2], [4, 1]].forEach(([c, r]) => item('flotador', c, r, patito(), {}).position.set(CX(c), AGUA + 0.02, CZ(r)));
    } else if (id === 'aro') {
      const gr = new THREE.Group();
      const aro = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 10, 28), A.mat('#ff5aa0'));
      aro.rotation.y = PI / 2; gr.add(aro);
      [-1, 1].forEach((k) => A.bola(gr, 0.1, '#ffffff', 0, -0.36, k * 0.3));
      gr.position.set(CX(4), AGUA + 0.12, CZ(1));
      item('aro', 4, 1, gr);
    } else if (id === 'escalera') {
      [[2, 0], [4, 2]].forEach(([c, r]) => item('flotador', c, r, patito()).position.set(CX(c), AGUA + 0.02, CZ(r)));
    }
  }
  function patito() {
    const gr = new THREE.Group();
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.11, 8, 18), A.mat('#ffd23f'));
    t.rotation.x = -PI / 2; gr.add(t);
    A.bola(gr, 0.12, '#ffd23f', 0, 0.2, -0.28, 1);
    A.box(gr, 0.08, 0.04, 0.1, '#f28c3a', 0, 0.18, -0.4);
    [-1, 1].forEach((k) => A.bola(gr, 0.022, '#1d2340', k * 0.06, 0.25, -0.37));
    return gr;
  }
  function quitarItems() {
    R.items.forEach((i) => { if (i.m && i.m.parent) i.m.parent.remove(i.m); });
    R.items = [];
    if (M.lleva) { if (M.lleva.parent) M.lleva.parent.remove(M.lleva); M.lleva = null; }
  }
  const itemEn = (c, r, tipo) => R.items.find((i) => i.c === c && i.r === r && !i.lista && (!tipo || i.tipo === tipo));

  // ---------- las órdenes
  const ocupada = () => !!M.anim || M.cola.length > 0;
  function orden(tipo) {
    if (!R.activo || !R.D) return false;
    if (M.en !== 'agua' && tipo !== 'terminar') return false;
    if (ocupada()) { M.buffer = tipo; return true; }
    A.sfx('click');
    const { c, r } = M;
    if (tipo === 'adelante') intentar(c, r - 1, tipo);
    else if (tipo === 'izq') intentar(c - 1, r, tipo);
    else if (tipo === 'der') intentar(c + 1, r, tipo);
    else if (tipo === 'ven') {
      if (r < FILAS - 1) intentar(c, r + 1, tipo);
      else if (c !== KC) intentar(c + Math.sign(KC - c), r, tipo);
      else alBorde();
    } else if (tipo === 'bucea') bucear();
    else if (tipo === 'sal') salir(false);
    else if (tipo === 'terminar') salir(true);
    return true;
  }
  function intentar(nc, nr, dir) {
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= FILAS) {
      return confundir('¡Ahí está la pared de la piscina! Prueba por otro lado.', [CX(nc), CZ(nr)]);
    }
    const f = itemEn(nc, nr, 'flotador');
    if (f) return chocar(nc, nr, `¡Bop! Chocó con el patito flotador. Rodéalo por otro camino.`);
    const aro = itemEn(nc, nr, 'aro');
    if (aro && (dir === 'adelante' || dir === 'ven')) return chocar(nc, nr, 'Por el costado del aro no se puede pasar. El hueco mira a los lados: entra con Izquierda o Derecha.');
    nadarA(nc, nr, () => llegar(dir));
  }
  function llegar(dir) {
    const { c, r } = M;
    const pel = itemEn(c, r, 'pelota');
    if (pel) {
      pel.lista = true;
      if (pel.m.parent) pel.m.parent.remove(pel.m);
      chispas(R.D.root.position, ['#ffd23f', '#ffffff', '#9ff0c4']);
      A.sfx('moneda');
      const quedan = R.items.filter((i) => i.tipo === 'pelota' && !i.lista).length;
      texto(quedan ? `¡Una pelotita! Faltan ${quedan}.` : null, cuentaTxt());
      if (!quedan) return logrado('pelotas');
    }
    const aro = itemEn(c, r, 'aro');
    if (aro && (dir === 'izq' || dir === 'der')) {
      chispas(aro.m.position, ['#ff5aa0', '#ffffff', '#ffd23f']);
      return logrado('aro');
    }
    if (M.lleva && c === KC && r === FILAS - 1) return alBorde();
    if (R.reto === 'juguete' && !M.lleva) { const j = itemEn(c, r, 'juguete'); if (j) texto('¡Justo encima del huesito! Ahora dile "¡Bucea!".'); }
  }
  function alBorde() {
    // se apoya en el borde frente a ti (si trae el juguete, te lo da)
    const D = R.D;
    if (M.c !== KC || M.r !== FILAS - 1) return rutaA(KC, FILAS - 1, () => alBorde());
    const x0 = D.root.position.x, z0 = D.root.position.z;
    M.anim = { tipo: 'borde', t: 0, dur: 1.4, x0, z0,
      fin: () => {
        if (M.lleva && R.reto === 'juguete') {
          if (M.lleva.parent) M.lleva.parent.remove(M.lleva);
          M.lleva = null;
          A.sfx('moneda');
          return logrado('juguete');
        }
        if (!R.reto) A.decir(D, '¡Guau! ¡Hola!', 1.4);
      } };
  }
  function bucear() {
    const D = R.D;
    M.anim = { tipo: 'bucea', t: 0, dur: 2.4, agarro: false,
      fin: () => {
        if (M.lleva && R.reto === 'juguete' && !M.dijoLleva) { M.dijoLleva = true; texto(`¡Lo tiene! Ahora dile "¡Ven!" hasta que llegue a tu lado.`, cuentaTxt()); A.decir(D, '¡Mmf! ¡Guau!', 1.4); return; }
        if (R.reto === 'juguete' && !M.lleva) confundir('Aquí abajo no había nada. Busca dónde salen las burbujitas.', null, true);
        else if (!M.lleva) { A.decir(D, '¡Blub blub!', 1.2); texto(`¡Qué buena buceadora es ${nom()}!`); }
      } };
    M.dijoLleva = false;
    onda(D.root.position.x, D.root.position.z, 1.4, 1.0);
    A.sfx('baja');
  }
  function salir(forzar) {
    if (M.en !== 'agua') { if (forzar) terminarSesion(); return; }
    if (M.c === ESCALERA.c && M.r === ESCALERA.r) return subir();
    if (!forzar && R.reto === 'escalera' && !retoLogradoAhora('escalera')) return confundir('Para salir necesita la escalerita de metal (a la derecha). ¡Guíala hasta ahí!', null);
    texto(`${nom()} nada hasta la escalerita…`);
    quitarItems();
    R.reto = null;
    rutaA(ESCALERA.c, ESCALERA.r, () => subir());
  }
  const retoLogradoAhora = (id) => R.logrados.includes(id);
  function subir() {
    const D = R.D;
    if (R.reto === 'escalera') logrado('escalera', true);
    quitarItems(); R.reto = null; R.marca.visible = false;
    texto(`${nom()} sube por la escalerita…`, '');
    M.anim = { tipo: 'sube', t: 0, dur: 1.6, x0: D.root.position.x, z0: D.root.position.z,
      fin: () => {
        M.en = 'deck';
        const pts = [[ESCALERA.x + 0.75, ESCALERA.z], [ESCALERA.x + 0.75, 1.2], [BORDE.x + 0.6, 1.2]];
        M.anim = { tipo: 'camina', pts, i: 0, fin: () => sacudirse() };
      } };
    A.sfx('sube');
  }
  function sacudirse() {
    const D = R.D;
    D.root.rotation.y = Math.atan2(BORDE.x - D.root.position.x, BORDE.z - D.root.position.z);
    M.anim = { tipo: 'sacude', t: 0, dur: 1.5,
      fin: () => {
        D.cuerpo.rotation.z = 0;
        texto(`¡Ay! ¡${nom()} te mojó ${g('todito', 'todita')}! ¡Jajaja!`);
        A.avisar(`¡${nom()} se sacudió y te mojó! ¡Jajaja!`, 'bien');
        A.cambiar({ animo: 3 });
        D.anim = 'feliz'; D.salto = 0.55; A.sfx('ladrido');
        setTimeout(() => terminarSesion(), 900);
      } };
    if (gotas) { gotas.hidden = false; gotas.classList.remove('on'); void gotas.offsetWidth; gotas.classList.add('on'); setTimeout(() => { gotas.hidden = true; gotas.classList.remove('on'); }, 2200); }
  }
  function confundir(txt, hacia, sinMover) {
    R.errores++;
    const D = R.D;
    A.decir(D, '¿Guau?', 1.6);
    A.sfx('guauTierno');
    texto(`${nom()} se confundió un poquito. ${txt}`);
    if (R.errores >= 2) mostrarAyuda();
    M.anim = { tipo: 'confusa', t: 0, dur: 1.2, fin: () => { D.cabeza.rotation.z = 0; } };
  }
  function chocar(nc, nr, txt) {
    const D = R.D;
    M.anim = { tipo: 'choca', t: 0, dur: 0.7, x0: D.root.position.x, z0: D.root.position.z, x1: CX(nc), z1: CZ(nr),
      fin: () => { A.sfx('golpe'); confundir(txt); } };
  }
  function mostrarAyuda() {
    const o = objetivo();
    if (!o) return;
    R.marca.position.x = CX(o[0]); R.marca.position.z = CZ(o[1]);
    R.marca.visible = true;
  }
  function objetivo() {
    if (R.reto === 'juguete') return M.lleva ? [KC, FILAS - 1] : [4, 0];
    if (R.reto === 'pelotas') { const p = R.items.find((i) => i.tipo === 'pelota' && !i.lista); return p ? [p.c, p.r] : null; }
    if (R.reto === 'aro') return [3, 1];
    if (R.reto === 'escalera') return [ESCALERA.c, ESCALERA.r];
    return null;
  }
  function logrado(id, sinMenu) {
    const ya = retos()[id];
    if (!R.logrados.includes(id)) R.logrados.push(id);
    const pr = guardado();
    H.progreso.guardar({ piscina: Object.assign({}, pr, { retos: Object.assign(retos(), { [id]: true }) }) });
    if (H.perro && H.perro.cambiarVinculo) H.perro.cambiarVinculo(ya ? 2 : 5);
    if (H.perro && H.perro.cansar) H.perro.cansar(5, 2);
    A.cambiar({ animo: 6 });
    A.banner('bien', '¡Desafío logrado!', RETOS[id].titulo, `¡${nom()} y tú son un gran equipo!`);
    A.sfx('logro');
    if (H.logros && H.logros.descubrir) H.logros.descubrir('Piscina');
    const D = R.D;
    D.salto = 0.55; M.feliz = 1.6;
    A.decir(D, '¡Guau, guau!', 1.6);
    chispas(D.root.position, ['#ffd23f', '#ffffff', '#ffb627', '#9ff0c4']);
    texto(`¡Muy bien, ${yo()}! ${nom()} lo logró gracias a ti.`, '');
    R.marca.visible = false;
    A.evento('piscinaReto', { id, primera: !ya });
    if (sinMenu) return;
    R.reto = null;
    setTimeout(() => quitarItems(), 1200);
    R.menuT = 2.6;
  }

  // ---------- movimiento de la cachorrita
  function nadarA(c, r, fin) {
    const D = R.D;
    M.anim = { tipo: 'nada', t: 0, dur: 0.8, x0: D.root.position.x, z0: D.root.position.z, x1: CX(c), z1: CZ(r),
      fin: () => { M.c = c; M.r = r; if (fin) fin(); } };
  }
  function rutaA(c, r, fin) {
    const pasos = [];
    let cc = M.c, rr = M.r;
    while (cc !== c) { cc += Math.sign(c - cc); pasos.push([cc, rr]); }
    while (rr !== r) { rr += Math.sign(r - rr); pasos.push([cc, rr]); }
    if (!pasos.length) { if (fin) fin(); return; }
    M.cola = pasos.map(([a, b], i) => () => nadarA(a, b, i === pasos.length - 1 ? fin : null));
    M.cola.shift()();
  }
  function saltarAlAgua(c, r, fin) {
    const D = R.D;
    D.root.position.set(BORDE.x + 0.6, 0, 1.0);
    M.anim = { tipo: 'salta', t: 0, dur: 1.0, x0: BORDE.x + 0.6, z0: 1.0, x1: CX(c), z1: CZ(r),
      fin: () => { M.en = 'agua'; M.c = c; M.r = r; salpicar(CX(c), CZ(r)); if (fin) fin(); } };
    A.decir(D, '¡Guau!', 1.0);
    A.sfx('salto');
  }
  function salpicar(x, z) {
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * PI * 2, v = 0.6 + Math.random() * 1.2;
      A.emitir(new THREE.Vector3(x, AGUA + 0.05, z), i % 3 ? '#bfe9f7' : '#ffffff', new THREE.Vector3(Math.cos(a) * v, 1.6 + Math.random() * 1.4, Math.sin(a) * v), 0.8, 0.045, 6, 0.85);
    }
    onda(x, z, 1.6, 1.2); onda(x, z, 1.0, 0.8);
    A.sfx('golpe');
  }
  function chispas(p, cols) {
    for (let i = 0; i < 18; i++) A.emitir(new THREE.Vector3(p.x, Math.max(AGUA, p.y) + 0.4, p.z), cols[i % cols.length], new THREE.Vector3((Math.random() - 0.5) * 2.4, 1.4 + Math.random() * 1.4, (Math.random() - 0.5) * 2.4), 1.0, 0.05, 4);
  }
  function onda(x, z, tam, vida) {
    const a = R.anillos.reduce((m, o) => (o.vida < m.vida ? o : m), R.anillos[0]);
    if (!a) return;
    a.m.position.x = x; a.m.position.z = z; a.vida = a.max = vida || 1; a.tam = tam || 1; a.m.visible = true;
  }
  function burbujas(x, y, z, n) {
    for (let i = 0; i < (n || 1); i++) {
      const v = 0.5 + Math.random() * 0.3;
      A.emitir(new THREE.Vector3(x + (Math.random() - 0.5) * 0.2, y, z + (Math.random() - 0.5) * 0.2), '#e8f8ff', new THREE.Vector3((Math.random() - 0.5) * 0.08, v, (Math.random() - 0.5) * 0.08), Math.max(0.15, (AGUA - y) / v), 0.035, 0, 0.75);
    }
  }

  function actualizarMolly(dt, t) {
    const D = R.D;
    if (!D) return;
    const q = D.root.position, an = M.anim;
    const bob = Math.sin(t * 3.2) * 0.02;
    if (M.feliz > 0) M.feliz -= dt;
    if (an) {
      an.t += dt;
      const k = Math.min(1, an.t / (an.dur || 1));
      switch (an.tipo) {
        case 'nada': {
          const e = suave(k);
          q.x = an.x0 + (an.x1 - an.x0) * e; q.z = an.z0 + (an.z1 - an.z0) * e; q.y = YN + bob;
          girar(D, Math.atan2(an.x1 - an.x0, an.z1 - an.z0), dt, 10);
          D.anim = 'caminar'; D.cuerpo.rotation.x = -0.2;
          M.onda -= dt; if (M.onda <= 0) { M.onda = 0.3; onda(q.x, q.z, 0.8, 0.9); }
          break;
        }
        case 'choca': {
          const e = k < 0.5 ? suave(k * 2) * 0.35 : (1 - suave((k - 0.5) * 2)) * 0.35;
          q.x = an.x0 + (an.x1 - an.x0) * e; q.z = an.z0 + (an.z1 - an.z0) * e; q.y = YN + bob;
          girar(D, Math.atan2(an.x1 - an.x0, an.z1 - an.z0), dt, 10);
          D.anim = 'caminar';
          break;
        }
        case 'confusa':
          D.anim = 'quieto'; D.cabeza.rotation.z = Math.sin(an.t * 5) * 0.35;
          if (M.en === 'agua') q.y = YN + bob;
          break;
        case 'bucea': {
          // baja (0-0.35), busca en el fondo (0.35-0.6), sube (0.6-1)
          const y = k < 0.35 ? YN + (YF - YN) * suave(k / 0.35) : k < 0.6 ? YF : YF + (YN - YF) * suave((k - 0.6) / 0.4);
          q.y = y; D.anim = 'caminar';
          D.cuerpo.rotation.x = k < 0.35 ? 0.6 : k < 0.6 ? 0.2 : -0.5;
          if (Math.random() < dt * 14) burbujas(q.x, Math.max(y + 0.35, FONDO + 0.1), q.z, 1);
          if (k >= 0.45 && !an.agarro) {
            an.agarro = true;
            const j = R.reto === 'juguete' && !M.lleva && itemEn(M.c, M.r, 'juguete');
            if (j) {
              j.lista = true;
              D.cabeza.add(j.m); j.m.position.set(0, -0.09, 0.24); j.m.rotation.set(0, 0, 0);
              M.lleva = j.m;
              A.sfx('moneda');
            }
          }
          if (k >= 1) onda(q.x, q.z, 1.2, 0.9);
          break;
        }
        case 'salta': {
          q.x = an.x0 + (an.x1 - an.x0) * k; q.z = an.z0 + (an.z1 - an.z0) * k;
          q.y = (YN) * k + Math.sin(k * PI) * 0.6;
          girar(D, Math.atan2(an.x1 - an.x0, an.z1 - an.z0), dt, 12);
          D.anim = 'feliz'; D.cuerpo.rotation.x = -0.6 + k * 1.0;
          break;
        }
        case 'borde': {
          const e = k < 0.4 ? suave(k / 0.4) : k < 0.7 ? 1 : 1 - suave((k - 0.7) / 0.3);
          q.x = an.x0; q.z = an.z0 + (POOL.z2 - 0.25 - an.z0) * e; q.y = YN + e * 0.18;
          D.root.rotation.y = 0; D.cuerpo.rotation.x = -0.5 * e; D.anim = e > 0.5 ? 'feliz' : 'caminar';
          break;
        }
        case 'sube': {
          if (k < 0.55) { const e = suave(k / 0.55); q.x = an.x0 + (ESCALERA.x - 0.1 - an.x0) * e; q.z = an.z0 + (ESCALERA.z - an.z0) * e; q.y = YN + (AGUA + 0.02 - YN) * e; D.cuerpo.rotation.x = -0.9 * e; }
          else { const e = suave((k - 0.55) / 0.45); q.x = ESCALERA.x - 0.1 + 0.85 * e; q.z = ESCALERA.z; q.y = (AGUA + 0.02) * (1 - e) + Math.sin(e * PI) * 0.3; D.cuerpo.rotation.x = -0.9 * (1 - e); }
          D.root.rotation.y = PI / 2; D.anim = 'caminar';
          if (Math.random() < dt * 20) A.emitir(new THREE.Vector3(q.x, q.y + 0.3, q.z), '#bfe9f7', new THREE.Vector3(0, -1, 0), 0.4, 0.03, 4, 0.8);
          break;
        }
        case 'camina': {
          const p = an.pts[an.i];
          q.y = 0; D.cuerpo.rotation.x = 0;
          const dx = p[0] - q.x, dz = p[1] - q.z, d = Math.hypot(dx, dz), v = 2.2 * dt;
          if (d <= v) { q.x = p[0]; q.z = p[1]; an.i++; if (an.i >= an.pts.length) an.hecho = true; }
          else { q.x += dx / d * v; q.z += dz / d * v; girar(D, Math.atan2(dx, dz), dt, 10); }
          D.anim = 'caminar';
          if (Math.random() < dt * 8) A.emitir(new THREE.Vector3(q.x, 0.35, q.z), '#bfe9f7', new THREE.Vector3(0, -1.2, 0), 0.3, 0.03, 3, 0.8);
          break;
        }
        case 'sacude': {
          D.anim = 'quieto'; q.y = 0;
          D.cuerpo.rotation.z = Math.sin(an.t * 38) * 0.35 * (1 - k * 0.5);
          if (Math.random() < dt * 40) {
            const a = Math.random() * PI * 2;
            A.emitir(new THREE.Vector3(q.x, 0.35, q.z), i2c(), new THREE.Vector3(Math.cos(a) * 2.2, 0.8 + Math.random() * 1.5, Math.sin(a) * 2.2), 0.6, 0.04, 6, 0.85);
          }
          break;
        }
        default: break;
      }
      if (an.tipo === 'camina' ? an.hecho : an.t >= (an.dur || 1)) {
        M.anim = null;
        D.cuerpo.rotation.x = M.en === 'agua' ? -0.2 : 0;
        try { if (an.fin) an.fin(); } catch (e) { console.error(e); }
        if (!M.anim && M.cola.length) M.cola.shift()();
        else if (!M.anim && !M.cola.length && M.buffer) { const b = M.buffer; M.buffer = null; orden(b); }
      }
      return;
    }
    if (M.en === 'agua') {
      q.y = YN + bob;
      D.anim = M.feliz > 0 ? 'feliz' : 'caminar';
      D.cuerpo.rotation.x = -0.2;
      girar(D, Math.atan2(BORDE.x - q.x, BORDE.z - q.z), dt, 3);
      M.onda -= dt; if (M.onda <= 0) { M.onda = 0.9; onda(q.x, q.z, 0.6, 1.1); }
      if (M.buffer) { const b = M.buffer; M.buffer = null; orden(b); }
      return;
    }
    // en el piso: te sigue
    q.y = 0;
    const p = A.P.root.position, ry = A.P.root.rotation.y;
    const tx = p.x - Math.sin(ry) * 0.9 + Math.cos(ry) * 0.4, tz = p.z - Math.cos(ry) * 0.9 - Math.sin(ry) * 0.4;
    const dx = tx - q.x, dz = tz - q.z, d = Math.hypot(dx, dz);
    if (d > 6) { q.x = tx; q.z = tz; }
    if (d > 0.4) {
      const v = (d > 2 ? 3.2 : 1.8) * dt, k = Math.min(1, v / d);
      A.moverEn(D.root, dx * k, dz * k, 0.22);
      girar(D, Math.atan2(dx, dz), dt);
      D.anim = 'caminar'; D.vel = 0.8;
    } else { girar(D, Math.atan2(p.x - q.x, p.z - q.z), dt, 4); D.anim = M.feliz > 0 ? 'feliz' : 'quieto'; }
  }
  const i2c = () => (Math.random() < 0.5 ? '#bfe9f7' : '#ffffff');

  // ---------- el agua se mueve
  function olas(dt, t) {
    const ag = R.agua;
    if (!ag) return;
    const pos = ag.geometry.attributes.position, b = R.aguaBase, arr = pos.array;
    const D = R.D, nada = D && M.en === 'agua';
    const mx = nada ? D.root.position.x - PC.x : 99, mz = nada ? -(D.root.position.z - PC.z) : 99;
    for (let i = 0; i < arr.length; i += 3) {
      const x = b[i], y = b[i + 1];
      let z = Math.sin(x * 2.1 + t * 1.6) * 0.012 + Math.cos(y * 2.7 + t * 1.2) * 0.01;
      if (nada) { const d = Math.hypot(x - mx, y - mz); if (d < 1.2) z += Math.sin(d * 14 - t * 9) * 0.02 * (1 - d / 1.2); }
      arr[i + 2] = z;
    }
    pos.needsUpdate = true;
    ag.geometry.computeVertexNormals();
    R.anillos.forEach((a) => {
      if (a.vida <= 0) { a.m.visible = false; return; }
      a.vida -= dt;
      const k = 1 - a.vida / a.max;
      a.m.scale.setScalar(0.6 + k * 3 * (a.tam || 1));
      a.m.material.opacity = 0.55 * (1 - k);
    });
    if (R.marca && R.marca.visible) R.marca.material.opacity = 0.55 + Math.sin(t * 5) * 0.3;
    // burbujitas que delatan el juguete hundido
    if (R.reto === 'juguete' && !M.lleva) {
      const j = R.items.find((i) => i.tipo === 'juguete');
      if (j && Math.random() < dt * 2.2) burbujas(j.m.position.x, FONDO + 0.1, j.m.position.z, 2);
    }
    // las pelotitas y patitos flotan
    R.items.forEach((i, n) => {
      if (i.lista || i.tipo === 'juguete') return;
      i.m.position.y = (i.tipo === 'aro' ? AGUA + 0.12 : i.tipo === 'pelota' ? AGUA + 0.06 : AGUA + 0.02) + Math.sin(t * 2 + n) * 0.02;
      if (i.tipo === 'flotador') i.m.rotation.y = Math.sin(t * 0.7 + n) * 0.4;
    });
  }

  // ---------- ganchos
  A.alConstruir((nombre, E, desde) => {
    if (nombre !== 'piscina') {
      if (R.activo) { R.activo = false; A.bloquear('piscina', false); document.documentElement.classList.remove('pisc-on'); if (hud) hud.hidden = true; }
      R.E = null; R.D = null; R.adulto = null; R.agua = null;
    }
    if (nombre === 'jardin') {
      portonJardin(E);
      if (desde === 'piscina') {
        A.P.root.position.set(PORTON.x, 0, PORTON.z); A.P.root.rotation.y = -PI / 2;
        if (H.perro && H.perro.D) H.perro.D.root.position.set(PORTON.x - 0.6, 0, PORTON.z - 0.5);
      }
    }
  });
  A.alActualizar((dt, t) => {
    if (!R.E || A.escena !== R.E) return;
    actualizarMolly(dt, t);
    if (R.activo) {
      if (R.menuT > 0) {
        R.menuT -= dt;
        const st = A.estado();
        if (R.menuT <= 0) { if (!st.panel && !ocupada() && M.en === 'agua') A.abrirPanel(menu(false)); else if (st.panel || ocupada()) R.menuT = 0.5; }
      }
      // mientras estás en el borde, sigues ahí
      A.P.root.position.x = BORDE.x; A.P.root.position.z = BORDE.z; A.P.root.rotation.y = PI;
      if (A.camaraPrimeraPersona && !A.primeraPersona && !A.estado().cargando) A.camaraPrimeraPersona(true, { mirar, alto: 0.05, suave: 2.5 });
    }
  });
  const TECLAS = { ArrowUp: 'adelante', KeyW: 'adelante', ArrowLeft: 'izq', KeyA: 'izq', ArrowRight: 'der', KeyD: 'der',
    ArrowDown: 'ven', KeyS: 'ven', KeyV: 'ven', KeyB: 'bucea', Space: 'bucea', Enter: 'sal', KeyE: 'sal', Escape: 'terminar', KeyM: 'menu' };
  A.alTecla((e) => {
    if (!R.activo) return false;
    const o = TECLAS[e.code];
    if (!o) return false;
    if (!e.repeat) { if (o === 'menu') abrirMenu(); else orden(o); }
    return true;
  });

  A.registrarEscena('piscina', 'Piscina', construirPiscina);

  H.piscina = {
    ir, volver, empezar, orden, terminar: () => salir(true), RETOS,
    get retos() { return retos(); },
    get estado() {
      return { activo: R.activo, reto: R.reto, en: M.en, c: M.c, r: M.r, ocupada: ocupada(), lleva: !!M.lleva, errores: R.errores, logrados: R.logrados.slice(),
        pelotas: R.items.filter((i) => i.tipo === 'pelota' && i.lista).length };
    },
    get R() { return R; },
  };
})();
