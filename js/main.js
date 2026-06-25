let audioEngine   = null;
let effectsEngine = null;
let game          = null;
let currentSong   = null;

// ─── Screen helpers ───────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function showLoading(msg) {
  document.getElementById("loading-msg").textContent = msg;
  document.getElementById("loading-overlay").classList.add("active");
}
function hideLoading() {
  document.getElementById("loading-overlay").classList.remove("active");
}

// ─── Typing text display ──────────────────────────────────────────────────────
function renderTypingText(text, absoluteCursor) {
  const el = document.getElementById("typing-text");
  if (!el || !text) return;

  const len = text.length;
  const pos = absoluteCursor % len;         // position within the current loop
  const loopNum = Math.floor(absoluteCursor / len);

  // Show a window of ~60 chars centered on cursor
  const WINDOW = 60;
  const half = Math.floor(WINDOW / 2);
  let start = pos - half;
  let adjustedPos = half;
  if (start < 0) { adjustedPos = pos; start = 0; }

  // Build repeated text so we can show seamless looping
  const repeated = (loopNum > 0 ? text + " " : "") + text + " " + text;
  const offset    = loopNum > 0 ? text.length + 1 : 0;
  const absPos    = offset + pos;
  const winStart  = Math.max(0, absPos - half);
  const winEnd    = winStart + WINDOW;
  const slice     = repeated.slice(winStart, winEnd);
  const cursorIdx = absPos - winStart;

  el.innerHTML = slice.split("").map((ch, i) => {
    const c = ch === " " ? "&nbsp;" : ch;
    if (i < cursorIdx)  return `<span class="ch-typed">${c}</span>`;
    if (i === cursorIdx) return `<span class="ch-cursor">${c}</span>`;
    return `<span class="ch-wait">${c}</span>`;
  }).join("");
}

// ─── Song list ────────────────────────────────────────────────────────────────
function buildSongList() {
  const list = document.getElementById("song-list");
  list.innerHTML = "";
  SONGS.forEach(song => {
    const card = document.createElement("div");
    card.className = "song-card";
    card.innerHTML = `
      <span class="song-card-title">${song.title}</span>
      <span class="song-card-composer">${song.composer}</span>
      <span class="song-card-events">${song.events.length} ステップ</span>
    `;
    card.addEventListener("click", () => selectSong(song));
    list.appendChild(card);
  });
}

// ─── Song selection ───────────────────────────────────────────────────────────
async function selectSong(song) {
  currentSong = song;

  if (!audioEngine.isReady()) {
    showLoading("ピアノ音源を読み込み中…");
    try { await audioEngine.init(); } catch(e) { console.error(e); }
    hideLoading();
  }

  game.load(song);
  document.getElementById("song-name-display").textContent =
    `${song.title}  ／  ${song.composer}`;
  document.getElementById("bpm-display").textContent = game.bpm;
  setProgress(0);
  renderTypingText(song.typingText || "", 0);

  showScreen("play-screen");
  setTimeout(() => game.start(), 400);
}

// ─── Progress ─────────────────────────────────────────────────────────────────
function setProgress(ratio) {
  const pct = Math.round(ratio * 100);
  document.getElementById("progress-bar").style.width = pct + "%";
  document.getElementById("progress-text").textContent = pct + "%";
}

// ─── Complete ─────────────────────────────────────────────────────────────────
function showComplete() {
  document.getElementById("complete-song-name").textContent =
    currentSong ? currentSong.title : "";
  showScreen("complete-screen");
}

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  audioEngine   = new AudioEngine();
  const canvas  = document.getElementById("effect-canvas");
  effectsEngine = new EffectsEngine(canvas);
  game          = new Game(audioEngine, effectsEngine);

  game.onProgress = setProgress;
  game.onKeypress = (cur) => renderTypingText(currentSong?.typingText || "", cur);
  game.onComplete = showComplete;

  buildSongList();

  // BPM controls
  const bpmDisplay = document.getElementById("bpm-display");
  game.onBpmChange = (bpm) => { bpmDisplay.textContent = bpm; };

  document.getElementById("bpm-down").addEventListener("click", (e) => {
    e.stopPropagation();
    game.setBpm(game.bpm - 5);
  });
  document.getElementById("bpm-up").addEventListener("click", (e) => {
    e.stopPropagation();
    game.setBpm(game.bpm + 5);
  });

  // Beat pulse on effects canvas
  game.onBeat = () => effectsEngine.pulse();

  document.getElementById("back-btn").addEventListener("click", () => {
    game.stop();
    showScreen("title-screen");
    effectsEngine.start();
  });
  document.getElementById("replay-btn").addEventListener("click", () => {
    if (currentSong) { selectSong(currentSong); effectsEngine.start(); }
  });
  document.getElementById("select-btn").addEventListener("click", () => {
    showScreen("title-screen");
    effectsEngine.start();
  });

  effectsEngine.start();
  showScreen("title-screen");
});
