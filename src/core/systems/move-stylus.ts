import type { World } from 'koota';
import {
  IsStylus,
  Position,
  SCREEN_HALF_H,
  SCREEN_HALF_W,
  Time,
  Velocity,
} from '../traits';

export function moveStylus(world: World) {
  const time = world.get(Time);
  if (!time) return;

  world.query(IsStylus, Position, Velocity).updateEach(([pos, vel]) => {
    const nextX = Math.max(-SCREEN_HALF_W, Math.min(SCREEN_HALF_W, pos.x + vel.x * time.delta));
    const nextY = Math.max(-SCREEN_HALF_H, Math.min(SCREEN_HALF_H, pos.y + vel.y * time.delta));
    pos.x = nextX;
    pos.y = nextY;
  });
}
