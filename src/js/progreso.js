/* Progreso de la partida: capítulo, día, si ya se vio la historia y las páginas del diario.
   Se guarda en localStorage, separado del perfil del personaje. */
(function () {
  'use strict';

  const CLAVE = 'habitos-progreso-v1';
  const BASE = { capitulo: 1, dia: 1, prologo: false, tutorial: false, diario: [] };
  const DIAS = 7;            // días del trato con papá
  const PARA_GANAR = 14;     // estrellas (de 21) para que el cachorro se quede

  // Metas de cada día del capítulo 1: [id, texto]
  const esFinde = (dia) => (dia - 1) % 7 >= 5;   // días 6 y 7: sábado y domingo
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
  function repetirSemana() { return guardar({ dia: 1, diario: [] }); }

  window.Habitos = Object.assign(window.Habitos || {}, {
    progreso: { cargar, guardar, reiniciar, metas, esFinde, estrellasDe, terminarDia, totalEstrellas, repetirSemana, DIAS, PARA_GANAR },
  });
})();
