import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface MeshData {
    vertices: number[][];
    faces: number[][];
}

function BrainMesh() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [meshData, setMeshData] = useState<MeshData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${baseURL}/api/glass_brain/mesh_data`)
      .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || `HTTP error! status: ${response.status}`) });
        }
        return response.json();
       })
      .then((data: MeshData) => {
        if (!data.vertices || !data.faces) {
            throw new Error("Mesh data is incomplete");
        }
        setMeshData(data);
        setError(null); // Clear previous errors
      })
      .catch(error => {
        console.error('Error fetching mesh data:', error);
        setError(`Failed to load brain mesh: ${error.message}`);
      });
  }, []);

  if (error) {
    // Display error message in the canvas
    return <Html center><div style={{ color: 'red', backgroundColor: 'white', padding: '10px', borderRadius: '5px' }}>{error}</div></Html>;
  }

  if (!meshData) {
    return null; // Or a loading indicator
  }

  // Create geometry from fetched data
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array(meshData.vertices.flat());
  const faces = new Uint32Array(meshData.faces.flat());

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(faces, 1));
  geometry.computeVertexNormals(); // Compute normals for lighting

  return (
    <mesh ref={meshRef} geometry={geometry}>
       {/* Transparent material for "glass" effect */}
      <meshStandardMaterial
        color="#add8e6" // Light blueish color
        transparent={true}
        opacity={0.3}
        side={THREE.DoubleSide} // Render both sides
        depthWrite={false} // Important for transparency sorting
       />
    </mesh>
  );
}

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress.toFixed(0)} % loaded</Html>;
}

export default function GlassBrainViewer() {
  return (
    <Canvas
      camera={{ position: [0, 0, 250], fov: 50 }} // Adjust camera position as needed based on mesh scale
      style={{ background: '#f0f0f0', width: '100%', height: '100%' }} // Set background color
    >
      <React.Suspense fallback={<Loader />}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />
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