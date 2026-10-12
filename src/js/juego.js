/* Motor del prototipo de hábitos: una mañana en 3D (dormitorio, pasillo, baño, comedor).
   window.MODO_JUEGO = 'adulto' | 'nino' decide el personaje y las reglas. */
(function () {
  'use strict';

  const NINO = window.MODO_JUEGO === 'nino';
  const PI = Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const hora = (m) => { m = Math.floor(m); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const $ = (s) => document.querySelector(s);
  const RITMO = window.MODO_JUEGO === 'nino' ? 0.2 : 0.3; // minutos de juego por segundo real mientras caminas

  // ---------------------------------------------------------------- configuración
  // sábado y domingo (días 6 y 7 de la semana) no hay colegio: la mañana es en casa hasta el almuerzo
  const FINDE = NINO && (() => {
    try { const pr = window.Habitos && window.Habitos.progreso && window.Habitos.progreso.cargar(); return !!pr && (pr.dia - 1) % 7 >= 5; } catch (e) { return false; }
  })();
  const CFG = NINO ? (FINDE ? {
    meta: 'para el almuerzo', urg: 'Se acaba la mañana',
    nombre: 'Dani', inicio: 8 * 60, limite: 12 * 60 + 30,
    salida: 'Hoy no hay colegio. El almuerzo es a las 12:30',
    stats: { energia: 60, comida: 45, agua: 50, bano: 40, salud: 85, higiene: 45, animo: 70, motivacion: 50, confianza: 50 },
    piel: '#e3b48e', pelo: '#5a3a22', escala: 0.74,
  } : {
    meta: 'para el bus', urg: 'El bus no espera',
    // 80 minutos en la mañana: alcanza para tus cosas y un rato de juego, si te organizas
    nombre: 'Dani', inicio: 6 * 60 + 30, limite: 7 * 60 + 50,
    salida: 'El bus del colegio pasa a las 07:50',
    stats: { energia: 50, comida: 40, agua: 50, bano: 40, salud: 85, higiene: 45, animo: 60, motivacion: 45, confianza: 50 },
    piel: '#e3b48e', pelo: '#5a3a22', escala: 0.74,
  }) : {
    meta: 'para salir', urg: 'Se acaba el tiempo',
    nombre: 'Andrés', inicio: 6 * 60 + 30, limite: 7 * 60 + 30,
    salida: 'Tienes que salir al trabajo a las 07:30',
    stats: { energia: 45, salud: 80, higiene: 40, animo: 55, motivacion: 40, dinero: 140 },
    piel: '#d29f78', pelo: '#2b1d14', escala: 1,
  };

  CFG.desayunoHasta = FINDE ? 9 * 60 : CFG.limite - 15;

  // perfil elegido en el creador de personaje (solo modo niño; ver perfil.js)
  let PERFIL = NINO && window.Habitos && window.Habitos.perfil ? window.Habitos.perfil.cargar() : null;
  if (PERFIL) CFG.nombre = PERFIL.nombre;
  const gx = (o, a) => (PERFIL && PERFIL.genero === 'nina' ? a : o);
  const invierno = () => !!PERFIL && PERFIL.estacion === 'invierno';
  const lluvia = () => !!PERFIL && PERFIL.clima === 'lluvia';
  const ESTATURA = { baja: 0.93, media: 1, alta: 1.07 };
  const CONTEXTURA = { delgada: 0.86, normal: 1, robusta: 1.16 };

  const S = Object.assign({ min: CFG.inicio, dinero: 0 }, CFG.stats, {
    f: {
      cama: false, planchado: false, zapatos: false, ropaSucia: false, lavadora: false,
      vestido: null, dientes: false, cara: false, ducha: null, desayuno: null,
      platos: false, platosDesayuno: false, comidaEnMesa: false, limpieza: false,
      juguetes: false, mochila: false, tropezo: false, snooze: 0, buscoZapato: false,
      platoLlevado: false, avisoBus: false, mamaSaludo: false,
    },
    habitos: [], malos: [],
    fase: 'manana', diario: [], nota: null, metas: {},
  });

  const ETIQ = { comida: 'Comida', agua: 'Agua', bano: 'Baño', energia: 'Energía', salud: 'Salud', higiene: 'Higiene', animo: 'Ánimo', motivacion: 'Motivación', dinero: 'S/', confianza: 'Confianza' };
  const LISTA_STATS = [['energia', 'Energía', 'var(--sol)'], ['salud', 'Salud', 'var(--menta)'], ['higiene', 'Higiene', 'var(--cielo)'], ['animo', 'Ánimo', 'var(--lila)']];
  if (NINO) LISTA_STATS.splice(1, 0, ['comida', 'Comida', '#e8893a'], ['agua', 'Agua', '#2fb5d6'], ['bano', 'Baño', '#b08a4a']);
  LISTA_STATS.push(['motivacion', 'Motivación', '#f26b2a']);
  if (NINO) LISTA_STATS.push(['confianza', 'Confianza', 'var(--coral)']);
  const COLOR = { comida: '#e8893a', agua: '#2fb5d6', bano: '#b08a4a', energia: 'var(--sol)', salud: 'var(--menta)', higiene: 'var(--cielo)', animo: 'var(--lila)', motivacion: '#f26b2a', confianza: 'var(--coral)', dinero: '#d9a520' };
  const ESTADOS = {
    energia: ['Agotado', 'Cansado', 'Bien', 'Con todo'],
    comida: ['Muerto de hambre', 'Con hambre', 'Satisfecho', 'Lleno'],
    agua: ['Con mucha sed', 'Con sed', 'Bien', 'Hidratado'],
    bano: ['¡Me hago!', 'Con ganas', 'Tranquilo', 'Tranquilo'],
    salud: ['Enfermo', 'Débil', 'Sano', 'Fuerte'],
    higiene: ['Huele mal', 'Descuidado', 'Limpio', 'Impecable'],
    animo: ['Triste', 'Desganado', 'Contento', 'Feliz'],
    confianza: ['Molestos', 'Normal', 'Confían', 'Orgullosos'],
    motivacion: ['Sin ganas', 'Con flojera', 'Con ganas', 'A tope'],
  };
  const FEMENINO = { Hidratado: 'Hidratada', Tranquilo: 'Tranquila', 'Muerto de hambre': 'Muerta de hambre', Satisfecho: 'Satisfecha', Lleno: 'Llena', Agotado: 'Agotada', Cansado: 'Cansada', Enfermo: 'Enferma', Sano: 'Sana', Descuidado: 'Descuidada', Limpio: 'Limpia', Desganado: 'Desganada', Contento: 'Contenta' };
  const estadoDe = (id, v) => { const w = ESTADOS[id][v < 30 ? 0 : v < 55 ? 1 : v < 80 ? 2 : 3]; return gx(w, FEMENINO[w] || w); };
  const ICONOS = {
    agua: '<svg viewBox="0 0 24 24"><path d="M5 3h14l-2 18H7z" opacity=".35"/><path d="M6.2 10h11.6L16.8 21H7.2z"/></svg>',
    bano: '<svg viewBox="0 0 24 24"><path d="M6 2h5v8H6z"/><path d="M4 11h16c0 4-3 6.5-6 7l1 4H8l1-4c-3-.5-5-3-5-7z"/></svg>',
    comida: '<svg viewBox="0 0 24 24"><path d="M12 7c-1-2-3-3-5-2.5S3 8 4 12s3.5 9 6 9c1 0 1.4-.6 2-.6s1 .6 2 .6c2.5 0 5-5 6-9s-1-7-3-7.5-4 .5-5 2.5z"/><path d="M12 7c0-2 1-4 3-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    energia: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
    salud: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-9C.8 8.4 3 4 7 4c2.2 0 3.6 1.2 5 3 1.4-1.8 2.8-3 5-3 4 0 6.2 4.4 4.5 8-2.5 4.5-9.5 9-9.5 9z"/></svg>',
    higiene: '<svg viewBox="0 0 24 24"><path d="M12 2s-7 8-7 13a7 7 0 0014 0c0-5-7-13-7-13z"/></svg>',
    animo: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2a10 10 0 100 20 10 10 0 000-20zM8.5 8a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm7 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM6.5 13.5h11a5.5 5.5 0 01-11 0z"/></svg>',
    motivacion: '<svg viewBox="0 0 24 24"><path d="M12 2c1 4 5.5 5.5 5.5 11.5a5.5 5.5 0 01-11 0c0-2.8 1.3-4.5 2.7-5.6.2 2.2 1.1 3.3 2.2 3.8C11 9 10.4 5.5 12 2z"/></svg>',
    confianza: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/></svg>',
    dinero: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><text x="12" y="16.5" text-anchor="middle" font-size="12" font-weight="900" font-family="sans-serif" fill="#7a5a00">S/</text></svg>',
    estrella: '<svg viewBox="0 0 24 24"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21.1l1.5-7L2 9.3l7-.8z"/></svg>',
    roto: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-9C.8 8.4 3 4 7 4c2 0 3.4 1 4.6 2.5L10 10l3 2-2 4 4-5-3-2 1.4-2.6C14.6 5 15.6 4 17 4c4 0 6.2 4.4 4.5 8-2.5 4.5-9.5 9-9.5 9z"/></svg>',
    reloj: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5h-2v6l5 3 1-1.7-4-2.3z"/></svg>',
    sonido: '<svg viewBox="0 0 24 24"><path d="M3 9h4l5-4v14l-5-4H3z"/><path d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    mudo: '<svg viewBox="0 0 24 24"><path d="M3 9h4l5-4v14l-5-4H3z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };
  // [tarea, ¿hecha?, minutos que toma, nota de lo que pasa si no la haces]
  let TAREAS = NINO && FINDE ? [
    ['Tender tu cama', () => S.f.cama, 5], ['Guardar tus juguetes', () => S.f.juguetes, 4, 'si no, te tropiezas'],
    ['Lavarte los dientes', () => S.f.dientes, 3], ['Bañarte', () => S.f.ducha === 'bien', 8], ['Vestirte', () => !!S.f.vestido, 4],
    ['Desayunar con la familia', () => S.f.desayuno === 'bueno', 15, 'en la mesa del comedor, hasta las 09:00'],
    ['Regar las plantas de mamá', () => !!S.f.riego, 5, 'en el jardín'], ['Jugar fútbol con tu cachorro', () => !!S.f.jugoPerro, 15, 'en el jardín'],
  ] : NINO ? [
    ['Tender tu cama', () => S.f.cama, 5], ['Guardar tus juguetes', () => S.f.juguetes, 4, 'si no, te tropiezas'], ['Alistar la mochila', () => S.f.mochila, 5, 'si no, olvidas la tarea'],
    ['Lavarte los dientes', () => S.f.dientes, 3], ['Bañarte', () => S.f.ducha === 'bien', 8], ['Ponerte el uniforme', () => !!S.f.vestido, 4, 'obligatorio para salir'],
    ['Desayunar con la familia', () => S.f.desayuno === 'bueno', 15, 'en la mesa del comedor, hasta las 07:35'],
  ] : [
    ['Tender la cama', () => S.f.cama, 5], ['Planchar la ropa', () => S.f.planchado, 10], ['Ordenar los zapatos', () => S.f.zapatos, 2, 'si no, pierdes 6 min buscando'],
    ['Recoger la ropa sucia', () => S.f.ropaSucia, 3], ['Lavarte los dientes', () => S.f.dientes, 3], ['Ducharte', () => S.f.ducha === 'bien', 10],
    ['Vestirte con ropa planchada', () => S.f.vestido === 'limpia', 4, 'obligatorio vestirse para salir'], ['Desayunar bien', () => S.f.desayuno === 'bueno', 22],
    ['Lavar los platos', () => S.f.platos && !S.f.platosDesayuno, 6],
  ];

  // ---------------------------------------------------------------- sonido (todo sintetizado)
  const Sonido = (() => {
    let ctx = null, master, sfx, musica, ruido, activo = true, voz = null, timer = null, paso = 0, sigT = 0, urg = 0;
    try { activo = localStorage.getItem('habitos-sonido') !== '0'; } catch (e) { /* sin almacenamiento */ }
    const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);
    function iniciar() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = activo ? 0.85 : 0; master.connect(ctx.destination);
      sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master);
      musica = ctx.createGain(); musica.gain.value = 0.14; musica.connect(master);
      const len = ctx.sampleRate * 2;
      ruido = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = ruido.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      elegirVoz();
    }
    // cada personaje con su voz: si el equipo tiene varias voces en español, a los hombres les toca una de hombre
    let vozHombre = null, vozMujer = null;
    function elegirVoz() {
      try {
        const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
        const es = vs.filter((v) => /^es/i.test(v.lang));
        voz = es.find((v) => /419|MX|US|CO|PE|AR/i.test(v.lang)) || es[0] || null;
        const hombre = (v) => /jorge|juan|diego|carlos|pablo|enrique|andr[eé]s|miguel|raul|male|hombre/i.test(v.name);
        const latam = (v) => /419|MX|US|CO|PE|AR/i.test(v.lang);
        vozHombre = es.find((v) => hombre(v) && latam(v)) || es.find(hombre) || null;
        vozMujer = es.find((v) => !hombre(v) && latam(v)) || es.find((v) => !hombre(v)) || null;
      } catch (e) { voz = null; }
    }
    // tono y velocidad de cada uno (así no suenan todos como mamá)
    const VOCES = {
      mama: { p: 1.25, r: 1.08, m: true }, abuela: { p: 1.05, r: 0.92, m: true }, profe: { p: 1.12, r: 0.96, m: true },
      papa: { p: 0.8, r: 1.0, h: true }, vendedor: { p: 0.95, r: 1.12, h: true }, nino: { p: 1.6, r: 1.15 }, nina: { p: 1.85, r: 1.12, m: true },
    };
    if (window.speechSynthesis) try { speechSynthesis.onvoiceschanged = elegirVoz; } catch (e) { /* nada */ }
    function tono(f, t0, dur, tipo, vol, dest, fFin) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = tipo || 'sine';
      o.frequency.setValueAtTime(f, t0);
      if (fFin) o.frequency.exponentialRampToValueAtTime(fFin, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(dest || sfx);
      o.start(t0); o.stop(t0 + dur + 0.05);
    }
    function soplo(t0, dur, o) {
      o = o || {};
      const s = ctx.createBufferSource(); s.buffer = ruido; s.loop = true;
      const fl = ctx.createBiquadFilter(); fl.type = o.tipo || 'bandpass';
      fl.frequency.setValueAtTime(o.f || 1000, t0);
      if (o.fFin) fl.frequency.exponentialRampToValueAtTime(o.fFin, t0 + dur);
      fl.Q.value = o.q || 1;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t0 + Math.min(0.04, dur / 3));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(fl); fl.connect(g); g.connect(o.dest || sfx);
      s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.05);
    }
    const SFX = {
      paso: (t) => soplo(t, 0.08, { tipo: 'lowpass', f: 380 + Math.random() * 160, vol: 0.32 }),
      alarma: (t) => { for (let i = 0; i < 4; i++) tono(1175, t + i * 0.13, 0.08, 'square', 0.09); },
      bien: (t) => [72, 76, 79].forEach((n, i) => tono(mtof(n), t + i * 0.07, 0.3, 'triangle', 0.22)),
      logro: (t) => {
        [67, 72, 76, 79, 84].forEach((n, i) => tono(mtof(n), t + i * 0.08, 0.35, 'triangle', 0.24));
        [72, 76, 79].forEach((n) => tono(mtof(n), t + 0.42, 0.9, 'sine', 0.14));
        for (let i = 0; i < 6; i++) tono(mtof(96 + (i % 3) * 3), t + 0.45 + i * 0.05, 0.12, 'sine', 0.06);
      },
      mal: (t) => { tono(311, t, 0.28, 'sawtooth', 0.09, null, 233); tono(233, t + 0.26, 0.5, 'sawtooth', 0.09, null, 147); },
      perder: (t) => tono(392, t, 0.25, 'square', 0.05, null, 196),
      golpe: (t) => { tono(140, t, 0.35, 'sine', 0.6, null, 40); soplo(t, 0.18, { tipo: 'lowpass', f: 500, vol: 0.4 }); },
      puerta: (t) => soplo(t, 0.7, { tipo: 'bandpass', f: 300, fFin: 2200, q: 0.8, vol: 0.22 }),
      click: (t) => tono(900, t, 0.05, 'square', 0.05),
      abrir: (t) => tono(520, t, 0.1, 'triangle', 0.14, null, 820),
      sube: (t) => tono(700, t, 0.14, 'triangle', 0.12, null, 1050),
      baja: (t) => tono(500, t, 0.18, 'triangle', 0.12, null, 280),
      moneda: (t) => { tono(988, t, 0.08, 'square', 0.06); tono(1319, t + 0.08, 0.25, 'square', 0.06); },
      tic: (t) => tono(1600, t, 0.03, 'square', 0.05),
      latido: (t) => { tono(70, t, 0.14, 'sine', 0.6, null, 45); tono(70, t + 0.2, 0.14, 'sine', 0.45, null, 45); },
      alerta: (t) => { for (let i = 0; i < 3; i++) tono(880, t + i * 0.18, 0.12, 'sawtooth', 0.07, null, 660); },
      final: (t) => [60, 64, 67, 72].forEach((n, i) => tono(mtof(n), t + i * 0.12, 0.8, 'triangle', 0.18)),
      finalMal: (t) => [64, 62, 60, 55].forEach((n, i) => tono(mtof(n), t + i * 0.18, 0.6, 'triangle', 0.16)),
      voz: (t) => tono(300 + Math.random() * 200, t, 0.07, 'triangle', 0.08),
      tripa: (t) => { soplo(t, 0.8, { tipo: 'lowpass', f: 240, fFin: 80, q: 8, vol: 0.6 }); tono(75, t, 0.7, 'sawtooth', 0.08, null, 45); },
      timbre: (t) => { for (let i = 0; i < 12; i++) tono(i % 2 ? 1250 : 1500, t + i * 0.1, 0.09, 'square', 0.06); },
      silbato: (t) => { tono(1900, t, 0.22, 'sine', 0.13, null, 2500); tono(2500, t + 0.26, 0.34, 'sine', 0.13, null, 1800); },
      ladrido: (t) => [0, 0.17].forEach((d) => { tono(720, t + d, 0.1, 'sawtooth', 0.1, null, 420); soplo(t + d, 0.08, { tipo: 'bandpass', f: 1300, q: 2, vol: 0.16 }); }),
    };
    const BUCLES = {
      cepillo: { tipo: 'bandpass', f: 3200, q: 2, vol: 0.18, lfo: 11 },
      agua: { tipo: 'bandpass', f: 1800, q: 0.4, vol: 0.2, lfo: 0 },
      sarten: { tipo: 'highpass', f: 2600, q: 0.7, vol: 0.12, lfo: 17 },
      vapor: { tipo: 'bandpass', f: 5000, q: 1, vol: 0.12, lfo: 1.6 },
      roce: { tipo: 'bandpass', f: 900, q: 1.2, vol: 0.2, lfo: 4 },
      ronquido: { tipo: 'lowpass', f: 380, q: 3, vol: 0.32, lfo: 0.55 },
      comer: { tipo: 'bandpass', f: 2200, q: 3, vol: 0.12, lfo: 6 },
      lavadora: { tipo: 'lowpass', f: 160, q: 4, vol: 0.25, lfo: 0.8 },
    };
    function bucle(nombre) {
      const b = BUCLES[nombre];
      if (!ctx || !b) return () => {};
      const t = ctx.currentTime;
      const s = ctx.createBufferSource(); s.buffer = ruido; s.loop = true;
      const fl = ctx.createBiquadFilter(); fl.type = b.tipo; fl.frequency.value = b.f; fl.Q.value = b.q;
      const mod = ctx.createGain(); mod.gain.value = b.lfo ? 0.5 : 1;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(b.vol, t + 0.15);
      s.connect(fl); fl.connect(mod); mod.connect(g); g.connect(sfx);
      let lfo = null;
      if (b.lfo) {
        lfo = ctx.createOscillator(); lfo.frequency.value = b.lfo;
        const prof = ctx.createGain(); prof.gain.value = 0.5;
        lfo.connect(prof); prof.connect(mod.gain); lfo.start(t);
      }
      s.start(t, Math.random());
      return () => {
        const t2 = ctx.currentTime;
        g.gain.cancelScheduledValues(t2);
        g.gain.setValueAtTime(g.gain.value, t2);
        g.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.2);
        s.stop(t2 + 0.25);
        if (lfo) lfo.stop(t2 + 0.25);
      };
    }
    // tres estados de ánimo: mañana alegre, normal y triste
    const MODOS = {
      feliz: { prog: [[60, 64, 67], [67, 71, 74], [57, 60, 64], [65, 69, 72]], arp: [0, 1, 2, 1, 2, 1, 0, 2], base: 116, onda: 'triangle', vol: 0.12 },
      normal: { prog: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], arp: [0, 1, 2, 1, 0, 2, 1, 2], base: 96, onda: 'triangle', vol: 0.11 },
      triste: { prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [52, 56, 59]], arp: [0, 2, 1, 2, 0, 2, 1, 2], base: 70, onda: 'sine', vol: 0.12 },
    };
    const PENTA = [72, 74, 76, 79, 81, 84];
    let modo = 'normal', modoSig = 'normal';
    function programar() {
      // si la pestaña estuvo en segundo plano, no intentar tocar todas las notas atrasadas de golpe
      if (!(sigT > ctx.currentTime - 0.3)) sigT = ctx.currentTime + 0.05;
      while (sigT < ctx.currentTime + 0.25) {
        if (paso % 8 === 0) modo = modoSig;
        const M = MODOS[modo];
        const corchea = 60 / (M.base * (1 + urg * 0.5)) / 2;
        const acorde = M.prog[Math.floor(paso / 8) % 4], i = paso % 8;
        tono(mtof(acorde[M.arp[i]] + 12), sigT, corchea * (modo === 'triste' ? 1.7 : 0.9), M.onda, M.vol, musica);
        if (i % 4 === 0) tono(mtof(acorde[0] - 12), sigT, corchea * 3.6, 'sine', 0.3, musica);
        if (modo === 'feliz') {
          if ((i === 0 || i === 3 || i === 6) && Math.random() < 0.85) tono(mtof(PENTA[Math.floor(Math.random() * PENTA.length)]), sigT, corchea * 2.6, 'sine', 0.08, musica);
          if (i % 2 === 1) soplo(sigT, 0.05, { tipo: 'highpass', f: 7000, vol: 0.09, dest: musica });
          if (i === 4) soplo(sigT, 0.12, { tipo: 'bandpass', f: 1800, q: 0.8, vol: 0.12, dest: musica });
        }
        if (modo === 'triste' && i === 0) tono(mtof(acorde[0]), sigT, corchea * 8, 'sine', 0.07, musica);
        if (urg > 0.6 && i % 2 === 0) tono(6000, sigT, 0.03, 'square', 0.025 * urg, musica);
        paso++;
        sigT += corchea;
      }
    }
    return {
      iniciar,
      sfx(n) { if (ctx && activo && SFX[n]) SFX[n](ctx.currentTime + 0.01); },
      bucle(n) { return activo ? bucle(n) : () => {}; },
      musica(on) {
        if (!ctx) return;
        if (on && !timer) { sigT = ctx.currentTime + 0.1; timer = setInterval(programar, 60); }
        if (!on && timer) { clearInterval(timer); timer = null; }
      },
      urgencia(u) { urg = u; },
      animo(v) { modoSig = v >= 65 ? 'feliz' : v < 35 ? 'triste' : 'normal'; },
      activo: () => activo,
      setActivo(b) {
        activo = b;
        try { localStorage.setItem('habitos-sonido', b ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
        if (master) master.gain.setTargetAtTime(b ? 0.85 : 0, ctx.currentTime, 0.05);
        if (!b && window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) { /* nada */ }
      },
      hablar(texto, quien) {
        if (!activo) return;
        const limpio = texto.replace(/\([^)]*\)/g, '').replace(/[…]/g, ',').trim();
        if (!limpio) return;
        try {
          if (!window.speechSynthesis) throw new Error('sin voz');
          if (!voz) elegirVoz();
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(limpio);
          const c = VOCES[quien];
          const v = (c && c.h && vozHombre) || (c && c.m && vozMujer) || voz;
          if (v) u.voice = v;
          u.lang = v ? v.lang : 'es-419';
          u.pitch = c ? c.p : (NINO ? gx(1.7, 1.9) : 0.85);
          u.rate = c ? c.r : 1.05;
          u.volume = 1;
          speechSynthesis.speak(u);
        } catch (e) {
          if (!ctx) return;
          const n = Math.min(14, Math.ceil(limpio.length / 4));
          for (let i = 0; i < n; i++) SFX.voz(ctx.currentTime + i * 0.09);
        }
      },
      hablando() { try { return !!(window.speechSynthesis && speechSynthesis.speaking); } catch (e) { return false; } },
    };
  })();

  // ---------------------------------------------------------------- interfaz
  document.body.insertAdjacentHTML('beforeend', `
<canvas id="juego" aria-label="Escena 3D del juego"></canvas>
<div class="etiquetas" id="etiquetas"></div>
<div class="hud" id="hud" hidden>
  <div class="tiempo" id="tiempo">
    <div class="t-cab"><span class="t-hora" id="hHora">--:--</span><span class="t-txt" id="tTxt"></span></div>
    <div class="t-barra"><i class="t-fill" id="tFill"></i><i class="t-costo" id="tCosto"></i><span class="t-marcas"></span></div>
  </div>
  <div class="lista" id="lista" hidden><p class="l-tit" id="lTit"></p><ul id="lItems"></ul><p class="l-res" id="lResumen"></p></div>
  <div class="stats" id="hStats"></div>
  <div class="lugar" id="hLugar"></div>
</div>
<div class="flash" id="flash"></div>
<div class="logros-cola" id="logros"></div>
<button class="b-sonido" id="bSonido" type="button" aria-label="Silenciar sonido"></button>
<button class="b-correr" id="bCorrer" type="button" aria-pressed="false" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="15" cy="4" r="2.2"/><path d="M13.5 7.5l-4 2-2 4M13.5 7.5l1.5 5 4 1.5M15 12.5l-3 3 1 5M12 15.5l-4 1-2 3"/></svg><span id="bCorrerTxt">Correr</span><kbd data-t="">Shift</kbd></button>
<div id="burbuja" class="burbuja" hidden></div>
<div id="burbujaNpc" class="burbuja npc" hidden></div>
<div class="aviso" id="aviso"></div>
<div class="prompt" id="prompt" hidden><kbd data-t="Usar">E</kbd><span id="promptTxt"></span></div>
<div class="progreso" id="progreso" hidden><div class="fila"><b id="progTxt"></b><span id="progMin"></span></div><div class="prog-barra"><i id="progBarra"></i></div><small class="prog-tip">Mantén <kbd data-t="Usar">Espacio</kbd> para adelantar</small></div>
<div class="panel" id="panel" hidden role="dialog" aria-modal="false" aria-labelledby="pTitulo">
  <div class="panel-cab"><h2 id="pTitulo"></h2><span class="panel-hora" id="pHora"></span></div>
  <p id="pTexto"></p>
  <p class="p-ganas" id="pGanas" hidden></p>
  <div class="opciones" id="pOpciones"></div>
</div>
<div class="pantalla carga" id="carga" hidden><div class="caja"><p class="eyebrow">Cargando</p><h2 id="cTitulo"></h2><div class="barra"><i id="cBarra"></i></div><ul id="cTips"></ul></div></div>
<div class="pantalla" id="intro"${NINO ? ' hidden' : ''}><div class="hoja">
  <p class="eyebrow">${NINO ? 'Prototipo · versión niño' : 'Prototipo · versión adulto'}</p>
  <h1 id="iTitulo"></h1>
  <p class="lead" id="iTexto"></p>
  <div class="controles">
    <span class="solo-tecla"><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> caminar</span>
    <span class="solo-tecla"><kbd>E</kbd> usar objeto</span>
    <span class="solo-tecla"><kbd>1</kbd>–<kbd>4</kbd> elegir</span>
    <span class="solo-toque"><kbd data-t="Palanca">←</kbd> caminar</span>
    <span class="solo-toque"><kbd data-t="Usar">E</kbd> usar objeto</span>
    <span class="solo-toque">Toca una opción para elegir</span>
    <span>Con sonido y voces: sube el volumen</span>
  </div>
  <div class="i-botones"><button class="btn" id="bEmpezar"></button>${NINO ? '<button class="btn sec" id="bEditar" type="button">Cambiar personaje</button>' : ''}</div>
</div></div>
<div class="pantalla" id="resumen" hidden><div class="hoja">
  <p class="eyebrow" id="rEyebrow">Fin de la mañana</p>
  <h1 id="rTitulo"></h1>
  <p class="lead" id="rSub"></p>
  <div class="r-stats" id="rStats"></div>
  <div class="r-cols">
    <section><h2>Lo que hiciste</h2><ul class="hechos" id="rHechos"></ul></section>
    <section><h2>Así sigue tu día</h2><ol class="linea" id="rDia"></ol></section>
  </div>
  <h2>Si repites este día</h2>
  <div class="proy" id="rProy"></div>
  <h2>Hábitos en formación</h2>
  <div class="habitos" id="rHab"></div>
  <div class="acciones"><button class="btn" id="bOtra">Jugar otra vez</button><p class="nota-final">Un hábito se vuelve automático después de 5 días seguidos. En el juego completo, esos días se simulan solos.</p></div>
</div></div>
<div class="pantalla examen" id="examen" hidden><div class="hoja ex-hoja" id="exHoja">
  <p class="eyebrow">Examen de matemáticas · ${NINO ? '2.º grado' : '4.º grado'}</p>
  <div class="ex-cab"><b id="exNum"></b><span id="exOk"></span><span id="exSeg"></span></div>
  <div class="ex-barra"><i id="exTiempo"></i></div>
  <h2 class="ex-preg" id="exPreg"></h2>
  <div class="ex-ops" id="exOps"></div>
  <p class="ex-pie" id="exPie"></p>
</div></div>
<div class="guia" id="guia" hidden role="status">
  <span class="g-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="6" cy="9" r="2.2"/><circle cx="10" cy="5.5" r="2.2"/><circle cx="14" cy="5.5" r="2.2"/><circle cx="18" cy="9" r="2.2"/><path d="M12 10.5c-3.2 0-6 4.6-6 7 0 1.7 1.4 2.5 3 2.5 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.6 0 3-.8 3-2.5 0-2.4-2.8-7-6-7z"/></svg></span>
  <div class="g-txt"><small id="gPaso"></small><p id="gTexto"></p></div>
  <button class="btn" type="button" id="gOk" hidden>Entendido</button>
</div>
<div class="ojos" id="ojos" hidden aria-live="polite">
  <div class="parpado arriba"></div><div class="parpado abajo"></div>
  <div class="ojos-reloj" id="ojosReloj" hidden><b id="ojosHora"></b><span id="ojosDia"></span></div>
  <button class="cine-saltar" id="ojosSaltar" type="button">Saltar ⏭</button>
</div>
<div class="cine" id="cine" hidden>
  <div class="cine-franja arriba"></div><div class="cine-franja abajo"></div>
  <button class="cine-saltar" id="cineSaltar" type="button">Saltar historia</button>
  <div class="cine-dialogo" id="cineDialogo" hidden aria-live="polite">
    <b class="cine-quien" id="cineQuien"></b>
    <p class="cine-texto" id="cineTexto"></p>
    <div class="cine-ops" id="cineOps"></div>
    <button class="cine-sig" id="cineSig" type="button">Siguiente <kbd>Enter</kbd></button>
  </div>
  <div class="cine-titulo" id="cineTitulo" hidden><p class="eyebrow" id="cineTitEy"></p><h2 id="cineTitTx"></h2></div>
</div>
<div class="cine-negro" id="cineNegro"></div>
<div class="tactil" id="tactil" hidden>
  <div class="palanca" id="palanca" role="application" aria-label="Palanca: arrástrala para caminar"><i class="pl-base"></i><i class="pl-bola" id="plBola"></i></div>
  <button class="accion-btn" id="bAccion" type="button">Usar</button>
</div>`);

  // ---------------------------------------------------------------- three.js
  const canvas = $('#juego');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  const cache = {};
  function mat(c) { return cache[c] || (cache[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, flatShading: true })); }
  function matB(c, op) { op = op == null ? 1 : op; const k = 'b' + c + op; return cache[k] || (cache[k] = new THREE.MeshBasicMaterial({ color: c, transparent: op < 1, opacity: op, depthWrite: op >= 1 })); }
  function box(par, w, h, d, c, x, y, z, o) {
    o = o || {};
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), o.mat || mat(c));
    m.position.set(x, y, z);
    if (o.rx) m.rotation.x = o.rx;
    if (o.ry) m.rotation.y = o.ry;
    if (o.rz) m.rotation.z = o.rz;
    m.castShadow = o.sombra !== false;
    m.receiveShadow = true;
    par.add(m);
    return m;
  }
  function cil(par, rt, rb, h, c, x, y, z, o) {
    o = o || {};
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 14), o.mat || mat(c));
    m.position.set(x, y, z);
    if (o.rx) m.rotation.x = o.rx;
    if (o.rz) m.rotation.z = o.rz;
    m.castShadow = o.sombra !== false;
    m.receiveShadow = true;
    par.add(m);
    return m;
  }
  function bola(par, r, c, x, y, z, det) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, det || 0), mat(c));
    m.position.set(x, y, z);
    m.castShadow = true;
    par.add(m);
    return m;
  }

  // ---------------------------------------------------------------- personaje
  function geoTorso(arrugado) {
    const g = new THREE.BoxGeometry(0.5, 0.62, 0.28, 4, 4, 2);
    if (arrugado) {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const h = Math.sin(x * 91.7 + y * 47.3 + z * 13.1) * 43758.5453;
        const n = (h - Math.floor(h) - 0.5) * 0.06;
        p.setXYZ(i, x + n * 0.5, y + n * 0.7, z + n);
      }
      g.computeVertexNormals();
    }
    return g;
  }

  function crearPersona(o) {
    const sm = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true });
    const m = { piel: sm(o.piel), camisa: sm(o.camisa), pantalon: sm(o.pantalon), piernas: sm(o.pantalon), zapato: sm(o.zapato || '#3a2a20'), pelo: sm(o.pelo), ojos: sm(o.ojos || '#1d2340') };
    const root = new THREE.Group();
    const cuerpo = new THREE.Group(); root.add(cuerpo);
    const cadera = new THREE.Group(); cadera.position.y = 0.92; cuerpo.add(cadera);
    const mk = (geo, mt) => { const x = new THREE.Mesh(geo, mt); x.castShadow = true; return x; };

    const muslos = [], rodillas = [];
    [-1, 1].forEach((s) => {
      const mu = new THREE.Group(); mu.position.set(s * 0.12, 0, 0); cadera.add(mu);
      const a = mk(new THREE.BoxGeometry(0.18, 0.46, 0.2), m.piernas); a.position.y = -0.22; mu.add(a);
      const ro = new THREE.Group(); ro.position.y = -0.44; mu.add(ro);
      const b = mk(new THREE.BoxGeometry(0.16, 0.42, 0.18), m.piernas); b.position.y = -0.21; ro.add(b);
      const pie = mk(new THREE.BoxGeometry(0.19, 0.1, 0.3), m.zapato); pie.position.set(0, -0.44, 0.05); ro.add(pie);
      muslos.push(mu); rodillas.push(ro);
    });
    const torso = mk(geoTorso(false), m.camisa); torso.position.y = 0.32; cadera.add(torso);
    const falda = mk(new THREE.CylinderGeometry(0.21, 0.3, 0.3, 8), m.pantalon); falda.position.y = -0.04; falda.visible = false; cadera.add(falda);
    const manchas = new THREE.Group(); torso.add(manchas);
    [[-0.1, 0.08, 0.07], [0.12, -0.12, 0.05], [0.02, -0.02, 0.04]].forEach(([x, y, r]) => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(r, 7), mat('#5e4a2c')); c.position.set(x, y, 0.146); manchas.add(c);
    });
    manchas.visible = false;
    const cuello = mk(new THREE.BoxGeometry(0.13, 0.12, 0.13), m.piel); cuello.position.y = 0.68; cadera.add(cuello);
    const cabeza = new THREE.Group(); cabeza.position.y = 0.86; cadera.add(cabeza);
    const craneo = mk(new THREE.IcosahedronGeometry(0.22, 1), m.piel); craneo.position.y = 0.06; cabeza.add(craneo);
    const peloG = new THREE.Group(); cabeza.add(peloG);
    const accG = new THREE.Group(); cabeza.add(accG);
    [-1, 1].forEach((s) => { const ojo = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.02), m.ojos); ojo.position.set(s * 0.08, 0.07, 0.205); cabeza.add(ojo); });
    const boca = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), mat('#8a3b3b')); boca.position.set(0, -0.04, 0.205); cabeza.add(boca);

    const brazos = [-1, 1].map((s) => {
      const piv = new THREE.Group(); piv.position.set(s * 0.33, 0.6, 0); cadera.add(piv);
      const b = mk(new THREE.BoxGeometry(0.13, 0.56, 0.15), m.camisa); b.position.y = -0.26; piv.add(b);
      const mano = mk(new THREE.IcosahedronGeometry(0.075, 0), m.piel); mano.position.y = -0.58; piv.add(mano);
      return piv;
    });
    if (o.extra) o.extra({ torso, cadera, cabeza, m });
    const escala = o.escala || 1;
    root.scale.setScalar(escala);
    if (o.cabezaGrande) cabeza.scale.setScalar(1.22);
    const Pn = { root, cuerpo, cadera, muslos, rodillas, brazos, torso, cabeza, manchas, falda, peloG, accG, m, escala, piel: o.piel, fase: 0, t: 0, anim: 'quieto', sentado: false, prop: null, vel: 0 };
    ponerPeinado(Pn, o.peinado || 'corto');
    return Pn;
  }

  function ponerPeinado(P, estilo) {
    const g = P.peloG;
    while (g.children.length) { const c = g.children.pop(); c.geometry.dispose(); }
    const add = (geo, x, y, z, sx, sy, sz, rx) => {
      const m = new THREE.Mesh(geo, P.m.pelo); m.castShadow = true; m.position.set(x, y, z);
      if (sx) m.scale.set(sx, sy, sz); if (rx) m.rotation.x = rx;
      g.add(m); return m;
    };
    const casco = (sy, y) => add(new THREE.IcosahedronGeometry(0.235, 1), 0, y, -0.02, 1, sy, 1.02);
    switch (estilo) {
      case 'rapado': casco(0.5, 0.13); break;
      case 'mono': casco(0.66, 0.15); add(new THREE.IcosahedronGeometry(0.11, 1), 0, 0.3, -0.12); break;
      case 'rizado':
        casco(0.64, 0.15);
        for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; add(new THREE.IcosahedronGeometry(0.08, 0), Math.cos(a) * 0.19, 0.2 + (i % 2) * 0.05, Math.sin(a) * 0.17 - 0.04); }
        add(new THREE.IcosahedronGeometry(0.11, 0), 0, 0.31, -0.02);
        break;
      case 'largo':
        casco(0.66, 0.15);
        add(new THREE.BoxGeometry(0.44, 0.48, 0.13), 0, -0.07, -0.15);
        [-1, 1].forEach((s) => add(new THREE.BoxGeometry(0.07, 0.38, 0.2), s * 0.215, -0.03, -0.03));
        break;
      case 'coletas':
        casco(0.64, 0.15);
        [-1, 1].forEach((s) => { add(new THREE.IcosahedronGeometry(0.1, 1), s * 0.27, 0.1, -0.08); add(new THREE.BoxGeometry(0.08, 0.22, 0.08), s * 0.31, -0.05, -0.1); });
        break;
      case 'cola':
        casco(0.64, 0.15);
        add(new THREE.IcosahedronGeometry(0.08, 0), 0, 0.2, -0.24);
        add(new THREE.BoxGeometry(0.11, 0.32, 0.1), 0, 0.02, -0.29, 0, 0, 0, 0.25);
        break;
      default: casco(0.62, 0.15);
    }
  }
  function ponerAccesorio(P, tipo, color) {
    const g = P.accG;
    while (g.children.length) { const c = g.children.pop(); c.geometry.dispose(); }
    if (tipo === 'gorra') {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 5, 0, PI * 2, 0, PI / 2), mat(color));
      c.position.set(0, 0.14, -0.02); c.scale.set(1, 0.78, 1.04); c.castShadow = true; g.add(c);
      box(g, 0.28, 0.025, 0.18, color, 0, 0.15, 0.22);
    } else if (tipo === 'lentes') {
      [-1, 1].forEach((s) => {
        const x = s * 0.085;
        box(g, 0.12, 0.02, 0.012, color, x, 0.12, 0.222, { sombra: false });
        box(g, 0.12, 0.02, 0.012, color, x, 0.02, 0.222, { sombra: false });
        box(g, 0.02, 0.1, 0.012, color, x - 0.05, 0.07, 0.222, { sombra: false });
        box(g, 0.02, 0.1, 0.012, color, x + 0.05, 0.07, 0.222, { sombra: false });
      });
      box(g, 0.05, 0.015, 0.012, color, 0, 0.09, 0.222, { sombra: false });
    } else if (tipo === 'lazo') {
      box(g, 0.11, 0.08, 0.05, color, 0.06, 0.32, 0.02, { rz: 0.45 });
      box(g, 0.11, 0.08, 0.05, color, 0.2, 0.26, 0.02, { rz: 0.45 });
      box(g, 0.05, 0.05, 0.06, color, 0.13, 0.29, 0.03);
    }
  }
  // Aplica la apariencia del perfil a un personaje ya creado (sin reconstruirlo)
  function aplicarApariencia(P, p) {
    P.piel = p.piel;
    P.m.piel.color.set(p.piel);
    P.m.pelo.color.set(p.pelo);
    P.m.ojos.color.set(p.ojos);
    ponerPeinado(P, p.peinado);
    ponerAccesorio(P, p.accesorio, p.accColor);
    const k = CONTEXTURA[p.contextura] || 1;
    P.torso.scale.set(k, 1, 0.5 + 0.5 * k);
    P.falda.scale.set(k, 1, k);
    P.muslos.forEach((m) => m.scale.set(0.55 + 0.45 * k, 1, 0.55 + 0.45 * k));
    P.brazos.forEach((b, i) => { b.position.x = (i ? 1 : -1) * 0.33 * (0.75 + 0.25 * k); });
    P.escala = CFG.escala * (ESTATURA[p.estatura] || 1) * ((p.edad || 7) >= 9 ? 1.1 : 1);
    P.root.scale.setScalar(P.escala);
  }

  function animar(P, dt) {
    if (P.esPerro) { animarPerro(P, dt); return; }
    P.t += dt;
    const t = P.t;
    const T = { bdx: 0, bdz: 0, bix: 0, biz: 0, mdx: 0, mix: 0, rdx: 0, rix: 0, cad: 0, cy: 0, cab: 0, cabx: 0 };
    let k = 10;
    switch (P.anim) {
      case 'caminar': {
        P.fase += dt * (2.4 + P.vel * 2.6);
        const s = Math.sin(P.fase);
        T.mdx = s * 0.62; T.mix = -s * 0.62;
        T.rdx = Math.max(0, -Math.sin(P.fase - 0.7)) * 0.9; T.rix = Math.max(0, Math.sin(P.fase - 0.7)) * 0.9;
        T.bdx = -s * 0.55; T.bix = s * 0.55;
        T.cy = Math.abs(Math.cos(P.fase)) * 0.045;
        const lado = s > 0;
        if (P === jugador && P.ladoPaso !== undefined && lado !== P.ladoPaso) Sonido.sfx('paso');
        P.ladoPaso = lado;
        k = 18; break;
      }
      case 'cepillar': T.bdx = -2.05; T.bdz = 0.6 + Math.sin(t * 22) * 0.13; T.bix = -0.15; break;
      case 'comer': T.bdx = Math.sin(t * 3.2) > 0.2 ? -2.0 : -1.2; T.bdz = 0.35; T.bix = -0.8; T.biz = -0.15; break;
      case 'planchar': T.bdx = -0.95 + Math.sin(t * 5) * 0.28; T.bdz = 0.1; T.bix = -0.7; T.cad = 0.15; T.mdx = T.mix = -0.15; break;
      case 'cocinar': T.bdx = -1.05; T.bdz = 0.2 + Math.sin(t * 7) * 0.25; T.bix = -0.95; T.biz = -0.2; break;
      case 'agacharse': {
        const a = Math.sin(t * 5);
        T.cad = 0.72 + a * 0.1; T.mdx = T.mix = -0.72 - a * 0.1;
        T.bdx = -0.6 + a * 0.45; T.bix = -0.6 - a * 0.45; T.cy = -0.06; break;
      }
      case 'buscar': T.cad = 0.5; T.mdx = T.mix = -0.5; T.cab = Math.sin(t * 3) * 0.9; T.bdx = -0.5; T.bix = -0.5; T.bdz = 0.3; T.biz = -0.3; break;
      case 'ducha': T.bdx = -2.75; T.bix = -2.75; T.bdz = 0.45 + Math.sin(t * 9) * 0.22; T.biz = -0.45 - Math.sin(t * 9) * 0.22; T.cabx = -0.2; break;
      case 'lavarCara': { const a = Math.sin(t * 6); T.bdx = -2.0 + a * 0.3; T.bix = -2.0 + a * 0.3; T.bdz = 0.6; T.biz = -0.6; T.cad = 0.25; T.mdx = T.mix = -0.25; break; }
      case 'vestirse': { const v = (Math.sin(t * 4) + 1) / 2; T.bdx = -2.9 * v; T.bix = -2.9 * v; T.cy = -0.03 * v; T.cab = Math.sin(t * 2) * 0.2; break; }
      case 'telefono': T.bdx = -2.4; T.bdz = 1.0; T.cab = 0.25; break;
      case 'esperar': T.bdx = -1.0; T.bdz = 0.35; T.cabx = 0.35; break;
      case 'tropezar': {
        const p = Math.min(1, t / 1.5), c = Math.sin(p * PI);
        T.cad = c * 1.15; T.mdx = -c * 0.5; T.mix = c * 0.2; T.bdx = -c * 1.6; T.bix = -c * 1.6; T.cy = -c * 0.3; k = 14; break;
      }
      case 'estirarse': T.bdx = -3.0; T.bix = -3.0; T.bdz = -0.25; T.biz = 0.25; T.cabx = -0.2; break;
      case 'leer': T.bdx = -1.25; T.bix = -1.25; T.bdz = 0.3; T.biz = -0.3; T.cabx = 0.2; break;
      case 'dormir': break;
      case 'saludar': T.bdx = -2.8 + Math.sin(t * 10) * 0.2; T.bdz = -0.3; break;
      case 'senalar': T.bdx = -1.55 + Math.sin(t * 5) * 0.18; T.bdz = 0.15; T.bix = 0; T.biz = 0.55; T.cab = Math.sin(t * 2.2) * 0.15; T.cabx = Math.sin(t * 7) * 0.06; break;
      case 'patear': { const a = Math.sin(t * 9); T.mdx = a * 0.95; T.mix = -a * 0.45; T.rdx = Math.max(0, -a) * 0.9; T.bdx = -a * 0.6; T.bix = a * 0.6; T.cy = Math.abs(a) * 0.05; break; }
      case 'aplaudir': T.bdx = -1.35; T.bix = -1.35; T.bdz = 0.42 + Math.sin(t * 15) * 0.2; T.biz = -0.42 - Math.sin(t * 15) * 0.2; break;
      case 'entregar': T.bdx = -1.45; T.bix = -1.45; T.bdz = 0.28; T.biz = -0.28; T.cabx = 0.15; break;
      case 'jarras': T.bdx = -0.25; T.bdz = -0.75; T.bix = -0.25; T.biz = 0.75; T.cab = Math.sin(t * 1.3) * 0.2; break;
      default:
        T.cy = Math.sin(t * 2) * 0.008; T.bdz = -0.05; T.biz = 0.05;
        if (P === jugador && (S.energia < 30 || S.animo < 35)) { T.cad = 0.14; T.mdx = T.mix = -0.14; T.cabx = 0.35; }
    }
    if (P.sentado) { T.mdx = T.mix = -PI / 2; T.rdx = T.rix = PI / 2; T.cy = 0.47 / P.escala - 0.92; T.cad = Math.min(T.cad, 0.1); }
    const f = 1 - Math.exp(-dt * k);
    const [bd, bi] = P.brazos, [md, mi] = P.muslos, [rd, ri] = P.rodillas;
    bd.rotation.x = lerp(bd.rotation.x, T.bdx, f); bd.rotation.z = lerp(bd.rotation.z, T.bdz, f);
    bi.rotation.x = lerp(bi.rotation.x, T.bix, f); bi.rotation.z = lerp(bi.rotation.z, T.biz, f);
    md.rotation.x = lerp(md.rotation.x, T.mdx, f); mi.rotation.x = lerp(mi.rotation.x, T.mix, f);
    rd.rotation.x = lerp(rd.rotation.x, T.rdx, f); ri.rotation.x = lerp(ri.rotation.x, T.rix, f);
    P.cadera.rotation.x = lerp(P.cadera.rotation.x, T.cad, f);
    P.cuerpo.position.y = lerp(P.cuerpo.position.y, T.cy, f);
    P.cabeza.rotation.y = lerp(P.cabeza.rotation.y, T.cab, f);
    P.cabeza.rotation.x = lerp(P.cabeza.rotation.x, T.cabx, f);
  }

  function crearProp(tipo) {
    const g = new THREE.Group();
    switch (tipo) {
      case 'cepillo': box(g, 0.03, 0.03, 0.22, '#3d9bd4', 0, 0, 0.08); box(g, 0.035, 0.05, 0.05, '#ffffff', 0, 0.03, 0.18); break;
      case 'plancha': box(g, 0.14, 0.07, 0.24, '#cfd4dc', 0, -0.06, 0.08); box(g, 0.05, 0.07, 0.14, '#de5546', 0, 0.01, 0.06); break;
      case 'telefono': box(g, 0.08, 0.15, 0.02, '#1d2340', 0, 0.02, 0.05); break;
      case 'bulto': box(g, 0.42, 0.26, 0.32, '#9a8f78', 0, -0.08, 0.14, { rz: 0.2 }); box(g, 0.3, 0.1, 0.2, '#c76b5c', 0.05, 0.06, 0.1); break;
      case 'cuchara': box(g, 0.02, 0.02, 0.2, '#c8ccd2', 0, 0, 0.09); break;
      case 'pan': box(g, 0.16, 0.1, 0.11, '#d9a35b', 0, 0, 0.06); break;
      case 'periodico': box(g, 0.42, 0.32, 0.02, '#eeeae0', 0.15, 0.1, 0.14); break;
      case 'plato': cil(g, 0.13, 0.1, 0.03, '#ffffff', 0, 0, 0.1); break;
      case 'esponja': box(g, 0.1, 0.06, 0.07, '#f2d14e', 0, 0, 0.05); break;
      case 'regalo': box(g, 0.34, 0.3, 0.34, '#de5546', -0.12, 0.05, 0.2); box(g, 0.36, 0.06, 0.06, '#f2c14e', -0.12, 0.05, 0.2); box(g, 0.06, 0.32, 0.36, '#f2c14e', -0.12, 0.05, 0.2); break;
      case 'libro': box(g, 0.24, 0.3, 0.05, '#8f73cf', 0, 0, 0.1); box(g, 0.1, 0.1, 0.055, '#f2c14e', 0, 0.03, 0.1); break;
    }
    g.position.y = -0.62;
    return g;
  }
  function ponerProp(P, tipo) {
    if (P.prop) { P.brazos[0].remove(P.prop); P.prop = null; }
    if (tipo) { P.prop = crearProp(tipo); P.brazos[0].add(P.prop); }
  }

  const ROPA = NINO ? {
    pijama: { camisa: '#f2b950', pantalon: '#f2b950', zapatos: false },
    limpia: { camisa: '#f6f7f9', pantalon: '#2e3d6b', zapatos: true },
    arrugada: { camisa: '#e6e6df', pantalon: '#2e3d6b', zapatos: true, arrugada: true },
    sucia: { camisa: '#a69b7c', pantalon: '#4d4a3f', zapatos: true, arrugada: true, manchas: true },
  } : {
    pijama: { camisa: '#8fa9c7', pantalon: '#8fa9c7', zapatos: false },
    limpia: { camisa: '#3f78c0', pantalon: '#353b48', zapatos: true },
    arrugada: { camisa: '#5c7eaa', pantalon: '#353b48', zapatos: true, arrugada: true },
    sucia: { camisa: '#8d8466', pantalon: '#4d4a3f', zapatos: true, arrugada: true, manchas: true },
  };
  function vestir(P, tipo) {
    const r = ROPA[tipo];
    const pij = tipo === 'pijama' && PERFIL && P === jugador;
    const falda = !!PERFIL && P === jugador && PERFIL.genero === 'nina' && tipo !== 'pijama';
    P.ropa = tipo;
    P.m.camisa.color.set(pij ? PERFIL.pijama : r.camisa);
    P.m.pantalon.color.set(pij ? PERFIL.pijama : r.pantalon);
    P.m.piernas.color.set(falda ? (r.manchas ? '#c9bfa4' : '#f1ece2') : pij ? PERFIL.pijama : r.pantalon);
    P.falda.visible = falda;
    P.m.zapato.color.set(r.zapatos ? (NINO ? (PERFIL && P === jugador ? PERFIL.zapatillas : '#de5546') : '#3a2a20') : P.piel);
    const viejo = P.torso.geometry;
    P.torso.geometry = geoTorso(!!r.arrugada);
    viejo.dispose();
    P.manchas.visible = !!r.manchas;
  }

  // ---------- el cachorro
  function crearPerro(color) {
    const sm = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true });
    const claro = color === '#f1ece2';
    const m = { pelo: sm(color), oreja: sm(claro ? '#c98a4b' : color === '#2b2420' ? '#4a3d35' : new THREE.Color(color).multiplyScalar(0.7).getStyle()), hocico: sm('#f4efe4') };
    const mk = (par, w, h, d, mt, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mt); o.position.set(x, y, z); o.castShadow = true; par.add(o); return o; };
    const root = new THREE.Group(), cuerpo = new THREE.Group(); root.add(cuerpo);
    mk(cuerpo, 0.3, 0.24, 0.5, m.pelo, 0, 0.33, 0);
    if (claro) mk(cuerpo, 0.2, 0.05, 0.22, m.oreja, 0.03, 0.455, -0.05);
    const cabeza = new THREE.Group(); cabeza.position.set(0, 0.52, 0.28); cuerpo.add(cabeza);
    mk(cabeza, 0.27, 0.25, 0.25, m.pelo, 0, 0, 0);
    mk(cabeza, 0.15, 0.11, 0.14, m.hocico, 0, -0.05, 0.17);
    mk(cabeza, 0.06, 0.05, 0.04, mat('#1d2340'), 0, -0.01, 0.245);
    [-1, 1].forEach((s) => mk(cabeza, 0.045, 0.055, 0.02, mat('#1d2340'), s * 0.07, 0.05, 0.126));
    const lengua = mk(cabeza, 0.06, 0.02, 0.08, mat('#e46d7b'), 0, -0.1, 0.22);
    const orejas = [-1, 1].map((s) => {
      const g = new THREE.Group(); g.position.set(s * 0.135, 0.1, -0.02); g.rotation.z = s * 0.35; cabeza.add(g);
      mk(g, 0.07, 0.17, 0.11, m.oreja, 0, -0.07, 0); return g;
    });
    const patas = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => {
      const g = new THREE.Group(); g.position.set(sx * 0.09, 0.24, sz * 0.17); cuerpo.add(g);
      mk(g, 0.08, 0.24, 0.08, m.pelo, 0, -0.12, 0); return g;
    });
    const cola = new THREE.Group(); cola.position.set(0, 0.42, -0.25); cola.rotation.x = -0.7; cuerpo.add(cola);
    mk(cola, 0.05, 0.05, 0.2, m.pelo, 0, 0, -0.09);
    const escala = 0.85;
    root.scale.setScalar(escala);
    return { esPerro: true, root, cuerpo, cabeza, orejas, patas, cola, lengua, m, escala, t: 0, fase: 0, anim: 'quieto', vel: 0, salto: 0 };
  }
  function animarPerro(D, dt) {
    D.t += dt;
    const t = D.t;
    let colaV = 7, colaA = 0.45, paso = 0, cy = 0, cabX = 0, echado = 0;
    switch (D.anim) {
      case 'caminar': D.fase += dt * 13; paso = 0.65; cy = Math.abs(Math.sin(D.fase)) * 0.03; colaV = 11; break;
      case 'feliz': colaV = 20; colaA = 0.85; cy = Math.abs(Math.sin(t * 7)) * 0.05; cabX = Math.sin(t * 7) * 0.1; break;
      case 'dormir': colaV = 1; colaA = 0.08; echado = 1; cabX = 0.35; break;
      case 'comer': cabX = 0.75 + Math.sin(t * 9) * 0.12; colaV = 12; colaA = 0.6; break;
      default: cabX = Math.sin(t * 1.3) * 0.08;
    }
    const f = 1 - Math.exp(-dt * 10);
    D.patas.forEach((g, i) => {
      const obj = echado ? (i < 2 ? -1.4 : 1.4) : Math.sin(D.fase + ((i === 0 || i === 3) ? 0 : PI)) * paso;
      g.rotation.x = lerp(g.rotation.x, obj, f);
    });
    if (D.salto > 0) { D.salto = Math.max(0, D.salto - dt); cy += Math.sin((1 - D.salto / 0.55) * PI) * 0.45; }
    D.cuerpo.position.y = lerp(D.cuerpo.position.y, cy - echado * 0.2, D.salto > 0 ? 1 : f);
    D.cabeza.rotation.x = lerp(D.cabeza.rotation.x, cabX, f);
    D.cola.rotation.y = Math.sin(t * colaV) * colaA;
    D.orejas.forEach((o, i) => { o.rotation.x = D.anim === 'caminar' || D.salto > 0 ? Math.sin(t * 14 + i) * 0.25 : 0; });
    D.lengua.visible = D.anim === 'feliz' || D.anim === 'caminar';
  }
  function crearAbuela() {
    const A = crearPersona({ piel: '#e6bd9c', pelo: '#dcd8d0', camisa: '#8f73cf', pantalon: '#5b4a6b', zapato: '#5b4636', peinado: 'mono', escala: 0.95 });
    ponerAccesorio(A, 'lentes', '#6b4a33');
    A.voz = 'abuela';
    return A;
  }
  function crearPapa() { const p = crearPersona({ piel: '#b98563', pelo: '#1d1612', camisa: '#2aa876', pantalon: '#353b48' }); p.voz = 'papa'; return p; }

  function crearMama() {
    const m = crearPersona({ piel: '#c98e6a', pelo: '#3b2418', camisa: '#d9667a', pantalon: '#55607a', zapato: '#3a2a20',
      extra: ({ torso }) => { const d = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.02), mat('#f4f1ea')); d.position.set(0, -0.05, 0.15); torso.add(d); } });
    m.voz = 'mama';
    return m;
  }

  const jugador = crearPersona({ piel: CFG.piel, pelo: CFG.pelo, camisa: '#fff', pantalon: '#fff', escala: CFG.escala, cabezaGrande: NINO });
  const P = jugador;
  if (PERFIL) aplicarApariencia(P, PERFIL);
  vestir(P, 'pijama');

  // ---------------------------------------------------------------- escenas
  const H = 2.6, TH = 0.18;
  let escena = null;
  const particulas = [];

  function nuevaEscena(nombre, titulo, w, d, o) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(o.cielo || '#252b48');
    const E = { scene, nombre, titulo, w, d, cols: [], inters: [], puertas: [], refrescos: [], updates: [], obstaculos: [], npcs: [], sonidos: [], alEntrar: null };
    E.solido = (x, z, ww, dd) => E.cols.push({ x1: x - ww / 2, x2: x + ww / 2, z1: z - dd / 2, z2: z + dd / 2 });
    const hemi = new THREE.HemisphereLight(S.fase === 'tarde' ? '#ffe2c4' : '#fff4e0', '#5d5878', 0.72);
    scene.add(hemi);
    const sol = new THREE.DirectionalLight('#ffe0b5', 0.72);
    E.hemi = hemi; E.sol = sol; E.exterior = !!o.exterior;
    sol.position.set(3.5, 9, 6);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    const sc = sol.shadow.camera;
    sc.left = -w * 0.75 - 1; sc.right = w * 0.75 + 1; sc.top = d * 0.75 + 2; sc.bottom = -d * 0.75 - 2; sc.near = 1; sc.far = 30;
    sol.shadow.bias = -0.0006;
    scene.add(sol);
    scene.add(sol.target);
    cuarto(E, o);
    return E;
  }

  function enPared(E, lado, u, off) {
    if (lado === 'atras') return [u, -E.d / 2 - off];
    if (lado === 'izq') return [-E.w / 2 - off, u];
    return [E.w / 2 + off, u];
  }
  function bloque(E, lado, u, largo, y, alto, grosor, off, c, o) {
    const [x, z] = enPared(E, lado, u, off);
    if (lado === 'atras') return box(E.scene, largo, alto, grosor, c, x, y, z, o);
    return box(E.scene, grosor, alto, largo, c, x, y, z, o);
  }

  function cuarto(E, o) {
    const sc = E.scene, w = E.w, d = E.d;
    // al aire libre: paredes bajas (cerca) o ninguna (techo/mirador)
    const alto = o.alto || H, bajo = alto < 2.2;
    box(sc, w + TH * 2, 0.2, d + TH + 0.3, o.piso, 0, -0.1, 0.15 - TH / 2, { sombra: false });
    if (o.sinParedes) { (o.puertas || []).forEach((p) => E.puertas.push(p)); return; }
    box(sc, w + TH * 2, 0.14, 0.1, '#5b4636', 0, 0.07, d / 2 + 0.05, { sombra: false });
    const lados = { atras: [], izq: [], der: [] };
    (o.puertas || []).forEach((p) => { lados[p.lado].push(p); E.puertas.push(p); });
    ['atras', 'izq', 'der'].forEach((lado) => {
      const largo = lado === 'atras' ? w : d;
      const gaps = lados[lado].slice().sort((a, b) => a.c - b.c);
      let pos = -largo / 2;
      const segs = [];
      gaps.forEach((g) => { const a = g.c - g.ancho / 2; if (a > pos + 0.001) segs.push([pos, a]); pos = g.c + g.ancho / 2; });
      if (pos < largo / 2) segs.push([pos, largo / 2]);
      segs.forEach(([a, b]) => {
        bloque(E, lado, (a + b) / 2, b - a, alto / 2, alto, TH, TH / 2, o.pared);
        if (o.zocalo !== false) bloque(E, lado, (a + b) / 2, b - a, 0.07, 0.14, 0.04, -0.02, '#f7f1e6', { sombra: false });
      });
      gaps.forEach((g) => {
        if (bajo) {
          // portón de la cerca: dos postes
          bloque(E, lado, g.c - g.ancho / 2 - 0.06, 0.12, (alto + 0.3) / 2, alto + 0.3, TH + 0.06, TH / 2, '#8a5a3b');
          bloque(E, lado, g.c + g.ancho / 2 + 0.06, 0.12, (alto + 0.3) / 2, alto + 0.3, TH + 0.06, TH / 2, '#8a5a3b');
          return;
        }
        bloque(E, lado, g.c, g.ancho, 2.1 + (H - 2.1) / 2, H - 2.1, TH, TH / 2, o.pared);
        const fr = '#6b4a33';
        bloque(E, lado, g.c - g.ancho / 2 - 0.03, 0.08, 1.07, 2.14, TH + 0.08, TH / 2, fr);
        bloque(E, lado, g.c + g.ancho / 2 + 0.03, 0.08, 1.07, 2.14, TH + 0.08, TH / 2, fr);
        bloque(E, lado, g.c, g.ancho + 0.14, 2.15, 0.08, TH + 0.08, TH / 2, fr);
        if (g.salida) {
          bloque(E, lado, g.c, g.ancho - 0.04, 1.05, 2.08, 0.06, TH * 0.4, '#8a5a3b');
          bloque(E, lado, g.c - g.ancho / 2 + 0.2, 0.07, 1.0, 0.07, 0.1, TH * 0.15, '#e8c15a');
          bloque(E, lado, g.c, g.ancho * 0.6, 1.5, 0.5, 0.07, TH * 0.32, '#9e6b47');
        } else {
          bloque(E, lado, g.c, g.ancho + 0.3, 1.15, 2.3, 0.05, TH + 0.6, g.fondo || '#3b3550', { sombra: false });
          bloque(E, lado, g.c, g.ancho + 1.2, 0.01, 0.02, 1.4, TH + 0.6, '#5b4636', { sombra: false });
        }
      });
    });
    // esquinas
    [-1, 1].forEach((s) => box(sc, TH, alto, TH, o.pared, s * (w / 2 + TH / 2), alto / 2, -d / 2 - TH / 2));
  }

  function ventana(E, x, ancho, alto) {
    const z = -E.d / 2 + 0.01, sc = E.scene;
    box(sc, ancho + 0.14, alto + 0.14, 0.06, '#ffffff', x, 1.5, z, { sombra: false });
    const oscuro = (invierno() && S.fase === 'manana') || S.fase === 'prologo' || (NINO && S.min >= 19 * 60);
    const vidrio = oscuro ? '#3e4b7a' : lluvia() ? (S.fase === 'tarde' ? '#b5a493' : '#a9b6c6') : S.fase === 'tarde' ? '#ffb36b' : '#ffe3a0';
    box(sc, ancho, alto, 0.07, null, x, 1.5, z + 0.005, { mat: matB(vidrio), sombra: false });
    if (oscuro) [[-0.3, 0.25], [0.2, 0.32], [0.35, -0.1], [-0.15, 0.05]].forEach(([u, v]) => box(sc, 0.025, 0.025, 0.08, null, x + u * ancho, 1.5 + v * alto, z + 0.01, { mat: matB('#fff6c8'), sombra: false }));
    if (lluvia()) {
      const gotas = [];
      for (let i = 0; i < 9; i++) gotas.push(box(sc, 0.012, 0.16, 0.01, null, x + (Math.random() - 0.5) * ancho * 0.92, 1.5, z + 0.045, { mat: matB('#eef4ff', 0.75), sombra: false }));
      gotas.forEach((g) => { g.userData.f = Math.random(); });
      E.updates.push((dt) => gotas.forEach((g) => {
        g.userData.f = (g.userData.f + dt * 1.6) % 1;
        g.position.y = 1.5 + alto / 2 - 0.08 - g.userData.f * (alto - 0.16);
      }));
    }
    box(sc, 0.05, alto, 0.08, '#ffffff', x, 1.5, z + 0.01, { sombra: false });
    box(sc, ancho, 0.05, 0.08, '#ffffff', x, 1.5, z + 0.01, { sombra: false });
    if (!oscuro) box(sc, ancho * 1.1, 0.004, 1.8, null, x + 0.25, 0.012, z + 1.25, { mat: matB('#fff0c2', lluvia() ? 0.12 : 0.35), sombra: false, ry: -0.12 });
    const luz = new THREE.PointLight(oscuro ? '#8fa3d9' : '#ffd89a', oscuro ? 0.3 : 0.5, 7);
    luz.position.set(x, 1.6, z + 0.8);
    sc.add(luz);
  }
  function cuadro(E, x, y, w, h, c) {
    const z = -E.d / 2 + 0.03;
    box(E.scene, w + 0.1, h + 0.1, 0.04, '#5b4636', x, y, z, { sombra: false });
    box(E.scene, w, h, 0.05, c, x, y, z + 0.005, { sombra: false });
    box(E.scene, w * 0.5, h * 0.35, 0.055, '#f6e3b4', x - w * 0.12, y - h * 0.1, z + 0.007, { sombra: false });
  }
  function planta(par, x, z) {
    cil(par, 0.2, 0.15, 0.4, '#c56b4a', x, 0.2, z);
    bola(par, 0.3, '#3f8f5a', x, 0.62, z);
    bola(par, 0.22, '#58a86b', x + 0.15, 0.85, z + 0.05);
    bola(par, 0.18, '#2f7a4b', x - 0.14, 0.8, z - 0.08);
  }
  function zapato(par, x, z, ry, c) {
    const g = new THREE.Group();
    box(g, 0.16, 0.1, 0.3, c, 0, 0.05, 0);
    box(g, 0.15, 0.06, 0.1, '#f1ece2', 0, 0.11, -0.08);
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    par.add(g);
    return g;
  }
  function etiquetaInter(nombre, en, mira, radio, extra) { return Object.assign({ nombre, en, mira, radio }, extra); }

  // ---------- Dormitorio
  function construirDormitorio() {
    const E = nuevaEscena('dormitorio', NINO ? `Cuarto de ${CFG.nombre}` : 'Dormitorio', 8, 7, {
      piso: '#c99b6d', pared: NINO ? '#9fd0c4' : '#cfc6e0',
      puertas: [{ lado: 'der', c: 1.9, ancho: 1.2, a: 'pasillo', nombre: 'Pasillo', fondo: '#d9cdb6' }],
    });
    const sc = E.scene;
    box(sc, 3.2, 0.02, 2.4, NINO ? '#f2c14e' : '#7d8fb8', 0.4, 0.011, 0.7, { sombra: false });
    ventana(E, 0.7, 1.5, 1.1);
    cuadro(E, -2.5, 1.85, 0.7, 0.5, NINO ? '#4a90d9' : '#2aa876');

    // cama
    const cx = -2.5, cz = -2.2;
    box(sc, 1.8, 0.32, 2.5, '#8a5a3b', cx, 0.16, cz);
    box(sc, 1.7, 0.24, 2.36, '#f4f1ea', cx, 0.44, cz);
    box(sc, 1.8, 1.2, 0.14, '#7a4b2f', cx, 0.6, -3.38);
    const almohada = box(sc, 0.8, 0.16, 0.42, '#ffffff', cx, 0.64, -3.0);
    const cF = NINO ? '#4a90d9' : '#c0504d';
    const fBien = new THREE.Group(); sc.add(fBien);
    box(fBien, 1.76, 0.07, 1.8, cF, cx, 0.6, -1.85);
    box(fBien, 1.76, 0.09, 0.32, '#f7f3ea', cx, 0.62, -2.6);
    const fMal = new THREE.Group(); sc.add(fMal);
    box(fMal, 1.4, 0.2, 1.0, cF, cx + 0.15, 0.66, -1.7, { ry: 0.35, rz: 0.12 });
    box(fMal, 0.9, 0.16, 0.8, cF, cx - 0.35, 0.7, -2.45, { ry: -0.5 });
    box(fMal, 0.08, 0.46, 0.9, cF, cx + 0.9, 0.38, -1.3, { rz: 0.15 });
    box(fMal, 0.6, 0.06, 0.5, '#f7f3ea', cx - 0.4, 0.6, -1.4, { ry: 0.8 });
    E.solido(cx, cz - 0.05, 1.8, 2.6);
    E.refrescos.push(() => {
      fBien.visible = S.f.cama; fMal.visible = !S.f.cama;
      almohada.rotation.y = S.f.cama ? 0 : 0.5; almohada.position.x = S.f.cama ? cx : cx + 0.3;
    });

    // mesa de noche y despertador
    box(sc, 0.5, 0.55, 0.5, '#8a5a3b', -1.25, 0.275, -3.15);
    box(sc, 0.26, 0.15, 0.1, '#2b2b2b', -1.25, 0.625, -3.1);
    const pantallaReloj = box(sc, 0.2, 0.09, 0.012, null, -1.25, 0.63, -3.045, { mat: matB('#ff4d3d'), sombra: false });
    E.solido(-1.25, -3.15, 0.5, 0.5);
    E.updates.push((dt, t) => { pantallaReloj.visible = !alarmaActiva || Math.sin(t * 12) > 0; });

    // ropero
    box(sc, 1.3, 2.2, 0.7, '#9b6b45', 3.2, 1.1, -3.1);
    box(sc, 0.02, 2.0, 0.02, '#6b4a33', 3.2, 1.1, -2.745);
    box(sc, 0.04, 0.16, 0.04, '#e8c15a', 3.1, 1.1, -2.73);
    box(sc, 0.04, 0.16, 0.04, '#e8c15a', 3.3, 1.1, -2.73);
    E.solido(3.2, -3.1, 1.3, 0.7);

    // cesto de ropa sucia y ropa en el piso
    cil(sc, 0.32, 0.27, 0.55, '#c9a46b', -3.45, 0.275, 1.9);
    const enCesto = box(sc, 0.5, 0.2, 0.45, '#9a8f78', -3.45, 0.6, 1.9, { ry: 0.3 });
    E.solido(-3.45, 1.9, 0.64, 0.64);
    const ropaPiso = new THREE.Group(); sc.add(ropaPiso);
    box(ropaPiso, 0.6, 0.08, 0.45, '#8d8466', -0.9, 0.04, -0.2, { ry: 0.4 });
    box(ropaPiso, 0.5, 0.1, 0.35, '#4d4a3f', -0.75, 0.1, -0.05, { ry: -0.5 });
    box(ropaPiso, 0.3, 0.06, 0.3, '#c76b5c', -1.05, 0.12, -0.3, { ry: 1.1 });
    E.refrescos.push(() => { ropaPiso.visible = !S.f.ropaSucia; enCesto.visible = S.f.ropaSucia; });

    // zapatos
    const cZ = NINO ? '#de5546' : '#5b3a29';
    const zMal = new THREE.Group(); sc.add(zMal);
    const zBien = new THREE.Group(); sc.add(zBien);
    const posMal = NINO ? [[-0.4, 2.5, 0.9], [2.0, 2.7, 2.4], [2.6, 0.3, -0.3]] : [[0.4, 1.6, 0.9], [1.6, 2.2, 2.4], [2.3, 0.7, -0.3]];
    posMal.forEach(([x, z, r]) => zapato(zMal, x, z, r, cZ));
    zapato(zMal, posMal[0][0] + 0.3, posMal[0][1] - 0.4, 1.9, '#3f78c0');
    [[1.75, -2.45], [1.95, -2.45], [2.2, -2.45], [2.4, -2.45]].forEach(([x, z], i) => zapato(zBien, x, z, 0, i < 2 ? cZ : '#3f78c0'));
    E.refrescos.push(() => { zMal.visible = !S.f.zapatos; zBien.visible = S.f.zapatos; });

    const puedeDormir = () => NINO && S.fase === 'tarde' && S.min >= 19 * 60;
    E.inters.push(etiquetaInter('Cama', [-1.2, -1.9], [cx, -1.9], 1.1, {
      activo: () => !S.f.cama || puedeDormir(),
      abrir: () => ({
        titulo: 'La cama', texto: puedeDormir() ? 'Ya es de noche. ¿Terminaste lo que querías hacer hoy?' : 'La frazada está tirada y la almohada en cualquier lado.',
        opciones: (S.f.cama ? [] : [{
          texto: 'Tender la cama', nota: 'Toma 5 minutos y el cuarto se ve ordenado desde temprano.',
          min: 5, ef: { animo: 6 }, anim: 'agacharse', dur: 2.6, progreso: 'Tendiendo la cama',
          alTerminar: () => { S.f.cama = true; habito('Tender la cama'); },
        }]).concat(puedeDormir() ? [{
          texto: 'Dormir hasta mañana', nota: S.min >= 22 * 60 ? 'Ya es muy tarde: mañana vas a amanecer con sueño.' : 'Dormir a buena hora te da energía para mañana.',
          min: 0, anim: 'dormir', dur: 1.2, esfuerzo: false, progreso: 'Durmiendo…', alTerminar: () => dormir(),
        }] : []),
      }),
    }));

    E.inters.push(etiquetaInter('Ropa sucia', [-0.9, 0.55], [-0.9, -0.2], 1.0, {
      activo: () => !S.f.ropaSucia,
      abrir: () => ({
        titulo: 'Ropa sucia en el piso', texto: 'La ropa de ayer está tirada al lado de la cama.',
        opciones: [{
          texto: 'Recogerla y llevarla al cesto', nota: NINO ? 'Mamá la lavará hoy si está en el cesto.' : 'Si está en el cesto, la puedes lavar antes de salir.',
          min: 3, ef: { animo: 3, ...(NINO ? { confianza: 4 } : {}) },
          pasos: [
            { anim: 'agacharse', dur: 1.1, min: 1, progreso: 'Recogiendo la ropa', alTerminar: () => { S.f.ropaSucia = true; ponerProp(P, 'bulto'); refrescar(); enCesto.visible = false; } },
            { ruta: [[-2.9, 1.3]], mira: [-3.45, 1.9], anim: 'agacharse', dur: 0.9, min: 2, progreso: 'Echándola al cesto', alTerminar: () => { ponerProp(P, null); refrescar(); } },
          ],
          alTerminar: () => habito('Recoger la ropa sucia'),
        }],
      }),
    }));

    E.inters.push(etiquetaInter('Zapatos', NINO ? [1.0, 2.2] : [1.2, 1.3], NINO ? [1.0, 2.7] : [1.2, 1.9], NINO ? 1.1 : 1.3, {
      activo: () => !S.f.zapatos,
      abrir: () => ({
        titulo: 'Zapatos regados', texto: 'Hay zapatos por todo el cuarto. Uno ni siquiera se ve.',
        opciones: [{
          texto: 'Ordenarlos junto al ropero', nota: 'Así sabes dónde están cuando te vistas.',
          min: 2, ef: { animo: 2 }, anim: 'agacharse', dur: 1.6, progreso: 'Ordenando los zapatos',
          alTerminar: () => { S.f.zapatos = true; habito('Ordenar los zapatos'); },
        }],
      }),
    }));

    if (!NINO) {
      // planchador con ropa
      const px = 0.7, pz = -2.7;
      box(sc, 1.5, 0.06, 0.42, '#e9e4f2', px, 0.92, pz);
      box(sc, 0.04, 1.0, 0.04, '#9aa0aa', px - 0.25, 0.46, pz, { rz: 0.5 });
      box(sc, 0.04, 1.0, 0.04, '#9aa0aa', px + 0.25, 0.46, pz, { rz: -0.5 });
      box(sc, 0.22, 0.12, 0.13, '#cfd4dc', px + 0.6, 0.99, pz, { ry: 0.3 });
      const rMal = new THREE.Group(); sc.add(rMal);
      box(rMal, 0.6, 0.06, 0.4, '#3f78c0', px - 0.3, 0.98, pz, { ry: 0.5, rz: 0.08 });
      box(rMal, 0.5, 0.08, 0.3, '#353b48', px + 0.1, 1.02, pz + 0.05, { ry: -0.4 });
      box(rMal, 0.12, 0.45, 0.3, '#3f78c0', px - 0.65, 0.75, pz + 0.1, { rz: 0.1 });
      const rBien = new THREE.Group(); sc.add(rBien);
      box(rBien, 0.42, 0.06, 0.32, '#3f78c0', px - 0.2, 0.98, pz);
      box(rBien, 0.42, 0.06, 0.32, '#353b48', px - 0.2, 1.04, pz);
      E.solido(px, pz, 1.5, 0.45);
      E.refrescos.push(() => { rMal.visible = !S.f.planchado; rBien.visible = S.f.planchado && !S.f.vestido; });
      E.inters.push(etiquetaInter('Planchador', [px, -1.9], [px, pz], 1.0, {
        activo: () => !S.f.planchado && !S.f.vestido,
        abrir: () => ({
          titulo: 'La ropa del día', texto: 'Tu camisa y tu pantalón están arrugados encima del planchador.',
          opciones: [{
            texto: 'Planchar la ropa de hoy', nota: 'Toma tiempo, pero podrás vestirte bien.',
            min: 10, ef: { animo: 4 }, anim: 'planchar', dur: 3.2, prop: 'plancha', progreso: 'Planchando',
            alTerminar: () => { S.f.planchado = true; habito('Planchar la ropa'); },
          }],
        }),
      }));
      // vestirse en el ropero
      E.inters.push(etiquetaInter('Ropero', [3.2, -2.15], [3.2, -3.1], 1.0, {
        activo: () => !S.f.vestido,
        abrir: () => abrirVestir(),
      }));
    } else {
      // caja de juguetes y juguetes regados
      box(sc, 0.9, 0.5, 0.6, '#de5546', 0.7, 0.25, -3.0);
      box(sc, 0.94, 0.06, 0.64, '#f2c14e', 0.7, 0.52, -3.0);
      E.solido(0.7, -3.0, 0.9, 0.6);
      const jMal = new THREE.Group(); sc.add(jMal);
      [[0.2, 0.9, '#3d9bd4'], [1.2, 1.7, '#2aa876'], [-0.3, 1.9, '#f2a623'], [1.9, -0.5, '#8f73cf']].forEach(([x, z, c], i) => box(jMal, 0.22, 0.22, 0.22, c, x, 0.11, z, { ry: i }));
      bola(jMal, 0.16, '#de5546', 1.0, 0.16, 0.25, 1);
      const jBien = new THREE.Group(); sc.add(jBien);
      [[0.5, '#3d9bd4'], [0.75, '#2aa876'], [0.95, '#f2a623']].forEach(([x, c]) => box(jBien, 0.2, 0.2, 0.2, c, x, 0.6, -3.0, { ry: x }));
      E.refrescos.push(() => { jMal.visible = !S.f.juguetes; jBien.visible = S.f.juguetes; });
      E.inters.push(etiquetaInter('Juguetes', [0.6, 0.6], [0.8, 1.0], 1.0, {
        activo: () => !S.f.juguetes,
        abrir: () => ({
          titulo: 'Juguetes por todos lados', texto: 'Anoche jugaste y dejaste todo en el piso.',
          opciones: [{
            texto: 'Guardarlos en la caja', nota: 'Mamá se da cuenta de estas cosas.',
            min: 4, ef: { animo: 4, confianza: 5 }, anim: 'agacharse', dur: 2.4, progreso: 'Guardando juguetes',
            alTerminar: () => { S.f.juguetes = true; habito('Guardar los juguetes'); },
          }],
        }),
      }));
      // escritorio y mochila
      box(sc, 0.9, 0.06, 1.4, '#e9c48f', 3.3, 0.74, -1.0);
      [[2.9, -1.65], [3.7, -1.65], [2.9, -0.35], [3.7, -0.35]].forEach(([x, z]) => box(sc, 0.06, 0.72, 0.06, '#b08a5a', x, 0.36, z));
      box(sc, 0.45, 0.06, 0.45, '#3d9bd4', 2.45, 0.46, -1.0);
      box(sc, 0.06, 0.5, 0.45, '#3d9bd4', 2.2, 0.72, -1.0);
      [[2.25, -1.2], [2.65, -1.2], [2.25, -0.8], [2.65, -0.8]].forEach(([x, z]) => box(sc, 0.04, 0.44, 0.04, '#2d3a5c', x, 0.22, z));
      E.solido(3.3, -1.0, 0.9, 1.4);
      E.solido(2.45, -1.0, 0.45, 0.45);
      const mMal = new THREE.Group(); sc.add(mMal);
      box(mMal, 0.36, 0.22, 0.42, '#d94f6a', 3.3, 0.88, -0.7, { ry: 0.6 });
      box(mMal, 0.3, 0.02, 0.22, '#f2a623', 3.2, 0.78, -1.3, { ry: 0.3 });
      box(mMal, 0.3, 0.02, 0.22, '#2aa876', 3.45, 0.79, -1.15, { ry: -0.5 });
      box(mMal, 0.3, 0.02, 0.22, '#3d9bd4', 2.95, 0.01, 0.1, { ry: 1.2 });
      const mBien = new THREE.Group(); sc.add(mBien);
      box(mBien, 0.38, 0.46, 0.22, '#d94f6a', 3.55, 0.23, 0.95);
      box(mBien, 0.3, 0.2, 0.04, '#b23a54', 3.55, 0.18, 1.07);
      const mochilaLista = () => (S.fase === 'tarde' ? S.f.tareaTarde : S.f.mochila);
      E.refrescos.push(() => { mMal.visible = !mochilaLista(); mBien.visible = mochilaLista(); });
      E.inters.push(etiquetaInter('Mochila', [2.3, -0.15], [3.3, -0.9], 1.0, {
        activo: () => !mochilaLista(),
        abrir: () => S.fase === 'tarde' ? {
          titulo: 'La tarea de mañana', texto: 'Tienes ejercicios de matemáticas para mañana.' + (S.energia < 25 && !S.f.almorzo ? ' Tienes tanta hambre que no puedes pensar.' : ''),
          opciones: [{
            texto: 'Hacer la tarea y alistar la mochila', nota: window.Habitos.tarea ? 'Sumas y restas. Si te equivocas, tu cachorro te explica cómo se hace.' : `Es lo más largo de la tarde, pero mañana llegas ${gx('tranquilo', 'tranquila')}.`,
            min: 30, anim: 'cocinar', progreso: 'Abriendo el cuaderno',
            // los minutos los suma la tarea según cuánto te demores (tarea.js)
            pasos: window.Habitos.tarea ? [{ ruta: [[2.3, -0.15]], mira: [3.3, -0.9], anim: 'cocinar', dur: 1.2, min: 0, progreso: 'Abriendo el cuaderno' }] : undefined,
            ef: window.Habitos.tarea ? undefined : { animo: 4, confianza: 8 },
            bloqueado: S.energia < 25 && !S.f.almorzo ? 'Tienes demasiada hambre para concentrarte. Primero almuerza.' : null,
            alTerminar: () => {
              const listo = (bien) => { S.f.tareaTarde = true; habito('Hacer la tarea a tiempo'); anotar(bien ? 'Hiciste la tarea de mañana y entendiste todo.' : 'Hiciste la tarea de mañana.', 'bien'); refrescar(); pintarLista(); };
              if (window.Habitos.tarea) window.Habitos.tarea.abrir(listo); else listo(false);
            },
          }],
        } : ({
          titulo: 'Tu mochila', texto: 'Los cuadernos están regados. ¿Pusiste la tarea de matemáticas?',
          opciones: [{
            texto: 'Guardar cuadernos y revisar la tarea', nota: 'Así no te olvidas nada para el colegio.',
            min: 5, ef: { animo: 3, confianza: 4 }, anim: 'cocinar', dur: 2.4, progreso: 'Alistando la mochila',
            alTerminar: () => { S.f.mochila = true; habito('Alistar la mochila la noche anterior'); },
          }],
        }),
      }));
      // uniforme colgado en el ropero
      const uni = new THREE.Group(); sc.add(uni);
      box(uni, 0.5, 0.55, 0.04, '#f6f7f9', 3.45, 1.45, -2.72);
      box(uni, 0.42, 0.55, 0.04, '#2e3d6b', 3.45, 0.9, -2.72);
      box(uni, 0.3, 0.03, 0.03, '#9aa0aa', 3.45, 1.75, -2.71);
      E.refrescos.push(() => { uni.visible = !S.f.vestido; });
      E.inters.push(etiquetaInter('Uniforme', [3.2, -2.15], [3.2, -3.1], 1.0, {
        activo: () => !S.f.vestido,
        abrir: () => abrirVestir(),
      }));
    }

    E.inicio = { pos: [-1.15, -1.6], rot: PI / 2 };
    E.escondites = [
      { nombre: 'Debajo de la cama', en: [-1.25, -0.4], oculto: [-2.5, -1.2], nota: 'Te metes entre las cajas y el polvo.' },
      { nombre: 'Detrás del ropero', en: [2.4, -2.3], oculto: [2.4, -3.25], nota: 'Apretadito contra la pared.' },
    ];
    // el cachorro (su camita, su plato y cómo te sigue) vive en perro.js
    return E;
  }

  function abrirVestir() {
    const buscar = !S.f.zapatos && !S.f.buscoZapato;
    const pasoBuscar = buscar ? [{ ruta: [NINO ? [1.0, 2.2] : [1.3, 1.5]], anim: 'buscar', dur: 2.2, min: 6, progreso: 'Buscando el otro zapato…', alTerminar: () => { S.f.buscoZapato = true; } }] : [];
    const notaZ = buscar ? ' Tus zapatos están regados: perderás 6 min buscando uno.' : '';
    const op = (tipo, texto, nota, min, ef, bloq, extra) => Object.assign({
      texto, nota: nota + notaZ, min: min + (buscar ? 6 : 0), ef, bloqueado: bloq,
      pasos: [{ anim: 'vestirse', dur: 2.2, min, progreso: 'Vistiéndote', alTerminar: () => { S.f.vestido = tipo; vestir(P, tipo); } }].concat(pasoBuscar),
    }, extra || {});
    if (NINO) {
      return {
        titulo: 'El uniforme', texto: 'Mamá dejó tu uniforme limpio y planchado colgado en el ropero.',
        opciones: [op('limpia', 'Ponerte el uniforme', 'Mamá lo dejó listo anoche.', 4, { animo: 4, higiene: 3 })],
      };
    }
    const ops = [];
    ops.push(op('limpia', 'Ropa planchada', 'Te ves bien todo el día.', 4, { animo: 6, higiene: 4 }, S.f.planchado ? null : 'Primero plancha la ropa (está en el planchador).'));
    if (!S.f.planchado) ops.push(op('arrugada', 'Ponerte la ropa sin planchar', 'Rápido, pero se nota arrugada.', 3, { animo: -3 }, null, { alTerminar: () => malHabito('Salir con ropa sin planchar') }));
    if (!S.f.ropaSucia) ops.push(op('sucia', 'Ponerte la ropa de ayer (está en el piso)', 'La más rápida. Está sucia y huele.', 2, { higiene: -14, animo: -5 }, null, { alTerminar: () => malHabito('Repetir ropa sucia') }));
    return { titulo: 'El ropero', texto: '¿Qué te pones hoy?', opciones: ops };
  }

  // ---------- Pasillo
  function construirPasillo() {
    const E = nuevaEscena('pasillo', 'Pasillo', 12, 3.6, {
      piso: '#b3845b', pared: '#e6dcc8',
      puertas: [
        { lado: 'izq', c: 0, ancho: 1.2, a: 'dormitorio', nombre: NINO ? 'Tu cuarto' : 'Dormitorio', fondo: NINO ? '#86b9ad' : '#b4aac8' },
        { lado: 'atras', c: -0.6, ancho: 1.1, a: 'bano', nombre: 'Baño', fondo: '#a8ccd3' },
        { lado: 'der', c: 0, ancho: 1.2, a: 'comedor', nombre: 'Comedor', fondo: '#dcc29b' },
      ],
    });
    const sc = E.scene;
    box(sc, 9.5, 0.02, 1.0, '#8e4f45', 0, 0.011, 0.35, { sombra: false });
    box(sc, 9.3, 0.022, 0.8, '#b8695c', 0, 0.012, 0.35, { sombra: false });
    cuadro(E, -3.4, 1.6, 0.9, 0.6, '#3d9bd4');
    cuadro(E, 2.0, 1.7, 0.6, 0.8, '#de5546');
    planta(sc, -5.3, -1.3);
    E.solido(-5.3, -1.3, 0.5, 0.5);
    box(sc, 1.1, 0.8, 0.38, '#8a5a3b', -3.4, 0.4, -1.58);
    cil(sc, 0.12, 0.16, 0.35, '#f2c14e', -3.1, 0.98, -1.58);
    E.solido(-3.4, -1.58, 1.1, 0.38);
    const lamp = new THREE.PointLight('#ffd9a0', 0.45, 8); lamp.position.set(0, 2.3, 0); sc.add(lamp);

    if (!NINO) {
      box(sc, 0.75, 0.9, 0.65, '#f4f6f8', 4.2, 0.45, -1.4);
      box(sc, 0.75, 0.12, 0.05, '#cfd4dc', 4.2, 0.82, -1.06);
      cil(sc, 0.25, 0.25, 0.04, '#9aa0aa', 4.2, 0.45, -1.07, { rx: PI / 2 });
      const vidrio = cil(sc, 0.2, 0.2, 0.05, '#2b3550', 4.2, 0.45, -1.06, { rx: PI / 2 });
      const tambor = box(sc, 0.28, 0.05, 0.06, '#e8e2d0', 4.2, 0.45, -1.03, { sombra: false });
      E.solido(4.2, -1.4, 0.75, 0.65);
      E.updates.push((dt) => {
        tambor.visible = S.f.lavadora;
        if (S.f.lavadora) tambor.rotation.z += dt * 6;
        if (S.f.lavadora && !E.hum) { E.hum = Sonido.bucle('lavadora'); E.sonidos.push(E.hum); }
        vidrio.material = S.f.lavadora ? mat('#5a8fc0') : mat('#2b3550');
      });
      E.inters.push(etiquetaInter('Lavadora', [4.2, -0.45], [4.2, -1.4], 1.0, {
        activo: () => !S.f.lavadora,
        abrir: () => S.f.ropaSucia ? {
          titulo: 'La lavadora', texto: 'La ropa sucia ya está en el cesto. Si la pones ahora, mañana tendrás ropa limpia.',
          opciones: [{
            texto: 'Poner la ropa a lavar', nota: 'Pensar en mañana desde hoy.',
            min: 4, ef: { animo: 4 }, anim: 'agacharse', dur: 2.0, progreso: 'Cargando la lavadora',
            alTerminar: () => { S.f.lavadora = true; habito('Lavar la ropa a tiempo'); },
          }],
        } : {
          titulo: 'La lavadora', texto: 'La lavadora está vacía. Tu ropa sucia sigue tirada en el piso del dormitorio: primero tienes que recogerla.',
          opciones: [],
        },
      }));
    } else {
      box(sc, 1.0, 1.2, 0.35, '#b08a5a', 4.2, 0.6, -1.6);
      [0.35, 0.75].forEach((y) => box(sc, 0.95, 0.04, 0.3, '#8a5a3b', 4.2, y, -1.58));
      box(sc, 0.18, 0.24, 0.04, '#de5546', 4.0, 1.32, -1.6);
      box(sc, 0.22, 0.18, 0.04, '#3d9bd4', 4.35, 1.29, -1.6);
      E.solido(4.2, -1.6, 1.0, 0.35);
    }

    // obstáculo que dejaste tirado
    const obj = new THREE.Group(); sc.add(obj);
    if (NINO) { box(obj, 0.34, 0.12, 0.2, '#de5546', 0, 0.12, 0); [-0.11, 0.11].forEach((x) => [-0.1, 0.1].forEach((z) => cil(obj, 0.05, 0.05, 0.04, '#1d2340', x, 0.05, z, { rx: PI / 2, seg: 8 }))); }
    else zapato(obj, 0, 0, 0.8, '#5b3a29');
    const base = [1.6, 0.45];
    E.refrescos.push(() => {
      const tirado = NINO ? !S.f.juguetes : !S.f.zapatos;
      obj.visible = tirado;
      if (S.f.tropezo) { obj.position.set(2.5, 0, -1.45); obj.rotation.set(0, 2.2, NINO ? PI / 2 : 0.3); }
      else obj.position.set(base[0], 0, base[1]);
    });
    E.obstaculos.push({
      x: base[0], z: base[1], r: 0.42,
      activo: () => (NINO ? !S.f.juguetes : !S.f.zapatos) && !S.f.tropezo,
      op: {
        texto: 'Tropiezo', min: 2, ef: { animo: -6, salud: -2, motivacion: -5 },
        pasos: [{ anim: 'tropezar', dur: 1.5, min: 2, progreso: '¡Auch!' }],
        alTerminar: () => {
          S.f.tropezo = true;
          avisar(NINO ? 'Te tropezaste con el carrito que dejaste tirado anoche.' : 'Te tropezaste con un zapato que dejaste tirado.', 'mal');
          decir(P, NINO ? '¡Ay! Mi carrito…' : '¡Auch! Ese zapato…', 2.2);
        },
      },
    });
    return E;
  }

  // ---------- Baño
  function construirBano() {
    const E = nuevaEscena('bano', 'Baño', 5.5, 5, {
      piso: '#e9eef0', pared: '#cfe6ea',
      puertas: [{ lado: 'izq', c: 1.2, ancho: 1.1, a: 'pasillo', nombre: 'Pasillo', fondo: '#d9cdb6' }],
    });
    const sc = E.scene;
    for (let i = 0; i < 11; i++) for (let j = 0; j < 10; j++) if ((i + j) % 2 === 0) box(sc, 0.5, 0.004, 0.5, '#c4d6dc', -2.5 + i * 0.5, 0.003, -2.25 + j * 0.5, { sombra: false });
    box(sc, 5.5, 1.1, 0.03, '#8ccad4', 0, 0.55, -2.49, { sombra: false });
    box(sc, 0.03, 1.1, 5, '#8ccad4', 2.74, 0.55, 0, { sombra: false });

    // lavamanos y espejo
    box(sc, 0.25, 0.8, 0.25, '#ffffff', 0, 0.4, -2.2);
    box(sc, 0.8, 0.18, 0.52, '#ffffff', 0, 0.86, -2.15);
    box(sc, 0.5, 0.04, 0.3, '#a9c3cc', 0, 0.94, -2.12, { sombra: false });
    box(sc, 0.05, 0.18, 0.05, '#c8ccd2', 0, 1.02, -2.35);
    box(sc, 0.98, 1.08, 0.04, '#9aa0aa', 0, 1.65, -2.48, { sombra: false });
    box(sc, 0.9, 1.0, 0.05, null, 0, 1.65, -2.47, { mat: matB('#d9eef4'), sombra: false });
    box(sc, 0.3, 0.9, 0.051, null, -0.2, 1.65, -2.465, { mat: matB('#f2fbfd'), sombra: false, rz: 0.4 });
    cil(sc, 0.04, 0.04, 0.16, '#3d9bd4', 0.3, 1.02, -2.25);
    E.solido(0, -2.15, 0.8, 0.6);

    // inodoro
    box(sc, 0.45, 0.42, 0.55, '#ffffff', -1.9, 0.21, -2.0);
    box(sc, 0.47, 0.05, 0.57, '#f2f4f5', -1.9, 0.44, -2.0);
    box(sc, 0.45, 0.55, 0.2, '#ffffff', -1.9, 0.7, -2.38);
    E.solido(-1.9, -2.1, 0.5, 0.75);
    if (NINO) E.inters.push(etiquetaInter('Inodoro', [-1.9, -1.2], [-1.9, -2.0], 0.9, {
      activo: () => true,
      abrir: () => {
        const sentarse = (dur, min, prog) => [{ ruta: [[-1.9, -1.35], [-1.9, -1.72]], mira: [-1.9, 1], anim: 'quieto', sentado: true, dur, min, progreso: prog },
          { ruta: [[-1.9, -1.2]], anim: 'quieto', dur: 0.2, min: 0, progreso: prog }];
        const ops = [{
          texto: 'Hacer pis', nota: S.bano < 35 ? '¡Justo a tiempo!' : 'Mejor ir antes de que den muchas ganas.',
          min: 2, ef: {}, esfuerzo: false, pasos: sentarse(1.6, 2, 'En el baño'),
          alTerminar: () => { S.bano = 100; pintarStat('bano', false); S.f.manos = true; if (!S.f.pisHoy) { S.f.pisHoy = true; habito('Ir al baño a tiempo'); } },
        }];
        const cuesta = S.f.estrenido && !(S.f.curaAgua && S.f.curaFruta);
        ops.push({
          texto: 'Hacer popó', nota: cuesta ? 'Te duele la barriga… Sin agua y sin fruta, va a costar.' : (S.f.estrenido ? 'Tomaste agua y comiste fruta: ahora sí.' : 'Sin apuro.'),
          min: cuesta ? 6 : 4, ef: cuesta ? { animo: -3 } : {}, esfuerzo: false, pasos: sentarse(cuesta ? 3 : 2.2, cuesta ? 6 : 4, cuesta ? 'Te cuesta mucho…' : 'En el baño'),
          alTerminar: () => {
            S.bano = 100; pintarStat('bano', false); S.f.manos = true;
            if (cuesta) { decir(P, 'Ay… no sale. Necesito tomar agua y comer fruta.', 3); return; }
            if (S.f.estrenido) { S.f.estrenido = false; S.f.secoMin = 0; cambiar({ animo: 10, salud: 4 }); decir(P, '¡Uf! Ya no me duele la barriga.', 2.6); anotar('Tomaste agua, comiste fruta y se te pasó el dolor de barriga.', 'bien'); }
          },
        });
        return { titulo: 'El inodoro', texto: S.f.estrenido ? 'Te duele la barriga.' : S.bano < 35 ? '¡Ya no aguantas!' : 'El baño de la casa.', opciones: ops };
      },
    }));

    // ducha
    box(sc, 1.6, 0.06, 1.65, '#dfe7ea', 1.92, 0.03, -1.65);
    box(sc, 0.04, 2.0, 1.1, null, 1.1, 1.0, -1.95, { mat: matB('#bfe6f2', 0.35), sombra: false });
    box(sc, 0.06, 2.0, 0.06, '#c8ccd2', 1.1, 1.0, -1.4);
    cil(sc, 0.03, 0.03, 0.5, '#c8ccd2', 1.95, 2.2, -2.25, { rx: PI / 2 });
    cil(sc, 0.14, 0.1, 0.06, '#c8ccd2', 1.95, 2.18, -2.0);
    E.solido(1.1, -1.95, 0.08, 1.1);
    box(sc, 0.05, 0.7, 0.45, '#2aa876', 2.7, 1.3, 0.6);
    box(sc, 0.08, 0.04, 0.6, '#c8ccd2', 2.7, 1.68, 0.6);
    box(sc, 0.9, 0.02, 0.6, '#2aa876', 0.3, 0.012, -1.1, { sombra: false });

    E.inters.push(etiquetaInter('Lavamanos', [0, -1.45], [0, -2.2], 0.95, {
      activo: () => true,
      abrir: () => {
        const ops = [];
        if (!S.f.dientes) ops.push({
          texto: 'Lavarte los dientes', nota: 'Dos minutos de verdad, no diez segundos.',
          min: 3, ef: { higiene: 14, salud: 2 }, anim: 'cepillar', dur: 3.2, prop: 'cepillo', progreso: 'Lavándote los dientes', espuma: true,
          alTerminar: () => { S.f.dientes = true; habito('Lavarse los dientes'); },
        });
        if (!S.f.cara) ops.push({
          texto: 'Lavarte la cara', nota: 'Agua fría: te despierta.',
          min: 2, ef: { higiene: 6, energia: 5 }, anim: 'lavarCara', dur: 2.0, progreso: 'Lavándote la cara', salpica: true,
          alTerminar: () => { S.f.cara = true; },
        });
        if (S.f.manos) ops.unshift({
          texto: 'Lavarte las manos', nota: 'Con jabón, después de ir al baño. Así no te enfermas.',
          min: 1, ef: { higiene: 4, salud: 2 }, anim: 'lavarCara', dur: 1.2, progreso: 'Lavándote las manos', salpica: true,
          alTerminar: () => { S.f.manos = false; habito('Lavarse las manos'); },
        });
        ops.push({
          texto: 'Mirarte al espejo', nota: 'Ver cómo vas.',
          min: 1, ef: {}, anim: 'quieto', dur: 1.2, progreso: 'Mirándote al espejo',
          alTerminar: () => decir(P, reflejo(), 4.5),
        });
        return { titulo: 'El lavamanos', texto: S.f.dientes ? 'Ya te lavaste los dientes.' : 'Tienes la boca seca y la cara de sueño.', opciones: ops };
      },
    }));
    E.inters.push(etiquetaInter('Ducha', [1.95, -1.6], [1.95, -2.4], 0.95, {
      activo: () => !S.f.ducha,
      abrir: () => ({
        titulo: NINO ? 'Bañarse' : 'La ducha',
        texto: S.f.vestido ? 'Ya estás vestido: tendrás que mojarte la ropa o cambiarte después. Mejor ducharse primero.' : (NINO ? 'Mamá siempre dice que te bañes antes del colegio.' : 'El agua caliente ya está lista.'),
        opciones: [
          { texto: NINO ? 'Bañarte bien' : 'Ducharte bien', nota: 'Limpio para todo el día.', min: NINO ? 8 : 10, ef: { higiene: 40, energia: 8, animo: 6, motivacion: 5 }, anim: 'ducha', dur: 3.6, progreso: 'Duchándote', agua: true,
            alTerminar: () => { S.f.ducha = 'bien'; habito('Ducharse en la mañana'); } },
          { texto: NINO ? 'Solo mojarte el pelo' : 'Ducha rápida', nota: NINO ? 'Para que mamá crea que te bañaste.' : 'Cumple, pero a medias.', min: NINO ? 2 : 4, ef: { higiene: NINO ? 6 : 22, energia: 3 }, anim: 'ducha', dur: 1.8, progreso: NINO ? 'Mojándote el pelo' : 'Ducha rápida', agua: true,
            alTerminar: () => { S.f.ducha = 'rapida'; if (NINO) malHabito('Saltarse el baño'); } },
        ],
      }),
    }));
    return E;
  }

  function reflejo() {
    const f = S.f, partes = [];
    if (!f.vestido) partes.push('todavía en pijama');
    else if (f.vestido === 'sucia') partes.push('con la ropa sucia de ayer');
    else if (f.vestido === 'arrugada') partes.push('con la ropa toda arrugada');
    if (!f.dientes) partes.push('sin lavarme los dientes');
    if (!f.ducha) partes.push('con el pelo parado');
    if (S.energia < 35) partes.push('con cara de sueño');
    if (!partes.length) return NINO ? '¡Listo! Me veo bien para el colegio.' : '¡Bien! Así sí se empieza el día.';
    return 'Mmm… ' + partes.join(', ') + '.';
  }

  // ---------- Comedor y cocina
  function construirComedor() {
    const E = nuevaEscena('comedor', NINO ? 'Comedor' : 'Comedor y cocina', 10, 8, {
      piso: '#d9b68c', pared: '#f0d9b5',
      puertas: [
        { lado: 'izq', c: 1.5, ancho: 1.2, a: 'pasillo', nombre: 'Pasillo', fondo: '#d9cdb6' },
        { lado: 'atras', c: 3.6, ancho: 1.2, salida: true, a: 'calle', nombre: NINO ? (S.fase === 'tarde' || FINDE ? 'Calle' : 'Salida al bus') : 'Salida' },
      ].concat(NINO ? [{ lado: 'der', c: -2.0, ancho: 1.2, a: 'sala', nombre: 'Sala', fondo: '#e9d3c0' }] : []),
    });
    const sc = E.scene;
    for (let i = 0; i < 10; i++) box(sc, 0.02, 0.003, 8, '#c9a477', -4.5 + i, 0.004, 0, { sombra: false });
    ventana(E, 0.9, 1.6, 1.0);
    // cocina
    box(sc, 0.82, 1.9, 0.7, '#e8eef2', -4.5, 0.95, -3.6);
    box(sc, 0.03, 0.5, 0.03, '#9aa0aa', -4.2, 1.3, -3.24);
    box(sc, 3.6, 0.9, 0.7, '#f3efe6', -2.25, 0.45, -3.62);
    box(sc, 3.66, 0.06, 0.74, '#5b4636', -2.25, 0.93, -3.62);
    box(sc, 3.6, 0.6, 0.4, '#e3d5bd', -2.25, 1.9, -3.78);
    box(sc, 0.7, 0.03, 0.55, '#2b2b2b', -3.0, 0.97, -3.6);
    [[-3.17, -3.5], [-2.83, -3.5], [-3.17, -3.75], [-2.83, -3.75]].forEach(([x, z]) => cil(sc, 0.08, 0.08, 0.02, '#555', x, 0.99, z, { seg: 10 }));
    const olla = cil(sc, 0.16, 0.15, 0.16, '#9aa0aa', -3.0, 1.07, -3.5);
    box(sc, 0.6, 0.04, 0.45, '#9fb4bf', -1.3, 0.955, -3.6, { sombra: false });
    box(sc, 0.05, 0.25, 0.05, '#c8ccd2', -1.3, 1.08, -3.88);
    E.solido(-4.5, -3.6, 0.82, 0.7);
    if (NINO) E.inters.push(etiquetaInter('Refrigeradora', [-4.4, -2.75], [-4.5, -3.6], 1.0, {
      abrir: () => ({
        titulo: 'La refrigeradora', texto: S.comida < 30 ? 'Te suena la barriga. ¿Qué sacas?' : 'Hay fruta, galletas y agua fría.',
        opciones: [
          { texto: 'Tomar un vaso de agua', nota: S.f.estrenido ? 'Te ayuda con el dolor de barriga.' : 'Tu cuerpo necesita agua durante todo el día.', min: 1, ef: { agua: 35 }, anim: 'comer', dur: 1.0, prop: 'pan', esfuerzo: false, progreso: 'Tomando agua', alTerminar: () => habito('Tomar agua') },
          { texto: 'Comer una fruta', nota: S.f.estrenido ? 'La fruta ayuda a la barriga.' : 'Sano y te quita un poco el hambre.', min: 3, ef: { comida: 15, agua: 5, salud: 2 }, anim: 'comer', dur: 1.6, prop: 'pan', esfuerzo: false, progreso: 'Comiendo una fruta', alTerminar: () => { habito('Comer fruta'); if (S.f.estrenido) S.f.curaFruta = true; } },
          { texto: 'Comer galletas', nota: 'Rico, pero no alimenta mucho.', min: 2, ef: { comida: 10, animo: 3, salud: -2 }, anim: 'comer', dur: 1.2, prop: 'pan', esfuerzo: false, progreso: 'Comiendo galletas' },
          { texto: 'Tomar agua', nota: 'Te refresca.', min: 1, ef: { energia: 3, salud: 1 }, anim: 'comer', dur: 0.8, esfuerzo: false, progreso: 'Tomando agua' },
        ],
      }),
    }));
    E.solido(-2.25, -3.62, 3.6, 0.7);
    const sucios = new THREE.Group(); sc.add(sucios);
    for (let i = 0; i < 4; i++) cil(sucios, 0.13, 0.11, 0.025, i % 2 ? '#f0ebe0' : '#e6dccb', -0.85, 0.98 + i * 0.03, -3.5, { seg: 10 });
    cil(sucios, 0.1, 0.08, 0.12, '#c76b5c', -0.75, 1.03, -3.75);
    box(sucios, 0.3, 0.02, 0.2, '#8d7a5a', -1.25, 0.98, -3.55, { sombra: false, mat: matB('#8d7a5a', 0.7) });
    const limpio = new THREE.Group(); sc.add(limpio);
    box(limpio, 0.4, 0.04, 0.25, '#c8ccd2', -0.8, 0.98, -3.6);
    for (let i = 0; i < 3; i++) cil(limpio, 0.12, 0.12, 0.02, '#ffffff', -0.92 + i * 0.12, 1.08, -3.6, { rx: PI / 2, seg: 12 });

    // mesa
    box(sc, 2.2, 0.08, 1.2, '#a8754b', 1.2, 0.76, 0.6);
    [[0.2, 0.1], [2.2, 0.1], [0.2, 1.1], [2.2, 1.1]].forEach(([x, z]) => box(sc, 0.08, 0.72, 0.08, '#8a5a3b', x, 0.36, z));
    E.solido(1.2, 0.6, 2.2, 1.2);
    const silla = (x, z, ry) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; sc.add(g);
      box(g, 0.48, 0.06, 0.46, '#c98e5a', 0, 0.46, 0);
      box(g, 0.48, 0.55, 0.06, '#c98e5a', 0, 0.75, -0.22);
      [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([a, b]) => box(g, 0.05, 0.44, 0.05, '#8a5a3b', a, 0.22, b));
    };
    silla(0.7, 1.62, PI);
    silla(1.8, 1.62, PI);
    silla(0.7, -0.4, 0);
    silla(1.8, -0.4, 0);

    // comida servida en la mesa
    const comida = new THREE.Group(); sc.add(comida);
    cil(comida, 0.15, 0.1, 0.08, '#ffffff', 0.7, 0.84, 0.95);
    cil(comida, 0.13, 0.13, 0.02, '#e9d3a3', 0.7, 0.88, 0.95);
    cil(comida, 0.16, 0.16, 0.02, '#ffffff', 0.38, 0.81, 0.85);
    bola(comida, 0.05, '#f2c14e', 0.36, 0.86, 0.85);
    bola(comida, 0.045, '#de5546', 0.42, 0.86, 0.8);
    cil(comida, 0.05, 0.045, 0.16, '#f2a623', 1.0, 0.88, 0.9);
    const platoSucio = new THREE.Group(); sc.add(platoSucio);
    cil(platoSucio, 0.15, 0.1, 0.08, '#ffffff', 0.7, 0.84, 0.95);
    box(platoSucio, 0.12, 0.01, 0.12, '#c9b48a', 0.7, 0.885, 0.95, { sombra: false });
    E.refrescos.push(() => {
      comida.visible = S.fase === 'tarde' ? !S.f.almorzo : S.f.comidaEnMesa;
      platoSucio.visible = S.fase === 'tarde' ? !!S.f.almorzo : !S.f.comidaEnMesa && (NINO ? (S.f.desayuno === 'bueno' || S.f.desayuno === 'rapido') && !S.f.platoLlevado : S.f.platosDesayuno);
      sucios.visible = !S.f.platos;
      limpio.visible = S.f.platos;
      olla.visible = !S.f.platos || NINO;
    });
    planta(sc, -4.4, 3.2);
    E.solido(-4.4, 3.2, 0.5, 0.5);
    box(sc, 0.04, 0.6, 0.9, '#2aa876', 4.97, 1.6, 0.0, { sombra: false });
    box(sc, 0.05, 0.5, 0.8, '#f4f1ea', 4.96, 1.6, 0.0, { sombra: false });

    const asiento = [0.7, 1.52];
    const rutaAsiento = (desde) => [[desde, 2.4], [0.7, 2.4], asiento];

    if (!NINO) {
      E.inters.push(etiquetaInter('Cocina', [-3.0, -2.75], [-3.0, -3.6], 1.0, {
        activo: () => !S.f.desayuno,
        abrir: () => ({
          titulo: 'El desayuno', texto: 'Hay avena, plátanos, huevos y un paquete de galletas.',
          opciones: [
            {
              texto: 'Desayuno completo: avena, fruta y huevo', nota: 'Cocinas y te sientas a comer. Energía para toda la mañana.',
              min: 22, ef: { energia: 35, salud: 6, animo: 6, motivacion: 10 },
              pasos: [
                { anim: 'cocinar', dur: 3.0, min: 12, prop: 'cuchara', progreso: 'Cocinando', alTerminar: () => { S.f.comidaEnMesa = true; refrescar(); } },
                { ruta: [[-3.0, -2.2], [-0.6, 2.4], [0.7, 2.4], asiento], mira: [0.7, 0.6], anim: 'comer', sentado: true, dur: 3.2, min: 10, prop: 'cuchara', progreso: 'Desayunando sentado' },
              ],
              alTerminar: () => { S.f.desayuno = 'bueno'; S.f.comidaEnMesa = false; S.f.platosDesayuno = true; habito('Desayunar bien'); },
            },
            {
              texto: 'Algo rápido: café y galletas', nota: 'Te llena 1 hora. A media mañana te da sueño.',
              min: 4, ef: { energia: 12, salud: -3 }, anim: 'comer', dur: 1.6, progreso: 'Comiendo galletas parado',
              alTerminar: () => { S.f.desayuno = 'rapido'; malHabito('Desayunar galletas'); },
            },
          ],
        }),
      }));
      E.inters.push(etiquetaInter('Lavadero', [-1.3, -2.75], [-1.3, -3.6], 0.9, {
        activo: () => !S.f.platos || S.f.platosDesayuno,
        abrir: () => {
          const extra = S.f.platosDesayuno ? 2 : 0, base = S.f.platos ? 0 : 6;
          return {
            titulo: 'El lavadero', texto: S.f.platos ? 'Solo queda tu plato del desayuno en la mesa.' : 'Los platos de anoche siguen ahí. Ya empiezan a oler.',
            opciones: [{
              texto: S.f.platos ? 'Lavar tu plato del desayuno' : (extra ? 'Lavar todos los platos' : 'Lavar los platos de anoche'), nota: 'Llegar en la noche y encontrar la cocina limpia se siente bien.',
              min: base + extra, ef: { animo: 5 }, anim: 'cocinar', dur: 2.6, prop: 'esponja', progreso: 'Lavando platos', salpica: true,
              alTerminar: () => { S.f.platos = true; S.f.platosDesayuno = false; habito('Lavar los platos'); },
            }],
          };
        },
      }));
      // teléfono
      box(sc, 0.5, 0.75, 0.5, '#8a5a3b', 4.6, 0.375, 2.2);
      box(sc, 0.09, 0.02, 0.16, '#1d2340', 4.55, 0.76, 2.2, { ry: 0.3 });
      E.solido(4.6, 2.2, 0.5, 0.5);
      E.inters.push(etiquetaInter('Celular', [3.95, 2.2], [4.6, 2.2], 0.9, {
        activo: () => !S.f.limpieza || !S.f.desayuno,
        abrir: () => {
          const ops = [];
          if (!S.f.desayuno) ops.push({
            texto: 'Pedir desayuno por delivery', nota: 'No cocinas, pero pagas y esperas a que llegue.',
            min: 23, ef: { energia: 24, salud: 2, dinero: -22 },
            pasos: [
              { anim: 'telefono', dur: 1.4, min: 2, prop: 'telefono', progreso: 'Pidiendo por la app' },
              { anim: 'esperar', dur: 2.4, min: 14, prop: 'telefono', progreso: 'Esperando al repartidor', alTerminar: () => { S.f.comidaEnMesa = true; refrescar(); } },
              { ruta: rutaAsiento(3.95), mira: [0.7, 0.6], anim: 'comer', sentado: true, dur: 2.2, min: 7, prop: 'cuchara', progreso: 'Desayunando' },
            ],
            alTerminar: () => { S.f.desayuno = 'delivery'; S.f.comidaEnMesa = false; S.f.platosDesayuno = true; },
          });
          if (!S.f.limpieza) ops.push({
            texto: 'Contratar limpieza para hoy (S/ 60)', nota: 'Pagas con lo que ganas trabajando y recuperas tiempo en la noche.',
            min: 3, ef: { dinero: -60, animo: 3 }, anim: 'telefono', dur: 1.8, prop: 'telefono', progreso: 'Llamando a la señora de limpieza',
            alTerminar: () => { S.f.limpieza = true; avisar('Cuando vuelvas en la noche, la casa estará limpia.', 'bien'); },
          });
          return { titulo: 'Tu celular', texto: `Tienes S/ ${S.dinero} hasta fin de mes. El dinero te compra tiempo, pero se acaba.`, opciones: ops };
        },
      }));
      E.inters.push(etiquetaInter('Puerta', [3.6, -3.2], [3.6, -4.0], 1.0, {
        activo: () => true,
        abrir: () => S.f.vestido ? {
          titulo: 'Salir al trabajo', texto: S.min > CFG.limite ? `Ya son las ${hora(S.min)}. Vas tarde.` : `Son las ${hora(S.min)}. Llegas a tiempo si sales ahora.`,
          opciones: [{ texto: 'Salir de la casa', nota: 'Lo que no hiciste se queda esperándote.', min: 0, ef: {}, anim: 'saludar', dur: 0.8, progreso: 'Saliendo', alTerminar: () => fin('salida') }],
        } : { titulo: 'Salir al trabajo', texto: 'No puedes salir en pijama. Vístete en el dormitorio.', opciones: [] },
      }));
    } else if (S.fase === 'tarde') {
      comedorTarde(E, sc);
    } else {
      // mamá y papá
      const mama = crearMama();
      mama.root.position.set(-3.0, 0, -2.85);
      mama.root.rotation.y = PI;
      mama.anim = 'cocinar';
      sc.add(mama.root);
      const papa = crearPapa();
      papa.root.position.set(1.8, 0, -0.32);
      papa.anim = 'leer';
      papa.sentado = true;
      ponerProp(papa, 'periodico');
      sc.add(papa.root);
      E.npcs.push(mama, papa);
      E.mama = mama;
      E.papa = papa;
      E.refrescos.unshift(() => { if (!S.f.desayuno) S.f.comidaEnMesa = S.min < CFG.desayunoHasta; });
      E.inters.push(etiquetaInter('Mesa', [0.7, 2.3], [0.7, 0.6], 1.2, {
        rotulo: () => (!S.f.desayuno && S.min < CFG.desayunoHasta ? 'Desayuno servido' : null),
        activo: () => !S.f.desayuno || ((S.f.desayuno === 'bueno' || S.f.desayuno === 'rapido') && !S.f.platoLlevado),
        abrir: () => {
          if (S.f.desayuno) return {
            titulo: 'Tu plato', texto: 'Terminaste. Tu plato sucio sigue en la mesa.',
            opciones: [{
              texto: 'Llevarlo al lavadero', nota: 'Un detalle que mamá agradece.',
              min: 1, ef: { confianza: 6, animo: 2 },
              pasos: [
                { anim: 'agacharse', dur: 0.6, min: 0, progreso: 'Recogiendo tu plato', alTerminar: () => { S.f.platoLlevado = true; ponerProp(P, 'plato'); refrescar(); } },
                { ruta: [[-0.6, 2.3], [-1.3, -2.75]], mira: [-1.3, -3.6], anim: 'cocinar', dur: 0.8, min: 1, progreso: 'Dejándolo en el lavadero' },
              ],
              alTerminar: () => { decir(E.mama, gx('¡Gracias, hijo!', '¡Gracias, hija!'), 2.5); habito('Llevar su plato'); },
            }],
          };
          if (S.min < CFG.desayunoHasta) return {
            titulo: 'El desayuno', texto: 'Mamá: "¡Buenos días! Te serví avena con plátano y un jugo."',
            opciones: [
              { texto: `Desayunar ${gx('tranquilo', 'tranquila')} con la familia`, nota: 'Comes bien y conversas con tus papás.', min: 15, ef: { energia: 35, comida: 50, agua: 20, salud: 5, animo: 8, motivacion: 10, confianza: 5 },
                pasos: [{ ruta: [[0.7, 2.3], [0.7, 1.52]], mira: [0.7, 0.6], anim: 'comer', sentado: true, dur: 3.4, min: 15, prop: 'cuchara', progreso: 'Desayunando con la familia' }],
                alTerminar: () => { S.f.desayuno = 'bueno'; S.f.comidaEnMesa = false; habito('Desayunar en familia'); decir(E.mama, '¡Así me gusta!', 2.5); } },
              { texto: 'Comer rápido y pararte', nota: 'Comes la mitad.', min: 5, ef: { energia: 15, comida: 25, salud: 1 },
                pasos: [{ ruta: [[0.7, 2.3], [0.7, 1.52]], mira: [0.7, 0.6], anim: 'comer', sentado: true, dur: 1.6, min: 5, prop: 'cuchara', progreso: 'Comiendo apurado' }],
                alTerminar: () => { S.f.desayuno = 'rapido'; S.f.comidaEnMesa = false; decir(E.mama, `¡Mastica, ${CFG.nombre}!`, 2.5); } },
            ],
          };
          return {
            titulo: 'El desayuno', texto: `Mamá: "¡${CFG.nombre}, ya es tarde! No hay tiempo para sentarse. Llévate este pan."`,
            opciones: [{ texto: 'Agarrar el pan', nota: 'Es lo único que alcanzas.', min: 1, ef: { energia: 8, comida: 12 }, anim: 'comer', dur: 0.9, prop: 'pan', progreso: 'Agarrando el pan',
              alTerminar: () => { S.f.desayuno = 'pan'; S.f.comidaEnMesa = false; malHabito('Llegar tarde al desayuno'); } }],
          };
        },
      }));
      E.inters.push(etiquetaInter('Puerta', [3.6, -3.2], [3.6, -4.0], 1.0, {
        activo: () => true,
        abrir: () => FINDE ? {
          titulo: 'La puerta de la calle', texto: 'Hoy no hay colegio. Mamá: "Hoy nos quedamos en casa. Después del almuerzo vemos si vamos al parque."', opciones: [],
        } : (S.f.falto || S.min >= 8 * 60 + 30) ? {
          titulo: 'La puerta de la calle', texto: 'Ya es tarde para el colegio. Hoy te quedas en casa.', opciones: [],
        } : S.f.vestido ? {
          titulo: 'Ir al bus', texto: `El bus pasa a las ${hora(CFG.limite)}. Son las ${hora(S.min)}.` + (S.f.mochila ? '' : ' Ojo: tu mochila sigue desordenada en tu cuarto.'),
          opciones: [{ texto: 'Ir al colegio en el bus', nota: (S.f.mochila ? 'Mochila lista.' : 'Te vas sin revisar la mochila.') + ' En el colegio aprendes cosas nuevas.', min: 0, ef: {}, anim: 'saludar', dur: 0.8, progreso: 'Saliendo', alTerminar: () => fin('salida') }],
        } : { titulo: 'Ir al bus', texto: 'Mamá: "¿En pijama al colegio? ¡Ve a ponerte el uniforme!"', opciones: [] },
      }));
      E.alEntrar = () => {
        const f = S.f;
        let txt = `¡Buenos días, ${CFG.nombre}!`;
        if (!f.vestido) txt = `¡${CFG.nombre}! ¿Todavía en pijama?`;
        else if (!f.cama || !f.juguetes) txt = 'Buenos días. ¿Tendiste tu cama y guardaste tus juguetes?';
        else if (!f.dientes) txt = 'Buenos días. ¿Te lavaste los dientes?';
        else if (!f.mamaSaludo) { txt = gx('¡Qué ordenado, hijo! Así da gusto.', '¡Qué ordenada, hija! Así da gusto.'); cambiar({ confianza: 4, motivacion: 6 }); }
        f.mamaSaludo = true;
        setTimeout(() => decir(E.mama, txt, 3.5), 400);
      };
    }
    return E;
  }

  // ================================================================ el día completo del niño o la niña
  // mañana → colegio (aula y recreo) → tarde en casa. Lo que no hiciste antes te alcanza después.
  const FASES = {
    colegio: { inicio: 8 * 60, limite: 13 * 60, meta: 'para la salida del colegio', urg: 'Se acaba el colegio' },
    tarde: { inicio: 14 * 60, limite: 22 * 60, meta: 'para dormir', urg: 'Ya es tarde' },
  };
  const TAREAS_TARDE = [
    ['Almorzar', () => S.f.almorzo, 30, 'con hambre todo cuesta más'],
    ['Hacer la tarea', () => S.f.tareaTarde, 40, 'si no, mañana otra vez sin tarea'],
    ['Tender tu cama', () => S.f.cama, 5], ['Guardar tus juguetes', () => S.f.juguetes, 4],
    ['Echar la ropa sucia al cesto', () => S.f.ropaSucia, 3], ['Ordenar tus zapatos', () => S.f.zapatos, 2],
    ['Cenar con la familia', () => !!S.f.ceno, 20, 'desde las 19:00'],
  ];
  // ---- vida libre: las necesidades bajan solas con el tiempo
  function gastarNecesidades(min) {
    if (!min || S.fase === 'colegio' && examen) return;
    const durmiendo = P.cuerpo.rotation.x !== 0;
    const d = {
      comida: -0.15 * min,
      energia: (durmiendo ? 0.1 : -0.05 - (S.comida < 20 ? 0.05 : 0)) * min,
      higiene: -0.025 * min,
      salud: S.comida < 12 || S.energia < 8 ? -0.05 * min : 0,
    };
    // agua y baño: la sed sube sola; las ganas de ir al baño, más rápido si tomaste mucha agua
    // (un salto grande de horas, como las clases, no cuenta: allá tomaste agua y fuiste al baño)
    if (min <= 60) {
      d.agua = -0.12 * min;
      d.bano = (durmiendo ? -0.03 : -0.07 - (S.agua > 70 ? 0.07 : 0)) * min;
    }
    if (S.f.estrenido) { d.animo = -0.03 * min; d.salud = (d.salud || 0) - 0.02 * min; }
    Object.keys(d).forEach((k) => { S[k] = clamp(S[k] + d[k], 0, 100); });
    revisarCuerpo(min);
    if (!$('#hud').hidden && Math.floor(S.min) % 3 === 0) ['comida', 'agua', 'bano', 'energia', 'higiene', 'salud', 'animo'].forEach((k) => pintarStat(k, false));
  }
  // lo que el cuerpo te avisa: sed, ganas de ir al baño y la barriga cuando no tomas agua
  function revisarCuerpo(min) {
    const f = S.f;
    if (S.fase === 'colegio' || cine) return;
    const ocupado = accion || panelAbierto || visita || levantando;
    // casi no tomas agua por mucho rato: te estriñes (te duele la barriga hasta que tomes agua y comas fruta)
    if (min > 60) return;
    f.secoMin = S.agua < 20 ? (f.secoMin || 0) + min : Math.max(0, (f.secoMin || 0) - min * 0.5);
    if (!f.estrenido && f.secoMin > 150) {
      f.estrenido = true; f.curaAgua = false; f.curaFruta = false;
      anotar('Casi no tomaste agua y te duele la barriga: estás estreñido. El agua y la fruta ayudan.', 'mal');
      avisar('Te duele la barriga: estás estreñido. Toma agua, come fruta y luego ve al baño.', 'mal');
      malHabito('No tomar agua');
    }
    if (ocupado) return;
    if (S.bano < 18 && (f.avisoBano || -999) < S.min - 40) { f.avisoBano = S.min; decir(P, '¡Uy! Tengo que ir al baño…', 2.4); }
    else if (S.agua < 22 && (f.avisoSed || -999) < S.min - 90) { f.avisoSed = S.min; decir(P, 'Tengo sed… un vaso de agua estaría bien.', 2.6); }
    else if (f.estrenido && (f.avisoPanza || -999) < S.min - 120) { f.avisoPanza = S.min; decir(P, 'Me duele la barriga…', 2.4); }
    // te aguantaste demasiado: accidente (no pasa nada grave, pero tienes que cambiarte)
    if (S.bano <= 0) {
      S.bano = 100;
      cambiar({ higiene: -25, animo: -12 });
      anotar(gx('No llegaste al baño a tiempo y te mojaste. Tuviste que cambiarte.', 'No llegaste al baño a tiempo y te mojaste. Tuviste que cambiarte.'), 'mal');
      banner('urg', '¡Ay, no!', 'No llegaste al baño', 'La próxima, ve apenas sientas ganas');
      malHabito('Aguantarse las ganas de ir al baño');
    }
  }
  // tomar agua (desde la refrigeradora, las comidas o el bebedero)
  function tomarAgua(n) { if (NINO) cambiar({ agua: n }); }
  // el horario de la casa: el colegio es opcional, a la 1 llega la tarde, de noche se duerme
  function revisarHorario() {
    if (S.fase === 'manana' && !FINDE && !S.f.fueColegio && !S.f.falto && S.min >= 8 * 60 + 30) {
      S.f.falto = true;
      meta('colegio', false);
      cambiar({ confianza: -10 });
      malHabito('Faltar al colegio');
      anotar('No fuiste al colegio. Mamá se dio cuenta.', 'mal');
      visitaMama([`${CFG.nombre}, ¿no fuiste al colegio?`, 'Hoy te quedas en casa, pero mañana vas. Así no vas a aprender nada.'], { esconder: false });
    }
    if (S.fase === 'manana' && S.min >= 13 * 60) mediodiaEnCasa();
    if (S.fase === 'tarde' && S.min >= 23 * 60 + 30 && !S.f.durmio) {
      // te quedaste despierto hasta muy tarde: te quedas dormido donde estés
      S.f.durmio = true; S.f.desvelo = true;
      anotar('Te quedaste despierto hasta muy tarde y te dormiste sin darte cuenta.', 'mal');
      malHabito('Desvelarse');
      fin('dia');
    }
  }
  function mediodiaEnCasa() {
    if (FINDE) {
      const hechas = TAREAS.filter(([, ok]) => ok()).length;
      meta('mama', hechas >= TAREAS.length - 2);
      meta('ayudar', !!S.f.riego);
      meta('jugar', !!S.f.jugoPerro);
    }
    cambiarFase('tarde', S.min);
    S.f.llegoCasa = true;
    mostrarLista();
    avisar('Ya es mediodía: mamá sirvió el almuerzo en el comedor.');
  }
  function dormir() {
    if (S.f.durmio) return;
    S.f.durmio = true;
    if (S.fase !== 'tarde') cambiarFase('tarde', S.min);   // dormir siempre termina el día
    const tarde = S.min >= 22 * 60;
    anotar(tarde ? 'Te fuiste a dormir tarde.' : 'Te fuiste a dormir a buena hora.', tarde ? 'mal' : 'bien');
    if (!tarde) habito('Dormir a buena hora'); else malHabito('Dormir tarde');
    meta('dormir', !tarde);
    fin('dia');
  }
  // avisa a los módulos de lo que pasa en el juego (álbum, logros, crecer…)
  function evento(tipo, datos) {
    if (typeof ganchos === 'undefined') return;
    ganchos.evento.forEach((f) => { try { f(tipo, datos); } catch (e) { console.error(e); } });
  }
  function anotar(texto, clase, h) { S.diario.push([h || hora(S.min), texto, clase || '']); }
  function cambiarFase(f, minuto) {
    terminarTutorial();
    S.fase = f;
    Object.assign(CFG, { inicio: FASES[f].inicio, limite: FASES[f].limite, meta: FASES[f].meta, urg: FASES[f].urg });
    S.min = minuto;
    S.ultTent = minuto;
    Object.keys(avisosTiempo).forEach((k) => delete avisosTiempo[k]);
    if (f === 'tarde') { TAREAS = TAREAS_TARDE; $('#lItems').innerHTML = ''; $('#lista').hidden = true; }
    initStats();
    contarLogros();
  }
  function irAlColegio(motivo) {
    const tardanza = motivo === 'bus';
    const hechas = TAREAS.filter(([, ok]) => ok()).length;
    anotar(`En la mañana hiciste ${hechas} de ${TAREAS.length} cosas que te pidió mamá.`, hechas >= 5 ? 'bien' : 'mal');
    S.f.fueColegio = true;
    meta('colegio', true);
    evento('colegio');
    meta('mama', hechas >= TAREAS.length - 2);
    if (!S.f.perroComio) { meta('perro', false); if (enCapitulo()) anotar(`${PERFIL.mascota.nombre} se quedó sin comer en la mañana.`, 'mal'); }
    if (tardanza) { anotar('Se fue el bus. Papá te llevó al colegio y llegó tarde a su trabajo.', 'mal'); cambiar({ confianza: -15 }); }
    else anotar('Subiste al bus a tiempo.', 'bien');
    S.dinero = S.confianza >= 60 ? 3 : 0;
    anotar(S.dinero ? 'Papá te dio S/ 3 de propina porque ayudaste en casa.' : 'Papá: "Hoy no hay propina. No hiciste tus cosas."', S.dinero ? 'bien' : 'mal');
    $('#lista').hidden = true;
    const tips = [
      tardanza ? 'Se fue el bus: papá te lleva enojado.' : 'Vas en el bus del colegio.',
      S.dinero ? 'Papá te dio S/ 3 de propina.' : 'Papá no te dio propina: "No hiciste tus cosas".',
      S.f.desayuno === 'bueno' ? 'Desayunaste bien: vas con energía.' : 'No desayunaste bien: ya te suena el estómago.',
      S.f.mochila ? 'Llevas tu tarea en la mochila.' : 'Tu tarea se quedó en el escritorio.',
    ];
    cambiarFase('colegio', 8 * 60 + (tardanza ? 20 : 0));
    irA('aula', { desde: 'calle', titulo: 'Colegio', tips });
  }
  // fin de semana: la mañana termina con el almuerzo en casa y sigue la tarde
  function almuerzoFinde() {
    const hechas = TAREAS.filter(([, ok]) => ok()).length;
    anotar(`En la mañana hiciste ${hechas} de ${TAREAS.length} cosas.`, hechas >= TAREAS.length - 2 ? 'bien' : 'mal');
    meta('mama', hechas >= TAREAS.length - 2);
    meta('ayudar', !!S.f.riego);
    meta('jugar', !!S.f.jugoPerro);
    if (!S.f.perroComio) { meta('perro', false); if (enCapitulo()) anotar(`${PERFIL.mascota.nombre} se quedó sin comer en la mañana.`, 'mal'); }
    $('#lista').hidden = true;
    const tips = [
      'Llegó la hora del almuerzo.',
      hechas >= TAREAS.length - 2 ? 'Hiciste casi todo en la mañana: mamá está contenta.' : 'Te quedaron cosas por hacer: mamá lo notó.',
      'En la tarde toca la tarea del lunes.',
      'Mamá te espera en el comedor.',
    ];
    cambiarFase('tarde', 13 * 60);
    irA('comedor', { desde: 'calle', titulo: 'Casa · Almuerzo', tips });
  }
  function irACasa() {
    if (!S.f.comioKiosco) anotar('En el recreo no comiste nada.', 'mal');
    anotar(S.f.comioKiosco === 'bien' ? 'Clases hasta la 1:00 pm. Aguantaste gracias al sándwich.' : 'Clases hasta la 1:00 pm con el estómago vacío. No entendiste nada.', S.f.comioKiosco === 'bien' ? 'bien' : 'mal', '13:00');
    const tips = [
      'Pasaron tres horas más de clases.',
      S.f.comioKiosco === 'bien' ? 'Comiste en el recreo: llegas con algo de hambre.' : 'No comes nada desde la mañana: llegas con MUCHA hambre.',
      `Tu nota en el examen: ${S.nota != null ? S.nota : '—'} de 20.`,
      'Mamá te está esperando en el comedor.',
    ];
    cambiarFase('tarde', 14 * 60);
    S.agua = Math.max(S.agua, 40); S.bano = Math.min(S.bano, 45);   // llegas con ganas de ir al baño
    irA('comedor', { desde: 'calle', titulo: 'Casa · Tarde', tips });
  }

  function pizarra(E, x, y, z, w, h, lineas) {
    const cv = document.createElement('canvas');
    cv.width = 640; cv.height = 240;
    const g = cv.getContext('2d');
    g.fillStyle = '#2f5d46'; g.fillRect(0, 0, 640, 240);
    g.fillStyle = '#f4f1ea'; g.textAlign = 'center';
    lineas.forEach((l, i) => { g.font = (i === 0 ? 'bold 46px ' : '34px ') + 'Trebuchet MS, sans-serif'; g.fillText(l, 320, 70 + i * 62); });
    box(E.scene, w + 0.16, h + 0.16, 0.05, '#8a5a3b', x, y, z, { sombra: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
    m.position.set(x, y, z + 0.03);
    E.scene.add(m);
  }
  function nino(o) { const n = crearPersona(Object.assign({ escala: 0.72, cabezaGrande: true, pantalon: '#2e3d6b', camisa: '#f6f7f9' }, o)); n.voz = 'nino'; return n; }

  // ---------- Aula
  function construirAula() {
    const E = nuevaEscena('aula', 'Aula · 2.º grado', 10, 8, {
      piso: '#d6b88f', pared: '#cfe3c8',
      puertas: [{ lado: 'izq', c: 2.4, ancho: 1.2, salida: true, a: 'calle', nombre: 'Pasillo del colegio' }],
    });
    const sc = E.scene;
    pizarra(E, 0, 1.65, -E.d / 2 + 0.02, 4.2, 1.5, ['Examen de matemáticas', PERFIL && (PERFIL.edad || 7) >= 9 ? 'Tablas de multiplicar' : 'Sumas y restas', 'Hoy se entrega la tarea']);
    ventana(E, -3.7, 1.2, 1.0);
    ventana(E, 3.7, 1.2, 1.0);
    box(sc, 1.8, 0.75, 0.8, '#8a5a3b', 0, 0.375, -2.4);
    box(sc, 0.5, 0.04, 0.35, '#f4f1ea', -0.4, 0.77, -2.4, { ry: 0.2 });
    box(sc, 0.3, 0.12, 0.25, '#de5546', 0.5, 0.81, -2.4);
    E.solido(0, -2.4, 1.8, 0.8);
    const profe = crearPersona({ piel: '#d9a882', pelo: '#6b3d22', camisa: '#4a90d9', pantalon: '#3a3f4b' });
    profe.root.position.set(0, 0, -3.2);
    sc.add(profe.root);
    E.npcs.push(profe);
    E.profe = profe;
    profe.voz = 'profe';
    const carpeta = (x, z) => {
      box(sc, 0.9, 0.06, 0.6, '#e9c48f', x, 0.68, z);
      [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]].forEach(([a, b]) => box(sc, 0.05, 0.66, 0.05, '#7a7f8c', x + a, 0.33, z + b));
      box(sc, 0.45, 0.05, 0.42, '#3d9bd4', x, 0.44, z + 0.55);
      box(sc, 0.45, 0.45, 0.05, '#3d9bd4', x, 0.7, z + 0.78);
      E.solido(x, z, 0.9, 0.6);
    };
    const colores = [['#de5546', '#3b2418'], ['#2aa876', '#1d1612'], ['#f2a623', '#6b3d22'], ['#8f73cf', '#2b1d14']];
    [[-3, 0], [0, 0], [3, 0], [-3, 2.2], [0, 2.2], [3, 2.2]].forEach(([x, z], i) => {
      carpeta(x, z);
      if (i < 4) {
        const k = nino({ piel: ['#e3b48e', '#c98e6a', '#d29f78', '#b98563'][i], pelo: colores[i][1], camisa: '#f6f7f9' });
        k.root.position.set(x, 0, z + 0.52);
        k.root.rotation.y = PI;
        k.sentado = true;
        k.anim = 'leer';
        sc.add(k.root);
        E.npcs.push(k);
      }
    });
    E.inicio = { pos: [-4.0, 2.4], rot: PI / 2 };
    E.inters.push(etiquetaInter('Profesora', [0, -1.55], [0, -3.2], 1.2, {
      alto: 2.0,
      activo: () => !S.f.tareaEntregada,
      abrir: () => ({
        titulo: 'La profesora', texto: `Profesora: "A ver, ${CFG.nombre}, ¿trajiste tu tarea de matemáticas?"`,
        opciones: [S.f.mochila
          ? { texto: 'Entregar tu tarea', nota: 'La hiciste ayer y alistaste la mochila en la mañana.', min: 2, ef: { animo: 8, motivacion: 6 }, anim: 'saludar', esfuerzo: false,
            alTerminar: () => { S.f.tareaEntregada = 'si'; habito('Cumplir con la tarea'); anotar('Entregaste la tarea. La profesora te felicitó.', 'bien'); decir(E.profe, `¡Muy bien, ${CFG.nombre}! Así se hace.`, 3); } }
          : { texto: 'Decir que la olvidaste', nota: 'Se quedó en tu escritorio porque no alistaste la mochila.', min: 2, ef: { animo: -10, motivacion: -6 }, anim: 'esperar', esfuerzo: false,
            alTerminar: () => { S.f.tareaEntregada = 'no'; malHabito('Olvidar la tarea'); anotar('No entregaste la tarea: tienes cero.', 'mal'); decir(E.profe, `Otra vez sin tarea, ${CFG.nombre}. Tienes cero.`, 3.2); } }],
      }),
    }));
    E.inters.push(etiquetaInter('Tu carpeta', [3.8, 2.75], [3, 2.2], 1.0, {
      activo: () => !S.f.examenHecho,
      abrir: () => ({
        titulo: 'El examen', texto: `Cinco preguntas de ${PERFIL && (PERFIL.edad || 7) >= 9 ? 'multiplicar' : 'sumas y restas'}. ${S.energia < 35 ? 'Tienes tanta hambre que te cuesta pensar.' : S.energia >= 60 ? `Desayunaste bien: estás ${gx('concentrado', 'concentrada')}.` : `Estás algo ${gx('cansado', 'cansada')}.`}`,
        opciones: [{
          texto: 'Sentarte y dar el examen', nota: 'Tu energía y tu motivación deciden cuánto tiempo tienes para pensar.', min: 1, ef: {}, esfuerzo: false,
          bloqueado: S.f.tareaEntregada ? null : 'Primero habla con la profesora.',
          pasos: [{ ruta: [[3.8, 2.75], [3, 2.72]], mira: [3, 1.5], anim: 'leer', sentado: true, dur: 1.0, min: 1, progreso: 'Sentándote' }],
          despues: iniciarExamen,
        }],
      }),
    }));
    E.alEntrar = () => {
      setTimeout(() => decir(E.profe, 'Buenos días, chicos. Primero entreguen su tarea y luego empezamos el examen.', 4), 300);
      if (S.energia < 40) setTimeout(() => { decir(P, 'Tengo hambre…', 2.5); Sonido.sfx('tripa'); }, 5200);
      avisar('Habla con la profesora y luego siéntate en tu carpeta.');
    };
    return E;
  }

  // ---------- Examen (minijuego)
  let examen = null;
  function iniciarExamen() {
    const max = 2.6 + 6 * S.energia / 100 + 1.6 * S.motivacion / 100 + (S.f.mochila ? 1.2 : 0);
    examen = { i: 0, ok: 0, n: 5, t: max, max, preg: null, hambre: S.energia < 35, grr: 1.5, bloq: false };
    P.sentado = true; P.anim = 'leer';
    P.root.position.set(3, 0, 2.72); P.root.rotation.y = PI;
    $('#exHoja').classList.toggle('hambre', examen.hambre);
    $('#exPie').textContent = examen.hambre
      ? 'No desayunaste bien: tu estómago suena, las respuestas se mueven y el tiempo se te va.'
      : S.energia >= 60 ? 'Desayunaste bien: tienes tiempo para pensar cada respuesta.' : `Estás algo ${gx('cansado', 'cansada')}: piensa rápido.`;
    $('#exSeg').textContent = `${max.toFixed(1)} s por pregunta`;
    $('#examen').hidden = false;
    siguientePregunta();
  }
  function siguientePregunta() {
    const e = examen;
    if (e.i >= e.n) { terminarExamen(); return; }
    // 9 años: tablas de multiplicar
    if (PERFIL && (PERFIL.edad || 7) >= 9) {
      const a = 2 + Math.floor(Math.random() * 8), b = 2 + Math.floor(Math.random() * 8), r = a * b;
      const set = new Set([r]);
      while (set.size < 3) { const d = [a, b, -a, -b, 1, -1, 10][Math.floor(Math.random() * 7)]; if (r + d > 0) set.add(r + d); }
      e.preg = { a, b, r, signo: '×', ops: Array.from(set).sort(() => Math.random() - 0.5) };
      e.t = e.max; e.bloq = false;
      $('#exNum').textContent = `Pregunta ${e.i + 1} de ${e.n}`;
      $('#exOk').textContent = `${e.ok} correctas`;
      $('#exPreg').textContent = `${a} × ${b} = ?`;
      pintarOpsExamen();
      return;
    }
    // 7 años: sumas hasta 20 y restas sin negativos
    const suma = Math.random() < 0.6;
    let a = 2 + Math.floor(Math.random() * 10), b = 1 + Math.floor(Math.random() * 9);
    if (!suma && b > a) [a, b] = [b, a];
    const r = suma ? a + b : a - b, signo = suma ? '+' : '−';
    const set = new Set([r]);
    while (set.size < 3) { const d = [1, -1, 2, -2, 10, -10][Math.floor(Math.random() * 6)]; if (r + d >= 0) set.add(r + d); }
    e.preg = { a, b, r, signo, ops: Array.from(set).sort(() => Math.random() - 0.5) };
    e.t = e.max; e.bloq = false;
    $('#exNum').textContent = `Pregunta ${e.i + 1} de ${e.n}`;
    $('#exOk').textContent = `${e.ok} correctas`;
    $('#exPreg').textContent = `${a} ${e.preg.signo} ${b} = ?`;
    pintarOpsExamen();
  }
  function pintarOpsExamen() {
    const cont = $('#exOps');
    cont.innerHTML = examen.preg.ops.map((v, k) => `<button class="op ex-op" type="button" data-v="${v}"><kbd>${k + 1}</kbd><span class="op-t">${v}</span></button>`).join('');
    cont.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => responder(+b.dataset.v, b)));
  }
  function responder(v, btn) {
    const e = examen;
    if (!e || e.bloq) return;
    e.bloq = true;
    const bien = v === e.preg.r;
    if (bien) e.ok++;
    if (btn) btn.classList.add(bien ? 'correcta' : 'mala');
    $('#exOps').querySelectorAll('button').forEach((b) => { if (+b.dataset.v === e.preg.r && !bien) b.classList.add('era'); });
    if (!btn) $('#exPreg').textContent = '¡Se acabó el tiempo!';
    Sonido.sfx(bien ? 'bien' : 'perder');
    setTimeout(() => { e.i++; siguientePregunta(); }, 900);
  }
  function actualizarExamen(dt) {
    const e = examen;
    if (e.bloq) return;
    e.t -= dt;
    $('#exTiempo').style.width = clamp(e.t / e.max * 100, 0, 100) + '%';
    if (e.hambre) {
      e.grr -= dt;
      if (e.grr <= 0) {
        e.grr = 1.6 + Math.random() * 1.4;
        Sonido.sfx('tripa');
        e.preg.ops.sort(() => Math.random() - 0.5);
        pintarOpsExamen();
        sacudir($('#exHoja'));
      }
    }
    if (e.t <= 0) responder(null, null);
  }
  function terminarExamen() {
    const e = examen;
    examen = null;
    $('#examen').hidden = true;
    const nota = Math.round(e.ok / e.n * 20);
    S.nota = nota;
    S.f.examenHecho = true;
    meta('examen', nota >= 14);
    evento('examen', { nota });
    P.sentado = false;
    P.root.position.set(3.8, 0, 2.75);
    const aprobo = nota >= 11;
    anotar(`Examen de matemáticas: ${nota} de 20.${e.hambre && !aprobo ? ' El hambre no te dejó concentrarte.' : ''}`, aprobo ? 'bien' : 'mal');
    cambiar(aprobo ? { animo: 8, motivacion: 6 } : { animo: -12, motivacion: -8 });
    if (nota >= 16) habito('Rendir bien en el examen');
    else if (!aprobo) malHabito('Desaprobar el examen');
    decir(escena.profe, aprobo ? `Muy bien, ${CFG.nombre}: sacaste ${nota}.` : `${CFG.nombre}, sacaste ${nota}. Así no vas a pasar el bimestre. Voy a escribirle a tu mamá.`, 4);
    setTimeout(() => { Sonido.sfx('timbre'); avisar('¡Riiing! Suena el timbre del recreo.'); }, 4200);
    setTimeout(() => irA('patio', {
      desde: 'aula', titulo: 'Colegio · Recreo',
      tips: ['Pasaron dos horas de clase.', S.f.desayuno === 'bueno' ? 'Desayunaste bien: todavía tienes energía.' : 'Tu estómago suena: no desayunaste bien.', S.dinero ? `Tienes S/ ${S.dinero} de propina para el kiosco.` : 'No tienes propina para el kiosco.'],
    }), 5600);
  }

  // ---------- Patio (recreo)
  function construirPatio() {
    const E = nuevaEscena('patio', 'Patio · Recreo', 12, 8, {
      piso: '#bdb7aa', pared: '#d9906e', zocalo: false,
      puertas: [{ lado: 'atras', c: 4.2, ancho: 1.4, salida: true, a: 'calle', nombre: 'Volver a clases' }],
    });
    const sc = E.scene;
    [[0, 0.01, 0, 0.06, 7.2], [3.2, 0.01, 0, 6.4, 0.06], [-3.2, 0.01, 0, 6.4, 0.06]].forEach(([x, y, z, w, d]) => box(sc, w, 0.005, d, '#f4f1ea', x, y, z, { sombra: false }));
    // kiosco
    box(sc, 2.4, 1.0, 0.8, '#f2c14e', -3.8, 0.5, -3.1);
    box(sc, 2.6, 0.1, 1.3, '#de5546', -3.8, 2.1, -3.0);
    [-1.2, 1.2].forEach((dx) => box(sc, 0.08, 2.1, 0.08, '#8a5a3b', -3.8 + dx, 1.05, -2.45));
    [['#de5546', -4.6], ['#3d9bd4', -4.2], ['#2aa876', -3.8], ['#f2a623', -3.4]].forEach(([c, x]) => box(sc, 0.25, 0.25, 0.2, c, x, 1.13, -3.1));
    box(sc, 0.5, 0.18, 0.3, '#d9a35b', -3.0, 1.09, -3.1);
    E.solido(-3.8, -3.1, 2.4, 0.8);
    const vende = crearPersona({ piel: '#c98e6a', pelo: '#1d1612', camisa: '#f4f1ea', pantalon: '#55607a' });
    vende.voz = 'vendedor';
    vende.root.position.set(-3.8, 0, -3.75);
    sc.add(vende.root);
    E.npcs.push(vende);
    // arco y pelota
    box(sc, 0.08, 1.2, 0.08, '#ffffff', 5.6, 0.6, 0.2);
    box(sc, 0.08, 1.2, 0.08, '#ffffff', 5.6, 0.6, 2.2);
    box(sc, 0.08, 0.08, 2.08, '#ffffff', 5.6, 1.2, 1.2);
    const pelota = bola(sc, 0.14, '#ffffff', 3.2, 0.14, 1.2, 1);
    // amigos jugando
    const amigos = [nino({ piel: '#c98e6a', pelo: '#1d1612', camisa: '#de5546' }), nino({ piel: '#e3b48e', pelo: '#6b3d22', camisa: '#2aa876' })];
    amigos.forEach((a) => { a.anim = 'caminar'; a.vel = 2; sc.add(a.root); E.npcs.push(a); });
    E.updates.push((dt, t) => {
      amigos.forEach((a, i) => {
        const ang = t * 1.4 + i * PI;
        a.root.position.set(3.2 + Math.cos(ang) * 1.3, 0, 1.2 + Math.sin(ang) * 0.9);
        a.root.rotation.y = Math.atan2(-Math.sin(ang) * 1.3, Math.cos(ang) * 0.9);
      });
      pelota.position.set(3.2 + Math.cos(t * 1.4 + 0.5) * 1.0, 0.14 + Math.abs(Math.sin(t * 5)) * 0.2, 1.2 + Math.sin(t * 1.4 + 0.5) * 0.7);
    });
    // banca y árboles
    box(sc, 2.0, 0.08, 0.5, '#8a5a3b', -4.0, 0.45, 2.6);
    [-0.85, 0.85].forEach((dx) => box(sc, 0.08, 0.45, 0.45, '#5b4636', -4.0 + dx, 0.22, 2.6));
    E.solido(-4.0, 2.6, 2.0, 0.5);
    planta(sc, 5.4, -3.3); planta(sc, -5.5, 0.4);
    E.inicio = { pos: [-0.5, 2.6], rot: PI };
    E.inters.push(etiquetaInter('Kiosco', [-3.8, -2.15], [-3.8, -3.1], 1.1, {
      alto: 2.4,
      activo: () => !S.f.comioKiosco,
      abrir: () => (S.dinero >= 2 ? {
        titulo: 'El kiosco', texto: `Señora del kiosco: "¿Qué vas a querer, hijito?" Tienes S/ ${S.dinero} de propina.`,
        opciones: [
          { texto: 'Sándwich de pollo y un jugo (S/ 3)', nota: 'Te llena hasta la tarde.', min: 5, ef: { energia: 28, comida: 30, animo: 6, motivacion: 4, dinero: -3 }, anim: 'comer', prop: 'pan', esfuerzo: false, bloqueado: S.dinero >= 3 ? null : 'No te alcanza.',
            alTerminar: () => { S.f.comioKiosco = 'bien'; anotar('En el recreo te compraste un sándwich con tu propina.', 'bien'); } },
          { texto: 'Galletas y una gaseosa (S/ 2)', nota: 'Rico, pero en una hora tienes hambre otra vez.', min: 3, ef: { energia: 10, comida: 12, salud: -3, dinero: -2 }, anim: 'comer', prop: 'pan', esfuerzo: false,
            alTerminar: () => { S.f.comioKiosco = 'mal'; malHabito('Gastar la propina en golosinas'); anotar('Gastaste la propina en golosinas.', 'mal'); } },
        ],
      } : {
        titulo: 'El kiosco', texto: 'Señora del kiosco: "¿Qué vas a querer, hijito?" Buscas en tus bolsillos… no tienes nada. Papá no te dio propina porque no hiciste tus cosas en la mañana. Ves a los demás comer.',
        opciones: [],
      }),
    }));
    E.inters.push(etiquetaInter('Amigos', [2.0, 2.4], [3.2, 1.2], 1.3, {
      alto: 1.6,
      activo: () => !S.f.jugo,
      abrir: () => ({
        titulo: 'Fútbol en el recreo', texto: `Tus amigos: "¡${CFG.nombre}, ven a jugar! Te toca de arquero."`,
        opciones: [
          { texto: 'Jugar fútbol con tus amigos', nota: 'Necesitas energía para correr.', min: 15, ef: { animo: 12, energia: -10, motivacion: 6 }, anim: 'patear', esfuerzo: false, bloqueado: lluvia() ? 'Está lloviendo: hoy el recreo es bajo techo.' : S.energia >= 35 ? null : `Estás muy ${gx('cansado', 'cansada')} y con hambre para correr.`,
            alTerminar: () => { S.f.jugo = 'si'; habito('Jugar con sus amigos'); anotar('Jugaste fútbol con tus amigos en el recreo.', 'bien'); } },
          { texto: 'Mirarlos desde lejos', nota: 'Te quedas sin jugar.', min: 10, ef: { animo: -6 }, anim: 'esperar', esfuerzo: false,
            alTerminar: () => { S.f.jugo = 'no'; anotar('No tuviste energía para jugar en el recreo.', 'mal'); } },
        ],
      }),
    }));
    E.inters.push(etiquetaInter('Salida', [4.2, -3.2], [4.2, -4.0], 1.0, {
      activo: () => true,
      abrir: () => ({
        titulo: 'Fin del recreo', texto: 'Suena el timbre. Después del recreo tienes clases hasta la 1:00 pm y luego vuelves a casa.',
        opciones: [{ texto: 'Volver a clases y terminar el día', nota: S.f.comioKiosco === 'bien' ? 'Comiste algo: aguantarás.' : 'Con el estómago vacío, tres horas más se hacen eternas.', min: 0, ef: {}, anim: 'saludar', dur: 0.8, esfuerzo: false, progreso: 'Volviendo a clases', alTerminar: irACasa }],
      }),
    }));
    E.alEntrar = () => {
      const hambre = S.f.desayuno === 'bueno' ? -8 : S.f.desayuno === 'rapido' ? -16 : -24;
      S.min = 10 * 60;
      cambiar({ energia: hambre });
      // en el recreo vas al baño y tomas agua del bebedero
      S.bano = 100; S.agua = Math.max(S.agua, 35); tomarAgua(25);
      anotar('En el recreo fuiste al baño y tomaste agua del bebedero.', 'bien');
      banner('urg', 'Recreo · 10:00', hambre < -10 ? 'Tienes hambre' : 'Todavía tienes energía', hambre < -10 ? 'Dos horas de clase sin buen desayuno' : 'El buen desayuno te sostuvo');
      if (S.energia < 40) setTimeout(() => { decir(P, S.dinero ? 'Tengo hambre… voy al kiosco.' : 'Tengo hambre… y no tengo plata.', 3); Sonido.sfx('tripa'); }, 1500);
    };
    return E;
  }

  // ---------- Tarde en casa: el comedor con mamá
  function comedorTarde(E, sc) {
    const mama = crearMama();
    mama.root.position.set(1.4, 0, -1.3);
    sc.add(mama.root);
    E.npcs.push(mama);
    E.mama = mama;
    E.updates.push(() => { const m = mama.root.position, p = P.root.position; mama.root.rotation.y = Math.atan2(p.x - m.x, p.z - m.z); });
    E.inters.push(etiquetaInter('Cena', [0.7, 2.3], [0.7, 0.6], 1.2, {
      activo: () => S.min >= (S.f.cenaTarde ? 19 * 60 + 30 : 19 * 60) && !S.f.ceno,
      abrir: () => ({
        titulo: 'La cena', texto: 'Mamá sirvió la cena y papá ya llegó del trabajo.',
        opciones: [{ texto: 'Cenar con la familia', nota: 'Comes y conversan de cómo les fue en el día.', min: 20, ef: { comida: 45, agua: 15, energia: 8, animo: 6, confianza: 3 }, esfuerzo: false,
          pasos: [{ ruta: [[0.7, 2.3], [0.7, 1.52]], mira: [0.7, 0.6], anim: 'comer', sentado: true, dur: 3.4, min: 20, prop: 'cuchara', progreso: 'Cenando con la familia' }],
          alTerminar: () => { S.f.ceno = true; habito('Cenar en familia'); anotar('Cenaste con tu familia.', 'bien'); } }],
      }),
    }));
    E.inters.push(etiquetaInter('Almuerzo', [0.7, 2.3], [0.7, 0.6], 1.2, {
      activo: () => !S.f.almorzo,
      abrir: () => ({
        titulo: 'El almuerzo', texto: 'Mamá dejó arroz con pollo y ensalada en la mesa.',
        opciones: [
          { texto: 'Almorzar sentado', nota: 'Recuperas la energía para todo lo que falta.', min: 30, ef: { energia: 40, comida: 55, agua: 15, salud: 5, animo: 6, motivacion: 8 }, esfuerzo: false,
            pasos: [{ ruta: [[0.7, 2.3], [0.7, 1.52]], mira: [0.7, 0.6], anim: 'comer', sentado: true, dur: 6, min: 30, prop: 'cuchara', progreso: 'Almorzando' }],
            alTerminar: () => { S.f.almorzo = 'bien'; habito('Almorzar antes de todo'); anotar('Almorzaste. Recuperaste la energía.', 'bien'); } },
          { texto: 'Comer parado unas cucharadas', nota: 'Para ir rápido a la tablet.', min: 8, ef: { energia: 15, comida: 25 }, anim: 'comer', prop: 'cuchara', esfuerzo: false,
            alTerminar: () => { S.f.almorzo = 'rapido'; malHabito('Comer a la carrera'); anotar('Comiste a la carrera, parado.', 'mal'); } },
        ],
      }),
    }));
    E.inters.push(etiquetaInter('Puerta', [3.6, -3.2], [3.6, -4.0], 1.0, {
      activo: () => true,
      abrir: () => ({ titulo: 'La puerta de la calle', texto: 'Mamá: "¡Tú no sales a jugar hasta terminar tus cosas!"', opciones: [] }),
    }));
    E.alEntrar = () => {
      if (S.f.llegoCasa) return;
      S.f.llegoCasa = true;
      const comio = S.f.comioKiosco === 'bien';
      cambiar({ energia: comio ? -8 : -22 });
      banner('urg', 'Llegas a casa · 2:00 pm', comio ? 'Con algo de hambre' : 'Con muchísima hambre', comio ? 'El sándwich del recreo te ayudó' : 'No comes nada desde la mañana');
      Sonido.sfx('tripa');
      const f = S.f, malas = [];
      if (!f.cama) malas.push('dejaste la cama destendida');
      if (!f.juguetes) malas.push('tus juguetes siguen en el piso');
      if (!f.ropaSucia) malas.push('tu ropa sucia está tirada');
      if ((f.desayuno === 'bueno' || f.desayuno === 'rapido') && !f.platoLlevado) malas.push('dejaste tu plato en la mesa');
      const lineas = [];
      if (malas.length >= 2) {
        S.f.mamaMolesta = true;
        mama.anim = 'jarras';
        lineas.push(`¡${CFG.nombre}! ¿Tú crees que esta casa es un hotel?`);
        lineas.push(`En la mañana ${unir(malas)}.`);
        if (S.nota != null && S.nota < 11) lineas.push(`Y encima la profesora me escribió: sacaste ${S.nota} en el examen.`);
        if (S.f.tareaEntregada === 'no') lineas.push('¡Y otra vez sin tarea!');
        lineas.push('Primero come algo. Después ordenas tu cuarto y haces la tarea. A las cinco reviso.');
        cambiar({ animo: -12, motivacion: -10, confianza: -5 });
        anotar(`Mamá te recibió molesta: ${unir(malas)}.`, 'mal');
      } else if (malas.length === 1) {
        lineas.push(`Hola, ${gx('hijo', 'hija')}. Solo te faltó algo: ${malas[0]}.`);
        lineas.push('Almuerza y después lo arreglas. Y no te olvides de la tarea.');
        anotar('Mamá te recordó una cosa que dejaste pendiente.', '');
      } else {
        mama.anim = 'saludar';
        lineas.push(`¡Hola, ${gx('campeón', 'campeona')}! Dejaste todo ordenado en la mañana.`);
        lineas.push(`Almuerza ${gx('tranquilo', 'tranquila')} y luego haces tu tarea. Si terminas, puedes jugar videojuegos.`);
        cambiar({ animo: 10, motivacion: 8, confianza: 5 });
        anotar('Mamá te recibió contenta: dejaste todo ordenado.', 'bien');
      }
      setTimeout(() => visitaMama(lineas, { pedidos: TAREAS_TARDE.map(([t]) => t), alTerminar: () => { mama.anim = S.f.mamaMolesta ? 'jarras' : 'quieto'; mostrarLista(); avisar('Primero almuerza: con hambre todo te cuesta más.'); } }), 1200);
    };
  }


  // ================================================================ la casa completa: sala, jardín y mirador
  // Lugares para el tiempo libre (y las tentaciones). Todo lo que hagas aquí también cuesta minutos.
  const temprano = () => S.fase === 'manana' && !FINDE;
  function arbol(par, x, z, y0, alto, verde) {
    cil(par, 0.14, 0.2, alto, '#7a5232', x, y0 + alto / 2, z);
    bola(par, 0.75, verde || '#3f8f5a', x, y0 + alto + 0.3, z, 1);
    bola(par, 0.55, '#58a86b', x + 0.4, y0 + alto + 0.05, z + 0.2, 1);
    bola(par, 0.5, '#2f7a4b', x - 0.4, y0 + alto + 0.1, z - 0.15, 1);
  }

  // ---------- Sala
  function construirSala() {
    const E = nuevaEscena('sala', 'Sala', 10, 7, {
      piso: '#c79a6b', pared: '#e9d3c0',
      puertas: [
        { lado: 'izq', c: 1.0, ancho: 1.2, a: 'comedor', nombre: 'Comedor', fondo: '#dcc29b' },
        { lado: 'der', c: 1.4, ancho: 1.2, a: 'jardin', nombre: 'Jardín', fondo: '#9fd18b' },
      ],
    });
    const sc = E.scene;
    ventana(E, 1.6, 1.4, 1.0);
    cuadro(E, -3.8, 1.6, 0.9, 0.7, '#8f73cf');
    box(sc, 4.2, 0.02, 2.6, '#d9667a', -1.4, 0.011, -0.6, { sombra: false });
    // televisor y PS5
    box(sc, 2.4, 0.5, 0.5, '#5b4636', -1.4, 0.25, -3.15);
    E.solido(-1.4, -3.15, 2.4, 0.5);
    box(sc, 1.9, 1.05, 0.08, '#1d2340', -1.4, 1.3, -3.42);
    const pantalla = box(sc, 1.75, 0.92, 0.02, null, -1.4, 1.3, -3.37, { mat: new THREE.MeshBasicMaterial({ color: '#1b2238' }), sombra: false });
    box(sc, 0.12, 0.42, 0.32, '#f4f1ea', -0.1, 0.71, -3.15);
    box(sc, 0.125, 0.06, 0.33, '#1d2340', -0.1, 0.71, -3.15);
    box(sc, 0.16, 0.05, 0.1, '#1d2340', -1.0, 0.53, -3.0, { ry: 0.3 });
    // sofá y mesa de centro
    const sofa = '#5b8fd1';
    box(sc, 2.8, 0.45, 0.9, sofa, -1.4, 0.23, 1.0);
    box(sc, 2.8, 0.65, 0.25, sofa, -1.4, 0.65, 1.42);
    [-1, 1].forEach((k) => box(sc, 0.25, 0.6, 0.9, '#4a78b5', -1.4 + k * 1.4, 0.4, 1.0));
    E.solido(-1.4, 1.45, 2.8, 0.3);
    [-1, 1].forEach((k) => E.solido(-1.4 + k * 1.4, 1.0, 0.3, 0.9));
    box(sc, 1.3, 0.38, 0.6, '#8a5a3b', -1.4, 0.19, -0.9);
    E.solido(-1.4, -0.9, 1.3, 0.6);
    const tablet = box(sc, 0.26, 0.02, 0.18, '#1d2340', -0.6, 0.47, 0.9, { ry: 0.4 });
    // librero
    box(sc, 0.5, 1.9, 1.5, '#8a5a3b', 4.7, 0.95, -1.4);
    ['#de5546', '#3d9bd4', '#f2c14e', '#2aa876', '#8f73cf'].forEach((c, i) => [0.5, 1.05, 1.6].forEach((y, k) => box(sc, 0.3, 0.32, 0.12, c, 4.6, y + 0.18, -1.95 + i * 0.24 + k * 0.03)));
    E.solido(4.7, -1.4, 0.5, 1.5);
    planta(sc, 4.3, 2.6);
    E.solido(4.3, 2.6, 0.5, 0.5);
    let parpadeo = 0;
    E.updates.push((dt) => {
      const ps = accion && accion.op && accion.op.ps5;
      parpadeo += dt;
      pantalla.material.color.set(ps ? (Math.sin(parpadeo * 9) > 0 ? '#3d9bd4' : '#8f73cf') : '#1b2238');
    });
    E.refrescos.push(() => { tablet.visible = !(accion && accion.op && accion.op.tablet); });

    E.inters.push(etiquetaInter('PS5', [-1.4, 0.3], [-1.4, -3.2], 1.0, {
      abrir: () => {
        const tareaPend = S.fase === 'tarde' && !S.f.tareaTarde;
        return {
          titulo: 'La PS5', texto: temprano() ? 'Está ahí, apagada. "Solo una partida…", piensas. Pero el bus no espera.'
            : tareaPend ? 'Todavía no haces la tarea. Mamá dijo: primero las obligaciones.' : 'Un rato de juego después de cumplir.',
          opciones: [{
            texto: 'Jugar una partida', nota: temprano() ? 'Te diviertes, pero se te va el tiempo de la mañana.' : tareaPend ? 'Si mamá te ve, se va a enojar.' : 'Te lo ganaste.',
            min: 20, ef: { animo: 12, motivacion: temprano() || tareaPend ? -8 : 2, energia: -3 }, ps5: true, esfuerzo: false,
            pasos: [{ ruta: [[-1.4, 0.3], [-1.4, 0.95]], mira: [-1.4, -3.2], anim: 'esperar', sentado: true, dur: 4, min: 20, progreso: 'Jugando PS5' }],
            alTerminar: () => {
              if (temprano()) malHabito('Videojuegos antes del colegio');
              else if (tareaPend) { malHabito('Jugar antes de la tarea'); cambiar({ confianza: -6 }); visitaMama([`¡${CFG.nombre}! ¿PS5 sin haber hecho la tarea?`, 'Apágala y ve a hacer tus cosas.']); }
            },
          }],
        };
      },
    }));
    E.inters.push(etiquetaInter('Sofá', [-2.3, 0.3], [-2.3, 1.0], 0.8, {
      activo: () => S.energia < 75,
      abrir: () => ({
        titulo: 'El sofá', texto: 'Está suavecito… da sueño.',
        opciones: [{ texto: 'Echarte una siesta', nota: 'Recuperas energía, pero se van 30 minutos.', min: 30, ef: { energia: 22, animo: 3 }, esfuerzo: false,
          pasos: [{ ruta: [[-2.3, 0.3], [-2.3, 0.95]], mira: [-2.3, -3], anim: 'dormir', sentado: true, dur: 4, min: 30, progreso: 'Durmiendo una siesta' }],
          alTerminar: () => anotar('Dormiste una siesta en el sofá.', '') }],
      }),
    }));
    E.inters.push(etiquetaInter('Tablet', [-0.4, 0.2], [-0.6, 0.9], 0.9, {
      abrir: () => ({
        titulo: 'La tablet', texto: 'Videos cortitos, uno detrás de otro…',
        opciones: [{
          texto: 'Ver videos un ratito', nota: 'Un "ratito" que siempre se alarga.', min: 15, ef: { animo: 6, motivacion: -6, energia: -2 }, tablet: true, esfuerzo: false,
          pasos: [{ ruta: [[-0.6, 0.3], [-0.6, 0.95]], mira: [-0.6, -1], anim: 'telefono', sentado: true, dur: 4, min: 15, prop: 'telefono', progreso: 'Viendo videos' }],
          alTerminar: () => { if (temprano()) malHabito('Tablet en la mañana'); },
        }],
      }),
    }));
    E.inters.push(etiquetaInter('Libros', [3.9, -1.4], [4.7, -1.4], 1.0, {
      activo: () => !S.f.leyo,
      abrir: () => ({
        titulo: 'El librero', texto: 'Tus cuentos favoritos y uno nuevo que te regaló la abuela.',
        opciones: [{
          texto: 'Leer un cuento', nota: 'Te calma y te da ganas de hacer cosas.', min: 10, ef: { motivacion: 8, animo: 4 }, anim: 'leer', dur: 4, prop: 'libro', progreso: 'Leyendo un cuento',
          alTerminar: () => { S.f.leyo = true; habito('Leer un rato'); },
        }],
      }),
    }));
    E.inicio = { pos: [-3.6, 1.0], rot: PI / 2 };
    E.escondites = [{ nombre: 'Detrás del sofá', en: [-1.4, 2.3], oculto: [-1.4, 1.95], nota: 'Agachado detrás del respaldo.' }];
    return E;
  }

  // ---------- Jardín (patio de la casa)
  function construirJardin() {
    const E = nuevaEscena('jardin', 'Jardín', 10, 7, { exterior: true,
      piso: '#7cb36a', pared: '#d9b48a', alto: 1.1, cielo: '#9fd3f0', zocalo: false,
      puertas: [{ lado: 'izq', c: 1.6, ancho: 1.3, a: 'sala', nombre: 'Sala', fondo: '#e9d3c0' }],
    });
    const sc = E.scene;
    // camino de piedras
    [[-4.2, 1.6], [-3.4, 1.4], [-2.6, 1.0], [-1.8, 0.5], [-1.0, 0.0]].forEach(([x, z], i) => cil(sc, 0.28, 0.3, 0.05, '#c9c2b4', x, 0.025, z + (i % 2) * 0.1, { sombra: false }));
    // árbol y casita del perro
    arbol(sc, -3.1, -2.2, 0, 1.6);
    E.solido(-3.1, -2.2, 0.6, 0.6);
    const cx = 3.3, cz = -2.3;
    box(sc, 1.2, 0.85, 1.0, '#c56b4a', cx, 0.43, cz);
    box(sc, 0.75, 0.08, 1.15, '#7a3b2e', cx - 0.33, 1.05, cz, { rz: 0.6 });
    box(sc, 0.75, 0.08, 1.15, '#7a3b2e', cx + 0.33, 1.05, cz, { rz: -0.6 });
    box(sc, 0.42, 0.5, 0.02, '#2b1d14', cx, 0.3, cz + 0.51, { sombra: false });
    box(sc, 0.55, 0.16, 0.02, '#f4efe4', cx, 0.98, cz + 0.52, { sombra: false });
    E.solido(cx, cz, 1.3, 1.1);
    // plantas
    const tierra = box(sc, 2.2, 0.18, 0.7, '#6b4a33', 0.2, 0.09, -3.0);
    const flores = [];
    ['#de5546', '#f2c14e', '#8f73cf', '#f28fb3', '#de5546'].forEach((c, i) => {
      cil(sc, 0.02, 0.02, 0.3, '#3f8f5a', -0.6 + i * 0.4, 0.33, -3.0);
      flores.push(bola(sc, 0.09, c, -0.6 + i * 0.4, 0.5, -3.0));
    });
    E.solido(0.2, -3.0, 2.2, 0.7);
    E.refrescos.push(() => { tierra.material = mat(S.f.riego ? '#4e3524' : '#6b4a33'); flores.forEach((f) => f.scale.setScalar(S.f.riego ? 1.25 : 0.85)); });
    // escalera al techo
    const ex = 1.9, ez = -3.25;
    [-0.25, 0.25].forEach((k) => box(sc, 0.06, 2.9, 0.06, '#9aa0aa', ex + k, 1.45, ez));
    for (let y = 0.3; y < 2.8; y += 0.38) box(sc, 0.5, 0.04, 0.05, '#9aa0aa', ex, y, ez);
    box(sc, 0.9, 0.3, 0.04, '#f2c14e', ex, 2.75, ez - 0.05);
    E.solido(ex, ez, 0.7, 0.3);
    // la pelota y el arco están en futbol.js

    E.inters.push(etiquetaInter('Escalera al techo', [ex, ez + 0.8], [ex, ez], 1.0, {
      abrir: () => ({
        titulo: 'La escalera al techo', texto: 'Desde arriba se ven los árboles del barrio. Papá dice que siempre hay que subir con cuidado.',
        opciones: [{ texto: 'Subir al mirador', nota: 'Un lugar tranquilo para pensar.', min: 2, anim: 'estirarse', dur: 1.4, progreso: 'Subiendo con cuidado', esfuerzo: false, alTerminar: () => irA('mirador') }],
      }),
    }));
    E.inters.push(etiquetaInter('Plantas', [0.2, -2.25], [0.2, -3.0], 1.1, {
      activo: () => !S.f.riego,
      abrir: () => ({
        titulo: 'Las plantas de mamá', texto: 'La tierra está seca. Mamá te enseñó a regarlas.',
        opciones: [{ texto: 'Regarlas', nota: 'Mamá se pone contenta cuando ayudas.', min: 5, ef: { animo: 5, motivacion: 3, confianza: 4 }, anim: 'agacharse', dur: 3, agua: true, progreso: 'Regando las plantas',
          alTerminar: () => { S.f.riego = true; habito('Regar las plantas'); } }],
      }),
    }));
    E.inicio = { pos: [ex, ez + 1.0], rot: PI };
    E.escondites = [
      { nombre: 'Detrás del árbol', en: [-3.1, -1.3], oculto: [-3.1, -2.9], nota: 'El tronco te tapa… casi.' },
      { nombre: 'Dentro de la casita del perro', en: [3.3, -1.45], oculto: [3.3, -2.3], nota: '¡Apenas cabes!' },
    ];
    return E;
  }

  // ---------- Mirador (el techo)
  function construirMirador() {
    const E = nuevaEscena('mirador', 'Mirador · Techo', 8, 6, { exterior: true, piso: '#b9b2a6', pared: '#d9cdb6', sinParedes: true, cielo: '#8fc6ea' });
    const sc = E.scene;
    // muro bajo alrededor
    box(sc, 8.3, 0.6, 0.15, '#d9cdb6', 0, 0.3, -3.05);
    [-1, 1].forEach((k) => box(sc, 0.15, 0.6, 6.1, '#d9cdb6', k * 4.08, 0.3, 0));
    E.solido(0, -3.05, 8.3, 0.2); E.solido(-4.08, 0, 0.2, 6.1); E.solido(4.08, 0, 0.2, 6.1);
    E.solido(0, 3.2, 8.3, 0.2);
    // el barrio, tres metros más abajo
    box(sc, 60, 0.1, 50, '#6fa65d', 0, -3.0, -10, { sombra: false });
    box(sc, 3, 0.02, 50, '#8b8f99', -6.5, -2.94, -10, { sombra: false });
    [[-10, -8, 2.2], [-12, -16, 2.6], [-3, -14, 2.0], [3, -9, 2.4], [8, -13, 3.0], [12, -7, 2.2], [6, -20, 2.8], [-7, -22, 2.4], [14, -18, 2.6], [-15, -4, 2.0], [16, 0, 2.4]].forEach(([x, z, a], i) => {
      arbol(sc, x, z, -3, a + 1.5, ['#3f8f5a', '#2f7a4b', '#58a86b'][i % 3]);
    });
    [[-11, -12, '#de5546'], [9, -10, '#3d9bd4'], [2, -18, '#f2c14e'], [-4, -26, '#8f73cf']].forEach(([x, z, c]) => {
      box(sc, 3.2, 2.6, 3, '#f0e2c8', x, -1.7, z);
      box(sc, 3.6, 0.3, 3.4, c, x, -0.25, z);
    });
    arbol(sc, -6.4, -4.5, -3, 4.2);
    arbol(sc, 6.6, -5.0, -3, 4.6, '#2f7a4b');
    // pájaros que vuelan en círculo
    const pajaros = [0, 1, 2].map((i) => { const g = new THREE.Group(); [-1, 1].forEach((k) => box(g, 0.25, 0.02, 0.08, '#1d2340', k * 0.12, 0, 0, { rz: k * 0.3, sombra: false })); sc.add(g); return g; });
    E.updates.push((dt, r) => pajaros.forEach((g, i) => {
      const a = r * 0.3 + i * 2.1;
      g.position.set(Math.cos(a) * (8 + i), 4 + Math.sin(r + i) * 0.5, -10 + Math.sin(a) * 5);
      g.children.forEach((c, k) => { c.rotation.z = (k ? -1 : 1) * Math.sin(r * 8 + i) * 0.5; });
    }));
    // banca y trampilla
    box(sc, 1.6, 0.1, 0.5, '#8a5a3b', -1.8, 0.45, -2.3);
    [-0.7, 0.7].forEach((k) => box(sc, 0.08, 0.45, 0.4, '#5b4636', -1.8 + k, 0.22, -2.3));
    E.solido(-1.8, -2.3, 1.6, 0.5);
    box(sc, 0.9, 0.04, 0.9, '#5b4636', 2.6, 0.02, 1.8, { sombra: false });
    E.inters.push(etiquetaInter('Mirar el paisaje', [-1.8, -1.6], [-1.8, -3.5], 1.1, {
      abrir: () => ({
        titulo: 'El mirador', texto: 'Los árboles se mueven con el viento. Desde aquí todo se ve más tranquilo.',
        opciones: [{
          texto: 'Sentarte a mirar y respirar', nota: S.f.mirador ? 'Ya subiste hoy: igual te calma, pero menos.' : 'Te calma y te devuelve las ganas.',
          min: 8, ef: S.f.mirador ? { animo: 4 } : { animo: 12, motivacion: 8 }, esfuerzo: false,
          pasos: [{ ruta: [[-1.8, -1.85]], mira: [-1.8, -6], anim: 'quieto', sentado: true, dur: 5, min: 8, progreso: 'Mirando los árboles' }],
          alTerminar: () => { if (!S.f.mirador) habito('Tomarte un respiro'); S.f.mirador = true; },
        }],
      }),
    }));
    E.inters.push(etiquetaInter('Bajar al jardín', [2.6, 1.1], [2.6, 1.8], 1.0, {
      abrir: () => ({ titulo: 'La escalera', texto: '¿Bajas al jardín?', opciones: [{ texto: 'Bajar con cuidado', min: 2, anim: 'agacharse', dur: 1.2, progreso: 'Bajando', esfuerzo: false, alTerminar: () => irA('jardin') }] }),
    }));
    E.inicio = { pos: [2.6, 1.1], rot: PI };
    return E;
  }

  const CONSTRUIR = { dormitorio: construirDormitorio, pasillo: construirPasillo, bano: construirBano, comedor: construirComedor, aula: construirAula, patio: construirPatio, sala: construirSala, jardin: construirJardin, mirador: construirMirador };

  function construir(nombre, desde) {
    particulas.length = 0;
    efectos.length = 0;
    if (escena) escena.sonidos.forEach((parar) => parar());
    if (visita && !visita.avisado && visita.o.alTerminar && visita.fase !== 'esperando') { visita.avisado = true; visita.o.alTerminar(); }
    visita = null;
    if (escondido) { P.root.visible = true; escondido = null; }
    burbujas.forEach((b, el) => { el.hidden = true; });
    burbujas.clear();
    escena = CONSTRUIR[nombre]();
    escena.scene.add(P.root);
    const p = desde && escena.puertas.find((q) => q.a === desde);
    if (p) {
      const [x, z] = p.lado === 'atras' ? [p.c, -escena.d / 2 + 1.0] : p.lado === 'izq' ? [-escena.w / 2 + 1.0, p.c] : [escena.w / 2 - 1.0, p.c];
      P.root.position.set(x, 0, z);
      P.root.rotation.y = p.lado === 'atras' ? 0 : p.lado === 'izq' ? PI / 2 : -PI / 2;
    } else if (desde && escena.inicio) {
      P.root.position.set(escena.inicio.pos[0], 0, escena.inicio.pos[1]);
      P.root.rotation.y = escena.inicio.rot;
    }
    P.sentado = false;
    agregarEscondites(escena);
    ganchos.construir.forEach((f) => f(nombre, escena, desde));
    refrescar();
    $('#hLugar').textContent = escena.titulo;
    crearEtiquetas();
    camaraDirecta = true;
  }
  function refrescar() { if (escena) escena.refrescos.forEach((r) => r()); }

  // ---------------------------------------------------------------- etiquetas de puertas
  let etiquetas = [], etqObjetos = [];
  function crearEtiquetas() {
    const cont = $('#etiquetas');
    cont.innerHTML = '';
    etiquetas = escena.puertas.map((p) => {
      const el = document.createElement('div');
      el.className = 'etq';
      el.textContent = (p.salida ? '' : '→ ') + p.nombre;
      cont.appendChild(el);
      const [x, z] = enPared(escena, p.lado, p.c, -0.1);
      return { el, pos: new THREE.Vector3(x, 2.45, z) };
    });
    etqObjetos = escena.inters.map((it) => {
      const el = document.createElement('div');
      el.className = 'etq-obj';
      cont.appendChild(el);
      return { el, it, pos: new THREE.Vector3(it.mira[0], it.alto || 1.45, it.mira[1]) };
    });
    textosObjetos();
  }
  // cuánto tiempo toma usar cada objeto, para decidir antes de acercarse
  function minutosDe(it) {
    try {
      const ms = it.abrir().opciones.filter((o) => !o.bloqueado && o.min >= 2).map((o) => o.min);
      if (!ms.length) return '';
      const a = Math.min.apply(null, ms), b = Math.max.apply(null, ms);
      return a === b ? `${a} min` : `${a}–${b} min`;
    } catch (e) { return ''; }
  }
  // lo que dice la etiqueta: a veces cambia según el momento (la mesa es "Desayuno" cuando está servido)
  const rotulo = (it) => (it.rotulo && it.rotulo()) || it.nombre;
  function textosObjetos() {
    etqObjetos.forEach((o) => {
      const m = minutosDe(o.it);
      o.tieneTiempo = !!m;
      o.el.innerHTML = `<span class="n">${rotulo(o.it)}</span>${m ? `<span class="m">${ICONOS.reloj}${m}</span>` : ''}`;
    });
  }
  const tmpV = new THREE.Vector3();
  function aPantalla(v) {
    tmpV.copy(v).project(camera);
    return { x: (tmpV.x * 0.5 + 0.5) * canvas.clientWidth, y: (-tmpV.y * 0.5 + 0.5) * canvas.clientHeight, ok: tmpV.z < 1 };
  }

  // ---------------------------------------------------------------- burbujas, avisos y logros
  const burbujas = new Map();
  const efectos = [];
  let visita = null;
  const colaVisitas = [];
  function decir(quien, texto, seg, conVoz) {
    if (!quien) return;   // por si esa persona ya no está en el cuarto
    const el = quien === P ? $('#burbuja') : $('#burbujaNpc');
    el.textContent = texto;
    el.hidden = false;
    burbujas.set(el, { quien, hasta: reloj + (seg || 3) });
    if (conVoz !== false) Sonido.hablar(texto, quien === P ? 'yo' : (quien.voz || 'nino'));
  }
  function avisar(txt, tipo) {
    const d = document.createElement('div');
    d.textContent = txt;
    if (tipo) d.className = tipo;
    $('#aviso').appendChild(d);
    setTimeout(() => d.remove(), 4300);
  }
  function banner(tipo, titulo, texto, sub) {
    const el = document.createElement('div');
    el.className = 'logro ' + tipo;
    const ico = tipo === 'bien' ? ICONOS.estrella : tipo === 'urg' ? ICONOS.reloj : ICONOS.roto;
    el.innerHTML = `<span class="l-ico">${ico}</span><div class="l-txt"><small>${titulo}</small><b>${texto}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
    $('#logros').appendChild(el);
    setTimeout(() => el.classList.add('sale'), 3300);
    setTimeout(() => el.remove(), 3800);
  }
  function flash(tipo) {
    const f = $('#flash');
    f.className = 'flash';
    void f.offsetWidth;
    f.className = 'flash ' + tipo;
  }
  function sacudir(el) {
    el = el || document.body;
    el.classList.remove('sacude');
    void el.offsetWidth;
    el.classList.add('sacude');
  }
  function celebrar(tipo) {
    flash(tipo);
    anillo(P.root.position, tipo === 'bien' ? '#ffd23f' : '#e2574c');
    P.brillo = { c: new THREE.Color(tipo === 'bien' ? '#ffcf4a' : '#ff3b2f'), t: 1 };
    if (tipo === 'bien') destellos();
    else { humo(); sacudir(canvas); }
  }
  function contarLogros(pop) {
    if (!$('#hStats').querySelector('.logros-fila')) return;
    const el = $('#hStats').querySelector('.logros-fila');
    if (!el) return;
    el.querySelector('.n-bien').textContent = S.habitos.length;
    el.querySelector('.n-mal').textContent = S.malos.length;
    if (pop) {
      const t = el.querySelector(pop === 'bien' ? '.c-bien' : '.c-mal');
      t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
    }
  }
  function habito(nombre) {
    if (!S.habitos.includes(nombre)) S.habitos.push(nombre);
    evento('habito', nombre);
    banner('bien', '¡Buen hábito ganado!', nombre, '+1 ★ · día 1 de 5 para volverlo automático');
    cambiar({ motivacion: 8 });
    celebrar('bien');
    Sonido.sfx('logro');
    contarLogros('bien');
  }
  function malHabito(nombre) {
    if (!S.malos.includes(nombre)) S.malos.push(nombre);
    evento('malHabito', nombre);
    banner('mal', 'Estás sacrificando algo', nombre, 'Si lo repites 5 días, se vuelve automático');
    cambiar({ motivacion: -8 });
    celebrar('mal');
    Sonido.sfx('mal');
    contarLogros('mal');
  }

  // ---------------------------------------------------------------- stats animadas
  const D = {};
  function initStats() {
    const cont = $('#hStats');
    cont.innerHTML = LISTA_STATS.map(([id, n]) => `
      <div class="stat" data-id="${id}" style="--c:${COLOR[id]}">
        <span class="ico">${ICONOS[id]}</span>
        <div class="s-cuerpo">
          <div class="s-fila"><span class="s-n">${n}</span><span class="s-estado"></span><b class="s-v"></b></div>
          <div class="s-barra"><i class="s-trail"></i><i class="s-fill"></i></div>
        </div>
      </div>`).join('')
      + (NINO && S.fase === 'manana' ? '' : `<div class="stat dinero" data-id="dinero" style="--c:${COLOR.dinero}"><span class="ico">${ICONOS.dinero}</span><div class="s-cuerpo"><div class="s-fila"><span class="s-n">Dinero</span><b class="s-v"></b></div></div></div>`)
      + `<div class="logros-fila"><span class="c-bien">${ICONOS.estrella}<b class="n-bien">0</b> hábitos</span><span class="c-mal">${ICONOS.roto}<b class="n-mal">0</b> sacrificios</span></div>`;
    LISTA_STATS.forEach(([id]) => { D[id] = S[id]; pintarStat(id, true); });
    if (!NINO || S.fase !== 'manana') { D.dinero = S.dinero; pintarStat('dinero', true); }
  }
  function contar(el, a, b, fmt) {
    const t0 = performance.now();
    const paso = (now) => {
      const k = Math.min(1, (now - t0) / 650), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(a + (b - a) * e);
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }
  function pintarStat(id, inicial) {
    const row = $('#hStats').querySelector(`[data-id="${id}"]`);
    if (!row) return;
    const antes = D[id], v = S[id];
    D[id] = v;
    const num = row.querySelector('.s-v');
    if (id === 'dinero') {
      if (inicial) num.textContent = 'S/ ' + v;
      else contar(num, antes, v, (x) => 'S/ ' + Math.round(x));
    } else {
      const fill = row.querySelector('.s-fill'), trail = row.querySelector('.s-trail');
      if (inicial) { fill.style.width = trail.style.width = v + '%'; num.textContent = Math.round(v); }
      else if (v < antes) {
        trail.style.transition = 'none'; trail.style.background = 'var(--malo)'; trail.style.width = antes + '%';
        void trail.offsetWidth;
        fill.style.transition = 'width .2s ease-out'; fill.style.width = v + '%';
        trail.style.transition = 'width .7s ease-in .5s'; trail.style.width = v + '%';
      } else {
        trail.style.transition = 'width .2s ease-out'; trail.style.background = '#b8f5d2'; trail.style.width = v + '%';
        fill.style.transition = 'width .7s ease-out .35s'; fill.style.width = v + '%';
      }
      if (!inicial) contar(num, antes, v, (x) => Math.round(x));
      row.querySelector('.s-estado').textContent = estadoDe(id, v);
      row.classList.toggle('bajo', v < 30);
    }
    if (!inicial && v !== antes) { row.classList.remove('sube', 'baja'); void row.offsetWidth; row.classList.add(v > antes ? 'sube' : 'baja'); }
  }
  function volar(id, v, retraso) {
    const row = $('#hStats').querySelector(`[data-id="${id}"]`);
    if (!row || !jugando || $('#hud').hidden) { pintarStat(id, false); return; }
    const c = cabezaMundo(P).clone(); c.y += 0.35;
    const s = aPantalla(c);
    const el = document.createElement('div');
    el.className = 'vuela ' + (v > 0 ? 'mas' : 'menos');
    el.style.setProperty('--c', COLOR[id]);
    el.innerHTML = `<span class="ico">${ICONOS[id]}</span><b>${id === 'dinero' ? (v > 0 ? '+S/ ' : '−S/ ') + Math.abs(v) : (v > 0 ? '+' : '−') + Math.abs(v)}</b>`;
    el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
    document.body.appendChild(el);
    const r = row.querySelector('.ico').getBoundingClientRect();
    const dx = r.left + r.width / 2 - s.x, dy = r.top + r.height / 2 - s.y;
    const anim = el.animate([
      { transform: 'translate(-50%, -50%) scale(.4)', opacity: 0 },
      { transform: 'translate(-50%, -160%) scale(1.25)', opacity: 1, offset: 0.3 },
      { transform: 'translate(-50%, -160%) scale(1.1)', opacity: 1, offset: 0.45 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.55)`, opacity: 0.85 },
    ], { duration: 1150, delay: retraso, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'both' });
    anim.onfinish = () => {
      el.remove();
      pintarStat(id, false);
      Sonido.sfx(id === 'dinero' ? (v > 0 ? 'moneda' : 'perder') : v > 0 ? 'sube' : 'baja');
    };
  }
  function cambiar(ef) {
    let i = 0;
    Object.keys(ef || {}).forEach((k) => {
      const v = ef[k];
      if (!v) return;
      S[k] = k === 'dinero' ? S[k] + v : clamp(S[k] + v, 0, 100);
      if (k === 'agua' && S.f.estrenido && S.agua >= 55) S.f.curaAgua = true;
      volar(k, v, i++ * 170);
    });
  }

  // ---------------------------------------------------------------- lista de tareas
  function pintarLista() {
    const ul = $('#lItems');
    if ($('#lista').hidden) return;
    if (!ul.children.length) ul.innerHTML = TAREAS.map(([t, , min, nota]) => `<li><span class="chk"></span><span class="l-t">${t}${nota ? `<small>${nota}</small>` : ''}</span><span class="l-min">${min} min</span></li>`).join('');
    TAREAS.forEach(([, ok], i) => {
      const li = ul.children[i];
      if (ok() && !li.classList.contains('hecho')) li.classList.add('hecho', 'pop');
    });
    const n = TAREAS.filter(([, ok]) => ok()).length;
    $('#lTit').innerHTML = `${NINO ? 'Lo que tengo que hacer' : 'Mi plan para hoy'} <span>${n}/${TAREAS.length}</span>`;
    resumenLista();
  }
  function resumenLista() {
    const el = $('#lResumen');
    if (!el || $('#lista').hidden) return;
    if (NINO) {
      // sin cuenta regresiva: solo cuánto falta
      const n = TAREAS.filter(([, ok]) => !ok()).length;
      el.className = 'l-res ' + (n ? 'si' : 'si');
      el.innerHTML = n ? `Te ${n === 1 ? 'falta <b>1 cosa</b>' : `faltan <b>${n} cosas</b>`}. Hazlas cuando quieras, pero no las olvides.` : '<b>¡Todo listo!</b> Ahora puedes jugar tranquilo.';
      return;
    }
    const falta = Math.round(TAREAS.filter(([, ok]) => !ok()).reduce((sum, t) => sum + t[2], 0) * factorGanas());
    const quedan = Math.max(0, Math.floor(CFG.limite - S.min));
    el.className = 'l-res ' + (falta <= quedan ? 'si' : 'no');
    el.innerHTML = !falta ? '<b>¡Todo listo!</b> Ya puedes salir.'
      : falta <= quedan ? `Todo suma <b>${falta} min</b>. Tienes <b>${quedan} min</b>: te sobran ${quedan - falta}.`
        : `Todo suma <b>${falta} min</b>, pero solo tienes <b>${quedan} min</b>. Te faltan ${falta - quedan}: elige qué dejar.`;
  }
  function mostrarLista() {
    // en el celular empieza plegada (se abre tocándola)
    if (tactil && window.matchMedia('(max-height: 500px), (max-width: 600px)').matches) $('#lista').classList.add('plegada');
    $('#lista').hidden = false; pintarLista();
  }
  function pendientes() { return TAREAS.filter(([, ok]) => !ok()).map(([t]) => t.toLowerCase()); }

  // ---------------------------------------------------------------- partículas
  const geoPart = new THREE.IcosahedronGeometry(1, 0);
  function emitir(pos, color, vel, vida, tam, grav, op) {
    const m = new THREE.Mesh(geoPart, matB(color, op == null ? 0.9 : op));
    m.position.copy(pos);
    m.scale.setScalar(tam);
    escena.scene.add(m);
    particulas.push({ m, vel, vida, max: vida, tam, grav: grav || 0 });
  }
  function actualizarParticulas(dt) {
    for (let i = particulas.length - 1; i >= 0; i--) {
      const p = particulas[i];
      p.vida -= dt;
      if (p.vida <= 0) { if (p.m.parent) p.m.parent.remove(p.m); particulas.splice(i, 1); continue; }
      p.vel.y -= p.grav * dt;
      p.m.position.addScaledVector(p.vel, dt);
      p.m.scale.setScalar(p.tam * (0.3 + 0.7 * p.vida / p.max));
    }
  }
  const vCab = new THREE.Vector3();
  function cabezaMundo(Q) { Q.cabeza.getWorldPosition(vCab); return vCab; }
  function destellos() {
    const c = cabezaMundo(P).clone();
    for (let i = 0; i < 26; i++) emitir(c.clone().add(new THREE.Vector3(0, 0.3, 0)), ['#ffd23f', '#ffffff', '#ffb627', '#9ff0c4'][i % 4], new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 1.6, (Math.random() - 0.5) * 3), 1.1, 0.06, 4);
    const pie = P.root.position;
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * PI * 2;
      emitir(new THREE.Vector3(pie.x + Math.cos(a) * 0.5, 0.1, pie.z + Math.sin(a) * 0.5), '#ffe58a', new THREE.Vector3(Math.cos(a) * 0.3, 1.6 + Math.random() * 0.6, Math.sin(a) * 0.3), 1.0, 0.045, 0);
    }
  }
  function humo() {
    const c = cabezaMundo(P).clone();
    for (let i = 0; i < 16; i++) emitir(c.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.2 + Math.random() * 0.3, (Math.random() - 0.5) * 0.6)), i % 2 ? '#5d6175' : '#8a8fa3', new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6), 1.2, 0.1, 0, 0.7);
  }
  function anillo(pos, color) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.8, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -PI / 2;
    m.position.set(pos.x, 0.05, pos.z);
    const sc = escena.scene;
    sc.add(m);
    efectos.push({ t: 0, dur: 0.9, upd: (k) => { m.scale.setScalar(0.4 + k * 2.8); m.material.opacity = 0.9 * (1 - k); }, fin: () => { sc.remove(m); m.geometry.dispose(); m.material.dispose(); } });
  }
  function actualizarEfectos(dt) {
    for (let i = efectos.length - 1; i >= 0; i--) {
      const e = efectos[i];
      e.t += dt;
      const k = Math.min(1, e.t / e.dur);
      e.upd(k);
      if (k >= 1) { e.fin(); efectos.splice(i, 1); }
    }
    if (P.brillo) {
      P.brillo.t -= dt * 1.1;
      const b = Math.max(0, P.brillo.t), pulso = b * (0.55 + 0.45 * Math.sin(reloj * 22));
      ['camisa', 'pantalon', 'piel', 'pelo', 'zapato'].forEach((k) => P.m[k].emissive.copy(P.brillo.c).multiplyScalar(pulso * 0.75));
      if (b <= 0) P.brillo = null;
    }
  }

  // ---------------------------------------------------------------- panel de decisiones
  let panelAbierto = null, costoVista = 0;
  function abrirPanel(def, it, sinCerrar) {
    panelAbierto = { def, it };
    $('#pTitulo').textContent = def.titulo;
    $('#pTexto').textContent = def.texto || '';
    $('#pHora').textContent = hora(S.min);
    const cont = $('#pOpciones');
    cont.innerHTML = '';
    const ops = def.opciones.map(ajustar);
    const f = factorGanas(), g = $('#pGanas');
    g.hidden = f === 1 || !ops.some((o) => o.ganas);
    g.className = 'p-ganas ' + (f > 1 ? 'mal' : 'bien');
    g.innerHTML = `${ICONOS.motivacion}<span>${f > 1 ? `Motivación ${Math.round(S.motivacion)}: estás <b>${estadoDe('motivacion', S.motivacion).toLowerCase()}</b>. Las tareas te toman ${Math.round((f - 1) * 100)}% más tiempo.` : `Motivación ${Math.round(S.motivacion)}: estás <b>a tope</b>. Las tareas te toman ${Math.round((1 - f) * 100)}% menos tiempo.`}</span>`;
    if (!sinCerrar) ops.push({ cerrar: true, texto: ops.length ? 'Ahora no' : 'Entendido' });
    ops.forEach((op, i) => {
      const b = document.createElement('button');
      b.className = 'op' + (op.cerrar ? ' cerrar' : '');
      b.type = 'button';
      b.id = 'op' + i;
      let chips = '';
      if (!op.cerrar) {
        const quedarian = Math.floor(CFG.limite - S.min - op.min);
        if (op.min > 0) chips += `<span class="chip t-chip">−${op.min} min</span>`;
        if (op.ganas) chips += op.ganas > 1 ? `<span class="chip menos">sin ganas +${op.extraGanas} min</span>` : `<span class="chip mas">${gx('motivado', 'motivada')} −${-op.extraGanas} min</span>`;
        if (op.min > 0 && !NINO) chips += `<span class="chip ${quedarian < 10 ? 'menos' : ''}">${quedarian >= 0 ? `te quedarían ${quedarian} min` : `llegarías ${-quedarian} min tarde`}</span>`;
        Object.keys(op.ef || {}).forEach((k) => {
          const v = op.ef[k];
          if (!v) return;
          chips += `<span class="chip ${v > 0 ? 'mas' : 'menos'}">${k === 'dinero' ? (v > 0 ? '+S/ ' : '−S/ ') + Math.abs(v) : ETIQ[k] + ' ' + (v > 0 ? '+' : '−') + Math.abs(v)}</span>`;
        });
      }
      const nota = op.bloqueado || op.nota || '';
      b.innerHTML = `<kbd>${i + 1}</kbd><span class="op-t">${op.texto}</span>${nota ? `<span class="op-n">${nota}</span>` : ''}${chips ? `<span class="chips">${chips}</span>` : ''}`;
      b.disabled = !!op.bloqueado;
      b.addEventListener('click', () => elegir(op));
      const ver = () => { costoVista = op.cerrar ? 0 : (op.min || 0); };
      const quitar = () => { costoVista = 0; };
      b.addEventListener('mouseenter', ver);
      b.addEventListener('focus', ver);
      b.addEventListener('mouseleave', quitar);
      b.addEventListener('blur', quitar);
      cont.appendChild(b);
    });
    Sonido.sfx('abrir');
    $('#panel').hidden = false;
    $('#prompt').hidden = true;
    const primero = cont.querySelector('button:not(:disabled)');
    if (primero) primero.focus({ preventScroll: true });
  }
  function cerrarPanel() { panelAbierto = null; costoVista = 0; $('#panel').hidden = true; }
  function elegir(op) {
    if (!panelAbierto || op.bloqueado) return;
    Sonido.sfx('click');
    const it = panelAbierto.it;
    cerrarPanel();
    if (op.cerrar) return;
    hacer(op, it);
  }

  // ---------------------------------------------------------------- motivación
  function factorGanas() {
    const m = S.motivacion;
    let f = m < 30 ? 1.5 : m < 50 ? 1.25 : m >= 75 ? 0.8 : 1;
    if (S.fase === 'tarde' && !S.f.almorzo) f += 0.25;
    return f;
  }
  const ANIM_FACIL = ['comer', 'dormir', 'telefono', 'esperar', 'quieto', 'saludar', 'tropezar', 'estirarse'];
  function esEsfuerzo(op) {
    if (op.cerrar || op.esfuerzo === false || !(op.min >= 2)) return false;
    if (Object.keys(op.ef || {}).some((k) => op.ef[k] < 0)) return false;
    const anims = op.pasos ? op.pasos.map((p) => p.anim) : [op.anim];
    return anims.some((a) => !ANIM_FACIL.includes(a));
  }
  function ajustar(op) {
    if (!esEsfuerzo(op)) return op;
    const f = factorGanas();
    if (f === 1) return op;
    const o = Object.assign({}, op, { ganas: f });
    o.min = Math.max(1, Math.round(op.min * f));
    if (op.pasos) o.pasos = op.pasos.map((p) => Object.assign({}, p, { min: Math.round((p.min || 0) * f) }));
    o.extraGanas = o.min - op.min;
    return o;
  }
  const FLOJERA = NINO ? ['Qué flojera…', 'No quiero hacer nada…', 'Mmm… después lo hago.'] : ['Qué flojera…', 'No tengo ganas de nada…', 'Mmm… luego lo hago.'];
  function abrirTentacion() {
    const larga = S.fase === 'tarde' ? 2.5 : 1;
    const ops = [
      { texto: NINO ? 'Ver dibujos en la tablet un ratito' : 'Revisar el celular un ratito', nota: 'Se siente bien, pero se te va el tiempo y te quita ganas.', min: Math.round(8 * larga), ef: { animo: 5, motivacion: -8 }, anim: 'telefono', prop: 'telefono', progreso: NINO ? 'Viendo dibujos…' : 'Mirando el celular…', esfuerzo: false,
        alTerminar: () => malHabito(NINO ? 'Distraerse con la tablet' : 'Distraerse con el celular') },
      NINO
        ? { texto: 'Jugar un ratito', nota: 'Solo cinco minutos… que siempre son más.', min: Math.round(10 * larga), ef: { animo: 8, motivacion: -6 }, anim: 'agacharse', progreso: 'Jugando…', esfuerzo: false, alTerminar: () => malHabito('Jugar en vez de alistarse') }
        : { texto: 'Quedarte sentado sin hacer nada', nota: 'Descansas, pero el reloj sigue.', min: 10, ef: { energia: 3, motivacion: -6 }, anim: 'esperar', progreso: 'Sin hacer nada…', esfuerzo: false, alTerminar: () => malHabito('Quedarse sin hacer nada') },
      { texto: 'Vencer la flojera y seguir', nota: 'Cuesta un poco, pero te sube la motivación.', min: 0, ef: { motivacion: 12, animo: -2 }, anim: 'estirarse', dur: 1.4, progreso: '¡Vamos!', esfuerzo: false,
        alTerminar: () => { habito('Vencer la flojera'); decir(P, NINO ? '¡Vamos, yo puedo!' : '¡Vamos, a darle!', 2.2); } },
    ];
    decir(P, FLOJERA[Math.floor(Math.random() * FLOJERA.length)], 2.4);
    abrirPanel({
      titulo: 'Te está ganando la flojera',
      texto: `Tu motivación está en ${Math.round(S.motivacion)}. ${NINO ? 'La tablet está ahí, prendida…' : 'El celular vibra con notificaciones…'}`,
      opciones: ops,
    }, null, true);
  }

  // ---------------------------------------------------------------- acciones
  let accion = null;
  function hacer(op, it) {
    const pasos = (op.pasos || [{ anim: op.anim, dur: op.dur || 2, min: op.min || 0, prop: op.prop, progreso: op.progreso }]).map((p, i) => {
      const q = Object.assign({}, p);
      // copia: si el objeto se mueve (por ejemplo, el perro), la ruta no debe moverse con él
      if (i === 0 && !q.ruta && it) { q.ruta = [it.en.slice()]; if (!q.mira) q.mira = it.mira.slice(); }
      q.ruta = q.ruta || [];
      if (!q.progreso) q.progreso = op.progreso || op.texto;
      ['espuma', 'agua', 'salpica'].forEach((k) => { if (op[k] && q[k] == null) q[k] = op[k]; });
      if (q.min > 0) q.dur = Math.max(q.dur || 0, clamp(2.6 + q.min * 0.6, 3.2, 12));
      return q;
    });
    const totalMin = pasos.reduce((s, p) => s + (p.min || 0), 0);
    accion = { op, it, pasos, i: 0, ri: 0, fase: 'ir', t: 0, minIni: S.min, chispa: 0, restante: totalMin, totalMin, parar: null };
    if (totalMin > 0) {
      const r = $('#tiempo').getBoundingClientRect();
      const el = document.createElement('div');
      el.className = 'vuela menos tiempo-vuela';
      el.innerHTML = `<span class="ico">${ICONOS.reloj}</span><b>−${totalMin} min</b>`;
      el.style.left = (r.left + r.width * 0.7) + 'px';
      el.style.top = (r.bottom + 6) + 'px';
      document.body.appendChild(el);
      el.animate([{ transform: 'translate(-50%,0) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,8px) scale(1.15)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,34px) scale(1)', opacity: 0 }], { duration: 1600, easing: 'ease-out' }).onfinish = () => el.remove();
      Sonido.sfx('perder');
    }
    $('#prompt').hidden = true;
  }
  let ritmoExtra = 1;  // un módulo puede pedir correr más rápido (por ejemplo, en el partido)
  function velocidad() { return (NINO ? 2.0 : 2.3) * (0.55 + 0.45 * S.energia / 100) * (0.8 + 0.2 * S.motivacion / 100) * ritmoExtra; }
  function girarHacia(dx, dz, dt) {
    const obj = Math.atan2(dx, dz);
    let d = obj - P.root.rotation.y;
    while (d > PI) d -= 2 * PI;
    while (d < -PI) d += 2 * PI;
    P.root.rotation.y += d * Math.min(1, dt * 12);
  }
  function actualizarAccion(dt) {
    const a = accion, p = a.pasos[a.i];
    if (a.fase === 'ir') {
      const dest = p.ruta[a.ri];
      P.sentado = false;
      if (!dest) {
        a.fase = 'hacer'; a.t = 0; a.minIni = S.min;
        if (p.mira) P.root.rotation.y = Math.atan2(p.mira[0] - P.root.position.x, p.mira[1] - P.root.position.z);
        P.anim = p.anim || 'quieto'; P.t = 0;
        P.sentado = !!p.sentado;
        if (p.prop !== undefined) ponerProp(P, p.prop);
        if (a.parar) a.parar();
        a.parar = Sonido.bucle(sonidoDe(p));
        if (p.anim === 'tropezar') { Sonido.sfx('golpe'); sacudir(canvas); flash('mal'); }
        $('#progTxt').textContent = p.progreso;
        $('#progreso').hidden = false;
        return;
      }
      const pos = P.root.position, dx = dest[0] - pos.x, dz = dest[1] - pos.z, d = Math.hypot(dx, dz);
      if (d < 0.04) { pos.x = dest[0]; pos.z = dest[1]; a.ri++; return; }
      const v = velocidad();
      const st = Math.min(d, v * dt);
      pos.x += dx / d * st; pos.z += dz / d * st;
      girarHacia(dx, dz, dt);
      P.anim = 'caminar'; P.vel = v;
      S.min += dt * RITMO;
      return;
    }
    a.t += dt * (K.rapido ? 3.5 : 1);
    const fr = Math.min(1, a.t / p.dur);
    S.min = a.minIni + p.min * fr;
    a.restante = p.min * (1 - fr) + a.pasos.slice(a.i + 1).reduce((s, q) => s + (q.min || 0), 0);
    $('#progBarra').style.width = (fr * 100) + '%';
    $('#progMin').textContent = `${Math.round(p.min * fr)} / ${p.min} min`;
    a.chispa -= dt;
    if (a.chispa <= 0) {
      a.chispa = 0.06;
      const c = cabezaMundo(P);
      const fw = new THREE.Vector3(Math.sin(P.root.rotation.y), 0, Math.cos(P.root.rotation.y));
      if (p.espuma) emitir(c.clone().addScaledVector(fw, 0.22 * P.escala).add(new THREE.Vector3(0, -0.02, 0)), '#ffffff', new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.3, (Math.random() - 0.5) * 0.4).addScaledVector(fw, 0.3), 0.6, 0.025);
      if (p.agua) for (let i = 0; i < 3; i++) emitir(c.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.9, (Math.random() - 0.5) * 0.5)), '#8fd0ee', new THREE.Vector3(0, -2.5, 0), 0.55, 0.03, 2, 0.7);
      if (p.salpica) emitir(c.clone().addScaledVector(fw, 0.35).add(new THREE.Vector3(0, -0.5, 0)), '#bfe6f2', new THREE.Vector3((Math.random() - 0.5) * 1.2, 1.2, (Math.random() - 0.5) * 1.2), 0.5, 0.03, 5, 0.8);
    }
    if (fr >= 1) {
      if (a.parar) { a.parar(); a.parar = null; }
      if (p.alTerminar) p.alTerminar();
      a.i++; a.ri = 0; a.fase = 'ir';
      if (a.i >= a.pasos.length) terminarAccion();
    }
  }
  function terminarAccion() {
    const op = accion.op, it = accion.it;
    setTimeout(() => evento('accion', { op, it, lugar: escena && escena.nombre }), 0);
    accion = null;
    $('#progreso').hidden = true;
    P.anim = 'quieto';
    P.sentado = false;
    ponerProp(P, null);
    cambiar(op.ef);
    const antes = S.habitos.length + S.malos.length;
    const tareasAntes = TAREAS.map(([, ok]) => !!ok());
    if (op.alTerminar) op.alTerminar();
    refrescar();
    textosObjetos();
    pintarLista();
    TAREAS.forEach(([t, ok], i) => { if (!tareasAntes[i] && ok()) felicitar(t); });
    // si no hubo logro ni sacrificio, igual se nota si ganaste o perdiste algo
    if (S.habitos.length + S.malos.length === antes && op.ef) {
      const vals = Object.keys(op.ef).filter((k) => k !== 'dinero').map((k) => op.ef[k]);
      const neto = vals.reduce((s, v) => s + v, 0);
      if (neto > 0) { flash('bien'); anillo(P.root.position, '#9ff0c4'); Sonido.sfx('bien'); P.brillo = { c: new THREE.Color('#9ff0c4'), t: 0.7 }; }
      else if (neto < 0) { flash('mal'); Sonido.sfx('mal'); }
    }
    if (op.despues) op.despues();
  }
  function sonidoDe(p) {
    if (p.sonido) return p.sonido;
    switch (p.anim) {
      case 'cepillar': return 'cepillo';
      case 'ducha': case 'lavarCara': return 'agua';
      case 'cocinar': return p.salpica ? 'agua' : p.prop === 'cuchara' ? 'sarten' : 'roce';
      case 'planchar': return 'vapor';
      case 'agacharse': case 'vestirse': case 'buscar': return 'roce';
      case 'dormir': return p.min > 0 ? 'ronquido' : null;
      case 'comer': return 'comer';
      default: return null;
    }
  }

  // ---------------------------------------------------------------- movimiento libre
  const K = {};
  function mover(dx, dz) { moverEn(P.root, dx, dz, 0.28 * Math.max(0.8, P.escala)); }
  function moverEn(root, dx, dz, r) {
    let nx = root.position.x + dx, nz = root.position.z + dz;
    const w = escena.w / 2, d = escena.d / 2;
    nx = clamp(nx, -w + r, w - r);
    nz = clamp(nz, -d + r, d - 0.15);
    escena.cols.forEach((c) => {
      if (nx > c.x1 - r && nx < c.x2 + r && nz > c.z1 - r && nz < c.z2 + r) {
        const pl = nx - (c.x1 - r), pr = (c.x2 + r) - nx, pt = nz - (c.z1 - r), pb = (c.z2 + r) - nz;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) nx = c.x1 - r; else if (m === pr) nx = c.x2 + r; else if (m === pt) nz = c.z1 - r; else nz = c.z2 + r;
      }
    });
    root.position.x = nx; root.position.z = nz;
  }
  function revisarPuertas() {
    if (bloqueos.size) return false;   // en pleno partido o travesura no se sale del cuarto
    const x = P.root.position.x, z = P.root.position.z, w = escena.w / 2, d = escena.d / 2;
    for (const p of escena.puertas) {
      if (p.salida) continue;
      const dentro = p.lado === 'atras' ? (z < -d + 0.42 && Math.abs(x - p.c) < p.ancho / 2 - 0.1)
        : p.lado === 'izq' ? (x < -w + 0.42 && Math.abs(z - p.c) < p.ancho / 2 - 0.1)
          : (x > w - 0.42 && Math.abs(z - p.c) < p.ancho / 2 - 0.1);
      if (dentro) { irA(p.a); return true; }
    }
    return false;
  }
  function cercano() {
    let best = null, bd = 1e9;
    for (const it of escena.inters) {
      if (it.activo && !it.activo()) continue;
      const dd = Math.hypot(P.root.position.x - it.en[0], P.root.position.z - it.en[1]);
      if (dd < (it.radio || 1) && dd < bd) { bd = dd; best = it; }
    }
    return best;
  }
  function interactuar() {
    if (!jugando || accion || panelAbierto || cargando || levantando || alarmaActiva || examen) return;
    const it = cercano();
    if (it) abrirPanel(it.abrir(), it);
  }

  // ---------------------------------------------------------------- transiciones
  let cargando = false;
  function consejos() {
    const f = S.f, out = [];
    const quedan = Math.round(CFG.limite - S.min);
    out.push(quedan >= 0 ? `Son las ${hora(S.min)}. Te quedan ${quedan} min.` : `Son las ${hora(S.min)}. Vas ${-quedan} min tarde.`);
    if (!f.cama) out.push('Dejaste la cama destendida.');
    if (!f.vestido) out.push('Todavía estás en pijama.');
    else if (f.vestido === 'sucia') out.push('Llevas puesta la ropa sucia de ayer.');
    if (!f.dientes && escena && escena.nombre !== 'bano') out.push('No te has lavado los dientes.');
    if (NINO && !f.mochila) out.push('Tu mochila sigue desordenada.');
    if (!f.desayuno && S.energia < 45) out.push('Tienes hambre: tu energía está baja.');
    return out.slice(0, 3);
  }
  function irA(dest, o) {
    o = o || {};
    if (cargando) return;
    cargando = true;
    const desde = o.desde || escena.nombre;
    const nombres = { dormitorio: NINO ? 'Tu cuarto' : 'Dormitorio', pasillo: 'Pasillo', bano: 'Baño', comedor: 'Comedor', aula: 'Colegio', patio: 'Recreo', sala: 'Sala', jardin: 'Jardín', mirador: 'Mirador' };
    $('#cTitulo').textContent = o.titulo || nombres[dest];
    $('#cTips').innerHTML = (o.tips || consejos()).map((t) => `<li>${t}</li>`).join('');
    const barra = $('#cBarra');
    barra.style.animation = 'none'; void barra.offsetWidth; barra.style.animation = '';
    $('#carga').hidden = false;
    $('#prompt').hidden = true;
    $('#lista').hidden = $('#lista').hidden || !!o.tips;
    Sonido.sfx('puerta');
    etiquetas.forEach((e) => { e.el.hidden = true; });
    S.min += 1;
    setTimeout(() => construir(dest, desde), 300);
    setTimeout(() => {
      $('#carga').hidden = true;
      cargando = false;
      if (escena.alEntrar) escena.alEntrar();
    }, o.tips ? 3600 : 1400);
  }

  // ---------------------------------------------------------------- visitas de mamá
  function visitaMama(lineas, o) {
    o = o || {};
    if (!NINO || !escena) return;
    if (escena.nombre === 'comedor' && escena.mama) {
      recordarPedido(lineas, o);
      let i = 0;
      hablaEnComedor = true;
      const mama = escena.mama;
      const sig = () => {
        // si te fuiste del comedor, deja de hablar
        if (i < lineas.length && escena.mama === mama) { decir(mama, lineas[i], 1.2 + lineas[i].length * 0.065); setTimeout(sig, (1.2 + lineas[i++].length * 0.065) * 1000); }
        else { hablaEnComedor = false; if (o.alTerminar) o.alTerminar(); }
      };
      sig();
      return;
    }
    if (visita) { colaVisitas.push([lineas, o]); return; }
    const hacia = { pasillo: 'comedor', sala: 'comedor', jardin: 'sala' }[escena.nombre] || 'pasillo';
    const puerta = escena.puertas.find((p) => !p.salida && p.a === hacia);
    if (!puerta) {
      if (escena.nombre !== 'mirador') return;
      recordarPedido(lineas, o);
      avisar(`Mamá (desde abajo): "${lineas.join(' ')}"`, 'mal');
      Sonido.hablar(lineas[0], 'mama');
      if (o.alTerminar) setTimeout(o.alTerminar, 2500);
      return;
    }
    const fuera = enPared(escena, puerta.lado, puerta.c, 0.35);
    const dentro = enPared(escena, puerta.lado, puerta.c, -1.0);
    const mama = crearMama();
    mama.root.position.set(fuera[0], 0, fuera[1]);
    escena.scene.add(mama.root);
    escena.npcs.push(mama);
    let destino = o.destino;
    if (!destino) {
      const p = P.root.position, vx = dentro[0] - p.x, vz = dentro[1] - p.z, d = Math.hypot(vx, vz) || 1;
      destino = d < 1.1 ? dentro : [p.x + vx / d * 1.1, p.z + vz / d * 1.1];
    }
    recordarPedido(lineas, o);
    const escondible = NINO && o.esconder !== false && (escena.escondites || []).length && !tutorial && !alarmaActiva && S.fase !== 'colegio';
    visita = { mama, lineas, o, fase: escondible ? 'pasos' : 'entrar', ruta: [dentro, destino], ri: 0, i: -1, t: 0, fuera, dentro, tPasos: 3.6, paso: 0 };
    if (escondible) {
      mama.root.visible = false;
      avisar(`¡Se escuchan pasos! Viene mamá… Si quieres, escóndete: ${escena.escondites.map((e) => e.nombre.toLowerCase()).join(' o ')}.`, 'mal');
    } else decir(mama, NINO && !o.destino ? `¡${CFG.nombre}!` : '…', 1, false);
  }
  function continuarVisita(lineas, o) {
    if (!visita || visita.fase !== 'esperando') { visitaMama(lineas, o); return; }
    recordarPedido(lineas, o);
    visita.lineas = lineas;
    visita.o = o || {};
    visita.avisado = false;
    visita.fase = 'hablar';
    visita.i = -1;
    visita.t = 0;
    lineaSiguiente();
  }
  function lineaSiguiente() {
    const v = visita;
    v.i++;
    if (v.i < v.lineas.length) {
      const txt = v.lineas[v.i];
      v.t = 1.4 + txt.length * 0.065;
      v.maxT = v.t + 6;
      decir(v.mama, txt, v.t + 0.3);
      v.mama.anim = 'senalar';
      v.mama.t = 0;
      return;
    }
    const fin = v.avisado ? null : v.o.alTerminar;
    v.avisado = !v.o.quedarse;
    if (v.o.quedarse) { v.fase = 'esperando'; v.mama.anim = 'jarras'; }
    else { v.fase = 'salir'; v.ruta = [v.dentro, v.fuera]; v.ri = 0; }
    if (fin) fin();
  }
  function actualizarVisita(dt) {
    const v = visita, m = v.mama, mp = m.root.position;
    if (v.fase === 'pasos') {
      // se acercan sus pasos: es el momento de esconderse
      v.tPasos -= dt; v.paso -= dt;
      if (v.paso <= 0) { v.paso = 0.42; Sonido.sfx('paso'); }
      if (v.tPasos > 0) return;
      m.root.visible = true;
      v.fase = 'entrar';
      if (escondido) {
        // no te ve: te busca
        v.lineasOrig = v.lineas; v.oOrig = v.o;
        v.lineas = [`¿${CFG.nombre}?`, '¿Dónde se habrá metido?'];
        v.o = { quedarse: true, alTerminar: terminarBusqueda };
        v.ruta = [v.dentro, [clamp(escondido.en[0], -escena.w / 2 + 1, escena.w / 2 - 1) * 0.4, 0]];
      } else decir(m, `¡${CFG.nombre}!`, 1, false);
      return;
    }
    if (v.fase === 'entrar' || v.fase === 'salir') {
      const dest = v.ruta[v.ri];
      if (!dest) {
        if (v.fase === 'entrar') { v.fase = 'hablar'; v.i = -1; lineaSiguiente(); }
        else {
          escena.scene.remove(m.root);
          escena.npcs.splice(escena.npcs.indexOf(m), 1);
          visita = null;
          if (colaVisitas.length) { const [l, o] = colaVisitas.shift(); visitaMama(l, o); }
        }
        return;
      }
      const dx = dest[0] - mp.x, dz = dest[1] - mp.z, d = Math.hypot(dx, dz);
      if (d < 0.05) { v.ri++; return; }
      const st = Math.min(d, 2.1 * dt);
      mp.x += dx / d * st; mp.z += dz / d * st;
      m.root.rotation.y = Math.atan2(dx, dz);
      m.anim = 'caminar'; m.vel = 2.1;
      return;
    }
    // hablando o esperando: mira al personaje
    m.root.rotation.y = Math.atan2(P.root.position.x - mp.x, P.root.position.z - mp.z);
    if (v.fase === 'hablar') {
      v.t -= dt; v.maxT -= dt;
      if ((v.t <= 0 && !Sonido.hablando()) || v.maxT <= 0) lineaSiguiente();
      const moviendo = K.up || K.down || K.left || K.right || K.jx || K.jz;
      // te giras para mirar a mamá (pero no en pleno partido ni haciendo la tarea)
      if (P.cuerpo.rotation.x === 0 && !accion && !moviendo && !panelAbierto && !bloqueos.size) girarHacia(mp.x - P.root.position.x, mp.z - P.root.position.z, dt);
    }
  }
  // ---------- esconderse cuando viene mamá
  let escondido = null;
  function esconderse(e) {
    escondido = e;
    P.root.position.set(e.oculto[0], 0, e.oculto[1]);
    P.root.visible = false;
    P.anim = 'quieto';
    avisar(`Estás ${e.nombre.toLowerCase()}. ¡Shhh! Que no te encuentre…`);
  }
  function salirEscondite() {
    if (!escondido) return;
    P.root.position.set(escondido.en[0], 0, escondido.en[1]);
    P.root.visible = true;
    escondido = null;
  }
  function terminarBusqueda() {
    const v = visita;
    if (!v) return;
    const H2 = window.Habitos || {};
    const D = H2.perro && H2.perro.D;
    // el cachorro te delata si todavía no confía mucho en ti
    const delata = D && D.root.parent === escena.scene && (H2.perro.modo === 'sigue' || H2.perro.modo === 'espera') && H2.perro.vinculo < 60;
    const encontrado = delata || Math.random() < 0.25;
    evento('escondite', { encontrado });
    if (encontrado) {
      if (delata) { D.anim = 'feliz'; D.salto = 0.55; Sonido.sfx('ladrido'); avisar(`¡${PERFIL.mascota.nombre} movió la cola junto a tu escondite y te delató!`, 'mal'); }
      salirEscondite();
      cambiar({ confianza: -6 });
      malHabito('Esconderse de mamá');
      anotar('Te escondiste de mamá, pero te encontró.', 'mal');
      v.lineas = [`¡Ajá! ¡Ahí estás! ¿Escondiéndote de mí, ${CFG.nombre}?`].concat(v.lineasOrig || []);
      v.o = v.oOrig || {};
      v.fase = 'hablar'; v.i = -1; v.avisado = false;
      lineaSiguiente();
      return;
    }
    decir(v.mama, 'Mmm… no está aquí. Ya lo buscaré después.', 2.4);
    anotar('Te escondiste de mamá y no te encontró.', '');
    const fin = v.oOrig && v.oOrig.alTerminar;
    v.o = {}; v.avisado = true;
    v.fase = 'salir'; v.ruta = [v.dentro, v.fuera]; v.ri = 0;
    setTimeout(() => { salirEscondite(); avisar('Mamá se fue. Saliste de tu escondite.', 'bien'); if (fin) fin(); }, 2600);
  }
  function agregarEscondites(E) {
    (E.escondites || []).forEach((e) => {
      E.inters.push(etiquetaInter(e.nombre, e.en, e.oculto, 1.2, {
        activo: () => !!visita && visita.fase === 'pasos' && !escondido,
        abrir: () => ({
          titulo: '¡Escóndete!', texto: 'Mamá está por entrar. Si te encuentra, se va a enojar más.',
          opciones: [{ texto: e.nombre, nota: e.nota || '', min: 0, anim: 'agacharse', dur: 0.5, esfuerzo: false, progreso: 'Escondiéndote…', alTerminar: () => esconderse(e) }],
        }),
      }));
    });
  }

  let hablaEnComedor = false;
  // lo que mamá pidió en su última conversación, para felicitar cuando lo hagas
  function recordarPedido(lineas, o) {
    if (!NINO) return;
    if (o && o.pedidos) { S.pedidos = new Set(o.pedidos); return; }
    const txt = lineas.join(' ').toLowerCase();
    const nuevos = TAREAS.filter(([t]) => txt.includes(t.toLowerCase())).map(([t]) => t);
    if (nuevos.length) S.pedidos = new Set(nuevos);
  }
  const ELOGIOS = () => [`¡Muy bien, ${CFG.nombre}!`, '¡Eso, así me gusta!', `¡Bien hecho, ${gx('hijo', 'hija')}!`, '¡Muy bien! Justo eso te pedí.'];
  function felicitar(tarea) {
    if (!NINO || !jugando) return;
    const pedida = S.pedidos && S.pedidos.has(tarea);
    const mama = visita ? visita.mama : escena.mama;
    const quien = mama || escena.papa;
    const frase = pedida ? `¡Muy bien! ${tarea}, justo lo que te pedí.` : ELOGIOS()[Math.floor(Math.random() * 4)];
    if (quien) {
      decir(quien, quien === escena.papa && !mama ? `¡Bien hecho, ${gx('campeón', 'campeona')}!` : frase, 2.6);
      if (quien.anim !== 'caminar') { quien.anim = 'saludar'; quien.t = 0; setTimeout(() => { if (quien.anim === 'saludar') quien.anim = visita && visita.mama === quien && visita.fase === 'hablar' ? 'senalar' : 'quieto'; }, 1600); }
    } else if (pedida) {
      avisar(`Mamá (desde la cocina): "¡Muy bien, ${CFG.nombre}! ${tarea}, justo lo que te pedí."`, 'bien');
      Sonido.hablar(`¡Muy bien, ${CFG.nombre}!`, 'mama');
    } else return;
    if (pedida) { S.pedidos.delete(tarea); cambiar({ confianza: 3 }); }
  }
  function mamaHabla() { return hablaEnComedor || !!(visita && (visita.fase === 'hablar' || visita.fase === 'entrar' || visita.fase === 'pasos')); }

  // ---------------------------------------------------------------- despertar
  let alarmaActiva = false, levantando = null;
  function acostar() {
    const zPies = NINO ? -1.55 : -1.15;
    P.root.position.set(-2.5, 0.7, zPies);
    P.root.rotation.y = 0;
    P.cuerpo.rotation.x = -PI / 2;
    P.anim = 'dormir';
  }
  const ENOJO = () => [`¡${CFG.nombre}! ¿Sigues durmiendo? Ya son las ` , (FINDE ? `¡${CFG.nombre}, ya! ¡El desayuno se enfría! Son las ` : `¡${CFG.nombre}, ya! ¡Vas a perder el bus! Son las `), `¡Último aviso, ${CFG.nombre}! Son las `];
  function abrirAlarma() {
    alarmaActiva = true;
    const n = S.f.snooze;
    abrirPanel({
      titulo: NINO ? (visita ? 'Mamá te está despertando' : 'Suena tu alarma') : 'Suena la alarma',
      texto: n ? `Ya ${NINO ? 'seguiste durmiendo' : 'la pospusiste'} ${n === 1 ? 'una vez' : n + ' veces'}. Son las ${hora(S.min)}.` : `Son las ${hora(S.min)}. ${CFG.salida}.`,
      opciones: [
        { texto: 'Levantarme ya', nota: 'Empiezas el día con tiempo de sobra.', min: 0, ef: { animo: n ? 0 : 4 }, pasos: [{ anim: 'dormir', dur: 0.2, min: 0, progreso: 'Levantándote' }],
          despues: () => { levantando = { t: 0 }; } },
        { texto: '5 minutos más', nota: NINO ? (visita ? 'Mamá se va a enojar.' : 'Si sigues durmiendo, mamá vendrá a despertarte.') : 'Siempre terminan siendo 10.', min: 10, ef: { energia: 2, animo: -4, motivacion: -5, ...(NINO ? { confianza: -4 } : {}) }, bloqueado: n >= 3 ? 'Ya no puedes seguir durmiendo.' : null,
          pasos: [{ anim: 'dormir', dur: 2.2, min: 10, progreso: 'Durmiendo 5 minutos más…' }],
          alTerminar: () => { S.f.snooze++; if (S.f.snooze === 2) malHabito(NINO ? gx('Hacerse el dormido', 'Hacerse la dormida') : 'Posponer la alarma'); },
          despues: () => {
            const txt = ENOJO()[Math.min(2, S.f.snooze - 1)] + hora(S.min).replace(/^0/, '') + '.';
            if (NINO && visita) { decir(visita.mama, txt, 3.2); visita.mama.anim = 'senalar'; setTimeout(() => { if (visita && visita.fase === 'esperando') visita.mama.anim = 'jarras'; abrirAlarma(); }, 3000); }
            else if (NINO) visitaMama([txt], { destino: [0.1, -0.7], quedarse: true, alTerminar: abrirAlarma });   // te quedaste dormido: viene mamá
            else setTimeout(abrirAlarma, 250);
          } },
      ],
    }, null, true);
    if (!NINO) decir(P, '¡Riiing! ¡Riiing!', 2.5, false);
  }
  function actualizarLevantarse(dt) {
    levantando.t += dt / 0.9;
    const t = Math.min(1, levantando.t), e = t * t * (3 - 2 * t);
    P.cuerpo.rotation.x = lerp(-PI / 2, 0, e);
    P.root.position.set(lerp(-2.5, -1.15, e), lerp(0.7, 0, e), lerp(NINO ? -1.55 : -1.15, -1.6, e));
    P.root.rotation.y = lerp(0, PI / 2, e);
    if (t >= 1) {
      levantando = null;
      alarmaActiva = false;
      P.anim = 'estirarse';
      setTimeout(() => { if (P.anim === 'estirarse') P.anim = 'quieto'; }, 1100);
      if (NINO) {
        // nadie te dice qué hacer: te acuerdas solo (si mamá vino porque seguías durmiendo, te apura y se va)
        const pensar = () => {
          if (!S.f.penso) {
            S.f.penso = true;
            const FRASES = ['Mmm… ¿qué tenía que hacer hoy? ¡Ah, sí!', '¡Buenos días! A ver… ¿qué toca hoy?', '¡Un día nuevo! Ya sé lo que tengo que hacer.', `¡Hola, ${PERFIL ? PERFIL.mascota.nombre : 'perrito'}! ¿Qué hacemos hoy?`];
            decir(P, FRASES[((window.Habitos.progreso.cargar().dia || 1) - 1) % FRASES.length], 2.8);
          }
          setTimeout(() => { mostrarLista(); if (debeTutorial()) iniciarTutorial(); else avisar(`Acércate a las cosas y ${tactil ? 'toca Usar' : 'pulsa E'} para decidir qué hacer.`); }, 1600);
        };
        if (visita) continuarVisita([FINDE ? '¡Por fin! Aunque sea sábado, hay cosas que hacer.' : '¡Por fin! Apúrate, que el bus no espera.'], { alTerminar: pensar });
        else pensar();
      } else {
        decir(P, 'Uff… el cuarto está hecho un desastre.', 3.2);
        setTimeout(() => { mostrarLista(); avisar(`Acércate a las cosas y ${tactil ? 'toca Usar' : 'pulsa E'} para decidir qué hacer.`); }, 1500);
      }
    }
  }

  // ---------------------------------------------------------------- fin y resumen
  function fin(motivo) {
    if (!jugando) return;
    if (NINO && S.fase === 'manana') { if (FINDE) almuerzoFinde(); else irAlColegio(motivo); return; }
    jugando = false;
    Sonido.musica(false);
    Sonido.sfx(S.habitos.length >= S.malos.length + 3 ? 'final' : 'finalMal');
    $('#hud').hidden = true;
    $('#prompt').hidden = true;
    $('#tactil').hidden = true;
    $('#bCorrer').hidden = true;
    etiquetas.forEach((e) => { e.el.hidden = true; });
    const R = NINO ? resumenNino() : resumenAdulto(motivo);
    $('#rEyebrow').textContent = R.eyebrow;
    $('#rTitulo').textContent = R.titulo;
    $('#rSub').textContent = R.sub;
    $('#rStats').innerHTML = LISTA_STATS.map(([id, n]) => `<div class="r-stat"><span>${n}</span><b>${Math.round(S[id])}</b></div>`).join('')
      + (NINO ? '' : `<div class="r-stat"><span>Dinero</span><b>S/ ${S.dinero}</b></div>`);
    $('#rHechos').innerHTML = R.hechos.map(([c, t]) => `<li class="${c}">${t}</li>`).join('');
    $('#lista').hidden = true;
    $('#rDia').innerHTML = R.dia.map(([h, t, c]) => `<li class="${c || ''}"><time>${h}</time><span>${t}</span></li>`).join('');
    $('#rProy').innerHTML = R.proy;
    $('#rHab').innerHTML = S.habitos.map((h) => `<span class="hab">${h}<small>1/5</small></span>`).join('')
      + S.malos.map((h) => `<span class="hab malo">${h}<small>1/5</small></span>`).join('')
      || '<span class="hab malo">Ninguno todavía</span>';
    const h2 = $('#resumen').querySelectorAll('h2');
    h2[0].textContent = 'Lo que hiciste';
    h2[1].textContent = NINO ? 'Tu día, hora por hora' : 'Así sigue tu día';
    h2[2].textContent = NINO ? 'El círculo de tu día' : 'Si repites este día';
    $('#resumen').hidden = false;
    $('#bOtra').focus({ preventScroll: true });
    if (NINO) {
      const ordenado = S.f.cama && S.f.juguetes && S.f.ropaSucia && S.f.zapatos;
      meta('comer', !!S.f.desayuno && !!S.f.almorzo && !!S.f.ceno);
      meta('cuarto', !!ordenado);
      meta('dormir', !!S.f.durmio && !S.f.desvelo && S.min < 22 * 60);
    }
    if (enCapitulo() && window.Habitos.alTerminarDia) {
      const ids = window.Habitos.progreso.metas(PERFIL, diaDeHoy().dia).map(([id]) => id);
      const logradas = ids.filter((id) => S.metas[id] === true);
      window.Habitos.alTerminarDia({ logradas, estrellas: window.Habitos.progreso.estrellasDe(logradas.length) });
      evento('finDia', { logradas: logradas.length, total: ids.length });
    }
  }

  function deltaSalud() {
    const f = S.f;
    let d = 0;
    d += { bueno: 2, delivery: 1, rapido: -2, pan: -2 }[f.desayuno] != null ? { bueno: 2, delivery: 1, rapido: -2, pan: -2 }[f.desayuno] : -4;
    d += f.dientes ? 1 : -2;
    d += f.ducha === 'bien' ? 1 : f.ducha === 'rapida' ? 0 : -2;
    if (f.vestido === 'sucia') d -= 2;
    const desorden = [f.cama, f.zapatos, f.ropaSucia, NINO ? f.juguetes : f.platos].filter((x) => !x).length;
    if (desorden >= 3 && !f.limpieza) d -= 1;
    if (f.snooze >= 2) d -= 1;
    return d;
  }
  function proyeccion(nombre, extra) {
    const d = deltaSalud();
    const semana = clamp(Math.round(S.salud + d * 7), 0, 100);
    let txt = `<p>Salud hoy: <b>${Math.round(S.salud)}</b> → en una semana: <b>${semana}</b> (${d >= 0 ? '+' : ''}${d} por día).</p>`;
    if (d < 0) {
      const dias = Math.ceil(S.salud / -d);
      txt += `<p class="alerta">A este ritmo, la salud de ${nombre} llega a cero en unas ${Math.ceil(dias / 7)} semanas. En el juego completo, ahí termina la partida.</p>`;
    } else {
      txt += `<p class="ok">Si ${nombre} mantiene esta mañana, su salud sube cada semana y vive más años en el juego.</p>`;
    }
    return txt + (extra || '');
  }

  function resumenAdulto(motivo) {
    const f = S.f;
    const tarde = Math.max(0, Math.round(S.min - CFG.limite));
    const hechos = [
      [f.snooze ? 'no' : 'si', f.snooze ? `Pospusiste la alarma ${f.snooze === 1 ? 'una vez' : f.snooze + ' veces'}` : 'Te levantaste con la primera alarma'],
      [f.cama ? 'si' : 'no', f.cama ? 'Tendiste la cama' : 'Dejaste la cama destendida'],
      [f.zapatos ? 'si' : 'no', f.zapatos ? 'Ordenaste los zapatos' : 'Dejaste los zapatos regados'],
      [f.ropaSucia ? 'si' : 'no', f.ropaSucia ? 'Recogiste la ropa sucia' : 'La ropa sucia sigue en el piso'],
      [f.lavadora ? 'si' : 'no', f.lavadora ? 'Pusiste la lavadora' : 'No lavaste ropa'],
      [f.dientes ? 'si' : 'no', f.dientes ? 'Te lavaste los dientes' : 'No te lavaste los dientes'],
      [f.ducha === 'bien' ? 'si' : f.ducha ? 'medio' : 'no', f.ducha === 'bien' ? 'Te duchaste' : f.ducha ? 'Ducha rápida' : 'No te duchaste'],
      [f.vestido === 'limpia' ? 'si' : f.vestido === 'arrugada' ? 'medio' : 'no', f.vestido === 'limpia' ? 'Ropa planchada' : f.vestido === 'arrugada' ? 'Ropa arrugada' : 'Ropa sucia de ayer'],
      [f.desayuno === 'bueno' ? 'si' : f.desayuno === 'delivery' ? 'medio' : 'no', { bueno: 'Desayuno completo', delivery: 'Desayuno por delivery (S/ 22)', rapido: 'Café con galletas' }[f.desayuno] || 'No desayunaste'],
      [f.platos && !f.platosDesayuno ? 'si' : 'no', f.platos && !f.platosDesayuno ? 'Dejaste la cocina limpia' : 'Dejaste platos sucios'],
    ];
    if (f.limpieza) hechos.push(['medio', 'Contrataste limpieza (S/ 60)']);
    const dia = [];
    let ganancia = 80, gastos = 0;
    if (motivo === 'jefe') dia.push(['08:30', 'Tu jefe te llama: no llegaste. Te descuentan medio día (S/ 40).', 'mal']), ganancia -= 40;
    else if (tarde > 0) { const desc = Math.min(40, tarde * 2); ganancia -= desc; dia.push(['08:' + String(15 + Math.min(tarde, 44)).padStart(2, '0'), `Llegas ${tarde} min tarde. Te descuentan S/ ${desc}.`, 'mal']); }
    else dia.push(['08:15', 'Llegas a tiempo al trabajo.', 'bien']);
    if (f.vestido === 'sucia') dia.push(['09:30', 'Un compañero te pregunta si dormiste en la oficina. Se nota la ropa sucia.', 'mal']);
    else if (f.vestido === 'arrugada') dia.push(['09:30', 'En la reunión con el cliente se nota tu camisa arrugada.', 'mal']);
    else dia.push(['09:30', 'Te ves bien en la reunión con el cliente. Te sientes seguro.', 'bien']);
    if (f.desayuno === 'bueno' || f.desayuno === 'delivery') dia.push(['11:00', 'Sigues con energía. Terminas el informe antes del almuerzo.', 'bien']);
    else if (f.desayuno === 'rapido') { dia.push(['10:30', 'Bajón de azúcar. Te da sueño y compras un snack de la máquina (S/ 5).', 'mal']); gastos += 5; }
    else { dia.push(['10:30', 'Te duele la cabeza de hambre y te cuesta concentrarte. Tu jefe lo nota.', 'mal']); gastos += 8; }
    if (!f.dientes || !f.ducha) dia.push(['14:00', !f.dientes ? 'Hablas tapándote la boca: no te lavaste los dientes.' : 'Hace calor y se nota que no te duchaste.', 'mal']);
    const desorden = [!f.cama && 'la cama destendida', !f.zapatos && 'zapatos regados', !f.ropaSucia && 'ropa sucia en el piso', (!f.platos || f.platosDesayuno) && 'platos sucios'].filter(Boolean);
    if (f.limpieza) dia.push(['19:00', 'Llegas y la casa está limpia porque pagaste a alguien. Te costó S/ 60, pero tienes la noche libre.', 'bien']);
    else if (!desorden.length) dia.push(['19:00', 'Llegas a una casa ordenada. Descansas de verdad y cocinas tranquilo.', 'bien']);
    else dia.push(['19:00', `Llegas cansado y encuentras ${desorden.join(', ')}. Pierdes ${desorden.length * 12} min ordenando y te acuestas tarde.`, 'mal']);
    dia.push(['Mañana', f.lavadora ? 'Tendrás ropa limpia lista para vestirte.' : 'No hay ropa limpia: tendrás que repetir ropa o lavar a mano en la noche.', f.lavadora ? 'bien' : 'mal']);
    const gastoFijo = 35;
    const ahorroDia = ganancia - gastos - gastoFijo - (f.desayuno === 'delivery' ? 22 : 0) - (f.limpieza ? 60 : 0);
    const mes = ahorroDia * 22;
    const pct = clamp(Math.round(mes / 600 * 100), 0, 100);
    const metaTxt = `<p><b>Meta del mes:</b> ahorrar S/ 600 para un curso de inglés. Hoy ganas S/ ${ganancia} y gastas S/ ${ganancia - ahorroDia}. ${ahorroDia > 0 ? `Si repites este día, a fin de mes juntas <b>S/ ${mes}</b>.` : 'Si repites este día, no ahorras nada este mes.'}</p><div class="meta-barra"><i style="width:${pct}%"></i></div><p>${pct >= 100 ? '<span class="ok">Cumples la meta del mes.</span>' : `<span class="alerta">Llegas al ${pct}% de la meta.</span>`}</p>`;
    const bien = S.habitos.length, mal = S.malos.length + hechos.filter((h) => h[0] === 'no').length;
    return {
      eyebrow: motivo === 'jefe' ? 'Nunca saliste de casa' : `Saliste a las ${hora(S.min)}`,
      titulo: bien >= 7 ? 'Una mañana ordenada' : bien >= 4 ? 'Una mañana a medias' : 'Una mañana en caos',
      sub: bien >= 7 ? 'Hiciste lo que correspondía. El resto del día te va a salir más simple.' : `Dejaste ${mal} cosas pendientes. Todo eso te espera más tarde.`,
      hechos, dia, proy: proyeccion('Andrés', metaTxt),
    };
  }

  function resumenNino() {
    const f = S.f;
    const ordenado = f.cama && f.juguetes && f.ropaSucia && f.zapatos;
    const hechos = [
      ['tit', 'En la mañana'],
      [f.snooze ? 'no' : 'si', f.snooze ? gx('Te hiciste el dormido', 'Te hiciste la dormida') : 'Te levantaste con la alarma'],
      [f.desayuno === 'bueno' ? 'si' : f.desayuno ? 'medio' : 'no', { bueno: 'Desayunaste con la familia', rapido: gx('Comiste apurado', 'Comiste apurada'), pan: 'Solo un pan en el camino' }[f.desayuno] || 'No desayunaste'],
      ...(FINDE ? [] : [[f.mochila ? 'si' : 'no', f.mochila ? 'Alistaste la mochila' : 'No alistaste la mochila']]),
      [f.dientes ? 'si' : 'no', f.dientes ? 'Te lavaste los dientes' : 'No te lavaste los dientes'],
    ].concat(FINDE ? [
      ['tit', 'En casa, sin colegio'],
      [f.riego ? 'si' : 'no', f.riego ? 'Regaste las plantas de mamá' : 'No ayudaste con las plantas'],
      [f.jugoPerro ? 'si' : 'no', f.jugoPerro ? `Jugaste fútbol con ${PERFIL ? PERFIL.mascota.nombre : 'tu perro'}` : 'No jugaste con tu perro'],
    ] : [
      ['tit', 'En el colegio'],
      [f.tareaEntregada === 'si' ? 'si' : 'no', f.tareaEntregada === 'si' ? 'Entregaste la tarea' : 'No entregaste la tarea'],
      [S.nota >= 11 ? 'si' : 'no', `Examen: ${S.nota != null ? S.nota : 0} de 20`],
      [f.comioKiosco === 'bien' ? 'si' : f.comioKiosco ? 'medio' : 'no', f.comioKiosco === 'bien' ? 'Comiste en el recreo' : f.comioKiosco ? 'Golosinas en el recreo' : S.dinero > 0 ? 'No comiste en el recreo' : 'Sin propina: no comiste en el recreo'],
      [f.jugo === 'si' ? 'si' : lluvia() ? 'medio' : 'no', f.jugo === 'si' ? 'Jugaste con tus amigos' : lluvia() ? 'Llovió: no hubo fútbol en el recreo' : 'No jugaste en el recreo'],
    ]).concat([
      ['tit', 'En la tarde'],
      [f.almorzo === 'bien' ? 'si' : f.almorzo ? 'medio' : 'no', f.almorzo === 'bien' ? 'Almorzaste' : f.almorzo ? 'Comiste a la carrera' : 'No almorzaste'],
      [f.tareaTarde ? 'si' : 'no', f.tareaTarde ? 'Hiciste la tarea de mañana' : 'No hiciste la tarea de mañana'],
      [ordenado ? 'si' : 'no', ordenado ? 'Tu cuarto quedó ordenado' : 'Tu cuarto quedó desordenado'],
    ]);
    // la cadena de causas del día
    const c = [];
    c.push(f.desayuno === 'bueno' ? ['bien', 'Desayunaste bien'] : ['mal', 'Sin buen desayuno']);
    if (FINDE) {
      c.push(f.riego ? ['bien', 'Ayudaste en casa'] : ['mal', 'No ayudaste en casa']);
      c.push(f.jugoPerro ? ['bien', 'Jugaste con tu perro'] : ['mal', 'Tu perro se aburrió']);
    } else {
      c.push(S.nota >= 11 ? ['bien', `Rendiste en el examen (${S.nota})`] : ['mal', `Hambre en el examen (${S.nota != null ? S.nota : 0})`]);
      c.push(S.dinero > 0 || f.comioKiosco === 'bien' ? ['bien', 'Propina para comer'] : ['mal', 'Sin propina, sin comida']);
    }
    c.push(f.mamaMolesta ? ['mal', 'Mamá molesta'] : ['bien', 'Mamá contenta']);
    c.push(f.tareaTarde && ordenado ? ['bien', 'Todo listo en la tarde'] : ['mal', 'Cosas pendientes']);
    c.push(S.motivacion >= 50 ? ['bien', 'Te acuestas con ganas'] : ['mal', 'Te acuestas sin ganas']);
    const malos = c.filter((x) => x[0] === 'mal').length;
    const cadena = `<div class="cadena">${c.map(([k, t]) => `<span class="eslabon ${k}">${t}</span>`).join('<span class="flecha">→</span>')}</div>`;
    // cómo empieza el día siguiente
    const motMan = clamp(Math.round(S.motivacion * 0.6 + (ordenado ? 15 : 0) + (f.tareaTarde ? 10 : 0)), 5, 90);
    const confMan = Math.round(S.confianza);
    const manana = [
      [motMan >= 45, `Motivación al despertar: <b>${motMan}</b>${motMan < 45 ? ' (empiezas con flojera)' : ''}`],
      [confMan >= 60, `Propina: <b>${confMan >= 60 ? 'S/ 3' : 'nada'}</b> (confianza de tus papás: ${confMan})`],
      [!!f.tareaTarde, f.tareaTarde ? 'Llevas la tarea lista.' : 'Otra vez sin tarea: <b>la profesora va a citar a tus papás.</b>'],
      [ordenado, ordenado ? 'Tu cuarto ya está ordenado: ganas tiempo en la mañana.' : 'Tu cuarto sigue desordenado: <b>mañana tendrás todavía más cosas que hacer.</b>'],
      [!!f.ropaSucia, f.ropaSucia ? 'Mamá lavó tu ropa: tienes uniforme limpio.' : 'Tu ropa sucia sigue en el piso: <b>no hay uniforme limpio para mañana.</b>'],
    ];
    const proy = cadena
      + `<p class="${malos >= 3 ? 'alerta' : 'ok'}">${malos >= 3
        ? 'Así se forma el círculo vicioso: una mala mañana trae hambre, malas notas, una mamá molesta y menos ganas. Y cada día empieza peor que el anterior.'
        : 'Así se forma el círculo virtuoso: una buena mañana trae energía, buenas notas y confianza. Y cada día te cuesta menos.'}</p>`
      + `<p><b>Mañana empieza así:</b></p><ul class="hechos">${manana.map(([ok, t]) => `<li class="${ok ? 'si' : 'no'}">${t}</li>`).join('')}</ul>`;
    const bien = c.length - malos;
    return {
      eyebrow: `Fin del día · ${hora(S.min)}`,
      titulo: malos <= 1 ? 'Un día de campeón' : malos <= 3 ? 'Un día a medias' : 'Un día que se complicó',
      sub: malos <= 1 ? 'Todo empezó con una buena mañana. Tus papás lo notaron.' : `De 6 cosas del día, ${malos} salieron mal. Casi todo empezó en la mañana.`,
      hechos, dia: S.diario, proy, bien,
    };
  }

  // ---------------------------------------------------------------- bucle principal
  let jugando = false, reloj = 0, camaraDirecta = true, olor = 0, suspiro = 20, filtroAnimo = -1, gota = 0, aura = 0;
  // invierno en la mañana: todavía oscuro; lluvia: luz gris
  const luzMundo = () => (S.fase === 'prologo' ? 0.62 : NINO && S.min >= 19 * 60 ? 0.6 : NINO && S.min >= 18 * 60 ? 0.8 : invierno() && S.fase === 'manana' ? 0.7 : lluvia() ? 0.86 : 1);
  const cFrio = new THREE.Color('#8ea6e0');
  const cTarde = new THREE.Color('#ffb27a'), cFeliz = new THREE.Color('#ffdca6'), cTriste = new THREE.Color('#9aaccc'), cTmp = new THREE.Color();
  // nube con lluvia (ánimo bajo) o sol (ánimo alto) sobre la cabeza
  function crearClima() {
    const g = new THREE.Group();
    const nube = new THREE.Group();
    [[0, 0, 0, 0.2], [0.18, -0.03, 0, 0.15], [-0.18, -0.03, 0, 0.15], [0.08, 0.1, 0, 0.14]].forEach(([x, y, z, r]) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat('#6f7489')); m.position.set(x, y, z); nube.add(m);
    });
    const sol = new THREE.Group();
    sol.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), matB('#ffd23f')));
    for (let i = 0; i < 8; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), matB('#ffb627'));
      const a = i / 8 * PI * 2;
      r.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0);
      r.rotation.z = a - PI / 2;
      sol.add(r);
    }
    g.add(nube, sol);
    return { g, nube, sol };
  }
  let clima = null;
  function actualizarAnimoVisible(dt) {
    if (!escena) return;
    const animo = D.animo != null ? D.animo : S.animo;
    const a = clamp(animo / 100, 0, 1);
    // color y luz del cuarto
    const r = Math.round(animo);
    if (r !== filtroAnimo) { filtroAnimo = r; canvas.style.filter = `saturate(${(0.35 + 0.85 * a).toFixed(2)}) brightness(${(0.8 + 0.24 * a).toFixed(2)})`; }
    if (escena.hemi) {
      const km = luzMundo() * (escena.exterior ? 1.25 : 1);
      escena.hemi.intensity = lerp(escena.hemi.intensity, (0.5 + 0.32 * a) * km, dt * 2);
      cTmp.copy(cTriste).lerp(S.fase === 'tarde' ? cTarde : cFeliz, a);
      if (km < 1) cTmp.lerp(cFrio, 1 - km);
      escena.sol.color.lerp(cTmp, dt * 2);
      escena.sol.intensity = lerp(escena.sol.intensity, (0.45 + 0.4 * a) * km, dt * 2);
    }
    Sonido.animo(animo);
    if (!clima || clima.g.parent !== escena.scene) { clima = crearClima(); escena.scene.add(clima.g); }
    const c = cabezaMundo(P);
    clima.g.position.set(c.x, c.y + (P.cuerpo.rotation.x ? 0.6 : 0.75 * P.escala + 0.25), c.z);
    clima.g.quaternion.copy(camera.quaternion);
    const triste = animo < 35 && jugando, feliz = animo >= 72 && jugando;
    clima.nube.visible = triste;
    clima.sol.visible = feliz;
    clima.sol.rotation.z += dt * 1.5;
    clima.g.position.y += Math.sin(reloj * 2) * 0.03;
    if (triste) {
      gota -= dt;
      if (gota <= 0) { gota = 0.07; emitir(clima.g.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, -0.12, (Math.random() - 0.5) * 0.2)), '#7fb2e5', new THREE.Vector3(0, -2.2, 0), 0.4, 0.022, 0, 0.9); }
    }
    // aura dorada cuando la motivación está a tope
    if (jugando && S.motivacion >= 75) {
      aura -= dt;
      if (aura <= 0) { aura = 0.12; const p = P.root.position; emitir(new THREE.Vector3(p.x + (Math.random() - 0.5) * 0.7, 0.1 + Math.random() * 0.4, p.z + (Math.random() - 0.5) * 0.7), Math.random() < 0.5 ? '#ffd23f' : '#ff9a3d', new THREE.Vector3(0, 1.1, 0), 0.9, 0.03, 0); }
    }
  }
  const camPos = new THREE.Vector3(), camMira = new THREE.Vector3();
  let luzVitrina = null, lluviaT = 0, enfoque = null;

  function actualizarCamara(dt) {
    const p = P.root.position;
    if (vitrina) {
      if (vitrina.manual > 0) vitrina.manual -= dt;
      else vitrina.base = lerp(vitrina.base, 0, dt * 0.6);
      P.root.rotation.y = vitrina.base + (vitrina.manual > 0 ? 0 : Math.sin(reloj * 0.7) * 0.45);
      // el personaje queda a la derecha del panel (o arriba en pantallas angostas)
      const ancho = camera.aspect >= 1.05, h = P.escala / 0.74;
      const dist = (ancho ? 3.1 : 7.0) * h;
      camPos.set(p.x, 1.15 * h, p.z + dist);
      camMira.set(p.x, 0.8 * h, p.z);
      camera.position.copy(camPos);
      camera.lookAt(camMira);
      const W = canvas.clientWidth || window.innerWidth, Hh = canvas.clientHeight || window.innerHeight;
      if (ancho) camera.setViewOffset(W, Hh, -Math.min(250, W * 0.2), 0, W, Hh);
      else camera.setViewOffset(W, Hh, 0, Hh * 0.3, W, Hh);
      if (!luzVitrina) luzVitrina = new THREE.PointLight('#fff4e6', 0.55, 9);
      if (luzVitrina.parent !== escena.scene) escena.scene.add(luzVitrina);
      luzVitrina.position.set(p.x + 0.6, 1.4, p.z + 2.2);
      return;
    }
    if (camera.view && camera.view.enabled) {
      camera.clearViewOffset();
      if (luzVitrina && luzVitrina.parent) luzVitrina.parent.remove(luzVitrina);
    }
    if (primera) {
      const c = cabezaMundo(P);
      // al final levantas un poco la cabeza, como cuando te incorporas
      const sube = Math.min(1, Math.max(0, (primera.t - 5.8) / 1.2)) * 0.35;
      camPos.set(c.x, c.y + 0.1 + sube, c.z + sube * 0.4);
      camMira.lerp(primera.mira, 1 - Math.exp(-dt * 2.4));
      camera.position.copy(camPos);
      camera.lookAt(camMira);
      return;
    }
    if (cine) {
      const f0 = cine.foco && cine.foco !== P ? cine.foco.root.position : p;
      const mx = (p.x + f0.x) / 2, mz = (p.z + f0.z) / 2;
      const angosto = camera.aspect < 1, dist = angosto ? 7.4 : 4.8;
      const objetivo = new THREE.Vector3(mx, angosto ? 3.6 : 3.0, mz + dist), mira = new THREE.Vector3(mx, 0.95, mz - 0.6);
      if (camaraDirecta) { camPos.copy(objetivo); camMira.copy(mira); camaraDirecta = false; }
      else { const f = 1 - Math.exp(-dt * 2.2); camPos.lerp(objetivo, f); camMira.lerp(mira, f); }
      camera.position.copy(camPos);
      camera.lookAt(camMira);
      return;
    }
    // en el mirador la cámara mira hacia el paisaje, por detrás del personaje
    if (escena.nombre === 'mirador') {
      const angosto = camera.aspect < 1;
      const objetivo = new THREE.Vector3(p.x * 0.6, angosto ? 4.2 : 3.1, p.z + (angosto ? 7.5 : 5.2));
      const mira = new THREE.Vector3(p.x * 0.6, -0.4, p.z - 7);
      if (camaraDirecta) { camPos.copy(objetivo); camMira.copy(mira); camaraDirecta = false; }
      else { const f = 1 - Math.exp(-dt * 4); camPos.lerp(objetivo, f); camMira.lerp(mira, f); }
      camera.position.copy(camPos);
      camera.lookAt(camMira);
      return;
    }
    const angosto = camera.aspect < 1;
    const dist = (escena.nombre === 'pasillo' ? 6.2 : escena.nombre === 'bano' ? 5.6 : 7.0) * (angosto ? 1.45 : 1);
    const lim = (v, a) => clamp(v, -a, a);
    // un módulo puede pedir encuadrar otro punto (por ejemplo, el arco durante el partido)
    const foco = enfoque ? enfoque() : null;
    const peso = foco && foco.peso != null ? foco.peso : 0.55;
    const fx = foco ? lerp(p.x, foco.x, peso) : p.x, fz = foco ? lerp(p.z, foco.z, peso) : p.z;
    const tx = lim(fx, Math.max(0, escena.w / 2 - (angosto ? 1.2 : 2.4) + (foco ? 1.6 : 0)));
    const tz = lim(fz, Math.max(0, escena.d / 2 - 1.5));
    const objetivo = new THREE.Vector3(tx, dist * 0.92, tz + dist * 0.88);
    const mira = new THREE.Vector3(tx, 0.7, tz - 0.3);
    if (camaraDirecta) { camPos.copy(objetivo); camMira.copy(mira); camaraDirecta = false; }
    else { const f = 1 - Math.exp(-dt * 4); camPos.lerp(objetivo, f); camMira.lerp(mira, f); }
    camera.position.copy(camPos);
    camera.lookAt(camMira);
  }

  const unir = (xs) => xs.length > 1 ? xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1] : xs.join('');
  let minutoTic = -1, minutoLista = -1, alarmaT = 0;
  const avisosTiempo = {};
  function periodo() { return S.min < 12 * 60 ? 'Mañana' : S.min < 19 * 60 ? 'Tarde' : 'Noche'; }
  function pintarReloj() {
    const t = $('#tiempo');
    t.dataset.nivel = S.min >= 21 * 60 ? 'medio' : 'ok';
    t.classList.remove('urgente');
    $('#hHora').textContent = hora(S.min);
    $('#tFill').style.width = clamp((S.min - 6 * 60) / (16 * 60) * 100, 0, 100) + '%';
    $('#tCosto').hidden = true;
    const d = diaDeHoy();
    let pista = 'Haz lo que quieras.';
    if (S.fase === 'colegio') pista = 'En el colegio.';
    else if (S.fase === 'manana' && !FINDE && !S.f.fueColegio && S.min < 8 * 60 + 30) pista = `Bus al colegio: ${hora(CFG.limite)}`;
    else if (S.min >= 20 * 60) pista = 'Hora de dormir.';
    $('#tTxt').innerHTML = `<b>${d.nombre} · ${periodo()}</b> ${pista}`;
    Sonido.urgencia(0);
    const m = Math.floor(S.min);
    if (m !== minutoLista) { minutoLista = m; resumenLista(); }
  }
  function pintarTiempo() {
    if (NINO) { pintarReloj(); return; }
    const total = CFG.limite - CFG.inicio, quedan = CFG.limite - S.min;
    const pct = clamp(quedan / total * 100, 0, 100);
    const fill = $('#tFill');
    fill.style.width = pct + '%';
    const nivel = pct > 50 ? 'ok' : pct > 25 ? 'medio' : 'poco';
    const t = $('#tiempo');
    t.dataset.nivel = quedan <= 0 ? 'tarde' : nivel;
    t.classList.toggle('urgente', quedan <= 10);
    $('#hHora').textContent = hora(S.min);
    $('#tTxt').innerHTML = quedan > 0
      ? `Te quedan <b>${Math.ceil(quedan)} min</b> ${CFG.meta}`
      : `<b>¡Vas ${Math.floor(-quedan)} min tarde!</b>`;
    const costo = accion ? accion.restante : costoVista;
    const c = $('#tCosto');
    if (costo > 0 && pct > 0) {
      const w = Math.min(pct, costo / total * 100);
      c.style.width = w + '%';
      c.style.left = (pct - w) + '%';
      c.hidden = false;
    } else c.hidden = true;
    Sonido.urgencia(clamp(1 - pct / 100, 0, 1));
    // avisos grandes a los 30, 15 y 5 minutos
    [30, 15, 5].forEach((n) => {
      if (quedan <= n && quedan > n - 3 && !avisosTiempo[n] && S.min > CFG.inicio + 1) {
        avisosTiempo[n] = true;
        banner('urg', CFG.urg, `¡Quedan ${n} minutos!`, pendientes().length ? `Te falta: ${unir(pendientes().slice(0, 3))}` : 'Ya hiciste todo: puedes salir.');
        Sonido.sfx('alerta');
        sacudir(t);
      }
    });
    // tic-tac en los últimos 10 minutos
    const m = Math.floor(S.min);
    if (m !== minutoLista) { minutoLista = m; resumenLista(); }
    if (quedan <= 10 && quedan > 0 && m !== minutoTic) { minutoTic = m; Sonido.sfx(quedan <= 5 ? 'latido' : 'tic'); }
  }
  function recordatoriosMama() {
    if (!NINO || tutorial || bloqueos.size || visita || accion || panelAbierto || cargando || levantando || alarmaActiva || examen || mamaHabla()) return;
    if (S.fase === 'colegio') return;
    const pend = pendientes(), n = CFG.nombre;
    // mamá aparece solo si algo importa: el bus, el hambre, el desorden, la hora de dormir
    if (S.fase === 'manana' && !FINDE && !S.f.fueColegio && !S.f.avisoBus && S.min >= CFG.limite - 10 && S.min < 8 * 60 + 30) {
      S.f.avisoBus = true;
      visitaMama([`¡${n}! El bus pasa a las ${hora(CFG.limite).replace(/^0/, '')}. ¿Vas a ir al colegio?`].concat(pend.length > 2 ? [`Todavía te falta ${unir(pend.slice(0, 2))}.`] : []));
    } else if (S.fase === 'manana' && !S.f.desayuno && !S.f.avisoDesayuno && S.min >= (FINDE ? 8 * 60 : 7 * 60) && S.min < CFG.desayunoHasta && escena.nombre !== 'comedor') {
      // el desayuno: mamá llama desde el comedor (no viene, solo se escucha)
      S.f.avisoDesayuno = true;
      const t = `¡${n}! ¡El desayuno está servido en el comedor!`;
      avisar(`Mamá desde el comedor: "${t}"`);
      Sonido.hablar(t, 'mama');
    } else if (S.comida < 15 && (S.f.avisoHambre || 0) < S.min - 120) {
      S.f.avisoHambre = S.min;
      visitaMama([`${n}, ¡no has comido casi nada!`, 'Ve al comedor o saca una fruta de la refrigeradora.']);
    } else if (S.fase === 'tarde' && !S.f.revision && S.min >= 17 * 60 && S.f.llegoCasa) {
      S.f.revision = true;
      const ok = !pend.length;
      meta('cuarto', ok);
      cambiar(ok ? { confianza: 10, animo: 8 } : { confianza: -6, animo: -4 });
      anotar(ok ? 'Mamá vio tu cuarto ordenado y te felicitó.' : `Mamá vio que faltaba ${unir(pend.slice(0, 3))}.`, ok ? 'bien' : 'mal');
      visitaMama(ok ? [`¡${n}! Tu cuarto está ordenado. ¡Así me gusta!`] : [`${n}, todavía falta ${unir(pend.slice(0, 3))}.`, 'Hazlo antes de la cena, ¿sí?']);
    } else if (S.fase === 'tarde' && !S.f.avisoDormir && S.min >= 20 * 60 + 30) {
      S.f.avisoDormir = true;
      visitaMama([`${n}, ya es tarde.`, S.f.dientes ? 'A tu cama, que mañana hay que levantarse temprano.' : 'Lávate los dientes y a la cama, que mañana hay que levantarse temprano.']);
    }
  }

  function actualizar(dt) {
    reloj += dt;
    if (cine) actualizarCine(dt);
    if (primera) actualizarDespertar(dt);
    if (jugando && !cargando) {
      if (visita) actualizarVisita(dt);
      if (levantando) actualizarLevantarse(dt);
      else if (accion) actualizarAccion(dt);
      else if (examen) actualizarExamen(dt);
      else if (!panelAbierto && !alarmaActiva && !escondido) {
        let dx = (K.right ? 1 : 0) - (K.left ? 1 : 0), dz = (K.down ? 1 : 0) - (K.up ? 1 : 0), fuerza = 1;
        // con la palanca táctil: poquito = caminar despacio, hasta el borde = caminar normal
        if (K.jx || K.jz) { dx = K.jx; dz = K.jz; fuerza = Math.max(0.45, Math.min(1, Math.hypot(dx, dz))); }
        if (dx || dz) {
          const l = Math.hypot(dx, dz); dx /= l; dz /= l;
          const corre = corriendo();
          const v = velocidad() * fuerza * (corre ? 1.75 : 1);
          if (corre) S.energia = Math.max(0, S.energia - dt * 0.12);   // correr cansa un poquito
          mover(dx * v * dt, dz * v * dt);
          girarHacia(dx, dz, dt);
          if (P.anim !== 'caminar') P.anim = 'caminar';
          P.vel = v;
          if (!revisarPuertas()) {
            const ob = escena.obstaculos.find((o) => o.activo() && Math.hypot(P.root.position.x - o.x, P.root.position.z - o.z) < o.r);
            if (ob) hacer(ob.op, null);
          }
        } else if (P.anim === 'caminar') P.anim = 'quieto';
        if (!(tutorial && tutorial.pausa) && !bloqueos.size) S.min += dt * RITMO;
        const it = cercano();
        if (it && !accion && !cargando) { $('#promptTxt').textContent = rotulo(it); $('#prompt').hidden = false; }
        else $('#prompt').hidden = true;
        $('#bAccion').classList.toggle('listo', !!it && !accion);
      } else {
        if (P.anim === 'caminar') P.anim = 'quieto';
        $('#prompt').hidden = true;
      }
      // alarma del despertador (adulto)
      if (!NINO && alarmaActiva && panelAbierto && !accion) {
        alarmaT -= dt;
        if (alarmaT <= 0) { alarmaT = 1.1; Sonido.sfx('alarma'); }
      }
      recordatoriosMama();
      // la flojera aparece cuando la motivación está baja
      // en la vida libre la flojera aparece menos: solo con la motivación muy baja
      const umbral = NINO ? 35 : S.fase === 'tarde' ? 55 : 40, cada = NINO ? (S.fase === 'tarde' ? 45 : 30) : S.fase === 'tarde' ? 18 : 9;
      if (S.fase !== 'colegio' && !tutorial && !bloqueos.size && !examen && !accion && !panelAbierto && !cargando && !levantando && !alarmaActiva && !visita && !mamaHabla() && S.motivacion < umbral && S.min - (S.ultTent || CFG.inicio) >= cada) {
        S.ultTent = S.min;
        abrirTentacion();
      }
      // el ánimo arrastra a la motivación poco a poco
      const minuto = Math.floor(S.min);
      if (minuto !== S.minDeriva) {
        if (S.minDeriva !== undefined) {
          const antes = Math.round(S.motivacion);
          S.motivacion = clamp(S.motivacion + (S.animo - S.motivacion) * 0.04, 0, 100);
          if (NINO) gastarNecesidades(Math.max(0, minuto - S.minDeriva));
          else if (S.fase === 'tarde' && !S.f.almorzo) { S.energia = clamp(S.energia - 0.15, 0, 100); if (minuto % 5 === 0) pintarStat('energia', false); }
          if (Math.round(S.motivacion) !== antes && !$('#hud').hidden) pintarStat('motivacion', false);
        }
        S.minDeriva = minuto;
      }
      // suspiros de flojera
      suspiro -= dt;
      if (suspiro <= 0) {
        suspiro = 16 + Math.random() * 10;
        if (S.motivacion < 30 && !accion && !panelAbierto && !visita && !levantando && !alarmaActiva && !burbujas.size) decir(P, FLOJERA[Math.floor(Math.random() * FLOJERA.length)], 2.4);
      }
      // reglas de tiempo
      if (tutorial) actualizarTutorial(dt);
      if (!accion && !panelAbierto && !cargando && !levantando && !mamaHabla() && !bloqueos.size) {
        if (NINO) revisarHorario();
        else if (S.min >= CFG.limite + 40) fin('jefe');
      }
      // olor cuando la higiene está baja
      if (S.higiene < 30 && !levantando && P.cuerpo.rotation.x === 0) {
        olor -= dt;
        if (olor <= 0) { olor = 0.3; const c = cabezaMundo(P); emitir(c.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.25, (Math.random() - 0.5) * 0.4)), '#9bc46a', new THREE.Vector3(0, 0.5, 0), 1.2, 0.04, 0, 0.6); }
      }
      if (jugando) pintarTiempo();
    }
    actualizarEfectos(dt);
    // lluvia en los lugares al aire libre
    if (lluvia() && escena.nombre === 'patio' && !cargando) {
      lluviaT -= dt;
      while (lluviaT <= 0) {
        lluviaT += 0.012;
        const q = P.root.position;
        emitir(new THREE.Vector3(q.x + (Math.random() - 0.5) * 14, 4.5, q.z + (Math.random() - 0.5) * 9), '#cfe0f5', new THREE.Vector3(-0.4, -9, 0), 0.5, 0.025, 0, 0.55);
      }
    }
    actualizarAnimoVisible(dt);
    animar(P, dt);
    escena.npcs.forEach((n) => animar(n, dt));
    escena.updates.forEach((u) => u(dt, reloj));
    ganchos.actualizar.forEach((f) => f(dt, reloj));
    actualizarParticulas(dt);
    actualizarCamara(dt);
    // etiquetas y burbujas
    etiquetas.forEach((e) => {
      const s = aPantalla(e.pos);
      e.el.hidden = !s.ok || cargando || !jugando;
      e.el.style.left = s.x + 'px'; e.el.style.top = s.y + 'px';
    });
    const cerca = jugando && !accion && !panelAbierto ? cercano() : null;
    etqObjetos.forEach((o) => {
      if (o.it.posicion) { const q = o.it.posicion(); o.pos.set(q.x, o.it.alto || 1.0, q.z); }
      const s = aPantalla(o.pos);
      const activo = !o.it.activo || o.it.activo();
      o.el.hidden = !s.ok || cargando || !jugando || !activo || !o.tieneTiempo || alarmaActiva || levantando;
      o.el.classList.toggle('cerca', o.it === cerca);
      o.el.style.left = s.x + 'px'; o.el.style.top = s.y + 'px';
    });
    burbujas.forEach((b, el) => {
      if (reloj > b.hasta) { el.hidden = true; burbujas.delete(el); return; }
      const c = cabezaMundo(b.quien).clone();
      c.y += b.quien.cuerpo.rotation.x ? 0.4 : 0.45 * b.quien.escala + 0.15;
      const s = aPantalla(c);
      el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
      el.hidden = !s.ok || cargando;
    });
  }

  let ultimo = performance.now();
  let erroresBucle = 0;
  function bucle(ahora) {
    // se agenda primero: un error en un cuadro nunca debe congelar el juego
    requestAnimationFrame(bucle);
    const dt = Math.min(0.05, (ahora - ultimo) / 1000);
    ultimo = ahora;
    try {
      actualizar(dt);
      renderer.render(escena.scene, camera);
    } catch (e) {
      if (erroresBucle++ < 5) console.error('Error en el juego (sigue funcionando):', e);
      if (accion && erroresBucle % 30 === 0) { accion = null; $('#progreso').hidden = true; }
    }
  }

  // ---------------------------------------------------------------- entrada
  const MAPA = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  // ---------- correr por la casa: mantén Shift, o toca el botón Correr (queda prendido hasta que lo vuelvas a tocar)
  let modoCorrer = false;
  function corriendo() { return (K.shift || modoCorrer) && S.energia > 8 && !bloqueos.has('futbol'); }
  function pintarCorrer() {
    const on = (K.shift || modoCorrer) && !bloqueos.has('futbol');
    $('#bCorrer').classList.toggle('on', on);
    $('#bCorrer').setAttribute('aria-pressed', on ? 'true' : 'false');
    $('#bCorrerTxt').textContent = on ? (S.energia > 8 ? '¡Corriendo!' : 'Sin energía') : 'Correr';
  }
  setInterval(() => { if (jugando) pintarCorrer(); }, 500);
  $('#bCorrer').addEventListener('click', () => { modoCorrer = !modoCorrer; pintarCorrer(); $('#bCorrer').blur(); });
  $('#bCorrer').addEventListener('mousedown', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => { if (e.key === 'Shift') { K.shift = true; pintarCorrer(); } else if (e.code === 'KeyR' && jugando && !panelAbierto && !(e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName))) { modoCorrer = !modoCorrer; pintarCorrer(); } });
  window.addEventListener('keyup', (e) => { if (e.key === 'Shift') { K.shift = false; pintarCorrer(); } });
  window.addEventListener('keydown', (e) => {
    if (primera) { if (/^(Enter|Space|Escape)$/.test(e.code)) { e.preventDefault(); terminarDespertar(); } return; }
    if (cine) {
      if (cine.dialogo && cine.dialogo.ops) {
        const b = $('#cineOps').children[parseInt(e.key, 10) - 1];
        if (b) { e.preventDefault(); b.click(); }
      } else if ((e.code === 'Enter' || e.code === 'Space') && cine.siguiente) { e.preventDefault(); cine.siguiente(); }
      return;
    }
    if (vitrina || (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
    if (examen) {
      const n = parseInt(e.key, 10);
      const b = n >= 1 && n <= 3 ? $('#exOps').children[n - 1] : null;
      if (b) { e.preventDefault(); b.click(); }
      return;
    }
    if (!$('#intro').hidden) { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); empezar(); } return; }
    if (!jugando) return;
    if (!panelAbierto && ganchos.tecla.some((f) => f(e))) { e.preventDefault(); return; }
    if (tutorial && tutorial.pasos[tutorial.i].boton && !panelAbierto && /^(Enter|Space|KeyE)$/.test(e.code)) { e.preventDefault(); avanzarTutorial(); return; }
    if (panelAbierto) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) {
        const b = $('#pOpciones').children[n - 1];
        if (b && !b.disabled) { e.preventDefault(); b.click(); }
      } else if (e.code === 'Escape' && !alarmaActiva) cerrarPanel();
      return;
    }
    if (MAPA[e.code]) { K[MAPA[e.code]] = true; e.preventDefault(); return; }
    if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (accion) K.rapido = true; else interactuar(); }
  });
  window.addEventListener('keyup', (e) => { if (MAPA[e.code]) K[MAPA[e.code]] = false; if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') K.rapido = false; });
  window.addEventListener('blur', () => Object.keys(K).forEach((k) => { K[k] = false; }));

  // ---------- controles táctiles (tablet y celular): palanca a la izquierda, botón Usar a la derecha.
  // Se activan solos al tocar la pantalla y se esconden si usas el teclado.
  const raiz = document.documentElement;
  let tactil = false;
  function modoTactil(on) {
    if (on === tactil) return;
    tactil = on;
    raiz.classList.toggle('toque', on);
    if (on && window.matchMedia('(max-height: 500px), (max-width: 600px)').matches) $('#lista').classList.add('plegada');
    if (!on) soltarPalanca();
  }
  window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') modoTactil(true); }, true);
  window.addEventListener('touchstart', () => modoTactil(true), { capture: true, passive: true });
  window.addEventListener('keydown', (e) => { if (MAPA[e.code]) modoTactil(false); }, true);
  // la palanca: el círculo grande es la base; la bolita sigue tu dedo hasta el borde
  const palanca = $('#palanca'), plBola = $('#plBola');
  let palDedo = null;
  function moverPalanca(e) {
    const r = palanca.querySelector('.pl-base').getBoundingClientRect();
    const radio = r.width / 2, cx = r.left + radio, cy = r.top + radio;
    const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, radio / d);
    plBola.style.transform = `translate(${(dx * k).toFixed(1)}px, ${(dy * k).toFixed(1)}px)`;
    const m = Math.min(1, d / radio);
    if (m < 0.18) { K.jx = 0; K.jz = 0; return; }   // zona muerta: el dedo casi en el centro
    K.jx = dx / d * m; K.jz = dy / d * m;
  }
  function soltarPalanca() { palDedo = null; K.jx = 0; K.jz = 0; plBola.style.transform = ''; palanca.classList.remove('activa'); }
  palanca.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    modoTactil(true);
    palDedo = e.pointerId;
    try { palanca.setPointerCapture(e.pointerId); } catch (err) { /* sin captura igual funciona */ }
    palanca.classList.add('activa');
    moverPalanca(e);
  });
  palanca.addEventListener('pointermove', (e) => { if (e.pointerId === palDedo) { e.preventDefault(); moverPalanca(e); } });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => palanca.addEventListener(ev, (e) => { if (e.pointerId === palDedo) soltarPalanca(); }));
  window.addEventListener('blur', soltarPalanca);
  if ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0) modoTactil(true);
  // el cartelito "Usar · Cama" también se puede tocar
  $('#prompt').addEventListener('click', () => { if (!accion && !panelAbierto) interactuar(); });
  // en el celular la lista de cosas por hacer se pliega: tócala para verla
  $('#lTit').addEventListener('click', () => { if (tactil) $('#lista').classList.toggle('plegada'); });
  $('#bAccion').addEventListener('click', () => { if (!accion) interactuar(); });
  $('#bAccion').addEventListener('pointerdown', () => { if (accion) K.rapido = true; });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => $('#bAccion').addEventListener(ev, () => { K.rapido = false; }));

  function empezar() {
    if (jugando) return;
    if (enCapitulo()) TAREAS.unshift([`Darle de comer a ${PERFIL.mascota.nombre}`, () => !!S.f.perroComio, 2, 'tiene hambre']);
    $('#intro').hidden = true;
    $('#hud').hidden = false;
    $('#tactil').hidden = false;
    $('#bCorrer').hidden = false;
    if (tactil && window.innerWidth < 600 && window.innerHeight > window.innerWidth) setTimeout(() => avisar('Consejo: gira el teléfono para ver mejor la casa.'), 9000);
    jugando = true;
    Sonido.iniciar();
    Sonido.musica(true);
    if (invierno()) { S.energia -= 6; S.motivacion -= 6; anotar('Amaneció oscuro y con frío: te costó más salir de la cama.', 'mal'); }
    if (lluvia()) S.animo -= 5;
    initStats();
    pintarTiempo();
    if (NINO) { alarmaActiva = true; despertar(abrirAlarma); } else abrirAlarma();
  }
  $('#bEmpezar').addEventListener('click', empezar);

  function pintarIntro() {
    $('#iTitulo').textContent = `La mañana de ${CFG.nombre}`;
    const extra = (invierno() ? ' Es invierno: afuera todavía está oscuro y hace frío, así que cuesta más salir de la cama.' : '')
      + (lluvia() ? ' Además está lloviendo.' : '');
    $('#iTexto').textContent = NINO
      ? `Son las ${hora(CFG.inicio)}. ${CFG.nombre} tiene 7 años y el bus del colegio pasa a las ${hora(CFG.limite)}. No le va a alcanzar el tiempo para todo. Mamá prepara el desayuno, pero tender la cama, guardar los juguetes y alistar la mochila le toca a ${gx('él', 'ella')}.${extra} Lo que haga ahora se nota en la tarde.`
      : 'Son las 06:30 y suena la alarma. Andrés tiene que salir a trabajar a las 07:30. No le va a alcanzar el tiempo para todo: lo que haga o deje de hacer ahora se nota en la tarde, en la semana y en su salud.';
    $('#bEmpezar').textContent = `Despertar a ${CFG.nombre}`;
  }
  pintarIntro();

  // ---------------------------------------------------------------- vitrina para el creador de personaje
  let vitrina = null, perroCuarto = false;
  function brillo() {
    const p = P.root.position;
    for (let i = 0; i < 14; i++) emitir(new THREE.Vector3(p.x + (Math.random() - 0.5) * 0.8, 0.2 + Math.random() * 1.1, p.z + (Math.random() - 0.5) * 0.5), Math.random() < 0.5 ? '#ffd23f' : '#ffffff', new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.9, 0), 0.8, 0.03, 0);
  }
  window.Habitos = Object.assign(window.Habitos || {}, {
    motor: {
      nino: NINO,
      aplicarPerfil(p, o) {
        if (!NINO || jugando) return;
        const mundo = !PERFIL || PERFIL.estacion !== p.estacion || PERFIL.clima !== p.clima;
        PERFIL = p;
        CFG.nombre = p.nombre;
        aplicarApariencia(P, p);
        if (mundo && escena && escena.nombre === 'dormitorio') construir('dormitorio', null);
        vestir(P, (o && o.ropa) || P.ropa || 'pijama');
        if (vitrina) { P.cuerpo.rotation.x = 0; P.root.position.set(0.9, 0, 1.1); }
        if (o && o.brillo) brillo();
        pintarIntro();
      },
      vitrina(on, ropa) {
        if (!NINO || jugando) return;
        if (on) {
          vitrina = vitrina || { base: 0, manual: 0 };
          P.cuerpo.rotation.x = 0; P.sentado = false;
          P.root.position.set(0.9, 0, 1.1);
          vestir(P, ropa || 'limpia');
          P.anim = 'saludar'; P.t = 0;
          setTimeout(() => { if (vitrina && P.anim === 'saludar') P.anim = 'quieto'; }, 1500);
        } else {
          vitrina = null;
          vestir(P, 'pijama');
          acostar();
          camaraDirecta = true;
        }
      },
      girar(d) { if (vitrina) { vitrina.base += d; vitrina.manual = 2.5; } },
      saludar() { if (vitrina) { P.anim = 'saludar'; P.t = 0; setTimeout(() => { if (vitrina && P.anim === 'saludar') P.anim = 'quieto'; }, 1300); } },
      sfx(n) { Sonido.iniciar(); Sonido.sfx(n); },
      cine: (montaje, pasos) => correrCine(montaje, pasos),
      ubicacion: () => (escena ? { lugar: escena.nombre, w: escena.w, d: escena.d, x: P.root.position.x, z: P.root.position.z, rot: P.root.rotation.y, hud: !$('#hud').hidden, cargando, perro: perroCuarto } : null),
      aclarar: () => fundido(false),
      empezar: () => empezar(),
      perroEnCuarto(on) {
        perroCuarto = !!on;
        if (!jugando && !cine && escena && escena.nombre === 'dormitorio') { construir('dormitorio', null); acostar(); }
      },
      hablar(t, quien) { Sonido.iniciar(); Sonido.hablar(t, quien); },
    },
  });
  const bSon = $('#bSonido');
  const pintarSon = () => { bSon.innerHTML = Sonido.activo() ? ICONOS.sonido : ICONOS.mudo; bSon.setAttribute('aria-label', Sonido.activo() ? 'Silenciar sonido' : 'Activar sonido'); bSon.classList.toggle('mudo', !Sonido.activo()); };
  bSon.addEventListener('click', () => { Sonido.iniciar(); Sonido.setActivo(!Sonido.activo()); pintarSon(); bSon.blur(); });
  pintarSon();
  $('#bOtra').addEventListener('click', () => window.location.reload());

  // ---------------------------------------------------------------- despertar en primera persona
  // Solo suena la alarma: abres los ojos, miras el techo, la ventana, el reloj (la hora y el día) y tu cuarto.
  let primera = null;
  const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  function diaDeHoy() {
    const pr = window.Habitos && window.Habitos.progreso ? window.Habitos.progreso.cargar() : { dia: 1 };
    const nombre = DIAS_SEMANA[(pr.dia - 1) % 7];
    return { dia: pr.dia, nombre, colegio: (pr.dia - 1) % 7 < 5 };
  }
  function despertar(fin) {
    const E = escena;
    // un techo, solo para esta escena (el cuarto no tiene techo para la cámara de arriba)
    const techo = box(E.scene, E.w + 0.4, 0.1, E.d + 0.4, invierno() ? '#d9d4ea' : '#f4ede0', 0, H + 0.05, 0, { sombra: false });
    primera = { t: 0, fin, techo, alarma: 0, mira: new THREE.Vector3(), paso: -1 };
    const c = cabezaMundo(P);
    primera.mira.set(c.x, c.y + 3, c.z + 0.3);
    camMira.copy(primera.mira);
    Sonido.musica(false);
    $('#hud').hidden = true;
    const ojos = $('#ojos');
    ojos.hidden = false;
    ojos.classList.remove('abiertos', 'parpadea');
    const d = diaDeHoy();
    $('#ojosHora').textContent = hora(S.min);
    $('#ojosDia').textContent = `${d.nombre} · ${d.colegio ? 'Hoy hay colegio' : 'Hoy no hay colegio'}`;
    $('#ojosReloj').hidden = true;
  }
  const PASOS_DESPERTAR = [
    // [segundo, a dónde mira]
    [0, () => { const c = cabezaMundo(P); return [c.x, c.y + 3, c.z + 0.3]; }],
    [2.6, () => [0.7, 1.5, -3.5]],          // la ventana
    [4.0, () => [-1.25, 0.63, -3.1]],       // el reloj del velador
    [6.2, () => [2.4, 0.95, 0.9]],           // tu cuarto (te incorporas y miras los juguetes en el piso)
  ];
  function actualizarDespertar(dt) {
    const q = primera;
    q.t += dt;
    // solo suena la alarma (hasta que miras el cuarto)
    q.alarma -= dt;
    if (q.t < 6.2 && q.alarma <= 0) { q.alarma = 1.1; Sonido.sfx('alarma'); }
    if (q.t > 0.9 && !q.parpadeo) { q.parpadeo = true; $('#ojos').classList.add('parpadea'); }
    for (let i = PASOS_DESPERTAR.length - 1; i >= 0; i--) {
      if (q.t >= PASOS_DESPERTAR[i][0]) {
        if (q.paso !== i) { q.paso = i; const [x, y, z] = PASOS_DESPERTAR[i][1](); q.mira.set(x, y, z); }
        break;
      }
    }
    $('#ojosReloj').hidden = !(q.t > 4.4 && q.t < 6.6);
    if (q.t > 8) terminarDespertar();
  }
  function terminarDespertar() {
    if (!primera) return;
    const q = primera;
    primera = null;
    if (q.techo.parent) q.techo.parent.remove(q.techo);
    $('#ojos').hidden = true;
    $('#hud').hidden = false;
    camaraDirecta = true;
    Sonido.musica(true);
    q.fin();
  }
  $('#ojosSaltar').addEventListener('click', terminarDespertar);

  // ---------------------------------------------------------------- metas del día (capítulo 1)
  const enCapitulo = () => NINO && perroCuarto && !!PERFIL && !!(window.Habitos && window.Habitos.progreso);
  function meta(id, ok) {
    if (!enCapitulo() || S.metas[id] !== undefined) return;
    S.metas[id] = ok;
    const m = window.Habitos.progreso.metas(PERFIL, diaDeHoy().dia).find(([k]) => k === id);
    if (!ok || !m) return;   // solo se anuncian las metas de hoy
    setTimeout(() => { banner('bien', 'Meta del día cumplida', m ? m[1] : id); Sonido.sfx('logro'); flash('bien'); }, 600);
  }

  // ---------------------------------------------------------------- tutorial guiado (día 1)
  let tutorial = null;
  const debeTutorial = () => {
    if (!enCapitulo()) return false;
    const pr = window.Habitos.progreso.cargar();
    return !pr.tutorial && pr.dia === 1;
  };
  function pasosTutorial() {
    const m = PERFIL.mascota.nombre;
    const flechas = tactil ? 'la palanca (arrastra el círculo de abajo a la izquierda)' : 'las flechas ← ↑ ↓ → (o W A S D)';
    const usar = tactil ? 'el botón Usar' : 'la tecla E';
    return [
      { texto: `Camina con ${flechas}.`, pausa: true, hecho: (t) => t.recorrido > 1.2 },
      {
        texto: () => (panelAbierto ? `Elige qué hacer: ${tactil ? 'toca la opción' : 'pulsa 1 o haz clic en la opción'}.`
          : accion ? `Mira cómo lo hace. ${tactil ? 'Mantén Usar' : 'Mantén Espacio'} para adelantar.`
            : `${m} tiene hambre. Acércate a su plato rojo y pulsa ${usar}.`),
        hecho: () => S.f.perroComio && !accion,
      },
      { texto: 'Esta es la lista de lo que te pidió mamá. Cada cosa dice cuántos minutos toma.', pausa: true, foco: '#lista', boton: true },
      { texto: 'Este es el reloj del día. Nada te apura, pero el tiempo pasa: te da hambre y sueño. Si quieres ir al colegio, el bus pasa a las 07:50.', pausa: true, foco: '#tiempo', boton: true },
      { texto: 'Aquí ves cómo estás: energía, comida, salud, higiene y ánimo. Bajan solos con el tiempo; comer, dormir, bañarte y jugar los recuperan.', pausa: true, foco: '#hStats', boton: true },
      { texto: '¡Ya sabes jugar! Explora la casa, cuida a tu cachorro y decide tu día. Cuando sea de noche, ve a dormir a tu cama.', boton: '¡A jugar!' },
    ];
  }
  function iniciarTutorial() {
    tutorial = { pasos: pasosTutorial(), i: -1, recorrido: 0, ultima: P.root.position.clone() };
    $('#guia').hidden = false;
    avanzarTutorial();
  }
  function avanzarTutorial() {
    const t = tutorial;
    if (t.foco) $(t.foco).classList.remove('foco');
    t.i++;
    if (t.i >= t.pasos.length) { terminarTutorial(); return; }
    const p = t.pasos[t.i];
    t.pausa = !!p.pausa;
    t.foco = p.foco || null;
    if (t.foco) $(t.foco).classList.add('foco');
    $('#gPaso').textContent = t.i < t.pasos.length - 1 ? `Aprende a jugar · ${t.i + 1} de ${t.pasos.length - 1}` : 'Tutorial completo';
    $('#gTexto').textContent = typeof p.texto === 'function' ? p.texto() : p.texto;
    $('#gOk').hidden = !p.boton;
    $('#gOk').textContent = typeof p.boton === 'string' ? p.boton : 'Entendido';
    $('#guia').classList.remove('nuevo'); void $('#guia').offsetWidth; $('#guia').classList.add('nuevo');
    if (t.i > 0) Sonido.sfx('bien');
  }
  // también se cierra si el día avanza (por ejemplo, se fue el bus) antes de terminarlo
  function terminarTutorial() {
    if (!tutorial) return;
    if (tutorial.foco) $(tutorial.foco).classList.remove('foco');
    tutorial = null;
    $('#guia').hidden = true;
    window.Habitos.progreso.guardar({ tutorial: true });
  }
  function actualizarTutorial() {
    const t = tutorial, p = t.pasos[t.i];
    t.recorrido += P.root.position.distanceTo(t.ultima);
    t.ultima.copy(P.root.position);
    if (typeof p.texto === 'function') { const tx = p.texto(); if ($('#gTexto').textContent !== tx) $('#gTexto').textContent = tx; }
    if (p.hecho && p.hecho(t)) avanzarTutorial();
  }
  $('#gOk').addEventListener('click', () => { if (tutorial) avanzarTutorial(); });

  // ---------------------------------------------------------------- cinemáticas (historia)
  // Un guion es una lista de pasos: { t: 'decir' | 'mover' | 'anim' | 'mirar' | 'prop' | 'aparecer' | 'saltar' | 'sfx' | 'esperar' | 'titulo' | 'elegir', ... }
  let cine = null;
  function decorarCumple(E) {
    const sc = E.scene;
    [[-3.0, -3.2, '#de5546'], [-2.55, -3.25, '#f2c14e'], [1.75, -3.2, '#3d9bd4'], [2.3, -3.25, '#2aa876'], [-3.6, 0.4, '#8f73cf']].forEach(([x, z, c], i) => {
      const g = new THREE.Group(); g.position.set(x, 1.9 + (i % 2) * 0.2, z); sc.add(g);
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), mat(c)); b.scale.set(1, 1.2, 1); g.add(b);
      box(g, 0.01, 0.6, 0.01, '#f4f1ea', 0, -0.5, 0, { sombra: false });
      E.updates.push((dt, r) => { g.position.y = 1.9 + (i % 2) * 0.2 + Math.sin(r * 1.4 + i) * 0.05; });
    });
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
    const c = cv.getContext('2d');
    ['#de5546', '#f2c14e', '#3d9bd4', '#2aa876', '#8f73cf'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.moveTo(i * 104 + 4, 0); c.lineTo(i * 104 + 100, 0); c.lineTo(i * 104 + 52, 34); c.fill(); });
    c.fillStyle = '#1d2340'; c.font = 'bold 44px "Baloo 2", sans-serif'; c.textAlign = 'center'; c.fillText(`¡FELIZ CUMPLE, ${CFG.nombre.toUpperCase()}!`, 256, 84);
    const tx = new THREE.CanvasTexture(cv);
    const cartel = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.49), new THREE.MeshBasicMaterial({ map: tx, transparent: true }));
    cartel.position.set(-1.0, 2.28, -E.d / 2 + 0.03); sc.add(cartel);
    const lampara = new THREE.PointLight('#ffcf8a', 0.75, 9); lampara.position.set(0.3, 2.2, 0.8); sc.add(lampara);
  }
  function montarCine(o) {
    cine = { actores: { yo: P }, movs: new Map(), pend: new Set(), saltar: false, foco: null, dialogo: null, siguiente: null };
    S.fase = o.fase || 'prologo';
    construir(o.escena || 'dormitorio', null);
    P.cuerpo.rotation.x = 0; P.sentado = false;
    vestir(P, o.ropa || 'limpia'); ponerProp(P, null);
    P.root.position.set(o.yo[0], 0, o.yo[1]); P.root.rotation.y = P.rotObj = o.yo[2] || 0; P.anim = 'quieto';
    Object.entries(o.actores || {}).forEach(([id, a]) => {
      const A = a.tipo === 'perro' ? crearPerro(a.color) : a.tipo === 'abuela' ? crearAbuela() : a.tipo === 'papa' ? crearPapa() : crearMama();
      A.voz = a.tipo;
      A.root.position.set(a.pos[0], 0, a.pos[1]); A.root.rotation.y = A.rotObj = a.rot || 0;
      A.root.visible = !a.oculto;
      if (a.prop) ponerProp(A, a.prop);
      escena.scene.add(A.root); escena.npcs.push(A); cine.actores[id] = A;
    });
    if (o.cumple) decorarCumple(escena);
    $('#hud').hidden = true; $('#intro').hidden = true;
    $('#cine').hidden = false;
    camaraDirecta = true;
    Sonido.iniciar(); Sonido.musica(true);
  }
  function desmontarCine() {
    cine = null;
    $('#cine').hidden = true; $('#cineDialogo').hidden = true; $('#cineTitulo').hidden = true;
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* nada */ }
    S.fase = 'manana';
    construir('dormitorio', null);
    vestir(P, 'pijama'); ponerProp(P, null);
    acostar();
    camaraDirecta = true;
  }
  const fundido = (negro) => new Promise((res) => { $('#cineNegro').classList.toggle('on', negro); setTimeout(res, 650); });
  function esperaCine(seg) {
    return new Promise((res) => {
      const fin = () => { cine && cine.pend.delete(fin); res(); };
      cine.pend.add(fin);
      setTimeout(fin, seg * 1000);
    });
  }
  function cineDecir(A, quien, texto) {
    return new Promise((res) => {
      cine.foco = A;
      $('#cineQuien').textContent = quien;
      $('#cineQuien').dataset.quien = A === P ? 'yo' : A.voz;
      $('#cineTexto').textContent = texto;
      $('#cineOps').innerHTML = '';
      $('#cineSig').hidden = false;
      $('#cineDialogo').hidden = false;
      Sonido.hablar(texto, A === P ? 'yo' : A.voz);
      const fin = () => {
        if (!cine || cine.dialogo !== d) return;
        cine.dialogo = null; cine.siguiente = null; cine.pend.delete(fin);
        $('#cineDialogo').hidden = true;
        Sonido.sfx('click');
        res();
      };
      const d = { min: performance.now() + 1300 + texto.length * 55, extra: 1.1 };
      cine.dialogo = d; cine.siguiente = fin; cine.pend.add(fin);
    });
  }
  function cineElegir(opciones) {
    return new Promise((res) => {
      cine.foco = P;
      $('#cineQuien').textContent = CFG.nombre;
      $('#cineQuien').dataset.quien = 'yo';
      $('#cineTexto').textContent = '¿Qué respondes?';
      $('#cineSig').hidden = true;
      const cont = $('#cineOps');
      cont.innerHTML = opciones.map((o, i) => `<button class="op" type="button"><kbd>${i + 1}</kbd><span class="op-t"></span></button>`).join('');
      [...cont.children].forEach((b, i) => {
        b.querySelector('.op-t').textContent = opciones[i];
        b.addEventListener('click', () => fin(i));
      });
      $('#cineDialogo').hidden = false;
      const fin = (i) => {
        if (!cine || cine.dialogo !== d) return;
        cine.dialogo = null; cine.pend.delete(saltar);
        $('#cineDialogo').hidden = true;
        res(i);
      };
      const saltar = () => fin(0);
      const d = { ops: true };
      cine.dialogo = d; cine.pend.add(saltar);
    });
  }
  function cineTitulo(ey, texto, seg) {
    $('#cineTitEy').textContent = ey || '';
    $('#cineTitTx').textContent = texto;
    $('#cineTitulo').hidden = false;
    return esperaCine(seg).then(() => { $('#cineTitulo').hidden = true; });
  }
  function pasoCine(x) {
    const A = x.quien ? cine.actores[x.quien] : null;
    switch (x.t) {
      case 'titulo': return cineTitulo(x.eyebrow, x.texto, x.seg || 3);
      case 'decir': if (x.anim) { A.anim = x.anim; A.t = 0; } return cineDecir(A, x.nombre, x.texto).then(() => { if (x.anim && A.anim === x.anim) A.anim = 'quieto'; });
      case 'elegir': return cineElegir(x.opciones).then((i) => { cine.eleccion = i; return cine.saltar ? null : cineDecir(P, CFG.nombre, x.opciones[i]); });
      case 'mover': {
        const pr = new Promise((res) => cine.movs.set(A, { a: x.a, res }));
        return x.esperar === false ? null : pr;
      }
      case 'anim':
        A.anim = x.anim; A.t = 0;
        if (x.seg) setTimeout(() => { if (A.anim === x.anim) A.anim = 'quieto'; }, x.seg * 1000);
        return null;
      case 'mirar': { const B = cine.actores[x.a]; A.rotObj = Math.atan2(B.root.position.x - A.root.position.x, B.root.position.z - A.root.position.z); return null; }
      case 'prop': ponerProp(A, x.prop || null); return null;
      case 'aparecer': {
        A.root.visible = true;
        if (x.en) A.root.position.set(x.en[0], 0, x.en[1]);
        A.salto = 0.55;
        const q = A.root.position;
        for (let i = 0; i < 18; i++) emitir(new THREE.Vector3(q.x + (Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.5, q.z + (Math.random() - 0.5) * 0.6), ['#ffd23f', '#ffffff', '#ff9a3d'][i % 3], new THREE.Vector3((Math.random() - 0.5) * 1.2, 1.4, (Math.random() - 0.5) * 1.2), 0.9, 0.035, 2.2);
        return null;
      }
      case 'saltar': A.salto = 0.55; return null;
      case 'sfx': Sonido.sfx(x.n); return null;
      case 'esperar': return esperaCine(x.seg);
      default: return null;
    }
  }
  function actualizarCine(dt) {
    cine.movs.forEach((m, A) => {
      const dx = m.a[0] - A.root.position.x, dz = m.a[1] - A.root.position.z, d = Math.hypot(dx, dz);
      if (d < 0.04 || cine.saltar) { A.anim = 'quieto'; cine.movs.delete(A); m.res(); return; }
      const k = Math.min(1, (A.esPerro ? 2.0 : 1.25) * dt / d);
      A.root.position.x += dx * k; A.root.position.z += dz * k;
      A.rotObj = Math.atan2(dx, dz);
      if (A.anim !== 'caminar') A.anim = 'caminar';
      A.vel = 0.4;
    });
    Object.values(cine.actores).forEach((A) => {
      if (A.rotObj == null) return;
      let d = A.rotObj - A.root.rotation.y;
      while (d > PI) d -= 2 * PI;
      while (d < -PI) d += 2 * PI;
      A.root.rotation.y += d * Math.min(1, dt * 7);
    });
    // avanza solo cuando terminó de hablar (con voz) o pasó el tiempo de lectura
    const d = cine.dialogo;
    // si la voz del navegador se queda pegada, igual avanza después de unos segundos más
    if (d && !d.ops && performance.now() > d.min && (!Sonido.hablando() || performance.now() > d.min + 7000)) { d.extra -= dt; if (d.extra <= 0 && cine.siguiente) cine.siguiente(); }
  }
  async function correrCine(montaje, pasos) {
    await fundido(true);
    montarCine(montaje);
    await fundido(false);
    for (const x of pasos) {
      if (!cine || cine.saltar) break;
      const r = pasoCine(typeof x === 'function' ? x() : x);
      if (r) await r;
    }
    const eleccion = cine ? cine.eleccion : null;
    await fundido(true);
    desmontarCine();
    return eleccion;
  }
  $('#cineSig').addEventListener('click', () => { if (cine && cine.siguiente) cine.siguiente(); });
  $('#cineSaltar').addEventListener('click', () => {
    if (!cine) return;
    cine.saltar = true;
    [...cine.pend].forEach((f) => f());
    cine.movs.forEach((m) => m.res()); cine.movs.clear();
  });

  // ---------------------------------------------------------------- interfaz para módulos (perro.js, futbol.js…)
  // Cada módulo se registra con alConstruir / alActualizar / alTecla y usa las herramientas del motor.
  const ganchos = { construir: [], actualizar: [], tecla: [], evento: [] };
  const bloqueos = new Set();
  window.Habitos.motor.api = {
    THREE, PI, lerp, clamp, hora, NINO,
    S, P, CFG,
    get escena() { return escena; },
    get perfil() { return PERFIL; },
    get camara() { return camera; },
    get tactil() { return tactil; },
    get corriendo() { return corriendo(); },
    estado: () => ({ jugando, cargando, accion: !!accion, panel: !!panelAbierto, visita: !!visita, examen: !!examen, levantando: !!levantando, alarma: alarmaActiva, cine: !!cine, tutorial: !!tutorial, vitrina: !!vitrina, mamaHabla: mamaHabla(), fase: S.fase }),
    alConstruir: (f) => ganchos.construir.push(f),
    alActualizar: (f) => ganchos.actualizar.push(f),
    alTecla: (f) => ganchos.tecla.push(f),
    alEvento: (f) => ganchos.evento.push(f),
    evento,
    enfocar: (f) => { enfoque = f || null; },
    ritmo: (f) => { ritmoExtra = f || 1; },
    bloquear: (motivo, si) => { if (si) bloqueos.add(motivo); else bloqueos.delete(motivo); },
    box, cil, bola, mat, matB, crearPerro, crearPersona, crearMama, crearPapa, crearAbuela, ponerProp, vestir,
    moverEn, etiquetaInter, crearEtiquetas, refrescar, emitir, cabezaMundo,
    abrirPanel, cerrarPanel, hacer, decir, avisar, banner, flash, cambiar, habito, malHabito, anotar, meta, irA, visitaMama,
    sfx: (n) => Sonido.sfx(n), hablar: (t, q) => Sonido.hablar(t, q), bucle: (n) => Sonido.bucle(n),
  };

  // gancho solo para las pruebas automáticas (tests/)
  if (window.HABITOS_DEBUG) window.__T = { S, P, fin, irACasa, irA, visitaMama, dormir, get escondido() { return escondido; }, get flags() { return { cargando, panelAbierto, alarmaActiva, accion: !!accion, examen: !!examen, levantando: !!levantando, hablaEnComedor, jugando, cola: colaVisitas.length }; }, get escena() { return escena; }, get visita() { return visita; } };

  // ---------------------------------------------------------------- arranque
  construir('dormitorio', null);
  acostar();
  resize();
  requestAnimationFrame((t) => { ultimo = t; requestAnimationFrame(bucle); });
})();
