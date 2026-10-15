/* Para papás: un panel para el adulto, protegido con una pregunta que un niño de 6-7 años no sabe responder.
   - LA SEMANA: estrellas por día, metas logradas y que faltaron, hábitos del juego, tiempo jugado (aprox.)
     y lo que pasó en la semana (Teo, veterinario, feria, parque, piscina, llaves, abuela, premios…).
   - HÁBITOS REALES: el adulto elige qué hábitos de la vida real quiere reforzar (progreso.habitosReales).
   - MISIONES DE LA VIDA REAL: cada día (fecha real) el niño ve 1-2 misiones de esos hábitos en la tarjeta
     del día y al empezar a jugar. El adulto confirma "¡Lo hizo!" y en el juego la cachorrita lo celebra
     (elogio + ánimo; cada 3 misiones, un premio con H.premios.dar(id, 'mision')).
     progreso.misiones = { dias: { 'AAAA-MM-DD': [{ id, hecho, celebrada }] }, total }
   - AJUSTES: día corto/largo (motor.setDuracion), leer en voz alta (progreso.ajustes.leer), sonido,
     y empezar la semana de nuevo (con confirmación).
   Todo queda en este dispositivo (localStorage); nada sale de él.
   API: H.padres = { abrir(), cerrar(), HABITOS, misionesDeHoy(), confirmar(fecha, id), pendientes(), celebrar() }
   Eventos: A.evento('mision', { id, texto, premio }) al celebrar; A.evento('ajustes', { leer|sonido|dia }). */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.progreso) return;
  const { motor, progreso } = H;
  const A = motor.api || null;
  const $ = (s, r) => (r || document).querySelector(s);

  // ---------------------------------------------------------------- perfil y textos
  const perfil = () => (H.perfil && H.perfil.cargar ? H.perfil.cargar() : null) || (A && A.perfil) || {};
  const nina = () => perfil().genero === 'nina';
  const gx = (o, a) => (nina() ? a : o);
  const nombre = () => perfil().nombre || 'Dani';
  const perrita = () => (perfil().mascota && perfil().mascota.nombre) || 'Molly';
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // hábitos de la vida real: [id, nombre para el adulto, ícono, misiones para el niño (texto tras "Hoy en la vida real:")]
  const HABITOS = [
    { id: 'dientes', nombre: 'Lavarse los dientes', icono: '🪥', misiones: () => ['lávate los dientes después del almuerzo', 'lávate los dientes antes de dormir'] },
    { id: 'cama', nombre: 'Tender la cama', icono: '🛏️', misiones: () => [`tiende tu cama al levantarte, ${gx('solito', 'solita')}`] },
    { id: 'juguetes', nombre: 'Ordenar los juguetes', icono: '🧸', misiones: () => ['guarda tus juguetes antes de cenar'] },
    { id: 'leer', nombre: 'Leer 10 minutos', icono: '📖', misiones: () => ['lee un cuento 10 minutos con alguien de tu familia'] },
    { id: 'mesa', nombre: 'Ayudar en la mesa', icono: '🍽️', misiones: () => ['ayuda a poner la mesa', 'ayuda a levantar los platos después de comer'] },
    { id: 'dormir', nombre: 'Ir a dormir a la hora', icono: '🌙', misiones: () => ['ve a la cama a la hora, sin protestar'] },
    { id: 'manos', nombre: 'Lavarse las manos', icono: '🧼', misiones: () => ['lávate las manos antes de comer'] },
    { id: 'vestirse', nombre: 'Vestirse sin ayuda', icono: '👕', misiones: () => [`vístete ${gx('solito', 'solita')} en la mañana`] },
    { id: 'fruta', nombre: 'Comer fruta o verduras', icono: '🍎', misiones: () => ['come una fruta o tus verduras sin protestar'] },
    { id: 'agua', nombre: 'Tomar agua', icono: '💧', misiones: () => ['toma un vaso de agua en la tarde'] },
  ];
  const habitoDe = (id) => HABITOS.find((h) => h.id === id);

  // ---------------------------------------------------------------- guardado (todo local)
  const hoy = () => (progreso.hoyISO ? progreso.hoyISO() : new Date().toISOString().slice(0, 10));
  const elegidos = () => { const l = progreso.cargar().habitosReales; return Array.isArray(l) ? l.filter((id) => habitoDe(id)) : []; };
  function datosMisiones() {
    const m = progreso.cargar().misiones;
    return { dias: (m && typeof m.dias === 'object' && m.dias) || {}, total: (m && m.total) || 0 };
  }
  function guardarMisiones(m) {
    const fechas = Object.keys(m.dias).sort();
    const dias = {}; fechas.slice(-21).forEach((f) => { dias[f] = m.dias[f]; });   // se guardan las últimas 3 semanas
    progreso.guardar({ misiones: { dias, total: m.total } });
  }
  const numDia = (f) => Math.round(Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)) / 864e5);
  // las misiones de una fecha: se eligen al primer vistazo del día (1, o 2 si hay 3 hábitos o más) y quedan fijas
  function misionesDe(fecha, crear) {
    const m = datosMisiones();
    if (m.dias[fecha]) return m.dias[fecha];
    const l = elegidos();
    if (!crear || !l.length) return [];
    const n = l.length >= 3 ? 2 : 1, d = numDia(fecha), lista = [];
    for (let k = 0; k < n; k++) {
      const h = habitoDe(l[(d * n + k) % l.length]);
      if (!lista.some((x) => x.id === h.id)) lista.push({ id: h.id, v: d % h.misiones().length, hecho: false, celebrada: false });
    }
    m.dias[fecha] = lista;
    guardarMisiones(m);
    return lista;
  }
  const textoMision = (x) => { const h = habitoDe(x.id); if (!h) return ''; const l = h.misiones(); return l[(x.v || 0) % l.length]; };
  const misionesDeHoy = () => misionesDe(hoy(), true);
  function confirmar(fecha, id) {
    const m = datosMisiones(), l = m.dias[fecha] || [];
    const x = l.find((q) => q.id === id);
    if (!x || x.hecho) return false;
    x.hecho = true; x.celebrada = false; x.cuando = Date.now();
    m.total += 1;
    guardarMisiones(m);
    return true;
  }
  function pendientes() {
    const m = datosMisiones(), out = [];
    Object.keys(m.dias).sort().forEach((f) => m.dias[f].forEach((x) => { if (x.hecho && !x.celebrada) out.push({ fecha: f, x }); }));
    return out;
  }

  // ---------------------------------------------------------------- registro de la semana (hábitos del juego y tiempo)
  // registro[díaDelJuego] = { b: [hábitos buenos], m: [malos] } · tiempo[fecha] = segundos jugados
  function anotarHabito(tipo, n) {
    if (!n || typeof n !== 'string') return;
    const pr = progreso.cargar(), dia = pr.dia || 1;
    let r = pr.registro && typeof pr.registro === 'object' ? pr.registro : {};
    if (Object.keys(r).some((k) => +k > dia)) r = {};       // semana nueva: se empieza el registro de nuevo
    const d = r[dia] || { b: [], m: [] };
    if (!d[tipo].includes(n)) d[tipo] = d[tipo].concat([n]);
    r = Object.assign({}, r, { [dia]: d });
    progreso.guardar({ registro: r });
  }
  const T = { seg: 0, ult: 0, guardo: 0 };
  function guardarTiempo() {
    if (T.seg < 1) return;
    const pr = progreso.cargar(), f = hoy();
    const t = Object.assign({}, pr.tiempo && typeof pr.tiempo === 'object' ? pr.tiempo : {});
    t[f] = Math.round((t[f] || 0) + T.seg);
    const fechas = Object.keys(t).sort(); fechas.slice(0, -21).forEach((k) => delete t[k]);
    T.seg = 0;
    progreso.guardar({ tiempo: t });
  }
  window.addEventListener('pagehide', guardarTiempo);
  document.addEventListener('visibilitychange', () => { if (document.hidden) guardarTiempo(); });

  // ---------------------------------------------------------------- en el juego: anunciar y celebrar
  const R = { anuncio: false, tJuego: 0, espera: 0 };
  function libre() {
    if (!A) return false;
    const st = A.estado();
    if (!st.jugando || st.cargando || st.accion || st.panel || st.visita || st.examen || st.levantando ||
      st.alarma || st.cine || st.tutorial || st.vitrina || st.mamaHabla || st.charla) return false;
    if (A.controlado || A.primeraPersona || A.escondido) return false;
    if (H.futbol && H.futbol.jugando) return false;
    if (H.obstaculos && H.obstaculos.escondidas) return false;
    if (H.sorpresas && H.sorpresas.visible) return false;
    const pan = $('#panel'); if (pan && !pan.hidden) return false;
    if (document.querySelector('#logros .logro')) return false;
    return !abierto();
  }
  const perro = () => (H.perro && H.perro.D) || null;
  function anunciar() {
    const l = misionesDeHoy();
    if (!l.length) return false;
    const txt = l.filter((x) => !x.hecho).map(textoMision);
    if (!txt.length) return false;
    const D = perro();
    const frase = `¡Guau! Hoy en la vida real: ${txt.join(' y ')}.`;
    A.decir(D || A.P, frase, 6);
    if (D) { D.anim = 'feliz'; D.salto = 0.55; }
    A.avisar(`⭐ Misión de verdad: ${txt.join(' · ')}`, 'bien');
    A.evento('misionAnuncio', { textos: txt });
    return true;
  }
  function premioSiguiente() {
    if (!H.premios) return null;
    const x = H.premios.lista().find((q) => !q.tiene);
    return x && H.premios.dar(x.id, 'mision') ? x : null;
  }
  // celebra UNA misión confirmada que todavía no se celebró (devuelve true si celebró)
  function celebrar() {
    const p = pendientes()[0];
    if (!p || !A) return false;
    const m = datosMisiones(), l = m.dias[p.fecha] || [];
    const x = l.find((q) => q.id === p.x.id);
    x.celebrada = true;
    guardarMisiones(m);
    const h = habitoDe(x.id), m2 = perrita();
    const D = perro();
    if (D) { D.anim = 'feliz'; D.salto = 0.55; }
    if (H.perro && H.perro.hacerTruco && D) H.perro.hacerTruco('saludar');
    A.sfx('ladrido');
    A.decir(D || A.P, `¡Guau! ¡${nombre()}, lo hiciste de verdad! ¡Estoy muy orgullosa de ti!`, 4);
    A.banner('bien', 'Misión de verdad', `${h ? h.nombre : '¡Lo lograste!'}`, `${m2} está muy feliz contigo`);
    A.cambiar({ animo: 6, motivacion: 4 });
    if (H.perro && H.perro.cambiarVinculo) H.perro.cambiarVinculo(1);
    // a veces, un premio: cada 3 misiones confirmadas
    let premio = null;
    const n = datosMisiones().total;
    if (n > 0 && n % 3 === 0 && !x.premio) { premio = premioSiguiente(); }
    if (premio) { const mm = datosMisiones(); const y = (mm.dias[p.fecha] || []).find((q) => q.id === x.id); if (y) { y.premio = premio.id; guardarMisiones(mm); } }
    A.evento('mision', { id: x.id, texto: textoMision(x), premio: premio ? premio.id : null });
    return true;
  }

  if (A) {
    A.alEvento((tipo, d) => {
      if (tipo === 'habito') anotarHabito('b', d);
      else if (tipo === 'malHabito') anotarHabito('m', d);
    });
    A.alActualizar((dt) => {
      const st = A.estado();
      const ahora = performance.now();
      if (st.jugando && !document.hidden) {
        if (T.ult) T.seg += Math.min(1, (ahora - T.ult) / 1000);
        if (ahora - T.guardo > 30000) { T.guardo = ahora; guardarTiempo(); }
      }
      T.ult = ahora;
      if (!st.jugando) { R.tJuego = 0; return; }
      R.tJuego += dt;
      if (R.espera > 0) { R.espera -= dt; return; }
      if (R.tJuego < 3 || !libre()) return;
      if (!R.anuncio) { R.anuncio = true; if (anunciar()) { R.espera = 7; return; } }
      if (pendientes().length && celebrar()) R.espera = 6;
    });
  }

  // ---------------------------------------------------------------- tarjeta del día: botón y misiones
  function pintarTarjeta() {
    const cap = $('#capitulo');
    if (!cap) return;
    const pie = $('.cap-pie', cap);
    if (pie && !$('#capPapas')) {
      pie.insertAdjacentHTML('beforeend', '<button type="button" class="cap-papas" id="capPapas" aria-label="Para papás y mamás (panel para adultos)"><span aria-hidden="true">🔒</span> Para papás</button>');
      $('#capPapas').addEventListener('click', abrir);
    }
    let caja = $('#capMisiones');
    if (!caja) {
      caja = document.createElement('div'); caja.id = 'capMisiones'; caja.className = 'cap-misiones';
      const metas = $('#capMetas'); if (metas) metas.after(caja); else return;
    }
    const pr = progreso.cargar();
    const l = pr.prologo ? misionesDeHoy() : [];
    const pend = pendientes();
    caja.hidden = !l.length && !pend.length;
    caja.innerHTML = (l.length ? `<b class="cm-t">⭐ Hoy en la vida real</b><ul>${l.map((x) => `<li class="${x.hecho ? 'hecha' : ''}" data-mision="${x.id}"><span aria-hidden="true">${habitoDe(x.id).icono}</span> ${esc(textoMision(x))}${x.hecho ? ' <i>¡Lo hiciste!</i>' : ''}</li>`).join('')}</ul>` : '')
      + (pend.length ? `<p class="cm-celebra">¡${esc(perrita())} sabe que cumpliste ${pend.length === 1 ? 'una misión' : pend.length + ' misiones'} de verdad! Te espera para celebrar.</p>` : '');
  }

  // ---------------------------------------------------------------- el panel
  document.body.insertAdjacentHTML('beforeend', `
<div class="padres" id="padres" hidden role="dialog" aria-modal="true" aria-labelledby="ppTitulo"><div class="pp-hoja">
  <button type="button" class="pp-cerrar" id="ppCerrar" aria-label="Cerrar">✕</button>
  <p class="pp-ey">Solo para adultos</p>
  <h1 id="ppTitulo">Para papás y mamás</h1>
  <section class="pp-puerta" id="ppPuerta">
    <p>Para entrar, resuelve esta cuenta:</p>
    <form id="ppForm" autocomplete="off"><label class="pp-cuenta" for="ppResp"><span id="ppPregunta"></span> =</label>
      <input id="ppResp" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" aria-label="Respuesta">
      <button type="submit" class="pp-btn" id="ppEntrar">Entrar</button></form>
    <p class="pp-error" id="ppError" aria-live="polite"></p>
  </section>
  <section class="pp-dentro" id="ppDentro" hidden>
    <nav class="pp-tabs" role="tablist">
      <button type="button" role="tab" data-tab="semana" class="activo">La semana</button>
      <button type="button" role="tab" data-tab="habitos">Hábitos reales</button>
      <button type="button" role="tab" data-tab="misiones">Misiones</button>
      <button type="button" role="tab" data-tab="ajustes">Ajustes</button>
    </nav>
    <div class="pp-tab" id="ppSemana" data-tab="semana"></div>
    <div class="pp-tab" id="ppHabitos" data-tab="habitos" hidden></div>
    <div class="pp-tab" id="ppMisiones" data-tab="misiones" hidden></div>
    <div class="pp-tab" id="ppAjustes" data-tab="ajustes" hidden></div>
    <p class="pp-priv">Todo se guarda solo en este dispositivo. Nada se envía a internet.</p>
  </section>
</div></div>`);
  const raiz = $('#padres');
  const abierto = () => !raiz.hidden;
  const Q = { a: 0, b: 0 };
  function nuevaPregunta() {
    Q.a = 12 + Math.floor(Math.random() * 8); Q.b = 3 + Math.floor(Math.random() * 7);
    $('#ppPregunta').textContent = `${Q.a} × ${Q.b}`;
    $('#ppResp').value = '';
  }
  function abrir() {
    nuevaPregunta();
    $('#ppError').textContent = '';
    $('#ppPuerta').hidden = false; $('#ppDentro').hidden = true;
    raiz.hidden = false;
    if (A && A.estado().jugando) A.bloquear('padres', true);
    setTimeout(() => $('#ppResp').focus(), 30);
  }
  function cerrar() {
    raiz.hidden = true;
    if (A) A.bloquear('padres', false);
    pintarTarjeta();
    const b = $('#capPapas'); if (b && !$('#capitulo').hidden) b.focus({ preventScroll: true });
  }
  $('#ppCerrar').addEventListener('click', cerrar);
  raiz.addEventListener('click', (e) => { if (e.target === raiz) cerrar(); });
  // las teclas no llegan al juego ni a la tarjeta (Enter en la tarjeta empezaría el día)
  raiz.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') cerrar(); });
  raiz.addEventListener('keyup', (e) => e.stopPropagation());
  $('#ppForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const r = parseInt($('#ppResp').value.trim(), 10);
    if (r === Q.a * Q.b) { $('#ppPuerta').hidden = true; $('#ppDentro').hidden = false; verTab('semana'); return; }
    $('#ppError').textContent = 'Esa no es la respuesta. Prueba con esta otra cuenta.';
    nuevaPregunta();
    $('#ppResp').focus();
  });
  function verTab(t) {
    raiz.querySelectorAll('.pp-tabs button').forEach((b) => { const on = b.dataset.tab === t; b.classList.toggle('activo', on); b.setAttribute('aria-selected', String(on)); });
    raiz.querySelectorAll('.pp-tab').forEach((d) => { d.hidden = d.dataset.tab !== t; });
    ({ semana: pintarSemana, habitos: pintarHabitos, misiones: pintarMisiones, ajustes: pintarAjustes })[t]();
  }
  raiz.querySelectorAll('.pp-tabs button').forEach((b) => b.addEventListener('click', () => verTab(b.dataset.tab)));

  // ---------- LA SEMANA
  const DIAS_N = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const NOMBRES_META = { perro: 'Darle de comer a la cachorrita', colegio: 'Ir al colegio a tiempo', comer: 'Comer tres veces', cuarto: 'Dejar el cuarto ordenado', dormir: 'Dormir a buena hora', ayudar: 'Ayudar en casa', jugar: 'Jugar con la cachorrita' };
  function contar(lista) { const c = {}; lista.forEach((n) => { c[n] = (c[n] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]); }
  const minutos = (s) => (s < 60 ? 'menos de 1 min' : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);
  function sucesos(pr) {
    const m = perrita(), out = [];
    if (pr.amigoTeo) out.push(`Se hizo ${gx('amigo', 'amiga')} de Teo, el compañero nuevo.`);
    if (pr.veterinario && pr.veterinario.fue) out.push(`Llevó a ${m} al veterinario${pr.veterinario.vacuna ? ' a vacunarla' : ''}${pr.veterinario.calmada ? ' y la calmó' : ''}.`);
    else if (pr.veterinario && pr.veterinario.fue === false) out.push(`No llegaron al veterinario con ${m}.`);
    if (pr.feria && (pr.feria.presentada || pr.feria.resultado)) out.push(`Presentó su trabajo en la feria del colegio${pr.feria.resultado === 'muyBien' ? ': ¡le fue muy bien!' : pr.feria.resultado === 'bien' ? ': le fue bien.' : '.'}`);
    else if (pr.feria && pr.feria.avance) out.push(`Preparó su trabajo para la feria (${pr.feria.avance} de 2 tardes).`);
    if (pr.parque && pr.parque.fue !== false) out.push(`Fue al parque con papá${Array.isArray(pr.parque.hechos) && pr.parque.hechos.length ? ` (${pr.parque.hechos.slice(0, 4).join(', ')})` : ''}.`);
    if (pr.piscina && pr.piscina.veces) { const r = pr.piscina.retos || {}; const n = Object.values(r).filter(Boolean).length; out.push(`Jugó en la piscina ${pr.piscina.veces} ${pr.piscina.veces === 1 ? 'vez' : 'veces'} (${n} de 4 desafíos).`); }
    if (pr.llaves && (pr.llaves.altillo || pr.llaves.taller)) out.push(`Encontró ${pr.llaves.altillo && pr.llaves.taller ? 'las dos llaves' : 'una llave'} del sótano con ${m}.`);
    if (pr.regaloAbuela) out.push(`Almorzó con la abuela el domingo (regalo: ${pr.regaloAbuela === 'collar' ? 'un collar' : 'un libro'}).`);
    if (pr.sorpresas && pr.sorpresas.total) out.push(`Recibió ${pr.sorpresas.total} ${pr.sorpresas.total === 1 ? 'sorpresa' : 'sorpresas'} por su esfuerzo.`);
    if (Array.isArray(pr.premiosSemana) && pr.premiosSemana.length && H.premios) out.push(`Premios nuevos para ${m}: ${H.premios.deLaSemana().map((x) => x.nombre).join(', ')}.`);
    if (Array.isArray(pr.logros) && pr.logros.length) out.push(`Logros del álbum: ${pr.logros.length}.`);
    return out;
  }
  function pintarSemana() {
    const pr = progreso.cargar(), p = perfil();
    const total = progreso.totalEstrellas(pr);
    const dias = Array.from({ length: progreso.DIAS }, (_, i) => {
      const d = pr.diario.find((x) => x.dia === i + 1);
      const est = d ? d.estrellas || 0 : null;
      return `<li class="${d ? 'hecho' : i + 1 === pr.dia ? 'hoy' : ''}"><span>${DIAS_N[i]}</span><b aria-label="${est == null ? 'sin jugar' : est + ' de 3 estrellas'}">${est == null ? '–' : '★'.repeat(est) + '☆'.repeat(3 - est)}</b></li>`;
    }).join('');
    // metas cumplidas y que faltaron (del diario)
    const si = [], no = [];
    pr.diario.forEach((d) => { (progreso.metas(p, d.dia) || []).forEach(([id]) => ((d.metas || []).includes(id) ? si : no).push(NOMBRES_META[id] || id)); });
    const reg = pr.registro && typeof pr.registro === 'object' ? Object.values(pr.registro) : [];
    const buenos = contar([].concat(...reg.map((r) => r.b || []))), malos = contar([].concat(...reg.map((r) => r.m || [])));
    const lista = (l, vacio) => (l.length ? `<ul>${l.slice(0, 4).map(([n, c]) => `<li>${esc(n)} <small>${c} ${c === 1 ? 'día' : 'días'}</small></li>`).join('')}</ul>` : `<p class="pp-nota">${vacio}</p>`);
    const t = pr.tiempo && typeof pr.tiempo === 'object' ? pr.tiempo : {};
    const hace7 = numDia(hoy()) - 6;
    const seg = Object.keys(t).filter((f) => numDia(f) >= hace7).reduce((s, f) => s + t[f], 0) + T.seg;
    const hoyS = (t[hoy()] || 0) + T.seg;
    const m = datosMisiones();
    const misHechas = Object.keys(m.dias).filter((f) => numDia(f) >= hace7).reduce((s, f) => s + m.dias[f].filter((x) => x.hecho).length, 0);
    const ev = sucesos(pr);
    $('#ppSemana').innerHTML = `
      <h2>La semana de ${esc(nombre())}</h2>
      <p>Va en el día ${Math.min(pr.dia, progreso.DIAS)} de ${progreso.DIAS}. Lleva <b>${total} ${total === 1 ? 'estrella' : 'estrellas'}</b> esta semana.</p>
      <ul class="pp-dias" aria-label="Estrellas por día">${dias}</ul>
      <div class="pp-cols">
        <div><h3>Metas del juego que más cumple</h3>${lista(contar(si), 'Todavía no termina ningún día.')}</div>
        <div><h3>Metas que más le faltan</h3>${lista(contar(no), pr.diario.length ? '¡Ninguna! Cumplió todas.' : 'Todavía no termina ningún día.')}</div>
        <div><h3>Buenos hábitos en el juego</h3>${lista(buenos, 'Aún no hay datos.')}</div>
        <div><h3>Hábitos a mejorar en el juego</h3>${lista(malos, 'Ninguno por ahora.')}</div>
      </div>
      <p><b>Tiempo jugado (aprox.):</b> ${minutos(hoyS)} hoy · ${minutos(seg)} en los últimos 7 días.</p>
      <p><b>Misiones de la vida real cumplidas:</b> ${misHechas} en los últimos 7 días.</p>
      <h3>Lo que pasó en la semana</h3>
      ${ev.length ? `<ul class="pp-sucesos">${ev.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="pp-nota">Todavía no pasó nada especial. Cada día de la semana trae una historia nueva.</p>'}
      <p class="pp-nota">Idea: pregúntenle qué fue lo que más le gustó del día y qué le costó. Elogien el esfuerzo, no solo las estrellas.</p>`;
  }

  // ---------- HÁBITOS REALES
  function pintarHabitos() {
    const sel = elegidos();
    $('#ppHabitos').innerHTML = `
      <h2>¿Qué hábitos quieren reforzar en casa?</h2>
      <p>Elijan de 1 a 4. Cada día ${esc(nombre())} verá en el juego una o dos "misiones de verdad" de estos hábitos.</p>
      <div class="pp-habitos">${HABITOS.map((h) => `<label class="pp-hab"><input type="checkbox" value="${h.id}" ${sel.includes(h.id) ? 'checked' : ''}><span aria-hidden="true">${h.icono}</span> ${h.nombre}</label>`).join('')}</div>
      <p class="pp-ok" id="ppHabOk" aria-live="polite">${sel.length ? `Elegidos: ${sel.length}.` : ''}</p>`;
    $('#ppHabitos').querySelectorAll('input').forEach((c) => c.addEventListener('change', () => {
      const l = Array.from($('#ppHabitos').querySelectorAll('input:checked')).map((x) => x.value);
      progreso.guardar({ habitosReales: l });
      // si hoy todavía no había misiones (o las de hoy ya no están elegidas y no se hicieron), se eligen de nuevo
      const m = datosMisiones(), f = hoy();
      if (m.dias[f] && !m.dias[f].some((x) => x.hecho)) { delete m.dias[f]; guardarMisiones(m); }
      $('#ppHabOk').textContent = l.length ? `Guardado. Elegidos: ${l.length}.` : 'Guardado. Sin hábitos elegidos no hay misiones.';
    }));
  }

  // ---------- MISIONES
  function pintarMisiones() {
    const f = hoy(), ayer = progreso.hoyISO ? progreso.hoyISO(new Date(Date.now() - 864e5)) : null;
    const lHoy = misionesDeHoy(), lAyer = ayer ? misionesDe(ayer, false) : [];
    const fila = (fecha, x) => `<li data-mision="${x.id}" data-fecha="${fecha}"><span aria-hidden="true">${habitoDe(x.id) ? habitoDe(x.id).icono : '⭐'}</span> <span class="pp-mt">${esc(textoMision(x))}</span>
      ${x.hecho ? `<em class="pp-hecha">✓ Confirmada${x.celebrada ? ` · ${esc(perrita())} ya lo celebró` : ` · ${esc(perrita())} lo celebrará en el juego`}</em>` : '<button type="button" class="pp-btn pp-lohizo">¡Lo hizo!</button>'}</li>`;
    $('#ppMisiones').innerHTML = `
      <h2>Misiones de la vida real</h2>
      ${elegidos().length ? '' : '<p class="pp-nota">Primero elijan hábitos en "Hábitos reales".</p>'}
      <h3>Hoy</h3>${lHoy.length ? `<ul class="pp-mis">${lHoy.map((x) => fila(f, x)).join('')}</ul>` : '<p class="pp-nota">No hay misiones para hoy.</p>'}
      ${lAyer.some((x) => !x.hecho) ? `<h3>Ayer</h3><ul class="pp-mis">${lAyer.map((x) => fila(ayer, x)).join('')}</ul>` : ''}
      <p class="pp-nota">Cuando ${esc(nombre())} cumpla una misión en la vida real, toquen "¡Lo hizo!". En el juego, ${esc(perrita())} lo felicita, y cada tres misiones le trae un premio. Si un día no la cumple, no pasa nada: no hay castigos.</p>`;
    $('#ppMisiones').querySelectorAll('.pp-lohizo').forEach((b) => b.addEventListener('click', () => {
      const li = b.closest('li');
      confirmar(li.dataset.fecha, li.dataset.mision);
      pintarMisiones();
    }));
  }

  // ---------- AJUSTES
  const ajustes = () => progreso.cargar().ajustes || {};
  function ponerAjuste(k, v) {
    const pr = progreso.cargar();
    progreso.guardar({ ajustes: Object.assign({}, pr.ajustes || {}, { [k]: v }) });   // merge: no pisa ajustes.dia
    if (A) A.evento('ajustes', { [k]: v });
  }
  const sonidoActivo = () => { try { return localStorage.getItem('habitos-sonido') !== '0'; } catch (e) { return true; } };
  function pintarAjustes() {
    const a = ajustes(), dur = motor.duracion ? motor.duracion() : (a.dia || 'normal');
    const leer = a.leer !== false, son = sonidoActivo();
    const sw = (id, on, txt, nota) => `<div class="pp-aj"><div><b>${txt}</b><small>${nota}</small></div><button type="button" class="pp-sw ${on ? 'on' : ''}" id="${id}" role="switch" aria-checked="${on}">${on ? 'Sí' : 'No'}</button></div>`;
    $('#ppAjustes').innerHTML = `
      <h2>Ajustes</h2>
      <div class="pp-aj"><div><b>Duración del día</b><small>Corto: unos 20 minutos de juego. Largo: el ritmo de siempre.</small></div>
        <span class="pp-grupo"><button type="button" class="pp-op ${dur === 'corto' ? 'on' : ''}" id="ppCorto" aria-pressed="${dur === 'corto'}">Corto</button><button type="button" class="pp-op ${dur === 'normal' ? 'on' : ''}" id="ppLargo" aria-pressed="${dur === 'normal'}">Largo</button></span></div>
      ${sw('ppLeer', leer, 'Leer en voz alta', 'El juego lee los textos y las opciones (útil si aún no lee solo).')}
      ${sw('ppSonido', son, 'Sonido', 'Efectos, música y voces.')}
      <div class="pp-aj pp-peligro"><div><b>Empezar la semana de nuevo</b><small>Borra las estrellas de esta semana. Se conservan los premios y el álbum.</small></div>
        <span><button type="button" class="pp-btn sec" id="ppReiniciar">Empezar de nuevo</button>
        <span id="ppConfirmar" hidden><span class="pp-seguro">¿Seguro?</span> <button type="button" class="pp-btn rojo" id="ppReiniciarSi">Sí, empezar de nuevo</button> <button type="button" class="pp-btn sec" id="ppReiniciarNo">No</button></span></span></div>`;
    const dur2 = (d) => {
      const b = document.querySelector(`#capitulo .cap-dur-b[data-dia="${d}"]`);
      if (b) b.click(); else if (motor.setDuracion) motor.setDuracion(d); else ponerAjuste('dia', d);
      if (A) A.evento('ajustes', { dia: d });
      pintarAjustes();
    };
    $('#ppCorto').addEventListener('click', () => dur2('corto'));
    $('#ppLargo').addEventListener('click', () => dur2('normal'));
    $('#ppLeer').addEventListener('click', () => {
      const on = !(ajustes().leer !== false);
      if (H.voz && H.voz.setActivo) { H.voz.setActivo(on); if (A) A.evento('ajustes', { leer: on }); } else ponerAjuste('leer', on);   // VOZ repinta su interruptor de la tarjeta
      pintarAjustes();
    });
    $('#ppSonido').addEventListener('click', () => {
      const quiero = !sonidoActivo();
      const b = $('#bSonido');
      if (b && sonidoActivo() !== quiero) b.click();
      if (sonidoActivo() !== quiero) { try { localStorage.setItem('habitos-sonido', quiero ? '1' : '0'); } catch (e) { /* nada */ } }
      ponerAjuste('sonido', quiero);
      pintarAjustes();
    });
    $('#ppReiniciar').addEventListener('click', () => { $('#ppReiniciar').hidden = true; $('#ppConfirmar').hidden = false; $('#ppReiniciarNo').focus(); });
    $('#ppReiniciarNo').addEventListener('click', () => { $('#ppReiniciar').hidden = false; $('#ppConfirmar').hidden = true; });
    $('#ppReiniciarSi').addEventListener('click', () => {
      progreso.repetirSemana();
      progreso.guardar({ registro: {} });
      if (motor.borrarPartida) motor.borrarPartida();
      window.location.reload();
    });
  }

  // la tarjeta del día la crea historia.js (se carga después): se pinta al terminar de cargar y cada vez que aparece
  function engancharTarjeta() {
    pintarTarjeta();
    const cap = $('#capitulo');
    if (cap && window.MutationObserver) new MutationObserver(() => { if (!cap.hidden) pintarTarjeta(); }).observe(cap, { attributes: true, attributeFilter: ['hidden'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', engancharTarjeta); else setTimeout(engancharTarjeta, 0);

  H.padres = { abrir, cerrar, HABITOS, misionesDeHoy, confirmar, pendientes, celebrar, textoMision, get abierto() { return abierto(); } };
})();
