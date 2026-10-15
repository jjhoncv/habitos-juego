/* Juegos de verdad con los amigos y en la tele.
   - Recreo (patio): la interacción "Amigos" ahora abre dos juegos de 1 minuto y medio con tus amigos
     (y con Teo, si ya es tu amigo):
       · Chapadas: quien chapa persigue a los demás; si toca a alguien, ahora chapa ese. Corre para escaparte.
       · Fútbol: tú y tus amigos contra el arquero. La pelota va pegada a tu pie; Patear tira al arco, Pasar se la da a un amigo.
   - Sala: la PS5 abre un minijuego en la tele ("Estrellas del espacio"): mueves la nave, atrapas estrellas
     y esquivas meteoritos. Mantiene sus consecuencias (tiempo, ánimo, motivación y el mal hábito si es antes de la tarea).
   Las dos interacciones se reemplazan desde aquí (A.alConstruir), sin tocar juego.js. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api) return;
  const A = H.motor.api;
  const { THREE, PI } = A;
  const $ = (s) => document.querySelector(s);
  const nina = () => !!A.perfil && A.perfil.genero === 'nina';
  const gx = (o, a) => (nina() ? a : o);
  const nombre = () => (A.perfil && A.perfil.nombre) || 'Dani';
  const ang = (a) => { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const DUR = { recreo: 90, ps5: 60 };   // segundos reales (las pruebas pueden acortarlos)
  const BOTON = { Flechas: 'Palanca', Shift: 'Correr', Espacio: 'Patear', Q: 'Pasar' };
  const tecla = (k) => `<kbd data-t="${BOTON[k] || k}">${A.tactil ? BOTON[k] || k : k}</kbd>`;

  // ======================================================================= RECREO
  const ARCO = { x: 5.6, z1: 0.2, z2: 2.2, alto: 1.2 };
  const CENTRO = (ARCO.z1 + ARCO.z2) / 2;
  const CAMPO = { x1: -5.3, x2: 5.4, z1: -2.6, z2: 3.5 };
  const R = 0.14;
  const G = 9.8;
  let J = null;                 // juego en curso
  let pelotaPatio = null;       // la pelota del patio (la de juego.js, si se encuentra)
  let interAmigos = null;
  const teclas = { correr: false };

  document.body.insertAdjacentHTML('beforeend', `
<div class="marcador jg-marcador" id="jgMarcador" hidden role="status" aria-live="polite">
  <div class="mc-eq"><small id="jgIzqT"></small><b id="jgIzq">0</b></div>
  <div class="mc-tiempo" id="jgTiempo">1:30</div>
  <div class="mc-eq"><small id="jgDerT"></small><b id="jgDer">0</b></div>
  <p class="mc-ayuda jg-estado" id="jgEstado"></p>
</div>
<div class="mc-botones jg-botones" id="jgBotones" hidden>
  <button type="button" data-b="correr">Correr<small>Shift</small></button>
  <button type="button" data-b="pase" class="fut">Pasar<small>Q</small></button>
  <button type="button" data-b="patear" class="fut">Patear<small>Espacio</small></button>
</div>
<div class="pantalla como-jugar" id="jgComo" hidden><div class="hoja cj-hoja" role="dialog" aria-labelledby="jgComoTit">
  <p class="eyebrow">Recreo con tus amigos</p>
  <h2 id="jgComoTit"></h2>
  <p class="cj-meta" id="jgComoMeta"></p>
  <ul class="cj-lista" id="jgComoLista"></ul>
  <button class="btn" type="button" id="jgComoOk">¡A jugar!</button>
</div></div>
<div class="gol" id="jgCartel" hidden></div>`);

  $('#jgBotones').addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-b]');
    if (!b || !J) return;
    e.preventDefault();
    if (b.dataset.b === 'correr') { teclas.correr = true; teclas.dedo = e.pointerId; }
    if (b.dataset.b === 'patear') patear();
    if (b.dataset.b === 'pase') pasar();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => $('#jgBotones').addEventListener(ev, (e) => {
    if (e.pointerId === teclas.dedo) { teclas.correr = false; teclas.dedo = null; }
  }));
  window.addEventListener('blur', () => { teclas.correr = false; });
  $('#jgComoOk').addEventListener('click', () => arrancar());

  function cartel(txt) {
    const g = $('#jgCartel');
    g.textContent = txt; g.hidden = false;
    g.classList.remove('sale'); void g.offsetWidth; g.classList.add('sale');
    clearTimeout(cartel.t); cartel.t = setTimeout(() => { g.hidden = true; }, 1500);
  }

  // ---------- el patio: reemplaza "Amigos" y pausa la ronda de juego.js mientras jugamos
  A.alConstruir((nombreEsc, E) => {
    if (J) terminar(true);
    pelotaPatio = null; interAmigos = null;
    if (nombreEsc === 'sala') ponerPS5(E);
    if (nombreEsc !== 'patio') return;
    // mientras jugamos, lo que ya se movía solo en el patio (la ronda de los amigos, Teo, la pelota) se queda quieto
    for (let i = 0; i < E.updates.length; i++) { const u = E.updates[i]; E.updates[i] = (dt, t) => { if (!J || J.escena !== E) u(dt, t); }; }
    E.scene.traverse((o) => { if (!pelotaPatio && o.isMesh && o.parent === E.scene && o.geometry && /^(Icosahedron|Sphere)(Buffer)?Geometry$/.test(o.geometry.type) && Math.abs((o.geometry.parameters || {}).radius - R) < 0.001) pelotaPatio = o; });
    const i = E.inters.findIndex((it) => it.nombre === 'Amigos');
    const viejo = i >= 0 ? E.inters[i] : null;
    interAmigos = A.etiquetaInter('Amigos', viejo ? viejo.en.slice() : [2.0, 2.4], viejo ? viejo.mira.slice() : [3.2, 1.2], 1.3, {
      alto: 1.6,
      activo: () => !J,
      abrir: () => panelAmigos(),
    });
    if (i >= 0) E.inters[i] = interAmigos; else E.inters.push(interAmigos);
  });

  const conTeo = () => !!(H.dia2 && H.dia2.teo && (H.dia2.esAmigo() || H.dia2.modo === 'juega'));
  const AMIGOS = ['Lucho', 'Santi'];
  function quienes() { return conTeo() ? `${AMIGOS[0]}, ${AMIGOS[1]} y Teo` : `${AMIGOS[0]} y ${AMIGOS[1]}`; }
  function panelAmigos() {
    const llueve = A.llueve;
    const cansado = llueve ? 'Está lloviendo: hoy el recreo es bajo techo.' : A.S.energia < 20 ? `Estás muy ${gx('cansado', 'cansada')} para correr. Come algo en el kiosco.` : null;
    const ops = [
      { texto: 'Jugar a las chapadas', nota: 'Quien chapa persigue a los demás. ¡Corre para que no te chapen!', min: 0, anim: 'saludar', dur: 0.8, esfuerzo: false, progreso: '¡A jugar!', bloqueado: cansado, alTerminar: () => empezar('chapadas') },
      { texto: 'Jugar un partido de fútbol', nota: `Tú${conTeo() ? ', Teo' : ''} y ${AMIGOS[0]} contra ${AMIGOS[1]}, que ataja.`, min: 0, anim: 'patear', dur: 0.8, esfuerzo: false, progreso: '¡A jugar!', bloqueado: cansado, alTerminar: () => empezar('futbol') },
    ];
    if (!A.S.f.jugo) ops.push({ texto: 'Mirarlos desde lejos', nota: 'Te quedas sin jugar.', min: 10, ef: { animo: -6 }, anim: 'esperar', esfuerzo: false,
      alTerminar: () => { A.S.f.jugo = 'no'; A.anotar('No jugaste con tus amigos en el recreo.', 'mal'); } });
    return {
      titulo: 'Recreo con tus amigos',
      texto: A.S.f.jugo === 'si' ? `${quienes()}: "¡Otra vez! ¿A qué jugamos ahora?"` : `${quienes()}: "¡${nombre()}, ven a jugar con nosotros!"`,
      opciones: ops,
    };
  }

  // ---------- los jugadores
  function buscarAmigos(E) {
    // los amigos que ya estaban jugando en la ronda del patio (niños cerca del arco); si no hay, llegan nuevos
    const teo = H.dia2 && H.dia2.teo;
    const ninos = E.npcs.filter((n) => n.voz === 'nino' && n !== teo && n.root.parent && dist(n.root.position, { x: 3.2, z: 1.2 }) < 2.4);
    const ropa = [{ piel: '#c98e6a', pelo: '#1d1612', camisa: '#de5546' }, { piel: '#e3b48e', pelo: '#6b3d22', camisa: '#2aa876' }];
    const lista = [];
    for (let k = 0; k < 2; k++) {
      let o = ninos[k], nuevo = false;
      if (!o) {
        o = A.crearPersona(Object.assign({ escala: 0.72, cabezaGrande: true, pantalon: '#2e3d6b' }, ropa[k]));
        o.voz = 'nino'; o.root.position.set(3 + k, 0, 1 + k); E.scene.add(o.root); E.npcs.push(o); nuevo = true;
      }
      lista.push({ o, nombre: AMIGOS[k], nuevo });
    }
    if (conTeo()) { teo.sentado = false; lista.push({ o: teo, nombre: 'Teo', nuevo: false }); }
    return lista;
  }
  function moverNino(k, tx, tz, v, dt, mira) {
    const q = k.o.root.position, dx = tx - q.x, dz = tz - q.z, d = Math.hypot(dx, dz);
    if (d > 0.08) {
      const f = Math.min(1, v * dt / d);
      A.moverEn(k.o.root, dx * f, dz * f, 0.22);
      q.x = Math.max(CAMPO.x1, Math.min(CAMPO.x2, q.x)); q.z = Math.max(CAMPO.z1 - 0.6, Math.min(CAMPO.z2, q.z));
      k.o.anim = 'caminar'; k.o.vel = v * 1.2;
    } else { k.o.anim = 'quieto'; }
    const a = mira ? Math.atan2(mira.x - q.x, mira.z - q.z) : Math.atan2(dx, dz);
    if (d > 0.08 || mira) k.o.root.rotation.y += ang(a - k.o.root.rotation.y) * Math.min(1, dt * 10);
  }

  // ---------- empezar: primero "Cómo jugar", después el juego
  const COMO = {
    chapadas: [
      ['Flechas', 'moverte'],
      ['Shift', 'correr (mantén apretado): ¡así nadie te alcanza!'],
      ['', 'Si te toca chapar (la flecha roja está sobre ti), corre y toca a un amigo'],
      ['', 'Si chapa otro, ¡escápate! Si te toca, ahora chapas tú'],
      ['', 'No se vale chapar de vuelta enseguida a quien te chapó'],
    ],
    futbol: [
      ['Flechas', 'moverte. La pelota va pegada a tu pie cuando la tienes'],
      ['Shift', 'correr (mantén apretado)'],
      ['Espacio', 'patear: mira hacia el arco y patea'],
      ['Q', 'pasarle la pelota a un amigo de tu equipo'],
      ['', `${AMIGOS[1]} ataja. Cuando la agarra, la saca de nuevo`],
    ],
  };
  function empezar(juego) {
    const E = A.escena;
    if (J || !E || E.nombre !== 'patio') return;
    const ninos = buscarAmigos(E);
    J = { juego, escena: E, ninos, t: DUR.recreo, pausa: 999, yo: 0, ellos: 0 };
    A.bloquear('recreo', true);
    if (A.P.root.position.y) A.P.root.position.y = 0;
    if (juego === 'chapadas') prepararChapadas(); else prepararFutbol();
    $('#jgComoTit').textContent = juego === 'chapadas' ? 'Chapadas' : 'Partido de fútbol';
    $('#jgComoMeta').textContent = juego === 'chapadas'
      ? `Con ${quienes()}. Juegan un minuto y medio. Empieza chapando ${J.chapa === 'yo' ? 'tú' : J.chapa.nombre}.`
      : `Tú${conTeo() ? ', Teo' : ''} y ${AMIGOS[0]} contra ${AMIGOS[1]}. Métanle todos los goles que puedan en un minuto y medio.`;
    $('#jgComoLista').innerHTML = COMO[juego].map(([k, t]) => `<li>${k ? tecla(k) : '<span class="cj-punto">•</span>'}<span>${t}</span></li>`).join('');
    $('#jgComo').hidden = false;
    $('#jgComoOk').focus();
    A.evento('recreoJuego', { juego, fase: 'empieza' });
  }
  function arrancar() {
    if (!J || $('#jgComo').hidden) return;
    $('#jgComo').hidden = true;
    J.pausa = 1.0;
    $('#jgMarcador').hidden = false;
    $('#jgBotones').hidden = false;
    document.querySelectorAll('#jgBotones .fut').forEach((b) => { b.hidden = J.juego !== 'futbol'; });
    document.body.classList.add('en-partido', 'en-recreo');
    $('#lista').classList.add('oculta-futbol');
    A.sfx('alarma');
    if (J.juego === 'chapadas') A.decir(J.chapa === 'yo' ? J.ninos[0].o : J.chapa.o, J.chapa === 'yo' ? `¡Tú chapas, ${nombre()}! ¡Corran!` : '¡Yo chapo! ¡Uno, dos, tres… ya!', 2.4, false);
    else A.decir(J.arquero.o, '¡Yo atajo! A ver si me meten gol…', 2.4, false);
    pintar();
  }
  function pintar() {
    if (!J) return;
    const s = Math.max(0, Math.ceil(J.t));
    $('#jgTiempo').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    if (J.juego === 'chapadas') {
      $('#jgIzqT').textContent = 'Chapaste'; $('#jgIzq').textContent = J.yo;
      $('#jgDerT').textContent = 'Te chaparon'; $('#jgDer').textContent = J.ellos;
      $('#jgEstado').textContent = J.chapa === 'yo' ? '¡Te toca chapar! Toca a un amigo' : `¡Corre! Chapa ${J.chapa.nombre}`;
    } else {
      $('#jgIzqT').textContent = 'Goles'; $('#jgIzq').textContent = J.yo;
      $('#jgDerT').textContent = `${AMIGOS[1]} atajó`; $('#jgDer').textContent = J.ellos;
      $('#jgEstado').textContent = J.dueno === 'yo' ? '¡Tienes la pelota! Patea al arco o pasa' : 'Ve por la pelota';
    }
  }

  function terminar(cancelado) {
    const j = J;
    if (!j) return;
    J = null;
    $('#jgComo').hidden = true; $('#jgMarcador').hidden = true; $('#jgBotones').hidden = true; $('#jgCartel').hidden = true;
    document.body.classList.remove('en-partido', 'en-recreo');
    $('#lista').classList.remove('oculta-futbol');
    A.bloquear('recreo', false);
    A.enfocar(null); A.ritmo(1);
    teclas.correr = false;
    if (j.marca) j.escena.scene.remove(j.marca);
    if (j.pelotaNueva) { j.escena.scene.remove(j.B.m); }
    if (j.B && j.B.sombra) j.escena.scene.remove(j.B.sombra);
    j.ninos.forEach((k) => {
      k.o.anim = 'quieto';
      if (k.nuevo) { j.escena.scene.remove(k.o.root); const i = j.escena.npcs.indexOf(k.o); if (i >= 0) j.escena.npcs.splice(i, 1); }
    });
    if (cancelado || j.pausa > 100 || A.escena !== j.escena) return;
    // resultado: siempre es bonito jugar con los amigos
    A.S.min += 15;
    const n = j.yo;
    let titulo, detalle;
    if (j.juego === 'chapadas') {
      titulo = n >= 3 ? `¡${gx('Rapidísimo', 'Rapidísima')}!` : j.ellos <= 1 ? '¡Nadie te alcanzaba!' : '¡Qué divertido!';
      detalle = `Chapaste ${n} ${n === 1 ? 'vez' : 'veces'} · te chaparon ${j.ellos}`;
      A.anotar(`Jugaste chapadas con ${quienes()}: chapaste ${n} ${n === 1 ? 'vez' : 'veces'}.`, 'bien');
    } else {
      titulo = n >= 4 ? '¡Goleada!' : n > j.ellos ? '¡Ganaron!' : n === j.ellos ? '¡Empate!' : `¡${AMIGOS[1]} atajó casi todo!`;
      detalle = `Goles: ${n} · ${AMIGOS[1]} atajó ${j.ellos}`;
      A.anotar(`Jugaste fútbol con ${quienes()}: ${n} ${n === 1 ? 'gol' : 'goles'}.`, 'bien');
    }
    A.cambiar({ animo: 10 + Math.min(8, n * 2), energia: -10, motivacion: 5, confianza: 3, salud: 2 });
    A.S.f.jugo = 'si';
    A.habito('Jugar con sus amigos');
    try { const pr = H.progreso.cargar(); H.progreso.guardar({ amistad: Math.min(100, (pr.amistad || 0) + 5 + Math.min(5, n)) }); } catch (e) { /* sin progreso */ }
    A.banner('bien', j.juego === 'chapadas' ? 'Fin de las chapadas' : 'Fin del partido', titulo, detalle);
    A.evento('recreoJuego', { juego: j.juego, fase: 'termina', yo: n, ellos: j.ellos });
    A.sfx('logro');
    const k = j.ninos[0];
    setTimeout(() => { if (A.escena === j.escena) A.decir(k.o, `¡Qué bacán, ${nombre()}! Mañana jugamos otra vez.`, 3, false); }, 1200);
  }

  // ---------- chapadas
  function prepararChapadas() {
    const E = J.escena, P = A.P.root.position;
    P.set(0, 0, 1.0); A.P.root.rotation.y = PI / 2;
    const pos = [[2.4, 0.2], [2.6, 2.4], [3.6, 1.2]];
    J.ninos.forEach((k, i) => { k.o.root.position.set(pos[i][0], 0, pos[i][1]); k.huye = { x: 0, z: 0, t: 0 }; });
    J.chapa = Math.random() < 0.5 ? 'yo' : J.ninos[0];
    J.congelado = 1.2; J.noVale = null; J.persigue = 0; J.objetivo = null;
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 14), A.matB('#de5546'));
    m.rotation.x = PI;
    E.scene.add(m); J.marca = m;
    A.enfocar(null);
  }
  function chapar(nuevo, antes) {
    J.chapa = nuevo; J.noVale = antes; J.congelado = 1.5; J.persigue = 0; J.objetivo = null;
    if (nuevo === 'yo') { J.ellos++; cartel('¡Te chaparon!'); A.sfx('golpe'); A.decir(antes.o, `¡Te chapé, ${nombre()}! ¡Ahora chapas tú!`, 2, false); }
    else if (antes === 'yo') { J.yo++; cartel(`¡Chapaste a ${nuevo.nombre}!`); A.sfx('bien'); A.decir(nuevo.o, ['¡Nooo! ¡Ahora chapo yo!', '¡Uy, me chapaste!', '¡Ya verás, te voy a alcanzar!'][J.yo % 3], 1.8, false); }
    else { A.decir(nuevo.o, '¡Ay! ¡Me chapó!', 1.4, false); A.sfx('click'); }
    pintar();
  }
  function actualizarChapadas(dt) {
    const P = A.P.root.position;
    const yo = { x: P.x, z: P.z };
    if (J.congelado > 0) J.congelado -= dt;
    // la flecha roja sobre quien chapa
    const cab = A.cabezaMundo(J.chapa === 'yo' ? A.P : J.chapa.o);
    J.marca.position.set(cab.x, cab.y + 0.55 + Math.sin(performance.now() / 160) * 0.05, cab.z);
    const pc = J.chapa === 'yo' ? yo : J.chapa.o.root.position;
    // ¿alguien fue chapado?
    if (J.pausa <= 0 && J.congelado <= 0) {
      const todos = [['yo', yo]].concat(J.ninos.map((k) => [k, k.o.root.position]));
      for (const [q, pos] of todos) {
        if (q === J.chapa || q === J.noVale) continue;
        if (dist(pos, pc) < 0.55) { chapar(q, J.chapa); return; }
      }
    }
    if (J.noVale && J.congelado <= -1.0) J.noVale = null;   // ya se vale de nuevo
    // los amigos
    J.ninos.forEach((k) => {
      const q = k.o.root.position;
      if (k === J.chapa) {
        if (J.congelado > 0 || J.pausa > 0) { k.o.anim = 'saludar'; return; }
        // persigue: casi siempre a ti; si tarda mucho, cambia al más cercano
        J.persigue += dt;
        if (!J.objetivo || J.persigue > 9) {
          J.persigue = 0;
          const libres = [['yo', yo]].concat(J.ninos.filter((x) => x !== k).map((x) => [x, x.o.root.position])).filter(([x]) => x !== J.noVale);
          libres.sort((a, b) => dist(a[1], q) - dist(b[1], q));
          J.objetivo = Math.random() < 0.6 && J.noVale !== 'yo' ? 'yo' : (libres[0] || ['yo'])[0];
        }
        const ob = J.objetivo === 'yo' ? yo : J.objetivo.o.root.position;
        moverNino(k, ob.x, ob.z, 2.0, dt);
        return;
      }
      // huye de quien chapa (y de las paredes)
      const d = dist(q, pc);
      let hx = q.x - pc.x, hz = q.z - pc.z;
      const l = Math.hypot(hx, hz) || 1; hx /= l; hz /= l;
      const cx = (CAMPO.x1 + CAMPO.x2) / 2 - q.x, cz = (CAMPO.z1 + CAMPO.z2) / 2 - q.z;
      const cerca = Math.min(q.x - CAMPO.x1, CAMPO.x2 - q.x, q.z - CAMPO.z1, CAMPO.z2 - q.z) < 1.2;
      k.huye.t -= dt;
      if (k.huye.t <= 0) { k.huye.t = 0.8 + Math.random(); k.huye.x = (Math.random() - 0.5) * 0.8; k.huye.z = (Math.random() - 0.5) * 0.8; }
      if (d < 3.2 && J.pausa <= 0) {
        // de lado cuando está contra la pared: así no se queda arrinconado
        let vx = hx + k.huye.x + (cerca ? cx * 0.5 + -hz * 0.8 : 0), vz = hz + k.huye.z + (cerca ? cz * 0.5 + hx * 0.8 : 0);
        const lv = Math.hypot(vx, vz) || 1;
        // si llevas mucho rato chapando sin alcanzar a nadie, se cansan un poquito
        const v = J.chapa === 'yo' ? Math.max(1.05, 1.65 - Math.max(0, J.persigue - 8) * 0.08) : 1.7;
        moverNino(k, q.x + vx / lv, q.z + vz / lv, v, dt);
      } else {
        moverNino(k, q.x + k.huye.x + cx * 0.15, q.z + k.huye.z + cz * 0.15, 0.6, dt, d < 6 ? pc : null);
      }
    });
    if (J.chapa === 'yo') J.persigue += dt;
  }

  // ---------- fútbol
  function prepararFutbol() {
    const E = J.escena, P = A.P.root.position;
    const k = J.ninos;
    J.arquero = k[1];
    J.equipo = k.filter((x) => x !== J.arquero);
    let m = pelotaPatio;
    if (!m) { m = A.bola(E.scene, R, '#ffffff', 1.5, R, 1.2, 1); J.pelotaNueva = true; }
    const sombra = new THREE.Mesh(new THREE.CircleGeometry(R * 1.1, 12), A.matB('#1d2340', 0.25));
    sombra.rotation.x = -PI / 2; E.scene.add(sombra);
    J.B = { m, sombra, x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0 };
    J.arqZ = CENTRO; J.tiene = 0; J.libre = 0; J.pensar = 0; J.dueno = null; J.ultimo = null;
    J.arquero.o.root.position.set(ARCO.x - 0.35, 0, CENTRO);
    sacar();
    A.enfocar(() => ({ x: 3.6 + (J && J.B ? (J.B.x - 3.6) * 0.2 : 0), z: 1.0, peso: 0.75 }));
    void P;
  }
  function sacar() {
    const P = A.P.root.position;
    P.set(0.6, 0, CENTRO); A.P.root.rotation.y = PI / 2;
    J.equipo.forEach((k, i) => { k.o.root.position.set(1.8, 0, i ? -0.3 : 2.8); k.o.root.rotation.y = PI / 2; });
    const B = J.B; B.y = 0; B.vx = B.vz = B.vy = 0;
    J.dueno = 'yo'; J.ultimo = 'yo'; pegar(P, A.P.root.rotation.y, 0.4);
  }
  function pegar(q, ry, r) {
    const B = J.B, nx = q.x + Math.sin(ry) * r, nz = q.z + Math.cos(ry) * r;
    B.vx = (nx - B.x) * 30; B.vz = (nz - B.z) * 30;
    B.x = nx; B.z = nz; B.y = 0; B.vy = 0;
  }
  function soltar(quien) { J.dueno = null; J.ultimo = quien; J.libre = 0.35; }
  function tiroAlArco(x, z, v, alto) {
    const libreZ = J.arqZ < CENTRO ? ARCO.z2 - 0.35 : ARCO.z1 + 0.35;
    const gx_ = ARCO.x + 0.3 - x, gz = libreZ + (Math.random() - 0.5) * 0.3 - z, l = Math.hypot(gx_, gz);
    J.B.vx = gx_ / l * v; J.B.vz = gz / l * v; J.B.vy = alto;
  }
  function lanzar(tx, tz, alto) {
    const B = J.B, dx = tx - B.x, dz = tz - B.z, d = Math.hypot(dx, dz) || 1;
    if (alto) { const t = Math.max(0.7, d / 4.2); B.vx = dx / t; B.vz = dz / t; B.vy = (0.6 + G * t * t / 2) / t; }
    else { const v = Math.max(3.5, Math.min(7, d * 1.8 + 1.5)); B.vx = dx / d * v; B.vz = dz / d * v; B.vy = 0.3; }
  }
  function animar(o, a) { o.anim = a; o.t = 0; setTimeout(() => { if (o.anim === a) o.anim = 'quieto'; }, 380); }
  function patear() {
    if (!J || J.juego !== 'futbol' || J.pausa > 0 || J.tiene > 0) return;
    const B = J.B, P = A.P.root.position;
    const d = Math.hypot(B.x - P.x, B.z - P.z);
    animar(A.P, 'patear');
    if (!(J.dueno === 'yo' || (J.dueno === null && d < 0.9 && B.y < 0.5))) return;
    const ry = A.P.root.rotation.y, dx = Math.sin(ry), dz = Math.cos(ry);
    const v = 7 + (teclas.correr || A.corriendo ? 1 : 0);
    if (dx > 0.25) tiroAlArco(B.x, B.z, v, 1.1);
    else { B.vx = dx * v; B.vz = dz * v; B.vy = 1.0; }
    soltar('yo');
    A.sfx('golpe');
  }
  function pasar() {
    if (!J || J.juego !== 'futbol' || J.pausa > 0 || J.dueno !== 'yo') return;
    const P = A.P.root.position;
    const k = J.equipo.slice().sort((a, b) => (b.o.root.position.x - a.o.root.position.x))[0];
    if (!k) return;
    const q = k.o.root.position;
    lanzar(q.x + 0.3, q.z, false);
    soltar('yo'); J.para = k;
    animar(A.P, 'patear');
    A.decir(k.o, '¡Pásala!', 1, false);
    A.sfx('click');
    void P;
  }
  function moverPelota(dt) {
    const B = J.B, P = A.P.root.position;
    if (J.tiene > 0) { const t = J.arquero.o.root.position; B.x = t.x - 0.28; B.z = t.z; B.y = 0.55; B.vx = B.vz = B.vy = 0; }
    else if (J.dueno === 'yo') pegar(P, A.P.root.rotation.y, 0.4);
    else if (J.dueno && J.dueno.o) pegar(J.dueno.o.root.position, J.dueno.o.root.rotation.y, 0.38);
    else {
      B.x += B.vx * dt; B.z += B.vz * dt;
      B.vy -= G * dt; B.y += B.vy * dt;
      if (B.y <= 0) { B.y = 0; B.vy = Math.abs(B.vy) > 1.2 ? -B.vy * 0.45 : 0; }
      const f = Math.exp((B.y > 0 ? -0.15 : -1.2) * dt);
      B.vx *= f; B.vz *= f;
      if (J.pausa <= 0 && J.libre <= 0 && B.y < 0.4) {
        if (dist(B, P) < 0.5) { J.dueno = 'yo'; J.ultimo = 'yo'; J.para = null; }
        else { const k = J.equipo.find((x) => dist(B, x.o.root.position) < 0.45); if (k) { J.dueno = k; J.ultimo = k; J.para = null; J.pensar = 0.4; } }
      }
    }
    // ¿gol?
    if (J.pausa <= 0 && B.x > ARCO.x + 0.05 && B.z > ARCO.z1 + 0.05 && B.z < ARCO.z2 - 0.05 && B.y < ARCO.alto) { gol(); }
    const enArco = B.z > ARCO.z1 && B.z < ARCO.z2 && B.y < ARCO.alto;
    const xMax = enArco ? ARCO.x + 0.35 : CAMPO.x2;
    if (B.x > xMax) { B.x = xMax; B.vx = -Math.abs(B.vx) * 0.5; }
    if (B.x < CAMPO.x1) { B.x = CAMPO.x1; B.vx = Math.abs(B.vx) * 0.6; }
    if (B.z < CAMPO.z1) { B.z = CAMPO.z1; B.vz = Math.abs(B.vz) * 0.6; }
    if (B.z > CAMPO.z2) { B.z = CAMPO.z2; B.vz = -Math.abs(B.vz) * 0.6; }
    B.m.position.set(B.x, R + B.y, B.z);
    B.sombra.position.set(B.x, 0.012, B.z);
    if (Math.hypot(B.vx, B.vz) > 0.01) { B.m.rotation.z -= B.vx * dt / R; B.m.rotation.x += B.vz * dt / R; }
  }
  function gol() {
    J.yo++;
    J.pausa = 1.8; J.dueno = null;
    const quien = J.ultimo && J.ultimo.nombre;
    cartel(quien ? `¡Gol de ${quien}!` : '¡GOOOL!');
    A.sfx('logro'); A.flash('bien');
    for (let i = 0; i < 22; i++) A.emitir(new THREE.Vector3(ARCO.x, 0.6 + Math.random() * 0.5, ARCO.z1 + Math.random() * 2), ['#ffd23f', '#de5546', '#3d9bd4', '#2aa876'][i % 4], new THREE.Vector3(-1 - Math.random() * 2, 2 + Math.random() * 2, (Math.random() - 0.5) * 3), 1.2, 0.05, 4);
    A.decir(J.arquero.o, ['¡Nooo!', '¡Qué golazo!', 'La próxima la atajo…', '¡Uy, no la vi!'][J.yo % 4], 1.6, false);
    const j = J;
    setTimeout(() => { if (J === j) sacar(); }, 1300);
    pintar();
  }
  function actualizarArquero(dt) {
    const a = J.arquero, q = a.o.root.position, B = J.B;
    a.o.root.rotation.y = -PI / 2;
    if (J.tiene > 0) {
      J.tiene -= dt; a.o.anim = 'entregar';
      if (J.tiene <= 0) {
        const P = A.P.root.position, aTi = Math.random() < 0.6;
        const k = J.equipo[Math.floor(Math.random() * J.equipo.length)];
        const ob = aTi || !k ? P : k.o.root.position;
        lanzar(ob.x, ob.z, true);
        J.dueno = null; J.ultimo = null; J.libre = 0.4;
        animar(a.o, 'saludar');
        A.decir(a.o, aTi ? `¡Ahí va, ${nombre()}!` : '¡Saque!', 1.3, false);
        A.sfx('sube');
      }
      return;
    }
    const objZ = B.x > 1.5 ? Math.max(ARCO.z1 + 0.3, Math.min(ARCO.z2 - 0.3, B.z)) : CENTRO;
    const v = 1.1;
    J.arqZ += Math.max(-v * dt, Math.min(v * dt, objZ - J.arqZ));
    q.z = J.arqZ; q.x = ARCO.x - 0.35;
    a.o.anim = Math.abs(objZ - J.arqZ) > 0.05 ? 'caminar' : 'quieto'; a.o.vel = 1.5;
    if (J.pausa <= 0 && !J.dueno && B.vx > 0.3 && B.y < 1.3 && Math.hypot(B.x - q.x, B.z - q.z) < 0.42) {
      const tiro = Math.hypot(B.vx, B.vz) > 2.5;
      if (tiro && Math.random() < 0.55) {
        J.ellos++; J.tiene = 1.3; B.vx = B.vz = B.vy = 0;
        A.decir(a.o, ['¡Atajada!', '¡Mía!', '¡No pasa!'][J.ellos % 3], 1.3, false); A.sfx('golpe');
        pintar();
      } else if (tiro) {
        // la toca pero se le escapa un poquito
        B.vx *= 0.8; B.vz += (Math.random() - 0.5) * 2;
        J.libre = 0.2;
      } else { J.tiene = 1.0; B.vx = B.vz = B.vy = 0; }
    }
  }
  function actualizarEquipo(dt) {
    const B = J.B, P = A.P.root.position;
    J.equipo.forEach((k, i) => {
      const q = k.o.root.position;
      if (J.dueno === k) {
        if (J.pensar > 0) J.pensar -= dt;
        if (J.pensar <= 0 && J.pausa <= 0) {
          if (q.x > 3.4 && Math.random() < 0.6) { tiroAlArco(B.x, B.z, 6.5, 1.0); soltar(k); animar(k.o, 'patear'); A.sfx('golpe'); return; }
          if (P.x > q.x + 0.4 && dist(P, q) > 1.4 && Math.random() < 0.5) {
            lanzar(P.x + Math.sin(A.P.root.rotation.y) * 0.4, P.z + Math.cos(A.P.root.rotation.y) * 0.4, false);
            soltar(k); J.para = 'yo'; animar(k.o, 'patear');
            A.decir(k.o, `¡Toma, ${nombre()}!`, 1.2, false); A.sfx('click');
            return;
          }
          if (q.x > 4.4) { tiroAlArco(B.x, B.z, 6.5, 1.0); soltar(k); animar(k.o, 'patear'); A.sfx('golpe'); return; }
          J.pensar = 0.5;
        }
        moverNino(k, Math.min(4.6, q.x + 1), q.z + (CENTRO - q.z) * 0.4, 1.8, dt, { x: ARCO.x, z: CENTRO });
        return;
      }
      if (J.tiene > 0) { moverNino(k, 2.2, i ? -0.2 : 2.6, 1.5, dt, B); return; }
      if (J.dueno === 'yo') {
        // se abre para recibir el pase
        moverNino(k, Math.min(4.0, P.x + 1.6), i ? Math.min(P.z - 1.2, 0.2) : Math.max(P.z + 1.2, 2.2), 2.0, dt, B);
        return;
      }
      // pelota suelta: va el más cercano del equipo (si tú estás más cerca, se aparta)
      const masCerca = J.equipo.slice().sort((a, b) => dist(a.o.root.position, B) - dist(b.o.root.position, B))[0];
      const voy = J.para === k || (J.para !== 'yo' && masCerca === k && dist(B, q) < dist(B, P) + 0.2);
      if (voy) moverNino(k, B.x - 0.2, B.z, 2.2, dt);
      else moverNino(k, Math.min(4.0, B.x + 1.4), i ? B.z - 1.4 : B.z + 1.4, 1.6, dt, B);
    });
  }
  function actualizarFutbol(dt) {
    if (J.libre > 0) J.libre -= dt;
    // la pelota se atoró en una esquina: el arquero la saca
    const B = J.B;
    if (!J.dueno && J.tiene <= 0 && Math.hypot(B.vx, B.vz) < 0.3 && B.y < 0.05 && dist(B, A.P.root.position) > 1) {
      J.atascada = (J.atascada || 0) + dt;
      if (J.atascada > 4) { J.atascada = 0; lanzar(1.5, CENTRO, true); J.libre = 0.4; A.decir(J.arquero.o, '¡Ahí va la pelota!', 1.4, false); }
    } else J.atascada = 0;
    actualizarArquero(dt);
    actualizarEquipo(dt);
    moverPelota(dt);
    pintar();
  }

  A.alTecla((e) => {
    if (!J) return false;
    if (!$('#jgComo').hidden) { if (/^(Space|Enter|KeyE)$/.test(e.code)) arrancar(); return true; }
    if (/^(Space|KeyE|Enter)$/.test(e.code)) { if (!e.repeat) patear(); return true; }
    if (/^(KeyQ|KeyP)$/.test(e.code)) { if (!e.repeat) pasar(); return true; }
    if (/^(KeyZ|KeyJ|KeyX|KeyC|KeyF|KeyG)$/.test(e.code)) return true;
    return false;
  });
  A.alActualizar((dt) => {
    if (!J || J.pausa > 100) return;
    if (A.escena !== J.escena) { terminar(true); return; }
    if (J.pausa > 0) J.pausa -= dt;
    J.t -= dt;
    // correr con el botón (con Shift ya corre el motor)
    A.ritmo(teclas.correr && !A.corriendo && A.S.energia > 5 ? 1.7 : 1);
    if (teclas.correr || A.corriendo) A.S.energia = Math.max(0, A.S.energia - dt * 0.1);
    if (J.juego === 'chapadas') actualizarChapadas(dt); else actualizarFutbol(dt);
    if (J && J.t <= 0) { terminar(false); return; }
    if (J && J.juego === 'chapadas') pintar();
  });

  // ======================================================================= PS5
  let interPS5 = null;
  const temprano = () => A.S.fase === 'manana' && (() => { try { return A.diaDeHoy().colegio; } catch (e) { return true; } })();
  function ponerPS5(E) {
    const i = E.inters.findIndex((it) => it.nombre === 'PS5');
    const viejo = i >= 0 ? E.inters[i] : null;
    interPS5 = A.etiquetaInter('PS5', viejo ? viejo.en.slice() : [-1.4, 0.3], viejo ? viejo.mira.slice() : [-1.4, -3.2], 1.0, {
      activo: () => !K5,
      abrir: () => {
        // el jueves del apagón (dia4.js) no hay luz: la PS5 no prende
        if (A.S.f.d4Apagon === 'si') return { titulo: 'La PS5', texto: 'No prende: no hay luz. La pantalla está negra.', opciones: [] };
        const tareaPend = A.S.fase === 'tarde' && !A.S.f.tareaTarde;
        const t = temprano();
        return {
          titulo: 'La PS5', texto: t ? 'Está ahí, apagada. "Solo una partida…", piensas. Pero el bus no espera.'
            : tareaPend ? 'Todavía no haces la tarea… "Solo una partida", piensas.' : 'Un rato de juego después de cumplir.',
          opciones: [{
            texto: 'Jugar "Estrellas del espacio"', nota: t ? 'Te diviertes, pero se te va el tiempo de la mañana.' : tareaPend ? 'La tarea sigue esperando.' : 'Te lo ganaste.',
            min: 0, ef: {}, esfuerzo: false,
            pasos: [{ ruta: [[-1.4, 0.3], [-1.4, 0.95]], mira: [-1.4, -3.2], anim: 'esperar', sentado: true, dur: 1.0, min: 0, progreso: 'Prendiendo la PS5' }],
            alTerminar: () => abrirPS5({ temprano: t, tareaPend }),
          }],
        };
      },
    });
    if (i >= 0) E.inters[i] = interPS5; else E.inters.push(interPS5);
  }

  document.body.insertAdjacentHTML('beforeend', `
<div class="ps5" id="ps5" hidden role="dialog" aria-label="Minijuego en la PS5">
  <canvas id="ps5Lienzo"></canvas>
  <div class="ps5-hud"><span id="ps5Pts">★ 0</span><span id="ps5Vidas">♥♥♥</span><span id="ps5Tiempo">1:00</span></div>
  <button type="button" class="ps5-salir" id="ps5Salir">Apagar</button>
  <div class="ps5-pad">
    <button type="button" class="ps5-b" data-d="-1" aria-label="Izquierda">◀</button>
    <button type="button" class="ps5-b ps5-escudo" data-d="escudo">Escudo<small>Espacio</small></button>
    <button type="button" class="ps5-b" data-d="1" aria-label="Derecha">▶</button>
  </div>
  <div class="ps5-fin" id="ps5Fin" hidden>
    <p class="eyebrow">Estrellas del espacio</p>
    <h2 id="ps5FinTit"></h2>
    <p id="ps5FinTxt"></p>
    <button class="btn" type="button" id="ps5Volver">Apagar la PS5</button>
  </div>
  <div class="ps5-fin ps5-inicio" id="ps5Inicio" hidden>
    <p class="eyebrow">PS5</p>
    <h2>Estrellas del espacio</h2>
    <p id="ps5InicioTxt"></p>
    <button class="btn" type="button" id="ps5Empezar">¡Jugar!</button>
  </div>
</div>`);
  const cv = $('#ps5Lienzo'), cx = cv.getContext('2d');
  let K5 = null;   // partida en curso
  const pad = { izq: false, der: false, dedo: null, dedoX: null };

  function abrirPS5(o) {
    if (K5) return;
    K5 = { o: o || {}, t: DUR.ps5, pts: 0, vidas: 3, x: 0.5, cosas: [], nace: 0.6, escudo: 0, recarga: 0, fin: false, golpe: 0, empezo: false, estrellasFondo: [] };
    for (let i = 0; i < 50; i++) K5.estrellasFondo.push({ x: Math.random(), y: Math.random(), v: 0.03 + Math.random() * 0.08 });
    A.bloquear('ps5', true);
    $('#ps5').hidden = false; $('#ps5Fin').hidden = true;
    $('#ps5InicioTxt').innerHTML = A.tactil
      ? 'Toca ◀ ▶ (o arrastra el dedo) para mover la nave. Atrapa las estrellas ★ y esquiva los meteoritos. Escudo te protege un ratito.'
      : `Mueve la nave con ${tecla('Flechas')}. Atrapa las estrellas ★ y esquiva los meteoritos. ${tecla('Espacio')} pone el escudo un ratito.`;
    $('#ps5Inicio').hidden = false;
    $('#ps5Empezar').focus();
    medir();
    A.evento('ps5', { fase: 'abre' });
  }
  function empezarPS5() { if (!K5 || K5.empezo) return; K5.empezo = true; $('#ps5Inicio').hidden = true; A.sfx('alarma'); }
  function medir() { const r = window.devicePixelRatio || 1; cv.width = Math.round(innerWidth * r); cv.height = Math.round(innerHeight * r); }
  window.addEventListener('resize', () => { if (K5) medir(); });
  function finPS5(motivo) {
    if (!K5 || K5.fin) return;
    K5.fin = true;
    const n = K5.pts;
    $('#ps5FinTit').textContent = motivo === 'vidas' ? '¡Se acabaron las vidas!' : motivo === 'salir' ? 'Apagaste la PS5' : n >= 25 ? `¡${gx('Campeón', 'Campeona')} del espacio!` : '¡Se acabó el tiempo!';
    $('#ps5FinTxt').textContent = `Atrapaste ${n} ${n === 1 ? 'estrella' : 'estrellas'}.` + (K5.o.temprano ? ' Uy… se te fue el tiempo de la mañana.' : K5.o.tareaPend ? ' La tarea sigue esperando.' : '');
    $('#ps5Fin').hidden = false; $('#ps5Inicio').hidden = true;
    $('#ps5Volver').focus();
    A.sfx(n ? 'logro' : 'final');
  }
  function cerrarPS5() {
    const k = K5;
    if (!k) return;
    K5 = null;
    $('#ps5').hidden = true;
    pad.izq = pad.der = false;
    A.bloquear('ps5', false);
    if (!k.empezo) return;   // se apagó antes de jugar: no pasa nada
    const mal = k.o.temprano || k.o.tareaPend;
    A.S.min += 20;
    A.cambiar({ animo: 10 + Math.min(6, Math.floor(k.pts / 5)), motivacion: mal ? -8 : 2, energia: -3 });
    if (k.o.temprano) A.malHabito('Videojuegos antes del colegio');
    else if (k.o.tareaPend) { A.malHabito('Jugar antes de la tarea'); A.S.f.ps5SinTarea = true; }   // mamá no viene a regañar: lo conversan en la noche
    A.anotar(`Jugaste PS5: atrapaste ${k.pts} ${k.pts === 1 ? 'estrella' : 'estrellas'}.`, mal ? 'mal' : '');
    A.evento('ps5', { fase: 'termina', estrellas: k.pts });
  }
  $('#ps5Empezar').addEventListener('click', empezarPS5);
  $('#ps5Volver').addEventListener('click', cerrarPS5);
  $('#ps5Salir').addEventListener('click', () => { if (K5 && !K5.empezo) cerrarPS5(); else finPS5('salir'); });
  const pad5 = document.querySelector('.ps5-pad');
  pad5.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-d]');
    if (!b || !K5) return;
    e.preventDefault();
    if (b.dataset.d === 'escudo') { escudo(); return; }
    if (b.dataset.d === '-1') pad.izq = true; else pad.der = true;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => pad5.addEventListener(ev, (e) => {
    const b = e.target.closest('[data-d]');
    if (!b) { pad.izq = pad.der = false; return; }
    if (b.dataset.d === '-1') pad.izq = false; if (b.dataset.d === '1') pad.der = false;
  }));
  // arrastrar el dedo (o el mouse) sobre la tele lleva la nave
  cv.addEventListener('pointerdown', (e) => { if (!K5) return; pad.dedo = e.pointerId; pad.dedoX = e.clientX / innerWidth; });
  cv.addEventListener('pointermove', (e) => { if (K5 && e.pointerId === pad.dedo) pad.dedoX = e.clientX / innerWidth; });
  ['pointerup', 'pointercancel'].forEach((ev) => cv.addEventListener(ev, (e) => { if (e.pointerId === pad.dedo) { pad.dedo = null; pad.dedoX = null; } }));
  const K5teclas = {};
  window.addEventListener('keyup', (e) => { K5teclas[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in K5teclas) K5teclas[k] = false; });
  function escudo() { if (!K5 || !K5.empezo || K5.fin || K5.recarga > 0) return; K5.escudo = 2.2; K5.recarga = 7; A.sfx('sube'); }
  A.alTecla((e) => {
    if (!K5) return false;
    K5teclas[e.code] = true;
    if (!K5.empezo && /^(Space|Enter|KeyE)$/.test(e.code) && !e.repeat) { empezarPS5(); return true; }
    if (K5.fin && /^(Space|Enter|KeyE|Escape)$/.test(e.code) && !e.repeat) { cerrarPS5(); return true; }
    if (/^(Space|KeyE)$/.test(e.code) && !e.repeat) escudo();
    return true;   // con la PS5 prendida, las teclas son del minijuego
  });

  A.alActualizar((dt) => {
    if (!K5) return;
    const k = K5;
    if (k.empezo && !k.fin) {
      k.t -= dt;
      if (k.t <= 0) { k.t = 0; finPS5('tiempo'); }
      // mover la nave
      const izq = pad.izq || K5teclas.ArrowLeft || K5teclas.KeyA, der = pad.der || K5teclas.ArrowRight || K5teclas.KeyD;
      if (pad.dedoX != null) k.x += Math.max(-1.1 * dt, Math.min(1.1 * dt, pad.dedoX - k.x));
      else k.x += ((der ? 1 : 0) - (izq ? 1 : 0)) * 0.75 * dt;
      k.x = Math.max(0.05, Math.min(0.95, k.x));
      if (k.escudo > 0) k.escudo -= dt;
      if (k.recarga > 0) k.recarga -= dt;
      if (k.golpe > 0) k.golpe -= dt;
      // aparecen estrellas y meteoritos; cada vez más rápido
      const prog = 1 - k.t / DUR.ps5;
      k.nace -= dt;
      if (k.nace <= 0) {
        k.nace = 0.55 - prog * 0.25 + Math.random() * 0.25;
        const meteoro = Math.random() < 0.38 + prog * 0.15;
        k.cosas.push({ x: 0.06 + Math.random() * 0.88, y: -0.05, v: (meteoro ? 0.28 : 0.24) + prog * 0.22 + Math.random() * 0.08, tipo: meteoro ? 'meteoro' : 'estrella', r: meteoro ? 0.035 + Math.random() * 0.02 : 0.03, giro: Math.random() * 6 });
      }
      const ny = 0.86;
      k.cosas.forEach((c) => {
        c.y += c.v * dt; c.giro += dt * 2;
        if (c.toco) return;
        if (Math.abs(c.y - ny) < 0.05 && Math.abs(c.x - k.x) < 0.06 + c.r) {
          c.toco = true;
          if (c.tipo === 'estrella') { k.pts++; A.sfx('click'); }
          else if (k.escudo > 0) { A.sfx('golpe'); }
          else if (k.golpe <= 0) { k.vidas--; k.golpe = 1.2; A.sfx('golpe'); if (k.vidas <= 0) finPS5('vidas'); }
        }
      });
      k.cosas = k.cosas.filter((c) => c.y < 1.1 && !(c.toco && c.tipo === 'estrella'));
    }
    k.estrellasFondo.forEach((s) => { s.y += s.v * dt; if (s.y > 1) { s.y = 0; s.x = Math.random(); } });
    dibujarPS5();
  });

  function dibujarPS5() {
    const k = K5, W = cv.width, Hh = cv.height, u = Math.min(W, Hh);
    const g = cx;
    const fondo = g.createLinearGradient(0, 0, 0, Hh);
    fondo.addColorStop(0, '#0d1030'); fondo.addColorStop(1, '#2a1f5c');
    g.fillStyle = fondo; g.fillRect(0, 0, W, Hh);
    g.fillStyle = 'rgba(255,255,255,.7)';
    k.estrellasFondo.forEach((s) => g.fillRect(s.x * W, s.y * Hh, u * 0.004, u * 0.004));
    // estrellas y meteoritos
    k.cosas.forEach((c) => {
      const x = c.x * W, y = c.y * Hh, r = c.r * u;
      g.save(); g.translate(x, y); g.rotate(c.giro);
      if (c.tipo === 'estrella') {
        g.fillStyle = '#ffd23f'; g.strokeStyle = '#fff7ec'; g.lineWidth = u * 0.004;
        g.beginPath();
        for (let i = 0; i < 10; i++) { const a = i * PI / 5 - PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        g.closePath(); g.fill(); g.stroke();
      } else {
        g.globalAlpha = c.toco ? 0.35 : 1;
        g.fillStyle = '#8a5a3b'; g.beginPath(); g.arc(0, 0, r, 0, PI * 2); g.fill();
        g.fillStyle = '#5b4636'; g.beginPath(); g.arc(r * 0.3, -r * 0.2, r * 0.3, 0, PI * 2); g.arc(-r * 0.35, r * 0.3, r * 0.2, 0, PI * 2); g.fill();
      }
      g.restore();
    });
    // la nave
    const nx = k.x * W, ny = 0.86 * Hh, s = u * 0.05;
    if (!(k.golpe > 0 && Math.floor(k.golpe * 10) % 2)) {
      g.fillStyle = '#f4f1ea'; g.strokeStyle = '#1d2340'; g.lineWidth = u * 0.005;
      g.beginPath(); g.moveTo(nx, ny - s); g.lineTo(nx + s * 0.7, ny + s * 0.7); g.lineTo(nx - s * 0.7, ny + s * 0.7); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#3d9bd4'; g.beginPath(); g.arc(nx, ny, s * 0.25, 0, PI * 2); g.fill();
      g.fillStyle = Math.random() < 0.5 ? '#f2a623' : '#de5546';
      g.beginPath(); g.moveTo(nx - s * 0.3, ny + s * 0.75); g.lineTo(nx, ny + s * (1.1 + Math.random() * 0.3)); g.lineTo(nx + s * 0.3, ny + s * 0.75); g.fill();
    }
    if (k.escudo > 0) { g.strokeStyle = 'rgba(124,198,242,.85)'; g.lineWidth = u * 0.008; g.beginPath(); g.arc(nx, ny, s * 1.3, 0, PI * 2); g.stroke(); }
    $('#ps5Pts').textContent = `★ ${k.pts}`;
    $('#ps5Vidas').textContent = '♥'.repeat(Math.max(0, k.vidas)) + '♡'.repeat(3 - Math.max(0, k.vidas));
    const t = Math.ceil(k.t);
    $('#ps5Tiempo').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    document.querySelector('.ps5-escudo').classList.toggle('carga', k.recarga > 0);
  }

  // ---------- para las pruebas y otros módulos
  H.juegos = {
    DUR,
    recreo: { empezar, arrancar, terminar: () => terminar(false), get juego() { return J; }, panel: panelAmigos },
    ps5: { abrir: abrirPS5, empezar: empezarPS5, fin: finPS5, cerrar: cerrarPS5, get partida() { return K5; } },
  };
})();
