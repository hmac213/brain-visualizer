import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import VolumeRenderer from './VolumeRenderer'; // Import the new component

// Remove the baseURL since we're using the proxy
// const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress ? `${progress.toFixed(0)} % loaded` : 'Loading...'}</Html>;
}

export default function GlassBrainViewer() {
  return (
    <Canvas
      camera={{ position: [0, 0, 1.5], fov: 50, up: [0, 0, 1] }} // Set Z as up vector
      style={{ background: '#fff', width: '100%', height: '100%' }} // Dark background often better for volume
    >
      <React.Suspense fallback={<Loader />}>
          <VolumeRenderer /> {/* Use the VolumeRenderer component */}
          <OrbitControls
             enablePan={true}
             enableZoom={true}
             enableRotate={true}
           />
      </React.Suspense>
    </Canvas>
  );
} 