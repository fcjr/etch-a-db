import { useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import * as THREE from 'three';

// Place the perspective camera so a (width × height) box always fits the
// viewport regardless of aspect ratio. Re-runs whenever the canvas resizes.
type Props = {
  width: number;
  height: number;
  padding?: number;
  yOffset?: number;
};

export function FitCamera({ width, height, padding = 1.1, yOffset = 0.05 }: Props) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / size.height;
    const vFov = (camera.fov * Math.PI) / 180;
    const distForHeight = (height * padding) / (2 * Math.tan(vFov / 2));
    const distForWidth = (width * padding) / (2 * Math.tan(vFov / 2) * aspect);
    const distance = Math.max(distForHeight, distForWidth);
    camera.position.set(0, yOffset, distance);
    camera.lookAt(0, yOffset, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, width, height, padding, yOffset]);

  return null;
}
