import type { World } from 'koota';
import { actions } from '../actions/actions';
import { Position, WHEEL_RADIUS, WheelAngles } from '../traits';

// Convert linear stylus motion into wheel rotation: rolling a wheel of
// radius r over distance d rotates it by d / r radians. Left wheel tracks X,
// right wheel tracks Y. Driven by position delta so SQL writes spin the
// knobs the same as manual input.
export function updateWheels(world: World) {
  const { getStylus, getEtch } = actions(world);
  const stylus = getStylus();
  const etch = getEtch();
  if (!stylus || !etch) return;

  const pos = stylus.get(Position);
  const angles = etch.get(WheelAngles);
  if (!pos || !angles) return;

  const dx = pos.x - angles.prevX;
  const dy = pos.y - angles.prevY;

  etch.set(WheelAngles, {
    left: angles.left + dx / WHEEL_RADIUS,
    right: angles.right + dy / WHEEL_RADIUS,
    prevX: pos.x,
    prevY: pos.y,
  });
}
