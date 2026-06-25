// Song event data
// Each event = one keypress → play these notes simultaneously
// notes: string[] using scientific notation (e.g. "C4", "D#5", "Eb5")

const SONGS = [
  {
    id: "fur_elise",
    title: "エリーゼのために",
    composer: "L.v. ベートーヴェン",
    events: [
      // ===== A section (1st) =====
      // Opening motif
      {notes:["E5"]}, {notes:["D#5"]}, {notes:["E5"]}, {notes:["D#5"]},
      {notes:["E5"]}, {notes:["B4"]}, {notes:["D5"]}, {notes:["C5"]},
      // Am phrase
      {notes:["A4","A2","E3","A3"]},
      {notes:["E4","C4"]},
      {notes:["A4","A2","E3","A3"]},
      // E7 phrase
      {notes:["B4","E2","B2","G#3"]},
      {notes:["E4","G#3"]},
      {notes:["G#4","B3","E4"]},
      {notes:["B4","E3","G#3"]},
      // Back to Am
      {notes:["C5","A2","E3","A3"]},
      {notes:["E4","C4"]},
      // Opening motif repeated
      {notes:["E5"]}, {notes:["D#5"]}, {notes:["E5"]}, {notes:["D#5"]},
      {notes:["E5"]}, {notes:["B4"]}, {notes:["D5"]}, {notes:["C5"]},
      // Am phrase
      {notes:["A4","A2","E3","A3"]},
      {notes:["E4","C4"]},
      {notes:["A4","A2","E3","A3"]},
      // E7 → final ending
      {notes:["B4","E2","B2","G#3"]},
      {notes:["C5"]},
      {notes:["B4"]},
      {notes:["A4"]},

      // ===== B section =====
      {notes:["B4","F3","A3","D4"]},
      {notes:["C5","G3","C4","E4"]},
      {notes:["D5","F3","A3","D4"]},
      {notes:["E5","C3","G3","C4","E4"]},
      {notes:["G4"]},
      {notes:["F5","F3","A3","C4"]},
      {notes:["E5"]},
      {notes:["D5","G3","B3","D4"]},
      {notes:["F4","F2","C3","F3","A3"]},
      {notes:["E5","F3","A3","C4"]},
      {notes:["D5"]},
      {notes:["C5","G3","B3","D4"]},
      {notes:["E4","E2","G#2","B2","E3"]},
      {notes:["D5"]},
      {notes:["C5"]},
      {notes:["B4"]},

      // ===== A section (2nd) =====
      // Opening motif
      {notes:["E5"]}, {notes:["D#5"]}, {notes:["E5"]}, {notes:["D#5"]},
      {notes:["E5"]}, {notes:["B4"]}, {notes:["D5"]}, {notes:["C5"]},
      // Am phrase
      {notes:["A4","A2","E3","A3"]},
      {notes:["E4","C4"]},
      {notes:["A4","A2","E3","A3"]},
      // E7 phrase
      {notes:["B4","E2","B2","G#3"]},
      {notes:["E4","G#3"]},
      {notes:["G#4","B3","E4"]},
      {notes:["B4","E3","G#3"]},
      // Back to Am
      {notes:["C5","A2","E3","A3"]},
      {notes:["E4","C4"]},
      // Opening motif repeated
      {notes:["E5"]}, {notes:["D#5"]}, {notes:["E5"]}, {notes:["D#5"]},
      {notes:["E5"]}, {notes:["B4"]}, {notes:["D5"]}, {notes:["C5"]},
      // Final ending
      {notes:["A4","A2","E3","A3"]},
      {notes:["E4","C4"]},
      {notes:["A4","A2","E3","A3"]},
      {notes:["B4","E2","B2","G#3"]},
      {notes:["C5"]},
      {notes:["B4"]},
      {notes:["A4","A2","E3","A3"]},
    ]
  },

  {
    id: "moonlight",
    title: "月光 第1楽章",
    composer: "L.v. ベートーヴェン",
    events: [
      // C# minor, famous triplet arpeggios
      // Each event = one triplet group (3 per measure)
      // The melody rides on top of the arpeggios

      // Measures 1-2: C#m
      {notes:["C#2","G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["C#2","G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","F#4"]},   // melody movement

      // Measures 3-4: C#m → G#/B#
      {notes:["B#1","G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["B#1","G#3","D#4","F#4"]},
      {notes:["G#3","D#4","F#4"]},
      {notes:["G#3","D#4","F#4"]},

      // Measures 5-6: C#m
      {notes:["C#2","G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4","B4"]},  // melody: B4 (theme entrance)
      {notes:["C#2","G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","D#4","A#4"]},  // melody: A#4

      // Measures 7-8: G#/B# → C#m
      {notes:["B#1","G#3","C#4","E4","G#4"]},  // melody: G#4
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","F#4"]},
      {notes:["C#2","G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},

      // Measures 9-10: C#m → Csus/Bs
      {notes:["G#1","G#3","B3","E4","G#4"]},  // melody up
      {notes:["G#3","B3","E4"]},
      {notes:["G#3","B3","E4"]},
      {notes:["F##1","A#3","C#4","F##4"]},
      {notes:["A#3","C#4","F##4"]},
      {notes:["A#3","C#4","F##4"]},

      // Measures 11-12: G#7/B# → C#m
      {notes:["B#1","G#3","D#4","G#4"]},
      {notes:["G#3","D#4","F#4"]},
      {notes:["G#3","D#4","F#4"]},
      {notes:["C#2","G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},

      // Measures 13-14: F#m → B
      {notes:["F#2","F#3","A3","C#4","F#4"]},
      {notes:["F#3","A3","C#4"]},
      {notes:["F#3","A3","C#4","E4"]},
      {notes:["B1","D#3","F#3","B3","D#4"]},
      {notes:["D#3","F#3","B3"]},
      {notes:["D#3","F#3","B3"]},

      // Measures 15-16: G#m → C#m → G#7 → C#m resolution
      {notes:["G#2","G#3","B3","D#4","E4"]},
      {notes:["G#3","B3","D#4"]},
      {notes:["G#3","B3","D#4","C#4"]},
      {notes:["C#2","G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},

      // Recapitulation and final measures
      {notes:["C#2","G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4","B4"]},  // melody: B4 again
      {notes:["C#2","G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","D#4","A#4"]},

      {notes:["B#1","G#3","C#4","E4","G#4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["G#3","C#4","F#4"]},
      {notes:["C#2","G#3","C#4","E4"]},
      {notes:["G#3","C#4","E4"]},
      {notes:["C#2","G#2","C#3","G#3","C#4"]},  // final C#m chord
    ]
  },

  {
    id: "canon",
    title: "カノン",
    composer: "J. パッヘルベル",
    events: [
      // D major, the famous 8-chord ostinato bass (D-A-Bm-F#m-G-D-G-A)
      // Each variation adds melodic interest on top

      // ===== Theme statement (bare chords) =====
      {notes:["D3","F#3","A3","D4"]},    // D
      {notes:["A2","E3","A3","C#4"]},    // A
      {notes:["B2","D3","F#3","B3"]},    // Bm
      {notes:["F#2","C#3","F#3","A3"]},  // F#m
      {notes:["G2","D3","G3","B3"]},     // G
      {notes:["D3","F#3","A3","D4"]},    // D
      {notes:["G2","D3","G3","B3"]},     // G
      {notes:["A2","E3","A3","E4"]},     // A

      // ===== Variation 1: melody enters =====
      {notes:["D3","D4","F#3","A3"]},
      {notes:["A2","C#4","E3","A3"]},
      {notes:["B2","B3","D3","F#3"]},
      {notes:["F#2","A3","C#3","F#3"]},
      {notes:["G2","G3","D3","B3"]},
      {notes:["D3","F#3","A3","D4"]},
      {notes:["G2","G3","D3","B3"]},
      {notes:["A2","A3","E3","C#4"]},

      // ===== Variation 2: faster melody =====
      {notes:["D3","F#4","D4","F#3","A3"]},
      {notes:["A2","E4","C#4","E3","A3"]},
      {notes:["B2","D4","B3","D3","F#3"]},
      {notes:["F#2","C#4","A3","C#3","F#3"]},
      {notes:["G2","B3","G3","D3"]},
      {notes:["D3","A3","F#3","D4"]},
      {notes:["G2","G3","E3","B3"]},
      {notes:["A2","F#3","E4","C#4","E3"]},

      // ===== Variation 3: running sixteenths =====
      {notes:["D3","D4","E4","F#4","G4"]},
      {notes:["A2","A4","G4","F#4","E4"]},
      {notes:["B2","F#4","E4","D4","C#4"]},
      {notes:["F#2","D4","C#4","B3","A3"]},
      {notes:["G2","B3","C4","D4","E4"]},
      {notes:["D3","F#4","E4","D4","C#4"]},
      {notes:["G2","D4","E4","F#4","G4"]},
      {notes:["A2","A4","G4","F#4","E4"]},

      // ===== Variation 4: expressive melody =====
      {notes:["D3","F#4","A4","D5"]},
      {notes:["A2","E4","A4","C#5"]},
      {notes:["B2","D4","F#4","B4"]},
      {notes:["F#2","C#4","F#4","A4"]},
      {notes:["G2","D4","G4","B4"]},
      {notes:["D3","D4","F#4","A4"]},
      {notes:["G2","B3","E4","G4"]},
      {notes:["A2","A3","C#4","E4","A4"]},  // cadence

      // ===== Final statement =====
      {notes:["D3","F#3","A3","D4","F#4"]},
      {notes:["A2","E3","A3","C#4","E4"]},
      {notes:["B2","D3","F#3","B3","D4"]},
      {notes:["F#2","C#3","F#3","A3","C#4"]},
      {notes:["G2","D3","G3","B3","D4"]},
      {notes:["D3","D3","F#3","A3","D4"]},
      {notes:["G2","G2","D3","G3","B3"]},
      {notes:["A2","A2","E3","A3","E4","A4"]},  // grand final chord
    ]
  },

  {
    id: "gymnopedie",
    title: "ジムノペディ第1番",
    composer: "E. サティ",
    events: [
      // D major, famous slow waltz (3/4 time)
      // Characteristic: bass note on beat 1, chord on beats 2-3, melody on top

      // ===== Opening theme =====
      // Measure 1: G major (actually the intro chord)
      {notes:["G2","D3","G3","B3"]},     // bass + chord beat 1-2
      {notes:["G3","B3","D4"]},           // chord beat 3 (no bass)
      {notes:["D2","A2","D3","F#3"]},    // D chord
      {notes:["F#3","A3","D4"]},

      // Melody enters (E minor feel)
      {notes:["G2","D3","G3","B3"]},
      {notes:["G3","B3","D4","A4"]},      // melody: A4
      {notes:["G3","B3","D4","G4"]},      // melody: G4

      {notes:["D2","A2","D3","F#3"]},
      {notes:["F#3","A3","D4","F#4"]},   // melody: F#4
      {notes:["F#3","A3","D4","E4"]},    // melody: E4

      {notes:["G2","D3","G3","B3"]},
      {notes:["G3","B3","D4","D4"]},     // melody: D4
      {notes:["G3","B3","D4","B3"]},     // melody: B3

      {notes:["D2","A2","D3","F#3"]},
      {notes:["F#3","A3","D4"]},
      {notes:["F#3","A3","D4"]},

      // ===== Second phrase =====
      {notes:["G2","D3","G3","B3"]},
      {notes:["G3","B3","D4","E4"]},     // melody ascends: E4
      {notes:["G3","B3","D4","F#4"]},    // F#4

      {notes:["D2","A2","D3","F#3"]},
      {notes:["F#3","A3","D4","G4"]},    // G4
      {notes:["F#3","A3","D4","A4"]},    // A4

      {notes:["G2","D3","G3","B3"]},
      {notes:["G3","B3","D4","B4"]},     // B4
      {notes:["G3","B3","D4","A4"]},     // descending

      {notes:["D2","F#2","A2","D3"]},
      {notes:["F#3","A3","D4","G4"]},
      {notes:["F#3","A3","D4"]},

      // ===== Third phrase (more expressive) =====
      {notes:["E2","B2","E3","G3"]},     // Em
      {notes:["B2","E3","G3","B3"]},
      {notes:["B2","E3","G3","B3","D4"]}, // melody: D4

      {notes:["A2","E3","A3","C#4"]},    // A major
      {notes:["E3","A3","C#4"]},
      {notes:["E3","A3","C#4","E4"]},    // melody: E4

      {notes:["E2","B2","E3","G3"]},
      {notes:["B2","E3","G3","B3"]},
      {notes:["B2","E3","G3","B3","C4"]}, // melody: C4

      {notes:["A2","E3","A3","C#4"]},
      {notes:["E3","A3","C#4"]},
      {notes:["E3","A3","C#4"]},

      // ===== Return to main theme =====
      {notes:["G2","D3","G3","B3"]},
      {notes:["G3","B3","D4","A4"]},
      {notes:["G3","B3","D4","G4"]},

      {notes:["D2","A2","D3","F#3"]},
      {notes:["F#3","A3","D4","F#4"]},
      {notes:["F#3","A3","D4","E4"]},

      {notes:["G2","D3","G3","B3"]},
      {notes:["G3","B3","D4","D4"]},
      {notes:["G3","B3","D4"]},

      // ===== Final cadence =====
      {notes:["D2","A2","D3","F#3"]},
      {notes:["F#3","A3","D4"]},
      {notes:["D2","F#2","A2","D3","F#3","A3","D4"]},  // full D major chord
    ]
  }
];
