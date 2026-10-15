/* El colegio (2.º grado, Perú): horario, mochila, dos clases con la profesora en la pizarra,
   la tarea y su revisión al día siguiente.
   - HORARIO: lunes a viernes, 2 cursos por día (Matemática, Comunicación, Ciencia y Tecnología,
     Personal Social y Arte). Se ve en la tarjeta del día, en la mochila y en la pizarra.
   - MOCHILA (cuarto): eliges los cuadernos del día. Si olvidas uno, en clase la profe te presta hojas
     o un compañero te comparte el suyo (consecuencia suave).
   - CLASE 1 → RECREO → CLASE 2: la profe explica el tema en la pizarra paso a paso (con voz), un
     compañero responde y luego te pregunta a ti (opciones grandes). En Matemática hay además el
     cálculo mental (el examen corto del motor).
   - TAREA: al final del día la profe deja tarea del tema enseñado (progreso.colegio.tarea). En casa
     la haces en la Mochila (tarea.js) y puedes practicar en el Escritorio.
   - REVISIÓN: al empezar la clase 1 del día siguiente la profe revisa: primero a dos compañeros en la
     pizarra (repaso) y luego a ti. Si la hiciste, te felicita; si no, te lo explica otra vez.
   Eventos: A.evento('clase', {curso, tema, titulo, aciertos}) · A.evento('tareaRevisada', {curso, ok, hecha}).
   API: Habitos.colegio (ver al final). */
(function () {
  'use strict';

  const H = window.Habitos || {};
  if (!H.motor || !H.motor.api || !H.motor.nino || !H.progreso) return;
  const A = H.motor.api;
  const $ = (s) => document.querySelector(s);
  const PI = Math.PI;

  // ---------------------------------------------------------------- cursos y horario
  const CURSOS = {
    matematica: { nombre: 'Matemática', corto: 'Matemática', color: '#3d9bd4', emoji: '🔢' },
    comunicacion: { nombre: 'Comunicación', corto: 'Comunicación', color: '#de5546', emoji: '📖' },
    ciencia: { nombre: 'Ciencia y Tecnología', corto: 'Ciencia', color: '#2aa876', emoji: '🌱' },
    personal: { nombre: 'Personal Social', corto: 'Personal Social', color: '#f2a623', emoji: '🗺️' },
    arte: { nombre: 'Arte', corto: 'Arte', color: '#8f73cf', emoji: '🎨' },
  };
  const ORDEN = ['matematica', 'comunicacion', 'ciencia', 'personal', 'arte'];
  const HORARIO = {
    1: ['matematica', 'comunicacion'],
    2: ['ciencia', 'matematica'],
    3: ['comunicacion', 'personal'],
    4: ['matematica', 'ciencia'],
    5: ['personal', 'arte'],
  };
  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const COMPAS = [{ nombre: 'Sofía', voz: 'nina' }, { nombre: 'Mateo', voz: 'nino' }, { nombre: 'Valentina', voz: 'nina' }, { nombre: 'Diego', voz: 'nino' }];

  const S = () => A.S;
  const nombre = () => (A.perfil && A.perfil.nombre) || 'Dani';
  const masc = () => (A.perfil && A.perfil.mascota && A.perfil.mascota.nombre) || 'tu cachorrita';
  const gx = (o, a) => (A.perfil && A.perfil.genero === 'nina' ? a : o);
  const azar = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const barajar = (l) => { const r = l.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

  // ---------------------------------------------------------------- progreso.colegio
  function col() {
    const c = H.progreso.cargar().colegio;
    return Object.assign({ horario: HORARIO, tarea: null, mochila: null, practico: null, ultima: null }, c || {});
  }
  function guardarCol(cambios) {
    const c = Object.assign(col(), cambios);
    H.progreso.guardar({ colegio: c });
    return c;
  }
  const hoy = () => H.progreso.cargar().dia || 1;
  const diaSemana = (abs) => ((abs - 1) % 7) + 1;
  const hayColegio = (abs) => diaSemana(abs) <= 5;
  const cursosDe = (abs) => (hayColegio(abs) ? (col().horario[diaSemana(abs)] || HORARIO[diaSemana(abs)]).slice() : []);
  function siguienteColegio(abs) { let d = abs; while (!hayColegio(d)) d++; return d; }
  const nombreDia = (abs) => DIAS[diaSemana(abs) - 1];
  const textoCursos = (l) => l.map((c) => CURSOS[c].nombre).join(' y ');
  // qué curso deja la tarea: el de la 2.ª hora (si es Arte, el de la 1.ª)
  const turnoTarea = (abs) => (cursosDe(abs)[1] === 'arte' ? 1 : 2);

  // cuántas veces se dictó ese curso antes de esta clase (así los temas avanzan en orden)
  function temaDe(abs, turno) {
    const curso = cursosDe(abs)[turno - 1];
    if (!curso) return null;
    const sem = Math.floor((abs - 1) / 7), ds = diaSemana(abs);
    let porSemana = 0, antes = 0;
    for (let d = 1; d <= 5; d++) (HORARIO[d] || []).forEach((c, t) => { if (c !== curso) return; porSemana++; if (d < ds || (d === ds && t < turno - 1)) antes++; });
    const lista = TEMAS[curso];
    const tema = lista[(sem * porSemana + antes) % lista.length];
    return { curso, tema };
  }

  // ---------------------------------------------------------------- matemática: cuentas en columnas
  const COL = ['Unidades', 'Decenas', 'Centenas'];
  const dig = (x, i) => Math.floor(x / Math.pow(10, i)) % 10;
  function cuentaInfo(a, b, op) {
    const n = Math.max(String(a).length, String(b).length);
    const suma = op === '+';
    const r = suma ? a + b : a - b;
    const res = [], marcas = [], pasos = [];
    let c = 0;
    for (let i = 0; i < n; i++) {
      const da = dig(a, i), db = i < String(b).length ? dig(b, i) : 0;
      if (suma) {
        const s = da + db + c;
        const ult = i === n - 1;
        res[i] = ult ? s : s % 10;
        const mas = c ? ' + 1 que llevaba' : '';
        pasos.push(s >= 10 && !ult ? `${COL[i]}: ${da} + ${db}${mas} = ${s}. Escribo ${s % 10} y llevo 1.` : `${COL[i]}: ${da} + ${db}${mas} = ${s}.`);
        if (s >= 10 && !ult) marcas.push({ col: i + 1, t: '1', paso: i });
        c = s >= 10 ? 1 : 0;
      } else {
        const top = da - c;
        if (top < db) {
          res[i] = top + 10 - db;
          pasos.push(`${COL[i]}: a ${top} no le puedo quitar ${db}. Pido 1 prestado: ${top + 10} − ${db} = ${res[i]}.`);
          marcas.push({ col: i, t: String(top + 10), paso: i });
          marcas.push({ col: i + 1, t: String(dig(a, i + 1) - 1), paso: i });
          c = 1;
        } else {
          res[i] = top - db;
          pasos.push(c ? `${COL[i]}: el ${da} prestó 1 y quedó en ${top}. ${top} − ${db} = ${res[i]}.` : `${COL[i]}: ${top} − ${db} = ${res[i]}.`);
          c = 0;
        }
      }
    }
    // sin ceros adelante (52 − 48 = 4)
    for (let i = n - 1; i > 0 && res[i] === 0; i--) res[i] = null;
    return { a, b, op, r, n, res, marcas, pasos };
  }
  // ejercicios por tema
  const NOMBRES = ['Ana', 'Luis', 'Rosa', 'Pedro', 'Carmen', 'Jorge'];
  const COSAS = ['figuritas', 'canicas', 'galletas', 'flores', 'chapitas'];
  function cuentaDe(id) {
    let a, b, op = '+';
    if (id === 'suma2') { do { a = azar(11, 78); b = azar(11, 80); } while (a % 10 + b % 10 >= 10 || a + b >= 100); }
    else if (id === 'suma2c') { do { a = azar(15, 69); b = azar(15, 79); } while (a % 10 + b % 10 < 10 || a + b >= 100); }
    else if (id === 'resta2') { op = '−'; do { a = azar(25, 98); b = azar(11, a - 10); } while (a % 10 < b % 10); }
    else if (id === 'resta2c') { op = '−'; do { a = azar(31, 95); b = azar(12, a - 10); } while (a % 10 >= b % 10 || Math.floor(a / 10) - 1 < Math.floor(b / 10)); }
    else if (id === 'suma3') { do { a = azar(110, 489); b = azar(110, 489); } while (a + b >= 1000); }
    else if (id === 'resta3') { op = '−'; do { a = azar(311, 989); b = azar(111, a - 100); } while (/0/.test(String(a)) || dig(a, 1) === 1); }
    else return cuentaDe(['suma2', 'suma2c', 'resta2', 'resta2c'][azar(0, 3)]);
    return { a, b, op, r: op === '+' ? a + b : a - b };
  }
  function problema() {
    const c = cuentaDe(['suma2', 'suma2c', 'resta2', 'resta2c'][azar(0, 3)]);
    const n = NOMBRES[azar(0, NOMBRES.length - 1)], cosa = COSAS[azar(0, COSAS.length - 1)];
    const texto = c.op === '+'
      ? (azar(0, 1) ? `${n} tiene ${c.a} ${cosa} y le regalan ${c.b} más. ¿Cuántas tiene ahora?` : `En el bus van ${c.a} niños. Suben ${c.b} más. ¿Cuántos niños van ahora?`)
      : (azar(0, 1) ? `${n} tenía ${c.a} ${cosa} y regaló ${c.b}. ¿Cuántas le quedan?` : `En el bus van ${c.a} niños. Bajan ${c.b}. ¿Cuántos quedan?`);
    return Object.assign(c, { texto });
  }
  function ejercicioMat(temaId) {
    const c = temaId === 'problemas' ? problema() : cuentaDe(temaId);
    return Object.assign({ tipo: 'num', tema: temaId }, c);
  }
  const parecido = (e) => (e && e.tema && e.tipo === 'num' ? ejercicioMat(e.tema) : null);
  function opcionesNum(r) {
    const s = new Set([r]);
    [r + 10, r - 10, r + 1, r - 1, r + 2].forEach((x) => { if (s.size < 3 && x >= 0) s.add(x); });
    const ops = barajar([...s].map(String));
    return { ops, r: ops.indexOf(String(r)) };
  }

  // ---------------------------------------------------------------- los temas de cada curso
  // Matemática: las cuentas se generan; los demás: líneas de la pizarra y preguntas (la 1.ª opción es la correcta).
  const MAT = (id, titulo, intro) => ({ id, titulo, intro, mat: true });
  const TEMAS = {
    matematica: [
      MAT('suma2', 'Sumas de 2 cifras', 'Hoy sumamos números de dos cifras. Los ponemos uno debajo del otro: unidades con unidades y decenas con decenas. Siempre empezamos por las unidades.'),
      MAT('suma2c', 'Sumas llevando', 'Hoy sumamos llevando. Cuando las unidades suman 10 o más, escribimos las unidades y llevamos 1 a las decenas.'),
      MAT('resta2', 'Restas de 2 cifras', 'Hoy restamos números de dos cifras. El número grande va arriba. Primero las unidades y después las decenas.'),
      MAT('resta2c', 'Restas prestando', 'Hoy restamos prestando. Si arriba hay menos que abajo, le pedimos 1 decena al vecino: son 10 unidades más.'),
      MAT('suma3', 'Sumas de 3 cifras', 'Hoy sumamos números de tres cifras: unidades, decenas y centenas. Vamos columna por columna, desde la derecha.'),
      MAT('resta3', 'Restas de 3 cifras', 'Hoy restamos números de tres cifras. Columna por columna, desde las unidades. Si no alcanza, pedimos prestado.'),
      MAT('problemas', 'Problemas cortos', 'Hoy resolvemos problemas. Leemos con calma: si juntamos o nos dan más, sumamos. Si quitamos o se van, restamos.'),
    ],
    comunicacion: [
      { id: 'silabas', titulo: 'Las sílabas', pasos: [
        ['Las palabras tienen sílabas.', 'Hoy aprendemos las sílabas: son los golpecitos de voz de una palabra. ¡Vamos a aplaudir!'],
        ['pe - lo - ta → 3 sílabas', 'Pe, lo, ta. ¡Tres aplausos! Pelota tiene tres sílabas.'],
        ['sol → 1 sílaba', 'Sol se dice de un solo golpe: una sílaba.'],
        ['ma - ri - po - sa → 4 sílabas', 'Ma, ri, po, sa. ¡Cuatro aplausos! Mariposa tiene cuatro sílabas.'],
      ], preg: [
        ['¿Cuántas sílabas tiene "casa"?', ['2', '3', '1'], 'Aplaude: ca, sa. Dos aplausos: 2 sílabas.'],
        ['¿Cuántas sílabas tiene "zapato"?', ['3', '2', '4'], 'Za, pa, to. Tres aplausos: 3 sílabas.'],
        ['¿Con qué sílaba empieza "luna"?', ['lu', 'na', 'la'], 'Lu, na. La primera sílaba es "lu".'],
        ['¿Cuántas sílabas tiene "pan"?', ['1', '2', '3'], 'Pan se dice de un solo golpe: 1 sílaba.'],
        ['¿Con qué sílaba termina "gato"?', ['to', 'ga', 'go'], 'Ga, to. La última sílaba es "to".'],
        ['¿Qué palabra tiene 3 sílabas?', ['paloma', 'mar', 'mesa'], 'Pa, lo, ma: tres aplausos. Mesa tiene 2 y mar tiene 1.'],
      ] },
      { id: 'oracion', titulo: 'La oración', pasos: [
        ['Una oración dice algo completo.', 'Una oración es un grupo de palabras que dice algo completo.'],
        ['Empieza con MAYÚSCULA: El perro…', 'Siempre empieza con letra mayúscula.'],
        ['Termina con punto: …ladra.', 'Y termina con un punto.'],
        ['El perro ladra.', 'Así: El perro ladra. Mayúscula al empezar y punto al final.'],
      ], preg: [
        ['¿Cuál oración está bien escrita?', ['Mi gato duerme.', 'mi gato duerme', 'Mi gato duerme'], 'Empieza con mayúscula y termina con punto: "Mi gato duerme."'],
        ['¿Con qué letra empieza una oración?', ['Con mayúscula', 'Con minúscula', 'Con un número'], 'Toda oración empieza con letra mayúscula.'],
        ['¿Qué va al final de una oración?', ['Un punto', 'Una coma', 'Nada'], 'La oración termina con un punto.'],
        ['Ordena: "come / Ana / fruta"', ['Ana come fruta.', 'fruta Ana come.', 'come fruta Ana.'], 'Primero quién (Ana), luego qué hace (come) y qué (fruta): "Ana come fruta."'],
        ['Completa: "El sol ___."', ['brilla', 'mesa', 'azul'], '"El sol brilla." La palabra "brilla" dice qué hace el sol.'],
        ['¿Cuál es una oración completa?', ['La niña salta la soga.', 'La niña', 'salta la'], '"La niña salta la soga." dice quién y qué hace: está completa.'],
      ] },
      { id: 'lectura', titulo: 'Leemos y entendemos', lectura: 'Rosa tiene una gata. Se llama Nube. Es blanca y le gusta dormir al sol. En la tarde, Rosa le da leche.', pasos: [
        ['Rosa tiene una gata. Se llama Nube.', 'Hoy leemos un cuento corto. Escuchen: Rosa tiene una gata. Se llama Nube.'],
        ['Es blanca y le gusta dormir al sol.', 'Es blanca y le gusta dormir al sol.'],
        ['En la tarde, Rosa le da leche.', 'En la tarde, Rosa le da leche.'],
        ['¿Quién? ¿Cómo es? ¿Qué hace?', 'Para entender lo que leemos, nos preguntamos: ¿quién?, ¿cómo es?, ¿qué hace?'],
      ], preg: [
        ['¿Cómo se llama la gata?', ['Nube', 'Rosa', 'Sol'], 'Dice: "Se llama Nube". Rosa es la niña.'],
        ['¿De qué color es Nube?', ['Blanca', 'Negra', 'Marrón'], 'Dice: "Es blanca".'],
        ['¿Qué le gusta hacer a Nube?', ['Dormir al sol', 'Correr', 'Nadar'], 'Dice: "le gusta dormir al sol".'],
        ['¿Qué le da Rosa en la tarde?', ['Leche', 'Pan', 'Agua'], 'Dice: "En la tarde, Rosa le da leche".'],
        ['¿Quién tiene una gata?', ['Rosa', 'Nube', 'La mamá'], 'Dice: "Rosa tiene una gata".'],
      ] },
      { id: 'mayuscula', titulo: 'Nombres con mayúscula', pasos: [
        ['Los nombres van con mayúscula.', 'Hoy aprendemos que los nombres se escriben con mayúscula.'],
        ['Personas: Ana, Luis.', 'Los nombres de las personas: Ana, Luis.'],
        ['Lugares: Lima, Perú, Cusco.', 'Los nombres de los lugares: Lima, Perú, Cusco.'],
        [() => `Mascotas: ${masc()}.`, () => `¡Y los nombres de las mascotas también! Como ${masc()}.`],
      ], preg: [
        ['¿Cuál está bien escrito?', ['Lima', 'lima', 'LIma'], 'Lima es el nombre de una ciudad: empieza con mayúscula.'],
        ['¿Cuál está bien escrito?', ['Pedro', 'pedro', 'pEdro'], 'Pedro es el nombre de una persona: empieza con mayúscula.'],
        ['¿Cuál debe ir con mayúscula?', ['Perú', 'mesa', 'perro'], 'Perú es el nombre de un país: va con mayúscula.'],
        ['¿Cuál es el nombre de un lugar?', ['Arequipa', 'Carlos', 'cuaderno'], 'Arequipa es una ciudad del Perú.'],
        ['Completa: "Mi amiga se llama ___."', ['Sofía', 'sofía', 'SOFía'], 'Los nombres empiezan con mayúscula: Sofía.'],
      ] },
    ],
    ciencia: [
      { id: 'plantas', titulo: 'Las partes de la planta', pasos: [
        ['Raíz: toma el agua de la tierra.', 'Hoy conocemos las partes de una planta. La raíz está bajo la tierra y toma el agua, como una pajita.'],
        ['Tallo: sostiene a la planta.', 'El tallo sostiene a la planta y lleva el agua hasta las hojas.'],
        ['Hojas: toman la luz del sol.', 'Las hojas toman la luz del sol para que la planta crezca.'],
        ['Flor y fruto: tienen las semillas.', 'De la flor sale el fruto, y en el fruto están las semillas.'],
      ], preg: [
        ['¿Qué parte toma el agua de la tierra?', ['La raíz', 'La flor', 'La hoja'], 'La raíz está bajo la tierra y toma el agua, como una pajita.'],
        ['¿Qué parte sostiene a la planta?', ['El tallo', 'La raíz', 'El fruto'], 'El tallo sostiene a la planta, como nuestra columna.'],
        ['¿Qué necesita una planta para vivir?', ['Agua, luz y aire', 'Solo dulces', 'Nada'], 'Las plantas necesitan agua, luz del sol y aire.'],
        ['¿Dónde están las semillas?', ['En el fruto', 'En el tallo', 'En la raíz'], 'Las semillas están dentro del fruto, como en la palta.'],
        ['Las hojas toman la luz del…', ['sol', 'televisor', 'agua'], 'Las hojas toman la luz del sol.'],
        ['¿Dónde está la raíz?', ['Bajo la tierra', 'En el aire', 'En la flor'], 'La raíz crece bajo la tierra.'],
      ] },
      { id: 'animales', titulo: 'Los animales', pasos: [
        ['Domésticos: viven con nosotros.', () => `Hoy hablamos de los animales. Los domésticos viven con las personas, como el gato o ${masc()}.`],
        ['Silvestres: viven libres.', 'Los silvestres viven libres en la naturaleza, como el cóndor o el jaguar.'],
        ['Del vientre de su mamá: el perro.', 'Unos nacen del vientre de su mamá, como los perritos.'],
        ['De un huevo: la gallina.', 'Otros nacen de un huevo, como los pollitos.'],
      ], preg: [
        ['¿Cuál es un animal doméstico?', ['El perro', 'El jaguar', 'El cóndor'], 'Doméstico es el que vive con las personas, como el perro.'],
        ['¿Cuál vive libre en la naturaleza?', ['El jaguar', 'El gato', 'La gallina'], 'El jaguar es silvestre: vive libre en la selva.'],
        ['¿Cómo nace un pollito?', ['De un huevo', 'Del vientre de su mamá', 'De una semilla'], 'Los pollitos nacen de un huevo.'],
        ['¿Cómo nace un perrito?', ['Del vientre de su mamá', 'De un huevo', 'De una flor'], 'Los perritos nacen del vientre de su mamá.'],
        ['¿Qué animal tiene plumas?', ['La gallina', 'El perro', 'El pez'], 'Las aves, como la gallina, tienen plumas.'],
        ['¿Qué animal vive en el agua?', ['El pez', 'El caballo', 'La vaca'], 'El pez vive en el agua y respira con sus branquias.'],
      ] },
      { id: 'agua', titulo: 'El agua', pasos: [
        ['Sólida: el hielo.', 'Hoy aprendemos sobre el agua. Cuando está muy fría, es sólida: es el hielo.'],
        ['Líquida: el agua del caño.', 'El agua del caño es líquida: se mueve y toma la forma del vaso.'],
        ['Gaseosa: el vapor.', 'Cuando el agua hierve, sale vapor: es agua gaseosa.'],
        ['¡Cuidamos el agua!', 'Y la cuidamos: cerramos el caño cuando nos lavamos los dientes.'],
      ], preg: [
        ['¿Cómo es el agua cuando es hielo?', ['Sólida', 'Líquida', 'Gaseosa'], 'El hielo es agua sólida: está dura.'],
        ['¿Qué sale de una olla con agua hirviendo?', ['Vapor', 'Hielo', 'Arena'], 'Del agua que hierve sale vapor: agua gaseosa.'],
        ['¿Qué le pasa al hielo al sol?', ['Se derrite', 'Se vuelve piedra', 'Crece'], 'Con el calor, el hielo se derrite y vuelve a ser líquido.'],
        ['¿Cómo cuidamos el agua?', ['Cerrando el caño', 'Dejando el caño abierto', 'Jugando con la manguera'], 'Cerrar el caño cuida el agua.'],
        ['El agua del caño es…', ['líquida', 'sólida', 'gaseosa'], 'El agua del caño es líquida: se mueve.'],
        ['¿Para qué necesitamos el agua?', ['Para vivir', 'Para nada', 'Solo para pintar'], 'Todos los seres vivos necesitamos agua para vivir.'],
      ] },
      { id: 'sentidos', titulo: 'Los cinco sentidos', pasos: [
        ['Vista: vemos con los ojos.', 'Hoy conocemos los cinco sentidos. Con los ojos vemos.'],
        ['Oído: oímos con las orejas.', 'Con los oídos escuchamos.'],
        ['Olfato y gusto: nariz y lengua.', 'Con la nariz olemos y con la lengua sentimos los sabores.'],
        ['Tacto: tocamos con la piel.', 'Con la piel sentimos si algo está frío, caliente o suave.'],
      ], preg: [
        ['¿Con qué sentido escuchas la música?', ['El oído', 'La vista', 'El gusto'], 'La música se escucha con los oídos.'],
        ['¿Con qué hueles una flor?', ['Con la nariz', 'Con los ojos', 'Con las manos'], 'Olemos con la nariz: es el olfato.'],
        ['¿Con qué saboreas un helado?', ['Con la lengua', 'Con la nariz', 'Con los oídos'], 'Los sabores se sienten con la lengua: es el gusto.'],
        ['¿Cuántos sentidos tenemos?', ['5', '3', '10'], 'Son 5: vista, oído, olfato, gusto y tacto.'],
        ['Sientes que el agua está fría con…', ['la piel', 'los ojos', 'los oídos'], 'Con la piel sentimos el frío y el calor: es el tacto.'],
        ['¿Qué sentido usas para leer?', ['La vista', 'El olfato', 'El gusto'], 'Para leer miramos con los ojos: es la vista.'],
      ] },
    ],
    personal: [
      { id: 'regiones', titulo: 'Costa, sierra y selva', pasos: [
        ['El Perú tiene 3 regiones.', 'Hoy conocemos nuestro país. El Perú tiene tres regiones: costa, sierra y selva.'],
        ['Costa: el mar y las playas. Lima.', 'La costa está junto al mar. Ahí hay playas. Lima está en la costa.'],
        ['Sierra: los Andes y las llamas. Cusco.', 'La sierra tiene montañas muy altas: los Andes. Ahí viven las llamas. Cusco está en la sierra.'],
        ['Selva: árboles y el río Amazonas.', 'La selva tiene muchos árboles y ríos grandes como el Amazonas. Iquitos está en la selva.'],
      ], preg: [
        ['¿Cuántas regiones tiene el Perú?', ['3', '2', '5'], 'Son tres: costa, sierra y selva.'],
        ['¿En qué región está el mar?', ['En la costa', 'En la sierra', 'En la selva'], 'La costa está junto al mar.'],
        ['¿Dónde viven las llamas?', ['En la sierra', 'En la costa', 'En el mar'], 'Las llamas viven en la sierra, en los Andes.'],
        ['¿Dónde está el río Amazonas?', ['En la selva', 'En la costa', 'En la sierra'], 'El Amazonas cruza la selva.'],
        ['Lima está en la…', ['costa', 'selva', 'sierra'], 'Lima está en la costa, junto al mar.'],
        ['¿Dónde hay montañas muy altas?', ['En la sierra', 'En la costa', 'En la playa'], 'En la sierra están los Andes: montañas muy altas.'],
      ] },
      { id: 'familia', titulo: 'Mi familia', pasos: [
        ['La familia nos cuida y nos quiere.', 'Hoy hablamos de la familia. La familia nos cuida y nos quiere.'],
        ['Hay familias grandes y pequeñas.', 'Hay familias grandes y pequeñas, y todas son valiosas.'],
        ['En casa, todos ayudamos.', 'En casa todos ayudamos: así nadie se cansa tanto.'],
        [() => `Yo tiendo mi cama y cuido a ${masc()}.`, () => `¿Y tú, ${nombre()}? Tú puedes tender tu cama y cuidar a ${masc()}.`],
      ], preg: [
        ['¿Cómo ayudas en casa?', ['Ordenando mis juguetes', 'Dejando todo tirado', 'Gritando'], 'Ordenar tus juguetes ayuda a toda la familia.'],
        ['La mamá de tu mamá es tu…', ['abuela', 'tía', 'prima'], 'La mamá de tu mamá es tu abuela.'],
        ['Las familias son…', ['Diferentes y valiosas', 'Todas iguales', 'Solo de 4 personas'], 'Hay familias grandes y pequeñas: todas valen.'],
        ['¿Qué hacemos en familia?', ['Nos cuidamos y ayudamos', 'Nos ignoramos', 'Peleamos siempre'], 'En familia nos cuidamos y nos ayudamos.'],
        ['El hermano de tu papá es tu…', ['tío', 'abuelo', 'primo'], 'El hermano de tu papá es tu tío.'],
      ] },
      { id: 'comunidad', titulo: 'Los trabajos de mi comunidad', pasos: [
        ['Los bomberos apagan incendios.', 'Hoy conocemos a las personas que trabajan en la comunidad. Los bomberos apagan incendios.'],
        ['La policía nos cuida.', 'La policía nos cuida en la calle.'],
        ['La doctora nos cura.', 'La doctora nos cura cuando estamos enfermos.'],
        ['El panadero hace el pan.', 'Y el panadero hace el pan que comemos en el desayuno.'],
      ], preg: [
        ['¿Quién apaga los incendios?', ['El bombero', 'El panadero', 'El cartero'], 'Los bomberos apagan los incendios.'],
        ['¿Quién te atiende cuando estás enfermo?', ['La doctora', 'El policía', 'El bombero'], 'La doctora nos cura.'],
        ['¿Quién hace el pan?', ['El panadero', 'El doctor', 'La policía'], 'El panadero hace el pan.'],
        ['¿Quién lleva las cartas?', ['El cartero', 'El bombero', 'El agricultor'], 'El cartero lleva las cartas a las casas.'],
        ['¿Quién siembra la papa y el maíz?', ['El agricultor', 'El policía', 'El cartero'], 'El agricultor siembra la papa y el maíz.'],
        ['¿Quién nos cuida en la calle?', ['La policía', 'El panadero', 'El pintor'], 'La policía nos cuida en la calle.'],
      ] },
      { id: 'simbolos', titulo: 'Los símbolos de la patria', pasos: [
        ['La bandera: roja y blanca.', 'Hoy aprendemos los símbolos de la patria. La bandera del Perú es roja y blanca.'],
        ['El escudo: una vicuña y un árbol.', 'El escudo tiene una vicuña, el árbol de la quina y monedas.'],
        ['El himno: lo cantamos de pie.', 'El Himno Nacional lo cantamos de pie y con respeto.'],
        ['28 de julio: Fiestas Patrias.', 'El 28 de julio celebramos las Fiestas Patrias.'],
      ], preg: [
        ['¿De qué colores es la bandera del Perú?', ['Rojo y blanco', 'Azul y blanco', 'Verde y amarillo'], 'Nuestra bandera es roja y blanca.'],
        ['¿Qué animal está en el escudo?', ['La vicuña', 'El león', 'El perro'], 'En el escudo está la vicuña.'],
        ['¿Cómo cantamos el Himno Nacional?', ['De pie y con respeto', 'Acostados', 'Gritando'], 'El himno se canta de pie y con respeto.'],
        ['¿Cuándo son las Fiestas Patrias?', ['El 28 de julio', 'El 25 de diciembre', 'El 1 de enero'], 'Las Fiestas Patrias son el 28 de julio.'],
        ['¿Qué celebramos el 28 de julio?', ['La independencia del Perú', 'La Navidad', 'El Año Nuevo'], 'El 28 de julio celebramos la independencia del Perú.'],
      ] },
    ],
    arte: [
      { id: 'colores', titulo: 'Mezclamos colores', formas: true, pasos: [
        ['Primarios: rojo, azul y amarillo.', 'Hoy jugamos con los colores. Los primarios son rojo, azul y amarillo.'],
        ['Azul + amarillo = verde', 'Si mezclamos azul y amarillo… ¡sale verde!'],
        ['Rojo + amarillo = naranja', 'Rojo y amarillo hacen naranja.'],
        ['Rojo + azul = morado', 'Y rojo con azul hacen morado.'],
      ], preg: [
        ['¿Qué color sale de azul + amarillo?', ['Verde', 'Rosado', 'Negro'], 'Azul y amarillo hacen verde.'],
        ['¿Qué color sale de rojo + amarillo?', ['Naranja', 'Verde', 'Celeste'], 'Rojo y amarillo hacen naranja.'],
        ['¿Cuál es un color primario?', ['Azul', 'Verde', 'Morado'], 'Los primarios son rojo, azul y amarillo.'],
        ['Rojo + azul =', ['Morado', 'Amarillo', 'Verde'], 'Rojo y azul hacen morado.'],
      ] },
      { id: 'figuras', titulo: 'Dibujamos con figuras', pasos: [
        ['Círculo, cuadrado y triángulo.', 'Hoy dibujamos con figuras: el círculo, el cuadrado y el triángulo.'],
        ['Casa = cuadrado + triángulo.', 'Una casa es un cuadrado con un triángulo de techo.'],
        ['Sol = círculo + rayitos.', 'Un sol es un círculo con rayitos.'],
        ['¡Con figuras dibujamos de todo!', 'Con figuras podemos dibujar de todo. ¡Inténtenlo en casa!'],
      ], preg: [
        ['¿Qué figura usamos para el techo?', ['Un triángulo', 'Un círculo', 'Una línea'], 'El techo de la casa es un triángulo.'],
        ['¿Qué figura es redonda como el sol?', ['El círculo', 'El cuadrado', 'El triángulo'], 'El círculo es redondo.'],
        ['¿Cuántos lados tiene un triángulo?', ['3', '4', '5'], 'Tri quiere decir tres: el triángulo tiene 3 lados.'],
        ['¿Cuántos lados tiene un cuadrado?', ['4', '3', '6'], 'El cuadrado tiene 4 lados iguales.'],
      ] },
    ],
  };
  const temaPorId = (curso, id) => (TEMAS[curso] || []).find((t) => t.id === id) || null;
  const val = (x) => (typeof x === 'function' ? x() : x);
  function preguntaMC(p, tema, lectura) {
    const correcta = p[1][0], ops = barajar(p[1]);
    const q = { tipo: 'op', q: p[0], ops, r: ops.indexOf(correcta), exp: p[2], tema };
    if (lectura) q.lectura = lectura;
    return q;
  }
  // ejercicios para la tarea o para practicar
  function generarEjercicios(curso, temaId, n) {
    const t = temaPorId(curso, temaId);
    if (!t) return [];
    if (t.mat) return Array.from({ length: n || 6 }, () => ejercicioMat(temaId));
    const lista = barajar(t.preg);
    return Array.from({ length: n || 5 }, (_, i) => preguntaMC(lista[i % lista.length], temaId, t.lectura));
  }

  // ---------------------------------------------------------------- la pizarra (canvas compartido: aula 3D y pantalla de la clase)
  const CV = document.createElement('canvas');
  CV.width = 1120; CV.height = 400;
  CV.className = 'cl-pizarra';
  const g = CV.getContext('2d');
  let TEX = null;
  let pzActual = null;
  const FUENTE = '"Trebuchet MS", "Comic Sans MS", sans-serif';
  function envolver(texto, ancho) {
    const pal = String(texto).split(' '), out = [];
    let l = '';
    pal.forEach((p) => { const t = l ? l + ' ' + p : p; if (g.measureText(t).width > ancho && l) { out.push(l); l = p; } else l = t; });
    if (l) out.push(l);
    return out;
  }
  function dibujarCuenta(c, x, y) {
    const info = c.info || cuentaInfo(c.a, c.b, c.op);
    const k = c.k == null ? info.n : c.k;
    const W = 62, der = x + 300;
    const cx = (i) => der - i * W - W / 2;
    g.textAlign = 'center';
    // marcas (llevo / presto)
    g.font = `bold 30px ${FUENTE}`; g.fillStyle = '#ffb3a7';
    info.marcas.forEach((m) => { if (k > m.paso) g.fillText(m.t, cx(m.col), y + 30); });
    g.font = `bold 66px ${FUENTE}`; g.fillStyle = '#f4f1ea';
    String(info.a).split('').reverse().forEach((d, i) => g.fillText(d, cx(i), y + 96));
    String(info.b).split('').reverse().forEach((d, i) => g.fillText(d, cx(i), y + 168));
    g.fillText(info.op, der - (info.n + 0.6) * W, y + 168);
    g.fillRect(der - (info.n + 1.1) * W, y + 188, (info.n + 1.1) * W + 10, 6);
    g.fillStyle = '#ffe58a';
    for (let i = 0; i < Math.min(k, info.n); i++) { if (info.res[i] != null) g.fillText(String(info.res[i]), cx(i) - (String(info.res[i]).length > 1 ? W / 2 : 0), y + 262); }
    // columna que se está trabajando
    if (k > 0 && k <= info.n) { g.strokeStyle = 'rgba(255,229,138,.55)'; g.lineWidth = 3; g.strokeRect(cx(k - 1) - W / 2 + 4, y + 40, W - 8, 236); }
  }
  const COLORES = { Rojo: '#e04a3a', Azul: '#3d7fd4', Amarillo: '#f2d23a', Verde: '#3aa857', Naranja: '#f28c28', Morado: '#8a4fc0' };
  function pintarPizarra(pz) {
    pzActual = pz;
    g.fillStyle = '#2f5d46'; g.fillRect(0, 0, CV.width, CV.height);
    g.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % CV.width, (i * 53) % CV.height, 60, 3);
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left'; g.font = `bold 46px ${FUENTE}`; g.fillStyle = '#ffe58a';
    g.fillText(pz.titulo || '', 40, 64);
    if (pz.fecha) { g.textAlign = 'right'; g.font = `28px ${FUENTE}`; g.fillStyle = '#cfe3d6'; g.fillText(pz.fecha, CV.width - 36, 58); }
    let x0 = 44;
    if (pz.cuenta) { dibujarCuenta(pz.cuenta, 60, 90); x0 = 470; }
    let y = 128;
    g.textAlign = 'left';
    const lineas = pz.lineas || [];
    lineas.forEach((l, i) => {
      const ultima = i === lineas.length - 1 && pz.resaltar !== false;
      g.font = `${ultima ? 'bold ' : ''}${pz.cuenta ? 32 : 36}px ${FUENTE}`;
      g.fillStyle = ultima ? '#ffffff' : '#d9e8de';
      envolver(l, CV.width - x0 - 40).forEach((t) => { if (y < CV.height - 10) g.fillText(t, x0, y); y += pz.cuenta ? 42 : 48; });
      // colores de arte: circulitos de color al final de la línea
      if (pz.colores) {
        const cs = Object.keys(COLORES).filter((c) => new RegExp(c, 'i').test(l));
        cs.forEach((c, j) => { g.fillStyle = COLORES[c]; g.beginPath(); g.arc(CV.width - 60 - (cs.length - 1 - j) * 50, y - 60, 20, 0, 2 * PI); g.fill(); });
      }
    });
    if (TEX) TEX.needsUpdate = true;
  }
  function pizarraEnAula(E) {
    if (!E.pizarra || !window.THREE) return;
    if (!TEX) TEX = new THREE.CanvasTexture(CV);
    E.pizarra.material.map = TEX;
    E.pizarra.material.needsUpdate = true;
    TEX.needsUpdate = true;
  }

  // ---------------------------------------------------------------- pantalla de la clase
  document.body.insertAdjacentHTML('beforeend', `
<div class="clase" id="clase" hidden role="dialog" aria-labelledby="clCurso">
  <div class="cl-arriba">
    <header class="cl-cab"><span class="cl-curso" id="clCurso"></span><span class="cl-fase" id="clFase"></span></header>
    <div class="cl-marco" id="clMarco"></div>
  </div>
  <div class="cl-abajo">
    <p class="cl-quien" id="clQuien"></p>
    <p class="cl-texto" id="clTexto" aria-live="polite"></p>
    <div class="cl-ops" id="clOps"></div>
    <button class="btn cl-seguir" type="button" id="clSeguir">Seguir ▶</button>
  </div>
</div>
<div class="pantalla col-mochila" id="colMochila" hidden><div class="hoja cm-hoja" role="dialog" aria-labelledby="cmTit">
  <p class="eyebrow" id="cmEy">Alistar la mochila</p>
  <h2 id="cmTit">¿Qué cuadernos llevas?</h2>
  <div class="cm-horario" id="cmHorario"></div>
  <p class="cm-tarea" id="cmTarea" hidden></p>
  <div class="cm-cuadernos" id="cmCuadernos"></div>
  <p class="cm-msg" id="cmMsg" aria-live="polite"></p>
  <div class="cm-pie"><button class="btn" type="button" id="cmListo">Cerrar la mochila</button></div>
</div></div>`);
  $('#clMarco').appendChild(CV);

  let C = null;   // la clase en curso: { cola, fin, esperaResp }
  function quienEs(q) {
    const E = A.escena;
    if (q === 'profe') return { nom: 'Profesora', obj: E && E.profe };
    if (q === 'yo') return { nom: nombre(), obj: A.P };
    if (typeof q === 'number') { const k = E && E.companeros && E.companeros[q]; return { nom: COMPAS[q].nombre, obj: k }; }
    if (q && typeof q === 'object') return q;
    return { nom: '', obj: null };
  }
  function correrClase(cola, fin, cab) {
    C = { cola: cola.slice(), fin };
    $('#clCurso').textContent = cab.curso;
    $('#clCurso').style.setProperty('--c', cab.color || '#3d9bd4');
    $('#clFase').textContent = cab.fase || '';
    $('#clase').hidden = false;
    A.bloquear('clase', true);
    siguientePaso();
  }
  function siguientePaso() {
    if (!C) return;
    const x = C.cola.shift();
    if (!x) {
      const f = C.fin;
      C = null;
      $('#clase').hidden = true;
      A.bloquear('clase', false);
      if (f) f();
      return;
    }
    if (x.t === 'fn') { x.f(); siguientePaso(); return; }
    if (x.cab) { $('#clCurso').textContent = x.cab.curso; $('#clCurso').style.setProperty('--c', x.cab.color); }
    if (x.pz) pintarPizarra(x.pz);
    const q = quienEs(x.quien), texto = val(x.texto);
    $('#clQuien').textContent = q.nom;
    $('#clQuien').dataset.quien = x.quien === 'profe' ? 'profe' : x.quien === 'yo' ? 'yo' : 'comp';
    $('#clTexto').textContent = texto;
    if (q.obj) A.decir(q.obj, texto, Math.min(6, 2 + texto.length * 0.05));
    if (x.anim && q.obj) { q.obj.anim = x.anim; setTimeout(() => { if (q.obj.anim === x.anim) q.obj.anim = q.obj.sentado ? 'leer' : 'quieto'; }, 2500); }
    const ops = $('#clOps');
    if (x.t === 'preg') {
      C.esperaResp = x;
      ops.innerHTML = x.q.ops.map((o, i) => `<button class="op cl-op" type="button" data-i="${i}"><kbd>${i + 1}</kbd><span class="op-t"></span></button>`).join('');
      [...ops.children].forEach((b, i) => { b.querySelector('.op-t').textContent = x.q.ops[i]; });
      $('#clSeguir').hidden = true;
    } else {
      ops.innerHTML = '';
      $('#clSeguir').hidden = false;
      if (x.f) x.f();
    }
  }
  function responderClase(i) {
    const x = C && C.esperaResp;
    if (!x) return;
    C.esperaResp = null;
    const ok = i === x.q.r;
    const bs = [...$('#clOps').children];
    bs.forEach((b, k) => { b.disabled = true; if (k === i) b.classList.add(ok ? 'correcta' : 'mala'); if (k === x.q.r && !ok) b.classList.add('era'); });
    A.sfx(ok ? 'bien' : 'perder');
    if (x.alResponder) x.alResponder(ok);
    const sig = ok
      ? { quien: 'profe', texto: x.bien || ['¡Muy bien!', '¡Correcto! Así se hace.', '¡Excelente!'][azar(0, 2)], anim: 'saludar' }
      : { quien: 'profe', texto: `Casi. ${x.q.exp}${x.q.tipo === 'num' ? '' : ` La respuesta es: ${x.q.ops[x.q.r]}.`}`, pz: x.pzMal };
    C.cola.unshift(sig);
    if (x.yo !== false) C.cola.unshift({ quien: 'yo', texto: x.q.ops[i] + (ok ? '' : '…'), f: null, solo: true });
    setTimeout(siguientePaso, 700);
  }
  $('#clSeguir').addEventListener('click', () => { A.sfx('click'); siguientePaso(); });
  $('#clOps').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b && !b.disabled) responderClase(+b.dataset.i); });

  // ---------------------------------------------------------------- guiones de la clase
  const cab = (curso, turno) => ({ curso: `${CURSOS[curso].emoji} ${CURSOS[curso].nombre}`, color: CURSOS[curso].color, fase: `${turno}.ª hora · ${nombreDia(hoy())}` });
  // la pregunta para el niño (y lo que pasa al responder)
  function pregunta(q, lead, reg) {
    return { t: 'preg', quien: 'profe', texto: `${lead}${q.tipo === 'num' ? (q.texto ? q.texto : `¿Cuánto es ${q.a} ${q.op} ${q.b}?`) : q.q}`, q, alResponder: (ok) => { reg.total++; if (ok) reg.ok++; } };
  }
  function mcDeNum(e) {
    const o = opcionesNum(e.r), info = cuentaInfo(e.a, e.b, e.op);
    return Object.assign({}, e, { ops: o.ops, r: o.r, rNum: e.r, exp: info.pasos.join(' ') + ` Entonces es ${e.r}.`, info });
  }
  // lo que dice el compañero al resolver (bien o mal)
  function resolverCompa(i, e, mal) {
    const comp = COMPAS[i].nombre;
    if (e.tipo === 'num') {
      const info = cuentaInfo(e.a, e.b, e.op);
      const malo = e.r + (e.op === '+' ? -10 : 10);
      const pzOk = { titulo: 'Revisamos la tarea', cuenta: { a: e.a, b: e.b, op: e.op, k: info.n, info }, lineas: [`${comp}: ${e.a} ${e.op} ${e.b} = ${e.r}`] };
      if (!mal || malo < 0 || info.marcas.length === 0) {
        return [
          { quien: i, texto: `${e.a} ${e.op} ${e.b} es ${e.r}. ${info.pasos[0]}`, pz: pzOk, anim: 'saludar' },
          { quien: 'profe', texto: `¡Muy bien, ${comp}! Así se hace.` },
        ];
      }
      return [
        { quien: i, texto: `Me salió ${malo}…`, pz: { titulo: 'Revisamos la tarea', cuenta: { a: e.a, b: e.b, op: e.op, k: 0, info }, lineas: [`${comp}: ${malo}`] } },
        { quien: 'profe', texto: `Casi, ${comp}. Te olvidaste de ${e.op === '+' ? 'lo que llevabas' : 'lo que prestaste'}. ${info.pasos.join(' ')} Es ${e.r}.`, pz: pzOk },
      ];
    }
    const correcta = e.ops[e.r];
    const pzOk = { titulo: 'Revisamos la tarea', lineas: [e.q, `${comp}: ${correcta}`] };
    if (!mal) return [{ quien: i, texto: `¡${correcta}!`, pz: pzOk, anim: 'saludar' }, { quien: 'profe', texto: `¡Muy bien, ${comp}! ${e.exp}` }];
    const malo = e.ops.find((o, k) => k !== e.r) || correcta;
    return [
      { quien: i, texto: `¿${malo}?`, pz: { titulo: 'Revisamos la tarea', lineas: [e.q, `${comp}: ${malo}`] } },
      { quien: 'profe', texto: `Casi, ${comp}. ${e.exp}`, pz: pzOk },
    ];
  }

  // revisión de la tarea: primero dos compañeros (repaso en voz alta), luego tú
  function guionRevision(reg) {
    const c = col(), t = c.tarea;
    if (!t || !t.ejercicios || !t.ejercicios.length || t.dia >= hoy()) return [];
    const curso = CURSOS[t.curso], ejs = t.ejercicios;
    const lleva = llevados(), trajo = lleva.includes(t.curso), hecha = !!t.hecha;
    const bien = hecha && (t.puntaje == null || t.puntaje >= 0.5);
    const practico = c.practico && c.practico.tema === t.tema;
    const n = nombre();
    const pasos = [
      { quien: 'profe', cab: { curso: `📝 Tarea de ${curso.nombre}`, color: curso.color }, texto: `Antes de empezar, revisamos la tarea de ${curso.nombre}: ${t.titulo}. A ver, ${COMPAS[0].nombre}, pasa a la pizarra.`, pz: { titulo: 'Revisamos la tarea', fecha: curso.nombre, lineas: [t.titulo] } },
      ...resolverCompa(0, ejs[0], false),
      { quien: 'profe', texto: `Ahora tú, ${COMPAS[1].nombre}. El siguiente.` },
      ...resolverCompa(1, ejs[1 % ejs.length], true),
      { quien: 'profe', texto: `${n}, ¿y tu tarea?`, pz: { titulo: 'Revisamos la tarea', fecha: curso.nombre, lineas: [t.titulo, `Ahora: ${n}`] } },
    ];
    const qe = ejs[2 % ejs.length];
    const q = qe.tipo === 'num' ? mcDeNum(qe) : qe;
    const pzQ = qe.tipo === 'num' ? { titulo: 'Repaso', cuenta: { a: qe.a, b: qe.b, op: qe.op, k: 0 }, lineas: [qe.texto || '¿Cuánto es?'] } : { titulo: 'Repaso', lineas: [qe.q] };
    const pzSol = qe.tipo === 'num' ? { titulo: 'Repaso', cuenta: { a: qe.a, b: qe.b, op: qe.op }, lineas: [`${qe.a} ${qe.op} ${qe.b} = ${qe.r}`] } : { titulo: 'Repaso', lineas: [qe.q, qe.ops[qe.r]] };
    let ok;
    if (hecha && trajo) {
      ok = true;
      pasos.push({ quien: 'yo', texto: '¡Aquí está!', anim: 'saludar' });
      pasos.push({ quien: 'profe', texto: bien ? `¡Muy bien hecha, ${n}! Te pongo una estrellita.${practico ? ' Y se nota que practicaste en casa.' : ''}` : `La hiciste, ¡bien! Tienes algunos errores, así que repasemos uno juntos.`, f: () => { A.sfx('logro'); } });
    } else if (hecha) {
      ok = false;
      pasos.push({ quien: 'yo', texto: `¡Ay! La hice, pero mi cuaderno de ${curso.nombre} se quedó en casa…` });
      pasos.push({ quien: 'profe', texto: `Te creo, ${n}. Revisa tu horario al alistar la mochila. Igual repasemos uno.` });
    } else {
      ok = false;
      pasos.push({ quien: 'yo', texto: 'No la hice…' });
      pasos.push({ quien: 'profe', texto: `Bueno, ${n}. La tarea te ayuda a recordar lo que aprendimos. Te lo explico otra vez, pon atención.` });
      if (qe.tipo === 'num') {
        const info = cuentaInfo(ejs[0].a, ejs[0].b, ejs[0].op);
        info.pasos.forEach((p, i) => pasos.push({ quien: 'profe', texto: p, pz: { titulo: t.titulo, cuenta: { a: ejs[0].a, b: ejs[0].b, op: ejs[0].op, k: i + 1, info }, lineas: [p] } }));
      } else {
        const tm = temaPorId(t.curso, t.tema);
        const lineas = [];
        (tm ? tm.pasos.slice(0, 3) : []).forEach(([l, d]) => { lineas.push(val(l)); pasos.push({ quien: 'profe', texto: val(d), pz: { titulo: t.titulo, lineas: lineas.slice() } }); });
      }
    }
    const pq = pregunta(q, `A ver, ${n}: `, reg);
    pq.pz = pzQ; pq.pzMal = pzSol;
    pq.bien = ok ? '¡Eso! Lo sabes muy bien.' : '¡Muy bien! Ya lo entendiste.';
    pasos.push(pq);
    pasos.push({ t: 'fn', f: () => {
      S().f.tareaEntregada = ok ? 'si' : 'no';
      if (ok) { A.habito('Cumplir con la tarea'); A.cambiar(bien ? { animo: 8, motivacion: 6, confianza: practico ? 3 : 0 } : { animo: 4, motivacion: 3 }); A.anotar(bien ? `Entregaste la tarea de ${curso.nombre}. La profe te felicitó.` : `Entregaste la tarea de ${curso.nombre} y repasaste lo que te costó.`, 'bien'); }
      else if (hecha) { A.cambiar({ animo: -3 }); A.anotar(`Hiciste la tarea, pero tu cuaderno de ${curso.nombre} se quedó en casa.`, ''); }
      else { A.malHabito('Olvidar la tarea'); A.cambiar({ animo: -5, motivacion: -3 }); A.anotar(`No hiciste la tarea de ${curso.nombre}. La profe te lo explicó otra vez.`, 'mal'); }
      guardarCol({ tarea: null, revisada: { curso: t.curso, tema: t.tema, ok, hecha, dia: hoy() } });
      A.evento('tareaRevisada', { curso: t.curso, tema: t.tema, ok, hecha });
    } });
    return pasos;
  }

  // ¿trajiste el cuaderno?
  function guionCuaderno(curso, turno) {
    if (llevados().includes(curso)) return [];
    const cn = CURSOS[curso].nombre;
    const amigo = turno === 2 ? (H.dia2 && H.dia2.esAmigo && H.dia2.esAmigo() ? 'Teo' : COMPAS[3].nombre) : null;
    return [
      { quien: 'yo', texto: `¡Uy! No traje mi cuaderno de ${cn}.` },
      amigo
        ? { quien: 'profe', texto: `${amigo}, ¿le compartes tu cuaderno? Mañana revisa tu horario, ${nombre()}.`, f: () => { A.cambiar({ animo: -2 }); A.anotar(`Olvidaste el cuaderno de ${cn}: ${amigo} te compartió el suyo.`, ''); } }
        : { quien: 'profe', texto: `No pasa nada, ${nombre()}. Te presto unas hojas. Mañana revisa tu horario.`, f: () => { A.cambiar({ animo: -3 }); A.anotar(`Olvidaste el cuaderno de ${cn}: la profe te prestó hojas.`, ''); } },
    ];
  }

  // la lección del día en la pizarra + preguntas
  function guionLeccion(curso, tema, turno, reg) {
    const pasos = [], fecha = `${nombreDia(hoy())} · ${CURSOS[curso].nombre}`;
    const n = nombre();
    if (tema.mat) {
      const ej = tema.id === 'problemas' ? problema() : cuentaDe(tema.id);
      const info = cuentaInfo(ej.a, ej.b, ej.op);
      const cu = (k) => ({ a: ej.a, b: ej.b, op: ej.op, k, info });
      pasos.push({ quien: 'profe', cab: cab(curso, turno), texto: tema.intro, pz: { titulo: tema.titulo, fecha, cuenta: cu(0), lineas: [ej.texto || 'Unidades con unidades, decenas con decenas.'] } });
      if (ej.texto) pasos.push({ quien: 'profe', texto: `Leamos: ${ej.texto} ¿Juntamos o quitamos? ${ej.op === '+' ? 'Juntamos: es una suma.' : 'Quitamos: es una resta.'}`, pz: { titulo: tema.titulo, fecha, cuenta: cu(0), lineas: [ej.texto, ej.op === '+' ? 'Juntamos → sumamos' : 'Quitamos → restamos'] } });
      info.pasos.forEach((p, i) => pasos.push({ quien: 'profe', texto: p, pz: { titulo: tema.titulo, fecha, cuenta: cu(i + 1), lineas: [p] } }));
      pasos.push({ quien: 'profe', texto: `Entonces, ${ej.a} ${ej.op} ${ej.b} = ${ej.r}. ¿Vieron? Columna por columna, sin apurarse.`, pz: { titulo: tema.titulo, fecha, cuenta: cu(info.n), lineas: [`${ej.a} ${ej.op} ${ej.b} = ${ej.r}`] } });
      // un compañero y luego tú
      const ec = ejercicioMat(tema.id), ic = cuentaInfo(ec.a, ec.b, ec.op);
      pasos.push({ quien: 'profe', texto: `¿Quién me ayuda con este? ${COMPAS[2].nombre}.`, pz: { titulo: tema.titulo, fecha, cuenta: { a: ec.a, b: ec.b, op: ec.op, k: 0, info: ic }, lineas: [ec.texto || '¿Cuánto es?'] } });
      pasos.push({ quien: 2, texto: `¡Yo! ${ic.pasos[ic.pasos.length - 1]} ¡Es ${ec.r}!`, anim: 'saludar', pz: { titulo: tema.titulo, fecha, cuenta: { a: ec.a, b: ec.b, op: ec.op, info: ic }, lineas: [`${COMPAS[2].nombre}: ${ec.r}`] } });
      pasos.push({ quien: 'profe', texto: `¡Muy bien, ${COMPAS[2].nombre}!` });
      [0, 1].forEach((k) => {
        const e = mcDeNum(ejercicioMat(tema.id));
        const pq = pregunta(e, k ? 'Otro más: ' : `${n}, te toca: `, reg);
        pq.pz = { titulo: tema.titulo, fecha, cuenta: { a: e.a, b: e.b, op: e.op, k: 0, info: e.info }, lineas: [e.texto || 'Piensa columna por columna.'] };
        pq.pzMal = { titulo: tema.titulo, fecha, cuenta: { a: e.a, b: e.b, op: e.op, info: e.info }, lineas: [`${e.a} ${e.op} ${e.b} = ${e.rNum}`] };
        pasos.push(pq);
      });
      return pasos;
    }
    const lineas = [];
    const pzBase = () => ({ titulo: tema.titulo, fecha, lineas: lineas.slice(), colores: !!tema.formas });
    pasos.push({ quien: 'profe', cab: cab(curso, turno), texto: `Ahora, ${CURSOS[curso].nombre}. Hoy aprendemos: ${tema.titulo}.`, pz: pzBase() });
    tema.pasos.forEach(([l, d]) => { lineas.push(val(l)); pasos.push({ quien: 'profe', texto: val(d), pz: pzBase() }); });
    const preg = barajar(tema.preg);
    const pc = preguntaMC(preg[0], tema.id);
    pasos.push({ quien: 'profe', texto: `¿Quién sabe? ${pc.q}`, pz: Object.assign(pzBase(), { lineas: lineas.concat([pc.q]) }) });
    pasos.push({ quien: 0, texto: `¡Yo! ${pc.ops[pc.r]}.`, anim: 'saludar' });
    pasos.push({ quien: 'profe', texto: `¡Muy bien, ${COMPAS[0].nombre}! ${pc.exp}` });
    [1, 2].forEach((k) => {
      const q = preguntaMC(preg[k % preg.length], tema.id);
      const pq = pregunta(q, k === 1 ? `${n}, ahora tú: ` : 'Una más: ', reg);
      pq.pz = Object.assign(pzBase(), { lineas: lineas.concat([q.q]) });
      pasos.push(pq);
    });
    return pasos;
  }

  // ---------------------------------------------------------------- la clase completa
  function empezarClase(turno) {
    const abs = hoy(), sel = temaDe(abs, turno);
    if (!sel) return;
    const { curso, tema } = sel;
    const reg = { ok: 0, total: 0 };
    const P = A.P;
    P.sentado = true; P.anim = 'leer';
    P.root.position.set(3, 0, 2.72); P.root.rotation.y = PI;
    const cola = [];
    if (S().energia < 35) { S().f.colHambre = true; cola.push({ quien: 'yo', texto: `Tengo hambre… me cuesta poner atención.` }); }
    cola.push(...guionCuaderno(curso, turno));
    if (turno === 1) cola.push(...guionRevision(reg));
    cola.push(...guionLeccion(curso, tema, turno, reg));
    const dejaTarea = turnoTarea(abs) === turno && curso !== 'arte';
    if (dejaTarea) {
      const prox = siguienteColegio(abs + 1);
      const cuando = prox === abs + 1 ? 'mañana' : `el ${nombreDia(prox).toLowerCase()}`;
      cola.push({ quien: 'profe', texto: `De tarea para ${cuando}: ejercicios de ${tema.titulo.toLowerCase()} en su cuaderno de ${CURSOS[curso].nombre}. ¡No se olviden!`,
        pz: { titulo: 'Tarea', fecha: `Para ${cuando}`, lineas: [`${CURSOS[curso].nombre}: ${tema.titulo}`, 'En tu cuaderno, con letra bonita.'] },
        f: () => dejarTarea(curso, tema.id) });
    } else if (curso === 'arte') {
      cola.push({ quien: 'profe', texto: '¡Qué bonitos trabajos! En casa pueden dibujar lo que aprendimos.' });
    }
    correrClase(cola, () => terminarClase(turno, curso, tema, reg), cab(curso, turno));
  }
  function terminarClase(turno, curso, tema, reg) {
    const f = S().f;
    f['clase' + turno] = true;
    f.colAprendio = (f.colAprendio || []).concat([tema.titulo]);
    f.colAciertos = (f.colAciertos || 0) + reg.ok;
    const P = A.P;
    P.sentado = false; P.anim = 'quieto';
    P.root.position.set(3.8, 0, 2.75);
    guardarCol({ ultima: { curso, tema: tema.id, titulo: tema.titulo, dia: hoy() } });
    A.cambiar(reg.ok >= reg.total && reg.total ? { animo: 5, motivacion: 5 } : { motivacion: 2 });
    A.anotar(`Clase de ${CURSOS[curso].nombre}: ${tema.titulo}${reg.total ? ` (${reg.ok} de ${reg.total} bien)` : ''}.`, reg.ok ? 'bien' : '');
    A.evento('clase', { curso, tema: tema.id, titulo: tema.titulo, aciertos: reg.ok, preguntas: reg.total, turno });
    const seguir = () => (turno === 1 ? alRecreo() : aCasa());
    // en Matemática, al final hay cálculo mental (el examen corto del motor)
    if (curso === 'matematica' && A.examen && !f.examenHecho) {
      A.decir(A.escena.profe, 'Ahora, cálculo mental. ¡Respondan rápido en su hoja!', 3);
      setTimeout(() => A.examen(seguir), 1600);
    } else seguir();
  }
  function alRecreo() {
    const E = A.escena;
    S().min = Math.max(S().min, 9 * 60 + 50);
    setTimeout(() => { A.sfx('timbre'); A.avisar('¡Riiing! Suena el timbre del recreo.'); }, 600);
    if (E && E.profe) A.decir(E.profe, '¡A recreo! Después seguimos con la otra clase.', 3);
    const sig = temaDe(hoy(), 2);
    setTimeout(() => A.irA('patio', {
      desde: 'aula', titulo: 'Colegio · Recreo',
      tips: [
        sig ? `Después del recreo: ${CURSOS[sig.curso].nombre}.` : 'Pasaron dos horas de clase.',
        S().f.desayuno === 'bueno' ? 'Desayunaste bien: todavía tienes energía.' : 'Tu estómago suena: no desayunaste bien.',
        S().dinero ? `Tienes S/ ${S().dinero} de propina para el kiosco.` : 'No tienes propina para el kiosco.',
      ],
    }), 2600);
  }
  function aCasa() {
    const E = A.escena;
    setTimeout(() => { A.sfx('timbre'); A.avisar('¡Riiing! Hora de salida.'); }, 400);
    if (E && E.profe) A.decir(E.profe, '¡Hasta mañana, chicos! No se olviden de la tarea.', 3);
    setTimeout(() => { if (A.irACasa) A.irACasa(); }, 2800);
  }
  // del recreo vuelves al aula para la 2.ª hora
  function volverAClase() {
    const f = S().f;
    if (f.clase2) { if (A.irACasa) A.irACasa(); return; }
    f.colTurno = 2;
    S().min = Math.max(S().min, 10 * 60 + 30);
    const sig = temaDe(hoy(), 2);
    A.irA('aula', { desde: 'patio', titulo: 'Colegio · 2.ª hora', tips: [
      sig ? `Ahora toca ${CURSOS[sig.curso].nombre}.` : 'Vuelves al aula.',
      S().f.comioKiosco === 'bien' ? 'Comiste en el recreo: tienes energía.' : 'No comiste en el recreo: te suena la tripa.',
      'Siéntate en tu carpeta.',
    ] });
  }

  // ---------------------------------------------------------------- la tarea
  function dejarTarea(curso, temaId, abs) {
    const t = temaPorId(curso, temaId);
    if (!t) return null;
    const d = abs || hoy();
    const tarea = { curso, tema: temaId, titulo: t.titulo, ejercicios: generarEjercicios(curso, temaId, t.mat ? 6 : 5), dia: d, hecha: false, puntaje: null };
    guardarCol({ tarea });
    S().f.tareaDejada = true;
    A.anotar(`Tarea de ${CURSOS[curso].nombre}: ${t.titulo}.`, '');
    A.evento('tareaDejada', { curso, tema: temaId });
    return tarea;
  }
  const tareaPendiente = () => { const t = col().tarea; return t && !t.hecha ? t : null; };
  function tareaHecha(primera, total) {
    const c = col();
    if (!c.tarea) return;
    c.tarea.hecha = true;
    c.tarea.puntaje = total ? primera / total : 1;
    guardarCol({ tarea: c.tarea });
    S().f.tareaTarde = true;
  }
  // ¿qué se practica en el escritorio? la tarea pendiente o la última clase
  function paraPracticar() {
    const c = col();
    const base = c.tarea || c.ultima;
    if (!base) return null;
    const t = temaPorId(base.curso, base.tema);
    if (!t) return null;
    return { curso: base.curso, tema: base.tema, titulo: t.titulo, cursoNombre: CURSOS[base.curso].nombre, ejercicios: () => generarEjercicios(base.curso, base.tema, t.mat ? 6 : 5) };
  }
  function practicado(tema) { guardarCol({ practico: { tema, dia: hoy() } }); }

  // ---------------------------------------------------------------- la mochila
  function llevados() {
    const m = col().mochila;
    return m && m.cuadernos ? m.cuadernos.slice() : [];
  }
  // para qué día alistas: hoy (mañana de colegio) o el próximo día de colegio
  function diaObjetivo() {
    const abs = hoy();
    if (S().fase === 'manana' && hayColegio(abs)) return abs;
    return siguienteColegio(abs + 1);
  }
  const requeridos = (abs) => { const r = cursosDe(abs); const t = col().tarea; if (t && t.dia < abs && !r.includes(t.curso)) r.push(t.curso); return r; };
  const preparada = (abs) => { const m = col().mochila; return !!(m && m.dia === abs); };
  function mochilaActiva() {
    if (S().fase === 'colegio') return false;
    if (tareaPendiente()) return true;
    return !preparada(diaObjetivo());
  }
  function horarioHTML(marcar) {
    return `<table class="cm-tabla"><tr>${[1, 2, 3, 4, 5].map((d) => `<th class="${d === marcar ? 'hoy' : ''}">${DIAS[d - 1].slice(0, 3)}</th>`).join('')}</tr>`
      + [0, 1].map((t) => `<tr>${[1, 2, 3, 4, 5].map((d) => { const c = HORARIO[d][t]; return `<td class="${d === marcar ? 'hoy' : ''}" style="--c:${CURSOS[c].color}"><span>${CURSOS[c].emoji}</span>${CURSOS[c].corto}</td>`; }).join('')}</tr>`).join('') + '</table>';
  }
  let M = null;   // la mochila abierta: { dia, elegidos:Set, avisado }
  function abrirMochila(alCerrar) {
    const abs = diaObjetivo();
    const cuando = abs === hoy() ? 'hoy' : abs === hoy() + 1 ? 'mañana' : `el ${nombreDia(abs).toLowerCase()}`;
    M = { dia: abs, elegidos: new Set(), avisado: false, fin: alCerrar };
    $('#cmEy').textContent = `Alistar la mochila para ${cuando}`;
    $('#cmTit').textContent = `${nombreDia(abs)}: ${textoCursos(cursosDe(abs))}`;
    $('#cmHorario').innerHTML = horarioHTML(diaSemana(abs));
    const t = col().tarea;
    const tt = t && t.dia < abs ? t : null;
    $('#cmTarea').hidden = !tt;
    if (tt) $('#cmTarea').textContent = tt.hecha ? `📝 Tu tarea de ${CURSOS[tt.curso].nombre} está en ese cuaderno: ¡llévalo!` : `📝 Tienes tarea de ${CURSOS[tt.curso].nombre} (${tt.titulo}). Va en ese cuaderno.`;
    $('#cmCuadernos').innerHTML = ORDEN.map((c) => `<button class="cm-cuad" type="button" data-c="${c}" aria-pressed="false" style="--c:${CURSOS[c].color}"><span class="cm-emoji">${CURSOS[c].emoji}</span><b>${CURSOS[c].nombre}</b></button>`).join('');
    $('#cmMsg').textContent = 'Toca los cuadernos que tocan según el horario.';
    $('#cmMsg').className = 'cm-msg';
    $('#cmListo').textContent = 'Cerrar la mochila';
    $('#colMochila').hidden = false;
    A.bloquear('mochila', true);
  }
  function tocarCuaderno(c) {
    if (!M) return;
    if (M.elegidos.has(c)) M.elegidos.delete(c); else M.elegidos.add(c);
    A.sfx('click');
    M.avisado = false;
    $('#cmListo').textContent = 'Cerrar la mochila';
    $('#cmMsg').textContent = M.elegidos.size ? `Llevas ${M.elegidos.size} ${M.elegidos.size === 1 ? 'cuaderno' : 'cuadernos'}.` : 'Toca los cuadernos que tocan según el horario.';
    $('#cmMsg').className = 'cm-msg';
    document.querySelectorAll('#cmCuadernos .cm-cuad').forEach((b) => { const on = M.elegidos.has(b.dataset.c); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }
  function cerrarMochila() {
    if (!M) return;
    const req = requeridos(M.dia), el = [...M.elegidos];
    const faltan = req.filter((c) => !el.includes(c)), sobran = el.filter((c) => !req.includes(c));
    if ((faltan.length || sobran.length) && !M.avisado) {
      M.avisado = true;
      $('#cmMsg').textContent = faltan.length ? `Mira el horario: te falta ${faltan.map((c) => CURSOS[c].nombre).join(' y ')}.` : `Ese día no toca ${sobran.map((c) => CURSOS[c].nombre).join(' ni ')}: tu mochila pesará más.`;
      $('#cmMsg').className = 'cm-msg mal';
      $('#cmListo').textContent = 'Llevarla así';
      A.sfx('mal');
      return;
    }
    const m = M;
    M = null;
    $('#colMochila').hidden = true;
    A.bloquear('mochila', false);
    const ok = !faltan.length;
    guardarCol({ mochila: { dia: m.dia, cuadernos: el, ok } });
    const f = S().f;
    if (m.dia === hoy()) { f.mochila = true; f.mochilaOk = ok; } else f.mochilaManana = true;
    if (ok) { A.habito('Alistar la mochila la noche anterior'); A.avisar(sobran.length ? '¡Mochila lista! (con un cuaderno de más)' : '¡Mochila lista! Llevas lo que toca.', 'bien'); A.sfx('bien'); }
    else A.avisar('Mochila cerrada… pero algo no cuadra con el horario.', 'mal');
    A.evento('mochila', { dia: m.dia, cuadernos: el, ok });
    A.refrescar();
    if (m.fin) m.fin(ok);
  }
  $('#cmCuadernos').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) tocarCuaderno(b.dataset.c); });
  $('#cmListo').addEventListener('click', cerrarMochila);

  // el panel de la Mochila del cuarto (reemplaza al del motor)
  function panelMochila() {
    const abs = diaObjetivo(), t = tareaPendiente();
    const cuando = abs === hoy() ? 'Hoy' : abs === hoy() + 1 ? 'Mañana' : `El ${nombreDia(abs).toLowerCase()}`;
    const hambre = S().energia < 25 && S().fase === 'tarde' && !S().f.almorzo;
    const ops = [];
    if (t) {
      const cn = CURSOS[t.curso].nombre, tm = temaPorId(t.curso, t.tema);
      ops.push({
        texto: `Hacer la tarea de ${cn}`, nota: `${t.titulo}. ${tm && tm.mat ? `Si te equivocas, ${masc()} te explica cómo se hace.` : `Si te equivocas, ${masc()} te ayuda a entender.`}`,
        min: 0, anim: 'cocinar', progreso: 'Abriendo el cuaderno', esfuerzo: false,
        pasos: [{ ruta: [[2.3, -0.15]], mira: [3.3, -0.9], anim: 'cocinar', dur: 1.2, min: 0, progreso: 'Abriendo el cuaderno' }],
        bloqueado: hambre ? 'Tienes demasiada hambre para concentrarte. Primero almuerza.' : null,
        alTerminar: () => {
          const listo = (bien) => { S().f.tareaTarde = true; A.habito('Hacer la tarea a tiempo'); A.anotar(bien ? `Hiciste la tarea de ${cn} y entendiste todo.` : `Hiciste la tarea de ${cn}.`, 'bien'); A.refrescar(); };
          if (H.tarea) H.tarea.abrir(listo, { tarea: t, curso: t.curso, cursoNombre: cn, titulo: t.titulo, ejercicios: t.ejercicios });
          else { tareaHecha(1, 1); listo(false); }
        },
      });
    }
    if (hayColegio(abs) && !preparada(abs)) {
      ops.push({
        texto: `Alistar la mochila para ${cuando.toLowerCase()}`, nota: `${cuando}: ${textoCursos(cursosDe(abs))}. Elige los cuadernos que tocan.`,
        min: 5, ef: { confianza: 3 }, anim: 'cocinar', dur: 1.4, progreso: 'Alistando la mochila', esfuerzo: false,
        alTerminar: () => setTimeout(() => abrirMochila(), 50),
      });
    }
    const txtT = t ? `Tienes tarea de ${CURSOS[t.curso].nombre}: ${t.titulo}.` : col().tarea ? 'Tu tarea ya está hecha.' : '';
    return { titulo: 'Tu mochila', texto: `${cuando} (${nombreDia(abs)}): ${textoCursos(cursosDe(abs))}. ${txtT}`.trim(), opciones: ops };
  }

  // ---------------------------------------------------------------- escenas
  A.alConstruir((nombreEsc, E) => {
    const f = S().f;
    // la tarea hecha cuenta para la lista de la tarde (también el fin de semana)
    const t = col().tarea;
    if (S().fase !== 'colegio') f.tareaTarde = !!(t && t.hecha);
    if (nombreEsc === 'dormitorio') {
      // si alistaste la mochila anoche, en la mañana ya está lista
      if (S().fase === 'manana' && hayColegio(hoy()) && preparada(hoy()) && !f.mochila) { f.mochila = true; f.mochilaOk = !!col().mochila.ok; }
      const it = E.inters.find((i) => i.nombre === 'Mochila');
      if (it) { it.activo = mochilaActiva; it.abrir = panelMochila; }
      return;
    }
    if (nombreEsc !== 'aula') return;
    const turno = f.colTurno || 1;
    f.colTurno = turno;
    (E.companeros || []).forEach((k, i) => { if (COMPAS[i]) { k.voz = COMPAS[i].voz; k.nombre = COMPAS[i].nombre; } });
    pizarraEnAula(E);
    const abs = hoy(), cursos = cursosDe(abs);
    const t1 = temaDe(abs, 1), t2 = temaDe(abs, 2);
    pintarPizarra({ titulo: `${nombreDia(abs)}`, fecha: '2.º grado', resaltar: false, lineas: [
      `1.ª hora: ${CURSOS[cursos[0]].nombre}${t1 ? ` · ${t1.tema.titulo}` : ''}`,
      '☀ Recreo',
      `2.ª hora: ${CURSOS[cursos[1]].nombre}${t2 ? ` · ${t2.tema.titulo}` : ''}`,
      turno === 1 && col().tarea && col().tarea.dia < abs ? 'Hoy revisamos la tarea.' : '',
    ].filter(Boolean) });
    E.inters.push(A.etiquetaInter('Profesora', [0, -1.55], [0, -3.2], 1.2, {
      alto: 2.0,
      abrir: () => ({
        titulo: 'La profesora', texto: `Profesora: "Hola, ${nombre()}. Hoy, ${nombreDia(abs).toLowerCase()}, tenemos ${textoCursos(cursos)}. Siéntate en tu carpeta para empezar."`,
        opciones: [{ texto: 'Saludar a la profesora', nota: 'Un "buenos días" alegra a cualquiera.', min: 1, ef: { animo: 2 }, anim: 'saludar', dur: 1.0, esfuerzo: false,
          alTerminar: () => A.decir(E.profe, `¡Buenos días, ${nombre()}!`, 2.4) }],
      }),
    }));
    E.inters.push(A.etiquetaInter('Tu carpeta', [3.8, 2.75], [3, 2.2], 1.0, {
      activo: () => !S().f['clase' + (S().f.colTurno || 1)],
      abrir: () => {
        const tt = S().f.colTurno || 1, sel = temaDe(abs, tt);
        return {
          titulo: `${tt}.ª hora: ${CURSOS[sel.curso].nombre}`,
          texto: `Hoy: ${sel.tema.titulo}. ${S().energia < 35 ? 'Tienes tanta hambre que te cuesta pensar.' : S().energia >= 60 ? `Estás ${gx('atento', 'atenta')} y con energía.` : `Estás algo ${gx('cansado', 'cansada')}.`}`,
          opciones: [{
            texto: 'Sentarte y atender la clase', nota: 'La profe explica en la pizarra y te pregunta.', min: 1, ef: {}, esfuerzo: false,
            pasos: [{ ruta: [[3.8, 2.75], [3, 2.72]], mira: [3, 1.5], anim: 'leer', sentado: true, dur: 0.8, min: 1, progreso: 'Sentándote' }],
            alTerminar: () => setTimeout(() => empezarClase(tt), 60),
          }],
        };
      },
    }));
    const mio = () => {
      const sel = temaDe(abs, turno);
      const saludo = turno === 1
        ? `¡Buenos días, chicos! Hoy tenemos ${textoCursos(cursos)}. Siéntense en sus carpetas.`
        : `¡Volvimos del recreo! Ahora toca ${sel ? CURSOS[sel.curso].nombre : 'clase'}. A sus carpetas.`;
      setTimeout(() => { if (A.escena === E) A.decir(E.profe, saludo, 4); }, 400);
      A.avisar('Siéntate en tu carpeta: la clase va a empezar.');
      if (A.señalar) setTimeout(() => { if (A.escena === E) A.señalar('Tu carpeta', true, { seg: 8 }); }, 900);
    };
    if (turno === 1) { const antes = E.alEntrar; E.alEntrar = () => { if (antes) antes(); mio(); }; }
    else E.alEntrar = mio;   // en la 2.ª hora no se repiten las presentaciones de la mañana
  });

  // al salir del colegio: si por algo no se dejó tarea, igual la hay (y lo que aprendiste va a los tips)
  function alSalir() {
    const abs = hoy();
    if (!hayColegio(abs)) return [];
    if (!S().f.tareaDejada) {
      const tt = turnoTarea(abs), sel = temaDe(abs, tt);
      if (sel && sel.curso !== 'arte') dejarTarea(sel.curso, sel.tema.id, abs);
    }
    const ap = S().f.colAprendio || [];
    const t = col().tarea;
    return [
      ap.length ? `Hoy aprendiste: ${ap.join(' y ')}.` : 'Hoy casi no atendiste en clase.',
      t && !t.hecha ? `Tarea de ${CURSOS[t.curso].nombre}: ${t.titulo}.` : 'No tienes tarea pendiente.',
    ];
  }

  // ---------------------------------------------------------------- el horario en la tarjeta del día
  function pintarTarjeta() {
    const cap = $('#capitulo');
    if (!cap || cap.hidden) return;
    const ref = $('#capSorpresa') || $('#capHoy');
    if (!ref) return;
    let p = $('#capHorario');
    if (!p) { p = document.createElement('p'); p.id = 'capHorario'; p.className = 'cap-horario'; }
    if (p.previousElementSibling !== ref) ref.after(p);
    const abs = hoy();
    p.innerHTML = hayColegio(abs)
      ? `🎒 <b>Hoy en el colegio:</b> ${cursosDe(abs).map((c) => `<span class="cap-curso" style="--c:${CURSOS[c].color}">${CURSOS[c].emoji} ${CURSOS[c].nombre}</span>`).join(' ')}`
      : '🏠 Hoy no hay colegio.';
  }
  const cap0 = $('#capitulo');
  if (cap0) new MutationObserver(pintarTarjeta).observe(cap0, { attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('DOMContentLoaded', () => setTimeout(pintarTarjeta, 0));
  setTimeout(pintarTarjeta, 300);

  // ---------------------------------------------------------------- teclado
  A.alTecla((e) => {
    if (M) {
      if (/^[1-5]$/.test(e.key)) tocarCuaderno(ORDEN[+e.key - 1]);
      else if (e.key === 'Enter') cerrarMochila();
      return true;
    }
    if (!C) return false;
    if (C.esperaResp) { if (/^[1-9]$/.test(e.key) && +e.key <= C.esperaResp.q.ops.length) responderClase(+e.key - 1); }
    else if (e.key === 'Enter' || e.code === 'Space') siguientePaso();
    return true;
  });

  H.colegio = {
    CURSOS, HORARIO, TEMAS,
    horario: () => col().horario,
    cursosDe, hoy, diaSemana, temaDe, siguienteColegio,
    cursosHoy: () => cursosDe(hoy()),
    cuentaInfo, ejercicioMat, parecido, generarEjercicios,
    dejarTarea, tareaHecha, tareaPendiente, paraPracticar, practicado,
    tarea: () => col().tarea, estado: () => col(),
    llevados, abrirMochila, panelMochila,
    empezarClase, volverAClase, alSalir,
    pintarPizarra, get pizarra() { return pzActual; },
    get enClase() { return !!C; }, get mochilaAbierta() { return !!M; },
    // para las pruebas: avanzar la clase o responder
    seguir: () => siguientePaso(), responder: (i) => responderClase(i),
    get pregunta() { return C && C.esperaResp ? C.esperaResp.q : null; },
  };
})();
