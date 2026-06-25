class Game {
  constructor(audioEngine, effectsEngine) {
    this.audio = audioEngine;
    this.effects = effectsEngine;

    this.song       = null;
    this.events     = [];
    this.cursor     = 0;
    this.textCursor = 0;
    this.active     = false;

    this.bpm          = 120;   // auto-advance events per minute
    this.autoAdvance  = true;
    this._autoTimer   = null;

    // Callbacks
    this.onProgress  = null;  // (ratio) => void
    this.onKeypress  = null;  // (textCursor) => void
    this.onComplete  = null;  // () => void
    this.onBeat      = null;  // () => void  — fires on every event (auto or manual)
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
    this.active     = true;
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

    // Show the next note as a falling tile
    if (this.cursor < this.events.length) {
      this.effects.scheduleFalling(this.events[this.cursor].notes, ms);
    }

    this._autoTimer = setTimeout(() => {
      if (this.active && this.cursor < this.events.length) {
        this._playNext();
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
    // Player pressed a key — cancel pending auto-advance, play now, reschedule
    clearTimeout(this._autoTimer);
    this._playNext();
    if (this.autoAdvance && this.active) this._reschedule();
  }

  _playNext() {
    if (this.cursor >= this.events.length) return;

    const event = this.events[this.cursor];
    this.audio.playNotes(event.notes, 0.85, 1.8);
    this.effects.trigger(event.notes);

    // Auto accompaniment (bass / chord) plays softer alongside the melody
    if (event.accomp && event.accomp.length > 0) {
      this.audio.playNotes(event.accomp, 0.38, 2.4);
      this.effects.triggerAccomp(event.accomp);
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
