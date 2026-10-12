/* La rutina de papá y mamá: no aparecen de golpe, viven en la casa haciendo sus cosas.
   - Según la hora están en un cuarto haciendo algo (mamá riega, trabaja, cocina; papá lee, ayuda con la cena).
   - Entre semana papá se va a trabajar de 8:00 a 18:00. El fin de semana se queda en casa.
   - Cuando cambia la hora, entran o salen caminando por la puerta. Se ven en el minimapa.
   - Si a las 16:00 tus juguetes siguen en el piso, mamá va a tu cuarto a recogerlos: se atrasa,
     baja la confianza y la cena sale más tarde. */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.motor.nino || !H.progreso) return;
  const A = H.motor.api;
  const { PI } = A;
  const h = (hh, mm) => hh * 60 + (mm || 0);
  const finde = () => H.progreso.esFinde && H.progreso.esFinde(H.progreso.cargar().dia);

  // dónde están y qué hacen en cada cuarto
  const SITIOS = {
    jardinRiega: { lugar: 'jardin', x: 0.9, z: -2.1, ry: PI, anim: 'agacharse', dice: '¡Hola! Estoy regando las plantas. ¿Me ayudas?' },
    salaTrabaja: { lugar: 'sala', x: -0.7, z: 0.95, ry: PI, anim: 'telefono', sentado: true, dice: 'Estoy trabajando un ratito en la computadora.' },
    salaLee: { lugar: 'sala', x: -2.0, z: 0.95, ry: PI, anim: 'leer', sentado: true, prop: 'periodico', dice: 'Leyendo el periódico… ¿Cómo te fue hoy?' },
    salaDescansa: { lugar: 'sala', x: -1.4, z: 0.95, ry: PI, anim: 'quieto', sentado: true, dice: 'Descansando un poquito.' },
    cocinaCocina: { lugar: 'comedor', x: -3.0, z: -2.85, ry: PI, anim: 'cocinar', dice: 'Estoy cocinando. ¡Ya casi está!' },
    cocinaAyuda: { lugar: 'comedor', x: -1.5, z: -2.85, ry: PI, anim: 'cocinar', dice: 'Ayudo a mamá con la cena.' },
    jardinCasita: { lugar: 'jardin', x: 2.4, z: -1.4, ry: PI / 2, anim: 'agacharse', dice: 'Arreglando la casita del perro. ¡Quedará como nueva!' },
    cuartoRecoge: { lugar: 'dormitorio', x: 0.8, z: 1.0, ry: 0, anim: 'agacharse', dice: '¡Otra vez tus juguetes en el piso! Los estoy guardando yo…' },
    trabajo: { lugar: 'trabajo' },
  };

  function actividad(q) {
    const t = A.S.min, S = A.S;
    if (q === 'mama') {
      if (S.f.mamaRecoge && !S.f.mamaRecogio) return SITIOS.cuartoRecoge;
      if (t < h(8, 30)) return { lugar: 'comedor', motor: true };     // el desayuno (lo maneja el comedor)
      if (t < h(12, 30)) return SITIOS.jardinRiega;
      if (t < h(14, 30)) return { lugar: 'comedor', motor: true };    // el almuerzo
      if (t < h(16, 30)) return SITIOS.salaTrabaja;
      if (t < h(18, 30)) return SITIOS.jardinRiega;
      if (t < h(21)) return SITIOS.cocinaCocina;
      return SITIOS.salaDescansa;
    }
    if (!finde()) {
      if (t < h(8)) return { lugar: 'comedor', motor: true };
      if (t < h(18)) return SITIOS.trabajo;
    } else {
      if (t < h(9)) return { lugar: 'comedor', motor: true };
      if (t < h(12, 30)) return SITIOS.jardinCasita;
      if (t < h(14, 30)) return SITIOS.cocinaAyuda;
      if (t < h(18)) return SITIOS.salaLee;
    }
    if (t < h(19)) return SITIOS.salaLee;
    if (t < h(20, 30)) return SITIOS.cocinaAyuda;
    return SITIOS.salaLee;
  }

  const R = { npc: { mama: null, papa: null }, saludo: {}, revisar: 0 };
  const crear = (q) => { const P = q === 'mama' ? A.crearMama() : A.crearPapa(); P.voz = q; return P; };
  function quitar(E, P) { if (!P) return; E.scene.remove(P.root); const i = E.npcs.indexOf(P); if (i >= 0) E.npcs.splice(i, 1); }
  function puerta(E) {
    const orden = ['comedor', 'pasillo', 'sala'];
    return orden.map((a) => E.puertas.find((p) => !p.salida && p.a === a)).find(Boolean) || E.puertas.find((p) => !p.salida);
  }
  function enPared(E, lado, u, off) {
    if (lado === 'atras') return [u, -E.d / 2 - off];
    if (lado === 'izq') return [-E.w / 2 - off, u];
    return [E.w / 2 + off, u];
  }
  // aparece haciendo su actividad, o entra caminando desde la puerta
  function poner(E, q, sitio, caminando) {
    const P = crear(q);
    const pu = puerta(E);
    const [fx, fz] = pu ? enPared(E, pu.lado, pu.c, -0.6) : [sitio.x, sitio.z];
    P.root.position.set(caminando ? fx : sitio.x, 0, caminando ? fz : sitio.z);
    P.root.rotation.y = sitio.ry || 0;
    P.anim = caminando ? 'caminar' : sitio.anim;
    P.sentado = !caminando && !!sitio.sentado;
    if (!caminando && sitio.prop) A.ponerProp(P, sitio.prop);
    E.scene.add(P.root); E.npcs.push(P);
    R.npc[q] = { P, sitio, va: caminando ? 'llega' : 'esta' };
  }
  function irse(E, q) {
    const n = R.npc[q];
    if (!n) return;
    const pu = puerta(E);
    n.P.sentado = false; A.ponerProp(n.P, null);
    n.va = 'sale'; n.salida = pu ? enPared(E, pu.lado, pu.c, 0.4) : [n.P.root.position.x, n.P.root.position.z];
  }

  A.alConstruir((nombre, E) => {
    R.npc = { mama: null, papa: null };
    R.saludo = {};
    R.corrio = false;
    if (!A.perfil || A.S.fase === 'prologo' || A.S.fase === 'colegio' || A.estado().cine) return;
    ['mama', 'papa'].forEach((q) => {
      const act = actividad(q);
      // en el comedor el motor ya pone a mamá (y a papá en la mañana): si no les toca estar ahí, se van
      if (nombre === 'comedor' && E[q] && !(act.lugar === 'comedor' && act.motor)) { quitar(E, E[q]); E[q] = undefined; }
      if (act.lugar === nombre && !act.motor) poner(E, q, act, false);
    });
  });

  A.alActualizar((dt) => {
    const E = A.escena, st = A.estado();
    if (!E || !st.jugando || A.S.fase === 'colegio') return;
    // cada tanto revisa la rutina: quién entra y quién sale de este cuarto
    R.revisar -= dt;
    if (R.revisar <= 0) {
      R.revisar = 1.5;
      revisarRecoger();
      ['mama', 'papa'].forEach((q) => {
        const act = actividad(q), aqui = act.lugar === E.nombre && !act.motor, n = R.npc[q];
        if (aqui && !n && !(E.nombre === 'comedor' && E[q])) poner(E, q, act, true);
        else if (n && n.va !== 'sale' && (!aqui || n.sitio !== act)) irse(E, q);
      });
    }
    // mientras mamá viene de visita o hay una travesura, la de la rutina no se ve (no hay dos mamás)
    const ocultar = st.visita || (H.perro && H.perro.modo === 'travesura');
    ['mama', 'papa'].forEach((q) => {
      const n = R.npc[q];
      if (!n) return;
      n.P.root.visible = !(ocultar && (q === 'mama' || (H.perro && H.perro.modo === 'travesura')));
      const p = n.P.root.position, yo = A.P.root.position;
      if (n.va === 'llega' || n.va === 'sale') {
        const [tx, tz] = n.va === 'llega' ? [n.sitio.x, n.sitio.z] : n.salida;
        const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
        if (d < 0.08) {
          if (n.va === 'sale') { quitar(E, n.P); R.npc[q] = null; return; }
          n.va = 'esta'; n.P.anim = n.sitio.anim; n.P.sentado = !!n.sitio.sentado; n.P.root.rotation.y = n.sitio.ry || 0;
          if (n.sitio.prop) A.ponerProp(n.P, n.sitio.prop);
          return;
        }
        const k = Math.min(1, 1.5 * dt / d);
        p.x += dx * k; p.z += dz * k;
        n.P.root.rotation.y = Math.atan2(dx, dz);
        n.P.anim = 'caminar';
        return;
      }
      // si pasas corriendo al lado dentro de la casa, te lo dicen (una vez por cuarto, sin castigo)
      if (A.corriendo && !R.corrio && E.nombre !== 'jardin' && Math.hypot(yo.x - p.x, yo.z - p.z) < 1.8 && n.P.root.visible) {
        R.corrio = true;
        A.decir(n.P, q === 'mama' ? '¡Sin correr dentro de la casa, que te puedes caer!' : `¡Despacio, ${A.perfil && A.perfil.genero === 'nina' ? 'campeona' : 'campeón'}! Adentro se camina.`, 2.6);
        return;
      }
      // te saluda la primera vez que te acercas
      if (!R.saludo[q] && Math.hypot(yo.x - p.x, yo.z - p.z) < 2 && n.P.root.visible) {
        R.saludo[q] = true;
        A.decir(n.P, n.sitio.dice, 2.8);
      }
    });
  });

  // ---------- si no recoges tus juguetes, mamá lo hace (y se atrasa)
  function revisarRecoger() {
    const S = A.S;
    if (S.f.juguetes || S.f.mamaRecoge || S.min < h(16) || S.fase !== 'tarde') return;
    S.f.mamaRecoge = true; S.f.fin_recoge = S.min + 20;
    A.avisar('Mamá vio tus juguetes en el piso y fue a tu cuarto a recogerlos…', 'mal');
  }
  A.alActualizar(() => {
    const S = A.S;
    if (S.f.mamaRecoge && !S.f.mamaRecogio && S.min >= S.f.fin_recoge) {
      S.f.mamaRecogio = true; S.f.juguetes = true; S.f.cenaTarde = true;
      A.cambiar({ confianza: -5 });
      A.anotar('Mamá tuvo que recoger tus juguetes. Se atrasó con sus cosas y la cena salió media hora más tarde.', 'mal');
      A.avisar('Mamá terminó de recoger tus juguetes. Por eso la cena será a las 19:30.', 'mal');
      A.refrescar();
    }
  });

  // ---------- para el minimapa
  const POS = { comedor: { x: 1.4, z: -1.3 } };
  H.rutinas = {
    actividad,
    ubicaciones() {
      return ['mama', 'papa'].map((q) => {
        const n = R.npc[q], act = actividad(q);
        if (n && A.escena) return { quien: q, lugar: A.escena.nombre, x: n.P.root.position.x, z: n.P.root.position.z };
        if (act.lugar === 'trabajo') return { quien: q, lugar: null };
        const s = act.motor ? POS[act.lugar] : act;
        return { quien: q, lugar: act.lugar, x: s.x, z: s.z };
      });
    },
  };
})();
