import type { Waypoint } from './font';
import { layoutText } from './font';
import { SCREEN_HALF_H, SCREEN_HALF_W } from '../core/traits';

const X_PAD = 0.08;
const Y_PAD = 0.1;
export const LEFT_EDGE = -SCREEN_HALF_W + X_PAD;
export const RIGHT_EDGE = SCREEN_HALF_W - X_PAD;
export const TOP_EDGE = SCREEN_HALF_H - Y_PAD;

export const ROW_HEIGHT = 0.13;
export const GLYPH_H = 0.085;
export const GLYPH_W = 0.052;
export const CHAR_PITCH = 0.062;
export const MAX_DATA_ROWS = 7;

type ColumnLayout = {
  lefts: number[];
  rights: number[];
  centers: number[];
};

type RowLayout = {
  baselines: number[]; // [0] = header, [1..] = data rows
};

export function computeLayout(numColumns: number): { columns: ColumnLayout; rows: RowLayout } {
  const usableW = RIGHT_EDGE - LEFT_EDGE;
  const colW = usableW / numColumns;
  const lefts: number[] = [];
  const rights: number[] = [];
  const centers: number[] = [];
  for (let c = 0; c < numColumns; c++) {
    lefts.push(LEFT_EDGE + c * colW);
    rights.push(LEFT_EDGE + (c + 1) * colW);
    centers.push(LEFT_EDGE + (c + 0.5) * colW);
  }
  const baselines: number[] = [];
  // Header baseline so a glyph (which rises GLYPH_H above the baseline) fits inside the screen.
  for (let r = 0; r < 1 + MAX_DATA_ROWS; r++) {
    baselines.push(TOP_EDGE - GLYPH_H - r * ROW_HEIGHT);
  }
  return { columns: { lefts, rights, centers }, rows: { baselines } };
}

function fitText(text: string, colWidth: number): string {
  const maxChars = Math.max(1, Math.floor(colWidth / CHAR_PITCH) - 1);
  return text.slice(0, maxChars);
}

function centerOriginX(text: string, colLeft: number, colWidth: number): number {
  const textW = text.length * CHAR_PITCH;
  return colLeft + Math.max(0, (colWidth - textW) / 2);
}

export type CreateTablePlan = {
  waypoints: Waypoint[];
  columnLefts: number[];
  columnRights: number[];
  columnCenters: number[];
  rowBaselines: number[];
};

export function planCreateTable(columnNames: string[]): CreateTablePlan {
  const { columns, rows } = computeLayout(columnNames.length);
  const headerY = rows.baselines[0];
  const waypoints: Waypoint[] = [];

  waypoints.push({ x: LEFT_EDGE, y: headerY });

  for (let c = 0; c < columnNames.length; c++) {
    const colLeft = columns.lefts[c];
    const colRight = columns.rights[c];
    const colW = colRight - colLeft;
    const text = fitText(columnNames[c], colW);
    const startX = centerOriginX(text, colLeft, colW);

    waypoints.push({ x: startX, y: headerY });
    waypoints.push(...layoutText(text, startX, headerY, GLYPH_W, GLYPH_H, CHAR_PITCH));
    waypoints.push({ x: colRight, y: headerY });
  }

  waypoints.push({ x: RIGHT_EDGE, y: headerY });
  // Drop to first data row's baseline, then trace its rail leftward.
  waypoints.push({ x: RIGHT_EDGE, y: rows.baselines[1] });
  waypoints.push({ x: LEFT_EDGE, y: rows.baselines[1] });

  return {
    waypoints,
    columnLefts: columns.lefts,
    columnRights: columns.rights,
    columnCenters: columns.centers,
    rowBaselines: rows.baselines,
  };
}

export function planInsertRow(
  rowIndex: number,
  values: string[],
  columnLefts: number[],
  columnRights: number[],
  rowBaselines: number[]
): Waypoint[] {
  const baselineY = rowBaselines[1 + rowIndex];
  const waypoints: Waypoint[] = [];

  // For rows after the first, the stylus was left at (RIGHT_EDGE, prevBaseline).
  // Drop straight down on the right edge, then trace the new row's rail leftward.
  if (rowIndex > 0) {
    waypoints.push({ x: RIGHT_EDGE, y: baselineY });
    waypoints.push({ x: LEFT_EDGE, y: baselineY });
  }

  for (let c = 0; c < values.length; c++) {
    const colLeft = columnLefts[c];
    const colRight = columnRights[c];
    const colW = colRight - colLeft;
    const text = fitText(values[c], colW);
    const startX = centerOriginX(text, colLeft, colW);

    waypoints.push({ x: startX, y: baselineY });
    waypoints.push(...layoutText(text, startX, baselineY, GLYPH_W, GLYPH_H, CHAR_PITCH));
    waypoints.push({ x: colRight, y: baselineY });
  }

  waypoints.push({ x: RIGHT_EDGE, y: baselineY });
  return waypoints;
}
