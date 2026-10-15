/* La tarea del colegio (la deja la profe en colegio.js: progreso.colegio.tarea) y la práctica del escritorio.
   - Matemática: sumas y restas de 2 y 3 cifras (con y sin canje) y problemas cortos, con teclado de números.
     Si te equivocas, tu cachorro te explica: con dibujos (números chicos) o en columnas (llevar / prestar).
   - Comunicación, Ciencia y Personal Social: preguntas de opción múltiple o completar, con una explicación simple.
   Sin tarea del colegio, el escritorio practica sumas y restas chiquitas (como antes).
   ---- lo de antes:
   La tarea de matemáticas de la tarde: 6 ejercicios de sumas y restas (2.º grado).
   Se responde con un teclado de números. Si te equivocas, tu cachorro te explica con un dibujo:
   huesos para sumar, pelotas que se pierden para restar, y el truco de "completar 10".
   Después de la explicación practicas uno parecido. Lo que aciertes al primer intento cuenta para
   la confianza de tus papás y la motivación; el tiempo que te demores se suma al reloj del juego. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.motor.nino) return;
  const A = H.motor.api;
  const $ = (s) => document.querySelector(s);

  const N = 6;
  const MIN = { ejercicio: 4, leccion: 3, repaso: 2 };
  const nom = () => (A.perfil ? A.perfil.mascota.nombre : 'tu cachorro');
  const color = () => (A.perfil ? A.perfil.mascota.color : '#c98a4b');
  const azar = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  // ---------- ejercicios para 7 años (los primeros, más fáciles)
  function ejercicio(i, tipo) {
    const suma = tipo ? tipo === '+' : i % 2 === 0;
    const facil = i < 2;
    if (suma) {
      const a = azar(2, facil ? 6 : 9), b = azar(1, facil ? 10 - a : 9);
      return { a, b, op: '+', r: a + b };
    }
    const a = azar(facil ? 5 : 8, facil ? 10 : 15), b = azar(1, facil ? a - 1 : Math.min(9, a - 1));
    return { a, b, op: '−', r: a - b };
  }

  // ---------- dibujos
  const HUESO = (c) => `<svg viewBox="0 0 40 18" class="tr-cosa"><path d="M7 3a4 4 0 0 1 6 2h14a4 4 0 1 1 6 4 4 4 0 1 1-6 4H13a4 4 0 1 1-6-4A4 4 0 0 1 7 3z" fill="${c}" stroke="#1d2340" stroke-width="1.6"/></svg>`;
  const PELOTA = (c) => `<svg viewBox="0 0 20 20" class="tr-cosa"><circle cx="10" cy="10" r="8" fill="${c}" stroke="#1d2340" stroke-width="1.6"/><path d="M3 9c4-2 10-2 14 0" fill="none" stroke="#1d2340" stroke-width="1.2"/></svg>`;
  const PERRO = () => {
    const c = color(), claro = c === '#f1ece2';
    const oreja = claro ? '#c98a4b' : c === '#2b2420' ? '#4a3d35' : '#5b4636';
    return `<svg viewBox="0 0 120 90" class="tr-perro" aria-hidden="true">
      <ellipse cx="62" cy="58" rx="34" ry="18" fill="${c}" stroke="#1d2340" stroke-width="2.5"/>
      <rect x="36" y="64" width="9" height="20" rx="4" fill="${c}" stroke="#1d2340" stroke-width="2.5"/>
      <rect x="78" y="64" width="9" height="20" rx="4" fill="${c}" stroke="#1d2340" stroke-width="2.5"/>
      <path d="M95 52 q16 -14 12 -26" fill="none" stroke="#1d2340" stroke-width="6" stroke-linecap="round"/>
      <path d="M95 52 q16 -14 12 -26" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="30" cy="38" r="19" fill="${c}" stroke="#1d2340" stroke-width="2.5"/>
      <ellipse cx="17" cy="34" rx="7" ry="13" fill="${oreja}" stroke="#1d2340" stroke-width="2.5" transform="rotate(20 17 34)"/>
      <ellipse cx="18" cy="46" rx="9" ry="6" fill="#f1ece2" stroke="#1d2340" stroke-width="2"/>
      <circle cx="12" cy="44" r="3" fill="#1d2340"/><circle cx="29" cy="34" r="2.6" fill="#1d2340"/>
      <path d="M14 50 q5 6 10 1" fill="#e46d7b" stroke="#1d2340" stroke-width="1.5"/>
    </svg>`;
  };
  // cada cosa lleva su número, que aparece uno por uno (como contando con el dedo)
  function cosas(n, dibujo, desde, opciones) {
    const o = opciones || {};
    return Array.from({ length: n }, (_, k) => {
      const num = desde + k, tachada = o.tachar && k >= n - o.tachar;
      const retraso = (o.retraso || 0) + k * 0.28;
      return `<span class="tr-item${tachada ? ' tachada' : ''}" style="--d:${retraso.toFixed(2)}s${tachada ? `;--dt:${(0.6 + (k - (n - o.tachar)) * 0.4).toFixed(2)}s` : ''}">${dibujo}<i>${tachada ? '' : num}</i></span>`;
    }).join('');
  }
  const CI = () => (H.colegio && H.colegio.cuentaInfo) || null;
  const grande = (e) => e.tipo === 'num' && (e.a >= 10 || e.b >= 10) && !!CI();
  function columnas(e) {
    const info = CI()(e.a, e.b, e.op);
    const fila = (num, signo, cls) => `<div class="tr-fila ${cls || ''}"><span class="tr-sig">${signo || ''}</span>${String(num).padStart(info.n, ' ').split('').map((d) => `<i>${d.trim()}</i>`).join('')}</div>`;
    const lleva = Array.from({ length: info.n }, (_, k) => { const i = info.n - 1 - k; const m = info.marcas.filter((x) => x.col === i).pop(); return m ? m.t : ''; });
    const res = info.res.slice().reverse().map((d) => (d == null ? '' : String(d))).join('');
    return {
      info,
      html: `<div class="tr-cuenta"><div class="tr-fila tr-lleva"><span class="tr-sig"></span>${lleva.map((t) => `<i>${t}</i>`).join('')}</div>${fila(e.a)}${fila(e.b, e.op)}<div class="tr-raya"></div>${fila(res.padStart(info.n, ' '), '', 'tr-res')}</div>`
        + `<ol class="tr-pasos">${info.pasos.map((p, k) => `<li style="--d:${(0.4 + k * 0.9).toFixed(1)}s">${p}</li>`).join('')}</ol>`,
    };
  }
  function leccion(e) {
    const n = nom();
    if (e.tipo === 'op') {
      return {
        globo: `Mira: ${e.exp}`,
        dibujo: `${e.lectura ? `<p class="tr-lectura">${e.lectura}</p>` : ''}<b class="tr-total tr-total-txt">${e.ops[e.r]}</b>`,
        truco: `Recuerda: ${e.q} → ${e.ops[e.r]}.`,
        voz: e.exp,
      };
    }
    if (grande(e)) {
      const c = columnas(e);
      const lleva = e.op === '+' ? c.info.marcas.length > 0 : c.info.marcas.length > 0;
      return {
        globo: `${e.texto ? `${e.op === '+' ? 'Si juntamos, sumamos' : 'Si quitamos, restamos'}. ` : ''}Hagámoslo en columnas, como en la pizarra: primero las unidades, después las decenas${c.info.n > 2 ? ' y las centenas' : ''}.`,
        dibujo: c.html,
        truco: e.op === '+'
          ? (lleva ? 'Truco: si una columna suma 10 o más, escribes las unidades y llevas 1 a la columna de al lado.' : 'Truco: suma columna por columna, empezando por la derecha.')
          : (lleva ? 'Truco: si arriba hay menos que abajo, pides prestada 1 decena: son 10 unidades más.' : 'Truco: resta columna por columna, empezando por la derecha. El número grande va arriba.'),
        voz: `${e.a} ${e.op === '+' ? 'más' : 'menos'} ${e.b} son ${e.r}.`,
      };
    }
    if (e.op === '+') {
      const grande = Math.max(e.a, e.b), chico = Math.min(e.a, e.b);
      const conteo = Array.from({ length: chico }, (_, k) => grande + k + 1).join(', ');
      const truco = e.r > 10 && grande < 10
        ? `Truco: completa 10. ${grande} + ${10 - grande} = 10, y te quedan ${chico - (10 - grande)}. Entonces 10 + ${chico - (10 - grande)} = ${e.r}.`
        : `Truco: empieza en el número grande (${grande}) y cuenta ${chico} más con los dedos: ${conteo}.`;
      return {
        globo: `Imagina que tengo ${e.a} huesos y me das ${e.b} más. ¿Cuántos tengo ahora? ¡Contemos todos juntos!`,
        dibujo: `<div class="tr-grupo">${cosas(e.a, HUESO('#f4efe4'), 1)}</div><b class="tr-signo">+</b><div class="tr-grupo">${cosas(e.b, HUESO('#f2c14e'), e.a + 1, { retraso: e.a * 0.28 })}</div><b class="tr-signo">=</b><b class="tr-total">${e.r}</b>`,
        truco,
        voz: `${e.a} huesos y ${e.b} más son ${e.r}.`,
      };
    }
    const abajo = Array.from({ length: e.b }, (_, k) => e.a - k - 1).join(', ');
    return {
      globo: `Tenía ${e.a} pelotas y se me perdieron ${e.b} en el jardín. ¿Cuántas me quedan? Tachemos las que se perdieron.`,
      dibujo: `<div class="tr-grupo">${cosas(e.a, PELOTA('#de5546'), 1, { tachar: e.b })}</div><b class="tr-signo">=</b><b class="tr-total">${e.r}</b>`,
      truco: `Truco: cuenta hacia atrás desde ${e.a}, ${e.b} ${e.b === 1 ? 'vez' : 'veces'}: ${abajo}. Te quedas en ${e.r}.`,
      voz: `${e.a} menos ${e.b} son ${e.r}.`,
      quien: n,
    };
  }

  // ---------- pantalla
  document.body.insertAdjacentHTML('beforeend', `
<div class="pantalla tarea" id="tarea" hidden><div class="hoja tr-hoja" role="dialog" aria-labelledby="trTitulo">
  <header class="tr-cab">
    <div><p class="eyebrow" id="trEyebrow">Tarea de matemáticas · 2.º grado</p><h2 id="trTitulo">Tu cuaderno</h2></div>
    <div class="tr-avance"><span id="trProg"></span><span class="tr-puntos" id="trPuntos"></span></div>
  </header>
  <section id="trEjercicio">
    <p class="tr-lectura" id="trLectura" hidden></p>
    <p class="tr-problema" id="trProblema" hidden></p>
    <div class="tr-pregunta" id="trPreg"></div>
    <div class="tr-ops" id="trOps" hidden></div>
    <p class="tr-msg" id="trMsg" aria-live="polite"></p>
    <div class="tr-teclado" id="trTeclado">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button type="button" data-d="${d}">${d}</button>`).join('')}
      <button type="button" data-d="borrar" aria-label="Borrar">⌫</button>
      <button type="button" data-d="0">0</button>
      <button type="button" data-d="listo" class="tr-listo">Listo</button>
    </div>
  </section>
  <section id="trLeccion" hidden>
    <div class="tr-molly"><span id="trPerro"></span><p class="tr-globo" id="trGlobo"></p></div>
    <div class="tr-dibujo" id="trDibujo"></div>
    <p class="tr-truco" id="trTruco"></p>
    <button class="btn" type="button" id="trOtra">Ahora inténtalo tú</button>
  </section>
  <section id="trFin" hidden>
    <div class="tr-molly"><span id="trPerroFin"></span><p class="tr-globo" id="trGloboFin"></p></div>
    <p class="tr-resultado" id="trResultado"></p>
    <button class="btn" type="button" id="trCerrar">Guardar el cuaderno en la mochila</button>
  </section>
</div></div>`);

  let T = null;   // tarea en curso

  // o.estudio: estudiar por tu cuenta en el escritorio (no es la tarea del colegio)
  // o.solo: tu cachorro no está contigo, así que nadie te explica con dibujos
  // o.ejercicios: los de la tarea (colegio.js) o de la práctica · o.tarea: es la tarea del colegio
  // o.cursoNombre / o.titulo: para el encabezado · o.tema: lo que se practica (para la revisión)
  function abrir(alTerminar, o) {
    o = o || {};
    const lista = Array.isArray(o.ejercicios) && o.ejercicios.length ? o.ejercicios.map((x) => Object.assign({}, x)) : null;
    T = { i: 0, primera: 0, minutos: 0, e: null, resp: '', intento: 0, repaso: false, fin: alTerminar, hambre: A.S.energia < 25, estudio: !!o.estudio, solo: !!o.solo,
      lista, n: lista ? lista.length : N, tarea: !!o.tarea, curso: o.curso || 'matematica', tema: o.tema || null };
    const curso = o.cursoNombre || 'Matemática';
    $('#trEyebrow').textContent = T.estudio ? `Estudiar en tu escritorio${T.solo ? ' · tú solo' : ` · con ${nom()}`}` : `Tarea de ${curso} · 2.º grado`;
    $('#trTitulo').textContent = T.estudio ? (o.titulo ? `Practicar: ${o.titulo}` : 'Practicar matemáticas') : (o.titulo || 'Tu cuaderno');
    $('#trCerrar').textContent = T.estudio ? 'Cerrar el cuaderno' : 'Guardar el cuaderno en la mochila';
    $('#trPerroFin').hidden = T.solo;
    A.bloquear('tarea', true);
    $('#tarea').hidden = false;
    $('#trPerro').innerHTML = PERRO();
    $('#trPerroFin').innerHTML = PERRO();
    $('#tarea .tr-hoja').classList.toggle('hambre', T.hambre);
    siguiente();
  }
  function siguiente() {
    if (T.i >= T.n) { terminar(); return; }
    T.e = T.lista ? Object.assign({}, T.lista[T.i]) : ejercicio(T.i);
    T.intento = 0; T.repaso = false;
    T.minutos += MIN.ejercicio;
    mostrarEjercicio();
  }
  function mostrarEjercicio() {
    $('#trEjercicio').hidden = false; $('#trLeccion').hidden = true; $('#trFin').hidden = true;
    T.resp = '';
    $('#trProg').textContent = T.repaso ? 'Práctica' : `Ejercicio ${T.i + 1} de ${T.n}`;
    $('#trPuntos').innerHTML = Array.from({ length: T.n }, (_, k) => `<i class="${k < T.i ? 'hecho' : k === T.i ? 'ahora' : ''}"></i>`).join('');
    $('#trMsg').textContent = T.repaso ? `Uno parecido para practicar lo que te explicó ${nom()}.` : T.hambre ? 'Tienes hambre: te cuesta concentrarte.' : '';
    $('#trMsg').className = 'tr-msg';
    pintarRespuesta();
  }
  function pintarRespuesta() {
    const e = T.e, op = e.tipo === 'op';
    $('#trTeclado').hidden = op;
    $('#trOps').hidden = !op;
    $('#trLectura').hidden = !e.lectura;
    $('#trLectura').textContent = e.lectura || '';
    $('#trProblema').hidden = !e.texto;
    $('#trProblema').textContent = e.texto || '';
    $('#trPreg').classList.toggle('tr-preg-txt', op);
    if (op) {
      $('#trPreg').textContent = e.q;
      const cont = $('#trOps');
      cont.innerHTML = e.ops.map((v, k) => `<button class="op tr-op" type="button" data-k="${k}"><kbd>${k + 1}</kbd><span class="op-t"></span></button>`).join('');
      [...cont.children].forEach((b, k) => { b.querySelector('.op-t').textContent = e.ops[k]; });
      return;
    }
    $('#trPreg').innerHTML = `${e.a} ${e.op} ${e.b} = <span class="tr-resp${T.resp ? '' : ' vacia'}">${T.resp || '?'}</span>`;
  }
  function elegir(k) {
    if (!T || $('#trEjercicio').hidden || T.esperando || T.e.tipo !== 'op') return;
    T.resp = String(k);
    const b = $('#trOps').children[k];
    if (b) b.classList.add(k === T.e.r ? 'correcta' : 'mala');
    revisar();
  }
  function tecla(d) {
    if (!T || $('#trEjercicio').hidden || T.esperando) return;
    if (d === 'borrar') T.resp = T.resp.slice(0, -1);
    else if (d === 'listo') { revisar(); return; }
    else if (T.resp.length < 4) T.resp += d;
    A.sfx('click');
    pintarRespuesta();
  }
  function revisar() {
    if (!T.resp) return;
    const e = T.e, bien = Number(T.resp) === e.r;
    const verResp = (x) => (e.tipo === 'op' ? `"${e.ops[x]}"` : x);
    const msg = $('#trMsg');
    if (bien) {
      if (T.intento === 0 && !T.repaso) T.primera++;
      msg.textContent = T.repaso ? `¡Eso! ${nom()} está feliz: ya lo entendiste.` : ['¡Muy bien!', '¡Correcto!', '¡Excelente!', '¡Así se hace!'][T.i % 4];
      msg.className = 'tr-msg bien';
      A.sfx('bien');
      T.esperando = true;
      setTimeout(() => { T.esperando = false; T.i++; siguiente(); }, 1000);
      return;
    }
    T.intento++;
    A.sfx('mal');
    msg.className = 'tr-msg mal';
    if (T.solo) {
      // sin tu cachorro nadie te explica: ves la respuesta y sigues
      msg.textContent = `Era ${verResp(e.r)}. Si ${nom()} estuviera contigo, te lo explicaría.`;
      T.esperando = true;
      setTimeout(() => { T.esperando = false; T.i++; siguiente(); }, 2200);
    } else if (T.intento === 1 && !T.repaso) {
      msg.textContent = e.tipo === 'op' ? `Casi… no es ${verResp(+T.resp)}. ${nom()} te va a explicar.` : `Casi… ${e.a} ${e.op} ${e.b} no es ${T.resp}. ${nom()} te va a explicar.`;
      T.esperando = true;
      setTimeout(() => { T.esperando = false; mostrarLeccion(); }, 1300);
    } else {
      // segundo error: se muestra la respuesta y se explica otra vez
      msg.textContent = `Era ${verResp(e.r)}. Mira otra vez cómo se hace.`;
      T.esperando = true;
      setTimeout(() => { T.esperando = false; mostrarLeccion(); }, 1500);
    }
    T.resp = '';
    if (e.tipo !== 'op') pintarRespuesta();
  }
  function mostrarLeccion() {
    const l = leccion(T.e);
    T.minutos += MIN.leccion;
    $('#trEjercicio').hidden = true; $('#trLeccion').hidden = false;
    $('#trGlobo').textContent = `${nom()}: "${l.globo}"`;
    $('#trDibujo').innerHTML = l.dibujo;
    $('#trTruco').textContent = l.truco;
    // la cachorrita explica con su vocecita tierna (un ladridito y luego habla)
    A.sfx('guauTierno');
    setTimeout(() => { if (T) A.hablar(l.voz, 'perrita'); }, 380);
    $('#trOtra').focus();
  }
  function practicar() {
    // uno parecido (mismo tipo de cuenta); en las preguntas, la misma con las opciones en otro orden
    if (T.e.tipo === 'op') {
      const correcta = T.e.ops[T.e.r], ops = T.e.ops.slice().sort(() => Math.random() - 0.5);
      T.e = Object.assign({}, T.e, { ops, r: ops.indexOf(correcta) });
    } else T.e = (H.colegio && H.colegio.parecido(T.e)) || ejercicio(Math.max(2, T.i), T.e.op === '+' ? '+' : '-');
    T.intento = 0; T.repaso = true;
    T.minutos += MIN.repaso;
    mostrarEjercicio();
  }
  function terminar() {
    $('#trEjercicio').hidden = true; $('#trLeccion').hidden = true; $('#trFin').hidden = false;
    const p = T.primera, n = nom(), N = T.n;
    const frase = p >= N - 1 ? `¡Lo hiciste increíble! ${p} de ${N} al primer intento.`
      : p >= N / 2 ? `¡Bien! ${p} de ${N} al primer intento, y aprendiste los demás.`
        : `Te costó, pero aprendiste: ${p} de ${N} al primer intento. Mañana te va a salir mejor.`;
    $('#trGloboFin').textContent = T.solo ? frase : `${n}: "${frase}"`;
    if (!T.solo) { A.sfx('guauTierno'); setTimeout(() => A.hablar(frase, 'perrita'), 380); }
    $('#trResultado').textContent = `Te tomó ${T.minutos} minutos.`;
    A.sfx(p >= 3 ? 'logro' : 'bien');
    $('#trCerrar').focus();
  }
  function cerrar() {
    if (!T) return;
    const t = T;
    T = null;
    $('#tarea').hidden = true;
    A.bloquear('tarea', false);
    A.S.min += t.minutos;
    const p = t.primera, N = t.n, alto = p >= N - 1, medio = p >= N / 2;
    if (t.estudio) {
      A.cambiar(medio ? { motivacion: 5, animo: 3 } : { motivacion: 2 });
      A.anotar(`Estudiaste en tu escritorio${t.solo ? '' : ` con ${nom()}`}: ${p} de ${N} bien al primer intento.`, 'bien');
      A.habito('Estudiar en casa');
      if (t.tema && H.colegio) H.colegio.practicado(t.tema);
      A.evento('estudio', { primera: p, total: N, conPerro: !t.solo, curso: t.curso, tema: t.tema });
      if (t.fin) t.fin(alto);
      return;
    }
    A.S.f.tareaCalidad = p / N;
    if (t.tarea && H.colegio) H.colegio.tareaHecha(p, N);
    A.cambiar(alto ? { confianza: 10, motivacion: 6, animo: 5 } : medio ? { confianza: 7, motivacion: 3, animo: 3 } : { confianza: 4, animo: -2 });
    if (alto && t.curso === 'matematica') A.habito('Practicar matemáticas');
    A.anotar(`Tarea: ${p} de ${N} ejercicios bien al primer intento (${t.minutos} min).`, medio ? 'bien' : '');
    A.evento('tarea', { primera: p, total: N, curso: t.curso });
    if (t.fin) t.fin(alto);
  }

  // ---------- teclado y botones
  $('#trTeclado').addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b) tecla(b.dataset.d); });
  $('#trOps').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) elegir(+b.dataset.k); });
  $('#trOtra').addEventListener('click', practicar);
  $('#trCerrar').addEventListener('click', cerrar);
  A.alTecla((e) => {
    if (!T) return false;
    if (!$('#trEjercicio').hidden && T.e && T.e.tipo === 'op') {
      if (/^[1-9]$/.test(e.key) && +e.key <= T.e.ops.length) elegir(+e.key - 1);
    } else if (!$('#trEjercicio').hidden) {
      if (/^[0-9]$/.test(e.key)) tecla(e.key);
      else if (e.key === 'Backspace') tecla('borrar');
      else if (e.key === 'Enter' || e.code === 'Space') tecla('listo');
    } else if (!$('#trLeccion').hidden && (e.key === 'Enter' || e.code === 'Space')) practicar();
    else if (!$('#trFin').hidden && (e.key === 'Enter' || e.code === 'Space')) cerrar();
    return true;   // mientras haces la tarea, el teclado es solo para el cuaderno
  });

  // ---------- el escritorio de tu cuarto: estudiar cuando quieras (mejor con tu cachorro al lado)
  A.alConstruir((nombre, E) => {
    if (nombre !== 'dormitorio') return;
    E.inters.push(A.etiquetaInter('Escritorio', [2.95, 0.05], [3.3, -1.0], 0.8, {
      activo: () => !T,
      abrir: () => {
        const P = H.perro, D = P && P.D, conPerro = !!D && P.modo === 'sigue' && P.necesidades.energia >= 20;
        const sentarse = { ruta: [[2.2, -0.3], [2.45, -0.95]], mira: [3.3, -1.0], anim: 'leer', sentado: true, dur: 1.0, min: 0, progreso: 'Sentándote a estudiar' };
        // lo que se practica: la tarea pendiente o la última clase (colegio.js); si no, sumas y restas chiquitas
        const pr = H.colegio && H.colegio.paraPracticar();
        const que = pr ? pr.titulo.toLowerCase() : 'matemáticas';
        const ops = [{
          texto: conPerro ? `Repasar ${que} con ${nom()}` : `Repasar ${que} tú solo`,
          nota: conPerro ? `${nom()} se sienta a tu lado y te explica con dibujos cuando te equivocas.` : `Si te equivocas, nadie te explica. Silba (F) para que ${nom()} venga a ayudarte.`,
          min: 0, esfuerzo: false, bloqueado: A.S.energia < 15 ? 'Estás sin energía para concentrarte.' : null,
          pasos: [sentarse],
          alTerminar: () => {
            if (conPerro && P.D) { P.D.root.position.set(2.35, 0, -0.2); P.D.root.rotation.y = PI_2; P.D.anim = 'feliz'; }
            abrir(() => { A.refrescar(); }, pr
              ? { estudio: true, solo: !conPerro, ejercicios: pr.ejercicios(), curso: pr.curso, cursoNombre: pr.cursoNombre, titulo: pr.titulo, tema: pr.tema }
              : { estudio: true, solo: !conPerro });
          },
        }, {
          texto: 'Dibujar un rato', nota: 'Dibujas lo que quieras. Te relaja.', min: 15, ef: { animo: 8, motivacion: 4 }, esfuerzo: false,
          pasos: [Object.assign({}, sentarse, { anim: 'cocinar', dur: 3.0, min: 15, progreso: 'Dibujando' })],
          alTerminar: () => {
            A.decir(A.P, ['¡Dibujé a ' + nom() + '!', '¡Me quedó bonito!', 'Dibujé nuestra casa.'][Math.floor(A.S.min / 41) % 3], 2.4);
            if (H.pintar) H.pintar.abrir({ titulo: 'Mi dibujo' });   // la hoja para dibujar de verdad (pintar.js)
          },
        }];
        const t = H.colegio && H.colegio.tarea();
        const extra = t && !t.hecha ? ` Practicar ayuda: mañana la profe revisa tu tarea.` : '';
        return { titulo: 'Tu escritorio', texto: (conPerro ? `${nom()} está contigo, lista para ayudarte.` : 'Tus cuadernos y tus lápices de colores.') + extra, opciones: ops };
      },
    }));
  });
  const PI_2 = Math.PI / 2;

  H.tarea = { abrir, get abierta() { return !!T; }, get estado() { return T; } };
})();
