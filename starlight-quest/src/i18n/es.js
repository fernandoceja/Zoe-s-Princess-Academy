/* Zoe's Starlight Quest — Spanish (Español) for 1st grade (Nov 16).
 * toEs(english) gives the Spanish for one shown or spoken line, or null when there is none.
 * A line is translated whole or not at all: every sentence must have a Spanish version, so a line is
 * never half English and half Spanish, and the voice can read it in one language.
 *
 * Fairness: math, shapes, time, tallies, stories, praise, hints and the screens are in Spanish. Reading rounds
 * (Belle, Ariel, Anna, Jasmine, Aurora) teach English reading, so their words and answers stay in English and
 * are read by the English voice; Rapunzel's plant rounds are not translated yet either. Answers are checked by
 * card, never by the words on it, so both languages score the same.
 * Imports nothing (node tests load it).
 */

// --- Words ---------------------------------------------------------------------------------------
const EN_NUM = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const ES_NUM = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
  'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco'];

/** "7", "seven", "twenty-four" -> 7 / 24; otherwise null. */
export function numOf(s) {
  const t = String(s).trim().toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  if (t in EN_NUM) return EN_NUM[t];
  const m = t.match(/^(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)-(one|two|three|four|five|six|seven|eight|nine)$/);
  return m ? EN_NUM[m[1]] + EN_NUM[m[2]] : null;
}
/** A number word in Spanish when it is small (choice cards that show words), else digits. */
const esNumWord = (n) => (n < ES_NUM.length ? ES_NUM[n] : String(n));
const N = (s) => { const n = numOf(s); return n === null ? null : String(n); };

// Princess and land names. Princess names stay; places get Spanish names.
export const ES_LANDS = {
  'Whispering Library': 'la Biblioteca Susurrante',
  'Frostfall Peaks': 'los Picos Helados',
  'Sunflower Meadows': 'los Prados de Girasoles',
  'Glass Slipper Village': 'la Aldea de la Zapatilla de Cristal',
  'Seashell Cove': 'la Cala de las Conchas',
  'Wayfinder Isle': 'la Isla del Camino',
  'Moonlit Palace Garden': 'el Jardín del Palacio de la Luna',
  'Sunny Fjord Harbor': 'el Puerto del Fiordo Soleado',
  'Firefly Bayou': 'el Pantano de las Luciérnagas',
  'Rosewood Glen': 'el Valle de las Rosas',
  'Starlight Hub': 'la Plaza de las Estrellas',
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const land = (s) => ES_LANDS[s.trim()] || null;
const landTitle = (s) => { const l = land(s); return l ? cap(l.replace(/^(la|los|el) /, '')) : null; };

// Shapes (gender for "un/una"), things, pictures, vegetables.
const SHAPES = {
  circle: ['círculo', 'm'], square: ['cuadrado', 'm'], triangle: ['triángulo', 'm'], rectangle: ['rectángulo', 'm'],
  pentagon: ['pentágono', 'm'], hexagon: ['hexágono', 'm'], cube: ['cubo', 'm'], cone: ['cono', 'm'],
  cylinder: ['cilindro', 'm'], sphere: ['esfera', 'f'],
};
const THINGS = {
  'a ball': 'una pelota', 'a book': 'un libro', 'a shoebox': 'una caja de zapatos', 'a toy brick': 'un bloque de juguete',
  'a can of soup': 'una lata de sopa', 'a dice': 'un dado', 'a drum': 'un tambor', 'a pointy party hat': 'un gorro de fiesta',
};
const PICS = { crab: 'cangrejo', fish: 'pez', flower: 'flor', shell: 'concha', turtle: 'tortuga' };
const VEG = {   // name, how many (m/f)
  broccoli: ['brócoli', 'm'], carrots: ['zanahorias', 'f'], corn: ['maíz', 'm'], potatoes: ['papas', 'f'], tomatoes: ['tomates', 'm'],
};
const unUna = (en) => { const s = SHAPES[en]; return s ? (s[1] === 'f' ? 'una ' : 'un ') + s[0] : null; };
const cuantos = (veg) => { const v = VEG[veg]; return v ? (v[1] === 'f' ? '¿Cuántas ' : '¿Cuántos ') + v[0] : null; };

/** One short label (a choice card, an answer): numbers, times, shapes, things, pictures, vegetables. */
export function esWord(label) {
  const raw = String(label);
  const lead = (raw.match(/^[\p{Extended_Pictographic}️‍\s]+/u) || [''])[0];
  const t = raw.slice(lead.length).trim();
  if (!t) return raw;
  const n = numOf(t);
  if (n !== null) return lead + (/^\d+$/.test(t) ? t : esNumWord(n));
  let m;
  if ((m = t.match(/^(\d+) o'clock$/))) return lead + (m[1] === '1' ? 'la 1 en punto' : `las ${m[1]} en punto`);
  if ((m = t.match(/^half past (\d+)$/))) return lead + (m[1] === '1' ? 'la 1 y media' : `las ${m[1]} y media`);
  if (/^\d+:\d\d$/.test(t) || /^\d+ [+-] \d+$/.test(t)) return lead + t;
  const low = t.toLowerCase();
  if (SHAPES[low]) return lead + SHAPES[low][0];
  if (THINGS[low]) return lead + THINGS[low];
  if (PICS[low]) return lead + PICS[low];
  if (VEG[low]) return lead + VEG[low][0];
  return null;
}

// --- Whole sentences ------------------------------------------------------------------------------
// Exact sentences (the stories, the screens, praise). Keys are English as shown; values are 1st-grade Spanish.
export const ES_EXACT = {
  // Praise, hints, reveal pieces
  'Good try!': '¡Buen intento!', 'Try again.': 'Intenta otra vez.', 'Nice try!': '¡Buen intento!',
  "That's okay!": '¡Está bien!', "Let's keep going!": '¡Sigamos!', 'Lovely!': '¡Qué lindo!',
  'Wonderful! You did it!': '¡Maravilloso! ¡Lo lograste!', 'Amazing work, superstar!': '¡Gran trabajo, superestrella!',
  'Yes! You are so smart!': '¡Sí! ¡Qué inteligente eres!', 'Beautiful! Keep shining!': '¡Precioso! ¡Sigue brillando!',
  '+1 star!': '¡+1 estrella!',
  // Recorded clip lines: the Spanish is what the Spanish clip says, so the clip plays (src/flow/clips.js CLIP_LINES.ES).
  "Hello, I'm Belle. I love stories. Shall we read together?": '¡Hola! Soy Bella. Me encantan los cuentos. ¿Leemos juntas?',
  'Yes, what a wonderful reader!': 'Sí, ¡qué lectora tan maravillosa!',
  "Almost. Let's look one more time.": '¡Casi! ¡Miremos una vez más!',
  "Hello, I'm Elsa. Numbers sparkle when we try. Let's begin.": 'Hola, soy Elsa. Los números brillan cuando lo intentamos. Empecemos.',
  'Yes, your number magic sparkled!': 'Sí, ¡tu magia de números brilló!',
  'Almost! Count with me one more time.': '¡Casi! ¡Cuenta conmigo una vez más!',
  "Hi, I'm Rapunzel. Every question is a new lantern. Let's explore!": 'Hola, soy Rapunzel. Cada pregunta es una linterna nueva. ¡Vamos a explorar!',
  'Yes! You lit up that answer!': '¡Sí! ¡Iluminaste esa respuesta!',
  'Look closer. What do you notice?': 'Mira más de cerca. ¿Qué notas?',
  'Yes, kind and clever!': '¡Sí, amable e inteligente!',
  'Almost! Kind learners try again!': '¡Casi! ¡Quien aprende con cariño lo intenta otra vez!',
  "Oh, hello! I'm Ariel. I would love to learn with you.": '¡Oh, hola! Soy Ariel. Me encantaría aprender contigo.',
  'Oh, that was wonderful!': '¡Oh, eso fue maravilloso!',
  "Almost! Let's try once more.": '¡Casi! Intentemos una vez más.',
  "Hi, I'm Anna. Okay, ready? Let's go on a reading adventure!": 'Hola, soy Ana. ¿Lista? Vamos a una aventura de lectura.',
  'Yes! What a reading adventure!': '¡Sí! ¡Qué aventura de lectura!',
  "Almost. Let's try that page again.": 'Casi. Intentemos esa página otra vez.',
  "Hey there. I'm Tiana. We work hard and we shine. Let's get started.": 'Hola, soy Tiana. Trabajamos duro y brillamos. Empecemos.',
  'Yes, hard work shines!': '¡Sí, el trabajo duro brilla!',
  'Almost. Work it one more time.': 'Casi. Inténtalo una vez más.',
  'Hello, I am Aurora. Let us make today a little more magical.': 'Hola, soy Aurora. Hagamos este día un poco más mágico.',
  'Yes, that was lovely work.': 'Sí, fue un trabajo precioso.',
  'Almost. Softly, try again.': 'Casi. Con calma, intenta otra vez.',
  'Welcome back, Zoe! My land is glowing because of you! 💖': '¡Bienvenida otra vez, Zoe! ¡Mi tierra brilla gracias a ti! 💖',
  'Welcome back, Zoe! My land is glowing because of you! 💖 Want to play again?': '¡Bienvenida otra vez, Zoe! ¡Mi tierra brilla gracias a ti! 💖 ¿Quieres jugar otra vez?',
  'Yay, one more! Here we go! ✨': '¡Bien, una más! ¡Vamos! ✨',

  // Stories: hello and thank you in every land
  'Oh no! My storybook blew apart.': '¡Oh, no! Mi libro de cuentos se deshizo.',
  'The pages are hiding in the library. Will you help me find them?': 'Las páginas se esconden en la biblioteca. ¿Me ayudas a encontrarlas?',
  'Read a page with me, and we will put it back together.': 'Lee una página conmigo y la volveremos a armar.',
  'You did it! My storybook is whole again.': '¡Lo lograste! Mi libro de cuentos está completo otra vez.',
  'Every page is home, thanks to you.': 'Cada página está en su lugar, gracias a ti.',
  'Brrr! My bridges froze solid.': '¡Brrr! Mis puentes se congelaron.',
  'Each one needs just the right number of snowflakes to sparkle again.': 'Cada uno necesita el número justo de copos de nieve para brillar otra vez.',
  'Count with me, and we will cross together!': '¡Cuenta conmigo y cruzaremos juntas!',
  'All five bridges sparkle! You are a counting star.': '¡Los cinco puentes brillan! Eres una estrella contando.',
  'Now we can visit everyone in Frostfall Peaks.': 'Ahora podemos visitar a todos en los Picos Helados.',
  'Oh no, my flowers fell asleep!': '¡Oh, no, mis flores se quedaron dormidas!',
  'They need the things every plant needs to wake up and grow.': 'Necesitan lo que toda planta necesita para despertar y crecer.',
  'Help me wake them, and the meadow will bloom!': '¡Ayúdame a despertarlas y el prado florecerá!',
  'Yay! The whole garden is awake and blooming.': '¡Bien! Todo el jardín está despierto y florecido.',
  'The flowers are dancing just for you!': '¡Las flores bailan solo para ti!',
  'Oh my! All the village clocks fell asleep.': '¡Ay! Todos los relojes de la aldea se quedaron dormidos.',
  'The clock tower stopped, and nobody knows the time!': 'La torre del reloj se paró, ¡y nadie sabe qué hora es!',
  'Read each clock with me, and we will wind them all back up.': 'Lee cada reloj conmigo y les daremos cuerda a todos.',
  'Tick tock! Every clock in the village is chiming.': '¡Tic tac! Todos los relojes de la aldea suenan.',
  'You saved the day before midnight!': '¡Salvaste el día antes de la medianoche!',
  'Hello! Welcome to Seashell Cove.': '¡Hola! Bienvenida a la Cala de las Conchas.',
  'My seashells love to sing, but their songs got mixed up.': 'A mis conchas les encanta cantar, pero sus canciones se mezclaron.',
  'Can you find the words that sound the same? Then the shells can sing again!': '¿Puedes encontrar las palabras que suenan igual? ¡Así las conchas cantarán otra vez!',
  'You did it! The shells are singing again.': '¡Lo lograste! Las conchas cantan otra vez.',
  'Every word found its friend, thanks to you.': 'Cada palabra encontró a su amiga, gracias a ti.',
  'Hello! Welcome to Wayfinder Isle.': '¡Hola! Bienvenida a la Isla del Camino.',
  'My island path is made of shape stones, but they got scattered.': 'El camino de mi isla está hecho de piedras con formas, pero se desparramaron.',
  'Can you name them? Then the path will be whole again!': '¿Puedes decir sus nombres? ¡Así el camino estará completo otra vez!',
  'You did it! The path is whole again.': '¡Lo lograste! El camino está completo otra vez.',
  'Every shape stone is home, thanks to you.': 'Cada piedra con forma está en su lugar, gracias a ti.',
  'Hello! Welcome to the Moonlit Palace Garden.': '¡Hola! Bienvenida al Jardín del Palacio de la Luna.',
  'My story lanterns got mixed up, so the garden cannot tell its stories.': 'Mis linternas de cuentos se mezclaron y el jardín no puede contar sus cuentos.',
  'Can you put each story in order? Then the lanterns will glow again!': '¿Puedes poner cada cuento en orden? ¡Así las linternas brillarán otra vez!',
  'You did it! The lanterns are glowing again.': '¡Lo lograste! Las linternas brillan otra vez.',
  'Every story is in the right order, thanks to you.': 'Cada cuento está en orden, gracias a ti.',
  'Hello! Welcome to Sunny Fjord Harbor.': '¡Hola! Bienvenida al Puerto del Fiordo Soleado.',
  'A big wind mixed up our welcome signs, and the boats cannot read them.': 'Un gran viento mezcló nuestros letreros y los barcos no los pueden leer.',
  'Can you fix each sentence? Then the boats can sail in!': '¿Puedes arreglar cada oración? ¡Así los barcos podrán entrar!',
  'You did it! The harbor signs are fixed.': '¡Lo lograste! Los letreros del puerto están arreglados.',
  'Now every boat can read them. Thank you!': 'Ahora todos los barcos los pueden leer. ¡Gracias!',
  'Hello! Welcome to Firefly Bayou.': '¡Hola! Bienvenida al Pantano de las Luciérnagas.',
  'I run the vegetable stand. The rain smudged my tally board!': 'Yo atiendo el puesto de verduras. ¡La lluvia borró mi tabla de conteo!',
  'Can you help me count with tally marks? Then every basket is counted!': '¿Me ayudas a contar con palitos? ¡Así contamos cada canasta!',
  'You did it! Every basket is counted.': '¡Lo lograste! Contamos cada canasta.',
  'My tally board is as good as new. Thank you!': 'Mi tabla de conteo quedó como nueva. ¡Gracias!',
  'Welcome to Rosewood Glen!': '¡Bienvenida al Valle de las Rosas!',
  'The word garden needs your help.': 'El jardín de palabras necesita tu ayuda.',
  'Let us find naming words and action words together!': '¡Busquemos juntas palabras que nombran y palabras de acción!',
  'The word garden is shining again!': '¡El jardín de palabras brilla otra vez!',
  'You found naming words and action words. Thank you!': 'Encontraste palabras que nombran y palabras de acción. ¡Gracias!',
  'You did it, Zoe! All ten lands are glowing together!': '¡Lo lograste, Zoe! ¡Las diez tierras brillan juntas!',
  'Your kindness brought the Starlight Crown back to the castle.': 'Tu bondad trajo la Corona de Estrellas de vuelta al castillo.',
  'Every friend and every kingdom shines because you kept trying.': 'Cada amiga y cada reino brillan porque seguiste intentando.',
  'Thank you for learning and exploring with us. Shine on!': 'Gracias por aprender y explorar con nosotras. ¡Sigue brillando!',

  // Screens (src/flow/screens.js) and buttons
  "Zoe's Starlight Quest": 'La Aventura Estelar de Zoe',
  'A gentle 3D learning adventure for Princess Zoe ✨': 'Una aventura tranquila en 3D para aprender con la Princesa Zoe ✨',
  'Start Adventure 🌟': 'Empezar la aventura 🌟', '📖 How to Play': '📖 Cómo jugar', '🔊 Listen': '🔊 Escuchar',
  'No timers, no penalties, and always gentle hints. Have fun! 💖': 'Sin relojes, sin castigos y siempre con pistas amables. ¡Diviértete! 💖',
  'Adventure Paused': 'Aventura en pausa', 'Take a break or explore your treasures!': '¡Descansa o mira tus tesoros!',
  'Resume Adventure': 'Seguir la aventura', 'Princess Wardrobe': 'Ropero de princesa', 'Treasure Book & Stickers': 'Libro de tesoros y calcomanías',
  'How to Play': 'Cómo jugar', 'Parent Corner': 'Rincón de papás',
  "Zoe's Wardrobe": 'El ropero de Zoe', 'Earn stars in quests to unlock royal outfits!': '¡Gana estrellas en las misiones para abrir ropa real!',
  'Done ✨': 'Listo ✨', 'Sparkle Trail': 'Estela brillante', 'Tiara Gem': 'Joya de la tiara', 'Skirt Color': 'Color de falda', 'Butterfly Friend': 'Amiga mariposa',
  'Earn 10 stars to unlock sparkle trail colors!': '¡Gana 10 estrellas para abrir colores de estela!',
  "Earn 25 stars to unlock gem colors for Zoe's tiara!": '¡Gana 25 estrellas para abrir colores de joya para la tiara de Zoe!',
  'Earn 50 stars to unlock beautiful new royal skirt colors!': '¡Gana 50 estrellas para abrir colores nuevos de falda!',
  'Reach 100 stars to make a magical butterfly companion!': '¡Llega a 100 estrellas para tener una amiga mariposa mágica!',
  'Unlocked 🔓': 'Abierto 🔓', 'Unlocked.': 'Abierto.', 'Pick one!': '¡Elige uno!',
  'Treasure Book': 'Libro de tesoros', 'Find hidden sparkles & secret scenery across the lands!': '¡Busca brillos escondidos y lugares secretos en las tierras!',
  '✨ Daily sparkling treasures found today:': '✨ Tesoros brillantes encontrados hoy:', 'Secret Sticker': 'Calcomanía secreta',
  'A secret sticker.': 'Una calcomanía secreta.', 'Keep exploring to find it!': '¡Sigue explorando para encontrarla!',
  'Back to Quest 🌟': 'Volver a la aventura 🌟',
  'How to Move': 'Cómo caminar', 'Talk to Friends': 'Habla con tus amigas', 'Answer Questions': 'Contesta preguntas', 'Collect Stars': 'Junta estrellas', 'Pause & Dress Up': 'Pausa y ropa',
  'Drag your finger anywhere on the ground to walk Princess Zoe.': 'Arrastra el dedo en el suelo para que camine la Princesa Zoe.',
  'The round joystick works too!': '¡El control redondo también sirve!',
  'Use WASD, arrow keys, or drag with your mouse on the screen to walk Princess Zoe around the kingdom.': 'Usa WASD, las flechas o arrastra con el ratón para que la Princesa Zoe camine por el reino.',
  'Walk up to any princess and tap her to say hello and start her quest!': '¡Camina hasta una princesa y tócala para saludarla y empezar su misión!',
  'Walk up to any princess and press E, Space, or click her to say hello and start her quest!': '¡Camina hasta una princesa y presiona E, Espacio o haz clic en ella para saludarla y empezar su misión!',
  'Pick an answer from the big cards.': 'Elige una respuesta de las tarjetas grandes.',
  'Wrong answers get gentle hints and second chances.': 'Si te equivocas, recibes pistas amables y otra oportunidad.',
  'No losing ever!': '¡Nunca pierdes!',
  'Earn stars with every quest!': '¡Gana estrellas en cada misión!',
  'Finishing all ten lands brings the golden Starlight Crown back to the castle.': 'Al terminar las diez tierras, la Corona de Estrellas dorada vuelve al castillo.',
  'Tap the pause button anytime to change your dress or check your stickers.': 'Toca el botón de pausa cuando quieras para cambiar tu vestido o ver tus calcomanías.',
  'Press P or click the pause button anytime to change your dress or check your stickers.': 'Presiona P o haz clic en el botón de pausa cuando quieras para cambiar tu vestido o ver tus calcomanías.',
  '🔊 Listen again': '🔊 Escuchar otra vez', 'Skip': 'Saltar', 'Next ➡️': 'Siguiente ➡️', "Let's Play! 👑": '¡A jugar! 👑',
  "Let's Go! ✨": '¡Vamos! ✨', 'Start Quest! ⭐': '¡Empezar misión! ⭐', 'Next': 'Siguiente', 'Rest 💤': 'Descansar 💤', 'One more? ✨': '¿Una más? ✨',
  'Continue Adventure ➡️': 'Seguir la aventura ➡️', 'Hooray! Long live Princess Zoe! 👑': '¡Hurra! ¡Viva la Princesa Zoe! 👑',
  'Blend it!': '¡Júntalo!', 'Yay! ✨': '¡Bien! ✨',
  'Kingdom Map': 'Mapa del reino', 'Tap a kingdom.': 'Toca un reino.', 'Fireflies will show you the way!': '¡Las luciérnagas te mostrarán el camino!',
  "Today's star": 'La estrella de hoy', 'Close': 'Cerrar', 'Not open yet': 'Todavía cerrado', 'This kingdom is glowing!': '¡Este reino brilla!',
  'Kingdoms:': 'Reinos:', 'Today:': 'Hoy:', 'Gems': 'Gemas',
  'Ask here': 'Preguntar aquí', 'Stop': 'Parar', 'Really stop?': '¿Seguro que paras?', 'The lantern is lit!': '¡La linterna está encendida!',
  'Follow the fireflies back to Jasmine!': '¡Sigue las luciérnagas de vuelta a Jasmine!', 'Back to Jasmine': 'De vuelta con Jasmine',
  '🌙 The kingdom is resting.': '🌙 El reino está descansando.', 'Come back tomorrow! 💤': '¡Vuelve mañana! 💤',
  'The kingdom is resting.': 'El reino está descansando.', 'Come back tomorrow!': '¡Vuelve mañana!',
  'New kingdoms appeared beyond the Starlight Hub!': '¡Aparecieron reinos nuevos más allá de la Plaza de las Estrellas!',
  'Follow the sparkly paths to find them.': 'Sigue los caminos brillantes para encontrarlos.',
  'A new kingdom opened!': '¡Se abrió un reino nuevo!', 'New kingdoms opened!': '¡Se abrieron reinos nuevos!',
  'Follow the sparkly path!': '¡Sigue el camino brillante!',
  'A new kingdom will open here soon! ✨': '¡Pronto se abrirá un reino nuevo aquí! ✨',
  'Walk to a princess and say hello! 👑': '¡Camina hasta una princesa y salúdala! 👑',
  'The Starlight Crown is Restored! 👑': '¡La Corona de Estrellas volvió! 👑',
  'All ten lands are glowing together across the kingdom!': '¡Las diez tierras brillan juntas en todo el reino!',
  'You did it, Princess Zoe!': '¡Lo lograste, Princesa Zoe!',
  '🔔 No sound? Flip the silent switch off and turn the volume up.': '🔔 ¿No hay sonido? Quita el modo silencio y sube el volumen.',
  '🎮 Controller connected! Left stick walks, ✕ talks.': '🎮 ¡Control conectado! La palanca izquierda camina, ✕ habla.',
  '🎮 Controller disconnected.': '🎮 Control desconectado.',
};

// Sentences with numbers or names: [pattern, (match) => Spanish or null].
const D = '(\\d+|[a-z]+(?:-[a-z]+)?)';   // a number in digits or English words
const RULES = [
  // Elsa: adding and taking away
  [new RegExp(`^What is ${D} \\+ ${D}\\?$`), (m) => `¿Cuánto es ${m[1]} + ${m[2]}?`],
  [new RegExp(`^What is ${D} plus ${D}\\?$`), (m) => N(m[1]) && N(m[2]) && `¿Cuánto es ${N(m[1])} más ${N(m[2])}?`],
  [new RegExp(`^What is ${D} plus ${D} plus ${D}\\?$`), (m) => N(m[1]) && `¿Cuánto es ${N(m[1])} más ${N(m[2])} más ${N(m[3])}?`],
  [/^(\d+) \+ (\d+) \+ (\d+) = \?$/, (m) => `${m[1]} + ${m[2]} + ${m[3]} = ?`],
  [/^Start at (\d+) and count on (\d+)\.$/, (m) => `Empieza en ${m[1]} y cuenta ${m[2]} más.`],
  [/^(\d+) \+ (\d+) is (\d+)\.$/, (m) => `${m[1]} + ${m[2]} es ${m[3]}.`],
  [/^(\d+) plus (\d+) is (\d+)\.$/, (m) => `${m[1]} más ${m[2]} es ${m[3]}.`],
  [/^You have (\d+) snowflakes?\.$/, (m) => `Tienes ${m[1]} ${m[1] === '1' ? 'copo' : 'copos'} de nieve.`],
  [/^(\d+) more falls?\.$/, (m) => `Caen ${m[1]} más.`],
  [/^(\d+) melts?\.$/, (m) => `Se ${m[1] === '1' ? 'derrite' : 'derriten'} ${m[1]}.`],
  [/^How many now\?$/, () => '¿Cuántos hay ahora?'],
  [/^How many are left\?$/, () => '¿Cuántos quedan?'],
  [/^(\d+) \+ \? = (\d+)\.?$/, (m) => `${m[1]} + ? = ${m[2]}`],
  [/^\? \+ (\d+) = (\d+)\.$/, (m) => `? + ${m[1]} = ${m[2]}.`],
  [/^(\d+) - \? = (\d+)\.$/, (m) => `${m[1]} - ? = ${m[2]}.`],
  [/^What number is missing\?$/, () => '¿Qué número falta?'],
  [new RegExp(`^${D} plus what number makes ${D}\\?$`), (m) => N(m[1]) && N(m[2]) && `¿${N(m[1])} más qué número da ${N(m[2])}?`],
  [/^What number plus (\d+) makes (\d+)\?$/, (m) => `¿Qué número más ${m[1]} da ${m[2]}?`],
  [/^(\d+) take away what number makes (\d+)\?$/, (m) => `¿${m[1]} menos qué número da ${m[2]}?`],
  [/^Which number do you start with for (\d+) (?:\+|plus) (\d+)\?$/, (m) => `¿Con qué número empiezas para ${m[1]} más ${m[2]}?`],
  [/^Which is more: (\d+) or (\d+)\?$/, (m) => `¿Cuál es más: ${m[1]} o ${m[2]}?`],
  [/^(\d+) tens? and (\d+) ones\.$/, (m) => `${m[1]} ${m[1] === '1' ? 'decena' : 'decenas'} y ${m[2]} unidades.`],
  [/^What number is that\?$/, () => '¿Qué número es?'],
  [/^Which double makes (\d+)\?$/, (m) => `¿Qué doble da ${m[1]}?`],
  [/^Count with me: (\d+) snowflakes?, then (\d+) more\.$/, (m) => `Cuenta conmigo: ${m[1]} ${m[1] === '1' ? 'copo' : 'copos'} y luego ${m[2]} más.`],
  [/^How many\?$/, () => '¿Cuántos?'],
  [/^Start with the bigger number, (\d+)\.$/, (m) => `Empieza con el número más grande, ${m[1]}.`],
  [/^Count on (\d+): ([\d, ]+), then one more\.$/, (m) => `Cuenta ${m[1]} más: ${m[2]} y uno más.`],
  [/^Count on (\d+): What number comes right after\?$/, (m) => `Cuenta ${m[1]} más: ¿qué número sigue?`],
  [/^Start with the bigger number\.$/, () => 'Empieza con el número más grande.'],
  [/^Which is bigger, (\d+) or (\d+)\?$/, (m) => `¿Cuál es más grande, ${m[1]} o ${m[2]}?`],
  [/^Start with the double: (\d+) \+ (\d+) is (\d+)\.$/, (m) => `Empieza con el doble: ${m[1]} + ${m[2]} es ${m[3]}.`],
  [/^Then count one more\.$/, () => 'Luego cuenta uno más.'],
  [/^A double is the same number twice\.$/, () => 'Un doble es el mismo número dos veces.'],
  [/^Count (\d+) and (\d+) more\.$/, (m) => `Cuenta ${m[1]} y ${m[2]} más.`],
  [/^Which number, added to itself, makes (\d+)\?$/, (m) => `¿Qué número, sumado a sí mismo, da ${m[1]}?`],
  [/^Add two first: (\d+) \+ (\d+)\.$/, (m) => `Suma dos primero: ${m[1]} + ${m[2]}.`],
  [/^Then add (\d+)\.$/, (m) => `Luego suma ${m[1]}.`],
  [/^Each bundle is (\d+)\.$/, (m) => `Cada atado es ${m[1]}.`],
  [/^Count the bundles by tens, then add the (\d+) loose ones\.$/, (m) => `Cuenta los atados de diez en diez y luego suma los ${m[1]} sueltos.`],
  [/^Count the bundles by tens\.$/, () => 'Cuenta los atados de diez en diez.'],
  [/^There are no loose ones\.$/, () => 'No hay sueltos.'],
  [/^Look at the tens first\.$/, () => 'Mira las decenas primero.'],
  [/^More tens means more\.$/, () => 'Más decenas es más.'],
  [/^Start at (\d+)\.$/, (m) => `Empieza en ${m[1]}.`],
  [/^Count (up|back) to (\d+)\.$/, (m) => `Cuenta ${m[1] === 'up' ? 'hacia adelante' : 'hacia atrás'} hasta ${m[2]}.`],
  [/^How many did you count\?$/, () => '¿Cuántos contaste?'],
  [/^Start with (\d+) snowflakes\.$/, (m) => `Empieza con ${m[1]} copos de nieve.`],
  [/^Cover (\d+)\.$/, (m) => `Tapa ${m[1]}.`],
  [/^Count the rest\.$/, () => 'Cuenta los que quedan.'],
  // Cinderella: time
  [/^What time is the clock showing\?$/, () => '¿Qué hora marca el reloj?'],
  [/^The long hand is on the (\d+)\.$/, (m) => `La manecilla larga está en el ${m[1]}.`],
  [/^That means half past\.$/, () => 'Eso quiere decir y media.'],
  [/^That means o'clock\.$/, () => 'Eso quiere decir en punto.'],
  [/^The short hand just passed which number\?$/, () => '¿Qué número acaba de pasar la manecilla corta?'],
  [/^Where is the short hand\?$/, () => '¿Dónde está la manecilla corta?'],
  // Moana: shapes
  [/^How many (corners|sides|flat faces) does an? ([a-z]+) have\?$/, (m) => { const s = unUna(m[2]); const w = { corners: 'esquinas', sides: 'lados', 'flat faces': 'caras planas' }[m[1]]; return s && `¿Cuántas ${w} tiene ${s}?`; }],
  [/^Which shape has (\d+) (corners|sides|flat faces)\?$/, (m) => `¿Qué figura tiene ${m[1]} ${{ corners: 'esquinas', sides: 'lados', 'flat faces': 'caras planas' }[m[2]]}?`],
  [/^Which shape has no corners\?$/, () => '¿Qué figura no tiene esquinas?'],
  [/^Which shape has no flat faces\?$/, () => '¿Qué figura no tiene caras planas?'],
  [/^Which shape has one flat face\?$/, () => '¿Qué figura tiene una cara plana?'],
  [/^Which shape is this\?$/, () => '¿Qué figura es esta?'],
  [/^Which one can roll\?$/, () => '¿Cuál puede rodar?'],
  [/^What shape is (an? [a-z ]+)\?$/, (m) => THINGS[m[1]] && `¿Qué figura es ${THINGS[m[1]]}?`],
  [/^Which picture is on (\d+)\?$/, (m) => `¿Qué dibujo está en el ${m[1]}?`],
  [/^A corner is where two sides meet\.$/, () => 'Una esquina es donde se juntan dos lados.'],
  [/^Look for a shape with no corners at all\.$/, () => 'Busca una figura sin ninguna esquina.'],
  [/^Touch each corner and count\.$/, () => 'Toca cada esquina y cuenta.'],
  [/^A cube has corners on the top and on the bottom\.$/, () => 'Un cubo tiene esquinas arriba y abajo.'],
  [/^Count them all\.$/, () => 'Cuéntalas todas.'],
  [/^A flat face is a flat part you can touch with your whole hand\.$/, () => 'Una cara plana es una parte plana que puedes tocar con toda la mano.'],
  [/^Count them all, even the ones you cannot see\.$/, () => 'Cuéntalas todas, también las que no ves.'],
  [/^Count the corners of each shape, one shape at a time\.$/, () => 'Cuenta las esquinas de cada figura, una por una.'],
  [/^Count the sides of each shape, one shape at a time\.$/, () => 'Cuenta los lados de cada figura, una por una.'],
  [/^Look at the shape all over\.$/, () => 'Mira bien toda la figura.'],
  [/^Does it roll, or does it have flat parts\?$/, () => '¿Rueda, o tiene partes planas?'],
  [/^Look at the sides and the corners\.$/, () => 'Mira los lados y las esquinas.'],
  [/^Count them one at a time\.$/, () => 'Cuéntalos uno por uno.'],
  [/^Picture each shape and count its flat faces, one shape at a time\.$/, () => 'Imagina cada figura y cuenta sus caras planas, una por una.'],
  [/^Picture pushing each one across the floor\.$/, () => 'Imagina que empujas cada una por el piso.'],
  [/^Which one would keep going\?$/, () => '¿Cuál seguiría rodando?'],
  [/^Think about the whole object\.$/, () => 'Piensa en todo el objeto.'],
  [/^Is it round, flat, or pointy\?$/, () => '¿Es redondo, plano o puntiagudo?'],
  [/^Touch each side with your finger and count them\.$/, () => 'Toca cada lado con el dedo y cuéntalos.'],
  // Tiana: tallies and the 120 chart
  [/^Count by fives\.$/, () => 'Cuenta de cinco en cinco.'],
  [/^How many tally marks( in all)?\?$/, (m) => `¿Cuántos palitos hay${m[1] ? ' en total' : ''}?`],
  [/^How many tally marks are there\?$/, () => '¿Cuántos palitos hay?'],
  [/^Count the tally marks\.$/, () => 'Cuenta los palitos.'],
  [/^How many are there( in all)?\?$/, (m) => `¿Cuántos hay${m[1] ? ' en total' : ''}?`],
  [/^Look at the tally chart\.$/, () => 'Mira la tabla de conteo.'],
  [/^How many ([a-z]+)( are there)?\?$/, (m) => { const c = cuantos(m[1]); return c && `${c} hay?`; }],
  [/^How many more ([a-z]+) than ([a-z]+)\?$/, (m) => { const c = cuantos(m[1]); return c && VEG[m[2]] && `${c} más que ${VEG[m[2]][0]} hay?`; }],
  [/^Which has the most\?$/, () => '¿Cuál tiene más?'],
  [/^Jar holds (\d+)\.$/, (m) => `En el frasco caben ${m[1]}.`],
  [/^How many more to fill it\?$/, () => '¿Cuántas más para llenarlo?'],
  [/^Look at the firefly jar\.$/, () => 'Mira el frasco de luciérnagas.'],
  [new RegExp(`^It holds ${D}\\.$`), (m) => N(m[1]) && `Caben ${N(m[1])}.`],
  [/^How many more fireflies fill it up\?$/, () => '¿Cuántas luciérnagas más lo llenan?'],
  [/^Count each row\.$/, () => 'Cuenta cada fila.'],
  [/^Then see how many extra the longer row has\.$/, () => 'Luego mira cuántas más tiene la fila más larga.'],
  [/^Count the glowing fireflies\.$/, () => 'Cuenta las luciérnagas que brillan.'],
  [/^Then count the empty spots left to fill\.$/, () => 'Luego cuenta los lugares vacíos que faltan.'],
  [/^Then count up to the number on the jar\.$/, () => 'Luego cuenta hasta el número del frasco.'],
  [/^Count the groups in that row, then the single lines\.$/, () => 'Cuenta los grupos de esa fila y luego los palitos sueltos.'],
  [/^Count the marks in each row\.$/, () => 'Cuenta los palitos de cada fila.'],
  [/^The longest row has the most\.$/, () => 'La fila más larga tiene más.'],
  [/^Count the slashed groups first, then add the single lines\.$/, () => 'Cuenta primero los grupos tachados y luego suma los palitos sueltos.'],
  [/^Each slashed group counts the same\.$/, () => 'Cada grupo tachado vale lo mismo.'],
  [/^Count group after group\.$/, () => 'Cuenta grupo por grupo.'],
  [/^Touch each line and count them in order\.$/, () => 'Toca cada palito y cuéntalos en orden.'],
  [/^Go (up|down|left|right) (\d+|ten)(?:, then (left|right) (\d+))?\.$/, (m) => {
    const dir = { up: 'arriba', down: 'abajo', left: 'a la izquierda', right: 'a la derecha' };
    const n = m[2] === 'ten' ? '10' : m[2];
    return `Ve ${dir[m[1]]} ${n}${m[3] ? `, luego ${dir[m[3]]} ${m[4]}` : ''}.`;
  }],
  [/^What number are you on\?$/, () => '¿En qué número estás?'],
  [/^What number is missing from the bright (row|column)\?$/, (m) => `¿Qué número falta en la ${m[1] === 'row' ? 'fila' : 'columna'} brillante?`],
  [/^Do the first move\.$/, () => 'Haz el primer paso.'],
  [/^Then do the second move from where you land\.$/, () => 'Luego haz el segundo paso desde donde quedaste.'],
  [/^Down is the next row, right is the next number\.$/, () => 'Abajo es la fila siguiente, a la derecha es el número siguiente.'],
  [/^Down is the next row, and up is the row above\.$/, () => 'Abajo es la fila siguiente y arriba es la fila de encima.'],
  [/^Right is the next number, and left is the number just before\.$/, () => 'A la derecha es el número siguiente y a la izquierda es el de antes.'],
  [/^Find the bright row\.$/, () => 'Busca la fila brillante.'],
  [/^Then count across, one number at a time\.$/, () => 'Luego cuenta de lado, un número a la vez.'],
  [/^Look at the number above it and the number below it\.$/, () => 'Mira el número de arriba y el número de abajo.'],
  [/^Going down one row is ten more\.$/, () => 'Bajar una fila es diez más.'],
  [/^Look at the number before it and the number after it\.$/, () => 'Mira el número de antes y el número de después.'],
  [/^Count one number at a time\.$/, () => 'Cuenta un número a la vez.'],
  [/^Look at the numbers next to it\.$/, () => 'Mira los números de al lado.'],
  // Everywhere
  [/^The answer is (.+)\.$/, (m) => { const w = esWord(m[1]); return w && `La respuesta es ${w}.`; }],
  [/^It's this picture\.$/, () => 'Es este dibujo.'],
  [/^⭐ \+1 star!$/, () => '⭐ ¡+1 estrella!'],
  [/^Lovely!$/, () => '¡Qué lindo!'],
  [/^(\d+) of (\d+)$/, (m) => `${m[1]} de ${m[2]}`],
  [/^(\d+) of (\d+) lands glowing$/, (m) => `${m[1]} de ${m[2]} tierras brillan`],
  [/^Needs (\d+) ⭐$/, (m) => `Necesitas ${m[1]} ⭐`],
  [/^Needs (\d+) stars\.$/, (m) => `Necesitas ${m[1]} estrellas.`],
  [/^You have (\d+) stars?\.$/, (m) => `Tienes ${m[1]} ${m[1] === '1' ? 'estrella' : 'estrellas'}.`],
  [/^You found (\d+) of (\d+) sparkling treasures today\.$/, (m) => `Hoy encontraste ${m[1]} de ${m[2]} tesoros brillantes.`],
  [/^(.+)'s land is glowing!$/, (m) => `¡La tierra de ${m[1]} brilla!`],
  [/^You earned the (.+) star shard!$/, (m) => land(m[1]) && `¡Ganaste el pedacito de estrella de ${land(m[1])}!`],
  [/^⭐ \+3 stars$/, () => '⭐ +3 estrellas'],
  [/^Follow the fireflies to (.+)!$/, (m) => { const l = land(m[1]); if (l) return `¡Sigue las luciérnagas hasta ${l}!`; const k = m[1].match(/^lantern (\d+|[a-z]+)$/); return k && N(k[1]) && `¡Sigue las luciérnagas hasta la linterna ${N(k[1])}!`; }],
  [/^You made it to (.+)!$/, (m) => land(m[1]) && `¡Llegaste a ${land(m[1])}!`],
  [/^(.+) is right here!$/, (m) => land(m[1]) && `¡${cap(land(m[1]))} está aquí mismo!`],
  [/^Lantern (\d+) of (\d+)$/, (m) => `Linterna ${m[1]} de ${m[2]}`],
  [/^Next: (\w+) at (.+)$/, (m) => land(m[2]) && `Siguiente: ${m[1]} en ${land(m[2])}`],
  [/^All (\d+) kingdoms are glowing!$/, (m) => `¡Los ${N(m[1]) || m[1]} reinos brillan!`],
  [/^Today's star is over (.+)\.$/, (m) => land(m[1]) && `La estrella de hoy está sobre ${land(m[1])}.`],
  [/^Welcome to Starlight Quest!$/, () => '¡Bienvenida a la Aventura Estelar!'],
  [/^Walk to a princess and (tap her|click her or press E) to say hello\.$/, (m) => `Camina hasta una princesa y ${m[1] === 'tap her' ? 'tócala' : 'haz clic en ella o presiona E'} para saludarla.`],
  [/^💬 Tap (\w+) to talk ✨$/, (m) => `💬 Toca a ${m[1]} para hablar ✨`],
  [/^💬 Click (\w+) \(or press E\) ✨$/, (m) => `💬 Haz clic en ${m[1]} (o presiona E) ✨`],
  [/^💬 Press ✕ to talk to (\w+) ✨$/, (m) => `💬 Presiona ✕ para hablar con ${m[1]} ✨`],
  [/^You earned (\d+) stars!$/, (m) => `¡Ganaste ${m[1]} estrellas!`],
  [/^(.+) (is|are) waiting\.$/, (m) => `¡${m[1].replace(/ and /g, ' y ')} ${m[2] === 'is' ? 'te espera' : 'te esperan'}!`],
];

// Every Spanish value, so a line that is already Spanish passes through.
const ES_VALUES = new Set(Object.values(ES_EXACT));
// Spoken lines drop emoji (screens.js spoken()), so each line is also known without them.
const PICT = /[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu;
const bare = (x) => x.replace(PICT, '').replace(/\s+/g, ' ').replace(/\s+([.!?,])/g, '$1').trim();
const ES_BARE = {};
for (const [k, v] of Object.entries(ES_EXACT)) { const b = bare(k); if (b && b !== k && !(b in ES_EXACT)) ES_BARE[b] = bare(v); }

const EMOJI_EDGE = /^([\p{Extended_Pictographic}️‍\s]*)([\s\S]*?)([\p{Extended_Pictographic}️‍\s]*)$/u;

function sentence(s) {
  if (ES_EXACT[s] !== undefined) return ES_EXACT[s];
  if (ES_BARE[s] !== undefined) return ES_BARE[s];
  if (ES_VALUES.has(s)) return s;
  if (ES_LANDS[s]) return landTitle(s);
  // A heading said with a full stop after it ("Zoe's Starlight Quest.").
  if (/[^.!?]\.$/.test(s)) { const h = ES_EXACT[s.slice(0, -1)] ?? ES_BARE[s.slice(0, -1)]; if (h !== undefined) return /[.!?…]$/.test(h) ? h : h + '.'; }
  for (const [rx, fn] of RULES) {
    const m = s.match(rx);
    if (m) { const out = fn(m); if (out) return out; }
  }
  // A sentence with no letters (numbers, "3 + 4 = ?", emoji) reads the same in both languages.
  if (!/[A-Za-z]/.test(s)) return s;
  // Edge emoji: translate the words between them.
  const e = s.match(EMOJI_EDGE);
  if (e && (e[1] || e[3]) && e[2]) { const core = sentence(e[2]); if (core) return e[1] + core + e[3]; }
  return null;
}

const splitSentences = (t) => t.split(/(?<=[.!?…])\s+(?=\S)/);

/** The Spanish for one line, or null (the line then stays English, shown and spoken). */
export function toEs(text) {
  if (text === null || text === undefined) return null;
  const raw = String(text);
  const lead = raw.match(/^\s*/)[0], tail = raw.match(/\s*$/)[0];
  const t = raw.trim().replace(/\s+/g, ' ');
  if (!t) return null;
  if (!/[A-Za-z]/.test(t)) return null;   // nothing to translate
  const whole = sentence(t);
  if (whole) return lead + whole + tail;
  // A line in quotes (the talk sheet shows "...").
  const qt = t.match(/^(["“])([\s\S]+)(["”])$/);
  if (qt) { const inner = toEs(qt[2]); return inner ? lead + qt[1] + inner + qt[3] + tail : null; }
  // "... Is it A, B, or C?": the question, then each choice (math, shapes, time).
  const q = t.match(/^(.*\S) Is it (.+), or (.+)\?$/);
  if (q) {
    const head = toEs(q[1]);
    const opts = [...q[2].split(', '), q[3]].map((o) => esWord(o));
    if (head && opts.every(Boolean)) return lead + `${head} ¿Es ${opts.slice(0, -1).join(', ')} o ${opts[opts.length - 1]}?` + tail;
  }
  // Several sentences: all or nothing.
  // (Longest runs first, so "Wonderful! You did it!" is found as one line inside a longer one.)
  const parts = splitSentences(t);
  if (parts.length > 1) {
    const out = [];
    for (let i = 0; i < parts.length;) {
      let j = parts.length, hit = null;
      for (; j > i && !hit; j--) hit = sentence(parts.slice(i, j).join(' '));
      if (!hit) { out.length = 0; break; }
      out.push(hit);
      i = j + 1;
    }
    if (out.length) return lead + out.join(' ') + tail;
  }
  // Spoken lines join parts without a full stop ("... for Princess Zoe No timers ..."): longest known runs of words.
  const words = t.split(' ');
  if (parts.length > 1 || words.length > 3) {
    if (words.length > 90) return null;
    const out = [];
    for (let i = 0; i < words.length;) {
      let j = words.length, hit = null;
      for (; j > i && !hit; j--) hit = sentence(words.slice(i, j).join(' '));
      if (!hit) return null;
      out.push(hit);
      i = j + 1;
    }
    return lead + out.join(' ') + tail;
  }
  // A single label (a choice card).
  const w = esWord(t);
  return w && w !== t ? lead + w + tail : null;
}

/** For Spanish text-to-speech: the line in Spanish when there is one, else null. Alias kept short for callers. */
export const es = toEs;
