import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../state/gameStore';
import { cameraNodes } from '../utils/cameraNodes';

export function CameraRig() {
  const { camera } = useThree();
  const currentCameraNode = useGameStore((s) => s.currentCameraNode);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const node = cameraNodes[currentCameraNode];
    if (!node) return;
    const targetPosition = new THREE.Vector3(...node.position);
    lookTarget.set(...node.lookAt);
    camera.position.lerp(targetPosition, 0.05);
    camera.lookAt(lookTarget);
  });

  return null;
}
