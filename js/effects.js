const NOTE_NAMES_JP = {
  C: "ド", D: "レ", E: "ミ", F: "ファ", G: "ソ", A: "ラ", B: "シ",
};

function noteHue(noteStr) {
  const CHROMATIC = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const letter = noteStr.replace(/[0-9#b]/g, "").replace("##","").replace("bb","").replace("x","");
  const sharp = noteStr.includes("#") || noteStr.includes("s");
  let idx = CHROMATIC.indexOf(letter + (sharp ? "#" : ""));
  if (idx === -1) idx = CHROMATIC.indexOf(letter);
  if (idx === -1) idx = 0;
  return (idx * 30) % 360;
}

function noteLabel(noteStr) {
  const letter = noteStr.match(/[A-G]/)?.[0];
  if (!letter) return noteStr;
  const jp = NOTE_NAMES_JP[letter] || letter;
  const acc = noteStr.includes("#") ? "♯" : noteStr.includes("b") && !noteStr.startsWith("B") ? "♭" : "";
  return jp + acc;
}

class EffectsEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.floaters = [];
    this.pianoGlow = {};
    this.bgFlash   = 0;

    // Falling tile: the current note descending toward the hit zone
    this.fallingTile = null; // {notes, startTime, duration, hit, hitTime}

    this._running = false;
    this._raf     = null;

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._loop();
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  pulse() {
    this.bgFlash = Math.max(this.bgFlash, 0.08);
  }

  // Schedule the next note tile to fall, arriving at hit zone after `durationMs`
  scheduleFalling(notes, durationMs) {
    if (this.fallingTile && !this.fallingTile.hit) return; // already falling
    this.fallingTile = {
      notes,
      startTime: performance.now(),
      duration: Math.max(150, durationMs),
      hit: false,
      hitTime: null,
    };
  }

  // Called each time a note event fires
  trigger(notes) {
    if (!notes || notes.length === 0) return;

    // Mark falling tile as hit
    if (this.fallingTile && !this.fallingTile.hit) {
      this.fallingTile.hit     = true;
      this.fallingTile.hitTime = performance.now();
    }

    const cx     = this.canvas.width / 2;
    const pianoY = this.canvas.height - PIANO_HEIGHT - 20;

    notes.forEach((note) => {
      const kx = pianoNoteX(note, this.canvas.width) ?? cx;
      this._burst(kx, pianoY, noteHue(note));
      this.pianoGlow[note] = 1.0;
    });

    this.floaters.push({
      text: notes.map(noteLabel).join(" "),
      x: cx + (Math.random() - 0.5) * 200,
      y: this.canvas.height * 0.42,
      alpha: 1,
      vy: -1.4,
      decay: 0.018,
      hue: noteHue(notes[0]),
    });

    this.bgFlash = 0.15;
  }

  _burst(x, y, hue) {
    const count = 14 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        r: 2 + Math.random() * 3,
        hue: hue + (Math.random() - 0.5) * 40,
        alpha: 1,
        decay: 0.022 + Math.random() * 0.024,
      });
    }
  }

  _update() {
    this.particles = this.particles.filter((p) => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.25;
      p.alpha -= p.decay;
      return p.alpha > 0;
    });

    this.floaters = this.floaters.filter((f) => {
      f.y     += f.vy;
      f.alpha -= f.decay;
      return f.alpha > 0;
    });

    Object.keys(this.pianoGlow).forEach((k) => {
      this.pianoGlow[k] -= 0.04;
      if (this.pianoGlow[k] <= 0) delete this.pianoGlow[k];
    });

    if (this.bgFlash > 0) this.bgFlash -= 0.01;

    // Expire hit tiles after their animation
    if (this.fallingTile?.hit) {
      if (performance.now() - this.fallingTile.hitTime > 550) {
        this.fallingTile = null;
      }
    }
  }

  _hitZoneY() {
    return this.canvas.height - PIANO_HEIGHT - 16 - 22;
  }

  _drawHitZone() {
    const { ctx, canvas } = this;
    const y = this._hitZoneY();
    ctx.save();
    ctx.strokeStyle = "rgba(200,168,75,0.28)";
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  _drawFallingTile(now) {
    const tile = this.fallingTile;
    if (!tile) return;

    const { ctx, canvas } = this;
    const totalWhite = PIANO_OCTAVES * 7;
    const keyW   = Math.min(38, (canvas.width * 0.9) / totalWhite);
    const tileW  = Math.max(18, Math.floor(keyW * 0.78));
    const tileH  = 36;
    const hitY   = this._hitZoneY();
    const topY   = 82;
    const range  = hitY - topY;

    if (tile.hit) {
      const elapsed = now - tile.hitTime;
      if (elapsed > 550) return;
      const alpha  = Math.max(0, 1 - elapsed / 450);
      const expand = 1 + elapsed * 0.003;

      tile.notes.forEach((note) => {
        const x = pianoNoteX(note, canvas.width);
        if (!x) return;
        const hue = noteHue(note);
        const hw  = (tileW * expand) / 2;
        const hh  = (tileH * expand) / 2;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur  = 36;
        ctx.shadowColor = `hsl(${hue},90%,70%)`;
        ctx.fillStyle   = `hsl(${hue},80%,72%)`;
        _roundRect(ctx, x - hw, hitY - tileH * 0.5 - hh, hw * 2, hh * 2, 6);
        ctx.fill();
        ctx.restore();
      });
    } else {
      const elapsed  = now - tile.startTime;
      const progress = Math.min(elapsed / tile.duration, 1.1);
      const y        = topY + progress * range;
      const nearHit  = progress > 0.70;
      const pulse    = nearHit ? 0.75 + 0.25 * Math.sin(now / 65) : 0.60;

      tile.notes.forEach((note) => {
        const x = pianoNoteX(note, canvas.width);
        if (!x) return;
        const hue = noteHue(note);

        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.shadowBlur  = nearHit ? 28 : 10;
        ctx.shadowColor = `hsl(${hue},85%,60%)`;
        ctx.fillStyle   = `hsl(${hue},68%,52%)`;
        _roundRect(ctx, x - tileW / 2, y - tileH, tileW, tileH, 5);
        ctx.fill();

        // Label
        ctx.globalAlpha = Math.min(1, pulse + 0.3);
        ctx.font        = "bold 13px monospace";
        ctx.textAlign   = "center";
        ctx.fillStyle   = "rgba(255,255,255,0.95)";
        ctx.shadowBlur  = 0;
        ctx.fillText(noteLabel(note), x, y - tileH / 2 + 5);
        ctx.restore();
      });
    }
  }

  _draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.bgFlash > 0) {
      ctx.fillStyle = `rgba(255,255,200,${this.bgFlash * 0.07})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const now = performance.now();
    this._drawFallingTile(now);
    this._drawHitZone();

    this.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = `hsl(${p.hue},90%,70%)`;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = `hsl(${p.hue},90%,70%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    this.floaters.forEach((f) => {
      ctx.save();
      ctx.globalAlpha = f.alpha;
      ctx.font        = "bold 28px 'Hiragino Kaku Gothic Pro', sans-serif";
      ctx.textAlign   = "center";
      ctx.fillStyle   = `hsl(${f.hue},80%,85%)`;
      ctx.shadowBlur  = 20;
      ctx.shadowColor = `hsl(${f.hue},80%,60%)`;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    });

    drawPiano(ctx, canvas.width, canvas.height, this.pianoGlow);
  }

  _loop() {
    this._update();
    this._draw();
    if (this._running) this._raf = requestAnimationFrame(() => this._loop());
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

// ─── Piano keyboard ───────────────────────────────────────────────────────────

const PIANO_HEIGHT       = 110;
const PIANO_OCTAVES      = 5;
const PIANO_START_OCTAVE = 2;
const WHITE_NOTES        = ["C","D","E","F","G","A","B"];
const HAS_BLACK_RIGHT    = [true, true, false, true, true, true, false];

function pianoNoteX(noteStr, canvasWidth) {
  const letter = noteStr.match(/[A-G]/)?.[0];
  if (!letter) return null;
  const octave  = parseInt(noteStr.match(/\d+/)?.[0] ?? "4");
  const isSharp = noteStr.includes("#") || noteStr.includes("s") || noteStr.includes("x");
  const isFlat  = noteStr.includes("b") && !noteStr.startsWith("B");

  const totalWhite  = PIANO_OCTAVES * 7;
  const keyW        = Math.min(38, (canvasWidth * 0.9) / totalWhite);
  const startX      = (canvasWidth - totalWhite * keyW) / 2;
  const octaveOffset = octave - PIANO_START_OCTAVE;
  if (octaveOffset < 0 || octaveOffset >= PIANO_OCTAVES) return null;

  const wIdx = WHITE_NOTES.indexOf(letter);
  if (wIdx === -1) return null;

  const baseX = startX + (octaveOffset * 7 + wIdx) * keyW;
  if (!isSharp && !isFlat) return baseX + keyW / 2;
  return baseX + keyW; // black key sits between whites
}

function drawPiano(ctx, width, height, glow) {
  const totalWhite = PIANO_OCTAVES * 7;
  const keyW   = Math.min(38, (width * 0.9) / totalWhite);
  const whiteH = PIANO_HEIGHT;
  const blackH = whiteH * 0.62;
  const blackW = keyW * 0.6;
  const startX = (width - totalWhite * keyW) / 2;
  const startY = height - whiteH - 16;

  for (let o = 0; o < PIANO_OCTAVES; o++) {
    for (let i = 0; i < 7; i++) {
      const noteStr = WHITE_NOTES[i] + (PIANO_START_OCTAVE + o);
      const g = glow[noteStr] ?? 0;
      const x = startX + (o * 7 + i) * keyW;
      ctx.save();
      if (g > 0) {
        ctx.shadowBlur  = 18;
        ctx.shadowColor = `hsl(${noteHue(noteStr)},90%,70%)`;
        ctx.fillStyle   = `hsl(${noteHue(noteStr)},80%,${70 + g * 25}%)`;
      } else {
        ctx.fillStyle = "rgba(230,230,230,0.92)";
      }
      ctx.fillRect(x + 1, startY, keyW - 2, whiteH);
      ctx.strokeStyle = "rgba(80,80,80,0.5)";
      ctx.lineWidth   = 1;
      ctx.strokeRect(x + 1, startY, keyW - 2, whiteH);
      ctx.restore();
    }
  }

  for (let o = 0; o < PIANO_OCTAVES; o++) {
    for (let i = 0; i < 7; i++) {
      if (!HAS_BLACK_RIGHT[i]) continue;
      const noteStr = WHITE_NOTES[i] + "#" + (PIANO_START_OCTAVE + o);
      const flatLetter = WHITE_NOTES[(i + 1) % 7] + "b";
      const flatStr    = flatLetter + (PIANO_START_OCTAVE + o + (i === 6 ? 1 : 0));
      const g = Math.max(glow[noteStr] ?? 0, glow[flatStr] ?? 0);
      const x = startX + (o * 7 + i) * keyW + keyW - blackW / 2;
      ctx.save();
      if (g > 0) {
        ctx.shadowBlur  = 16;
        ctx.shadowColor = `hsl(${noteHue(noteStr)},90%,70%)`;
        ctx.fillStyle   = `hsl(${noteHue(noteStr)},80%,${30 + g * 50}%)`;
      } else {
        ctx.fillStyle = "rgba(25,25,25,0.95)";
      }
      ctx.fillRect(x, startY, blackW, blackH);
      ctx.restore();
    }
  }
}
