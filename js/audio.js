// ─── Pitch helpers ─────────────────────────────────────────────────────────
const PC_INDEX = { C:0, "C#":1, D:2, "D#":3, E:4, F:5, "F#":6, G:7, "G#":8, A:9, "A#":10, B:11 };

function pcOf(note)   { return note.match(/^[A-G]#?/)?.[0] ?? "C"; }
function midiOf(note) {
  const pc  = pcOf(note);
  const oct = parseInt(note.slice(pc.length), 10);
  return (isNaN(oct) ? 4 : oct) * 12 + PC_INDEX[pc];
}

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

    // ── Steady backing clock (Tone.Transport) ──────────────────────────
    // The rhythm section runs on a fixed tempo grid so it never drifts with
    // the player's (uneven) keystrokes. The melody stays keypress-driven;
    // the backing just follows whatever chord the player is currently on.
    this._backingId    = null;   // scheduleRepeat id
    this.backingLayer  = 0;      // 0 = silent, grows with combo layer
    this.backingChord  = null;   // current harmony (root first)
    this._stepsPerBar  = 8;      // 8 = 4/4 pop, 6 = 3/4 waltz, 4 = 2/4 march

    // String pad currently sustaining (so we can release it the moment the
    // harmony moves instead of letting a stale chord ring against the player)
    this._padNotes = null;
    this._padSetAt = 0;

    // Piano re-strike bookkeeping: note → time of its latest attack.
    // Repeating a key damps the still-ringing previous strike (like a real
    // hammer re-strike), and the deferred note-off skips superseded strikes.
    this._pianoAttacks = new Map();
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
        release: 0.5,  // damper fall on note-off (default 0.1 cuts too hard)
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
      volume: -17,
    }).connect(stringVerb).toDestination();

    // Cello — low strings, the bass foundation
    this.bass = new Tone.Sampler({
      urls: {
        C2: "C2.mp3", E2: "E2.mp3", G2: "G2.mp3",
        C3: "C3.mp3", E3: "E3.mp3", G3: "G3.mp3", C4: "C4.mp3",
      },
      baseUrl: ORCH + "cello/",
      release: 0.9,
      volume: -12,
    }).connect(stringVerb).toDestination();

    // French horn — warm brass stabs for the orchestral peak
    this.brass = new Tone.Sampler({
      urls: {
        A1: "A1.mp3", C2: "C2.mp3", G2: "G2.mp3",
        F3: "F3.mp3", A3: "A3.mp3", C4: "C4.mp3", D5: "D5.mp3",
      },
      baseUrl: ORCH + "french-horn/",
      release: 0.6,
      volume: -17,
    }).connect(brassVerb).toDestination();

    this.drumsReady    = true;
    this._drumsLoading = false;
  }

  // ── Backing clock ────────────────────────────────────────────────────
  // Start the steady rhythm section. Safe to call before the orchestral
  // samples finish loading: the per-tick callback no-ops until they are
  // ready and the layer is ≥ 1.
  // meter: 4 = 4/4 pop, 3 = 3/4 waltz, 2 = 2/4 march (step = eighth note).
  startBacking(bpm = 120, meter = 4) {
    this._stepsPerBar = meter === 3 ? 6 : meter === 2 ? 4 : 8;
    if (this._backingId !== null) { this.setBackingBpm(bpm); return; }
    Tone.Transport.bpm.value = bpm;
    let step = 0;
    this._backingId = Tone.Transport.scheduleRepeat((time) => {
      this._backingTick(step % this._stepsPerBar, time);
      step++;
    }, "8n");
    Tone.Transport.start();
  }

  stopBacking() {
    if (this._backingId !== null) {
      Tone.Transport.clear(this._backingId);
      this._backingId = null;
    }
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    this.backingLayer = 0;
    this.backingChord = null;
    this._clearPad(Tone.immediate());
    if (this.strings) { try { this.strings.releaseAll(); } catch (e) {} }
  }

  setBackingBpm(bpm) { Tone.Transport.bpm.value = bpm; }

  setBackingLayer(layer) {
    const prev = this.backingLayer;
    this.backingLayer = layer;
    // Pad enters/leaves with layer 2 — voice or silence it right away.
    if (layer >= 2 && prev < 2 && this.backingChord) this._setPad(Tone.immediate());
    if (layer < 2 && prev >= 2) this._clearPad(Tone.immediate());
  }

  setBackingChord(notes) {
    if (!notes || !notes.length) return;
    const changed = !this.backingChord || notes.join() !== this.backingChord.join();
    this.backingChord = notes;
    // Re-voice the string pad the moment the harmony moves, so it never
    // sustains a stale chord against the player's new notes.
    if (changed && this.backingLayer >= 2) this._setPad(Tone.immediate());
  }

  // Seconds in one bar of the current backing groove (one step = an eighth).
  _barSeconds() {
    const bpm = Tone.Transport.bpm.value || 120;
    return (30 / bpm) * this._stepsPerBar;
  }

  // Stack a chord's pitch classes in ascending order from a base octave,
  // preserving the written root/voice order (root first). Keeps the violin /
  // horn samplers in their recorded range without collapsing inversions.
  _stack(chord, baseOct, maxNotes = 3) {
    const pcs = [];
    chord.forEach((n) => {
      const m = n.match(/^[A-G]#?/);
      if (m && !pcs.includes(m[0])) pcs.push(m[0]);
    });
    const out = [];
    let prev = -1;
    pcs.slice(0, maxNotes).forEach((pc) => {
      let oct = baseOct;
      while (midiOf(pc + oct) <= prev) oct++;
      prev = midiOf(pc + oct);
      out.push(pc + oct);
    });
    return out;
  }

  // Horn voicing: root + fifth (classic horn fifths — stays clean in the low
  // register where a full close triad would turn to mud).
  _brassVoicing(chord) {
    if (!chord || !chord.length) return [];
    const fifth = chord.length >= 3 ? chord[2] : chord[1];
    return this._stack(fifth ? [chord[0], fifth] : [chord[0]], 3, 2);
  }

  // (Re)voice the sustained string pad on the current chord. force=false is
  // the once-a-bar re-bow — skipped if the pad was just voiced by a change.
  _setPad(time, force = true) {
    if (!this.strings || !this.strings.loaded || !this.backingChord) return;
    if (!force && time - this._padSetAt < this._barSeconds() * 0.5) return;
    const notes = this._stack(this.backingChord, 4, 3);
    if (!notes.length) return;
    try {
      if (this._padNotes) this.strings.triggerRelease(this._padNotes, time);
      this.strings.triggerAttack(notes, time, this.backingLayer >= 3 ? 0.48 : 0.38);
      this._padNotes = notes;
      this._padSetAt = time;
    } catch (e) {}
  }

  _clearPad(time) {
    if (this._padNotes && this.strings) {
      try { this.strings.triggerRelease(this._padNotes, time); } catch (e) {}
      this._padNotes = null;
    }
  }

  // One eighth-note of the backing pattern. pos = 0..stepsPerBar-1.
  _backingTick(pos, time) {
    const L = this.backingLayer;
    if (L < 1 || !this.drumsReady) return;
    const chord = this.backingChord;
    const spb   = this._stepsPerBar;

    // Strong beats: 4/4 → 1 & 3, 3/4 → 1, 2/4 → 1 & 2
    const strong = spb === 6 ? pos === 0
                 : spb === 4 ? (pos === 0 || pos === 2)
                 :             (pos === 0 || pos === 4);

    // ── Percussion (pattern follows the song's meter) ──
    if (spb === 6) {
      // Waltz: soft kick on 1, brushed "chick-chick" on beats 2 & 3
      if (pos === 0) this.kick.triggerAttackRelease("C1", "8n", time, 0.4);
      if (pos === 2 || pos === 4) {
        if (L >= 2) this.snare.triggerAttackRelease("16n", time, 0.13);
        this.hihat.triggerAttackRelease(320, "32n", time, L >= 3 ? 0.2 : 0.14);
      }
    } else if (spb === 4) {
      // March: kick on 1, snare on 2, hats every eighth
      if (pos === 0) this.kick.triggerAttackRelease("C1", "8n", time, 0.5);
      if (L >= 2 && pos === 2) this.snare.triggerAttackRelease("8n", time, 0.32);
      const hh = L >= 3 ? 0.24 : 0.16;
      this.hihat.triggerAttackRelease(320, "32n", time, pos % 2 === 0 ? hh : hh * 0.6);
    } else {
      // 4/4 pop
      if (strong) this.kick.triggerAttackRelease("C1", "8n", time, 0.5);
      if (L >= 2 && (pos === 2 || pos === 6)) this.snare.triggerAttackRelease("8n", time, 0.36);
      if (pos % 2 === 0) {
        const hh = L >= 3 ? 0.26 : 0.18;
        this.hihat.triggerAttackRelease(320, "32n", time, pos % 4 === 0 ? hh : hh * 0.7);
      }
    }

    if (!chord) return;

    // ── Cello on the strong beats — chord root pinned into its recorded
    //    range (song data writes roots down to G1, below the samples) ──
    if (strong && this.bass && this.bass.loaded) {
      const root = pcOf(chord[0]) + "2";
      const hold = pos === 0 ? (spb === 6 ? 1.4 : 1.0) : 0.6;
      this.bass.triggerAttackRelease(root, hold, time, 0.5);
    }

    // ── Violin pad: re-bow once a bar so held harmonies don't decay away ──
    if (L >= 2 && pos === 0) this._setPad(time, false);

    // ── French-horn fifths on the strong beats (layer 3) ──
    if (L >= 3 && strong && this.brass && this.brass.loaded) {
      const b = this._brassVoicing(chord);
      if (b.length) this.brass.triggerAttackRelease(b, pos === 0 ? 0.5 : 0.3, time, pos === 0 ? 0.4 : 0.3);
    }
  }

  // ── Piano (player-triggered) ─────────────────────────────────────────

  // One piano note, scheduled with zero lookahead so the sound lands on the
  // keystroke. Damps a still-ringing previous strike of the same pitch first
  // (a real hammer re-strike), then defers a note-off that is skipped if the
  // key has been re-struck since.
  _strike(note, t, velocity, duration) {
    try {
      this.sampler.triggerRelease(note, t);
      this.sampler.triggerAttack(note, t, velocity);
      this._pianoAttacks.set(note, t);
      setTimeout(() => {
        if (!this.ready) return;
        if (this._pianoAttacks.get(note) === t) {
          try { this.sampler.triggerRelease(note, Tone.immediate()); } catch (e) {}
          this._pianoAttacks.delete(note);
        }
      }, duration * 1000);
    } catch (e) {}
  }

  // Play a list of note strings simultaneously.
  // velocity: 0–1 · duration: seconds of sustain before the damper falls
  playNotes(notes, velocity = 0.85, duration = 1.8) {
    if (!this.ready || !notes || notes.length === 0) return;
    const t = Tone.immediate();
    notes.forEach((note) => this._strike(note, t, velocity, duration));
  }

  // Soft left-hand piano chord under the melody. Re-voiced to a pianist's
  // hand shape (low root, open upper voices) and given a slight low-to-high
  // strum so it blooms instead of landing as a MIDI block chord.
  // Returns the voiced notes actually played (for the piano-key glow).
  playAccomp(notes, velocity = 0.3, duration = 1.7) {
    if (!this.ready || !notes || notes.length === 0) return [];
    const t = Tone.immediate();
    const voiced = this._voiceLeftHand(notes);
    voiced.forEach((note, i) => {
      this._strike(note, t + i * 0.012, velocity, duration);
    });
    return voiced;
  }

  // Left-hand voicing: root at octave 2, remaining chord tones stacked
  // ascending from octave 3. Written voicings that are already open
  // (e.g. A2-E3-A3) pass through unchanged; close low triads like G1-B1-D2
  // open up (G2-B3-D4) instead of rumbling.
  _voiceLeftHand(chord) {
    const pcs = [];
    chord.forEach((n) => {
      const m = n.match(/^[A-G]#?/);
      if (m && !pcs.includes(m[0])) pcs.push(m[0]);
    });
    if (!pcs.length) return [];
    const out = [pcs[0] + "2"];
    let prev = -1;
    for (let i = 1; i < pcs.length; i++) {
      let oct = 3;
      while (midiOf(pcs[i] + oct) <= prev) oct++;
      prev = midiOf(pcs[i] + oct);
      out.push(pcs[i] + oct);
    }
    return out;
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
    this.hihat.triggerAttackRelease(320, "32n", Tone.now(), velocity);
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
