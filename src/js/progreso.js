/* Progreso de la partida: capítulo, día, si ya se vio la historia y las páginas del diario.
   Se guarda en localStorage, separado del perfil del personaje. */
(function () {
  'use strict';

  const CLAVE = 'habitos-progreso-v1';
  const BASE = { capitulo: 1, dia: 1, prologo: false, tutorial: false, diario: [] };
  const DIAS = 7;            // días del trato con papá
  const PARA_GANAR = 14;     // (histórico) ya no decide nada: la cachorrita SIEMPRE se queda; las estrellas desbloquean premios

  // Metas de cada día del capítulo 1: [id, texto]
  const esFinde = (dia) => (dia - 1) % 7 >= 5;   // días 6 y 7: sábado y domingo
  // la semana: cada día trae su sorpresa (ver src/js/dia2.js … dia7.js); {m} = nombre de la cachorrita
  const SEMANA = [
    { nombre: 'Lunes', sorpresa: 'Tu primer día con {m}: aprende a cuidarla.' },
    { nombre: 'Martes', sorpresa: 'Llega un compañero nuevo al colegio. ¿Te harás su amigo?' },
    { nombre: 'Miércoles', sorpresa: 'En la tarde a {m} le toca su vacuna en la veterinaria.' },
    { nombre: 'Jueves', sorpresa: 'Va a llover todo el día… y en la noche se va la luz.' },
    { nombre: 'Viernes', sorpresa: '¡Feria del colegio! Presentas el trabajo que preparaste en casa.' },
    { nombre: 'Sábado', sorpresa: 'Papá quiere llevarte al parque con {m}.' },
    { nombre: 'Domingo', sorpresa: 'La abuela viene a almorzar y lee tu diario de la semana.' },
  ];
  const semana = (dia, m) => { const d = SEMANA[(dia - 1) % 7]; return { nombre: d.nombre, sorpresa: d.sorpresa.split('{m}').join(m || 'tu cachorrita') }; };
  function metas(perfil, dia) {
    const m = perfil && perfil.mascota ? perfil.mascota.nombre : 'tu cachorro';
    if (dia && esFinde(dia)) return [
      ['perro', `Darle de comer a ${m}`],
      ['ayudar', 'Ayudar a mamá regando las plantas'],
      ['jugar', `Jugar fútbol con ${m}`],
      ['comer', 'Comer tres veces: desayuno, almuerzo y cena'],
      ['dormir', 'Dormir a buena hora (antes de las 22:00)'],
    ];
    return [
      ['perro', `Darle de comer a ${m}`],
      ['colegio', 'Ir al colegio (el bus pasa a las 07:50)'],
      ['comer', 'Comer tres veces: desayuno, almuerzo y cena'],
      ['cuarto', 'Dejar tu cuarto ordenado'],
      ['dormir', 'Dormir a buena hora (antes de las 22:00)'],
    ];
  }
  // 4 o 5 metas: 3 estrellas · 3 metas: 2 · 2 metas: 1 · menos: 0
  const estrellasDe = (cumplidas) => (cumplidas >= 4 ? 3 : cumplidas === 3 ? 2 : cumplidas === 2 ? 1 : 0);

  function cargar() {
    try {
      const p = JSON.parse(localStorage.getItem(CLAVE)) || {};
      // se conservan también los demás datos guardados (vínculo, álbum, logros, crecer…)
      return Object.assign({}, p, {
        capitulo: Number.isInteger(p.capitulo) && p.capitulo > 0 ? p.capitulo : BASE.capitulo,
        dia: Number.isInteger(p.dia) && p.dia > 0 ? p.dia : BASE.dia,
        prologo: p.prologo === true,
        tutorial: p.tutorial === true,
        diario: Array.isArray(p.diario) ? p.diario : [],
      });
    } catch (e) { return JSON.parse(JSON.stringify(BASE)); }
  }
  function guardar(cambios) {
    const p = Object.assign(cargar(), cambios);
    try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch (e) { /* sin almacenamiento: vale solo esta partida */ }
    return p;
  }
  function reiniciar() {
    try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ }
    return cargar();
  }

  // Guarda el día terminado en el diario y avanza al siguiente
  function terminarDia(dia, estrellas, logradas) {
    const p = cargar();
    const diario = p.diario.filter((d) => d.dia !== dia).concat([{ dia, estrellas, metas: logradas }]).sort((a, b) => a.dia - b.dia);
    return guardar({ diario, dia: dia + 1 });
  }
  function totalEstrellas(p) { return (p || cargar()).diario.reduce((t, d) => t + (d.estrellas || 0), 0); }
  // estrellas de todas las semanas (las de semanas pasadas se guardan al empezar otra semana)
  function estrellasAcumuladas(p) { p = p || cargar(); return (p.estrellasPrevias || 0) + totalEstrellas(p); }
  function repetirSemana() { return guardar({ dia: 1, diario: [], estrellasPrevias: estrellasAcumuladas(), premiosSemana: [] }); }
  // fecha local del día (AAAA-MM-DD) y días entre dos fechas
  const hoyISO = (d) => { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function diasEntre(a, b) {
    const t = (s) => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); };
    if (!a || !b) return 0;
    const n = Math.round((t(b) - t(a)) / 864e5);
    return Number.isFinite(n) ? n : 0;
  }

  // ---------- premios de la cachorrita: se desbloquean con las estrellas acumuladas (o de regalo)
  // estrellas = cuántas estrellas acumuladas lo desbloquean (null = solo de regalo)
  const PREMIOS = [
    { id: 'truco-patita', nombre: 'Truco: dar la patita', tipo: 'truco', estrellas: 3 },
    { id: 'collar-rojo', nombre: 'Collar rojo', tipo: 'collar', color: '#de5546', estrellas: 5 },
    { id: 'panuelo', nombre: 'Pañuelo de colores', tipo: 'ropa', estrellas: 8 },
    { id: 'truco-saludar', nombre: 'Truco: saludar', tipo: 'truco', estrellas: 10 },
    { id: 'collar-celeste', nombre: 'Collar celeste', tipo: 'collar', color: '#7cc6f2', estrellas: 13 },
    { id: 'casita-linda', nombre: 'Casita más linda', tipo: 'casita', estrellas: 16 },
    { id: 'truco-rodar', nombre: 'Truco: rodar', tipo: 'truco', estrellas: 19 },
    { id: 'gorrito', nombre: 'Gorrito', tipo: 'ropa', estrellas: 23 },
    { id: 'collar-estrellas', nombre: 'Collar con estrellas', tipo: 'collar', color: '#3f5bd1', estrellas: 27 },
    { id: 'banderines', nombre: 'Banderines para su casita', tipo: 'decoracion', estrellas: 32 },
  ];
  const oyentes = [];
  const tienePremio = (id) => !!(cargar().premios || {})[id];
  function darPremio(id, origen) {
    const def = PREMIOS.find((x) => x.id === id);
    if (!def || tienePremio(id)) return false;
    const p = cargar();
    const premios = Object.assign({}, p.premios || {}, { [id]: true });
    const semana = (Array.isArray(p.premiosSemana) ? p.premiosSemana : []).concat([id]);
    guardar({ premios, premiosSemana: semana });
    const info = Object.assign({}, def, { tiene: true });
    oyentes.forEach((fn) => { try { fn(info, origen || ''); } catch (e) { console.warn('premios.alGanar', e); } });
    return true;
  }
  // da los premios que ya alcanzan las estrellas acumuladas; devuelve los nuevos
  function revisarPremios(extra) {
    const total = estrellasAcumuladas() + (extra || 0);
    return PREMIOS.filter((x) => x.estrellas != null && x.estrellas <= total && !tienePremio(x.id) && darPremio(x.id, 'estrellas'))
      .map((x) => Object.assign({}, x, { tiene: true }));
  }
  const premios = {
    lista: () => { const t = cargar().premios || {}; return PREMIOS.map((x) => Object.assign({}, x, { tiene: !!t[x.id] })); },
    tiene: tienePremio,
    dar: darPremio,
    alGanar: (fn) => { if (typeof fn === 'function') oyentes.push(fn); },
    revisar: revisarPremios,
    // el próximo premio que se gana con estrellas (o null)
    siguiente: (extra) => { const total = estrellasAcumuladas() + (extra || 0); const x = PREMIOS.find((q) => q.estrellas != null && !tienePremio(q.id) && q.estrellas > total); return x ? Object.assign({ faltan: x.estrellas - total }, x) : null; },
    deLaSemana: () => { const p = cargar(), s = Array.isArray(p.premiosSemana) ? p.premiosSemana : []; return PREMIOS.filter((x) => s.includes(x.id)).map((x) => Object.assign({}, x, { tiene: true })); },
  };

  window.Habitos = Object.assign(window.Habitos || {}, {
    progreso: { cargar, guardar, reiniciar, metas, esFinde, semana, estrellasDe, terminarDia, totalEstrellas, estrellasAcumuladas, repetirSemana, hoyISO, diasEntre, DIAS, PARA_GANAR },
    premios,
  });
})();
