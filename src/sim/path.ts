// Grid A*, 8-neighbour, no corner cutting past a blocked tile, every step
// costing one tick-tile (so the heuristic is Chebyshev distance).
//
// Unreachable goals: a search that can't reach its goal returns the path to
// the explored tile nearest the goal (fewest steps on ties). The unit walks
// there; if it is already as near as it can get, the path is empty and the
// caller treats it as stuck (a move goes idle; a gatherer or builder gives up
// and goes idle; a chaser waits and re-plans later). Every search counts its
// expansions against the tick's shared budget (balance.ts PATH_BUDGET); a
// unit that finds the budget spent waits a tick and asks again.

export interface Goal {
  x: number;
  y: number;
  w: number;
  h: number;
  range: number;
}

// Chebyshev distance from a tile to a rectangle.
export function distToRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): number {
  const dx = Math.max(rx - x, 0, x - (rx + rw - 1));
  const dy = Math.max(ry - y, 0, y - (ry + rh - 1));
  return Math.max(dx, dy);
}

let scratchSize = 0;
let gScore = new Int32Array(0);
let came = new Int32Array(0);
let stamp = new Int32Array(0);
let closed = new Int32Array(0);
let generation = 0;

function ensure(n: number): void {
  if (scratchSize >= n) return;
  scratchSize = n;
  gScore = new Int32Array(n);
  came = new Int32Array(n);
  stamp = new Int32Array(n);
  closed = new Int32Array(n);
  generation = 0;
}

const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export interface PathResult {
  path: number[]; // tile indices, next step first; empty if no step helps
  reached: boolean; // whether the path ends inside the goal
  expanded: number;
}

export function findPath(
  width: number,
  height: number,
  sx: number,
  sy: number,
  goal: Goal,
  passable: (i: number) => boolean,
  maxNodes: number,
): PathResult {
  const n = width * height;
  ensure(n);
  generation++;
  const h = (i: number) =>
    Math.max(0, distToRect(i % width, (i / width) | 0, goal.x, goal.y, goal.w, goal.h) - goal.range);
  const start = sy * width + sx;
  // binary heap of [f, g-tiebreak, index] packed into parallel arrays
  const heapF: number[] = [];
  const heapI: number[] = [];
  const push = (f: number, i: number) => {
    heapF.push(f);
    heapI.push(i);
    let c = heapF.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (heapF[p] < f || (heapF[p] === f && heapI[p] <= i)) break;
      heapF[c] = heapF[p];
      heapI[c] = heapI[p];
      c = p;
    }
    heapF[c] = f;
    heapI[c] = i;
  };
  const pop = (): number => {
    const top = heapI[0];
    const lf = heapF.pop()!;
    const li = heapI.pop()!;
    if (heapF.length > 0) {
      let c = 0;
      for (;;) {
        const l = c * 2 + 1;
        if (l >= heapF.length) break;
        let m = l;
        const r = l + 1;
        if (r < heapF.length && (heapF[r] < heapF[l] || (heapF[r] === heapF[l] && heapI[r] < heapI[l]))) m = r;
        if (heapF[m] > lf || (heapF[m] === lf && heapI[m] >= li)) break;
        heapF[c] = heapF[m];
        heapI[c] = heapI[m];
        c = m;
      }
      heapF[c] = lf;
      heapI[c] = li;
    }
    return top;
  };

  stamp[start] = generation;
  gScore[start] = 0;
  came[start] = -1;
  push(h(start), start);
  let best = start;
  let bestH = h(start);
  let bestG = 0;
  let expanded = 0;
  let reached = bestH === 0;

  while (heapF.length > 0 && !reached && expanded < maxNodes) {
    const cur = pop();
    if (closed[cur] === generation) continue;
    closed[cur] = generation;
    expanded++;
    const g = gScore[cur];
    const hc = h(cur);
    if (hc < bestH || (hc === bestH && g < bestG)) {
      best = cur;
      bestH = hc;
      bestG = g;
    }
    if (hc === 0) {
      reached = true;
      break;
    }
    const cx = cur % width;
    const cy = (cur / width) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = ny * width + nx;
      if (!passable(ni)) continue;
      if (dx !== 0 && dy !== 0 && (!passable(cy * width + nx) || !passable(ny * width + cx))) continue;
      if (closed[ni] === generation) continue;
      const ng = g + 1;
      if (stamp[ni] === generation && gScore[ni] <= ng) continue;
      stamp[ni] = generation;
      gScore[ni] = ng;
      came[ni] = cur;
      push(ng + h(ni), ni);
    }
  }

  const path: number[] = [];
  for (let i = best; i !== start; i = came[i]) path.push(i);
  path.reverse();
  return { path, reached: bestH === 0, expanded };
}
