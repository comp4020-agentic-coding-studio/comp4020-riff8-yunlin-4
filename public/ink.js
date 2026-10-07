// How a stroke looks as ink: one module, imported by the server (sealed
// colophons rendered with no script) and by the browser (the brush and live
// drafts), so a stroke looks the same whoever draws it. Points are the flat
// [x0, y0, x1, y1, ...] panel coordinates of ADR 0001's stroke format.
//
// A brush, not a pen: the outline is filled, thicker where the hand moved
// slowly (points close together), thinner where it moved fast, pressed a
// little at the start and lifted to a taper at the end.

const WIDEST = 10;
const NARROWEST = 2.6;

const r1 = (n) => Math.round(n * 10) / 10;

/** @param {readonly number[]} points */
export function pathData(points) {
  let d = `M${points[0]} ${points[1]}`;
  if (points.length === 2) return `${d}L${points[0]} ${points[1]}`;
  for (let i = 2; i < points.length; i += 2) d += `L${points[i]} ${points[i + 1]}`;
  return d;
}

/** @param {readonly number[]} points @returns {string} */
export function brushPath(points) {
  const pts = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    const last = pts[pts.length - 1];
    if (!last || last[0] !== points[i] || last[1] !== points[i + 1]) pts.push([points[i], points[i + 1]]);
  }
  const n = pts.length;
  if (n === 1) {
    const [x, y] = pts[0];
    const r = WIDEST / 2;
    return `M${r1(x - r)} ${y}a${r} ${r} 0 1 0 ${WIDEST} 0a${r} ${r} 0 1 0 ${-WIDEST} 0Z`;
  }

  // Width from speed, smoothed so it swells and thins rather than jitters.
  const widths = [];
  let w = WIDEST * 0.8;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const step = Math.hypot(b[0] - a[0], b[1] - a[1]) / (i === 0 || i === n - 1 ? 1 : 2);
    const target = Math.max(NARROWEST, WIDEST - step * 0.55);
    w = w * 0.7 + target * 0.3;
    widths.push(w);
  }
  const lift = Math.min(6, Math.ceil(n / 3));
  for (let k = 0; k < lift; k++) widths[n - 1 - k] *= 0.3 + (0.7 * k) / lift;

  const left = [];
  const right = [];
  let nx = 0;
  let ny = -1;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len > 0) [nx, ny] = [-dy / len, dx / len];
    const h = widths[i] / 2;
    left.push(`${r1(pts[i][0] + nx * h)} ${r1(pts[i][1] + ny * h)}`);
    right.push(`${r1(pts[i][0] - nx * h)} ${r1(pts[i][1] - ny * h)}`);
  }
  const capEnd = r1(widths[n - 1] / 2);
  const capStart = r1(widths[0] / 2);
  return (
    `M${left.join("L")}` +
    `A${capEnd} ${capEnd} 0 0 1 ${right[n - 1]}` +
    `L${right.reverse().join("L")}` +
    `A${capStart} ${capStart} 0 0 1 ${left[0]}Z`
  );
}
