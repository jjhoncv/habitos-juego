/* Día 7 (domingo): la abuela viene a almorzar.
   - A las 11:00 suena el timbre: la abuela entra por la puerta del comedor y se sienta a la mesa.
   - Con ella puedes: saludarla y abrazarla, mostrarle cómo cuidas a la cachorrita, conversar,
     ayudar a poner la mesa y almorzar juntos (12:30–14:30).
   - En el almuerzo abre el diario: lee las estrellas de la semana, te dice algo cálido y concreto,
     te da un consejo para la semana que viene y un regalito.
   - A las 14:30 (o después del almuerzo, si es más tarde) se despide. Nada es obligatorio.
   - La decisión de papá ocurre al terminar el día (historia.js): aquí solo se prepara. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.motor.nino || !H.progreso) return;
  const A = H.motor.api;
  const { PI, THREE } = A;
  const h = (hh, mm) => hh * 60 + (mm || 0);
  const LLEGA = h(11), ALMUERZO = h(12, 30), SE_VA = h(14, 30);
  const ASIENTO = { x: 1.8, z: 1.52 }, PUERTA = { x: 3.6, z: -3.4 };
  const NOMBRES = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

  const hoy = () => H.progreso.cargar().dia === 7;
  const g = (o, a) => (A.perfil && A.perfil.genero === 'nina' ? a : o);
  const nom = () => (A.perfil ? A.perfil.nombre : 'Dani');
  const perrita = () => (A.perfil && A.perfil.mascota ? A.perfil.mascota.nombre : 'Molly');
  const F = () => A.S.f;
  // ¿la abuela está en la casa ahora?
  const presente = () => hoy() && !!F().d7_llego && !F().d7_seFue;

  const R = { npc: null, mesa: null, hablando: false };

  // ---------- la abuela en la escena
  function quitar(E) {
    if (!R.npc) return;
    E.scene.remove(R.npc.P.root);
    const i = E.npcs.indexOf(R.npc.P);
    if (i >= 0) E.npcs.splice(i, 1);
    R.npc = null;
  }
  function sentar(P) {
    P.root.position.set(ASIENTO.x, 0, ASIENTO.z);
    P.root.rotation.y = PI;
    P.sentado = true;
    P.anim = 'quieto';
  }
  function poner(E, caminando) {
    const P = A.crearAbuela();
    P.voz = 'abuela';
    if (caminando) {
      P.root.position.set(PUERTA.x, 0, PUERTA.z);
      P.anim = 'caminar';
      R.npc = { P, va: 'llega', ruta: [[3.1, -1.0], [3.0, 2.2], [1.8, 2.2], [ASIENTO.x, ASIENTO.z]], ri: 0 };
    } else {
      sentar(P);
      R.npc = { P, va: 'esta' };
    }
    E.scene.add(P.root); E.npcs.push(P);
  }
  function irse(E) {
    const n = R.npc;
    if (!n || n.va === 'sale') return;
    n.P.sentado = false; A.ponerProp(n.P, null);
    n.va = 'sale'; n.ruta = [[1.8, 2.2], [3.0, 2.2], [3.1, -1.0], [PUERTA.x, PUERTA.z - 0.6]]; n.ri = 0;
  }

  // la mesa puesta para cuatro (platos, vasos y una fuente al centro)
  function crearMesa(E) {
    const G = new THREE.Group();
    [[1.8, 0.95], [0.7, 0.25], [1.8, 0.25]].forEach(([x, z]) => {
      A.cil(G, 0.15, 0.1, 0.03, '#ffffff', x, 0.815, z);
      A.cil(G, 0.04, 0.035, 0.1, '#bfe3f2', x + 0.25, 0.85, z);
    });
    A.cil(G, 0.18, 0.15, 0.1, '#e0784a', 1.25, 0.85, 0.6);
    A.bola(G, 0.07, '#f2d16b', 1.22, 0.92, 0.58);
    A.bola(G, 0.06, '#7bbf5a', 1.3, 0.92, 0.64);
    G.visible = false;
    E.scene.add(G);
    return G;
  }

  // ---------- lo que dice el diario
  function leerSemana() {
    const pr = H.progreso.cargar();
    const dias = (pr.diario || []).filter((d) => d.dia >= 1 && d.dia <= 6);
    const total = H.progreso.totalEstrellas(pr);
    const lineas = [];
    if (!dias.length) {
      lineas.push('Mmm… tu diario está casi en blanco. No pasa nada, mi amor: siempre se puede empezar.');
    } else {
      lineas.push(`Veamos… esta semana juntaste ${total} ${total === 1 ? 'estrella' : 'estrellas'}.`);
      const mejores = dias.filter((d) => d.estrellas === 3);
      if (mejores.length >= 3) lineas.push(`¡Tuviste ${mejores.length} días de tres estrellas! Eso no lo logra cualquiera.`);
      else if (mejores.length) lineas.push(`El ${NOMBRES[mejores[0].dia]} brillaste: ¡tres estrellas! Me puse muy orgullosa.`);
      else {
        const mejor = dias.reduce((a, b) => (b.estrellas > a.estrellas ? b : a));
        lineas.push(mejor.estrellas
          ? `Tu mejor día fue el ${NOMBRES[mejor.dia]}. Ahí se nota que le pusiste ganas.`
          : 'Fue una semana difícil, ¿no? A mí también me pasa. Lo importante es no rendirse.');
      }
    }
    // la cachorrita siempre se queda: las estrellas desbloquean premios para ella (H.premios)
    const sig = H.premios && H.premios.siguiente ? H.premios.siguiente() : null;
    if (sig && sig.faltan <= 3) lineas.push(`Si hoy cumples tus metas, ¡${perrita()} gana un premio: ${sig.nombre.toLowerCase()}!`);
    else lineas.push(`Cada estrella cuenta: tus estrellas desbloquean premios para ${perrita()}.`);
    lineas.push(...recuerdos(pr));
    if (F().perroComio) lineas.push(`Y hoy ${perrita()} ya comió: se le ve feliz contigo.`);
    return lineas;
  }
  // lo que pasó en la semana (lo guardan los eventos de otros días, si existen)
  function recuerdos(pr) {
    const out = [];
    const teo = pr.amigoTeo;
    if (teo) out.push(`Me contaron que hiciste un amigo nuevo${teo.nombre && teo.nombre !== 'Teo' ? `, ${teo.nombre}` : ', Teo'}. ¡Qué lindo es tener amigos!`);
    const vet = pr.veterinario || pr.vet;
    if (vet && vet.fue !== false) out.push(`Y que llevaste a ${perrita()} al veterinario. Cuidar su salud es de ${g('niño grande', 'niña grande')}.`);
    const feria = pr.feria;
    if (feria && (feria.resultado || feria.presentada || feria.premio || feria.gano)) out.push(feria.premio || feria.gano ? '¡Y en la feria del colegio te fue increíble! Guardé tu cinta en mi corazón.' : 'También me contaron de tu proyecto en la feria del colegio. ¡Qué valiente, presentarlo frente a todos!');
    const parque = pr.parque;
    if (parque && parque.fue !== false) out.push(`Y ayer fueron al parque. A ${perrita()} le encanta correr al aire libre, ¿verdad?`);
    return out.slice(0, 3);
  }
  // el consejo: lo que más le costó en la semana
  function consejo() {
    const pr = H.progreso.cargar();
    const dias = (pr.diario || []).filter((d) => d.dia >= 1 && d.dia <= 6 && Array.isArray(d.metas));
    const C = {
      dormir: 'Acuéstate temprano: dormir bien te da energía para todo.',
      cuarto: 'Ordena un poquito cada día, así no se te junta todo.',
      comer: 'Come tus tres comidas, aunque estés jugando. La barriga también importa.',
      colegio: 'Deja tu mochila lista en la noche y el bus no se te escapa.',
      perro: `Dale de comer a ${perrita()} apenas te levantes: ella te espera.`,
    };
    const faltas = {};
    dias.forEach((d) => Object.keys(C).forEach((k) => {
      const aplica = k !== 'colegio' && k !== 'cuarto' ? true : !H.progreso.esFinde(d.dia);
      if (aplica && !d.metas.includes(k)) faltas[k] = (faltas[k] || 0) + 1;
    }));
    const peor = Object.keys(faltas).sort((a, b) => faltas[b] - faltas[a])[0];
    return peor ? `Un consejo para la semana que viene: ${C[peor].charAt(0).toLowerCase()}${C[peor].slice(1)}` : 'Un consejo para la semana que viene: sigue así. Un poquito cada día hace grandes cosas.';
  }

  // ---------- la abuela habla (una línea tras otra)
  function hablar(lineas, alTerminar) {
    R.hablando = true;
    A.bloquear('dia7', true);
    let i = 0;
    const sig = () => {
      const n = R.npc;
      if (i >= lineas.length || !n) {
        R.hablando = false; A.bloquear('dia7', false);
        if (alTerminar) alTerminar();
        return;
      }
      const t = lineas[i++], seg = 1.6 + t.length * 0.06;
      A.decir(n.P, t, seg + 0.2);
      setTimeout(sig, seg * 1000);
    };
    sig();
  }

  // ---------- el almuerzo con la abuela
  function opAlmuerzo() {
    return {
      texto: 'Almorzar con la abuela', nota: 'Ají de gallina, su receta. Después abre tu diario.',
      min: 30, ef: { energia: 40, comida: 55, agua: 15, salud: 5, animo: 10, motivacion: 10 }, esfuerzo: false,
      pasos: [{ ruta: [[0.7, 2.3], [0.7, 1.52]], mira: [0.7, 0.6], anim: 'comer', sentado: true, dur: 6, min: 30, prop: 'cuchara', progreso: 'Almorzando con la abuela' }],
      alTerminar: () => {
        F().almorzo = 'bien';
        F().d7_almuerzo = true;
        if (R.mesa) R.mesa.visible = true;
        A.habito('Almorzar en familia');
        A.anotar('Almorzaste con la abuela y la familia.', 'bien');
        A.refrescar();
        diario();
      },
    };
  }
  function diario() {
    const n = R.npc;
    if (!n) return;
    n.P.anim = 'leer'; A.ponerProp(n.P, 'libro');
    const lineas = ['¿Me prestas tu diario? Quiero ver cómo te fue.'].concat(leerSemana(), [consejo()]);
    hablar(lineas, () => {
      if (R.npc) { R.npc.P.anim = 'entregar'; A.ponerProp(R.npc.P, 'regalo'); }
      F().d7_diario = true;
      A.anotar('La abuela leyó tu diario y te dio un consejo para la semana que viene.', 'bien');
      A.abrirPanel({
        titulo: 'Un regalito de la abuela',
        texto: `Abuela: "Te traje algo. Elige tú: un collar nuevo para ${perrita()} o un libro de cuentos para ti."`,
        opciones: [
          { texto: `El collar para ${perrita()}`, nota: 'Rojo, con una plaquita con su nombre.', min: 1, ef: { animo: 8 }, anim: 'saludar', dur: 1, esfuerzo: false,
            alTerminar: () => regalo('collar') },
          { texto: 'El libro de cuentos', nota: 'Para leer antes de dormir.', min: 1, ef: { animo: 8 }, anim: 'saludar', dur: 1, prop: 'libro', esfuerzo: false,
            alTerminar: () => regalo('libro') },
        ],
      }, null, true);
    });
  }
  function regalo(cual) {
    F().d7_regalo = cual;
    H.progreso.guardar({ regaloAbuela: cual });
    if (cual === 'collar' && H.premios) H.premios.dar('collar-rojo', 'abuela');
    if (cual === 'collar' && H.perro && H.perro.ponerCollar) H.perro.ponerCollar('#de5546');
    if (cual === 'collar' && H.perro && H.perro.D) { H.perro.D.anim = 'feliz'; H.perro.D.salto = 0.55; A.sfx('ladrido'); }
    A.banner('bien', 'Regalo de la abuela', cual === 'collar' ? `Un collar nuevo para ${perrita()}` : 'Un libro de cuentos');
    A.anotar(cual === 'collar' ? `La abuela le regaló un collar nuevo a ${perrita()}.` : 'La abuela te regaló un libro de cuentos.', 'bien');
    if (H.logros && H.logros.lograr) H.logros.lograr('abuela');
    if (R.npc) { A.ponerProp(R.npc.P, null); R.npc.P.anim = 'quieto'; }
    hablar([
      cual === 'collar' ? `Le va a quedar precioso a ${perrita()}.` : 'Los cuentos más lindos se leen antes de dormir.',
      `Mañana vemos qué premios ganó ${perrita()} con tus estrellas. Yo estoy muy orgullosa de ti.`,
      'Esta noche duerme a buena hora, ¿ya?',
    ]);
  }

  // ---------- lo que puedes hacer con ella
  function panelAbuela() {
    const f = F(), ops = [];
    if (!f.d7_abrazo) ops.push({
      texto: 'Saludarla y darle un abrazo', nota: 'Hace una semana que no la ves.', min: 2, ef: { animo: 8, confianza: 3 }, anim: 'saludar', dur: 1.4, esfuerzo: false, progreso: 'Abrazando a la abuela',
      alTerminar: () => {
        f.d7_abrazo = true;
        tiempoConAbuela();
        if (R.npc) { R.npc.P.anim = 'saludar'; setTimeout(() => { if (R.npc && R.npc.va === 'esta') R.npc.P.anim = 'quieto'; }, 1600); }
        A.decir(R.npc && R.npc.P, `¡Mi ${g('nieto', 'nieta')} ${g('lindo', 'linda')}! ¡Cada semana estás más grande!`, 3);
      },
    });
    if (!f.d7_perro) {
      const D = H.perro && H.perro.D;
      ops.push({
        texto: `Mostrarle cómo cuidas a ${perrita()}`, nota: `${perrita()} se pondrá feliz de verla.`, min: 5, ef: { animo: 6, confianza: 4 }, anim: 'senalar', dur: 1.6, esfuerzo: false, progreso: `Mostrándole a ${perrita()}`,
        bloqueado: D ? null : `${perrita()} no está aquí. Llámala con el silbato.`,
        alTerminar: () => {
          f.d7_perro = true;
          tiempoConAbuela();
          const P = H.perro && H.perro.D;
          if (P) { P.anim = 'feliz'; P.salto = 0.55; A.sfx('ladrido'); }
          if (H.perro && H.perro.cambiarVinculo) H.perro.cambiarVinculo(3);
          const v = H.perro ? H.perro.vinculo : 0;
          A.decir(R.npc && R.npc.P, f.perroComio
            ? `¡Mira cómo te sigue ${perrita()}! Le diste de comer, se nota que te quiere.`
            : `¡Hola, ${perrita()}! ${v >= 50 ? 'Se nota que te quiere mucho.' : 'Creo que tiene hambrecita, ¿ya comió?'}`, 3.5);
        },
      });
    }
    if (!f.d7_charla) ops.push({
      texto: 'Contarle cómo te fue en la semana', nota: 'A la abuela le encanta escucharte.', min: 10, ef: { animo: 6, motivacion: 6 }, anim: 'quieto', dur: 2.5, esfuerzo: false, progreso: 'Conversando con la abuela',
      alTerminar: () => {
        f.d7_charla = true;
        tiempoConAbuela();
        A.decir(R.npc && R.npc.P, 'Cuando yo tenía tu edad, también tenía un perrito. Se llamaba Chispa.', 3.5);
      },
    });
    if (A.S.min >= ALMUERZO && !f.almorzo) ops.push(opAlmuerzo());
    const txt = f.d7_almuerzo ? 'Abuela: "Qué rico almorzamos. Gracias por este domingo tan lindo."'
      : A.S.min >= ALMUERZO ? 'Abuela: "¡Qué hambre! ¿Almorzamos juntos?"'
        : `Abuela: "Vine a almorzar con ustedes. ${f.d7_mesa ? 'Gracias por poner la mesa.' : '¿Me ayudas a poner la mesa más tarde?'}"`;
    return { titulo: 'La abuela', texto: txt, opciones: ops };
  }
  function tiempoConAbuela() {
    if (F().d7_habito) return;
    F().d7_habito = true;
    A.habito('Pasar tiempo con la abuela');
    A.anotar('Pasaste un rato con la abuela.', 'bien');
  }

  // ---------- construir: la abuela se queda en el comedor
  A.alConstruir((nombre, E) => {
    R.npc = null; R.mesa = null;
    if (!hoy() || nombre !== 'comedor' || !A.perfil || A.S.fase === 'prologo' || A.estado().cine) return;
    R.mesa = crearMesa(E);
    R.mesa.visible = !!F().d7_mesa || !!F().d7_almuerzo;
    if (presente()) poner(E, false);
    E.inters.unshift(A.etiquetaInter('Abuela', [1.8, 2.35], [1.8, 1.52], 0.8, {
      activo: () => !!R.npc && R.npc.va === 'esta' && !R.hablando,
      abrir: panelAbuela,
    }));
    E.inters.push(A.etiquetaInter('Poner la mesa', [-0.7, -2.75], [-0.7, -3.6], 0.7, {
      activo: () => presente() && !F().d7_mesa && !F().d7_almuerzo,
      abrir: () => ({
        titulo: 'Poner la mesa', texto: 'Hoy somos cuatro: mamá, papá, la abuela y tú.',
        opciones: [{
          texto: 'Poner los platos y los vasos', nota: 'La abuela se va a dar cuenta.', min: 6, ef: { confianza: 5, animo: 3 },
          pasos: [
            { anim: 'cocinar', dur: 1.0, min: 1, prop: 'plato', progreso: 'Sacando los platos' },
            { ruta: [[-0.7, -1.6], [2.75, -0.9], [2.75, 0.6]], mira: [1.2, 0.6], anim: 'agacharse', dur: 1.4, min: 5, progreso: 'Poniendo la mesa',
              alTerminar: () => { F().d7_mesa = true; if (R.mesa) R.mesa.visible = true; A.ponerProp(A.P, null); } },
          ],
          alTerminar: () => {
            A.habito('Ayudar a poner la mesa');
            A.anotar('Pusiste la mesa para el almuerzo con la abuela.', 'bien');
            A.decir(R.npc && R.npc.P, `¡Qué ${g('acomedido', 'acomedida')}! Así da gusto venir.`, 2.8);
          },
        }],
      }),
    }));
    // la mesa del almuerzo de siempre: si la abuela está, se almuerza con ella
    const alm = E.inters.find((i) => i.nombre === 'Almuerzo');
    if (alm) {
      const abrir = alm.abrir;
      alm.abrir = () => (R.npc && R.npc.va === 'esta' && !F().almorzo
        ? { titulo: 'El almuerzo del domingo', texto: 'La abuela ya está sentada. Huele a ají de gallina.', opciones: [opAlmuerzo()] }
        : abrir());
    } else {
      // en la mañana (12:30–13:00) todavía no está la mesa del almuerzo del motor
      E.inters.unshift(A.etiquetaInter('Almuerzo', [0.7, 2.3], [0.7, 0.6], 1.2, {
        activo: () => !!R.npc && R.npc.va === 'esta' && A.S.min >= ALMUERZO && !F().almorzo && !R.hablando,
        abrir: () => ({ titulo: 'El almuerzo del domingo', texto: 'La abuela ya está sentada. Huele a ají de gallina.', opciones: [opAlmuerzo()] }),
      }));
    }
  });

  // ---------- cada cuadro: llega, camina, se va
  A.alActualizar((dt) => {
    const E = A.escena, st = A.estado();
    if (!E || !st.jugando || !hoy() || !A.perfil) return;
    const f = F();
    // llega a las 11:00: suena el timbre
    if (!f.d7_llego && A.S.min >= LLEGA && A.S.min < SE_VA) {
      f.d7_llego = true;
      A.sfx('timbre');
      if (E.nombre === 'comedor') {
        poner(E, true);
        A.avisar('¡Ding dong! Suena el timbre… ¡Llegó la abuela!', 'bien');
      } else A.avisar('¡Ding dong! ¡Llegó la abuela! Está en el comedor.', 'bien');
      A.anotar('La abuela llegó de visita para el almuerzo del domingo.', '');
    }
    // se va a las 14:30 (si no está en medio de algo contigo)
    if (presente() && A.S.min >= SE_VA && !R.hablando && !st.accion && !st.panel) {
      f.d7_seFue = true;
      if (!f.d7_habito) A.anotar('La abuela se fue sin que pasaras un rato con ella.', '');
      if (R.npc) {
        A.decir(R.npc.P, `¡Chau, mi amor! Cuida mucho a ${perrita()}.`, 3);
        irse(E);
      } else A.avisar(`La abuela se despidió desde la puerta: "¡Chau, ${nom()}! Nos vemos pronto."`);
    }
    const n = R.npc;
    if (!n) return;
    n.P.root.visible = !st.visita;
    if (n.va === 'llega' || n.va === 'sale') {
      const p = n.P.root.position, [tx, tz] = n.ruta[n.ri];
      const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      if (d < 0.08) {
        n.ri++;
        if (n.ri < n.ruta.length) return;
        if (n.va === 'sale') { quitar(E); return; }
        n.va = 'esta'; sentar(n.P);
        A.decir(n.P, `¡Hola, familia! ¿Dónde está ${g('mi nieto favorito', 'mi nieta favorita')}?`, 3);
        return;
      }
      const k = Math.min(1, 1.3 * dt / d);
      p.x += dx * k; p.z += dz * k;
      n.P.root.rotation.y = Math.atan2(dx, dz);
      n.P.anim = 'caminar';
      return;
    }
    // te saluda la primera vez que te acercas
    const yo = A.P.root.position, q = n.P.root.position;
    if (!f.d7_saludo && !R.hablando && Math.hypot(yo.x - q.x, yo.z - q.z) < 2.2) {
      f.d7_saludo = true;
      A.decir(n.P, `¡${nom()}! Ven, dame un abrazo.`, 2.8);
    }
  });

  H.dia7 = {
    get abuela() { return R.npc ? R.npc.P : null; },
    presente,
    leerSemana,
    consejo,
  };
})();
