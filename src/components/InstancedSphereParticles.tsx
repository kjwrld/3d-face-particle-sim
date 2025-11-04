import { useRef, useEffect, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getDracoLoader } from "../utils/loaders";
import { useControls } from "leva";
import {
    ShaderMaterial,
    BufferGeometry,
    InstancedMesh,
    InstancedBufferAttribute,
    SphereGeometry,
    Vector3,
    Texture,
    Matrix4,
    Object3D,
} from "three";

// Import shaders
import vertexShader from "../shaders/instancedParticles.vert?raw";
import fragmentShader from "../shaders/instancedParticles.frag?raw";

// Import our foundation
import { PARTICLE_SYSTEM_CONFIG } from "../config/particleConstants";
import { 
    ParticleCountCalculator, 
    DeviceDetection, 
    ParticleLifecycleUtils,
    ParticleDataGenerator 
} from "../utils/particleUtils";
import type { ParticleData } from "../types/particleTypes";

export function InstancedSphereParticles() {
    const meshRef = useRef<InstancedMesh>(null);
    const particlesRef = useRef<ParticleData[]>([]);
    const dummy = useMemo(() => new Object3D(), []);

    // Leva controls for model transform and particle properties
    const { position, rotation, particleScale, animationSpeed } = useControls("Instanced Particles", {
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
        particleScale: {
            value: PARTICLE_SYSTEM_CONFIG.RENDERING.SCALE.BASE,
            step: 0.001,
            min: 0.005,
            max: 0.1,
        },
        animationSpeed: {
            value: 1.0,
            step: 0.1,
            min: 0.0,
            max: 3.0,
        },
    });

    // Load the GLTF model
    const gltf = useLoader(GLTFLoader, "/models/kj_face.glb", (loader) => {
        loader.setDRACOLoader(getDracoLoader());
    });

    // We'll calculate the actual particle count after we extract face data
    // This prevents buffer size mismatches

    // Extract geometry and texture from GLTF
    const { geometry, texture, extractedData } = useMemo(() => {
        if (!gltf) return { geometry: null, texture: null, extractedData: null };

        let faceGeometry: BufferGeometry | null = null;
        let faceTexture: Texture | null = null;

        gltf.scene.traverse((child: any) => {
            if (child.isMesh && child.geometry) {
                faceGeometry = child.geometry;
                faceTexture = child.material?.map || null;
            }
        });

        if (!faceGeometry) {
            return { geometry: null, texture: null, extractedData: null };
        }

        // Extract positions and UVs for particle generation
        const positions = faceGeometry.attributes.position.array;
        const uvs = faceGeometry.attributes.uv?.array;

        if (!uvs) {
            return { geometry: faceGeometry, texture: faceTexture, extractedData: null };
        }

        // Generate particle data from face geometry
        const particlePositions: Vector3[] = [];
        const particleUVs: { u: number; v: number }[] = [];

        // Add all original vertices
        for (let i = 0; i < positions.length; i += 3) {
            particlePositions.push(new Vector3(
                positions[i],
                positions[i + 1],
                positions[i + 2]
            ));
            
            const uvIndex = (i / 3) * 2;
            particleUVs.push({
                u: uvs[uvIndex],
                v: uvs[uvIndex + 1]
            });
        }

        // Add surface sampling for higher density
        for (let i = 0; i < positions.length - 9; i += 9) {
            // Triangle vertices
            const v1 = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
            const v2 = new Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
            const v3 = new Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);

            // UV coordinates
            const uv1Index = (i / 3) * 2;
            const uv2Index = ((i + 3) / 3) * 2;
            const uv3Index = ((i + 6) / 3) * 2;

            // Check if triangle is front-facing
            const normal = new Vector3()
                .crossVectors(v2.clone().sub(v1), v3.clone().sub(v1))
                .normalize();

            if (normal.z < PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.BACK_FACE_CULLING_THRESHOLD) continue;

            // Adaptive sampling based on triangle size
            const area = normal.length();
            const sampleCount = Math.min(
                PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.SAMPLES_PER_TRIANGLE,
                Math.max(PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.MIN_SAMPLES, Math.floor(area * PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.AREA_MULTIPLIER))
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
                    .copy(v1).multiplyScalar(a)
                    .add(v2.clone().multiplyScalar(b))
                    .add(v3.clone().multiplyScalar(c));

                particlePositions.push(pos);

                // Interpolated UV
                if (uv3Index + 1 < uvs.length) {
                    const u = a * uvs[uv1Index] + b * uvs[uv2Index] + c * uvs[uv3Index];
                    const v = a * uvs[uv1Index + 1] + b * uvs[uv2Index + 1] + c * uvs[uv3Index + 1];
                    particleUVs.push({ u, v });
                } else {
                    particleUVs.push({ 
                        u: PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.FALLBACK_UV.u, 
                        v: PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.FALLBACK_UV.v 
                    });
                }
            }
        }

        // Use the actual number of particles we generated
        console.log(`Generated ${particlePositions.length} particles from face geometry`);

        return { 
            geometry: faceGeometry, 
            texture: faceTexture, 
            extractedData: { 
                positions: particlePositions, 
                uvs: particleUVs,
                count: particlePositions.length
            }
        };
    }, [gltf]);

    // Create sphere geometry for instancing
    const sphereGeometry = useMemo(() => {
        const { WIDTH, HEIGHT } = PARTICLE_SYSTEM_CONFIG.RENDERING.SPHERE_SEGMENTS;
        return new SphereGeometry(1, WIDTH, HEIGHT);
    }, []);

    // Create shader material
    const shaderMaterial = useMemo(() => {
        if (!texture) return null;

        return new ShaderMaterial({
            uniforms: {
                uTexture: { value: texture },
                uTime: { value: 0 },
                uParticleScale: { value: particleScale },
                uAnimationSpeed: { value: animationSpeed },
            },
            vertexShader,
            fragmentShader,
            transparent: true,
        });
    }, [texture, particleScale, animationSpeed]);

    // Get the actual particle count from extracted data
    const actualParticleCount = extractedData?.count || 0;
    
    console.log('InstancedSphereParticles render:', {
        hasExtractedData: !!extractedData,
        actualParticleCount,
        hasTexture: !!texture,
        hasShaderMaterial: !!shaderMaterial
    });

    // Initialize particles
    useEffect(() => {
        if (!extractedData || !meshRef.current || actualParticleCount === 0) return;

        const { positions, uvs } = extractedData;
        const emissiveIndices = ParticleCountCalculator.getEmissiveParticleIndices(positions.length);

        // Generate initial particle data
        const particles = ParticleDataGenerator.generateInitialParticleData(positions, emissiveIndices);
        particlesRef.current = particles;

        // Set up instanced attributes
        const instanceUVs = new Float32Array(particles.length * 2);
        const instanceLifeData = new Float32Array(particles.length * 4); // life, maxLife, isEmissive, scale

        particles.forEach((particle, i) => {
            // UV coordinates
            instanceUVs[i * 2] = uvs[i]?.u || PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.FALLBACK_UV.u;
            instanceUVs[i * 2 + 1] = uvs[i]?.v || PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.FALLBACK_UV.v;

            // Life data
            instanceLifeData[i * 4] = particle.life;
            instanceLifeData[i * 4 + 1] = particle.maxLife;
            instanceLifeData[i * 4 + 2] = particle.isEmissive ? 1.0 : 0.0;
            instanceLifeData[i * 4 + 3] = particle.scale;
        });

        // Add instanced attributes to geometry
        sphereGeometry.setAttribute('instanceUV', new InstancedBufferAttribute(instanceUVs, 2));
        sphereGeometry.setAttribute('instanceLifeData', new InstancedBufferAttribute(instanceLifeData, 4));

        console.log(`Instanced sphere particles created: ${particles.length} particles`);
    }, [extractedData, sphereGeometry, actualParticleCount]);

    // Animation loop
    useFrame((state) => {
        if (!meshRef.current || !shaderMaterial || particlesRef.current.length === 0) return;

        const time = state.clock.elapsedTime * animationSpeed;
        
        // Update shader uniforms
        shaderMaterial.uniforms.uTime.value = time;
        shaderMaterial.uniforms.uParticleScale.value = particleScale;
        shaderMaterial.uniforms.uAnimationSpeed.value = animationSpeed;

        // Update instance matrices and lifecycle
        particlesRef.current.forEach((particle, i) => {
            // Update particle life
            particle.life += 0.005 * animationSpeed;
            if (particle.life > 1.0) {
                particle.life = 0.0; // Respawn
            }

            // Calculate lifecycle state
            const lifecycle = ParticleLifecycleUtils.calculateLifecycleState(particle.life);
            
            // Calculate scale based on lifecycle and emissive status
            const baseScale = particleScale * lifecycle.scaleMultiplier;
            const finalScale = particle.isEmissive 
                ? baseScale * PARTICLE_SYSTEM_CONFIG.RENDERING.SCALE.EMISSIVE_MULTIPLIER
                : baseScale;

            // Set up transformation matrix
            dummy.position.copy(particle.position);
            dummy.scale.setScalar(finalScale);
            
            // Add slight animation offset based on particle life
            const animationOffset = Math.sin(time + i * 0.1) * 0.02;
            dummy.position.y += animationOffset;
            
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);

            // Update life data attribute
            const instanceLifeData = sphereGeometry.attributes.instanceLifeData as InstancedBufferAttribute;
            instanceLifeData.setXYZW(
                i,
                particle.life,
                particle.maxLife,
                particle.isEmissive ? 1.0 : 0.0,
                finalScale
            );
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (sphereGeometry.attributes.instanceLifeData) {
            (sphereGeometry.attributes.instanceLifeData as InstancedBufferAttribute).needsUpdate = true;
        }
    });

    if (!extractedData || !shaderMaterial || actualParticleCount === 0) {
        console.log('Rendering fallback sphere because:', {
            hasExtractedData: !!extractedData,
            hasShaderMaterial: !!shaderMaterial,
            actualParticleCount
        });
        return (
            <mesh position={position} rotation={rotation}>
                <sphereGeometry args={[0.5, 8, 8]} />
                <meshStandardMaterial color="red" />
            </mesh>
        );
    }

    return (
        <instancedMesh
            ref={meshRef}
            args={[sphereGeometry, shaderMaterial, actualParticleCount]}
            position={position}
            rotation={rotation}
        />
    );
}