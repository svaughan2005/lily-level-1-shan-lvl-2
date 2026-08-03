// ============================================================
// TACTIC — a small platformer about Tourette Syndrome
// Engine: plain canvas 2D, fixed-timestep-ish update loop.
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const VIEW_W = 1280;
const VIEW_H = 720;

const GRAVITY = 1800; // px/s^2
const JUMP_VELOCITY = -680; // px/s
const MOVE_SPEED = 320; // px/s
// Level 2 / Stage 3's gravel: hold "H" to move quietly, at the cost of speed.
const SNEAK_SPEED = 140; // px/s
const FRICTION_GROUND = 0.0; // (instant accel model, kept for tuning)
const PLAYER_W = 28;
const PLAYER_H = 64;
const TRAP_FALL_DELAY = 0.28; // seconds between jump-trigger and collapse
const TRAP_TRIGGER_RANGE = 300;

let world = null; // the one continuous map (mutable runtime state)
let checkpoint = { x: 0, y: 0 }; // latest activated mailbox (or the world start)
let player = null;
let camera = { x: 0 };
let keys = { left: false, right: false, up: false, t: false, slow: false };
let lastTime = null;
let gameTime = 0;
let deathFlashTimer = 0;
let hazardSpawner = null; // interval ID(s) for the dynamic Stage 1 hazards (array)
let isPaused = false;
// Seconds remaining on a bird-chirp freeze (Level 2) — while > 0, all
// player controls are locked.
let freezeTimer = 0;
const BIRD_FREEZE_DURATION = 1.5;
// Level 2 / Stage 3's noise meter — fills while walking noisily on gravel,
// drains while quiet; reaching NOISE_MAX kills the player.
let noiseLevel = 0;
const NOISE_MAX = 100;
const NOISE_RATE_UP = 38;
const NOISE_RATE_DOWN = 22;

// Per-level x-extent (min startX / max endX across that level's stages),
// used to pick and stretch the right backdrop image (BG.png / BG3.png)
// over just that level's stretch of the merged map, instead of one
// image stretched across the whole world.
const LEVEL_EXTENTS = (() => {
  const map = {};
  for (const s of WORLD.sections) {
    if (!map[s.levelIndex]) {
      map[s.levelIndex] = { start: s.startX, end: s.endX };
    } else {
      map[s.levelIndex].start = Math.min(map[s.levelIndex].start, s.startX);
      map[s.levelIndex].end = Math.max(map[s.levelIndex].end, s.endX);
    }
  }
  return map;
})();

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const overlayBtn = document.getElementById("overlay-btn");
const levelLabel = document.getElementById("level-label");
const controlsHint = document.getElementById("controls-hint");
const DEFAULT_CONTROLS_HINT =
  "← → move &nbsp;|&nbsp; ↑ / Space jump &nbsp;|&nbsp; Esc menu";
const GRAVEL_CONTROLS_HINT =
  "← → move &nbsp;|&nbsp; ↑ / Space jump &nbsp;|&nbsp; Hold H to sneak &nbsp;|&nbsp; Esc menu";
// Level 2 / Stage 5's ('Bark Back') barking dogs: the hint swaps between
// these two depending on the current bark phase — see updateLevelLabel().
const BARK_CONTROLS_HINT_QUIET =
  "← → move &nbsp;|&nbsp; ↑ / Space jump &nbsp;|&nbsp; Dogs are quiet — for now &nbsp;|&nbsp; Esc menu";
const BARK_CONTROLS_HINT_INVERTED =
  "BARKING — controls reversed! &nbsp;|&nbsp; ↑ / Space jump &nbsp;|&nbsp; Esc menu";
// How long before the dogs start barking (Level 2 / Stage 5) the red
// warning text shows, telegraphing the control-flip just like the storm
// and bird warnings telegraph theirs.
const BARK_WARN_LEAD = 0.6;
const restartBtn = document.getElementById("restart-btn");
const muteBtn = document.getElementById("mute-btn");
muteBtn.addEventListener("click", () => setMusicMuted(!musicMuted));

const BOX_SRC = "assets/images/box.png";
const DOG_SRC = "assets/images/dog.png";
const HAZARD_W = 79;
const HAZARD_H = 56;

const boxImg = new Image();
boxImg.src = BOX_SRC;
let boxLoaded = false;

// Level 1 / Stage 1's dynamic hazard uses dog.png instead of box.png (same
// size, same mechanics — just a different sprite so the very first
// hazard the player meets reads a little friendlier). The static hazards
// in the last stage keep box.png.
const dogImg = new Image();
dogImg.src = DOG_SRC;
let dogLoaded = false;

// Level 1 / Stage 2's obstacle blocks use 2box.png instead of a flat
// grey rectangle (same solid-collision mechanics, just reskinned).
const BOX2_SRC = "assets/images/2box.png";
const box2Img = new Image();
box2Img.src = BOX2_SRC;
let box2Loaded = false;

// Stage 5's dogs (the two flashing tree/balcony hazards, plus the
// ground-patrol dogs under the hedges) use their own whitedog.png sprite
// — kept entirely separate from Stage 1's dog.png so each stage can look
// different even though the mechanics are shared.
const WHITEDOG_SRC = "assets/images/whitedog.png";
const whitedogImg = new Image();
whitedogImg.src = WHITEDOG_SRC;
let whitedogLoaded = false;

const DUCK_SRC = "assets/images/duck.png";
const duckImg = new Image();
duckImg.src = DUCK_SRC;
let duckLoaded = false;

const BUBBLE_SRC = "assets/images/speechbubble.png";
const bubbleImg = new Image();
bubbleImg.src = BUBBLE_SRC;
let bubbleLoaded = false;

// Stage 4's pushing NPCs
const NPC_SRC = "assets/images/businessman.png";
const npcImg = new Image();
npcImg.src = NPC_SRC;
let npcLoaded = false;

// Level 3 / Stage 5's truck obstacle
const TRUCK_SRC = "assets/images/truck.png";
const truckImg = new Image();
truckImg.src = TRUCK_SRC;
let truckLoaded = false;

// Level 2's decorative trees + perched birds.
const TREE_SRC = "assets/images/tree.png";
const treeImg = new Image();
treeImg.src = TREE_SRC;
let treeLoaded = false;
const BIRD_SRC = "assets/images/bird.png";
const birdImg = new Image();
birdImg.src = BIRD_SRC;
let birdImgLoaded = false;

// Level 2 / Stage 4's ("Static") lightning-ray flashes.
const RAY_SRC = "assets/images/ray.png";
const rayImg = new Image();
rayImg.src = RAY_SRC;
let rayLoaded = false;
// Ambient rain drawn across the same storm zone as the lightning —
// purely decorative, no collision.
const RAIN_SRC = "assets/images/rain.png";
const rainImg = new Image();
rainImg.src = RAIN_SRC;
let rainLoaded = false;

// Level 2 / Stage 2's code-lock NPC (businessman.png, same art as Stage
// 4's pushing NPCs) and its background cars (car.png).
const CODE_NPC_SRC = "assets/images/businessman.png";
const codeNpcImg = new Image();
codeNpcImg.src = CODE_NPC_SRC;
let codeNpcLoaded = false;
const CAR_SRC = "assets/images/car.png";
const carImg = new Image();
carImg.src = CAR_SRC;
let carLoaded = false;

const SPRITE_SHEET_SRC = "assets/images/mailman.png";

const SPRITE_FRAME_W = 117;
const SPRITE_FRAME_H = 189;
const SPRITE_COLS = 4;
const SPRITE_FRAME_DURATION = 0.12;

const spriteSheet = new Image();

let spriteLoaded = false;
let menuMusic = null;
let gameplayMusic = null;
let currentMusic = null;
let buttonClickSound = null;
let jumpSound = null;
let mailboxBellSound = null;
let birdChirpSound = null;
let stormSound = null;
// Level 2 / Stage 4's ambient rain flicker — no dedicated rain audio
// asset yet, so this stays a safe no-op (start/stop on an Audio with no
// src silently does nothing) until real audio is dropped in at this path.
let rainSound = null;
let carHonkSound = null;
// Level 2 / Stage 3's gravel footstep loop — started/stopped rather than
// replayed from the top, so it doesn't stutter every frame the player walks.
let gravelFootstepsSound = null;
// Level 2 / Stage 5's ('Bark Back') barking-dog loop — no dedicated audio
// asset yet, so this stays a safe no-op (start/stop on an Audio with no
// src silently does nothing) until real audio is dropped in at this path.
let dogBarkSound = null;
let audioInitialized = false;
let musicMuted = false;

function initAudio() {
  if (audioInitialized) return;

  audioInitialized = true;

  menuMusic = new Audio("assets/sounds/background_music.mp3");
  menuMusic.loop = true;
  menuMusic.volume = 0.35;
  menuMusic.preload = "auto";

  gameplayMusic = new Audio("assets/sounds/game_music.mp3");
  gameplayMusic.loop = true;
  gameplayMusic.volume = 0.35;
  gameplayMusic.preload = "auto";

  buttonClickSound = new Audio("assets/sounds/button_click.mp3");
  buttonClickSound.volume = 0.45;
  buttonClickSound.preload = "auto";

  jumpSound = new Audio("assets/sounds/jump_sound.mp3");
  jumpSound.volume = 0.5;
  jumpSound.preload = "auto";

  mailboxBellSound = new Audio("assets/sounds/mailbox_bell.mp3");
  mailboxBellSound.volume = 0.5;
  mailboxBellSound.preload = "auto";

  birdChirpSound = new Audio("assets/sounds/bird_chirp.mp3");
  birdChirpSound.volume = 0.55;
  birdChirpSound.preload = "auto";

  stormSound = new Audio("assets/sounds/storm.mp3");
  stormSound.volume = 0.6;
  stormSound.preload = "auto";

  rainSound = new Audio();
  rainSound.volume = 0.4;

  // No dedicated car-honk audio yet — playCarHonkSound() stays a safe
  // no-op (playSound() on an Audio with no src silently does nothing)
  // until real audio is dropped in at this path.
  carHonkSound = new Audio();
  carHonkSound.volume = 0.5;

  gravelFootstepsSound = new Audio("assets/sounds/gravel_footsteps.mp3");
  gravelFootstepsSound.loop = true;
  gravelFootstepsSound.volume = 0.5;
  gravelFootstepsSound.preload = "auto";

  dogBarkSound = new Audio();
  dogBarkSound.loop = true;
  dogBarkSound.volume = 0.55;

  menuMusic.muted = musicMuted;
  gameplayMusic.muted = musicMuted;
}

function playBirdChirpSound() {
  playSound(birdChirpSound);
}

function playCarHonkSound() {
  initAudio();
  playSound(carHonkSound);
}

function startGravelFootsteps() {
  if (!gravelFootstepsSound) return;
  if (gravelFootstepsSound.paused) {
    const p = gravelFootstepsSound.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }
}

function stopGravelFootsteps() {
  if (!gravelFootstepsSound) return;
  if (!gravelFootstepsSound.paused) gravelFootstepsSound.pause();
}

// Starts/stops the barking-dog loop (Level 2-5 / "Bark Back"). Same
// non-rewinding play/pause pattern as start/stopGravelFootsteps() above —
// it should hold steady for the length of a barking phase, not restart
// every frame it's called.
function startDogBarkLoop() {
  if (!dogBarkSound) return;
  if (dogBarkSound.paused) {
    const p = dogBarkSound.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }
}

function stopDogBarkLoop() {
  if (!dogBarkSound) return;
  if (!dogBarkSound.paused) dogBarkSound.pause();
}

function setMusicMuted(muted) {
  musicMuted = muted;
  if (menuMusic) menuMusic.muted = muted;
  if (gameplayMusic) gameplayMusic.muted = muted;
  muteBtn.classList.toggle("muted", muted);
  muteBtn.title = muted ? "Unmute Music" : "Mute Music";
}

function playSound(sound) {
  if (!sound) return;
  try {
    sound.currentTime = 0;
    const playPromise = sound.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        const retry = () => {
          playSound(sound);
          window.removeEventListener("pointerdown", retry);
          window.removeEventListener("keydown", retry);
        };

        window.addEventListener("pointerdown", retry, { once: true });
        window.addEventListener("keydown", retry, { once: true });
      });
    }
  } catch (e) {
    // ignore autoplay/browser restrictions
  }
}

function stopMusic(audio) {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (e) {
    // ignore browser restrictions
  }
}

function playMenuMusic() {
  initAudio();
  if (currentMusic === menuMusic) return;

  stopMusic(gameplayMusic);
  stopMusic(menuMusic);
  currentMusic = menuMusic;
  playSound(menuMusic);
}

function playGameplayMusic() {
  initAudio();
  if (currentMusic === gameplayMusic) return;

  stopMusic(menuMusic);
  stopMusic(gameplayMusic);
  currentMusic = gameplayMusic;
  playSound(gameplayMusic);
}

function playButtonSound() {
  playSound(buttonClickSound);
}

function playJumpSound() {
  playSound(jumpSound);
}

function playMailboxBellSound() {
  playSound(mailboxBellSound);
}

function preloadSprite() {
  return new Promise((resolve) => {
    spriteSheet.onload = () => {
      spriteLoaded = true;
      console.log("Sprite loaded successfully");
      resolve(true);
    };

    spriteSheet.onerror = () => {
      console.error("FAILED TO LOAD SPRITE:", SPRITE_SHEET_SRC);
      resolve(false); // game still runs
    };

    spriteSheet.src = SPRITE_SHEET_SRC;
  });
}

// Mailbox (replaces the plain door rectangle), level background art,
// and the title-screen background. Door rects in levels.js are 56x90,
// matching mailboxup.png/mailboxdown.png's native size, so the door
// hitbox doubles as the mailbox hitbox with no changes needed there —
// including levels that override the door's y position (e.g. Level 5).
// Mailboxes render "up" until their checkpoint is reached, then swap to
// "down" to show the stage has been passed.
const MAILBOX_UP_SRC = "assets/images/mailboxup.png";
const MAILBOX_DOWN_SRC = "assets/images/mailboxdown.png";
// BG.png is one continuous backdrop drawn once in world space and
// stretched to world.def.width so it pans naturally with the camera
// instead of sitting fixed to the screen. NOTE: with Level 3 merged in,
// world.def.width now spans both Level 1 and Level 3's stages — BG.png
// as it exists today only actually depicts Level 1's stretch of the
// map, so it will render stretched/distorted across the extra width
// until a wider background (or a per-level background) is added.
const LEVEL_BG_SRC = "assets/images/BG.png";
// Level 3 gets its own separate backdrop (BG3.png) so it reads as a
// distinct space rather than a continuation of Level 1's map.
const LEVEL3_BG_SRC = "assets/images/BG3.png";
const TITLE_BG_SRC = "assets/images/titlebg.png";
// Level 2 gets its own backdrop (BG2.png) so it reads as a distinct space.
const LEVEL2_BG_SRC = "assets/images/bg2-blank.png";

const mailboxUpImg = new Image();
const mailboxDownImg = new Image();
const levelBgImg = new Image();
const level2BgImg = new Image();
const level3BgImg = new Image();
const titleBgImg = new Image();

let mailboxUpLoaded = false;
let mailboxDownLoaded = false;
let levelBgLoaded = false;
let level2BgLoaded = false;
let level3BgLoaded = false;
let titleBgLoaded = false;

function preloadImage(img, src, onDone) {
  return new Promise((resolve) => {
    img.onload = () => {
      onDone(true);
      resolve(true);
    };
    img.onerror = () => {
      console.error("FAILED TO LOAD IMAGE:", src);
      onDone(false);
      resolve(false); // game still runs with a flat-color fallback
    };
    img.src = src;
  });
}

function preloadAllAssets() {
  return Promise.all([
    preloadSprite(),
    preloadImage(mailboxUpImg, MAILBOX_UP_SRC, (ok) => (mailboxUpLoaded = ok)),
    preloadImage(
      mailboxDownImg,
      MAILBOX_DOWN_SRC,
      (ok) => (mailboxDownLoaded = ok),
    ),
    preloadImage(levelBgImg, LEVEL_BG_SRC, (ok) => (levelBgLoaded = ok)),
    preloadImage(level2BgImg, LEVEL2_BG_SRC, (ok) => (level2BgLoaded = ok)),
    preloadImage(level3BgImg, LEVEL3_BG_SRC, (ok) => (level3BgLoaded = ok)),
    preloadImage(titleBgImg, TITLE_BG_SRC, (ok) => (titleBgLoaded = ok)),
    preloadImage(boxImg, BOX_SRC, (ok) => (boxLoaded = ok)),
    preloadImage(dogImg, DOG_SRC, (ok) => (dogLoaded = ok)),
    preloadImage(box2Img, BOX2_SRC, (ok) => (box2Loaded = ok)),
    preloadImage(whitedogImg, WHITEDOG_SRC, (ok) => (whitedogLoaded = ok)),
    preloadImage(npcImg, NPC_SRC, (ok) => (npcLoaded = ok)),
    preloadImage(truckImg, TRUCK_SRC, (ok) => (truckLoaded = ok)),
    preloadImage(duckImg, DUCK_SRC, (ok) => (duckLoaded = ok)),
    preloadImage(bubbleImg, BUBBLE_SRC, (ok) => (bubbleLoaded = ok)),
    preloadImage(treeImg, TREE_SRC, (ok) => (treeLoaded = ok)),
    preloadImage(birdImg, BIRD_SRC, (ok) => (birdImgLoaded = ok)),
    preloadImage(rayImg, RAY_SRC, (ok) => (rayLoaded = ok)),
    preloadImage(rainImg, RAIN_SRC, (ok) => (rainLoaded = ok)),
    preloadImage(codeNpcImg, CODE_NPC_SRC, (ok) => (codeNpcLoaded = ok)),
    preloadImage(carImg, CAR_SRC, (ok) => (carLoaded = ok)),
  ]);
}

function makePlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    w: PLAYER_W,
    h: PLAYER_H,
    grounded: false,
    wasGrounded: false,
    facing: 1,
    alive: true,
    standingTrapId: null,
    // Level 3 / Stage 1 (duck followers): brief invulnerability window
    // after a hit, and the temporary slow it inflicts.
    invulnTimer: 0,
    slowTimer: 0,
    slowFactor: 1,
    // Level 3 / Stage 5 (jump-boost NPCs): temporary higher jump after
    // fully charging near one of the stage's supportive NPCs.
    jumpBoostTimer: 0,
    jumpBoostMultiplier: 1,
  };
}

function freshTrapState() {
  return WORLD.trapGround.map((t) => ({
    ...t,
    // `prefallen` lets a section (e.g. the old Level 4's gap-seed) start
    // already collapsed, so it renders as an open pit from the very first
    // frame.
    armed: t.prefallen || false,
    fallTimer: 0,
    fallen: t.prefallen || false,
    fallOffset: t.prefallen ? 400 : 0,
  }));
}

// ---------- Level 3 / Stage 1 — duck followers ----------
// Ducks are already present in the world from the moment the stage
// loads (no walk-triggered spawn-in), and are confined to their own
// stage's x-range so they can't be dragged across the mailbox into
// Stage 2.
function freshDuckState() {
  return (WORLD.duckFollowers || []).map((d) => {
    const section = WORLD.sections.find(
      (s) => s.levelIndex === d.levelIndex && s.stageIndex === d.stageIndex,
    );
    // Clamp to just before the stage's own mailbox (not the full stage
    // width) so ducks stop right at the border instead of continuing
    // into Stage 2.
    const mailbox = WORLD.mailboxes.find(
      (m) => m.levelIndex === d.levelIndex && m.stageIndex === d.stageIndex,
    );
    const rightLimit = mailbox
      ? mailbox.x - DUCK_W
      : section
        ? section.endX - DUCK_W
        : Infinity;
    return {
      ...d,
      active: true,
      curX: d.x,
      curY: null, // set on first update, once world.def.groundY is guaranteed to exist
      facing: 1,
      minX: section ? section.startX : -Infinity,
      maxX: rightLimit,
    };
  });
}

// ---------- Stage 4 — pushing NPCs ----------
function freshPushingNpcState() {
  return (WORLD.pushingNpcs || []).map((n) => {
    const section = WORLD.sections.find(
      (s) => s.levelIndex === n.levelIndex && s.stageIndex === n.stageIndex,
    );
    // Patrol the entire stage — never past its own mailbox on the right,
    // nor before the stage's start (the previous stage's mailbox) on
    // the left.
    const mailbox = WORLD.mailboxes.find(
      (m) => m.levelIndex === n.levelIndex && m.stageIndex === n.stageIndex,
    );
    const leftLimit = section ? section.startX : -Infinity;
    const rightLimit = mailbox
      ? mailbox.x - PUSHING_NPC_W
      : section
        ? section.endX - PUSHING_NPC_W
        : Infinity;
    return {
      ...n,
      currentX: n.x,
      direction: n.startDirection || 1, // 1 = right, -1 = left
      speed: n.speed || PUSHING_NPC_SPEED,
      pauseTimer: 0,
      minX: leftLimit,
      maxX: rightLimit,
    };
  });
}

// ---------- Level 3 / Stage 2 — falling dialogue bubbles ----------
function freshBubbleState() {
  return (WORLD.bubbles || []).map((b) => ({
    ...b,
    caught: false,
    missed: false,
    curX: b.x,
    curY: b.spawnY,
  }));
}

// ---------- Level 3 / Stage 3 — supportive NPCs ----------
function freshNpcState() {
  return (WORLD.supportNPCs || []).map((n) => ({
    ...n,
    charge: 0,
    boostTimer: 0,
  }));
}

// ---------- Level 3 / Stage 5 — jump-boost NPCs ----------
function freshJumpBoostNpcState() {
  return (WORLD.jumpBoostNpcs || []).map((n) => ({
    ...n,
    charge: 0,
    boostTimer: 0,
  }));
}

// Builds the one continuous map from scratch. Called once at startup and
// again when the player returns to the main menu (a full game reset).
function loadWorld() {
  world = {
    def: WORLD,
    trapState: freshTrapState(),
    movingPlatforms: WORLD.movingPlatforms.map((p) => ({ ...p })),
    // Patrolling ground hazards (e.g. Stage 5's hedge dogs) — mutable
    // copies just like movingPlatforms, since they need their own
    // `currentX` written in every frame.
    groundHazards: (WORLD.groundHazards || []).map((g) => ({ ...g })),
    // mutable copies so `activated` can flip on without touching WORLD
    mailboxes: WORLD.mailboxes.map((m) => ({ ...m })),
    // Level 3's social mechanics — mutable per-run state.
    duckState: freshDuckState(),
    bubbleState: freshBubbleState(),
    npcState: freshNpcState(),
    // Level 3 / Stage 5's jump-boost NPCs
    jumpBoostState: freshJumpBoostNpcState(),
    // Stage 4's pushing NPCs
    pushingNpcState: freshPushingNpcState(),
    speedFactor: 1,
    // runtime flag: whether the stacked-box -> black-hole queue has fired
    _blackHoleQueued: false,
    // Level 2+'s perched birds — mutable copies, each with its own
    // countdown to its next chirp.
    birdState: (WORLD.birds || []).map((b) => ({
      ...b,
      chirpTimer: INITIAL_BIRD_CHIRP_DELAY,
    })),
  };

  // Restore each checkpoint's activated/glow state from the saved
  // Progress (level-select.js) rather than always starting blank, so
  // returning to the main menu doesn't visually "forget" cleared stages.
  syncMailboxActivationFromProgress();

  checkpoint = { x: WORLD.spawn.x, y: WORLD.spawn.y };
  player = makePlayer(checkpoint);
  camera.x = clampCamera(player.x + player.w / 2);
  updateLevelLabel();

  // ensure input state is reset and clear pause state
  keys.left = keys.right = keys.up = keys.slow = false;
  isPaused = false;
  freezeTimer = 0;
  noiseLevel = 0;
  const menuBtn = document.getElementById("overlay-menu-btn");
  if (menuBtn) menuBtn.remove();
  hideKeypad();
  stopDogBarkLoop();

  if (hazardSpawner !== null) {
    // hazardSpawner is now an array of interval IDs (one per dynamic dog)
    for (const id of hazardSpawner) clearInterval(id);
    hazardSpawner = null;
  }

  initDynamicHazard();
  initGapExpansion();
  initCodeLock();
  initWeather();
  initBarkState();
}

// Puts the player back at the latest checkpoint and resets the map's
// resettable hazards (falling traps, the expanding gap, ducks/bubbles/
// NPCs) without touching already-activated mailboxes — checkpoints,
// once reached, stay reached.
function respawnPlayer() {
  world.trapState = freshTrapState();
  world.movingPlatforms = WORLD.movingPlatforms.map((p) => ({ ...p }));
  world.groundHazards = (WORLD.groundHazards || []).map((g) => ({ ...g }));
  world.duckState = freshDuckState();
  world.bubbleState = freshBubbleState();
  world.npcState = freshNpcState();
  world.jumpBoostState = freshJumpBoostNpcState();
  world.pushingNpcState = freshPushingNpcState();
  world.speedFactor = 1;
  world._blackHoleQueued = false;
  world.birdState = (WORLD.birds || []).map((b) => ({
    ...b,
    chirpTimer: INITIAL_BIRD_CHIRP_DELAY,
  }));
  freezeTimer = 0;
  noiseLevel = 0;
  hideKeypad();

  if (hazardSpawner !== null) {
    // hazardSpawner is now an array of interval IDs (one per dynamic dog)
    for (const id of hazardSpawner) clearInterval(id);
    hazardSpawner = null;
  }
  initDynamicHazard();
  initGapExpansion();
  resetCodeLockRunState();
  resetWeatherRunState();
  resetBarkRunState();

  player = makePlayer(checkpoint);
  camera.x = clampCamera(player.x + player.w / 2);
  keys.left = keys.right = keys.up = keys.slow = false;
}

// The old dynamic red-cube hazard from "Stage 1" — kept scoped to that
// section's stretch of the map, since it was only ever meant to threaten
// that part of the level. Now spawns DYNAMIC_HAZARD_COUNT of these dogs
// at once (2, per the "two running total" ask) instead of just one, each
// teleporting to a new spot on its own independent timer so they don't
// blink in sync.
const DYNAMIC_HAZARD_COUNT = 2;

function initDynamicHazard() {
  // Stage 1 no longer uses the blinking/teleporting dog hazards — keep
  // an empty dynamicHazards array so other code can safely iterate it.
  world.dynamicHazards = [];
  hazardSpawner = null;
}

// Which section of the continuous map does world-x `x` fall inside? Drives
// the section-specific mechanics below (the expanding gap, the blink
// cycle, per-level movement quirks) now that multiple levels share one
// map instead of separate pages.
function getSectionIndexForX(x) {
  for (let i = 0; i < WORLD.sections.length; i++) {
    const s = WORLD.sections[i];
    if (x >= s.startX && x < s.endX) return i;
  }
  return WORLD.sections.length - 1;
}

// Convenience wrapper around getSectionIndexForX() for code that wants
// the section object itself (levelIndex/stageIndex/baseSpeedFactor/etc)
// rather than just its raw index.
function getCurrentSection() {
  return WORLD.sections[getSectionIndexForX(player.x)];
}

function updateLevelLabel() {
  const idx = getSectionIndexForX(player.x);
  levelLabel.textContent = WORLD.sections[idx].title.split("—")[0].trim();

  // Swap in the sneak-key hint only while standing on gravel ground
  // (Level 2 / Stage 3); every other stage keeps the default hint.
  if (controlsHint) {
    const onGravel = getGroundSurfaceAt(player.x) === "gravel";
    const bs = world.barkState;
    const onBarkStage = bs && getCurrentSection() === bs.section;
    if (onBarkStage) {
      controlsHint.innerHTML =
        bs.phase === "barking"
          ? BARK_CONTROLS_HINT_INVERTED
          : BARK_CONTROLS_HINT_QUIET;
    } else {
      controlsHint.innerHTML = onGravel
        ? GRAVEL_CONTROLS_HINT
        : DEFAULT_CONTROLS_HINT;
    }
  }
}

// ------------------------------------------------------------
// Locked mailbox / code-entry keypad (Level 2-2 — "Drowned Out")
// ------------------------------------------------------------
const NPC_BUBBLE_SHOW_DURATION = 3.6;
const NPC_BUBBLE_HIDE_DURATION = 1.1;
const CAR_HONK_OBSCURE_DURATION = 1.0;

function generateRandomCode() {
  const code = [];
  for (let i = 0; i < 4; i++) code.push(String(Math.floor(Math.random() * 10)));
  return code;
}

function findCodeLockSection() {
  return WORLD.sections.find((s) => s.codeLock && s.npc);
}

function makeStageCars(carsCfg) {
  if (!carsCfg) return [];
  const w = carsCfg.width || 70;
  const h = carsCfg.height || 34;
  const speedMin = carsCfg.speedMin || 150;
  const speedMax = carsCfg.speedMax || 240;
  const span = carsCfg.maxX - carsCfg.minX - w;
  // A fixed set of cars, spread evenly across the stage, each with its
  // own speed and starting direction — always on screen, bouncing
  // between the stage's own boundaries instead of spawning/despawning.
  const count = 3;
  const cars = [];
  for (let i = 0; i < count; i++) {
    cars.push({
      x: carsCfg.minX + (span * (i + 0.5)) / count,
      y: world.def.groundY - h,
      width: w,
      height: h,
      speed: speedMin + Math.random() * (speedMax - speedMin),
      dir: i % 2 === 0 ? 1 : -1,
    });
  }
  return cars;
}

function initCodeLock() {
  const section = findCodeLockSection();
  if (!section) {
    world.codeLock = null;
    return;
  }
  // If this stage's checkpoint was already cleared in a prior run
  // (tracked persistently via Progress), don't re-prompt the code
  // puzzle — the mailbox unlocks immediately.
  const alreadyCompleted = Progress.isCompleted(
    section.levelIndex,
    section.stageIndex,
  );
  world.codeLock = {
    section,
    code: generateRandomCode(),
    solved: alreadyCompleted,
    cyclePhase: "showing",
    cycleTimer: NPC_BUBBLE_SHOW_DURATION,
    obscured: [0, 0, 0, 0],
    cars: makeStageCars(section.cars),
    honkTimer: 1 + Math.random() * 1.5,
  };
  if (alreadyCompleted) {
    const mb = world.mailboxes.find(
      (m) =>
        m.levelIndex === section.levelIndex &&
        m.stageIndex === section.stageIndex,
    );
    if (mb) mb.locked = false;
  }
}

function resetCodeLockRunState() {
  if (!world.codeLock) return;
  world.codeLock.cyclePhase = "showing";
  world.codeLock.cycleTimer = NPC_BUBBLE_SHOW_DURATION;
  world.codeLock.obscured = [0, 0, 0, 0];
  world.codeLock.cars = makeStageCars(world.codeLock.section.cars);
  world.codeLock.honkTimer = 1 + Math.random() * 1.5;
}

function updateCarsAndNpc(dt) {
  const cl = world.codeLock;
  if (!cl) return;

  cl.cycleTimer -= dt;
  if (cl.cycleTimer <= 0) {
    if (cl.cyclePhase === "showing") {
      cl.cyclePhase = "hidden";
      cl.cycleTimer = NPC_BUBBLE_HIDE_DURATION;
    } else {
      cl.cyclePhase = "showing";
      cl.cycleTimer = NPC_BUBBLE_SHOW_DURATION;
      cl.obscured = [0, 0, 0, 0];
    }
  }

  for (let i = 0; i < cl.obscured.length; i++) {
    if (cl.obscured[i] > 0) cl.obscured[i] = Math.max(0, cl.obscured[i] - dt);
  }

  const carsCfg = cl.section.cars;
  if (!carsCfg) return;

  for (const car of cl.cars) {
    car.x += car.dir * car.speed * dt;
    // Bounce off the stage's own boundaries instead of despawning, so
    // the same cars stay on screen and keep gliding back and forth.
    if (car.x <= carsCfg.minX) {
      car.x = carsCfg.minX;
      car.dir = 1;
    } else if (car.x + car.width >= carsCfg.maxX) {
      car.x = carsCfg.maxX - car.width;
      car.dir = -1;
    }
  }

  cl.honkTimer -= dt;
  if (cl.honkTimer <= 0) {
    const honkMin = carsCfg.honkIntervalMin || 1.2;
    const honkMax = carsCfg.honkIntervalMax || 2.6;
    cl.honkTimer = honkMin + Math.random() * (honkMax - honkMin);

    if (cl.cyclePhase === "showing" && cl.cars.length > 0) {
      playCarHonkSound();
      const numObscured = Math.random() < 0.55 ? 1 : 2;
      const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      for (let i = 0; i < numObscured; i++) {
        cl.obscured[order[i]] = CAR_HONK_OBSCURE_DURATION;
      }
    }
  }
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function drawCarsAndNpc() {
  const cl = world.codeLock;
  if (!cl) return;

  for (const car of cl.cars) {
    if (carLoaded) {
      ctx.save();
      if (car.dir === -1) {
        ctx.translate(car.x + car.width, car.y);
        ctx.scale(-1, 1);
        ctx.drawImage(carImg, 0, 0, car.width, car.height);
      } else {
        ctx.drawImage(carImg, car.x, car.y, car.width, car.height);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = "#555a63";
      ctx.fillRect(car.x, car.y, car.width, car.height);
    }
  }

  const npc = cl.section.npc;
  const npcTop = npc.y !== undefined ? npc.y : world.def.groundY - npc.height;
  if (codeNpcLoaded) {
    ctx.drawImage(codeNpcImg, npc.x, npcTop, npc.width, npc.height);
  } else {
    ctx.fillStyle = "#3a6ea5";
    ctx.fillRect(npc.x, npcTop, npc.width, npc.height);
  }

  if (cl.cyclePhase === "showing") {
    const bubbleW = 150;
    const bubbleH = 54;
    const bubbleX = npc.x + npc.width / 2 - bubbleW / 2;
    const bubbleY = npcTop - bubbleH - 14;

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bubbleX + bubbleW / 2 - 8, bubbleY + bubbleH);
    ctx.lineTo(bubbleX + bubbleW / 2 + 8, bubbleY + bubbleH);
    ctx.lineTo(bubbleX + bubbleW / 2, bubbleY + bubbleH + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const slotW = bubbleW / 4;
    for (let i = 0; i < 4; i++) {
      const cx = bubbleX + slotW * i + slotW / 2;
      const cy = bubbleY + bubbleH / 2;
      if (cl.obscured[i] > 0) {
        ctx.fillStyle = "#d1352c";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("BEEP", cx, cy);
      } else {
        ctx.fillStyle = "#222";
        ctx.font = "bold 22px monospace";
        ctx.fillText(cl.code[i], cx, cy);
      }
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

let keypadEl = null;
let pendingLockedMailbox = null;
let keypadInput = "";

function buildKeypadDOM() {
  const root = document.createElement("div");
  root.id = "keypad-overlay";
  Object.assign(root.style, {
    position: "absolute",
    inset: "0",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.65)",
    zIndex: "1000",
    flexDirection: "column",
  });

  const panel = document.createElement("div");
  Object.assign(panel.style, {
    background: "#22242b",
    padding: "24px",
    borderRadius: "12px",
    textAlign: "center",
    color: "#fff",
    fontFamily: "inherit",
    minWidth: "260px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
  });

  const heading = document.createElement("h2");
  heading.textContent = "Enter the 4-Digit Code";
  Object.assign(heading.style, { marginTop: "0", fontSize: "18px" });
  panel.appendChild(heading);

  const display = document.createElement("div");
  display.id = "keypad-display";
  Object.assign(display.style, {
    fontSize: "30px",
    letterSpacing: "6px",
    margin: "10px 0",
    minHeight: "38px",
    fontFamily: "monospace",
  });
  panel.appendChild(display);

  const feedback = document.createElement("div");
  feedback.id = "keypad-feedback";
  Object.assign(feedback.style, {
    minHeight: "18px",
    marginBottom: "10px",
    fontSize: "13px",
  });
  panel.appendChild(feedback);

  const grid = document.createElement("div");
  Object.assign(grid.style, {
    display: "grid",
    gridTemplateColumns: "repeat(3, 56px)",
    gap: "8px",
    justifyContent: "center",
  });
  const keysList = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "⌫",
    "0",
    "Enter",
  ];
  for (const k of keysList) {
    const b = document.createElement("button");
    b.textContent = k;
    b.className = "menu-btn";
    Object.assign(b.style, { padding: "12px 0", fontSize: "15px" });
    b.addEventListener("click", () => {
      playButtonSound();
      handleKeypadKey(k);
    });
    grid.appendChild(b);
  }
  panel.appendChild(grid);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Cancel";
  closeBtn.className = "menu-btn";
  Object.assign(closeBtn.style, { marginTop: "14px" });
  closeBtn.addEventListener("click", () => {
    playButtonSound();
    hideKeypad();
  });
  panel.appendChild(closeBtn);

  root.appendChild(panel);
  document.getElementById("game-container").appendChild(root);
  return { root, display, feedback };
}

function updateKeypadDisplay() {
  const padded = keypadInput.padEnd(4, "_");
  keypadEl.display.textContent = padded.split("").join(" ");
}

function showKeypad() {
  if (!keypadEl) keypadEl = buildKeypadDOM();
  keypadInput = "";
  updateKeypadDisplay();
  keypadEl.feedback.textContent = "";
  keypadEl.feedback.style.color = "";
  keypadEl.root.style.display = "flex";
}

function hideKeypad() {
  if (keypadEl) keypadEl.root.style.display = "none";
  if (pendingLockedMailbox) pendingLockedMailbox._suppressReopen = true;
  pendingLockedMailbox = null;
}

function openKeypadForMailbox(mb) {
  if (!world.codeLock) return;
  if (world.codeLock.solved) return; // never reopen once the code is solved
  if (keypadEl && keypadEl.root.style.display === "flex") return;
  pendingLockedMailbox = mb;
  showKeypad();
}

function handleKeypadKey(k) {
  if (!keypadEl) return;
  if (k === "⌫") {
    keypadInput = keypadInput.slice(0, -1);
  } else if (k === "Enter") {
    submitKeypadCode();
    return;
  } else if (/^[0-9]$/.test(k)) {
    if (keypadInput.length < 4) keypadInput += k;
  }
  keypadEl.feedback.textContent = "";
  updateKeypadDisplay();
}

function submitKeypadCode() {
  if (!world.codeLock || !pendingLockedMailbox) return;
  if (keypadInput.length < 4) {
    keypadEl.feedback.textContent = "Enter all 4 digits first.";
    keypadEl.feedback.style.color = "#ffb648";
    return;
  }
  const correct = keypadInput === world.codeLock.code.join("");
  if (correct) {
    world.codeLock.solved = true;
    pendingLockedMailbox.locked = false;
    playMailboxBellSound();
    keypadEl.feedback.textContent = "Correct! The mailbox unlocks.";
    keypadEl.feedback.style.color = "#7CFF7C";
    setTimeout(() => hideKeypad(), 700);
  } else {
    playButtonSound();
    keypadEl.feedback.textContent = "That's not it. Listen again.";
    keypadEl.feedback.style.color = "#ff6b6b";
    keypadInput = "";
    updateKeypadDisplay();
  }
}

// ------------------------------------------------------------
// Level 2 / Stage 4 ("Static") — alternating rain/lightning flashes.
// Rain and lightning take turns (never both active at once): a gap,
// then a warning icon, then the flash itself — each a single static
// image at its exact zone (no scrolling/tiling), plus a floor marker
// (blue for rain, yellow for lightning) so players always know where
// each one lands.
// ------------------------------------------------------------
const RAY_VISIBLE_DURATION = 0.5;
const RAIN_VISIBLE_DURATION = 1.2;
const STORM_GAP_MIN = 1.0;
const STORM_GAP_MAX = 2.4;
const STORM_GAP_MIN_FAST = 0.5;
const STORM_GAP_MAX_FAST = 1.3;
// How long before each flash (lightning OR rain) its warning icon shows.
const STORM_WARN_LEAD = 0.4;
const RAY_NATIVE_W = 74;
const RAY_NATIVE_H = 367;
const RAY_SCALE = 0.5;
const RAIN_NATIVE_W = 74;
const RAIN_NATIVE_H = 367;
const RAIN_SCALE = 0.5;

function findStormSection() {
  return WORLD.sections.find((s) => s.storm);
}

function randomStormGap(w) {
  const min = w && w.fastMode ? STORM_GAP_MIN_FAST : STORM_GAP_MIN;
  const max = w && w.fastMode ? STORM_GAP_MAX_FAST : STORM_GAP_MAX;
  return min + Math.random() * (max - min);
}

function setStormSpeedMode(w, fast = false) {
  if (!w) return;
  w.fastMode = fast;
}

function initWeather() {
  const section = findStormSection();
  if (!section) {
    world.weather = null;
    return;
  }
  const rainZones = section.rainZones || [];
  const lightningZones = section.lightningZones || [];
  const allZones = rainZones.concat(lightningZones);
  const clusterX = allZones.length
    ? Math.min(...allZones.map((z) => z.x))
    : section.startX;
  const clusterEnd = allZones.length
    ? Math.max(...allZones.map((z) => z.x + z.width))
    : section.endX;

  world.weather = {
    section,
    rainZones,
    lightningZones,
    clusterX,
    clusterWidth: clusterEnd - clusterX,
    rayVisible: false,
    rainVisible: false,
    // Alternates "rain" / "lightning"; phase is "gap" (waiting) ->
    // "warning" (icon shown) -> "active" (the flash itself). All rain
    // zones fire together, and both lightning zones fire together —
    // never a mix of the two, and never just one zone of a type.
    stormType: "rain",
    stormPhase: "gap",
    fastMode: false,
  };
  world.weather.stormTimer = randomStormGap(world.weather);
}

function resetWeatherRunState() {
  if (!world.weather) return;
  const w = world.weather;
  w.rayVisible = false;
  w.rainVisible = false;
  w.stormType = "rain";
  w.stormPhase = "gap";
  setStormSpeedMode(w, false);
  w.stormTimer = randomStormGap(w);
}

function updateWeather(dt) {
  const w = world.weather;
  if (!w) return;

  const onStormSection = getCurrentSection() === w.section;
  if (!onStormSection) return;

  // While a lightning flash is active, check every lightning zone for a
  // hit each frame it's up (both zones fire together).
  if (
    w.stormPhase === "active" &&
    w.stormType === "lightning" &&
    w.rayVisible
  ) {
    const rayH = VIEW_H * RAY_SCALE;
    for (const zone of w.lightningZones) {
      const rayW = zone.width;
      const rayX = zone.x;
      const rayY = world.def.groundY - rayH;
      if (
        player.alive &&
        rectsOverlap(
          rayX,
          rayY,
          rayW,
          rayH,
          player.x,
          player.y,
          player.w,
          player.h,
        )
      ) {
        if (w.section && w.section.spawn) {
          checkpoint = { x: w.section.spawn.x, y: w.section.spawn.y };
        }
        setStormSpeedMode(w, true);
        w.rayVisible = false;
        w.stormType = "rain";
        w.stormPhase = "gap";
        w.stormTimer = randomStormGap(w);
        killPlayer();
        return;
      }
    }
  }

  // While rain is active, touching any rain zone also resets the player
  // — same treatment as the lightning strike.
  if (w.stormPhase === "active" && w.stormType === "rain" && w.rainVisible) {
    const rainH = VIEW_H * RAIN_SCALE;
    for (const zone of w.rainZones) {
      const rainY = world.def.groundY - rainH;
      if (
        player.alive &&
        rectsOverlap(
          zone.x,
          rainY,
          zone.width,
          rainH,
          player.x,
          player.y,
          player.w,
          player.h,
        )
      ) {
        if (w.section && w.section.spawn) {
          checkpoint = { x: w.section.spawn.x, y: w.section.spawn.y };
        }
        setStormSpeedMode(w, true);
        w.rainVisible = false;
        w.stormType = "lightning";
        w.stormPhase = "gap";
        w.stormTimer = randomStormGap(w);
        killPlayer();
        return;
      }
    }
  }

  w.stormTimer -= dt;
  if (w.stormTimer > 0) return;

  if (w.stormPhase === "gap") {
    w.stormPhase = "warning";
    w.stormTimer = STORM_WARN_LEAD;
  } else if (w.stormPhase === "warning") {
    w.stormPhase = "active";
    if (w.stormType === "lightning") {
      w.rayVisible = true;
      playSound(stormSound);
      w.stormTimer = RAY_VISIBLE_DURATION;
    } else {
      w.rainVisible = true;
      playSound(rainSound);
      w.stormTimer = RAIN_VISIBLE_DURATION;
    }
  } else {
    // "active" finished — hand off to the other type and go back to a gap.
    w.rayVisible = false;
    w.rainVisible = false;
    w.stormType = w.stormType === "rain" ? "lightning" : "rain";
    w.stormPhase = "gap";
    w.stormTimer = randomStormGap(w);
  }
}

// Thin colored strip on the ground under each zone — always visible so
// players always know where rain/lightning will land, regardless of
// which one is currently active.
function drawStormFloorMarkers(w) {
  const markH = 6;
  const y = world.def.groundY - markH;
  ctx.fillStyle = "#4fa8ff";
  for (const zone of w.rainZones) ctx.fillRect(zone.x, y, zone.width, markH);
  ctx.fillStyle = "#ffd23f";
  for (const zone of w.lightningZones)
    ctx.fillRect(zone.x, y, zone.width, markH);
}

function drawWeather() {
  const w = world.weather;
  if (!w) return;

  drawStormFloorMarkers(w);

  // Rain \u2014 a single static image per green zone, sized to fill it, no
  // scrolling/tiling.
  if (rainLoaded && w.rainVisible) {
    const rainH = VIEW_H * RAIN_SCALE;
    for (const zone of w.rainZones) {
      const rainW = zone.width;
      ctx.drawImage(rainImg, zone.x, world.def.groundY - rainH, rainW, rainH);
    }
  }

  drawStormWarnings(w);

  if (!w.rayVisible) return;

  const rayH = VIEW_H * RAY_SCALE;
  for (const zone of w.lightningZones) {
    const x = zone.x;
    const y = world.def.groundY - rayH;
    if (rayLoaded) {
      ctx.drawImage(rayImg, x, y, zone.width, rayH);
    } else {
      ctx.fillStyle = "rgba(255, 255, 200, 0.85)";
      ctx.fillRect(x, y, zone.width, rayH);
    }
  }
}

// Telegraphs the next flash (whichever type is up) STORM_WARN_LEAD
// seconds ahead of time, same pulsing "!" language as Level 2 / Stage
// 1's bird-chirp warning, color-coded so the two are distinguishable:
// gold for the lightning strike, blue for the rain.
function drawWarnIcon(x, y, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", x, y + 1);
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawStormWarnings(w) {
  if (w.stormPhase !== "warning") return;
  const pulse = 0.6 + Math.sin(gameTime * 14) * 0.4;
  const cx = w.clusterX + w.clusterWidth / 2;
  const topY = 70;
  const color = w.stormType === "lightning" ? "#ffd23f" : "#5fb8ff";
  drawWarnIcon(cx, topY, color, pulse);
}

// ------------------------------------------------------------
// Level 2 / Stage 5 ("Bark Back") — barking dogs / inverted controls.
//
// A section can be marked `barkingDogs: true` with a `barkConfig`
// ({ barkOn, barkOff, barkPhase }, all in seconds — see levels.js). While
// active:
//  - the section's dogs cycle between "quiet" and "barking" on a fixed,
//    learnable rhythm (world.barkState)
//  - while barking, left/right input is inverted for the player (see
//    isControlsInverted(), applied in update())
//  - the dogs themselves are ordinary groundHazards (still instant-death
//    on touch at all times) — barking only changes controls + feedback,
//    never the hazard's own collision.
// ------------------------------------------------------------

function findBarkSection() {
  return WORLD.sections.find((s) => s.barkingDogs);
}

function initBarkState() {
  const section = findBarkSection();
  if (!section) {
    world.barkState = null;
    return;
  }

  const cfg = section.barkConfig || {};
  const barkOnDuration = cfg.barkOn !== undefined ? cfg.barkOn : 5;
  const barkOffDuration = cfg.barkOff !== undefined ? cfg.barkOff : 5;

  world.barkState = {
    section,
    barkOnDuration,
    barkOffDuration,
    phase: "quiet",
    timer: barkOffDuration,
  };

  const phaseOffset = cfg.barkPhase || 0;
  if (phaseOffset > 0) {
    world.barkState.timer = Math.max(0.1, barkOffDuration - phaseOffset);
  }
}

function resetBarkRunState() {
  if (!world.barkState) return;
  world.barkState.phase = "quiet";
  world.barkState.timer = world.barkState.barkOffDuration;
  stopDogBarkLoop();
}

function updateBarkState(dt) {
  const bs = world.barkState;
  if (!bs) return;

  bs.timer -= dt;
  if (bs.timer <= 0) {
    if (bs.phase === "quiet") {
      bs.phase = "barking";
      bs.timer = bs.barkOnDuration;
    } else {
      bs.phase = "quiet";
      bs.timer = bs.barkOffDuration;
    }
  }

  const onBarkSection = getCurrentSection() === bs.section;

  if (onBarkSection && bs.phase === "barking") {
    startDogBarkLoop();
  } else {
    stopDogBarkLoop();
  }
}

// Whether the player's own left/right input should currently be
// inverted — only true while actually standing in the bark section AND
// the dogs are mid-bark.
function isControlsInverted() {
  const bs = world.barkState;
  if (!bs) return false;
  if (bs.phase !== "barking") return false;
  return getCurrentSection() === bs.section;
}

// True during the BARK_WARN_LEAD seconds right before the dogs start
// barking (and controls flip) — drives the red warning text in draw().
function isBarkWarningActive() {
  const bs = world.barkState;
  if (!bs) return false;
  if (bs.phase !== "quiet") return false;
  if (bs.timer > BARK_WARN_LEAD) return false;
  return getCurrentSection() === bs.section;
}

// ---------- Birds (Level 2) ----------
function randomBirdInterval() {
  return 3; // chirp on a steady 3-second cycle
}

// First chirp fires almost immediately on spawning into the stage,
// rather than waiting a full cycle.
const INITIAL_BIRD_CHIRP_DELAY = 0.4;

// How long before a chirp the "!" warning shows, telegraphing the freeze
// slightly ahead of the actual sound/lock (see draw()'s freeze indicator).
const BIRD_WARN_LEAD = 0.4;
// Small gap between the warning icon turning off and the chirp sound /
// freeze actually firing, so the audio is clearly heard AFTER the
// indicator disappears rather than exactly on top of it.
const BIRD_WARN_GAP = 0.15;

function isBirdWarningActive() {
  if (!areLevel2Stage1BirdsActive()) return false;
  return (world.birdState || []).some(
    (b) => b.chirpTimer > BIRD_WARN_GAP && b.chirpTimer <= BIRD_WARN_LEAD,
  );
}

// Birds are only active while the player is in Level 2 / Stage 1 AND
// hasn't physically walked past that stage's own mailbox yet — compared
// directly against the player's current x each frame (never persisted),
// so it always reflects this run, not whether the stage was EVER
// completed before.
/*
function areLevel2Stage1BirdsActive() {
  const curSection = getCurrentSection();
  if (!curSection.birdFreeze) return false;
  const mb = world.mailboxes.find(
    (m) => m.levelIndex === 1 && m.stageIndex === 0,
  );
  return !mb || player.x < mb.x;
}
  */
 function areLevel2Stage1BirdsActive() {
  const curSection = getCurrentSection();
  if (!curSection.birdFreeze) return false;
  const mb = world.mailboxes.find(
    (m) =>
      m.levelIndex === curSection.levelIndex &&
      m.stageIndex === curSection.stageIndex,
  );
  return !mb || player.x < mb.x;
}

function updateBirds(dt) {
  // Birds only exist in Level 2 / Stage 1 data, but scope explicitly by
  // stage AND that stage's own mailbox activation — so chirping stops
  // the instant the player passes that checkpoint, not just when they
  // cross the raw section boundary further ahead.
  if (!areLevel2Stage1BirdsActive()) return;
  for (const b of world.birdState || []) {
    b.chirpTimer -= dt;
    if (b.chirpTimer <= 0) {
      playBirdChirpSound();
      freezeTimer = BIRD_FREEZE_DURATION;
      b.chirpTimer = randomBirdInterval();
    }
  }
}

// Reads which ground surface (if any) the ground segment at world-x `x`
// declares ("gravel" for Level 2 / Stage 3, otherwise undefined/"dirt").
function getGroundSurfaceAt(x) {
  for (const g of world.def.ground) {
    if (x >= g.x && x < g.x + g.width) return g.surface || "dirt";
  }
  return null;
}

function clampCamera(targetX) {
  const half = VIEW_W / 2;
  let cx = targetX - half;

  // Clamp within the CURRENT level's own extent, not the whole merged
  // world — otherwise the camera can drift into the dead-zone gap
  // between levels and show empty (canvas-colored) background past
  // either level's edge. This keeps the right edge of Level 1's screen
  // always at BG.png's own right edge, and the left edge of Level 3's
  // screen always at BG3.png's own left edge.
  const section = WORLD.sections[getSectionIndexForX(targetX)];
  const ext = section ? LEVEL_EXTENTS[section.levelIndex] : null;
  const lo = ext ? ext.start : 0;
  const hi = ext ? Math.max(ext.start, ext.end - VIEW_W) : WORLD.width - VIEW_W;

  cx = Math.max(lo, cx);
  cx = Math.min(hi, cx);
  if (ext && ext.end - ext.start < VIEW_W) cx = ext.start;
  return cx;
}

// Toggles the title-screen art background on the overlay. Only used for the
// very first "Press Play" screen, since titlebg.png already has "TACTIC /
// TITLE PAGE" drawn into the art itself — so we hide the duplicate <h1> on
// that screen only and restore it everywhere else (level intros, pause,
// end screen) which keep the plain dark overlay styling.
function setTitleBackground(active) {
  if (active) {
    overlay.classList.add("title-bg");
    overlayTitle.style.display = "none";
  } else {
    overlay.classList.remove("title-bg");
    overlayTitle.style.display = "";
  }
}

function showStartOverlay() {
  playMenuMusic();
  setTitleBackground(true);
  overlayTitle.textContent = "TACTIC";
  overlayBtn.textContent = "Play";
  overlay.classList.remove("hidden");
  overlay.dataset.end = "";
  // Flags this as the title screen so the shared button handler below
  // knows "Play" should open Level Select rather than just dismissing
  // the overlay.
  overlay.dataset.title = "1";
}

function showEndOverlay() {
  setTitleBackground(false);

  overlayTitle.textContent = "You made it!";
  overlayText.textContent =
    "You've reached the end of the road, checkpoint by checkpoint.";
  overlayBtn.textContent = "Return To Menu";
  overlay.classList.remove("hidden");
  overlay.dataset.end = "1";
}

overlayBtn.addEventListener("click", () => {
  playButtonSound();

  if (overlay.dataset.title === "1") {
    playButtonSound();
    // "Play" on the title screen — hand off to the level-select screen
    // instead of dropping straight into gameplay. This is also where a
    // returning player picks up wherever they left off.
    overlay.dataset.title = "";
    overlay.classList.add("hidden");
    showLevelSelect();
    return;
  }
  if (overlay.dataset.pauseAction === "restart") {
    overlay.dataset.pauseAction = "";
    isPaused = false;
    const menuBtn = document.getElementById("overlay-menu-btn");
    if (menuBtn) menuBtn.remove();
    respawnPlayer();
    overlay.classList.add("hidden");
  } else if (overlay.dataset.end === "1") {
    overlay.dataset.end = "";

    loadWorld();
    showStartOverlay();
  } else {
    overlay.classList.add("hidden");
  }
});

restartBtn.addEventListener("click", () => {
  playButtonSound();
  respawnPlayer();
});

window.addEventListener("keydown", (e) => {
  // While the code-entry keypad is open, it owns all keyboard input.
  if (keypadEl && keypadEl.root.style.display === "flex") {
    if (/^Digit[0-9]$/.test(e.code)) {
      handleKeypadKey(e.code.replace("Digit", ""));
      e.preventDefault();
      return;
    }
    if (/^Numpad[0-9]$/.test(e.code)) {
      handleKeypadKey(e.code.replace("Numpad", ""));
      e.preventDefault();
      return;
    }
    if (e.code === "Backspace") {
      handleKeypadKey("⌫");
      e.preventDefault();
      return;
    }
    if (e.code === "Enter" || e.code === "NumpadEnter") {
      handleKeypadKey("Enter");
      e.preventDefault();
      return;
    }
    if (e.code === "Escape") {
      playButtonSound();
      hideKeypad();
      e.preventDefault();
      return;
    }
    e.preventDefault();
    return;
  }

  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
  if (e.code === "ArrowUp" || e.code === "Space" || e.code === "KeyW") {
    keys.up = true;
  }
  if (e.code === "KeyT") keys.t = true;
  if (e.code === "KeyH") keys.slow = true;
  if (e.code === "Escape") {
    if (!isPaused && overlay.classList.contains("hidden")) {
      // show pause menu
      isPaused = true;
      setTitleBackground(false);
      overlayTitle.textContent = "PAUSED";
      overlayBtn.textContent = "Restart From Checkpoint";
      overlay.dataset.pauseAction = "restart";
      overlay.classList.remove("hidden");
      // add main menu button if not already there
      let menuBtn = document.getElementById("overlay-menu-btn");
      if (!menuBtn) {
        menuBtn = document.createElement("button");
        menuBtn.id = "overlay-menu-btn";
        menuBtn.className = "menu-btn";
        menuBtn.textContent = "Main Menu";
        overlayBtn.parentNode.insertBefore(menuBtn, overlayBtn.nextSibling);
        menuBtn.addEventListener("click", () => {
          playButtonSound();
          isPaused = false;
          overlay.dataset.pauseAction = "";

          const menuBtn = document.getElementById("overlay-menu-btn");
          if (menuBtn) menuBtn.remove();

          loadWorld(); // RESET GAME STATE (whole map, back to the first checkpoint)
          showStartOverlay(); // SHOW TITLE SCREEN PROPERLY
        });
      }
    } else if (isPaused) {
      // ESC to resume
      isPaused = false;
      overlay.dataset.pauseAction = "";
      const menuBtn = document.getElementById("overlay-menu-btn");
      if (menuBtn) menuBtn.remove();
      overlay.classList.add("hidden");
    }
    e.preventDefault();
  }
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code)) {
    e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  if (e.code === "ArrowUp" || e.code === "Space" || e.code === "KeyW") {
    keys.up = false;
  }
  if (e.code === "KeyT") keys.t = false;
  if (e.code === "KeyH") keys.slow = false;
});

// ------------------------------------------------------------
// Collision helpers
// ------------------------------------------------------------

function getGroundSegmentsAt(x) {
  // returns array of {left, right, top} solid ground spans at world x
  // Start with the defined ground segments, then subtract any fallen trap ranges
  const segs = [];
  for (const g of world.def.ground) {
    segs.push({
      left: g.x,
      right: g.x + g.width,
      top: world.def.groundY,
      surface: g.surface || "dirt",
    });
  }

  for (const t of world.trapState) {
    if (!t.fallen) continue;
    const newSegs = [];
    for (const s of segs) {
      // no overlap
      if (t.x >= s.right || t.x + t.width <= s.left) {
        newSegs.push(s);
        continue;
      }
      // left piece
      if (t.x > s.left) {
        newSegs.push({
          left: s.left,
          right: Math.min(t.x, s.right),
          top: s.top,
          surface: s.surface,
        });
      }
      // right piece
      const rightStart = t.x + t.width;
      if (rightStart < s.right) {
        newSegs.push({
          left: Math.max(rightStart, s.left),
          right: s.right,
          top: s.top,
          surface: s.surface,
        });
      }
    }
    segs.length = 0;
    segs.push(...newSegs);
  }

  if (world.def.blocks && world.def.blocks.length) {
    for (const b of world.def.blocks) {
      segs.push({
        left: b.x,
        right: b.x + b.width,
        top: world.def.groundY - b.height,
      });
    }
  }

  return segs;
}

function getAllHazards() {
  const staticHazards = world.def.hazards || [];
  const dyn = world.dynamicHazards || [];
  return staticHazards.concat(dyn);
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// Rectangle-vs-block overlap, but carves a rounded top-right corner out
// of the block when it has a cornerRadius (used for the truck's sloped
// cab) so the player isn't blocked by empty air above that corner.
function overlapsBlock(px, py, pw, ph, bx, by, bw, bh, cornerRadius) {
  if (!rectsOverlap(px, py, pw, ph, bx, by, bw, bh)) return false;
  if (!cornerRadius) return true;
  const cx = bx + bw - cornerRadius;
  const cy = by + cornerRadius;
  const nearestX = Math.max(px, Math.min(cx, px + pw));
  const nearestY = Math.max(py, Math.min(cy, py + ph));
  if (nearestX >= cx && nearestY <= cy) {
    const dx = nearestX - cx;
    const dy = nearestY - cy;
    return dx * dx + dy * dy <= cornerRadius * cornerRadius;
  }
  return true;
}

// ------------------------------------------------------------
// Update
// ------------------------------------------------------------

function triggerJumpTraps() {
  // Called the instant the player leaves the ground via a jump.
  for (const t of world.trapState) {
    if (t.armed || t.fallen) continue;
    const centerX = t.x + t.width / 2;
    if (Math.abs(centerX - (player.x + player.w / 2)) <= TRAP_TRIGGER_RANGE) {
      t.armed = true;
      t.fallTimer = TRAP_FALL_DELAY;
    }
  }
}

function killPlayer() {
  if (!player.alive) return;
  player.alive = false;
  stopGravelFootsteps();
  stopDogBarkLoop();
  deathFlashTimer = 0.5;
  setTimeout(() => {
    respawnPlayer();
  }, 420);
}

function updateMovingPlatforms(dt) {
  for (const p of world.movingPlatforms) {
    const t = gameTime * p.speed * 0.01 + p.phase * Math.PI;
    // ping-pong via sine wave for smooth back-and-forth motion
    const norm = (Math.sin(t) + 1) / 2; // 0..1
    p.currentX = p.x + norm * p.range;
  }
}

// Patrolling ground hazards (Stage 5's hedge dogs): unlike the moving
// platforms' smooth ping-pong glide, these dogs walk in short bursts at
// their own pace, pause (both at the ends of their patrol and randomly
// mid-walk, like they're sniffing around), and turn around when they hit
// either edge of their range — meant to read as an actual walking
// animal instead of something sliding back and forth.
function updateGroundHazards(dt) {
  for (const g of world.groundHazards || []) {
    if (!g.range || g.range <= 0) {
      g.currentX = g.x;
      continue;
    }

    // Lazy-init this dog's own walk/pause state the first time it's
    // seen, so levels.js only has to describe the patrol range/speed —
    // the moment-to-moment behavior lives here.
    if (g._dir === undefined) {
      g.currentX = g.x;
      g._dir = 1;
      g._paused = true;
      g._pauseTimer = Math.random() * 0.6;
      g._moveTimer = 0;
      g._rate = 0.6 + Math.random() * 0.7; // this dog's current pace multiplier
    }

    if (g._paused) {
      g._pauseTimer -= dt;
      if (g._pauseTimer <= 0) {
        g._paused = false;
        // how long this walking burst lasts, and how fast, before the
        // next pause — re-rolled every time so no two bursts match
        g._moveTimer = 0.35 + Math.random() * 0.9;
        g._rate = 0.6 + Math.random() * 0.7;
      }
      continue;
    }

    const minX = g.x;
    const maxX = g.x + g.range;
    g.currentX += g._dir * g.speed * g._rate * dt;

    if (g.currentX <= minX) {
      g.currentX = minX;
      g._dir = 1; // turn around
      g._paused = true;
      g._pauseTimer = 0.3 + Math.random() * 0.8;
      continue;
    }
    if (g.currentX >= maxX) {
      g.currentX = maxX;
      g._dir = -1; // turn around
      g._paused = true;
      g._pauseTimer = 0.3 + Math.random() * 0.8;
      continue;
    }

    g._moveTimer -= dt;
    if (g._moveTimer <= 0) {
      // brief pause mid-patrol, not just at the ends
      g._paused = true;
      g._pauseTimer = 0.2 + Math.random() * 0.6;
    }
  }
}

function updateTraps(dt) {
  for (const t of world.trapState) {
    if (t.armed && !t.fallen) {
      t.fallTimer -= dt;
      if (t.fallTimer <= 0) {
        t.fallen = true;
      }
    }
    if (t.fallen && t.fallOffset < 400) {
      t.fallOffset += 1400 * dt;
    }
  }
}

// Cause-and-effect trigger: when the player clears a stacked box (a
// block with sprite "stackedbox"), queue the special black-hole trap
// to open (by arming its trapState entry). Only fires once per run.
function updateCauseAndEffectTriggers(dt) {
  if (!world || !world.def || !world.def.blocks) return;

  // If the player just landed this frame on a box or stacked box, trigger
  // the trap entry associated with that specific block.
  if (player.grounded && !player.wasGrounded) {
    const feetY = player.y + player.h;
    for (const b of world.def.blocks) {
      if (
        !(
          b.sprite === "stackedbox" ||
          b.sprite === "box" ||
          b.sprite === "2box" ||
          b.triggersHole
        )
      )
        continue;

      const top = world.def.groundY - b.height;
      const overlapX = player.x + player.w > b.x && player.x < b.x + b.width;
      if (overlapX && Math.abs(feetY - top) <= 8) {
        if (b.triggerHoleId) {
          const trap = world.trapState.find((tt) => tt.id === b.triggerHoleId);
          if (trap && !trap.armed && !trap.fallen) {
            trap.armed = true;
            trap.fallTimer = 0.6;
          }
        } else {
          const secIdx = getSectionIndexForX(b.x);
          const sec = WORLD.sections[secIdx];
          if (sec) {
            for (const tt of world.trapState) {
              if (tt.armed || tt.fallen) continue;
              if (tt.x >= sec.startX && tt.x < sec.endX) {
                tt.armed = true;
                tt.fallTimer = 0.6;
              }
            }
          }
        }
        break;
      }
    }
  }
}

// ---------- Section 4 (old "Level 4") gap expansion ----------
// Attached to `world` at load time as world.gapExpansion:
// {
//   triggered: false,
//   x: <section start> + 380, // left edge of gap (never moves)
//   width: 80,                // current gap width — grows rightward
//   maxWidth: 700,            // stops well short of the mailbox shelf
//   speed: 190,               // px/s the gap expands (tune this for difficulty)
// }
function initGapExpansion() {
  // Section 4 is the old Level 4, found by level/stage rather than a raw
  // section index so this keeps working regardless of where Level 1 ends
  // up sitting once more levels are merged in ahead of/behind it.
  const section = WORLD.sections.find(
    (s) => s.levelIndex === 0 && s.stageIndex === 3,
  );
  if (!section) {
    world.gapExpansion = null;
    return;
  }
  world.gapExpansion = {
    triggered: false,
    x: section.startX + 380,
    width: 80,
    maxWidth: 700,
    speed: 380,
  };
}

function updateGapExpansion(dt) {
  const g = world.gapExpansion;
  if (!g) return;

  // Trigger: player has crossed the gap and is standing on the right side
  if (!g.triggered) {
    const playerCenterX = player.x + player.w / 2;
    if (player.grounded && playerCenterX > g.x + g.width) {
      g.triggered = true;
    }
  }

  if (!g.triggered) return;

  // Grow the gap rightward
  g.width = Math.min(g.maxWidth, g.width + g.speed * dt);

  // Sync the trapState entry so the renderer and collision system see it
  const t = world.trapState.find((t) => t.id === "gap-seed");
  if (t) {
    t.width = g.width;
    // Make sure it's in the fully-fallen state so it renders black and
    // its ground is subtracted from getGroundSegmentsAt
    t.fallen = true;
    t.fallOffset = 400;
  }
}

// ---------- Flashing hazard boxes (Stage 5) ----------
// Each hazard tagged `flash: true` blinks on its own independent on/off
// cycle (flashOn seconds visible, flashOff seconds invisible, flashPhase
// offsetting where in that cycle it starts) so a row of boxes flickers
// at different times and rates instead of all in lockstep. Purely a
// draw-time check — collision in update() doesn't consult this, so a box
// still damages the player whether or not it's currently visible.
function isHazardVisible(hz) {
  const onDur = hz.flashOn !== undefined ? hz.flashOn : 0.6;
  const offDur = hz.flashOff !== undefined ? hz.flashOff : 0.3;
  const phase = hz.flashPhase || 0;
  const cycle = onDur + offDur;
  const t = ((gameTime + phase) % cycle) + cycle; // avoid negative modulo
  return t % cycle < onDur;
}

// ---------- Level 3 / Stage 1 — duck followers ----------
// Ducks always follow (no trigger/spawn-delay gating — they're already
// spawned in) but are clamped to their own stage's x-range so they
// can't be pulled past the mailbox into Stage 2.
function updateDuckFollowers(dt) {
  for (const d of world.duckState || []) {
    if (d.curY === null || d.curY === undefined) {
      d.curY = world.def.groundY - 40;
    }
    const targetX = player.x - d.followDistance;
    // Move at a fixed rate (d.speed px/s) toward the target instead of
    // exponential smoothing — smoothing scales the actual movement
    // speed with distance from the player, which reads as ducks moving
    // at different rates. A constant step, clamped so it doesn't
    // overshoot, moves all ducks at the same true rate.
    const diff = targetX - d.curX;
    const step = d.speed * dt;
    let nx;
    if (Math.abs(diff) <= step) {
      nx = targetX;
    } else {
      nx = d.curX + Math.sign(diff) * step;
    }
    nx = Math.max(d.minX, Math.min(d.maxX, nx));
    // Face the direction it's actually moving (chasing the mailman),
    // not the raw target direction, so it doesn't flip while pinned
    // against the mailbox clamp.
    if (nx > d.curX + 0.05) d.facing = 1;
    else if (nx < d.curX - 0.05) d.facing = -1;
    d.curX = nx;
    d.curY = world.def.groundY - 40;
  }
}

const DUCK_W = 34;
const DUCK_H = 40;

// Touching a duck damages the player and resets them to the start of
// the stage (same respawn flow as any other hazard). Returns true if
// the player was just killed, so update() can bail out for the frame.
function checkDuckCollisions() {
  for (const d of world.duckState || []) {
    if (
      rectsOverlap(
        player.x,
        player.y,
        player.w,
        player.h,
        d.curX,
        d.curY,
        DUCK_W,
        DUCK_H,
      )
    ) {
      killPlayer();
      return true;
    }
  }
  return false;
}

// ---------- Level 3 / Stage 2 — falling dialogue bubbles ----------
const BUBBLE_SIZE = 50;
const BUBBLE_WIDTH = 64; // stretched wider than tall

function updateBubbles(dt) {
  for (const b of world.bubbleState || []) {
    if (b.caught || b.missed) continue;

    // Don't start falling until the player has actually entered this
    // bubble's stage (levelIndex/stageIndex) — otherwise they'd already
    // be mid-fall (or missed) before the player even arrives.
    const section = WORLD.sections.find(
      (s) => s.levelIndex === b.levelIndex && s.stageIndex === b.stageIndex,
    );
    if (section && player.x < section.startX) continue;

    b.curY += b.fallSpeed * dt;
    b.curX += (b.driftSpeed || 0) * dt;

    if (
      rectsOverlap(
        player.x,
        player.y,
        player.w,
        player.h,
        b.curX - BUBBLE_WIDTH / 2,
        b.curY - BUBBLE_SIZE / 2,
        BUBBLE_WIDTH,
        BUBBLE_SIZE,
      )
    ) {
      b.caught = true;
      continue;
    }

    if (b.curY > world.def.groundY) {
      // Missed for good — only 5 bubbles fall in total, so a miss counts
      // against the stage instead of respawning for another try.
      b.missed = true;
    }
  }

  // Once every bubble has resolved (caught or missed), a miss anywhere
  // in the set fails the stage: reset to the beginning and the counter
  // resets with it (freshBubbleState() on respawn). Scoped to bubbles
  // belonging to the player's CURRENT stage only — otherwise a miss
  // recorded back in Stage 2 stays flagged forever and re-kills the
  // player on every later respawn, in every other stage.
  const curSection = getCurrentSection();
  const stageBubbles = (world.bubbleState || []).filter(
    (b) =>
      b.levelIndex === curSection.levelIndex &&
      b.stageIndex === curSection.stageIndex,
  );
  if (stageBubbles.length > 0) {
    const allResolved = stageBubbles.every((b) => b.caught || b.missed);
    const anyMissed = stageBubbles.some((b) => b.missed);
    if (allResolved && anyMissed) {
      killPlayer();
    }
  }
}

// How many of this mailbox's stage's bubbles are still uncaught? Used to
// gate the mailbox on Level 3 / Stage 2 — stages/mailboxes without any
// bubbles return 0 and are never gated.
function stageBubblesRemaining(mb) {
  const stageBubbles = (world.bubbleState || []).filter(
    (b) => b.stageIndex === mb.stageIndex && b.levelIndex === mb.levelIndex,
  );
  if (stageBubbles.length === 0) return 0;
  return stageBubbles.filter((b) => !b.caught).length;
}

// ---------- Stage 4 — pushing NPCs ----------
// Sized to match the player's height (64px), at businessman.png's
// native aspect ratio (52x80).
const PUSHING_NPC_W = 42;
const PUSHING_NPC_H = 64;
const PUSHING_NPC_SPEED = 80; // pixels per second
const PUSH_STRENGTH = 400; // knockback velocity in px/s

function updatePushingNpcs(dt) {
  for (const npc of world.pushingNpcState || []) {
    const minX = npc.minX;
    const maxX = npc.maxX;

    // Simple patrol with direction changes at boundaries
    npc.currentX += npc.direction * npc.speed * dt;

    if (npc.currentX <= minX) {
      npc.currentX = minX;
      npc.direction = 1;
    }
    if (npc.currentX >= maxX) {
      npc.currentX = maxX;
      npc.direction = -1;
    }
  }
}

function checkPushingNpcCollisions() {
  for (const npc of world.pushingNpcState || []) {
    const npcY = world.def.groundY - PUSHING_NPC_H;

    if (
      !rectsOverlap(
        player.x,
        player.y,
        player.w,
        player.h,
        npc.currentX,
        npcY,
        PUSHING_NPC_W,
        PUSHING_NPC_H,
      )
    ) {
      continue;
    }

    // Solid wall, not a jump-trigger: the player can't walk through the
    // NPC, so resolve them out to whichever side they're overlapping
    // from. Re-run every frame while overlapping, so if the NPC is
    // walking into a standing player it shoves them along with it
    // (rather than letting them clip through) — the player has to jump
    // over it to get past.
    const playerCenter = player.x + player.w / 2;
    const npcCenter = npc.currentX + PUSHING_NPC_W / 2;
    if (playerCenter < npcCenter) {
      player.x = npc.currentX - player.w;
    } else {
      player.x = npc.currentX + PUSHING_NPC_W;
    }
    player.vx = 0;
  }
}

// ---------- Level 3 / Stage 3 — supportive NPCs ----------
function updateSupportNPCs(dt) {
  const section = getCurrentSection();
  const baseFactor =
    section.baseSpeedFactor !== undefined ? section.baseSpeedFactor : 1;

  if (!world.npcState || world.npcState.length === 0) {
    // Nothing to charge against — ease back toward normal full speed.
    world.speedFactor += (1 - world.speedFactor) * Math.min(1, 3 * dt);
    return;
  }

  let targetFactor = baseFactor;
  for (const n of world.npcState) {
    const dx = player.x + player.w / 2 - n.x;
    const dy = player.y + player.h / 2 - n.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= n.radius) {
      n.charge = Math.min(n.chargeTime, n.charge + dt);
    } else if (n.charge > 0) {
      // Decays back toward zero once the player walks away, taking
      // their speed back down with it rather than holding the boost.
      n.charge = Math.max(0, n.charge - dt);
    }

    // Speed boost scales directly with how loaded the circle is: half
    // charge gives half the extra speed, a full charge gives the full
    // configured boostFactor.
    const fraction = n.charge / n.chargeTime;
    const boostMultiplier = 1 + (n.boostFactor - 1) * fraction;
    targetFactor = Math.max(targetFactor, baseFactor * boostMultiplier);
  }

  // Ease toward whichever target is currently active (base or boosted) —
  // this is what makes leaving an NPC's radius mid-boost decay smoothly
  // back down to baseSpeedFactor rather than snapping.
  world.speedFactor += (targetFactor - world.speedFactor) * Math.min(1, 2 * dt);
}

// ---------- Level 3 / Stage 5 — jump-boost NPCs ----------
// Same "stand near it, let it charge, get a temporary boost" shape as
// the Stage 3 supportive NPCs above, except the payoff is a taller jump
// instead of extra speed — enough to clear the tall building blocks in
// this stage and reach the final checkpoint. Scoped to Level 3 / Stage 5
// only via each NPC's stageIndex/levelIndex (set in levels.js), so it
// never touches Stage 3's speed-boost NPCs or any other stage.
function updateJumpBoostNpcs(dt) {
  let bestFraction = 0;
  let bestMultiplier = 1;

  for (const n of world.jumpBoostState || []) {
    const dx = player.x + player.w / 2 - n.x;
    const dy = player.y + player.h / 2 - n.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // n.radius is deliberately tight — the player has to be directly
    // below or within a very close range of the circle to load it at
    // all. Stepping a bit further away unloads it again (discharge),
    // it doesn't just hold at whatever it reached.
    if (dist <= n.radius) {
      n.charge = Math.min(n.chargeTime, n.charge + dt);
    } else {
      const rate = n.dischargeRate !== undefined ? n.dischargeRate : 1;
      n.charge = Math.max(0, n.charge - dt * rate);
    }

    const fraction = n.charge / n.chargeTime;
    if (fraction > bestFraction) {
      bestFraction = fraction;
      // Jump height is relative to how loaded the circle is: half-loaded
      // gives half of the extra jump height, fully loaded gives the full
      // configured jumpMultiplier.
      bestMultiplier = 1 + (n.jumpMultiplier - 1) * fraction;
    }
  }

  // Live boost, not a held timer — it reflects the circle's current
  // charge, so it fades the instant the player steps away and the
  // charge starts draining.
  player.jumpBoostMultiplier = bestFraction > 0 ? bestMultiplier : 1;
  player.jumpBoostTimer = bestFraction > 0 ? 0.05 : 0;
}

function getEffectiveSpeedFactor() {
  let factor = world.speedFactor !== undefined ? world.speedFactor : 1;
  if (player.slowTimer > 0) factor *= player.slowFactor;
  return factor;
}

function update(dt) {
  if (!player.alive) return;

  if (player.invulnTimer > 0) player.invulnTimer -= dt;
  if (player.slowTimer > 0) player.slowTimer -= dt;
  if (player.jumpBoostTimer > 0) player.jumpBoostTimer -= dt;

  // The bird freeze (and its warning) is exclusive to Level 2 / Stage 1,
  // before that stage's mailbox is reached — force-clear it immediately
  // once the player passes that checkpoint, so it can never bleed into
  // Stage 2.
  if (!areLevel2Stage1BirdsActive()) freezeTimer = 0;
  if (freezeTimer > 0) freezeTimer -= dt;
  const isFrozen = freezeTimer > 0;

  updateMovingPlatforms(dt);
  updateGroundHazards(dt);
  updateTraps(dt);
  updateCauseAndEffectTriggers(dt);
  updateGapExpansion(dt);
  updateDuckFollowers(dt);
  updateBubbles(dt);
  updatePushingNpcs(dt);
  updateSupportNPCs(dt);
  updateJumpBoostNpcs(dt);
  updateBirds(dt);
  updateCarsAndNpc(dt);
  updateWeather(dt);
  updateBarkState(dt);

  // horizontal input
  // Normal levels move at a flat MOVE_SPEED. Level 1 / Stage 3 ("Delayed
  // Tics") has a slippery feel: smooth velocity changes on the ground
  // instead of instant accel. Checked by level/stage rather than a raw
  // section index so this keeps pointing at the right stage regardless
  // of where that stage ends up sitting once more levels are merged in.
  // While frozen (a bird just chirped — Level 2), input is ignored.
  // Holding "H" sneaks at SNEAK_SPEED instead of MOVE_SPEED — its real
  // payoff is silencing footsteps on Level 2 / Stage 3's gravel.
  const effFactor = getEffectiveSpeedFactor();
  const baseSpeed = keys.slow ? SNEAK_SPEED : MOVE_SPEED;
  const inverted = isControlsInverted();
  const rawLeft = !isFrozen && keys.left;
  const rawRight = !isFrozen && keys.right;
  const effectiveLeft = inverted ? rawRight : rawLeft;
  const effectiveRight = inverted ? rawLeft : rawRight;
  const targetVx = effectiveLeft
    ? -baseSpeed * effFactor
    : effectiveRight
      ? baseSpeed * effFactor
      : 0;

  const curSection = getCurrentSection();
  const isSlipperyStage =
    curSection.levelIndex === 0 && curSection.stageIndex === 2;

  if (isSlipperyStage && player.grounded) {
    // smaller accel => more slippery on ground only
    const slipAccel = 1.0;
    const blend = Math.min(1, slipAccel * dt);
    player.vx += (targetVx - player.vx) * blend;
    if (player.vx < 0) player.facing = -1;
    else if (player.vx > 0) player.facing = 1;
  } else {
    player.vx = targetVx;
    if (player.vx < 0) player.facing = -1;
    else if (player.vx > 0) player.facing = 1;
  }

  // jump
  if (keys.up && player.grounded && !isFrozen) {
    // Level 3 / Stage 5: a charged-up jump-boost NPC temporarily raises
    // how high the player can jump, so they can clear the stage's tall
    // building blocks. Everywhere else this is a no-op since
    // jumpBoostTimer stays at 0.
    const boosted = player.jumpBoostTimer > 0;
    player.vy = boosted
      ? JUMP_VELOCITY * player.jumpBoostMultiplier
      : JUMP_VELOCITY;
    player.grounded = false;
    playJumpSound();
    triggerJumpTraps();
  }

  // gravity
  player.vy += GRAVITY * dt;

  // integrate horizontal
  const prevX = player.x;
  player.x += player.vx * dt;

  // horizontal collision with blocking `blocks` (solid obstacles)
  if (world.def.blocks && world.def.blocks.length) {
    for (const b of world.def.blocks) {
      const bx = b.x;
      const bTop = world.def.groundY - b.height;
      if (
        overlapsBlock(
          player.x,
          player.y,
          player.w,
          player.h,
          bx,
          bTop,
          b.width,
          b.height,
          b.cornerRadius,
        )
      ) {
        if (player.x > prevX) {
          // moved right into a block
          player.x = bx - player.w;
        } else if (player.x < prevX) {
          // moved left into a block
          player.x = bx + b.width;
        }
        player.vx = 0;
      }
    }
  }

  // A locked mailbox (Level 2-2's code puzzle) blocks an invisible wall
  // spanning the full screen height, not just the mailbox sprite's own
  // hitbox, so the player can't walk or jump past it to skip the
  // checkpoint. Dropped the instant the correct code unlocks it.
  for (const mb of world.mailboxes) {
    if (!mb.locked) continue;
    const wallTop = 0;
    const wallHeight = world.def.groundY;
    const touchingWall = rectsOverlap(
      player.x,
      player.y,
      player.w,
      player.h,
      mb.x,
      wallTop,
      mb.width,
      wallHeight,
    );
    if (touchingWall) {
      if (player.x > prevX) {
        player.x = mb.x - player.w;
        // Reaching the wall from the left is "arriving at the mailbox" —
        // prompt the code keypad right here, since the overlap-based
        // mailbox check below can never fire once this wall has already
        // pushed the player back out of the mailbox's own hitbox.
        if (!mb._suppressReopen) openKeypadForMailbox(mb);
      } else if (player.x < prevX) {
        player.x = mb.x + mb.width;
      }
      player.vx = 0;
    } else {
      mb._suppressReopen = false;
    }
  }

  // horizontal collision with the ground itself, treated as a solid wall
  // on its sides. Ground tiles only ever resolved as a "stand on top of
  // it" surface before, so a falling/jumping player could be pushed
  // sideways straight through the edge of a ground slab (e.g. an
  // elevated step) and end up embedded inside it instead of being
  // blocked by it like a cliff face.
  const wallSegs = getGroundSegmentsAt(player.x);
  for (const seg of wallSegs) {
    const overlapX = player.x + player.w > seg.left && player.x < seg.right;
    const embedded = player.y + player.h > seg.top + 4;
    if (overlapX && embedded) {
      if (player.x > prevX) {
        player.x = seg.left - player.w;
      } else if (player.x < prevX) {
        player.x = seg.right;
      }
      player.vx = 0;
    }
  }

  player.x = Math.max(0, Math.min(world.def.width - player.w, player.x));

  // integrate vertical
  player.y += player.vy * dt;

  // ---- collisions: ground segments ----
  player.grounded = false;
  let standingSurface = null;
  const feetY = player.y + player.h;
  const segs = getGroundSegmentsAt(player.x);
  for (const seg of segs) {
    const overlapX = player.x + player.w > seg.left && player.x < seg.right;
    if (
      overlapX &&
      player.vy >= 0 &&
      feetY >= seg.top &&
      feetY - player.vy * dt <= seg.top + 12
    ) {
      player.y = seg.top - player.h;
      player.vy = 0;
      player.grounded = true;
      standingSurface = seg.surface || null;
    }
  }

  // ---- collisions: moving platforms ----
  for (const p of world.movingPlatforms) {
    const px = p.currentX !== undefined ? p.currentX : p.x;
    const overlapX = player.x + player.w > px && player.x < px + p.width;
    const top = p.y;
    if (
      overlapX &&
      player.vy >= 0 &&
      feetY >= top &&
      feetY - player.vy * dt <= top + 14
    ) {
      player.y = top - player.h;
      player.vy = 0;
      player.grounded = true;
      // carry player with platform horizontal motion
      player.x += px - (p.lastX !== undefined ? p.lastX : px);
    }
    p.lastX = px;
  }

  // ---- gravel footstep sound + noise meter (Level 2 / Stage 3) ----
  const isMovingOnGround = player.grounded && Math.abs(player.vx) > 5;
  const isNoisy =
    isMovingOnGround && standingSurface === "gravel" && !keys.slow;
  if (isNoisy) {
    startGravelFootsteps();
  } else {
    stopGravelFootsteps();
  }
  if (standingSurface === "gravel" || noiseLevel > 0) {
    noiseLevel += (isNoisy ? NOISE_RATE_UP : -NOISE_RATE_DOWN) * dt;
    noiseLevel = Math.max(0, Math.min(NOISE_MAX, noiseLevel));
    if (noiseLevel >= NOISE_MAX) {
      killPlayer();
      return;
    }
  }

  // ---- hazards (flashing tic blocks) ----
  // hz.y lets a level (e.g. Level 5's airborne hazards) place a hazard at an
  // explicit height instead of sitting on the ground. Flashing hazards
  // (`flash: true`) skip collision entirely while flashed out — they're
  // not just invisible then, they're genuinely not there, so the player
  // can walk straight through during the "off" phase.
  for (const hz of getAllHazards()) {
    if (hz.flash && !isHazardVisible(hz)) continue;

    const hzY = hz.y !== undefined ? hz.y : world.def.groundY - hz.height;
    if (
      rectsOverlap(
        player.x,
        player.y,
        player.w,
        player.h,
        hz.x,
        hzY,
        hz.width,
        hz.height,
      )
    ) {
      killPlayer();
      return;
    }
  }

  // ---- patrolling ground hazards (e.g. Stage 5's hedge dogs) ----
  for (const g of world.groundHazards || []) {
    const gx = g.currentX !== undefined ? g.currentX : g.x;
    const gy = world.def.groundY - g.height;
    if (
      rectsOverlap(
        player.x,
        player.y,
        player.w,
        player.h,
        gx,
        gy,
        g.width,
        g.height,
      )
    ) {
      killPlayer();
      return;
    }
  }

  // ---- Level 3 / Stage 1 — duck followers (lethal on touch) ----
  if (checkDuckCollisions()) return;

  // ---- Stage 4 — pushing NPCs ----
  checkPushingNpcCollisions();

  // ---- fell into a pit / off the world ----
  // Each section keeps its own "how far can you fall before you die" rule
  // (e.g. the old Level 5's tall vertical climb needed a much lower limit
  // than the default), chosen by whichever section the player is over.
  const fallLimit = WORLD.sections[getSectionIndexForX(player.x)].fallLimit;
  if (player.y > fallLimit) {
    killPlayer();
    return;
  }

  // ---- mailbox checkpoints ----
  // mb.y lets a section (e.g. the old Level 5's door perched up high)
  // override the default "sitting on the ground" position. Hitbox size
  // (56x90) is unchanged and still matches mailbox.png exactly. Touching
  // a mailbox sets it as the respawn point; it no longer ends the level.
  // Level 3 / Stage 2's mailbox is additionally gated: it won't activate
  // until every falling bubble in that stage has been caught.
  for (const mb of world.mailboxes) {
    const mbTop = mb.y !== undefined ? mb.y : world.def.groundY - mb.height;
    const overlapping = rectsOverlap(
      player.x,
      player.y,
      player.w,
      player.h,
      mb.x,
      mbTop,
      mb.width,
      mb.height,
    );
    if (overlapping) {
      if (mb.locked) {
        if (!mb._suppressReopen) openKeypadForMailbox(mb);
        continue;
      }
      if (stageBubblesRemaining(mb) > 0) continue; // blocked until all bubbles caught
      activateCheckpoint(mb);
    } else {
      mb._suppressReopen = false;
    }
  }

  updateLevelLabel();

  // update grounded memory for next-frame event detection
  player.wasGrounded = player.grounded;

  // scroll the camera to follow the player across the full continuous map
  camera.x = clampCamera(player.x + player.w / 2);
}

// Marks a mailbox as this run's latest checkpoint (once), records the
// stage as completed in the persistent save, and figures out where that
// leaves the player: on to the next stage's respawn point, or — if that
// was the last stage in this level — off to the Level Select screen so
// they can choose where to go next. Reaching the very last stage of the
// very last level still ends the game like before.

/*
function activateCheckpoint(mb) {
  if (mb.activated) return;
  mb.activated = true;
  playMailboxBellSound();

  Progress.completeStage(mb.levelIndex, mb.stageIndex);

  // "Last stage of the level" means the last stage actually built for
  // this level (some levels, like Level 2, have fewer than
  // STAGES_PER_LEVEL stages built so far), not a hardcoded count.
  const builtStagesForLevel = WORLD.sections.filter(
    (s) => s.levelIndex === mb.levelIndex,
  ).length;
  const isLastStageOfLevel = mb.stageIndex === builtStagesForLevel - 1;
  const isLastLevel = mb.levelIndex === LEVEL_COUNT - 1;

  if (isLastStageOfLevel && isLastLevel) {
    // The true end of the game (Level 5's 5th stage). Dormant for now
    // since Levels 2, 4, 5 aren't built — this fires once they exist.
    showEndOverlay();
    return;
  }

  // Respawn point becomes wherever this checkpoint is (mirrors the old
  // "checkpoint = the mailbox you just hit" behavior).
  checkpoint = {
    x: mb.x,
    y: mb.y !== undefined ? mb.y : world.def.groundY - mb.height,
  };

  if (isLastStageOfLevel) {
    // Cleared every stage in this level — hand the player back to Level
    // Select to pick where to go next.
    showLevelSelect();
  }
}
*/

function activateCheckpoint(mb) {
  const firstTime = !mb.activated;
  mb.activated = true;

  // Always sync this run's respawn point, even if this checkpoint was
  // already completed in a previous session.
  checkpoint = {
    x: mb.x,
    y: mb.y !== undefined ? mb.y : world.def.groundY - mb.height,
  };

  if (!firstTime) return; // everything below only happens the very first time

  playMailboxBellSound();
  Progress.completeStage(mb.levelIndex, mb.stageIndex);

  const builtStagesForLevel = WORLD.sections.filter(
    (s) => s.levelIndex === mb.levelIndex,
  ).length;
  const isLastStageOfLevel = mb.stageIndex === builtStagesForLevel - 1;
  const isLastLevel = mb.levelIndex === LEVEL_COUNT - 1;

  if (isLastStageOfLevel && isLastLevel) {
    showEndOverlay();
    return;
  }

  if (isLastStageOfLevel) {
    showLevelSelect();
  }
}

// ------------------------------------------------------------
// Render
// ------------------------------------------------------------

function draw() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  // shift the whole world left by the camera's position so the section
  // currently under the player is what's visible — everything below is
  // drawn in world (not screen) coordinates.
  ctx.translate(-camera.x, 0);

  // ground/backdrop art — BG.png is drawn once in world space here and
  // naturally pans/cycles under the player as the camera scrolls across
  // each checkpoint, instead of sitting fixed to the screen. See the
  // note by LEVEL_BG_SRC above re: BG.png only covering Level 1's
  // stretch of the map today.
  for (const levelIdxStr of Object.keys(LEVEL_EXTENTS)) {
    const levelIdx = Number(levelIdxStr);
    const ext = LEVEL_EXTENTS[levelIdx];
    const w = ext.end - ext.start;
    // Level 2 gets BG2.png, Level 3 gets BG3.png; every other built level
    // falls back to BG.png, each stretched only across its own stretch of
    // the map so the levels read as separate spaces.
    const img =
      levelIdx === 2 ? level3BgImg : levelIdx === 1 ? level2BgImg : levelBgImg;
    const loaded =
      levelIdx === 2
        ? level3BgLoaded
        : levelIdx === 1
          ? level2BgLoaded
          : levelBgLoaded;
    if (loaded) {
      ctx.drawImage(img, ext.start, 0, w, VIEW_H);
    }
  }

  drawWeather();

  // ground line — semi-transparent so the dirt texture from levelbg.png
  // shows through instead of being completely hidden behind a flat fill
  ctx.fillStyle = "rgba(191, 191, 191, 0)";
  /*
  for (const g of world.def.ground) {
    ctx.fillRect(g.x, world.def.groundY, g.width, VIEW_H);
  }
    */
   for (const g of world.def.ground) {
  ctx.fillRect(g.x, world.def.groundY, g.width, VIEW_H);

  // placeholder visual for gravel/sneak zones
  if (g.surface === "gravel") {
    ctx.fillStyle = "#888";
    ctx.fillRect(
      g.x,
      world.def.groundY - 8,
      g.width,
      8
    );

    ctx.fillStyle = "rgba(191, 191, 191, 0)";
  }
}

  for (const t of world.trapState) {
    if (t.fallen) {
      // falling slab graphic dropping out of view
      ctx.fillStyle = "tan";
      ctx.fillRect(t.x, world.def.groundY + t.fallOffset, t.width, 14);
      // pit interior (darker) revealed behind it
      ctx.fillStyle = "#38201F";
      ctx.fillRect(t.x, world.def.groundY, t.width, VIEW_H);
    } else if (t.armed) {
      // subtle pre-collapse tremor cue
      const shake = Math.sin(gameTime * 60) * 2;
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(t.x + shake, world.def.groundY, t.width, 6);
    }
  }

  // moving platforms (each can carry its own `color`/`colorSide` so it
  // reads as part of whatever it's sitting on — a hedge, a tree branch,
  // a rooftop — instead of every platform in the game sharing one look;
  // falls back to the original green-on-brown if a stage doesn't specify).
  for (const p of world.movingPlatforms) {
    const px = p.currentX !== undefined ? p.currentX : p.x;
    ctx.fillStyle = p.color || "#6ABB40";
    ctx.fillRect(px, p.y, p.width, 14);
    ctx.fillStyle = p.colorSide || "#754F33";
    ctx.fillRect(px, p.y + 14, p.width, 8);
  }

  // patrolling ground hazards (e.g. Stage 5's hedge dogs) — always
  // visible, always damaging. These use whitedog.png (Stage 5's own
  // sprite, kept separate from Stage 1's dog.png).
  for (const g of world.groundHazards || []) {
    const gx = g.currentX !== undefined ? g.currentX : g.x;
    const gy = world.def.groundY - g.height;
    const useDog = g.sprite === "dog";
    const img = useDog ? dogImg : whitedogImg;
    const imgReady = useDog ? dogLoaded : whitedogLoaded;
    if (imgReady) {
      ctx.drawImage(img, gx, gy, g.width, g.height);
    }
  }

  // blocking blocks (solid obstacles the player must jump over)
  for (const b of world.def.blocks || []) {
    const top = world.def.groundY - b.height;
    if (b.sprite === "truck") {
      if (truckLoaded) ctx.drawImage(truckImg, b.x, top, b.width, b.height);
    } else if (b.sprite === "stackedbox") {
      if (box2Loaded) {
        const half = b.height / 2;
        ctx.drawImage(box2Img, b.x, top, b.width, half);
        ctx.drawImage(box2Img, b.x, top + half, b.width, half);
      }
    } else if (b.sprite === "box") {
      if (boxLoaded) ctx.drawImage(boxImg, b.x, top, b.width, b.height);
    } else if (box2Loaded) {
      ctx.drawImage(box2Img, b.x, top, b.width, b.height);
    }
  }

  // hazards (box/dog/whitedog tics). Last-stage flashing hazards
  // (`flash: true`) blink on/off — collision in update() now skips them
  // entirely while they're flashed out, so the player can walk straight
  // through during the "off" phase, not just visually miss them.
  for (const hz of getAllHazards()) {
    if (hz.flash && !isHazardVisible(hz)) continue;

    const hzY = hz.y !== undefined ? hz.y : world.def.groundY - hz.height;
    const img =
      hz.sprite === "whitedog"
        ? whitedogImg
        : hz.sprite === "dog"
          ? dogImg
          : boxImg;
    const imgReady =
      hz.sprite === "whitedog"
        ? whitedogLoaded
        : hz.sprite === "dog"
          ? dogLoaded
          : boxLoaded;

    if (imgReady) {
      ctx.drawImage(img, hz.x, hzY, hz.width, hz.height);
    }
  }

  // ---- Level 3 / Stage 1 — duck followers ----
  for (const d of world.duckState || []) {
    if (!d.active) continue;

    if (duckLoaded) {
      if (d.facing === 1) {
        ctx.save();
        ctx.translate(d.curX + DUCK_W, d.curY);
        ctx.scale(-1, 1);
        ctx.drawImage(duckImg, 0, 0, DUCK_W, DUCK_H);
        ctx.restore();
      } else {
        ctx.drawImage(duckImg, d.curX, d.curY, DUCK_W, DUCK_H);
      }
    }
  }

  // ---- Level 3 / Stage 2 — falling dialogue bubbles ----
  for (const b of world.bubbleState || []) {
    if (b.caught || b.missed) continue;
    if (bubbleLoaded) {
      ctx.drawImage(
        bubbleImg,
        b.curX - BUBBLE_WIDTH / 2,
        b.curY - BUBBLE_SIZE / 2,
        BUBBLE_WIDTH,
        BUBBLE_SIZE,
      );
    }
  }

  // ---- Level 3 / Stage 3 — supportive NPCs ----
  for (const n of world.npcState || []) {
    ctx.fillStyle = n.charge >= n.chargeTime ? "#7CD992" : "#9FB6C9";
    ctx.beginPath();
    ctx.arc(n.x, n.y - 32, 20, 0, Math.PI * 2);
    ctx.fill();
    // charge ring
    ctx.strokeStyle = "#2E7D32";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(
      n.x,
      n.y - 32,
      26,
      -Math.PI / 2,
      -Math.PI / 2 + (n.charge / n.chargeTime) * Math.PI * 2,
    );
    ctx.stroke();
  }

  // ---- Level 3 / Stage 5 — jump-boost NPCs ----
  // Same charge-ring look as the Stage 3 supportive NPCs, in a blue
  // palette so it reads as a different kind of boost (jump vs. speed).
  for (const n of world.jumpBoostState || []) {
    ctx.fillStyle = n.charge >= n.chargeTime ? "#7EC8FF" : "#9FB6C9";
    ctx.beginPath();
    ctx.arc(n.x, n.y - 32, 20, 0, Math.PI * 2);
    ctx.fill();
    // charge ring
    ctx.strokeStyle = "#1B5FA8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(
      n.x,
      n.y - 32,
      26,
      -Math.PI / 2,
      -Math.PI / 2 + (n.charge / n.chargeTime) * Math.PI * 2,
    );
    ctx.stroke();
  }

  // ---- Stage 4 — pushing NPCs ----
  for (const npc of world.pushingNpcState || []) {
    const npcY = world.def.groundY - PUSHING_NPC_H;

    if (npcLoaded) {
      // direction 1 = walking right; sprite's native art faces right,
      // so flip when moving left (same convention as the ducks, inverted).
      if (npc.direction === -1) {
        ctx.save();
        ctx.translate(npc.currentX + PUSHING_NPC_W, npcY);
        ctx.scale(-1, 1);
        ctx.drawImage(npcImg, 0, 0, PUSHING_NPC_W, PUSHING_NPC_H);
        ctx.restore();
      } else {
        ctx.drawImage(npcImg, npc.currentX, npcY, PUSHING_NPC_W, PUSHING_NPC_H);
      }
    }
  }

  // mailbox checkpoints, honoring each one's mb.y override. Renders
  // mailboxup.png until the checkpoint is reached, then swaps to
  // mailboxdown.png to show that stage has been cleared.
  for (const mb of world.mailboxes) {
    const mbTop = mb.y !== undefined ? mb.y : world.def.groundY - mb.height;

    const mailboxImg = mb.activated ? mailboxDownImg : mailboxUpImg;
    const mailboxReady = mb.activated ? mailboxDownLoaded : mailboxUpLoaded;

    if (mailboxReady) {
      ctx.drawImage(mailboxImg, mb.x, mbTop, mb.width, mb.height);
    }
  }

  // ---- Level 2 — decorative trees + perched birds ----
  for (const tr of world.def.trees || []) {
    if (treeLoaded) {
      ctx.drawImage(
        treeImg,
        tr.x,
        world.def.groundY - tr.height,
        tr.width,
        tr.height,
      );
    }
  }
  for (const b of world.birdState || []) {
    if (birdImgLoaded) {
      ctx.drawImage(birdImg, b.x, b.y, b.width, b.height);
    }
  }

  // ---- Level 2 / Stage 2 — code-lock NPC + cars + speech bubble ----
  drawCarsAndNpc();

  // player
  if (player.alive || deathFlashTimer > 0) {
    drawPlayer();
  }

  // ---- Level 3 / Stage 2 — catch counter above the player's head ----
  // Gated by the actual mailbox boundaries (the checkpoint before this
  // stage and this stage's own mailbox) rather than the section's raw
  // start/endX, so it can't bleed a bit into the next stage/checkpoint.
  if (player.alive) {
    const curSection = getCurrentSection();
    const stageBubbles = (world.bubbleState || []).filter(
      (b) =>
        b.levelIndex === curSection.levelIndex &&
        b.stageIndex === curSection.stageIndex,
    );
    if (stageBubbles.length > 0) {
      const ownMailbox = world.mailboxes.find(
        (m) =>
          m.levelIndex === curSection.levelIndex &&
          m.stageIndex === curSection.stageIndex,
      );
      const prevMailbox = world.mailboxes.find(
        (m) =>
          m.levelIndex === curSection.levelIndex &&
          m.stageIndex === curSection.stageIndex - 1,
      );
      const lo = prevMailbox ? prevMailbox.x : curSection.startX;
      const hi = ownMailbox ? ownMailbox.x + ownMailbox.width : curSection.endX;

      if (player.x >= lo && player.x <= hi) {
        const caught = stageBubbles.filter((b) => b.caught).length;
        const text = `${caught}/${stageBubbles.length}`;
        const tx = player.x + player.w / 2;
        const ty = player.y - 16;
        ctx.font = "bold 20px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000";
        ctx.strokeText(text, tx, ty);
        ctx.fillStyle = "#fff";
        ctx.fillText(text, tx, ty);
        ctx.textAlign = "left";
      }
    }
  }

  // ---- Level 2 / Stage 3 \u2014 noise meter above the player's head ----
  if (
    player.alive &&
    (getGroundSurfaceAt(player.x) === "gravel" || noiseLevel > 0)
  ) {
    const barW = 46;
    const barH = 7;
    const bx = player.x + player.w / 2 - barW / 2;
    const by = player.y - 16;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = noiseLevel > NOISE_MAX * 0.7 ? "#ff5b5b" : "#f0c95f";
    ctx.fillRect(bx, by, barW * (noiseLevel / NOISE_MAX), barH);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);
  }

  // ---- Level 2 — bird-chirp freeze indicator above the player's head ----
  if (player.alive && (freezeTimer > 0 || isBirdWarningActive())) {
    const pulse = 0.6 + Math.sin(gameTime * 14) * 0.4;
    const tx = player.x + player.w / 2;
    const ty = player.y - 30;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#ffd23f";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", tx, ty + 1);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  // ---- Level 2 / Stage 5 — red warning text before the dogs start barking ----
  if (player.alive && isBarkWarningActive()) {
    const barkPulse = 0.6 + Math.sin(gameTime * 14) * 0.4;
    ctx.globalAlpha = barkPulse;
    ctx.fillStyle = "#ff3b3b";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("DOGS BARKING SOON — CONTROLS WILL FLIP!", VIEW_W / 2, 60);
    ctx.fillText("DOGS BARKING SOON — CONTROLS WILL FLIP!", VIEW_W / 2, 60);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  ctx.restore();
}
function drawPlayer() {
  // Level 5's blink mechanic drives the last stage's hazard boxes (see
  // draw()'s hazard loop), not the player — the player always renders
  // normally.
  const x = player.x;
  const y = player.y;
  const w = player.w;
  const h = player.h;

  // no sprite fallback — wait for the real image
  if (!spriteLoaded) {
    return;
  }

  // --------------------------------------------------------
  // ANIMATION
  // --------------------------------------------------------
  const row = player.facing === -1 ? 0 : 1;

  // Animate only while a direction key is actually held down. Using vx
  // here would keep the walk-cycle running on Level 1 / Stage 3 while
  // the player slides to a stop from friction after letting go of the
  // key.
  const isMoving = player.grounded && (keys.left || keys.right);

  const col = isMoving
    ? Math.floor((gameTime / SPRITE_FRAME_DURATION) % SPRITE_COLS)
    : 0;

  const sx = col * SPRITE_FRAME_W;
  const sy = row * SPRITE_FRAME_H;

  // --------------------------------------------------------
  // SCALE + FOOT LOCK (THIS FIXES FLOATING FEET)
  // --------------------------------------------------------
  const SPRITE_SCALE = 0.4; // adjust to taste

  const drawW = SPRITE_FRAME_W * SPRITE_SCALE;
  const drawH = SPRITE_FRAME_H * SPRITE_SCALE;

  const drawX = x + w / 2 - drawW / 2;
  const drawY = y + h - drawH;

  ctx.drawImage(
    spriteSheet,
    sx,
    sy,
    SPRITE_FRAME_W,
    SPRITE_FRAME_H,
    drawX,
    drawY,
    drawW,
    drawH,
  );
}

// ------------------------------------------------------------
// Main loop
// ------------------------------------------------------------

function frame(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  let dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  dt = Math.min(dt, 1 / 30); // clamp huge gaps (tab switch etc)

  const levelSelectOpen =
    typeof levelSelectEl !== "undefined" &&
    levelSelectEl &&
    levelSelectEl.root.style.display !== "none";

  if (!overlay.classList.contains("hidden") || levelSelectOpen) {
    // paused while overlay (level intro / end screen) or the level-select
    // grid is up
    requestAnimationFrame(frame);
    return;
  }

  gameTime += dt;
  if (deathFlashTimer > 0) deathFlashTimer -= dt;

  update(dt);
  draw();

  requestAnimationFrame(frame);
}

preloadAllAssets().then(() => {
  loadWorld();
  showStartOverlay();
  requestAnimationFrame(frame);
});
