const SONGS = [
  {
    id: "turkish_march",
    title: "トルコ行進曲",
    composer: "W.A. モーツァルト",
    bpm: 130,
    typingText: "rondo alla turca allegretto march vivace forte presto staccato beat rhythm",
    events: [
      // ===== A Section — A minor (Rondo alla Turca main theme) =====
      // Phrase 1a: iconic ornamental motif
      {notes:["E5"]},
      {notes:["D#5"]},{notes:["E5"]},{notes:["D#5"]},{notes:["E5"]},
      {notes:["B4"]},{notes:["D5"]},{notes:["C5"]},
      {notes:["A4"]},
      {notes:["C4"]},{notes:["E4"]},{notes:["A4"]},
      {notes:["B4"]},
      {notes:["C5"]},{notes:["D5"]},{notes:["E5"]},
      {notes:["G4"]},{notes:["G#4"]},{notes:["A4"]},

      // Phrase 1b: repeat
      {notes:["E5"]},
      {notes:["D#5"]},{notes:["E5"]},{notes:["D#5"]},{notes:["E5"]},
      {notes:["B4"]},{notes:["D5"]},{notes:["C5"]},
      {notes:["A4"]},
      {notes:["C4"]},{notes:["E4"]},{notes:["A4"]},
      {notes:["B4"]},
      {notes:["C5"]},{notes:["D5"]},{notes:["E5"]},
      {notes:["G4"]},{notes:["G#4"]},{notes:["A4"]},

      // Phrase 2: contrasting (raised phrase with chromatic descent)
      {notes:["A5"]},{notes:["G#5"]},{notes:["A5"]},
      {notes:["F5"]},{notes:["E5"]},
      {notes:["D5"]},{notes:["C#5"]},{notes:["D5"]},
      {notes:["B4"]},{notes:["A4"]},
      {notes:["G4"]},{notes:["A4"]},
      {notes:["E4"]},

      // Phrase 1 closing repeat
      {notes:["E5"]},
      {notes:["D#5"]},{notes:["E5"]},{notes:["D#5"]},{notes:["E5"]},
      {notes:["B4"]},{notes:["D5"]},{notes:["C5"]},
      {notes:["A4"]},
      {notes:["C4"]},{notes:["E4"]},{notes:["A4"]},

      // ===== B Section — A major (the bright marching theme) =====
      // Phrase 3a: ascending major scale run
      {notes:["A4"]},{notes:["A4"]},{notes:["A4"]},{notes:["A4"]},
      {notes:["A4"]},{notes:["B4"]},{notes:["C#5"]},{notes:["D5"]},{notes:["E5"]},
      {notes:["E5"]},{notes:["F#5"]},{notes:["G#5"]},
      {notes:["A5"]},
      {notes:["A5"]},{notes:["G#5"]},
      {notes:["F#5"]},{notes:["E5"]},{notes:["D5"]},{notes:["C#5"]},{notes:["B4"]},{notes:["A4"]},

      // Phrase 3b: D-major colour, same ascending pattern
      {notes:["D5"]},{notes:["D5"]},{notes:["D5"]},{notes:["D5"]},
      {notes:["D5"]},{notes:["E5"]},{notes:["F#5"]},{notes:["G5"]},{notes:["A5"]},
      {notes:["A5"]},{notes:["G#5"]},
      {notes:["F#5"]},{notes:["E5"]},{notes:["D5"]},{notes:["C#5"]},{notes:["B4"]},{notes:["A4"]},

      // B-section cadence
      {notes:["E4"]},{notes:["C#4"]},{notes:["A4"]},
      {notes:["A4","C#5","E5"]},

      // ===== A Section Return =====
      // Phrase 1a
      {notes:["E5"]},
      {notes:["D#5"]},{notes:["E5"]},{notes:["D#5"]},{notes:["E5"]},
      {notes:["B4"]},{notes:["D5"]},{notes:["C5"]},
      {notes:["A4"]},
      {notes:["C4"]},{notes:["E4"]},{notes:["A4"]},
      {notes:["B4"]},
      {notes:["C5"]},{notes:["D5"]},{notes:["E5"]},
      {notes:["G4"]},{notes:["G#4"]},{notes:["A4"]},

      // Phrase 1b repeat
      {notes:["E5"]},
      {notes:["D#5"]},{notes:["E5"]},{notes:["D#5"]},{notes:["E5"]},
      {notes:["B4"]},{notes:["D5"]},{notes:["C5"]},
      {notes:["A4"]},
      {notes:["C4"]},{notes:["E4"]},{notes:["A4"]},
      {notes:["B4"]},
      {notes:["C5"]},{notes:["D5"]},{notes:["E5"]},
      {notes:["G4"]},{notes:["G#4"]},{notes:["A4"]},

      // Phrase 2 return
      {notes:["A5"]},{notes:["G#5"]},{notes:["A5"]},
      {notes:["F5"]},{notes:["E5"]},
      {notes:["D5"]},{notes:["C#5"]},{notes:["D5"]},
      {notes:["B4"]},{notes:["A4"]},
      {notes:["G4"]},{notes:["A4"]},
      {notes:["E4"]},

      // ===== Coda — A major (triumphant march ending) =====
      {notes:["A4","C#5","E5"]},
      {notes:["A4"]},{notes:["A4"]},{notes:["A4"]},{notes:["A4"]},
      {notes:["A4","C#5","E5"]},
      {notes:["G#4","B4","D#5","G#5"]},
      {notes:["A4","C#5","E5"]},
      {notes:["A4"]},{notes:["C#5"]},{notes:["E5"]},{notes:["A5"]},
      {notes:["G#5"]},{notes:["A5"]},
      {notes:["E5"]},{notes:["C#5"]},
      {notes:["A4","C#5","E5","A5"]},
    ]
  },

  {
    id: "fur_elise",
    title: "エリーゼのために",
    composer: "L.v. ベートーヴェン",
    bpm: 72,
    typingText: "fur elise adagio cantabile beethoven piano serenade nocturne",
    events: [
      // ===== A Section (1st) =====
      {notes:["E5"]},{notes:["D#5"]},{notes:["E5"]},{notes:["D#5"]},
      {notes:["E5"]},{notes:["B4"]},{notes:["D5"]},{notes:["C5"]},
      {notes:["A4","C4","E4"]},
      {notes:["E4"]},
      {notes:["A4"]},
      {notes:["B4"]},
      {notes:["E4","G#3"]},
      {notes:["G#4"]},
      {notes:["B4"]},
      {notes:["C5"]},
      {notes:["E4"]},

      {notes:["E5"]},{notes:["D#5"]},{notes:["E5"]},{notes:["D#5"]},
      {notes:["E5"]},{notes:["B4"]},{notes:["D5"]},{notes:["C5"]},
      {notes:["A4","C4","E4"]},
      {notes:["E4"]},
      {notes:["A4"]},
      {notes:["B4"]},
      {notes:["C5"]},
      {notes:["B4"]},
      {notes:["A4"]},

      // ===== B Section =====
      {notes:["B4"]},{notes:["C5"]},{notes:["D5"]},
      {notes:["E5"]},
      {notes:["G3","C4","E4"]},
      {notes:["G4"]},
      {notes:["F5"]},{notes:["E5"]},{notes:["D5"]},
      {notes:["F3","A3","C4"]},
      {notes:["F4"]},
      {notes:["E5"]},{notes:["D5"]},{notes:["C5"]},
      {notes:["E3","G#3","B3"]},
      {notes:["E4"]},
      {notes:["D5"]},{notes:["C5"]},{notes:["B4"]},

      // ===== A Section (2nd) =====
      {notes:["E5"]},{notes:["D#5"]},{notes:["E5"]},{notes:["D#5"]},
      {notes:["E5"]},{notes:["B4"]},{notes:["D5"]},{notes:["C5"]},
      {notes:["A4","C4","E4"]},
      {notes:["E4"]},
      {notes:["A4"]},
      {notes:["B4"]},
      {notes:["E4","G#3"]},
      {notes:["G#4"]},
      {notes:["B4"]},
      {notes:["C5"]},
      {notes:["E4"]},

      {notes:["E5"]},{notes:["D#5"]},{notes:["E5"]},{notes:["D#5"]},
      {notes:["E5"]},{notes:["B4"]},{notes:["D5"]},{notes:["C5"]},
      {notes:["A4","C4","E4"]},
      {notes:["E4"]},
      {notes:["A4"]},
      {notes:["B4"]},
      {notes:["C5"]},
      {notes:["B4"]},
      {notes:["A4"]},
    ]
  },

  {
    id: "moonlight",
    title: "月光 第1楽章",
    composer: "L.v. ベートーヴェン",
    bpm: 54,
    typingText: "moonlight adagio sostenuto nocturne piano sonata serenade",
    events: [
      // C# minor — each event = one triplet arpeggio group (3 notes)
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["A3","C#4","E4"]},
      {notes:["A3","C#4","E4"]},
      {notes:["A3","C#4","E4"]},

      {notes:["G#3","D4","F#4"]},
      {notes:["G#3","D4","F#4"]},
      {notes:["G#3","D4","F#4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},

      // Melody enters — top note added
      {notes:["G#3","C#4","E4","B4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4","A#4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},

      {notes:["G#3","C#4","E4","G#4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","F#4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},

      {notes:["G#3","B3","E4"]},
      {notes:["G#3","B3","E4"]},
      {notes:["G#3","B3","E4"]},
      {notes:["A#3","C#4","F#4"]},
      {notes:["A#3","C#4","F#4"]},
      {notes:["A#3","C#4","F#4"]},

      {notes:["G#3","D#4","G#4"]},
      {notes:["G#3","D#4","F#4"]},
      {notes:["G#3","D#4","F#4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},

      {notes:["F#3","A3","C#4"]},
      {notes:["F#3","A3","C#4"]},
      {notes:["F#3","A3","C#4","F#4"]},
      {notes:["D#3","F#3","B3"]},
      {notes:["D#3","F#3","B3"]},
      {notes:["D#3","F#3","B3"]},

      {notes:["G#3","B3","D#4","E4"]},
      {notes:["G#3","B3","D#4"]},
      {notes:["G#3","B3","D#4","C#4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},

      // Recapitulation
      {notes:["G#3","C#4","E4","B4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4","A#4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},

      {notes:["G#3","C#4","E4","G#4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","F#4"]},
      {notes:["C#2","G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["C#2","G#2","C#3","G#3","C#4"]},
    ]
  },

  {
    id: "canon",
    title: "カノン",
    composer: "J. パッヘルベル",
    bpm: 80,
    typingText: "canon pachelbel baroque allegro harmony counterpoint",
    events: [
      // D major — 8-chord progression: D A Bm F#m G D G A
      {notes:["D4","F#4","A4"]},
      {notes:["A3","C#4","E4"]},
      {notes:["B3","D4","F#4"]},
      {notes:["F#3","C#4","F#4"]},
      {notes:["G3","B3","D4"]},
      {notes:["D4","F#4","A4"]},
      {notes:["G3","B3","D4"]},
      {notes:["A3","C#4","E4"]},

      // Variation 1 — melody appears on top
      {notes:["D4","F#4","A4","D5"]},
      {notes:["A3","C#4","E4","C#5"]},
      {notes:["B3","D4","F#4","B4"]},
      {notes:["F#3","C#4","F#4","A4"]},
      {notes:["G3","B3","D4","G4"]},
      {notes:["D4","F#4","A4","F#4"]},
      {notes:["G3","B3","D4","E4"]},
      {notes:["A3","C#4","E4","A4"]},

      // Variation 2 — running sixteenths (compressed)
      {notes:["D4"]},{notes:["E4"]},{notes:["F#4"]},{notes:["G4"]},
      {notes:["A4"]},{notes:["G4"]},{notes:["F#4"]},{notes:["E4"]},
      {notes:["D4"]},{notes:["C#4"]},{notes:["B3"]},{notes:["A3"]},
      {notes:["B3"]},{notes:["C#4"]},{notes:["D4"]},{notes:["E4"]},
      {notes:["F#4"]},{notes:["E4"]},{notes:["D4"]},{notes:["C#4"]},
      {notes:["D4"]},{notes:["E4"]},{notes:["F#4"]},{notes:["G4"]},
      {notes:["A4"]},{notes:["G4"]},{notes:["F#4"]},{notes:["E4"]},
      {notes:["A3","C#4","E4","A4"]},

      // Variation 3 — expressive chords
      {notes:["D4","F#4","A4","D5"]},
      {notes:["A3","E4","A4","C#5"]},
      {notes:["B3","D4","F#4","B4"]},
      {notes:["F#3","C#4","F#4","A4"]},
      {notes:["G3","D4","G4","B4"]},
      {notes:["D4","F#4","A4","D5"]},
      {notes:["G3","B3","E4","G4"]},
      {notes:["A3","C#4","E4","A4"]},
    ]
  },

  {
    id: "gymnopedie",
    title: "ジムノペディ第1番",
    composer: "E. サティ",
    bpm: 42,
    typingText: "gymnopedie lent satie impressionism piano nocturne",
    events: [
      // 3/4 waltz: bass → chord → melody (3 events per measure)
      {notes:["G2"]},
      {notes:["D3","G3","B3"]},
      {notes:["A4"]},

      {notes:["D2"]},
      {notes:["F#3","A3","D4"]},
      {notes:["G4"]},

      {notes:["G2"]},
      {notes:["D3","G3","B3"]},
      {notes:["A4"]},

      {notes:["D2"]},
      {notes:["F#3","A3","D4"]},
      {notes:["G4"]},

      {notes:["G2"]},
      {notes:["D3","G3","B3"]},
      {notes:["F#4"]},

      {notes:["D2"]},
      {notes:["F#3","A3","D4"]},
      {notes:["E4"]},

      {notes:["G2"]},
      {notes:["D3","G3","B3"]},
      {notes:["D4"]},

      {notes:["D2"]},
      {notes:["F#3","A3","D4"]},
      {notes:["D4"]},

      // Second phrase
      {notes:["G2"]},
      {notes:["D3","G3","B3"]},
      {notes:["E4"]},

      {notes:["D2"]},
      {notes:["F#3","A3","D4"]},
      {notes:["F#4"]},

      {notes:["G2"]},
      {notes:["D3","G3","B3"]},
      {notes:["G4"]},

      {notes:["D2"]},
      {notes:["F#3","A3","D4"]},
      {notes:["A4"]},

      {notes:["G2"]},
      {notes:["D3","G3","B3"]},
      {notes:["B4"]},

      {notes:["D2"]},
      {notes:["F#3","A3","D4"]},
      {notes:["A4"]},

      {notes:["D2"]},
      {notes:["A3","D4","F#4"]},
      {notes:["D4"]},

      // Em section
      {notes:["E2"]},
      {notes:["B2","E3","G3"]},
      {notes:["D4"]},

      {notes:["A2"]},
      {notes:["E3","A3","C#4"]},
      {notes:["E4"]},

      {notes:["E2"]},
      {notes:["B2","E3","G3"]},
      {notes:["C4"]},

      {notes:["A2"]},
      {notes:["E3","A3","C#4"]},
      {notes:["A3"]},

      // Return
      {notes:["G2"]},
      {notes:["D3","G3","B3"]},
      {notes:["A4"]},

      {notes:["D2"]},
      {notes:["F#3","A3","D4"]},
      {notes:["G4"]},

      {notes:["G2"]},
      {notes:["D3","G3","B3"]},
      {notes:["F#4"]},

      {notes:["D2"]},
      {notes:["F#3","A3","D4"]},
      {notes:["E4"]},

      {notes:["G2"]},
      {notes:["D3","G3","B3"]},
      {notes:["D4"]},

      {notes:["D2","F#2","A2","D3","F#3","A3","D4"]},
    ]
  }
];
