/* Crecer: para pasar de los 7 a los 9 años necesitas llenar dos barras.
   - Conocimiento: ir al colegio, el examen, la tarea, estudiar en el escritorio, leer.
   - Responsabilidad: cuidar a tu cachorro, ordenar tu cuarto, ayudar en casa, decir la verdad, dormir a buena hora.
   Cuando las dos están llenas, al día siguiente es tu cumpleaños: tienes 9 años, eres más alto
   y el colegio te pone desafíos nuevos (multiplicar). Todo se guarda entre días. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.motor.nino || !H.progreso || !H.perfil) return;
  const A = H.motor.api;
  const $ = (s) => document.querySelector(s);
  const META = 100;
  const NOMBRES = { conocimiento: 'Conocimiento', responsabilidad: 'Responsabilidad' };

  const pr0 = H.progreso.cargar();
  const G = { conocimiento: pr0.conocimiento || 0, responsabilidad: pr0.responsabilidad || 0 };
  const edad = () => (A.perfil && A.perfil.edad) || 7;
  const siguiente = () => (edad() >= 9 ? 12 : 9);
  const listo = () => G.conocimiento >= META && G.responsabilidad >= META;
  let hoy = { plato: false };

  function sumar(tipo, n, motivo) {
    if (!n) return;
    const antes = G[tipo];
    G[tipo] = Math.max(0, Math.min(META, G[tipo] + n));
    if (G[tipo] === antes) return;
    H.progreso.guardar({ conocimiento: Math.round(G.conocimiento), responsabilidad: Math.round(G.responsabilidad) });
    if (n > 0) A.avisar(`+${n} ${NOMBRES[tipo]}${motivo ? `: ${motivo}` : ''}`, 'bien');
    pintar();
    if (listo() && !H.progreso.cargar().listoParaCrecer) {
      H.progreso.guardar({ listoParaCrecer: true });
      setTimeout(() => { A.banner('bien', '¡Ya estás listo para crecer!', `Mañana cumples ${siguiente()} años`, 'Llenaste el conocimiento y la responsabilidad'); A.sfx('logro'); }, 1200);
    }
  }

  // ---------- lo que te hace crecer
  A.alEvento((tipo, d) => {
    if (tipo === 'accion' && d.it) {
      const n = d.it.nombre, t = (d.op && d.op.texto) || '';
      if (n === 'Cama' && /Tender/.test(t)) sumar('responsabilidad', 2, 'tendiste tu cama');
      else if (n === 'Juguetes') sumar('responsabilidad', 2, 'guardaste tus juguetes');
      else if (n === 'Ropa sucia') sumar('responsabilidad', 1, 'ropa al cesto');
      else if (n === 'Zapatos') sumar('responsabilidad', 1, 'zapatos ordenados');
      else if (/^Plato de /.test(n) && !hoy.plato) { hoy.plato = true; sumar('responsabilidad', 3, 'cuidaste a tu cachorro'); }
      else if (n === 'Plantas') sumar('responsabilidad', 3, 'ayudaste en casa');
      else if (n === 'Casita del perro' && /Limpiar/.test(t)) sumar('responsabilidad', 2, 'limpiaste su casita');
      else if (n === 'Libros') sumar('conocimiento', 3, 'leíste un cuento');
    }
    if (tipo === 'colegio') sumar('conocimiento', 5, 'fuiste al colegio');
    if (tipo === 'examen') sumar('conocimiento', Math.round(d.nota * 0.6), `examen (${d.nota} de 20)`);
    if (tipo === 'tarea') sumar('conocimiento', 3 + d.primera * 2, 'hiciste la tarea');
    // colegio.js: cada clase y la revisión de la tarea (si no la hiciste, igual aprendes un poquito)
    if (tipo === 'clase') sumar('conocimiento', 2 + (d.aciertos || 0), `clase de ${d.titulo || 'hoy'}`);
    if (tipo === 'tareaRevisada') sumar('conocimiento', d.ok ? 3 : 1, d.ok ? 'la profe revisó tu tarea' : 'repasaste con la profe');
    if (tipo === 'estudio') sumar('conocimiento', 2 + d.primera + (d.conPerro ? 2 : 0), d.conPerro ? 'estudiaste con tu cachorro' : 'estudiaste en casa');
    if (tipo === 'habito') {
      if (d === 'Decir la verdad y hacerte cargo') sumar('responsabilidad', 3, 'dijiste la verdad');
      if (d === 'Dormir a buena hora') sumar('responsabilidad', 2, 'dormiste a buena hora');
      if (d === 'Cenar en familia') sumar('responsabilidad', 1);
    }
    if (tipo === 'malHabito') {
      if (d === 'Faltar al colegio') sumar('responsabilidad', -3);
      if (d === 'Desvelarse') sumar('responsabilidad', -2);
    }
    if (tipo === 'finDia') {
      if (d.logradas) sumar('responsabilidad', d.logradas, 'metas del día');
      // en el resumen del día se ve cuánto te falta para crecer
      setTimeout(() => {
        const hoja = $('#resumen .hoja');
        if (!hoja) return;
        let caja = $('#rCrecer');
        if (!caja) { caja = document.createElement('section'); caja.id = 'rCrecer'; caja.className = 'cr-crecer'; const ref = $('#rStats'); hoja.insertBefore(caja, ref); }
        caja.innerHTML = bloque();
      }, 60);
    }
  });

  // ---------- cómo se ve
  const barra = (k) => `<div class="cc-barra"><span>${NOMBRES[k]}</span><i><b style="width:${G[k]}%"></b></i><em>${Math.round(G[k])}/${META}</em></div>`;
  function bloque() {
    return `<h3>Para crecer a los ${siguiente()} años</h3>${barra('conocimiento')}${barra('responsabilidad')}`
      + `<p>${listo() ? `<b>¡Listo! Mañana cumples ${siguiente()} años.</b>` : 'El colegio, la tarea y leer te dan conocimiento. Cuidar a tu cachorro, ordenar y ayudar te dan responsabilidad.'}</p>`;
  }
  document.body.insertAdjacentHTML('beforeend', `<aside class="crecer-hud" id="crecerHud" hidden aria-label="Para crecer"></aside>`);
  function pintar() {
    $('#crecerHud').innerHTML = `<b>${edad()} años → ${siguiente()}</b>${barra('conocimiento')}${barra('responsabilidad')}`;
  }
  setInterval(() => { const ver = A.estado().jugando && !$('#hud').hidden; if ($('#crecerHud').hidden === ver) $('#crecerHud').hidden = !ver; }, 400);
  pintar();

  // ---------- el cumpleaños: se ve en la tarjeta del capítulo al empezar el día
  function pintarEnCapitulo(cont) {
    let caja = cont.querySelector('.cr-crecer');
    if (!caja) { caja = document.createElement('section'); caja.className = 'cr-crecer'; cont.insertBefore(caja, cont.querySelector('#capHoy')); }
    caja.innerHTML = bloque();
  }
  function cumplir() {
    const pr = H.progreso.cargar();
    if (!pr.listoParaCrecer) return null;
    const p = H.perfil.cargar(), nueva = siguiente();
    H.perfil.guardar(Object.assign({}, p, { edad: nueva }));
    H.progreso.guardar({ listoParaCrecer: false, conocimiento: 0, responsabilidad: 0, capitulo: (pr.capitulo || 1) + 1 });
    G.conocimiento = 0; G.responsabilidad = 0;
    pintar();
    return nueva;
  }

  H.crecer = {
    sumar, pintarEnCapitulo, cumplir,
    get conocimiento() { return G.conocimiento; }, get responsabilidad() { return G.responsabilidad; }, get listo() { return listo(); },
  };
})();
