/* Día 4 (jueves): día de lluvia y apagón.
   - Llueve todo el día (A.forzarClima('lluvia')): en el jardín caen gotas, la cancha está hecha un charco
     y la cachorrita no quiere salir (se queda en la puerta).
   - De 19:30 a 20:30 se va la luz: la casa queda oscura, truena, la tablet y la PS5 no funcionan.
     Mamá trae una linterna y prende velas en la sala. En familia: contar cuentos, hacer sombras con la
     linterna, abrazar a la cachorrita que tiene miedo de los truenos. Cuando vuelve la luz, todo sigue normal.
   - Vida libre: nada es obligatorio. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.motor.nino || !H.progreso) return;
  const A = H.motor.api;
  const { THREE, PI } = A;
  const h = (hh, mm) => hh * 60 + (mm || 0);
  const INICIO = h(19, 30), FIN = h(20, 30);

  const hoy = () => H.progreso.cargar().dia === 4;
  const nom = () => (A.perfil && A.perfil.mascota ? A.perfil.mascota.nombre : 'Molly');
  const gx = (o, a) => (A.perfil && A.perfil.genero === 'nina' ? a : o);
  const llueve = () => hoy() && (A.llueve !== undefined ? A.llueve : true);
  const apagon = () => A.S.f.d4Apagon === 'si';

  // lluvia todo el día (el motor ajusta luz, ventanas, recreo y ánimo)
  if (hoy() && A.forzarClima) A.forzarClima('lluvia');

  // ---------- velo oscuro, relámpago y trueno
  let velo = null;
  function crearVelo() {
    if (velo) return velo;
    velo = document.createElement('div');
    velo.id = 'd4Velo';
    velo.className = 'd4-velo';
    velo.hidden = true;
    const c = document.querySelector('#juego');
    if (c && c.parentNode) c.parentNode.insertBefore(velo, c.nextSibling); else document.body.appendChild(velo);
    return velo;
  }
  let audio = null;
  function trueno() {
    A.sfx('golpe');
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio = audio || new AC();
      const t = audio.currentTime + 0.05, dur = 2.2;
      const buf = audio.createBuffer(1, Math.floor(audio.sampleRate * dur), audio.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
      const s = audio.createBufferSource(); s.buffer = buf;
      const f = audio.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180;
      const g = audio.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(audio.destination);
      s.start(t);
    } catch (e) { /* sin sonido */ }
  }
  let rayo = 0;
  function relampago() {
    rayo = 0.35;
    setTimeout(trueno, 500);
    const D = H.perro && H.perro.D;
    if (D) { D.salto = 0.3; D.anim = 'quieto'; }
  }

  // ---------- luces del apagón: linterna en la mano y velas en la sala
  const L = { linterna: null, luzMano: null, velas: [], familia: [], sombra: null, escena: null };
  function ponerLinterna() {
    if (L.linterna || !A.S.f.d4Linterna || !A.escena) return;
    const g = new THREE.Group();
    A.cil(g, 0.035, 0.035, 0.2, '#de5546', 0, 0, 0.08, { rx: PI / 2, sombra: false });
    A.cil(g, 0.05, 0.04, 0.05, '#f2c14e', 0, 0, 0.19, { rx: PI / 2, sombra: false });
    A.P.brazos[0].add(g);
    L.linterna = g;
    const luz = new THREE.PointLight('#fff1c9', 1.1, 5.5, 1.6);
    A.escena.scene.add(luz);
    L.luzMano = luz;
  }
  function quitarLuces() {
    if (L.linterna) { A.P.brazos[0].remove(L.linterna); L.linterna = null; }
    if (L.luzMano && L.luzMano.parent) L.luzMano.parent.remove(L.luzMano);
    L.luzMano = null;
    L.velas.forEach((v) => v.parent && v.parent.remove(v));
    L.velas = [];
    quitarSombra();
  }
  function velas(E, puntos) {
    puntos.forEach(([x, y, z]) => {
      const g = new THREE.Group();
      A.cil(g, 0.045, 0.045, 0.16, '#f4efe4', 0, 0.08, 0, { sombra: false });
      const llama = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 1), A.matB('#ffb627'));
      llama.position.set(0, 0.19, 0); llama.scale.set(0.8, 1.4, 0.8); g.add(llama);
      g.position.set(x, y, z);
      const luz = new THREE.PointLight('#ffb36b', 0.9, 4.5, 1.8);
      luz.position.set(x, y + 0.35, z);
      E.scene.add(g, luz);
      L.velas.push(g, luz);
    });
  }

  // ---------- papá y mamá en la sala durante el apagón
  function familiaEnSala(E) {
    [['mama', -2.55], ['papa', -0.3]].forEach(([q, x]) => {
      const P = q === 'mama' ? A.crearMama() : A.crearPapa();
      P.voz = q;
      P.root.position.set(x, 0, 0.95);
      P.root.rotation.y = PI;
      P.anim = 'quieto'; P.sentado = true;
      E.scene.add(P.root); E.npcs.push(P);
      L.familia.push(P);
    });
  }
  function quitarFamilia() {
    const E = A.escena;
    L.familia.forEach((P) => { if (E) { E.scene.remove(P.root); const i = E.npcs.indexOf(P); if (i >= 0) E.npcs.splice(i, 1); } });
    L.familia = [];
  }

  // ---------- sombras chinescas en la pared de la sala
  function mostrarSombra() {
    const E = A.escena;
    if (!E || E.nombre !== 'sala') return;
    quitarSombra();
    const g = new THREE.Group();
    const luz = new THREE.Mesh(new THREE.CircleGeometry(0.8, 28), A.matB('#fff3c4', 0.85));
    g.add(luz);
    const negro = A.matB('#241c2e', 0.92);
    // un conejito: cabeza, orejas y hocico
    const cab = new THREE.Mesh(new THREE.CircleGeometry(0.22, 20), negro); cab.position.set(0, -0.12, 0.01); g.add(cab);
    [-0.09, 0.09].forEach((x, i) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.36), negro); o.position.set(x, 0.2, 0.01); o.rotation.z = i ? -0.25 : 0.25; g.add(o); });
    const brazo = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.5), negro); brazo.position.set(0.05, -0.5, 0.01); g.add(brazo);
    g.position.set(2.0, 1.55, -E.d / 2 + 0.03);
    E.scene.add(g);
    L.sombra = { g, orejas: g.children.slice(2, 4), t: 0 };
  }
  function quitarSombra() {
    if (L.sombra && L.sombra.g.parent) L.sombra.g.parent.remove(L.sombra.g);
    L.sombra = null;
  }

  // ---------- envolver paneles del motor y de otros módulos
  function envolver(E) {
    if (!E || E.d4 || !hoy()) return;
    E.d4 = true;
    E.inters.forEach((it) => {
      if (it.d4 || !it.abrir) return;
      const orig = it.abrir;
      if (E.nombre === 'sala' && (it.nombre === 'PS5' || it.nombre === 'Tablet')) {
        it.d4 = true;
        it.abrir = (...a) => (apagon() ? {
          titulo: it.nombre === 'PS5' ? 'La PS5' : 'La tablet',
          texto: it.nombre === 'PS5' ? 'No prende: no hay luz. La pantalla está negra.' : 'Se quedó sin batería y no hay luz para cargarla.',
          opciones: [],
        } : orig(...a));
      } else if (E.nombre === 'jardin' && it.nombre === 'Pelota') {
        it.d4 = true;
        it.abrir = (...a) => (llueve() ? {
          titulo: 'La pelota', texto: 'Llueve fuerte y la cancha está hecha un charco. Tito no vino a jugar.',
          opciones: [{
            texto: 'Patear un ratito bajo la lluvia', nota: 'Es divertido… pero terminas lleno de barro.', min: 10, ef: { animo: 6, energia: -6 }, anim: 'patear', dur: 2.5, esfuerzo: false, progreso: 'Chapoteando con la pelota',
            alTerminar: () => {
              A.S.f.d4Barro = true;
              A.avisar(`¡Quedaste ${gx('embarrado', 'embarrada')} de pies a cabeza! Mejor sécate adentro.`);
              A.anotar('Pateaste la pelota bajo la lluvia y te llenaste de barro.', '');
            },
          }],
        } : orig(...a));
      } else if (it.nombre === nom()) {
        // el menú de la cachorrita: con lluvia no quiere ir al jardín ni correr afuera
        it.d4 = true;
        it.abrir = (...a) => {
          const def = orig(...a);
          if (!llueve() || !def || !def.opciones) return def;
          const fuera = /Tito|palo|jardín/i;
          const antes = def.opciones.length;
          def.opciones = def.opciones.filter((o) => !fuera.test(o.texto || ''));
          if (def.opciones.length < antes) def.texto = `${def.texto || ''} Afuera llueve: ${nom()} no quiere mojarse.`.trim();
          return def;
        };
      }
    });
  }

  function interVelas(E) {
    E.inters.push(A.etiquetaInter('Velas en familia', [-1.4, 0.15], [-1.4, -0.9], 1.0, {
      activo: () => apagon() && !A.estado().visita,
      abrir: () => {
        const ops = [];
        if (!A.S.f.d4Cuento) ops.push({
          texto: 'Contar cuentos con papá y mamá', nota: 'Papá cuenta uno de miedo (pero chistoso) y mamá uno de cuando era niña.', min: 20, ef: { animo: 10, confianza: 6, motivacion: 4 }, esfuerzo: false,
          pasos: [{ ruta: [[-1.4, 0.3], [-1.4, 0.95]], mira: [-1.4, -3.2], anim: 'esperar', sentado: true, dur: 4, min: 20, progreso: 'Contando cuentos a la luz de las velas' }],
          alTerminar: () => {
            A.S.f.d4Cuento = true; A.S.f.d4Familia = true;
            A.habito('Compartir en familia');
            A.anotar('Se fue la luz y contaron cuentos en familia con velas.', 'bien');
            const p = L.familia.find((x) => x.voz === 'papa');
            if (p) A.decir(p, '¡Y colorín colorado, este cuento se ha acabado!', 2.6);
          },
        });
        if (A.S.f.d4Linterna && !A.S.f.d4Sombras) ops.push({
          texto: 'Hacer sombras con la linterna', nota: 'Un conejito, un perro, un pato… ¡en la pared!', min: 10, ef: { animo: 8, confianza: 3 }, esfuerzo: false,
          pasos: [
            { anim: 'senalar', mira: [2.0, -3.5], dur: 0.8, min: 2, progreso: 'Prendiendo la linterna', alTerminar: mostrarSombra },
            { anim: 'saludar', mira: [2.0, -3.5], dur: 3.5, min: 8, progreso: 'Haciendo sombras en la pared' },
          ],
          alTerminar: () => {
            A.S.f.d4Sombras = true; A.S.f.d4Familia = true;
            A.anotar('Hiciste sombras chinescas con la linterna. ¡Todos se rieron!', 'bien');
            const m = L.familia.find((x) => x.voz === 'mama');
            if (m) A.decir(m, '¡Qué lindo conejito! ¿Ahora un perrito?', 2.4);
            setTimeout(quitarSombra, 2500);
          },
        });
        if (H.perro && !A.S.f.d4Abrazo) ops.push({
          texto: `Abrazar a ${nom()}, que tiene miedo de los truenos`, nota: 'Con tu abrazo se calma y deja de temblar.', min: 5, ef: { animo: 6, confianza: 2 }, anim: 'agacharse', dur: 2.4, esfuerzo: false, progreso: `Abrazando a ${nom()}`,
          alTerminar: () => {
            A.S.f.d4Abrazo = true; A.S.f.d4Familia = true;
            H.perro.cambiarVinculo(6);
            const D = H.perro.D;
            if (D) { D.anim = 'feliz'; D.salto = 0.4; }
            A.anotar(`Abrazaste a ${nom()} durante la tormenta. Ya no tiene miedo.`, 'bien');
          },
        });
        return {
          titulo: 'Velas en la sala',
          texto: ops.length ? 'Afuera truena, pero aquí está calientito. ¿Qué hacemos mientras vuelve la luz?' : 'Ya hicieron de todo. Ahora solo esperan juntitos a que vuelva la luz.',
          opciones: ops,
        };
      },
    }));
  }

  function prepararSala(E) {
    velas(E, [[-1.65, 0.38, -0.9], [-1.15, 0.38, -0.85]]);
    familiaEnSala(E);
  }

  // ---------- al entrar a cada lugar
  A.alConstruir((nombre, E) => {
    L.familia = []; L.velas = []; L.sombra = null; L.linterna && A.P.brazos[0].remove(L.linterna); L.linterna = null; L.luzMano = null;
    L.escena = E; L.avisoPerro = false;
    if (!hoy() || !A.perfil) return;
    envolver(E);
    if (nombre === 'sala') interVelas(E);
    if (apagon()) {
      if (nombre === 'sala') prepararSala(E);
      if (nombre === 'comedor') velas(E, [[1.0, 0.8, 0.6], [1.4, 0.8, 0.6]]);
      ponerLinterna();
    }
  });

  // ---------- cada cuadro
  let lluviaT = 0;
  A.alActualizar((dt) => {
    const E = A.escena, st = A.estado(), S = A.S;
    if (!E || !hoy() || !A.perfil) return;
    if (L.escena !== E) { L.escena = E; }
    envolver(E);   // por si otro módulo agregó su panel después de nosotros
    const v = crearVelo();

    // la lluvia en los lugares al aire libre
    if (llueve() && E.exterior && !st.cargando && st.jugando) {
      lluviaT -= dt;
      while (lluviaT <= 0) {
        lluviaT += 0.014;
        const q = A.P.root.position;
        A.emitir(new THREE.Vector3(q.x + (Math.random() - 0.5) * 12, 4.5, q.z + (Math.random() - 0.5) * 8), '#cfe0f5', new THREE.Vector3(-0.4, -9, 0), 0.5, 0.025, 0, 0.55);
      }
    }
    // la cachorrita no quiere mojarse: se queda en la puerta del jardín
    const D = H.perro && H.perro.D;
    if (E.nombre === 'jardin' && llueve() && D && H.perro.modo === 'sigue') {
      D.root.position.set(-E.w / 2 + 0.6, 0, 1.6);
      D.root.rotation.y = PI / 2;
      D.anim = 'quieto';
      if (!L.avisoPerro) { L.avisoPerro = true; A.avisar(`${nom()} se quedó en la puerta: no le gusta mojarse.`); }
    }

    // el apagón
    if (st.jugando && !st.cine && S.fase === 'tarde') {
      if (!S.f.d4Apagon && S.min >= INICIO && S.min < FIN) empezarApagon();
      else if (apagon() && S.min >= FIN) terminarApagon();
    }
    if (apagon()) {
      // las luces de la casa: el motor las recalcula cada cuadro; aquí las dejamos bajitas
      if (E.hemi) E.hemi.intensity = 0.1;
      if (E.sol) E.sol.intensity = 0.05;
      if (L.luzMano) { const p = A.P.root.position, ry = A.P.root.rotation.y; L.luzMano.position.set(p.x + Math.sin(ry) * 0.6, 1.3, p.z + Math.cos(ry) * 0.6); }
      L.velas.forEach((o) => { if (o.isLight) o.intensity = 0.8 + Math.random() * 0.25; });
      // durante el apagón papá y mamá están en la sala con velas (no hay dos papás ni dos mamás)
      // (si mamá viene de visita a hablarte, se ve ella y no la del sofá: nunca hay dos mamás)
      E.npcs.forEach((n) => {
        if (n.voz !== 'mama' && n.voz !== 'papa') return;
        if (L.familia.includes(n)) n.root.visible = !(st.visita && n.voz === 'mama');
        else if (!(st.visita && n.voz === 'mama')) n.root.visible = false;
      });
      if (D && st.jugando && Math.random() < dt * 0.4 && D.anim !== 'feliz') D.anim = 'quieto';
      S.f.d4Rayo = (S.f.d4Rayo || 25) - dt;
      if (S.f.d4Rayo <= 0) { S.f.d4Rayo = 22 + Math.random() * 18; relampago(); }
      if (L.sombra) { L.sombra.t += dt; L.sombra.orejas.forEach((o, i) => { o.rotation.z = (i ? -0.25 : 0.25) + Math.sin(L.sombra.t * 6 + i) * 0.15; }); }
    }
    if (rayo > 0) rayo -= dt;
    v.hidden = !(apagon() && st.jugando && !st.cine);
    v.classList.toggle('rayo', rayo > 0);
  });

  function empezarApagon() {
    const S = A.S, E = A.escena;
    S.f.d4Apagon = 'si';
    S.f.d4Linterna = true;
    relampago();
    A.banner('mal', '19:30 · Jueves', '¡Se fue la luz!', 'La tormenta cortó la electricidad del barrio.');
    A.anotar('Hubo un apagón por la tormenta.', '');
    if (E && E.nombre === 'sala') prepararSala(E);
    if (E && E.nombre === 'comedor') velas(E, [[1.0, 0.8, 0.6], [1.4, 0.8, 0.6]]);
    setTimeout(() => {
      if (!apagon()) return;
      ponerLinterna();
      A.avisar('Mamá te dio una linterna y prendió velas en la sala.', 'bien');
      const D = H.perro && H.perro.D;
      if (D) A.decir(D, '¡Auuu…! (tiene miedo de los truenos)', 2.4);
      else A.decir(A.P, `¡Qué oscuro! Voy a la sala con mamá y papá.`, 2.4);
    }, 1800);
  }

  function terminarApagon() {
    const S = A.S;
    S.f.d4Apagon = 'paso';
    quitarLuces();
    quitarFamilia();
    if (A.escena) A.escena.npcs.forEach((n) => { if (n.voz === 'mama' || n.voz === 'papa') n.root.visible = true; });
    A.sfx('logro');
    A.banner('bien', '20:30', '¡Volvió la luz!', S.f.d4Familia ? 'Qué bonito fue compartir en familia.' : 'Todo vuelve a la normalidad.');
    if (S.f.d4Familia) { A.cambiar({ animo: 4, confianza: 3 }); A.anotar('Volvió la luz. El apagón fue un buen rato en familia.', 'bien'); }
    else A.anotar('Volvió la luz después del apagón.', '');
    A.refrescar();
  }

  H.dia4 = {
    get apagon() { return apagon(); },
    get llueve() { return llueve(); },
    // para las pruebas
    empezarApagon, terminarApagon,
  };
})();
