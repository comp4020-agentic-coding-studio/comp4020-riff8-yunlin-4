// The one place 山海's rules are written for players: the match page shows
// RULES_TEXT and the text client prints it. Numbers come from balance.ts, so
// the rules can't drift from the game. Plain text, no HTML.

import { BUILDINGS, CARRY, POP_CAP, RELIC_BONUS, UNITS } from "./sim/balance.ts";
import type { CreatureKind, Kind } from "./sim/types.ts";

export const GLYPHS: Record<Kind, string> = {
  labourer: "勞",
  spearman: "兵",
  hall: "廳",
  barracks: "營",
  nian: "年",
  jiaolong: "蛟",
  qilin: "麟",
  pixiu: "貔",
};

export const CREATURE_LINES: Record<CreatureKind, string> = {
  nian: "Sleeps in its den in the richest grove and attacks any unit that comes within its leash, chases no further, then goes back to its den and heals.",
  jiaolong: "Lurks in the river unseen, even inside your sight, strikes a unit on or beside the water near it, shows itself while it strikes, then dives for a while.",
  qilin: "Never attacks unless a spearman enters its glade or it is attacked, and then only fights that side near the glade until they leave; while it is at peace, labourers gathering beside its glade work twice as fast.",
  pixiu: "Walks a fixed loop over the fords and past the relic, attacking units it meets; a labourer who reaches the relic while it is away claims the bonus, but one who reaches it while it is near is attacked.",
};

const NAMES: Record<CreatureKind, string> = {
  nian: "年 nian",
  jiaolong: "蛟龍 jiaolong",
  qilin: "麒麟 qilin",
  pixiu: "貔貅 pixiu",
};

const L = UNITS.labourer;
const S = UNITS.spearman;

export const RULES_TEXT = [
  "山海 Mountains and Seas",
  "",
  "Goal: destroy the other side's hall (廳). Lose yours and the match is over.",
  "",
  "Seat 0, the first to sit, starts in the east (the right-hand end); seat 1 starts in the west.",
  "The scroll reads right to left, like the painting.",
  "",
  `Grain is the only resource. Groves (finite) hold it; a labourer (勞, ${L.cost} grain) carries ${CARRY} at a time back to the hall, and keeps going until the grove runs out.`,
  `The hall trains labourers. Labourers build a barracks (營, ${BUILDINGS.barracks.cost} grain), which trains spearmen (兵, ${S.cost} grain).`,
  `Each side may have at most ${POP_CAP} people, counting those still in training.`,
  "",
  "Commands:",
  "  move: walk the chosen units to a tile.",
  "  gather: send labourers to a grove; they carry grain home on their own.",
  "  build: labourers raise a barracks on open ground you can see.",
  "  attack: go after an enemy or creature you can see.",
  "  train: a hall or barracks adds a labourer or spearman to its queue (at most five).",
  "  stop: stand still.",
  "Idle spearmen attack enemies that come near them.",
  "",
  "Fog is unpainted silk: you see only what your people and buildings see now.",
  "Ground you have seen stays inked, paler; pieces you can no longer see vanish.",
  "Rivers, hills, groves and buildings block the way; the river has two fords.",
  "",
  "Creatures belong to neither side:",
  ...(Object.keys(CREATURE_LINES) as CreatureKind[]).map((k) => `  ${NAMES[k]}: ${CREATURE_LINES[k]}`),
  "",
  `The relic (in mid-river, between the fords) gives ${RELIC_BONUS} grain, once per match, to whoever claims it first.`,
  "",
  "A side that sends no command for 5 minutes forfeits. A match with no command from anyone for 10 minutes is abandoned.",
].join("\n");
