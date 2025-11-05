import { useRef, useEffect, useMemo, useState } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
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

// Helper function to convert hex to Three.js Color
const hexToColor = (hex: string) => new Color(hex);

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

export function InstancedSphereParticles({
    defaultMode = "spheres",
}: {
    defaultMode?: "triangles" | "spheres";
}) {
    const meshRef = useRef<InstancedMesh>(null);
    const particlesRef = useRef<ParticleData[]>([]);
    const dummy = useMemo(() => new Object3D(), []);
    const { gl } = useThree();
    
    // Simple mouse tracking for model rotation
    const [isMouseOnScreen, setIsMouseOnScreen] = useState(true);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    
    // Smooth rotation interpolation
    const currentRotation = useRef({ x: 0, y: 0 });
    const targetRotation = useRef({ x: 0, y: 0 });

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
        value: 72,
        step: 4,
        min: 4,
        max: 128,
    };

    // Animation mode controls
    controlsConfig.animationMode = {
        value: "sine_wave",
        options: {
            "Sine Wave (Current)": "sine_wave",
            "Noise Drift": "noise_drift", 
            "Spiral/Vortex": "spiral_vortex",
            "Wave Propagation": "wave_propagation"
        },
        label: 'Animation Mode'
    };
    controlsConfig.animationIntensity = {
        value: 0.02,
        step: 0.001,
        min: 0.0,
        max: 0.1,
        label: 'Animation Intensity'
    };
    controlsConfig.animationFrequency = {
        value: 1.0,
        step: 0.1,
        min: 0.1,
        max: 5.0,
        label: 'Animation Frequency'
    };

    // Mouse rotation controls (simplified)
    controlsConfig.mouseRotationEnabled = { 
        value: true,
        label: 'Mouse Rotation'
    };
    controlsConfig.rotationSensitivity = {
        value: 0.2,
        step: 0.1,
        min: 0.0,
        max: 2.0,
        label: 'Rotation Sensitivity'
    };
    controlsConfig.rotationEasing = {
        value: 0.08,
        step: 0.01,
        min: 0.02,
        max: 0.3,
        label: 'Rotation Easing Speed'
    };

    // Chroma effects controls
    controlsConfig.chromaEnabled = {
        value: true,
        label: "Chroma Effects",
    };
    controlsConfig.chromaIntensity = {
        value: 2.0,
        step: 0.1,
        min: 0.0,
        max: 2.0,
        label: "Chroma Intensity",
    };
    controlsConfig.chromaSeparation = {
        value: 0.01,
        step: 0.001,
        min: 0.0,
        max: 0.01,
        label: "Chroma Separation",
    };
    controlsConfig.chromaStartPhase = {
        value: 0.7,
        step: 0.05,
        min: 0.5,
        max: 0.9,
        label: "Chroma Start Phase",
    };
    controlsConfig.chromaColor1 = {
        value: "#e900ff",
        label: "Chroma Color 1",
    };
    controlsConfig.chromaColor2 = {
        value: "#00ffec",
        label: "Chroma Color 2",
    };
    controlsConfig.chromaColor3 = {
        value: "#ffffff",
        label: "Chroma Color 3",
    };
    controlsConfig.chromaBlendMode = {
        value: "additive",
        options: {
            "Additive": "additive",
            "Multiply": "multiply",
            "Screen": "screen",
            "Overlay": "overlay",
        },
        label: "Chroma Blend Mode",
    };

    // Background color control
    controlsConfig.backgroundColor = { 
        value: '#101010',
        label: 'Background Color'
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
        surfaceSampling,
        animationMode,
        animationIntensity,
        animationFrequency,
        mouseRotationEnabled,
        rotationSensitivity,
        rotationEasing,
        chromaEnabled,
        chromaIntensity,
        chromaSeparation,
        chromaStartPhase,
        chromaColor1,
        chromaColor2,
        chromaColor3,
        chromaBlendMode,
        backgroundColor,
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


            // Adaptive sampling based on triangle size and user controls
            const area = normal.length();
            const adjustedAreaMultiplier =
                PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.AREA_MULTIPLIER *
                particleDensity;
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
        geometry.setAttribute(
            "positionFlip",
            new Float32BufferAttribute(positionArray.slice(), 3)
        );

        return geometry;
    }, []);

    // Create triangle geometry for instancing (simplified approach)
    const triangleGeometry = useMemo(() => {
        const geometry = new BufferGeometry();

        // Triangle angles (following The Spirit's pattern)
        const PI = Math.PI;
        const angle = (PI * 2) / 3;
        const angles = [
            Math.sin(angle * 2 + PI),
            Math.cos(angle * 2 + PI),
            Math.sin(angle + PI),
            Math.cos(angle + PI),
            Math.sin(angle * 3 + PI),
            Math.cos(angle * 3 + PI),
            Math.sin(angle * 2),
            Math.cos(angle * 2),
            Math.sin(angle),
            Math.cos(angle),
            Math.sin(angle * 3),
            Math.cos(angle * 3),
        ];

        // Single triangle geometry that will be instanced
        const vertices = new Float32Array([
            angles[0],
            angles[1],
            0, // vertex 1
            angles[2],
            angles[3],
            0, // vertex 2
            angles[4],
            angles[5],
            0, // vertex 3
        ]);

        const verticesFlip = new Float32Array([
            angles[6],
            angles[7],
            0, // vertex 1 flipped
            angles[8],
            angles[9],
            0, // vertex 2 flipped
            angles[10],
            angles[11],
            0, // vertex 3 flipped
        ]);

        const uvs = new Float32Array([
            0.5,
            1.0, // top
            0.0,
            0.0, // bottom left
            1.0,
            0.0, // bottom right
        ]);

        const normals = new Float32Array([
            0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
        ]);

        geometry.setAttribute(
            "position",
            new Float32BufferAttribute(vertices, 3)
        );
        geometry.setAttribute(
            "positionFlip",
            new Float32BufferAttribute(verticesFlip, 3)
        );
        geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
        geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));

        return geometry;
    }, []);

    // Choose geometry based on default mode
    const currentGeometry =
        defaultMode === "triangles" ? triangleGeometry : sphereGeometry;

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

                // Chroma effect uniforms
                uChromaEnabled: { value: chromaEnabled },
                uChromaIntensity: { value: chromaIntensity },
                uChromaSeparation: { value: chromaSeparation },
                uChromaStartPhase: { value: chromaStartPhase },
                uChromaColor1: { value: hexToColor(chromaColor1) },
                uChromaColor2: { value: hexToColor(chromaColor2) },
                uChromaColor3: { value: hexToColor(chromaColor3) },
                uChromaBlendMode: { value: chromaBlendMode === "additive" ? 0 : chromaBlendMode === "multiply" ? 1 : chromaBlendMode === "screen" ? 2 : 3 },
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

                // Chroma effect uniforms
                uChromaEnabled: { value: chromaEnabled },
                uChromaIntensity: { value: chromaIntensity },
                uChromaSeparation: { value: chromaSeparation },
                uChromaStartPhase: { value: chromaStartPhase },
                uChromaColor1: { value: hexToColor(chromaColor1) },
                uChromaColor2: { value: hexToColor(chromaColor2) },
                uChromaColor3: { value: hexToColor(chromaColor3) },
                uChromaBlendMode: { value: chromaBlendMode === "additive" ? 0 : chromaBlendMode === "multiply" ? 1 : chromaBlendMode === "screen" ? 2 : 3 },
            },
            vertexShader,
            fragmentShader,
            transparent: true,
        });
    }, [texture, particleScale, animationSpeed, brightness, ambientLight]);

    // Choose material based on default mode
    const currentMaterial =
        defaultMode === "triangles"
            ? triangleShaderMaterial
            : sphereShaderMaterial;

    // Get the actual particle count from extracted data
    const actualParticleCount = extractedData?.count || 0;

    // Add particle count display (read-only)
    useControls(
        "Particle Info",
        {
            particleCount: {
                value: actualParticleCount,
                disabled: true,
            },
        },
        [actualParticleCount]
    );

    // Update background color
    useEffect(() => {
        gl.setClearColor(backgroundColor);
    }, [backgroundColor, gl]);

    // Simple mouse tracking for model rotation
    useEffect(() => {
        if (!mouseRotationEnabled) return;

        const handleMouseMove = (event: MouseEvent) => {
            // Normalize mouse position to -1 to 1 range
            const x = (event.clientX / window.innerWidth) * 2 - 1; // -1 (left) to 1 (right)
            const y = (event.clientY / window.innerHeight) * 2 - 1; // -1 (top) to 1 (bottom)
            
            // Update target rotation
            targetRotation.current = {
                x: (y * 0.25 + 0.05) * rotationSensitivity, // -0.2 to 0.3
                y: (x * 0.3) * rotationSensitivity // -0.3 to 0.3
            };
            
            setMousePosition({ x, y });
            setIsMouseOnScreen(true);
        };

        const handleMouseLeave = () => {
            setIsMouseOnScreen(false);
            // Set target to center when mouse leaves window
            targetRotation.current = { x: 0, y: 0 };
        };

        const handleMouseEnter = () => {
            setIsMouseOnScreen(true);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('mouseenter', handleMouseEnter);
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('mouseenter', handleMouseEnter);
        };
    }, [mouseRotationEnabled, rotationSensitivity]);

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

        // Simple smooth rotation easing toward target
        if (mouseRotationEnabled) {
            // Always ease toward the current target (mouse position or center)
            currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * rotationEasing;
            currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * rotationEasing;
        }

        // Update shader uniforms
        currentMaterial.uniforms.uTime.value = time;
        currentMaterial.uniforms.uParticleScale.value = particleScale;
        currentMaterial.uniforms.uAnimationSpeed.value = animationSpeed;
        currentMaterial.uniforms.uBrightness.value = brightness;
        currentMaterial.uniforms.uAmbientLight.value = ambientLight;

        // Update chroma effect uniforms
        currentMaterial.uniforms.uChromaEnabled.value = chromaEnabled;
        currentMaterial.uniforms.uChromaIntensity.value = chromaIntensity;
        currentMaterial.uniforms.uChromaSeparation.value = chromaSeparation;
        currentMaterial.uniforms.uChromaStartPhase.value = chromaStartPhase;
        currentMaterial.uniforms.uChromaColor1.value = hexToColor(chromaColor1);
        currentMaterial.uniforms.uChromaColor2.value = hexToColor(chromaColor2);
        currentMaterial.uniforms.uChromaColor3.value = hexToColor(chromaColor3);
        currentMaterial.uniforms.uChromaBlendMode.value = chromaBlendMode === "additive" ? 0 : chromaBlendMode === "multiply" ? 1 : chromaBlendMode === "screen" ? 2 : 3;

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

            // Apply selected animation mode
            let animationOffset = new Vector3(0, 0, 0);
            
            switch (animationMode) {
                case "sine_wave":
                    // Current method: simple sine wave on Y axis
                    animationOffset.y = Math.sin(time + i * 0.1) * animationIntensity;
                    break;
                    
                case "noise_drift":
                    // Organic drift using simple noise-like functions
                    const noiseX = Math.sin(time * animationFrequency + i * 0.3) * Math.cos(time * 0.7 + i * 0.1);
                    const noiseY = Math.cos(time * animationFrequency * 0.8 + i * 0.5) * Math.sin(time * 0.9 + i * 0.2);
                    const noiseZ = Math.sin(time * animationFrequency * 1.2 + i * 0.7) * Math.cos(time * 0.6 + i * 0.4);
                    animationOffset.set(
                        noiseX * animationIntensity,
                        noiseY * animationIntensity,
                        noiseZ * animationIntensity * 0.5
                    );
                    break;
                    
                case "spiral_vortex":
                    // Spiral motion around original position
                    const spiralTime = time * animationFrequency + i * 0.5;
                    const spiralRadius = animationIntensity * (0.5 + Math.sin(time * 0.3 + i * 0.1) * 0.3);
                    animationOffset.set(
                        Math.cos(spiralTime) * spiralRadius,
                        Math.sin(spiralTime * 0.7) * spiralRadius * 0.5,
                        Math.sin(spiralTime) * spiralRadius
                    );
                    break;
                    
                case "wave_propagation":
                    // Waves traveling across the face surface
                    const waveSpeed = time * animationFrequency;
                    const particlePos = particle.position;
                    
                    // Create waves based on distance from center
                    const distanceFromCenter = Math.sqrt(particlePos.x * particlePos.x + particlePos.y * particlePos.y);
                    const wave1 = Math.sin(waveSpeed - distanceFromCenter * 5.0) * animationIntensity;
                    
                    // Add perpendicular wave
                    const wave2 = Math.cos(waveSpeed * 0.7 + particlePos.x * 3.0) * animationIntensity * 0.7;
                    
                    animationOffset.set(
                        wave2 * 0.5,
                        wave1,
                        (wave1 + wave2) * 0.3
                    );
                    break;
            }
            
            dummy.position.add(animationOffset);

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

    // Calculate final rotation combining Leva controls and smooth mouse rotation
    const finalRotation = mouseRotationEnabled ? [
        rotation[0] + currentRotation.current.x,
        rotation[1] + currentRotation.current.y,
        rotation[2] // Z rotation stays unchanged
    ] : rotation;

    return (
        <instancedMesh
            ref={meshRef}
            args={[currentGeometry, currentMaterial, actualParticleCount]}
            position={position}
            rotation={finalRotation}
        />
    );
}
