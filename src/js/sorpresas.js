/* Sorpresas: regalos y elogios INESPERADOS que premian el esfuerzo.
   - No es un pago por tarea: casi nunca pasa, y nunca se sabe cuándo. Por eso se siente lindo.
   - Escucha lo que hace el niño (A.alEvento: habito, tarea, estudio, gol, piscinaReto, sotanoLlave,
     feria, escondidas) y, de vez en cuando, al azar, alguien lo nota: la cachorrita le trae un
     regalito, mamá o papá le dejan una notita, la abuela llama por teléfono o se enciende una estrellita.
   - El elogio nombra el esfuerzo concreto ("te costó, pero lo terminaste"), no un premio por hacerlo.
   - Probabilidad baja, enfriamiento de varios minutos de juego y máximo MAX_DIA por día de juego.
   - Nunca aparece con paneles, acciones, cinemáticas, visitas, charla de la noche, fútbol, piscina,
     escondidas ni mientras controlas a la cachorrita.
   - A veces trae un premio de verdad con H.premios.dar(id, 'sorpresa') (si H.premios existe).
   Emite A.evento('sorpresa', { texto, premio, quien, esfuerzo }).
   Pruebas: H.sorpresas.forzar() (siempre sale, sin enfriamiento ni espera; el máximo diario se respeta). */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api) return;
  const A = H.motor.api;

  const PROB = 0.2;            // probabilidad por esfuerzo
  const ENFRIA = 240;          // segundos de juego entre sorpresas
  const INICIO = 90;           // segundos de juego antes de la primera del día
  const MAX_DIA = 3;           // máximo por día de juego
  const ESPERA = [5, 10];      // segundos de juego entre el esfuerzo y la sorpresa
  const VENCE = 180;           // si no hay un momento tranquilo en este tiempo, se olvida
  const PREMIO_PROB = 0.35;    // de las sorpresas, cuántas traen un premio de verdad

  const nina = () => !!(A.perfil && A.perfil.genero === 'nina');
  const gx = (o, a) => (nina() ? a : o);
  const nombre = () => (A.perfil && A.perfil.nombre) || 'Dani';
  const perrita = () => (A.perfil && A.perfil.mascota && A.perfil.mascota.nombre) || 'Molly';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const elegir = (l) => l[Math.floor(Math.random() * l.length)];
  const CASA = ['dormitorio', 'pasillo', 'bano', 'comedor', 'sala', 'jardin'];

  const R = { juego: 0, ultima: -1e9, pend: null, forzada: false, tarjeta: null, tTarjeta: 0 };

  // ---------------------------------------------------------------- cuántas van hoy (se guarda)
  const claveDia = () => {
    const p = H.progreso ? H.progreso.cargar() : {};
    return (p.capitulo || 1) + '-' + (p.dia || 1);
  };
  function guardado() {
    const p = H.progreso ? H.progreso.cargar() : {};
    const s = p.sorpresas && typeof p.sorpresas === 'object' ? p.sorpresas : {};
    return { dia: s.dia || '', n: s.n || 0, total: s.total || 0, recuerdos: Array.isArray(s.recuerdos) ? s.recuerdos : [] };
  }
  const hoyN = () => { const s = guardado(); return s.dia === claveDia() ? s.n : 0; };
  function anotarSorpresa(texto, quien) {
    const s = guardado(), k = claveDia();
    const n = (s.dia === k ? s.n : 0) + 1;
    const recuerdos = s.recuerdos.concat([{ dia: k, quien, texto }]).slice(-20);
    if (H.progreso) H.progreso.guardar({ sorpresas: { dia: k, n, total: s.total + 1, recuerdos } });
    else R.memoria = { dia: k, n };
    return n;
  }

  // ---------------------------------------------------------------- ¿es un momento tranquilo?
  function libre() {
    const st = A.estado();
    if (!st.jugando || st.cargando || st.accion || st.panel || st.visita || st.examen || st.levantando ||
      st.alarma || st.cine || st.tutorial || st.vitrina || st.mamaHabla || st.charla) return false;
    if (A.controlado || A.primeraPersona || A.escondido) return false;
    if (H.futbol && H.futbol.jugando) return false;
    const esc = A.escena && A.escena.nombre;
    if (esc === 'piscina') return false;
    try { const pe = H.piscina && H.piscina.estado; if (pe && (pe.activo || pe.reto)) return false; } catch (e) { /* nada */ }
    if (H.obstaculos && H.obstaculos.escondidas) return false;
    const pan = document.querySelector('#panel');
    if (pan && !pan.hidden) return false;
    if (document.querySelector('#logros .logro')) return false;   // espera a que se vaya el banner del hábito
    return true;
  }

  // ---------------------------------------------------------------- el esfuerzo, en palabras
  // Cada esfuerzo: { clave, hecho (lo que hiciste, para la notita), costo (por qué tuvo mérito) }
  const HABITOS = {
    'Tender la cama': () => ({ hecho: `tendiste tu cama ${gx('solito', 'solita')}`, costo: 'Nadie te lo tuvo que recordar.' }),
    'Lavarse los dientes': () => ({ hecho: 'te lavaste los dientes', costo: 'Lo hiciste con calma, diente por diente.' }),
    'Lavarse las manos': () => ({ hecho: 'te lavaste las manos', costo: 'Te acordaste tú, sin que nadie te dijera.' }),
    'Guardar los juguetes': () => ({ hecho: 'guardaste tus juguetes', costo: 'Era más fácil dejarlos tirados, y no lo hiciste.' }),
    'Recoger la ropa sucia': () => ({ hecho: 'recogiste tu ropa sucia', costo: 'Es aburrido, y lo hiciste igual.' }),
    'Ordenar los zapatos': () => ({ hecho: 'ordenaste los zapatos', costo: 'Un detalle chiquito que ayuda mucho.' }),
    'Hacer la tarea a tiempo': () => ({ hecho: 'hiciste tu tarea a tiempo', costo: 'Te costó, pero la terminaste antes de jugar.' }),
    'Cumplir con la tarea': () => ({ hecho: 'cumpliste con tu tarea', costo: 'Te costó, pero la terminaste.' }),
    'Terminar lo que empiezas': () => ({ hecho: 'terminaste lo que empezaste', costo: 'Te dieron ganas de dejarlo, y seguiste.' }),
    'Vencer la flojera': () => ({ hecho: 'le ganaste a la flojera', costo: 'Eso es de las cosas más difíciles.' }),
    'Estudiar en casa': () => ({ hecho: 'estudiaste en casa', costo: 'Preferiste aprender antes que jugar.' }),
    'Practicar matemáticas': () => ({ hecho: 'practicaste matemáticas', costo: 'Las cuentas cuestan, y no te rendiste.' }),
    'Leer un rato': () => ({ hecho: 'leíste un rato', costo: 'Elegiste un libro en vez de una pantalla.' }),
    'Ayudar a poner la mesa': () => ({ hecho: 'ayudaste a poner la mesa', costo: 'Pensaste en los demás.' }),
    'Llevar su plato': () => ({ hecho: 'llevaste tu plato a la cocina', costo: 'Nadie te lo pidió.' }),
    'Lavar los platos': () => ({ hecho: 'lavaste los platos', costo: 'No es lo más divertido, y lo hiciste igual.' }),
    'Regar las plantas': () => ({ hecho: 'regaste las plantas', costo: 'Cuidaste algo que no habla, pero lo nota.' }),
    'Alistar la mochila la noche anterior': () => ({ hecho: 'alistaste tu mochila la noche anterior', costo: 'Pensaste en el día de mañana.' }),
    'Decir la verdad y hacerte cargo': () => ({ hecho: 'dijiste la verdad', costo: 'Eso da miedo, y fuiste muy valiente.' }),
    'Tomarte un respiro': () => ({ hecho: 'te tomaste un respiro cuando lo necesitabas', costo: 'Saber calmarse también es un esfuerzo.' }),
    'Dormir a buena hora': () => ({ hecho: 'te fuiste a dormir a buena hora', costo: 'Aunque querías seguir jugando.' }),
    'Comer fruta': () => ({ hecho: 'comiste fruta', costo: 'Elegiste algo sano.' }),
    'Tomar agua': () => ({ hecho: 'tomaste agua', costo: `Te cuidaste tú ${gx('mismo', 'misma')}.` }),
  };
  function esfuerzoDe(tipo, d) {
    d = d || {};
    if (tipo === 'habito') {
      const n = typeof d === 'string' ? d : d.nombre;
      if (!n) return null;
      const f = HABITOS[n];
      const e = f ? f() : { hecho: `te esforzaste en esto: «${n.toLowerCase()}»`, costo: 'Me di cuenta de que le pusiste ganas.' };
      return Object.assign({ clave: n }, e);
    }
    if (tipo === 'tarea') return { clave: 'tarea', hecho: 'terminaste tu tarea', costo: 'Te costó, pero la terminaste.' };
    if (tipo === 'estudio') return { clave: 'estudio', hecho: d.conPerro ? `estudiaste con ${perrita()} a tu lado` : 'te sentaste a estudiar', costo: 'Aunque había cosas más divertidas.' };
    if (tipo === 'gol' && d.quien === 'yo') return { clave: 'gol', hecho: 'metiste un golazo', costo: 'Eso sale de tanto practicar.' };
    if (tipo === 'piscinaReto') return { clave: 'piscina', hecho: 'te animaste con el reto de la piscina', costo: 'Daba un poquito de miedo, y lo intentaste.' };
    if (tipo === 'sotanoLlave' && d.fase === 'entregada') return { clave: 'llave', hecho: 'encontraste una llave del sótano', costo: 'Buscaste con paciencia hasta encontrarla.' };
    if (tipo === 'feria' && d.resultado) return { clave: 'feria', hecho: 'presentaste tu trabajo en la feria', costo: 'Hablar frente a todos da nervios, y lo hiciste.' };
    if (tipo === 'escondidas' && d.fase === 'fin') return { clave: 'escondidas', hecho: `jugaste a las escondidas con ${perrita()}`, costo: 'Le diste tu tiempo, y eso vale mucho.', soloPerrita: true };
    return null;
  }

  // ---------------------------------------------------------------- quién da la sorpresa
  const REGALOS_PERRITA = [
    { cosa: 'un hueso de juguete', ico: '🦴' },
    { cosa: 'una flor del jardín', ico: '🌼' },
    { cosa: 'su pelotita favorita', ico: '🎾' },
    { cosa: 'una hojita bonita', ico: '🍃' },
  ];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const QUIEN = {
    perrita: (e) => {
      const r = elegir(REGALOS_PERRITA);
      return {
        ico: r.ico, titulo: `¡${perrita()} te trae algo!`,
        texto: `${perrita()} te trajo ${r.cosa}. Te vio cuando ${e.hecho} y movió la colita. ${e.costo}`,
        voz: `¡Guau! Te traje ${r.cosa}. ¡${cap(e.hecho)}!`, sfx: 'ladrido', tipos: ['collar', 'truco'],
      };
    },
    mama: (e) => ({
      ico: '📝', titulo: 'Una notita de mamá',
      texto: `«${nombre()}: vi que ${e.hecho}. ${e.costo} ¡Gracias, mi amor! Mamá»`,
      voz: `Vi que ${e.hecho}. ${e.costo} ¡Gracias, mi amor!`, sfx: 'abrir', tipos: ['decoracion', 'ropa'],
    }),
    papa: (e) => ({
      ico: '📝', titulo: 'Una notita de papá',
      texto: `«${nombre()}: me fijé que ${e.hecho}. ${e.costo} Estoy orgulloso de ti. Papá»`,
      voz: `Me fijé que ${e.hecho}. ${e.costo} Estoy orgulloso de ti.`, sfx: 'abrir', tipos: ['decoracion', 'ropa'],
    }),
    abuela: (e) => ({
      ico: '☎️', titulo: 'Llama la abuela',
      texto: `«¡Hola, ${gx('mi niño', 'mi niña')}! Me contaron que ${e.hecho}. ${e.costo} ¡Te mando un abrazo enorme!»`,
      voz: `¡Hola, ${gx('mi niño', 'mi niña')}! Me contaron que ${e.hecho}. ¡Te mando un abrazo enorme!`, sfx: 'timbre', tipos: ['ropa', 'decoracion'],
    }),
    estrella: (e) => ({
      ico: '⭐', titulo: 'Una estrellita brillante',
      texto: `Se encendió una estrellita brillante: ${e.hecho}. ${e.costo}`,
      voz: `Una estrellita brillante, porque ${e.hecho}.`, vozDe: 'perrita', sfx: 'logro', tipos: ['decoracion', 'collar', 'truco', 'ropa'],
    }),
  };
  function quienPara(e) {
    if (e.soloPerrita) return 'perrita';
    const esc = A.escena && A.escena.nombre;
    const l = ['mama', 'papa', 'abuela', 'estrella'];
    // la cachorrita solo te trae algo si está contigo (en casa o en el parque)
    if (CASA.includes(esc) || esc === 'parque') l.push('perrita', 'perrita');
    return elegir(l);
  }

  // ---------------------------------------------------------------- el premio (H.premios de MOLLY)
  function premioPara(tipos, forzado) {
    const P = H.premios;
    if (!P || typeof P.lista !== 'function' || typeof P.dar !== 'function') return null;
    if (!forzado && Math.random() > PREMIO_PROB) return null;
    let l = [];
    try { l = (P.lista() || []).filter((p) => p && !p.tiene && !(P.tiene && P.tiene(p.id))); } catch (e) { return null; }
    if (!l.length) return null;
    const pref = l.filter((p) => tipos.includes(p.tipo));
    const cand = (pref.length ? pref : l).sort((a, b) => (a.estrellas || 0) - (b.estrellas || 0)).slice(0, 3);
    const p = elegir(cand);
    try { if (P.dar(p.id, 'sorpresa') === false) return null; } catch (e) { console.error(e); return null; }
    return { id: p.id, nombre: p.nombre || p.id, tipo: p.tipo };
  }

  // ---------------------------------------------------------------- la tarjetita
  function tarjeta(c, premio) {
    cerrarTarjeta(true);
    const el = document.createElement('div');
    el.id = 'sorpresa';
    el.className = 'sorpresa s-' + c.quien;
    el.setAttribute('role', 'status');
    const ico = document.createElement('span'); ico.className = 'sp-ico'; ico.textContent = c.ico;
    const tx = document.createElement('div'); tx.className = 'sp-txt';
    const t = document.createElement('small'); t.textContent = c.titulo;
    const b = document.createElement('b'); b.textContent = c.texto;
    tx.append(t, b);
    if (premio) { const p = document.createElement('span'); p.className = 'sp-premio'; p.textContent = '🎁 ¡Y un regalo para ti: ' + premio.nombre + '!'; tx.append(p); }
    const x = document.createElement('button'); x.className = 'sp-cerrar'; x.type = 'button'; x.setAttribute('aria-label', 'Cerrar'); x.textContent = '✕';
    el.append(ico, tx, x);
    el.addEventListener('click', () => cerrarTarjeta());
    document.body.appendChild(el);
    R.tarjeta = el; R.tTarjeta = 9;
  }
  function cerrarTarjeta(ya) {
    const el = R.tarjeta;
    if (!el) return;
    R.tarjeta = null;
    if (ya) { el.remove(); return; }
    el.classList.add('sale');
    setTimeout(() => el.remove(), 450);
  }

  // ---------------------------------------------------------------- mostrar una sorpresa
  function mostrar(e) {
    if (hoyN() >= MAX_DIA) return false;
    const quien = e.quien || quienPara(e);
    const c = Object.assign({ quien }, QUIEN[quien](e));
    const premio = premioPara(c.tipos, R.forzada);
    anotarSorpresa(c.texto, quien);
    R.ultima = R.juego;
    tarjeta(c, premio);
    try { A.sfx(c.sfx); } catch (er) { /* nada */ }
    setTimeout(() => { try { A.hablar(c.voz + (premio ? ' ¡Y te traje un regalo!' : ''), c.vozDe || quien); } catch (er) { /* nada */ } }, c.sfx === 'timbre' ? 1300 : 350);
    if (quien === 'perrita' && H.perro && H.perro.D) { const D = H.perro.D; D.anim = 'feliz'; D.salto = 0.55; }
    if (A.cambiar) A.cambiar({ animo: 4 });
    if (A.anotar) A.anotar(c.titulo + ': ' + e.hecho + '.', 'bien');
    A.evento('sorpresa', { texto: c.texto, premio: premio ? premio.id : null, quien, esfuerzo: e.clave });
    return true;
  }

  // ---------------------------------------------------------------- escuchar el esfuerzo
  A.alEvento((tipo, d) => {
    if (tipo === 'sorpresa') return;
    if (tipo === 'finDia') { R.pend = null; cerrarTarjeta(true); return; }
    if (R.pend) return;                       // ya hay una en camino
    const e = esfuerzoDe(tipo, d);
    if (!e) return;
    if (hoyN() >= MAX_DIA) return;
    if (!R.forzada) {
      if (R.juego < INICIO || R.juego - R.ultima < ENFRIA) return;
      if (Math.random() > PROB) return;
    }
    R.pend = { e, en: R.juego + (R.forzada ? 0.6 : rnd(ESPERA[0], ESPERA[1])), vence: R.juego + VENCE };
  });

  A.alActualizar((dt) => {
    const st = A.estado();
    if (!st.jugando) return;
    R.juego += dt;
    if (R.tarjeta) {
      // si se abre un panel o empieza algo, la tarjetita se va antes
      R.tTarjeta -= dt;
      if (R.tTarjeta <= 0 || st.panel || st.cine || st.charla || st.cargando) cerrarTarjeta();
    }
    const p = R.pend;
    if (!p || R.juego < p.en) return;
    if (R.juego > p.vence) { R.pend = null; return; }
    if (!libre()) return;
    R.pend = null;
    mostrar(p.e);
  });

  H.sorpresas = {
    forzar: (on) => { R.forzada = on !== false; return R.forzada; },
    get forzada() { return R.forzada; },
    hoy: () => hoyN(),
    get pendiente() { return R.pend ? R.pend.e.clave : null; },
    get visible() { return !!R.tarjeta; },
    libre,
    MAX_DIA,
    // para probar: lanza una sorpresa ya (si es un momento tranquilo)
    probar: (quien, hecho) => (libre() ? mostrar({ clave: 'prueba', hecho: hecho || 'te esforzaste mucho', costo: 'Te costó, pero lo lograste.', quien }) : false),
  };
  window.Habitos = Object.assign(window.Habitos || {}, H);
})();
