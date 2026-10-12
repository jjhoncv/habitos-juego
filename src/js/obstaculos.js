/* Obstáculos: cosas en el piso que hay que saltar, cosas que se caen (agáchate o muévete)
   y las escondidas con la cachorrita.
   - Cada día (1 a 7) hay cosas distintas en lugares distintos: bloques en el cuarto, la pelota
     rodando por el pasillo, el charco del jueves de lluvia, la manguera cuando mamá riega,
     cajas de la feria, ramas en el parque…
   - Si los cruzas caminando, tropiezas suave (anim 'tropezar' del motor). Si saltas, pasas.
   - Lo que se cae avisa antes (~1 s) con un sonido y una sombra en el piso: agáchate (X) o sal de la sombra.
   - "Jugar a las escondidas" desde el menú de la cachorrita: ella cuenta, te escondes y te busca olfateando.
   Usa la API de movimiento: A.saltar, A.salto {y, enAire}, A.agachado, A.escondites(), A.esconder, A.escondido. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.motor.nino) return;
  const A = H.motor.api;
  const { THREE, PI } = A;

  const CASA = ['dormitorio', 'pasillo', 'bano', 'comedor', 'sala', 'jardin'];
  const dia = () => { const d = H.progreso && H.progreso.cargar().dia; return d >= 1 && d <= 7 ? d : 1; };
  const nina = () => !!(A.perfil && A.perfil.genero === 'nina');
  const gx = (o, a) => (nina() ? a : o);
  const nomPerro = () => (A.perfil && A.perfil.mascota && A.perfil.mascota.nombre) || 'Molly';
  const enAire = () => !!(A.salto && (A.salto.enAire || A.salto.sobre));   // en el aire o encima de algo (cama, sofá…)
  const agachado = () => !!A.agachado;
  const escondido = () => !!A.escondido;
  const futbol = () => !!(H.futbol && H.futbol.jugando);
  const S = () => A.S;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ¿mamá está regando en el jardín ahora?
  function mamaRiega() {
    if (!H.rutinas || !H.rutinas.actividad) return false;
    const act = H.rutinas.actividad('mama');
    return !!act && act.lugar === 'jardin' && /regando/i.test(act.dice || '');
  }

  // ================================================================ modelos (pequeños, de cajitas)
  const COL = ['#de5546', '#f2b84b', '#5b8fd1', '#6cc08b', '#b07cd8'];
  const MODELOS = {
    bloques(g) { for (let i = 0; i < 6; i++) A.box(g, 0.11, 0.11, 0.11, COL[i % 5], rnd(-0.22, 0.22), 0.055, rnd(-0.16, 0.16), { ry: rnd(0, 3) }); },
    pelota(g) { const b = A.bola(g, 0.17, '#e8604f', 0, 0.17, 0, 1); A.box(g, 0.35, 0.02, 0.05, '#fff', 0, 0.17, 0); g.userData.bola = b; },
    peluches(g) {
      A.bola(g, 0.13, '#b98a5e', -0.12, 0.13, 0, 1); A.bola(g, 0.09, '#b98a5e', -0.12, 0.3, 0, 1);
      A.bola(g, 0.12, '#f1a7c0', 0.17, 0.12, 0.05, 1); A.bola(g, 0.08, '#f1a7c0', 0.17, 0.27, 0.05, 1);
    },
    correa(g) { for (let i = 0; i < 7; i++) A.box(g, 0.14, 0.025, 0.04, '#d6443b', -0.42 + i * 0.13, 0.013, Math.sin(i * 1.3) * 0.12, { ry: Math.cos(i) * 0.6 }); A.cil(g, 0.06, 0.06, 0.03, '#7a5130', 0.48, 0.015, 0, { seg: 10 }); },
    charco(g) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.62, 22), new THREE.MeshLambertMaterial({ color: '#6d8fb0', transparent: true, opacity: 0.85 }));
      m.rotation.x = -PI / 2; m.scale.set(1.25, 0.85, 1); m.position.y = 0.015; g.add(m);
    },
    botas(g) { [-0.12, 0.14].forEach((x, i) => { A.box(g, 0.13, 0.3, 0.12, '#f2c430', x, 0.15, 0, { rz: i ? 1.3 : 0 }); A.box(g, 0.13, 0.08, 0.22, '#f2c430', x, 0.04, 0.06); }); },
    cajas(g) { A.box(g, 0.42, 0.24, 0.34, '#c9a46a', -0.1, 0.12, 0, { ry: 0.3 }); A.box(g, 0.3, 0.18, 0.26, '#d8b77d', 0.28, 0.09, 0.12, { ry: -0.4 }); A.box(g, 0.44, 0.012, 0.36, '#e9d4a3', -0.1, 0.25, 0, { ry: 0.3 }); },
    ramas(g) {
      A.box(g, 0.95, 0.07, 0.07, '#6b4a33', 0, 0.04, 0, { ry: 0.25 });
      A.box(g, 0.4, 0.05, 0.05, '#6b4a33', 0.15, 0.035, 0.15, { ry: -0.7 });
      [[-0.3, 0.1], [0.2, -0.12], [0.38, 0.2]].forEach(([x, z]) => A.bola(g, 0.08, '#5f9e4a', x, 0.07, z));
    },
    cojines(g) { A.box(g, 0.42, 0.13, 0.42, '#5b8fd1', -0.12, 0.065, 0, { ry: 0.4 }); A.box(g, 0.38, 0.12, 0.38, '#f2b84b', 0.25, 0.06, 0.12, { ry: -0.3 }); },
    bolsa(g) { A.box(g, 0.34, 0.36, 0.18, '#d6443b', 0, 0.18, 0); A.box(g, 0.22, 0.02, 0.02, '#f2b84b', 0, 0.42, 0); A.box(g, 0.2, 0.12, 0.12, '#6cc08b', 0.3, 0.06, 0.05, { ry: 0.4 }); },
    mochila(g) { A.box(g, 0.34, 0.4, 0.2, '#5b8fd1', 0, 0.2, 0, { rx: -1.2 }); A.box(g, 0.24, 0.12, 0.05, '#3b6fb1', 0, 0.08, 0.2, { rx: -1.2 }); },
    cono(g) { A.cil(g, 0.02, 0.15, 0.36, '#f07f2e', 0, 0.18, 0, { seg: 12 }); A.cil(g, 0.08, 0.1, 0.06, '#ffffff', 0, 0.18, 0, { seg: 12 }); A.box(g, 0.32, 0.03, 0.32, '#f07f2e', 0, 0.015, 0); },
    carritos(g) { [[-0.15, 0, '#de5546'], [0.2, 0.1, '#5b8fd1']].forEach(([x, z, c]) => { A.box(g, 0.26, 0.1, 0.14, c, x, 0.08, z, { ry: x * 2 }); A.box(g, 0.13, 0.07, 0.12, '#cfe6f5', x, 0.15, z, { ry: x * 2 }); }); },
    // cosas que caen
    libro(g) { A.box(g, 0.26, 0.06, 0.2, '#3b6fb1', 0, 0, 0); A.box(g, 0.24, 0.05, 0.005, '#fff', 0, 0, 0.1); },
    cuadro(g) { A.box(g, 0.5, 0.38, 0.04, '#7a5130', 0, 0, 0); A.box(g, 0.42, 0.3, 0.045, '#8fc6ea', 0, 0, 0); },
    peluche(g) { A.bola(g, 0.13, '#b98a5e', 0, 0, 0, 1); A.bola(g, 0.09, '#b98a5e', 0, 0.17, 0, 1); },
    ropa(g) { A.box(g, 0.5, 0.02, 0.42, '#f2b84b', 0, 0, 0); A.box(g, 0.16, 0.02, 0.3, '#f2b84b', -0.3, 0, 0.05); A.box(g, 0.16, 0.02, 0.3, '#f2b84b', 0.3, 0, 0.05); },
    cortina(g) { A.box(g, 0.9, 0.02, 0.6, '#d97c8f', 0, 0, 0); },
    gota(g) { A.bola(g, 0.08, '#7cc6f2', 0, 0, 0, 1); },
    rama(g) { A.box(g, 0.8, 0.07, 0.07, '#6b4a33', 0, 0, 0, { ry: 0.5 }); A.bola(g, 0.14, '#5f9e4a', 0.3, 0.04, 0.12); A.bola(g, 0.12, '#5f9e4a', -0.25, 0.05, -0.1); },
    pelotaAire(g) { A.bola(g, 0.16, '#f2f2f2', 0, 0, 0, 1); A.box(g, 0.33, 0.02, 0.05, '#1d2340', 0, 0, 0); },
    cartel(g) { A.box(g, 0.6, 0.02, 0.4, '#fff3b0', 0, 0, 0); A.box(g, 0.4, 0.025, 0.08, '#de5546', 0, 0, 0.05); },
    caja(g) { A.box(g, 0.32, 0.22, 0.26, '#c9a46a', 0, 0, 0); },
  };
  function modelo(nombre) { const g = new THREE.Group(); (MODELOS[nombre] || MODELOS.caja)(g); return g; }

  // ================================================================ 1) cosas en el piso que hay que saltar
  // dias: en qué días aparece · cerca: dónde intentarlo poner · largo: obstáculo alargado (la manguera)
  const SUELO = [
    { id: 'bloques', dias: [1], lugar: 'dormitorio', modelo: 'bloques', cerca: [0.3, 1.6], r: 0.36, que: 'los bloques de colores', ay: '¡Ay, mis bloques! Casi me caigo.' },
    { id: 'mochilaAula', dias: [1], lugar: 'aula', modelo: 'mochila', cerca: [0, 2.6], r: 0.34, que: 'una mochila en el piso', ay: '¡Uy! Una mochila en el camino.' },
    { id: 'pelota', dias: [2, 7], lugar: 'pasillo', modelo: 'pelota', rueda: true, cerca: [0, 0.7], r: 0.3, que: 'la pelota que rueda', ay: '¡Ay! ¡La pelota se me metió entre los pies!' },
    { id: 'carritos', dias: [2], lugar: 'sala', modelo: 'carritos', cerca: [0.5, 1.6], r: 0.36, que: 'los carritos', ay: '¡Uy! Pisé un carrito.' },
    { id: 'peluches', dias: [3], lugar: 'sala', modelo: 'peluches', cerca: [-0.5, 1.5], r: 0.38, que: 'los peluches', ay: '¡Ay! Los peluches estaban en el camino.' },
    { id: 'correa', dias: [3], lugar: 'comedor', modelo: 'correa', cerca: [-1.5, 2.4], r: 0.4, que: `la correa de ${nomPerro()}`, ay: '¡Uy! Se me enredó la correa en el pie.' },
    { id: 'cono', dias: [3], lugar: 'patio', modelo: 'cono', cerca: [-3.5, 1.5], r: 0.32, que: 'un cono de educación física', ay: '¡Ay! ¡Un cono!' },
    { id: 'charco', dias: [4], lugar: 'jardin', modelo: 'charco', cerca: [0, 1.6], r: 0.6, si: () => A.llueve !== false, que: 'el charco', ay: '¡Splash! Me mojé los pies en el charco.' },
    { id: 'botas', dias: [4], lugar: 'pasillo', modelo: 'botas', cerca: [-2.5, 0.6], r: 0.33, que: 'las botas de lluvia', ay: '¡Uy! Las botas de lluvia en el piso.' },
    { id: 'cajasCuarto', dias: [5], lugar: 'dormitorio', modelo: 'cajas', cerca: [-0.6, 1.6], r: 0.4, que: 'las cajas de la feria', ay: '¡Ay! Las cajas de la feria.' },
    { id: 'cajasPatio', dias: [5], lugar: 'patio', modelo: 'cajas', cerca: [-3.8, 1.2], r: 0.4, que: 'las cajas de la feria', ay: '¡Uy! Casi tumbo las cajas de la feria.' },
    { id: 'ramas', dias: [6], lugar: 'parque', modelo: 'ramas', cerca: [-4.2, 1.6], r: 0.48, que: 'las ramas caídas', ay: '¡Ay! Me enganché en una rama.' },
    { id: 'ramas2', dias: [6], lugar: 'parque', modelo: 'ramas', cerca: [1.5, 2.8], r: 0.48, que: 'las ramas caídas', ay: '¡Uy! Otra rama en el camino.' },
    { id: 'cojines', dias: [7], lugar: 'sala', modelo: 'cojines', cerca: [0.4, 1.5], r: 0.4, que: 'los cojines en el piso', ay: '¡Uy! Los cojines estaban en el piso.' },
    { id: 'bolsaAbuela', dias: [7], lugar: 'comedor', modelo: 'bolsa', cerca: [-1.8, 2.6], r: 0.34, que: 'la bolsa de la abuela', ay: '¡Ay! Casi piso la bolsa de la abuela.' },
    // todos los días, mientras mamá riega
    { id: 'manguera', dias: [1, 2, 3, 4, 5, 6, 7], lugar: 'jardin', manguera: true, si: () => mamaRiega(), r: 0.2, que: 'la manguera de mamá', ay: '¡Uy! Me enredé con la manguera de mamá.' },
  ];

  // ================================================================ 2) cosas que se caen
  const CAEN = [
    { id: 'peluche', dias: [1], lugar: 'dormitorio', modelo: 'peluche', aviso: '¡Se cae un peluche de la repisa!' },
    { id: 'pelotaGrandes', dias: [1], lugar: 'patio', modelo: 'pelotaAire', si: () => !A.llueve, aviso: '¡Cuidado! ¡Viene una pelota de los chicos grandes!' },
    { id: 'pelotaTeo', dias: [2], lugar: 'patio', modelo: 'pelotaAire', si: () => !A.llueve, aviso: () => (H.progreso && H.progreso.cargar().amigoTeo ? '¡Teo lanzó la pelota muy alto! ¡Cuidado!' : '¡Una pelota del recreo viene volando!') },
    { id: 'cuadro', dias: [2, 7], lugar: 'pasillo', modelo: 'cuadro', aviso: '¡Un cuadro se está descolgando!' },
    { id: 'libro', dias: [3], lugar: 'sala', modelo: 'libro', aviso: '¡Se cae un libro del estante!' },
    { id: 'cajaRopero', dias: [3], lugar: 'dormitorio', modelo: 'caja', aviso: '¡Se cae una caja de juguetes del ropero!' },
    { id: 'cortina', dias: [4], lugar: 'sala', modelo: 'cortina', si: () => A.llueve !== false, aviso: '¡El viento de la lluvia soltó la cortina!' },
    { id: 'gotera', dias: [4], lugar: 'comedor', modelo: 'gota', si: () => A.llueve !== false, aviso: '¡Una gotera! Cae agua del techo.' },
    { id: 'cartel', dias: [5], lugar: 'aula', modelo: 'cartel', aviso: '¡Se despega un cartel de la feria!' },
    { id: 'ropa', dias: [5, 7], lugar: 'jardin', modelo: 'ropa', si: () => !A.llueve, aviso: '¡El viento se llevó la ropa del tendedero!' },
    { id: 'rama', dias: [6], lugar: 'parque', modelo: 'rama', aviso: '¡Crac! ¡Se cae una rama del árbol!' },
    { id: 'pelotaVecino', dias: [6], lugar: 'jardin', modelo: 'pelotaAire', aviso: '¡La pelota del vecino pasó por encima de la cerca!' },
  ];
  const textoDe = (v) => (typeof v === 'function' ? v() : v);

  // ================================================================ estado de la escena actual
  const ST = { E: null, suelo: [], caida: null, tCaida: null, libre: 0, buenSalto: false, escondidas: null };
  const marcas = () => { const f = S().f; f.obs = f.obs || { trop: {}, cayo: {}, salto: false, salvo: false, golpe: false, esc: 0 }; return f.obs; };

  function libreEn(E, x, z, m) {
    if (Math.abs(x) > E.w / 2 - 0.6 || Math.abs(z) > E.d / 2 - 0.6) return false;
    const choca = (c) => x > c.x1 - m && x < c.x2 + m && z > c.z1 - m && z < c.z2 + m;
    if (E.cols.some(choca) || (E.subibles || []).some(choca)) return false;
    if (E.inters.some((it) => it.en && Math.hypot(it.en[0] - x, it.en[1] - z) < 0.7)) return false;
    return true;
  }
  // el punto libre más cercano a (x, z)
  function buscarLibre(E, x, z, m) {
    for (let r = 0; r <= 4; r += 0.25) {
      const n = r === 0 ? 1 : Math.ceil(r * 8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 2 * PI, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        if (libreEn(E, px, pz, m)) return [px, pz];
      }
    }
    return null;
  }

  function opTropiezo(o) {
    return {
      texto: 'Tropiezo', min: 0, esfuerzo: false, ef: { animo: -2 },
      pasos: [{ anim: 'tropezar', dur: 1.3, min: 0, progreso: '¡Uy!' }],
      alTerminar: () => {
        A.decir(A.P, o.def.ay, 2.2);
        const m = marcas();
        const primera = !Object.keys(m.trop).length;
        m.trop[o.def.id] = true;
        A.avisar(primera ? `Tropezaste con ${o.def.que}. ¡La próxima, salta! (Z o el botón Saltar)` : `Tropezaste con ${o.def.que}.`, 'mal');
        A.evento('tropiezo', { id: o.def.id, lugar: ST.E && ST.E.nombre });
      },
    };
  }

  function ponerSuelo(E) {
    const d = dia();
    SUELO.filter((s) => s.lugar === E.nombre && s.dias.includes(d)).forEach((def) => {
      const o = { def, x: 0, z: 0, r: def.r, a: null, b: null, g: null, gracia: false, visible: true };
      if (def.manguera) {
        // de la llave (junto a la puerta) a donde riega mamá: cruza el camino de entrada
        o.a = [-4.6, 3.0]; o.b = [0.7, -1.7];
        const g = new THREE.Group();
        const n = 16;
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n, x = o.a[0] + (o.b[0] - o.a[0]) * t, z = o.a[1] + (o.b[1] - o.a[1]) * t + Math.sin(t * 9) * 0.12;
          A.cil(g, 0.035, 0.035, 0.32, '#3e9a4f', x, 0.035, z, { rx: PI / 2, seg: 6, sombra: false }).rotation.z = Math.atan2(o.b[1] - o.a[1], o.b[0] - o.a[0]) + PI / 2;
        }
        A.box(g, 0.14, 0.2, 0.14, '#9aa3ad', o.a[0], 0.3, o.a[1]);
        o.g = g;
      } else {
        const p = buscarLibre(E, def.cerca[0], def.cerca[1], def.r + 0.15);
        if (!p) return;
        o.x = p[0]; o.z = p[1];
        o.g = modelo(def.modelo);
        o.g.position.set(o.x, 0, o.z);
        o.g.rotation.y = rnd(-0.5, 0.5);
        if (def.rueda) {
          // rueda de un lado a otro, por donde hay espacio libre
          let x1 = o.x, x2 = o.x;
          while (x1 > -E.w / 2 + 1 && libreEn(E, x1 - 0.2, o.z, 0.25)) x1 -= 0.2;
          while (x2 < E.w / 2 - 1 && libreEn(E, x2 + 0.2, o.z, 0.25)) x2 += 0.2;
          o.rueda = { x1: Math.max(x1, o.x - 3), x2: Math.min(x2, o.x + 3), v: 0.9, dir: 1 };
        }
      }
      E.scene.add(o.g);
      o.activoBase = () => (!def.si || def.si()) && !marcas().trop[def.id];
      // el motor revisa E.obstaculos cuando caminas: si estás en el aire, no tropiezas
      E.obstaculos.push({
        get x() { return o.x; }, get z() { return o.z; }, get r() { return o.r; },
        activo: () => o.visible && !o.gracia && !enAire() && o.activoBase() && !ST.escondidas && !A.controlado && !A.primeraPersona,
        op: opTropiezo(o),
        obs: o,
      });
      ST.suelo.push(o);
    });
  }

  function cercanoSegmento(o, px, pz) {
    const [ax, az] = o.a, [bx, bz] = o.b, vx = bx - ax, vz = bz - az;
    const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)));
    return [ax + vx * t, az + vz * t];
  }

  function actualizarSuelo(dt) {
    const p = A.P.root.position;
    ST.suelo.forEach((o) => {
      const def = o.def;
      const ver = !def.si || def.si();
      if (o.g && o.g.visible !== ver) o.g.visible = ver;
      o.visible = ver;
      if (o.rueda && ver) {
        const R = o.rueda;
        o.x += R.v * R.dir * dt;
        if (o.x > R.x2) { o.x = R.x2; R.dir = -1; }
        if (o.x < R.x1) { o.x = R.x1; R.dir = 1; }
        o.g.position.x = o.x;
        if (o.g.userData.bola) o.g.rotation.z -= R.v * R.dir * dt / 0.17;
      }
      if (o.a) { const q = cercanoSegmento(o, p.x, p.z); o.x = q[0]; o.z = q[1]; }
      const dist = Math.hypot(p.x - o.x, p.z - o.z);
      // saltaste por encima: pasas, y hasta que te alejes no tropiezas al aterrizar
      if (A.salto && A.salto.enAire && dist < o.r + 0.25 && ver) {
        if (!o.gracia) {
          o.gracia = true;
          const m = marcas();
          if (!m.salto) { m.salto = true; A.avisar('¡Buen salto!', 'bien'); A.sfx('bien'); }
          A.evento('saltoObstaculo', { id: def.id });
        }
      } else if (o.gracia && !enAire() && dist > o.r + 0.3) o.gracia = false;
    });
  }

  // ================================================================ 2) caídas
  function puedeCaer() {
    const st = A.estado();
    return st.jugando && !st.cargando && !st.accion && !st.panel && !st.visita && !st.examen && !st.levantando && !st.alarma
      && !st.cine && !st.tutorial && !st.vitrina && !st.mamaHabla && !futbol() && !escondido() && !ST.escondidas && !A.controlado && !A.primeraPersona
      && S().fase !== 'prologo' && !document.querySelector('#hud').hidden;
  }
  function caidaDeHoy(E) {
    const d = dia(), m = marcas();
    return CAEN.find((c) => c.lugar === E.nombre && c.dias.includes(d) && !m.cayo[c.id] && (!c.si || c.si())) || null;
  }

  const AVISO_SEG = 1.1, CAE_SEG = 0.35, RADIO = 0.6;
  let elAviso = null;
  function mostrarAviso(txt) {
    if (!elAviso) {
      elAviso = document.createElement('div');
      elAviso.className = 'obs-aviso';
      elAviso.setAttribute('role', 'alert');
      document.body.appendChild(elAviso);
    }
    elAviso.textContent = txt;
    elAviso.hidden = !txt;
  }

  function empezarCaida(def) {
    const E = ST.E;
    const p = A.P.root.position;
    marcas().cayo[def.id] = true;
    const sombra = new THREE.Mesh(new THREE.CircleGeometry(RADIO, 24), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.0, depthWrite: false }));
    sombra.rotation.x = -PI / 2; sombra.position.set(p.x, 0.025, p.z);
    const aro = new THREE.Mesh(new THREE.RingGeometry(RADIO - 0.06, RADIO, 28), new THREE.MeshBasicMaterial({ color: '#ff5a4a', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
    aro.rotation.x = -PI / 2; aro.position.set(p.x, 0.03, p.z);
    const obj = modelo(def.modelo);
    obj.position.set(p.x, 2.7, p.z);
    E.scene.add(sombra); E.scene.add(aro); E.scene.add(obj);
    ST.caida = { def, x: p.x, z: p.z, t: 0, sombra, aro, obj, fin: false };
    const txt = textoDe(def.aviso);
    A.avisar(`${txt} ¡Agáchate (X) o muévete!`, 'mal');
    mostrarAviso('¡Agáchate!');
    A.sfx('alerta');
    A.evento('caeAviso', { id: def.id });
  }
  function quitarCaida(dejar) {
    const c = ST.caida;
    if (!c) return;
    [c.sombra, c.aro].forEach((m) => m.parent && m.parent.remove(m));
    if (!dejar && c.obj.parent) c.obj.parent.remove(c.obj);
    ST.caida = null;
    mostrarAviso('');
  }
  function actualizarCaida(dt) {
    const c = ST.caida;
    c.t += dt;
    const t = c.t;
    // si algo interrumpe (un panel, mamá…), la cosa no cae
    if (!puedeCaer() && t < AVISO_SEG) { quitarCaida(false); return; }
    const k = Math.min(1, t / (AVISO_SEG + CAE_SEG));
    c.sombra.material.opacity = 0.12 + 0.3 * k;
    c.sombra.scale.setScalar(0.5 + 0.5 * k);
    c.aro.material.opacity = 0.5 + 0.4 * Math.abs(Math.sin(t * 12));
    if (t < AVISO_SEG) {
      c.obj.position.y = 2.7;
      c.obj.rotation.z = Math.sin(t * 22) * 0.15;   // se tambalea antes de caer
      return;
    }
    const f = Math.min(1, (t - AVISO_SEG) / CAE_SEG);
    c.obj.position.y = 2.7 - 2.66 * f * f;
    c.obj.rotation.x += dt * 6;
    if (f < 1) return;
    // ¡cayó!
    const p = A.P.root.position, dentro = Math.hypot(p.x - c.x, p.z - c.z) < RADIO;
    const salvo = agachado() || !dentro || escondido();
    const m = marcas();
    c.obj.position.y = 0.04; c.obj.rotation.set(0, rnd(0, 3), 0);
    if (salvo) {
      A.sfx('bien');
      A.avisar(agachado() && dentro ? `¡Bien! Te ${gx('agachaste', 'agachaste')} a tiempo.` : '¡Bien esquivado!', 'bien');
      if (!m.salvo) { m.salvo = true; A.cambiar({ animo: 2 }); }
    } else {
      A.sfx('golpe');
      if (A.flash) A.flash('mal');
      A.cambiar({ animo: -3, energia: -2 });
      A.decir(A.P, c.def.modelo === 'gota' ? '¡Brrr! ¡Qué fría!' : '¡Ay! Me dio un golpecito.', 2);
      A.avisar(m.golpe ? 'Te dio un golpecito.' : 'Te dio un golpecito. La próxima, agáchate (X) o sal de la sombra.', 'mal');
      m.golpe = true;
    }
    A.evento('caida', { id: c.def.id, salvo, lugar: ST.E && ST.E.nombre });
    const obj = c.obj, E = ST.E;
    quitarCaida(true);
    // se queda un ratito en el piso y desaparece
    setTimeout(() => { if (obj.parent && ST.E === E) obj.parent.remove(obj); }, 4000);
  }

  // ================================================================ 3) escondidas con la cachorrita
  const ESC_CUENTA = 10;
  function puedeEscondidas() {
    const P = H.perro;
    if (!P || !P.D || !(P.modo === 'sigue' || P.modo === 'espera')) return false;
    if (!ST.E || !CASA.includes(ST.E.nombre) || S().fase === 'colegio') return false;
    return listaEscondites().length > 0;
  }
  function listaEscondites() {
    if (A.escondites) { try { return A.escondites() || []; } catch (e) { return []; } }
    return (ST.E && ST.E.escondites) || [];
  }
  const posEsc = (e) => (e.en ? { x: e.en[0], z: e.en[1] } : { x: e.x, z: e.z });

  function empezarEscondidas() {
    const P = H.perro;
    if (!puedeEscondidas()) return false;
    if ((P.necesidades && P.necesidades.energia < 20)) { A.avisar(`${nomPerro()} está muy cansada para jugar. Déjala descansar.`); return false; }
    P.modo = 'juega';
    const D = P.D;
    D.anim = 'dormir';   // echadita, tapándose los ojos
    ST.escondidas = { fase: 'cuenta', t: 0, D, ultimo: ESC_CUENTA + 1, puntos: [], i: 0, olor: 0, tBusca: 0, lugar: ST.E.nombre, inicio: performance.now(), tReal: 0 };
    // mientras juegan: el reloj se pausa y nada interrumpe (ni tentaciones ni salir del cuarto)
    A.bloquear('escondidas', true);
    A.decir(A.P, `¡${nomPerro()}, cuenta hasta diez! ¡No espíes!`, 2.4);
    A.avisar(`¡A esconderse! Busca un escondite (${listaEscondites().map((e) => e.nombre.toLowerCase()).join(', ')}) antes de que ${nomPerro()} termine de contar.`, 'bien');
    A.evento('escondidas', { fase: 'empieza' });
    return true;
  }
  function terminarEscondidas(como, motivo) {
    const G = ST.escondidas;
    if (!G) return;
    ST.escondidas = null;
    A.bloquear('escondidas', false);
    mostrarAviso('');
    const P = H.perro;
    if (P && P.modo === 'juega') P.modo = 'sigue';
    if (como === 'cancelar') { A.evento('escondidas', { fase: 'cancelada', motivo: motivo || '' }); return; }
    const D = G.D, m = marcas();
    if (D) { D.anim = 'feliz'; D.salto = 0.55; }
    A.sfx('ladrido');
    if (escondido() && A.salirEscondite) A.salirEscondite();
    const n = nomPerro();
    let frase;
    if (como === 'teVio') frase = `¡${n} te vio antes de que te escondieras! Mueve la colita feliz.`;
    else if (G.tBusca < 7) frase = `¡${n} te encontró rapidísimo! ¡Qué buena nariz tiene!`;
    else if (G.tBusca < 14) frase = `¡${n} te encontró! Olfateó y olfateó hasta dar contigo.`;
    else frase = `¡A ${n} le costó un montón! Cuando por fin te vio, saltó de alegría.`;
    A.avisar(frase, 'bien');
    A.decir(A.P, como === 'teVio' ? '¡Me ganaste! Otra vez.' : `¡Me encontraste, ${n}!`, 2.4);
    const sube = m.esc === 0 ? 4 : m.esc < 3 ? 2 : 1;
    m.esc++;
    if (P && P.cambiarVinculo) P.cambiarVinculo(sube);
    if (sube < 5) A.avisar(`${n} confía más en ti (+${sube}).`, 'bien');
    if (m.esc === 1) A.anotar(`Jugaste a las escondidas con ${n}.`, 'bien');
    A.evento('escondidas', { fase: 'fin', segundos: G.tBusca, como });
  }
  function actualizarEscondidas(dt) {
    const G = ST.escondidas, D = G.D, st = A.estado();
    const motivo = !D || !D.root.parent ? 'perro' : st.visita ? 'visita' : st.cine ? 'cine' : futbol() ? 'futbol' : (ST.E && ST.E.nombre !== G.lugar) ? 'lugar' : (A.controlado || A.primeraPersona) ? 'control' : '';
    if (motivo) { terminarEscondidas('cancelar', motivo); return; }
    if (H.perro && H.perro.modo !== 'juega') H.perro.modo = 'juega';   // si otro módulo la soltó, sigue jugando
    if (st.accion || st.panel) return;   // esperando a que termines de esconderte
    G.t += dt;
    if (G.fase === 'cuenta') {
      D.anim = 'dormir';
      const quedan = Math.ceil(ESC_CUENTA - G.t);
      if (quedan !== G.ultimo && quedan > 0) { G.ultimo = quedan; mostrarAviso(`${nomPerro()} cuenta… ${ESC_CUENTA + 1 - quedan}`); if (quedan % 3 === 0) A.sfx('tic'); }
      // ya te escondiste: no hace falta esperar todo
      if (G.t >= ESC_CUENTA || (escondido() && G.t >= 3)) {
        mostrarAviso('');
        if (!escondido() && !agachado()) { G.fase = 'corre'; G.t = 0; A.sfx('ladrido'); return; }
        // va a olfatear 1 a 3 lugares antes de encontrarte
        const vinc = (H.perro && H.perro.vinculo) || 20, n = vinc >= 60 ? 1 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 3);
        const E = ST.E;
        for (let i = 0; i < n; i++) { const q = buscarLibre(E, rnd(-E.w / 2 + 1, E.w / 2 - 1), rnd(-E.d / 2 + 1, E.d / 2 - 1), 0.3); if (q) G.puntos.push(q); }
        G.fase = 'busca'; G.t = 0; G.i = 0; G.olor = 0;
        A.sfx('guauTierno');
        A.avisar(`¡${nomPerro()} terminó de contar! Ya te está buscando… ¡shhh!`);
      }
      return;
    }
    G.tBusca += dt;
    if (!G.tReal) G.tReal = performance.now();
    const meta = () => { const e = A.escondido; return e ? posEsc(e) : { x: A.P.root.position.x, z: A.P.root.position.z }; };
    if (G.fase === 'busca' && G.i < G.puntos.length) {
      const [x, z] = G.puntos[G.i];
      if (irHacia(D, x, z, 1.5, dt)) {
        D.anim = 'comer';   // la nariz al piso: olfatea
        G.olor += dt;
        if (G.olor > 1.4) { G.olor = 0; G.i++; if (Math.random() < 0.5) A.sfx('guauTierno'); }
      }
      return;
    }
    // ahora sí: va directo a donde estás
    const q = meta();
    if (irHacia(D, q.x, q.z, G.fase === 'corre' ? 2.6 : 1.6, dt, 0.55)) terminarEscondidas(G.fase === 'corre' ? 'teVio' : 'encontro');
    // nunca se alarga demasiado (ni con la máquina lenta): a los 40 s de juego o 30 s reales, te encuentra
    if (ST.escondidas && (G.tBusca > 40 || performance.now() - G.tReal > 30000)) terminarEscondidas(G.fase === 'corre' ? 'teVio' : 'encontro');
  }
  function irHacia(D, x, z, v, dt, r) {
    const q = D.root.position, dx = x - q.x, dz = z - q.z, d = Math.hypot(dx, dz);
    if (d < (r || 0.08)) return true;
    const k = Math.min(1, v * dt / d);
    A.moverEn(D.root, dx * k, dz * k, 0.22);
    // si un mueble la frena, igual avanza (se escurre por debajo)
    if (Math.hypot(x - q.x, z - q.z) > d - v * dt * 0.2) { q.x += dx * k * 0.6; q.z += dz * k * 0.6; }
    let a = Math.atan2(dx, dz) - D.root.rotation.y;
    while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI;
    D.root.rotation.y += a * Math.min(1, dt * 8);
    D.anim = 'caminar'; D.vel = Math.min(1, v / 3);
    return false;
  }

  // la opción en el menú de la cachorrita (envuelve el abrir de perro.js, sin reemplazarlo)
  function engancharMenu(E) {
    const it = E.inters.find((i) => i.nombre === nomPerro() && i.posicion && !i.obsEsc);
    if (!it || !it.abrir) return;
    const orig = it.abrir;
    it.obsEsc = true;
    it.abrir = (...a) => {
      const def = orig(...a);
      if (def && def.opciones && puedeEscondidas()) {
        def.opciones.push({
          texto: `Jugar a las escondidas con ${nomPerro()}`, nota: 'Ella cuenta, tú te escondes… ¡y te busca olfateando!',
          min: 0, anim: 'saludar', dur: 0.6, esfuerzo: false, progreso: '¡A jugar!',
          alTerminar: () => empezarEscondidas(),
        });
      }
      return def;
    };
  }

  // ================================================================ ganchos
  A.alConstruir((nombre, E) => {
    if (ST.escondidas) terminarEscondidas('cancelar');
    if (ST.caida) quitarCaida(false);
    ST.E = E; ST.suelo = []; ST.libre = 0;
    ST.tCaida = rnd(7, 16);   // segundos tranquilos en el cuarto antes de que algo se caiga
    try { ponerSuelo(E); } catch (e) { console.warn('obstaculos', e); }
  });

  A.alActualizar((dt) => {
    if (!ST.E || A.escena !== ST.E) return;
    const st = A.estado();
    if (!st.jugando || st.cargando) return;
    actualizarSuelo(dt);
    if (ST.E.inters) engancharMenu(ST.E);
    if (ST.escondidas) actualizarEscondidas(dt);
    if (ST.caida) { actualizarCaida(dt); return; }
    if (ST.tCaida != null && puedeCaer()) {
      ST.libre += dt;
      if (ST.libre >= ST.tCaida) {
        ST.tCaida = null;
        const def = caidaDeHoy(ST.E);
        if (def) empezarCaida(def);
      }
    }
  });

  // ================================================================ para las pruebas y otros módulos
  H.obstaculos = {
    SUELO, CAEN,
    hoy: (d) => { d = d || dia(); return { suelo: SUELO.filter((s) => s.dias.includes(d)).map((s) => s.id), caen: CAEN.filter((c) => c.dias.includes(d)).map((c) => c.id) }; },
    get suelo() { return ST.suelo.map((o) => ({ id: o.def.id, x: o.x, z: o.z, r: o.r, activo: o.visible && o.activoBase(), gracia: o.gracia })); },
    get caida() { return ST.caida ? { id: ST.caida.def.id, x: ST.caida.x, z: ST.caida.z, t: ST.caida.t } : null; },
    // fuerza una caída ahora (la de hoy en este lugar, o cualquiera por id)
    forzarCaida(id) {
      if (ST.caida || !ST.E) return false;
      const def = id ? CAEN.find((c) => c.id === id) : caidaDeHoy(ST.E);
      if (!def) return false;
      empezarCaida(def);
      return true;
    },
    get escondidas() { return ST.escondidas ? { fase: ST.escondidas.fase, t: ST.escondidas.t, tBusca: ST.escondidas.tBusca } : null; },
    empezarEscondidas,
    puedeEscondidas,
    marcas,
  };
})();
