import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import * as THREE from 'three';
import { WHEEL_RADIUS, WheelAngles } from '../../core/traits';

const RIDGE_COUNT = 16;
const WHEEL_DEPTH = 0.22;

type Props = {
  etch: Entity;
  side: 'left' | 'right';
  position: [number, number, number];
};

// A ridged plastic knob. Rolls around its own Y axis (which the parent rotation
// re-aligns to world Z) as the corresponding wheel angle changes.
export function Wheel({ etch, side, position }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!etch.isAlive() || !groupRef.current) return;
    const angles = etch.get(WheelAngles);
    if (!angles) return;
    groupRef.current.rotation.set(Math.PI / 2, angles[side], 0);
  });

  return (
    <group ref={groupRef} position={position} rotation={[Math.PI / 2, 0, 0]}>
      {/* Body of the knob */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_DEPTH, 36]} />
        <meshStandardMaterial color="#f3ecdb" roughness={0.55} metalness={0.05} />
      </mesh>
      {/* Front cap dimple, so the wheel face has a focal point */}
      <mesh position={[0, WHEEL_DEPTH / 2 + 0.003, 0]} castShadow>
        <cylinderGeometry args={[WHEEL_RADIUS * 0.42, WHEEL_RADIUS * 0.42, 0.012, 28]} />
        <meshStandardMaterial color="#cdc2a6" roughness={0.7} />
      </mesh>
      {/* Asymmetric marker on the front face — sells the rotation at a glance */}
      <mesh
        position={[WHEEL_RADIUS * 0.66, WHEEL_DEPTH / 2 + 0.008, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <boxGeometry args={[WHEEL_RADIUS * 0.5, 0.005, 0.03]} />
        <meshStandardMaterial color="#3b2a1c" roughness={0.6} />
      </mesh>
      {/* Radial ridges around the rim */}
      {Array.from({ length: RIDGE_COUNT }).map((_, i) => {
        const theta = (i / RIDGE_COUNT) * Math.PI * 2;
        const x = Math.cos(theta) * (WHEEL_RADIUS + 0.002);
        const z = Math.sin(theta) * (WHEEL_RADIUS + 0.002);
        const dark = i % 2 === 0;
        return (
          <mesh key={i} position={[x, 0, z]} rotation={[0, -theta, 0]} castShadow>
            <boxGeometry args={[0.022, WHEEL_DEPTH * 0.94, 0.052]} />
            <meshStandardMaterial color={dark ? '#a89d83' : '#e6dec8'} roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}
