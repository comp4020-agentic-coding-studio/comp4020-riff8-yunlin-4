// Every tunable number in 山海 lives here, so playtest-driven tuning touches
// nothing else. Times are in ticks (4 a second); speeds are ticks per tile;
// distances are in tiles, measured as the larger of |dx| and |dy| unless a
// comment says otherwise (sight radii are circles).

export const TICKS_PER_SECOND = 4;
// 25 minutes. The sim itself never ends a match on time; the caller decides.
export const MAX_TICKS = 25 * 60 * TICKS_PER_SECOND;

export const POP_CAP = 40;
export const MAX_UNITS_PER_COMMAND = 40;
export const MAX_QUEUE = 5;

export const START_GRAIN = 200;
export const START_LABOURERS = 4;

// Economy
export const CARRY = 10; // grain a labourer carries per trip
export const GATHER_TICKS = 4; // ticks per grain gathered
export const QILIN_GATHER_MULT = 2; // gather speed near a peaceful qilin's glade
export const REGROVE_RADIUS = 4; // how far a labourer looks for the next tile when one runs out
// then, if none, how far it looks for another grove its side has seen (never
// one inside the nian's leash) before it goes idle
export const REGROVE_FAR_RADIUS = 12;
export const GROVE_GRAIN = 150;
export const RICH_GROVE_GRAIN = 300; // per tile of the nian's grove (it has 28)
export const GLADE_GROVE_GRAIN = 250; // the groves beside the qilin's glade
export const RELIC_BONUS = 400;

// Behaviour
export const ACQUIRE_RADIUS = 6; // idle spearmen pick up visible enemies this close; attackers whose target died, the next one
export const RETALIATE_RADIUS = 2; // a unit struck while beating on a building turns on an attacker this close
export const REPATH_TICKS = 8; // a chaser re-plans at most this often
export const PATH_BUDGET = 20000; // A* nodes expanded per tick, across all pieces
export const PATH_MAX_NODES = 4000; // per search (the map is 3584 tiles)

export interface UnitStats {
  cost: number;
  hp: number;
  damage: number;
  attackTicks: number;
  speed: number;
  sight: number;
  trainTicks: number;
  trainedAt: "hall" | "barracks";
}

export const UNITS: Record<"labourer" | "spearman", UnitStats> = {
  // a labourer is a desperate fighter: a mob of them loses to spearmen of the same cost
  labourer: { cost: 50, hp: 40, damage: 2, attackTicks: 8, speed: 3, sight: 6, trainTicks: 48, trainedAt: "hall" },
  spearman: { cost: 80, hp: 100, damage: 10, attackTicks: 5, speed: 3, sight: 7, trainTicks: 100, trainedAt: "barracks" },
};

export interface BuildingStats {
  cost: number;
  hp: number;
  sight: number;
  size: number; // square footprint; an entity's x,y is its top-left tile
  buildTicks: number; // builder-ticks of work (two builders halve it)
}

export const BUILDINGS: Record<"hall" | "barracks", BuildingStats> = {
  hall: { cost: 0, hp: 2500, sight: 8, size: 3, buildTicks: 0 },
  barracks: { cost: 200, hp: 800, sight: 5, size: 2, buildTicks: 240 },
};

// The nian's leash is measured from its den (the 2×3 hollow inside the rich
// grove): it covers every tile a labourer could gather that grove from, and
// stops short of the north ford.
export const NIAN = { hp: 900, damage: 25, attackTicks: 6, speed: 3, leash: 5 };
export const JIAOLONG = {
  hp: 600,
  strikeDamage: 35, // a labourer (40 hp) survives one strike, barely
  strikeRadius: 2, // reaches every ford tile from the river above or below it
  huntRadius: 8, // it swims (unseen) toward waterside units this close
  speed: 2,
  surfacedTicks: 12, // visible (and attackable) after a strike
  diveTicks: 80, // then hidden and harmless for this long
};
export const QILIN = { hp: 800, damage: 20, attackTicks: 6, speed: 3, area: 2, // it fights within the glade plus this margin
  groveReach: 3, // groves this close to the glade gather faster while it is peaceful
};
export const PIXIU = {
  hp: 700,
  damage: 18,
  attackTicks: 5,
  speed: 3,
  range: 2, // notices units this close to it on its route
  leash: 4, // chases at most this far from where it left the route
  away: 4, // farther than this from the relic counts as "away"
};

// The computer opponent's temperament (src/bot.ts). It sees only what a
// player sees; these are the thresholds it plays by.
export const BOT = {
  everyTicks: 4, // the server asks the bot for commands this often
  maxCommands: 6, // commands per turn
  labourers: 11, // labourers it trains before spearmen take priority
  barracksAt: 6, // labourers before it builds the first barracks
  saveForBarracks: 200, // grain it holds back from labourers while it needs a barracks
  secondBarracksGrain: 400, // grain banked before it builds a second barracks
  queueSecondGrain: 300, // grain banked before it queues a second spearman at a busy barracks
  attackAt: 9, // spearmen at home before the first wave marches
  laterWaveAt: 6, // the least it sends in a later wave (or attackAt - 2, if more)
  regroupBelow: 3, // a wave this small, facing as many spearmen, falls back
  homeRadius: 14, // spearmen this close to the hall count as at home
  intruderRadius: 12, // enemy units this close to the hall are intruders
  defendRadius: 24, // spearmen this close come back to defend
  rallyDist: 8, // the rally point, this far inland of the hall
  preyRadius: 7, // marchers turn on enemy spearmen this close
};
