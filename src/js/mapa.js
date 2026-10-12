/* Minimapa de la casa: muestra los cuartos conectados y dónde estás.
   Se agranda con la tecla M o tocándolo. Lee la ubicación del motor (Habitos.motor.ubicacion). */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.nino || !H.motor.ubicacion) return;
  const motor = H.motor;

  // Plano de la casa (norte arriba; 1 unidad = 2 metros). Coinciden con las puertas de cada escena.
  const CUARTOS = {
    dormitorio: { x: 0, y: 0, w: 4, h: 3.5, nombre: 'Tu cuarto' },
    pasillo: { x: 4, y: 0.85, w: 6, h: 1.8, nombre: 'Pasillo' },
    bano: { x: 5.6, y: -2.5, w: 2.75, h: 2.5, nombre: 'Baño' },
    comedor: { x: 10, y: -0.25, w: 5, h: 4, nombre: 'Comedor' },
    sala: { x: 15, y: 0, w: 5, h: 3.5, nombre: 'Sala' },
    jardin: { x: 20, y: 0, w: 5, h: 3.5, nombre: 'Jardín', exterior: true },
    mirador: { x: 20.5, y: -3.6, w: 4, h: 3, nombre: 'Techo', techo: true },
  };
  // Tamaño real de cada escena en metros (ancho, fondo), para ubicar al cachorro aunque estés en otro cuarto
  const TAMANOS = { dormitorio: [8, 7], pasillo: [12, 3.6], bano: [5.5, 5], comedor: [10, 8], sala: [10, 7], jardin: [10, 7], mirador: [8, 6] };
  // Pasos entre cuartos (para dibujar las puertas)
  const PUERTAS = [[4, 1.75, 'v'], [6.7, 0.85, 'h'], [10, 1.75, 'v'], [15, 0.75, 'v'], [20, 2.45, 'v']];

  const caja = document.createElement('button');
  caja.type = 'button';
  caja.className = 'mapa';
  caja.id = 'mapa';
  caja.hidden = true;
  caja.setAttribute('aria-label', 'Mapa de la casa. Pulsa M para agrandarlo');
  caja.innerHTML = `<svg viewBox="-0.6 -4.2 26.2 8.3" aria-hidden="true">
    ${Object.entries(CUARTOS).map(([id, c]) => `<g class="m-cuarto${c.exterior ? ' ext' : ''}${c.techo ? ' techo' : ''}" data-id="${id}">
      <rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="0.25"/>
      <text x="${c.x + c.w / 2}" y="${c.y + c.h / 2 + 0.25}">${c.nombre}</text></g>`).join('')}
    ${PUERTAS.map(([x, y, o]) => (o === 'v' ? `<rect class="m-puerta" x="${x - 0.12}" y="${y - 0.35}" width="0.24" height="0.7"/>` : `<rect class="m-puerta" x="${x - 0.35}" y="${y - 0.12}" width="0.7" height="0.24"/>`)).join('')}
    <path class="m-escalera" d="M23.2 0.3 v-1.1 M23.7 0.3 v-1.1 M23.2 -0.1 h0.5 M23.2 -0.5 h0.5"/>
    <g class="m-salida"><path d="M14.3 -0.35 v-1.1 m-0.4 0.4 l0.4 -0.4 l0.4 0.4"/><text x="14.3" y="-1.8">Salida</text></g>
    <g class="m-perro" id="mPerro"><circle r="0.32"/></g>
    <g class="m-mama" id="mMama"><circle r="0.36"/></g>
    <g class="m-papa" id="mPapa"><circle r="0.36"/></g>
    <g class="m-yo" id="mYo"><circle r="0.42"/><path d="M0 -0.85 L0.32 -0.3 L-0.32 -0.3 Z"/></g>
  </svg><span class="m-ayuda">M · mapa</span>`;
  document.body.appendChild(caja);
  // en tablet y celular el mapa chico no cabe: un botón redondo lo abre en grande
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'b-mapa';
  boton.hidden = true;
  boton.setAttribute('aria-label', 'Ver el mapa de la casa');
  boton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/></svg><span>Mapa</span>';
  document.body.appendChild(boton);

  const yo = caja.querySelector('#mYo'), perro = caja.querySelector('#mPerro');
  const papas = { mama: caja.querySelector('#mMama'), papa: caja.querySelector('#mPapa') };
  const grupos = [...caja.querySelectorAll('.m-cuarto')];
  let actual = null;

  function alternar() { caja.classList.toggle('grande'); caja.blur(); }
  caja.addEventListener('click', alternar);
  boton.addEventListener('click', alternar);
  // el mapa no se queda con el foco: Espacio y Enter siguen siendo del juego
  caja.addEventListener('mousedown', (e) => e.preventDefault());
  caja.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'Enter') e.preventDefault(); });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyM' || caja.hidden || (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName))) return;
    alternar();
  });

  function cuadro() {
    const u = motor.ubicacion();
    const c = u && CUARTOS[u.lugar];
    const ver = !!(u && c && u.hud && !u.cargando);
    if (caja.hidden === ver) { caja.hidden = !ver; boton.hidden = !ver; }
    if (ver) {
      if (actual !== u.lugar) {
        actual = u.lugar;
        grupos.forEach((g) => g.classList.toggle('aqui', g.dataset.id === u.lugar));
      }
      const x = c.x + (u.x / u.w + 0.5) * c.w, y = c.y + (u.z / u.d + 0.5) * c.h;
      yo.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(180 - u.rot * 180 / Math.PI).toFixed(0)})`);
      // dónde está el cachorro (perro.js)
      const pu = H.perro && H.perro.ubicacion();
      const cp = pu && CUARTOS[pu.lugar], dims = pu && TAMANOS[pu.lugar];
      perro.style.display = cp && dims ? '' : 'none';
      // dónde están papá y mamá (rutinas.js)
      const us = H.rutinas ? H.rutinas.ubicaciones() : [];
      ['mama', 'papa'].forEach((q) => {
        const u2 = us.find((x) => x.quien === q), c2 = u2 && CUARTOS[u2.lugar], t2 = u2 && TAMANOS[u2.lugar];
        papas[q].style.display = c2 && t2 ? '' : 'none';
        if (c2 && t2) papas[q].setAttribute('transform', `translate(${(c2.x + (u2.x / t2[0] + 0.5) * c2.w).toFixed(2)} ${(c2.y + (u2.z / t2[1] + 0.5) * c2.h).toFixed(2)})`);
      });
      if (cp && dims) perro.setAttribute('transform', `translate(${(cp.x + (pu.x / dims[0] + 0.5) * cp.w).toFixed(2)} ${(cp.y + (pu.z / dims[1] + 0.5) * cp.h).toFixed(2)})`);
    }
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
})();
