const movementKeyEntries = [
  ['KeyA', 'left'],
  ['KeyD', 'right'],
  ['KeyW', 'up'],
  ['KeyS', 'down'],
] as const;

export const movementKeys = new Map(movementKeyEntries);

export type MovementKeyCode = (typeof movementKeyEntries)[number][0];

export function isMovementKeyCode(code: string): code is MovementKeyCode {
  return movementKeys.has(code as MovementKeyCode);
}

export function getMovementKey(code: string) {
  if (!isMovementKeyCode(code)) return undefined;
  return movementKeys.get(code);
}

const actionKeyEntries = [
  ['Space', 'clear'],
  ['KeyC', 'clear'],
  ['KeyF', 'flip'],
] as const;

export const actionKeys = new Map(actionKeyEntries);

export type ActionKeyCode = (typeof actionKeyEntries)[number][0];

export function isActionKeyCode(code: string): code is ActionKeyCode {
  return actionKeys.has(code as ActionKeyCode);
}

export function getActionKey(code: string) {
  if (!isActionKeyCode(code)) return undefined;
  return actionKeys.get(code);
}
