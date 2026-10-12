/* Creador de personaje: pantalla con pestañas para elegir nombre, apariencia, ropa, mundo y mascota.
   Muestra al personaje en 3D (modo vitrina del motor) y guarda el perfil con Habitos.perfil. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.perfil || !H.motor || !H.motor.nino) return;
  const { OPCIONES, NOMBRES } = H.perfil;
  const motor = H.motor;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let p = H.perfil.cargar();
  let pestana = 'tu';
  let ropaVista = 'limpia';

  const PESTANAS = [['tu', 'Tú'], ['look', 'Apariencia'], ['ropa', 'Ropa'], ['mundo', 'Mundo'], ['mascota', 'Mascota']];
  const NOMBRE_COLOR = {
    piel: 'Tono de piel', pelo: 'Color de pelo', ojos: 'Color de ojos', pijama: 'Color del pijama',
    zapatillas: 'Color de zapatillas', accColor: 'Color del accesorio',
  };

  document.body.insertAdjacentHTML('beforeend', `
<div class="creador" id="creador" hidden>
  <div class="cr-girar" id="crGirar"><span class="cr-placa" id="crPlaca"></span><small>Arrastra para girar</small></div>
  <section class="cr-panel" aria-labelledby="crTitulo">
    <header class="cr-cab">
      <p class="eyebrow">Capítulo 1 · 7 años</p>
      <h1 id="crTitulo">Crea tu personaje</h1>
    </header>
    <nav class="cr-tabs" role="tablist" aria-label="Partes del personaje">
      ${PESTANAS.map(([k, t]) => `<button type="button" role="tab" data-tab="${k}" aria-controls="crCuerpo">${t}</button>`).join('')}
    </nav>
    <div class="cr-cuerpo" id="crCuerpo" role="tabpanel"></div>
    <footer class="cr-pie">
      <button class="btn sec" type="button" id="crAzar">Al azar</button>
      <button class="btn" type="button" id="crListo">¡Listo!</button>
    </footer>
  </section>
</div>`);

  const raiz = $('#creador'), cuerpo = $('#crCuerpo');

  // ---------- controles
  function colores(clave, lista, sel) {
    return `<div class="cr-campo"><span class="cr-etq">${NOMBRE_COLOR[clave] || clave}</span>
      <div class="cr-colores" role="radiogroup" aria-label="${NOMBRE_COLOR[clave] || clave}">
        ${lista.map((c) => `<button type="button" class="cr-color" role="radio" aria-checked="${c === sel}" aria-label="${c}" data-k="${clave}" data-v="${c}" style="--c:${c}"></button>`).join('')}
      </div></div>`;
  }
  function opciones(clave, etq, lista, sel, ruta) {
    return `<div class="cr-campo"><span class="cr-etq">${etq}</span>
      <div class="cr-ops" role="radiogroup" aria-label="${etq}">
        ${lista.map(([v, t]) => `<button type="button" class="cr-op" role="radio" aria-checked="${v === sel}" data-k="${ruta || clave}" data-v="${v}">${t}</button>`).join('')}
      </div></div>`;
  }
  function tarjetas(clave, etq, lista, sel) {
    return `<div class="cr-campo"><span class="cr-etq">${etq}</span>
      <div class="cr-tarjetas" role="radiogroup" aria-label="${etq}">
        ${lista.map(([v, t, d]) => `<button type="button" class="cr-tarjeta" role="radio" aria-checked="${v === sel}" data-k="${clave}" data-v="${v}"><b>${t}</b><span>${d}</span></button>`).join('')}
      </div></div>`;
  }
  function perroSvg(color) {
    const claro = color === '#f1ece2';
    const oreja = claro ? '#c98a4b' : color === '#2b2420' ? '#4a3d35' : '#5b4636';
    return `<svg viewBox="0 0 120 90" class="cr-perro" aria-hidden="true">
      <ellipse cx="62" cy="58" rx="34" ry="18" fill="${color}" stroke="#1d2340" stroke-width="2.5"/>
      <rect x="36" y="64" width="9" height="20" rx="4" fill="${color}" stroke="#1d2340" stroke-width="2.5"/>
      <rect x="78" y="64" width="9" height="20" rx="4" fill="${color}" stroke="#1d2340" stroke-width="2.5"/>
      <path d="M95 52 q16 -14 12 -26" fill="none" stroke="#1d2340" stroke-width="6" stroke-linecap="round"/>
      <path d="M95 52 q16 -14 12 -26" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="30" cy="38" r="19" fill="${color}" stroke="#1d2340" stroke-width="2.5"/>
      <ellipse cx="17" cy="34" rx="7" ry="13" fill="${oreja}" stroke="#1d2340" stroke-width="2.5" transform="rotate(20 17 34)"/>
      <ellipse cx="18" cy="46" rx="9" ry="6" fill="${claro ? '#fff' : '#f1ece2'}" stroke="#1d2340" stroke-width="2"/>
      <circle cx="12" cy="44" r="3" fill="#1d2340"/><circle cx="29" cy="34" r="2.6" fill="#1d2340"/>
      ${claro ? '<circle cx="66" cy="52" r="8" fill="#c98a4b"/>' : ''}
    </svg>`;
  }

  function pintar() {
    raiz.querySelectorAll('.cr-tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === pestana));
    let h = '';
    if (pestana === 'tu') {
      h = `<label class="cr-campo"><span class="cr-etq">Nombre</span>
          <span class="cr-nombre"><input id="crNombre" maxlength="14" autocomplete="off" spellcheck="false" value="${esc(p.nombre)}"><button type="button" class="cr-dado" id="crDado" aria-label="Nombre al azar">⟳</button></span></label>
        ${opciones('genero', 'Soy', OPCIONES.genero, p.genero)}
        <div class="cr-campo"><span class="cr-etq">Edad</span><p class="cr-nota"><b>7 años.</b> Si cuidas tus cosas y a tu cachorro, crecerás: a los 9, 12 y 15 años se desbloquean nuevas responsabilidades, permisos y mascotas.</p></div>`;
    } else if (pestana === 'look') {
      h = colores('piel', OPCIONES.piel, p.piel)
        + opciones('peinado', 'Peinado', OPCIONES.peinado, p.peinado)
        + colores('pelo', OPCIONES.pelo, p.pelo)
        + colores('ojos', OPCIONES.ojos, p.ojos)
        + opciones('contextura', 'Contextura', OPCIONES.contextura, p.contextura)
        + opciones('estatura', 'Estatura', OPCIONES.estatura, p.estatura);
    } else if (pestana === 'ropa') {
      h = opciones('vista', 'Ver', [['limpia', 'Uniforme'], ['pijama', 'Pijama']], ropaVista, 'vista')
        + colores('pijama', OPCIONES.pijama, p.pijama)
        + colores('zapatillas', OPCIONES.zapatillas, p.zapatillas)
        + opciones('accesorio', 'Accesorio', OPCIONES.accesorio, p.accesorio)
        + (p.accesorio !== 'ninguno' ? colores('accColor', OPCIONES.accColor, p.accColor) : '');
    } else if (pestana === 'mundo') {
      h = tarjetas('estacion', 'Estación', OPCIONES.estacion, p.estacion)
        + tarjetas('clima', 'Clima', OPCIONES.clima, p.clima)
        + '<p class="cr-nota">Más adelante podrás elegir tu tipo de casa y tu familia.</p>';
    } else if (pestana === 'mascota') {
      h = `<div class="cr-mascota">${perroSvg(p.mascota.color)}<p class="cr-nota">La abuela te regala un cachorro al cumplir 7 años. Si lo cuidas bien, se queda contigo y aprende lo que le enseñes.</p></div>
        <label class="cr-campo"><span class="cr-etq">Nombre del cachorro</span>
          <span class="cr-nombre"><input id="crMascota" maxlength="14" autocomplete="off" spellcheck="false" value="${esc(p.mascota.nombre)}"></span></label>
        ${opciones('mcolor', 'Color', OPCIONES.mascotaColor, p.mascota.color, 'mascota.color')}
        <div class="cr-campo"><span class="cr-etq">Tipo</span><div class="cr-ops"><button type="button" class="cr-op" aria-checked="true" role="radio">Perro</button><button type="button" class="cr-op bloq" disabled title="Se desbloquea a los 9 años">Gato · 9 años</button></div></div>`;
    }
    cuerpo.innerHTML = h;
    $('#crPlaca').textContent = `${p.nombre} · 7 años`;
    const n = $('#crNombre');
    if (n) {
      n.addEventListener('input', () => { p.nombre = n.value; aplicar(); });
      $('#crDado').addEventListener('click', () => {
        const lista = NOMBRES[p.genero].filter((x) => x !== p.nombre);
        p.nombre = lista[Math.floor(Math.random() * lista.length)];
        n.value = p.nombre; aplicar(); motor.sfx('click');
      });
    }
    const m = $('#crMascota');
    if (m) m.addEventListener('input', () => { p.mascota.nombre = m.value; });
  }

  function aplicar(brillo) {
    const limpio = H.perfil.sanear(p);
    if (p.nombre.trim()) $('#crPlaca').textContent = `${limpio.nombre} · 7 años`;
    motor.aplicarPerfil(limpio, { ropa: pestana === 'ropa' ? ropaVista : 'limpia', brillo });
  }

  cuerpo.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    const k = b.dataset.k, v = b.dataset.v;
    if (k === 'vista') ropaVista = v;
    else if (k === 'mascota.color') p.mascota.color = v;
    else {
      // al cambiar de género, cambia también el nombre si todavía es uno de los sugeridos
      if (k === 'genero' && v !== p.genero) {
        if (NOMBRES[p.genero].includes(p.nombre) || !p.nombre.trim()) p.nombre = NOMBRES[v][0];
        if (v === 'nina' && (p.peinado === 'corto' || p.peinado === 'rapado')) p.peinado = 'largo';
        if (v === 'nino' && (p.peinado === 'coletas' || p.peinado === 'largo')) p.peinado = 'corto';
      }
      p[k] = v;
    }
    motor.sfx('click');
    aplicar(k !== 'vista');
    if (k === 'genero') motor.saludar();
    pintar();
    const igual = cuerpo.querySelector(`[data-k="${k}"][data-v="${v}"]`);
    if (igual) igual.focus();
  });

  raiz.querySelector('.cr-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b || b.dataset.tab === pestana) return;
    pestana = b.dataset.tab;
    motor.sfx('click');
    aplicar();
    pintar();
  });
  // flechas para cambiar de pestaña
  raiz.querySelector('.cr-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = PESTANAS.findIndex(([k]) => k === pestana);
    pestana = PESTANAS[(i + (e.key === 'ArrowRight' ? 1 : PESTANAS.length - 1)) % PESTANAS.length][0];
    aplicar(); pintar();
    raiz.querySelector(`[data-tab="${pestana}"]`).focus();
  });

  $('#crAzar').addEventListener('click', () => {
    p = H.perfil.alAzar(p);
    motor.sfx('sube');
    aplicar(true);
    motor.saludar();
    pintar();
  });

  $('#crListo').addEventListener('click', () => {
    if (!p.nombre.trim()) { pestana = 'tu'; pintar(); $('#crNombre').focus(); return; }
    p = H.perfil.guardar(p);
    motor.aplicarPerfil(p, { ropa: 'limpia' });
    motor.sfx('logro');
    cerrar();
  });

  // ---------- girar arrastrando
  const zona = $('#crGirar');
  let arrastre = null;
  zona.addEventListener('pointerdown', (e) => { arrastre = e.clientX; zona.setPointerCapture(e.pointerId); });
  zona.addEventListener('pointermove', (e) => { if (arrastre == null) return; motor.girar((e.clientX - arrastre) * 0.012); arrastre = e.clientX; });
  ['pointerup', 'pointercancel'].forEach((ev) => zona.addEventListener(ev, () => { arrastre = null; }));

  // ---------- abrir y cerrar
  function abrir() {
    p = H.perfil.cargar();
    pestana = 'tu';
    $('#intro').hidden = true;
    raiz.hidden = false;
    motor.vitrina(true, 'limpia');
    aplicar();
    pintar();
  }
  function cerrar() {
    raiz.hidden = true;
    motor.vitrina(false);
    if (H.alCerrarCreador) { H.alCerrarCreador(); return; }
    $('#intro').hidden = false;
    $('#bEmpezar').focus();
  }

  const editar = $('#bEditar');
  if (editar) editar.addEventListener('click', abrir);
  // primera vez: empieza creando el personaje
  if (!H.perfil.cargar().creado) abrir();

  H.creador = { abrir, cerrar };
})();
