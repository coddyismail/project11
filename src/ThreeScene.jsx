// src/ThreeScene.jsx
import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sphere, OrbitControls } from "@react-three/drei";

function AnimatedSphere() {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    meshRef.current.rotation.y = clock.getElapsedTime() / 2;
    meshRef.current.rotation.x = clock.getElapsedTime() / 4;
  });

  return (
    <Sphere args={[2, 64, 64]} ref={meshRef} scale={1}>
      <MeshDistortMaterial
        color="#ff4d4d"
        attach="material"
        distort={0.4}
        speed={2}
        roughness={0.5}
      />
    </Sphere>
  );
}

export default function ThreeScene() {
  return (
    <Canvas
      style={{ position: "absolute", top: 0, left: 0 }}
      camera={{ position: [0, 0, 7], fov: 60 }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <AnimatedSphere />
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}
