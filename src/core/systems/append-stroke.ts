import type { World } from 'koota';
import { actions } from '../actions/actions';
import { Position, Shake, Strokes, Velocity } from '../traits';

const MIN_SEGMENT_SQ = 0.0008 * 0.0008;

// Append the stylus position to the polyline whenever it actually moves.
// Skips while the body is mid-shake so the clear effect leaves no streaks.
export function appendStroke(world: World) {
  const { getStylus, getEtch } = actions(world);
  const stylus = getStylus();
  const etch = getEtch();
  if (!stylus || !etch) return;
  if (etch.has(Shake)) return;

  const pos = stylus.get(Position);
  const vel = stylus.get(Velocity);
  const strokes = etch.get(Strokes);
  if (!pos || !vel || !strokes) return;

  if (vel.x === 0 && vel.y === 0) return;

  const pts = strokes.points;
  const len = pts.length;
  if (len >= 2) {
    const dx = pos.x - pts[len - 2];
    const dy = pos.y - pts[len - 1];
    if (dx * dx + dy * dy < MIN_SEGMENT_SQ) return;
  }

  pts.push(pos.x, pos.y);
  strokes.version++;
}
