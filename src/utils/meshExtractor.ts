import * as THREE from 'three';
import { MeshBVH, computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { BVH_CONFIG } from '../constants/bvhConfig';

// Extend Three.js BufferGeometry with BVH methods
// @ts-expect-error - BVH library prototype extension
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

/**
 * Result of mesh extraction with BVH
 */
export interface MeshExtractionResult {
    /** The extracted geometry */
    geometry: THREE.BufferGeometry;
    /** BVH acceleration structure for the geometry */
    bvh: MeshBVH;
    /** Original mesh reference */
    originalMesh: THREE.Mesh;
    /** Extraction metadata */
    metadata: {
        vertexCount: number;
        triangleCount: number;
        extractionTime: number;
        bvhBuildTime: number;
    };
}

export interface MeshExtractionOptions {
    /** Whether to preserve original mesh after extraction */
    preserveOriginal?: boolean;
    /** Custom BVH options */
    bvhOptions?: {
        maxLeafTris?: number;
        splitStrategy?: 'SAH' | 'CENTER';
        verbose?: boolean;
    };
}

export class MeshExtractor {
    private static readonly DEFAULT_OPTIONS: Required<MeshExtractionOptions> = {
        preserveOriginal: BVH_CONFIG.SKINNED_MESH.PRESERVE_ORIGINAL,
        bvhOptions: {
            maxLeafTris: BVH_CONFIG.TREE.MAX_LEAF_TRIANGLES,
            splitStrategy: BVH_CONFIG.TREE.SPLIT_STRATEGY,
            verbose: BVH_CONFIG.TREE.VERBOSE,
        },
    };

    /**
     * Extract geometry from any mesh and build BVH
     */
    static extractGeometry(
        mesh: THREE.Mesh,
        options: MeshExtractionOptions = {}
    ): MeshExtractionResult | null {
        const startTime = performance.now();
        
        if (!mesh || !mesh.geometry) {
            console.warn('MeshExtractor: Invalid mesh provided');
            return null;
        }

        const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
        
        try {
            // Clone the geometry to avoid modifying the original
            const geometry = mesh.geometry.clone();
            
            // Apply the mesh's world transform to the geometry
            mesh.updateMatrixWorld(true);
            geometry.applyMatrix4(mesh.matrixWorld);

            // Ensure geometry has proper attributes for BVH
            if (!geometry.attributes.normal) {
                geometry.computeVertexNormals();
            }

            // Ensure we have an index for better BVH performance
            if (!geometry.index) {
                geometry.setIndex(this.generateIndex(geometry));
            }

            // Build BVH
            const bvhStartTime = performance.now();
            
            // Set up BVH on the geometry
            geometry.computeBoundsTree({
                maxLeafTris: finalOptions.bvhOptions.maxLeafTris,
                strategy: this.getBVHStrategy(finalOptions.bvhOptions.splitStrategy ?? 'SAH'),
                verbose: finalOptions.bvhOptions.verbose,
            });

            const bvh = geometry.boundsTree;
            if (!bvh) {
                throw new Error('Failed to build BVH tree');
            }

            const bvhEndTime = performance.now();
            const extractionEndTime = performance.now();

            const result: MeshExtractionResult = {
                geometry,
                bvh,
                originalMesh: mesh,
                metadata: {
                    vertexCount: geometry.attributes.position.count,
                    triangleCount: geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3,
                    extractionTime: extractionEndTime - startTime,
                    bvhBuildTime: bvhEndTime - bvhStartTime,
                },
            };

            if (BVH_CONFIG.DEBUG.LOG_PERFORMANCE) {
                console.log('MeshExtractor Performance:', {
                    vertices: result.metadata.vertexCount,
                    triangles: result.metadata.triangleCount,
                    extractionTime: `${result.metadata.extractionTime.toFixed(2)}ms`,
                    bvhBuildTime: `${result.metadata.bvhBuildTime.toFixed(2)}ms`,
                });
            }

            return result;

        } catch (error) {
            console.error('MeshExtractor: Failed to extract geometry:', error);
            return null;
        }
    }

    /**
     * Generate index buffer for non-indexed geometry
     */
    private static generateIndex(geometry: THREE.BufferGeometry): THREE.BufferAttribute {
        const position = geometry.attributes.position;
        const index = [];
        
        for (let i = 0; i < position.count; i++) {
            index.push(i);
        }
        
        return new THREE.BufferAttribute(new Uint32Array(index), 1);
    }

    /**
     * Convert string strategy to BVH strategy constant
     */
    private static getBVHStrategy(strategy: 'SAH' | 'CENTER'): number {
        // Note: Actual strategy constants depend on three-mesh-bvh version
        // These are placeholder values - adjust based on actual library
        return strategy === 'SAH' ? 0 : 1;
    }

    /**
     * Find all meshes in a scene or object
     */
    static findMeshes(object: THREE.Object3D): THREE.Mesh[] {
        const meshes: THREE.Mesh[] = [];
        
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                meshes.push(child);
            }
        });
        
        return meshes;
    }

    /**
     * Extract geometry from the first mesh found in an object
     */
    static extractFirstMesh(
        object: THREE.Object3D,
        options?: MeshExtractionOptions
    ): MeshExtractionResult | null {
        const meshes = this.findMeshes(object);
        
        if (meshes.length === 0) {
            console.warn('MeshExtractor: No meshes found in object');
            return null;
        }

        if (meshes.length > 1) {
            console.info(`MeshExtractor: Found ${meshes.length} meshes, using first one`);
        }

        return this.extractGeometry(meshes[0], options);
    }

    /**
     * Extract geometry from the largest mesh found in an object
     */
    static extractLargestMesh(
        object: THREE.Object3D,
        options?: MeshExtractionOptions
    ): MeshExtractionResult | null {
        const meshes = this.findMeshes(object);
        
        if (meshes.length === 0) {
            console.warn('MeshExtractor: No meshes found in object');
            return null;
        }

        // Find the mesh with the most vertices
        let largestMesh = meshes[0];
        let maxVertices = largestMesh.geometry.attributes.position?.count || 0;

        for (const mesh of meshes) {
            const vertexCount = mesh.geometry.attributes.position?.count || 0;
            if (vertexCount > maxVertices) {
                largestMesh = mesh;
                maxVertices = vertexCount;
            }
        }

        console.info(`MeshExtractor: Using largest mesh with ${maxVertices} vertices`);
        return this.extractGeometry(largestMesh, options);
    }
}