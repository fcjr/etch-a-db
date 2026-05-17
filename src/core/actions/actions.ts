import { createActions } from 'koota';
import {
  type DrawWaypoint,
  DrawJob,
  Flip,
  Input,
  InputStateValue,
  IsEtchSketch,
  IsStylus,
  Position,
  type SchemaColumn,
  Shake,
  Speed,
  Strokes,
  TableSchema,
  Velocity,
  WheelAngles,
  WriteCursor,
} from '../traits';
import { getActionKey, getMovementKey } from '../../input/key-map';

type MovementKey = 'left' | 'right' | 'up' | 'down';
type ActionKey = 'clear' | 'flip';

export const actions = createActions((world) => {
  return {
    setMovementKey: (key: MovementKey, pressed: InputStateValue) => {
      world.set(Input, (input) => ({ ...input, [key]: pressed }));
    },

    setActionKey: (key: ActionKey, pressed: InputStateValue) => {
      world.set(Input, (input) => ({ ...input, [key]: pressed }));
    },

    resetInput: () => {
      world.set(Input, { left: 0, right: 0, up: 0, down: 0, clear: 0, flip: 0 });
    },

    getMovementKey,
    getActionKey,

    getStylus: () => world.queryFirst(IsStylus),
    getEtch: () => world.queryFirst(IsEtchSketch),

    spawnEtchSketch: () => {
      const etch = world.spawn(
        IsEtchSketch,
        WheelAngles({ left: 0, right: 0, prevX: 0, prevY: 0 }),
        Strokes
      );
      const stylus = world.spawn(
        IsStylus,
        Position({ x: 0, y: 0 }),
        Velocity({ x: 0, y: 0 }),
        Speed({ value: 0.6 })
      );

      const strokes = etch.get(Strokes);
      if (strokes) {
        strokes.points.push(0, 0);
        strokes.version++;
      }

      return { etch, stylus };
    },

    requestClear: () => {
      const etch = world.queryFirst(IsEtchSketch);
      if (!etch || etch.has(Shake) || etch.has(Flip)) return;
      etch.add(Shake({ elapsed: 0, duration: 0.95, intensity: 0.14 }));
    },

    requestFlip: () => {
      const etch = world.queryFirst(IsEtchSketch);
      if (!etch || etch.has(Flip) || etch.has(Shake)) return;
      etch.add(Flip({ elapsed: 0, duration: 1.6, rotations: 3 }));
    },

    // Empty the drawn polyline and seed it with the stylus's current position
    // so subsequent motion produces a clean first segment.
    clearStrokes: () => {
      const etch = world.queryFirst(IsEtchSketch);
      const stylus = world.queryFirst(IsStylus);
      if (!etch || !stylus) return;
      const strokes = etch.get(Strokes);
      const pos = stylus.get(Position);
      if (!strokes || !pos) return;
      strokes.points.length = 0;
      strokes.points.push(pos.x, pos.y);
      strokes.version++;
    },

    // Snap the stylus to (x, y) without leaving a stroke and reseed the
    // polyline at that point. Used by CREATE/DELETE so the first SQL-driven
    // motion doesn't draw a long diagonal from the previous position into
    // the top-left of the new table layout (which would otherwise leak into
    // the OCR'd rows below).
    teleportStylus: (x: number, y: number) => {
      const etch = world.queryFirst(IsEtchSketch);
      const stylus = world.queryFirst(IsStylus);
      if (!etch || !stylus) return;
      stylus.set(Position, { x, y });
      const strokes = etch.get(Strokes);
      if (strokes) {
        strokes.points.length = 0;
        strokes.points.push(x, y);
        strokes.version++;
      }
      // Sync the wheel-delta tracker so the knobs don't snap-rotate.
      const angles = etch.get(WheelAngles);
      if (angles) etch.set(WheelAngles, { ...angles, prevX: x, prevY: y });
    },

    // Queue an auto-piloted stylus path. Returns a promise that resolves when
    // the job finishes (or immediately if there are no waypoints).
    enqueueDrawJob: (waypoints: DrawWaypoint[], speed = 2.6): Promise<void> => {
      const etch = world.queryFirst(IsEtchSketch);
      if (!etch || waypoints.length === 0) return Promise.resolve();
      return new Promise((resolve) => {
        etch.add(
          DrawJob({
            waypoints,
            index: 0,
            speed,
            onComplete: () => resolve(),
          })
        );
      });
    },

    setSchema: (
      name: string,
      columns: SchemaColumn[],
      columnLefts: number[],
      columnRights: number[],
      columnCenters: number[],
      rowBaselines: number[]
    ) => {
      const etch = world.queryFirst(IsEtchSketch);
      if (!etch) return;
      if (etch.has(TableSchema)) {
        etch.set(TableSchema, {
          name,
          columns,
          columnLefts,
          columnRights,
          columnCenters,
          rowBaselines,
        });
      } else {
        etch.add(
          TableSchema({
            name,
            columns,
            columnLefts,
            columnRights,
            columnCenters,
            rowBaselines,
          })
        );
      }
      if (etch.has(WriteCursor)) {
        etch.set(WriteCursor, { row: 0 });
      } else {
        etch.add(WriteCursor({ row: 0 }));
      }
    },

    getSchema: () => {
      const etch = world.queryFirst(IsEtchSketch);
      return etch?.get(TableSchema);
    },

    getCursor: () => {
      const etch = world.queryFirst(IsEtchSketch);
      return etch?.get(WriteCursor);
    },

    advanceCursor: () => {
      const etch = world.queryFirst(IsEtchSketch);
      const cursor = etch?.get(WriteCursor);
      if (!etch || !cursor) return;
      etch.set(WriteCursor, { row: cursor.row + 1 });
    },

    removeSchema: () => {
      const etch = world.queryFirst(IsEtchSketch);
      if (!etch) return;
      if (etch.has(TableSchema)) etch.remove(TableSchema);
      if (etch.has(WriteCursor)) etch.remove(WriteCursor);
    },
  };
});
