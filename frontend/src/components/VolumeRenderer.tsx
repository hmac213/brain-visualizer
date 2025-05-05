import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

// --- Interfaces ---
interface MeshData {
    vertices: number[][];
    faces: number[][];
}

interface VolumeData {
    dims: [number, number, number];
    rawData: number[];
    affine: number[][];
    originalRange: [number, number];
}

// --- Shaders (Unchanged) ---
const volumeVertexShader = `
out vec3 vOrigin;
out vec3 vDirection;

void main() {
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    vOrigin = ( inverse( modelMatrix ) * vec4( cameraPosition, 1.0 ) ).xyz;
    vDirection = position - vOrigin;
    gl_Position = projectionMatrix * mvPosition;
}
`;

const volumeFragmentShader = `
in vec3 vOrigin;
in vec3 vDirection;

uniform vec3 u_volume_dims;
uniform sampler3D u_volume_tex;
uniform sampler2D u_cm_texture;
uniform float u_threshold;
uniform float u_steps;
// uniform float u_opacity_factor; // No longer needed with new transfer fn

vec4 apply_colormap(float val) {
    return texture2D(u_cm_texture, vec2(val, 0.5));
}

vec2 intersect_box(vec3 orig, vec3 dir) {
    vec3 box_min = vec3(-0.5);
    vec3 box_max = vec3(0.5);
    vec3 inv_dir = 1.0 / dir;
    vec3 tmin_tmp = (box_min - orig) * inv_dir;
    vec3 tmax_tmp = (box_max - orig) * inv_dir;
    vec3 tmin = min(tmin_tmp, tmax_tmp);
    vec3 tmax = max(tmin_tmp, tmax_tmp);
    float t0 = max(tmin.x, max(tmin.y, tmin.z));
    float t1 = min(tmax.x, min(tmax.y, tmax.z));
    return vec2(t0, t1);
}

void main() {
    vec3 rayDir = normalize(vDirection);
    vec2 t_hit = intersect_box(vOrigin, rayDir);

    if (t_hit.x >= t_hit.y || t_hit.y < 0.0) discard;

    t_hit.x = max(t_hit.x, 0.0);

    vec3 dt_vec = 1.0 / (u_steps * abs(rayDir));
    float dt = min(dt_vec.x, min(dt_vec.y, dt_vec.z));
    vec3 p = vOrigin + t_hit.x * rayDir;

    vec4 accumulated_color = vec4(0.0);

    for (float t = t_hit.x; t < t_hit.y; t += dt) {
        vec3 tex_coord = p + 0.5;
        float value = texture(u_volume_tex, tex_coord).r;

        if (value > u_threshold) {
            vec4 color_sample = apply_colormap(value);
            float opacity = color_sample.a;

            accumulated_color.rgb += (1.0 - accumulated_color.a) * color_sample.rgb * opacity;
            accumulated_color.a += (1.0 - accumulated_color.a) * opacity;

            if (accumulated_color.a >= 0.95) break;
        }
        p += rayDir * dt;
    }

    gl_FragColor = accumulated_color;
    if ( gl_FragColor.a < 0.01 ) discard;
}
`;

// --- Loader Component (Unchanged) ---
function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress.toFixed(0)} % loaded</Html>;
}

// --- Combined Viewer Component (Handles both Mesh and Volume) ---
// Consider renaming the file to BrainViewerCombined.tsx
export default function VolumeRenderer() { // Keep name for now, rename file later if desired
  const glassMeshRef = useRef<THREE.Mesh>(null!);
  const volumeMeshRef = useRef<THREE.Mesh>(null!);

  const [meshData, setMeshData] = useState<MeshData | null>(null);
  const [volumeData, setVolumeData] = useState<VolumeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch both mesh and volume data
  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${baseURL}/api/glass_brain/mesh_data`).then(response => {
          if (!response.ok) return response.json().then(err => { throw new Error(err.error || `Mesh HTTP error! status: ${response.status}`) }).catch(() => { throw new Error(`Mesh HTTP error! status: ${response.status} ${response.statusText}`) });
          return response.json();
      }),
      fetch(`${baseURL}/api/glass_brain/volume/raw`).then(response => {
          if (!response.ok) return response.json().then(err => { throw new Error(err.error || `Volume HTTP error! status: ${response.status}`) }).catch(() => { throw new Error(`Volume HTTP error! status: ${response.status} ${response.statusText}`) });
          return response.json();
      })
    ])
    .then(([meshResult, volumeResult]: [MeshData, VolumeData]) => {
        // Validate Mesh Data
        if (!meshResult.vertices || !meshResult.faces) {
            throw new Error("Mesh data received from server is incomplete");
        }
        setMeshData(meshResult);

        // Validate Volume Data
        if (!volumeResult.dims || !volumeResult.rawData || !volumeResult.affine || !volumeResult.originalRange) {
            throw new Error("Volume data received from server is incomplete");
        }
        if (volumeResult.rawData.length !== volumeResult.dims[0] * volumeResult.dims[1] * volumeResult.dims[2]) {
            throw new Error(`Volume data size mismatch`);
        }
        setVolumeData(volumeResult);

        console.log("Mesh & Volume Data Loaded");
        setError(null);
    })
    .catch(error => {
      console.error('Error fetching combined data:', error);
      setError(`Failed to load data: ${error.message}`);
      setMeshData(null);
      setVolumeData(null);
    })
    .finally(() => {
       setLoading(false);
    });
  }, []);

  // --- Prepare Volume Textures and Uniforms (Memoized) ---
  const uniforms = useMemo(() => {
      if (!volumeData) return null;
      const { dims, rawData } = volumeData;

      // 1. Volume Texture (Normalized 0-1 Data)
      const texture = new THREE.Data3DTexture(new Float32Array(rawData), dims[0], dims[1], dims[2]);
      texture.format = THREE.RedFormat;
      texture.type = THREE.FloatType;
      texture.minFilter = texture.magFilter = THREE.LinearFilter;
      texture.unpackAlignment = 1;
      texture.needsUpdate = true;

      // 2. Colormap Texture: **Hotspot Focused**
      const cmWidth = 256;
      const cmData = new Uint8Array(cmWidth * 4);
      const hotspotThreshold = 0.9; // Only show top 5% intensity
      const hotspotColor = new THREE.Color("#ffcc00"); // Yellow/Orange for hotspot

      for (let i = 0; i < cmWidth; i++) {
          const intensity = i / (cmWidth - 1);
          let r = 0, g = 0, b = 0, a = 0; // Default: transparent black

          if (intensity >= hotspotThreshold) {
              // Simple ramp from transparent yellow to opaque red for top values?
              // Or just constant color/opacity for simplicity first
              r = hotspotColor.r * 255;
              g = hotspotColor.g * 255;
              b = hotspotColor.b * 255;
              a = 150; // Make hotspots semi-opaque (adjust 0-255)
          }

          cmData[i * 4 + 0] = r;
          cmData[i * 4 + 1] = g;
          cmData[i * 4 + 2] = b;
          cmData[i * 4 + 3] = a;
      }
      const colormapTexture = new THREE.DataTexture(cmData, cmWidth, 1, THREE.RGBAFormat);
      colormapTexture.needsUpdate = true;

      // 3. Shader Uniforms
      return {
          u_volume_dims: { value: new THREE.Vector3(dims[0], dims[1], dims[2]) },
          u_volume_tex: { value: texture },
          u_cm_texture: { value: colormapTexture },
          u_threshold: { value: hotspotThreshold - 0.01 }, // Start accumulating slightly below hotspot threshold
          u_steps: { value: 100.0 }, // Reduce steps slightly for performance maybe
          // u_opacity_factor: { value: 1.0 }, // Not needed
      };

  }, [volumeData]);

  // --- Prepare Mesh Geometry (Memoized) ---
  const glassBrainGeometry = useMemo(() => {
      if (!meshData) return null;
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array(meshData.vertices.flat());
      const faces = new Uint32Array(meshData.faces.flat());
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(faces, 1));
      geometry.computeVertexNormals();
      return geometry;
  }, [meshData]);

  // --- Calculate Volume Box Scale ---
  const volumeBoxScale = useMemo(() => {
    if (!volumeData) return [1, 1, 1];
    const { dims } = volumeData;
    const maxDim = Math.max(...dims);
    // Scale dimensions relative to the largest dimension
    return [dims[0] / maxDim, dims[1] / maxDim, dims[2] / maxDim];
  }, [volumeData]);

  // --- Apply Affine Transformation to Volume Box ---
  useEffect(() => {
    if (volumeData && volumeMeshRef.current) {
        const { dims, affine } = volumeData;

        // Convert nested array affine to THREE.Matrix4
        const mat = new THREE.Matrix4();
        mat.fromArray(affine.flat());

        // --- Get Voxel Size from Affine ---
        const voxelSize = new THREE.Vector3();
        // Extract scaling factors (voxel sizes) from the matrix columns
        voxelSize.setFromMatrixColumn(mat, 0); // X scale
        const scaleX = voxelSize.length();
        voxelSize.setFromMatrixColumn(mat, 1); // Y scale
        const scaleY = voxelSize.length();
        voxelSize.setFromMatrixColumn(mat, 2); // Z scale
        const scaleZ = voxelSize.length();
        console.log("Voxel Sizes:", { scaleX, scaleY, scaleZ });

        // --- Center the volume at the world origin ---
        volumeMeshRef.current.position.set(0, 0, 0);
        volumeMeshRef.current.quaternion.identity(); // Reset rotation

        // --- Scale the unit box to the physical volume size ---
        volumeMeshRef.current.scale.set(
            scaleX * dims[0],
            scaleY * dims[1],
            scaleZ * dims[2]
        );

        console.log("Applied Simple Transform:", {
            position: volumeMeshRef.current.position,
            scale: volumeMeshRef.current.scale
        });

    }
  }, [volumeData]); // Re-run when volumeData is loaded

  if (loading) {
      return <Loader />;
  }

  if (error) {
    return <Html center><div style={{ color: 'red', backgroundColor: 'white', padding: '10px', borderRadius: '5px' }}>{error}</div></Html>;
  }

  if (!glassBrainGeometry || !volumeData || !uniforms) {
    return null; // Data not ready
  }

  // --- Render Both --- 
  return (
    <>
      {/* 1. Glass Brain Shell */}
      <mesh ref={glassMeshRef} geometry={glassBrainGeometry}>
        <meshStandardMaterial
          color="#f0f0f0" // Light gray
          transparent={true}
          opacity={0.15} // Make it quite transparent
          depthWrite={false}
          side={THREE.DoubleSide}
         />
      </mesh>

      {/* 2. Internal Heatmap Volume */}
      <mesh ref={volumeMeshRef}> 
        <boxGeometry args={[1, 1, 1]} /> {/* Render volume in unit box, transform the MESH */} 
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={volumeVertexShader}
          fragmentShader={volumeFragmentShader}
          side={THREE.BackSide}
          transparent={true}
          depthWrite={false}
        />
      </mesh>
    </>
  );
} 