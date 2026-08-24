import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Hook to check for system reduced-motion preference
function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return reducedMotion;
}

// 3D Rotating DNA Helix Component
function DNAHelix() {
  const groupRef = useRef<THREE.Group>(null);

  // Generate points for DNA strands
  const pointsCount = 40;
  const radius = 2.5;
  const verticalSpread = 0.25;

  const strand1: [number, number, number][] = [];
  const strand2: [number, number, number][] = [];

  for (let i = 0; i < pointsCount; i++) {
    const t = (i / pointsCount) * Math.PI * 4; // 2 full rotations
    const y = (i - pointsCount / 2) * verticalSpread;
    
    // Strand 1
    strand1.push([
      Math.sin(t) * radius,
      y,
      Math.cos(t) * radius
    ]);

    // Strand 2 (180 deg offset)
    strand2.push([
      Math.sin(t + Math.PI) * radius,
      y,
      Math.cos(t + Math.PI) * radius
    ]);
  }

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.2;
      groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Strand 1 points */}
      {strand1.map((pos, idx) => (
        <mesh key={`s1-${idx}`} position={pos}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#06b6d4" />
        </mesh>
      ))}

      {/* Strand 2 points */}
      {strand2.map((pos, idx) => (
        <mesh key={`s2-${idx}`} position={pos}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
      ))}

      {/* Connecting rungs */}
      {strand1.map((pos, idx) => {
        if (idx % 2 === 0) {
          const pos2 = strand2[idx];
          const midPoint = [
            (pos[0] + pos2[0]) / 2,
            (pos[1] + pos2[1]) / 2,
            (pos[2] + pos2[2]) / 2,
          ];
          const distance = radius * 2;
          
          return (
            <mesh key={`rung-${idx}`} position={midPoint as [number, number, number]}>
              <boxGeometry args={[distance, 0.02, 0.02]} />
              <meshBasicMaterial 
                color="#6366f1" 
                transparent 
                opacity={0.3} 
              />
            </mesh>
          );
        }
        return null;
      })}
    </group>
  );
}

// 3D Floating Particles Component
function FloatingParticles() {
  const ref = useRef<THREE.Points>(null);
  
  // Create random points
  const points = new Float32Array(300);
  for (let i = 0; i < points.length; i += 3) {
    points[i] = (Math.random() - 0.5) * 15; // X
    points[i + 1] = (Math.random() - 0.5) * 15; // Y
    points[i + 2] = (Math.random() - 0.5) * 15; // Z
  }

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 0.03;
      ref.current.rotation.x = Math.cos(state.clock.getElapsedTime() * 0.02) * 0.1;
    }
  });

  return (
    <Points ref={ref} positions={points} stride={3}>
      <PointMaterial
        transparent
        color="#818cf8"
        size={0.06}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.4}
      />
    </Points>
  );
}

export default function ThreeBackground() {
  const isReducedMotion = useReducedMotion();

  // If system requests reduced motion, fall back to simple background
  if (isReducedMotion) {
    return (
      <div className="absolute inset-0 z-0 bg-slate-950 bg-gradient-to-tr from-slate-950 via-indigo-950/20 to-teal-950/20" />
    );
  }

  return (
    <div className="absolute inset-0 z-0 h-full w-full overflow-hidden bg-slate-950">
      {/* Background radial gradient overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0)_0%,rgba(2,6,23,0.85)_80%)] z-[1] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/10 via-slate-950 to-teal-950/10 z-[1] pointer-events-none" />

      <Canvas camera={{ position: [0, 0, 7], fov: 60 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <DNAHelix />
        <FloatingParticles />
      </Canvas>
    </div>
  );
}
