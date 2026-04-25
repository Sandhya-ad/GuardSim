import { Html } from '@react-three/drei';

interface HotspotProps {
  position: [number, number, number];
  label: string;
  onClick: () => void;
}

export function Hotspot({ position, label, onClick }: HotspotProps) {
  return (
    <group position={position}>
      <mesh onClick={onClick}>
        <sphereGeometry args={[0.22, 18, 18]} />
        <meshStandardMaterial color="#f97316" emissive="#7c2d12" />
      </mesh>
      <Html distanceFactor={12}>
        <button className="hotspot-label" onClick={onClick}>
          {label}
        </button>
      </Html>
    </group>
  );
}
