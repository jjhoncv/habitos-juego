/* Día 6 (sábado): paseo al parque con papá y la cachorrita.
   - Solo el sábado. Papá lo propone después del desayuno (9:00) o en la tarde (15:00); tú decides si van
     ahora, más tarde (hablando con papá) o nunca. Nada es obligatorio.
   - El parque es un lugar nuevo (A.registrarEscena): columpios, tobogán, pileta, bebedero, bancas,
     un heladero y una vecina que pasea a su perrito Toby.
   - Papá y la cachorrita van contigo (aquí los maneja este módulo: perro.js solo la crea en la casa).
   - Al volver: hábito "Pasear con la familia" y una línea en el diario. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.motor.nino || !H.progreso) return;
  const A = H.motor.api;
  const { THREE, PI } = A;
  const h = (hh, mm) => hh * 60 + (mm || 0);
  const hoy = () => { const d = H.progreso.cargar().dia; return (d - 1) % 7 === 5; };
  const nina = () => !!(A.perfil && A.perfil.genero === 'nina');
  const g = (o, a) => (nina() ? a : o);
  const nom = () => (A.perfil && A.perfil.mascota && A.perfil.mascota.nombre) || 'Molly';
  const yo = () => (A.perfil && A.perfil.nombre) || A.CFG.nombre || 'Dani';
  const CASA = ['dormitorio', 'pasillo', 'bano', 'comedor', 'sala', 'jardin'];
  const ang = (a) => { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; };
  const girar = (Q, obj, dt, k) => { Q.root.rotation.y += ang(obj - Q.root.rotation.y) * Math.min(1, dt * (k || 8)); };
  const libre = () => { const st = A.estado(); return st.jugando && !st.cargando && !st.panel && !st.accion && !st.visita && !st.cine && !st.tutorial && !st.alarma && !st.examen && !st.levantando; };

  // estado del paseo (se reinicia al entrar al parque)
  const R = { hechos: [], molly: null, papa: null, vecina: null, toby: null, correa: null, columpios: [], pelota: null, juegan: null,
    columpio: null, tobogan: null, charla: null, papaFijo: null, saludoVecina: false, comentario: 0 };
  const hice = (k) => { if (!R.hechos.includes(k)) R.hechos.push(k); };
  const TEXTO_HECHO = {
    columpio: 'te columpiaste', tobogan: 'bajaste por el tobogán', pelota: `le lanzaste la pelota a ${nom()}`,
    toby: `${nom()} jugó con Toby`, helado: 'comieron helado con papá', banca: 'conversaste con papá en la banca',
    pileta: 'miraste los pececitos de la pileta', agua: 'tomaste agua del bebedero',
  };

  // ---------- la invitación de papá (en la casa)
  function papaEn(E) { return E && E.npcs.find((n) => n.voz === 'papa' && n.root.visible); }
  function puedeIr() { return hoy() && !A.S.f.d6Parque && A.S.fase !== 'colegio' && A.S.fase !== 'prologo' && A.S.min >= h(8, 30) && A.S.min < h(18); }
  function invitacion() {
    const pij = !A.S.f.vestido;
    return {
      titulo: 'Paseo al parque',
      texto: `Papá: "¡Hoy es sábado, ${yo()}! ¿Vamos al parque con ${nom()}? Hay columpios, un tobogán… y un heladero."`,
      opciones: [
        { texto: '¡Sí, vamos al parque!', nota: pij ? null : `Caminan juntos unos 15 minutos. ${nom()} va con ustedes.`, bloqueado: pij ? 'Primero cámbiate de ropa: al parque no se va en pijama.' : null,
          min: 2, anim: 'saludar', dur: 1.0, esfuerzo: false, progreso: '¡Al parque!', alTerminar: irAlParque },
        { texto: 'Más tarde, papá', nota: 'Cuando quieras, búscalo y le dices.', min: 0, anim: 'saludar', dur: 0.6, esfuerzo: false, progreso: 'Más tarde',
          alTerminar: () => { const p = papaEn(A.escena); if (p) A.decir(p, '¡Dale! Cuando quieras, me avisas.', 2.4); } },
      ],
    };
  }
  function interPapaCasa(E) {
    const it = A.etiquetaInter('Papá', [0, 0], [0, 0], 1.2, {
      alto: 2.0,
      posicion: () => { const p = papaEn(E); return p ? p.root.position : { x: 0, z: 0 }; },
      activo: () => puedeIr() && !!papaEn(E),
      abrir: invitacion,
    });
    E.inters.push(it);
    return it;
  }
  function proponer(cuando) {
    A.S.f['d6Propuso' + cuando] = true;
    const p = papaEn(A.escena);
    if (p) A.decir(p, `¡${yo()}! ¿Vamos al parque?`, 2.2);
    const def = invitacion();
    if (!p) def.texto = def.texto.replace('Papá: ', 'Papá (te llama desde otro cuarto): ');
    A.abrirPanel(def);
  }

  function irAlParque() {
    if (A.S.f.d6Parque) return;
    A.S.f.d6Parque = true;
    R.hechos = [];
    if (H.perro) H.perro.modo = 'sigue';
    A.S.min += 13;   // la caminata (la opción ya cuesta 2 min)
    A.irA('parque', { desde: 'calle', titulo: 'Parque', tips: [`Papá y ${nom()} van contigo.`, 'Columpios, tobogán, helados… ¡tú eliges!', 'Cuando quieras volver, habla con papá o ve al portón.'] });
  }
  function volver() {
    if (!A.escena || A.escena.nombre !== 'parque') return;
    const xs = R.hechos.map((k) => TEXTO_HECHO[k]);
    const lista = xs.length > 1 ? xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1] : xs[0];
    A.anotar(xs.length ? `Paseo al parque con papá y ${nom()}: ${lista}.` : `Paseo al parque con papá y ${nom()}: caminaron juntos y tomaron aire fresco.`, 'bien');
    // para que la abuela (dia7) lo mencione el domingo
    H.progreso.guardar({ parque: { fue: true, dia: H.progreso.cargar().dia, hechos: R.hechos.slice(), helado: !!A.S.f.d6Helado } });
    if (!A.S.f.d6Habito) { A.S.f.d6Habito = true; A.habito('Pasear con la familia'); }
    if (H.perro) H.perro.modo = 'sigue';
    A.S.min += 13;
    A.irA('comedor', { desde: 'calle', titulo: 'Casa', tips: ['De vuelta en casa.', `${nom()} llegó feliz y cansadita.`, '¡Qué lindo paseo!'] });
  }

  // ---------- el parque
  const CENTRO_PILETA = [0, -1.2];
  const COLUMPIO = { x: -5.0, z: -3.4, asientos: [-5.6, -4.4], largo: 1.7 };
  const TOBO = { base: [6.8, -3.4], arriba: [5.9, 1.55], abajo: [3.2, 0.22], fin: [2.8, -3.4] };
  const BANCA = { x: 3.2, z: 0.6 };
  const HELADO = { x: -5.6, z: 0.3 };
  const BEBEDERO = { x: -2.0, z: 3.7 };

  function construirParque() {
    const E = A.nuevaEscena('parque', 'Parque', 16, 11, {
      exterior: true, piso: '#7cb36a', pared: '#4f8f4a', alto: 1.0, cielo: '#9fd3f0', zocalo: false,
      puertas: [{ lado: 'izq', c: 2.0, ancho: 1.6, salida: true, a: 'calle', nombre: 'Casa' }],
    });
    const sc = E.scene;
    const { box, cil, bola } = A;
    // afuera: más pasto, árboles y casas
    box(sc, 70, 0.1, 50, '#6fa65d', 0, -0.16, -18, { sombra: false });
    [[-9, -8, 2.0], [-4, -9, 2.4], [1, -8.5, 2.2], [6, -9, 2.6], [11, -7.5, 2.0], [-12, -3, 2.2], [12, 2, 2.4], [-13, 4, 2.0]].forEach(([x, z, a], i) => A.arbol(sc, x, z, 0, a, ['#3f8f5a', '#2f7a4b', '#58a86b'][i % 3]));
    [[-14, -16, '#de5546'], [-3, -17, '#3d9bd4'], [9, -15, '#f2c14e']].forEach(([x, z, c]) => { box(sc, 4, 3, 3, '#f0e2c8', x, 1.5, z); box(sc, 4.4, 0.3, 3.4, c, x, 3.1, z); });
    // caminos
    const tierra = '#e3d3ae';
    box(sc, 16, 0.02, 1.3, tierra, 0, 0.011, 2.0, { sombra: false });
    cil(sc, 2.2, 2.2, 0.02, tierra, CENTRO_PILETA[0], 0.011, CENTRO_PILETA[1], { sombra: false, seg: 28 });
    box(sc, 1.1, 0.02, 1.6, tierra, 0, 0.012, 1.0, { sombra: false });
    // flores
    [[-7.2, -4.8], [-3.4, -4.9], [1.2, -4.9], [7.3, 4.9], [-7.3, 4.9]].forEach(([x, z], i) => {
      ['#de5546', '#f2c14e', '#f28fb3', '#8f73cf'].forEach((c, k) => { cil(sc, 0.015, 0.015, 0.25, '#3f8f5a', x + k * 0.22, 0.12, z, { sombra: false }); bola(sc, 0.07, c, x + k * 0.22, 0.27, z); });
      if (i > 2) E.solido(x + 0.33, z, 1.0, 0.3);
    });
    // árboles del parque
    [[-7.0, -4.2, 2.0], [-1.6, -4.5, 1.8], [7.1, 0.6, 2.2], [-7.1, 4.6, 1.6], [7.2, 4.4, 1.6]].forEach(([x, z, a], i) => { A.arbol(sc, x, z, 0, a, i % 2 ? '#2f7a4b' : '#3f8f5a'); E.solido(x, z, 0.5, 0.5); });

    // pileta con agua que salta
    const [px, pz] = CENTRO_PILETA;
    cil(sc, 1.35, 1.45, 0.5, '#c9c2b4', px, 0.25, pz, { seg: 24 });
    cil(sc, 1.18, 1.18, 0.06, null, px, 0.47, pz, { seg: 24, mat: A.matB('#6fbde8', 0.9), sombra: false });
    cil(sc, 0.16, 0.2, 1.0, '#b9b2a6', px, 0.9, pz);
    cil(sc, 0.5, 0.25, 0.16, '#c9c2b4', px, 1.42, pz);
    const peces = [0, 1, 2].map((i) => box(sc, 0.16, 0.03, 0.07, '#f28c3a', px, 0.51, pz, { sombra: false }));
    E.solido(px, pz, 2.8, 2.8);
    let chorro = 0;
    E.updates.push((dt, r) => {
      chorro -= dt;
      if (chorro <= 0) {
        chorro = 0.07;
        const a = Math.random() * PI * 2;
        A.emitir(new THREE.Vector3(px, 1.55, pz), Math.random() < 0.5 ? '#bfe6f2' : '#ffffff', new THREE.Vector3(Math.cos(a) * 0.6, 1.3, Math.sin(a) * 0.6), 0.9, 0.035, 3, 0.85);
      }
      peces.forEach((f, i) => { const b = r * (0.5 + i * 0.15) + i * 2.1; f.position.set(px + Math.cos(b) * (0.55 + i * 0.15), 0.51, pz + Math.sin(b) * (0.55 + i * 0.15)); f.rotation.y = -b; });
    });

    // columpios
    const C = COLUMPIO;
    [-1.2, 1.2].forEach((k) => {
      box(sc, 0.1, 2.3, 0.1, '#de5546', C.x + k * 1.0 + k * 0.2, 1.1, C.z - 0.35, { rx: 0.18 });
      box(sc, 0.1, 2.3, 0.1, '#de5546', C.x + k * 1.0 + k * 0.2, 1.1, C.z + 0.35, { rx: -0.18 });
      E.solido(C.x + k * 1.2, C.z, 0.3, 1.0);
    });
    box(sc, 2.7, 0.1, 0.1, '#3d9bd4', C.x, 2.2, C.z);
    R.columpios = C.asientos.map((x, i) => {
      const piv = new THREE.Group(); piv.position.set(x, 2.15, C.z); sc.add(piv);
      [-0.2, 0.2].forEach((k) => box(piv, 0.025, C.largo, 0.025, '#9aa0aa', k, -C.largo / 2, 0, { sombra: false }));
      box(piv, 0.48, 0.05, 0.26, i ? '#f2c14e' : '#3d9bd4', 0, -C.largo, 0);
      return piv;
    });
    E.updates.push((dt, r) => R.columpios.forEach((piv, i) => { if (!(R.columpio && R.columpio.i === i)) piv.rotation.x = Math.sin(r * 1.1 + i * 2) * 0.05; }));

    // tobogán
    const T = TOBO;
    box(sc, 0.9, 0.08, 0.8, '#f2c14e', 6.15, 1.5, -3.4);
    [[5.75, -3.75], [5.75, -3.05], [6.55, -3.75], [6.55, -3.05]].forEach(([x, z]) => box(sc, 0.08, 1.5, 0.08, '#3d9bd4', x, 0.75, z));
    for (let y = 0.3; y < 1.5; y += 0.3) box(sc, 0.06, 0.05, 0.7, '#9aa0aa', 6.6, y, -3.4);
    const L = Math.hypot(5.75 - 3.0, 1.5 - 0.15), rz = Math.atan2(1.5 - 0.15, 5.75 - 3.0);
    box(sc, L, 0.06, 0.62, '#de5546', (5.75 + 3.0) / 2, (1.5 + 0.15) / 2 + 0.03, -3.4, { rz });
    [-0.3, 0.3].forEach((k) => box(sc, L, 0.14, 0.05, '#c2453a', (5.75 + 3.0) / 2, (1.5 + 0.15) / 2 + 0.1, -3.4 + k, { rz }));
    E.solido(4.9, -3.4, 3.6, 1.0);

    // bancas (dos)
    [-BANCA.x, BANCA.x].forEach((x) => {
      box(sc, 1.6, 0.08, 0.45, '#8a5a3b', x, 0.45, BANCA.z);
      box(sc, 1.6, 0.4, 0.07, '#8a5a3b', x, 0.75, BANCA.z - 0.22);
      [-0.65, 0.65].forEach((k) => box(sc, 0.08, 0.45, 0.4, '#3a3a3a', x + k, 0.22, BANCA.z));
      E.solido(x, BANCA.z - 0.05, 1.6, 0.4);
    });

    // carrito del heladero
    const Hh = HELADO;
    box(sc, 1.1, 0.7, 0.6, '#ffffff', Hh.x, 0.55, Hh.z);
    box(sc, 1.12, 0.18, 0.62, '#f28fb3', Hh.x, 0.95, Hh.z);
    [-0.35, 0.35].forEach((k) => cil(sc, 0.16, 0.16, 0.06, '#353b48', Hh.x + k, 0.16, Hh.z + 0.31, { rx: PI / 2 }));
    cil(sc, 0.025, 0.025, 1.3, '#9aa0aa', Hh.x + 0.4, 1.6, Hh.z);
    cil(sc, 0.02, 0.75, 0.3, '#f2c14e', Hh.x + 0.4, 2.3, Hh.z, { seg: 10 });
    [['#f28fb3', -0.3], ['#7a4a2a', 0], ['#9ff0c4', 0.3]].forEach(([c, k]) => bola(sc, 0.08, c, Hh.x + k, 1.1, Hh.z + 0.15));
    const heladero = A.crearPersona({ piel: '#c98e6a', pelo: '#2b1d14', camisa: '#ffffff', pantalon: '#3d9bd4' });
    heladero.root.position.set(Hh.x, 0, Hh.z - 0.6); heladero.voz = 'nino';
    sc.add(heladero.root); E.npcs.push(heladero);
    E.solido(Hh.x, Hh.z - 0.15, 1.3, 1.2);

    // bebedero
    cil(sc, 0.14, 0.18, 0.75, '#9aa0aa', BEBEDERO.x, 0.37, BEBEDERO.z);
    cil(sc, 0.22, 0.18, 0.08, '#c8ccd2', BEBEDERO.x, 0.78, BEBEDERO.z);
    E.solido(BEBEDERO.x, BEBEDERO.z, 0.4, 0.4);

    // pájaros
    const pajaros = [0, 1].map(() => { const gg = new THREE.Group(); [-1, 1].forEach((k) => box(gg, 0.22, 0.02, 0.07, '#1d2340', k * 0.1, 0, 0, { rz: k * 0.3, sombra: false })); sc.add(gg); return gg; });
    E.updates.push((dt, r) => pajaros.forEach((gg, i) => {
      const a = r * 0.35 + i * 3;
      gg.position.set(Math.cos(a) * (6 + i * 2), 4.2 + Math.sin(r + i) * 0.4, -6 + Math.sin(a) * 3);
      gg.children.forEach((c, k) => { c.rotation.z = (k ? -1 : 1) * Math.sin(r * 8 + i) * 0.5; });
    }));

    // papá, la cachorrita, la vecina con Toby
    const papa = A.crearPapa();
    papa.root.position.set(-6.9, 0, 3.0); papa.root.rotation.y = PI / 2;
    sc.add(papa.root); E.npcs.push(papa);
    const D = A.crearPerro(A.perfil.mascota.color);
    D.voz = 'perro'; D.root.position.set(-6.9, 0, 1.1); D.root.rotation.y = PI / 2;
    sc.add(D.root); E.npcs.push(D);
    const vec = A.crearPersona({ piel: '#e6bd9c', pelo: '#8a5a3b', camisa: '#8f73cf', pantalon: '#55607a', peinado: 'mono' });
    vec.voz = 'mama'; vec.root.position.set(4.5, 0, 2.3); vec.anim = 'caminar'; vec.vel = 1;
    sc.add(vec.root); E.npcs.push(vec);
    const toby = A.crearPerro('#8a5a3b');
    toby.voz = 'perro'; toby.root.position.set(4.5, 0, 2.9);
    sc.add(toby.root); E.npcs.push(toby);
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const correa = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#de5546' }));
    sc.add(correa);
    Object.assign(R, { papa, molly: D, vecina: { P: vec, dir: -1, pausa: 0 }, toby, correa, pelota: null, juegan: null, columpio: null, tobogan: null, charla: null, papaFijo: null, saludoVecina: false, comentario: 0 });

    agregarInters(E);
    E.inicio = { pos: [-6.9, 2.0], rot: PI / 2 };
    E.alEntrar = () => {
      A.decir(papa, `¡Llegamos! ¿Qué quieres hacer primero, ${g('campeón', 'campeona')}?`, 3);
      D.anim = 'feliz'; D.salto = 0.55; A.sfx('ladrido');
    };
    return E;
  }

  // ---------- lo que se puede hacer en el parque
  function agregarInters(E) {
    const it = (nombre, en, mira, radio, extra) => { const x = A.etiquetaInter(nombre, en, mira, radio, Object.assign({ album: 'Parque' }, extra)); E.inters.push(x); return x; };
    const N = () => (H.perro && H.perro.necesidades) || { energia: 80 };
    const cansada = () => (N().energia < 25 ? `${nom()} está muy cansada: déjala descansar un ratito.` : null);
    const vinculo = (d) => { if (H.perro && H.perro.cambiarVinculo) H.perro.cambiarVinculo(d); };
    const cansar = (e) => { if (H.perro && H.perro.cansar) H.perro.cansar(e, 3); };

    it('Columpios', [COLUMPIO.x, COLUMPIO.z + 1.2], [COLUMPIO.x, COLUMPIO.z], 1.2, {
      abrir: () => ({
        titulo: 'Los columpios', texto: 'Papá te empuja suavecito. ¡Más alto, más alto!',
        opciones: [{
          texto: 'Columpiarte', nota: 'Sientes el viento en la cara.', min: 8, ef: { animo: 8, energia: -4 },
          pasos: [
            { ruta: [[COLUMPIO.asientos[1], COLUMPIO.z + 0.8], [COLUMPIO.asientos[1], COLUMPIO.z + 0.1]], mira: [COLUMPIO.asientos[1], 3], anim: 'quieto', dur: 0.2, min: 0, progreso: 'Subiendo al columpio',
              alTerminar: () => { R.columpio = { i: 1, t: 0 }; } },
            { mira: [COLUMPIO.asientos[1], 3], anim: 'quieto', sentado: true, dur: 6, min: 8, progreso: '¡Columpiándote! Más alto…' },
          ],
          alTerminar: () => { hice('columpio'); comentar('¡Qué alto llegaste! Parecías un pájaro.'); },
        }],
      }),
    });
    it('Tobogán', [TOBO.base[0], TOBO.base[1] + 0.9], [6.1, -3.4], 1.2, {
      abrir: () => ({
        titulo: 'El tobogán', texto: 'Se sube por la escalera, agarrándose bien, y se baja sentado.',
        opciones: [{
          texto: 'Tirarte por el tobogán', nota: 'Una vez más… ¡y otra!', min: 6, ef: { animo: 8, energia: -5 },
          pasos: [
            { ruta: [[TOBO.base[0], TOBO.base[1] + 0.9], TOBO.base], mira: [5, TOBO.base[1]], anim: 'estirarse', dur: 0.2, min: 0, progreso: 'Vas a la escalera',
              alTerminar: () => { R.tobogan = { t: 0 }; } },
            { anim: 'estirarse', dur: 6, min: 6, progreso: '¡Wiii! Bajando por el tobogán' },
          ],
          alTerminar: () => { hice('tobogan'); comentar('¡Bravo! ¡Bajaste rapidísimo!'); },
        }],
      }),
    });
    it('Pileta', [CENTRO_PILETA[0] + 1.0, CENTRO_PILETA[1] + 1.9], [CENTRO_PILETA[0], CENTRO_PILETA[1]], 1.2, {
      abrir: () => ({
        titulo: 'La pileta', texto: 'El agua salta y hace ruidito. Adentro nadan unos pececitos naranjas.',
        opciones: [{ texto: 'Mirar los pececitos', nota: 'Contarlos te calma.', min: 3, ef: { animo: 4 }, anim: 'quieto', dur: 2.5, esfuerzo: false, progreso: 'Uno, dos, tres pececitos…',
          alTerminar: () => { hice('pileta'); A.decir(A.P, '¡Hay tres pececitos!', 2); } }],
      }),
    });
    it('Bebedero', [BEBEDERO.x, BEBEDERO.z + 0.7], [BEBEDERO.x, BEBEDERO.z], 1.0, {
      abrir: () => ({
        titulo: 'El bebedero', texto: 'Con tanto juego, da sed.',
        opciones: [{ texto: 'Tomar agua', nota: 'Jugar al sol da sed.', min: 2, ef: { agua: 25 }, anim: 'agacharse', dur: 1.6, esfuerzo: false, progreso: 'Tomando agua', alTerminar: () => hice('agua') }],
      }),
    });
    it('Heladero', [HELADO.x, HELADO.z + 0.95], [HELADO.x, HELADO.z], 1.2, {
      abrir: () => {
        const ya = A.S.f.d6Helado ? 'Ya comiste uno hoy. ¡Uno basta!' : null;
        const op = (sabor, color) => ({
          texto: `Helado de ${sabor} con papá`, nota: 'Papá compra uno para cada uno.', bloqueado: ya, min: 10, ef: { animo: 10, comida: 6, confianza: 4 }, esfuerzo: false,
          pasos: [
            { anim: 'saludar', dur: 1.2, min: 1, progreso: 'Papá pide dos helados', alTerminar: () => darHelado(color) },
            { anim: 'comer', dur: 4, min: 9, progreso: `Comiendo tu helado de ${sabor}` },
          ],
          alTerminar: () => { A.S.f.d6Helado = true; hice('helado'); A.decir(R.papa, '¡Mmm! El mío de lúcuma está riquísimo.', 2.6); },
        });
        return { titulo: 'El heladero', texto: 'Heladero: "¡Helados, heladitos! ¿De qué sabor quieres?"', opciones: [op('fresa', '#f28fb3'), op('chocolate', '#7a4a2a')] };
      },
    });
    it('Banca', [BANCA.x - 0.3, BANCA.z + 0.9], [BANCA.x, BANCA.z], 1.1, {
      abrir: () => ({
        titulo: 'Una banca a la sombra', texto: 'Papá se sienta a tu lado. Desde aquí se ve todo el parque.',
        opciones: [{
          texto: 'Sentarte a conversar con papá', nota: 'Descansas y se cuentan cosas.', min: 10, ef: { energia: 6, animo: 6, confianza: 6 }, esfuerzo: false,
          pasos: [
            { ruta: [[BANCA.x - 0.35, BANCA.z + 0.9], [BANCA.x - 0.35, BANCA.z + 0.18]], mira: [BANCA.x - 0.35, 4], anim: 'quieto', dur: 0.2, min: 0, progreso: 'Sentándote',
              alTerminar: () => { R.papaFijo = { x: BANCA.x + 0.4, z: BANCA.z + 0.18, ry: 0, sentado: true }; R.charla = { t: 0, i: 0 }; } },
            { mira: [BANCA.x - 0.35, 4], anim: 'quieto', sentado: true, dur: 8, min: 10, progreso: 'Conversando con papá' },
          ],
          alTerminar: () => { R.papaFijo = null; R.charla = null; hice('banca'); },
        }],
      }),
    });
    const V = it('Vecina y Toby', [0, 0], [0, 0], 1.3, {
      alto: 1.9,
      posicion: () => (R.vecina ? R.vecina.P.root.position : { x: 0, z: 0 }),
      activo: () => !R.juegan,
      abrir: () => ({
        titulo: 'La vecina y su perrito', texto: `Vecina: "¡Hola! Él es Toby. Creo que quiere jugar con ${nom()}."`,
        opciones: [
          { texto: `Que ${nom()} juegue con Toby`, nota: 'Corren, se persiguen… ¡felices!', bloqueado: cansada(), min: 10, ef: { animo: 6 }, esfuerzo: false,
            pasos: [
              { anim: 'saludar', dur: 0.4, min: 0, progreso: '¡A jugar!', alTerminar: empezarJuego },
              { anim: 'aplaudir', dur: 6, min: 10, progreso: `${nom()} y Toby juegan a perseguirse` },
            ],
            alTerminar: () => { R.juegan = null; vinculo(3); cansar(10); hice('toby'); A.decir(R.vecina.P, '¡Se hicieron amigos!', 2.4); } },
          { texto: 'Saludar a la vecina', nota: 'Ser amable alegra el día.', min: 2, ef: { animo: 2, confianza: 2 }, anim: 'saludar', dur: 1.4, esfuerzo: false, progreso: 'Saludando',
            alTerminar: () => A.decir(R.vecina.P, `¡Qué ${g('educado', 'educada')} eres! Saludos a tu mamá.`, 2.6) },
        ],
      }),
    });
    R.interVecina = V;
    R.interMolly = it(nom(), [0, 0], [0, 0], 1.1, {
      alto: 0.95,
      posicion: () => (R.molly ? R.molly.root.position : { x: 0, z: 0 }),
      activo: () => !R.pelota && !R.juegan,
      abrir: () => ({
        titulo: nom(), texto: `${nom()} mueve la cola: ¡le encanta el parque!`,
        opciones: [
          { texto: 'Lanzarle la pelota: "¡Busca!"', nota: 'Corre a buscarla y te la trae.', bloqueado: cansada(), min: 6, ef: { animo: 7, energia: -3 }, esfuerzo: false,
            pasos: [
              { anim: 'senalar', dur: 0.6, min: 0, progreso: '¡Busca!', alTerminar: lanzarPelota },
              { anim: 'aplaudir', dur: 5, min: 6, progreso: `${nom()} corre por la pelota` },
            ],
            alTerminar: () => { vinculo(4); cansar(8); hice('pelota'); } },
          { texto: 'Acariciarla', nota: 'Le encanta, y a ti también te calma.', min: 2, ef: { animo: 5 }, anim: 'agacharse', dur: 1.8, esfuerzo: false, progreso: `Acariciando a ${nom()}`,
            alTerminar: () => { vinculo(2); if (R.molly) { R.molly.anim = 'feliz'; R.molly.salto = 0.55; } A.sfx('ladrido'); } },
        ],
      }),
    });
    R.interPapa = it('Papá', [0, 0], [0, 0], 1.2, {
      alto: 2.0,
      posicion: () => (R.papa ? R.papa.root.position : { x: 0, z: 0 }),
      activo: () => !R.papaFijo,
      abrir: () => ({
        titulo: 'Papá', texto: R.hechos.length ? 'Papá: "¡Qué buen sábado! ¿Hacemos algo más o volvemos a casa?"' : 'Papá: "Este parque me trae recuerdos. Aquí jugaba yo de chico."',
        opciones: [
          { texto: 'Darle un abrazo', nota: 'Los abrazos de papá son los mejores.', min: 2, ef: { animo: 4, confianza: 3 }, anim: 'saludar', dur: 1.4, esfuerzo: false, progreso: 'Abrazando a papá',
            alTerminar: () => A.decir(R.papa, `¡Te quiero mucho, ${yo()}!`, 2.2) },
          { texto: 'Volver a casa', nota: 'Caminan juntos de regreso (unos 15 min).', min: 2, anim: 'saludar', dur: 0.8, esfuerzo: false, progreso: 'De regreso', alTerminar: volver },
        ],
      }),
    });
    it('Portón', [-7.2, 2.0], [-8, 2.0], 0.9, {
      abrir: () => ({
        titulo: 'El portón del parque', texto: 'Por aquí se vuelve a casa.',
        opciones: [{ texto: 'Volver a casa con papá', nota: `${nom()} y papá vienen contigo.`, min: 2, anim: 'saludar', dur: 0.8, esfuerzo: false, progreso: 'De regreso', alTerminar: volver }],
      }),
    });
  }

  function comentar(txt) { if (R.papa) setTimeout(() => { if (R.papa && A.escena && A.escena.nombre === 'parque') A.decir(R.papa, txt, 2.6); }, 400); }
  function darHelado(color) {
    const P = A.P;
    A.ponerProp(P, null);
    const gr = new THREE.Group();
    A.cil(gr, 0.05, 0.015, 0.16, '#d9a35b', 0, 0, 0.08, { rx: 0 });
    A.bola(gr, 0.065, color, 0, 0.1, 0.08);
    gr.position.y = -0.62;
    P.prop = gr; P.brazos[0].add(gr);
  }
  function lanzarPelota() {
    const D = R.molly, E = A.escena;
    if (!D || !E) return;
    const p = A.P.root.position, ry = A.P.root.rotation.y;
    let tx = p.x + Math.sin(ry) * 3.5, tz = p.z + Math.cos(ry) * 3.5;
    tx = Math.max(-E.w / 2 + 0.8, Math.min(E.w / 2 - 0.8, tx)); tz = Math.max(-E.d / 2 + 0.9, Math.min(E.d / 2 - 0.8, tz));
    // que no caiga dentro de la pileta
    if (Math.hypot(tx - CENTRO_PILETA[0], tz - CENTRO_PILETA[1]) < 1.8) tz = CENTRO_PILETA[1] + 2.2;
    const m = A.bola(E.scene, 0.09, '#f2c14e', p.x, 1.0, p.z, 1);
    R.pelota = { m, x0: p.x, z0: p.z, tx, tz, t: 0, fase: 'vuela' };
    A.sfx('click');
  }

  // ---------- movimiento de papá, la cachorrita, la vecina y Toby
  function irHacia(Q, x, z, v, dt, r, choca) {
    const q = Q.root.position, dx = x - q.x, dz = z - q.z, d = Math.hypot(dx, dz);
    if (d < (r || 0.06)) return true;
    const k = Math.min(1, v * dt / d);
    if (choca) A.moverEn(Q.root, dx * k, dz * k, 0.22); else { q.x += dx * k; q.z += dz * k; }
    girar(Q, Math.atan2(dx, dz), dt);
    Q.anim = 'caminar'; Q.vel = Math.min(1, v / 3);
    return false;
  }
  function seguir(Q, lado, dist, dt, esPerro) {
    const p = A.P.root.position, ry = A.P.root.rotation.y;
    const tx = p.x - Math.sin(ry) * dist + Math.cos(ry) * lado, tz = p.z - Math.cos(ry) * dist - Math.sin(ry) * lado;
    const q = Q.root.position, d = Math.hypot(tx - q.x, tz - q.z);
    if (d > 7) { q.x = tx; q.z = tz; }
    if (A.estado().accion) { girar(Q, Math.atan2(p.x - q.x, p.z - q.z), dt, 4); Q.anim = esPerro ? 'feliz' : 'quieto'; return; }
    if (d > 0.4) irHacia(Q, tx, tz, d > 2.5 ? 3.4 : d > 1 ? 2.4 : 1.3, dt, 0.06, true);
    else { girar(Q, Math.atan2(p.x - q.x, p.z - q.z), dt, 4); Q.anim = esPerro && A.P.anim === 'caminar' ? 'feliz' : 'quieto'; }
  }

  A.alConstruir((nombre, E) => {
    if (nombre !== 'parque') { R.papa = R.molly = R.vecina = R.toby = null; R.columpio = R.tobogan = R.pelota = R.juegan = R.charla = R.papaFijo = null; }
    if (CASA.includes(nombre) && hoy()) interPapaCasa(E);
  });

  A.alActualizar((dt) => {
    const E = A.escena;
    if (!E) return;
    if (E.nombre !== 'parque') { revisarPropuesta(); return; }
    actualizarParque(dt);
  });

  function revisarPropuesta() {
    if (!puedeIr() || !libre() || !CASA.includes(A.escena.nombre)) return;
    const S = A.S;
    if (S.fase === 'manana' && S.f.desayuno && S.min >= h(9) && S.min < h(11, 30) && !S.f.d6Propuso1) proponer(1);
    else if (S.fase === 'tarde' && S.min >= h(15) && S.min < h(17, 30) && !S.f.d6Propuso2) proponer(2);
  }

  function actualizarParque(dt) {
    const P = A.P, accion = A.estado().accion;
    // columpio
    if (R.columpio) {
      const piv = R.columpios[R.columpio.i];
      if (!accion) { R.columpio = null; P.root.position.y = 0; piv.rotation.x = 0; }
      else if (P.sentado) {
        R.columpio.t += dt;
        const k = Math.min(1, R.columpio.t / 1.5), th = Math.sin(R.columpio.t * 2.6) * 0.5 * k;
        piv.rotation.x = th;
        P.root.position.z = COLUMPIO.z - COLUMPIO.largo * Math.sin(th);
        P.root.position.y = COLUMPIO.largo * (1 - Math.cos(th)) - 0.02;
      }
    }
    // tobogán: subir, deslizarse, llegar abajo
    if (R.tobogan) {
      if (!accion) { R.tobogan = null; P.root.position.y = 0; }
      else {
        const t = (R.tobogan.t += dt), q = P.root.position;
        P.root.rotation.y = -PI / 2;
        if (t < 1.6) { const k = t / 1.6; q.x = TOBO.base[0] - 0.55 * k; q.y = 1.55 * k; q.z = TOBO.base[1]; P.anim = 'estirarse'; P.sentado = false; }
        else if (t < 2.0) { q.x = TOBO.arriba[0]; q.y = TOBO.arriba[1] - 0.35; P.sentado = true; P.anim = 'quieto'; }
        else if (t < 3.4) { const k = (t - 2.0) / 1.4, e = k * k; q.x = TOBO.arriba[0] + (TOBO.abajo[0] - TOBO.arriba[0]) * e; q.y = (TOBO.arriba[1] - 0.35) + ((TOBO.abajo[1] - 0.2) - (TOBO.arriba[1] - 0.35)) * e; P.sentado = true; }
        else { q.x = TOBO.fin[0]; q.y = 0; P.sentado = false; P.anim = 'aplaudir'; P.root.rotation.y = 0; if (!R.tobogan.dijo) { R.tobogan.dijo = true; A.decir(P, '¡Wiiii! ¡Otra vez!', 1.8); } }
        q.z = TOBO.base[1];
      }
    }
    // charla en la banca
    if (R.charla) {
      if (!accion) { R.charla = null; R.papaFijo = null; }
      else {
        R.charla.t -= dt;
        const L = [
          [R.papa, '¿Qué es lo que más te gustó de esta semana?'],
          [P, `¡Jugar con ${nom()}!`],
          [R.papa, `${nom()} te quiere mucho. Se nota que la cuidas.`],
          [R.papa, `Estoy muy orgulloso de ti, ${yo()}.`],
          [P, '¡Gracias, papá! Me gusta pasear contigo.'],
        ];
        if (R.charla.t <= 0 && R.charla.i < L.length) { const [q, txt] = L[R.charla.i++]; A.decir(q, txt, 2.4); R.charla.t = 2.6; }
      }
    }
    // papá
    const pa = R.papa;
    if (pa) {
      if (R.papaFijo) {
        const f = R.papaFijo;
        if (irHacia(pa, f.x, f.z, 2.4, dt, 0.08)) { pa.root.rotation.y = f.ry; pa.sentado = !!f.sentado; pa.anim = 'quieto'; }
        else pa.sentado = false;
      } else {
        pa.sentado = false;
        seguir(pa, -0.9, 1.2, dt, false);
        if (accion && (R.columpio || R.tobogan) && Math.sin(A.S.min) > 0.6) pa.anim = 'aplaudir';
      }
      actualizarInter(R.interPapa, pa.root.position, 0.75);
    }
    // la cachorrita
    const D = R.molly;
    if (D) {
      if (R.pelota) buscarPelota(D, dt);
      else if (R.juegan) jugar(dt);
      else {
        seguir(D, 0.4, 0.95, dt, true);
        if (H.perro && H.perro.necesidades && H.perro.necesidades.energia < 20 && !accion) D.anim = 'dormir';
      }
      actualizarInter(R.interMolly, D.root.position, 0.65);
    }
    // la vecina pasea a Toby por el camino; se detiene si te acercas
    const V = R.vecina, T = R.toby;
    if (V && T) {
      const vp = V.P.root.position, cerca = Math.hypot(P.root.position.x - vp.x, P.root.position.z - vp.z) < 2.0;
      if (R.juegan) { V.P.anim = 'aplaudir'; girar(V.P, Math.atan2(R.juegan.cx - vp.x, R.juegan.cz - vp.z), dt, 4); }
      else if (cerca || V.pausa > 0) {
        V.pausa = Math.max(0, V.pausa - dt);
        V.P.anim = 'quieto';
        girar(V.P, Math.atan2(P.root.position.x - vp.x, P.root.position.z - vp.z), dt, 4);
        if (cerca && !R.saludoVecina) { R.saludoVecina = true; A.decir(V.P, '¡Hola! ¡Qué lindo día para pasear!', 2.4); }
      } else {
        const tx = V.dir > 0 ? 6.0 : -4.6;
        if (irHacia(V.P, tx, 2.35, 0.9, dt, 0.1)) { V.dir *= -1; V.pausa = 1.5; }
      }
      if (!R.juegan) {
        const ry = V.P.root.rotation.y, tx = vp.x - Math.sin(ry) * 0.3 + Math.cos(ry) * 0.6, tz = vp.z - Math.cos(ry) * 0.3 - Math.sin(ry) * 0.6;
        if (Math.hypot(tx - T.root.position.x, tz - T.root.position.z) > 0.25) irHacia(T, tx, tz, 1.4, dt, 0.1);
        else { T.anim = Math.hypot(P.root.position.x - T.root.position.x, P.root.position.z - T.root.position.z) < 2 ? 'feliz' : 'quieto'; }
      }
      R.correa.visible = !R.juegan;
      if (R.correa.visible) {
        const a = R.correa.geometry.attributes.position, ry = V.P.root.rotation.y;
        a.setXYZ(0, vp.x + Math.cos(ry) * 0.3, 0.85, vp.z - Math.sin(ry) * 0.3);
        a.setXYZ(1, T.root.position.x, 0.4, T.root.position.z);
        a.needsUpdate = true;
      }
      actualizarInter(R.interVecina, vp, 0.8);
    }
  }
  function actualizarInter(it, q, off) {
    if (!it) return;
    const pp = A.P.root.position, vx = pp.x - q.x, vz = pp.z - q.z, l = Math.hypot(vx, vz) || 1;
    it.en[0] = q.x + vx / l * off; it.en[1] = q.z + vz / l * off;
    it.mira[0] = q.x; it.mira[1] = q.z;
  }
  function empezarJuego() {
    const p = A.P.root.position;
    const cx = Math.max(-5, Math.min(5, p.x + 0.5)), cz = 4.0;
    R.juegan = { t: 0, a: 0, cx, cz };
    A.sfx('ladrido');
  }
  function jugar(dt) {
    const J = R.juegan, D = R.molly, T = R.toby;
    if (!A.estado().accion) { R.juegan = null; return; }
    J.t += dt; J.a += dt * 2.6;
    [[D, 0], [T, PI]].forEach(([Q, f]) => {
      const a = J.a + f, x = J.cx + Math.cos(a) * 1.0, z = J.cz + Math.sin(a) * 0.7;
      const q = Q.root.position;
      if (J.t < 1.2) { irHacia(Q, x, z, 3.2, dt, 0.05); return; }
      q.x = x; q.z = z; Q.root.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a) * 0.7);
      Q.anim = 'caminar'; Q.vel = 1;
      if (Math.random() < dt * 0.8) { Q.salto = 0.55; A.sfx('ladrido'); }
    });
  }
  function buscarPelota(D, dt) {
    const B = R.pelota;
    B.t += dt;
    if (B.fase === 'vuela') {
      const k = Math.min(1, B.t / 0.7);
      B.m.position.set(B.x0 + (B.tx - B.x0) * k, 1.0 + Math.sin(k * PI) * 1.4 - k * 0.91, B.z0 + (B.tz - B.z0) * k);
      D.anim = 'feliz';
      if (k >= 1) { B.fase = 'va'; A.sfx('ladrido'); }
      return;
    }
    if (B.fase === 'va') { if (irHacia(D, B.tx, B.tz, 3.8, dt, 0.3, true) || B.t > 6) { B.fase = 'trae'; D.salto = 0.4; } return; }
    const q = D.root.position, ry = D.root.rotation.y;
    B.m.position.set(q.x + Math.sin(ry) * 0.36, 0.42, q.z + Math.cos(ry) * 0.36);
    const p = A.P.root.position;
    if (irHacia(D, p.x + Math.sin(A.P.root.rotation.y) * 0.7, p.z + Math.cos(A.P.root.rotation.y) * 0.7, 3.0, dt, 0.25, true) || B.t > 10) {
      A.escena.scene.remove(B.m);
      R.pelota = null;
      D.anim = 'feliz'; D.salto = 0.55; A.sfx('ladrido');
    }
  }

  A.registrarEscena('parque', 'Parque', construirParque);

  H.dia6 = {
    hoy, irAlParque, volver, proponer,
    get hechos() { return R.hechos.slice(); },
    get R() { return R; },
  };
})();
