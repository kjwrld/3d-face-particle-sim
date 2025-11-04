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
    Color,
    Float32BufferAttribute,
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
    ParticleDataGenerator,
} from "../utils/particleUtils";
import type { ParticleData } from "../types/particleTypes";

export function InstancedSphereParticles({ defaultMode = "spheres" }: { defaultMode?: "triangles" | "spheres" }) {
    const meshRef = useRef<InstancedMesh>(null);
    const particlesRef = useRef<ParticleData[]>([]);
    const dummy = useMemo(() => new Object3D(), []);

    // Leva controls for model transform and particle properties
    const controlsConfig: any = {
        position: {
            value: [0, 0, 0],
            step: 0.1,
            min: -5,
            max: 5,
        },
        rotation: {
            value: [0.15, 0, 0],
            step: 0.1,
            min: -Math.PI,
            max: Math.PI,
        },
        particleScale: {
            value: 0.014,
            step: 0.001,
            min: 0.005,
            max: 0.1,
        },
        animationSpeed: {
            value: 3.0,
            step: 0.1,
            min: 0.0,
            max: 3.0,
        },
    };

    // Add lighting controls for better visibility
    controlsConfig.brightness = {
        value: 2.1,
        step: 0.1,
        min: 0.5,
        max: 3.0,
    };
    controlsConfig.ambientLight = {
        value: 0.7,
        step: 0.05,
        min: 0.0,
        max: 1.0,
    };

    // Add particle density controls
    controlsConfig.particleDensity = {
        value: 3.0,
        step: 0.1,
        min: 0.1,
        max: 3.0,
    };
    controlsConfig.surfaceSampling = {
        value: 128,
        step: 4,
        min: 4,
        max: 128,
    };

    const controls = useControls("Particle System", controlsConfig);
    const { 
        position, 
        rotation, 
        particleScale, 
        animationSpeed, 
        brightness,
        ambientLight,
        particleDensity,
        surfaceSampling
    } = controls;

    // Load the GLTF model
    const gltf = useLoader(GLTFLoader, "/models/kj_face.glb", (loader) => {
        loader.setDRACOLoader(getDracoLoader());
    });

    // We'll calculate the actual particle count after we extract face data
    // This prevents buffer size mismatches

    // Extract geometry and texture from GLTF
    const { geometry, texture, extractedData } = useMemo(() => {
        if (!gltf)
            return { geometry: null, texture: null, extractedData: null };

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
            return {
                geometry: faceGeometry,
                texture: faceTexture,
                extractedData: null,
            };
        }

        // Generate particle data from face geometry
        const particlePositions: Vector3[] = [];
        const particleUVs: { u: number; v: number }[] = [];

        // Add all original vertices
        for (let i = 0; i < positions.length; i += 3) {
            particlePositions.push(
                new Vector3(positions[i], positions[i + 1], positions[i + 2])
            );

            const uvIndex = (i / 3) * 2;
            particleUVs.push({
                u: uvs[uvIndex],
                v: uvs[uvIndex + 1],
            });
        }

        // Add surface sampling for higher density
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

            // Check if triangle is front-facing
            const normal = new Vector3()
                .crossVectors(v2.clone().sub(v1), v3.clone().sub(v1))
                .normalize();

            if (
                normal.z <
                PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING
                    .BACK_FACE_CULLING_THRESHOLD
            )
                continue;

            // Adaptive sampling based on triangle size and user controls
            const area = normal.length();
            const adjustedAreaMultiplier = PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.AREA_MULTIPLIER * particleDensity;
            const sampleCount = Math.min(
                surfaceSampling,
                Math.max(
                    PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.MIN_SAMPLES,
                    Math.floor(area * adjustedAreaMultiplier)
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

                particlePositions.push(pos);

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
                    particleUVs.push({ u, v });
                } else {
                    particleUVs.push({
                        u: PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.FALLBACK_UV
                            .u,
                        v: PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.FALLBACK_UV
                            .v,
                    });
                }
            }
        }

        return {
            geometry: faceGeometry,
            texture: faceTexture,
            extractedData: {
                positions: particlePositions,
                uvs: particleUVs,
                count: particlePositions.length,
            },
        };
    }, [gltf, particleDensity, surfaceSampling]);

    // Create sphere geometry for instancing
    const sphereGeometry = useMemo(() => {
        const { WIDTH, HEIGHT } =
            PARTICLE_SYSTEM_CONFIG.RENDERING.SPHERE_SEGMENTS;
        const geometry = new SphereGeometry(1, WIDTH, HEIGHT);
        
        // Add a dummy positionFlip attribute to prevent shader crashes
        // This will be identical to position since spheres don't flip
        const positionArray = geometry.attributes.position.array;
        geometry.setAttribute('positionFlip', new Float32BufferAttribute(positionArray.slice(), 3));
        
        return geometry;
    }, []);

    // Create triangle geometry for instancing (simplified approach)
    const triangleGeometry = useMemo(() => {
        const geometry = new BufferGeometry();
        
        // Triangle angles (following The Spirit's pattern)
        const PI = Math.PI;
        const angle = PI * 2 / 3;
        const angles = [
            Math.sin(angle * 2 + PI), Math.cos(angle * 2 + PI),
            Math.sin(angle + PI), Math.cos(angle + PI), 
            Math.sin(angle * 3 + PI), Math.cos(angle * 3 + PI),
            Math.sin(angle * 2), Math.cos(angle * 2),
            Math.sin(angle), Math.cos(angle),
            Math.sin(angle * 3), Math.cos(angle * 3)
        ];
        
        // Single triangle geometry that will be instanced
        const vertices = new Float32Array([
            angles[0], angles[1], 0,  // vertex 1
            angles[2], angles[3], 0,  // vertex 2
            angles[4], angles[5], 0   // vertex 3
        ]);
        
        const verticesFlip = new Float32Array([
            angles[6], angles[7], 0,   // vertex 1 flipped
            angles[8], angles[9], 0,   // vertex 2 flipped
            angles[10], angles[11], 0  // vertex 3 flipped
        ]);
        
        const uvs = new Float32Array([
            0.5, 1.0,  // top
            0.0, 0.0,  // bottom left
            1.0, 0.0   // bottom right
        ]);
        
        const normals = new Float32Array([
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0
        ]);
        
        geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('positionFlip', new Float32BufferAttribute(verticesFlip, 3));
        geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
        geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
        
        return geometry;
    }, []);

    // Choose geometry based on default mode
    const currentGeometry = defaultMode === "triangles" ? triangleGeometry : sphereGeometry;

    // Create shader materials for both sphere and triangle modes
    const sphereShaderMaterial = useMemo(() => {
        if (!texture) return null;

        return new ShaderMaterial({
            uniforms: {
                // Basic uniforms
                uTexture: { value: texture },
                uTime: { value: 0 },
                uParticleScale: { value: particleScale },
                uAnimationSpeed: { value: animationSpeed },
                
                // Triangle uniforms (unused but needed for shader compatibility)
                uFlipRatio: { value: 0.0 },
                uUseTriangles: { value: false },
                
                // Lighting uniforms
                uBrightness: { value: brightness },
                uAmbientLight: { value: ambientLight },
            },
            vertexShader,
            fragmentShader,
            transparent: true,
        });
    }, [texture, particleScale, animationSpeed]);

    const triangleShaderMaterial = useMemo(() => {
        if (!texture) return null;

        return new ShaderMaterial({
            uniforms: {
                // Basic uniforms
                uTexture: { value: texture },
                uTime: { value: 0 },
                uParticleScale: { value: particleScale },
                uAnimationSpeed: { value: animationSpeed },
                
                // Triangle uniforms  
                uFlipRatio: { value: 0.0 },
                uUseTriangles: { value: true },
                
                // Lighting uniforms
                uBrightness: { value: brightness },
                uAmbientLight: { value: ambientLight },
            },
            vertexShader,
            fragmentShader,
            transparent: true,
        });
    }, [texture, particleScale, animationSpeed, brightness, ambientLight]);

    // Choose material based on default mode
    const currentMaterial = defaultMode === "triangles" ? triangleShaderMaterial : sphereShaderMaterial;

    // Get the actual particle count from extracted data
    const actualParticleCount = extractedData?.count || 0;

    // Add particle count display (read-only)
    useControls("Particle Info", {
        particleCount: {
            value: actualParticleCount,
            disabled: true,
        },
    }, [actualParticleCount]);

    // Initialize particles
    useEffect(() => {
        if (!extractedData || !meshRef.current || actualParticleCount === 0)
            return;

        const { positions, uvs } = extractedData;
        const emissiveIndices =
            ParticleCountCalculator.getEmissiveParticleIndices(
                positions.length
            );

        // Generate initial particle data
        const particles = ParticleDataGenerator.generateInitialParticleData(
            positions,
            emissiveIndices
        );
        particlesRef.current = particles;

        // Set up instanced attributes
        const instanceUVs = new Float32Array(particles.length * 2);
        const instanceLifeData = new Float32Array(particles.length * 4); // life, maxLife, isEmissive, scale

        particles.forEach((particle, i) => {
            // UV coordinates
            instanceUVs[i * 2] =
                uvs[i]?.u ||
                PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.FALLBACK_UV.u;
            instanceUVs[i * 2 + 1] =
                uvs[i]?.v ||
                PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.FALLBACK_UV.v;

            // Life data
            instanceLifeData[i * 4] = particle.life;
            instanceLifeData[i * 4 + 1] = particle.maxLife;
            instanceLifeData[i * 4 + 2] = particle.isEmissive ? 1.0 : 0.0;
            instanceLifeData[i * 4 + 3] = particle.scale;
        });

        // Add instanced attributes to current geometry
        currentGeometry.setAttribute(
            "instanceUV",
            new InstancedBufferAttribute(instanceUVs, 2)
        );
        currentGeometry.setAttribute(
            "instanceLifeData",
            new InstancedBufferAttribute(instanceLifeData, 4)
        );
    }, [extractedData, currentGeometry, actualParticleCount]);

    // Animation loop
    useFrame((state) => {
        if (
            !meshRef.current ||
            !currentMaterial ||
            particlesRef.current.length === 0
        )
            return;

        const time = state.clock.elapsedTime * animationSpeed;

        // Update shader uniforms
        currentMaterial.uniforms.uTime.value = time;
        currentMaterial.uniforms.uParticleScale.value = particleScale;
        currentMaterial.uniforms.uAnimationSpeed.value = animationSpeed;
        currentMaterial.uniforms.uBrightness.value = brightness;
        currentMaterial.uniforms.uAmbientLight.value = ambientLight;
        
        // Simple triangle flipping for triangle mode (no complex controls)
        if (defaultMode === "triangles" && triangleShaderMaterial) {
            // Simple rapid flip animation
            const flipRatio = Math.floor(time * 60) % 2;
            triangleShaderMaterial.uniforms.uFlipRatio.value = flipRatio;
        }

        // Update instance matrices and lifecycle
        particlesRef.current.forEach((particle, i) => {
            // Update particle life
            particle.life += 0.005 * animationSpeed;
            if (particle.life > 1.0) {
                particle.life = 0.0; // Respawn
            }

            // Calculate lifecycle state
            const lifecycle = ParticleLifecycleUtils.calculateLifecycleState(
                particle.life
            );

            // Calculate scale based on lifecycle and emissive status
            const baseScale = particleScale * lifecycle.scaleMultiplier;
            const finalScale = particle.isEmissive
                ? baseScale *
                  PARTICLE_SYSTEM_CONFIG.RENDERING.SCALE.EMISSIVE_MULTIPLIER
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
            const instanceLifeData = currentGeometry.attributes
                .instanceLifeData as InstancedBufferAttribute;
            instanceLifeData.setXYZW(
                i,
                particle.life,
                particle.maxLife,
                particle.isEmissive ? 1.0 : 0.0,
                finalScale
            );
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (currentGeometry.attributes.instanceLifeData) {
            (
                currentGeometry.attributes
                    .instanceLifeData as InstancedBufferAttribute
            ).needsUpdate = true;
        }
    });

    if (!extractedData || !currentMaterial || actualParticleCount === 0) {
        return null;
    }

    return (
        <instancedMesh
            ref={meshRef}
            args={[currentGeometry, currentMaterial, actualParticleCount]}
            position={position}
            rotation={rotation}
        />
    );
}
