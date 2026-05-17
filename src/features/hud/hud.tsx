import { useControlsMode } from '../../utils/controls-mode';

export function Hud() {
  const { mode } = useControlsMode();

  if (mode === 'console') {
    return (
      <div className="hint hint--paused">
        ✎ console focused — knob controls paused. click the etch to take over.
      </div>
    );
  }

  return (
    <div className="hint">
      <kbd>A</kbd> <kbd>D</kbd> · <kbd>W</kbd> <kbd>S</kbd> · <kbd>Space</kbd> shake ·{' '}
      <kbd>F</kbd> flip
    </div>
  );
}
