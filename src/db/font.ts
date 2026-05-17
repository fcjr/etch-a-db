// Stroked block font for the etch-a-sketch.
//
// Each glyph is a polyline in the unit square [0,1] × [0,1]:
//   - x increases to the right, y increases upward.
//   - First point is (0, 0) (bottom-left), last point is (1, 0) (bottom-right).
//   - The bottom edge (y = 0) is the underline rail. Glyphs are designed so the
//     rail flows continuously from one glyph's exit into the next glyph's entry.
//   - Retracing the same segment twice is allowed for letters that can't be
//     drawn without lifting the pen.

type Glyph = readonly (readonly [number, number])[];

const GLYPHS: Record<string, Glyph> = {
  ' ': [[0, 0], [1, 0]],
  '-': [[0, 0], [0.2, 0], [0.2, 0.5], [0.8, 0.5], [0.2, 0.5], [0.2, 0], [1, 0]],
  '_': [[0, 0], [1, 0]],
  '.': [[0, 0], [0.45, 0], [0.45, 0.1], [0.55, 0.1], [0.55, 0], [1, 0]],

  A: [[0, 0], [0.5, 1], [0.78, 0.4], [0.22, 0.4], [0.5, 1], [1, 0]],
  // Explicit bottom edge so B closes above the rail instead of relying on
  // the row's continuous baseline to fill in the underside of the lower bump.
  B: [
    [0, 0], [0, 1], [0.7, 1], [0.92, 0.85], [0.92, 0.62],
    [0.65, 0.5], [0, 0.5], [0.65, 0.5], [0.92, 0.38], [0.92, 0.15],
    [0.7, 0.05], [0, 0.05], [0, 0], [1, 0],
  ],
  C: [
    [0, 0], [0, 0.85], [0.18, 1], [0.85, 1], [1, 0.85], [1, 0.75],
    [1, 0.85], [0.85, 1], [0.18, 1], [0, 0.85], [0, 0.15], [0.18, 0], [1, 0],
  ],
  // Closed-bottom D: stem -> top -> right curve -> explicit bottom edge back
  // to the stem -> drop to rail and exit. The original relied on the rail
  // running under the stem to close the shape.
  D: [
    [0, 0], [0, 1], [0.65, 1], [0.95, 0.78], [0.95, 0.22],
    [0.65, 0.05], [0, 0.05], [0, 0], [1, 0],
  ],
  // Bottom bar at y=0.1 (lifts to ~0.23) so it sits clearly above the rail.
  // Otherwise the bottom bar collapses into the row's baseline rule and E
  // becomes indistinguishable from F.
  E: [
    [0, 0], [0, 1], [0.95, 1], [0, 1], [0, 0.5], [0.75, 0.5],
    [0, 0.5], [0, 0.1], [0.95, 0.1], [0.95, 0], [1, 0],
  ],
  F: [
    [0, 0], [0, 1], [0.95, 1], [0, 1], [0, 0.5], [0.75, 0.5],
    [0, 0.5], [0, 0], [1, 0],
  ],
  G: [
    [0, 0], [0, 0.85], [0.18, 1], [0.85, 1], [1, 0.85], [1, 0.5],
    [0.55, 0.5], [1, 0.5], [1, 0.15], [0.85, 0], [1, 0],
  ],
  H: [
    [0, 0], [0, 1], [0, 0.5], [1, 0.5], [1, 1], [1, 0],
  ],
  // Serifed block-letter I (top + bottom bars sit above the rail) so it can't
  // be confused with "1" or with a stray vertical stroke meeting the rail.
  I: [
    [0, 0], [0.1, 0], [0.1, 0.08], [0.9, 0.08], [0.5, 0.08],
    [0.5, 0.92], [0.1, 0.92], [0.9, 0.92], [0.5, 0.92],
    [0.5, 0.08], [0.9, 0.08], [0.9, 0], [1, 0],
  ],
  J: [
    [0, 0], [0.25, 0], [0.25, 0.2], [0.5, 0.05], [0.75, 0],
    [0.75, 1], [0.45, 1], [0.75, 1], [0.75, 0], [1, 0],
  ],
  K: [
    [0, 0], [0, 1], [0, 0.5], [1, 1], [0, 0.5], [1, 0],
  ],
  // L with its foot lifted above the rail; otherwise the foot is invisible
  // (collapses into the row's bottom rail) and the glyph reads as "I" / "1".
  L: [
    [0, 0], [0, 0.08], [0, 1], [0, 0.08], [0.85, 0.08],
    [0.85, 0], [1, 0],
  ],
  M: [
    [0, 0], [0, 1], [0.5, 0.35], [1, 1], [1, 0],
  ],
  N: [
    [0, 0], [0, 1], [1, 0], [1, 1], [1, 0],
  ],
  // Closed-bottom oval: trace the full perimeter (with explicit bottom curve
  // at y=0.05) so the oval closes itself rather than relying on the rail.
  O: [
    [0, 0], [0, 0.15], [0, 0.85], [0.2, 1], [0.8, 1], [1, 0.85],
    [1, 0.15], [0.8, 0.05], [0.2, 0.05], [0, 0.15], [0, 0], [1, 0],
  ],
  P: [
    [0, 0], [0, 1], [0.7, 1], [0.95, 0.85], [0.95, 0.62],
    [0.7, 0.5], [0, 0.5], [0, 0], [1, 0],
  ],
  // Closed-bottom Q: full oval (with explicit bottom curve) + diagonal tail.
  Q: [
    [0, 0], [0, 0.15], [0, 0.85], [0.2, 1], [0.8, 1], [1, 0.85],
    [1, 0.15], [0.65, 0.35], [1, 0.15], [0.8, 0.05], [0.2, 0.05],
    [0, 0.15], [0, 0], [1, 0],
  ],
  R: [
    [0, 0], [0, 1], [0.7, 1], [0.95, 0.85], [0.95, 0.62],
    [0.7, 0.5], [0, 0.5], [0.7, 0.5], [1, 0],
  ],
  S: [
    [0, 0], [0.85, 0], [1, 0.15], [1, 0.35], [0.85, 0.5],
    [0.15, 0.5], [0, 0.65], [0, 0.85], [0.15, 1], [1, 1],
    [0.15, 1], [0, 0.85], [0, 0.65], [0.15, 0.5], [0.85, 0.5],
    [1, 0.35], [1, 0.15], [0.85, 0], [1, 0],
  ],
  T: [
    [0, 0], [0.5, 0], [0.5, 1], [0, 1], [1, 1], [0.5, 1], [0.5, 0], [1, 0],
  ],
  U: [
    [0, 0], [0, 1], [0, 0.15], [0.18, 0], [0.82, 0],
    [1, 0.15], [1, 1], [1, 0],
  ],
  V: [
    [0, 0], [0, 0.15], [0.5, 1], [1, 0.15], [1, 0],
  ],
  W: [
    [0, 0], [0, 1], [0.3, 0], [0.5, 0.7], [0.7, 0], [1, 1], [1, 0],
  ],
  X: [
    [0, 0], [1, 1], [0.5, 0.5], [0, 1], [0.5, 0.5], [1, 0],
  ],
  Y: [
    [0, 0], [0.5, 0.45], [0, 1], [0.5, 0.45], [1, 1], [0.5, 0.45], [0.5, 0], [1, 0],
  ],
  Z: [
    [0, 0], [0, 0.15], [0, 1], [1, 1], [0, 0], [1, 0],
  ],

  // Slashed-and-closed 0: trace down the left side, around the top, dip into
  // the slash and retrace back out, down the right side, and close the
  // bottom curve back into the left side before exiting.
  '0': [
    [0, 0], [0, 0.15], [0, 0.85], [0.2, 1], [0.8, 1],
    [0.2, 0.2], [0.8, 1], [1, 0.85], [1, 0.15],
    [0.8, 0.05], [0.2, 0.05], [0, 0.15], [0, 0], [1, 0],
  ],
  '1': [[0, 0], [0.5, 0], [0.2, 0.8], [0.5, 1], [0.5, 0], [1, 0]],
  '2': [
    [0, 0], [0, 0.2], [0.2, 0], [0.8, 0], [1, 0.2], [1, 0.4],
    [0, 1], [1, 1], [1, 0],
  ],
  '3': [
    [0, 0], [0.8, 0], [1, 0.2], [1, 0.4], [0.85, 0.5], [0.5, 0.5],
    [0.85, 0.5], [1, 0.6], [1, 0.8], [0.8, 1], [0, 1], [0.8, 1],
    [1, 0.8], [1, 0],
  ],
  '4': [
    [0, 0], [0.7, 0], [0.7, 1], [0, 0.4], [1, 0.4], [0.7, 0.4], [0.7, 0], [1, 0],
  ],
  '5': [
    [0, 0], [0.8, 0], [1, 0.2], [1, 0.4], [0.8, 0.55], [0, 0.55],
    [0, 1], [1, 1], [0, 1], [0, 0.55], [0.8, 0.55], [1, 0.4], [1, 0],
  ],
  '6': [
    [0, 0], [0.8, 0], [1, 0.15], [1, 0.4], [0.8, 0.55], [0.2, 0.55],
    [0, 0.4], [0, 0.85], [0.2, 1], [0.8, 1], [0.2, 1], [0, 0.85],
    [0, 0.4], [0.2, 0.55], [0.8, 0.55], [1, 0.4], [1, 0.15], [0.8, 0], [1, 0],
  ],
  '7': [[0, 0], [0.5, 0], [1, 1], [0, 1], [1, 1], [0.5, 0], [1, 0]],
  '8': [
    [0, 0], [0, 0.4], [0.2, 0.5], [0.8, 0.5], [1, 0.4], [1, 0.15],
    [0.8, 0], [0.2, 0], [0, 0.15], [0, 0.4], [0.2, 0.5],
    [0, 0.6], [0, 0.85], [0.2, 1], [0.8, 1], [1, 0.85], [1, 0.6],
    [0.8, 0.5], [1, 0],
  ],
  '9': [
    [0, 0], [0.8, 0.3], [1, 0.45], [1, 0.85], [0.8, 1], [0.2, 1],
    [0, 0.85], [0, 0.6], [0.2, 0.45], [0.8, 0.45], [1, 0.45], [1, 0],
  ],
};

const FALLBACK: Glyph = [
  [0, 0], [0, 0.5], [0.5, 1], [1, 0.5], [0.5, 0], [0, 0.5], [1, 0],
];

export function glyphFor(ch: string): Glyph {
  const key = ch.toUpperCase();
  return GLYPHS[key] ?? FALLBACK;
}

export type Waypoint = { x: number; y: number };

// Fraction of cellH separating the row's bottom rail from the lowest glyph
// feature. Lifting glyph bodies off the rail turns what used to be a
// continuous baseline underline (which blurred into the bottoms of L, U, J,
// period, etc.) into a series of short vertical "feet" at each cell edge,
// which is much easier for OCR to ignore.
const RAIL_GAP_FRAC = 0.14;

// Lay out text starting at (originX, baselineY). Each glyph is scaled to
// cellW × cellH; chars are placed at integer multiples of pitchX so the rail
// stays continuous (cellW <= pitchX gives a small horizontal gap between
// glyphs that is walked along the rail).
export function layoutText(
  text: string,
  originX: number,
  baselineY: number,
  cellW: number,
  cellH: number,
  pitchX: number
): Waypoint[] {
  const out: Waypoint[] = [];
  let cursorX = originX;
  const railGapAbs = RAIL_GAP_FRAC * cellH;
  for (let i = 0; i < text.length; i++) {
    const glyph = glyphFor(text[i]);
    appendLiftedGlyph(out, glyph, cursorX, baselineY, cellW, cellH, railGapAbs);
    cursorX += pitchX;
    if (i < text.length - 1) {
      out.push({ x: cursorX, y: baselineY });
    }
  }
  return out;
}

// Render a glyph with its body lifted above the rail. Points at y=0 stay on
// the rail (rail walks, glyph features designed to sit on the baseline).
// Anything above is rescaled from (0, 1] into (RAIL_GAP_FRAC, 1] vertically.
// No step-up/step-down waypoints are injected: each glyph's natural path
// handles its own transitions between rail and body, so glyphs with no
// bottom bar (F, T, P, ...) don't grow a phantom one at the lift height.
function appendLiftedGlyph(
  out: Waypoint[],
  glyph: Glyph,
  cursorX: number,
  baselineY: number,
  cellW: number,
  cellH: number,
  railGapAbs: number
) {
  for (const [gx, gy] of glyph) {
    const y = gy === 0
      ? baselineY
      : baselineY + railGapAbs + gy * (cellH - railGapAbs);
    out.push({ x: cursorX + gx * cellW, y });
  }
}
