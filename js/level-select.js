// ============================================================
// LEVEL SELECT — persistent stage progress + the 5x5 stage-picker
// screen. Load this script AFTER levels.js (it reads WORLD.sections)
// and BEFORE main.js (main.js calls into Progress / showLevelSelect).
// ============================================================

const SAVE_KEY = "tactic_progress_v1";
const LEVEL_COUNT = 3; // total main levels in the finished game
const STAGES_PER_LEVEL = 5;

// ---------- Persistent save data ----------
// Shape: { unlocked: ["0-0", ...], completed: ["0-0", ...] }
// Keys are "levelIndex-stageIndex", both 0-based, so row 0 / col 0 is
// L1-1 in the UI.
const Progress = {
  data: null,

  load() {
    if (this.data) return this.data;
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    } catch (e) {
      saved = null;
    }
    if (
      !saved ||
      !Array.isArray(saved.unlocked) ||
      !Array.isArray(saved.completed)
    ) {
      // Fresh save: only the very first checkpoint is available.
      saved = { unlocked: ["0-0"], completed: [] };
    }
    this.data = saved;
    return this.data;
  },

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      // Storage unavailable (private browsing, quota, etc). Progress
      // just won't persist across reloads — the game still runs fine
      // for the current session.
    }
  },

  key(levelIdx, stageIdx) {
    return `${levelIdx}-${stageIdx}`;
  },

  isUnlocked(levelIdx, stageIdx) {
    this.load();
    return this.data.unlocked.includes(this.key(levelIdx, stageIdx));
  },

  isCompleted(levelIdx, stageIdx) {
    this.load();
    return this.data.completed.includes(this.key(levelIdx, stageIdx));
  },

  unlock(levelIdx, stageIdx) {
    this.load();
    const k = this.key(levelIdx, stageIdx);
    if (!this.data.unlocked.includes(k)) this.data.unlocked.push(k);
    this.save();
  },

  // Marks a stage completed and unlocks the next stage within the same
  // level (if there is one). Rolling over into the *next level* is
  // handled separately by bridgeUnbuiltLevels() below, since that needs
  // to skip past any level that isn't built yet (e.g. Level 2, still in
  // progress) rather than always assuming levelIdx + 1 is playable.
  completeStage(levelIdx, stageIdx) {
    this.load();
    const k = this.key(levelIdx, stageIdx);
    if (!this.data.completed.includes(k)) this.data.completed.push(k);
    if (!this.data.unlocked.includes(k)) this.data.unlocked.push(k);

    const nextStage = stageIdx + 1;
    if (nextStage < STAGES_PER_LEVEL) {
      this.unlock(levelIdx, nextStage);
    }

    this.save();

    // Open up whichever level is next in line to actually play.
    bridgeUnbuiltLevels();
  },

  // Not wired to any button by default, but handy to have for a future
  // "reset save" option.
  reset() {
    this.data = { unlocked: ["0-0"], completed: [] };
    this.save();
  },
};

// ---------- World-side helpers ----------
// Finds the mailbox object for a given level/stage so we know exactly
// where it sits in world space. Returns undefined for stages that
// haven't been built yet.
function findMailbox(levelIdx, stageIdx) {
  return world.mailboxes.find(
    (mb) => mb.levelIndex === levelIdx && mb.stageIndex === stageIdx,
  );
}

// Whether a specific stage (not just its level) actually exists in the
// built WORLD. Levels can be partially built — e.g. Level 3 currently
// only has stages 0-2 — so this checks WORLD.sections directly rather
// than trusting builtLevelIndices, which is level-granularity only.
function isStageBuilt(levelIdx, stageIdx) {
  return WORLD.sections.some(
    (s) => s.levelIndex === levelIdx && s.stageIndex === stageIdx,
  );
}

// Whenever a level's final stage is completed, this makes sure the
// *next playable* level gets unlocked — skipping over any level that
// isn't built yet (e.g. Level 2, still being worked on by another team)
// so finishing Level 1 opens Level 3 instead of dead-ending on a level
// nobody can enter. Safe to call any time: it only ever adds unlocks,
// never removes them, so it's idempotent and also self-heals older save
// data that unlocked an unbuilt level under the old logic. Once Level 2
// (or any skipped level) actually gets built, this automatically routes
// through it again in the correct order on the next call — no changes
// needed here when that happens.
function bridgeUnbuiltLevels() {
  Progress.load();
  const lastStage = STAGES_PER_LEVEL - 1;

  for (let levelIdx = 0; levelIdx < LEVEL_COUNT - 1; levelIdx++) {
    if (!isStageBuilt(levelIdx, lastStage)) continue;
    if (!Progress.isCompleted(levelIdx, lastStage)) continue;

    for (let nextLevel = levelIdx + 1; nextLevel < LEVEL_COUNT; nextLevel++) {
      if (isStageBuilt(nextLevel, 0)) {
        Progress.unlock(nextLevel, 0);
        break;
      }
    }
  }
}

// Where should the player appear if they jump straight into this stage
// from the menu? Stage 0 of a level starts at that level's first
// section's spawn point; any later stage starts right where the
// previous stage's mailbox was (mirroring how respawning at a
// checkpoint already works).
function getStageEntryPoint(levelIdx, stageIdx) {
  if (stageIdx === 0) {
    const firstSection = WORLD.sections.find(
      (s) => s.levelIndex === levelIdx && s.stageIndex === 0,
    );
    return firstSection ? firstSection.spawn : WORLD.spawn;
  }
  const prevMb = findMailbox(levelIdx, stageIdx - 1);
  if (!prevMb) return WORLD.spawn;
  return {
    x: prevMb.x,
    y: prevMb.y !== undefined ? prevMb.y : world.def.groundY - prevMb.height,
  };
}

// Keeps each mailbox's `.activated` flag (used for the green "already
// hit this checkpoint" glow, and to stop it re-triggering) in sync with
// the saved Progress. Call this any time the world is (re)built or the
// player jumps to a stage via the menu.
function syncMailboxActivationFromProgress() {
  for (const mb of world.mailboxes) {
    mb.activated = Progress.isCompleted(mb.levelIndex, mb.stageIndex);
  }
}

// Jumps straight into a specific stage, as if the player had just hit
// the checkpoint before it. Reuses respawnPlayer()'s existing hazard
// resets (traps, moving platforms, the blink cycle, ducks/bubbles/NPCs)
// so nothing carries over strangely from wherever the player was before.
function startStage(levelIdx, stageIdx) {
  playGameplayMusic();
  checkpoint = getStageEntryPoint(levelIdx, stageIdx);
  respawnPlayer();
  syncMailboxActivationFromProgress();
  hideLevelSelect();
}

// ---------- The 5x5 grid overlay ----------
// Built as its own element (rather than reusing the existing #overlay
// div) since it needs a grid of 25 buttons, which the existing
// single-message overlay wasn't designed for. Its look (background art,
// button images, responsive sizing) lives in style.css.
let levelSelectEl = null;

function buildLevelSelectDOM() {
  const root = document.createElement("div");
  root.id = "level-select-overlay";
  // Styling (background image, sizing, layout) all lives in style.css so
  // it scales with #game-container the same way the rest of the UI does.

  const heading = document.createElement("h1");
  heading.textContent = "Level Select";
  root.appendChild(heading);

  const grid = document.createElement("div");
  grid.id = "level-select-grid";
  root.appendChild(grid);

  const backBtn = document.createElement("button");
  backBtn.id = "level-select-back-btn";
  backBtn.className = "menu-btn";
  backBtn.textContent = "Back";
  backBtn.addEventListener("click", () => {
    playButtonSound();
    playMenuMusic();
    hideLevelSelect();
    // Back to the main menu. This resets the in-progress run's live
    // state (world, camera, player position) — saved Progress is
    // untouched, so completed/unlocked stages are unaffected.
    loadWorld();
    showStartOverlay();
  });
  root.appendChild(backBtn);

  // Attached inside #game-container (not document.body) so it shares the
  // same container-query context as the rest of the game UI and never
  // exceeds the visible game area at any screen size.
  document.getElementById("game-container").appendChild(root);
  return { root, grid };
}

function stageButtonLabel(levelIdx, stageIdx) {
  return `L${levelIdx + 1}-${stageIdx + 1}`;
}

// Rebuilds all 25 cells from the current saved progress. Cheap enough
// to just rebuild in full every time the screen is opened.
function refreshLevelSelectGrid(grid) {
  // Self-heals any save data that predates bridgeUnbuiltLevels() (e.g. a
  // save that unlocked Level 2 under the old always-unlock-levelIdx+1
  // logic, back before Level 2 existed) so returning players see Level 3
  // unlocked immediately, without needing to re-complete Level 1.
  bridgeUnbuiltLevels();

  grid.innerHTML = "";

  for (let levelIdx = 0; levelIdx < LEVEL_COUNT; levelIdx++) {
    for (let stageIdx = 0; stageIdx < STAGES_PER_LEVEL; stageIdx++) {
      const btn = document.createElement("button");
      btn.textContent = stageButtonLabel(levelIdx, stageIdx);
      btn.dataset.level = levelIdx;
      btn.dataset.stage = stageIdx;

      // Per-stage build check — a level can be partially built (e.g.
      // Level 3 currently only has stages 0-2), so stages 3/4 of a
      // partially-built level stay locked even though earlier stages in
      // that same level are playable today.
      const built = isStageBuilt(levelIdx, stageIdx);

      const completed = built && Progress.isCompleted(levelIdx, stageIdx);
      const unlocked = built && Progress.isUnlocked(levelIdx, stageIdx);

      // Every stage cell uses the same levelbox.png art (see
      // .level-stage-btn in style.css); state is communicated with a
      // class instead of swapping in flat colors.
      btn.className = "level-stage-btn";
      if (completed) {
        // Completed: gold glow so progress reads at a glance.
        btn.classList.add("completed");
      } else if (unlocked) {
        // Unlocked but not yet completed: normal selectable button.
        btn.classList.add("unlocked");
      } else {
        // Locked (or just not built yet): dimmed/greyed out and disabled.
        btn.classList.add("locked");
        btn.disabled = true;
      }

      if (unlocked) {
        btn.addEventListener("click", () => {
          playButtonSound();
          startStage(levelIdx, stageIdx);
        });
      }

      grid.appendChild(btn);
    }
  }
}

function showLevelSelect() {
  if (!levelSelectEl) levelSelectEl = buildLevelSelectDOM();
  refreshLevelSelectGrid(levelSelectEl.grid);
  levelSelectEl.root.style.display = "flex";
  // Make sure the regular title/pause overlay is out of the way.
  overlay.classList.add("hidden");
  isPaused = false;
}

function hideLevelSelect() {
  if (levelSelectEl) levelSelectEl.root.style.display = "none";
}
