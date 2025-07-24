'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress ? `${progress.toFixed(0)} % loaded` : 'Loading...'}</Html>;
}

interface MeshData {
    vertices: number[][];
    faces: number[][];
}

function BrainMesh() {
    const meshRef = useRef<THREE.Mesh>(null!);
    const [meshData, setMeshData] = useState<MeshData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/glass_brain/brain_surface')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.error) throw new Error(data.error);
                setMeshData(data);
            })
            .catch(e => {
                console.error("Fetch error:", e);
                setError(e.message);
            });
    }, []);

    const geometry = useMemo(() => {
        if (!meshData) return null;
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(meshData.vertices.flat(), 3));
        geom.setIndex(meshData.faces.flat());
        geom.computeVertexNormals();
        return geom;
    }, [meshData]);

    if (error) {
        return <Html center><div style={{ color: 'red' }}>Error loading brain surface: {error}</div></Html>;
    }

    if (!geometry) {
        return <Loader />;
    }

    return (
        <mesh 
            ref={meshRef} 
            geometry={geometry}
            rotation={[-Math.PI / 2, 0, 0]}
        >
            <meshStandardMaterial
                color="#f0f0f0"
                transparent={true}
                opacity={0.2}
                depthWrite={false}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

export default function GlassBrainViewer() {
  return (
    <Canvas
      camera={{ position: [0, 0, 250], fov: 50, up: [0, 1, 0] }}
      style={{ background: '#000', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[100, 100, 100]} intensity={1} />
      <React.Suspense fallback={<Loader />}>
          <BrainMesh />
          <OrbitControls
             enablePan={true}
             enableZoom={true}
             enableRotate={true}
           />
      </React.Suspense>
    </Canvas>
  );
} 