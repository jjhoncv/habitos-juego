/* Descubrimientos y logros.
   - Descubrimientos: la primera vez que usas algo de la casa (o del colegio) se anota en tu álbum.
     Lo que no has descubierto aparece como "???" con una pista de dónde buscar.
   - Logros: cosas especiales que consigues jugando (primer gol, gol de cabeza, que mamá no te encuentre…).
   Todo se guarda entre días (Habitos.progreso: album y logros). El álbum se abre con la tecla L o el botón. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.motor.nino || !H.progreso) return;
  const A = H.motor.api;
  const $ = (s) => document.querySelector(s);
  const nom = () => (A.perfil ? A.perfil.mascota.nombre : 'tu cachorro');

  // ---------- catálogo de descubrimientos: [clave, nombre, lugar, qué te da]
  const COSAS = [
    ['Cama', 'Tu cama', 'Tu cuarto', 'Tenderla ordena el cuarto; de noche, dormir te devuelve la energía'],
    ['Juguetes', 'La caja de juguetes', 'Tu cuarto', 'Guardarlos evita tropiezos'],
    ['Ropa sucia', 'El cesto de ropa', 'Tu cuarto', 'Mamá lava la ropa que está en el cesto'],
    ['Zapatos', 'Tus zapatos', 'Tu cuarto', 'Ordenados, no pierdes tiempo buscándolos'],
    ['Mochila', 'Tu mochila', 'Tu cuarto', 'Alistarla y hacer la tarea te prepara para el colegio'],
    ['Ropero', 'El ropero', 'Tu cuarto', 'Ahí está tu uniforme'],
    ['Plato', 'El plato del cachorro', 'Tu cuarto', 'Si lo alimentas, confía más en ti'],
    ['Ducha', 'La ducha', 'El baño', 'Bañarte sube la higiene'],
    ['Inodoro', 'El inodoro', 'El baño', 'Ve apenas tengas ganas, y después lávate las manos'],
    ['Escritorio', 'Tu escritorio', 'Tu cuarto', 'Estudiar te hace crecer; con tu cachorro al lado, aprendes más'],
    ['Casita del perro', 'La casita del cachorro', 'El jardín', 'Limpiarla y que descanse ahí'],
    ['Lavamanos', 'El lavamanos', 'El baño', 'Dientes limpios y cara fresca'],
    ['Mesa', 'La mesa del comedor', 'El comedor', 'Desayunar con la familia da energía y ánimo'],
    ['Refrigeradora', 'La refrigeradora', 'El comedor', 'Fruta o galletas cuando tienes hambre'],
    ['Almuerzo', 'El almuerzo', 'El comedor (en la tarde)', 'Te llena para toda la tarde'],
    ['Cena', 'La cena en familia', 'El comedor (de noche)', 'Comer y conversar de tu día'],
    ['PS5', 'La PS5', 'La sala', 'Divertida… pero se te va el tiempo'],
    ['Tablet', 'La tablet', 'La sala', 'Videos que siempre duran más de lo que crees'],
    ['Libros', 'El librero', 'La sala', 'Leer un cuento te da ganas de hacer cosas'],
    ['Sofá', 'El sofá', 'La sala', 'Una siesta para recuperar energía'],
    ['Plantas', 'Las plantas de mamá', 'El jardín', 'Regarlas ayuda en casa'],
    ['Pelota', 'La pelota', 'El jardín', 'Tiros al arco tú solo o fútbol con tu cachorro'],
    ['Escalera al techo', 'La escalera al techo', 'El jardín', 'Sube al mirador'],
    ['Mirar el paisaje', 'El mirador', 'El techo', 'Mirar los árboles te calma'],
    ['Profesora', 'La clase', 'El colegio', 'Entregar la tarea y dar el examen'],
    ['Kiosco', 'El kiosco', 'El recreo del colegio', 'Comprar algo con tu propina'],
    ['Amigos', 'Tus amigos del recreo', 'El recreo del colegio', 'Jugar fútbol en el recreo'],
    ['Escondite', 'Un escondite', 'Cuando vienen los pasos de mamá', 'Esconderte… si no te delatan'],
  ];
  const claveDe = (nombre) => {
    if (/^Plato de /.test(nombre)) return 'Plato';
    if (/^(Debajo|Detrás|Dentro)/.test(nombre)) return 'Escondite';
    return COSAS.some(([k]) => k === nombre) ? nombre : null;
  };

  // ---------- logros: [clave, nombre, cómo se consigue]
  const LOGROS = [
    ['explorador', 'Explorador', 'Descubrir 10 cosas de la casa'],
    ['gran-explorador', 'Gran explorador', 'Descubrir 20 cosas'],
    ['primer-gol', 'Primer gol', 'Meter tu primer gol jugando con tu cachorro'],
    ['cabezazo', '¡De cabeza!', 'Meter un gol de cabeza'],
    ['goleada', 'Goleada', 'Meter 4 goles o más en un partido'],
    ['gana-mano', 'Mano a mano', 'Ganarle un partido mano a mano a tu cachorro'],
    ['mejores-amigos', 'Mejores amigos', 'Que tu cachorro confíe mucho en ti (vínculo 80)'],
    ['estudioso', 'Estudioso', 'Hacer toda la tarea bien al primer intento'],
    ['colegio', 'Al colegio', 'Ir al colegio'],
    ['tres-comidas', 'Buen provecho', 'Desayunar, almorzar y cenar el mismo día'],
    ['buenas-noches', 'Buenas noches', 'Dormir antes de las 21:00'],
    ['mirador', 'Desde arriba', 'Sentarte en el mirador'],
    ['escondido', 'Invisible', 'Que mamá no te encuentre en tu escondite'],
    ['verdad', 'La verdad', 'Decir la verdad cuando tu cachorro hizo una travesura'],
    ['dia-perfecto', 'Día perfecto', 'Cumplir todas las metas del día'],
  ];

  let pr = H.progreso.cargar();
  const album = new Set(pr.album || []);
  const logros = new Set(pr.logros || []);
  const guardar = () => H.progreso.guardar({ album: [...album], logros: [...logros] });

  function descubrir(clave) {
    if (!clave || album.has(clave)) return;
    album.add(clave);
    guardar();
    const c = COSAS.find(([k]) => k === clave);
    A.banner('bien', '¡Descubriste algo nuevo!', c ? c[1] : clave, `Álbum: ${album.size} de ${COSAS.length}`);
    A.sfx('moneda');
    if (album.size >= 10) lograr('explorador');
    if (album.size >= 20) lograr('gran-explorador');
    pintarBoton();
  }
  function lograr(clave) {
    if (logros.has(clave)) return;
    const l = LOGROS.find(([k]) => k === clave);
    if (!l) return;
    logros.add(clave);
    guardar();
    setTimeout(() => { A.banner('bien', '¡Logro desbloqueado!', l[1], l[2]); A.sfx('logro'); A.flash('bien'); }, 900);
    A.anotar(`Logro: ${l[1]}.`, 'bien');
    pintarBoton();
  }

  // ---------- eventos del juego
  A.alEvento((tipo, d) => {
    if (tipo === 'accion' && d.it) descubrir(claveDe(d.it.nombre));
    if (tipo === 'gol') { lograr('primer-gol'); if (d.cabeza) lograr('cabezazo'); }
    if (tipo === 'finPartido') { if (d.goles >= 4) lograr('goleada'); if (d.modo === 'mano' && d.yo > d.perro) lograr('gana-mano'); }
    if (tipo === 'tarea' && d.primera >= d.total) lograr('estudioso');
    if (tipo === 'escondite' && !d.encontrado) lograr('escondido');
    if (tipo === 'habito') {
      if (d === 'Tomarte un respiro') lograr('mirador');
      if (d === 'Decir la verdad y hacerte cargo') lograr('verdad');
    }
    if (tipo === 'colegio') lograr('colegio');
    if (tipo === 'finDia') {
      if (A.S.f.desayuno && A.S.f.almorzo && A.S.f.ceno) lograr('tres-comidas');
      if (A.S.f.durmio && !A.S.f.desvelo && A.S.min < 21 * 60) lograr('buenas-noches');
      if (d.total && d.logradas === d.total) lograr('dia-perfecto');
    }
  });
  // el vínculo con el cachorro se revisa de vez en cuando
  setInterval(() => { if (H.perro && H.perro.vinculo >= 80) lograr('mejores-amigos'); }, 3000);

  // ---------- el álbum
  document.body.insertAdjacentHTML('beforeend', `
<button class="b-album" id="bAlbum" type="button" hidden aria-label="Abrir el álbum (tecla L)"><span>Álbum</span><b id="bAlbumN">0</b></button>
<div class="pantalla album" id="album" hidden><div class="hoja al-hoja" role="dialog" aria-labelledby="alTitulo">
  <div class="al-cab"><div><p class="eyebrow">Tu álbum</p><h2 id="alTitulo">Lo que descubriste</h2></div><button class="btn sec" type="button" id="alCerrar">Cerrar</button></div>
  <nav class="al-tabs"><button type="button" data-t="cosas" aria-selected="true">Descubrimientos</button><button type="button" data-t="logros">Logros</button></nav>
  <div class="al-grid" id="alGrid"></div>
</div></div>`);
  let pestana = 'cosas';
  function pintarBoton() { $('#bAlbumN').textContent = `${album.size + logros.size}`; }
  function pintarAlbum() {
    document.querySelectorAll('.al-tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.t === pestana));
    $('#alTitulo').textContent = pestana === 'cosas' ? `Descubrimientos · ${album.size} de ${COSAS.length}` : `Logros · ${logros.size} de ${LOGROS.length}`;
    $('#alGrid').innerHTML = pestana === 'cosas'
      ? COSAS.map(([k, n, lugar, da]) => (album.has(k)
        ? `<div class="al-carta si"><b>${n.replace('del cachorro', `de ${nom()}`)}</b><span>${da}</span><small>${lugar}</small></div>`
        : `<div class="al-carta"><b>???</b><span>Todavía no lo descubres.</span><small>Pista: ${lugar}</small></div>`)).join('')
      : LOGROS.map(([k, n, como]) => `<div class="al-carta ${logros.has(k) ? 'si logro' : ''}"><b>${logros.has(k) ? '★ ' : ''}${n}</b><span>${como.replace('tu cachorro', nom())}</span></div>`).join('');
  }
  function abrir() { pintarAlbum(); $('#album').hidden = false; A.bloquear('album', true); }
  function cerrar() { $('#album').hidden = true; A.bloquear('album', false); }
  $('#bAlbum').addEventListener('click', abrir);
  $('#alCerrar').addEventListener('click', cerrar);
  $('#album').querySelector('.al-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) { pestana = b.dataset.t; pintarAlbum(); } });
  A.alTecla((e) => {
    if (!$('#album').hidden) { if (/^(Escape|KeyL|Enter)$/.test(e.code)) cerrar(); return true; }
    if (e.code === 'KeyL' && !A.estado().panel) { abrir(); return true; }
    return false;
  });
  // el botón se ve junto al HUD
  setInterval(() => { const ver = A.estado().jugando && !$('#hud').hidden; if ($('#bAlbum').hidden === ver) $('#bAlbum').hidden = !ver; }, 400);
  pintarBoton();

  H.logros = { descubrir, lograr, get album() { return [...album]; }, get logros() { return [...logros]; }, COSAS, LOGROS };
})();
