/* Historia del capítulo 1: la noche del cumpleaños, la abuela regala el cachorro y el diario,
   y papá propone el trato. Después muestra la tarjeta del capítulo con el diario y las metas del día. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.nino || !H.perfil || !H.progreso) return;
  const { motor, perfil, progreso } = H;
  const $ = (s) => document.querySelector(s);
  const PI = Math.PI;
  const DIAS = progreso.DIAS;

  // ---------- guion de la noche del cumpleaños
  function guion(p) {
    const n = p.nombre, m = p.mascota.nombre;
    const g = (o, a) => (p.genero === 'nina' ? a : o);
    return {
      montaje: {
        yo: [0.5, 1.55, -PI / 2],
        cumple: true,
        actores: {
          mama: { tipo: 'mama', pos: [-1.0, 1.15], rot: PI / 2 },
          papa: { tipo: 'papa', pos: [-0.3, 0.1], rot: PI / 2 },
          abuela: { tipo: 'abuela', pos: [3.7, 1.9], rot: -PI / 2, prop: 'regalo' },
          perro: { tipo: 'perro', color: p.mascota.color, pos: [1.15, 1.95], oculto: true },
        },
      },
      pasos: [
        { t: 'mirar', quien: 'mama', a: 'yo' },
        { t: 'mirar', quien: 'papa', a: 'yo' },
        { t: 'titulo', eyebrow: 'Prólogo', texto: `La noche del cumpleaños de ${n}`, seg: 3 },
        { t: 'decir', quien: 'mama', nombre: 'Mamá', texto: `¡Feliz cumpleaños, ${n}! ¡Ya tienes siete años!`, anim: 'aplaudir' },
        { t: 'decir', quien: 'papa', nombre: 'Papá', texto: `Siete años… ¡ya ${g('eres un niño grande', 'eres una niña grande')}!`, anim: 'aplaudir' },
        { t: 'sfx', n: 'puerta' },
        { t: 'esperar', seg: 0.5 },
        { t: 'decir', quien: 'abuela', nombre: 'Abuela', texto: `¿Dónde está ${g('mi nieto favorito', 'mi nieta favorita')}?` },
        { t: 'mirar', quien: 'yo', a: 'abuela' },
        { t: 'mirar', quien: 'mama', a: 'abuela' },
        { t: 'mirar', quien: 'papa', a: 'abuela' },
        { t: 'decir', quien: 'yo', nombre: n, texto: '¡Abuela!', anim: 'saludar' },
        { t: 'mover', quien: 'abuela', a: [1.8, 1.75] },
        { t: 'mirar', quien: 'abuela', a: 'yo' },
        { t: 'mirar', quien: 'mama', a: 'yo' },
        { t: 'mirar', quien: 'papa', a: 'yo' },
        { t: 'anim', quien: 'abuela', anim: 'entregar' },
        { t: 'decir', quien: 'abuela', nombre: 'Abuela', texto: 'Te traje un regalo muy especial. Ábrelo con cuidado…' },
        { t: 'prop', quien: 'abuela' },
        { t: 'anim', quien: 'abuela', anim: 'quieto' },
        { t: 'aparecer', quien: 'perro' },
        { t: 'sfx', n: 'ladrido' },
        { t: 'anim', quien: 'perro', anim: 'feliz' },
        { t: 'mirar', quien: 'perro', a: 'yo' },
        { t: 'decir', quien: 'yo', nombre: n, texto: '¿¡Un perrito!? ¿Es para mí?', anim: 'saludar' },
        { t: 'sfx', n: 'logro' },
        { t: 'decir', quien: 'abuela', nombre: 'Abuela', texto: `Sí. Se llama ${m}. Y también te traje esto: tu diario.` },
        { t: 'prop', quien: 'yo', prop: 'libro' },
        { t: 'decir', quien: 'abuela', nombre: 'Abuela', texto: `Cada día que cuides lo tuyo, el diario se llenará. Cuando esté lleno, estarás ${g('listo', 'lista')} para crecer.` },
        { t: 'mirar', quien: 'yo', a: 'papa' },
        { t: 'mirar', quien: 'perro', a: 'papa' },
        { t: 'decir', quien: 'papa', nombre: 'Papá', texto: 'Mmm… un perro es mucha responsabilidad. Hay que darle de comer, pasearlo, cuidarlo…', anim: 'jarras' },
        { t: 'decir', quien: 'papa', nombre: 'Papá', texto: `Te propongo un trato: si en una semana demuestras que puedes cuidar a ${m} y tus cosas, ${m} se queda.`, anim: 'senalar' },
        { t: 'elegir', opciones: ['¡Trato hecho, papá!', `¡Lo prometo! Voy a cuidar a ${m}.`] },
        { t: 'saltar', quien: 'perro' },
        { t: 'sfx', n: 'ladrido' },
        { t: 'mirar', quien: 'yo', a: 'mama' },
        { t: 'decir', quien: 'mama', nombre: 'Mamá', texto: 'Muy bien. Ahora a dormir, que mañana hay colegio y el bus pasa temprano.' },
        { t: 'mirar', quien: 'yo', a: 'abuela' },
        { t: 'decir', quien: 'abuela', nombre: 'Abuela', texto: 'Buenas noches, mi amor. Yo sé que lo vas a lograr.', anim: 'saludar' },
        { t: 'esperar', seg: 0.6 },
      ],
    };
  }

  // ---------- tarjeta del capítulo
  document.body.insertAdjacentHTML('beforeend', `
<div class="pantalla capitulo" id="capitulo" hidden><div class="hoja cap-hoja">
  <p class="eyebrow" id="capEy">Capítulo 1 · 7 años</p>
  <div class="cap-cumple" id="capCumple" hidden></div>
  <h1 id="capTitulo"></h1>
  <p class="lead" id="capTrato"></p>
  <div class="diario" id="capDiario" role="list" aria-label="Diario de la semana"></div>
  <h2 id="capHoy"></h2>
  <ul class="metas" id="capMetas"></ul>
  <div class="cap-mundo" id="capMundo"></div>
  <div class="controles">
    <span class="solo-tecla"><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> caminar</span>
    <span class="solo-tecla"><kbd>E</kbd> usar objeto</span>
    <span class="solo-tecla"><kbd>1</kbd>–<kbd>4</kbd> elegir</span>
    <span class="solo-tecla"><kbd>Z</kbd> saltar</span>
    <span class="solo-tecla"><kbd>X</kbd> agacharte (mantén)</span>
    <span class="solo-toque"><kbd data-t="Palanca">←</kbd> caminar</span>
    <span class="solo-toque"><kbd data-t="Usar">E</kbd> usar objeto</span>
    <span class="solo-toque"><kbd data-t="Saltar">Z</kbd> saltar</span>
    <span class="solo-toque"><kbd data-t="Agacharse">X</kbd> mantén para agacharte</span>
<span class="solo-toque">Toca una opción para elegir</span>
    <span>Con sonido y voces: sube el volumen</span>
  </div>
  <div class="i-botones">
    <button class="btn" type="button" id="capEmpezar"></button>
    <button class="btn sec" type="button" id="capHistoria">Ver la historia</button>
    <button class="btn sec" type="button" id="capEditar">Cambiar personaje</button>
  </div>
</div></div>`);

  const ESTRELLA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>';

  function mostrarCapitulo() {
    // ¿llenaste las barras para crecer? hoy es tu cumpleaños
    const cumple = H.crecer && progreso.cargar().prologo ? H.crecer.cumplir() : null;
    const p = perfil.cargar(), pr = progreso.cargar(), m = p.mascota.nombre;
    $('#capEy').textContent = `Capítulo ${pr.capitulo || 1} · ${p.edad || 7} años`;
    $('#capCumple').hidden = !cumple;
    if (cumple) {
      motor.aplicarPerfil(p);
      $('#capCumple').innerHTML = `<h2>¡Feliz cumpleaños! Ahora tienes ${cumple} años</h2>
        <ul><li>Creciste: ahora eres más ${p.genero === 'nina' ? 'alta' : 'alto'}.</li><li>En el colegio te toca aprender las tablas de multiplicar.</li><li>${m} está feliz: ¡creció contigo!</li><li>Tus barras empiezan de nuevo: el próximo desafío son los 12 años.</li></ul>`;
      motor.sfx('logro');
    }
    $('#capTitulo').textContent = `Una semana con ${m}`;
    $('#capTrato').textContent = `El trato con papá: si durante ${DIAS} días cuidas a ${m} y tus cosas, ${m} se queda. Cada día bien hecho llena una página del diario de la abuela.`;
    $('#capDiario').innerHTML = Array.from({ length: DIAS }, (_, i) => {
      const dia = i + 1, hecho = pr.diario.find((d) => d.dia === dia);
      const est = hecho ? hecho.estrellas : 0;
      const clase = hecho ? 'hecha' : dia === pr.dia ? 'hoy' : '';
      return `<div class="pagina ${clase}" role="listitem" aria-label="Día ${dia}${hecho ? `: ${est} de 3 estrellas` : dia === pr.dia ? ': hoy' : ''}">
        <span>Día ${dia}</span><i>${[0, 1, 2].map((k) => `<b class="${k < est ? 'llena' : ''}">${ESTRELLA}</b>`).join('')}</i></div>`;
    }).join('');
    $('#capHoy').textContent = `Hoy · Día ${pr.dia}`;
    // qué trae hoy
    let sorpresa = $('#capSorpresa');
    if (!sorpresa) { sorpresa = document.createElement('p'); sorpresa.id = 'capSorpresa'; sorpresa.className = 'cap-sorpresa'; $('#capHoy').after(sorpresa); }
    if (pr.dia <= DIAS) { const s = progreso.semana(pr.dia, m); $('#capHoy').textContent = `Hoy · Día ${pr.dia} · ${s.nombre}`; sorpresa.innerHTML = `<b>Hoy:</b> ${s.sorpresa}`; sorpresa.hidden = false; } else sorpresa.hidden = true;
    $('#capMetas').innerHTML = progreso.metas(p, pr.dia).map(([k, t]) => `<li data-meta="${k}">${t}</li>`).join('')
      + '<li class="nota-estrellas">4 o 5 metas = 3 estrellas · 3 metas = 2 · 2 metas = 1</li>';
    if (pr.dia > DIAS) { finDeSemana(p, pr); return; }
    const mundo = [];
    mundo.push(p.estacion === 'invierno' ? 'Invierno: amanece oscuro y hace frío' : 'Verano: amanece con sol');
    if (p.clima === 'lluvia') mundo.push('Está lloviendo');
    $('#capMundo').innerHTML = mundo.map((t) => `<span>${t}</span>`).join('');
    $('#capEmpezar').textContent = pr.prologo ? `Empezar el día ${pr.dia}` : 'Empezar la historia';
    $('#capHistoria').hidden = !pr.prologo;
    if (H.crecer && pr.prologo) H.crecer.pintarEnCapitulo($('#capitulo .cap-hoja'));
    $('#capitulo').hidden = false;
    $('#capEmpezar').focus();
  }

  // ---------- fin de la semana: papá decide si el cachorro se queda
  function finDeSemana(p, pr) {
    const m = p.mascota.nombre, total = progreso.totalEstrellas(pr), gano = total >= progreso.PARA_GANAR;
    $('#capTitulo').textContent = gano ? `¡${m} se queda!` : 'La semana terminó';
    $('#capTrato').textContent = gano
      ? `Juntaste ${total} de ${DIAS * 3} estrellas. Papá: "Cumpliste el trato. ${m} es oficialmente parte de la familia." El capítulo 2 (9 años) se desbloquea pronto.`
      : `Juntaste ${total} de ${DIAS * 3} estrellas y necesitabas ${progreso.PARA_GANAR}. Papá: "Te doy otra semana para demostrarlo. ${m} cuenta contigo."`;
    $('#capHoy').textContent = 'Tu semana';
    $('#capMetas').innerHTML = '';
    $('#capEmpezar').textContent = gano ? 'Jugar la semana otra vez' : 'Intentar otra semana';
    $('#capMundo').innerHTML = '';
    $('#capHistoria').hidden = true;
    const ctl = $('#capitulo .controles'); if (ctl) ctl.hidden = true;
    // antes faltaba mostrar la tarjeta: el juego quedaba en negro después del domingo
    $('#capitulo').hidden = false;
    $('#capEmpezar').focus();
    if (gano) motor.sfx('logro');
  }

  // ---------- fin del día: estrellas al diario y siguiente día
  const ESTRELLA_G = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>';
  H.alTerminarDia = ({ logradas, estrellas }) => {
    const p = perfil.cargar(), pr = progreso.cargar(), dia = pr.dia;
    const metas = progreso.metas(p, dia);
    const hoja = $('#resumen .hoja');
    let caja = $('#rDiario');
    if (!caja) { caja = document.createElement('section'); caja.id = 'rDiario'; caja.className = 'r-diario'; hoja.insertBefore(caja, $('#rStats')); }
    const sig = dia + 1;
    caja.innerHTML = `<h2>Diario · Día ${dia} de ${DIAS}</h2>
      <div class="r-estrellas" role="img" aria-label="${estrellas} de 3 estrellas">${[0, 1, 2].map((k) => `<span class="${k < estrellas ? 'llena' : ''}">${ESTRELLA_G}</span>`).join('')}</div>
      <ul class="r-metas">${metas.map(([id, t]) => `<li class="${logradas.includes(id) ? 'si' : ''}">${t}</li>`).join('')}</ul>
      ${sig <= DIAS ? `<p class="r-manana"><b>Mañana, ${progreso.semana(sig, p.mascota.nombre).nombre.toLowerCase()}:</b> ${progreso.semana(sig, p.mascota.nombre).sorpresa}</p>` : `<p class="r-manana"><b>Mañana:</b> papá decide si ${p.mascota.nombre} se queda.</p>`}
      <p class="r-semana">Llevas ${progreso.totalEstrellas(pr) + estrellas} ${progreso.totalEstrellas(pr) + estrellas === 1 ? 'estrella' : 'estrellas'} en la semana. Para que ${p.mascota.nombre} se quede necesitas ${progreso.PARA_GANAR} de ${DIAS * 3}.</p>
      <div class="i-botones"><button class="btn" type="button" id="rSeguir">${sig > DIAS ? 'Ver cómo terminó la semana' : `Guardar en el diario y seguir al día ${sig}`}</button><button class="btn sec" type="button" id="rRepetir">Repetir el día ${dia}</button></div>`;
    $('#bOtra').hidden = true;
    $('#rSeguir').addEventListener('click', () => { progreso.terminarDia(dia, estrellas, logradas); window.location.reload(); });
    $('#rRepetir').addEventListener('click', () => window.location.reload());
    $('#rSeguir').focus({ preventScroll: true });
  };

  function verHistoria() {
    $('#capitulo').hidden = true;
    const p = perfil.cargar();
    motor.perroEnCuarto(true);
    const { montaje, pasos } = guion(p);
    motor.cine(montaje, pasos).then(() => {
      progreso.guardar({ prologo: true });
      mostrarCapitulo();
      motor.aclarar();
    });
  }

  $('#capEmpezar').addEventListener('click', () => {
    const pr = progreso.cargar();
    if (!pr.prologo) { verHistoria(); return; }
    if (pr.dia > DIAS) { progreso.repetirSemana(); window.location.reload(); return; }
    $('#capitulo').hidden = true;
    motor.empezar();
  });
  $('#capHistoria').addEventListener('click', verHistoria);
  $('#capEditar').addEventListener('click', () => { $('#capitulo').hidden = true; if (H.creador) H.creador.abrir(); });
  document.addEventListener('keydown', (e) => {
    if ($('#capitulo').hidden || e.target.tagName === 'BUTTON') return;
    if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); $('#capEmpezar').click(); }
  });

  // al terminar el creador: primera vez, la historia; si ya se vio, la tarjeta del capítulo
  H.alCerrarCreador = () => { if (progreso.cargar().prologo) mostrarCapitulo(); else verHistoria(); };
  if (perfil.cargar().creado) {
    const pr = progreso.cargar();
    motor.perroEnCuarto(pr.prologo);
    mostrarCapitulo();
  }

  H.historia = { verHistoria, mostrarCapitulo };
})();
