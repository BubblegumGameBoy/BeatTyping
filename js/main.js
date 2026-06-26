let audioEngine   = null;
let effectsEngine = null;
let game          = null;
let currentSong   = null;
let selectedMode  = "note";  // "note" | "word" — chosen on the title screen

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

// ─── Song list ────────────────────────────────────────────────────────────────
function buildSongList() {
  const list = document.getElementById("song-list");
  list.innerHTML = "";
  SONGS.filter(s => !s.id.startsWith("_")).forEach(song => {
    const levelClass = song.level === 0 ? "tutorial" : song.level === 1 ? "beginner" : "advanced";
    const levelText  = song.level === 0 ? "練習" : song.level === 1 ? "初級" : "上級";
    const desc = song.level === 0
      ? "ホームポジションを覚えよう"
      : song.level === 1
      ? "ホームポジションで弾けます"
      : "テンポが速め・応用向け";

    const card = document.createElement("div");
    card.className = "song-card";
    card.innerHTML = `
      <div class="song-card-top">
        <span class="song-card-title">${song.title}</span>
        <span class="level-badge ${levelClass}">${levelText}</span>
      </div>
      <span class="song-card-composer">${song.composer}</span>
      <span class="song-card-desc">${desc}</span>
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

  // Tutorial songs are finger-position training — always note-mode.
  const mode = song.tutorial ? "note" : selectedMode;
  game.load(song, mode);

  // Word-mode shows the DOM typing area; note-mode shows the falling-tile canvas.
  const typingArea = document.getElementById("typing-area");
  const wordMode = mode === "word";
  typingArea.style.display = wordMode ? "flex" : "none";
  if (wordMode) typingArea.innerHTML = "";
  document.getElementById("play-screen").classList.toggle("word-mode", wordMode);

  if (game.onHint) {
    game.onHint(
      song.tutorial ? "準備OK！最初のタイルを待ってね"
      : wordMode    ? "単語をローマ字で入力しよう（押すまで待つよ）"
      : null
    );
  }
  document.getElementById("song-name-display").textContent =
    `${song.title}  ／  ${song.composer}`;
  document.getElementById("bpm-display").textContent = game.bpm;
  setProgress(0);

  showScreen("play-screen");
  if (song.tutorial) {
    setTimeout(() => {
      document.getElementById("homepos-overlay").classList.add("active");
    }, 400);
  } else {
    setTimeout(() => game.start(), 400);
  }
}

// ─── Word-mode typing display ───────────────────────────────────────────────
//  state = { units:[{kana,romaji,startNote,len}], idx, typed }
function renderWordState(state) {
  const area = document.getElementById("typing-area");
  if (!area || !state) return;
  const { units, idx, typed } = state;
  const cur = units[idx];

  // Current word: kana headline + per-letter romaji (done / current / rest)
  let romaji = "";
  for (let i = 0; i < cur.romaji.length; i++) {
    const cls = i < typed ? "tc-done" : i === typed ? "tc-cur" : "tc-rest";
    romaji += `<span class="${cls}">${cur.romaji[i].toUpperCase()}</span>`;
  }

  // Upcoming words (kana only) as a preview queue
  let nexts = "";
  for (let j = idx + 1; j < Math.min(idx + 5, units.length); j++) {
    nexts += `<span class="nw">${units[j].kana}</span>`;
  }

  area.innerHTML =
    `<div class="word-current">` +
      `<div class="word-kana">${cur.kana}</div>` +
      `<div class="word-romaji">${romaji}</div>` +
    `</div>` +
    `<div class="word-next">${nexts}</div>`;
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
  game.onComplete = showComplete;

  // Tutorial hint text in the footer
  const keyHintEl = document.querySelector(".key-hint");
  const DEFAULT_HINT = keyHintEl ? keyHintEl.textContent : "";
  game.onHint = (text) => {
    if (!keyHintEl) return;
    keyHintEl.textContent = text || DEFAULT_HINT;
    keyHintEl.classList.toggle("tutorial-hint", !!text);
  };

  // Word-mode typing display
  game.onWordState = renderWordState;

  buildSongList();

  // Mode toggle (note / word)
  document.querySelectorAll(".mode-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedMode = btn.dataset.mode;
      document.querySelectorAll(".mode-opt").forEach((b) =>
        b.classList.toggle("active", b === btn)
      );
    });
  });

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

  document.getElementById("homepos-start-btn").addEventListener("click", () => {
    document.getElementById("homepos-overlay").classList.remove("active");
    game.start();
  });

  document.getElementById("back-btn").addEventListener("click", () => {
    game.stop();
    document.getElementById("homepos-overlay").classList.remove("active");
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
