class Game {
  constructor(audioEngine, effectsEngine) {
    this.audio = audioEngine;
    this.effects = effectsEngine;

    this.song = null;
    this.events = [];
    this.cursor = 0;
    this.active = false;

    // Callbacks set by main.js
    this.onProgress = null;   // (ratio: number) => void
    this.onComplete = null;   // () => void

    this._keyHandler = this._handleKey.bind(this);
  }

  load(song) {
    this.song = song;
    this.events = song.events;
    this.cursor = 0;
    this.active = false;
  }

  start() {
    if (!this.song) return;
    this.cursor = 0;
    this.active = true;
    document.addEventListener("keydown", this._keyHandler);
    document.addEventListener("pointerdown", this._keyHandler);
  }

  stop() {
    this.active = false;
    document.removeEventListener("keydown", this._keyHandler);
    document.removeEventListener("pointerdown", this._keyHandler);
  }

  _handleKey(e) {
    if (!this.active) return;

    // Ignore modifier-only keypresses and held keys
    if (e.type === "keydown") {
      if (e.repeat) return;
      const skip = ["Shift","Control","Alt","Meta","CapsLock","Tab","Escape",
                    "ArrowLeft","ArrowRight","ArrowUp","ArrowDown"];
      if (skip.includes(e.key)) return;
    }

    this._playNext();
  }

  _playNext() {
    if (this.cursor >= this.events.length) return;

    const event = this.events[this.cursor];
    this.audio.playNotes(event.notes);
    this.effects.trigger(event.notes);
    this.cursor++;

    const ratio = this.cursor / this.events.length;
    if (this.onProgress) this.onProgress(ratio);

    if (this.cursor >= this.events.length) {
      // Short delay so the last note sounds before the complete screen appears
      this.active = false;
      document.removeEventListener("keydown", this._keyHandler);
      document.removeEventListener("pointerdown", this._keyHandler);
      setTimeout(() => {
        if (this.onComplete) this.onComplete();
      }, 1800);
    }
  }
}
