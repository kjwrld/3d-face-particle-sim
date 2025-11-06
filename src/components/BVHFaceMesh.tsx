import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getDracoLoader } from '../utils/loaders';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { 
    MeshExtractor, 
    type MeshExtractionResult 
} from '../utils/meshExtractor';
import { BVH_CONFIG } from '../constants/bvhConfig';

/**
 * Props for BVH Face Mesh component
 */
export interface BVHFaceMeshProps {
    /** Position of the mesh */
    position?: [number, number, number];
    /** Rotation of the mesh */
    rotation?: [number, number, number];
    /** Scale of the mesh */
    scale?: [number, number, number];
    /** Whether to show wireframe */
    wireframe?: boolean;
    /** Material color */
    color?: string;
    /** Material opacity */
    opacity?: number;
    /** Whether material is transparent */
    transparent?: boolean;
    /** Whether to cast shadows */
    castShadow?: boolean;
    /** Whether to receive shadows */
    receiveShadow?: boolean;
    /** Visibility state */
    visible?: boolean;
    /** Debug: show BVH tree visualization */
    showBVHTree?: boolean;
}

/**
 * BVH-accelerated face mesh component
 * Extracts skinned mesh from GLTF and creates static geometry with BVH
 */
export function BVHFaceMesh({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    wireframe = BVH_CONFIG.RENDERING.MATERIAL.WIREFRAME,
    color = BVH_CONFIG.RENDERING.MATERIAL.COLOR,
    opacity = BVH_CONFIG.RENDERING.MATERIAL.OPACITY,
    transparent = BVH_CONFIG.RENDERING.MATERIAL.TRANSPARENT,
    castShadow = BVH_CONFIG.RENDERING.VISIBILITY.CAST_SHADOW,
    receiveShadow = BVH_CONFIG.RENDERING.VISIBILITY.RECEIVE_SHADOW,
    visible = BVH_CONFIG.RENDERING.VISIBILITY.VISIBLE,
    showBVHTree = BVH_CONFIG.DEBUG.SHOW_BVH_TREE,
}: BVHFaceMeshProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const bvhHelperRef = useRef<THREE.Object3D>(null);
    
    // State for extraction result
    const [extractionResult, setExtractionResult] = useState<MeshExtractionResult | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionError, setExtractionError] = useState<string | null>(null);

    // Load the GLTF model
    const gltf = useLoader(GLTFLoader, '/models/kj_face.glb', (loader) => {
        loader.setDRACOLoader(getDracoLoader());
    });

    // Extract skinned mesh and create BVH when GLTF loads
    useEffect(() => {
        if (!gltf || isExtracting) return;

        setIsExtracting(true);
        setExtractionError(null);

        // Extract mesh asynchronously to avoid blocking
        const extractMesh = async () => {
            try {
                // Try to get the largest mesh from the GLTF scene
                const result = MeshExtractor.extractLargestMesh(gltf.scene, {
                    preserveOriginal: true,
                    bvhOptions: {
                        maxLeafTris: BVH_CONFIG.TREE.MAX_LEAF_TRIANGLES,
                        splitStrategy: BVH_CONFIG.TREE.SPLIT_STRATEGY,
                        verbose: BVH_CONFIG.DEBUG.LOG_PERFORMANCE,
                    },
                });

                if (result) {
                    setExtractionResult(result);
                    console.log('BVH Face Mesh extracted successfully:', {
                        vertices: result.metadata.vertexCount,
                        triangles: result.metadata.triangleCount,
                        extractionTime: `${result.metadata.extractionTime.toFixed(2)}ms`,
                        bvhBuildTime: `${result.metadata.bvhBuildTime.toFixed(2)}ms`,
                    });
                } else {
                    setExtractionError('Failed to extract mesh from GLTF');
                }
            } catch (error) {
                setExtractionError(`Extraction error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                console.error('BVH extraction failed:', error);
            } finally {
                setIsExtracting(false);
            }
        };

        extractMesh();
    }, [gltf, isExtracting]);

    // Create material with configurable properties
    const material = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            wireframe,
            opacity,
            transparent: transparent || opacity < 1,
            side: THREE.DoubleSide,
            metalness: BVH_CONFIG.RENDERING.MATERIAL.WIREFRAME ? 0 : 0.1,
            roughness: BVH_CONFIG.RENDERING.MATERIAL.WIREFRAME ? 1 : 0.4,
        });
    }, [color, wireframe, opacity, transparent]);

    // Create BVH visualization helper if needed
    const bvhHelper = useMemo(() => {
        if (!showBVHTree || !extractionResult?.bvh) return null;

        // Create a helper to visualize the BVH tree
        // Note: This is a simplified visualization - three-mesh-bvh provides more sophisticated helpers
        const helper = new THREE.Object3D();
        
        // Add wireframe representation of BVH bounds
        const bounds = extractionResult.bvh.getBoundingBox(new THREE.Box3());
        const box = new THREE.Box3Helper(bounds, BVH_CONFIG.DEBUG.BVH_TREE_COLOR);
        helper.add(box);

        return helper;
    }, [showBVHTree, extractionResult]);

    // Update BVH helper
    useEffect(() => {
        if (bvhHelperRef.current) {
            // Clear previous helper
            bvhHelperRef.current.clear();
            
            // Add new helper if available
            if (bvhHelper) {
                bvhHelperRef.current.add(bvhHelper);
            }
        }
    }, [bvhHelper]);

    // Animation frame for any dynamic updates
    useFrame((state) => {
        if (!meshRef.current || !extractionResult) return;

        // Add any dynamic behaviors here
        // For now, this is static geometry
    });

    // Show loading state
    if (isExtracting) {
        return (
            <mesh position={position} rotation={rotation} scale={scale}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
                <meshBasicMaterial color="#ffff00" wireframe />
            </mesh>
        );
    }

    // Show error state
    if (extractionError) {
        console.error('BVHFaceMesh error:', extractionError);
        return (
            <mesh position={position} rotation={rotation} scale={scale}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
                <meshBasicMaterial color="#ff0000" wireframe />
            </mesh>
        );
    }

    // Don't render if no extraction result
    if (!extractionResult) {
        return null;
    }

    return (
        <group position={position} rotation={rotation} scale={scale}>
            {/* Main BVH mesh */}
            <mesh
                ref={meshRef}
                geometry={extractionResult.geometry}
                material={material}
                castShadow={castShadow}
                receiveShadow={receiveShadow}
                visible={visible}
            />
            
            {/* BVH visualization helper */}
            {showBVHTree && (
                <object3D ref={bvhHelperRef} />
            )}
        </group>
    );
}

/**
 * Hook to access BVH from a BVHFaceMesh
 * Useful for raycasting and spatial queries
 */
export function useBVHFaceMesh(meshRef: React.RefObject<THREE.Mesh>) {
    const [bvh, setBVH] = useState<MeshBVH | null>(null);

    useEffect(() => {
        if (meshRef.current?.geometry) {
            const geometry = meshRef.current.geometry;
            if ('boundsTree' in geometry && geometry.boundsTree) {
                setBVH(geometry.boundsTree as MeshBVH);
            }
        }
    }, [meshRef]);

    return bvh;
}