import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { MeshExtractor, type MeshExtractionResult } from '../utils/meshExtractor';
import { BVH_CONFIG } from '../constants/bvhConfig';

// Import shaders
import vertexShader from '../shaders/wireframeReveal.vert?raw';
import fragmentShader from '../shaders/wireframeReveal.frag?raw';

/**
 * Configuration for hover reveal
 */
const HOVER_REVEAL_CONFIG = {
    /** Radius of reveal effect around hover point */
    REVEAL_RADIUS: 0.3,
    
    /** Smoothness of reveal edge */
    FADE_ZONE: 0.1,
    
    /** Speed of reveal animation */
    REVEAL_SPEED: 8.0,
    
    /** Speed of hide animation */
    HIDE_SPEED: 6.0,
} as const;

/**
 * Props for interactive hover reveal
 */
export interface InteractiveHoverRevealProps {
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
    
    /** Whether initial reveal animation has completed */
    initialAnimationComplete?: boolean;
    
    /** Whether to cast shadows */
    castShadow?: boolean;
    
    /** Whether to receive shadows */
    receiveShadow?: boolean;
    
    /** Visibility */
    visible?: boolean;
}

/**
 * Interactive hover reveal component using BVH for precise raycasting
 */
export function InteractiveHoverReveal({
    extractionResult,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    color = '#ffffff',
    opacity = 0.8,
    initialAnimationComplete = false,
    castShadow = false,
    receiveShadow = false,
    visible = true,
}: InteractiveHoverRevealProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { camera, raycaster, size } = useThree();
    
    // Mouse and hover state
    const [mousePosition, setMousePosition] = useState(new THREE.Vector2(0, 0));
    const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    
    // Reveal state for each vertex/area
    const revealMap = useRef(new Map<string, number>());
    
    // Calculate model bounds for shader
    const modelBounds = {
        height: extractionResult.geometry.boundingBox!.max.y - extractionResult.geometry.boundingBox!.min.y,
        bottom: extractionResult.geometry.boundingBox!.min.y,
        top: extractionResult.geometry.boundingBox!.max.y,
    };
    
    // Create shader material for hover-based reveal
    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            // Hover reveal uniforms
            uRevealPoint: { value: new THREE.Vector3(0, 0, 0) },
            uRevealRadius: { value: HOVER_REVEAL_CONFIG.REVEAL_RADIUS },
            uFadeZone: { value: HOVER_REVEAL_CONFIG.FADE_ZONE },
            uIsHovering: { value: false },
            uTime: { value: 0.0 },
            
            // Model bounds
            uModelHeight: { value: modelBounds.top },
            uModelBottom: { value: modelBounds.bottom },
            
            // Material properties
            uColor: { value: new THREE.Color(color) },
            uOpacity: { value: opacity },
            uWireframe: { value: true },
            
            // Visual effects
            uEnableGlow: { value: true },
            uGlowIntensity: { value: 0.3 },
            uGlowColor: { value: new THREE.Color('#ffffff') },
            uEnableEdgeHighlight: { value: true },
            uEdgeHighlightIntensity: { value: 0.2 },
        },
        vertexShader: `
            // Hover-based reveal vertex shader
            uniform vec3 uRevealPoint;
            uniform float uRevealRadius;
            uniform float uFadeZone;
            uniform bool uIsHovering;
            uniform float uTime;
            
            varying vec3 vWorldPosition;
            varying vec3 vNormal;
            varying float vRevealFactor;
            varying float vDistanceFromCamera;
            
            void main() {
                // Transform position to world space
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                
                // Transform normal
                vNormal = normalize(normalMatrix * normal);
                
                if (uIsHovering) {
                    // Calculate distance from vertex to hover point
                    float distanceToHover = distance(worldPosition.xyz, uRevealPoint);
                    
                    // Create smooth reveal based on distance
                    float revealEdge = uRevealRadius + uFadeZone * 0.5;
                    float hideEdge = uRevealRadius - uFadeZone * 0.5;
                    vRevealFactor = 1.0 - smoothstep(hideEdge, revealEdge, distanceToHover);
                } else {
                    // No hover - hide everything after initial animation
                    vRevealFactor = 0.0;
                }
                
                // Calculate distance from camera
                vec4 viewPosition = viewMatrix * worldPosition;
                vDistanceFromCamera = length(viewPosition.xyz);
                
                // Standard vertex transformation
                gl_Position = projectionMatrix * viewPosition;
            }
        `,
        fragmentShader,
        transparent: true,
        wireframe: true,
        side: THREE.DoubleSide,
    });
    
    // Mouse move handler
    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            // Normalize mouse coordinates
            const x = (event.clientX / size.width) * 2 - 1;
            const y = -(event.clientY / size.height) * 2 + 1;
            setMousePosition(new THREE.Vector2(x, y));
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [size]);
    
    // Raycasting for hover detection
    useFrame((state) => {
        if (!meshRef.current || !materialRef.current) return;
        
        // Update time uniform
        materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        
        // DEBUG: Always run for now
        // if (!initialAnimationComplete) return;
        
        // Set up raycaster
        raycaster.setFromCamera(mousePosition, camera);
        
        // Raycast against the BVH-accelerated mesh
        const intersects = raycaster.intersectObject(meshRef.current);
        
        if (intersects.length > 0) {
            // Hovering over face
            const intersection = intersects[0];
            const point = intersection.point;
            
            console.log('Hover detected at:', point);
            setHoverPoint(point);
            setIsHovering(true);
            
            // Update shader uniforms
            materialRef.current.uniforms.uRevealPoint.value.copy(point);
            materialRef.current.uniforms.uIsHovering.value = true;
        } else {
            // Not hovering
            setIsHovering(false);
            materialRef.current.uniforms.uIsHovering.value = false;
        }
    });
    
    // Debug: log when component should be active
    useEffect(() => {
        if (initialAnimationComplete) {
            console.log('InteractiveHoverReveal is now active!');
        }
    }, [initialAnimationComplete]);
    
    // DEBUG: Always render for now to test hover
    // if (!initialAnimationComplete) {
    //     console.log('InteractiveHoverReveal waiting for initial animation...');
    //     return null;
    // }
    
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