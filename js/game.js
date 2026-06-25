class Game {
  constructor(audioEngine, effectsEngine) {
    this.audio = audioEngine;
    this.effects = effectsEngine;

    this.song = null;
    this.events = [];
    this.cursor = 0;
    this.textCursor = 0;
    this.active = false;

    this.onProgress  = null;  // (ratio: number) => void
    this.onKeypress  = null;  // (textCursor: number) => void
    this.onComplete  = null;  // () => void

    this._keyHandler = this._handleKey.bind(this);
  }

  load(song) {
    this.song = song;
    this.events = song.events;
    this.cursor = 0;
    this.textCursor = 0;
    this.active = false;
  }

  start() {
    if (!this.song) return;
    this.cursor = 0;
    this.textCursor = 0;
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
    if (e.type === "keydown") {
      if (e.repeat) return;
      const skip = ["Shift","Control","Alt","Meta","CapsLock","Tab","Escape",
                    "ArrowLeft","ArrowRight","ArrowUp","ArrowDown","F1","F2",
                    "F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"];
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
    this.textCursor++;

    if (this.onProgress) this.onProgress(this.cursor / this.events.length);
    if (this.onKeypress) this.onKeypress(this.textCursor);

    if (this.cursor >= this.events.length) {
      this.active = false;
      document.removeEventListener("keydown", this._keyHandler);
      document.removeEventListener("pointerdown", this._keyHandler);
      setTimeout(() => { if (this.onComplete) this.onComplete(); }, 1800);
    }
  }
}
