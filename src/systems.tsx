import { useActions, useWorld } from 'koota/react';
import { useEffect } from 'react';
import { actions } from './core/actions/actions';
import { appendStroke } from './core/systems/append-stroke';
import { moveStylus } from './core/systems/move-stylus';
import { processDrawJob } from './core/systems/process-draw-job';
import { tickFlip } from './core/systems/tick-flip';
import { tickShake } from './core/systems/tick-shake';
import { tickTime } from './core/systems/tick-time';
import { updateInput } from './core/systems/update-input';
import { updateWheels } from './core/systems/update-wheels';
import { useAnimationFrame } from './utils/use-animation-frame';
import { useControlsMode } from './utils/controls-mode';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function Systems() {
  const world = useWorld();
  const { modeRef } = useControlsMode();
  const { setMovementKey, setActionKey, resetInput, getMovementKey, getActionKey } =
    useActions(actions);

  useAnimationFrame((delta) => {
    tickTime(world, delta);
    updateInput(world);
    processDrawJob(world);
    moveStylus(world);
    updateWheels(world);
    appendStroke(world);
    tickShake(world);
    tickFlip(world);
  });

  useEffect(() => {
    // Manual key control is gated on two things:
    //   - controls mode is 'canvas' (the layout-level focus signal)
    //   - the actual keyboard event isn't aimed at a text input
    // The first covers "selecting text inside the console feed" without
    // accidentally giving the etch back control. The second is a safety net.
    function blocked(target: EventTarget | null): boolean {
      return modeRef.current === 'console' || isEditableTarget(target);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (blocked(event.target)) return;
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
      if (blocked(event.target)) return;
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
  }, [getActionKey, getMovementKey, modeRef, resetInput, setActionKey, setMovementKey]);

  // When mode flips to 'console', drop any pressed keys so the stylus doesn't
  // keep coasting in whatever direction was last held.
  const { mode } = useControlsMode();
  useEffect(() => {
    if (mode === 'console') resetInput();
  }, [mode, resetInput]);

  return null;
}
