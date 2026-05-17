import type { World } from 'koota';
import { DrawJob, IsEtchSketch, IsStylus, Position, Time, Velocity } from '../traits';

// Advance the stylus along the active DrawJob's waypoints at job speed.
// May cross multiple waypoints in a single frame if speed * dt is large.
export function processDrawJob(world: World) {
  const time = world.get(Time);
  if (!time) return;

  world.query(DrawJob, IsEtchSketch).updateEach(([job], etch) => {
    const stylus = world.queryFirst(IsStylus);
    if (!stylus) return;
    const pos = stylus.get(Position);
    if (!pos) return;

    let curX = pos.x;
    let curY = pos.y;
    let stepRemaining = job.speed * time.delta;

    while (stepRemaining > 0 && job.index < job.waypoints.length) {
      const target = job.waypoints[job.index];
      const dx = target.x - curX;
      const dy = target.y - curY;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) {
        job.index++;
        continue;
      }
      if (dist <= stepRemaining) {
        curX = target.x;
        curY = target.y;
        stepRemaining -= dist;
        job.index++;
      } else {
        curX += (dx / dist) * stepRemaining;
        curY += (dy / dist) * stepRemaining;
        stepRemaining = 0;
      }
    }

    stylus.set(Position, { x: curX, y: curY });
    // Zero out manual velocity so it doesn't bleed in.
    if (stylus.has(Velocity)) stylus.set(Velocity, { x: 0, y: 0 });

    if (job.index >= job.waypoints.length) {
      const cb = job.onComplete;
      etch.remove(DrawJob);
      cb?.();
    }
  });
}
