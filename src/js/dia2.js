/* Día 2 (martes): un compañero nuevo.
   - En el aula la profesora presenta a Teo, que acaba de llegar al colegio.
   - En el recreo Teo está solo en una banca. Puedes acercarte e invitarlo a jugar fútbol,
     compartir tu merienda, solo saludarlo… o dejarlo tranquilo. Tú decides.
   - Si se hacen amigos se guarda (progreso.amigoTeo): los días siguientes con colegio Teo te saluda
     en el recreo y juega fútbol con tus amigos. Si no, sigue en su banca y todavía puedes acercarte. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.motor.nino || !H.progreso) return;
  const A = H.motor.api;
  const { PI } = A;

  const BANCA = { x: -4.0, z: 2.6 };
  const HABITO = 'Hacer un amigo nuevo';
  const nina = () => !!A.perfil && A.perfil.genero === 'nina';
  const gx = (o, a) => (nina() ? a : o);
  const nombre = () => (A.perfil && A.perfil.nombre) || 'Dani';
  const dia = () => H.progreso.cargar().dia;
  const esAmigo = () => H.progreso.cargar().amigoTeo === true;
  const hayColegio = () => { try { return A.diaDeHoy().colegio; } catch (e) { return true; } };
  // ¿Teo está en el colegio hoy? Llega el día 2 y desde ahí viene siempre
  const vieneHoy = () => dia() >= 2 && hayColegio();

  // estado de hoy (se reinicia cuando cambia el día)
  const T = { diaDe: 0, saludo: false, hablo: false, decidio: null, enPatio: false, P: null, modo: 'banca' };
  function hoy() {
    const d = dia();
    if (T.diaDe !== d) Object.assign(T, { diaDe: d, saludo: false, hablo: false, decidio: null, enPatio: false, nota: false });
    return T;
  }

  function crearTeo(camisa) {
    const t = A.crearPersona({ escala: 0.72, cabezaGrande: true, piel: '#d8a47f', pelo: '#2b1d14', camisa: camisa || '#f6f7f9', pantalon: '#2e3d6b' });
    t.voz = 'nino';
    return t;
  }

  // hacerse amigos: se guarda entre días; el logro solo el día que llegó
  function hacerseAmigos(como) {
    const ya = esAmigo();
    H.progreso.guardar({ amigoTeo: true });
    hoy().decidio = 'amigo';
    A.habito(HABITO);
    A.anotar(como, 'bien');
    if (!ya && dia() === 2 && H.logros && H.logros.lograr) H.logros.lograr('amigo-nuevo');
  }

  function opcionesTeo(E) {
    const st = hoy();
    const yaJugaste = A.S.f.jugo === 'si';
    const llueve = A.llueve !== undefined ? A.llueve : (!!A.perfil && A.perfil.clima === 'lluvia');
    const merienda = A.S.f.comioKiosco;
    const ops = [
      { texto: 'Invitarlo a jugar fútbol con tus amigos', nota: '¡Con él son más para el partido!', min: 15, ef: { animo: 12, energia: -10, motivacion: 6, confianza: 3 }, anim: 'patear', esfuerzo: false,
        bloqueado: llueve ? 'Está lloviendo: hoy el recreo es bajo techo.' : yaJugaste ? null : A.S.energia >= 35 ? null : `Estás muy ${gx('cansado', 'cansada')} para correr.`,
        alTerminar: () => {
          A.S.f.jugo = 'si';
          T.modo = 'juega';
          hacerseAmigos('Invitaste a Teo, el nuevo, a jugar fútbol. ¡Ahora es tu amigo!');
          A.decir(T.P, `¡Gracias, ${nombre()}! ¡Qué buen partido!`, 3);
        } },
      { texto: 'Compartir tu merienda con él', nota: merienda ? 'Le das la mitad de lo que compraste.' : '', min: 5, ef: { animo: 10, comida: -6, motivacion: 4, confianza: 3 }, anim: 'comer', prop: 'pan', esfuerzo: false,
        bloqueado: merienda ? null : 'No tienes merienda. Puedes comprar algo en el kiosco.',
        alTerminar: () => {
          hacerseAmigos('Compartiste tu merienda con Teo, el nuevo. ¡Ahora es tu amigo!');
          A.decir(T.P, `¡Gracias! Mañana yo te invito, ${nombre()}.`, 3);
        } },
    ];
    if (!st.hablo) ops.push({ texto: 'Solo saludarlo', nota: 'Un "hola" también cuenta.', min: 2, ef: { animo: 4 }, anim: 'saludar', dur: 1.2, esfuerzo: false,
      alTerminar: () => {
        st.hablo = true;
        A.anotar('Saludaste a Teo, el compañero nuevo.', '');
        A.decir(T.P, `Hola… Me llamo Teo. Gracias por saludarme.`, 3);
      } });
    ops.push({ texto: 'Mejor no, seguir con lo tuyo', nota: 'Teo se queda en la banca.', min: 0, ef: {}, anim: 'esperar', dur: 0.6, esfuerzo: false,
      alTerminar: () => { st.decidio = 'no'; } });
    return ops;
  }

  // ---------- el aula: Teo se sienta en la carpeta libre y la profesora lo presenta
  function enAula(E) {
    const teo = crearTeo();
    teo.root.position.set(0, 0, 2.72);
    teo.root.rotation.y = PI;
    teo.sentado = true;
    teo.anim = 'leer';
    E.scene.add(teo.root); E.npcs.push(teo);
    T.P = teo;
    if (dia() !== 2) return;
    const antes = E.alEntrar;
    E.alEntrar = () => {
      if (antes) antes();
      setTimeout(() => { if (A.escena === E) A.decir(E.profe, 'Chicos, les presento a Teo. Es nuevo: ¡denle la bienvenida!', 4); }, 4800);
      setTimeout(() => { if (A.escena === E) A.decir(teo, 'Hola… Soy Teo.', 2.6); }, 9200);
      A.anotar('Llegó un compañero nuevo a tu clase: Teo.', '');
    };
  }

  // ---------- el recreo
  function enPatio(E) {
    const st = hoy();
    st.enPatio = true;
    const amigo = esAmigo();
    const teo = crearTeo('#f2a623');
    T.P = teo;
    T.modo = amigo ? 'juega' : 'banca';
    if (amigo) { teo.anim = 'caminar'; teo.vel = 2; teo.root.position.set(3.2, 0, 2.1); }
    else { teo.sentado = true; teo.anim = 'quieto'; teo.root.position.set(BANCA.x, 0, BANCA.z); teo.root.rotation.y = PI / 2; }
    E.scene.add(teo.root); E.npcs.push(teo);

    E.updates.push((dt, t) => {
      const p = teo.root.position;
      if (T.modo !== 'juega') return;
      teo.sentado = false;
      // juega en la ronda con los amigos (ellos van en 0 y PI)
      const ang = t * 1.4 + PI / 2;
      const tx = 3.2 + Math.cos(ang) * 1.3, tz = 1.2 + Math.sin(ang) * 0.9;
      const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      if (d > 0.35) { const k = Math.min(1, 3 * dt / d); p.x += dx * k; p.z += dz * k; teo.root.rotation.y = Math.atan2(dx, dz); }
      else { p.set(tx, 0, tz); teo.root.rotation.y = Math.atan2(-Math.sin(ang) * 1.3, Math.cos(ang) * 0.9); }
      teo.anim = 'caminar'; teo.vel = 2;
      // si son amigos, te saluda cuando te acercas
      if (esAmigo() && !st.saludo && Math.hypot(A.P.root.position.x - p.x, A.P.root.position.z - p.z) < 2.6) {
        st.saludo = true;
        A.decir(teo, `¡Hola, ${nombre()}! ¡Ven, que falta uno!`, 3);
      }
    });

    E.inters.push(A.etiquetaInter('Teo', [BANCA.x + 1.3, BANCA.z], [BANCA.x, BANCA.z], 1.1, {
      alto: 1.5,
      rotulo: () => (dia() === 2 ? 'Teo, el nuevo' : 'Teo'),
      activo: () => T.modo === 'banca' && !hoy().decidio,
      abrir: () => ({
        titulo: dia() === 2 ? 'El compañero nuevo' : 'Teo',
        texto: dia() === 2
          ? 'Teo está solito en la banca. Mira cómo juegan los demás, pero no se anima a acercarse.'
          : 'Teo otra vez está solo en la banca. Todavía no tiene con quién jugar.',
        opciones: opcionesTeo(E),
      }),
    }));

    if (!amigo && dia() === 2) {
      const antes = E.alEntrar;
      E.alEntrar = () => { if (antes) antes(); setTimeout(() => { if (A.escena === E) A.avisar('Teo, el nuevo, está solo en la banca.'); }, 2600); };
    }
  }

  A.alConstruir((nombreEsc, E) => {
    if (!A.perfil || !vieneHoy()) return;
    const st = hoy();
    // al salir del recreo sin haber hablado con Teo el día que llegó, se anota (sin castigo)
    if (nombreEsc !== 'patio' && st.enPatio && dia() === 2 && !esAmigo() && !st.nota) {
      st.nota = true;
      A.anotar(st.hablo ? 'Saludaste a Teo, pero pasó el recreo solo.' : 'Teo, el nuevo, pasó el recreo solo en la banca.', '');
    }
    if (nombreEsc === 'aula') enAula(E);
    else if (nombreEsc === 'patio') enPatio(E);
  });

  H.dia2 = { get teo() { return T.P; }, get modo() { return T.modo; }, get estado() { return Object.assign({}, hoy()); }, esAmigo };
})();
