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
    this.combo      = 0;
    this.layer      = 0;
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
    this.combo       = 0;
    this.layer       = 0;
    this.missStreak  = 0;
    this.active      = true;
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
      // Correct key — play immediately so the music follows the player's pace.
      // Early input is welcome and earns a bonus.
      // Early input counts as PERFECT too (rewarded, not punished).
      let rating, bonus;
      if (progress < this.EARLY_OK || progress >= this.PERFECT) { rating = "PERFECT"; bonus = 1; }
      else                                                      { rating = "GOOD";    bonus = 0; }
      this.effects.showRating(rating);
      this.missStreak = 0;
      clearTimeout(this._autoTimer);
      this._playNext(true, bonus);
      if (this.autoAdvance && this.active) this._reschedule();
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
    if (this.layer !== prev) this.effects.setLayer(this.layer, this.combo, hit);
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
      // ── Correct hit: play all melody notes simultaneously ──────────────
      this.audio.playNotes(event.notes, 0.85, 1.8);
      this.effects.trigger(event.notes);

      const accomp = event.accomp || [];
      const beat   = this.cursor % 4;

      // Layer 1+: piano accompaniment + cello bass note
      if (this.layer >= 1 && accomp.length > 0) {
        this.audio.playNotes(accomp, 0.34, 2.4);
        this.effects.triggerAccomp(accomp);
        const bassNote = this._lowestNote(accomp);
        if (bassNote) this.audio.playBass(bassNote, beat === 0 ? 1.2 : 0.7, 0.62);
      }

      // Layer 1+: Janissary drum pattern (4-event cycle = 1 bar of 2/4)
      if (this.layer >= 1) {
        if      (beat === 0) { this.audio.playKick(); }
        else if (beat === 1) { this.audio.playHihat(0.38); }
        else if (beat === 2) { this.audio.playSnare(); this.audio.playHihat(0.55); }
        else if (beat === 3) { this.audio.playHihat(0.28); }
      }

      // Layer 2+: sustained violin strings on downbeats
      if (this.layer >= 2 && beat === 0 && accomp.length > 0) {
        const chordNotes = accomp.filter((n) => (parseInt(n.match(/\d+/)?.[0] ?? "0")) >= 3);
        if (chordNotes.length) this.audio.playStrings(chordNotes);
      }

      // Layer 3: french-horn stabs on the strong beats
      if (this.layer >= 3 && (beat === 0 || beat === 2) && accomp.length > 0) {
        const stab = accomp.filter((n) => (parseInt(n.match(/\d+/)?.[0] ?? "0")) >= 3);
        if (stab.length) this.audio.playBrass(stab, beat === 0 ? 0.6 : 0.35, beat === 0 ? 0.5 : 0.32);
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
      this.effects.setNextKeys(null, null);
      document.removeEventListener("keydown",     this._keyHandler);
      document.removeEventListener("pointerdown", this._keyHandler);
      setTimeout(() => { if (this.onComplete) this.onComplete(); }, 1800);
    }
  }
}
