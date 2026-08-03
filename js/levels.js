// ============================================================
// LEVEL 1 — five stages/checkpoints (L1-1 through L1-5).
// Levels 2, 4, 5 haven't been built yet; see the WORLD assembly at the
// bottom of this file for how Level 1 and Level 3 plug into the 5x5
// level-select grid.
// ============================================================
const LEVEL_1_STAGES = [
  {
    title: "Stage 1 — Cause-and-Effect Tics",
    intro:
      "From the outside, everything looks calm and ordinary.\n" +
      "But one sudden movement — and the ground gives way beneath you.\n" +
      "Careful what you jump for.",
    width: 1900,
    groundY: 550,
    spawn: { x: 80, y: 450 },
    door: { x: 1770, width: 56, height: 90 },
    ground: [
      { x: 0, width: 400 },
      { x: 760, width: 1140 },
    ],

    blocks: [
      { x: 820, width: 79, height: 97, sprite: "2box", triggerHoleId: "l1-1-box-pit-1" },
      { x: 1480, width: 79, height: 97, sprite: "2box", triggerHoleId: "l1-1-box-pit-2" },
    ],

    trapGround: [
      {
        x: 400,
        width: 360,
        id: "l1-1-pit",
        prefallen: true,
      },
      {
        x: 920,
        width: 120,
        id: "l1-1-box-pit-1",
      },
      {
        x: 1560,
        width: 120,
        id: "l1-1-box-pit-2",
      },
    ],

    movingPlatforms: [
      {
        x: 520,
        y: 550,
        width: 120,
        range: 100,
        speed: 160,
        phase: 0,
      },
    ],
    hazards: [],
  },

  {
    title: "Stage 2 — Blinking Dogs",
    intro:
      "Dogs in their houses blink in and out.\n" +
      "Time your movement to slip past them when they vanish.\n" +
      "Touch one and you're done.",
    width: 1900,
    groundY: 550,
    spawn: { x: 80, y: 450 },
    door: { x: 1770, width: 56, height: 90 },
    ground: [{ x: 0, width: 1900 }],

    blocks: [],
    trapGround: [],
    movingPlatforms: [],

    // Blinking dogs that appear/disappear on their own cycle. Each dog
    // has its own flashOn/flashOff/flashPhase so they don't all blink in sync.
    // Player must time their movement to avoid touching a visible dog.
    hazards: [
      {
        x: 350,
        width: 79,
        height: 56,
        sprite: "dog",
        flash: true,
        flashOn: 0.8,
        flashOff: 1.2,
        flashPhase: 0,
      },
      {
        x: 950,
        width: 79,
        height: 56,
        sprite: "dog",
        flash: true,
        flashOn: 0.7,
        flashOff: 1.3,
        flashPhase: 0.5,
      },
      {
        x: 1550,
        width: 79,
        height: 56,
        sprite: "dog",
        flash: true,
        flashOn: 0.9,
        flashOff: 1.1,
        flashPhase: 1,
      },
    ],
  },

  {
    title: "Stage 3 — Delayed Tics",
    intro:
      "Sometimes the reaction doesn't come right away.\n" +
      "It builds, it delays, and then — right when you commit — it moves.\n" +
      "Time your jump for when the platform arrives, not when you wish it would.",
    width: 1900,
    groundY: 550,
    spawn: { x: 80, y: 450 },
    door: { x: 1750, width: 56, height: 90 },

    ground: [
      { x: 0, width: 400 },
      { x: 1400, width: 500 },
    ],

    blocks: [
      { x: 120, width: 79, height: 97, sprite: "2box", triggerHoleId: "l1-3-box-pit" },
    ],

    trapGround: [
      {
        x: 220,
        width: 120,
        id: "l1-3-box-pit",
      },
      {
        x: 400,
        width: 1000,
        id: "l1-3-pit",
        prefallen: true,
      },
    ],

    movingPlatforms: [
      {
        x: 420,
        y: 550,
        width: 120,
        range: 220,
        speed: 150,
        phase: 0,
      },
      {
        x: 730,
        y: 550,
        width: 120,
        range: 220,
        speed: 150,
        phase: 1.5,
      },
      {
        x: 1040,
        y: 550,
        width: 120,
        range: 220,
        speed: 150,
        phase: 0.8,
      },
    ],

    // Walking white dog at the end before mailbox
    groundHazards: [
      {
        x: 1400,
        width: 79,
        height: 56,
        range: 150,
        speed: 120,
        phase: 0,
        sprite: "whitedog",
      },
    ],

    hazards: [],
  },
];

// ============================================================
// LEVEL 2 — four stages built so far (L2-1 through L2-4). Reuses BG2.png
// as its backdrop and tree.png/bird.png for decorative trees + birds.
// ============================================================
const TREE_DRAW_W = 200;
const TREE_DRAW_H = 302;
const BIRD_DRAW_W = 42;
const BIRD_DRAW_H = 38;
const BIRD_PERCH_OFFSET_Y = 60;
const LEVEL_2_GROUND_Y = 550;

function birdOnTree(treeX, id) {
  return {
    id,
    x: treeX + TREE_DRAW_W / 2 - BIRD_DRAW_W / 2,
    width: BIRD_DRAW_W,
    height: BIRD_DRAW_H,
    y: LEVEL_2_GROUND_Y - TREE_DRAW_H + BIRD_PERCH_OFFSET_Y,
    sprite: "bird",
  };
}

const LEVEL_2_STAGES = [
  {
    title: "Stage 1 — A New Path",
    intro:
      "The road behind you is gone; there's no walking back to it now.\n" +
      "Ahead is somewhere new — quiet, green, and watching.\n" +
      "Listen closely. Not everything here stays still.",
    width: 1280,
    groundY: LEVEL_2_GROUND_Y,
    spawn: { x: 80, y: 450 },
    door: { x: 1150, width: 56, height: 90 },
    ground: [{ x: 0, width: 1280 }],
    trapGround: [
      {
        x: 140,
        width: 110,
        id: "l2-1-gap-1",
        prefallen: true,
      },
      {
        x: 500,
        width: 140,
        id: "l2-1-gap-2",
        prefallen: true,
      },
      {
        x: 890,
        width: 100,
        id: "l2-1-gap-3",
        prefallen: true,
      },
    ],
    movingPlatforms: [],
    hazards: [],
    blocks: [],
    trees: [
      { x: 260, width: TREE_DRAW_W, height: TREE_DRAW_H },
      { x: 680, width: TREE_DRAW_W, height: TREE_DRAW_H },
      { x: 1000, width: TREE_DRAW_W, height: TREE_DRAW_H },
    ],
    birds: [
      birdOnTree(260, "bird-1"),
      birdOnTree(680, "bird-2"),
      birdOnTree(1000, "bird-3"),
    ],
  },

  {
    title: "Stage 2 — Drowned Out",
    intro:
      "Someone nearby is trying to tell you something important.\n" +
      "But the noise keeps cutting in — sudden, loud, impossible to ignore.\n" +
      "Listen closely. Piece it together, even through the interruptions.",
    width: 1280,
    groundY: LEVEL_2_GROUND_Y,
    spawn: { x: 80, y: 450 },
    door: { x: 1150, width: 56, height: 90 },
    ground: [{ x: 0, width: 1280 }],
    trapGround: [],
    movingPlatforms: [],
    hazards: [],
    blocks: [],
    trees: [],
    birds: [],
    npc: { x: 650, width: 42, height: 64 },
    cars: {
      minX: 0,
      maxX: 1150,
      width: 120,
      height: 66,
      spawnIntervalMin: 1.6,
      spawnIntervalMax: 3.2,
      speedMin: 150,
      speedMax: 240,
      honkIntervalMin: 1.3,
      honkIntervalMax: 2.8,
    },
    codeLock: true,
  },

  {
    title: "Stage 3 — Underfoot",
    intro:
      "The path changes beneath your feet before you even see it.\n" +
      "Every step here announces itself, loud and unavoidable.\n" +
      "Slow down — hold H — and even loud ground learns to stay quiet.",
    width: 1280,
    groundY: LEVEL_2_GROUND_Y,
    spawn: { x: 80, y: 450 },
    door: { x: 1150, width: 56, height: 90 },
    // Gravel patch positioned to match the stone path drawn into BG2.png
    // (roughly local x 105-1200) — normal ground on either side of it.
    ground: [
      { x: 0, width: 105 },
      { x: 105, width: 1095, surface: "gravel" },
      { x: 1200, width: 80 },
    ],
    trapGround: [],
    movingPlatforms: [],
    hazards: [],
    blocks: [],
    trees: [],
    birds: [],
  },

  {
    title: "Stage 4 — Static",
    intro:
      "The sky finally lets go, all at once.\n" +
      "Rain won't hurt you, but the light that follows the thunder can.\n" +
      "Keep moving — standing still under the wrong flash is a bad idea.",
    width: 1280,
    groundY: LEVEL_2_GROUND_Y,
    spawn: { x: 80, y: 450 },
    door: { x: 1150, width: 56, height: 90 },
    ground: [{ x: 0, width: 1280 }],
    trapGround: [],
    movingPlatforms: [],
    hazards: [],
    blocks: [],
    trees: [],
    birds: [],
    storm: true,
    // Rain aligns with the green pillars in BG2.png; lightning strikes
    // are confined to the red pillars \u2014 both measured directly off the
    // art (local stage coords) instead of roaming the whole stage.
    rainZones: [
      { x: 240, width: 80 },
      { x: 620, width: 80 },
      { x: 1000, width: 80 },
    ],
    lightningZones: [
      { x: 425, width: 80 },
      { x: 830, width: 80 },
    ],
  },

  {
    title: "Stage 5 — Bark Back",
    intro:
      "Every dog on this street knows exactly where you're headed.\n" +
      "While they're quiet, walk the way you always have.\n" +
      "The second they start barking, your own feet turn against you.",
    width: 1280,
    groundY: LEVEL_2_GROUND_Y,
    spawn: { x: 80, y: 450 },
    door: { x: 1150, width: 56, height: 90 },

    ground: [{ x: 0, width: 1280 }],
    trapGround: [],
    movingPlatforms: [],
    hazards: [],
    blocks: [],
    trees: [],
    birds: [],

    // Stationary dogs (range: 0 means updateGroundHazards() just holds
    // them at `x` — same entity/collision as every other groundHazard,
    // still instant-death on touch regardless of bark phase).
    groundHazards: [
      { x: 260, width: 79, height: 56, range: 0, speed: 0, sprite: "whitedog" },
      { x: 610, width: 79, height: 56, range: 0, speed: 0, sprite: "whitedog" },
      { x: 960, width: 79, height: 56, range: 0, speed: 0, sprite: "whitedog" },
    ],

    // Flags this section for the barking/inversion mechanic (see
    // buildWorld() below, and initBarkState()/updateBarkState()/
    // isControlsInverted() in main.js).
    barkingDogs: true,
    barkConfig: {
      barkOn: 5,
      barkOff: 5,
      barkPhase: 0,
    },
  },
];

// ============================================================
// LEVEL 3 — three stages built so far (L3-1 through L3-3).
// ============================================================
const LEVEL_3_STAGES = [
  {
    title: "Stage 1 — Unwanted Attention",
    intro:
      "Not every reaction is unkind — but it can still feel like too much.\n" +
      "Stay aware. Keep moving forward.",
    width: 1280,
    groundY: 550,
    spawn: { x: 80, y: 450 },
    door: { x: 1150, width: 56, height: 90 },

    ground: [{ x: 0, width: 1280 }],
    trapGround: [],
    blocks: [],
    movingPlatforms: [],
    hazards: [],

    // Ducks follow the player from behind.
    //
    // When the player reaches each duck's triggerX:
    //   - the duck appears after its spawnDelay
    //   - the duck follows the player from behind
    //   - the duck cannot be defeated
    //
    // IMPORTANT:
    // Touching a duck immediately kills the player.
    // The duck no longer deals damage or applies a slow effect.
    duckFollowers: [
      {
        id: "duck-0",
        triggerX: 550,
        spawnDelay: 0,
        followDistance: 100,
        speed: 50,
        sprite: "duck",
      },
      {
        id: "duck-1",
        triggerX: 700,
        spawnDelay: 0,
        followDistance: 100,
        speed: 60,
        sprite: "duck",
      },
      {
        id: "duck-2",
        triggerX: 850,
        spawnDelay: 0,
        followDistance: 100,
        speed: 40,
        sprite: "duck",
      },
      {
        id: "duck-3",
        triggerX: 1000,
        spawnDelay: 0,
        followDistance: 100,
        speed: 70,
        sprite: "duck",
      },
      {
        id: "duck-4",
        triggerX: 1100,
        spawnDelay: 0,
        followDistance: 100,
        speed: 75,
        sprite: "duck",
      },
    ],
  },

  {
    title: "Stage 2 — Dialogue",
    intro:
      "Keeping up a conversation means catching every part of it.\n" +
      "Don't let any of it fall past you.",
    width: 1280,
    groundY: 550,
    spawn: { x: 80, y: 450 },
    door: { x: 1150, width: 56, height: 90 },

    ground: [{ x: 0, width: 1280 }],
    trapGround: [],

    blocks: [],

    movingPlatforms: [],
    hazards: [],

    bubbles: [
      {
        id: "b1",
        x: 380,
        spawnY: 30,
        fallSpeed: 45,
        driftSpeed: 0,
      },
      {
        id: "b2",
        x: 520,
        spawnY: 160,
        fallSpeed: 55,
        driftSpeed: 0,
      },
      {
        id: "b3",
        x: 660,
        spawnY: 60,
        fallSpeed: 40,
        driftSpeed: 20,
      },
      {
        id: "b4",
        x: 800,
        spawnY: 130,
        fallSpeed: 50,
        driftSpeed: -15,
      },
      {
        id: "b5",
        x: 940,
        spawnY: 100,
        fallSpeed: 45,
        driftSpeed: 0,
      },
    ],
  },

  {
    title: "Stage 3 — Positive / Supportive Social Interactions",
    intro:
      "On your own, some gaps feel too wide to clear.\n" +
      "Stay near the people who support you, and hold T to lean on them — they'll help you build the speed to cross.",
    width: 1280,
    groundY: 550,
    spawn: { x: 80, y: 450 },
    door: { x: 1150, width: 56, height: 90 },

    ground: [
      { x: 0, width: 340 },
      { x: 620, width: 260 },
      { x: 1080, width: 200 },
    ],

    trapGround: [
      {
        x: 340,
        width: 280,
        id: "l3-3-gap1",
        prefallen: true,
      },
      {
        x: 880,
        width: 200,
        id: "l3-3-gap2",
        prefallen: true,
      },
    ],

    blocks: [],
    movingPlatforms: [],
    hazards: [],

    baseSpeedFactor: 0.55,

    supportNPCs: [
      {
        id: "npc-1",
        x: 160,
        y: 470,
        radius: 90,
        chargeTime: 2.5,
        boostFactor: 6,
        boostDuration: 3,
        sprite: "npc_friend",
      },

      {
        id: "npc-2",
        x: 700,
        y: 470,
        radius: 90,
        chargeTime: 2,
        boostFactor: 6,
        boostDuration: 2.5,
        sprite: "npc_friend",
      },
    ],
  },

  {
    title: "Stage 4 — Persistent Tics",
    intro:
      "Some tics don't stop once they start.\n" +
      "They keep going, pulling you along — and if you resist, you fall behind.\n" +
      "Sometimes you have to move with the tic, not against it.",
    width: 1280,
    groundY: 550,
    spawn: { x: 80, y: 450 },
    door: { x: 1150, width: 56, height: 90 },

    ground: [{ x: 0, width: 1280 }],
    trapGround: [],
    blocks: [],
    movingPlatforms: [],
    hazards: [],

    // Pushing NPCs that patrol the full stage span at different speeds,
    // each starting at a different spot/direction so they stay out of sync.
    pushingNpcs: [
      { x: 150, speed: 70, startDirection: 1 },
      { x: 350, speed: 95, startDirection: -1 },
      { x: 550, speed: 60, startDirection: 1 },
      { x: 750, speed: 100, startDirection: -1 },
      { x: 950, speed: 80, startDirection: 1 },
    ],
  },

  {
    title: "Stage 5 — Moving Forward",
    intro:
      "Sometimes you need a little help to reach new heights.\n" +
      "Use what's around you — and the people who support you.",
    width: 1280,
    groundY: 550,
    spawn: { x: 80, y: 450 },
    door: { x: 1150, width: 56, height: 90 },

    // Continuous ground for safe walking
    ground: [{ x: 0, width: 1280 }],

    trapGround: [],

    // Tall obstacles to jump: stacked boxes on the left, a truck on the right.
    blocks: [
      { x: 350, width: 90, height: 194, sprite: "stackedbox" }, // 2 stacked boxes
      { x: 750, width: 309, height: 180, sprite: "truck", cornerRadius: 50 }, // truck
    ],

    movingPlatforms: [],
    hazards: [],

    // Jump-boost NPCs: stand near one (let it charge, like Stage 3's
    // supportive NPCs) to gain a temporary higher jump — enough to
    // clear the tall building ahead of it and reach the checkpoint.
    // Placed just before each building so the intended path is
    // "approach the NPC, charge up, clear the building."
    jumpBoostNpcs: [
      {
        id: "jump-npc-1",
        x: 250,
        y: 470,
        radius: 55,
        dischargeRate: 1.3,
        chargeTime: 1.5,
        jumpMultiplier: 1.4,
        boostDuration: 3,
        sprite: "npc_friend",
      },

      {
        id: "jump-npc-2",
        x: 650,
        y: 470,
        radius: 55,
        dischargeRate: 1.3,
        chargeTime: 1.5,
        jumpMultiplier: 1.4,
        boostDuration: 3,
        sprite: "npc_friend",
      },
    ],
  },
];

// ============================================================
// BUILD ONE LEVEL
// ============================================================
function buildWorld(stages, levelIndex = 0) {
  const sections = [];
  const ground = [];
  const trapGround = [];
  const movingPlatforms = [];
  const hazards = [];
  const groundHazards = [];
  const blocks = [];
  const mailboxes = [];
  const duckFollowers = [];
  const bubbles = [];
  const supportNPCs = [];
  const jumpBoostNpcs = [];
  const pushingNpcs = [];
  const trees = [];
  const birds = [];

  let offsetX = 0;

  stages.forEach((def, i) => {
    const startX = offsetX;
    const endX = startX + def.width;

    sections.push({
      index: i,
      levelIndex,
      stageIndex: i,
      title: def.title,
      intro: def.intro,
      startX,
      endX,

      spawn: {
        x: startX + def.spawn.x,
        y: def.spawn.y,
      },

      fallLimit:
        def.fallLimit !== undefined ? def.fallLimit : def.groundY + 300,

      baseSpeedFactor:
        def.baseSpeedFactor !== undefined ? def.baseSpeedFactor : 1,

      // Level 2-2's "Drowned Out" code-lock puzzle (NPC + speech bubble
      // + honking cars). npc/cars are optional per-stage config objects;
      // codeLock flags which section (if any) owns the mechanic.
      npc: def.npc ? { ...def.npc, x: startX + def.npc.x } : null,
      cars: def.cars
        ? {
            ...def.cars,
            minX: startX + (def.cars.minX !== undefined ? def.cars.minX : 0),
            maxX:
              startX +
              (def.cars.maxX !== undefined ? def.cars.maxX : def.width),
          }
        : null,
      codeLock: !!def.codeLock,
      // Level 2-4's thunderstorm weather (random lightning flashes),
      // with rain/lightning each confined to their own zones (green vs.
      // red pillars in BG2.png) when the stage provides them.
      storm: !!def.storm,
      rainZones: (def.rainZones || []).map((z) => ({
        x: startX + z.x,
        width: z.width,
      })),
      lightningZones: (def.lightningZones || []).map((z) => ({
        x: startX + z.x,
        width: z.width,
      })),
      // Level 2-5's ("Bark Back") barking-dog / control-inversion
      // mechanic — see initBarkState()/updateBarkState()/
      // isControlsInverted() in main.js.
      barkingDogs: !!def.barkingDogs,
      barkConfig: def.barkConfig || null,
    });

    for (const g of def.ground) {
      ground.push({
        x: startX + g.x,
        width: g.width,
        surface: g.surface || "dirt",
      });
    }

    for (const t of def.trapGround) {
      trapGround.push({
        ...t,
        x: startX + t.x,
      });
    }

    for (const p of def.movingPlatforms) {
      movingPlatforms.push({
        ...p,
        x: startX + p.x,
      });
    }

    for (const hz of def.hazards) {
      hazards.push({
        ...hz,
        x: startX + hz.x,
      });
    }

    for (const gh of def.groundHazards || []) {
      groundHazards.push({
        ...gh,
        x: startX + gh.x,
      });
    }

    for (const b of def.blocks || []) {
      blocks.push({
        ...b,
        x: startX + b.x,
      });
    }

    for (const d of def.duckFollowers || []) {
      duckFollowers.push({
        ...d,

        // Initial world position
        x: startX + d.triggerX,

        // Trigger position
        triggerX: startX + d.triggerX,

        stageIndex: i,
        levelIndex,
      });
    }

    for (const b of def.bubbles || []) {
      bubbles.push({
        ...b,
        x: startX + b.x,
        stageIndex: i,
        levelIndex,
      });
    }

    for (const n of def.supportNPCs || []) {
      supportNPCs.push({
        ...n,
        x: startX + n.x,
        stageIndex: i,
        levelIndex,
      });
    }

    for (const n of def.jumpBoostNpcs || []) {
      jumpBoostNpcs.push({
        ...n,
        x: startX + n.x,
        stageIndex: i,
        levelIndex,
      });
    }

    for (const n of def.pushingNpcs || []) {
      pushingNpcs.push({
        ...n,
        x: startX + n.x,
        stageIndex: i,
        levelIndex,
      });
    }

    for (const tr of def.trees || []) {
      trees.push({ ...tr, x: startX + tr.x });
    }

    for (const b of def.birds || []) {
      birds.push({ ...b, x: startX + b.x });
    }

    const d = def.door;

    mailboxes.push({
      x: startX + d.x,
      y: d.y,
      width: d.width,
      height: d.height,
      levelIndex,
      stageIndex: i,
      activated: false,
      locked: !!def.codeLock,
    });

    offsetX = endX;
  });

  return {
    width: offsetX,
    groundY: 550,
    spawn: {
      x: sections[0].spawn.x,
      y: sections[0].spawn.y,
    },

    levelIndex,
    builtLevelIndices: [levelIndex],

    sections,
    ground,
    trapGround,
    movingPlatforms,
    hazards,
    groundHazards,
    blocks,
    mailboxes,
    duckFollowers,
    bubbles,
    supportNPCs,
    jumpBoostNpcs,
    pushingNpcs,
    trees,
    birds,
  };
}

// ============================================================
// BUILD MULTI-LEVEL WORLD
// ============================================================
function buildMultiWorld(levelDefs) {
  const LEVEL_GAP = 2000;
  const merged = {
    width: 0,
    groundY: 550,
    spawn: null,

    sections: [],
    ground: [],
    trapGround: [],
    movingPlatforms: [],
    hazards: [],
    groundHazards: [],
    blocks: [],
    mailboxes: [],
    duckFollowers: [],
    bubbles: [],
    supportNPCs: [],
    jumpBoostNpcs: [],
    pushingNpcs: [],
    trees: [],
    birds: [],

    builtLevelIndices: [],
  };

  let offsetX = 0;

  for (const { stages, levelIndex } of levelDefs) {
    const sub = buildWorld(stages, levelIndex);
    const shiftX = offsetX;

    sub.sections.forEach((s, i) => {
      merged.sections.push({
        ...s,

        startX: s.startX + shiftX,
        endX: s.endX + shiftX,

        spawn: {
          x: s.spawn.x + shiftX,
          y: s.spawn.y,
        },

        npc: s.npc ? { ...s.npc, x: s.npc.x + shiftX } : null,
        cars: s.cars
          ? {
              ...s.cars,
              minX: s.cars.minX + shiftX,
              maxX: s.cars.maxX + shiftX,
            }
          : null,

        stormZone: s.stormZone
          ? { ...s.stormZone, x: s.stormZone.x + shiftX }
          : null,
        rainZones: (s.rainZones || []).map((z) => ({ ...z, x: z.x + shiftX })),
        lightningZones: (s.lightningZones || []).map((z) => ({
          ...z,
          x: z.x + shiftX,
        })),

        index: merged.sections.length,
      });
    });

    merged.ground.push(
      ...sub.ground.map((g) => ({
        ...g,
        x: g.x + shiftX,
      })),
    );

    merged.trapGround.push(
      ...sub.trapGround.map((t) => ({
        ...t,
        x: t.x + shiftX,
      })),
    );

    merged.movingPlatforms.push(
      ...sub.movingPlatforms.map((p) => ({
        ...p,
        x: p.x + shiftX,
      })),
    );

    merged.hazards.push(
      ...sub.hazards.map((h) => ({
        ...h,
        x: h.x + shiftX,
      })),
    );

    merged.groundHazards.push(
      ...sub.groundHazards.map((g) => ({
        ...g,
        x: g.x + shiftX,
      })),
    );

    merged.blocks.push(
      ...sub.blocks.map((b) => ({
        ...b,
        x: b.x + shiftX,
      })),
    );

    merged.mailboxes.push(
      ...sub.mailboxes.map((m) => ({
        ...m,
        x: m.x + shiftX,
      })),
    );

    // Keep duck follower positions and trigger positions aligned
    // when the level is shifted into the combined world.
    merged.duckFollowers.push(
      ...(sub.duckFollowers || []).map((d) => ({
        ...d,
        x: d.x + shiftX,
        triggerX: d.triggerX + shiftX,
      })),
    );

    merged.bubbles.push(
      ...(sub.bubbles || []).map((b) => ({
        ...b,
        x: b.x + shiftX,
      })),
    );

    merged.supportNPCs.push(
      ...(sub.supportNPCs || []).map((n) => ({
        ...n,
        x: n.x + shiftX,
      })),
    );

    merged.jumpBoostNpcs.push(
      ...(sub.jumpBoostNpcs || []).map((n) => ({
        ...n,
        x: n.x + shiftX,
      })),
    );

    merged.pushingNpcs.push(
      ...(sub.pushingNpcs || []).map((n) => ({
        ...n,
        x: n.x + shiftX,
      })),
    );

    merged.trees.push(
      ...(sub.trees || []).map((t) => ({
        ...t,
        x: t.x + shiftX,
      })),
    );

    merged.birds.push(
      ...(sub.birds || []).map((b) => ({
        ...b,
        x: b.x + shiftX,
      })),
    );

    merged.builtLevelIndices.push(levelIndex);

    if (merged.spawn === null) {
      merged.spawn = {
        x: sub.spawn.x + shiftX,
        y: sub.spawn.y,
      };
    }

    // A wide dead-zone between levels (bigger than the viewport) so the
    // camera, clamped to [0, width - VIEW_W], can never have one level's
    // far edge and the next level's start on-screen at the same time —
    // they read as fully separate spaces, not one continuous map.
    offsetX += sub.width + LEVEL_GAP;
  }

  merged.width = offsetX - LEVEL_GAP;

  return merged;
}

// ============================================================
// FINAL WORLD
// ============================================================

const WORLD = buildMultiWorld([
  {
    stages: LEVEL_1_STAGES,
    levelIndex: 0,
  },

  {
    stages: LEVEL_2_STAGES,
    levelIndex: 1,
  },

  {
    stages: LEVEL_3_STAGES,
    levelIndex: 2,
  },
]);
