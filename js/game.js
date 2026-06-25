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

    // Layer system: 0 = melody only, 1 = +drums+bass, 2 = +pad
    this.combo = 0;
    this.layer = 0;

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
    clearTimeout(this._autoTimer);
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
    // Pre-load drums & pad so they're ready when the player builds combo
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

    if (this.cursor < this.events.length) {
      this.effects.scheduleFalling(this.events[this.cursor].notes, ms);
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
    if (e.type === "keydown") {
      if (e.repeat) return;
      const skip = ["Shift","Control","Alt","Meta","CapsLock","Tab","Escape",
                    "ArrowLeft","ArrowRight","ArrowUp","ArrowDown",
                    "F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"];
      if (skip.includes(e.key)) return;
    }
    clearTimeout(this._autoTimer);
    this._playNext(true);   // manual keypress = hit
    if (this.autoAdvance && this.active) this._reschedule();
  }

  // Update combo and derive the active layer (0/1/2).
  // Returns true when the layer changed.
  _updateCombo(isManual) {
    if (isManual) {
      this.combo++;
    } else {
      this.combo = 0;  // missed — auto-advance fired
    }
    const newLayer = this.combo >= 20 ? 2 : this.combo >= 8 ? 1 : 0;
    if (newLayer !== this.layer) {
      this.layer = newLayer;
      this.effects.setLayer(newLayer, this.combo, isManual);
    }
    this.effects.combo = this.combo;
    this.effects.layer = this.layer;
  }

  _playNext(isManual) {
    if (this.cursor >= this.events.length) return;

    const event = this.events[this.cursor];
    this._updateCombo(isManual);

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

    // Layer 2: string pad — trigger on downbeats using the chord tones from accomp
    if (this.layer >= 2 && this.cursor % 4 === 0 && event.accomp) {
      const chordNotes = event.accomp.filter(n => {
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
      document.removeEventListener("keydown",     this._keyHandler);
      document.removeEventListener("pointerdown", this._keyHandler);
      setTimeout(() => { if (this.onComplete) this.onComplete(); }, 1800);
    }
  }
}
