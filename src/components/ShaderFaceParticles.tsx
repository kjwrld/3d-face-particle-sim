import { useRef, useEffect, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getDracoLoader } from "../utils/loaders";
import { useControls } from "leva";
import {
    ShaderMaterial,
    BufferGeometry,
    BufferAttribute,
    Points,
    Vector3,
    Texture,
} from "three";

// Import shaders
import vertexShader from "../shaders/faceParticles.vert?raw";
import fragmentShader from "../shaders/faceParticles.frag?raw";

// Constants for particle generation
const PARTICLE_GENERATION = {
    DEFAULT_POINT_SIZE: 5.0,
    SURFACE_SAMPLES_PER_TRIANGLE: 64,
    MIN_SURFACE_SAMPLES: 32,
    AREA_MULTIPLIER: 1000,
    EDGE_SAMPLES_PER_EDGE: 5,
    EDGE_INTERPOLATION_DIVISOR: 6,
    BACK_FACE_CULLING_THRESHOLD: -0.3,
    FALLBACK_UV: { u: 0.5, v: 0.5 },
} as const;

export function ShaderFaceParticles() {
    const pointsRef = useRef<Points>(null);

    // Leva controls for position and rotation
    const { position, rotation } = useControls("Model Transform", {
        position: {
            value: [0, 0, 0],
            step: 0.1,
            min: -5,
            max: 5,
        },
        rotation: {
            value: [0.2, 0, 0],
            step: 0.1,
            min: -Math.PI,
            max: Math.PI,
        },
    });

    // Load the GLTF model
    const gltf = useLoader(GLTFLoader, "/models/kj_face.glb", (loader) => {
        loader.setDRACOLoader(getDracoLoader());
    });

    // Extract geometry and texture
    const { geometry, texture } = useMemo(() => {
        if (!gltf) return { geometry: null, texture: null };

        let faceGeometry: BufferGeometry | null = null;
        let faceTexture: Texture | null = null;

        gltf.scene.traverse((child: any) => {
            if (child.isMesh && child.geometry) {
                faceGeometry = child.geometry;
                faceTexture = child.material?.map || null;
            }
        });

        return { geometry: faceGeometry, texture: faceTexture };
    }, [gltf]);

    // Create shader material
    const shaderMaterial = useMemo(() => {
        if (!texture) return null;

        return new ShaderMaterial({
            uniforms: {
                uTexture: { value: texture },
                uPointSize: { value: PARTICLE_GENERATION.DEFAULT_POINT_SIZE },
            },
            vertexShader,
            fragmentShader,
        });
    }, [texture]);

    // Create enhanced geometry with more particles
    const enhancedGeometry = useMemo(() => {
        if (!geometry) return null;

        const positions = geometry.attributes.position.array;
        const uvs = geometry.attributes.uv?.array;

        if (!uvs) return geometry; // Fallback to original if no UVs

        // Create arrays for enhanced particle distribution
        const enhancedPositions: number[] = [];
        const enhancedUVs: number[] = [];

        // Add all original vertices
        for (let i = 0; i < positions.length; i += 3) {
            enhancedPositions.push(
                positions[i],
                positions[i + 1],
                positions[i + 2]
            );
            const uvIndex = (i / 3) * 2;
            enhancedUVs.push(uvs[uvIndex], uvs[uvIndex + 1]);
        }

        // Add interpolated surface points for higher density
        for (let i = 0; i < positions.length - 9; i += 9) {
            // Triangle vertices
            const v1 = new Vector3(
                positions[i],
                positions[i + 1],
                positions[i + 2]
            );
            const v2 = new Vector3(
                positions[i + 3],
                positions[i + 4],
                positions[i + 5]
            );
            const v3 = new Vector3(
                positions[i + 6],
                positions[i + 7],
                positions[i + 8]
            );

            // UV coordinates
            const uv1Index = (i / 3) * 2;
            const uv2Index = ((i + 3) / 3) * 2;
            const uv3Index = ((i + 6) / 3) * 2;

            // Check if triangle is front-facing (simple optimization)
            const normal = new Vector3()
                .crossVectors(v2.clone().sub(v1), v3.clone().sub(v1))
                .normalize();

            // Skip back-facing triangles (z < 0)
            if (normal.z < PARTICLE_GENERATION.BACK_FACE_CULLING_THRESHOLD)
                continue;

            // Adaptive sampling based on triangle size
            const area = normal.length();
            const sampleCount = Math.min(
                PARTICLE_GENERATION.SURFACE_SAMPLES_PER_TRIANGLE,
                Math.max(
                    PARTICLE_GENERATION.MIN_SURFACE_SAMPLES,
                    Math.floor(area * PARTICLE_GENERATION.AREA_MULTIPLIER)
                )
            );

            for (let j = 0; j < sampleCount; j++) {
                const r1 = Math.random();
                const r2 = Math.random();

                // Barycentric coordinates
                const a = 1 - Math.sqrt(r1);
                const b = Math.sqrt(r1) * (1 - r2);
                const c = Math.sqrt(r1) * r2;

                // Interpolated position
                const pos = new Vector3()
                    .copy(v1)
                    .multiplyScalar(a)
                    .add(v2.clone().multiplyScalar(b))
                    .add(v3.clone().multiplyScalar(c));

                enhancedPositions.push(pos.x, pos.y, pos.z);

                // Interpolated UV
                if (uv3Index + 1 < uvs.length) {
                    const u =
                        a * uvs[uv1Index] +
                        b * uvs[uv2Index] +
                        c * uvs[uv3Index];
                    const v =
                        a * uvs[uv1Index + 1] +
                        b * uvs[uv2Index + 1] +
                        c * uvs[uv3Index + 1];
                    enhancedUVs.push(u, v);
                } else {
                    enhancedUVs.push(
                        PARTICLE_GENERATION.FALLBACK_UV.u,
                        PARTICLE_GENERATION.FALLBACK_UV.v
                    ); // Fallback UV
                }
            }

            // Add edge sampling for even MORE particles
            for (let i = 0; i < positions.length - 6; i += 6) {
                const v1 = new Vector3(
                    positions[i],
                    positions[i + 1],
                    positions[i + 2]
                );
                const v2 = new Vector3(
                    positions[i + 3],
                    positions[i + 4],
                    positions[i + 5]
                );

                const uv1Index = (i / 3) * 2;
                const uv2Index = ((i + 3) / 3) * 2;

                // Sample points along each edge
                for (
                    let k = 0;
                    k < PARTICLE_GENERATION.EDGE_SAMPLES_PER_EDGE;
                    k++
                ) {
                    const t =
                        (k + 1) /
                        PARTICLE_GENERATION.EDGE_INTERPOLATION_DIVISOR; // Interpolation factor

                    // Interpolated position
                    const edgePos = new Vector3().lerpVectors(v1, v2, t);
                    enhancedPositions.push(edgePos.x, edgePos.y, edgePos.z);

                    // Interpolated UV
                    if (uv2Index + 1 < uvs.length) {
                        const u = (1 - t) * uvs[uv1Index] + t * uvs[uv2Index];
                        const v =
                            (1 - t) * uvs[uv1Index + 1] + t * uvs[uv2Index + 1];
                        enhancedUVs.push(u, v);
                    } else {
                        enhancedUVs.push(
                            PARTICLE_GENERATION.FALLBACK_UV.u,
                            PARTICLE_GENERATION.FALLBACK_UV.v
                        );
                    }
                }
            }
        }

        // Create new geometry
        const newGeometry = new BufferGeometry();
        newGeometry.setAttribute(
            "position",
            new BufferAttribute(new Float32Array(enhancedPositions), 3)
        );
        newGeometry.setAttribute(
            "uv",
            new BufferAttribute(new Float32Array(enhancedUVs), 2)
        );

        console.log(
            `Enhanced geometry: ${enhancedPositions.length / 3} particles`
        );

        return newGeometry;
    }, [geometry]);

    if (!enhancedGeometry || !shaderMaterial) {
        return (
            <mesh>
                <sphereGeometry args={[0.5, 8, 8]} />
                <meshStandardMaterial color="gray" wireframe />
            </mesh>
        );
    }

    return (
        <points
            ref={pointsRef}
            geometry={enhancedGeometry}
            material={shaderMaterial}
            position={position}
            rotation={rotation}
        />
    );
}
