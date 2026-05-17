import type { World } from 'koota';
import { actions } from '../actions/actions';
import { DrawJob, Flip, Input, Shake, Speed, Velocity } from '../traits';

export function updateInput(world: World) {
  const { getStylus, getEtch, requestClear, requestFlip } = actions(world);
  const input = world.get(Input);
  const stylus = getStylus();
  if (!input || !stylus) return;

  if (input.clear) {
    requestClear();
    world.set(Input, { clear: 0 });
  }
  if (input.flip) {
    requestFlip();
    world.set(Input, { flip: 0 });
  }

  const etch = getEtch();
  const shaking = etch?.has(Shake) ?? false;
  const flipping = etch?.has(Flip) ?? false;
  const piloted = etch?.has(DrawJob) ?? false;

  // Manual input is suppressed during shake / flip / SQL-driven writes.
  if (shaking || flipping || piloted) {
    stylus.set(Velocity, { x: 0, y: 0 });
    return;
  }

  const speed = stylus.get(Speed)?.value ?? 0.6;
  const horizontal = input.right - input.left;
  const vertical = input.up - input.down;

  stylus.set(Velocity, {
    x: horizontal * speed,
    y: vertical * speed,
  });
}
