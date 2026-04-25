import { Canvas } from '@react-three/fiber';
import { ConstructionSiteScene } from './ConstructionSiteScene';
import { CameraRig } from './CameraRig';

export function GuardSimScene() {
  return (
    <div className="scene-shell">
      <Canvas shadows camera={{ position: [0, 2, 8], fov: 60 }}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[7, 10, 4]} intensity={1.1} castShadow />
        <pointLight position={[0, 5, -1]} intensity={0.35} color="#60a5fa" />
        <CameraRig />
        <ConstructionSiteScene />
      </Canvas>
    </div>
  );
}
