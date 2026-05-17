import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Entity } from 'koota';
import { Flip, SCREEN_HALF_H, SCREEN_HALF_W, Shake } from '../../core/traits';
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
    const flip = etch.get(Flip);

    if (flip) {
      // Table-flip: forward tumble around X, then a damped landing wobble.
      // Every transform is multiplied by an envelope that goes to 0 (or to a
      // multiple of 2π for rotation.x) at t = 1, so when the Flip trait is
      // removed the renderer's rest pose matches what was last drawn — no snap.
      const t = Math.min(1, flip.elapsed / flip.duration);
      const tumblePhase = Math.min(1, t / 0.75);
      const settlePhase = Math.max(0, (t - 0.75) / 0.25);
      const settleOut = 1 - settlePhase;
      const settleDecay = settleOut * settleOut;
      const wobbleEnv = 1 - t;

      // 3 full forward tumbles with ease-out, then a small over-and-back rock
      // during the settle phase that decays to zero.
      const easedRot = 1 - Math.pow(1 - tumblePhase, 2.4);
      const tumbleAngle = easedRot * flip.rotations * Math.PI * 2;
      const settleRock = Math.sin(settlePhase * Math.PI * 2.5) * 0.15 * settleDecay;
      group.rotation.x = tumbleAngle + settleRock;

      group.rotation.y = Math.sin(t * Math.PI * 4) * 0.18 * wobbleEnv;
      group.rotation.z = Math.sin(t * Math.PI * 2.3) * 0.12 * wobbleEnv;

      // Vertical arc during the tumble, plus a tiny landing bounce.
      group.position.y =
        Math.sin(tumblePhase * Math.PI) * 0.55 +
        -Math.sin(settlePhase * Math.PI * 3) * 0.06 * settleDecay;
      group.position.x = Math.sin(t * Math.PI * 1.6) * 0.08 * wobbleEnv;
      group.position.z = -Math.sin(tumblePhase * Math.PI) * 0.18;

      // Screen flashes lighter mid-flip, returns exactly to base by t = 1.
      const colorEnv = Math.sin(t * Math.PI);
      screenMat.color.copy(SCREEN_BASE).lerp(SCREEN_AGITATED, colorEnv * 0.55);
      return;
    }

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
        etch-a-db
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
