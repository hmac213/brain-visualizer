'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import VolumeRenderer from './VolumeRenderer';

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress ? `${progress.toFixed(0)} % loaded` : 'Loading...'}</Html>;
}

interface MeshData {
    vertices: number[][];
    faces: number[][];
}

interface GlassBrainViewerProps {
    refreshTrigger?: number;
}

interface BrainMeshProps {
    geometry: THREE.BufferGeometry;
    position: THREE.Vector3;
}

const BrainMesh = React.forwardRef<THREE.Mesh, BrainMeshProps>(({ geometry, position }, ref) => {
    return (
        <mesh 
            ref={ref}
            geometry={geometry}
            position={position}
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
});
BrainMesh.displayName = 'BrainMesh';

export default function GlassBrainViewer({ refreshTrigger = 0 }: GlassBrainViewerProps) {
    const brainMeshRef = useRef<THREE.Mesh>(null!);
    const [meshData, setMeshData] = useState<MeshData | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch brain mesh data
    useEffect(() => {
        fetch('/api/glass_brain/brain_surface')
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setMeshData(data);
            }).catch(e => {
                console.error("Fetch error:", e);
                setError(e.message);
            });
    }, [refreshTrigger]);

    const brainGeometry = useMemo(() => {
        if (!meshData) return null;
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(meshData.vertices.flat(), 3));
        geom.setIndex(meshData.faces.flat());
        geom.computeVertexNormals();
        return geom;
    }, [meshData]);

    // After the geometry is created, calculate its intrinsic (un-rotated) bounding box
    const brainBounds = useMemo(() => {
        if (!brainGeometry) return null;
        brainGeometry.computeBoundingBox();
        const box = brainGeometry.boundingBox!;
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        return { center, size };
    }, [brainGeometry]);

    if (error) {
        return <div style={{ color: 'red', padding: '20px' }}>Error: {error}</div>;
    }

  return (
    <Canvas
      camera={{ position: [0, 0, 250], fov: 50, up: [0, 1, 0] }}
      style={{ background: '#e0e0e0', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[100, 100, 100]} intensity={1} />
      <React.Suspense fallback={<Loader />}>
          {brainGeometry && brainBounds && (
              <group rotation={[-Math.PI / 2, 0, 0]}>
                  <BrainMesh geometry={brainGeometry} position={brainBounds.center.clone().negate()} />
                  <VolumeRenderer brainSize={brainBounds.size} refreshTrigger={refreshTrigger} />
              </group>
          )}
          <OrbitControls
             enablePan={true}
             enableZoom={true}
             enableRotate={true}
           />
      </React.Suspense>
    </Canvas>
  );
} 