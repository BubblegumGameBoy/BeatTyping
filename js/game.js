// Key pool for note→key assignment. Ordered by typing ease so the most
// frequent notes land on the home row (F J D K S L A G H), then top, then bottom.
const KEY_POOL = [
  "F","J","D","K","S","L","A","G","H",
  "Q","W","E","R","T","Y","U","I","O","P",
  "Z","X","C","V","B","N","M",
];

// In wait-mode the tile glides in over this fixed time, then rests on the hit
// zone until the player presses — no auto-miss, no speed pressure.
const WAIT_FALL_MS = 600;

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
    // Wait-mode (default): the current note stays until the correct key is
    // pressed. No timeout, no miss-by-timing. Set true to restore the old
    // tempo-driven auto-advance (notes self-dismiss when time runs out).
    this.autoAdvance  = false;
    this._autoTimer   = null;

    // Rhythm timing of the currently-falling note
    this._noteStart = 0;
    this._noteMs    = 0;

    // Time of the previous correct hit — drives the touch dynamics
    // (fast runs play lighter & shorter, held notes sing out).
    this._lastHitAt = 0;

    // Layer system: 0 = melody only, 1 = +drums+bass, 2 = +pad
    this.combo      = 0;
    this.layer      = 0;
    this.maxLayer   = 3; // tutorial songs cap this at 0 (pure piano, no orchestra)
    this.missStreak = 0; // consecutive misses; combo resets only at 3

    // Timing windows (as fraction of the tile's fall)
    this.EARLY_OK = 0.45;  // before this it's "too early" — ignored
    this.PERFECT  = 0.82;  // at/after this it's a PERFECT hit

    // Callbacks
    this.onProgress  = null;  // (ratio) => void
    this.onKeypress  = null;  // (textCursor) => void
    this.onComplete  = null;  // () => void
    this.onBeat      = null;  // () => void
    this.onBpmChange = null;  // (bpm) => void
    this.onHint      = null;  // (text|null) => void  — tutorial guidance

    this._keyHandler = this._handleKey.bind(this);
  }

  load(song) {
    this.song       = song;
    this.events     = song.events;
    this.cursor     = 0;
    this.textCursor = 0;
    this.bpm        = song.bpm ?? 120;
    this.active      = false;
    this.combo       = 0;
    this.layer       = 0;
    this.missStreak  = 0;
    this._lastHitAt  = 0;
    // Tutorial = plain piano only: no drums / bass / strings / brass layers.
    // (The soft left-hand piano accompaniment still sounds — it's piano.)
    this.maxLayer    = song.tutorial ? 0 : 3;
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
    this.audio.setBackingBpm(this.bpm);
    if (this.active && this.autoAdvance) this._reschedule();
  }

  start() {
    if (!this.song) return;
    this.cursor     = 0;
    this.textCursor = 0;
    this.combo       = 0;
    this.layer       = 0;
    this.missStreak  = 0;
    this._lastHitAt  = 0;
    this.active      = true;
    this.audio.initDrumsAndPad();
    // Steady rhythm-section clock (silent until combo reaches layer 1).
    // The groove pattern follows the song's meter (4/4, 3/4 or 2/4).
    this.audio.setBackingChord(null);
    this.audio.setBackingLayer(0);
    this.audio.startBacking(this.bpm, this.song.meter ?? 4);
    document.addEventListener("keydown",     this._keyHandler);
    document.addEventListener("pointerdown", this._keyHandler);
    this._reschedule();  // present the first note (waits for input in wait-mode)
  }

  stop() {
    this.active = false;
    clearTimeout(this._autoTimer);
    this.audio.stopBacking();
    document.removeEventListener("keydown",     this._keyHandler);
    document.removeEventListener("pointerdown", this._keyHandler);
  }

  // Present the current note: glide its tile in, light up its key, show the
  // hint. In wait-mode (default) the note then sits until the player presses;
  // in auto-advance mode a timeout dismisses it as a miss when time runs out.
  _reschedule() {
    clearTimeout(this._autoTimer);
    // Tile entrance time: tempo-driven when auto-advancing, otherwise a fixed
    // calm glide that does NOT gate the player.
    const ms = this.autoAdvance ? (60000 / this.bpm) : WAIT_FALL_MS;

    // New note becomes active → reset the per-note miss counter.
    this.missStreak = 0;

    this._noteStart = performance.now();
    this._noteMs    = ms;

    if (this.cursor < this.events.length) {
      const ev = this.events[this.cursor];
      this.effects.scheduleFalling(ev.notes, ms, ev.key);
      this.effects.setNextKeys(ev.key, this.events[this.cursor + 1]?.key);
      this.effects.setQueue(
        this.events.slice(this.cursor, this.cursor + 5).map((e) => ({ key: e.key, notes: e.notes }))
      );
      if (this.onHint && ev.hint !== undefined) this.onHint(ev.hint || null);
    }

    if (this.autoAdvance) {
      this._autoTimer = setTimeout(() => {
        if (this.active && this.cursor < this.events.length) {
          this._playNext(false);  // auto-advance = miss
          this._reschedule();
        }
      }, ms);
    }
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

    if (key === target) {
      // Correct key — play immediately so the music follows the player's pace.
      // Wait-mode: no timing judgement at all, every correct press is rewarded
      // and builds the combo. Auto-advance mode keeps the PERFECT/GOOD rating.
      let bonus = 1;
      if (this.autoAdvance) {
        const progress = this._noteMs
          ? (performance.now() - this._noteStart) / this._noteMs
          : 1;
        let rating;
        if (progress < this.EARLY_OK || progress >= this.PERFECT) { rating = "PERFECT"; bonus = 1; }
        else                                                      { rating = "GOOD";    bonus = 0; }
        this.effects.showRating(rating);
      }
      this.missStreak = 0;
      clearTimeout(this._autoTimer);
      this._playNext(true, bonus);
      if (this.active) this._reschedule();
    } else {
      // Wrong key — flash. Combo only breaks after 3 misses on THIS note
      // (the counter resets when the next note arrives).
      this.missStreak++;
      this.effects.flashError();
      if (this.missStreak >= 3) this._applyCombo(false);
    }
  }

  // Update combo + derived layer. hit=true increments (+bonus), hit=false resets.
  // Layers: 0 piano · 1 +bass&drums · 2 +strings · 3 +brass (full orchestra)
  _applyCombo(hit, bonus = 0) {
    const prev = this.layer;
    if (hit) this.combo += 1 + bonus; else this.combo = 0;
    this.layer =
      this.combo >= 36 ? 3 :
      this.combo >= 20 ? 2 :
      this.combo >= 8  ? 1 : 0;
    if (this.layer > this.maxLayer) this.layer = this.maxLayer;
    if (this.layer !== prev) this.effects.setLayer(this.layer, this.combo, hit);
    this.audio.setBackingLayer(this.layer);
    this.effects.combo = this.combo;
    this.effects.layer = this.layer;
  }

  // Lowest-pitched note in a chord (for the bass voice).
  _lowestNote(notes) {
    if (!notes || notes.length === 0) return null;
    return notes.reduce((lo, n) => (noteMidi(n) < noteMidi(lo) ? n : lo), notes[0]);
  }

  _playNext(isManual, bonus = 0) {
    if (this.cursor >= this.events.length) return;

    const event = this.events[this.cursor];
    // Manual hit grows the combo. Auto-advance (timeout) neither grows nor
    // breaks it — only 3 wrong presses on one note resets it (see _handleKey).
    if (isManual) this._applyCombo(true, bonus);

    if (!isManual) {
      // Auto-advance (miss): dismiss tile silently, no audio.
      this.effects.dismissTile();
    } else {
      // ── Correct hit: the piano follows the player's hands.
      //    Touch dynamics: the gap since the previous hit shapes velocity
      //    and sustain, so fast runs stay light and articulate instead of
      //    stacking thirty fortissimo notes into mud, while slow, held
      //    notes ring out. Harmony-change notes get a gentle accent.
      const now = performance.now();
      const gap = this._lastHitAt ? now - this._lastHitAt : 600;
      this._lastHitAt = now;
      const t = Math.max(0, Math.min(1, (gap - 130) / 570)); // 130ms → 700ms

      const accomp = event.accomp || [];
      let vel = 0.64 + t * 0.18
              + (accomp.length ? 0.06 : 0)
              + (Math.random() - 0.5) * 0.04;   // humanize
      vel = Math.max(0.5, Math.min(0.92, vel));
      const dur = 0.5 + t * 1.3;

      this.audio.playNotes(event.notes, vel, dur);
      this.effects.trigger(event.notes);

      if (accomp.length > 0) {
        // Left hand: a soft piano voicing sounds on every harmony change —
        // this is what makes it feel like two-handed playing. The orchestral
        // backing follows the same chord on its own steady clock.
        const voiced = this.audio.playAccomp(accomp, 0.3, Math.max(1.4, dur));
        this.audio.setBackingChord(accomp);
        this.effects.triggerAccomp(voiced.length ? voiced : accomp);
      }
    }

    this.cursor++;
    this.textCursor++;

    if (this.onBeat)     this.onBeat();
    if (this.onProgress) this.onProgress(this.cursor / this.events.length);
    if (this.onKeypress) this.onKeypress(this.textCursor);

    if (this.cursor >= this.events.length) {
      this.active = false;
      clearTimeout(this._autoTimer);
      this.audio.stopBacking();
      this.effects.setNextKeys(null, null);
      document.removeEventListener("keydown",     this._keyHandler);
      document.removeEventListener("pointerdown", this._keyHandler);
      setTimeout(() => { if (this.onComplete) this.onComplete(); }, 1800);
    }
  }
}
