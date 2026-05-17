import type { World } from 'koota';
import { Position, Shake, Strokes, Time, Velocity } from '../traits';
import { IsEtchSketch, IsStylus } from '../traits';

// Drives the shake-to-clear effect: advances elapsed time, and when complete,
// wipes the stroke history and re-centers the stylus.
export function tickShake(world: World) {
  const time = world.get(Time);
  if (!time) return;

  world.query(IsEtchSketch, Shake).updateEach(([shake], etch) => {
    shake.elapsed += time.delta;
    if (shake.elapsed < shake.duration) return;

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

    etch.remove(Shake);
  });
}
