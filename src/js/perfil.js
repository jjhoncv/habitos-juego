/* Perfil del jugador: quién es el personaje y cómo es su mundo.
   Se guarda en localStorage y lo leen el motor (juego.js) y el creador (creador.js). */
(function () {
  'use strict';

  const CLAVE = 'habitos-perfil-v1';

  // Cada opción: [valor, etiqueta, (color o descripción)]
  const OPCIONES = {
    genero: [['nino', 'Niño'], ['nina', 'Niña']],
    piel: ['#f3d0b1', '#e3b48e', '#c98e6a', '#a26a45', '#6e4529'],
    pelo: ['#1d1612', '#5a3a22', '#9a5b2e', '#d9a648', '#c44b2b', '#6b6f7a'],
    ojos: ['#1d2340', '#5a3a22', '#2f7a4b', '#3d7bd4'],
    peinado: [['corto', 'Corto'], ['rapado', 'Rapado'], ['rizado', 'Rizado'], ['largo', 'Largo'], ['coletas', 'Coletas'], ['cola', 'Cola']],
    contextura: [['delgada', 'Delgada'], ['normal', 'Normal'], ['robusta', 'Robusta']],
    estatura: [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta']],
    pijama: ['#f2b950', '#7cc6f2', '#f28fb3', '#8bd17c', '#b59cf2', '#f2f2f2'],
    zapatillas: ['#de5546', '#3d7bd4', '#2aa876', '#f2b950', '#1d2340', '#f4f1ea'],
    accesorio: [['ninguno', 'Ninguno'], ['gorra', 'Gorra'], ['lentes', 'Lentes'], ['lazo', 'Lazo']],
    accColor: ['#de5546', '#3d7bd4', '#f28fb3', '#f2b950', '#2aa876', '#1d2340'],
    estacion: [
      ['verano', 'Verano', 'Amanece con sol. Levantarte cuesta menos.'],
      ['invierno', 'Invierno', 'Todavía está oscuro y hace frío. Tienes menos energía y menos ganas al despertar.'],
    ],
    clima: [
      ['sol', 'Soleado', 'En el recreo puedes jugar fútbol en la cancha.'],
      ['lluvia', 'Lluvioso', 'Llueve: el ánimo baja un poco y no hay fútbol en el recreo.'],
    ],
    mascotaColor: [['#c98a4b', 'Caramelo'], ['#2b2420', 'Negro'], ['#f1ece2', 'Blanco'], ['#8b8f99', 'Gris']],
  };

  const NOMBRES = {
    nino: ['Dani', 'Santiago', 'Lucas', 'Thiago', 'Diego', 'Gael', 'Leo', 'Joaquín'],
    nina: ['Dani', 'Valentina', 'Camila', 'Sofía', 'Lucía', 'Isabella', 'Mía', 'Emma', 'Renata'],
  };
  const MASCOTAS = ['Bruno', 'Toby', 'Luna', 'Rocky', 'Canela', 'Max', 'Nala', 'Coco'];

  const BASE = {
    nombre: 'Dani', genero: 'nino', edad: 7,
    piel: '#e3b48e', pelo: '#5a3a22', ojos: '#1d2340', peinado: 'corto',
    contextura: 'normal', estatura: 'media',
    pijama: '#f2b950', zapatillas: '#de5546', accesorio: 'ninguno', accColor: '#de5546',
    estacion: 'verano', clima: 'sol',
    mascota: { tipo: 'perro', nombre: 'Bruno', color: '#c98a4b' },
    creado: false,
  };

  const copia = (o) => JSON.parse(JSON.stringify(o));
  const valores = (lista) => lista.map((x) => (Array.isArray(x) ? x[0] : x));
  const azar = (xs) => xs[Math.floor(Math.random() * xs.length)];

  // Corrige valores desconocidos (por ejemplo, de una versión anterior del juego)
  function sanear(p) {
    const r = Object.assign(copia(BASE), p || {});
    r.mascota = Object.assign(copia(BASE.mascota), (p && p.mascota) || {});
    Object.keys(OPCIONES).forEach((k) => {
      if (k === 'mascotaColor') return;
      if (!valores(OPCIONES[k]).includes(r[k])) r[k] = BASE[k];
    });
    if (!valores(OPCIONES.mascotaColor).includes(r.mascota.color)) r.mascota.color = BASE.mascota.color;
    r.nombre = limpiarNombre(r.nombre) || BASE.nombre;
    r.mascota.nombre = limpiarNombre(r.mascota.nombre) || BASE.mascota.nombre;
    return r;
  }
  function limpiarNombre(n) {
    const t = String(n || '').replace(/[<>&"`$\\{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
    // los nombres empiezan con mayúscula (molly → Molly)
    return t.charAt(0).toLocaleUpperCase('es') + t.slice(1);
  }

  function cargar() {
    try { return sanear(JSON.parse(localStorage.getItem(CLAVE))); } catch (e) { return sanear(null); }
  }
  function guardar(p) {
    const r = sanear(Object.assign({}, p, { creado: true }));
    try { localStorage.setItem(CLAVE, JSON.stringify(r)); } catch (e) { /* sin almacenamiento: vale solo esta partida */ }
    return r;
  }
  function alAzar(p) {
    const genero = azar(['nino', 'nina']);
    const peinados = genero === 'nina' ? ['largo', 'coletas', 'cola', 'rizado', 'corto'] : ['corto', 'rapado', 'rizado', 'corto'];
    return sanear(Object.assign({}, p, {
      genero, nombre: azar(NOMBRES[genero]),
      piel: azar(OPCIONES.piel), pelo: azar(OPCIONES.pelo), ojos: azar(OPCIONES.ojos), peinado: azar(peinados),
      contextura: azar(valores(OPCIONES.contextura)), estatura: azar(valores(OPCIONES.estatura)),
      pijama: azar(OPCIONES.pijama), zapatillas: azar(OPCIONES.zapatillas),
      accesorio: azar(['ninguno', 'ninguno', 'gorra', 'lentes', genero === 'nina' ? 'lazo' : 'gorra']), accColor: azar(OPCIONES.accColor),
      mascota: { tipo: 'perro', nombre: azar(MASCOTAS), color: azar(valores(OPCIONES.mascotaColor)) },
    }));
  }

  window.Habitos = Object.assign(window.Habitos || {}, {
    perfil: { OPCIONES, NOMBRES, BASE: copia(BASE), cargar, guardar, sanear, alAzar, limpiarNombre },
  });
})();
