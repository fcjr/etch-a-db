import type { World } from 'koota';
import { actions } from '../actions/actions';
import { Time, Velocity, WHEEL_RADIUS, WheelAngles } from '../traits';

// Convert linear stylus motion into wheel rotation: rolling a wheel of
// radius r over distance d rotates it by d / r radians. Left wheel = X, right wheel = Y.
export function updateWheels(world: World) {
  const time = world.get(Time);
  const { getStylus, getEtch } = actions(world);
  const stylus = getStylus();
  const etch = getEtch();
  if (!time || !stylus || !etch) return;

  const vel = stylus.get(Velocity);
  const angles = etch.get(WheelAngles);
  if (!vel || !angles) return;

  etch.set(WheelAngles, {
    left: angles.left + (vel.x * time.delta) / WHEEL_RADIUS,
    right: angles.right + (vel.y * time.delta) / WHEEL_RADIUS,
  });
}
