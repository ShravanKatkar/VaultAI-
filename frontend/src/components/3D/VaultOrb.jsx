import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function OrbMesh({ isHovered }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);

  useFrame(() => {
    const speedMultiplier = isHovered ? 2.67 : 1.0; // 0.003 * 2.67 ≈ 0.008
    if (outerRef.current) {
      outerRef.current.rotation.x += 0.003 * speedMultiplier;
      outerRef.current.rotation.y += 0.003 * speedMultiplier;
    }
    if (innerRef.current) {
      innerRef.current.rotation.x -= 0.002 * speedMultiplier;
      innerRef.current.rotation.y -= 0.002 * speedMultiplier;
    }
  });

  return (
    <group>
      {/* Outer wireframe mesh */}
      <mesh ref={outerRef}>
        <icosahedronGeometry args={[2, 1]} />
        <meshStandardMaterial 
          wireframe 
          color="#7C3AED" 
          transparent 
          opacity={0.6}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Second inner mesh: same geometry at scale 0.85, solid material */}
      <mesh ref={innerRef} scale={0.85}>
        <icosahedronGeometry args={[2, 1]} />
        <meshStandardMaterial 
          color="#1E1B4B" 
          emissive="#7C3AED" 
          emissiveIntensity={isHovered ? 1.5 : 0.4}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>
    </group>
  );
}

export const VaultOrb = ({ size = 300 }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        position: 'relative', 
        cursor: 'pointer' 
      }}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.25} />
        
        {/* PointLight at (3,3,3) purple color */}
        <pointLight 
          position={[3, 3, 3]} 
          color="#7C3AED" 
          intensity={8.0} 
          distance={12} 
          decay={1.8} 
        />
        
        {/* PointLight at (-3,-2,3) teal color */}
        <pointLight 
          position={[-3, -2, 3]} 
          color="#0D9488" 
          intensity={6.0} 
          distance={12} 
          decay={1.8} 
        />
        
        <OrbMesh isHovered={isHovered} />
      </Canvas>
    </div>
  );
};

export default VaultOrb;
