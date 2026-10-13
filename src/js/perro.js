/* La cachorrita (Molly por defecto, o el nombre que eligió el jugador).
   - En la mañana duerme en su camita; cuando le das de comer, va a su plato y después te sigue por la casa.
   - Se le puede acariciar, pedirle que espere o llamarla, y llevarla a jugar fútbol al jardín (futbol.js).
   - A veces hace travesuras: papá llega y pregunta quién fue. Tú decides si la cubres, dices la verdad o la acusas.
   - El vínculo (confianza del perro en ti) se guarda entre días.
   - Silbato (tecla F o botón Silbar): viene corriendo aunque esté en otro cuarto.
   - Jugar: traer el palo en el jardín, dar la patita. Su casita en el jardín: limpiarla y mandarla a descansar. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.motor.nino) return;
  const A = H.motor.api;
  const { THREE, PI } = A;

  const CASA = ['dormitorio', 'pasillo', 'bano', 'comedor', 'sala', 'jardin'];
  const CAMA = { x: -0.4, z: -2.95 }, PLATO = { x: 0.3, z: -2.3 };
  // modo: cama · come · sigue · espera · travesura · juega (fútbol) · busca (traer el palo) · casita (descansa en su casita)
  const CASITA = { x: 3.3, z: -2.0 };
  // necesidades del cachorro (0 a 100): bajan con el tiempo y con el juego
  const N = { energia: 90, comida: 30, ult: null, avisoHambre: -999 };
  const M = { D: null, modo: 'cama', lugar: null, saludo: false, inter: null, esperaEn: null, esperaPos: null, triste: 0, ladrar: 12, trav: null, travFase: null };

  const nom = () => A.perfil.mascota.nombre;
  const activo = () => { const u = H.motor.ubicacion(); return !!(u && u.perro && A.perfil); };
  const ang = (a) => { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; };
  const girar = (D, obj, dt, k) => { D.root.rotation.y += ang(obj - D.root.rotation.y) * Math.min(1, dt * (k || 8)); };
  // libre: sin chocar con muebles (para papá, que no debe quedarse atascado)
  function irHacia(D, x, z, v, dt, r, libre) {
    const q = D.root.position, dx = x - q.x, dz = z - q.z, d = Math.hypot(dx, dz);
    if (d < (r || 0.06)) return true;
    const k = Math.min(1, v * dt / d);
    if (libre) { q.x += dx * k; q.z += dz * k; } else A.moverEn(D.root, dx * k, dz * k, 0.22);
    girar(D, Math.atan2(dx, dz), dt);
    D.anim = 'caminar'; D.vel = Math.min(1, v / 3);
    return false;
  }

  // ---------- vínculo (0 a 100), se guarda entre días
  let vinculo = (() => { const v = H.progreso && H.progreso.cargar().vinculo; return typeof v === 'number' ? v : 20; })();
  function cambiarVinculo(d) {
    vinculo = Math.max(0, Math.min(100, vinculo + d));
    if (H.progreso) H.progreso.guardar({ vinculo: Math.round(vinculo) });
    if (d >= 5) A.avisar(`${nom()} confía más en ti (+${d}).`, 'bien');
    if (d <= -5) A.avisar(`${nom()} se puso triste (${d}).`, 'mal');
  }
  const corazones = () => { const n = Math.round(vinculo / 20); return '♥'.repeat(n) + '♡'.repeat(5 - n); };

  // ---------- lo que lleva puesto: collar (color) y ropita ('panuelo' | 'gorrito'); se guarda entre días
  const pr0 = H.progreso ? H.progreso.cargar() : {};
  const LOOK = { collar: typeof pr0.collar === 'string' ? pr0.collar : null, ropa: typeof pr0.ropaPerro === 'string' ? pr0.ropaPerro : null };
  const perros = new Set();   // modelos de la cachorrita (los de perro.js y los que crean otros módulos)
  const smat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, flatShading: true });
  function vestirModelo(D) {
    if (!D || !D.cabeza) return;
    ['collar', 'ropa'].forEach((k) => { if (D['_' + k]) { D['_' + k].parent.remove(D['_' + k]); D['_' + k] = null; } });
    if (LOOK.collar) {
      // una banda que asoma bajo la barbilla y a los costados del cuello (va en la cabeza para moverse con ella)
      const g = new THREE.Group(); g.name = 'collar'; g.position.set(0, -0.125, -0.05); g.rotation.x = -0.25;
      const aro = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 6, 18), smat(LOOK.collar));
      aro.scale.set(1, 0.55, 1.4); g.add(aro);
      const placa = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.015, 10), smat('#f2c94c'));
      placa.rotation.x = PI / 2; placa.position.set(0, -0.11, 0.035); g.add(placa);
      if (LOOK.collar === '#3f5bd1') [-2, -1, 1, 2].forEach((i) => {   // collar con estrellas
        const a = -PI / 2 + i * 0.6, st = new THREE.Mesh(new THREE.OctahedronGeometry(0.025), smat('#ffe066'));
        st.position.set(Math.cos(a) * 0.155, Math.sin(a) * 0.155 * 0.55, 0.03); g.add(st);
      });
      D.cabeza.add(g); D._collar = g;
    }
    if (LOOK.ropa === 'panuelo') {
      const g = new THREE.Group(); g.name = 'ropa';
      const tri = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.16, 3), smat('#f28c38'));
      tri.rotation.x = PI; tri.position.set(0, -0.2, -0.02); g.add(tri);
      D.cabeza.add(g); D._ropa = g;
    } else if (LOOK.ropa === 'gorrito') {
      const g = new THREE.Group(); g.name = 'ropa';
      const cono = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 10), smat('#8f73cf'));
      cono.position.set(0, 0.22, -0.01); g.add(cono);
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), smat('#fff'));
      pom.position.set(0, 0.33, -0.01); g.add(pom);
      D.cabeza.add(g); D._ropa = g;
    }
  }
  // todos los modelos de la cachorrita (también los que crean dia3, dia6, sotano, piscina…) salen con lo que lleva puesto
  const crearPerroMotor = A.crearPerro;
  A.crearPerro = function (color) {
    const D = crearPerroMotor.apply(this, arguments);
    if (A.perfil && A.perfil.mascota && color === A.perfil.mascota.color) { D.esMascota = true; perros.add(D); vestirModelo(D); }
    return D;
  };
  function vestirTodos() { perros.forEach((D) => { if (D.root.parent) vestirModelo(D); else perros.delete(D); }); }
  function ponerCollar(color) {
    LOOK.collar = color || null;
    if (H.progreso) H.progreso.guardar({ collar: LOOK.collar });
    vestirTodos();
    return LOOK.collar;
  }
  function ponerRopa(id) {
    LOOK.ropa = id === 'panuelo' || id === 'gorrito' ? id : null;
    if (H.progreso) H.progreso.guardar({ ropaPerro: LOOK.ropa });
    vestirTodos();
    return LOOK.ropa;
  }
  const tienePremio = (id) => !!(H.premios && H.premios.tiene(id));

  // ---------- la cachorrita como espejo: su ánimo de hoy sale de cómo la cuidaste ayer; si no jugaste en días, te extrañó
  const hoyISO = H.progreso && H.progreso.hoyISO ? H.progreso.hoyISO() : '';
  const diasSinJugar = H.progreso && pr0.ultimaVisita ? Math.max(0, H.progreso.diasEntre(pr0.ultimaVisita, hoyISO)) : 0;
  if (H.progreso && A.perfil) H.progreso.guardar({ ultimaVisita: hoyISO });
  let animo = typeof pr0.perroAnimo === 'number' ? Math.max(0, Math.min(100, pr0.perroAnimo)) : 70;
  if (diasSinJugar >= 2) animo = Math.max(animo, 85);   // volviste: ¡está feliz de verte!
  const HOY = { jugo: 0, caricias: 0, salio: false, trucos: 0, saludo: false };
  // al terminar el día: cómo la cuidaste hoy → su ánimo de mañana (nunca baja de 35)
  function cerrarDia() {
    const f = A.S.f || {};
    let a = 45;
    if (f.perroComio) a += 25;
    a += Math.min(15, HOY.jugo * 6 + HOY.caricias * 3 + HOY.trucos * 3);
    if (HOY.salio || f.casitaLimpia) a += 10;
    a = Math.max(35, Math.min(100, Math.round(a)));
    if (H.progreso) H.progreso.guardar({ perroAnimo: a });
    return a;
  }
  A.alEvento((tipo) => {
    if (tipo === 'gol' || tipo === 'piscinaReto' || tipo === 'sotanoControl') HOY.jugo++;
    if (tipo === 'escondidas') HOY.jugo++;
  });
  // te saluda en la mañana (o al volver al juego), según su ánimo
  function saludar() {
    const D = M.D, st = A.estado();
    if (HOY.saludo || !D || !st.jugando || st.panel || st.accion || st.visita || st.cine || st.tutorial || st.cargando || A.S.fase === 'colegio' || A.S.fase === 'prologo') return;
    const q = D.root.position, p = A.P.root.position;
    if (Math.hypot(p.x - q.x, p.z - q.z) > 2.6 || A.P.cuerpo.rotation.x !== 0) return;
    HOY.saludo = true;
    const n = nom();
    let txt;
    if (diasSinJugar >= 2) txt = `¡${n} te extrañó muchísimo! Salta y mueve la cola: "¡Volviste!"`;
    else if (animo >= 80) txt = `${n} amaneció feliz: ayer la cuidaste muy bien. ¡Buenos días!`;
    else if (animo >= 55) txt = `${n} te da los buenos días moviendo la cola.`;
    else txt = `${n} te mira tranquilita. Hoy quiere comer rico y jugar contigo.`;
    if (animo >= 55 || diasSinJugar >= 2) { D.anim = 'feliz'; D.salto = 0.55; A.sfx('ladrido'); if (diasSinJugar >= 2) setTimeout(() => { if (M.D) M.D.salto = 0.55; A.sfx('ladrido'); }, 700); }
    A.avisar(txt, 'bien');
    A.evento('perroSaludo', { animo, diasSinJugar });
  }

  // ---------- trucos: dar la patita, saludar, rodar
  const TR = { tipo: null, t: 0 };
  function hacerTruco(tipo) { TR.tipo = tipo; TR.t = 0; HOY.trucos++; if (M.D) M.D.anim = 'feliz'; }
  A.alActualizar((dt) => {
    const D = M.D;
    if (!TR.tipo) return;
    if (!D) { TR.tipo = null; return; }
    TR.t += dt;
    if (TR.tipo === 'rodar') {
      D.cuerpo.rotation.z = Math.min(1, TR.t / 1.1) * 2 * PI;
      if (TR.t >= 1.1) { D.cuerpo.rotation.z = 0; TR.tipo = null; D.salto = 0.55; }
    } else {
      // patita / saludar: levanta la pata de adelante (saludar la mueve)
      const pata = D.patas[0];
      pata.rotation.x = TR.tipo === 'saludar' ? -1.5 + Math.sin(TR.t * 14) * 0.35 : -1.2;
      if (TR.t >= 1.4) TR.tipo = null;
    }
  });

  function crear(E, x, z, ry) {
    const D = A.crearPerro(A.perfil.mascota.color);
    D.voz = 'perro';
    D.root.position.set(x, 0, z);
    D.root.rotation.y = ry || 0;
    E.scene.add(D.root); E.npcs.push(D); E.perro = D;
    M.D = D;
    return D;
  }

  // ---------- camita y plato (en tu cuarto)
  function camaYPlato(E) {
    const sc = E.scene;
    A.cil(sc, 0.5, 0.52, 0.16, '#5b8fd1', CAMA.x, 0.08, CAMA.z);
    A.cil(sc, 0.4, 0.4, 0.05, '#f1ece2', CAMA.x, 0.17, CAMA.z);
    E.solido(CAMA.x, CAMA.z, 1.0, 1.0);
    A.cil(sc, 0.17, 0.13, 0.08, '#de5546', PLATO.x, 0.04, PLATO.z);
    const comida = A.cil(sc, 0.14, 0.14, 0.03, '#a8743f', PLATO.x, 0.085, PLATO.z);
    E.refrescos.push(() => { comida.visible = !!A.S.f.perroComio && M.modo === 'come' && (M.t || 0) < 4.5; });
    E.inters.push(A.etiquetaInter(`Plato de ${nom()}`, [PLATO.x + 0.1, PLATO.z + 0.7], [PLATO.x, PLATO.z], 1.0, {
      activo: () => N.comida < 60,
      abrir: () => ({
        titulo: `${nom()} tiene hambre`, texto: `${nom()} te mira y mueve la cola. Su plato está vacío.`,
        opciones: [{
          texto: 'Servirle su comida', nota: 'Si la alimentas cada día, confía más en ti.',
          min: 2, ef: { animo: 5, confianza: 3 }, anim: 'agacharse', dur: 2.0, progreso: `Sirviendo la comida de ${nom()}`, esfuerzo: false,
          alTerminar: () => {
            const primera = !A.S.f.perroComio;
            A.S.f.perroComio = true;
            N.comida = 100;
            if (primera) A.habito(`Darle de comer a ${nom()}`);
            if (A.S.fase === 'manana') A.meta('perro', true);
            cambiarVinculo(4);
            if (M.modo === 'cama' || M.modo === 'sigue' || M.modo === 'espera') { M.modo = 'come'; M.t = 0; }
            if (!M.D) crear(A.escena, CAMA.x, CAMA.z, 0.7);
            A.refrescar();
          },
        }],
      }),
    }));
  }

  // ---------- interacción con el perro
  function agregarInter(E) {
    M.inter = A.etiquetaInter(nom(), [0, 0], [0, 0], 1.1, {
      alto: 0.95,
      posicion: () => (M.D ? M.D.root.position : { x: 0, z: 0 }),
      activo: () => !!M.D && (M.modo === 'sigue' || M.modo === 'espera'),
      abrir: () => {
        const ops = [{
          texto: 'Acariciarla', nota: 'Le encanta, y a ti también te calma.', min: 2, ef: { animo: 6 }, anim: 'agacharse', dur: 1.8, esfuerzo: false,
          progreso: `Acariciando a ${nom()}`,
          alTerminar: () => { HOY.caricias++; cambiarVinculo(3); if (M.D) { M.D.anim = 'feliz'; M.D.salto = 0.55; } A.sfx('ladrido'); },
        }];
        const agotada = N.energia < 25 ? `${nom()} está agotada: déjala descansar un rato.` : null;
        if (A.escena.nombre === 'jardin') ops.push({
          texto: 'Lanzarle un palo: "¡Busca!"', nota: 'Corre a buscarlo y te lo trae. ¡Le encanta!', min: 5, ef: { animo: 7 }, esfuerzo: false, bloqueado: agotada,
          pasos: [
            { anim: 'senalar', dur: 0.6, min: 0, progreso: '¡Busca!', alTerminar: lanzarPalo },
            { anim: 'quieto', dur: 4.2, min: 5, progreso: `${nom()} va por el palo` },
          ],
          alTerminar: () => { HOY.jugo++; cambiarVinculo(3); N.energia = Math.max(0, N.energia - 8); A.habito(`Jugar con ${nom()}`); },
        });
        // la patita: la aprende cuando confía mucho en ti, o la desbloquean tus estrellas (premio 'truco-patita')
        const sabePatita = vinculo >= 40 || tienePremio('truco-patita');
        ops.push(sabePatita ? {
          texto: 'Pedirle la patita', nota: 'Ya aprendió: te da la patita.', min: 1, ef: { animo: 4 }, anim: 'agacharse', dur: 1.4, esfuerzo: false, progreso: '¡La patita!',
          alTerminar: () => { cambiarVinculo(1); hacerTruco('patita'); A.sfx('ladrido'); A.decir(A.P, `¡Muy bien, ${nom()}!`, 1.8); },
        } : {
          texto: 'Enseñarle a dar la patita', nota: `Aprende cuando confía mucho en ti (${corazones()}).`, min: 3, ef: { animo: 3 }, anim: 'agacharse', dur: 2.0, esfuerzo: false, progreso: 'Enseñándole la patita',
          alTerminar: () => {
            cambiarVinculo(2);
            const aprendio = vinculo >= 40;
            if (aprendio && H.premios) H.premios.dar('truco-patita', 'vinculo');
            A.decir(A.P, aprendio ? '¡Me dio la patita! ¡Aprendió!' : 'Casi… todavía no entiende. Otro día.', 2.4);
          },
        });
        if (tienePremio('truco-saludar')) ops.push({
          texto: 'Pedirle que salude', nota: 'Levanta la patita y la mueve: ¡hola!', min: 1, ef: { animo: 4 }, anim: 'saludar', dur: 1.4, esfuerzo: false, progreso: '¡Saluda!',
          alTerminar: () => { cambiarVinculo(1); hacerTruco('saludar'); A.sfx('ladrido'); A.decir(A.P, `¡Hola, ${nom()}!`, 1.8); },
        });
        if (tienePremio('truco-rodar')) ops.push({
          texto: 'Pedirle que ruede', nota: 'Da una vuelta en el piso. ¡Qué graciosa!', min: 1, ef: { animo: 5 }, anim: 'senalar', dur: 1.6, esfuerzo: false, progreso: '¡Rueda!',
          alTerminar: () => { cambiarVinculo(1); hacerTruco('rodar'); A.sfx('ladrido'); A.decir(A.P, `¡Bravo, ${nom()}!`, 1.8); },
        });
        if (A.escena.nombre === 'jardin' && H.futbol) {
          H.futbol.opcionesJuego(false).forEach((o) => ops.push(o));
        } else if (CASA.includes(A.escena.nombre)) {
          ops.push({ texto: 'Llevarla al jardín a jugar', nota: 'Allá pueden jugar fútbol.', min: 1, anim: 'saludar', dur: 0.8, esfuerzo: false, progreso: '¡Vamos!', alTerminar: () => { M.modo = 'sigue'; A.irA('jardin'); } });
        }
        if (M.modo === 'sigue') {
          ops.push({
            texto: 'Decirle "¡Quieta! Espérame aquí"', nota: 'Se queda en este cuarto hasta que vuelvas por ella.', min: 0, anim: 'senalar', dur: 1.0, esfuerzo: false, progreso: '¡Quieta!',
            alTerminar: () => { M.modo = 'espera'; M.esperaEn = A.escena.nombre; const q = M.D.root.position; M.esperaPos = { x: q.x, z: q.z }; cambiarVinculo(1); },
          });
        } else {
          ops.push({ texto: `Llamarla: "¡${nom()}, ven!"`, min: 0, anim: 'saludar', dur: 0.8, esfuerzo: false, progreso: '¡Ven!', alTerminar: () => { M.modo = 'sigue'; M.esperaEn = null; A.sfx('ladrido'); } });
        }
        const puntos = (v) => '●'.repeat(Math.round(v / 20)) + '○'.repeat(5 - Math.round(v / 20));
        return { titulo: nom(), texto: `Confía en ti: ${corazones()} · Energía ${puntos(N.energia)} · Comida ${puntos(N.comida)}${M.triste > 0 ? ' · Está triste.' : ''}${N.energia < 25 ? ' · Está agotada: necesita descansar.' : ''}`, opciones: ops };
      },
    });
    E.inters.push(M.inter);
  }

  // ---------- al entrar a cada lugar
  A.alConstruir((nombre, E, desde) => {
    M.D = null; M.inter = null; M.lugar = nombre; M.entrada = A.S.min;
    if (M.trav) { A.bloquear('travesura', false); M.trav = null; M.travFase = null; }
    const st = A.estado();
    if (!activo() || st.cine || A.S.fase === 'prologo') return;
    if (A.S.fase === 'colegio') { M.modo = 'cama'; M.saludo = false; return; }
    if (nombre === 'dormitorio') camaYPlato(E);
    if (nombre === 'jardin') casita(E);
    if (M.modo === 'busca') M.modo = 'sigue';
    if (M.modo === 'casita' && nombre === 'jardin') {
      const D = crear(E, CASITA.x, CASITA.z - 0.15, 0);
      D.anim = 'dormir';
      agregarInter(E);
      return;
    }
    if (!CASA.includes(nombre)) {
      if (nombre === 'mirador' && M.modo === 'sigue') A.avisar(`${nom()} se quedó abajo, esperándote al pie de la escalera.`);
      return;
    }
    // en la tarde te recibe al llegar del colegio
    if (A.S.fase === 'tarde' && !M.saludo && M.modo !== 'espera') {
      M.saludo = true; M.modo = 'sigue';
      const D = crear(E, A.P.root.position.x + 1.6, A.P.root.position.z + 0.4, -PI / 2);
      D.anim = 'feliz'; D.salto = 0.55;
      A.sfx('ladrido');
      setTimeout(() => A.avisar(`¡${nom()} te estaba esperando! ${A.S.f.perroComio ? '' : 'No comió en la mañana: tiene hambre.'}`, A.S.f.perroComio ? 'bien' : 'mal'), 1500);
      agregarInter(E);
      return;
    }
    if (M.modo === 'cama' && nombre === 'dormitorio') {
      const D = crear(E, CAMA.x, CAMA.z, 0.7);
      D.root.position.y = 0.14; D.anim = 'dormir';
      return;
    }
    if (M.modo === 'espera' && nombre === M.esperaEn) {
      const D = crear(E, M.esperaPos.x, M.esperaPos.z, 0);
      D.anim = 'feliz'; D.salto = 0.55; A.sfx('ladrido');
      agregarInter(E);
      return;
    }
    if (M.modo === 'sigue' || M.modo === 'travesura') {
      M.modo = 'sigue';
      const p = A.P.root.position, ry = A.P.root.rotation.y;
      crear(E, p.x - Math.sin(ry) * 0.8, p.z - Math.cos(ry) * 0.8, ry);
      if (desde === 'mirador') { M.D.anim = 'feliz'; M.D.salto = 0.55; A.sfx('ladrido'); }
      agregarInter(E);
    }
  });

  // ---------- cada cuadro
  A.alActualizar((dt, r) => {
    // el tiempo del juego gasta (o recupera) sus necesidades
    if (activo() && A.estado().jugando) {
      if (N.ult == null) N.ult = A.S.min;
      const dm = Math.max(0, A.S.min - N.ult); N.ult = A.S.min;
      const descansa = M.modo === 'cama' || M.modo === 'casita' || (M.D && M.D.anim === 'dormir');
      N.comida = Math.max(0, N.comida - 0.12 * dm);
      N.energia = Math.max(0, Math.min(100, N.energia + (M.modo === 'casita' ? 0.6 : descansa ? 0.35 : -0.04) * dm));
      if (N.comida < 25 && A.S.min - N.avisoHambre > 90 && M.modo !== 'cama') { N.avisoHambre = A.S.min; A.avisar(`${nom()} tiene hambre: sírvele comida en su plato.`, 'mal'); }
    }
    const D = M.D;
    if (!D) return;
    if (!HOY.saludo) saludar();
    if (M.inter) {
      const q = D.root.position, pp = A.P.root.position, vx = pp.x - q.x, vz = pp.z - q.z, l = Math.hypot(vx, vz) || 1;
      M.inter.en[0] = q.x + vx / l * 0.65; M.inter.en[1] = q.z + vz / l * 0.65;
      M.inter.mira[0] = q.x; M.inter.mira[1] = q.z;
    }
    if (M.triste > 0) M.triste -= dt;
    const p = A.P.root.position;

    if (M.modo === 'cama') {
      // duerme; se alegra si te acercas
      const dx = p.x - D.root.position.x, dz = p.z - D.root.position.z;
      const cerca = Math.hypot(dx, dz) < 1.7 && A.P.cuerpo.rotation.x === 0;
      if (cerca && D.anim === 'dormir') { D.anim = 'feliz'; D.salto = 0.55; A.sfx('ladrido'); }
      else if (!cerca && D.anim === 'feliz') D.anim = 'quieto';
      if (cerca) girar(D, Math.atan2(dx, dz), dt, 5);
      return;
    }
    if (M.modo === 'come') {
      // va al plato, come y se queda contigo
      M.t = M.t || 0;
      D.root.position.y = 0;
      if (M.t < 4.5) {
        if (irHacia(D, PLATO.x - 0.42, PLATO.z + 0.05, 1.6, dt)) { D.anim = 'comer'; D.root.rotation.y = PI / 2; M.t += dt; if (M.t >= 4.5) A.refrescar(); }
        return;
      }
      M.modo = 'sigue';
      D.anim = 'feliz'; D.salto = 0.55; A.sfx('ladrido');
      A.avisar(`${nom()} comió todo. ¡Ahora te sigue a todas partes!`, 'bien');
      agregarInter(A.escena); A.crearEtiquetas();
      return;
    }
    if (M.modo === 'sigue') { seguir(D, dt, r); revisarTravesura(dt); return; }
    if (M.modo === 'busca') { buscarPalo(D, dt); return; }
    if (M.modo === 'casita') {
      // descansa adentro; sale sola cuando recupera fuerzas
      if (irHacia(D, CASITA.x, CASITA.z - 0.15, 1.6, dt, 0.08, true)) { D.anim = 'dormir'; D.root.rotation.y = 0; }
      if (N.energia >= 95 && A.S.min - (M.casitaDesde || 0) > 30) { M.modo = 'sigue'; D.anim = 'feliz'; D.salto = 0.55; A.sfx('ladrido'); A.avisar(`${nom()} ya descansó y salió de su casita.`, 'bien'); }
      return;
    }
    if (M.modo === 'espera') {
      D.anim = 'quieto';
      girar(D, Math.atan2(p.x - D.root.position.x, p.z - D.root.position.z), dt, 3);
      return;
    }
    if (M.modo === 'travesura') actualizarTravesura(dt);
  });

  function seguir(D, dt, r) {
    const p = A.P.root.position, ry = A.P.root.rotation.y;
    // agotada: se echa donde está hasta recuperar fuerzas
    if (N.energia < 20 || (D.anim === 'dormir' && N.energia < 45)) { D.anim = 'dormir'; return; }
    if (A.estado().accion) {
      const q = D.root.position;
      girar(D, Math.atan2(p.x - q.x, p.z - q.z), dt, 4);
      D.anim = A.P.anim === 'agacharse' ? 'feliz' : 'quieto';
      return;
    }
    // un poco detrás y al costado
    const tx = p.x - Math.sin(ry) * 0.95 + Math.cos(ry) * 0.35, tz = p.z - Math.cos(ry) * 0.95 - Math.sin(ry) * 0.35;
    const q = D.root.position, d = Math.hypot(tx - q.x, tz - q.z);
    if (d > 7) { q.x = tx; q.z = tz; }
    const lento = M.triste > 0 ? 0.6 : 1;
    if (d > 0.35) irHacia(D, tx, tz, (d > 2.5 ? 3.6 : d > 1 ? 2.6 : 1.4) * lento, dt);
    else {
      girar(D, Math.atan2(p.x - q.x, p.z - q.z), dt, 4);
      D.anim = M.triste > 0 ? 'quieto' : A.P.anim === 'caminar' || Math.sin(r * 0.4) > 0.55 ? 'feliz' : 'quieto';
    }
    M.ladrar -= dt;
    if (M.ladrar <= 0) { M.ladrar = 18 + Math.random() * 20; if (M.triste <= 0 && Math.random() < 0.5) A.sfx('ladrido'); }
  }

  // ---------- traer el palo (en el jardín)
  function lanzarPalo() {
    const D = M.D, E = A.escena;
    if (!D || !E) return;
    const p = A.P.root.position, ry = A.P.root.rotation.y;
    let tx = p.x + Math.sin(ry) * 3.2, tz = p.z + Math.cos(ry) * 3.2;
    tx = Math.max(-E.w / 2 + 0.8, Math.min(E.w / 2 - 0.8, tx)); tz = Math.max(-E.d / 2 + 0.9, Math.min(E.d / 2 - 0.8, tz));
    const palo = A.box(E.scene, 0.5, 0.05, 0.05, '#8a5a3b', p.x, 1.0, p.z, { ry: Math.random() * 3 });
    M.modo = 'busca';
    M.palo = { m: palo, x0: p.x, z0: p.z, tx, tz, t: 0, fase: 'vuela' };
    A.sfx('click');
  }
  function buscarPalo(D, dt) {
    const B = M.palo;
    if (!B) { M.modo = 'sigue'; return; }
    B.t += dt;
    if (B.fase === 'vuela') {
      const k = Math.min(1, B.t / 0.6);
      B.m.position.set(B.x0 + (B.tx - B.x0) * k, 1.0 + Math.sin(k * PI) * 1.2 - k * 0.97, B.z0 + (B.tz - B.z0) * k);
      if (k >= 1) { B.fase = 'va'; A.sfx('ladrido'); }
    }
    if (B.fase === 'va' || B.fase === 'vuela') {
      if (B.fase === 'va' && irHacia(D, B.tx, B.tz, 3.6, dt, 0.3)) { B.fase = 'trae'; D.salto = 0.4; }
      else if (B.fase === 'vuela') D.anim = 'feliz';
      return;
    }
    // lo trae en la boca
    const q = D.root.position, ry = D.root.rotation.y;
    B.m.position.set(q.x + Math.sin(ry) * 0.38, 0.32, q.z + Math.cos(ry) * 0.38);
    B.m.rotation.y = ry + PI / 2;
    const p = A.P.root.position;
    if (irHacia(D, p.x + Math.sin(A.P.root.rotation.y) * 0.7, p.z + Math.cos(A.P.root.rotation.y) * 0.7, 3.0, dt, 0.25) || B.t > 9) {
      A.escena.scene.remove(B.m);
      M.palo = null; M.modo = 'sigue';
      D.anim = 'feliz'; D.salto = 0.55; A.sfx('ladrido');
    }
  }

  // ---------- su casita en el jardín
  function casita(E) {
    // premios de la casita: adornos (casita-linda) y banderines
    // (la casita del motor: centro en (3.3, -2.3), frente en z ≈ -1.8)
    if (tienePremio('casita-linda')) {
      A.box(E.scene, 0.1, 0.08, 1.2, '#f2c94c', CASITA.x, 1.33, -2.3);
      A.box(E.scene, 0.3, 0.12, 0.03, '#e46d7b', CASITA.x, 0.68, -1.77, { sombra: false });
      [-0.75, 0.75].forEach((dx) => { A.cil(E.scene, 0.1, 0.08, 0.16, '#c56b4a', CASITA.x + dx, 0.08, -1.65); A.bola(E.scene, 0.1, dx < 0 ? '#e46d7b' : '#f2c94c', CASITA.x + dx, 0.22, -1.65); });
    }
    if (tienePremio('banderines')) {
      ['#de5546', '#f2c94c', '#7cc6f2', '#7bbf5a', '#8f73cf'].forEach((c, i) => {
        const b = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.13, 3), smat(c));
        b.rotation.x = PI; b.position.set(CASITA.x - 0.5 + i * 0.25, 0.86 - Math.sin((i / 4) * PI) * 0.06, -1.72);
        E.scene.add(b);
      });
    }
    E.inters.push(A.etiquetaInter('Casita del perro', [CASITA.x, -1.15], [CASITA.x, -2.3], 0.85, {
      activo: () => !A.estado().visita,
      abrir: () => {
        const ops = [];
        if (!A.S.f.casitaLimpia) ops.push({
          texto: 'Limpiarla y ponerle su mantita', nota: `Una casita limpia y abrigada: ${nom()} duerme mejor.`, min: 5, ef: { animo: 3, confianza: 3 }, anim: 'agacharse', dur: 2.4, esfuerzo: false, progreso: 'Limpiando la casita',
          alTerminar: () => { A.S.f.casitaLimpia = true; cambiarVinculo(3); A.habito(`Cuidar la casita de ${nom()}`); },
        });
        if (M.D && M.modo === 'sigue') ops.push({
          texto: `Decirle a ${nom()} que descanse en su casita`, nota: N.energia < 60 ? 'Está cansada: adentro recupera fuerzas más rápido.' : 'Todavía tiene energía, pero puede echarse un rato.', min: 1, anim: 'senalar', dur: 0.8, esfuerzo: false, progreso: '¡A tu casita!',
          alTerminar: () => { M.modo = 'casita'; M.casitaDesde = A.S.min; A.avisar(`${nom()} se fue a descansar a su casita. Silba (F) cuando quieras que salga.`); },
        });
        if (M.modo === 'casita') ops.push({
          texto: `Llamarla: "¡${nom()}, sal!"`, min: 0, anim: 'saludar', dur: 0.8, esfuerzo: false, progreso: '¡Ven!',
          alTerminar: () => { M.modo = 'sigue'; if (M.D) { M.D.salto = 0.55; } A.sfx('ladrido'); },
        });
        ops.push({
          texto: 'Mirar qué hay adentro', min: 1, anim: 'agacharse', dur: 1.2, esfuerzo: false, progreso: 'Mirando adentro',
          alTerminar: () => A.decir(A.P, ['Hay una pelotita mordida y… ¡una media de papá!', `Huele a ${nom()}. Y hay un hueso escondido.`, 'Está calientito aquí adentro.'][Math.floor(A.S.min / 37) % 3], 3),
        });
        return { titulo: `La casita de ${nom()}`, texto: M.modo === 'casita' ? `${nom()} está durmiendo adentro.` : A.S.f.casitaLimpia ? 'Limpia y con su mantita.' : 'Tiene hojas secas y la mantita está sucia.', opciones: ops };
      },
    }));
  }

  // ---------- el silbato: viene corriendo aunque esté en otro cuarto
  function silbar() {
    const st = A.estado();
    if (!activo() || !st.jugando || st.cine || st.panel || st.alarma || st.levantando || A.S.fase === 'colegio' || A.S.fase === 'prologo') return false;
    if (H.futbol && H.futbol.jugando) return false;
    A.sfx('silbato');
    A.decir(A.P, `¡Fiuuu-fiu! ¡${nom()}!`, 1.4, false);
    if (M.modo === 'travesura' || M.modo === 'come' || M.modo === 'juega' || M.modo === 'busca') return true;
    // fuera de casa, en un lugar donde la cachorra ya va contigo (el parque, o E.conPerro = true): solo silbas
    if (A.escena.nombre === 'parque' || A.escena.conPerro) return true;
    if (!CASA.includes(A.escena.nombre)) { A.avisar(`${nom()} no te escucha desde aquí arriba.`); return true; }
    if (N.energia < 20) { A.avisar(`${nom()} está agotada: te escuchó, pero sigue durmiendo.`); return true; }
    if (M.D && M.modo === 'sigue') { M.D.salto = 0.55; A.sfx('ladrido'); return true; }
    const E = A.escena;
    M.modo = 'sigue'; M.esperaEn = null;
    if (M.D) { M.D.root.position.y = 0; M.D.salto = 0.55; }
    else {
      // entra corriendo por la puerta
      const pu = puertaPapa();
      const [x, z] = pu ? enPared(E, pu.lado, pu.c, -0.5) : [A.P.root.position.x - 2, A.P.root.position.z];
      crear(E, x, z, 0);
    }
    if (!M.inter) { agregarInter(E); A.crearEtiquetas(); }
    setTimeout(() => A.sfx('ladrido'), 350);
    A.avisar(`¡${nom()} viene corriendo!`, 'bien');
    A.evento('silbato', {});
    return true;
  }
  A.alTecla((e) => { if (e.code !== 'KeyF' || e.repeat) return false; return silbar(); });
  document.body.insertAdjacentHTML('beforeend', '<button class="b-silbar" id="bSilbar" type="button" hidden aria-label="Silbar para llamar a tu cachorro"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h9a5 5 0 110 6H8l-5-2z"/><circle cx="12.5" cy="13" r="1.6" fill="#fff"/><path d="M14 5l1-2M18 7l2-1.5M10 6L9 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Silbar</span><kbd data-t="">F</kbd></button>');
  const bSilbar = document.querySelector('#bSilbar');
  bSilbar.addEventListener('click', () => { silbar(); bSilbar.blur(); });
  bSilbar.addEventListener('mousedown', (e) => e.preventDefault());
  setInterval(() => {
    const st = A.estado(), ver = st.jugando && !document.querySelector('#hud').hidden && activo() && A.S.fase !== 'colegio' && !(H.futbol && H.futbol.jugando);
    if (bSilbar.hidden === ver) bSilbar.hidden = !ver;
  }, 400);

  // ---------- travesuras
  const TRAVESURAS = {
    sala: { x: -3.6, z: -0.2, que: 'mordió un cojín del sofá', culpa: 'tú habías mordido el cojín', pregunta: '¿Quién destrozó el cojín del sofá?', hace: (sc, x, z) => { for (let i = 0; i < 9; i++) A.box(sc, 0.08, 0.04, 0.08, i % 3 ? '#f4f1ea' : '#5b8fd1', x + (Math.random() - 0.5) * 0.8, 0.02, z + (Math.random() - 0.5) * 0.6, { ry: Math.random() * 3 }); } },
    comedor: { x: 2.6, z: 1.6, que: 'se robó un pan y dejó migas por todos lados', culpa: 'tú te habías comido el pan', pregunta: '¿Quién se comió el pan de la mesa y dejó todo así?', hace: (sc, x, z) => { A.box(sc, 0.16, 0.1, 0.11, '#d9a35b', x, 0.05, z, { ry: 0.6 }); for (let i = 0; i < 10; i++) A.box(sc, 0.03, 0.02, 0.03, '#c98e4a', x + (Math.random() - 0.5) * 0.9, 0.01, z + (Math.random() - 0.5) * 0.7); } },
    dormitorio: { x: 1.8, z: 1.4, que: 'mordió una zapatilla de papá', culpa: 'tú habías mordido la zapatilla', pregunta: '¿Quién mordió mi zapatilla?', hace: (sc, x, z) => { A.box(sc, 0.16, 0.1, 0.3, '#3a2a20', x, 0.05, z, { ry: 1.1 }); A.box(sc, 0.06, 0.03, 0.06, '#f1ece2', x + 0.2, 0.015, z + 0.1); } },
    jardin: { x: 0.9, z: -2.3, que: 'escarbó un hoyo en las plantas de mamá', culpa: 'tú habías escarbado las plantas', pregunta: '¿Quién escarbó las plantas de mamá?', hace: (sc, x, z) => { for (let i = 0; i < 7; i++) A.bola(sc, 0.1 + Math.random() * 0.06, '#6b4a33', x + (Math.random() - 0.5) * 0.7, 0.05, z + (Math.random() - 0.5) * 0.4); A.bola(sc, 0.09, '#de5546', x + 0.3, 0.06, z + 0.25); } },
    pasillo: { x: 2.2, z: 0.6, que: 'arrastró la toalla del baño por el pasillo', culpa: 'tú habías dejado la toalla tirada', pregunta: '¿Quién dejó la toalla tirada en el piso?', hace: (sc, x, z) => { A.box(sc, 0.9, 0.03, 0.5, '#7cc6f2', x, 0.015, z, { ry: 0.4 }); } },
  };
  let proxima = null, faseTrav = null, hechasHoy = { manana: 0, tarde: 0 };
  function revisarTravesura() {
    const st = A.estado(), T = TRAVESURAS[A.escena.nombre];
    if (!T || !st.jugando || st.accion || st.panel || st.visita || st.cargando || st.tutorial || st.mamaHabla) return;
    const fase = A.S.fase;
    if (fase !== faseTrav) { faseTrav = fase; proxima = null; }
    if (!(fase in hechasHoy) || hechasHoy[fase] >= 1) return;
    // no al entrar a un cuarto ni en la tarde antes de almorzar (mamá te está recibiendo)
    if (A.S.min - (M.entrada || 0) < 4 || (fase === 'tarde' && !A.S.f.almorzo)) return;
    if (proxima == null) proxima = A.S.min + 12 + Math.random() * 18;
    if (A.S.min < proxima) return;
    hechasHoy[fase]++; proxima = null;
    M.modo = 'travesura'; M.travFase = 'corre'; M.trav = { T, t: 0, objs: new THREE.Group() };
    A.escena.scene.add(M.trav.objs);
  }
  function puertaPapa() {
    const E = A.escena, orden = ['comedor', 'pasillo', 'sala'];
    return orden.map((a) => E.puertas.find((q) => !q.salida && q.a === a)).find(Boolean) || E.puertas.find((q) => !q.salida);
  }
  function enPared(E, lado, u, off) {
    if (lado === 'atras') return [u, -E.d / 2 - off];
    if (lado === 'izq') return [-E.w / 2 - off, u];
    return [E.w / 2 + off, u];
  }
  function actualizarTravesura(dt) {
    const D = M.D, V = M.trav, T = V.T, E = A.escena;
    V.t += dt;
    V.total = (V.total || 0) + dt;
    const st = A.estado();
    if (V.total > 25 && !st.panel && !st.accion && M.travFase !== 'papaSale') { terminarTravesura(); return; }
    if (M.travFase === 'corre') {
      if (irHacia(D, T.x, T.z, 3.2, dt, 0.2) || V.t > 6) {
        M.travFase = 'hace'; V.t = 0;
        D.anim = 'feliz';
      }
      return;
    }
    if (M.travFase === 'hace') {
      if (V.t < 1.4) return;
      T.hace(V.objs, T.x, T.z);
      A.sfx('golpe');
      for (let i = 0; i < 12; i++) A.emitir(new THREE.Vector3(T.x + (Math.random() - 0.5) * 0.6, 0.2, T.z + (Math.random() - 0.5) * 0.6), '#c9b48a', new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.4, (Math.random() - 0.5) * 1.5), 0.7, 0.04, 3);
      A.avisar(`¡Oh no! ${nom()} ${T.que}.`, 'mal');
      A.bloquear('travesura', true);
      // llega papá
      const pu = puertaPapa();
      const fuera = enPared(E, pu.lado, pu.c, 0.35), dentro = enPared(E, pu.lado, pu.c, -1.0);
      V.quien = A.S.fase === 'tarde' ? 'Mamá' : 'Papá';
      const papa = V.quien === 'Mamá' ? A.crearMama() : A.crearPapa();
      papa.voz = V.quien === 'Mamá' ? 'mama' : 'papa';
      papa.root.position.set(fuera[0], 0, fuera[1]);
      E.scene.add(papa.root); E.npcs.push(papa);
      V.papa = papa; V.ruta = [dentro, [T.x + 0.9, T.z + 0.6]]; V.ri = 0; V.fuera = fuera;
      M.travFase = 'papaEntra'; V.t = 0;
      D.anim = 'quieto';
      return;
    }
    const papa = V.papa;
    if (M.travFase === 'papaEntra') {
      const [x, z] = V.ruta[V.ri];
      if (irHacia(papa, x, z, 1.5, dt, 0.08, true) || V.t > 6) { V.ri++; V.t = 0; if (V.ri >= V.ruta.length) { M.travFase = 'pregunta'; papa.anim = 'jarras'; preguntar(); } }
      else papa.anim = 'caminar';
      return;
    }
    if (M.travFase === 'pregunta') {
      const p = A.P.root.position;
      girar(papa, Math.atan2(p.x - papa.root.position.x, p.z - papa.root.position.z), dt, 5);
      // si se cerró el panel sin responder, papá vuelve a preguntar
      const st = A.estado();
      if (!st.panel && !st.accion && !V.eleccion) preguntar();
      return;
    }
    if (M.travFase === 'papaLimpia') {
      if (irHacia(papa, T.x + 0.5, T.z + 0.3, 1.5, dt, 0.1, true)) { papa.anim = 'agacharse'; V.limpia = (V.limpia || 0) + dt; if (V.limpia > 3) terminarTravesura(); }
      return;
    }
    if (M.travFase === 'papaSale') {
      if (irHacia(papa, V.fuera[0], V.fuera[1], 1.6, dt, 0.1, true) || (V.t += 0) > 8) {
        E.scene.remove(papa.root);
        const i = E.npcs.indexOf(papa); if (i >= 0) E.npcs.splice(i, 1);
        M.trav = null; M.travFase = null;
      }
    }
  }
  function preguntar() {
    const V = M.trav, T = V.T, n = nom(), papa = V.papa, yo = A.CFG.nombre;
    A.decir(papa, `¡${yo}! ${T.pregunta}`, 3.5);
    const limpiar = (ef, nota, fin) => ({
      ef, nota, min: 5, esfuerzo: false, progreso: 'Limpiando el desorden',
      pasos: [{ ruta: [[T.x + 0.35, T.z + 0.45]], mira: [T.x, T.z], anim: 'agacharse', dur: 3, min: 5, progreso: 'Limpiando el desorden' }],
      alTerminar: () => { fin(); terminarTravesura(); },
    });
    const Q = V.quien, q = Q.toLowerCase();
    A.abrirPanel({
      titulo: `${Q} encontró el desorden`, texto: `${Q}: "¡${yo}! ${T.pregunta} ¿Fuiste tú?" ${n} te mira con cara de culpable…`,
      opciones: [
        Object.assign({ texto: `Fui yo, ${q}. Perdón.` }, limpiar({ confianza: -4 }, `Cubres a ${n}. Ella te lo agradece, pero ${q} confía un poco menos en ti.`, () => {
          V.eleccion = 'cubrir';
          A.decir(papa, 'Mmm… bueno. Que no se repita.', 2.5);
          cambiarVinculo(8);
          A.anotar(`Cubriste a ${n}: le dijiste a ${q} que ${T.culpa}.`, '');
        })),
        Object.assign({ texto: `Fue ${n}… pero yo lo limpio.` }, limpiar({ confianza: 4 }, `Dices la verdad y te haces cargo. ${Q} valora eso.`, () => {
          V.eleccion = 'verdad';
          A.decir(papa, 'Gracias por decirme la verdad. Hay que enseñarle a portarse bien.', 3);
          A.habito('Decir la verdad y hacerte cargo');
          cambiarVinculo(2);
        })),
        {
          texto: `¡Fue ${n}, no yo!`, nota: `${Q} la regaña y limpia. ${n} se pone triste y ${q} pierde tiempo.`, min: 0, ef: { confianza: 1 }, anim: 'senalar', dur: 1.2, esfuerzo: false, progreso: `Señalando a ${n}`,
          alTerminar: () => {
            V.eleccion = 'acusar';
            A.decir(papa, `¡${n}! ¡Eso no se hace! … Bueno, yo lo limpio.`, 3);
            cambiarVinculo(-8); M.triste = 40;
            A.anotar(`Acusaste a ${n}. ${Q} tuvo que limpiar el desorden y perdió 10 minutos.`, 'mal');
            M.travFase = 'papaLimpia';
          },
        },
      ],
    }, null, true);
  }
  function terminarTravesura() {
    const V = M.trav;
    if (!V) return;
    A.escena.scene.remove(V.objs);
    A.bloquear('travesura', false);
    M.modo = 'sigue';
    if (V.eleccion === 'cubrir' && M.D) { M.D.anim = 'feliz'; M.D.salto = 0.55; A.sfx('ladrido'); }
    if (V.papa) { V.papa.anim = 'caminar'; M.travFase = 'papaSale'; } else { M.trav = null; M.travFase = null; }
  }
  // la travesura sigue actualizándose (papá saliendo) aunque Molly ya volvió a seguirte
  A.alActualizar((dt) => { if (M.trav && M.modo !== 'travesura' && M.travFase === 'papaSale') actualizarTravesura(dt); });

  // ---------- para el minimapa y el fútbol
  H.perro = {
    get D() { return M.D; },
    get modo() { return M.modo; },
    set modo(v) { M.modo = v; },
    get vinculo() { return vinculo; },
    cambiarVinculo,
    get necesidades() { return N; },
    silbar,
    get animo() { return animo; },
    get diasSinJugar() { return diasSinJugar; },
    get collar() { return LOOK.collar; },
    get ropa() { return LOOK.ropa; },
    ponerCollar,
    ponerRopa,
    cerrarDia,
    hacerTruco,
    cansar(e, c) { N.energia = Math.max(0, N.energia - e); N.comida = Math.max(0, N.comida - (c || 0)); },
    // para las pruebas: la próxima oportunidad hace una travesura
    forzarTravesura() { proxima = 0; faseTrav = A.S.fase; M.entrada = -99; hechasHoy = { manana: 0, tarde: 0 }; },
    ubicacion() {
      if (!activo()) return null;
      if (M.D) return { lugar: M.lugar, x: M.D.root.position.x, z: M.D.root.position.z };
      if (M.modo === 'espera' && M.esperaPos) return { lugar: M.esperaEn, x: M.esperaPos.x, z: M.esperaPos.z };
      if (M.modo === 'sigue' && M.lugar === 'mirador') return { lugar: 'jardin', x: 1.9, z: -2.4 };
      if (M.modo === 'casita') return { lugar: 'jardin', x: CASITA.x, z: CASITA.z };
      return { lugar: 'dormitorio', x: CAMA.x, z: CAMA.z };
    },
  };

  // un premio nuevo: se celebra en el juego y, si es un collar o ropita y no lleva nada, se lo pone
  if (H.premios) H.premios.alGanar((pz, origen) => {
    if (pz.tipo === 'collar' && !LOOK.collar) ponerCollar(pz.color);
    if (pz.tipo === 'ropa' && !LOOK.ropa) ponerRopa(pz.id);
    if (A.estado().jugando && origen !== 'estrellas' && origen !== 'sorpresa') A.banner('bien', `Premio para ${nom()}`, pz.nombre);
    A.evento('premio', { id: pz.id, origen });
  });
})();
