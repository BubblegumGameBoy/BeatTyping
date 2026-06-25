class AudioEngine {
  constructor() {
    this.sampler = null;
    this.reverb = null;
    this.ready = false;
    this._loading = false;

    // Drum / pad synths (initialised lazily on first game start)
    this.kick  = null;
    this.snare = null;
    this.hihat = null;
    this.pad   = null;
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

  // Initialise drum & pad synths. Fire-and-forget; safe to call multiple times.
  async initDrumsAndPad() {
    if (this._drumsLoading || this.drumsReady) return;
    this._drumsLoading = true;

    const drumVerb = new Tone.Reverb({ decay: 0.9, wet: 0.18 });
    const padVerb  = new Tone.Reverb({ decay: 3.5, wet: 0.45 });
    await Promise.all([drumVerb.generate(), padVerb.generate()]);

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

    this.pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle8" },
      envelope: { attack: 0.35, decay: 0.2, sustain: 0.60, release: 2.5 },
    }).connect(padVerb).toDestination();

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

  // Play a chord on the pad synth; auto-releases after ~2 bars.
  playPad(notes) {
    if (!this.drumsReady || !notes || notes.length === 0) return;
    try {
      this.pad.releaseAll();
      this.pad.triggerAttack(notes, Tone.now(), 0.28);
      this.pad.triggerRelease(notes, Tone.now() + 2.2);
    } catch (e) {}
  }

  isReady() {
    return this.ready;
  }
}
