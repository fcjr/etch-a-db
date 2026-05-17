import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Entity } from 'koota';
import { Flip, Shake, Strokes } from '../../core/traits';

const MAX_POINTS = 20000;

type Props = {
  etch: Entity;
};

export function DrawLine({ etch }: Props) {
  const lineRef = useRef<THREE.Line>(null);
  const positionsRef = useRef<Float32Array>(new Float32Array(MAX_POINTS * 3));
  const versionRef = useRef(-1);

  const line = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(positionsRef.current, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    geom.setAttribute('position', attr);
    geom.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({
      color: '#1a1a1a',
      transparent: true,
      opacity: 1,
    });
    const obj = new THREE.Line(geom, mat);
    obj.frustumCulled = false;
    return obj;
  }, []);

  useFrame(() => {
    if (!etch.isAlive()) return;
    const strokes = etch.get(Strokes);
    if (strokes && strokes.version !== versionRef.current) {
      const pts = strokes.points;
      const count = Math.min(pts.length / 2, MAX_POINTS);
      const positions = positionsRef.current;
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 0] = pts[i * 2 + 0];
        positions[i * 3 + 1] = pts[i * 2 + 1];
        positions[i * 3 + 2] = 0;
      }
      const geom = line.geometry;
      geom.setDrawRange(0, count);
      const attr = geom.attributes.position as THREE.BufferAttribute;
      attr.needsUpdate = true;
      versionRef.current = strokes.version;
    }

    // Fade the line out during shake or flip, so the drawing dissolves
    // visibly instead of snapping to empty at the end.
    const shake = etch.get(Shake);
    const flip = etch.get(Flip);
    const mat = line.material as THREE.LineBasicMaterial;
    if (shake) {
      const t = shake.elapsed / shake.duration;
      mat.opacity = 1 - smoothstep(0.25, 0.9, t);
    } else if (flip) {
      const t = flip.elapsed / flip.duration;
      // Stay visible briefly so you can see what just got flipped, then dump it.
      mat.opacity = 1 - smoothstep(0.15, 0.7, t);
    } else if (mat.opacity !== 1) {
      mat.opacity = 1;
    }
  });

  return <primitive ref={lineRef} object={line} position={[0, 0, 0.005]} />;
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
