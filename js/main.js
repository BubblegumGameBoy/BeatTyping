// ─── Globals ──────────────────────────────────────────────────────────────────
let audioEngine   = null;
let effectsEngine = null;
let game          = null;
let currentSong   = null;

// ─── Screen helpers ───────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ─── Loading overlay ─────────────────────────────────────────────────────────
function showLoading(msg) {
  document.getElementById("loading-msg").textContent = msg;
  document.getElementById("loading-overlay").classList.add("active");
}

function hideLoading() {
  document.getElementById("loading-overlay").classList.remove("active");
}

// ─── Title screen ─────────────────────────────────────────────────────────────
function buildSongList() {
  const list = document.getElementById("song-list");
  list.innerHTML = "";
  SONGS.forEach((song) => {
    const card = document.createElement("div");
    card.className = "song-card";
    card.innerHTML = `
      <span class="song-card-title">${song.title}</span>
      <span class="song-card-composer">${song.composer}</span>
      <span class="song-card-events">${song.events.length} イベント</span>
    `;
    card.addEventListener("click", () => selectSong(song));
    list.appendChild(card);
  });
}

// ─── Song selection ───────────────────────────────────────────────────────────
async function selectSong(song) {
  currentSong = song;

  // First interaction → init audio
  if (!audioEngine.isReady()) {
    showLoading("ピアノ音源を読み込み中…");
    try {
      await audioEngine.init();
    } catch (err) {
      console.error(err);
    }
    hideLoading();
  }

  game.load(song);

  document.getElementById("song-name-display").textContent =
    `${song.title}  ／  ${song.composer}`;
  setProgress(0);

  showScreen("play-screen");

  // Small delay then start – gives user a moment to read the screen
  setTimeout(() => {
    game.start();
  }, 400);
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function setProgress(ratio) {
  const pct = Math.round(ratio * 100);
  document.getElementById("progress-bar").style.width = pct + "%";
  document.getElementById("progress-text").textContent = pct + "%";
}

// ─── Complete screen ──────────────────────────────────────────────────────────
function showComplete() {
  document.getElementById("complete-song-name").textContent =
    currentSong ? currentSong.title : "";
  showScreen("complete-screen");
  effectsEngine.stop();
}

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  // Audio engine
  audioEngine = new AudioEngine();

  // Effects engine (canvas)
  const canvas = document.getElementById("effect-canvas");
  effectsEngine = new EffectsEngine(canvas);

  // Game
  game = new Game(audioEngine, effectsEngine);
  game.onProgress = setProgress;
  game.onComplete = showComplete;

  // Build song list UI
  buildSongList();

  // Back button
  document.getElementById("back-btn").addEventListener("click", () => {
    game.stop();
    effectsEngine.stop();
    showScreen("title-screen");
    effectsEngine.start();
  });

  // Complete screen buttons
  document.getElementById("replay-btn").addEventListener("click", () => {
    if (!currentSong) return;
    selectSong(currentSong);
    effectsEngine.start();
  });

  document.getElementById("select-btn").addEventListener("click", () => {
    showScreen("title-screen");
    effectsEngine.start();
  });

  // Start effects loop on title screen
  effectsEngine.start();

  // Show title screen
  showScreen("title-screen");
});
