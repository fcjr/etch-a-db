import { trait } from 'koota';

export type InputStateValue = 0 | 1;

export const Input = trait<{
  left: InputStateValue;
  right: InputStateValue;
  up: InputStateValue;
  down: InputStateValue;
  clear: InputStateValue;
  flip: InputStateValue;
}>({
  left: 0,
  right: 0,
  up: 0,
  down: 0,
  clear: 0,
  flip: 0,
});

export const Time = trait({ elapsed: 0, delta: 0 });

export const IsEtchSketch = trait();
export const IsStylus = trait();

// Stylus 2D position on the screen, in screen-local units.
// x ∈ [-SCREEN_HALF_W, SCREEN_HALF_W], y ∈ [-SCREEN_HALF_H, SCREEN_HALF_H].
export const Position = trait({ x: 0, y: 0 });
export const Velocity = trait({ x: 0, y: 0 });
export const Speed = trait({ value: 0.6 });

// Cumulative angle (radians) of each wheel. Visual only.
// prevX / prevY are the stylus position last frame; we drive wheel rotation
// from the actual position delta so SQL-driven writes also spin the knobs.
export const WheelAngles = trait({ left: 0, right: 0, prevX: 0, prevY: 0 });

// Drawn polyline. Stored as flat [x0,y0,x1,y1,...] for cheap geometry updates.
// drawnCount tracks how many points have actually been laid down (>=2 to form a segment).
export const Strokes = trait(() => ({
  points: [] as number[],
  // Bumped whenever points changes meaningfully; renderer reads to know it should rebuild.
  version: 0,
}));

// One-table-database schema. Present once CREATE TABLE has run.
export type ColumnType = 'TEXT' | 'INT';
export type SchemaColumn = { name: string; type: ColumnType };
export const TableSchema = trait(() => ({
  name: '' as string,
  columns: [] as SchemaColumn[],
  // World-space x position of the *center* of each column on the screen.
  columnCenters: [] as number[],
  // World-space x positions of the column dividers (left edge of each column).
  columnLefts: [] as number[],
  // World-space x of the column right edges (last entry = right margin).
  columnRights: [] as number[],
  // World-space y baseline of each row, in order [header, data0, data1, ...].
  rowBaselines: [] as number[],
}));

// Write cursor — index of the next free data row.
export const WriteCursor = trait({ row: 0 });

// An auto-piloted stylus path. While present, manual input is ignored.
export type DrawWaypoint = { x: number; y: number };
export const DrawJob = trait(() => ({
  waypoints: [] as DrawWaypoint[],
  index: 0,
  speed: 2.6,
  onComplete: undefined as (() => void) | undefined,
}));

// Active shake-to-clear effect. While present the body jiggles; on completion strokes are cleared.
export const Shake = trait({
  elapsed: 0,
  duration: 0.95,
  intensity: 0.14,
});

// Active table-flip effect: rotates the toy several times around its X axis
// with a vertical arc, like flipping a table. On completion the strokes and
// any active schema are cleared.
export const Flip = trait({
  elapsed: 0,
  duration: 1.6,
  rotations: 3,
});

// Screen bounds (the play area for the stylus), in world units.
export const SCREEN_HALF_W = 1.0;
export const SCREEN_HALF_H = 0.7;

// Visual radius of each wheel (used to convert linear stylus motion into wheel rotation).
export const WHEEL_RADIUS = 0.22;
