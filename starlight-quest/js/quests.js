// ============================================================================
// Zoe's Starlight Quest — quest content (EN)
// ----------------------------------------------------------------------------
// DEPENDENCY-FREE ES module: no imports, so this file can be unit-tested in
// node directly (e.g. `node --check quests.mjs` / import in a test runner).
// All strings live in this one file so a future ES translation can swap the
// whole table at once.
// Content rules baked in: warm and encouraging tone, very short sentences,
// never a fail state — a wrong pick gets a gentle hint and a retry.
// ============================================================================

// ----------------------------------------------------------------------------
// PRINCESSES — NPC roster keyed by id.
// portrait paths are relative to the game root. voice holds speechSynthesis
// fallback values (pitch, rate) used when no prerecorded MP3 exists.
// ----------------------------------------------------------------------------
import { PORTRAIT_BELLE } from './portrait-belle.js?v=20261028r3';
import { PORTRAIT_ELSA } from './portrait-elsa.js?v=20261028r3';
import { PORTRAIT_RAPUNZEL } from './portrait-rapunzel.js?v=20261028r3';
import { PORTRAIT_CINDERELLA } from './portrait-cinderella.js?v=20261028r3';
import { PORTRAIT_ZOE } from './portrait-zoe.js?v=20261028r3';
import { PORTRAIT_ARIEL, PORTRAIT_MOANA, PORTRAIT_JASMINE, PORTRAIT_ANNA, PORTRAIT_TIANA, PORTRAIT_AURORA } from './portraits-new.js?v=20261028r3';

export const PRINCESSES = {
  belle: {
    name: 'Belle',
    landId: 'whispering-library',
    landName: 'Whispering Library',
    portrait: PORTRAIT_BELLE,
    color: '#3b82f6',
    voice: { pitch: 1.1, rate: 0.95 },
  },
  elsa: {
    name: 'Elsa',
    landId: 'frostfall-peaks',
    landName: 'Frostfall Peaks',
    portrait: PORTRAIT_ELSA,
    color: '#38bdf8',
    voice: { pitch: 1.15, rate: 0.9 },
  },
  rapunzel: {
    name: 'Rapunzel',
    landId: 'sunflower-meadows',
    landName: 'Sunflower Meadows',
    portrait: PORTRAIT_RAPUNZEL,
    color: '#34c779',
    voice: { pitch: 1.25, rate: 1.0 },
  },
  cinderella: {
    name: 'Cinderella',
    landId: 'glass-slipper-village',
    landName: 'Glass Slipper Village',
    portrait: PORTRAIT_CINDERELLA,
    color: '#f59e0b',
    voice: { pitch: 1.05, rate: 0.9 },
  },
  // --- New-kingdom princesses (K3). Ariel (K5), Moana (K7), Jasmine (K9), Anna (K11) and Tiana (K13) are in NPC_ORDER now; the rest are NOT yet: each kingdom PR
  // appends her id to NPC_ORDER (and BUILT_SLOTS) when her land exists. Original art, no recorded
  // voice clips (see NO_CLIP_IDS), so they use the speech voice below.
  ariel: {
    name: 'Ariel',
    landId: 'seashell-cove',
    landName: 'Seashell Cove',
    portrait: PORTRAIT_ARIEL,
    color: '#14b8a6',
    voice: { pitch: 1.2, rate: 0.92 },
  },
  moana: {
    name: 'Moana',
    landId: 'wayfinder-isle',
    landName: 'Wayfinder Isle',
    portrait: PORTRAIT_MOANA,
    color: '#d4a373',
    voice: { pitch: 1.0, rate: 0.96 },
  },
  jasmine: {
    name: 'Jasmine',
    landId: 'moonlit-palace-garden',
    landName: 'Moonlit Palace Garden',
    portrait: PORTRAIT_JASMINE,
    color: '#4f46e5',
    voice: { pitch: 1.08, rate: 0.86 },
  },
  anna: {
    name: 'Anna',
    landId: 'sunny-fjord-harbor',
    landName: 'Sunny Fjord Harbor',
    portrait: PORTRAIT_ANNA,
    color: '#ef4444',
    voice: { pitch: 1.18, rate: 1.0 },
  },
  tiana: {
    name: 'Tiana',
    landId: 'firefly-bayou',
    landName: 'Firefly Bayou',
    portrait: PORTRAIT_TIANA,
    color: '#9333ea',
    voice: { pitch: 1.02, rate: 0.88 },
  },
  aurora: {
    name: 'Aurora',
    landId: 'rosewood-glen',
    landName: 'Rosewood Glen',
    portrait: PORTRAIT_AURORA,
    color: '#be185d',
    voice: { pitch: 1.28, rate: 0.87 },
  },
  zoe: {
    name: 'Zoe',
    landId: 'starlight-hub',
    landName: 'Starlight Hub',
    portrait: PORTRAIT_ZOE,
    color: '#fbbf24',
    voice: { pitch: 1.3, rate: 1.0 },
  },
};

// NPC_ORDER — the single list of rescue princesses (lands), in play order.
// Everything that used to hard-code the four lands reads this list. To add a
// princess: add her to PRINCESSES above and append her id here. Zoe is not a
// land, so she stays out of this list.
// NO_CLIP_IDS — princesses with no recorded MP3 clips: the narrator skips the clip lookup and
// speaks right away with the speech voice. Remove an id once her clips are recorded.
export const NO_CLIP_IDS = ['ariel', 'moana', 'jasmine', 'anna', 'tiana', 'aurora'];

export const NPC_ORDER = ['belle', 'elsa', 'rapunzel', 'cinderella', 'ariel', 'moana', 'jasmine', 'anna', 'tiana', 'aurora'];

// ----------------------------------------------------------------------------
// DOLCH_1ST — Dolch first-grade sight words (~40).
// ----------------------------------------------------------------------------
export const DOLCH_1ST = [
  'after', 'again', 'an', 'any', 'as', 'ask', 'by', 'could', 'every', 'fly',
  'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his', 'how', 'just',
  'know', 'let', 'live', 'may', 'of', 'old', 'once', 'open', 'over', 'put',
  'round', 'some', 'stop', 'take', 'thank', 'them', 'then', 'think', 'walk',
  'were', 'when',
];

// ----------------------------------------------------------------------------
// QUESTS — keyed by npcId. Each quest has 5 rounds.
// Round shape: { prompt, choices: [3 strings], answer, hint }
// answer ALWAYS exactly equals one of its choices.
// Optional extras: `visual: {a, b}` (Elsa: countable snowflakes),
// `pic: '🌿'` (Rapunzel/Belle: a picture that must not match any choice),
// `clock: {hour, minute}` (Cinderella: analog clock reading).
// ----------------------------------------------------------------------------
export const QUESTS = {
  // ---- BELLE: "The Torn Storybook" — ELA / Reading Foundations ------------
  belle: {
    title: 'The Torn Storybook',
    questName: 'The Torn Storybook',
    intro: [
      'Oh no! My storybook blew apart.',
      'The pages are hiding in the library. Will you help me find them?',
      'Read a page with me, and we will put it back together.',
    ],
    rounds: [
      {
        prompt: "Which word says 'again'?",
        choices: ['again', 'open', 'fly'],
        answer: 'again',
        hint: "Good try! Let's look again. Which word starts with the letter a?",
      },
      {
        prompt: 'Sound it out: c - a - t. Which word is it?',
        choices: ['cat', 'cup', 'cap'],
        answer: 'cat',
        hint: 'Good try! Say it slow with me: c - a - t. Which one is it?',
      },
      {
        prompt: "Which word says 'some'?",
        choices: ['same', 'some', 'stop'],
        answer: 'some',
        hint: 'Good try! These look close. Which word has an o right after the s?',
      },
      {
        prompt: 'Sound it out: p - i - g. Which word is it?',
        choices: ['pen', 'pig', 'pin'],
        answer: 'pig',
        hint: 'Good try! Say it slow with me: p - i - g. Which one is it?',
      },
      {
        prompt: "Which word says 'every'?",
        choices: ['every', 'ever', 'even'],
        answer: 'every',
        hint: 'Good try! Look at the end. Which word ends with y?',
      },
    ],
    complete: [
      'You did it! My storybook is whole again.',
      'Every page is home, thanks to you.',
    ],
  },

  // ---- ARIEL: "The Seashell Songs" — ELA / rhyming and word families -------
  // (Original story. Static rounds below are only the fallback; buildRounds uses TIERS.ariel.)
  ariel: {
    title: 'The Seashell Songs',
    questName: 'The Seashell Songs',
    intro: [
      'Hello! Welcome to Seashell Cove.',
      'My seashells love to sing, but their songs got mixed up.',
      'Can you find the words that sound the same? Then the shells can sing again!',
    ],
    rounds: [
      {
        prompt: 'Which word rhymes with cat?',
        show: 'cat',
        choices: ['hat', 'dog', 'sun'],
        answer: 'hat',
        hint: 'Good try! Say cat, then say each word. Which one ends with the same sound?',
      },
      {
        prompt: 'Which word rhymes with pig?',
        show: 'pig',
        choices: ['wig', 'pan', 'bug'],
        answer: 'wig',
        hint: 'Good try! Say pig, then say each word. Which one ends with the same sound?',
      },
      {
        prompt: 'Which pair of words rhymes?',
        choices: ['sun and fun', 'sun and hen', 'sun and dog'],
        answer: 'sun and fun',
        hint: 'Good try! Say each pair out loud. Which pair ends with the same sound?',
      },
      {
        prompt: 'Which word rhymes with hop?',
        show: 'hop',
        choices: ['mop', 'hen', 'pig'],
        answer: 'mop',
        hint: 'Good try! Say hop, then say each word. Which one ends with the same sound?',
      },
      {
        prompt: 'Which word does not rhyme with bug?',
        show: 'bug',
        choices: ['hug', 'rug', 'pan'],
        answer: 'pan',
        hint: 'Good try! Say bug, then say each word. Which one sounds different at the end?',
      },
    ],
    complete: [
      'You did it! The shells are singing again.',
      'Every word found its friend, thanks to you.',
    ],
  },

  // ---- MOANA: "The Shape Stones" — Math / geometry (shapes) -----------------
  // (Original story. Static rounds below are only the fallback; buildRounds uses TIERS.moana.)
  moana: {
    title: 'The Shape Stones',
    questName: 'The Shape Stones',
    intro: [
      'Hello! Welcome to Wayfinder Isle.',
      'My island path is made of shape stones, but they got scattered.',
      'Can you name them? Then the path will be whole again!',
    ],
    rounds: [
      {
        prompt: 'What shape is a can of soup?',
        choices: ['cylinder', 'cube', 'sphere'],
        answer: 'cylinder',
        hint: 'Good try! Think about the whole object. Is it round, flat, or pointy?',
      },
      {
        prompt: 'How many sides does a triangle have?',
        choices: ['3', '4', '5'],
        answer: '3',
        hint: 'Good try! Touch each side with your finger and count them.',
      },
      {
        prompt: 'Which shape has no corners?',
        choices: ['circle', 'square', 'triangle'],
        answer: 'circle',
        hint: 'Good try! A corner is where two sides meet. Look for a shape with no corners at all.',
      },
      {
        prompt: 'What shape is a ball?',
        choices: ['sphere', 'cube', 'cone'],
        answer: 'sphere',
        hint: 'Good try! Think about the whole object. Is it round, flat, or pointy?',
      },
      {
        prompt: 'How many flat faces does a cube have?',
        choices: ['6', '4', '8'],
        answer: '6',
        hint: 'Good try! A flat face is a flat part you can touch with your whole hand. Count them all, even the ones you cannot see.',
      },
    ],
    complete: [
      'You did it! The path is whole again.',
      'Every shape stone is home, thanks to you.',
    ],
  },

  // ---- JASMINE: "The Story Lanterns" — ELA / story order (first, next, last) --------
  // (Original story. Static rounds below are only the fallback; buildRounds uses TIERS.jasmine.)
  jasmine: {
    title: 'The Story Lanterns',
    questName: 'The Story Lanterns',
    intro: [
      'Hello! Welcome to the Moonlit Palace Garden.',
      'My story lanterns got mixed up, so the garden cannot tell its stories.',
      'Can you put each story in order? Then the lanterns will glow again!',
    ],
    rounds: [
      {
        prompt: 'Leo woke up. Then he ate breakfast. Last, he went to school. What happened first?',
        choices: ['wake up', 'eat breakfast', 'go to school'],
        answer: 'wake up',
        hint: 'Good try! Listen to the story again. What happened before everything else?',
      },
      {
        prompt: 'Pip was an egg. Then Pip was a baby chick. Last, Pip was a big hen. What happened last?',
        choices: ['egg', 'baby chick', 'big hen'],
        answer: 'big hen',
        hint: 'Good try! Listen to the story again. What happened after everything else?',
      },
      {
        prompt: 'Mia put on her socks. Then she put on her shoes. Last, she ran and played. What happened in the middle?',
        choices: ['put on socks', 'put on shoes', 'run and play'],
        answer: 'put on shoes',
        hint: 'Good try! The middle happens after the first part and before the last part.',
      },
      {
        prompt: 'Which is the right order?',
        choices: ['first clouds, then rain, last rainbow', 'first rainbow, then clouds, last rain', 'first rain, then rainbow, last clouds'],
        answer: 'first clouds, then rain, last rainbow',
        hint: 'Good try! Tell the story in your head. Which order makes sense?',
      },
      {
        prompt: 'Sam rolled a snowball. Then Sam made a snowman. What comes first?',
        choices: ['roll a snowball', 'make a snowman', 'go inside'],
        answer: 'roll a snowball',
        hint: 'Good try! Think about how this story begins, before anything else happens.',
      },
    ],
    complete: [
      'You did it! The lanterns are glowing again.',
      'Every story is in the right order, thanks to you.',
    ],
  },

  // ---- ANNA: "The Harbor Signs" — ELA / capital letters and end marks -----------------
  // (Original story. Static rounds below are only the fallback; buildRounds uses TIERS.anna.)
  anna: {
    title: 'The Harbor Signs',
    questName: 'The Harbor Signs',
    intro: [
      'Hello! Welcome to Sunny Fjord Harbor.',
      'A big wind mixed up our welcome signs, and the boats cannot read them.',
      'Can you fix each sentence? Then the boats can sail in!',
    ],
    rounds: [
      {
        prompt: 'Which mark ends this sentence?',
        say: 'Listen. Can we go? Which mark ends this sentence?',
        visual: { kind: 'sentence', text: 'Can we go?' },
        choices: ['. period', '? question mark', '! exclamation mark'],
        choiceSay: { '. period': 'period', '? question mark': 'question mark', '! exclamation mark': 'exclamation mark' },
        answerSay: 'question mark',
        answer: '? question mark',
        hint: 'Good try! Is the sentence telling, asking, or shouting? Listen to how it sounds.',
      },
      {
        prompt: 'Which mark ends this sentence?',
        say: 'Listen. The sun is hot. Which mark ends this sentence?',
        visual: { kind: 'sentence', text: 'The sun is hot.' },
        choices: ['. period', '? question mark', '! exclamation mark'],
        choiceSay: { '. period': 'period', '? question mark': 'question mark', '! exclamation mark': 'exclamation mark' },
        answerSay: 'period',
        answer: '. period',
        hint: 'Good try! Is the sentence telling, asking, or shouting? Listen to how it sounds.',
      },
      {
        prompt: 'Which word needs a capital letter?',
        say: 'Listen. zoe has a red hat. Which word needs a capital letter?',
        visual: { kind: 'sentence', text: 'zoe has a red hat.' },
        choices: ['zoe', 'red', 'hat'],
        answer: 'zoe',
        hint: 'Good try! Capital letters go on the first word, on names, and on the word that means just me.',
      },
      {
        prompt: 'Which word needs a capital letter?',
        say: 'Listen. we sit in the van. Which word needs a capital letter?',
        visual: { kind: 'sentence', text: 'we sit in the van.' },
        choices: ['we', 'sit', 'van'],
        answer: 'we',
        hint: 'Good try! Capital letters go on the first word, on names, and on the word that means just me.',
      },
      {
        prompt: 'Which sentence is written the right way?',
        say: 'Which sentence is written the right way? Look at the first letter and the end mark.',
        noChoiceSay: true,
        choices: ['Can we go?', 'can we go?', 'Can we go.'],
        answerSay: 'Can we go, with a capital letter and a question mark',
        answer: 'Can we go?',
        hint: 'Good try! Check the first letter, then check the mark at the end.',
      },
    ],
    complete: [
      'You did it! The harbor signs are fixed.',
      'Now every boat can read them. Thank you!',
    ],
  },

  // ---- TIANA: "The Tally Stand" — Math / tally marks and data -------------------------
  // (Original story. Static rounds below are only the fallback; buildRounds uses TIERS.tiana.)
  tiana: {
    title: 'The Tally Stand',
    questName: 'The Tally Stand',
    intro: [
      'Hello! Welcome to Firefly Bayou.',
      'I run the vegetable stand. The rain smudged my tally board!',
      'Can you help me count with tally marks? Then every basket is counted!',
    ],
    rounds: [
      {
        prompt: 'How many tally marks?',
        say: 'Count the tally marks. How many are there?',
        visual: { kind: 'tally', n: 3 },
        choices: ['2', '3', '4'],
        choiceSay: { '2': 'two', '3': 'three', '4': 'four' },
        answerSay: 'three',
        answer: '3',
        hint: 'Good try! Touch each line and count them in order.',
      },
      {
        prompt: 'How many tally marks?',
        say: 'Count the tally marks. How many are there?',
        visual: { kind: 'tally', n: 5 },
        choices: ['4', '5', '6'],
        choiceSay: { '4': 'four', '5': 'five', '6': 'six' },
        answerSay: 'five',
        answer: '5',
        hint: 'Good try! A slash across the lines makes a group. Count the whole group.',
      },
      {
        prompt: 'How many tally marks in all?',
        say: 'Count the tally marks. How many are there in all?',
        visual: { kind: 'tally', n: 13 },
        choices: ['12', '13', '18'],
        choiceSay: { '12': 'twelve', '13': 'thirteen', '18': 'eighteen' },
        answerSay: 'thirteen',
        answer: '13',
        hint: 'Good try! Count the slashed groups first, then add the single lines.',
      },
      {
        prompt: 'Which has the most?',
        say: 'Look at the tally chart. Which has the most?',
        visual: { kind: 'tallychart', title: 'Vegetable stand', rows: [{ e: '🥕', name: 'carrots', n: 7 }, { e: '🍅', name: 'tomatoes', n: 3 }, { e: '🌽', name: 'corn', n: 10 }] },
        choices: ['🥕 carrots', '🍅 tomatoes', '🌽 corn'],
        answer: '🌽 corn',
        hint: 'Good try! Count the marks in each row. The longest row has the most.',
      },
      {
        prompt: 'How many more corn than tomatoes?',
        say: 'Look at the tally chart. How many more corn than tomatoes?',
        visual: { kind: 'tallychart', title: 'Vegetable stand', rows: [{ e: '🥕', name: 'carrots', n: 7 }, { e: '🍅', name: 'tomatoes', n: 3 }, { e: '🌽', name: 'corn', n: 10 }] },
        choices: ['3', '7', '10'],
        choiceSay: { '3': 'three', '7': 'seven', '10': 'ten' },
        answerSay: 'seven',
        answer: '7',
        hint: 'Good try! Count each row. Then see how many extra the longer row has.',
      },
    ],
    complete: [
      'You did it! Every basket is counted.',
      'My tally board is as good as new. Thank you!',
    ],
  },

  aurora: {
    title: 'The Word Garden', questName: 'The Word Garden',
    intro: ['Welcome to Rosewood Glen!', 'The word garden needs your help.', 'Let us find naming words and action words together!'],
    rounds: [{ prompt: 'Which word names a thing?', choices: ['kitten', 'I hop', 'I dig'], answer: 'kitten', hint: 'A naming word names a person, animal, place, or thing.' }],
    complete: ['The word garden is shining again!', 'You found naming words and action words. Thank you!'],
  },

  // ---- ELSA: "The Frozen Bridge" — Math / operations within 20 ------------
  elsa: {
    title: 'The Frozen Bridge',
    questName: 'The Frozen Bridge',
    intro: [
      'Brrr! My bridges froze solid.',
      'Each one needs just the right number of snowflakes to sparkle again.',
      'Count with me, and we will cross together!',
    ],
    rounds: [
      {
        prompt: 'The bridge needs 7 + 5 snowflakes. How many?',
        choices: ['12', '11', '13'],
        answer: '12',
        hint: 'Good try! Count with me: 7 snowflakes, then 5 more. How many?',
        visual: { a: 7, b: 5 },
      },
      {
        prompt: 'The bridge needs 9 - 4 snowflakes. How many?',
        choices: ['5', '4', '6'],
        answer: '5',
        hint: 'Good try! Start with 9 snowflakes, then melt 4 away. How many are left?',
        visual: { a: 9, b: 4 },
      },
      {
        prompt: 'The bridge needs 6 + 8 snowflakes. How many?',
        choices: ['14', '12', '15'],
        answer: '14',
        hint: 'Good try! Count with me: 6 snowflakes, then 8 more. How many?',
        visual: { a: 6, b: 8 },
      },
      {
        prompt: 'The bridge needs 15 - 6 snowflakes. How many?',
        choices: ['9', '8', '10'],
        answer: '9',
        hint: 'Good try! Start with 15 snowflakes, then melt 6 away. How many are left?',
        visual: { a: 15, b: 6 },
      },
      {
        prompt: 'The bridge needs 10 - 3 snowflakes. How many?',
        choices: ['7', '8', '6'],
        answer: '7',
        hint: 'Good try! Start with 10 snowflakes, then melt 3 away. How many are left?',
        visual: { a: 10, b: 3 },
      },
    ],
    complete: [
      'All five bridges sparkle! You are a counting star.',
      'Now we can visit everyone in Frostfall Peaks.',
    ],
  },

  // ---- RAPUNZEL: "The Sleepy Garden" — Science / plants -------------------
  rapunzel: {
    title: 'The Sleepy Garden',
    questName: 'The Sleepy Garden',
    intro: [
      'Oh no, my flowers fell asleep!',
      'They need the things every plant needs to wake up and grow.',
      'Help me wake them, and the meadow will bloom!',
    ],
    rounds: [
      {
        prompt: 'A sleepy seed wants to wake up and grow. What does it drink first?',
        choices: ['Water', 'Juice', 'Milk'],
        answer: 'Water',
        hint: 'Good try! Seeds are thirsty, just like you. What do you drink?',
      },
      {
        prompt: 'Which one is a living thing?',
        choices: ['A rock', 'A flower', 'A shoe'],
        answer: 'A flower',
        hint: 'Good try! A living thing grows. Which one of these grows?',
      },
      {
        prompt: 'Little leaves reach up to catch the warm...',
        choices: ['Sunlight', 'Snow', 'Wind'],
        answer: 'Sunlight',
        hint: 'Good try! It comes from the sun. What do we call its warm light?',
        pic: '🌿',
      },
      {
        prompt: 'The seed is tucked into soft, brown dirt. What is that called?',
        choices: ['Soil', 'Soup', 'Sand'],
        answer: 'Soil',
        hint: 'Good try! It is the dirt plants sleep in. What is it called?',
        pic: '🪴',
      },
      {
        prompt: 'Which part of the plant drinks water down in the soil?',
        choices: ['Roots', 'Petals', 'Leaves'],
        answer: 'Roots',
        hint: 'Good try! They hide under the ground. Which part drinks down there?',
      },
    ],
    complete: [
      'Yay! The whole garden is awake and blooming.',
      'The flowers are dancing just for you!',
    ],
  },

  // ---- CINDERELLA: "The Midnight Clock" — Math / telling time -------------
  cinderella: {
    title: 'The Midnight Clock',
    questName: 'The Midnight Clock',
    intro: [
      'Oh my! All the village clocks fell asleep.',
      'The clock tower stopped, and nobody knows the time!',
      'Read each clock with me, and we will wind them all back up.',
    ],
    rounds: [
      {
        prompt: 'What time is the clock showing?',
        choices: ["3 o'clock", "4 o'clock", 'half past 3'],
        answer: "3 o'clock",
        hint: 'Good try! Look at the short hand. Which number is it pointing at?',
        clock: { hour: 3, minute: 0 },
      },
      {
        prompt: 'What time is the clock showing?',
        choices: ['half past 5', "5 o'clock", 'half past 6'],
        answer: 'half past 5',
        hint: 'Good try! The long hand is on the 6. That means half past. Half past what?',
        clock: { hour: 5, minute: 30 },
      },
      {
        prompt: 'What time is the clock showing?',
        choices: ["8 o'clock", "9 o'clock", 'half past 9'],
        answer: "9 o'clock",
        hint: 'Good try! Look at the short hand. Which number is it pointing at?',
        clock: { hour: 9, minute: 0 },
      },
      {
        prompt: 'What time is the clock showing?',
        choices: ["7 o'clock", 'half past 7', 'half past 8'],
        answer: 'half past 7',
        hint: 'Good try! The long hand is on the 6. That means half past. Half past what?',
        clock: { hour: 7, minute: 30 },
      },
      {
        prompt: 'What time is the clock showing?',
        choices: ["12 o'clock", "11 o'clock", 'half past 12'],
        answer: "12 o'clock",
        hint: 'Good try! Both hands are pointing straight up. Which number is at the top?',
        clock: { hour: 12, minute: 0 },
      },
    ],
    complete: [
      'Tick tock! Every clock in the village is chiming.',
      'You saved the day before midnight!',
    ],
  },
};

// ----------------------------------------------------------------------------
// FINALE_LINES — spoken when every land is complete.
// ----------------------------------------------------------------------------
export const FINALE_LINES = [
  'You did it, Zoe! All ten lands are glowing together!',
  'Your kindness brought the Starlight Crown back to the castle.',
  'Every friend and every kingdom shines because you kept trying.',
  'Thank you for learning and exploring with us. Shine on!',
];

// ----------------------------------------------------------------------------
// PARENT_CORNER_HTML — inline-styles-only overlay for parents.
// One row per quest mapping it to its 1st-grade standard, plus a finale row.
// ----------------------------------------------------------------------------
export const PARENT_CORNER_HTML = `<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#fffdf7;border:2px solid #ebd373;border-radius:16px;color:#1f2937;">
<h2 style="margin:0 0 4px;font-size:20px;color:#7c5e10;">&#128253; Parent Corner</h2>
<p style="margin:0 0 16px;font-size:14px;color:#6b7280;">What Zoe is practicing in each quest, mapped to 1st-grade standards.</p>
<div style="display:flex;flex-direction:column;gap:10px;">
<div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#f0f7ff;">
<div style="font-weight:700;font-size:15px;">&#128214; Belle &mdash; The Torn Storybook</div>
<div style="font-size:13px;margin-top:4px;"><b>Standard:</b> ELA Reading Foundations &mdash; CA CCSS RF.1.3 / RF.1.4</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">Phonics and sight-word recognition: sounding out short-vowel words and recognizing common first-grade words.</div>
</div>
<div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff0f7;">
<div style="font-weight:700;font-size:15px;">&#10052;&#65039; Elsa &mdash; The Frozen Bridge</div>
<div style="font-size:13px;margin-top:4px;"><b>Standard:</b> Math Operations within 20 &mdash; CA CCSS 1.OA</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">Adding and subtracting within 20 using countable snowflakes as visual supports.</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">Counting on from the bigger number (CA CCSS 1.OA.5 and 1.OA.6) and doubles 1+1 to 5+5 (1.OA.6).</div>
</div>
<div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#f0fdf4;">
<div style="font-weight:700;font-size:15px;">&#127803; Rapunzel &mdash; The Sleepy Garden</div>
<div style="font-size:13px;margin-top:4px;"><b>Standard:</b> Science: plants &amp; living things &mdash; NGSS 1-LS1 (CA); Math: measuring &mdash; CA CCSS 1.MD.1&ndash;2</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">What plants need to grow (water, sunlight, soil) and living vs. nonliving things. Also measuring: comparing flower heights and counting petal units for length.</div>
</div>
<div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fffbeb;">
<div style="font-weight:700;font-size:15px;">&#9200; Cinderella &mdash; The Midnight Clock</div>
<div style="font-size:13px;margin-top:4px;"><b>Standard:</b> Math: telling time &mdash; CA CCSS 1.MD.3</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">Reading an analog clock to the hour and half-hour.</div>
</div>
<div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#ecfeff;">
<div style="font-weight:700;font-size:15px;">&#128026; Ariel &mdash; The Seashell Songs</div>
<div style="font-size:13px;margin-top:4px;"><b>Standard:</b> ELA Reading Foundations &mdash; CA CCSS RF.1.2 / RF.1.3</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">Rhyming and word families: hearing which short words end with the same sound (cat, hat), then changing the first letter to build new words in a family (-at, -ig, -op).</div>
</div>
<div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff7ed;">
<div style="font-weight:700;font-size:15px;">&#128310; Moana &mdash; The Shape Stones</div>
<div style="font-size:13px;margin-top:4px;"><b>Standard:</b> Math: geometry &mdash; CA CCSS 1.G.A.1 / 1.G.A.2 (and K.G)</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">Naming flat shapes (circle, triangle, square, rectangle, pentagon, hexagon) and solid shapes (cube, sphere, cone, cylinder) by their sides, corners and flat faces, however they are turned or colored.</div>
</div>
<div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#eef2ff;">
<div style="font-weight:700;font-size:15px;">&#127982; Jasmine &mdash; The Story Lanterns</div>
<div style="font-size:13px;margin-top:4px;"><b>Standard:</b> ELA Reading Literature &mdash; CA CCSS RL.1.2 (and RL.K.2 / RL.1.3)</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">Story order: retelling a short story with its key details in the right order, using first, next and last (beginning, middle and end) with everyday sequences like a seed growing or getting ready for school.</div>
</div>
<div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fef2f2;">
<div style="font-weight:700;font-size:15px;">&#9875; Anna &mdash; The Harbor Signs</div>
<div style="font-size:13px;margin-top:4px;"><b>Standard:</b> ELA Language &mdash; CA CCSS L.1.2.a / L.1.2.b (and L.K.2.a)</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">Capital letters and end marks: capitalizing the first word of a sentence and the names of people (and the word I), and ending a sentence with a period, question mark or exclamation mark.</div>
</div>
<div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#faf5ff;">
<div style="font-weight:700;font-size:15px;">&#129365; Tiana &mdash; The Tally Stand</div>
<div style="font-size:13px;margin-top:4px;"><b>Standard:</b> Math: data &mdash; CA CCSS 1.MD.C.4 (and K.CC / 1.NBT counting by 5s)</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">Tally marks: counting tally marks and groups of five (four lines and a slash), then reading a tiny tally chart to find which row has the most, how many in a row, and how many more one row has than another.</div>
</div>
<div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff1f2;">
<div style="font-weight:700;font-size:15px;">&#127801; Aurora &mdash; The Word Garden</div>
<div style="font-size:13px;margin-top:4px;"><b>Standard:</b> ELA Language &mdash; L.1.1</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">Identify naming words and action words, then sort words into both groups.</div>
</div>
<div style="padding:12px;border:2px solid #ebd373;border-radius:12px;background:#fefce8;">
<div style="font-weight:700;font-size:15px;">&#128081; Starlight Finale</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">Finishing all ten lands restores the ten-point Starlight Crown on the castle and celebrates persistence &mdash; no fail states, ever.</div>
</div>
</div>
<p style="margin:12px 0 0;font-size:13px;color:#374151;"><b>Tip:</b> for a clearer voice on iPhone or iPad, open Settings &rarr; Accessibility &rarr; Spoken Content &rarr; Voices &rarr; English, and download an Enhanced voice (for example Samantha). The game uses it automatically.</p>
<p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">No scores, no penalties &mdash; wrong answers get a gentle hint and a retry.</p>
</div>`;

// ============================================================================
// ROUND POOLS — fresh rounds every play. buildRounds(npcId) returns 5 rounds
// in the same shape as QUESTS[npcId].rounds (which stay as the fallback).
// Pass a custom rng for deterministic tests.
// ============================================================================
export const DOLCH_PREPRIMER = [
  'and', 'away', 'big', 'blue', 'can', 'come', 'down', 'find', 'for', 'funny',
  'go', 'help', 'here', 'jump', 'little', 'look', 'make', 'play', 'red', 'run',
  'said', 'see', 'the', 'three', 'two', 'up', 'we', 'where', 'yellow', 'you',
];
export const DOLCH_PRIMER = [
  'all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown', 'but', 'came', 'did',
  'do', 'eat', 'four', 'get', 'good', 'have', 'he', 'into', 'like', 'must', 'new',
  'no', 'now', 'on', 'our', 'out', 'please', 'pretty', 'ran', 'ride', 'saw', 'say',
  'she', 'so', 'soon', 'that', 'there', 'they', 'this', 'too', 'under', 'want',
  'was', 'well', 'went', 'what', 'white', 'who', 'will', 'with', 'yes',
];

// Short-vowel CVC words grouped so distractors differ by one sound.
const CVC_SETS = [
  ['cat', 'cap', 'cup'], ['pig', 'pin', 'pen'], ['dog', 'dig', 'dot'],
  ['sun', 'sit', 'sap'], ['hat', 'hot', 'hit'], ['bed', 'bad', 'bud'],
  ['map', 'mop', 'mat'], ['bug', 'bag', 'big'], ['fox', 'fix', 'fax'],
  ['red', 'rod', 'rid'], ['net', 'nut', 'not'], ['ten', 'tan', 'tin'],
];

function _pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
function _shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function _sample(arr, n, rng) { return _shuffle(arr, rng).slice(0, n); }

// Which letter the Belle hint points at: a letter the right word has that NO
// wrong choice shares in the same spot (first letter, then last letter, then
// any position). Returns the index, or -1 when the hint is about length/spelling.
function _hintPos(w, distractors) {
  const differs = (i, ch) => distractors.every((d) => d[i] !== ch);
  if (differs(0, w[0])) return 0;
  const last = w[w.length - 1];
  if (distractors.every((d) => d[d.length - 1] !== last)) return w.length - 1;
  for (let i = 1; i < w.length; i++) if (differs(i, w[i])) return i;
  return -1;
}

// Belle hint: point at a letter the right word has that NO wrong choice shares
// in the same spot (first letter, then last letter, then any position).
export function _belleHint(w, distractors) {
  const i = _hintPos(w, distractors);
  const last = w[w.length - 1];
  if (i === 0) return `Good try! Let's look again. '${w}' starts with the letter ${w[0]}.`;
  if (i === w.length - 1) return `Good try! Let's look again. '${w}' ends with the letter ${last}.`;
  const ord = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
  if (i > 0) return `Good try! Let's look again. The ${ord[i] || 'next'} letter in '${w}' is ${w[i]}.`;
  const lens = distractors.every((d) => d.length !== w.length);
  if (lens) return `Good try! Let's look again. '${w}' has ${w.length} letters.`;
  return `Good try! Let's look again. Spell it with me: ${w.split('').join(' - ')}.`;
}

// Belle's recorded phonics clips (repo-root assets/audio/EN/curriculum/belle/).
// A wrong answer plays the clip for the letter the hint points at, so Zoe hears
// the letter's SOUND (text-to-speech would say its name). Short vowels only
// (the 'o' clip says the long sound); no x or q.
export const BELLE_CLIP_DIR = '../assets/audio/EN/curriculum/belle/';
const LETTER_CLIPS = {
  a: 'a_says_ah_apple', b: 'b_says_buh_ball', c: 'c_says_kuh_cat', d: 'd_says_duh_dog',
  e: 'e_says_eh_egg', f: 'f_says_fuh_fish', g: 'g_says_guh_goat', h: 'h_says_huh_hat',
  i: 'i_says_ih_igloo', j: 'j_says_juh_jar', k: 'k_says_kuh_kite', l: 'l_says_luh_lion',
  m: 'm_says_mmm_moon', n: 'n_says_nuh_nest', p: 'p_says_puh_pig', r: 'r_says_ruh_rainbow',
  s: 's_says_sss_sun', t: 't_says_tuh_turtle', u: 'u_says_uh_umbrella', v: 'v_says_vuh_van',
  w: 'w_says_wuh_wagon', y: 'y_says_yuh_yarn', z: 'z_says_zzz_zebra',
};
const DIGRAPH_CLIPS = {
  sh: 's_h_says_shh_ship', ch: 'c_h_says_chh_chair', th: 't_h_says_thh_three',
  wh: 'w_h_says_wuh_wheel', ck: 'c_k_says_kuh_clock', ng: 'n_g_says_ing_ring',
};
// Tap-to-blend: seconds at which a letter's clip is cut so Zoe hears "c says kuh"
// but not "cat" (the stop sits in the pause before the example word). e and s have
// no such pause, so they play whole. o (clip is the long sound) and x (no clip)
// speak a sound spelling with text-to-speech instead.
export const BLEND_STOP = {
  a: 0.59, b: 0.76, c: 0.85, d: 0.85, f: 0.79, g: 0.96, h: 0.8, i: 0.62, j: 0.96, k: 0.95,
  l: 0.92, m: 1.51, n: 0.95, p: 0.86, r: 0.96, t: 0.68, u: 0.83, v: 0.99, w: 1.04, y: 0.7, z: 1.3,
};
export const BLEND_WHOLE = ['e', 's'];
export const BLEND_TTS = { o: 'ah', x: 'ks' };
/** How to voice one tile letter: { url, stopAt } | { tts } | undefined. */
export function tileSound(l) {
  if (BLEND_TTS[l]) return { tts: BLEND_TTS[l] };
  if (!LETTER_CLIPS[l]) return undefined;
  return { url: BELLE_CLIP_DIR + LETTER_CLIPS[l] + '.mp3', stopAt: BLEND_STOP[l] };
}
export const BELLE_CLIPS = [...Object.values(LETTER_CLIPS), ...Object.values(DIGRAPH_CLIPS)].map((c) => c + '.mp3');

// Clip file for the letter the hint points at, or undefined when none fits
// (or when the clip's example word would give the answer away).
export function _belleSound(w, distractors) {
  const i = _hintPos(w, distractors);
  if (i < 0) return undefined;
  let clip;
  for (const at of [i - 1, i]) {
    const dg = at >= 0 && at + 1 < w.length ? DIGRAPH_CLIPS[w[at] + w[at + 1]] : undefined;
    if (dg) { clip = dg; break; }
  }
  if (!clip) clip = LETTER_CLIPS[w[i]];
  if (!clip) return undefined;
  const example = clip.split('_').pop();
  if (example === w || distractors.includes(example)) return undefined;
  return clip + '.mp3';
}

// ============================================================================
// FIRST-GRADE CONTENT (Step 4). Three tiers per land: T1 easy, T2 core,
// T3 stretch. The ladder (js/ladder.js) picks the tier for each play.
// Optional round extras: `say` (what is read aloud, when it must differ from
// the prompt, e.g. Belle sentences she reads herself), `visual` (Elsa),
// `clock` (Cinderella), `pic` (emoji picture shown above the choices).
// ============================================================================

// A parent can replace this with the class's own word list (e.g. Wonders
// high-frequency words). When empty, the Dolch first-grade list below is used.
export const SCHOOL_WORDS = [];

/** Clean a grown-up's typed list: split on commas/newlines, trim, lowercase,
 *  letters and apostrophes only, 1-12 chars, no repeats, at most 30 words. */
export function cleanWordList(input) {
  const parts = Array.isArray(input) ? input : String(input == null ? '' : input).split(/[,\n\r;]+/);
  const out = [];
  for (const p of parts) {
    const w = String(p).trim().toLowerCase();
    if (/^[a-z']{1,12}$/.test(w) && /[a-z]/.test(w) && !out.includes(w)) out.push(w);
    if (out.length >= 30) break;
  }
  return out;
}
/** Set (or with [] clear) the class word list. Belle's Core level uses it at 3+ words. */
export function setSchoolWords(list) {
  SCHOOL_WORDS.length = 0;
  SCHOOL_WORDS.push(...cleanWordList(list));
  return SCHOOL_WORDS.slice();
}
// ---- This week's school pack (S1). A grown-up edits it in Parent Corner. ----
export const WEEK_DEFAULT = {
  spelling: ['lend', 'send', 'fast', 'sink', 'past'],
  sight: ['of', 'he'],
  dictation: 'Can he run past the tent?',
  vowels: ['sat', 'hip', 'pen', 'log', 'nut']
};
/** Live pack; updated in place by setWeek. */
export const WEEK = {
  spelling: WEEK_DEFAULT.spelling.slice(),
  sight: WEEK_DEFAULT.sight.slice(),
  dictation: WEEK_DEFAULT.dictation,
  vowels: WEEK_DEFAULT.vowels.slice()
};
function _weekList(input) {
  const parts = Array.isArray(input) ? input : String(input == null ? '' : input).split(/[,\n\r;]+/);
  const out = [];
  for (const p of parts) {
    const w = String(p).trim().toLowerCase();
    if (/^[a-z]{1,12}$/.test(w) && !out.includes(w)) out.push(w);
    if (out.length >= 15) break;
  }
  return out;
}
function _weekSentence(input) {
  const t = String(input == null ? '' : input).trim().replace(/\s+/g, ' ');
  return t.length <= 60 && /^[A-Z][A-Za-z', ]*[.?!]$/.test(t) && /[a-z]/.test(t) ? t : '';
}
/** Clean a pack: bad or empty fields fall back to the default. Returns a fresh object. */
export function cleanWeek(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const list = (v, d) => { const l = _weekList(v); return l.length ? l : d.slice(); };
  return {
    spelling: list(r.spelling, WEEK_DEFAULT.spelling),
    sight: list(r.sight, WEEK_DEFAULT.sight),
    dictation: _weekSentence(r.dictation) || WEEK_DEFAULT.dictation,
    vowels: list(r.vowels, WEEK_DEFAULT.vowels)
  };
}
/** Set the live pack (null resets to defaults). Returns a copy. */
export function setWeek(raw) {
  const c = cleanWeek(raw);
  WEEK.spelling = c.spelling; WEEK.sight = c.sight; WEEK.dictation = c.dictation; WEEK.vowels = c.vowels;
  return cleanWeek(WEEK);
}
const SIGHT_1ST = [
  'after', 'again', 'could', 'every', 'from', 'give', 'has', 'her', 'him', 'how',
  'just', 'know', 'live', 'once', 'open', 'some', 'them', 'then', 'think', 'were', 'when',
];

// Digraph sets: right word first; the others differ by one sound.
const DIGRAPH_SETS = [
  ['ship', 'chip', 'sip'], ['shop', 'chop', 'hop'], ['fish', 'fin', 'fit'],
  ['dish', 'dip', 'fish'], ['wish', 'with', 'wig'], ['shell', 'sell', 'bell'],
  ['chip', 'ship', 'hip'], ['chin', 'shin', 'tin'], ['chop', 'shop', 'cop'],
  ['much', 'mush', 'mud'], ['lunch', 'bunch', 'lump'], ['rich', 'rip', 'rib'],
  ['this', 'thin', 'his'], ['that', 'hat', 'than'], ['then', 'hen', 'ten'],
  ['with', 'wish', 'wit'], ['bath', 'bat', 'back'], ['math', 'mat', 'mash'],
  ['when', 'hen', 'wet'], ['whip', 'hip', 'ship'], ['duck', 'dock', 'luck'],
  ['sock', 'sack', 'sick'], ['ring', 'rang', 'rug'], ['king', 'kin', 'sing'],
];
const BLEND_SETS = [
  ['frog', 'fog', 'from'], ['flag', 'flap', 'bag'], ['crab', 'cab', 'crib'],
  ['drum', 'drip', 'gum'], ['step', 'stem', 'pet'], ['swim', 'slim', 'him'],
  ['clap', 'cap', 'clip'], ['plan', 'pan', 'plum'], ['trip', 'tip', 'trap'],
  ['snap', 'sap', 'snip'], ['stop', 'top', 'step'], ['grin', 'grab', 'pin'],
];
const SENTENCES = [
  ['The frog can hop.', '🐸', '🐟', '🐶', 'the frog'],
  ['A fish is in the dish.', '🐟', '🐸', '🐔', 'the fish'],
  ['The ship is big.', '🚢', '🚗', '🐛', 'the ship'],
  ['I can see the duck.', '🦆', '🐱', '🐷', 'the duck'],
  ['She has a red hat.', '🎩', '👟', '🍎', 'the red hat'],
  ['The cat is on the bed.', '🐱', '🐶', '🐸', 'the cat on the bed'],
  ['The crab is on the sand.', '🦀', '🐢', '🐌', 'the crab'],
  ['Then he will swim.', '🏊', '🚲', '🛌', 'the swimmer'],
];

function _wordRound(w, d) {
  const r = { prompt: `Which word says '${w}'?`, choices: [w, ...d], answer: w, hint: _belleHint(w, d) };
  const sound = _belleSound(w, d);
  if (sound) r.sound = sound;
  return r;
}
function _sightRound(w, pool, rng) {
  const others = pool.filter((x) => x !== w);
  const close = _shuffle(others.filter((x) => x[0] === w[0] || x.length === w.length), rng);
  const d = [...new Set([...close, ..._shuffle(others, rng)])].slice(0, 2);
  // Sight words are not decodable (know, give, here), so no letter-sound clip.
  const { sound, ...r } = _wordRound(w, d);
  return r;
}
function _cvcRound(set) {
  const w = set[0];
  const d = set.slice(1);
  // `say` skips the letters: text-to-speech would read them as names (see, ay, tee).
  const r = {
    prompt: `Sound it out: ${w.split('').join(' - ')}. Which word is it?`,
    say: 'Sound it out. Which word is it?',
    choices: set.slice(), answer: w,
    hint: _belleHint(w, d),
    tiles: w.split(''), // tap-to-blend letter tiles (ui.js)
  };
  const sound = _belleSound(w, d);
  if (sound) r.sound = sound;
  return r;
}
function _sentenceRound([text, ans, d1, d2, answerSay]) {
  return {
    answerSay,
    prompt: `${text} Which picture matches?`,
    say: 'Read the words. Which picture matches?',
    // 🔊 replay reads the sentence too (the opening voice does not).
    replay: `${text} Which picture matches?`,
    choices: [ans, d1, d2], answer: ans,
    hint: `Good try! Read it with me: ${text} Which picture shows that?`,
  };
}

// ---- Spelling and short-vowel rounds (S2). They read WEEK when a round is made, so Parent Corner edits apply. ----
const _VOWELS = ['a', 'e', 'i', 'o', 'u'];
const _ENDINGS = ['nd', 'nt', 'st', 'nk', 'sk', 'mp', 'ft', 'lt', 'ld', 'lp', 'ng'];
const _MORE_WORDS = ['lent', 'lest', 'left', 'lift', 'list', 'lens', 'lint', 'link', 'sent', 'sand', 'band', 'bend', 'best',
  'bent', 'bust', 'dust', 'fist', 'fest', 'test', 'tent', 'tend', 'mend', 'mask', 'mast', 'must', 'nest', 'next', 'pant',
  'pest', 'pink', 'pond', 'rank', 'rent', 'rest', 'rust', 'sank', 'sunk', 'silk', 'sick', 'task', 'talk', 'wink', 'wind',
  'went', 'west', 'jump', 'just', 'lamp', 'lump', 'limp', 'hump', 'help', 'held', 'hold', 'hand', 'land', 'last', 'lust',
  'loft', 'soft', 'felt', 'fend', 'find', 'fund', 'kind', 'mind', 'fond', 'cast', 'cost', 'fact', 'fans', 'sing', 'song',
  'long', 'lung', 'sink', 'send', 'lend', 'fast', 'past', 'pasta', 'sit', 'set', 'sat', 'sap', 'sip', 'sup'];
let _known = null;
// Real words we already know, so a wrong choice is not accidentally also a word.
function _isRealWord(w) {
  if (!_known) {
    _known = new Set([..._MORE_WORDS, ...SIGHT_1ST, ...DOLCH_PREPRIMER, ...DOLCH_PRIMER, ...DOLCH_1ST,
      ...DIGRAPH_SETS.flat(), ...BLEND_SETS.flat(), ...CVC_SETS.flat()]);
  }
  return _known.has(w);
}
function _vowelIndex(w) {
  const at = [];
  for (let i = 0; i < w.length; i++) if (_VOWELS.includes(w[i])) at.push(i);
  return at.length === 1 ? at[0] : -1; // one clear vowel only, so the blank has one answer
}
function _vowelRound(w, rng) {
  const i = _vowelIndex(w);
  const v = w[i];
  const others = _shuffle(_VOWELS.filter((x) => x !== v), rng).slice(0, 2);
  const where = i === 0 ? 'at the start' : i === w.length - 1 ? 'at the end' : 'in the middle';
  const r = {
    prompt: 'Listen. Which letter is missing?', // the word is spoken, not shown (showing it gives the answer away)
    say: `Listen: ${w}. Which letter is missing?`,
    show: w.split('').map((c, k) => (k === i ? '_' : c)).join(' '),
    choices: [v, ...others], answer: v,
    // Shown hint never spells the word; the spoken hint (hintSay) can say it.
    hint: `Good try! Listen again and say it slowly. What sound do you hear ${where}?`,
    hintSay: `Good try! Say it slowly: ${w}. What sound do you hear ${where}?`,
  };
  if (v !== 'o') r.sound = LETTER_CLIPS[v] + '.mp3'; // the 'o' clip says the long sound
  return r;
}
function _endingRound(w, rng) {
  const end = w.slice(-2);
  const start = w.slice(0, -2);
  let pool = _shuffle(_ENDINGS.filter((e) => e !== end), rng);
  const notWords = pool.filter((e) => !_isRealWord(start + e));
  pool = [...notWords, ...pool.filter((e) => !notWords.includes(e))];
  const d = pool.slice(0, 2);
  return {
    prompt: 'Listen. Which ending finishes the word?',
    say: `Listen: ${w}. Which ending finishes the word?`,
    show: `${start.split('').join(' ')} _ _`,
    choices: [end, ...d], answer: end,
    hint: 'Good try! Listen again and say it slowly. Which letters do you hear at the end?',
    hintSay: `Good try! Say it slowly: ${w}. Which letters do you hear at the end?`,
  };
}
const _LOOKALIKE = { b: 'd', d: 'b', p: 'q', m: 'n', n: 'm', e: 'a', a: 'e', i: 'e', o: 'u', u: 'o', s: 'c', t: 'd' };
function _misspellings(w, rng) {
  const main = new Set(), drops = new Set(), last = [w + w[w.length - 1], 'x' + w];
  for (let i = 0; i + 1 < w.length; i++) main.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2)); // swapped neighbors
  for (let i = 0; i < w.length; i++) if (_LOOKALIKE[w[i]]) main.add(w.slice(0, i) + _LOOKALIKE[w[i]] + w.slice(i + 1));
  if (w.length > 3) for (let i = 1; i < w.length; i++) drops.add(w.slice(0, i) + w.slice(i + 1)); // a letter missing
  const ok = (x) => x !== w;
  const tiers = [[...main], [...drops], last].map((a) => a.filter(ok));
  const out = [];
  // Made-up spellings first, then ones that happen to be real words, so no wrong choice is a different word if avoidable.
  for (const real of [false, true]) {
    for (const t of tiers) {
      for (const x of _shuffle(t.filter((y) => _isRealWord(y) === real), rng)) if (!out.includes(x)) out.push(x);
    }
  }
  return out.slice(0, 2);
}
const _ALPHA = 'abcdefghijklmnopqrstuvwxyz'.split('');
function _spellRound(w, rng) {
  const spare = _shuffle(_ALPHA.filter((l) => !w.includes(l)), rng).slice(0, 2);
  let tiles = _shuffle([...w.split(''), ...spare], rng);
  for (let k = 0; k < 6 && tiles.join('').startsWith(w); k++) tiles = _shuffle(tiles, rng);
  return {
    prompt: 'Listen and build the word.',
    say: `Listen: ${w}. Tap the letters to build the word.`,
    replay: `Listen: ${w}. Tap the letters to build the word.`,
    choices: [w, ..._misspellings(w, rng)], answer: w,
    hint: 'Good try! Listen again and say it slowly. What sound comes next?',
    hintSay: `Good try! Say it slowly: ${w}. What sound comes next?`,
    spell: { word: w, tiles },
  };
}
/** A spelling round for this tier from the live WEEK pack, or null when the pack has no fitting word. */
function _spellKind(tier, rng) {
  const list = tier === 1 ? WEEK.vowels.filter((w) => _vowelIndex(w) >= 0)
    : tier === 2 ? WEEK.spelling.filter((w) => w.length >= 3)
    : WEEK.spelling.filter((w) => w.length >= 2);
  if (!list.length) return null;
  const w = _pick(list, rng);
  return tier === 1 ? _vowelRound(w, rng) : tier === 2 ? _endingRound(w, rng) : _spellRound(w, rng);
}

// ---- Dictation sentence rounds (S3). They read WEEK.dictation when a round is made. ----
// Extra practice sentences (sight words "of" and "he", plus short-vowel words), each 8 words or fewer.
export const DICTATION_PRACTICE = [
  'He has a box of pens.',
  'He can sit on top of the log.',
  'Did he get a bag of nuts?',
];
const _SWAP_EXTRA = ['he', 'she', 'we', 'me', 'be', 'ten', 'tan', 'tin', 'ran', 'run', 'rug', 'rub', 'bun', 'pan', 'pen', 'pin', 'pig', 'peg',
  'pat', 'pit', 'pot', 'put', 'cat', 'cut', 'cot', 'can', 'cap', 'cup', 'big', 'bag', 'beg', 'bug', 'box', 'fox', 'fix', 'hen', 'hat', 'hit',
  'hut', 'hot', 'hop', 'hip', 'has', 'his', 'had', 'hid', 'sad', 'sit', 'set', 'sat', 'sap', 'sip', 'mat', 'met', 'map', 'mop', 'mud', 'net',
  'nut', 'not', 'nap', 'log', 'leg', 'lag', 'lip', 'lap', 'top', 'tip', 'tap', 'tub', 'tug', 'dog', 'dig', 'dug', 'den', 'did', 'dip', 'jet',
  'jam', 'job', 'win', 'wet', 'web', 'wig', 'yes', 'yet', 'zip', 'got', 'get', 'gum', 'gas', 'bat', 'bit', 'bet', 'bad', 'bed', 'bud', 'red',
  'rat', 'rot', 'run', 'rim', 'ram', 'van', 'vet', 'fan', 'fun', 'fat', 'fit', 'fig', 'fin', 'lot', 'lid', 'kid', 'kit', 'sun', 'sum', 'sob',
  'pest', 'tent', 'test', 'tend', 'past', 'pass', 'fast', 'last', 'mast', 'mist', 'must', 'mask', 'task', 'hand', 'band', 'land', 'sand'];
let _swapPool = null;
function _swapWords() {
  if (!_swapPool) {
    _swapPool = [...new Set([..._SWAP_EXTRA, ..._MORE_WORDS, ...CVC_SETS.flat(), ...BLEND_SETS.flat()])]
      .filter((w) => /^[a-z]{2,5}$/.test(w));
  }
  return _swapPool;
}
// True when a and b are one letter apart (swap, add or drop one letter).
function _oneEdit(a, b) {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  const [lo, hi] = a.length < b.length ? [a, b] : [b, a];
  return lo.slice(i) === hi.slice(i + 1);
}
/** Split a sentence into { words (no commas), toks (comma kept), end }. */
function _parseSentence(text) {
  const t = String(text).trim().replace(/\s+/g, ' ');
  const end = t.slice(-1);
  const toks = t.slice(0, -1).trim().split(' ').filter(Boolean);
  const words = toks.map((x) => x.replace(/,/g, ''));
  return { toks, words, end };
}
function _capFirst(w) { return w.charAt(0).toUpperCase() + w.slice(1); }
/** Two other versions of the sentence, each with exactly one word swapped. Never equals the sentence. */
export function dictationVariants(text, rng) {
  const { toks, words, end } = _parseSentence(text);
  const lower = words.map((w) => w.toLowerCase());
  const pool = _swapWords();
  const cands = [];
  words.forEach((w, i) => {
    const lw = lower[i];
    for (const alt of pool) {
      if (alt !== lw && _oneEdit(lw, alt) && !lower.includes(alt)) cands.push({ i, alt, big: lw.length >= 3 });
    }
  });
  const pickFrom = (list, used) => {
    const fresh = list.filter((c) => !used.some((u) => u.i === c.i)); // different spot each time when possible
    const src = fresh.length ? fresh : list.filter((c) => !used.some((u) => u.i === c.i && u.alt === c.alt));
    return src.length ? _pick(src, rng) : null;
  };
  const out = [];
  for (const group of [cands.filter((c) => c.big), cands]) {
    while (out.length < 2) {
      const c = pickFrom(group, out);
      if (!c) break;
      out.push(c);
    }
  }
  // No near word fits (an unusual sentence): swap in any short word that is not in it.
  for (let k = 0; out.length < 2 && k < 60; k++) {
    const i = Math.floor(rng() * words.length);
    const alt = _pick(pool, rng);
    if (!lower.includes(alt) && !out.some((u) => u.i === i && u.alt === alt)) out.push({ i, alt });
  }
  const build = (c) => {
    const t2 = toks.slice();
    const comma = /,$/.test(toks[c.i]) ? ',' : '';
    t2[c.i] = (c.i === 0 ? _capFirst(c.alt) : c.alt) + comma;
    return t2.join(' ') + end;
  };
  return out.slice(0, 2).map(build);
}
const _END_SAY = { '?': 'question mark', '.': 'period', '!': 'exclamation mark' };
const _END_HINT = {
  '?': 'Is it asking something? Then it ends with a question mark.',
  '.': 'Is it telling something? Then it ends with a period.',
  '!': 'Is it a big, excited sentence? Then it ends with an exclamation mark.',
};
function _dictRound(tier, rng) {
  const useWeek = rng() < 0.5;
  const text = useWeek ? WEEK.dictation : _pick(DICTATION_PRACTICE, rng);
  const { words, end } = _parseSentence(text);
  const variants = dictationVariants(text, rng);
  const answer = String(text).trim().replace(/\s+/g, ' ');
  const spoken = answer;
  const r = { choices: [answer, ...variants], answer };
  if (tier === 1) {
    return {
      ...r,
      prompt: 'Which sentence did you hear?',
      say: `Listen. ${spoken} Which sentence did you hear?`,
      replay: spoken,
      hint: 'Good try! Listen again. Which words did you hear?',
      hintSay: `Good try! Listen again. ${spoken}`,
    };
  }
  const target = words.slice(); // keep the grown-up's capitals (names like Zoe stay capitalized)
  const spare = [];
  if (tier === 2) {
    const extra = ['of', ...WEEK.sight, 'he', 'at'].find((w) => !target.some((t) => t.toLowerCase() === w));
    if (extra) spare.push(extra);
  } else {
    if (target[0] !== target[0].toLowerCase()) spare.push(target[0].toLowerCase());
    else spare.push(_capFirst(target[0]));
    for (const m of ['.', '?', '!']) if (m !== end) spare.push(m);
  }
  const full = tier === 3 ? [...target, end] : target;
  let tiles = _shuffle([...full, ...spare], rng);
  for (let k = 0; k < 8 && (tiles.slice(0, full.length).join('|') === full.join('|')); k++) tiles = _shuffle(tiles, rng);
  const more = `Good try! Listen again. ${spoken}`;
  return {
    ...r,
    prompt: tier === 2 ? 'Listen and build the sentence.' : 'Listen. Build the sentence with a capital and an end mark.',
    say: `Listen. ${spoken} ${tier === 2 ? 'Tap the words to build the sentence.' : 'Tap the words to build it. Start with a capital letter and finish with the right end mark.'}`,
    replay: spoken,
    hint: 'Good try! Listen again. Which word comes next?',
    hintSay: more,
    build: tier === 2
      ? { tiles, target, end, sentence: true }
      : { tiles, target: full, sentence: true,
          hints: { first: 'Good try! A sentence starts with a capital letter.', last: `Good try! ${_END_HINT[end]}` } },
  };
}
export const END_MARK_SAY = _END_SAY;


// Number choices: the answer plus specific mistakes first, then near misses.
function _numChoices(ans, rng, max = 20, mistakes = []) {
  const opts = new Set([ans]);
  for (const n of _shuffle(mistakes, rng)) { if (opts.size >= 2) break; if (n >= 0 && n !== ans) opts.add(n); }
  const near = _shuffle([ans - 1, ans + 1, ans - 2, ans + 2], rng);
  for (const n of near) { if (opts.size >= 3) break; if (n >= 0 && n <= Math.max(max, ans + 2)) opts.add(n); }
  return [...opts].map(String);
}

const _flakes = (n) => `${n} snowflake${n === 1 ? '' : 's'}`;
function _elsaWithin(rng, max) {
  const add = rng() < 0.5;
  if (add) {
    const a = 1 + Math.floor(rng() * (max - 1));
    const b = 1 + Math.floor(rng() * (max - a));
    return {
      prompt: `You have ${_flakes(a)}. ${b} more ${b === 1 ? 'falls' : 'fall'}. How many now?`,
      choices: _numChoices(a + b, rng, max, [Math.abs(a - b)]), answer: String(a + b),
      hint: `Good try! Count with me: ${_flakes(a)}, then ${b} more. How many?`,
      visual: { a, b, op: '+' },
    };
  }
  const a = 2 + Math.floor(rng() * (max - 1));
  const b = 1 + Math.floor(rng() * (a - 1));
  return {
    prompt: `You have ${_flakes(a)}. ${b} ${b === 1 ? 'melts' : 'melt'}. How many are left?`,
    choices: _numChoices(a - b, rng, max, a + b <= 20 ? [a + b] : []), answer: String(a - b),
    hint: `Good try! Start with ${_flakes(a)}. Cover ${b}. Count the rest.`,
    visual: { a, b, op: '-' },
  };
}

// ---- Count on (CA 1.OA.5 / 1.OA.6) and doubles (1.OA.6): about half of Elsa's rounds ----
const _nz = (list, ans) => (list.includes('0') ? [...list.filter((x) => x !== '0'), String(ans + 3)] : list);
function _countOnHint(big, s) {
  const seq = [];
  for (let i = 1; i < s; i++) seq.push(big + i);
  const tail = s === 1 ? 'What number comes right after?' : `${seq.join(', ')}, then one more.`;
  return `Good try! Start with the bigger number, ${big}. Count on ${s}: ${tail}`;
}
function _countOnRound(tier, rng) {
  const sm = 1 + Math.floor(rng() * 3);
  const big = (sm + 1) + Math.floor(rng() * (20 - sm - sm));   // big in [sm+1, 20-sm]
  const sum = big + sm;
  const flip = tier >= 2 && rng() < 0.5;                        // tier 1 always bigger first
  const [x, y] = flip ? [sm, big] : [big, sm];
  if (tier === 3 && rng() < 0.5) {
    const other = _shuffle([big - 1, big + 1, sum].filter((n) => n !== sm && n !== big && n >= 1), rng)[0];
    return {
      prompt: `Which number do you start with for ${x} + ${y}?`,
      say: `Which number do you start with for ${x} plus ${y}?`,
      choices: _shuffle([String(big), String(sm), String(other)], rng), answer: String(big),
      hint: `Good try! Start with the bigger number. Which is bigger, ${sm} or ${big}?`,
    };
  }
  const r = {
    choices: _nz(_numChoices(sum, rng, 20, [sum + 1, sum - 1]), sum), answer: String(sum),
    hint: _countOnHint(big, sm),
  };
  if (tier === 1) {
    r.prompt = `Start at ${big} and count on ${sm}. What is ${big} + ${sm}?`;
    r.say = `Start at ${big} and count on ${sm}. What is ${big} plus ${sm}?`;
  } else {
    r.prompt = `What is ${x} + ${y}?`;
    r.say = `What is ${x} plus ${y}?`;
  }
  if (tier <= 2) r.visual = { kind: 'counton', start: big, hop: sm };
  return r;
}
function _doublesRound(tier, rng) {
  const n = 1 + Math.floor(rng() * 5), sum = 2 * n;
  if (tier === 3 && rng() < 0.5) {
    const others = _shuffle([1, 2, 3, 4, 5].filter((k) => k !== n), rng).slice(0, 2);
    return {
      prompt: `Which double makes ${sum}?`,
      choices: _shuffle([n, ...others].map((k) => `${k} + ${k}`), rng), answer: `${n} + ${n}`,
      hint: `Good try! A double is the same number twice. Which number, added to itself, makes ${sum}?`,
    };
  }
  const r = {
    prompt: `What is ${n} + ${n}?`, say: `What is ${n} plus ${n}?`,
    choices: _nz(_numChoices(sum, rng, 10, [sum + 1, sum - 1, n]), sum), answer: String(sum),
    hint: `Good try! A double is the same number twice. Count ${n} and ${n} more.`,
  };
  if (tier <= 2) r.visual = { kind: 'doubles', n, style: tier === 1 ? 'flakes' : 'frames' };
  return r;
}
function _elsaNew(tier, rng) {
  return rng() < 0.5 ? _countOnRound(tier, rng) : _doublesRound(tier, rng);
}
const MISSING = [[8, '+', 10], [6, '+', 9], [3, '+', 7, true], [10, '-', 6], [7, '+', 12], [9, '+', 15]];
function _missingRound([a, op, total, first], rng) {
  if (op === '-') {
    const ans = a - total;
    return {
      prompt: `${a} - ? = ${total}. What number is missing?`,
      say: `${a} take away what number makes ${total}?`,
      choices: _numChoices(ans, rng, 20, [a + total]), answer: String(ans),
      hint: `Good try! Start at ${a}. Count back to ${total}. How many did you count?`,
      visual: { a, b: 0, op: '-' },
    };
  }
  const ans = total - a;
  return {
    prompt: first ? `? + ${a} = ${total}. What number is missing?` : `${a} + ? = ${total}. What number is missing?`,
    say: first ? `What number plus ${a} makes ${total}?` : `${a} plus what number makes ${total}?`,
    choices: _numChoices(ans, rng, 20, [a + total]), answer: String(ans),
    hint: `Good try! Start at ${a}. Count up to ${total}. How many did you count?`,
    visual: { a, b: 0, op: '+' },
  };
}
const TENS = [[1, 4], [1, 7], [2, 3], [3, 0], [4, 5]];
function _tensRound([t, o], rng) {
  const ans = t * 10 + o;
  const swapped = o * 10 + t;
  return {
    prompt: `${t} ten${t === 1 ? '' : 's'} and ${o} one${o === 1 ? '' : 's'}. What number is that?`,
    choices: _numChoices(ans, rng, 50, [swapped, t + o]), answer: String(ans),
    hint: o === 0
      ? 'Good try! Each bundle is 10. Count the bundles by tens. There are no loose ones.'
      : `Good try! Each bundle is 10. Count the bundles by tens, then add the ${o} loose one${o === 1 ? '' : 's'}.`,
    visual: { tens: t, ones: o },
  };
}
const MORE = [[23, 32], [41, 14], [19, 21]];
function _moreRound(pair, rng) {
  const [x, y] = _shuffle(pair, rng);
  const ans = Math.max(x, y);
  return {
    prompt: `Which is more: ${x} or ${y}?`,
    choices: [String(x), String(y)], answer: String(ans),
    hint: 'Good try! Look at the tens first. More tens means more.',
  };
}
const ADDENDS = [[2, 3, 5], [4, 4, 2], [6, 1, 3], [5, 5, 7]];
function _addendsRound(parts, rng) {
  const ans = parts.reduce((s, n) => s + n, 0);
  const [a, b, c] = parts;
  return {
    prompt: `${a} + ${b} + ${c} = ?`,
    say: `What is ${a} plus ${b} plus ${c}?`,
    choices: _numChoices(ans, rng, 20, [a + b, b + c]), answer: String(ans),
    hint: `Good try! Add two first: ${a} + ${b}. Then add ${c}.`,
    visual: { parts },
  };
}

function _timeLabel(h, m) { return m === 0 ? `${h} o'clock` : `half past ${h}`; }
function _digital(h, m) { return `${h}:${m === 0 ? '00' : '30'}`; }
const _next = (h) => (h % 12) + 1;
const _prev = (h) => ((h + 10) % 12) + 1;
function _cinderellaRound(h, m, digital) {
  const lab = digital ? _digital : _timeLabel;
  const ans = lab(h, m);
  const opts = m === 0 ? [ans, lab(_next(h), 0), lab(_prev(h), 0)] : [ans, lab(h, 0), lab(_next(h), 30)];
  return {
    prompt: 'What time is the clock showing?',
    choices: opts, answer: ans,
    hint: m === 0
      ? "Good try! The long hand is on the 12. That means o'clock. Where is the short hand?"
      : 'Good try! The long hand is on the 6. That means half past. The short hand just passed which number?',
    clock: { hour: h, minute: m },
  };
}


const _sci = (prompt, choices, hint, pic) => (pic ? { prompt, choices, answer: choices[0], hint, pic } : { prompt, choices, answer: choices[0], hint });
const SCI_T1 = [
  _sci('Which part of the plant drinks water down in the soil?', ['🌱 Roots', '🌸 Petals', '🍃 Leaves'],
    'Good try! This part hides under the ground. What drinks the water?'),
  _sci('Little leaves reach up to catch the warm...', ['☀️ Sunlight', '❄️ Snow', '💨 Wind'],
    'Good try! It is warm and bright and comes from the sky.', '🌿'),
  // More kindergarten plant warm-ups, so a T1 quest has 5 different rounds.
  _sci('A sleepy seed wants to grow. What does it drink?', ['💧 Water', '🧃 Juice', '🥛 Milk'],
    'Good try! It falls from the clouds as rain.'),
  _sci('Which one is a living thing?', ['🌸 A flower', '🪨 A rock', '👟 A shoe'],
    'Good try! Living things grow. Which one grows?'),
  _sci('A seed grows into a...', ['🌱 Plant', '🚗 Car', '☁️ Cloud'],
    'Good try! Seeds go in the soil. What pops up?'),
  _sci('The seed is tucked into soft, brown dirt. What is that called?', ['🟫 Soil', '🍲 Soup', '🏖️ Sand'],
    'Good try! Plants grow in it, and worms live in it too.', '🪴'),
];
const SCI_T2 = [
  _sci('When can we see the sun?', ['☀️ Day', '🌙 Night', '🚫 Never'], 'Good try! The sun is up when it is bright outside.'),
  _sci('When do we usually see stars?', ['🌙 Night', '🥪 Lunch', '🌅 Morning'], 'Good try! Stars twinkle when it is time for bed.'),
  _sci('The sun comes up in the...', ['🌅 Morning', '🌙 Night', '🛏️ Bedtime'], 'Good try! The sun comes up when we wake up.'),
  _sci('Does the moon always look the same?', ['🌗 No, it changes', '🌕 Yes, always round', '⬛ It is square'],
    'Good try! Some nights it is round, some nights it is thin. Does it change?'),
  _sci('Which days are longer?', ['🌞 Summer', '⛄ Winter', '🟰 Same'], 'Good try! The sun stays up late when it is warm outside.'),
];
const SCI_T3 = [
  _sci('What makes sound?', ['🥁 Something shaking', '😴 Something sleeping', '🧊 Something cold'],
    'Good try! Tap a drum. It wiggles and shakes. That makes sound!'),
  _sci('Light helps us...', ['👀 See', '👃 Smell', '👅 Taste'], 'Good try! We use our eyes with light.', '💡'),
  _sci('In a room with no light at all, can you see?', ['🙈 No', '👀 Yes', '🔴 Only red'],
    'Good try! We need light to see. With no light, can we see?'),
  _sci('A baby duck grows up to look like...', ['🦆 A duck', '🐱 A cat', '🐸 A frog'],
    'Good try! Babies grow up to look like their parents.'),
  _sci('Which part helps a plant drink?', ['🌱 Roots', '🌸 Petals', '🌰 Seeds'], 'Good try! This part is under the ground.'),
];

// Measuring rounds (CA 1.MD.1-2): compare flower heights, count petal units.
// Each carries a plain-data `visual` so it survives the review queue.
const FLOWER_COLORS = {
  pink: { emoji: '🌸', name: 'pink' },
  yellow: { emoji: '🌼', name: 'yellow' },
  purple: { emoji: '💜', name: 'purple' },
  blue: { emoji: '💙', name: 'blue' },
};
function _flowerLabel(c) { return `${FLOWER_COLORS[c].emoji} The ${FLOWER_COLORS[c].name} one`; }
// n flowers of clearly different heights (at least 2 units apart), random colors.
function _flowerSet(n, rng) {
  const pool = n === 3 && rng() < 0.4 ? [3, 5, 7] : [2, 4, 6, 8];
  const heights = _shuffle(pool, rng).slice(0, n);
  const colors = _shuffle(Object.keys(FLOWER_COLORS), rng).slice(0, n);
  return { heights, colors };
}
function _measureRound(tier, rng) {
  if (tier === 3) {
    const len = 3 + Math.floor(rng() * 6);
    const other = len > 3 ? [len - 1, len + 1] : [len + 1, len + 2];
    const label = (n) => `🌸 ${n} petals`;
    return {
      prompt: 'How many petals long is the stem?',
      choices: [label(len), ...other.map(label)],
      answer: label(len),
      hint: 'Good try! Count the petals from the bottom to the top.',
      visual: { kind: 'units', length: len },
    };
  }
  if (tier === 1) {
    const { heights, colors } = _flowerSet(2, rng);
    const taller = rng() < 0.5;
    const win = heights[0] > heights[1] === taller ? 0 : 1;
    return {
      prompt: taller ? 'Which flower is taller?' : 'Which flower is shorter?',
      choices: [_flowerLabel(colors[win]), _flowerLabel(colors[1 - win])],
      answer: _flowerLabel(colors[win]),
      hint: taller ? 'Good try! Look at the tops. Which one reaches higher?' : 'Good try! Look at the tops. Which one stops lower?',
      visual: { kind: 'flowers', heights, colors },
    };
  }
  const { heights, colors } = _flowerSet(3, rng);
  const tallest = rng() < 0.5;
  const target = tallest ? Math.max(...heights) : Math.min(...heights);
  const w = heights.indexOf(target);
  return {
    prompt: tallest ? 'Which flower is the tallest?' : 'Which flower is the shortest?',
    choices: [w, ...[0, 1, 2].filter((i) => i !== w)].map((i) => _flowerLabel(colors[i])),
    answer: _flowerLabel(colors[w]),
    hint: tallest ? 'Good try! Look at the tops. Which one reaches the highest?' : 'Good try! Look at the tops. Which one stops the lowest?',
    visual: { kind: 'flowers', heights, colors },
  };
}

// Sorting bins: kid-obvious living / not living pictures (plain JSON; saved in the review queue).
const SORT_ITEMS = [
  ['🐶', 'dog', 1], ['🐱', 'cat', 1], ['🐦', 'bird', 1], ['🐟', 'fish', 1],
  ['🌳', 'tree', 1], ['🌻', 'flower', 1], ['🐸', 'frog', 1], ['🦋', 'butterfly', 1],
  ['🪨', 'rock', 0], ['👟', 'shoe', 0], ['⚽', 'ball', 0], ['🚗', 'car', 0],
  ['🥄', 'spoon', 0], ['🪑', 'chair', 0], ['📚', 'book', 0], ['🧸', 'teddy bear', 0],
].map(([pic, name, living]) => ({ pic, name, living: !!living }));
function _sortRound(tier, rng) {
  const n = tier + 2;
  const nLiving = 1 + Math.floor(rng() * (n - 1));
  const pick = (living, k) => _shuffle(SORT_ITEMS.filter((i) => i.living === living), rng).slice(0, k);
  const items = _shuffle([...pick(true, nLiving), ...pick(false, n - nLiving)], rng).map((i) => ({ ...i }));
  return {
    prompt: 'Is it living or not living?',
    choices: ['🌱 Living', '🪨 Not living'],
    answer: '🌱 Living',
    hint: 'Good try! Does it need water to grow?',
    sort: { items },
  };
}
const _sciOr = (tier, set) => (rng) => {
  const x = rng();
  return x < 0.25 ? _measureRound(tier, rng) : x < 0.45 ? _sortRound(tier, rng) : _pick(set, rng);
};

// ---- Ariel: rhyming and word families (K5). Original rounds; every word is a short, kid-safe CVC word. ----
// A word family is the ending from the first vowel on (-at, -ig ...). Words that share it rhyme.
export const RHYME_FAMILIES = {
  at: ['bat', 'cat', 'hat', 'mat', 'rat', 'sat'],
  an: ['can', 'fan', 'man', 'pan', 'ran', 'van'],
  ap: ['cap', 'lap', 'map', 'nap', 'tap'],
  en: ['den', 'hen', 'men', 'pen', 'ten'],
  et: ['get', 'jet', 'let', 'net', 'pet', 'set', 'wet'],
  ig: ['big', 'dig', 'fig', 'pig', 'wig'],
  in: ['bin', 'fin', 'pin', 'tin', 'win'],
  it: ['bit', 'fit', 'kit', 'sit'],
  og: ['dog', 'fog', 'hog', 'jog', 'log'],
  op: ['hop', 'mop', 'pop', 'top'],
  ot: ['cot', 'dot', 'hot', 'lot', 'not', 'pot'],
  ug: ['bug', 'dug', 'hug', 'jug', 'mug', 'rug', 'tug'],
  un: ['bun', 'fun', 'run', 'sun'],
};
/** Rime: from the first vowel to the end of a CVC word ('cat' -> 'at'). */
export function rimeOf(w) {
  const i = [...w].findIndex((c) => _VOWELS.includes(c));
  return i < 0 ? '' : w.slice(i);
}
// Letters that do NOT make a word when put in front of the ending (hand-checked, no names or rude words).
const FAMILY_FAKE = {
  at: 'jknwzgd', an: 'ghkwzjl', ap: 'fkvw', en: 'fkvzcl', et: 'cfhkzd', ig: 'chkmvn',
  in: 'cghjlrvz', it: 'cdjmvzr', og: 'kvwzr', op: 'fkvwz', ot: 'fkvz', ug: 'cfkswz', un: 'cklmvwz',
};
// Word clues for tier 3: [word, clue, picture or ''] (the clue never says the word).
const FAMILY_CLUES = [
  ['cat', 'a pet that says meow', '🐱'], ['hat', 'something you wear on your head', '🎩'],
  ['bat', 'a small animal that flies at night', '🦇'], ['rat', 'a little animal with a long tail', '🐀'],
  ['mat', 'a small rug by the door', ''], ['van', 'a big car that carries things', '🚐'],
  ['pan', 'you cook eggs in it', ''], ['fan', 'it blows cool air', ''],
  ['cap', 'a soft hat with a peak in front', '🧢'], ['map', 'it shows you the way to go', '🗺️'],
  ['hen', 'a mama chicken', '🐔'], ['pen', 'you write with it', '🖊️'],
  ['ten', 'the number after nine', '🔟'], ['den', 'a cozy home for a bear', ''],
  ['jet', 'a very fast plane', '✈️'], ['net', 'it catches butterflies', ''],
  ['pig', 'a pink farm animal that oinks', '🐷'], ['wig', 'fake hair you can wear', ''],
  ['bin', 'you put trash in it', '🗑️'], ['pin', 'a little thing that holds cloth together', '📌'],
  ['kit', 'a box of things you need for a job', ''],
  ['dog', 'a pet that barks', '🐶'], ['log', 'a big piece of a tree', '🪵'],
  ['mop', 'you clean the floor with it', ''], ['pot', 'you cook soup in it', ''],
  ['dot', 'a tiny round spot', ''],
  ['bug', 'a little crawly insect', '🐛'], ['hug', 'a warm squeeze from someone you love', ''],
  ['jug', 'it holds milk or juice', ''], ['sun', 'it shines in the sky', '☀️'],
];
const _RIME_OF_FAMILY = (w) => Object.keys(RHYME_FAMILIES).find((k) => RHYME_FAMILIES[k].includes(w));
const _ARIEL_PIC = { cat: '🐱', hat: '🎩', bat: '🦇', rat: '🐀', pig: '🐷', van: '🚐', sun: '☀️', bug: '🐛', hen: '🐔', pen: '🖊️', jet: '✈️', dog: '🐶', log: '🪵', map: '🗺️', cap: '🧢', pin: '📌', bin: '🗑️' };

/** A target word, one word that rhymes with it, and distractors; `near` = how many share only the vowel. */
function _rhymeSet(rng, near) {
  const fams = Object.keys(RHYME_FAMILIES);
  const fam = _pick(fams, rng);
  const [target, ans] = _shuffle(RHYME_FAMILIES[fam], rng);
  const sameV = fams.filter((f) => f !== fam && f[0] === fam[0]);
  const diffV = fams.filter((f) => f[0] !== fam[0]);
  const d = [];
  const take = (famList) => { const f = _pick(famList, rng); const w = _pick(RHYME_FAMILIES[f], rng); if (!d.includes(w)) d.push(w); };
  if (near && sameV.length) take(sameV);
  let guard = 0;
  while (d.length < 2 && guard++ < 50) take(diffV);
  return { target, ans, d: d.slice(0, 2) };
}
function _rhymeHint(target) { return `Good try! Say ${target}, then say each word. Which one ends with the same sound?`; }
function _arielRhymePick(rng, near) {
  const { target, ans, d } = _rhymeSet(rng, near);
  const r = {
    kind: 'rhyme', target,
    prompt: `Which word rhymes with ${target}?`,
    show: target,
    choices: [ans, ...d], answer: ans,
    hint: _rhymeHint(target),
  };
  if (_ARIEL_PIC[target]) r.pic = _ARIEL_PIC[target];
  return r;
}
function _arielPair(rng) {
  const fams = _shuffle(Object.keys(RHYME_FAMILIES), rng);
  const [a, b] = _shuffle(RHYME_FAMILIES[fams[0]], rng);
  const pair = (x, y) => `${x} and ${y}`;
  // Wrong pairs: words from two other families (different vowels, so they clearly do not rhyme).
  const others = fams.slice(1).filter((f) => f[0] !== fams[0][0]);
  const w = (f) => _pick(RHYME_FAMILIES[f], rng);
  const p2 = pair(a, w(others[0]));
  const p3 = pair(w(others[1]), w(others[2]));
  return {
    kind: 'pair',
    prompt: 'Which pair of words rhymes?',
    choices: [pair(a, b), p2, p3], answer: pair(a, b),
    hint: 'Good try! Say each pair out loud. Which pair ends with the same sound?',
  };
}
function _arielOdd(rng) {
  const fams = Object.keys(RHYME_FAMILIES);
  const fam = _pick(fams.filter((f) => RHYME_FAMILIES[f].length >= 3), rng);
  const [target, x, y] = _shuffle(RHYME_FAMILIES[fam], rng);
  const odd = _pick(_shuffle(fams.filter((f) => f !== fam && f[0] !== fam[0]), rng).map((f) => _pick(RHYME_FAMILIES[f], rng)), rng);
  const r = {
    kind: 'odd', target,
    prompt: `Which word does not rhyme with ${target}?`,
    show: target,
    choices: [x, y, odd], answer: odd,
    hint: `Good try! Say ${target}, then say each word. Which one sounds different at the end?`,
  };
  if (_ARIEL_PIC[target]) r.pic = _ARIEL_PIC[target];
  return r;
}
function _arielFamily(rng) {
  const [w, clue, pic] = _pick(FAMILY_CLUES, rng);
  const fam = _RIME_OF_FAMILY(w);
  const letter = w[0];
  const wrong = _shuffle([...FAMILY_FAKE[fam]], rng).slice(0, 2);
  const r = {
    kind: 'family', family: fam, word: w,
    prompt: `Add a letter to make a new word. ${clue[0].toUpperCase()}${clue.slice(1)}.`,
    say: `Add a letter in front of ${fam}, to make a new word. ${clue[0].toUpperCase()}${clue.slice(1)}.`,
    show: `_ ${[...fam].join(' ')}`,
    noChoiceSay: true, // single letters are not read aloud as a list
    choices: [letter, ...wrong], answer: letter,
    answerSay: `${letter}, as in ${w}`,
    hint: `Good try! Put each letter in front of ${fam} and say it. Which one makes a real word that fits the clue?`,
    hintSay: `Good try! The word is ${w}. Say it slowly and listen to the first sound. Which letter says it?`,
  };
  if (pic) r.pic = pic;
  return r;
}

// ---- Moana: shapes (K7). Flat shapes by sides and corners, solid shapes by flat faces and real things. ----
// Defining attributes only: the picture's color, size and turn change on purpose, the answer never depends on them.
// Facts (flat shapes: sides = corners; a circle has neither; "flat faces" for solids).
export const SHAPE_FACTS = {
  circle: { sides: 0, corners: 0 }, triangle: { sides: 3, corners: 3 }, square: { sides: 4, corners: 4 },
  rectangle: { sides: 4, corners: 4 }, pentagon: { sides: 5, corners: 5 }, hexagon: { sides: 6, corners: 6 },
  cube: { faces: 6, corners: 8 }, sphere: { faces: 0, corners: 0 }, cone: { faces: 1 }, cylinder: { faces: 2 },
};
export const SHAPE_PALETTE = ['#f472b6', '#38bdf8', '#fbbf24', '#34d399', '#a78bfa', '#fb923c'];
const _FLAT_T1 = ['circle', 'triangle', 'square', 'rectangle', 'hexagon'];
const _FLAT_ALL = ['circle', 'triangle', 'square', 'rectangle', 'pentagon', 'hexagon'];
const _POLY = ['triangle', 'square', 'rectangle', 'pentagon', 'hexagon'];
const _SOLIDS = ['cube', 'sphere', 'cone', 'cylinder'];
/** A picture description for the shape drawer (js/shapes.js): random color, size and turn. */
function _shapeVisual(shape, rng) {
  const solid = _SOLIDS.includes(shape);
  const v = { kind: 'shape', shape, color: _pick(SHAPE_PALETTE, rng), scale: Math.round((0.78 + rng() * 0.22) * 100) / 100, rot: 0, variant: 0 };
  if (solid || shape === 'circle') return v;
  v.rot = _pick([0, 0, 20, 35, 45, 60, 90, 120, 160, 200, 250, 300], rng);
  if (shape === 'triangle') v.variant = Math.floor(rng() * 3);
  if (shape === 'rectangle') v.variant = Math.floor(rng() * 2);
  return v;
}
// Square and rectangle are never offered together: a square is also a rectangle, so a choice list with both could be unfair.
function _shapeNames(answer, pool, rng) {
  const twin = answer === 'square' ? 'rectangle' : answer === 'rectangle' ? 'square' : null;
  for (let k = 0; k < 50; k++) {
    const d = _shuffle(pool.filter((x) => x !== answer && x !== twin), rng).slice(0, 2);
    if (!(d.includes('square') && d.includes('rectangle'))) return [answer, ...d];
  }
  return [answer, ..._shuffle(pool.filter((x) => x !== answer && x !== 'square' && x !== 'rectangle'), rng).slice(0, 2)];
}
function _moanaName(rng, pool) {
  const answer = _pick(pool, rng);
  const solid = _SOLIDS.includes(answer);
  return {
    kind: 'name', prompt: 'Which shape is this?', visual: _shapeVisual(answer, rng),
    choices: _shapeNames(answer, pool, rng), answer,
    hint: solid ? 'Good try! Look at the shape all over. Does it roll, or does it have flat parts?'
      : 'Good try! Look at the sides and the corners. Count them one at a time.',
  };
}
const _shapeNumChoices = (n, lo, hi, rng) => {
  const all = []; for (let i = lo; i <= hi; i++) if (i !== n) all.push(i);
  return [String(n), ..._shuffle(all, rng).slice(0, 2).map(String)];
};
function _moanaCount(rng) {
  const shape = _pick(_POLY, rng), attr = _pick(['sides', 'corners'], rng), n = SHAPE_FACTS[shape][attr];
  return {
    kind: 'count', prompt: `How many ${attr} does a ${shape} have?`, visual: _shapeVisual(shape, rng),
    choices: _shapeNumChoices(n, 3, 7, rng), answer: String(n),
    hint: attr === 'sides' ? 'Good try! Touch each side with your finger and count them.'
      : 'Good try! A corner is where two sides meet. Touch each corner and count.',
  };
}
function _moanaNoCorners(rng) {
  const d = _shapeNames('circle', ['circle', ..._POLY], rng).slice(1);
  return {
    kind: 'nocorners', prompt: 'Which shape has no corners?', choices: ['circle', ...d], answer: 'circle',
    hint: 'Good try! A corner is where two sides meet. Look for a shape with no corners at all.',
  };
}
function _moanaWhichCount(rng) {
  const attr = _pick(['sides', 'corners'], rng), n = _pick([3, 4, 5, 6], rng);
  // one shape per count, so exactly one choice is right (square or rectangle for 4, never both)
  const rep = { 3: 'triangle', 4: _pick(['square', 'rectangle'], rng), 5: 'pentagon', 6: 'hexagon' };
  const others = _shuffle([3, 4, 5, 6].filter((x) => x !== n).map((x) => rep[x]).concat('circle'), rng).slice(0, 2);
  return {
    kind: 'whichcount', prompt: `Which shape has ${n} ${attr}?`, choices: [rep[n], ...others], answer: rep[n],
    hint: `Good try! Count the ${attr} of each shape, one shape at a time.`,
  };
}
const _OBJECTS = [
  { prompt: 'What shape is a ball?', shape: 'sphere', pic: '⚽' },
  { prompt: 'What shape is a dice?', shape: 'cube', pic: '🎲' },
  { prompt: 'What shape is a can of soup?', shape: 'cylinder', pic: '🥫' },
  { prompt: 'What shape is a drum?', shape: 'cylinder', pic: '🥁' },
  { prompt: 'What shape is a pointy party hat?', shape: 'cone', pic: '' },
];
function _moanaObject(rng) {
  const o = _pick(_OBJECTS, rng);
  const r = {
    kind: 'object', prompt: o.prompt, choices: _shapeNames(o.shape, _SOLIDS, rng), answer: o.shape,
    hint: 'Good try! Think about the whole object. Is it round, flat, or pointy?',
  };
  if (o.pic) r.pic = o.pic;
  return r;
}
function _moanaFaces(rng) {
  if (rng() < 0.2) {
    return {
      kind: 'cubecorners', prompt: 'How many corners does a cube have?', visual: _shapeVisual('cube', rng),
      choices: ['8', '6', '12'].map(String), answer: '8',
      hint: 'Good try! A cube has corners on the top and on the bottom. Count them all.',
    };
  }
  const shape = _pick(_SOLIDS, rng), n = SHAPE_FACTS[shape].faces;
  const pool = [0, 1, 2, 3, 4, 5, 6, 8].filter((x) => x !== n);
  return {
    kind: 'faces', prompt: `How many flat faces does a ${shape} have?`, visual: _shapeVisual(shape, rng),
    choices: [String(n), ..._shuffle(pool, rng).slice(0, 2).map(String)], answer: String(n),
    hint: 'Good try! A flat face is a flat part you can touch with your whole hand. Count them all, even the ones you cannot see.',
  };
}
function _moanaWhichFaces(rng) {
  const shape = _pick(_SOLIDS, rng), n = SHAPE_FACTS[shape].faces;
  const what = n === 0 ? 'no flat faces' : n === 1 ? 'one flat face' : `${n} flat faces`;
  return {
    kind: 'whichfaces', prompt: `Which shape has ${what}?`, choices: _shapeNames(shape, _SOLIDS, rng), answer: shape,
    hint: 'Good try! Picture each shape and count its flat faces, one shape at a time.',
  };
}
function _moanaRoll(rng) {
  const d = _shuffle(['a book', 'a shoebox', 'a toy brick'], rng).slice(0, 2);
  return {
    kind: 'roll', prompt: 'Which one can roll?', choices: ['a ball', ...d], answer: 'a ball',
    hint: 'Good try! Picture pushing each one across the floor. Which one would keep going?',
  };
}
function _moanaT1(rng) { return _moanaName(rng, rng() < 0.65 ? _FLAT_T1 : _SOLIDS); }
function _moanaT2(rng) {
  const x = rng();
  if (x < 0.35) return _moanaCount(rng);
  if (x < 0.5) return _moanaNoCorners(rng);
  if (x < 0.8) return _moanaWhichCount(rng);
  return _moanaName(rng, rng() < 0.5 ? _FLAT_ALL : _SOLIDS);
}
function _moanaT3(rng) {
  const x = rng();
  if (x < 0.3) return _moanaObject(rng);
  if (x < 0.55) return _moanaFaces(rng);
  if (x < 0.8) return _moanaWhichFaces(rng);
  return _moanaRoll(rng);
}

// ---- Jasmine: story order (K9). Tiny 3-step stories shown as picture cards; first / next / middle / last. ----
// Every sequence is an everyday order a 6-year-old knows (growing, hatching, routines). `t` is the short label (choice text and card caption),
// `e` the card picture, `sent` the story told in three short sentences (the sentences use the same step words as the labels).
// `world` keeps "what happens next" fair: its two wrong choices come from the OTHER world, so none of them could also come next.
// `noD` marks a sequence whose steps are never used as wrong choices (they could look like they fit another story).
export const STORY_SEQUENCES = [
  { id: 'grow',     world: 'nature', steps: [['🌱', 'tiny sprout'], ['🌿', 'bigger plant'], ['🌻', 'tall flower']],
    sent: ['Nia saw a tiny sprout.', 'Then it was a bigger plant.', 'Last, it was a tall flower.'] },
  { id: 'chick',    world: 'nature', steps: [['🥚', 'egg'], ['🐥', 'baby chick'], ['🐔', 'big hen']],
    sent: ['Pip was an egg.', 'Then Pip was a baby chick.', 'Last, Pip was a big hen.'] },
  { id: 'butterfly', world: 'nature', steps: [['🥚', 'tiny egg'], ['🐛', 'caterpillar'], ['🦋', 'butterfly']],
    sent: ['A tiny egg sat on a leaf.', 'Then a caterpillar came out.', 'Last, it was a butterfly.'] },
  { id: 'snowman',  world: 'nature', steps: [['❄️', 'snow falls'], ['⚪', 'roll a snowball'], ['⛄', 'make a snowman']],
    sent: ['Snow fell all day.', 'Then Sam rolled a snowball.', 'Last, Sam made a snowman.'] },
  { id: 'rain',     world: 'nature', steps: [['☁️', 'clouds come'], ['🌧️', 'it rains'], ['🌈', 'a rainbow']],
    sent: ['Clouds came.', 'Then it rained.', 'Last, a rainbow showed up.'] },
  { id: 'day',      world: 'nature', noD: true, steps: [['🌅', 'sun comes up'], ['☀️', 'sun is high'], ['🌙', 'moon comes out']],
    sent: ['The sun came up.', 'Then the sun was high.', 'Last, the moon came out.'] },
  { id: 'growup',   world: 'nature', steps: [['👶', 'baby'], ['🧒', 'kid'], ['🧑', 'grown-up']],
    sent: ['Ben was a baby.', 'Then Ben was a kid.', 'Last, Ben was a grown-up.'] },
  { id: 'acorn',    world: 'nature', steps: [['🌰', 'acorn'], ['🌱', 'little sprout'], ['🌳', 'big tree']],
    sent: ['An acorn fell down.', 'Then a little sprout grew.', 'Last, there was a big tree.'] },
  { id: 'dig',      world: 'nature', steps: [['⛏️', 'dig a hole'], ['🌱', 'plant the seed'], ['💧', 'water the seed']],
    sent: ['Zoey dug a hole.', 'Then she planted the seed.', 'Last, she watered the seed.'] },
  { id: 'morning',  world: 'life', steps: [['⏰', 'wake up'], ['🥣', 'eat breakfast'], ['🚌', 'go to school']],
    sent: ['Leo woke up.', 'Then he ate breakfast.', 'Last, he went to school.'] },
  { id: 'cake',     world: 'life', steps: [['🥣', 'mix the batter'], ['🔥', 'bake the cake'], ['🍰', 'eat the cake']],
    sent: ['Mom mixed the batter.', 'Then she baked the cake.', 'Last, they ate the cake.'] },
  { id: 'dish',     world: 'life', steps: [['🍽️', 'dirty dish'], ['🧽', 'scrub the dish'], ['✨', 'clean dish']],
    sent: ['The dish was dirty.', 'Then Dad scrubbed the dish.', 'Last, the dish was clean.'] },
  { id: 'sandwich', world: 'life', steps: [['🍞', 'get the bread'], ['🧀', 'add the cheese'], ['🥪', 'eat the sandwich']],
    sent: ['Leo got the bread.', 'Then he added the cheese.', 'Last, he ate the sandwich.'] },
  { id: 'socks',    world: 'life', steps: [['🧦', 'put on socks'], ['👟', 'put on shoes'], ['🏃', 'run and play']],
    sent: ['Mia put on her socks.', 'Then she put on her shoes.', 'Last, she ran and played.'] },
  { id: 'paint',    world: 'life', steps: [['🎨', 'get the paints'], ['🖌️', 'paint a picture'], ['🖼️', 'hang it up']],
    sent: ['Nia got the paints.', 'Then she painted a picture.', 'Last, she hung it up.'] },
  { id: 'letter',   world: 'life', steps: [['✏️', 'write a note'], ['✉️', 'mail the note'], ['📬', 'friend gets it']],
    sent: ['Sam wrote a note.', 'Then Sam mailed the note.', 'Last, his friend got it.'] },
  { id: 'night',    world: 'life', noD: true, steps: [['🌙', 'night comes'], ['🛏️', 'get in bed'], ['😴', 'fall asleep']],
    sent: ['Night came.', 'Then Ben got in bed.', 'Last, Ben fell asleep.'] },
  { id: 'trip',     world: 'life', steps: [['🧳', 'pack a bag'], ['🚗', 'ride in the car'], ['🏖️', 'play at the beach']],
    sent: ['Zoey packed a bag.', 'Then they rode in the car.', 'Last, they played at the beach.'] },
  { id: 'shop',     world: 'life', steps: [['🛒', 'shop for food'], ['🍳', 'cook the food'], ['🍽️', 'eat dinner']],
    sent: ['Dad shopped for food.', 'Then he cooked the food.', 'Last, they ate dinner.'] },
  { id: 'school',   world: 'life', steps: [['🏫', 'sit in class'], ['📚', 'learn and read'], ['🏠', 'go home']],
    sent: ['Mia sat in class.', 'Then she learned and read.', 'Last, she went home.'] },
  { id: 'gift',     world: 'life', steps: [['🎁', 'a wrapped gift'], ['🎀', 'pull the ribbon'], ['🧸', 'play with the toy']],
    sent: ['Leo had a wrapped gift.', 'Then he pulled the ribbon.', 'Last, he played with the toy.'] },
].map((q) => ({ ...q, steps: q.steps.map(([e, t]) => ({ e, t })) }));
// Short words for the "which is the right order" choices (so "first sprout, then plant, last flower" fits a phone button).
const _STORY_KEYS = [['sprout', 'plant', 'flower'], ['egg', 'chick', 'hen'], ['egg', 'caterpillar', 'butterfly'], ['snow', 'snowball', 'snowman'], ['clouds', 'rain', 'rainbow'],
  ['sunrise', 'high sun', 'moon'], ['baby', 'kid', 'grown-up'], ['acorn', 'sprout', 'tree'], ['dig', 'plant', 'water'], ['wake up', 'breakfast', 'school'],
  ['mix', 'bake', 'eat'], ['dirty', 'scrub', 'clean'], ['bread', 'cheese', 'sandwich'], ['socks', 'shoes', 'play'], ['get paints', 'paint', 'hang up'],
  ['write', 'mail', 'read'], ['night', 'bed', 'sleep'], ['pack', 'car', 'beach'], ['shop', 'cook', 'eat'], ['class', 'read', 'home'], ['gift', 'ribbon', 'toy']];
STORY_SEQUENCES.forEach((q, i) => q.steps.forEach((s, k) => { s.k = _STORY_KEYS[i][k]; }));

const _STORY_HINT = {
  first: 'Good try! Think about how this story begins, before anything else happens.',
  last: 'Good try! Think about how this story ends, after everything else has happened.',
  middle: 'Good try! The middle happens after the first part and before the last part.',
  next: 'Good try! Look at the pictures you can see. What would happen right after them?',
  order: 'Good try! Tell the story in your head. Which order makes sense?',
  tellfirst: 'Good try! Listen to the story again. What happened before everything else?',
  telllast: 'Good try! Listen to the story again. What happened after everything else?',
};
const _cards = (steps, extra) => ({ kind: 'story', cards: steps.map((s) => ({ e: s.e, t: s.t })), ...(extra || {}) });
// A shuffled order of the three cards that is not the true order (a row already in order would give the answer away).
function _storyShuffle(steps, rng) {
  for (let k = 0; k < 30; k++) {
    const a = _shuffle(steps, rng);
    if (a.some((s, i) => s !== steps[i])) return a;
  }
  return [steps[1], steps[2], steps[0]];
}
function _storyPick(rng) { return _pick(STORY_SEQUENCES, rng); }
function _storyAsk(rng, which) {
  const q = _storyPick(rng), st = q.steps;
  const idx = { first: 0, middle: 1, last: 2 }[which];
  return {
    kind: which, prompt: which === 'first' ? 'What comes first?' : which === 'last' ? 'What happens last?' : 'What comes in the middle?',
    visual: _cards(_storyShuffle(st, rng)), choices: st.map((s) => s.t), answer: st[idx].t, hint: _STORY_HINT[which],
  };
}
function _storyNext(rng) {
  const q = _storyPick(rng), st = q.steps;
  const pool = STORY_SEQUENCES.filter((o) => o.world !== q.world && !o.noD && o.id !== q.id);
  const wrong = [];
  for (const o of _shuffle(pool, rng)) { if (wrong.length < 2) wrong.push(_pick(o.steps, rng).t); }
  return {
    kind: 'next', prompt: 'What happens next?', visual: _cards([st[0], st[1]], { more: true }),
    choices: [st[2].t, ...wrong], answer: st[2].t, hint: _STORY_HINT.next,
  };
}
function _storyOrder(rng) {
  const q = _storyPick(rng), st = q.steps;
  const say = (a) => `first ${a[0].k}, then ${a[1].k}, last ${a[2].k}`;
  const perms = [[0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map((p) => p.map((i) => st[i]));
  const wrong = _shuffle(perms, rng).slice(0, 2).map(say);
  return {
    kind: 'order', prompt: 'Which is the right order?', visual: _cards(_storyShuffle(st, rng)),
    choices: [say(st), ...wrong], answer: say(st), hint: _STORY_HINT.order,
  };
}
function _storyTell(rng) {
  const q = _storyPick(rng), st = q.steps;
  const last = rng() < 0.5;
  return {
    kind: last ? 'telllast' : 'tellfirst', prompt: `${q.sent.join(' ')} What happened ${last ? 'last' : 'first'}?`,
    choices: st.map((s) => s.t), answer: st[last ? 2 : 0].t, hint: last ? _STORY_HINT.telllast : _STORY_HINT.tellfirst,
  };
}
function _jasmineT1(rng) { return _storyAsk(rng, 'first'); }
function _jasmineT2(rng) {
  const x = rng();
  if (x < 0.3) return _storyAsk(rng, 'last');
  if (x < 0.6) return _storyAsk(rng, 'middle');
  return _storyNext(rng);
}
function _jasmineT3(rng) { return rng() < 0.5 ? _storyOrder(rng) : _storyTell(rng); }

// ---- Anna: capital letters and end marks (K11). Short sentences a first grader can read; every mark is clear-cut. ----
// Each entry is [sentence written the right way, its end mark]. Telling sentences are plain facts (no "wow"), questions start with a question
// word or can/is/do, and excited sentences have an excited word or an urgent command, so a period and an exclamation mark are never both fine.
// Names are Zoe, Sam, Max, Mia and Ben only. `I` is the pronoun. All words are common sight words or short decodable words.
export const SIGN_SENTENCES = [
  // telling sentences (period)
  ['The cat sat.', '.'], ['The sun is hot.', '.'], ['The dog is wet.', '.'], ['The ship is big.', '.'], ['A hen sat on a nest.', '.'],
  ['We sit in the van.', '.'], ['Zoe has a red hat.', '.'], ['Sam can hop.', '.'], ['Max got a pen.', '.'], ['Mia has a big cup.', '.'],
  ['Ben sat on the rug.', '.'], ['I can see a ship.', '.'], ['I like to run.', '.'], ['I see a red boat.', '.'], ['We met Sam on the dock.', '.'],
  ['My dog can dig.', '.'], ['She has a pet fish.', '.'], ['He has a tan cap.', '.'], ['This is my bag.', '.'], ['The boat is on the bay.', '.'],
  ['Mia and Ben sit.', '.'], ['We can run and jump.', '.'], ['Max has ten red pins.', '.'], ['The pig is in the mud.', '.'],
  // questions (question mark)
  ['Can you help me?', '?'], ['Is the sun hot?', '?'], ['Where is the cat?', '?'], ['Who has the hat?', '?'], ['What is in the box?', '?'],
  ['Do you like jam?', '?'], ['Can we go?', '?'], ['Is it a fish?', '?'], ['Where is my cup?', '?'], ['Can Zoe hop?', '?'],
  ['Is Max in the van?', '?'], ['Where did Mia go?', '?'], ['Can I have a hug?', '?'], ['Who is on the ship?', '?'], ['What can Ben see?', '?'],
  ['Do you see the dock?', '?'], ['Is the pig in the mud?', '?'],
  // excited sentences (exclamation mark)
  ['Look out!', '!'], ['Watch out!', '!'], ['Stop, stop!', '!'], ['Help, help!', '!'], ['Yay, we won!', '!'], ['Wow, a big ship!', '!'],
  ['Oh no, a bug!', '!'], ['Yay, we did it!', '!'], ['Wow, look at that!', '!'], ['Ouch, my toe!', '!'], ['Oh no, I fell!', '!'], ['Hooray, we can go!', '!'],
];
const _SIGN_NAMES = ['Zoe', 'Sam', 'Max', 'Mia', 'Ben'];
const _MARK_LABEL = { '.': '. period', '?': '? question mark', '!': '! exclamation mark' };
const _MARK_SAY = { '.': 'period', '?': 'question mark', '!': 'exclamation mark' };
const _SIGN_HINT = {
  mark: 'Good try! Is the sentence telling, asking, or shouting? Listen to how it sounds.',
  word: 'Good try! Capital letters go on the first word, on names, and on the word that means just me.',
  sentence: 'Good try! Check the first letter, then check the mark at the end.',
};
// Words that need a capital letter when the sentence is written all lowercase: the first word, a name, and the word I.
const _signWords = (text) => text.split(' ');
const _bare = (w) => w.replace(/[.,?!]/g, '');
const _needsCap = (w, i) => i === 0 || _SIGN_NAMES.map((n) => n.toLowerCase()).includes(_bare(w).toLowerCase()) || _bare(w).toLowerCase() === 'i';
const _sentenceVisual = (text) => ({ kind: 'sentence', text });
function _annaT1(rng) {
  const mark = _pick(['.', '?', '!'], rng);
  const [text] = _pick(SIGN_SENTENCES.filter((x) => x[1] === mark), rng);
  return {
    kind: 'mark', prompt: 'Which mark ends this sentence?', say: `Listen. ${text} Which mark ends this sentence?`, visual: _sentenceVisual(text),
    choices: ['.', '?', '!'].map((m) => _MARK_LABEL[m]), choiceSay: Object.fromEntries(Object.values(_MARK_LABEL).map((l) => [l, l.split(' ').slice(1).join(' ')])),
    answer: _MARK_LABEL[mark], answerSay: _MARK_SAY[mark], hint: _SIGN_HINT.mark,
  };
}
// Words the T2 hint uses: a round never asks for one of them, so the hint can't hand over the answer.
const _HINT2_WORDS = new Set(_SIGN_HINT.word.toLowerCase().replace(/[.,?!]/g, '').split(/\s+/));
// Sentences that work for "which word needs a capital?": written lowercase, exactly one word needs it. If a name or I comes after the first
// word, the first word is shown with its capital already (so only the name / I is left to fix).
const _T2_FORMS = SIGN_SENTENCES.map(([text]) => {
  const ws = _signWords(text);
  const need = ws.map((w, i) => i).filter((i) => _needsCap(ws[i], i));
  let shown, ans;
  if (need.length === 1) { shown = ws.map((w) => w.toLowerCase()); ans = need[0]; }
  else if (need.length === 2 && !(_SIGN_NAMES.includes(_bare(ws[0])) || _bare(ws[0]) === 'I')) { shown = ws.map((w, i) => (i === 0 ? w : w.toLowerCase())); ans = need[1]; }
  else return null;
  const answer = _bare(shown[ans]);
  const others = [...new Set(shown.map(_bare).filter((w, i) => !need.includes(i) && w.length > 1 && w !== answer && w !== 'is'))];   // no "is" as a choice: it reads as "... or is?"
  if (others.length < 2 || _HINT2_WORDS.has(answer.toLowerCase()) || answer === 'is') return null;   // "is" would be read as "The answer is is."
  return { text: shown.join(' '), answer, others };
}).filter(Boolean);
function _annaT2(rng) {
  const f = _pick(_T2_FORMS, rng);
  return {
    kind: 'word', prompt: 'Which word needs a capital letter?', say: `Listen. ${f.text} Which word needs a capital letter?`, visual: _sentenceVisual(f.text),
    choices: _shuffle([f.answer, ..._sample(f.others, 2, rng)], rng), answer: f.answer, hint: _SIGN_HINT.word,
  };
}
// Three versions of one sentence: the right one, one with a lowercase letter where a capital belongs, one with the wrong or missing end mark.
// A telling sentence never gets "!" and a question never gets "!" as the wrong mark ("The sun is hot!" could pass), so the wrong marks are clear-cut.
function _annaT3(rng) {
  const [text, mark] = _pick(SIGN_SENTENCES, rng);
  const ws = _signWords(text);
  const capIdx = ws.map((w, i) => i).filter((i) => _needsCap(ws[i], i));
  const j = _pick(capIdx, rng);
  const low = ws.map((w, i) => (i === j ? w[0].toLowerCase() + w.slice(1) : w)).join(' ');
  const body = text.slice(0, -1);
  const wrongMarks = mark === '.' ? ['?', ''] : mark === '?' ? ['.', ''] : ['?', ''];
  const badMark = body + _pick(wrongMarks, rng);
  const word = _MARK_SAY[mark];
  return {
    kind: 'sentence', prompt: 'Which sentence is written the right way?', say: 'Which sentence is written the right way? Look at the first letter and the end mark.', noChoiceSay: true,
    choices: _shuffle([text, low, badMark], rng), answer: text, answerSay: `${body}, with a capital letter and a ${word}`, hint: _SIGN_HINT.sentence,
  };
}

// ---- Tiana: tally marks (K13). A tally is four upright lines and a slash across them (a group of five), then single lines. ----
// Pictures come from tally.js (one <line> per mark). Rounds carry plain data: { kind: 'tally', n } or { kind: 'tallychart', rows }.
const _NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five'];
// Hints use no number words at all, so a hint can never hand over the answer.
const _TALLY_HINT = {
  count: 'Good try! Touch each line and count them in order.',
  group: 'Good try! Count the slashed groups first, then add the single lines.',
  fives: 'Good try! Each slashed group counts the same. Count group after group.',
  most: 'Good try! Count the marks in each row. The longest row has the most.',
  howmany: 'Good try! Count the groups in that row, then the single lines.',
  diff: 'Good try! Count each row. Then see how many extra the longer row has.',
};
export const TALLY_VEGGIES = [['🥕', 'carrots'], ['🍅', 'tomatoes'], ['🌽', 'corn'], ['🥦', 'broccoli'], ['🥔', 'potatoes']];
// Number choices: the answer plus two near numbers, all positive and different. `offsets` lists the nearby numbers to draw from.
function _tallyChoices(answer, offsets, rng, extra = []) {
  const near = [...new Set([...offsets.map((o) => answer + o), ...extra])].filter((x) => x > 0 && x !== answer);
  const picks = _sample(near, 2, rng);
  return { choices: _shuffle([answer, ...picks].map(String), rng), choiceSay: Object.fromEntries([answer, ...picks].map((x) => [String(x), _NUM_WORDS[x]])) };
}
function _tallyNumRound(n, kind, prompt, say, offsets, rng) {
  const c = _tallyChoices(n, offsets, rng);
  return { kind, prompt, say, visual: { kind: 'tally', n }, ...c, answer: String(n), answerSay: _NUM_WORDS[n], hint: _TALLY_HINT[kind] };
}
function _tianaT1(rng) {
  const n = 1 + Math.floor(rng() * 10);
  return _tallyNumRound(n, 'count', 'How many tally marks?', 'Count the tally marks. How many are there?', n >= 5 ? [-1, 1, -2, 2] : [-1, 1, 2, 3], rng);
}
function _tianaT2(rng) {
  if (rng() < 0.3) {   // only full groups: count by fives
    const n = 5 * (1 + Math.floor(rng() * 4));
    return _tallyNumRound(n, 'fives', 'Count by fives. How many tally marks?', 'Count by fives. How many tally marks are there?', [-5, 5, -1, 1], rng);
  }
  const n = 6 + Math.floor(rng() * 15);   // 6-20
  return _tallyNumRound(n, 'group', 'How many tally marks in all?', 'Count the tally marks. How many are there in all?', [-5, 5, -1, 1], rng);
}
function _tallyChart(rng, rows, distinct) {
  for (;;) {
    const veg = _sample(TALLY_VEGGIES, rows, rng);
    const counts = veg.map(() => 1 + Math.floor(rng() * 10));
    if (distinct && new Set(counts).size !== counts.length) continue;
    return { kind: 'tallychart', title: 'Vegetable stand', rows: veg.map(([e, name], i) => ({ e, name, n: counts[i] })) };
  }
}
function _tianaT3(rng) {
  const x = rng();
  if (x < 0.34) {   // which has the most (no ties)
    const v = _tallyChart(rng, 3, true), top = v.rows.reduce((a, b) => (b.n > a.n ? b : a));
    const label = (r) => `${r.e} ${r.name}`;
    return { kind: 'most', prompt: 'Which has the most?', say: 'Look at the tally chart. Which has the most?', visual: v, choices: _shuffle(v.rows.map(label), rng), answer: label(top), hint: _TALLY_HINT.most };
  }
  if (x < 0.67) {   // how many in one row
    const v = _tallyChart(rng, rng() < 0.5 ? 2 : 3, false), r = _pick(v.rows, rng);
    return { kind: 'howmany', prompt: `How many ${r.name}?`, say: `Look at the tally chart. How many ${r.name} are there?`, visual: v,
      ..._tallyChoices(r.n, [-1, 1, -5, 5, 2, -2], rng), answer: String(r.n), answerSay: _NUM_WORDS[r.n], hint: _TALLY_HINT.howmany };
  }
  // how many more: the longer row has 1-9 more
  let v, hi, lo;
  for (;;) { v = _tallyChart(rng, rng() < 0.5 ? 2 : 3, true); const s = [...v.rows].sort((a, b) => b.n - a.n); hi = s[0]; lo = s[s.length - 1]; if (hi.n - lo.n <= 9) break; }
  const d = hi.n - lo.n;
  return { kind: 'diff', prompt: `How many more ${hi.name} than ${lo.name}?`, say: `Look at the tally chart. How many more ${hi.name} than ${lo.name}?`, visual: v,
    ..._tallyChoices(d, [-1, 1, 2], rng, [hi.n, lo.n].filter((x) => x !== d)), answer: String(d), answerSay: _NUM_WORDS[d], hint: _TALLY_HINT.diff };
}

// Aurora: short, unambiguous first-grade naming and action words.
export const WORD_GARDEN_NAMES = ['kitten', 'rabbit', 'apple', 'baby', 'pencil', 'carrot', 'spider', 'tiger', 'turtle', 'puppy', 'monkey', 'banana'];
// A short subject makes the action reading clear even when a verb also has a noun meaning.
export const WORD_GARDEN_ACTIONS = ['I hop', 'I sit', 'I dig', 'I jog', 'I nod', 'I swim', 'I jump', 'I skip', 'I clap', 'I sing', 'I wave', 'I grin'];
function _auroraPick(rng, naming) {
  const answer = _pick(naming ? WORD_GARDEN_NAMES : WORD_GARDEN_ACTIONS, rng);
  const others = _sample(naming ? WORD_GARDEN_ACTIONS : WORD_GARDEN_NAMES, 2, rng);
  return { kind: naming ? 'naming' : 'action', prompt: naming ? 'Which word names a thing?' : 'Which shows an action?',
    say: naming ? 'Which word names a thing?' : 'Which shows an action?',
    choices: _shuffle([answer, ...others], rng), answer,
    hint: naming ? 'A naming word names a person, animal, place, or thing.' : 'An action word tells what someone or something does.' };
}
function _auroraSort(rng) {
  const items = _shuffle([..._sample(WORD_GARDEN_NAMES, 2, rng).map(name => ({ name, naming: true })), ..._sample(WORD_GARDEN_ACTIONS, 2, rng).map(name => ({ name, naming: false }))], rng);
  return { kind: 'wordsort', prompt: 'Sort names and actions.', say: 'Sort the naming words and actions.',
    choices: ['Naming', 'Action'], answer: 'Naming', hint: 'A naming word names a thing. An action word tells what it does.', sort: { kind: 'words', items } };
}

// One round generator per tier, per land.
const TIERS = {
  belle: {
    1: (rng) => {
      const easy = [...DOLCH_PREPRIMER, ...DOLCH_PRIMER];
      return rng() < 0.5 ? _cvcRound(_pick(CVC_SETS, rng)) : _sightRound(_pick(easy, rng), easy, rng);
    },
    2: (rng) => {
      if (rng() < 0.5) { const dg = _pick(DIGRAPH_SETS, rng); return _wordRound(dg[0], dg.slice(1)); }
      // The week's sight words are always in the pool, with the class list or built-in list.
      const sight = [...new Set([...WEEK.sight, ...(SCHOOL_WORDS.length >= 3 ? SCHOOL_WORDS : SIGHT_1ST)])];
      // Half of these rounds practice this week's sight words, so they come up often.
      const w = WEEK.sight.length && rng() < 0.5 ? _pick(WEEK.sight, rng) : _pick(sight, rng);
      return _sightRound(w, [...new Set([...sight, ...DOLCH_1ST])], rng);
    },
    3: (rng) => {
      if (rng() < 0.5) { const bl = _pick(BLEND_SETS, rng); return _wordRound(bl[0], bl.slice(1)); }
      return _sentenceRound(_pick(SENTENCES, rng));
    },
  },
  elsa: {
    1: (rng) => (rng() < 0.5 ? _elsaNew(1, rng) : _elsaWithin(rng, 10)),
    2: (rng) => (rng() < 0.5 ? _elsaNew(2, rng) : rng() < 0.5 ? _elsaWithin(rng, 20) : _missingRound(_pick(MISSING, rng), rng)),
    3: (rng) => {
      if (rng() < 0.5) return _elsaNew(3, rng);
      const k = Math.floor(rng() * 3);
      if (k === 0) return _tensRound(_pick(TENS, rng), rng);
      if (k === 1) return _moreRound(_pick(MORE, rng), rng);
      return _addendsRound(_pick(ADDENDS, rng), rng);
    },
  },
  cinderella: {
    1: (rng) => _cinderellaRound(1 + Math.floor(rng() * 12), 0, false),
    2: (rng) => _cinderellaRound(1 + Math.floor(rng() * 12), 0, true),
    3: (rng) => {
      const hours = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12]; // 6:30 held back: the hands overlap
      return _cinderellaRound(_pick(hours, rng), 30, rng() < 0.5);
    },
  },
  ariel: {
    1: (rng) => (rng() < 0.5 ? _arielRhymePick(rng, false) : _arielPair(rng)),
    2: (rng) => (rng() < 0.75 ? _arielRhymePick(rng, true) : _arielOdd(rng)),
    3: (rng) => _arielFamily(rng),
  },
  moana: { 1: _moanaT1, 2: _moanaT2, 3: _moanaT3 },
  jasmine: { 1: _jasmineT1, 2: _jasmineT2, 3: _jasmineT3 },
  anna: { 1: _annaT1, 2: _annaT2, 3: _annaT3 },
  tiana: { 1: _tianaT1, 2: _tianaT2, 3: _tianaT3 },
  aurora: { 1: (rng) => _auroraPick(rng, true), 2: (rng) => _auroraPick(rng, false), 3: _auroraSort },
  rapunzel: {
    1: _sciOr(1, SCI_T1),
    2: _sciOr(2, SCI_T2),
    3: _sciOr(3, SCI_T3),
  },
};

// About 1 round in 3 of Belle's library is a spelling kind (S2) and 1 in 5 a dictation sentence (S3); the rest are unchanged.
for (const t of [1, 2, 3]) {
  const base = TIERS.belle[t];
  TIERS.belle[t] = (rng) => {
    const x = rng();
    if (x < 1 / 3) { const sp = _spellKind(t, rng); if (sp) return sp; } // spelling (S2): about 1 in 3
    else if (x < 1 / 3 + 0.2) return _dictRound(t, rng); // dictation sentence (S3): about 1 in 5
    return base(rng);
  };
}

/** Stable id for a round, used by the review queue. */
// Measuring rounds share prompts, so their picture is part of the id.
export function roundKey(r) {
  const v = r.visual && r.visual.kind ? `|${JSON.stringify(r.visual)}` : '';
  const s = r.sort && r.sort.items ? `|sort:${r.sort.items.map((i) => i.name).join(',')}` : '';
  const w = r.show ? `|show:${r.show}` : ''; // spelling rounds share prompts; the partial word tells them apart
  return `${r.prompt}|${r.answer}${v}${s}${w}`;
}

function _tagged(npcId, tier, rng) {
  const r = { ...TIERS[npcId][tier](rng), tier };
  r.key = roundKey(r);
  return r;
}

/**
 * Build one quest for a land.
 * ladder: { tier: 1-3, review: [{ round, wins }] } (from js/ladder.js).
 * 5 rounds: round 1 is one tier below (a confidence win; T1 at T1), then
 * 3 at the current tier and 1 review item (a missed round from an earlier
 * play) in the middle. No review waiting -> 4 at the current tier.
 * Pass a custom rng for deterministic tests.
 */
export function buildRounds(npcId, rng = Math.random, ladder = null) {
  try {
    if (!TIERS[npcId]) throw new Error('no tiers');
    const tier = Math.min(3, Math.max(1, (ladder && ladder.tier) | 0 || 1));
    const below = Math.max(1, tier - 1);
    const out = [];
    const seen = new Set();
    const add = (r) => { if (r && !seen.has(r.key)) { seen.add(r.key); out.push(r); return true; } return false; };
    const fresh = (t) => { for (let k = 0; k < 40; k++) { if (add(_tagged(npcId, t, rng))) return; } add({ ..._tagged(npcId, t, rng), key: `x${out.length}` }); };
    fresh(below);
    // Older Aurora review items can contain words with both noun and verb meanings.
    // Keep the stored queue intact, but never serve an obsolete ambiguous round.
    const currentAuroraRound = (r) => {
      if (r.kind === 'wordsort') return r.sort && Array.isArray(r.sort.items) && r.sort.items.length === 4 && r.sort.items.every((i) => i && (i.naming ? WORD_GARDEN_NAMES : WORD_GARDEN_ACTIONS).includes(i.name));
      if (r.kind !== 'naming' && r.kind !== 'action') return false;
      const allowed = [...WORD_GARDEN_NAMES, ...WORD_GARDEN_ACTIONS];
      return Array.isArray(r.choices) && r.choices.includes(r.answer) && r.choices.every((w) => allowed.includes(w)) && (r.kind === 'naming' ? WORD_GARDEN_NAMES : WORD_GARDEN_ACTIONS).includes(r.answer);
    };
    const review = ((ladder && ladder.review) || []).filter((x) => x && x.round && x.round.prompt && (npcId !== 'aurora' || currentAuroraRound(x.round)));
    const rv = review.length ? _pick(review, rng).round : null;
    fresh(tier);
    if (!(rv && add({ ...rv, key: roundKey(rv), review: true }))) fresh(tier);
    fresh(tier);
    fresh(tier);
    return out;
  } catch (e) {}
  return (QUESTS[npcId] && QUESTS[npcId].rounds) || [];
}

const _EMOJI = /[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu;
export function hasEmoji(t) { _EMOJI.lastIndex = 0; return _EMOJI.test(String(t)); }
// Words for the third-miss reveal: a spoken answer word, else the answer text
// with pictures stripped, else a gentle "It's this picture."
export function revealLines(round) {
  const shown = `That's okay! The answer is ${round.answer}. Let's keep going!`;
  let word = round.answerSay || String(round.answer).replace(_EMOJI, '').replace(/\s+/g, ' ').trim();
  const say = word ? `That's okay! The answer is ${word}. Let's keep going!`
                   : "That's okay! It's this picture. Let's keep going!";
  return { shown, say };
}
