/* Día 3 (miércoles): visita a la veterinaria con la cachorrita.
   - En la tarde, desde las 16:00, mamá avisa que hoy toca la vacuna. Tú decides cuándo ir:
     al terminar de hablar te lo ofrece, y la puerta de la calle del comedor también te deja ir.
   - Mamá no lo vuelve a recordar durante el día (tú decides). A las 19:00 la veterinaria cierra:
     la cachorrita se queda sin vacuna; papá y mamá lo conversan contigo en la noche (charla de la noche en juego.js).
   - En la veterinaria: pesarla, revisarla en la mesa, la vacuna (si le tiene miedo, puedes calmarla)
     y el consejo de la doctora. Si la cuidaste bien, te felicita.
   - Al volver a casa se anota en el diario y ganas el hábito "Cuidar la salud de …". */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.progreso) return;
  const A = H.motor.api;
  const { THREE, PI } = A;
  const h = (hh, mm) => hh * 60 + (mm || 0);
  const AVISO = h(16), CIERRA = h(19);
  const CASA = ['dormitorio', 'pasillo', 'bano', 'comedor', 'sala', 'jardin'];

  const nom = () => (A.perfil && A.perfil.mascota && A.perfil.mascota.nombre) || 'Molly';
  const yo = () => (A.perfil && A.perfil.nombre) || 'Dani';
  const esHoy = () => H.progreso.cargar().dia === 3 && A.S.fase === 'tarde';
  // el evento sigue abierto: ya avisaron, todavía no fueron y la veterinaria no cerró
  const pendiente = () => esHoy() && !A.S.f.d3vet && !A.S.f.d3perdio && A.S.min < CIERRA;

  // lugares dentro de la veterinaria
  const BALANZA = { x: -2.3, z: -2.4 }, MESA = { x: 0.7, z: -2.15, y: 0.84 }, DOCTORA = { x: 0.7, z: -3.0 };
  const V = { E: null, D: null, doc: null, mama: null, paso: 0, calmada: false, miedo: false, meta: null, sigue: true, t: 0, volviendo: false };

  // ---------- ir a la veterinaria (desde el aviso o desde la puerta)
  function opcionIr() {
    return {
      texto: `Ir a la veterinaria con ${nom()}`, nota: `Mamá las lleva. ${nom()} recibe su vacuna y la doctora la revisa.`,
      min: 15, ef: { animo: 3 }, anim: 'saludar', dur: 1.0, esfuerzo: false, progreso: 'Caminando a la veterinaria',
      alTerminar: irVet,
    };
  }
  function irVet() {
    if (H.perro) H.perro.modo = 'sigue';   // la cachorrita va contigo
    A.irA('veterinaria', { desde: 'calle', titulo: 'Veterinaria', tips: [
      `${nom()} va con su correa, muy curiosa.`,
      'En la veterinaria la pesan, la revisan y le ponen su vacuna.',
      'Si tiene miedo, acariciarla la ayuda a calmarse.',
    ] });
  }
  function panelIr(texto) {
    A.abrirPanel({ titulo: `La vacuna de ${nom()}`, texto, opciones: [opcionIr()] });
  }

  // ---------- avisos de mamá y la consecuencia suave
  function libre() {
    const st = A.estado();
    // si mamá ya viene por otra cosa, visitaMama lo pone en cola; solo esperamos si está hablando en el comedor
    return st.jugando && !st.cargando && !st.accion && !st.panel && !st.cine && !st.examen && !st.alarma
      && !(st.mamaHabla && !st.visita) && A.escena && CASA.includes(A.escena.nombre);
  }
  A.alActualizar(() => {
    const S = A.S;
    if (!A.perfil || !esHoy() || S.f.d3vet || S.f.d3perdio) return;
    if (S.min >= CIERRA && A.escena && A.escena.nombre !== 'veterinaria') {
      if (!libre()) return;
      S.f.d3perdio = true;
      H.progreso.guardar({ veterinario: { fue: false, vacuna: false, dia: 3 } });
      A.cambiar({ confianza: -3 });
      A.anotar(`No fueron a la veterinaria. ${nom()} se quedó sin su vacuna hoy.`, 'mal');
      // sin visita: lo conversan en la noche, al acostarte
      return;
    }
    if (!S.f.d3aviso && S.min >= AVISO && libre()) {
      S.f.d3aviso = true;
      A.visitaMama([`¡${yo()}! Hoy es miércoles: le toca su vacuna a ${nom()}.`, 'La veterinaria atiende hasta las 7 de la noche.', '¿Vamos ahora? Tú me dices.'], {
        esconder: false,
        alTerminar: () => setTimeout(() => {
          if (pendiente() && !A.estado().panel && !A.estado().accion && !A.estado().cargando) panelIr(`Mamá te espera para ir a la veterinaria. Si prefieres ir más tarde, sal por la puerta de la calle del comedor (hasta las 19:00).`);
        }, 400),
      });
      return;
    }
    // (ya no hay recordatorio a las 17:30: durante el día nadie te dice qué hacer)
  });

  // la puerta de la calle del comedor: en la tarde de hoy te deja ir a la veterinaria
  A.alConstruir((nombre, E) => {
    if (nombre === 'comedor') {
      const pu = E.inters.find((i) => i.nombre === 'Puerta');
      if (pu && pu.abrir && !pu.d3) {
        const orig = pu.abrir;
        pu.d3 = true;
        pu.abrir = () => (pendiente() && A.S.f.d3aviso ? {
          titulo: 'La puerta de la calle', texto: `Mamá: "¿Vamos a la veterinaria? ${nom()} ya tiene su correa."`, opciones: [opcionIr()],
        } : orig());
      }
    }
    // de vuelta en casa: se anota en el diario
    if (CASA.includes(nombre) && V.volviendo) {
      V.volviendo = false;
      if (A.S.f.d3vet && !A.S.f.d3anotado) {
        A.S.f.d3anotado = true;
        A.anotar(`Llevaste a ${nom()} a la veterinaria: la pesaron, la revisaron y le pusieron su vacuna.${V.calmada ? ' La calmaste con cariño.' : ''}`, 'bien');
        setTimeout(() => A.habito(`Cuidar la salud de ${nom()}`), 1600);
      } else if (!A.S.f.d3vet) {
        A.avisar(`Volvieron sin terminar la consulta. Pueden regresar antes de las 19:00.`, 'mal');
      }
    }
  });

  // ---------- un cartel con letras (textura de canvas)
  function cartel(sc, lineas, x, y, z, w, hh, fondo, ry) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = Math.round(256 * hh / w);
    const g = cv.getContext('2d');
    g.fillStyle = fondo; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#ffffff'; g.fillRect(6, 6, cv.width - 12, cv.height - 12);
    g.fillStyle = fondo; g.textAlign = 'center'; g.textBaseline = 'middle';
    const n = lineas.length, paso = (cv.height - 24) / n;
    lineas.forEach((l, i) => {
      g.font = `${i === 0 ? 'bold ' : ''}${Math.min(30, Math.floor(paso * 0.62))}px sans-serif`;
      g.fillText(l, cv.width / 2, 12 + paso * (i + 0.5));
    });
    const tex = new THREE.CanvasTexture(cv);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(x, y, z);
    m.rotation.y = ry || 0;
    sc.add(m);
    return m;
  }

  // ---------- la veterinaria
  A.registrarEscena('veterinaria', 'Veterinaria', () => {
    const E = A.nuevaEscena('veterinaria', 'Veterinaria', 9, 7, {
      piso: '#dfe9ec', pared: '#bfe3dc', cielo: '#9fd3f0',
      puertas: [{ lado: 'izq', c: 2.0, ancho: 1.2, salida: true, a: 'calle', nombre: 'Salida' }],
    });
    E.conPerro = true;   // el silbato no dice "no te escucha": está aquí contigo
    const sc = E.scene, zf = -E.d / 2 + 0.02;
    // baldosas
    for (let i = 0; i < 9; i++) A.box(sc, 0.02, 0.003, 7, '#c7d6da', -4.5 + i, 0.004, 0, { sombra: false });
    A.ventana(E, -2.6, 1.4, 0.9);
    // mesa de revisión (metal, con una toallita)
    A.box(sc, 1.5, 0.08, 0.8, '#c8ccd2', MESA.x, MESA.y - 0.04, MESA.z);
    A.box(sc, 1.1, 0.02, 0.6, '#7fc8d6', MESA.x, MESA.y + 0.01, MESA.z, { sombra: false });
    [[-0.65, -0.32], [0.65, -0.32], [-0.65, 0.32], [0.65, 0.32]].forEach(([dx, dz]) => A.box(sc, 0.06, MESA.y - 0.08, 0.06, '#9aa0aa', MESA.x + dx, (MESA.y - 0.08) / 2, MESA.z + dz));
    E.solido(MESA.x, MESA.z, 1.5, 0.8);
    // balanza para mascotas
    A.box(sc, 0.9, 0.1, 0.7, '#e8eef2', BALANZA.x, 0.05, BALANZA.z);
    A.box(sc, 0.08, 0.9, 0.08, '#9aa0aa', BALANZA.x, 0.45, BALANZA.z - 0.36);
    A.box(sc, 0.5, 0.3, 0.06, '#2b2b2b', BALANZA.x, 0.95, BALANZA.z - 0.36);
    const pantalla = A.box(sc, 0.4, 0.18, 0.02, null, BALANZA.x, 0.95, BALANZA.z - 0.32, { mat: A.matB('#2d6b3c'), sombra: false });
    E.refrescos.push(() => { pantalla.material = A.matB(V.paso >= 1 ? '#8ef0a0' : '#2d6b3c'); });
    // estante con frascos y vendas
    const ex = 3.5, ez = -3.15;
    A.box(sc, 1.4, 2.0, 0.4, '#f3efe6', ex, 1.0, ez);
    [0.45, 1.0, 1.55].forEach((y, j) => {
      A.box(sc, 1.3, 0.04, 0.38, '#d9cdb6', ex, y, ez + 0.02);
      ['#de5546', '#3d9bd4', '#f2c14e', '#58a86b', '#8f73cf'].forEach((c, i) => {
        if ((i + j) % 2) A.cil(sc, 0.07, 0.07, 0.22, c, ex - 0.5 + i * 0.25, y + 0.13, ez + 0.05, { seg: 8 });
        else A.box(sc, 0.16, 0.14, 0.14, '#ffffff', ex - 0.5 + i * 0.25, y + 0.09, ez + 0.05);
      });
    });
    E.solido(ex, ez, 1.4, 0.45);
    // sala de espera: banca y plantita
    A.box(sc, 1.6, 0.1, 0.5, '#5b8fd1', -3.5, 0.45, 0.6, { ry: PI / 2 });
    [-0.6, 0.6].forEach((k) => A.box(sc, 0.4, 0.45, 0.08, '#3c5f8f', -3.5, 0.22, 0.6 + k));
    E.solido(-3.5, 0.6, 0.6, 1.7);
    A.cil(sc, 0.2, 0.15, 0.4, '#c56b4a', 3.9, 0.2, 2.6);
    A.bola(sc, 0.32, '#3f8f5a', 3.9, 0.65, 2.6);
    // carteles
    cartel(sc, ['Veterinaria', 'Patitas Felices'], 0.7, 2.1, zf + 0.03, 1.8, 0.55, '#2a9d8f');
    cartel(sc, ['Para un cachorro sano', 'Agua fresca siempre', 'Comida 2 veces al día', 'Paseos y juegos'], -1.0, 1.35, zf + 0.03, 1.1, 0.8, '#d9667a');
    cartel(sc, ['Vacunas', 'al día = salud'], 2.3, 1.45, zf + 0.03, 0.8, 0.5, '#3d9bd4');

    // la doctora
    const doc = A.crearPersona({ piel: '#d9a882', pelo: '#2b1a10', camisa: '#f6f7f9', pantalon: '#2a9d8f', zapato: '#ffffff', peinado: 'cola' });
    doc.voz = 'profe';
    doc.root.position.set(DOCTORA.x, 0, DOCTORA.z);
    sc.add(doc.root); E.npcs.push(doc);
    // mamá espera en la banca
    const mama = A.crearMama();
    mama.root.position.set(-3.45, 0, 0.9);
    mama.root.rotation.y = PI / 2;
    mama.sentado = true;
    sc.add(mama.root); E.npcs.push(mama);
    // la cachorrita (perro.js no entra aquí: la manejamos nosotros)
    const D = A.crearPerro(A.perfil.mascota.color);
    D.voz = 'perro';
    D.root.position.set(-2.6, 0, 2.3);
    sc.add(D.root); E.npcs.push(D);
    Object.assign(V, { E, D, doc, mama, paso: 0, calmada: false, miedo: false, meta: null, sigue: true, saludo: false });

    // la mesa de revisión: cada paso de la consulta
    E.inters.push(A.etiquetaInter('Mesa de revisión', [MESA.x, -1.25], [MESA.x, MESA.z], 1.2, {
      activo: () => V.paso < 4,
      rotulo: () => ['Balanza', 'Mesa de revisión', 'Vacuna', 'Consejo de la doctora'][V.paso],
      abrir: consulta,
    }));
    E.inters.push(A.etiquetaInter('Salida', [-3.75, 2.0], [-4.3, 2.0], 0.9, {
      abrir: () => ({
        titulo: 'Volver a casa', texto: V.paso >= 4 ? `¡Listo! ${nom()} ya tiene su vacuna. Mamá toma la correa.` : 'Todavía no terminan la consulta. ¿Se van igual?',
        opciones: [{
          texto: 'Volver a casa con mamá', nota: V.paso >= 4 ? '' : 'Pueden volver antes de las 19:00.', min: 15, anim: 'saludar', dur: 0.8, esfuerzo: false, progreso: 'Volviendo a casa',
          alTerminar: () => { V.volviendo = true; if (H.perro) H.perro.modo = 'sigue'; A.irA('comedor', { desde: 'calle', titulo: 'Casa' }); },
        }],
      }),
    }));
    E.alEntrar = () => {
      if (V.saludo) return;
      V.saludo = true;
      A.decir(doc, `¡Hola! Tú debes ser ${nom()}. Soy la doctora Rosa.`, 3.2);
      setTimeout(() => { if (A.escena === E) A.avisar('Acércate a la doctora para empezar la consulta.', 'bien'); }, 1500);
    };
    return E;
  });

  // ---------- la consulta, paso a paso
  function decirDoc(lineas, cada) {
    lineas.forEach((l, i) => setTimeout(() => { if (A.escena === V.E) A.decir(V.doc, l, (cada || 3) - 0.2); }, i * (cada || 3) * 1000));
  }
  function consulta() {
    const n = nom();
    if (V.paso === 0) return {
      titulo: 'Doctora Rosa', texto: `"Primero vamos a pesar a ${n}. Súbela a la balanza, por favor."`,
      opciones: [{
        texto: 'Subirla a la balanza', nota: 'Así sabemos si está creciendo bien.', min: 3, esfuerzo: false, progreso: `Pesando a ${n}`,
        pasos: [
          { ruta: [[BALANZA.x + 0.2, BALANZA.z + 0.9]], mira: [BALANZA.x, BALANZA.z], anim: 'senalar', dur: 0.6, min: 0, progreso: `¡Ven, ${n}!`, alTerminar: () => { V.sigue = false; V.meta = { x: BALANZA.x, z: BALANZA.z, anim: 'quieto' }; } },
          { anim: 'agacharse', dur: 2.6, min: 3, progreso: `Pesando a ${n}` },
        ],
        alTerminar: () => {
          V.paso = 1;
          const kg = (3.5 + (H.perro ? H.perro.necesidades.comida : 50) / 100 * 1.5).toFixed(1);
          A.refrescar();
          A.decir(V.doc, `Pesa ${kg} kilos. ¡Está creciendo muy bien! Ahora a la mesa.`, 3.2);
          V.sigue = true; V.meta = null;
        },
      }],
    };
    if (V.paso === 1) return {
      titulo: 'Doctora Rosa', texto: `"Súbela a la mesa. Le voy a mirar los ojos, las orejas, los dientes y el corazón."`,
      opciones: [{
        texto: 'Subirla a la mesa de revisión', nota: 'La doctora la revisa con cuidado.', min: 6, esfuerzo: false, progreso: 'Revisión',
        pasos: [
          { ruta: [[MESA.x, -1.25]], mira: [MESA.x, MESA.z], anim: 'agacharse', dur: 1.4, min: 0, progreso: `Subiendo a ${n} a la mesa`, alTerminar: () => { V.sigue = false; V.meta = { x: MESA.x, z: MESA.z, y: MESA.y, anim: 'quieto' }; } },
          { anim: 'quieto', dur: 3.2, min: 6, progreso: `La doctora revisa a ${n}`, alTerminar: () => { V.doc.anim = 'agacharse'; } },
        ],
        alTerminar: () => {
          V.paso = 2; V.miedo = true; V.doc.anim = 'quieto';
          A.decir(V.doc, 'Ojos brillantes, orejas limpias y corazón fuerte. ¡Muy bien!', 3);
          setTimeout(() => { if (A.escena === V.E && V.miedo) A.avisar(`${n} vio la jeringa y tiembla un poquito: tiene miedo.`, 'mal'); }, 3200);
        },
      }],
    };
    if (V.paso === 2) {
      const ops = [];
      if (!V.calmada) ops.push({
        texto: 'Acariciarla y hablarle bajito', nota: `"Tranquila, ${n}, aquí estoy." Así confía más en ti.`, min: 2, ef: { animo: 4 }, anim: 'agacharse', dur: 2.2, esfuerzo: false, progreso: `Calmando a ${n}`,
        alTerminar: () => {
          V.calmada = true; V.miedo = false;
          if (H.perro) H.perro.cambiarVinculo(5);
          V.D.anim = 'feliz'; V.D.salto = 0.55; A.sfx('ladrido');
          A.decir(A.P, `Tranquila, ${n}. Eres muy valiente.`, 2.4);
        },
      });
      ops.push({
        texto: 'Sostenerla con cariño para la vacuna', nota: V.calmada ? 'Ya está tranquila.' : 'Todavía está asustada…', min: 4, esfuerzo: false, anim: 'agacharse', dur: 2.6, progreso: 'La vacuna',
        alTerminar: () => {
          V.paso = 3; V.miedo = false;
          if (V.calmada) { A.decir(V.doc, `¡Listo! Ni se dio cuenta. ${n} es muy valiente.`, 3); V.D.anim = 'feliz'; V.D.salto = 0.55; }
          else { A.sfx('ladrido'); A.decir(V.doc, `¡Auch! Se asustó un poquito, pero ya pasó. La próxima, acaríciala antes.`, 3.4); }
          if (H.perro) H.perro.cambiarVinculo(V.calmada ? 2 : 0);
        },
      });
      return { titulo: 'La vacuna', texto: V.calmada ? `${n} está tranquila. La doctora prepara la vacuna.` : `${n} vio la jeringa y tiembla. Tiene miedo.`, opciones: ops };
    }
    // paso 3: el consejo
    return {
      titulo: 'Doctora Rosa', texto: `"Ya terminamos. ¿Te doy unos consejos para cuidar a ${n}?"`,
      opciones: [{
        texto: 'Escuchar a la doctora', nota: 'Aprendes cómo cuidarla en casa.', min: 4, ef: { motivacion: 3 }, esfuerzo: false, progreso: 'Escuchando a la doctora',
        alTerminar: () => {
          V.paso = 4; A.S.f.d3vet = true;
          const bien = H.perro && H.perro.vinculo >= 50 && A.S.f.perroComio;
          // otros días lo recuerdan (la abuela el domingo): progreso.veterinario
          H.progreso.guardar({ veterinario: { fue: true, vacuna: true, calmada: V.calmada, felicito: !!bien, dia: 3 } });
          if (bien) {
            A.cambiar({ animo: 8 });
            A.decir(V.doc, `Se nota que la cuidas mucho, ${yo()}. ¡Te felicito!`, 3.4);
            A.banner('bien', 'La doctora te felicitó', `${n} está sana y feliz`, 'Porque la cuidaste bien esta semana');
          } else {
            A.decir(V.doc, `Si comes con ella cada día y juegas un rato, va a crecer muy fuerte.`, 3.6);
          }
          V.D.root.position.set(MESA.x + 0.4, 0, -1.4); V.D.salto = 0.55; V.sigue = true; V.meta = null;
          setTimeout(() => { if (A.escena === V.E) A.decir(V.mama, '¡Gracias, doctora! Vamos a casa.', 2.4); }, 3600);
          A.refrescar(); A.crearEtiquetas();
        },
        pasos: [{ ruta: [[MESA.x, -1.25]], mira: [DOCTORA.x, DOCTORA.z], anim: 'quieto', dur: 9.5, min: 4, progreso: 'Escuchando a la doctora'}],
      }],
    };
  }
  // los consejos se dicen mientras escuchas (al empezar la acción)
  let consejoDicho = false;
  A.alActualizar(() => {
    const st = A.estado();
    if (V.E && A.escena === V.E && V.paso === 3 && st.accion && !consejoDicho) {
      consejoDicho = true;
      decirDoc([`Agua fresca y limpia todos los días.`, `Comida dos veces: en la mañana y en la tarde.`, `Y paseos y juegos, para que corra y duerma feliz.`], 3.1);
    }
    if (V.paso !== 3) consejoDicho = false;
  });

  // ---------- la cachorrita en la veterinaria: te sigue, va a la balanza, sube a la mesa
  A.alActualizar((dt) => {
    const E = A.escena, D = V.D;
    if (!E || E !== V.E || !D) return;
    V.t += dt;
    const q = D.root.position, p = A.P.root.position;
    let tx, tz;
    if (V.meta) { tx = V.meta.x; tz = V.meta.z; }
    else if (V.sigue) {
      const ry = A.P.root.rotation.y;
      tx = p.x - Math.sin(ry) * 0.9 + Math.cos(ry) * 0.35; tz = p.z - Math.cos(ry) * 0.9 - Math.sin(ry) * 0.35;
      if (Math.hypot(tx - q.x, tz - q.z) < 0.5) tx = q.x, tz = q.z;
    } else { tx = q.x; tz = q.z; }
    const dx = tx - q.x, dz = tz - q.z, d = Math.hypot(dx, dz);
    if (V.meta && V.meta.y && q.y < V.meta.y - 0.01) {
      // camina hasta el borde de la mesa y salta
      const bx = V.meta.x - 0.1, bz = V.meta.z + 0.7, db = Math.hypot(bx - q.x, bz - q.z);
      if (db > 0.1) { const k = Math.min(1, 1.8 * dt / db); q.x += (bx - q.x) * k; q.z += (bz - q.z) * k; D.root.rotation.y = Math.atan2(bx - q.x, bz - q.z); D.anim = 'caminar'; D.vel = 0.6; return; }
      q.set(V.meta.x, V.meta.y, V.meta.z); D.salto = 0.55; D.root.rotation.y = 0; D.anim = 'quieto';
      return;
    }
    if (d > 0.08) {
      const k = Math.min(1, (d > 2 ? 2.6 : 1.8) * dt / d);
      q.x += dx * k; q.z += dz * k;
      D.root.rotation.y = Math.atan2(dx, dz);
      D.anim = 'caminar'; D.vel = 0.6;
    } else if (D.anim === 'caminar') {
      D.anim = V.meta ? V.meta.anim : 'quieto';
      if (V.meta) D.root.rotation.y = 0;
    }
    // tiembla de miedo antes de la vacuna
    D.root.rotation.z = V.miedo ? Math.sin(V.t * 38) * 0.06 : 0;
    // la doctora te mira
    if (V.doc && V.doc.anim === 'quieto') V.doc.root.rotation.y = Math.atan2(p.x - DOCTORA.x, p.z - DOCTORA.z);
  });

  // para las pruebas
  H.dia3 = { get estado() { return { paso: V.paso, calmada: V.calmada, miedo: V.miedo }; }, irVet };
})();
