import './app.css';
import { Canvas } from '@react-three/fiber';
import { EtchSketchRenderer } from './features/renderers/etch-sketch-renderer';
import { FitCamera } from './features/renderers/fit-camera';
import { Console } from './features/console/console';
import { Hud } from './features/hud/hud';
import { Startup } from './startup';
import { Systems } from './systems';
import { useControlsMode } from './utils/controls-mode';

// Outer bounds of the etch-a-sketch body — must match the body dimensions in
// etch-sketch-renderer.tsx. Used by FitCamera to keep the device fully visible.
const FIT_WIDTH = 2.6;
const FIT_HEIGHT = 1.95;

export function App() {
  const { setMode } = useControlsMode();

  return (
    <div className="layout">
      <div
        className="scene-area"
        onPointerDown={() => {
          // Clicking the etch hands knob controls back to the keyboard.
          const el = document.activeElement;
          if (
            el instanceof HTMLElement &&
            (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
          ) {
            el.blur();
          }
          setMode('canvas');
        }}
      >
        <Canvas className="scene" camera={{ fov: 38 }} shadows>
          <color attach="background" args={['#1a1a1a']} />
          <ambientLight intensity={0.55} />
          <directionalLight
            position={[3, 5, 4]}
            intensity={1.15}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-4, 2, -2]} intensity={0.35} color="#a8c6ff" />
          <FitCamera width={FIT_WIDTH} height={FIT_HEIGHT} padding={1.22} />
          <EtchSketchRenderer />
        </Canvas>
        <Hud />
      </div>
      <Console />

      <Startup />
      <Systems />
    </div>
  );
}
