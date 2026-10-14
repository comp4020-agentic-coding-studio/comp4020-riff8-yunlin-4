// The one map, "scroll-1": a 112×32 strip, hand-built from mirrored
// rectangles so every feature at x has its twin at 111−x and neither seat has
// an edge. Seat 0 (the first to sit) holds the east (right) end, seat 1 the
// west, and the scroll reads right to left.
//
// Terrain: p plain, r river, f ford, g grove, h hill, l glade, x relic.
// Units walk on p, f, l and x. River, hill and grove block them (labourers
// gather a grove from a tile beside it). The river runs down the middle
// (x 54–57); the only ways across are the north ford (y 9–10), the south ford
// (y 21–22), the qilin's glade where the river ends at the bottom, and the
// nian's den at the river's head (y 3), cut into the richest grove. A causeway
// of shallows (ford tiles) runs between the fords past the relic island in
// mid-river, which the pixiu patrols. The jiaolong swims the river and the
// fords (all of it is one water) and never leaves them.

import { GLADE_GROVE_GRAIN, GROVE_GRAIN, RICH_GROVE_GRAIN } from "./balance.ts";

export const WIDTH = 112;
export const HEIGHT = 32;

export interface MapDef {
  id: string;
  width: number;
  height: number;
  terrain: string; // width*height chars, row-major
  grove: number[]; // starting grain per tile (0 if not a grove)
  // top-left of each seat's hall
  halls: [[number, number], [number, number]];
  nianDen: [number, number]; // top-left of the 2×3 hollow in the rich grove
  jiaolongLair: [number, number];
  qilinPost: [number, number];
  glade: [number, number][];
  relic: [number, number][];
  pixiuRoute: [number, number][];
}

type Rect = [x: number, y: number, w: number, h: number, code: string, grain?: number];

// The west half (x ≤ 55); each rect is mirrored onto the east.
const WEST: Rect[] = [
  // river and its crossings
  [54, 4, 2, 24, "r"],
  [54, 9, 2, 2, "f"], // north ford
  [54, 21, 2, 2, "f"], // south ford
  [55, 11, 1, 10, "f"], // causeway to the island
  [55, 13, 1, 6, "p"], // the relic island
  [55, 15, 1, 2, "x"], // the relic
  // the river's head: the nian's rich grove, with its den inside
  [51, 0, 5, 3, "g", RICH_GROVE_GRAIN],
  [55, 1, 1, 3, "p"], // the den, open to the south
  [52, 3, 1, 1, "h"],
  // the river's mouth: the qilin's glade, with its groves
  [49, 28, 7, 4, "l"],
  [46, 28, 2, 4, "g", GLADE_GROVE_GRAIN],
  // groves by the hall
  [2, 8, 2, 3, "g", GROVE_GRAIN],
  [2, 21, 2, 3, "g", GROVE_GRAIN],
  [11, 5, 3, 2, "g", GROVE_GRAIN],
  [11, 25, 3, 2, "g", GROVE_GRAIN],
  // groves further out
  [20, 1, 3, 2, "g", GROVE_GRAIN],
  [20, 29, 3, 2, "g", GROVE_GRAIN],
  [30, 14, 2, 4, "g", GROVE_GRAIN],
  [44, 12, 2, 2, "g", GROVE_GRAIN],
  [44, 18, 2, 2, "g", GROVE_GRAIN],
  // hills
  [25, 0, 1, 6, "h"],
  [25, 26, 1, 6, "h"],
  [17, 13, 1, 6, "h"],
  [38, 9, 2, 4, "h"],
  [38, 19, 2, 4, "h"],
  [46, 3, 3, 2, "h"],
];

function build(): MapDef {
  const t: string[] = new Array(WIDTH * HEIGHT).fill("p");
  const grove: number[] = new Array(WIDTH * HEIGHT).fill(0);
  for (const [rx, ry, w, h, code, grain] of WEST) {
    for (let y = ry; y < ry + h; y++) {
      for (let x = rx; x < rx + w; x++) {
        for (const mx of [x, WIDTH - 1 - x]) {
          t[y * WIDTH + mx] = code;
          grove[y * WIDTH + mx] = code === "g" ? (grain ?? GROVE_GRAIN) : 0;
        }
      }
    }
  }
  const glade: [number, number][] = [];
  const relic: [number, number][] = [];
  for (let i = 0; i < t.length; i++) {
    const p: [number, number] = [i % WIDTH, Math.floor(i / WIDTH)];
    if (t[i] === "l") glade.push(p);
    if (t[i] === "x") relic.push(p);
  }
  return {
    id: "scroll-1",
    width: WIDTH,
    height: HEIGHT,
    terrain: t.join(""),
    grove,
    halls: [
      [WIDTH - 3 - 5, 14],
      [5, 14],
    ],
    nianDen: [55, 1],
    jiaolongLair: [55, 5],
    qilinPost: [55, 30],
    glade,
    relic,
    // A figure of eight: across the north ford, down the causeway past the
    // relic, across the south ford, up the causeway again. It is near the
    // relic while on the causeway and away while crossing a ford.
    pixiuRoute: [
      [51, 10],
      [56, 12],
      [56, 19],
      [51, 21],
      [60, 21],
      [55, 19],
      [55, 12],
      [60, 10],
    ],
  };
}

export const MAPS: Record<string, MapDef> = { "scroll-1": build() };
export const MAP_IDS: string[] = Object.keys(MAPS);

// The map as text, one row per line, for a reader or a test.
export function mapText(def: MapDef): string {
  const rows: string[] = [];
  for (let y = 0; y < def.height; y++) rows.push(def.terrain.slice(y * def.width, (y + 1) * def.width));
  return rows.join("\n");
}
