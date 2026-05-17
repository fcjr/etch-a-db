import { useActions, useWorld } from 'koota/react';
import { useEffect } from 'react';
import { actions } from './core/actions/actions';
import { appendStroke } from './core/systems/append-stroke';
import { moveStylus } from './core/systems/move-stylus';
import { tickShake } from './core/systems/tick-shake';
import { tickTime } from './core/systems/tick-time';
import { updateInput } from './core/systems/update-input';
import { updateWheels } from './core/systems/update-wheels';
import { useAnimationFrame } from './utils/use-animation-frame';

export function Systems() {
  const world = useWorld();
  const { setMovementKey, setActionKey, resetInput, getMovementKey, getActionKey } =
    useActions(actions);

  useAnimationFrame((delta) => {
    tickTime(world, delta);
    updateInput(world);
    moveStylus(world);
    updateWheels(world);
    appendStroke(world);
    tickShake(world);
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const movementKey = getMovementKey(event.code);
      if (movementKey) {
        event.preventDefault();
        setMovementKey(movementKey, 1);
        return;
      }

      const actionKey = getActionKey(event.code);
      if (actionKey) {
        event.preventDefault();
        if (event.repeat) return;
        setActionKey(actionKey, 1);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      const movementKey = getMovementKey(event.code);
      if (movementKey) {
        event.preventDefault();
        setMovementKey(movementKey, 0);
      }
    }

    function handleBlur() {
      resetInput();
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      resetInput();
    };
  }, [getActionKey, getMovementKey, resetInput, setActionKey, setMovementKey]);

  return null;
}
