const NOTE_NAMES_JP = {
  C: "ド", D: "レ", E: "ミ", F: "ファ", G: "ソ", A: "ラ", B: "シ",
};

// Map a note string (e.g. "C#4") to a hue (0-360)
function noteHue(noteStr) {
  const CHROMATIC = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const letter = noteStr.replace(/[0-9#b]/g, "").replace("##", "").replace("bb", "").replace("x", "");
  const sharp = noteStr.includes("#") || noteStr.includes("s");
  const flat  = noteStr.includes("b") && !noteStr.includes("B");
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
    this.floaters = [];   // floating note label displays
    this.pianoGlow = {}; // note → glow intensity [0,1]
    this.bgFlash = 0;    // background flash intensity

    this._running = false;
    this._raf = null;

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
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

  // Called on each keypress with the notes array
  trigger(notes) {
    if (!notes || notes.length === 0) return;

    const cx = this.canvas.width / 2;
    const pianoY = this.canvas.height - PIANO_HEIGHT - 20;

    // Determine piano key x positions for each note so particles burst from there
    notes.forEach((note) => {
      const kx = pianoNoteX(note, this.canvas.width) ?? cx;
      this._burst(kx, pianoY, noteHue(note));
      this.pianoGlow[note] = 1.0;
    });

    // Floating note label
    const label = notes.map(noteLabel).join(" ");
    this.floaters.push({
      text: label,
      x: cx + (Math.random() - 0.5) * 200,
      y: this.canvas.height * 0.55,
      alpha: 1,
      vy: -1.2,
      decay: 0.016,
      hue: noteHue(notes[0]),
    });

    this.bgFlash = 0.15;
  }

  _burst(x, y, hue) {
    const count = 18 + Math.floor(Math.random() * 12);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        r: 2 + Math.random() * 3,
        hue: hue + (Math.random() - 0.5) * 40,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.025,
      });
    }
  }

  _update() {
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.alpha -= p.decay;
      return p.alpha > 0;
    });

    this.floaters = this.floaters.filter((f) => {
      f.y += f.vy;
      f.alpha -= f.decay;
      return f.alpha > 0;
    });

    Object.keys(this.pianoGlow).forEach((k) => {
      this.pianoGlow[k] -= 0.04;
      if (this.pianoGlow[k] <= 0) delete this.pianoGlow[k];
    });

    if (this.bgFlash > 0) this.bgFlash -= 0.01;
  }

  _draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background flash
    if (this.bgFlash > 0) {
      ctx.fillStyle = `rgba(255,255,200,${this.bgFlash * 0.07})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Particles
    this.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = `hsl(${p.hue},90%,70%)`;
      ctx.shadowBlur = 6;
      ctx.shadowColor = `hsl(${p.hue},90%,70%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Floating note labels
    this.floaters.forEach((f) => {
      ctx.save();
      ctx.globalAlpha = f.alpha;
      ctx.font = "bold 32px 'Hiragino Kaku Gothic Pro', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = `hsl(${f.hue},80%,85%)`;
      ctx.shadowBlur = 20;
      ctx.shadowColor = `hsl(${f.hue},80%,60%)`;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    });

    // Piano keyboard
    drawPiano(ctx, canvas.width, canvas.height, this.pianoGlow);
  }

  _loop() {
    this._update();
    this._draw();
    if (this._running) {
      this._raf = requestAnimationFrame(() => this._loop());
    }
  }
}

// ─── Piano keyboard drawing ───────────────────────────────────────────────────

const PIANO_HEIGHT = 110;
const PIANO_OCTAVES = 5;       // C2 – B6
const PIANO_START_OCTAVE = 2;
const WHITE_NOTES = ["C","D","E","F","G","A","B"];
// Which positions (0-6) have a black key to the right
const HAS_BLACK_RIGHT = [true, true, false, true, true, true, false];

// Returns the x centre of a piano key for a given note string, or null
function pianoNoteX(noteStr, canvasWidth) {
  const letter = noteStr.match(/[A-G]/)?.[0];
  if (!letter) return null;
  const octave = parseInt(noteStr.match(/\d+/)?.[0] ?? "4");
  const isSharp = noteStr.includes("#") || noteStr.includes("s") || noteStr.includes("x");
  const isFlat  = noteStr.includes("b") && !noteStr.startsWith("B");

  const totalWhite = PIANO_OCTAVES * 7;
  const keyW = Math.min(38, (canvasWidth * 0.9) / totalWhite);
  const startX = (canvasWidth - totalWhite * keyW) / 2;
  const octaveOffset = octave - PIANO_START_OCTAVE;
  if (octaveOffset < 0 || octaveOffset >= PIANO_OCTAVES) return null;

  const wIdx = WHITE_NOTES.indexOf(letter);
  if (wIdx === -1) return null;

  const baseX = startX + (octaveOffset * 7 + wIdx) * keyW;

  if (!isSharp && !isFlat) {
    return baseX + keyW / 2;
  }
  // Black key sits between two whites
  return baseX + keyW;
}

function drawPiano(ctx, width, height, glow) {
  const totalWhite = PIANO_OCTAVES * 7;
  const keyW = Math.min(38, (width * 0.9) / totalWhite);
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
        ctx.shadowBlur = 18;
        ctx.shadowColor = `hsl(${noteHue(noteStr)},90%,70%)`;
        ctx.fillStyle = `hsl(${noteHue(noteStr)},80%,${70 + g * 25}%)`;
      } else {
        ctx.fillStyle = "rgba(230,230,230,0.92)";
      }
      ctx.fillRect(x + 1, startY, keyW - 2, whiteH);
      ctx.strokeStyle = "rgba(80,80,80,0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, startY, keyW - 2, whiteH);
      ctx.restore();
    }
  }

  // Black keys (drawn after so they appear on top)
  for (let o = 0; o < PIANO_OCTAVES; o++) {
    for (let i = 0; i < 7; i++) {
      if (!HAS_BLACK_RIGHT[i]) continue;

      // The black key between white[i] and white[i+1]
      const sharpLetter = WHITE_NOTES[i] + "#";
      const flatLetter  = WHITE_NOTES[(i + 1) % 7] + "b";
      const noteStr = sharpLetter + (PIANO_START_OCTAVE + o);
      const flatStr  = flatLetter  + (PIANO_START_OCTAVE + o + (i === 6 ? 1 : 0));

      const gSharp = glow[noteStr] ?? 0;
      const gFlat  = glow[flatStr]  ?? 0;
      const g = Math.max(gSharp, gFlat);

      const x = startX + (o * 7 + i) * keyW + keyW - blackW / 2;
      ctx.save();
      if (g > 0) {
        ctx.shadowBlur = 16;
        ctx.shadowColor = `hsl(${noteHue(noteStr)},90%,70%)`;
        ctx.fillStyle = `hsl(${noteHue(noteStr)},80%,${30 + g * 50}%)`;
      } else {
        ctx.fillStyle = "rgba(25,25,25,0.95)";
      }
      ctx.fillRect(x, startY, blackW, blackH);
      ctx.restore();
    }
  }
}
