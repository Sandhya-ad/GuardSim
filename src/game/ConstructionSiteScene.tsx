import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Hotspot } from './Hotspot';
import { useGameStore } from '../state/gameStore';

export function ConstructionSiteScene() {
  const currentStep = useGameStore((s) => s.mission.steps[s.currentStepId]);
  const setScreen = useGameStore((s) => s.setScreen);
  const markInteraction = useGameStore((s) => s.markInteraction);
  const setBarrierInZone = useGameStore((s) => s.setBarrierInZone);
  const startPoliceEta = useGameStore((s) => s.startPoliceEta);
  const openNotebook = useGameStore((s) => s.openNotebook);
  const barrierMoved = useGameStore((s) => s.interactions.barrierMoved);
  const barrierInZone = useGameStore((s) => s.interactions.barrierInZone);
  const patrolComplete = useGameStore((s) => s.interactions.patrolComplete);
  const npcRef = useRef<THREE.Mesh>(null);
  const policeBodyRef = useRef<THREE.Mesh>(null);
  const policeRedRef = useRef<THREE.Mesh>(null);
  const policeBlueRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const draggableRef = useRef<THREE.Mesh>(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef<[number, number] | null>(null);
  const guardRef = useRef<THREE.Mesh>(null);
  const keysRef = useRef<Record<string, boolean>>({});

  const isVandalism = currentStep?.sceneState === 'vandalism' || currentStep?.sceneState === 'police-arrived';
  const isPoliceArrival = currentStep?.sceneState === 'police-arrived';

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (guardRef.current && currentStep?.sceneState === 'patrol') {
      const speed = 0.05;
      if (keysRef.current.KeyW || keysRef.current.ArrowUp) guardRef.current.position.z -= speed;
      if (keysRef.current.KeyS || keysRef.current.ArrowDown) guardRef.current.position.z += speed;
      if (keysRef.current.KeyA || keysRef.current.ArrowLeft) guardRef.current.position.x -= speed;
      if (keysRef.current.KeyD || keysRef.current.ArrowRight) guardRef.current.position.x += speed;
      guardRef.current.position.x = Math.max(-8.5, Math.min(8.5, guardRef.current.position.x));
      guardRef.current.position.z = Math.max(-8.5, Math.min(8.5, guardRef.current.position.z));
      if (!patrolComplete && guardRef.current.position.x < -5.8 && guardRef.current.position.z > -1.4) {
        markInteraction('patrolComplete');
      }
    }

    if (npcRef.current) {
      const bob = Math.sin(t * 2.2) * 0.05;
      const sway = Math.sin(t * 1.5) * 0.25;
      npcRef.current.position.y = 1 + bob;
      if (currentStep?.sceneState === 'trespasser-loitering') {
        npcRef.current.position.x = -7 + sway;
        npcRef.current.rotation.y = Math.sin(t * 0.9) * 0.2;
      } else if (currentStep?.sceneState === 'trespasser-refuses') {
        npcRef.current.position.x = -6.6 + sway * 1.4;
        npcRef.current.rotation.y = Math.sin(t * 2.4) * 0.35;
      } else if (currentStep?.sceneState === 'vandalism') {
        npcRef.current.position.x = 3.3 + Math.sin(t * 5.5) * 0.08;
        npcRef.current.rotation.y = 0.85 + Math.sin(t * 8) * 0.2;
      } else {
        npcRef.current.position.x = -1.5 + Math.sin(t * 1.2) * 0.05;
        npcRef.current.rotation.y = Math.sin(t * 2) * 0.15;
      }
    }
    if (leftArmRef.current && rightArmRef.current && leftLegRef.current && rightLegRef.current && headRef.current) {
      const walk = Math.sin(t * 4.2) * 0.45;
      leftArmRef.current.rotation.x = walk;
      rightArmRef.current.rotation.x = -walk;
      leftLegRef.current.rotation.x = -walk * 0.65;
      rightLegRef.current.rotation.x = walk * 0.65;
      headRef.current.rotation.y = Math.sin(t * 1.6) * 0.28;
      if (currentStep?.sceneState === 'vandalism') {
        rightArmRef.current.rotation.x = Math.sin(t * 15) * 1.15;
      }
    }

    if (isPoliceArrival && policeBodyRef.current && policeRedRef.current && policeBlueRef.current) {
      const pulse = Math.abs(Math.sin(t * 7));
      const red = pulse > 0.5 ? 1.2 : 0.15;
      const blue = pulse <= 0.5 ? 1.2 : 0.15;
      (policeBodyRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + pulse * 0.3;
      (policeRedRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = red;
      (policeBlueRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = blue;
    }
  });

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      keysRef.current[event.code] = true;
    };
    const up = (event: KeyboardEvent) => {
      keysRef.current[event.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const fencePanels = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, index) => (
        <mesh key={`f-${index}`} position={[-10 + index * 2.5, 1, -6]}>
          <boxGeometry args={[2.2, 2, 0.1]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      )),
    [],
  );

  return (
    <>
      <fog attach="fog" args={['#05070d', 10, 35]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[34, 30]} />
        <meshStandardMaterial color="#2f2f2f" roughness={1} />
      </mesh>

      {fencePanels}
      <mesh position={[-6, 0.01, -0.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.75, 24]} />
        <meshBasicMaterial color={patrolComplete ? '#4ade80' : '#22d3ee'} />
      </mesh>
      <mesh position={[-6, 1.6, -6.1]}>
        <planeGeometry args={[1.2, 0.6]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[6, 1.6, -6.1]}>
        <planeGeometry args={[1.2, 0.6]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <group position={[-6, 1.6, -5.75]}>
        <Html distanceFactor={9}>
          <div className="site-sign">NO TRESPASSING</div>
        </Html>
      </group>
      <group position={[6, 1.6, -5.75]}>
        <Html distanceFactor={9}>
          <div className="site-sign">PRIVATE PROPERTY</div>
        </Html>
      </group>

      <mesh position={[5, 1.1, -3]} castShadow>
        <boxGeometry args={[4.6, 2.2, 2.6]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>

      <mesh position={[3.9, 1.15, -1.65]}>
        <boxGeometry args={[1.1, 0.85, 0.05]} />
        <meshStandardMaterial color={isVandalism ? '#7f1d1d' : '#94a3b8'} emissive={isVandalism ? '#450a0a' : '#000000'} />
      </mesh>

      <mesh position={[-5.6, 0.7, -1.9]}>
        <boxGeometry args={[2.2, 1.4, 1.8]} />
        <meshStandardMaterial color="#8b5a2b" />
      </mesh>
      <mesh position={[-3.7, 0.45, -2.2]}>
        <boxGeometry args={[1.1, 0.9, 1.1]} />
        <meshStandardMaterial color="#9a6e3a" />
      </mesh>

      <mesh
        ref={draggableRef}
        position={barrierMoved ? [-1.6, 0.35, -1.2] : [-2.9, 0.35, -1.2]}
        castShadow
        onPointerDown={(event) => {
          event.stopPropagation();
          draggingRef.current = true;
          dragStartRef.current = [event.point.x, event.point.z];
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          draggingRef.current = false;
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current || !draggableRef.current) return;
          event.stopPropagation();
          const nextX = Math.max(-3.1, Math.min(-0.7, event.point.x));
          draggableRef.current.position.x = nextX;
          draggableRef.current.position.z = -1.2;
          setBarrierInZone(nextX > -1.35 && nextX < -0.95);
          const start = dragStartRef.current;
          if (start && Math.abs(nextX - start[0]) > 0.8) {
            markInteraction('barrierMoved');
          }
        }}
      >
        <boxGeometry args={[1.4, 0.7, 0.5]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh position={[-1.12, 0.02, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.58, 24]} />
        <meshBasicMaterial color={barrierInZone ? '#4ade80' : '#facc15'} />
      </mesh>

      <group ref={npcRef} position={[-7, 1, -2]}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <capsuleGeometry args={[0.28, 0.85, 8, 16]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <mesh ref={headRef} position={[0, 1.65, 0]} castShadow>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color="#f2d3b1" />
        </mesh>
        <mesh ref={leftArmRef} position={[-0.33, 1.02, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.55, 6, 12]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh ref={rightArmRef} position={[0.33, 1.02, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.55, 6, 12]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh ref={leftLegRef} position={[-0.13, 0.33, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.62, 6, 12]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh ref={rightLegRef} position={[0.13, 0.33, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.62, 6, 12]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>
      <mesh ref={guardRef} position={[0, 0.45, 5.5]} castShadow>
        <capsuleGeometry args={[0.22, 0.55, 8, 16]} />
        <meshStandardMaterial color="#0ea5e9" />
      </mesh>

      <mesh position={[7.4, 0.8, 1.9]}>
        <boxGeometry args={[0.7, 0.25, 0.35]} />
        <meshStandardMaterial color="#1d4ed8" />
      </mesh>
      <mesh position={[6.8, 0.78, 2.1]}>
        <boxGeometry args={[0.5, 0.18, 0.35]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>

      {isPoliceArrival && (
        <>
          <mesh ref={policeBodyRef} position={[0, 0.7, 6]}>
            <boxGeometry args={[2.8, 1.2, 5]} />
            <meshStandardMaterial color="#334155" emissive="#1e3a8a" emissiveIntensity={0.25} />
          </mesh>
          <mesh ref={policeRedRef} position={[-0.4, 1.4, 6]}>
            <boxGeometry args={[0.35, 0.12, 0.35]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} />
          </mesh>
          <mesh ref={policeBlueRef} position={[0.4, 1.4, 6]}>
            <boxGeometry args={[0.35, 0.12, 0.35]} />
            <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.15} />
          </mesh>
        </>
      )}

      <Hotspot
        position={[-6.4, 1.8, -2]}
        label="Person"
        onClick={() => {
          markInteraction('trespasserChecked');
          setScreen('game');
        }}
      />
      <Hotspot
        position={[7.4, 1.3, 1.9]}
        label="Radio"
        onClick={() => {
          startPoliceEta();
          setScreen('game');
        }}
      />
      <Hotspot
        position={[6.8, 1.25, 2.1]}
        label="Notes"
        onClick={() => {
          openNotebook();
          setScreen('game');
        }}
      />
    </>
  );
}
