import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Entity } from 'koota';
import { SCREEN_HALF_H, SCREEN_HALF_W, Shake } from '../../core/traits';
import { useEtch } from '../../utils/use-etch';
import { DrawLine } from './draw-line';
import { Wheel } from './wheel';

const BODY_W = 2.6;
const BODY_H = 1.95;
const BODY_D = 0.34;
const SCREEN_W = SCREEN_HALF_W * 2;
const SCREEN_H = SCREEN_HALF_H * 2;
const SCREEN_Z = BODY_D / 2 + 0.001;

const SCREEN_BASE = new THREE.Color('#bdb5a0');
const SCREEN_AGITATED = new THREE.Color('#d5cdb6');

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function EtchSketchRenderer() {
  const etch = useEtch();
  if (!etch) return null;
  return <EtchSketchView etch={etch} />;
}

function EtchSketchView({ etch }: { etch: Entity }) {
  const rootRef = useRef<THREE.Group>(null);
  const screenRef = useRef<THREE.Mesh>(null);
  const screenMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: SCREEN_BASE.clone(),
        roughness: 0.85,
        metalness: 0.15,
      }),
    []
  );

  useFrame(() => {
    const group = rootRef.current;
    if (!group) return;
    const shake = etch.get(Shake);

    if (!shake) {
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
      screenMat.color.copy(SCREEN_BASE);
      return;
    }

    const t = shake.elapsed / shake.duration;
    // Fast attack, plateau, gentle release.
    const attack = smoothstep(0, 0.08, t);
    const release = 1 - smoothstep(0.7, 1, t);
    const env = attack * release;
    const amp = shake.intensity * env;

    // Three overlapping frequencies for a chaotic, hand-shaken feel; the
    // dominant axis is vertical because you flip the toy up and down to clear.
    const e = shake.elapsed;
    const x =
      Math.sin(e * 47) * 0.55 + Math.sin(e * 73 + 1.3) * 0.35 + Math.cos(e * 113 + 2.1) * 0.18;
    const y =
      Math.cos(e * 53 + 0.4) * 1.0 + Math.sin(e * 89 + 2.7) * 0.45 + Math.cos(e * 31) * 0.25;
    const z = Math.sin(e * 41 + 1.1) * 0.3 + Math.sin(e * 67) * 0.15;

    group.position.x = x * amp;
    group.position.y = y * amp * 1.1;
    group.position.z = z * amp * 0.4;

    // Body rotates a little on every axis — like the toy fighting the shake.
    group.rotation.x = Math.sin(e * 37 + 0.2) * amp * 1.5;
    group.rotation.y = Math.cos(e * 29) * amp * 0.9;
    group.rotation.z = Math.sin(e * 61 + 1.7) * amp * 2.0;

    // Screen tints lighter mid-shake, suggesting the powder being redistributed.
    screenMat.color.copy(SCREEN_BASE).lerp(SCREEN_AGITATED, env);
  });

  return (
    <group ref={rootRef}>
      {/* Red plastic body */}
      <RoundedBox args={[BODY_W, BODY_H, BODY_D]} radius={0.07} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#c0202b" roughness={0.45} metalness={0.05} />
      </RoundedBox>

      {/* Inner recess around the screen (slightly darker red) */}
      <mesh position={[0, 0.08, BODY_D / 2 - 0.001]}>
        <planeGeometry args={[SCREEN_W + 0.18, SCREEN_H + 0.18]} />
        <meshStandardMaterial color="#971822" roughness={0.6} />
      </mesh>

      {/* Aluminum-powder screen */}
      <mesh ref={screenRef} position={[0, 0.08, SCREEN_Z]} material={screenMat} receiveShadow>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
      </mesh>

      {/* Drawn polyline, slightly in front of the screen */}
      <group position={[0, 0.08, SCREEN_Z + 0.001]}>
        <DrawLine etch={etch} />
      </group>

      {/* Brand text */}
      <Text
        position={[0, BODY_H / 2 - 0.13, BODY_D / 2 + 0.002]}
        fontSize={0.14}
        color="#f5efe2"
        letterSpacing={0.04}
        anchorX="center"
        anchorY="middle"
      >
        etch-db
      </Text>

      {/* Wheels — pulled forward so they protrude from the front of the body */}
      <Wheel
        etch={etch}
        side="left"
        position={[-BODY_W / 2 + 0.34, -BODY_H / 2 + 0.32, BODY_D / 2 + 0.02]}
      />
      <Wheel
        etch={etch}
        side="right"
        position={[BODY_W / 2 - 0.34, -BODY_H / 2 + 0.32, BODY_D / 2 + 0.02]}
      />
    </group>
  );
}
