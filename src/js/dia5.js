/* Día 5 (viernes): la Feria del colegio.
   - La profesora la anuncia en el aula los días 2 y 3 (y la recuerda el viernes).
   - Días 2 (después del anuncio), 3 y 4: en tu cuarto hay un caballete con una cartulina.
     Ahí preparas tu trabajo (eliges el tema) en 1 o 2 sesiones, una por día.
   - Día 5, en el recreo, el patio se vuelve feria: stands de tus compañeros, el tuyo y mamá que vino a verte.
     Presentas: según lo que preparaste (y tu conocimiento) sale muy bien, bien o a medias. Nada es obligatorio.
   Se guarda en H.progreso: { feria: { semana, tema, avance, ultimoDia, anunciada, presentada, resultado } }. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.progreso) return;
  const A = H.motor.api;
  const { THREE, PI } = A;

  const TEMAS = {
    agua: { titulo: 'El ciclo del agua', corto: 'el ciclo del agua', idea: 'El sol calienta el mar, el agua sube, hace nubes y vuelve como lluvia.' },
    animales: { titulo: 'Animales del Perú', corto: 'los animales del Perú', idea: 'La llama vive en la sierra, el cóndor vuela alto y el delfín rosado nada en el río.' },
    solar: { titulo: 'El sistema solar', corto: 'el sistema solar', idea: 'Ocho planetas dan vueltas alrededor del sol. ¡La Tierra es el tercero!' },
  };
  const gx = (o, a) => (A.perfil && A.perfil.genero === 'nina' ? a : o);
  const nombre = () => (A.perfil && A.perfil.nombre) || 'Dani';
  const dia = () => H.progreso.cargar().dia || 1;
  const diaSemana = () => ((dia() - 1) % 7) + 1;
  const semana = () => Math.floor((dia() - 1) / 7);

  // la feria de esta semana (si es de otra semana, empieza de cero)
  function feria() {
    const f = H.progreso.cargar().feria;
    return f && f.semana === semana() ? f : { semana: semana(), tema: null, avance: 0 };
  }
  function guardar(cambios) { const f = Object.assign(feria(), cambios, { semana: semana() }); H.progreso.guardar({ feria: f }); return f; }

  // ---------- la cartulina dibujada (cambia con el avance)
  function dibujar(tema, avance, improvisada) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 384;
    const g = cv.getContext('2d');
    const circ = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill(); };
    if (improvisada) {
      // una hoja de cuaderno hecha a la carrera
      g.fillStyle = '#fbfaf4'; g.fillRect(0, 0, 512, 384);
      g.strokeStyle = '#a9c7e8'; g.lineWidth = 2;
      for (let y = 60; y < 384; y += 34) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
      g.fillStyle = '#3a3f4b'; g.font = 'bold 34px Trebuchet MS, sans-serif'; g.textAlign = 'center';
      g.fillText(tema ? TEMAS[tema].titulo : 'Mi trabajo', 256, 46);
      g.strokeStyle = '#3a3f4b'; g.lineWidth = 3;
      [[90, 140], [260, 210], [380, 130]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 34, 0, PI * 2); g.stroke(); });
      return new THREE.CanvasTexture(cv);
    }
    g.fillStyle = avance ? '#fff6dd' : '#ffffff'; g.fillRect(0, 0, 512, 384);
    if (!tema) return new THREE.CanvasTexture(cv);
    g.fillStyle = '#1d2340'; g.font = 'bold 40px Trebuchet MS, sans-serif'; g.textAlign = 'center';
    g.fillText(TEMAS[tema].titulo, 256, 52);
    if (avance < 1) return new THREE.CanvasTexture(cv);
    const lleno = avance >= 2;
    if (tema === 'agua') {
      g.fillStyle = '#3d9bd4'; g.fillRect(0, 300, 512, 84);
      circ(80, 120, 38, '#f2c14e');
      [[330, 110], [370, 100], [410, 115]].forEach(([x, y]) => circ(x, y, 30, '#dfe7ef'));
      if (lleno) {
        for (let i = 0; i < 7; i++) circ(340 + i * 14, 170 + (i % 3) * 30, 6, '#2f7fd1');
        g.strokeStyle = '#de5546'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(150, 280); g.quadraticCurveTo(180, 160, 290, 120); g.stroke();
        g.beginPath(); g.moveTo(420, 230); g.lineTo(420, 290); g.stroke();
      }
    } else if (tema === 'animales') {
      g.fillStyle = '#9bc96b'; g.fillRect(0, 280, 512, 104);
      circ(120, 230, 40, '#f4efe4'); circ(150, 170, 18, '#f4efe4');           // llama
      g.fillStyle = '#f4efe4'; g.fillRect(140, 175, 16, 50);
      circ(300, 120, 22, '#1d1612');                                          // cóndor
      g.fillStyle = '#1d1612'; g.fillRect(250, 112, 100, 12);
      if (lleno) {
        g.fillStyle = '#3d9bd4'; g.fillRect(330, 290, 182, 60);
        circ(420, 310, 22, '#f2a5b5');                                        // delfín rosado
        g.fillStyle = '#2aa876'; g.fillRect(30, 90, 20, 190); circ(40, 90, 40, '#2aa876');
      }
    } else {
      g.fillStyle = '#1d2340'; g.fillRect(0, 70, 512, 314);
      circ(70, 230, 56, '#f2c14e');
      const pl = [['#b0a89c', 8], ['#e9c48f', 11], ['#3d9bd4', 12], ['#de5546', 10], ['#e8893a', 26], ['#e9c48f', 22], ['#9fd0e8', 16], ['#4a6fd9', 15]];
      pl.slice(0, lleno ? 8 : 4).forEach(([c, r], i) => {
        if (lleno) { g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.beginPath(); g.arc(70, 230, 80 + i * 47, -0.5, 0.5); g.stroke(); }
        circ(150 + i * 47, 230, r, c);
      });
    }
    if (lleno) {
      // estrellitas y tu nombre
      [[30, 30], [480, 30], [480, 360]].forEach(([x, y]) => circ(x, y, 10, '#f26b2a'));
      g.fillStyle = tema === 'solar' ? '#f4f1ea' : '#1d2340'; g.font = '22px Trebuchet MS, sans-serif'; g.textAlign = 'right';
      g.fillText(`Por: ${nombre()}`, 496, 374);
    }
    return new THREE.CanvasTexture(cv);
  }
  // cartulina con su soporte (caballete en casa, panel en el stand)
  function cartulina(sc, x, y, z, ry, ancho, tex, alto) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto || ancho * 0.75), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(x, y, z); m.rotation.y = ry || 0;
    sc.add(m);
    return m;
  }

  // ---------- en casa: el caballete junto al escritorio
  const CAB = { x: 1.85, z: -3.0 };
  const preparando = () => [2, 3, 4].includes(diaSemana()) && (diaSemana() >= 3 || feria().anunciada);
  A.alConstruir((nombreEsc, E) => {
    if (nombreEsc !== 'dormitorio') return;
    const ds = diaSemana();
    if (ds < 2 || ds > 5) return;
    if (ds === 2 && !feria().anunciada) return;
    const sc = E.scene;
    // caballete
    [-0.38, 0.38].forEach((dx) => A.box(sc, 0.05, 1.5, 0.05, '#8a5a3b', CAB.x + dx, 0.75, CAB.z, { rx: -0.12 }));
    A.box(sc, 0.05, 1.5, 0.05, '#8a5a3b', CAB.x, 0.72, CAB.z + 0.18, { rx: 0.25 });
    A.box(sc, 0.9, 0.05, 0.08, '#8a5a3b', CAB.x, 0.62, CAB.z + 0.1);
    E.solido(CAB.x, CAB.z, 0.9, 0.4);
    let lamina = null;
    const pintar = () => {
      const f = feria();
      if (lamina) { sc.remove(lamina); lamina.material.map.dispose(); }
      lamina = cartulina(sc, CAB.x, 1.04, CAB.z + 0.12, 0, 0.82, dibujar(f.tema, f.avance));
      lamina.rotation.x = -0.12;
    };
    pintar();
    E.refrescos.push(pintar);
    E.inters.push(A.etiquetaInter('Cartulina de la feria', [CAB.x, -2.15], [CAB.x, CAB.z], 0.8, {
      activo: () => preparando(),
      abrir: abrirCartulina,
    }));
  });

  function sesion(texto, nota, tema, prog) {
    const f = feria();
    return {
      texto, nota, min: 40, esfuerzo: false,
      bloqueado: f.ultimoDia === dia() ? 'Hoy ya avanzaste. ¡Sigue mañana!' : A.S.energia < 15 ? 'Estás sin energía. Mejor descansa.' : null,
      pasos: [{ ruta: [[CAB.x, -2.15]], mira: [CAB.x, CAB.z], anim: 'cocinar', dur: 2.6, min: 40, progreso: prog }],
      ef: { motivacion: 4, energia: -6 },
      alTerminar: () => {
        const n = guardar({ tema, avance: Math.min(2, (feria().avance || 0) + 1), ultimoDia: dia() });
        A.refrescar();
        A.anotar(n.avance >= 2 ? `Terminaste tu cartulina de ${TEMAS[tema].corto} para la feria.` : `Empezaste tu trabajo de ${TEMAS[tema].corto} para la feria.`, 'bien');
        if (H.crecer) H.crecer.sumar('conocimiento', 3, 'preparaste tu trabajo');
        A.decir(A.P, n.avance >= 2 ? '¡Me quedó lindo! Ya está lista.' : '¡Ya empecé! Mañana la termino.', 2.6);
        A.evento('feriaPreparar', { tema, avance: n.avance });
      },
    };
  }
  function abrirCartulina() {
    const f = feria();
    if (!f.tema) {
      return {
        titulo: 'Cartulina de la feria',
        texto: 'El viernes es la Feria del colegio. ¿Sobre qué quieres hacer tu trabajo?',
        opciones: Object.keys(TEMAS).map((k) => sesion(TEMAS[k].titulo, TEMAS[k].idea, k, 'Dibujando tu cartulina')),
      };
    }
    if (f.avance < 2) {
      return {
        titulo: 'Cartulina de la feria', texto: `Tu trabajo de ${TEMAS[f.tema].corto} va por la mitad.`,
        opciones: [sesion('Terminar la cartulina', 'Pintas, pegas los dibujos y escribes lo que vas a decir.', f.tema, 'Terminando la cartulina')],
      };
    }
    return {
      titulo: 'Cartulina de la feria', texto: `¡Tu cartulina de ${TEMAS[f.tema].corto} está lista para el viernes!`,
      opciones: [{
        texto: 'Ensayar lo que vas a decir', nota: 'Practicas en voz alta. Te da seguridad.', min: 10, esfuerzo: false, ef: { animo: 4, motivacion: 3 },
        pasos: [{ ruta: [[CAB.x, -2.15]], mira: [CAB.x, CAB.z], anim: 'saludar', dur: 1.6, min: 10, progreso: 'Ensayando' }],
        alTerminar: () => A.decir(A.P, TEMAS[f.tema].idea, 3.5),
      }],
    };
  }

  // ---------- en el aula: la profesora la anuncia
  A.alConstruir((nombreEsc, E) => {
    if (nombreEsc !== 'aula') return;
    const ds = diaSemana();
    if (![2, 3, 5].includes(ds)) return;
    const antes = E.alEntrar;
    E.alEntrar = () => {
      if (antes) antes();
      const texto = ds === 5 ? '¡Hoy es la Feria del colegio! En el recreo los espero en el patio con sus trabajos.'
        : ds === 2 ? 'Una noticia: el viernes es la Feria del colegio. Preparen un trabajo en casa, ¡con mucho color!'
          : 'Recuerden: el viernes es la feria. ¿Ya empezaron su cartulina?';
      setTimeout(() => { if (E.profe && A.escena === E) A.decir(E.profe, texto, 4.5); }, 9500);
      if (!feria().anunciada) guardar({ anunciada: true });
    };
  });

  // ---------- el viernes: el patio es la feria
  const STANDS = [
    { x: -1.5, tema: 'Volcán de papel', color: '#de5546', ropa: '#2aa876', pelo: '#1d1612', piel: '#c98e6a' },
    { x: 0.6, mio: true },
    { x: 2.5, tema: 'Las plantas', color: '#2aa876', ropa: '#f2a623', pelo: '#6b3d22', piel: '#e3b48e' },
  ];
  const Z = -3.2;
  let F = null;   // la feria de hoy (escena, mamá, presentado)

  function letrero(sc, x, y, z, texto, color, w) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#fff'; g.font = 'bold 30px Trebuchet MS, sans-serif'; g.textAlign = 'center';
    g.fillText(texto, 128, 43);
    return cartulina(sc, x, y, z, 0, w || 1.2, new THREE.CanvasTexture(cv), (w || 1.2) / 4);
  }
  A.alConstruir((nombreEsc, E) => {
    if (nombreEsc !== 'patio' || diaSemana() !== 5) { if (nombreEsc !== 'patio') F = null; return; }
    const sc = E.scene, f = feria();
    F = { E, presentada: !!f.presentada, mama: null };
    // banderines
    const cols = ['#de5546', '#f2c14e', '#3d9bd4', '#2aa876', '#8f73cf'];
    for (let i = 0; i < 16; i++) A.box(sc, 0.18, 0.22, 0.02, cols[i % 5], -2.6 + i * 0.4, 2.35 - Math.abs(Math.sin(i * 0.4)) * 0.1, -3.85, { sombra: false, rz: 0.78 });
    letrero(sc, 0.5, 2.0, -3.9, 'Feria del colegio', '#8f73cf', 2.4);
    STANDS.forEach((s) => {
      A.box(sc, 1.3, 0.75, 0.6, '#f4f1ea', s.x, 0.375, Z);
      A.box(sc, 1.34, 0.06, 0.64, s.mio ? '#f2c14e' : s.color, s.x, 0.77, Z);
      E.solido(s.x, Z, 1.3, 0.6);
      if (s.mio) {
        const tex = f.avance ? dibujar(f.tema, f.avance) : dibujar(f.tema, 0, true);
        F.lamina = cartulina(sc, s.x, 1.35, Z - 0.28, 0, 1.0, tex);
        return;
      }
      // el trabajo del compañero
      if (s.tema === 'Volcán de papel') {
        const v = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.4, 10), new THREE.MeshLambertMaterial({ color: '#8a5a3b' }));
        v.position.set(s.x, 1.0, Z); sc.add(v);
        A.bola(sc, 0.07, '#f26b2a', s.x, 1.22, Z, 1);
      } else {
        [-0.35, 0, 0.35].forEach((dx, i) => { A.box(sc, 0.16, 0.14, 0.16, '#b0703a', s.x + dx, 0.87, Z); A.bola(sc, 0.12 + i * 0.03, '#2aa876', s.x + dx, 1.05 + i * 0.03, Z, 1); });
      }
      letrero(sc, s.x, 1.5, Z - 0.25, s.tema, s.color);
      const k = A.crearPersona({ escala: 0.72, cabezaGrande: true, piel: s.piel, pelo: s.pelo, camisa: s.ropa, pantalon: '#2e3d6b' });
      k.voz = 'nino';
      k.root.position.set(s.x + 0.45, 0, Z + 0.55);
      k.anim = 'saludar';
      sc.add(k.root); E.npcs.push(k);
    });
    // mamá vino a verte
    const m = A.crearMama();
    m.root.position.set(1.9, 0, -1.7);
    sc.add(m.root); E.npcs.push(m);
    F.mama = m;
    E.updates.push(() => { const a = m.root.position, p = A.P.root.position; m.root.rotation.y = Math.atan2(p.x - a.x, p.z - a.z); });

    E.inters.push(A.etiquetaInter('Stands de compañeros', [-1.5, -2.3], [-1.5, Z], 1.0, {
      activo: () => !F.vioStands,
      abrir: () => ({
        titulo: 'Los stands', texto: 'Tus compañeros muestran un volcán de papel y unas plantitas que crecieron en vasos.',
        opciones: [{
          texto: 'Recorrer los stands', nota: 'Miras, preguntas y aprendes algo nuevo.', min: 10, esfuerzo: false, ef: { animo: 5 }, anim: 'esperar',
          alTerminar: () => { F.vioStands = true; if (H.crecer) H.crecer.sumar('conocimiento', 2, 'aprendiste en la feria'); A.decir(A.P, '¡El volcán echa espuma de verdad!', 2.6); },
        }],
      }),
    }));
    E.inters.push(A.etiquetaInter('Tu stand', [0.6, -2.3], [0.6, Z], 1.0, {
      alto: 1.8,
      activo: () => !F.presentada,
      abrir: abrirStand,
    }));

    const antes = E.alEntrar;
    E.alEntrar = () => {
      if (antes) antes();
      setTimeout(() => {
        if (A.escena !== E) return;
        A.banner('bien', 'Viernes', '¡Feria del colegio!', 'Tu stand te espera en el patio');
        A.decir(m, `¡${nombre()}! Vine a verte. ¿Dónde está tu stand?`, 3.5);
      }, 3200);
    };
  });

  function resultado() {
    const f = feria();
    const conoc = H.crecer ? H.crecer.conocimiento : 0;
    const puntos = (f.avance || 0) * 2 + (conoc >= 50 ? 1 : 0);
    return puntos >= 4 ? 'muyBien' : puntos >= 2 ? 'bien' : 'aMedias';
  }
  function abrirStand() {
    const f = feria(), r = resultado();
    const tema = f.tema || 'agua';
    const textos = {
      muyBien: `Tu cartulina de ${TEMAS[tema].corto} se ve increíble. Mamá y tus compañeros se acercan a escucharte.`,
      bien: `Tu cartulina de ${TEMAS[tema].corto} quedó a medio pintar, pero sabes lo que vas a decir.`,
      aMedias: f.tema ? 'Tu cartulina está casi en blanco. Tendrás que improvisar.' : 'No preparaste nada… La profesora te da una hoja y unos plumones para improvisar.',
    };
    return {
      titulo: 'Tu stand', texto: textos[r],
      opciones: [{
        texto: r === 'aMedias' ? 'Improvisar tu presentación' : 'Presentar tu trabajo',
        nota: r === 'muyBien' ? 'Lo preparaste con tiempo: ¡a lucirte!' : r === 'bien' ? 'Lo hiciste en una sola sesión.' : 'Harás lo que puedas. Mamá igual está contigo.',
        min: 15, esfuerzo: false, anim: 'saludar',
        pasos: [{ ruta: [[0.6, -2.3]], mira: [1.9, -1.7], anim: 'saludar', dur: 2.4, min: 15, progreso: 'Presentando' }],
        alTerminar: () => presentar(r, tema),
      }],
    };
  }
  function presentar(r, tema) {
    if (!F) return;
    F.presentada = true;
    guardar({ presentada: true, resultado: r, gano: r === 'muyBien', tema: feria().tema || null });
    const ef = r === 'muyBien' ? { confianza: 12, animo: 12, motivacion: 8 } : r === 'bien' ? { confianza: 8, animo: 8, motivacion: 5 } : { confianza: 3, animo: 2 };
    A.cambiar(ef);
    if (H.crecer) H.crecer.sumar('conocimiento', r === 'muyBien' ? 8 : r === 'bien' ? 5 : 2, 'presentaste en la feria');
    const m = F.mama;
    if (r === 'muyBien') {
      A.habito('Preparar su trabajo con tiempo');
      A.anotar(`Presentaste ${TEMAS[tema].corto} en la feria. ¡Te salió muy bien!`, 'bien');
      A.decir(A.P, TEMAS[tema].idea, 3.5);
      setTimeout(() => m && A.decir(m, `¡Qué orgullosa estoy de ti, ${nombre()}! Lo explicaste clarito.`, 4), 3800);
      A.banner('bien', 'Feria del colegio', '¡Gran presentación!', 'Prepararte con tiempo valió la pena');
      A.sfx('logro');
    } else if (r === 'bien') {
      A.anotar(`Presentaste ${TEMAS[tema].corto} en la feria. Te salió bien.`, 'bien');
      A.decir(A.P, TEMAS[tema].idea, 3.5);
      setTimeout(() => m && A.decir(m, '¡Muy bien, mi amor! Con un día más te salía perfecto.', 4), 3800);
      A.sfx('bien');
    } else {
      A.anotar('En la feria improvisaste tu presentación. Salió a medias.', '');
      A.decir(A.P, `Eh… esto es… mi trabajo… ¡Estoy ${gx('nervioso', 'nerviosa')}!`, 2.6);
      setTimeout(() => m && A.decir(m, `Lo hiciste con valentía. La próxima lo preparamos juntos, ¿ya?`, 4), 3000);
    }
    A.evento('feria', { resultado: r, tema });
  }

  H.dia5 = { feria, resultado, TEMAS, get hoy() { return F; } };
})();
