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
  pixiu: "Walks a fixed loop over both fords and up and down the causeway past the relic, attacking units it meets; a labourer who reaches the relic while it is away claims the bonus, but one who reaches it while it is near is attacked.",
};

// Where each lives, in plain map terms: a second, short sentence after the
// rule, so a player can plan around a creature they haven't met yet.
export const CREATURE_WHERE: Record<CreatureKind, string> = {
  nian: "its den is at the head of the river, in the north middle of the scroll, inside the richest grove.",
  jiaolong: "anywhere in the river down the middle of the scroll; the two fords and the causeway are where it strikes.",
  qilin: "its glade is at the river's mouth, in the south middle, with groves on either side.",
  pixiu: "a figure of eight between x 48 and x 63, never more than six tiles from the river: out to x 48 on the west bank by the north ford (row 10), down the causeway (x 55–56) past the relic, out to x 48 by the south ford (row 21), across the south ford to x 63 on the east bank, back up the causeway, out to x 63 by the north ford, and across the north ford to x 48 again.",
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
  `Grain is the only resource. Groves (finite) hold it; a labourer (勞, ${L.cost} grain) carries ${CARRY} at a time back to the hall, and when a grove runs out moves on to the nearest grove you have seen (never the nian's).`,
  `The hall trains labourers. Labourers build a barracks (營, ${BUILDINGS.barracks.cost} grain), which trains spearmen (兵, ${S.cost} grain).`,
  `Each side may have at most ${POP_CAP} people, counting those still in training.`,
  "",
  "Commands:",
  "  move: walk the chosen units to a tile.",
  "  gather: send labourers to a grove; they carry grain home on their own.",
  "  build: labourers raise a barracks on open ground you can see; send labourers back with build on the same spot to finish a half-built barracks (at no further cost).",
  "  attack: go after an enemy or creature you can see.",
  "  train: a hall or barracks adds a labourer or spearman to its queue (at most five).",
  "  stop: stand still.",
  "Idle spearmen attack enemies that come near them and go to the help of your people attacked nearby. A unit beating on a building turns on whoever strikes it.",
  "Units sent to attack move on to the nearest enemy in view when their target falls.",
  "Labourers fight poorly: spearmen are the answer to spearmen.",
  "",
  "Fog is unpainted silk: you see only what your people and buildings see now.",
  "Ground you have seen stays inked, paler; pieces you can no longer see vanish.",
  "Rivers, hills, groves and buildings block the way.",
  "The river runs down the middle of the scroll, north to south; it has two fords (north and south) joined by a causeway of shallows.",
  "",
  "Creatures belong to neither side:",
  ...(Object.keys(CREATURE_LINES) as CreatureKind[]).map((k) => `  ${NAMES[k]}: ${CREATURE_LINES[k]} Where: ${CREATURE_WHERE[k]}`),
  "",
  `The relic is on the little island in mid-river, halfway between the north and south fords (x 55–56, y 15–16), reached along the causeway from either ford.`,
  `A labourer who steps onto it while the pixiu is out on a ford or a bank claims ${RELIC_BONUS} grain, once per match, for whoever gets there first.`,
  "",
  "A side that sends no command for 5 minutes forfeits. A match with no command from anyone for 10 minutes is abandoned. A match nobody joins lapses after three minutes.",
].join("\n");
