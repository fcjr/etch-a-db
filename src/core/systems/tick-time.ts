import type { World } from 'koota';
import { Time } from '../traits';

export function tickTime(world: World, delta: number) {
  world.set(Time, (time) => ({
    elapsed: time.elapsed + delta,
    delta,
  }));
}
