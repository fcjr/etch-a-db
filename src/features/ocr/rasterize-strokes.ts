import { SCREEN_HALF_H, SCREEN_HALF_W } from '../../core/traits';
import { GLYPH_H } from '../../db/draw-plan';

void SCREEN_HALF_H;
void SCREEN_HALF_W;

// Per-row rasterizer. Clips the stylus polyline to each data row's bounding
// box so the rest of the screen (vertical spine, other rows, leading connector
// from page-origin to first glyph) is invisible to OCR. Tesseract sees only
// the line image for one row at a time, which it handles far better than the
// full chaotic polyline.
//
// Resolution targets ~75 px glyph height — comfortable for Tesseract's
// trained-data DPI.

const PX_PER_UNIT = 850;
const PAD_PX = 22;
const STROKE_PX = 4;
const ROW_BOTTOM_PAD_WORLD = 0.006;
const ROW_TOP_PAD_WORLD = 0.022;

export type RowImage = {
  canvas: HTMLCanvasElement;
  row: number;
  // Pixel x of each column boundary, in canvas coordinates including padding.
  // Length = numCols + 1 (left edge of col 0, between each pair, right edge of last).
  columnXsPx: number[];
};

export function rasterizeRows(
  points: number[],
  columnLefts: number[],
  columnRights: number[],
  rowBaselines: number[],
  dataRowCount: number
): RowImage[] {
  if (columnLefts.length === 0 || dataRowCount <= 0) return [];

  const left = columnLefts[0];
  const right = columnRights[columnRights.length - 1];
  const out: RowImage[] = [];

  for (let r = 0; r < dataRowCount; r++) {
    const baselineY = rowBaselines[1 + r];
    if (baselineY === undefined) continue;
    const bottom = baselineY - ROW_BOTTOM_PAD_WORLD;
    const top = baselineY + GLYPH_H + ROW_TOP_PAD_WORLD;
    const canvas = renderClippedRow(points, left, right, bottom, top);
    const columnXsPx = columnLefts
      .map((x) => PAD_PX + (x - left) * PX_PER_UNIT)
      .concat([PAD_PX + (right - left) * PX_PER_UNIT]);
    out.push({ canvas, row: r, columnXsPx });
  }
  return out;
}

function renderClippedRow(
  points: number[],
  left: number,
  right: number,
  bottom: number,
  top: number
): HTMLCanvasElement {
  const worldW = right - left;
  const worldH = top - bottom;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(worldW * PX_PER_UNIT) + PAD_PX * 2;
  canvas.height = Math.round(worldH * PX_PER_UNIT) + PAD_PX * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context for OCR rasterizer.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = STROKE_PX;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Walk each polyline segment, clip to the row bbox, render the clipped part.
  // Adjacent in-bbox segments share endpoints, so this still renders as a
  // continuous line where the original was continuous inside the bbox.
  for (let i = 2; i < points.length; i += 2) {
    const ax = points[i - 2];
    const ay = points[i - 1];
    const bx = points[i];
    const by = points[i + 1];
    const seg = clipSegment(ax, ay, bx, by, left, bottom, right, top);
    if (!seg) continue;
    const [x0, y0, x1, y1] = seg;
    const sx0 = PAD_PX + (x0 - left) * PX_PER_UNIT;
    const sy0 = PAD_PX + (top - y0) * PX_PER_UNIT;
    const sx1 = PAD_PX + (x1 - left) * PX_PER_UNIT;
    const sy1 = PAD_PX + (top - y1) * PX_PER_UNIT;
    ctx.beginPath();
    ctx.moveTo(sx0, sy0);
    ctx.lineTo(sx1, sy1);
    ctx.stroke();
  }

  return canvas;
}

// Liang–Barsky clip of segment (x0,y0)→(x1,y1) to rect [xmin,ymin]–[xmax,ymax].
function clipSegment(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  xmin: number,
  ymin: number,
  xmax: number,
  ymax: number
): [number, number, number, number] | null {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const ps = [-dx, dx, -dy, dy];
  const qs = [x0 - xmin, xmax - x0, y0 - ymin, ymax - y0];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 4; i++) {
    const p = ps[i];
    const q = qs[i];
    if (p === 0) {
      if (q < 0) return null;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > t1) return null;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return null;
        if (t < t1) t1 = t;
      }
    }
  }
  return [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy];
}
