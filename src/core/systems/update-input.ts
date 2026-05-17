import type { World } from 'koota';
import { actions } from '../actions/actions';
import { Input, Shake, Speed, Velocity } from '../traits';

export function updateInput(world: World) {
  const { getStylus, getEtch, requestClear } = actions(world);
  const input = world.get(Input);
  const stylus = getStylus();
  if (!input || !stylus) return;

  // Clear is edge-triggered by the input handler (only set on keydown without repeat),
  // but we still gate on Shake not already running, handled inside requestClear.
  if (input.clear) {
    requestClear();
    world.set(Input, { clear: 0 });
  }

  const speed = stylus.get(Speed)?.value ?? 0.6;
  const etch = getEtch();
  const shaking = etch?.has(Shake) ?? false;

  if (shaking) {
    stylus.set(Velocity, { x: 0, y: 0 });
    return;
  }

  const horizontal = input.right - input.left;
  const vertical = input.up - input.down;

  stylus.set(Velocity, {
    x: horizontal * speed,
    y: vertical * speed,
  });
}
