/* Fútbol en el jardín con el cachorro. Tito, el vecino, ataja en el arco.
   Dos modos:
   - En equipo: tú y el cachorro contra Tito. Se pasan la pelota, se hacen centros y cualquiera mete gol.
   - Mano a mano: tú contra el cachorro. Quien tiene la pelota ataca el arco; el otro se acerca para quitársela.
   - Tú solo: tiros al arco contra Tito, sin necesidad del cachorro.
   Para patear, mantén Patear (o Espacio): una barra de potencia sube y baja; al soltar, pateas con esa fuerza.
   Muy suave, Tito la ataja fácil; demasiado fuerte, se va por arriba del arco.
   La pelota va pegada al pie de quien la controla. Al empezar se muestra "Cómo jugar" con los controles:
   flechas moverse · Shift correr · Espacio patear (o cabecear si viene alta) · Q pasar · C centrar. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.motor.nino) return;
  const A = H.motor.api;
  const { THREE, PI } = A;

  const DURACION = 120;             // segundos reales (2 minutos)
  const MIN_JUEGO = 15;             // minutos del juego que cuesta un partido
  const ARCO = { x: 4.45, z1: -0.15, z2: 1.75, alto: 1.1 };
  const CENTRO_ARCO = (ARCO.z1 + ARCO.z2) / 2;
  const LIM = { x1: -4.75, z1: -3.3, z2: 3.3 };
  const R = 0.16;                   // radio de la pelota
  const G = 9.8;

  let B = null;                     // pelota: { m, sombra, x, z, y, vx, vz, vy }
  let J = null;                     // partido en curso
  let interPelota = null;           // la pelota se puede usar donde haya rodado
  const teclas = { correr: false };
  const nom = () => (A.perfil ? A.perfil.mascota.nombre : 'tu perro');
  const ang = (a) => { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; };
  const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const $ = (s) => document.querySelector(s);
  const perro = () => H.perro && H.perro.D;

  // ---------- marcador, botones y "cómo jugar"
  document.body.insertAdjacentHTML('beforeend', `
<div class="marcador" id="marcador" hidden role="status" aria-live="polite">
  <div class="mc-eq"><small id="mcIzqT"></small><b id="mcIzq">0</b></div>
  <div class="mc-tiempo" id="mcTiempo">2:00</div>
  <div class="mc-eq"><small id="mcDerT"></small><b id="mcDer">0</b></div>
  <p class="mc-ayuda" id="mcAyuda"></p>
</div>
<aside class="mc-controles" id="mcControles" hidden aria-label="Controles del partido">
  <b>Controles</b>
  <ul id="mcLista"></ul>
</aside>
<div class="mc-botones" id="mcBotones" hidden>
  <button type="button" data-b="correr">Correr<small>Shift</small></button>
  <button type="button" data-b="saltar">Saltar<small>Z</small></button>
  <button type="button" data-b="pase" class="eq">Pasar<small>Q</small></button>
  <button type="button" data-b="centro" class="eq">Centrar<small>C</small></button>
  <button type="button" data-b="patear">Patear<small>Espacio</small></button>
</div>
<div class="pantalla como-jugar" id="comoJugar" hidden><div class="hoja cj-hoja" role="dialog" aria-labelledby="cjTitulo">
  <p class="eyebrow">Fútbol en el jardín</p>
  <h2 id="cjTitulo"></h2>
  <p class="cj-meta" id="cjMeta"></p>
  <ul class="cj-lista" id="cjLista"></ul>
  <button class="btn" type="button" id="cjOk">¡A jugar!</button>
</div></div>
<div class="gol" id="gol" hidden></div>
<div class="potencia" id="potencia" hidden aria-hidden="true"><span>Potencia</span><i><b id="potB"></b><em class="pot-ok"></em></i></div>`);
  $('#mcBotones').addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-b]');
    if (!b || !J) return;
    e.preventDefault();
    if (b.dataset.b === 'correr') { teclas.correr = true; teclas.dedo = e.pointerId; }
    if (b.dataset.b === 'patear') { teclas.dedoPatear = e.pointerId; patear(); }
    if (b.dataset.b === 'saltar') saltar();
    if (b.dataset.b === 'pase') pasar(false);
    if (b.dataset.b === 'centro') pasar(true);
  });
  // con dos dedos: mantienes Correr y tocas Patear; solo soltar Correr deja de correr
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => $('#mcBotones').addEventListener(ev, (e) => {
    if (e.pointerId === teclas.dedo) { teclas.correr = false; teclas.dedo = null; }
    if (e.pointerId === teclas.dedoPatear) { teclas.dedoPatear = null; soltarTiro(); }
  }));
  window.addEventListener('keyup', (e) => { if (/^(Space|KeyE|Enter)$/.test(e.code)) soltarTiro(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Shift') teclas.correr = true; });
  window.addEventListener('keyup', (e) => { if (e.key === 'Shift') teclas.correr = false; });
  window.addEventListener('blur', () => { teclas.correr = false; });
  $('#cjOk').addEventListener('click', arrancar);

  // ---------- el arco y la pelota (siempre están en el jardín)
  A.alConstruir((nombre, E) => {
    if (J) terminar();
    B = null;
    interPelota = null;
    if (nombre !== 'jardin') return;
    const sc = E.scene;
    const blanco = '#f4f1ea';
    [ARCO.z1, ARCO.z2].forEach((z) => A.box(sc, 0.09, 1.15, 0.09, blanco, ARCO.x, 0.575, z));
    A.box(sc, 0.09, 0.09, ARCO.z2 - ARCO.z1 + 0.09, blanco, ARCO.x, 1.15, CENTRO_ARCO);
    const red = A.matB('#ffffff', 0.25);
    A.box(sc, 0.02, 1.1, ARCO.z2 - ARCO.z1, null, ARCO.x + 0.45, 0.55, CENTRO_ARCO, { mat: red, sombra: false });
    A.box(sc, 0.45, 0.02, ARCO.z2 - ARCO.z1, null, ARCO.x + 0.22, 1.12, CENTRO_ARCO, { mat: red, sombra: false });
    [ARCO.z1, ARCO.z2].forEach((z) => A.box(sc, 0.45, 1.1, 0.02, null, ARCO.x + 0.22, 0.55, z, { mat: red, sombra: false }));
    A.box(sc, 0.04, 0.005, 2.6, '#f4f1ea', ARCO.x - 1.1, 0.006, CENTRO_ARCO, { sombra: false });
    const m = A.bola(sc, R, '#f4f1ea', 0.6, R, 1.4, 1);
    [[0.1, 0.08, 0.1], [-0.1, 0.05, -0.08], [0, -0.1, 0.1]].forEach(([x, y, z]) => A.bola(m, 0.05, '#1d2340', x, y, z));
    // sombra de la pelota: ayuda a ver la altura cuando va por el aire
    const sombra = new THREE.Mesh(new THREE.CircleGeometry(R * 1.1, 12), A.matB('#1d2340', 0.25));
    sombra.rotation.x = -PI / 2; sc.add(sombra);
    B = { m, sombra, x: 0.6, z: 1.4, y: 0, vx: 0, vz: 0, vy: 0 };
    E.inters.push(interPelota = A.etiquetaInter('Pelota', [0.6, 0.9], [0.6, 1.4], 1.0, {
      alto: 0.7,
      posicion: () => ({ x: B ? B.x : 0, z: B ? B.z : 0 }),
      activo: () => !J,
      abrir: () => ({ titulo: 'La pelota', texto: 'El arco está listo. ¿Cómo quieres jugar?', opciones: opcionesJuego(true) }),
    }));
  });

  // opciones para empezar (también se usan desde el menú del cachorro)
  function opcionesJuego(conPatear) {
    const conPerro = perro() && (H.perro.modo === 'sigue' || H.perro.modo === 'espera');
    const agotada = H.perro && H.perro.necesidades && H.perro.necesidades.energia < 25;
    const cansado = A.S.energia < 15 ? 'Estás sin energía para correr.' : agotada ? `${nom()} está agotada: déjala descansar un rato.` : null;
    const ops = [];
    if (conPerro) {
      ops.push({
        texto: `En equipo con ${nom()} contra Tito`, nota: 'Se pasan la pelota, se hacen centros y le meten goles a Tito.',
        min: 0, anim: 'saludar', dur: 0.8, esfuerzo: false, progreso: '¡A jugar!', bloqueado: cansado, alTerminar: () => empezar('equipo'),
      });
      ops.push({
        texto: `Mano a mano contra ${nom()}`, nota: 'Quien tiene la pelota ataca el arco; el otro se la quita acercándose. Tito ataja para los dos.',
        min: 0, anim: 'saludar', dur: 0.8, esfuerzo: false, progreso: '¡A jugar!', bloqueado: cansado, alTerminar: () => empezar('mano'),
      });
    }
    {
      ops.push({
        texto: 'Tiros al arco tú solo', nota: `Tito ataja. Mantén Patear para cargar la fuerza del tiro.${conPerro ? '' : ` Si ${nom()} te acompaña, también pueden jugar un partido.`}`,
        min: 0, anim: 'saludar', dur: 0.8, esfuerzo: false, progreso: '¡A patear!', bloqueado: A.S.energia < 15 ? 'Estás sin energía para correr.' : null, alTerminar: () => empezar('solo'),
      });
    }
    return ops;
  }

  // ---------- empezar: primero "Cómo jugar", después el partido
  // en tablet o celular cada tecla se muestra con el nombre de su botón
  const BOTON = { Flechas: 'Palanca', Shift: 'Correr', Z: 'Saltar', Espacio: 'Patear', Q: 'Pasar', C: 'Centrar' };
  const tecla = (k) => `<kbd data-t="${BOTON[k] || k}">${A.tactil ? BOTON[k] || k : k}</kbd>`;
  const CONTROLES = {
    equipo: [
      ['Flechas', 'moverte. La pelota va pegada a tu pie cuando la tienes'],
      ['Shift', 'correr (mantén apretado)'],
      ['Z', 'saltar: así llegas a las pelotas altas para cabecear'],
      ['Espacio', 'mantén para cargar la fuerza y suelta para patear · si la pelota viene alta, cabecear'],
      ['Q', `pasarle la pelota a ${'{p}'} por el piso`],
      ['C', `centrar: pasarle la pelota a ${'{p}'} por el aire para que cabecee`],
      ['', `${'{p}'} también te pasa y te centra: cuando la pelota venga alta hacia ti, pulsa Espacio para cabecear`],
      ['', 'Tito ataja; cuando agarra la pelota la saca alto: ¡aprovecha para cabecear!'],
    ],
    mano: [
      ['Flechas', 'moverte. La pelota va pegada a tu pie cuando la tienes'],
      ['Shift', 'correr (mantén apretado)'],
      ['Z', 'saltar: así llegas a las pelotas altas para cabecear'],
      ['Espacio', 'mantén para cargar la fuerza y suelta para patear · si la pelota viene alta, cabecear'],
      ['', `Si ${'{p}'} tiene la pelota, acércate a ella para quitársela`],
      ['', `Si tú la tienes, ${'{p}'} se acerca para quitártela: ¡esquívala y patea!`],
      ['', 'Gana quien meta más goles. Tito ataja para los dos'],
    ],
    solo: [
      ['Flechas', 'moverte. La pelota va pegada a tu pie cuando la tienes'],
      ['Shift', 'correr (mantén apretado)'],
      ['Espacio', 'mantén apretado: la barra de potencia sube y baja. Suelta para patear'],
      ['', 'Muy suave, Tito la ataja fácil. Demasiado fuerte, ¡se va por arriba del arco! Lo mejor es la zona verde'],
      ['', 'Si Tito la ataja, te la devuelve: ¡intenta otra vez!'],
    ],
  };
  function empezar(modo) {
    if (!B || J) return;
    const E = A.escena;
    const tito = A.crearPersona({ piel: '#c98e6a', pelo: '#1d1612', camisa: '#f2a623', pantalon: '#1d2340', zapato: '#2aa876', escala: 0.72, cabezaGrande: true });
    tito.voz = 'nino';
    tito.root.position.set(ARCO.x - 0.35, 0, CENTRO_ARCO);
    tito.root.rotation.y = -PI / 2;
    E.scene.add(tito.root); E.npcs.push(tito);
    J = { modo: modo || 'equipo', t: DURACION, yo: 0, perro: 0, atajadas: 0, tito, pausa: 999, titoZ: CENTRO_ARCO, celebra: 0, tiene: 0, ultimo: null, dueno: null, libre: 0, robo: 0, pensar: 0, para: null, pv: { x: 0, z: 0 } };
    A.bloquear('futbol', true);
    A.enfocar(() => ({ x: 0.9 + (B.x - 0.9) * 0.25, z: 0.6, peso: 0.85 }));
    A.P.root.position.set(-1.6, 0, 0.8); A.P.root.rotation.y = PI / 2;
    const D = perro();
    if (J.modo !== 'solo') {
      if (H.perro) H.perro.modo = 'juega';
      if (D) { D.root.position.set(-1.6, 0, 2.2); D.root.rotation.y = PI / 2; D.anim = 'feliz'; }
    }
    sacar('yo');
    // marcador y botones
    $('#mcIzqT').textContent = J.modo !== 'equipo' ? 'Tú' : `Tú y ${nom()}`;
    $('#mcDerT').textContent = J.modo === 'mano' ? nom() : 'Tito atajó';
    $('#mcAyuda').innerHTML = J.modo === 'solo' ? `${tecla('Espacio')} mantén y suelta para patear · zona verde = gol más fácil`
      : J.modo === 'mano'
      ? `${tecla('Shift')} correr · ${tecla('Espacio')} patear o cabecear · acércate para quitársela`
      : `${tecla('Shift')} correr · ${tecla('Espacio')} patear o cabecear · ${tecla('Q')} pasar · ${tecla('C')} centrar`;
    document.querySelectorAll('#mcBotones .eq').forEach((b) => { b.hidden = J.modo !== 'equipo'; });
    pintar();
    // cómo jugar
    $('#cjTitulo').textContent = J.modo === 'solo' ? 'Tiros al arco contra Tito' : J.modo === 'mano' ? `Mano a mano contra ${nom()}` : `En equipo con ${nom()} contra Tito`;
    $('#cjMeta').textContent = J.modo === 'solo' ? 'Mete todos los goles que puedas en 2 minutos.' : J.modo === 'mano' ? 'Mete más goles que ella en 2 minutos.' : 'Métanle todos los goles que puedan a Tito en 2 minutos.';
    // los controles quedan a la vista durante todo el partido
    const corto = J.modo === 'solo'
      ? [['Flechas', 'moverte'], ['Shift', 'correr'], ['Espacio', 'mantén y suelta: patear con fuerza'], ['', 'la zona verde de la barra es la mejor']]
      : J.modo === 'mano'
      ? [['Flechas', 'moverte'], ['Shift', 'correr'], ['Z', 'saltar'], ['Espacio', 'patear · cabecear si viene alta'], ['', 'acércate a ella para quitársela']]
      : [['Flechas', 'moverte'], ['Shift', 'correr'], ['Z', 'saltar'], ['Espacio', 'patear · cabecear si viene alta'], ['Q', `pasar a ${nom()}`], ['C', `centrar a ${nom()}`]];
    $('#mcLista').innerHTML = corto.map(([k, t]) => `<li>${k ? tecla(k) : ''}<span>${t}</span></li>`).join('');
    $('#cjLista').innerHTML = CONTROLES[J.modo].map(([k, t]) => `<li>${k ? tecla(k) : '<span class="cj-punto">•</span>'}<span>${(A.tactil ? t.split('pulsa Espacio').join('toca Patear') : t).split('{p}').join(nom())}</span></li>`).join('');
    $('#comoJugar').hidden = false;
    $('#cjOk').focus();
  }
  function arrancar() {
    if (!J || $('#comoJugar').hidden) return;
    $('#comoJugar').hidden = true;
    J.pausa = 1.0;
    $('#marcador').hidden = false;
    $('#mcBotones').hidden = false;
    document.body.classList.add('en-partido');
    $('#mcControles').hidden = false;
    $('#lista').classList.add('oculta-futbol');
    A.decir(J.tito, J.modo === 'mano' ? '¡Yo atajo para los dos! A ver quién gana…' : J.modo === 'solo' ? '¡A ver si me ganas! Yo atajo.' : '¡Hola! ¡Yo atajo! A ver si me meten gol…', 2.6);
    A.sfx('alarma');
  }
  // la pelota en juego, frente a quien saca
  function sacar(quien) {
    B.y = 0; B.vx = 0; B.vz = 0; B.vy = 0;
    const D = perro();
    if (quien === 'perro' && D) { J.dueno = 'perro'; pegar(D.root.position, D.root.rotation.y, 0.38); }
    else { J.dueno = 'yo'; pegar(A.P.root.position, A.P.root.rotation.y, 0.42); }
    J.ultimo = J.dueno;
  }
  function terminar() {
    const j = J;
    J = null;
    $('#potencia').hidden = true;
    $('#marcador').hidden = true;
    $('#mcBotones').hidden = true;
    document.body.classList.remove('en-partido');
    $('#mcControles').hidden = true;
    $('#lista').classList.remove('oculta-futbol');
    $('#comoJugar').hidden = true;
    A.P.root.position.y = 0;
    A.bloquear('futbol', false);
    A.enfocar(null);
    A.ritmo(1);
    const E = A.escena;
    E.scene.remove(j.tito.root);
    const i = E.npcs.indexOf(j.tito); if (i >= 0) E.npcs.splice(i, 1);
    if (H.perro && j.modo !== 'solo') H.perro.modo = 'sigue';
    if (j.pausa > 100) return;   // se canceló antes de empezar
    A.S.min += MIN_JUEGO;
    const n = nom();
    let titulo, detalle, total;
    if (j.modo === 'solo') {
      total = j.yo;
      titulo = j.yo >= 5 ? '¡Goleador!' : j.yo > j.atajadas ? '¡Le ganaste a Tito!' : j.yo === j.atajadas ? '¡Empate con Tito!' : 'Tito atajó casi todo…';
      detalle = `Tus goles: ${j.yo} · Tito atajó ${j.atajadas}`;
      A.anotar(`Pateaste tiros al arco: ${j.yo} ${j.yo === 1 ? 'gol' : 'goles'} contra Tito.`, j.yo ? 'bien' : '');
      A.cambiar({ animo: 6 + Math.min(10, j.yo * 2), energia: -10, salud: 3, motivacion: j.yo ? 3 : 0 });
      A.banner('bien', 'Fin de los tiros', titulo, detalle);
      A.evento('finPartido', { modo: 'solo', yo: j.yo, perro: 0, goles: j.yo });
      A.sfx(j.yo ? 'logro' : 'final');
      return;
    }
    if (j.modo === 'mano') {
      total = j.yo;
      titulo = j.yo > j.perro ? '¡Ganaste!' : j.yo === j.perro ? '¡Empate!' : `¡Ganó ${n}!`;
      detalle = `Tú ${j.yo} · ${n} ${j.perro} · Tito atajó ${j.atajadas}`;
      A.anotar(`Jugaste mano a mano contra ${n}: ${j.yo} a ${j.perro}.`, 'bien');
    } else {
      total = j.yo + j.perro;
      titulo = total >= 4 ? '¡Goleada!' : total > j.atajadas ? '¡Ganaron!' : total === j.atajadas ? '¡Empate!' : 'Tito atajó casi todo…';
      detalle = `Tú: ${j.yo} · ${n}: ${j.perro} · Tito atajó ${j.atajadas}`;
      A.anotar(`Jugaste fútbol en equipo con ${n}: ${total} ${total === 1 ? 'gol' : 'goles'} contra Tito.`, total ? 'bien' : '');
    }
    A.cambiar({ animo: 6 + Math.min(12, (j.yo + j.perro) * 2), energia: -12, salud: 3, motivacion: total ? 4 : 0 });
    if (H.perro) H.perro.cambiarVinculo(4 + Math.min(10, (j.yo + j.perro) * 2));
    A.habito(`Jugar con ${n}`);
    A.S.f.jugoPerro = true;
    if (H.perro && H.perro.cansar) H.perro.cansar(35, 15);
    A.banner('bien', 'Fin del partido', titulo, detalle);
    A.evento('finPartido', { modo: j.modo, yo: j.yo, perro: j.perro, goles: j.yo + j.perro });
    A.sfx(total ? 'logro' : 'final');
  }

  function pintar() {
    $('#mcIzq').textContent = J.modo === 'mano' ? J.yo : J.yo + J.perro;
    $('#mcDer').textContent = J.modo === 'mano' ? J.perro : J.atajadas;
    const s = Math.max(0, Math.ceil(J.t));
    $('#mcTiempo').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  function cartel(txt) {
    const g = $('#gol');
    g.textContent = txt; g.hidden = false;
    g.classList.remove('sale'); void g.offsetWidth; g.classList.add('sale');
    clearTimeout(cartel.t); cartel.t = setTimeout(() => { g.hidden = true; }, 1600);
  }

  // ---------- la pelota pegada al pie
  function pegar(q, ry, r) {
    const nx = q.x + Math.sin(ry) * r, nz = q.z + Math.cos(ry) * r;
    B.vx = (nx - B.x) * 30; B.vz = (nz - B.z) * 30;   // solo para que gire al rodar
    B.x = nx; B.z = nz; B.y = 0; B.vy = 0;
  }
  function soltar(quien) { J.dueno = null; J.ultimo = quien; J.libre = 0.35; }

  // ---------- patear, cabecear, pasar y centrar
  const libreZ = () => (J.titoZ < CENTRO_ARCO ? ARCO.z2 - 0.3 : ARCO.z1 + 0.3);
  function tiroAlArco(desdeX, desdeZ, v, alto) {
    const gx = ARCO.x - desdeX, gz = libreZ() - desdeZ, l = Math.hypot(gx, gz);
    B.vx = gx / l * v; B.vz = gz / l * v; B.vy = alto;
  }
  function patear() {
    if (!J || J.pausa > 0 || J.tiene > 0) return;
    const p = A.P.root.position, d = Math.hypot(B.x - p.x, B.z - p.z);
    // ¿cabezazo? la pelota viene por el aire a la altura de la cabeza
    const alcance = 1.7 + A.P.root.position.y;   // saltando llegas más alto
    if (J.dueno !== 'yo' && B.y > 0.4 && B.y < alcance && d < 1.0) {
      tiroAlArco(B.x, B.z, 6.5, -0.4);
      soltar('yo');
      J.cabeza = true;
      A.P.anim = 'estirarse'; A.P.t = 0; setTimeout(() => { if (A.P.anim === 'estirarse') A.P.anim = 'quieto'; }, 400);
      cartel('¡Cabezazo!');
      A.sfx('golpe');
      return;
    }
    if (!(J.dueno === 'yo' || (J.dueno === null && d < 1.0 && B.y < 0.4))) {
      A.P.anim = 'patear'; A.P.t = 0;
      setTimeout(() => { if (A.P.anim === 'patear') A.P.anim = 'quieto'; }, 350);
      return;
    }
    // tienes la pelota: empieza a cargar la fuerza (se patea al soltar)
    J.carga = 0.001; J.cargaT = 0;
    $('#potencia').hidden = false;
    pintarCarga();
  }
  // la barra sube y baja (1.4 s ida y vuelta) mientras mantienes apretado
  const ZONA = [0.6, 0.88];                       // la zona verde: fuerte pero sin irse por arriba
  function pintarCarga() { $('#potB').style.width = `${Math.round(J.carga * 100)}%`; $('#potencia').classList.toggle('alta', J.carga > ZONA[1]); }
  function soltarTiro() {
    if (!J || !J.carga) return;
    const c = Math.max(0.35, J.carga);   // un toquecito rápido igual patea con fuerza media
    J.carga = 0;
    setTimeout(() => { if (J && !J.carga) $('#potencia').hidden = true; }, 500);
    const d = Math.hypot(B.x - A.P.root.position.x, B.z - A.P.root.position.z);
    if (!(J.dueno === 'yo' || (J.dueno === null && d < 1.0 && B.y < 0.4))) return;
    A.P.anim = 'patear'; A.P.t = 0;
    setTimeout(() => { if (A.P.anim === 'patear') A.P.anim = 'quieto'; }, 350);
    // hacia donde miras; si miras hacia el arco, al lado donde Tito no está
    const ry = A.P.root.rotation.y;
    const dx = Math.sin(ry), dz = Math.cos(ry);
    const v = 4 + 7 * c + (teclas.correr ? 0.8 : 0);
    const vy = c > ZONA[1] ? 7.5 + (c - ZONA[1]) * 6 : 0.9 + c * 1.6;   // demasiado fuerte: sale por arriba
    J.cabeza = false;
    if (dx > 0.3) tiroAlArco(B.x, B.z, v, vy);
    else { const l = Math.hypot(dx, dz); B.vx = dx / l * v; B.vz = dz / l * v; B.vy = vy; }
    soltar('yo');
    if (c > ZONA[1] && dx > 0.3) setTimeout(() => { if (J && !J.dueno && B.y > ARCO.alto) cartel('¡Muy fuerte! Se fue por arriba'); }, 350);
    A.sfx('golpe');
  }
  // saltar: sube un poco al personaje; en el aire alcanzas pelotas más altas para cabecear
  function saltar() {
    if (!J || J.pausa > 0 || (J.salto || 0) > 0) return;
    J.salto = 0.55;
    A.sfx('sube');
  }
  function pasar(centro) {
    if (!J || J.modo !== 'equipo' || J.pausa > 0 || J.tiene > 0 || J.dueno !== 'yo') return;
    const D = perro();
    if (!D) return;
    // un poquito adelante de donde va el perro
    const q = D.root.position, tx = q.x + J.pv.x * 0.4, tz = q.z + J.pv.z * 0.4;
    lanzar(tx, tz, centro);
    soltar('yo');
    J.para = 'perro';
    A.P.anim = 'patear'; A.P.t = 0; setTimeout(() => { if (A.P.anim === 'patear') A.P.anim = 'quieto'; }, 350);
    if (centro) cartel('¡Centro!');
    A.sfx(centro ? 'sube' : 'click');
  }
  // pase por el piso o centro por el aire (llega a la altura de la cabeza)
  function lanzar(tx, tz, alto) {
    const dx = tx - B.x, dz = tz - B.z, d = Math.hypot(dx, dz) || 1;
    if (alto) { const t = Math.max(0.7, d / 4.2); B.vx = dx / t; B.vz = dz / t; B.vy = (0.75 + G * t * t / 2) / t; }
    else { const v = Math.max(3.5, Math.min(7, d * 1.8 + 1.5)); B.vx = dx / d * v; B.vz = dz / d * v; B.vy = 0.3; }
  }
  A.alTecla((e) => {
    if (!J) return false;
    if (!$('#comoJugar').hidden) { if (/^(Space|Enter|KeyE)$/.test(e.code)) arrancar(); return true; }
    if (/^(Space|KeyE|Enter)$/.test(e.code)) { if (!e.repeat && !J.carga) patear(); return true; }
    if (/^(KeyQ|KeyP)$/.test(e.code)) { if (!e.repeat) pasar(false); return true; }
    if (/^(KeyC|KeyX)$/.test(e.code)) { if (!e.repeat) pasar(true); return true; }
    if (/^(KeyZ|KeyJ)$/.test(e.code)) { if (!e.repeat) saltar(); return true; }
    return false;
  });

  // ---------- cada cuadro
  A.alActualizar((dt) => {
    if (!B) return;
    if (J && J.pausa < 100) actualizarPartido(dt);
    moverPelota(dt);
    if (interPelota && !J) {
      // te paras al lado de la pelota (del lado donde estás) para usarla
      const p = A.P.root.position, dx = p.x - B.x, dz = p.z - B.z, l = Math.hypot(dx, dz) || 1;
      interPelota.en[0] = B.x + dx / l * 0.5; interPelota.en[1] = B.z + dz / l * 0.5;
      interPelota.mira[0] = B.x; interPelota.mira[1] = B.z;
    }
  });

  function moverPelota(dt) {
    const E = A.escena, D = perro();
    if (J && J.tiene > 0) {
      const t = J.tito.root.position;   // Tito la tiene en las manos
      B.x = t.x - 0.28; B.z = t.z; B.y = 0.55; B.vx = B.vz = B.vy = 0;
    } else if (J && J.dueno === 'yo') {
      pegar(A.P.root.position, A.P.root.rotation.y, 0.42);
    } else if (J && J.dueno === 'perro' && D) {
      pegar(D.root.position, D.root.rotation.y, 0.38);
    } else {
      B.x += B.vx * dt; B.z += B.vz * dt;
      B.vy -= G * dt; B.y += B.vy * dt;
      if (B.y <= 0) { B.y = 0; B.vy = Math.abs(B.vy) > 1.2 ? -B.vy * 0.45 : 0; }
      const f = Math.exp((B.y > 0 ? -0.15 : -1.15) * dt);
      B.vx *= f; B.vz *= f;
      // pelota suelta: la controla quien la toca (después de un instante si la acaban de patear)
      if (J && J.pausa <= 0 && J.libre <= 0 && B.y < 0.35) {
        const p = A.P.root.position;
        if (dist2(B, p) < 0.5) { J.dueno = 'yo'; J.ultimo = 'yo'; J.para = null; }
        else if (D && J.modo !== 'solo' && dist2(B, D.root.position) < 0.45) { J.dueno = 'perro'; J.ultimo = 'perro'; J.para = null; J.pensar = 0.35; }
      }
      // sin partido: se patea al caminar (como antes)
      if (!J && B.y < 0.25) {
        const p = A.P.root.position, dx = B.x - p.x, dz = B.z - p.z, d = Math.hypot(dx, dz);
        if (d < 0.42 && d > 0.001) { B.x = p.x + dx / d * 0.42; B.z = p.z + dz / d * 0.42; if (A.P.anim === 'caminar') { B.vx = dx / d * 3; B.vz = dz / d * 3; } }
      }
    }
    // ¿gol? por debajo del travesaño
    if (J && J.pausa <= 0 && B.x > ARCO.x + 0.05 && B.z > ARCO.z1 + 0.05 && B.z < ARCO.z2 - 0.05 && B.y < ARCO.alto) gol();
    // cerca, postes y travesaño
    const enArco = B.z > ARCO.z1 && B.z < ARCO.z2 && B.y < ARCO.alto;
    const xMax = enArco ? ARCO.x + 0.4 : ARCO.x - R;
    if (B.x > xMax) { B.x = xMax; B.vx = -Math.abs(B.vx) * 0.6; }
    if (B.x < LIM.x1) { B.x = LIM.x1; B.vx = Math.abs(B.vx) * 0.6; }
    if (B.z < LIM.z1) { B.z = LIM.z1; B.vz = Math.abs(B.vz) * 0.6; }
    if (B.z > LIM.z2) { B.z = LIM.z2; B.vz = -Math.abs(B.vz) * 0.6; }
    if (B.y < 0.9 && !(J && J.dueno)) E.cols.forEach((c) => {
      if (B.x > c.x1 - R && B.x < c.x2 + R && B.z > c.z1 - R && B.z < c.z2 + R) {
        const pl = B.x - (c.x1 - R), pr = (c.x2 + R) - B.x, pt = B.z - (c.z1 - R), pb = (c.z2 + R) - B.z, m = Math.min(pl, pr, pt, pb);
        if (m === pl) { B.x = c.x1 - R; B.vx = -Math.abs(B.vx) * 0.6; } else if (m === pr) { B.x = c.x2 + R; B.vx = Math.abs(B.vx) * 0.6; }
        else if (m === pt) { B.z = c.z1 - R; B.vz = -Math.abs(B.vz) * 0.6; } else { B.z = c.z2 + R; B.vz = Math.abs(B.vz) * 0.6; }
      }
    });
    B.m.position.set(B.x, R + B.y, B.z);
    B.sombra.position.set(B.x, 0.012, B.z);
    B.sombra.scale.setScalar(Math.max(0.4, 1 - B.y * 0.4));
    if (Math.hypot(B.vx, B.vz) > 0.01) { B.m.rotation.z -= B.vx * dt / R; B.m.rotation.x += B.vz * dt / R; }
  }

  function actualizarPartido(dt) {
    const j = J;
    if (j.pausa > 0) j.pausa -= dt;
    if (j.libre > 0) j.libre -= dt;
    if (j.carga) {
      // si te quitaron la pelota mientras cargabas, se cancela
      if (j.dueno !== 'yo') { j.carga = 0; $('#potencia').hidden = true; }
      else { j.cargaT += dt; const f = (j.cargaT / 1.4) % 1; j.carga = Math.max(0.001, f < 0.5 ? f * 2 : 2 - f * 2); pintarCarga(); }
    }
    // el salto (arco de 0.55 s, hasta 45 cm)
    if (j.salto > 0) { j.salto = Math.max(0, j.salto - dt); A.P.root.position.y = Math.sin((1 - j.salto / 0.55) * Math.PI) * 0.45; }
    else A.P.root.position.y = 0;
    if (j.robo > 0) j.robo -= dt;
    j.t -= dt;
    pintar();
    if (j.t <= 0) { terminar(); return; }
    // correr gasta un poquito de energía
    const corre = teclas.correr && A.P.anim === 'caminar' && A.S.energia > 5;
    A.ritmo(corre ? (j.dueno === 'yo' ? 1.45 : 1.6) : 1);
    if (corre) A.S.energia = Math.max(0, A.S.energia - dt * 0.35);
    // mano a mano: quitarse la pelota al acercarse
    const D = perro(), p = A.P.root.position;
    if (j.modo === 'mano' && D && j.robo <= 0 && j.pausa <= 0) {
      if (j.dueno === 'yo' && dist2(D.root.position, B) < 0.55 && Math.random() < dt * 2.4) {
        j.dueno = 'perro'; j.ultimo = 'perro'; j.robo = 1.0; j.pensar = 0.5;
        cartel(`¡${nom()} te la quitó!`); A.sfx('ladrido');
      } else if (j.dueno === 'perro' && dist2(p, B) < 0.55 && Math.random() < dt * 2.0) {
        j.dueno = 'yo'; j.ultimo = 'yo'; j.robo = 1.0;
        cartel('¡Se la quitaste!'); A.sfx('bien');
      }
    }
    // ¿la pelota quedó atrapada en una esquina (por ejemplo, detrás de la casita)?
    if (!j.dueno && j.tiene <= 0 && Math.hypot(B.vx, B.vz) < 0.4 && B.y < 0.05) {
      const cerca = dist2(B, p) < 0.8 || (D && j.modo !== 'solo' && dist2(B, D.root.position) < 0.8);
      j.atascada = cerca ? 0 : (j.atascada || 0) + dt;
      if (j.atascada > 2.5) {
        j.atascada = 0;
        lanzar(0.3, 0.8, true);
        j.libre = 0.4;
        A.decir(j.tito, '¡La pelota se atoró! Yo la saco.', 1.6, false);
        A.sfx('sube');
      }
    } else j.atascada = 0;
    actualizarTito(dt);
    if (D && j.modo !== 'solo') actualizarPerro(D, dt);
  }

  function actualizarTito(dt) {
    const j = J, t = j.tito, tq = t.root.position;
    t.root.rotation.y = -PI / 2;
    if (j.tiene > 0) {
      // tiene la pelota: la saca alto, a veces hacia ti para que cabecees
      j.tiene -= dt;
      t.anim = 'entregar';
      if (j.tiene <= 0) {
        const p = A.P.root.position, D = perro();
        const aTi = J.modo === 'solo' || Math.random() < 0.55, aPerro = !aTi && D && Math.random() < 0.6;
        const tx = aTi ? p.x : aPerro ? D.root.position.x : -1 + Math.random() * 2.5;
        const tz = aTi ? p.z : aPerro ? D.root.position.z : -1.5 + Math.random() * 4;
        lanzar(tx, tz, true);
        j.ultimo = null; j.dueno = null; j.libre = 0.4;
        t.anim = 'saludar'; t.t = 0;
        A.decir(t, aTi ? '¡Saque alto! ¡Cabecéala!' : '¡Saque!', 1.3, false);
        A.sfx('sube');
      }
      return;
    }
    const objZ = B.x > 1.5 ? Math.max(ARCO.z1 + 0.3, Math.min(ARCO.z2 - 0.3, B.z)) : CENTRO_ARCO;
    j.distraido = (j.distraido || 0) - dt;
    if (j.distraido < -4 && Math.random() < dt * 0.3) j.distraido = 1.2;   // se distrae mirando a los pájaros
    const v = j.distraido > 0 ? 0 : 1.0;
    j.titoZ += Math.max(-v * dt, Math.min(v * dt, objZ - j.titoZ));
    tq.z = j.titoZ;
    tq.x = ARCO.x - 0.35 + (B.x > 2.5 ? -0.25 : 0);
    if (j.celebra > 0) j.celebra -= dt; else t.anim = Math.abs(objZ - j.titoZ) > 0.05 ? 'caminar' : 'quieto';
    // ¡atajada!
    // un tiro que va subiendo con fuerza le pasa por encima (en pantallas lentas se calcula a saltos y parecía atajable)
    const porArriba = B.vy > 2.5 && B.y > 0.7;
    if (j.pausa <= 0 && !j.dueno && !porArriba && B.vx > 0.3 && B.y < 1.35 && Math.hypot(B.x - tq.x, B.z - tq.z) < 0.4) {
      const tiro = Math.hypot(B.vx, B.vz) > 2.5;
      if (tiro) {
        j.atajadas++; j.celebra = 1.2; t.anim = 'saludar'; t.t = 0;
        A.decir(t, ['¡Atajada!', '¡Mía!', '¡Uy, casi!', '¡No pasa!'][j.atajadas % 4], 1.4, false);
        A.sfx('golpe');
      }
      if (tiro && Math.random() < 0.65) { j.tiene = 1.3; B.vx = B.vz = B.vy = 0; }        // la agarra
      else { B.vx = -Math.abs(B.vx) * 0.7 - 1; B.vz += (Math.random() - 0.5) * 4; B.vy = 1.5; B.x = tq.x - 0.5; j.libre = 0.3; }   // la rechaza
    }
  }

  // ---------- el cachorro
  function moverPerro(D, tx, tz, v, dt, mira) {
    const q = D.root.position, dx = tx - q.x, dz = tz - q.z, d = Math.hypot(dx, dz);
    const px = q.x, pz = q.z;
    if (d > 0.12) {
      const k = Math.min(1, v * dt / d);
      A.moverEn(D.root, dx * k, dz * k, 0.22);
      D.anim = 'caminar';
    } else D.anim = 'feliz';
    const a = mira ? Math.atan2(mira.x - q.x, mira.z - q.z) : Math.atan2(dx, dz);
    D.root.rotation.y += ang(a - D.root.rotation.y) * Math.min(1, dt * 9);
    J.pv.x = (q.x - px) / Math.max(dt, 0.001); J.pv.z = (q.z - pz) / Math.max(dt, 0.001);
  }
  function perroPatea(D) {
    tiroAlArco(B.x, B.z, 6.8, 1.2);
    soltar('perro');
    D.salto = 0.4;
    A.sfx('ladrido');
  }
  function perroPasa(alto) {
    const p = A.P.root.position, ry = A.P.root.rotation.y;
    lanzar(p.x + Math.sin(ry) * 0.5, p.z + Math.cos(ry) * 0.5, alto);
    soltar('perro');
    J.para = 'yo';
    cartel(alto ? `¡${nom()} te centra! Cabecea con ${A.tactil ? 'Patear' : 'Espacio'}` : `¡Pase de ${nom()}!`);
    A.sfx('ladrido');
  }
  function actualizarPerro(D, dt) {
    const j = J, q = D.root.position, p = A.P.root.position;
    if (j.pensar > 0) j.pensar -= dt;
    if (j.tiene > 0) { moverPerro(D, 1.0, 0.8, 2.0, dt, B); return; }
    // cabezazo de perro: si la pelota viene alta hacia ella cerca del arco
    if (!j.dueno && j.libre <= 0 && B.y > 0.3 && B.y < 1.1 && dist2(B, q) < 0.6 && q.x > 1.2 && (j.modo === 'equipo' || j.ultimo !== 'perro')) {
      tiroAlArco(B.x, B.z, 6, 0.2); soltar('perro'); D.salto = 0.5;
      cartel(`¡Cabezazo de ${nom()}!`); A.sfx('ladrido');
      return;
    }

    if (j.dueno === 'perro') {
      // la tiene ella: avanza con la pelota pegada y decide
      const aArco = { x: ARCO.x, z: CENTRO_ARCO };
      if (j.pensar <= 0 && j.pausa <= 0) {
        if (j.modo === 'equipo') {
          const abierto = Math.abs(libreZ() - j.titoZ) > 0.6 || j.distraido > 0;
          if (q.x > 1.8 && abierto && Math.random() < 0.5) { perroPatea(D); return; }
          if (p.x > q.x + 0.3 && dist2(p, q) > 1.4 && Math.random() < 0.6) { perroPasa(dist2(p, q) > 2.0 && Math.random() < 0.6); return; }
          if (q.x > 2.7) { perroPatea(D); return; }
        } else if (q.x > 2.3 || (q.x > 1.4 && dist2(p, q) > 1.8)) { perroPatea(D); return; }
        j.pensar = 0.5;
      }
      // en mano a mano te esquiva
      const esquiva = j.modo === 'mano' && Math.abs(p.z - q.z) < 0.9 && p.x > q.x ? (p.z > q.z ? -1 : 1) * 1.3 : 0;
      moverPerro(D, Math.min(3.4, q.x + 1.0), Math.max(LIM.z1 + 0.5, Math.min(LIM.z2 - 0.5, q.z + esquiva + (CENTRO_ARCO - q.z) * 0.3)), j.modo === 'mano' ? 2.0 : 2.3, dt, esquiva ? null : aArco);
      return;
    }
    if (j.dueno === 'yo') {
      if (j.modo === 'equipo') {
        // tú la tienes: se adelanta y se abre para recibir el pase o el centro
        const tz = p.z < CENTRO_ARCO ? ARCO.z2 + 0.3 : ARCO.z1 - 0.3;
        moverPerro(D, Math.min(2.9, p.x + 1.9), tz, 3.0, dt, B);
      } else {
        // mano a mano: te persigue para quitártela
        moverPerro(D, B.x + 0.2, B.z, 2.6, dt, B);
      }
      return;
    }
    // pelota suelta: va por ella si está más cerca que tú (o si el pase era para ella)
    const voy = j.para === 'perro' || (j.para !== 'yo' && dist2(B, q) < dist2(B, p) + 0.3) || j.modo === 'mano';
    if (voy) moverPerro(D, B.x - 0.2, B.z, 3.2, dt);
    else moverPerro(D, Math.min(2.7, B.x + 1.5), B.z < CENTRO_ARCO ? B.z + 1.3 : B.z - 1.3, 2.4, dt, B);
  }

  function gol() {
    const j = J;
    const deQuien = j.ultimo === 'perro' ? 'perro' : 'yo';
    j[deQuien]++;
    A.evento('gol', { quien: deQuien, cabeza: deQuien === 'yo' && !!j.cabeza });
    j.cabeza = false;
    j.pausa = 1.8;
    j.dueno = null;
    cartel(deQuien === 'perro' ? `¡Gol de ${nom()}!` : '¡GOOOL!');
    A.sfx('logro'); A.flash('bien');
    for (let i = 0; i < 26; i++) A.emitir(new THREE.Vector3(ARCO.x, 0.6 + Math.random() * 0.5, ARCO.z1 + Math.random() * (ARCO.z2 - ARCO.z1)), ['#ffd23f', '#de5546', '#3d9bd4', '#2aa876'][i % 4], new THREE.Vector3(-1 - Math.random() * 2, 2 + Math.random() * 2, (Math.random() - 0.5) * 3), 1.2, 0.05, 4);
    A.decir(j.tito, ['¡Nooo!', '¡Estaba distraído!', '¡Qué golazo!', 'La próxima la atajo…'][(j.yo + j.perro) % 4], 1.6, false);
    const D = perro();
    if (D && j.modo !== 'solo') { D.salto = 0.55; A.sfx('ladrido'); }
    // en mano a mano saca el que recibió el gol; en equipo, tú
    setTimeout(() => { if (J === j && B) sacar(j.modo === 'mano' && deQuien === 'yo' ? 'perro' : 'yo'); }, 1300);
    pintar();
  }

  H.futbol = {
    empezar, arrancar, opcionesJuego,
    get jugando() { return !!J; }, get pelota() { return B; }, get partido() { return J; },
  };
})();
