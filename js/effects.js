const NOTE_NAMES_JP = {
  C: "ド", D: "レ", E: "ミ", F: "ファ", G: "ソ", A: "ラ", B: "シ",
};

function noteHue(noteStr) {
  const CHROMATIC = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const letter = noteStr.replace(/[0-9#bsx]/g, "");
  const sharp  = noteStr.includes("#") || noteStr.includes("s");
  let idx = CHROMATIC.indexOf(letter + (sharp ? "#" : ""));
  if (idx === -1) idx = CHROMATIC.indexOf(letter);
  if (idx === -1) idx = 0;
  return (idx * 30) % 360;
}

function noteLabel(noteStr) {
  const letter = noteStr.match(/[A-G]/)?.[0];
  if (!letter) return noteStr;
  const jp  = NOTE_NAMES_JP[letter] || letter;
  const acc = noteStr.includes("#") ? "♯" : "";
  return jp + acc;
}

// ─── Finger system ────────────────────────────────────────────────────────────

const FINGER_MAP = {
  Q:0, A:0, Z:0,
  W:1, S:1, X:1,
  E:2, D:2, C:2,
  R:3, F:3, V:3, T:3, G:3, B:3,
  Y:4, H:4, N:4, U:4, J:4, M:4,
  I:5, K:5,
  O:6, L:6,
  P:7,
};

const FINGER_COLORS = [
  "#e05555", "#e09030", "#d4c020", "#30b045",
  "#30a078", "#3075d0", "#7040c0", "#c04090",
];

const FINGER_JP = [
  "左小指", "左薬指", "左中指", "左人差し指",
  "右人差し指", "右中指", "右薬指", "右小指",
];

// ─── Layer labels ─────────────────────────────────────────────────────────────

const LAYER_LABELS = ["", "+ ドラム !", "+ ストリングス !"];
const LAYER_HUES   = [0, 200, 45];

// ─── QWERTY layout ───────────────────────────────────────────────────────────

const KB_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["Z","X","C","V","B","N","M"],
];
const KB_ROW_STAGGER = [0, 0.45, 0.9];

// ─── Piano constants ──────────────────────────────────────────────────────────

const PIANO_HEIGHT       = 110;
const PIANO_OCTAVES      = 5;
const PIANO_START_OCTAVE = 2;
const WHITE_NOTES        = ["C","D","E","F","G","A","B"];
const HAS_BLACK_RIGHT    = [true, true, false, true, true, true, false];

// ─── Lane perspective config ──────────────────────────────────────────────────

const LANE_W_HIT  = 170;
const LANE_W_TOP  = 54;
const SLOT_SCALES = [1.00, 0.78, 0.60, 0.46, 0.34];
const SLOT_ALPHAS = [1.00, 0.82, 0.62, 0.44, 0.28];
// How far above hitZoneY each slot sits, as fraction of laneHeight
const SLOT_FRACS  = [0.00, 0.27, 0.50, 0.68, 0.82];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);      ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

function _hexRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── EffectsEngine ────────────────────────────────────────────────────────────

class EffectsEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext("2d");

    this.particles  = [];
    this.floaters   = [];
    this.pianoGlow  = {};
    this.bgFlash    = 0;
    this.errorFlash = 0;

    // Active falling tile (queue[0])
    this.fallingTile = null; // {notes, key, startTime, duration, hit, hitTime}

    // Upcoming event queue [{key, notes}, …] — index 0 = current, 1-4 = preview
    this.queue = [];

    this.combo       = 0;
    this.layer       = 0;
    this.layerBanner = null; // {text, hue, alpha, ticks}

    // Which key to press now / next (used for keyboard highlight)
    this.nextKey  = null;
    this.nextKey2 = null;

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

  // Called by game._reschedule() with the next ~5 events
  setQueue(queue) {
    this.queue = queue || [];
  }

  scheduleFalling(notes, durationMs, key) {
    if (this.fallingTile && !this.fallingTile.hit) return;
    this.fallingTile = {
      notes,
      key,
      startTime: performance.now(),
      duration: Math.max(150, durationMs),
      hit: false,
      hitTime: null,
    };
  }

  setNextKeys(k1, k2) {
    this.nextKey  = k1 || null;
    this.nextKey2 = k2 || null;
  }

  flashError() {
    this.errorFlash = 1;
  }

  showRating(text) {
    this.floaters.push({
      text,
      x: this.canvas.width / 2,
      y: this._hitZoneY() - 44,
      alpha: 1,
      vy: -1.8,
      decay: 0.026,
      hue: text === "PERFECT" ? 45 : 190,
      size: 30,
    });
  }

  trigger(notes) {
    if (!notes || notes.length === 0) return;

    if (this.fallingTile && !this.fallingTile.hit) {
      this.fallingTile.hit     = true;
      this.fallingTile.hitTime = performance.now();
    }

    const cx   = this.canvas.width / 2;
    const hitY = this._hitZoneY();

    notes.forEach((note) => {
      const kx = pianoNoteX(note, this.canvas.width) ?? cx;
      this._burst(kx, hitY, noteHue(note));
      this.pianoGlow[note] = 1.0;
    });

    this.bgFlash = 0.12;
  }

  setLayer(newLayer, combo, wasManual) {
    const hue  = LAYER_HUES[newLayer] ?? 0;
    const text = wasManual ? LAYER_LABELS[newLayer] : "コンボ切れ...";
    this.layerBanner = { text, hue, alpha: 1.0, ticks: 110 };
    this.bgFlash = wasManual ? 0.45 : 0.12;
  }

  triggerAccomp(notes) {
    if (!notes || notes.length === 0) return;
    notes.forEach((note) => {
      this.pianoGlow[note] = Math.max(this.pianoGlow[note] ?? 0, 0.38);
    });
  }

  // ─── Layout ─────────────────────────────────────────────────────────────────

  _pianoTop()  { return this.canvas.height - PIANO_HEIGHT - 16; }

  _kbMetrics() {
    const keyW = Math.min(46, this.canvas.width * 0.052);
    const keyH = Math.round(keyW * 0.88);
    const gap  = Math.max(4, Math.round(keyW * 0.10));
    return { keyW, keyH, gap };
  }

  _kbTop() {
    const { keyH, gap } = this._kbMetrics();
    const kbH = 3 * (keyH + gap) + 30; // 3 rows + finger hint
    return this._pianoTop() - kbH - 14;
  }

  _hitZoneY() { return this._kbTop() - 26; }
  _laneTopY() { return 80; }

  _slotY(slot) {
    const hitY  = this._hitZoneY();
    const laneH = hitY - this._laneTopY();
    return hitY - SLOT_FRACS[slot] * laneH;
  }

  // Lane width at a given Y (linear taper for perspective)
  _laneWAt(y) {
    const hitY  = this._hitZoneY();
    const topY  = this._laneTopY();
    const t = Math.max(0, Math.min(1, (y - topY) / (hitY - topY)));
    return LANE_W_TOP + (LANE_W_HIT - LANE_W_TOP) * t;
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  _update() {
    this.particles = this.particles.filter((p) => {
      p.x  += p.vx;  p.y += p.vy;  p.vy += 0.22;
      p.alpha -= p.decay;
      return p.alpha > 0;
    });

    this.floaters = this.floaters.filter((f) => {
      f.y += f.vy; f.alpha -= f.decay;
      return f.alpha > 0;
    });

    Object.keys(this.pianoGlow).forEach((k) => {
      this.pianoGlow[k] -= 0.04;
      if (this.pianoGlow[k] <= 0) delete this.pianoGlow[k];
    });

    if (this.bgFlash    > 0) this.bgFlash    -= 0.01;
    if (this.errorFlash > 0) this.errorFlash -= 0.06;

    if (this.layerBanner) {
      this.layerBanner.ticks--;
      if (this.layerBanner.ticks < 40) {
        this.layerBanner.alpha -= 0.025;
        if (this.layerBanner.alpha <= 0) this.layerBanner = null;
      }
    }

    if (this.fallingTile?.hit) {
      if (performance.now() - this.fallingTile.hitTime > 520) this.fallingTile = null;
    }
  }

  _burst(x, y, hue) {
    const count = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        r: 2 + Math.random() * 3,
        hue: hue + (Math.random() - 0.5) * 40,
        alpha: 1,
        decay: 0.022 + Math.random() * 0.022,
      });
    }
  }

  // ─── Drawing ─────────────────────────────────────────────────────────────────

  _draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.bgFlash > 0) {
      ctx.fillStyle = `rgba(255,255,200,${this.bgFlash * 0.07})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (this.errorFlash > 0) {
      ctx.fillStyle = `rgba(255,50,50,${this.errorFlash * 0.15})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    this._drawLane();

    // Queue preview tiles (4 → 1, far to near)
    for (let slot = 4; slot >= 1; slot--) {
      const item = this.queue[slot];
      if (item) this._drawQueueTile(slot, item.key, item.notes, false, 0);
    }

    // Active falling tile (slot 0)
    const now = performance.now();
    if (this.fallingTile) {
      const tile = this.fallingTile;
      const progress = tile.hit ? 0 : Math.min(1, (now - tile.startTime) / tile.duration);
      this._drawQueueTile(0, tile.key, tile.notes, true, progress);
    }

    this._drawHitZone();

    // Particles
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

    // Floaters (PERFECT/GOOD ratings)
    this.floaters.forEach((f) => {
      ctx.save();
      ctx.globalAlpha = f.alpha;
      ctx.font        = `bold ${f.size ?? 24}px 'Hiragino Kaku Gothic Pro', sans-serif`;
      ctx.textAlign   = "center";
      ctx.fillStyle   = `hsl(${f.hue},80%,88%)`;
      ctx.shadowBlur  = 20;
      ctx.shadowColor = `hsl(${f.hue},80%,60%)`;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    });

    this._drawFingerKeyboard();
    drawPiano(ctx, canvas.width, canvas.height, this.pianoGlow);
    this._drawHUD();
  }

  _drawLane() {
    const { ctx, canvas } = this;
    const hitY = this._hitZoneY();
    const topY = this._laneTopY();
    const cx   = canvas.width / 2;

    // Trapezoid background
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - LANE_W_TOP / 2, topY);
    ctx.lineTo(cx + LANE_W_TOP / 2, topY);
    ctx.lineTo(cx + LANE_W_HIT / 2, hitY);
    ctx.lineTo(cx - LANE_W_HIT / 2, hitY);
    ctx.closePath();
    ctx.fillStyle = "rgba(16,12,40,0.60)";
    ctx.fill();

    // Lane border
    ctx.strokeStyle = "rgba(120,100,200,0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Horizontal guide lines (road-in-perspective feel)
    ctx.strokeStyle = "rgba(120,100,200,0.14)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      const y = topY + (hitY - topY) * t;
      const hw = this._laneWAt(y) / 2;
      ctx.globalAlpha = 0.5 + t * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - hw, y);
      ctx.lineTo(cx + hw, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _drawHitZone() {
    const { ctx, canvas } = this;
    const y  = this._hitZoneY();
    const cx = canvas.width / 2;
    const hw = LANE_W_HIT / 2 + 6;

    ctx.save();
    ctx.strokeStyle = "rgba(200,168,75,0.88)";
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 14;
    ctx.shadowColor = "rgba(200,168,75,0.55)";
    ctx.beginPath();
    ctx.moveTo(cx - hw, y);
    ctx.lineTo(cx + hw, y);
    ctx.stroke();

    ctx.shadowBlur  = 0;
    ctx.font        = "bold 9px monospace";
    ctx.fillStyle   = "rgba(200,168,75,0.55)";
    ctx.textAlign   = "center";
    ctx.fillText("HIT", cx, y - 7);
    ctx.restore();
  }

  _drawQueueTile(slot, key, notes, isActive, progress) {
    if (!key || !notes || notes.length === 0) return;
    const { ctx, canvas } = this;

    const finger = FINGER_MAP[key] ?? 4;
    const color  = FINGER_COLORS[finger];
    const cx     = canvas.width / 2;
    const hitY   = this._hitZoneY();

    const BASE_W = 130;
    const BASE_H = 46;

    let y, scale, alpha;

    if (isActive) {
      if (this.fallingTile?.hit) {
        // Hit burst: expand outward
        const elapsed = performance.now() - this.fallingTile.hitTime;
        if (elapsed > 520) return;
        const t = elapsed / 520;
        y     = hitY;
        scale = 1.0 + t * 0.6;
        alpha = Math.max(0, 1 - t * 1.8);
      } else {
        // Animate from slot1 position down to hitZone
        const slot1Y = this._slotY(1);
        y     = slot1Y + (hitY - slot1Y) * progress;
        scale = SLOT_SCALES[1] + (SLOT_SCALES[0] - SLOT_SCALES[1]) * progress;
        alpha = SLOT_ALPHAS[1] + (SLOT_ALPHAS[0] - SLOT_ALPHAS[1]) * progress;
      }
    } else {
      y     = this._slotY(slot);
      scale = SLOT_SCALES[slot];
      alpha = SLOT_ALPHAS[slot];
    }

    const w = BASE_W * scale;
    const h = BASE_H * scale;
    const r = 10 * scale;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Tile glow + fill
    ctx.shadowBlur  = isActive ? 30 : 12 * scale;
    ctx.shadowColor = color;
    ctx.fillStyle   = color;
    _roundRect(ctx, cx - w / 2, y - h, w, h, r);
    ctx.fill();

    // Inner highlight strip
    ctx.shadowBlur = 0;
    ctx.fillStyle  = "rgba(255,255,255,0.18)";
    _roundRect(ctx, cx - w / 2 + 3, y - h + 3, w - 6, h * 0.38, r * 0.6);
    ctx.fill();

    // Key letter
    const keySize = Math.max(11, Math.round(24 * scale));
    ctx.fillStyle  = "rgba(255,255,255,0.97)";
    ctx.textAlign  = "center";
    ctx.font       = `bold ${keySize}px monospace`;
    ctx.fillText(key, cx, y - h / 2 + keySize * 0.38);

    // Note label (JP) — only when large enough
    if (scale > 0.48) {
      const noteSize = Math.max(7, Math.round(11 * scale));
      ctx.fillStyle  = "rgba(255,255,255,0.65)";
      ctx.font       = `${noteSize}px 'Hiragino Kaku Gothic Pro', monospace`;
      ctx.fillText(noteLabel(notes[0]), cx, y - h / 2 + keySize * 0.38 + noteSize + 4);
    }

    ctx.restore();
  }

  _drawFingerKeyboard() {
    const { ctx, canvas } = this;
    const { keyW, keyH, gap } = this._kbMetrics();
    const unit   = keyW + gap;
    const kbTop  = this._kbTop();
    const nextKey = this.nextKey;
    const next2   = this.nextKey2;

    ctx.save();
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";

    KB_ROWS.forEach((row, r) => {
      const offset = KB_ROW_STAGGER[r] * unit;
      const startX = (canvas.width - (10 * unit - gap)) / 2 + offset;
      const y      = kbTop + r * (keyH + gap);

      row.forEach((k, i) => {
        const x      = startX + i * unit;
        const finger = FINGER_MAP[k] ?? 4;
        const color  = FINGER_COLORS[finger];
        const isNext  = k === nextKey;
        const isNext2 = k === next2;

        ctx.save();
        _roundRect(ctx, x, y, keyW, keyH, 6);

        if (isNext) {
          // Active key: full finger color + bright glow
          ctx.shadowBlur  = 22;
          ctx.shadowColor = color;
          ctx.fillStyle   = color;
          ctx.fill();
          ctx.shadowBlur = 0;
          // Inner highlight
          ctx.fillStyle  = "rgba(255,255,255,0.22)";
          _roundRect(ctx, x + 2, y + 2, keyW - 4, keyH * 0.4, 4);
          ctx.fill();
          ctx.fillStyle  = "rgba(255,255,255,0.97)";
        } else if (isNext2) {
          // Next key: dim tint
          ctx.fillStyle = _hexRgba(color, 0.25);
          ctx.fill();
          ctx.strokeStyle = _hexRgba(color, 0.55);
          ctx.lineWidth   = 1.5;
          ctx.stroke();
          ctx.fillStyle = _hexRgba(color, 0.75);
        } else {
          // Rest: very faint tint of finger color
          ctx.fillStyle = _hexRgba(color, 0.10);
          ctx.fill();
          ctx.strokeStyle = _hexRgba(color, 0.28);
          ctx.lineWidth   = 1;
          ctx.stroke();
          ctx.fillStyle = _hexRgba(color, 0.42);
        }

        ctx.font = `bold ${Math.floor(keyW * 0.36)}px monospace`;
        ctx.fillText(k, x + keyW / 2, y + keyH / 2 + 1);
        ctx.restore();
      });
    });

    // Finger hint label below the keyboard
    if (nextKey) {
      const finger = FINGER_MAP[nextKey] ?? 4;
      const color  = FINGER_COLORS[finger];
      const jp     = FINGER_JP[finger];
      const labelY = kbTop + 3 * (keyH + gap) + 18;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = color;
      ctx.fillStyle   = color;
      ctx.font        = `bold 13px 'Hiragino Kaku Gothic Pro', sans-serif`;
      ctx.textAlign   = "center";
      ctx.fillText(`[${nextKey}] ← ${jp}`, canvas.width / 2, labelY);
    }

    ctx.restore();
  }

  _drawHUD() {
    const { ctx, canvas } = this;

    // COMBO — top-center, large number
    if (this.combo > 0) {
      const hue      = this.layer >= 2 ? 45 : this.layer >= 1 ? 200 : 280;
      const numSize  = Math.min(54, 32 + Math.floor(this.combo * 0.25));
      ctx.save();
      ctx.textAlign = "center";
      ctx.font        = `bold ${numSize}px monospace`;
      ctx.fillStyle   = `hsl(${hue},85%,82%)`;
      ctx.shadowBlur  = 20;
      ctx.shadowColor = `hsl(${hue},85%,55%)`;
      ctx.fillText(this.combo, canvas.width / 2, 54);
      ctx.shadowBlur  = 0;
      ctx.font        = "10px monospace";
      ctx.fillStyle   = `hsl(${hue},60%,62%)`;
      ctx.fillText("COMBO", canvas.width / 2, 68);
      ctx.restore();
    }

    // Layer dots — top-right
    const dotR = 6;
    const dotSp = dotR * 2 + 8;
    const dotBaseX = canvas.width - 20 - dotR;
    const dotY    = 28;
    for (let i = 0; i < 3; i++) {
      const x   = dotBaseX - (2 - i) * dotSp;
      const hue = LAYER_HUES[i + 1] ?? 0;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, dotY, dotR, 0, Math.PI * 2);
      if (i < this.layer) {
        ctx.shadowBlur  = 14;
        ctx.shadowColor = `hsl(${hue},90%,65%)`;
        ctx.fillStyle   = `hsl(${hue},85%,65%)`;
        ctx.fill();
      } else {
        ctx.strokeStyle = "rgba(180,180,180,0.28)";
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Layer banner — centred, fades out
    if (this.layerBanner) {
      const b = this.layerBanner;
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.textAlign   = "center";
      ctx.font        = "bold 38px 'Hiragino Kaku Gothic Pro', sans-serif";
      ctx.fillStyle   = `hsl(${b.hue},85%,82%)`;
      ctx.shadowBlur  = 50;
      ctx.shadowColor = `hsl(${b.hue},85%,55%)`;
      ctx.fillText(b.text, canvas.width / 2, canvas.height * 0.30);
      ctx.restore();
    }
  }

  _loop() {
    this._update();
    this._draw();
    if (this._running) this._raf = requestAnimationFrame(() => this._loop());
  }
}

// ─── Piano keyboard ───────────────────────────────────────────────────────────

function pianoNoteX(noteStr, canvasWidth) {
  const letter  = noteStr.match(/[A-G]/)?.[0];
  if (!letter) return null;
  const octave  = parseInt(noteStr.match(/\d+/)?.[0] ?? "4");
  const isSharp = noteStr.includes("#") || noteStr.includes("s") || noteStr.includes("x");

  const totalWhite   = PIANO_OCTAVES * 7;
  const keyW         = Math.min(38, (canvasWidth * 0.9) / totalWhite);
  const startX       = (canvasWidth - totalWhite * keyW) / 2;
  const octaveOffset = octave - PIANO_START_OCTAVE;
  if (octaveOffset < 0 || octaveOffset >= PIANO_OCTAVES) return null;

  const wIdx = WHITE_NOTES.indexOf(letter);
  if (wIdx === -1) return null;

  const baseX = startX + (octaveOffset * 7 + wIdx) * keyW;
  return isSharp ? baseX + keyW : baseX + keyW / 2;
}

function drawPiano(ctx, width, height, glow) {
  const totalWhite = PIANO_OCTAVES * 7;
  const keyW   = Math.min(38, (width * 0.9) / totalWhite);
  const whiteH = PIANO_HEIGHT;
  const blackH = whiteH * 0.62;
  const blackW = keyW * 0.6;
  const startX = (width - totalWhite * keyW) / 2;
  const startY = height - whiteH - 16;

  // White keys
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

  // Black keys
  for (let o = 0; o < PIANO_OCTAVES; o++) {
    for (let i = 0; i < 7; i++) {
      if (!HAS_BLACK_RIGHT[i]) continue;
      const noteStr = WHITE_NOTES[i] + "#" + (PIANO_START_OCTAVE + o);
      const g = glow[noteStr] ?? 0;
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
