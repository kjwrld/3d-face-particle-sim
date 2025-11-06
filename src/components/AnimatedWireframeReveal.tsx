import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { type MeshExtractionResult } from '../utils/meshExtractor';

// Import shaders
import vertexShader from '../shaders/wireframeReveal.vert?raw';
import fragmentShader from '../shaders/wireframeReveal.frag?raw';

/**
 * Animation configuration constants
 */
const REVEAL_ANIMATION_CONFIG = {
    /** Duration of reveal animation in seconds */
    REVEAL_DURATION: 2.0,
    
    /** Duration of disappear animation in seconds */
    DISAPPEAR_DURATION: 2.0,
    
    /** Pause between reveal and disappear in seconds */
    HOLD_DURATION: 1.0,
    
    /** Size of fade zone relative to model height */
    FADE_ZONE: 0.15,
    
    /** Whether to loop the animation */
    LOOP: true,
    
    /** Delay before loop restart in seconds */
    LOOP_DELAY: 1.0,
    
    /** Animation easing function type */
    EASING: 'easeInOutCubic' as const,
    
    /** Visual effects */
    EFFECTS: {
        /** Enable glow effect */
        GLOW_ENABLED: true,
        
        /** Glow intensity */
        GLOW_INTENSITY: 0.3,
        
        /** Glow color */
        GLOW_COLOR: '#ffffff',
        
        /** Enable edge highlighting */
        EDGE_HIGHLIGHT_ENABLED: true,
        
        /** Edge highlight intensity */
        EDGE_HIGHLIGHT_INTENSITY: 0.2,
    },
} as const;

/**
 * Props for animated wireframe reveal
 */
export interface AnimatedWireframeRevealProps {
    /** Extraction result with BVH geometry */
    extractionResult: MeshExtractionResult;
    
    /** Position of the mesh */
    position?: [number, number, number];
    
    /** Rotation of the mesh */
    rotation?: [number, number, number];
    
    /** Scale of the mesh */
    scale?: [number, number, number];
    
    /** Wireframe color */
    color?: string;
    
    /** Material opacity */
    opacity?: number;
    
    /** Whether to show wireframe */
    wireframe?: boolean;
    
    /** Whether animation should auto-start */
    autoStart?: boolean;
    
    /** Whether animation should loop */
    loop?: boolean;
    
    /** Animation duration in seconds */
    duration?: number;
    
    /** Callback when animation completes */
    onAnimationComplete?: () => void;
    
    /** Callback for animation phase changes */
    onAnimationPhaseChange?: (phase: 'reveal' | 'hold' | 'disappear', progress: number) => void;
    
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
    easeOutBounce: (t: number) => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    },
};

/**
 * Animated wireframe reveal component
 */
export function AnimatedWireframeReveal({
    extractionResult,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    color = '#ffffff',
    opacity = 0.8,
    wireframe = true,
    autoStart = true,
    loop = REVEAL_ANIMATION_CONFIG.LOOP,
    duration = REVEAL_ANIMATION_CONFIG.REVEAL_DURATION,
    onAnimationComplete,
    onAnimationPhaseChange,
    castShadow = false,
    receiveShadow = false,
    visible = true,
}: AnimatedWireframeRevealProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    
    // Animation state
    const [isAnimating, setIsAnimating] = useState(autoStart);
    const [animationStartTime, setAnimationStartTime] = useState<number | null>(null);
    const [animationProgress, setAnimationProgress] = useState(0);
    const [currentPhase, setCurrentPhase] = useState<'reveal' | 'hold' | 'disappear'>('reveal');
    
    // Calculate model bounds for reveal animation
    const modelBounds = useMemo(() => {
        const geometry = extractionResult.geometry;
        geometry.computeBoundingBox();
        const box = geometry.boundingBox!;
        
        return {
            height: box.max.y - box.min.y,
            bottom: box.min.y,
            top: box.max.y,
        };
    }, [extractionResult]);
    
    // Create shader material
    const shaderMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                // Reveal animation
                uRevealHeight: { value: 0.0 },
                uFadeZone: { value: REVEAL_ANIMATION_CONFIG.FADE_ZONE },
                uModelHeight: { value: modelBounds.top },
                uModelBottom: { value: modelBounds.bottom },
                uTime: { value: 0.0 },
                uIsDisappearing: { value: false },
                
                // Material properties
                uColor: { value: new THREE.Color(color) },
                uOpacity: { value: opacity },
                uWireframe: { value: wireframe },
                uLineWidth: { value: 1.0 },
                
                // Visual effects
                uEnableGlow: { value: REVEAL_ANIMATION_CONFIG.EFFECTS.GLOW_ENABLED },
                uGlowIntensity: { value: REVEAL_ANIMATION_CONFIG.EFFECTS.GLOW_INTENSITY },
                uGlowColor: { value: new THREE.Color(REVEAL_ANIMATION_CONFIG.EFFECTS.GLOW_COLOR) },
                uEnableEdgeHighlight: { value: REVEAL_ANIMATION_CONFIG.EFFECTS.EDGE_HIGHLIGHT_ENABLED },
                uEdgeHighlightIntensity: { value: REVEAL_ANIMATION_CONFIG.EFFECTS.EDGE_HIGHLIGHT_INTENSITY },
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            wireframe,
            side: THREE.DoubleSide,
        });
    }, [color, opacity, wireframe, modelBounds]);
    
    // Start animation
    const startAnimation = () => {
        setIsAnimating(true);
        setAnimationStartTime(null);
        setAnimationProgress(0);
        setCurrentPhase('reveal');
    };
    
    // Stop animation
    const stopAnimation = () => {
        setIsAnimating(false);
        setAnimationStartTime(null);
    };
    
    // Reset animation
    const resetAnimation = () => {
        setAnimationProgress(0);
        setCurrentPhase('reveal');
        if (materialRef.current) {
            materialRef.current.uniforms.uRevealHeight.value = 0.0;
        }
    };
    
    // Animation frame loop
    useFrame((state) => {
        if (!materialRef.current) return;
        
        // Update time uniform for effects
        materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        
        if (!isAnimating) return;
        
        // Initialize start time
        if (animationStartTime === null) {
            setAnimationStartTime(state.clock.elapsedTime);
            return;
        }
        
        const elapsed = state.clock.elapsedTime - animationStartTime;
        const totalCycleDuration = REVEAL_ANIMATION_CONFIG.REVEAL_DURATION + 
                                  REVEAL_ANIMATION_CONFIG.HOLD_DURATION + 
                                  REVEAL_ANIMATION_CONFIG.DISAPPEAR_DURATION;
        
        let revealHeight = 0.0;
        
        if (elapsed <= REVEAL_ANIMATION_CONFIG.REVEAL_DURATION) {
            // REVEAL PHASE: 0 to 1 (top to bottom)
            setCurrentPhase('reveal');
            const progress = elapsed / REVEAL_ANIMATION_CONFIG.REVEAL_DURATION;
            const easedProgress = easingFunctions[REVEAL_ANIMATION_CONFIG.EASING](progress);
            revealHeight = easedProgress;
            setAnimationProgress(easedProgress);
            materialRef.current.uniforms.uIsDisappearing.value = false;
            onAnimationPhaseChange?.('reveal', easedProgress);
            
        } else if (elapsed <= REVEAL_ANIMATION_CONFIG.REVEAL_DURATION + REVEAL_ANIMATION_CONFIG.HOLD_DURATION) {
            // HOLD PHASE: stay at 1
            setCurrentPhase('hold');
            revealHeight = 1.0;
            setAnimationProgress(1.0);
            materialRef.current.uniforms.uIsDisappearing.value = false;
            onAnimationPhaseChange?.('hold', 1.0);
            
        } else if (elapsed <= totalCycleDuration) {
            // DISAPPEAR PHASE: top-to-bottom disappear
            setCurrentPhase('disappear');
            const disappearStart = REVEAL_ANIMATION_CONFIG.REVEAL_DURATION + REVEAL_ANIMATION_CONFIG.HOLD_DURATION;
            const disappearProgress = (elapsed - disappearStart) / REVEAL_ANIMATION_CONFIG.DISAPPEAR_DURATION;
            const easedProgress = easingFunctions[REVEAL_ANIMATION_CONFIG.EASING](disappearProgress);
            // For disappear: start at 1.0, go to 0.0 
            // BUT the shader uses different logic for disappearing
            revealHeight = 1.0 - easedProgress;
            setAnimationProgress(easedProgress);
            materialRef.current.uniforms.uIsDisappearing.value = true;
            onAnimationPhaseChange?.('disappear', easedProgress);
            
        } else {
            // CYCLE COMPLETE
            if (loop) {
                // Restart after delay
                setTimeout(() => {
                    if (isAnimating) {
                        setAnimationStartTime(null);
                        setAnimationProgress(0);
                        setCurrentPhase('reveal');
                    }
                }, REVEAL_ANIMATION_CONFIG.LOOP_DELAY * 1000);
            } else {
                setIsAnimating(false);
                onAnimationComplete?.();
            }
            return;
        }
        
        // Update reveal height uniform
        materialRef.current.uniforms.uRevealHeight.value = revealHeight;
    });
    
    // Update material properties when props change
    useEffect(() => {
        if (!materialRef.current) return;
        
        materialRef.current.uniforms.uColor.value.set(color);
        materialRef.current.uniforms.uOpacity.value = opacity;
        materialRef.current.uniforms.uWireframe.value = wireframe;
    }, [color, opacity, wireframe]);
    
    // Expose control methods
    useEffect(() => {
        if (meshRef.current) {
            // Attach control methods to mesh for external access
            (meshRef.current as any).startRevealAnimation = startAnimation;
            (meshRef.current as any).stopRevealAnimation = stopAnimation;
            (meshRef.current as any).resetRevealAnimation = resetAnimation;
        }
    }, []);
    
    return (
        <mesh
            ref={meshRef}
            geometry={extractionResult.geometry}
            material={shaderMaterial}
            position={position}
            rotation={rotation}
            scale={scale}
            castShadow={castShadow}
            receiveShadow={receiveShadow}
            visible={visible}
        >
            {/* Store material ref for updates */}
            <primitive
                object={shaderMaterial}
                ref={materialRef}
                attach="material"
            />
        </mesh>
    );
}

/**
 * Hook to control wireframe reveal animation
 */
export function useWireframeRevealControls(meshRef: React.RefObject<THREE.Mesh>) {
    const startAnimation = () => {
        if (meshRef.current && (meshRef.current as any).startRevealAnimation) {
            (meshRef.current as any).startRevealAnimation();
        }
    };
    
    const stopAnimation = () => {
        if (meshRef.current && (meshRef.current as any).stopRevealAnimation) {
            (meshRef.current as any).stopRevealAnimation();
        }
    };
    
    const resetAnimation = () => {
        if (meshRef.current && (meshRef.current as any).resetRevealAnimation) {
            (meshRef.current as any).resetRevealAnimation();
        }
    };
    
    return {
        startAnimation,
        stopAnimation,
        resetAnimation,
    };
}