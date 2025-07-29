'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

// Vertex shader for the volume's bounding box
const volumeVertexShader = `
    varying vec3 vOrigin;
    varying vec3 vDirection;

    void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vOrigin = vec3(inverse(modelMatrix) * vec4(cameraPosition, 1.0));
        vDirection = position - vOrigin;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

// Fragment shader for the volume rendering (ray casting)
const volumeFragmentShader = `
    varying vec3 vOrigin;
    varying vec3 vDirection;

    uniform vec3 u_volume_dims;
    uniform sampler3D u_volume_tex;
    uniform sampler2D u_cm_texture;
    uniform float u_threshold;
    uniform float u_steps;

    // Helper function to apply a colormap to a scalar value
    vec4 apply_colormap(float val) {
        return texture2D(u_cm_texture, vec2(val, 0.5));
    }

    // Intersects a ray with a box, returning entry and exit points
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

        if (t_hit.x >= t_hit.y) discard;

        t_hit.x = max(t_hit.x, 0.0);

        vec4 accumulated_color = vec4(0.0);
        float accumulated_alpha = 0.0;

        vec3 dt_vec = 1.0 / (u_steps * abs(rayDir));
        float dt = min(dt_vec.x, min(dt_vec.y, dt_vec.z));
        vec3 p = vOrigin + t_hit.x * rayDir;

        for (float t = t_hit.x; t < t_hit.y; t += dt) {
            vec3 tex_coord = p + 0.5;
            float value = texture(u_volume_tex, tex_coord).r;

            if (value > u_threshold) {
                vec4 color_sample = apply_colormap(value);
                
                // Increase opacity for better visibility
                float opacity = color_sample.a * 20.0 / u_steps; 
                accumulated_color.rgb += (1.0 - accumulated_color.a) * color_sample.rgb * opacity;
                accumulated_color.a += (1.0 - accumulated_color.a) * opacity;

                if (accumulated_color.a >= 0.95) break;
            }
            p += rayDir * dt;
        }

        gl_FragColor = accumulated_color;
        if (gl_FragColor.a < 0.0001) discard;
    }
`;

interface VolumeData {
    dims: [number, number, number];
    rawData: number[];
    affine: number[][];
}

interface VolumeRendererProps {
    brainSize: THREE.Vector3;
}

export default function VolumeRenderer({ brainSize }: VolumeRendererProps) {
    const [volumeData, setVolumeData] = useState<VolumeData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/glass_brain/volume_data').then(res => res.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            setVolumeData(data);
        }).catch(e => {
            console.error("Fetch error:", e);
            setError(e.message);
        });
    }, []);

    const { texture, colormap, uniforms } = useMemo(() => {
        if (!volumeData) return { texture: null, colormap: null, uniforms: null };
        const { dims, rawData } = volumeData;
        const tex = new THREE.Data3DTexture(new Float32Array(rawData), dims[0], dims[1], dims[2]);
        tex.format = THREE.RedFormat;
        tex.type = THREE.FloatType;
        tex.minFilter = tex.magFilter = THREE.LinearFilter;
        tex.unpackAlignment = 1;
        tex.needsUpdate = true;
        
        const cmWidth = 256;
        const cmData = new Uint8Array(cmWidth * 4);
        const color = new THREE.Color();
        for (let i = 0; i < cmWidth; i++) {
            const t = i / (cmWidth - 1);
            color.setHSL(0.7 - t * 0.7, 1.0, 0.5);
            cmData[i * 4 + 0] = color.r * 255;
            cmData[i * 4 + 1] = color.g * 255;
            cmData[i * 4 + 2] = color.b * 255;
            // Lower alpha threshold to make more data visible
            cmData[i * 4 + 3] = t > 0.02 ? 255 : 0; 
        }
        const cmap = new THREE.DataTexture(cmData, cmWidth, 1, THREE.RGBAFormat);
        cmap.needsUpdate = true;

        const uni = {
            u_volume_dims: { value: new THREE.Vector3(...dims) },
            u_volume_tex: { value: tex },
            u_cm_texture: { value: cmap },
            u_threshold: { value: 0.01 }, // Lower threshold to match colormap
            u_steps: { value: 100.0 },
        };
        
        return { texture: tex, colormap: cmap, uniforms: uni };
    }, [volumeData]);
    
    if (error) {
        return <Html center><div style={{ color: 'red' }}>Error loading data: {error}</div></Html>;
    }
    
    if (!uniforms || !volumeData) {
        return null;
    }

    return (
        <mesh scale={brainSize}>
            <boxGeometry args={[1, 1, 1]} />
            <shaderMaterial
                uniforms={uniforms}
                vertexShader={volumeVertexShader}
                fragmentShader={volumeFragmentShader}
                side={THREE.BackSide}
                transparent
            />
        </mesh>
    );
} 