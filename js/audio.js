class AudioEngine {
  constructor() {
    this.sampler = null;
    this.reverb = null;
    this.ready = false;
    this._loading = false;

    // Drum / orchestral synths (initialised lazily on first game start)
    this.kick    = null;
    this.snare   = null;
    this.hihat   = null;
    this.strings = null;  // sustained string section
    this.bass    = null;  // low foundation (cello/contrabass-like)
    this.brass   = null;  // brass stabs for the orchestral peak
    this.drumsReady    = false;
    this._drumsLoading = false;
  }

  async init() {
    if (this._loading || this.ready) return;
    this._loading = true;

    await Tone.start();

    this.reverb = new Tone.Reverb({ decay: 2.5, wet: 0.25 });
    await this.reverb.generate();

    return new Promise((resolve) => {
      this.sampler = new Tone.Sampler({
        urls: {
          A0:    "A0.mp3",
          C1:    "C1.mp3",
          "D#1": "Ds1.mp3",
          "F#1": "Fs1.mp3",
          A1:    "A1.mp3",
          C2:    "C2.mp3",
          "D#2": "Ds2.mp3",
          "F#2": "Fs2.mp3",
          A2:    "A2.mp3",
          C3:    "C3.mp3",
          "D#3": "Ds3.mp3",
          "F#3": "Fs3.mp3",
          A3:    "A3.mp3",
          C4:    "C4.mp3",
          "D#4": "Ds4.mp3",
          "F#4": "Fs4.mp3",
          A4:    "A4.mp3",
          C5:    "C5.mp3",
          "D#5": "Ds5.mp3",
          "F#5": "Fs5.mp3",
          A5:    "A5.mp3",
          C6:    "C6.mp3",
          "D#6": "Ds6.mp3",
          "F#6": "Fs6.mp3",
          A6:    "A6.mp3",
          C7:    "C7.mp3",
          "D#7": "Ds7.mp3",
          "F#7": "Fs7.mp3",
          A7:    "A7.mp3",
          C8:    "C8.mp3",
        },
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        onload: () => {
          this.ready = true;
          this._loading = false;
          resolve();
        },
      })
        .connect(this.reverb)
        .toDestination();
    });
  }

  // Initialise drum & orchestral synths. Fire-and-forget; safe to call repeatedly.
  async initDrumsAndPad() {
    if (this._drumsLoading || this.drumsReady) return;
    this._drumsLoading = true;

    const drumVerb   = new Tone.Reverb({ decay: 0.9, wet: 0.18 });
    const stringVerb = new Tone.Reverb({ decay: 4.0, wet: 0.45 });
    const brassVerb  = new Tone.Reverb({ decay: 2.0, wet: 0.30 });
    await Promise.all([drumVerb.generate(), stringVerb.generate(), brassVerb.generate()]);

    // ── Percussion ──────────────────────────────────────────────
    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.06, octaves: 5,
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.12 },
    }).connect(drumVerb).toDestination();

    this.snare = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.10, sustain: 0, release: 0.04 },
    }).connect(drumVerb).toDestination();

    this.hihat = new Tone.MetalSynth({
      frequency: 400,
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
    }).connect(drumVerb).toDestination();

    // ── Orchestral instruments: real recorded samples (tonejs-instruments) ──
    const ORCH = "https://nbrosowsky.github.io/tonejs-instruments/samples/";

    // Violin section — sustained strings (harmony pad)
    this.strings = new Tone.Sampler({
      urls: {
        C4: "C4.mp3", E4: "E4.mp3", G4: "G4.mp3", A4: "A4.mp3",
        C5: "C5.mp3", E5: "E5.mp3", G5: "G5.mp3", A5: "A5.mp3",
      },
      baseUrl: ORCH + "violin/",
      release: 1.6,
      volume: -11,
    }).connect(stringVerb).toDestination();

    // Cello — low strings, the bass foundation
    this.bass = new Tone.Sampler({
      urls: {
        C2: "C2.mp3", E2: "E2.mp3", G2: "G2.mp3",
        C3: "C3.mp3", E3: "E3.mp3", G3: "G3.mp3", C4: "C4.mp3",
      },
      baseUrl: ORCH + "cello/",
      release: 0.9,
      volume: -6,
    }).connect(stringVerb).toDestination();

    // French horn — warm brass stabs for the orchestral peak
    this.brass = new Tone.Sampler({
      urls: {
        A1: "A1.mp3", C2: "C2.mp3", G2: "G2.mp3",
        F3: "F3.mp3", A3: "A3.mp3", C4: "C4.mp3", D5: "D5.mp3",
      },
      baseUrl: ORCH + "french-horn/",
      release: 0.6,
      volume: -9,
    }).connect(brassVerb).toDestination();

    this.drumsReady    = true;
    this._drumsLoading = false;
  }

  // Play a list of note strings simultaneously.
  // velocity: 0–1 (default 0.85 for melody, use ~0.40 for accompaniment)
  playNotes(notes, velocity = 0.85, duration = 1.8) {
    if (!this.ready || !notes || notes.length === 0) return;
    const now = Tone.now();
    notes.forEach((note) => {
      try {
        this.sampler.triggerAttackRelease(note, duration, now, velocity);
      } catch (e) {}
    });
  }

  playKick() {
    if (!this.drumsReady) return;
    this.kick.triggerAttackRelease("C1", "8n", Tone.now(), 0.75);
  }

  playSnare() {
    if (!this.drumsReady) return;
    this.snare.triggerAttackRelease("8n", Tone.now(), 0.55);
  }

  playHihat(velocity = 0.45) {
    if (!this.drumsReady) return;
    this.hihat.triggerAttackRelease("32n", Tone.now(), velocity);
  }

  // Sustained string chord (violin section).
  playStrings(notes, hold = 2.4, velocity = 0.55) {
    if (!this.strings || !this.strings.loaded || !notes || notes.length === 0) return;
    try {
      this.strings.triggerAttackRelease(notes, hold, Tone.now(), velocity);
    } catch (e) {}
  }

  // Backwards-compatible alias.
  playPad(notes) { this.playStrings(notes); }

  // Low bass note (cello) — the foundation under the harmony.
  playBass(note, duration = 0.9, velocity = 0.8) {
    if (!this.bass || !this.bass.loaded || !note) return;
    try {
      this.bass.triggerAttackRelease(note, duration, Tone.now(), velocity);
    } catch (e) {}
  }

  // Brass stab chord (french horn) — accent for the orchestral peak.
  playBrass(notes, duration = 0.5, velocity = 0.6) {
    if (!this.brass || !this.brass.loaded || !notes || notes.length === 0) return;
    try {
      this.brass.triggerAttackRelease(notes, duration, Tone.now(), velocity);
    } catch (e) {}
  }

  isReady() {
    return this.ready;
  }
}
