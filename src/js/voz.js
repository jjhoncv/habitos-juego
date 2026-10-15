/* voz.js — leer en voz alta, íconos grandes en las opciones y señalar cosas (Ola 2).
   A los 6 años muchos leen despacio: el narrador lee los paneles, avisos, logros, la guía y la
   tarjeta del día; cada opción lleva un ícono grande y un botoncito 🔊 para escucharla; y una
   flecha animada señala el objeto del que se habla.
   API: A.leer(texto, quien = 'narrador', {prio, forzar}) · A.callar() · A.señalar(obj|it|nombre|[x,z], on, {seg})
        H.voz = { leer, callar, señalar, activo(), setActivo(on), iconoDe(texto), historial, ocupado(), señalados() }
   Ajuste: progreso.ajustes.leer (false = no leer). Interruptor en la tarjeta del día (#capLeer, lo pone este archivo).
   No se encima con los diálogos: si un personaje habla (o hay cine, charla o visita), espera; si tarda mucho, se salta. */
(function () {
  const H = window.Habitos = window.Habitos || {};
  const A = H.motor && H.motor.api;
  if (!A) return;
  const $ = (s) => document.querySelector(s);
  const ahora = () => Date.now();
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // ---------------------------------------------------------------- ajuste (progreso.ajustes.leer)
  function activo() {
    try { return ((H.progreso.cargar().ajustes) || {}).leer !== false; } catch (e) { return true; }
  }
  function setActivo(on) {
    try { const pr = H.progreso.cargar(); H.progreso.guardar({ ajustes: Object.assign({}, pr.ajustes || {}, { leer: !!on }) }); } catch (e) { /* sin progreso */ }
    if (!on) callar();
    pintarAjuste();
  }

  // ---------------------------------------------------------------- quién está hablando
  // Espiamos speechSynthesis.speak para saber si lo último que suena es del narrador o de un personaje.
  const ss = window.speechSynthesis;
  let marcando = null;      // mientras el narrador llama a hablar()
  let actual = null;        // lo que dice el narrador ahora
  let otro = null;          // lo último que dijo un personaje
  let ultimo = null;        // lo último que sonó (de quien sea)
  const estimar = (txt, narr) => 700 + txt.length * (narr ? 78 : 68);
  if (ss && typeof ss.speak === 'function') {
    const orig = ss.speak;
    try {
      ss.speak = function (u) {
        const txt = String((u && u.text) || '').trim();
        if (txt) {
          const reg = { narr: !!marcando, prio: marcando ? marcando.prio : 0, tipo: marcando ? marcando.tipo : '', texto: txt, fin: ahora() + estimar(txt, !!marcando), ended: false };
          try { const f = () => { reg.ended = true; }; u.addEventListener('end', f); u.addEventListener('error', f); } catch (e) { /* nada */ }
          if (reg.narr) actual = reg; else otro = reg;
          ultimo = reg;
        }
        return orig.call(ss, u);
      };
    } catch (e) { /* no se pudo espiar: igual funciona con lo demás */ }
  }
  const suena = (r) => !!r && !r.ended && (ahora() < r.fin || (ss && ss.speaking && ultimo === r && ahora() < r.fin + 8000));
  function ocupado() {
    if (suena(otro)) return true;
    let st = {};
    try { st = A.estado(); } catch (e) { /* nada */ }
    if (st.cine || st.charla || st.mamaHabla || st.visita || st.cargando) return true;
    const b = $('#burbujaNpc');
    return !!(b && !b.hidden && b.textContent.trim());
  }

  // ---------------------------------------------------------------- leer
  const historial = [];      // {texto, quien, t} (para pruebas y depurar)
  let pend = null;
  const vistos = new Map();  // texto → cuándo se leyó (no repetir lo mismo seguido)
  const limpiar = (t) => String(t || '')
    .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
    .replace(/\s*·\s*/g, ', ')
    .replace(/\s+/g, ' ').trim();
  function soltar(p) {
    marcando = { prio: p.prio, tipo: p.tipo };
    try {
      if (H.motor.hablar) H.motor.hablar(p.texto, p.quien); else A.hablar(p.texto, p.quien);
    } catch (e) { console.warn(e); }
    marcando = null;
    vistos.set(p.texto, ahora());
    historial.push({ texto: p.texto, quien: p.quien, tipo: p.tipo, t: ahora() });
    if (historial.length > 40) historial.shift();
  }
  function leer(texto, quien, o) {
    o = o || {};
    if (!activo()) return false;
    const t = limpiar(texto);
    if (!t) return false;
    const p = { texto: t, quien: quien || 'narrador', prio: o.prio || 1, tipo: o.tipo || '', t: ahora(), vence: o.vence || 9000 };
    if (!o.forzar && ahora() - (vistos.get(t) || 0) < 5000) return false;
    const narrando = suena(actual) && ultimo === actual;
    if ((!o.forzar && ocupado()) || (narrando && actual.prio > p.prio)) {
      if (!pend || pend.prio <= p.prio) pend = p;
      return 'espera';
    }
    if (pend && pend.prio <= p.prio) pend = null;
    soltar(p);
    return true;
  }
  function callar(tipo) {
    if (pend && (!tipo || pend.tipo === tipo)) pend = null;
    if (suena(actual) && ultimo === actual && (!tipo || actual.tipo === tipo)) {
      actual.ended = true;
      try { ss.cancel(); } catch (e) { /* nada */ }
    }
  }
  setInterval(() => {
    if (!pend) return;
    if (ahora() - pend.t > pend.vence || !activo()) { pend = null; return; }
    if (ocupado() || (suena(actual) && ultimo === actual)) return;
    const p = pend; pend = null;
    soltar(p);
  }, 200);

  // ---------------------------------------------------------------- íconos de las opciones
  const ICONOS = [
    [/dientes/, '🪥'], [/banarte|duchar|ducha|mojarte el pelo/, '🛁'], [/lavarte (la cara|las manos)|jabon/, '🧼'],
    [/servirle|su comida|croqueta/, '🦴'], [/patita|ruede|salude|palo|acariciar|llamarla|quieta|casita|perr|molly/, '🐶'],
    [/tender la cama|la cama/, '🛏️'], [/levantarme|levantarte/, '☀️'], [/dormir|siesta|minutos mas|buenas noches/, '😴'],
    [/fruta/, '🍎'], [/galleta/, '🍪'], [/agua|jugo/, '💧'], [/lavar.*plato|plato/, '🍽️'],
    [/desayun|almorz|cenar|comer|avena|\bpan\b|sandwich|delivery/, '🍽️'],
    [/\bpis\b|popo|bano/, '🚽'], [/examen|tarea|estudiar|matematica|cuaderno|mochila/, '✏️'], [/cuento|leer/, '📖'],
    [/dibujar/, '🎨'], [/futbol|pelota/, '⚽'], [/partida|ps5|consola/, '🎮'], [/tablet|celular|videos|dibujos/, '📱'],
    [/jugar|juego/, '🧸'], [/zapato/, '👟'], [/ropa|uniforme|vestir|ponerte|planchar|cesto|lavadora/, '👕'],
    [/espejo/, '🪞'], [/regar/, '🌱'], [/bus|colegio|clases/, '🚌'], [/salir|puerta/, '🚪'], [/escond/, '🙈'],
    [/flojera/, '💪'], [/respirar|mirar|mirador/, '👀'], [/guardar|ordenar|recoger/, '🧺'], [/perdon|fui yo|decir/, '💬'],
  ];
  function iconoDe(texto) {
    const t = norm(texto);
    for (const [re, ico] of ICONOS) if (re.test(t)) return ico;
    return '';
  }
  function decorar(d) {
    const cont = d.cont || $('#pOpciones');
    if (!cont) return;
    const ops = d.opciones || [];
    [...cont.children].forEach((b, i) => {
      const op = ops[i] || { cerrar: true, texto: (b.querySelector('.op-t') || b).textContent };
      const ico = op.icono || (op.cerrar ? (/entendido/i.test(op.texto) ? '👍' : '✋') : iconoDe(op.texto));
      if (ico && !b.querySelector('.op-ico')) {
        const s = document.createElement('span');
        s.className = 'op-ico'; s.setAttribute('aria-hidden', 'true');
        if (/^\s*</.test(ico)) s.innerHTML = ico; else s.textContent = ico;
        b.prepend(s);
        b.classList.add('con-ico');
      }
      if (!b.querySelector('.op-voz')) {
        // botoncito para escuchar la opción (no la elige)
        const v = document.createElement('span');
        v.className = 'op-voz'; v.setAttribute('role', 'button'); v.setAttribute('aria-label', 'Escuchar esta opción');
        v.textContent = '🔊';
        const oir = (e) => {
          e.preventDefault(); e.stopPropagation();
          const nota = b.querySelector('.op-n');
          leer(op.texto + (nota && nota.textContent ? '. ' + nota.textContent : ''), 'narrador', { prio: 4, forzar: true, tipo: 'opcion' });
          v.classList.remove('suena'); void v.offsetWidth; v.classList.add('suena');
        };
        v.addEventListener('click', oir);
        ['pointerdown', 'pointerup', 'mousedown', 'touchend'].forEach((ev) => v.addEventListener(ev, (e) => e.stopPropagation()));
        b.appendChild(v);
        b.classList.add('con-voz');
      }
    });
  }

  // ---------------------------------------------------------------- señalar
  const señalados = new Map();   // clave → {pos(), el, hasta, cerca}
  const V = A.THREE ? new A.THREE.Vector3() : null;
  function resolver(obj) {
    if (obj == null) return null;
    if (Array.isArray(obj)) return () => V.set(obj[0], 1.25, obj[1]);
    if (typeof obj === 'string') {
      const n = norm(obj);
      const it = ((A.escena && A.escena.inters) || []).find((i) => norm(i.nombre) === n)
        || ((A.escena && A.escena.inters) || []).find((i) => norm(i.nombre).includes(n));
      return it ? resolver(it) : null;
    }
    if (obj.en && obj.en.length >= 2) return () => V.set(obj.en[0], 1.3, obj.en[1]);
    if (obj.isObject3D || (obj.root && obj.root.isObject3D)) {
      const o3 = obj.isObject3D ? obj : obj.root;
      return () => { o3.getWorldPosition(V); V.y += 1.25; return V; };
    }
    if (typeof obj.x === 'number' && typeof obj.z === 'number') return () => V.set(obj.x, (obj.y || 0) + 1.25, obj.z);
    return null;
  }
  const claveDe = (obj) => (Array.isArray(obj) ? 'p:' + obj.join(',') : obj);
  function señalar(obj, on, o) {
    o = o || {};
    if (on === false) {
      if (obj == null) { [...señalados.keys()].forEach((k) => quitar(k)); return true; }
      return quitar(claveDe(obj));
    }
    const pos = resolver(obj);
    if (!pos || !V) return false;
    const k = o.clave || claveDe(obj);
    quitar(k);
    const el = document.createElement('div');
    el.className = 'voz-flecha';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="vf-anillo"></span><svg class="vf-punta" viewBox="0 0 40 48"><path d="M13 2h14v22h10L20 46 3 24h10z"/></svg>';
    document.body.appendChild(el);
    señalados.set(k, { pos, el, hasta: o.seg ? ahora() + o.seg * 1000 : 0, cerca: o.cerca !== false, escena: A.escena });
    if (!rafOn) { rafOn = true; requestAnimationFrame(pintarFlechas); }
    return true;
  }
  function quitar(k) {
    const s = señalados.get(k);
    if (!s) return false;
    s.el.remove();
    señalados.delete(k);
    return true;
  }
  let rafOn = false;
  function pintarFlechas() {
    if (!señalados.size) { rafOn = false; return; }
    requestAnimationFrame(pintarFlechas);
    const cam = A.camara, cv = $('#juego');
    let st = {};
    try { st = A.estado(); } catch (e) { /* nada */ }
    const estorba = st.panel || st.accion || st.cine || st.cargando || st.charla || !st.jugando;
    const r = cv ? cv.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    señalados.forEach((s, k) => {
      if (s.hasta && ahora() > s.hasta) { quitar(k); return; }
      if (s.escena !== A.escena) { quitar(k); return; }
      let p;
      try { p = s.pos(); } catch (e) { p = null; }
      // llegó: ya no hace falta (se ve la etiqueta del objeto)
      const cerca = p && A.P && s.cerca && Math.hypot(A.P.root.position.x - p.x, A.P.root.position.z - p.z) < 1.1;
      if (!p || !cam || estorba || cerca) { s.el.classList.add('oculta'); return; }
      const q = p.clone().project(cam);
      let x = (q.x * 0.5 + 0.5) * r.width, y = (-q.y * 0.5 + 0.5) * r.height;
      const detras = q.z > 1;
      if (detras) { x = r.width - x; y = r.height - 40; }
      const m = 44, fuera = detras || x < m || x > r.width - m || y < m || y > r.height - m;
      let rot = 0;
      if (fuera) {
        const cx = r.width / 2, cy = r.height / 2;
        rot = Math.atan2(y - cy, x - cx) * 180 / Math.PI - 90;
        x = Math.min(r.width - m, Math.max(m, x)); y = Math.min(r.height - m, Math.max(m, y));
      }
      s.el.classList.remove('oculta');
      s.el.classList.toggle('borde', fuera);
      s.el.style.transform = `translate(${(r.left + x).toFixed(1)}px, ${(r.top + y).toFixed(1)}px) rotate(${fuera ? rot.toFixed(0) : 0}deg)`;
    });
  }
  // ¿el texto nombra un objeto de aquí cerca? lo señala
  const GENERICAS = new Set(['salida', 'casa', 'esconderte', 'tropiezo']);
  function mencion(texto) {
    const t = norm(texto);
    const inters = (A.escena && A.escena.inters) || [];
    let mejor = null, dm = 8;
    inters.forEach((it) => {
      if (!it || !it.nombre || !it.en) return;
      const pal = norm(it.nombre).split(/[^a-zñ0-9]+/).filter((w) => w.length >= 4 && !GENERICAS.has(w))[0];
      if (!pal || !new RegExp('\\b' + pal).test(t)) return;
      const d = A.P ? Math.hypot(A.P.root.position.x - it.en[0], A.P.root.position.z - it.en[1]) : 0;
      if (d < dm) { dm = d; mejor = it; }
    });
    return mejor;
  }

  // ---------------------------------------------------------------- qué se lee solo
  A.alEvento((tipo, d) => {
    if (tipo === 'panel' && d) {
      decorar(d);
      const def = d.def || {};
      leer([def.titulo, def.texto].filter(Boolean).join('. '), 'narrador', { prio: 3, tipo: 'panel' });
    }
    if (tipo === 'sorpresa' && d && d.texto) leer(d.texto, 'narrador', { prio: 2, tipo: 'sorpresa' });
  });
  A.alConstruir(() => { señalar(null, false); });

  function observar(sel, opts, fn) {
    const el = $(sel);
    if (el) new MutationObserver(fn).observe(el, opts);
    return el;
  }
  function iniciar() {
    // panel cerrado: deja de leerlo
    observar('#panel', { attributes: true, attributeFilter: ['hidden'] }, () => { if ($('#panel').hidden) callar('panel'); });
    // avisos (no los números sueltos tipo "+3 ánimo")
    observar('#aviso', { childList: true }, (muts) => muts.forEach((m) => m.addedNodes.forEach((n) => {
      const t = (n.textContent || '').trim();
      if (!t || /^[+−-]\s?\d/.test(t)) return;
      leer(t, 'narrador', { prio: n.classList && n.classList.contains('mal') ? 2 : 1, tipo: 'aviso' });
      const it = mencion(t);
      if (it) señalar(it, true, { seg: 6, clave: 'aviso' });
    })));
    // banners de logro
    observar('#logros', { childList: true }, (muts) => muts.forEach((m) => m.addedNodes.forEach((n) => {
      if (!n.querySelector) return;
      const partes = ['small', 'b', '.l-txt > span'].map((s) => n.querySelector(s)).filter(Boolean).map((e) => e.textContent.trim()).filter(Boolean);
      if (partes.length) leer(partes.join('. '), 'narrador', { prio: 2, tipo: 'banner' });
    })));
    // guía del tutorial: lee cada paso y señala lo que nombra
    const leerGuia = () => {
      const g = $('#guia');
      if (!g || g.hidden) { quitar('guia'); return; }
      const t = ($('#gTexto') || {}).textContent || '';
      let st = {};
      try { st = A.estado(); } catch (e) { /* nada */ }
      leer(t, 'narrador', { prio: st.panel ? 2 : 3, tipo: 'guia' });
      const it = mencion(t);
      if (it) señalar(it, true, { clave: 'guia' }); else quitar('guia');
    };
    observar('#gTexto', { childList: true, characterData: true, subtree: true }, leerGuia);
    observar('#guia', { attributes: true, attributeFilter: ['hidden'] }, leerGuia);
    // tarjeta del día: interruptor y "Hoy: …"
    const cap = $('#capitulo');
    if (cap) {
      ponerAjuste();
      const alMostrar = () => {
        if (cap.hidden) { callar('tarjeta'); return; }
        ponerAjuste();
        leerTarjeta();
      };
      observar('#capitulo', { attributes: true, attributeFilter: ['hidden'] }, alMostrar);
      if (!cap.hidden) alMostrar();
    }
  }
  function leerTarjeta(forzar) {
    const hoy = $('#capHoy'), sor = $('#capSorpresa');
    const t = [hoy && hoy.textContent, sor && !sor.hidden && sor.textContent].filter(Boolean).join('. ');
    return leer(t, 'narrador', { prio: 3, tipo: 'tarjeta', forzar });
  }
  function ponerAjuste() {
    if ($('#capLeer')) { pintarAjuste(); return; }
    const caja = $('#capAjustes');
    if (!caja) return;
    const d = document.createElement('div');
    d.className = 'voz-ajuste';
    d.id = 'capLeer';
    d.innerHTML = '<span class="cap-ajustes-t">¿Te leo en voz alta?</span>'
      + '<span class="voz-ajuste-g" role="group" aria-label="Leer en voz alta">'
      + '<button class="btn sec voz-b" type="button" id="capLeerSi" aria-pressed="false">🔊 Sí, léeme</button>'
      + '<button class="btn sec voz-b" type="button" id="capLeerNo" aria-pressed="false">🔇 No</button></span>';
    caja.after(d);
    $('#capLeerSi').addEventListener('click', () => { setActivo(true); leerTarjeta(true); });
    $('#capLeerNo').addEventListener('click', () => setActivo(false));
    pintarAjuste();
  }
  function pintarAjuste() {
    const on = activo();
    [['#capLeerSi', on], ['#capLeerNo', !on]].forEach(([s, a]) => {
      const b = $(s);
      if (!b) return;
      b.classList.toggle('activo', a); b.classList.toggle('sec', !a);
      b.setAttribute('aria-pressed', String(a));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else setTimeout(iniciar, 0);

  // ---------------------------------------------------------------- API
  A.leer = (texto, quien, o) => leer(texto, quien || 'narrador', o);
  A.callar = () => callar();
  A.señalar = (obj, on, o) => señalar(obj, on, o);
  A.senalar = A.señalar;
  H.voz = {
    leer: A.leer, callar: A.callar, señalar: A.señalar, activo, setActivo, iconoDe, historial, ocupado,
    señalados: () => señalados.size, leerTarjeta,
  };
})();
