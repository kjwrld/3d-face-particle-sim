import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getDracoLoader } from '../utils/loaders';
import * as THREE from 'three';
import { MeshExtractor, type MeshExtractionResult } from '../utils/meshExtractor';
import { BVH_CONFIG } from '../constants/bvhConfig';
import { PARTICLE_SYSTEM_CONFIG } from '../constants/particleSystemConfig';

// Import unified shaders
import unifiedVertexShader from '../shaders/unifiedTransition.vert?raw';
import unifiedFragmentShader from '../shaders/unifiedTransition.frag?raw';

/**
 * Animation configuration for the unified transition
 */
const TRANSITION_CONFIG = {
    /** Total duration of the entire transition in seconds */
    TOTAL_DURATION: 8.0,
    
    /** Wireframe reveal duration */
    WIREFRAME_REVEAL_DURATION: 2.0,
    
    /** Hold wireframe visible duration */
    WIREFRAME_HOLD_DURATION: 1.5,
    
    /** Wireframe disappear duration (overlaps with particle appear) */
    WIREFRAME_DISAPPEAR_DURATION: 2.5,
    
    /** Particle appear duration (starts during wireframe disappear) */
    PARTICLE_APPEAR_DURATION: 3.0,
    
    /** Size of fade zone relative to model height */
    FADE_ZONE: 0.15,
    
    /** Whether to loop the animation */
    LOOP: true,
    
    /** Delay before loop restart in seconds */
    LOOP_DELAY: 1.0,
    
    /** Animation easing function type */
    EASING: 'easeInOutCubic' as const,
} as const;

/**
 * Props for unified wireframe to particle transition
 */
export interface UnifiedWireframeToParticleTransitionProps {
    /** Position of the mesh */
    position?: [number, number, number];
    
    /** Rotation of the mesh */
    rotation?: [number, number, number];
    
    /** Scale of the mesh */
    scale?: [number, number, number];
    
    /** Wireframe color */
    wireframeColor?: string;
    
    /** Material opacity */
    opacity?: number;
    
    /** Whether to auto-start animation */
    autoStart?: boolean;
    
    /** Whether animation should loop */
    loop?: boolean;
    
    /** Callback when animation completes */
    onAnimationComplete?: () => void;
    
    /** Whether to cast shadows */
    castShadow?: boolean;
    
    /** Whether to receive shadows */
    receiveShadow?: boolean;
    
    /** Visibility */
    visible?: boolean;
}

/**
 * Easing functions for smooth animation
 */
const easingFunctions = {
    linear: (t: number) => t,
    easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

/**
 * Unified wireframe to particle transition component
 * Uses shared shader system for seamless transitions
 */
export function UnifiedWireframeToParticleTransition({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    wireframeColor = '#ffffff',
    opacity = 0.8,
    autoStart = true,
    loop = TRANSITION_CONFIG.LOOP,
    onAnimationComplete,
    castShadow = false,
    receiveShadow = false,
    visible = true,
}: UnifiedWireframeToParticleTransitionProps) {
    const wireframeMeshRef = useRef<THREE.Mesh>(null);
    const particleMeshRef = useRef<THREE.InstancedMesh>(null);
    const wireframeMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const particleMaterialRef = useRef<THREE.ShaderMaterial>(null);
    
    // Animation state
    const [isAnimating, setIsAnimating] = useState(autoStart);
    const [animationStartTime, setAnimationStartTime] = useState<number | null>(null);
    const [currentPhase, setCurrentPhase] = useState<'wireframe_reveal' | 'wireframe_hold' | 'transition' | 'particles_only'>('wireframe_reveal');
    
    // Model data state
    const [extractionResult, setExtractionResult] = useState<MeshExtractionResult | null>(null);
    const [particleData, setParticleData] = useState<{
        positions: THREE.Vector3[];
        uvs: { u: number; v: number }[];
        count: number;
    } | null>(null);

    // Load the GLTF model
    const gltf = useLoader(GLTFLoader, `${import.meta.env.BASE_URL}models/kj_face.glb`, (loader) => {
        loader.setDRACOLoader(getDracoLoader());
    });

    // Extract mesh and generate particle data
    useEffect(() => {
        if (!gltf) return;

        const extractMesh = async () => {
            try {
                // Extract wireframe mesh
                const result = MeshExtractor.extractLargestMesh(gltf.scene, {
                    preserveOriginal: true,
                    bvhOptions: {
                        maxLeafTris: BVH_CONFIG.TREE.MAX_LEAF_TRIANGLES,
                        splitStrategy: BVH_CONFIG.TREE.SPLIT_STRATEGY,
                    },
                });

                if (result) {
                    setExtractionResult(result);
                }

                // Extract particle data
                let faceGeometry: THREE.BufferGeometry | null = null;
                gltf.scene.traverse((child: any) => {
                    if (child.isMesh && child.geometry) {
                        faceGeometry = child.geometry;
                    }
                });

                if (faceGeometry) {
                    // @ts-expect-error - Complex geometry type narrowing
                    const positions = faceGeometry.attributes.position.array;
                    // @ts-expect-error - Complex geometry type narrowing
                    const uvs = faceGeometry.attributes.uv?.array;

                    if (uvs) {
                        const particlePositions: THREE.Vector3[] = [];
                        const particleUVs: { u: number; v: number }[] = [];

                        // Add all original vertices
                        for (let i = 0; i < positions.length; i += 3) {
                            particlePositions.push(
                                new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2])
                            );

                            const uvIndex = (i / 3) * 2;
                            particleUVs.push({
                                u: uvs[uvIndex],
                                v: uvs[uvIndex + 1],
                            });
                        }

                        // Add surface sampling
                        for (let i = 0; i < positions.length - 9; i += 9) {
                            const v1 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
                            const v2 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
                            const v3 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);

                            const uv1Index = (i / 3) * 2;
                            const uv2Index = ((i + 3) / 3) * 2;
                            const uv3Index = ((i + 6) / 3) * 2;

                            const normal = new THREE.Vector3()
                                .crossVectors(v2.clone().sub(v1), v3.clone().sub(v1))
                                .normalize();

                            const area = normal.length();
                            const sampleCount = Math.min(
                                PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.MAX_SAMPLES,
                                Math.max(
                                    PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.MIN_SAMPLES,
                                    Math.floor(area * PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.AREA_MULTIPLIER)
                                )
                            );

                            for (let j = 0; j < sampleCount; j++) {
                                const r1 = Math.random();
                                const r2 = Math.random();

                                const a = 1 - Math.sqrt(r1);
                                const b = Math.sqrt(r1) * (1 - r2);
                                const c = Math.sqrt(r1) * r2;

                                const pos = new THREE.Vector3()
                                    .copy(v1)
                                    .multiplyScalar(a)
                                    .add(v2.clone().multiplyScalar(b))
                                    .add(v3.clone().multiplyScalar(c));

                                particlePositions.push(pos);

                                if (uv3Index + 1 < uvs.length) {
                                    const u = a * uvs[uv1Index] + b * uvs[uv2Index] + c * uvs[uv3Index];
                                    const v = a * uvs[uv1Index + 1] + b * uvs[uv2Index + 1] + c * uvs[uv3Index + 1];
                                    particleUVs.push({ u, v });
                                } else {
                                    particleUVs.push({
                                        u: PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.FALLBACK_UV.u,
                                        v: PARTICLE_SYSTEM_CONFIG.SURFACE_SAMPLING.FALLBACK_UV.v,
                                    });
                                }
                            }
                        }

                        setParticleData({
                            positions: particlePositions,
                            uvs: particleUVs,
                            count: particlePositions.length,
                        });
                    }
                }
            } catch (error) {
                console.error('Unified transition extraction failed:', error);
            }
        };

        extractMesh();
    }, [gltf]);

    // Calculate model bounds for reveal animation
    const modelBounds = useMemo(() => {
        if (!extractionResult) return { height: 2, bottom: -1, top: 1 };
        
        const geometry = extractionResult.geometry;
        geometry.computeBoundingBox();
        const box = geometry.boundingBox!;
        
        return {
            height: box.max.y - box.min.y,
            bottom: box.min.y,
            top: box.max.y,
        };
    }, [extractionResult]);

    // Get texture from GLTF
    const faceTexture = useMemo(() => {
        if (!gltf) return null;
        
        let texture: THREE.Texture | null = null;
        gltf.scene.traverse((child: any) => {
            if (child.isMesh && child.material?.map) {
                texture = child.material.map;
            }
        });
        
        return texture;
    }, [gltf]);

    // Create wireframe shader material
    const wireframeMaterial = useMemo(() => {
        if (!faceTexture) return null;

        return new THREE.ShaderMaterial({
            uniforms: {
                // Transition uniforms
                uTransitionProgress: { value: 0.0 },
                uRevealHeight: { value: 0.0 },
                uFadeZone: { value: TRANSITION_CONFIG.FADE_ZONE },
                uModelHeight: { value: modelBounds.top },
                uModelBottom: { value: modelBounds.bottom },
                uIsDisappearing: { value: false },
                uIsInstancedParticles: { value: false },
                uParticleRevealOffset: { value: 0.3 },

                // Wireframe uniforms
                uTexture: { value: faceTexture },
                uColor: { value: new THREE.Color(wireframeColor) },
                uOpacity: { value: opacity },
                uWireframe: { value: true },
                uLineWidth: { value: 1.0 },
                uEnableGlow: { value: true },
                uGlowIntensity: { value: 0.3 },
                uGlowColor: { value: new THREE.Color('#ffffff') },
                uEnableEdgeHighlight: { value: true },
                uEdgeHighlightIntensity: { value: 0.2 },

                // Animation uniforms
                uTime: { value: 0.0 },
                uParticleScale: { value: PARTICLE_SYSTEM_CONFIG.particleScale },
                uAnimationSpeed: { value: PARTICLE_SYSTEM_CONFIG.animationSpeed },
                uFlipRatio: { value: 0.0 },
                uUseTriangles: { value: false },

                // Particle uniforms (unused for wireframe)
                uBrightness: { value: PARTICLE_SYSTEM_CONFIG.brightness },
                uAmbientLight: { value: PARTICLE_SYSTEM_CONFIG.ambientLight },
                uChromaEnabled: { value: false },
                uChromaIntensity: { value: 0.0 },
                uChromaSeparation: { value: 0.0 },
                uChromaStartPhase: { value: 0.0 },
                uChromaColor1: { value: new THREE.Color('#ff0000') },
                uChromaColor2: { value: new THREE.Color('#00ff00') },
                uChromaColor3: { value: new THREE.Color('#0000ff') },
                uChromaBlendMode: { value: 0 },
            },
            vertexShader: unifiedVertexShader,
            fragmentShader: unifiedFragmentShader,
            transparent: true,
            wireframe: true,
            side: THREE.DoubleSide,
        });
    }, [faceTexture, wireframeColor, opacity, modelBounds]);

    // Create particle geometry and material
    const { particleGeometry, particleMaterial } = useMemo(() => {
        if (!faceTexture || !particleData) return { particleGeometry: null, particleMaterial: null };

        // Create sphere geometry for particles
        const sphereGeometry = new THREE.SphereGeometry(1, 8, 6);
        
        // Add dummy positionFlip attribute
        const positionArray = sphereGeometry.attributes.position.array;
        sphereGeometry.setAttribute(
            'positionFlip',
            new THREE.Float32BufferAttribute(positionArray.slice(), 3)
        );

        // Set up instanced attributes
        const instanceUVs = new Float32Array(particleData.count * 2);
        const instanceLifeData = new Float32Array(particleData.count * 4);

        particleData.positions.forEach((_, i) => {
            // UV coordinates
            instanceUVs[i * 2] = particleData.uvs[i]?.u || 0.5;
            instanceUVs[i * 2 + 1] = particleData.uvs[i]?.v || 0.5;

            // Life data (life, maxLife, isEmissive, scale)
            instanceLifeData[i * 4] = Math.random(); // life
            instanceLifeData[i * 4 + 1] = 1.0; // maxLife
            instanceLifeData[i * 4 + 2] = Math.random() > 0.8 ? 1.0 : 0.0; // isEmissive
            instanceLifeData[i * 4 + 3] = 1.0; // scale
        });

        sphereGeometry.setAttribute(
            'instanceUV',
            new THREE.InstancedBufferAttribute(instanceUVs, 2)
        );
        sphereGeometry.setAttribute(
            'instanceLifeData',
            new THREE.InstancedBufferAttribute(instanceLifeData, 4)
        );

        // Create particle material
        const material = new THREE.ShaderMaterial({
            uniforms: {
                // Transition uniforms
                uTransitionProgress: { value: 0.0 },
                uRevealHeight: { value: 0.0 },
                uFadeZone: { value: TRANSITION_CONFIG.FADE_ZONE },
                uModelHeight: { value: modelBounds.top },
                uModelBottom: { value: modelBounds.bottom },
                uIsDisappearing: { value: false },
                uIsInstancedParticles: { value: true },
                uParticleRevealOffset: { value: 0.3 },

                // Particle uniforms
                uTexture: { value: faceTexture },
                uTime: { value: 0.0 },
                uParticleScale: { value: PARTICLE_SYSTEM_CONFIG.particleScale },
                uAnimationSpeed: { value: PARTICLE_SYSTEM_CONFIG.animationSpeed },
                uFlipRatio: { value: 0.0 },
                uUseTriangles: { value: false },
                uBrightness: { value: PARTICLE_SYSTEM_CONFIG.brightness },
                uAmbientLight: { value: PARTICLE_SYSTEM_CONFIG.ambientLight },

                // Chroma effects
                uChromaEnabled: { value: PARTICLE_SYSTEM_CONFIG.chromaEnabled },
                uChromaIntensity: { value: PARTICLE_SYSTEM_CONFIG.chromaIntensity },
                uChromaSeparation: { value: PARTICLE_SYSTEM_CONFIG.chromaSeparation },
                uChromaStartPhase: { value: PARTICLE_SYSTEM_CONFIG.chromaStartPhase },
                uChromaColor1: { value: new THREE.Color(PARTICLE_SYSTEM_CONFIG.chromaColor1) },
                uChromaColor2: { value: new THREE.Color(PARTICLE_SYSTEM_CONFIG.chromaColor2) },
                uChromaColor3: { value: new THREE.Color(PARTICLE_SYSTEM_CONFIG.chromaColor3) },
                uChromaBlendMode: { value: PARTICLE_SYSTEM_CONFIG.chromaBlendMode === 'additive' ? 0 : 1 },

                // Wireframe uniforms (unused for particles)
                uColor: { value: new THREE.Color(wireframeColor) },
                uOpacity: { value: opacity },
                uWireframe: { value: false },
                uLineWidth: { value: 1.0 },
                uEnableGlow: { value: true },
                uGlowIntensity: { value: 0.3 },
                uGlowColor: { value: new THREE.Color('#ffffff') },
                uEnableEdgeHighlight: { value: false },
                uEdgeHighlightIntensity: { value: 0.0 },
            },
            vertexShader: unifiedVertexShader,
            fragmentShader: unifiedFragmentShader,
            transparent: true,
        });

        return { particleGeometry: sphereGeometry, particleMaterial: material };
    }, [faceTexture, particleData, wireframeColor, opacity, modelBounds]);

    // Animation frame loop
    useFrame((state) => {
        if (!wireframeMaterialRef.current || !particleMaterialRef.current) return;

        const time = state.clock.elapsedTime;
        
        // Update time uniform for both materials
        wireframeMaterialRef.current.uniforms.uTime.value = time;
        particleMaterialRef.current.uniforms.uTime.value = time;

        if (!isAnimating) return;

        // Initialize start time
        if (animationStartTime === null) {
            setAnimationStartTime(time);
            return;
        }

        const elapsed = time - animationStartTime;

        // Phase calculations
        const wireframeRevealEnd = TRANSITION_CONFIG.WIREFRAME_REVEAL_DURATION;
        const wireframeHoldEnd = wireframeRevealEnd + TRANSITION_CONFIG.WIREFRAME_HOLD_DURATION;
        const wireframeDisappearEnd = wireframeHoldEnd + TRANSITION_CONFIG.WIREFRAME_DISAPPEAR_DURATION;
        const totalDuration = TRANSITION_CONFIG.TOTAL_DURATION;

        let transitionProgress = 0.0;
        let revealHeight = 0.0;
        let isDisappearing = false;

        if (elapsed <= wireframeRevealEnd) {
            // WIREFRAME REVEAL PHASE
            setCurrentPhase('wireframe_reveal');
            const progress = elapsed / wireframeRevealEnd;
            const easedProgress = easingFunctions[TRANSITION_CONFIG.EASING](progress);
            revealHeight = easedProgress;
            transitionProgress = 0.0;
            
        } else if (elapsed <= wireframeHoldEnd) {
            // WIREFRAME HOLD PHASE
            setCurrentPhase('wireframe_hold');
            revealHeight = 1.0;
            transitionProgress = 0.0;
            
        } else if (elapsed <= wireframeDisappearEnd) {
            // TRANSITION PHASE (wireframe disappears, particles appear)
            setCurrentPhase('transition');
            const transitionElapsed = elapsed - wireframeHoldEnd;
            const progress = transitionElapsed / TRANSITION_CONFIG.WIREFRAME_DISAPPEAR_DURATION;
            const easedProgress = easingFunctions[TRANSITION_CONFIG.EASING](progress);
            
            // Wireframe disappears (top to bottom)
            revealHeight = 1.0 - easedProgress;
            isDisappearing = true;
            
            // Transition progress goes from 0 to 1
            transitionProgress = easedProgress;
            
        } else if (elapsed <= totalDuration) {
            // PARTICLES ONLY PHASE
            setCurrentPhase('particles_only');
            revealHeight = 0.0;
            isDisappearing = true;
            transitionProgress = 1.0;
            
        } else {
            // CYCLE COMPLETE
            if (loop) {
                setTimeout(() => {
                    if (isAnimating) {
                        setAnimationStartTime(null);
                        setCurrentPhase('wireframe_reveal');
                    }
                }, TRANSITION_CONFIG.LOOP_DELAY * 1000);
            } else {
                setIsAnimating(false);
                onAnimationComplete?.();
            }
            return;
        }

        // Update uniforms for both materials
        const wireframeUniforms = wireframeMaterialRef.current.uniforms;
        const particleUniforms = particleMaterialRef.current.uniforms;

        // Shared uniforms
        [wireframeUniforms, particleUniforms].forEach(uniforms => {
            uniforms.uTransitionProgress.value = transitionProgress;
            uniforms.uRevealHeight.value = revealHeight;
            uniforms.uIsDisappearing.value = isDisappearing;
        });

        // Update particle instance matrices
        if (particleMeshRef.current && particleData) {
            const dummy = new THREE.Object3D();
            
            particleData.positions.forEach((position, i) => {
                dummy.position.copy(position);
                dummy.scale.setScalar(PARTICLE_SYSTEM_CONFIG.particleScale);
                dummy.updateMatrix();
                particleMeshRef.current!.setMatrixAt(i, dummy.matrix);
            });
            
            particleMeshRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    // Update material references
    useEffect(() => {
        if (wireframeMeshRef.current?.material) {
            // @ts-expect-error - Mutable ref pattern
            wireframeMaterialRef.current = wireframeMeshRef.current.material as THREE.ShaderMaterial;
        }
    }, [wireframeMaterial]);

    useEffect(() => {
        if (particleMeshRef.current?.material) {
            // @ts-expect-error - Mutable ref pattern
            particleMaterialRef.current = particleMeshRef.current.material as THREE.ShaderMaterial;
        }
    }, [particleMaterial]);

    // Don't render if data not ready
    if (!extractionResult || !particleData || !wireframeMaterial || !particleGeometry || !particleMaterial) {
        return null;
    }

    return (
        <group position={position} rotation={rotation} scale={scale} visible={visible}>
            {/* Wireframe mesh */}
            <mesh
                ref={wireframeMeshRef}
                geometry={extractionResult.geometry}
                material={wireframeMaterial}
                castShadow={castShadow}
                receiveShadow={receiveShadow}
            />
            
            {/* Particle system */}
            <instancedMesh
                ref={particleMeshRef}
                args={[particleGeometry, particleMaterial, particleData.count]}
                castShadow={castShadow}
                receiveShadow={receiveShadow}
            />
        </group>
    );
}