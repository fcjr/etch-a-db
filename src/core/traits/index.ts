import { trait } from 'koota';

export type InputStateValue = 0 | 1;

export const Input = trait<{
  left: InputStateValue;
  right: InputStateValue;
  up: InputStateValue;
  down: InputStateValue;
  clear: InputStateValue;
}>({
  left: 0,
  right: 0,
  up: 0,
  down: 0,
  clear: 0,
});

export const Time = trait({ elapsed: 0, delta: 0 });

export const IsEtchSketch = trait();
export const IsStylus = trait();

// Stylus 2D position on the screen, in screen-local units.
// x ∈ [-SCREEN_HALF_W, SCREEN_HALF_W], y ∈ [-SCREEN_HALF_H, SCREEN_HALF_H].
export const Position = trait({ x: 0, y: 0 });
export const Velocity = trait({ x: 0, y: 0 });
export const Speed = trait({ value: 0.6 });

// Cumulative angle (radians) of each wheel. Visual only.
export const WheelAngles = trait({ left: 0, right: 0 });

// Drawn polyline. Stored as flat [x0,y0,x1,y1,...] for cheap geometry updates.
// drawnCount tracks how many points have actually been laid down (>=2 to form a segment).
export const Strokes = trait(() => ({
  points: [] as number[],
  // Bumped whenever points changes meaningfully; renderer reads to know it should rebuild.
  version: 0,
}));

// Active shake-to-clear effect. While present the body jiggles; on completion strokes are cleared.
export const Shake = trait({
  elapsed: 0,
  duration: 0.95,
  intensity: 0.14,
});

// Screen bounds (the play area for the stylus), in world units.
export const SCREEN_HALF_W = 1.0;
export const SCREEN_HALF_H = 0.7;

// Visual radius of each wheel (used to convert linear stylus motion into wheel rotation).
export const WHEEL_RADIUS = 0.22;
