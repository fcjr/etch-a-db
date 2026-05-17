import type { World } from 'koota';
import {
  Flip,
  IsEtchSketch,
  IsStylus,
  Position,
  Strokes,
  TableSchema,
  Time,
  Velocity,
  WheelAngles,
  WriteCursor,
} from '../traits';

// Drives the FLIP effect. Advances elapsed time, and on completion wipes the
// strokes, recenters the stylus, and (unlike Shake) also drops the table
// schema so FLIP truly drops the table — whether triggered via SQL or the F
// key.
export function tickFlip(world: World) {
  const time = world.get(Time);
  if (!time) return;

  world.query(IsEtchSketch, Flip).updateEach(([flip], etch) => {
    flip.elapsed += time.delta;
    if (flip.elapsed < flip.duration) return;

    const strokes = etch.get(Strokes);
    if (strokes) {
      strokes.points.length = 0;
      strokes.points.push(0, 0);
      strokes.version++;
    }

    const stylus = world.queryFirst(IsStylus);
    if (stylus) {
      stylus.set(Position, { x: 0, y: 0 });
      stylus.set(Velocity, { x: 0, y: 0 });
    }

    const angles = etch.get(WheelAngles);
    if (angles) etch.set(WheelAngles, { ...angles, prevX: 0, prevY: 0 });

    if (etch.has(TableSchema)) etch.remove(TableSchema);
    if (etch.has(WriteCursor)) etch.remove(WriteCursor);

    etch.remove(Flip);
  });
}
