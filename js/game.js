// Key pool for note→key assignment. Ordered by typing ease so the most
// frequent notes land on the home row (F J D K S L A G H), then top, then bottom.
const KEY_POOL = [
  "F","J","D","K","S","L","A","G","H",
  "Q","W","E","R","T","Y","U","I","O","P",
  "Z","X","C","V","B","N","M",
];

const NOTE_ORDER = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
function noteMidi(noteStr) {
  const letter = noteStr.match(/[A-G]/)?.[0] ?? "C";
  const sharp  = noteStr.includes("#");
  const octave = parseInt(noteStr.match(/\d+/)?.[0] ?? "4");
  const idx = NOTE_ORDER.indexOf(letter + (sharp ? "#" : ""));
  return octave * 12 + (idx === -1 ? 0 : idx);
}

class Game {
  constructor(audioEngine, effectsEngine) {
    this.audio = audioEngine;
    this.effects = effectsEngine;

    this.song       = null;
    this.events     = [];
    this.cursor     = 0;
    this.textCursor = 0;
    this.active     = false;

    this.bpm          = 120;
    this.autoAdvance  = true;
    this._autoTimer   = null;

    // Rhythm timing of the currently-falling note
    this._noteStart = 0;
    this._noteMs    = 0;

    // Layer system: 0 = melody only, 1 = +drums+bass, 2 = +pad
    this.combo = 0;
    this.layer = 0;

    // Timing windows (as fraction of the tile's fall)
    this.EARLY_OK = 0.45;  // before this it's "too early" — ignored
    this.PERFECT  = 0.82;  // at/after this it's a PERFECT hit

    // Callbacks
    this.onProgress  = null;  // (ratio) => void
    this.onKeypress  = null;  // (textCursor) => void
    this.onComplete  = null;  // () => void
    this.onBeat      = null;  // () => void
    this.onBpmChange = null;  // (bpm) => void

    this._keyHandler = this._handleKey.bind(this);
  }

  load(song) {
    this.song       = song;
    this.events     = song.events;
    this.cursor     = 0;
    this.textCursor = 0;
    this.bpm        = song.bpm ?? 120;
    this.active     = false;
    this.combo      = 0;
    this.layer      = 0;
    this._assignKeys();
    clearTimeout(this._autoTimer);
  }

  // Deterministically map each distinct pitch to a key.
  // Most-used pitches get the easiest keys (home row first).
  _assignKeys() {
    const counts = {};
    this.events.forEach((e) => {
      const p = e.notes[0];
      counts[p] = (counts[p] || 0) + 1;
    });
    const pitches = Object.keys(counts).sort(
      (a, b) => counts[b] - counts[a] || noteMidi(a) - noteMidi(b)
    );
    const map = {};
    pitches.forEach((p, i) => { map[p] = KEY_POOL[i % KEY_POOL.length]; });
    this.events.forEach((e) => { e.key = map[e.notes[0]]; });
  }

  setBpm(bpm) {
    this.bpm = Math.max(20, Math.min(400, Math.round(bpm)));
    if (this.onBpmChange) this.onBpmChange(this.bpm);
    if (this.active && this.autoAdvance) this._reschedule();
  }

  start() {
    if (!this.song) return;
    this.cursor     = 0;
    this.textCursor = 0;
    this.combo      = 0;
    this.layer      = 0;
    this.active     = true;
    this.audio.initDrumsAndPad();
    document.addEventListener("keydown",     this._keyHandler);
    document.addEventListener("pointerdown", this._keyHandler);
    if (this.autoAdvance) this._reschedule();
  }

  stop() {
    this.active = false;
    clearTimeout(this._autoTimer);
    document.removeEventListener("keydown",     this._keyHandler);
    document.removeEventListener("pointerdown", this._keyHandler);
  }

  _reschedule() {
    clearTimeout(this._autoTimer);
    const ms = 60000 / this.bpm;

    this._noteStart = performance.now();
    this._noteMs    = ms;

    if (this.cursor < this.events.length) {
      const ev = this.events[this.cursor];
      this.effects.scheduleFalling(ev.notes, ms, ev.key);
      this.effects.setNextKeys(ev.key, this.events[this.cursor + 1]?.key);
      this.effects.setQueue(
        this.events.slice(this.cursor, this.cursor + 5).map((e) => ({ key: e.key, notes: e.notes }))
      );
    }

    this._autoTimer = setTimeout(() => {
      if (this.active && this.cursor < this.events.length) {
        this._playNext(false);  // auto-advance = miss
        this._reschedule();
      }
    }, ms);
  }

  _handleKey(e) {
    if (!this.active) return;
    if (this.cursor >= this.events.length) return;

    const target  = this.events[this.cursor].key;
    const pointer = e.type === "pointerdown";

    let key;
    if (pointer) {
      key = target;  // tap/click always targets the right key
    } else {
      if (e.repeat) return;
      if (!/^[a-zA-Z]$/.test(e.key)) return;  // ignore non-letter keys
      key = e.key.toUpperCase();
    }

    const progress = this._noteMs
      ? (performance.now() - this._noteStart) / this._noteMs
      : 1;

    if (key === target) {
      // Correct key — but did they wait for the beat?
      if (!pointer && progress < this.EARLY_OK) return;  // too early: ignore
      const rating = progress >= this.PERFECT ? "PERFECT" : "GOOD";
      this.effects.showRating(rating);
      clearTimeout(this._autoTimer);
      this._playNext(true);
      if (this.autoAdvance && this.active) this._reschedule();
    } else {
      // Wrong key — typo. Break combo, flash, don't advance.
      this._applyCombo(false);
      this.effects.flashError();
    }
  }

  // Update combo + derived layer. hit=true increments, hit=false resets.
  _applyCombo(hit) {
    const prev = this.layer;
    if (hit) this.combo++; else this.combo = 0;
    this.layer = this.combo >= 20 ? 2 : this.combo >= 8 ? 1 : 0;
    if (this.layer !== prev) this.effects.setLayer(this.layer, this.combo, hit);
    this.effects.combo = this.combo;
    this.effects.layer = this.layer;
  }

  _playNext(isManual) {
    if (this.cursor >= this.events.length) return;

    const event = this.events[this.cursor];
    this._applyCombo(isManual);

    // Melody — always plays
    this.audio.playNotes(event.notes, 0.85, 1.8);
    this.effects.trigger(event.notes);

    // Layer 1+: bass piano accompaniment
    if (this.layer >= 1 && event.accomp && event.accomp.length > 0) {
      this.audio.playNotes(event.accomp, 0.38, 2.4);
      this.effects.triggerAccomp(event.accomp);
    }

    // Layer 1+: Janissary drum pattern (4-event cycle = 1 bar of 2/4)
    if (this.layer >= 1) {
      const beat = this.cursor % 4;
      if      (beat === 0) { this.audio.playKick(); }
      else if (beat === 1) { this.audio.playHihat(0.38); }
      else if (beat === 2) { this.audio.playSnare(); this.audio.playHihat(0.55); }
      else if (beat === 3) { this.audio.playHihat(0.28); }
    }

    // Layer 2: string pad on downbeats, using mid/high chord tones from accomp
    if (this.layer >= 2 && this.cursor % 4 === 0 && event.accomp) {
      const chordNotes = event.accomp.filter((n) => {
        const oct = parseInt(n.match(/\d+/)?.[0] ?? "0");
        return oct >= 3;
      });
      this.audio.playPad(chordNotes);
    }

    this.cursor++;
    this.textCursor++;

    if (this.onBeat)     this.onBeat();
    if (this.onProgress) this.onProgress(this.cursor / this.events.length);
    if (this.onKeypress) this.onKeypress(this.textCursor);

    if (this.cursor >= this.events.length) {
      this.active = false;
      clearTimeout(this._autoTimer);
      this.effects.setNextKeys(null, null);
      document.removeEventListener("keydown",     this._keyHandler);
      document.removeEventListener("pointerdown", this._keyHandler);
      setTimeout(() => { if (this.onComplete) this.onComplete(); }, 1800);
    }
  }
}
