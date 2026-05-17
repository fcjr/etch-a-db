import { createActions } from 'koota';
import {
  Input,
  InputStateValue,
  IsEtchSketch,
  IsStylus,
  Position,
  Shake,
  Speed,
  Strokes,
  Velocity,
  WheelAngles,
} from '../traits';
import { getActionKey, getMovementKey } from '../../input/key-map';

type MovementKey = 'left' | 'right' | 'up' | 'down';
type ActionKey = 'clear';

export const actions = createActions((world) => {
  return {
    setMovementKey: (key: MovementKey, pressed: InputStateValue) => {
      world.set(Input, (input) => ({ ...input, [key]: pressed }));
    },

    setActionKey: (key: ActionKey, pressed: InputStateValue) => {
      world.set(Input, (input) => ({ ...input, [key]: pressed }));
    },

    resetInput: () => {
      world.set(Input, { left: 0, right: 0, up: 0, down: 0, clear: 0 });
    },

    getMovementKey,
    getActionKey,

    getStylus: () => world.queryFirst(IsStylus),
    getEtch: () => world.queryFirst(IsEtchSketch),

    spawnEtchSketch: () => {
      const etch = world.spawn(IsEtchSketch, WheelAngles({ left: 0, right: 0 }), Strokes);
      const stylus = world.spawn(
        IsStylus,
        Position({ x: 0, y: 0 }),
        Velocity({ x: 0, y: 0 }),
        Speed({ value: 0.6 })
      );

      // Seed the stroke with the starting point so the first motion produces a segment.
      const strokes = etch.get(Strokes);
      if (strokes) {
        strokes.points.push(0, 0);
        strokes.version++;
      }

      return { etch, stylus };
    },

    requestClear: () => {
      const etch = world.queryFirst(IsEtchSketch);
      if (!etch || etch.has(Shake)) return;
      etch.add(Shake({ elapsed: 0, duration: 0.95, intensity: 0.14 }));
    },
  };
});
