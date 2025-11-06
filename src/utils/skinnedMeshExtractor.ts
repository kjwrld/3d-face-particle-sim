import * as THREE from 'three';
import { MeshBVH, computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { BVH_CONFIG } from '../constants/bvhConfig';

// Extend Three.js BufferGeometry with BVH methods
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

/**
 * Utility for extracting and processing skinned meshes into static geometry
 * with BVH acceleration structures
 */

export interface SkinnedMeshExtractionResult {
    /** The extracted static geometry */
    geometry: THREE.BufferGeometry;
    /** BVH acceleration structure for the geometry */
    bvh: MeshBVH;
    /** Original skinned mesh reference */
    originalMesh: THREE.SkinnedMesh;
    /** Extraction metadata */
    metadata: {
        vertexCount: number;
        triangleCount: number;
        extractionTime: number;
        bvhBuildTime: number;
    };
}

export interface SkinnedMeshExtractionOptions {
    /** Whether to preserve original mesh after extraction */
    preserveOriginal?: boolean;
    /** Whether to use high precision calculations */
    highPrecision?: boolean;
    /** Custom BVH options */
    bvhOptions?: {
        maxLeafTris?: number;
        splitStrategy?: 'SAH' | 'CENTER';
        verbose?: boolean;
    };
}

export class SkinnedMeshExtractor {
    private static readonly DEFAULT_OPTIONS: Required<SkinnedMeshExtractionOptions> = {
        preserveOriginal: BVH_CONFIG.SKINNED_MESH.PRESERVE_ORIGINAL,
        highPrecision: BVH_CONFIG.SKINNED_MESH.HIGH_PRECISION,
        bvhOptions: {
            maxLeafTris: BVH_CONFIG.TREE.MAX_LEAF_TRIANGLES,
            splitStrategy: BVH_CONFIG.TREE.SPLIT_STRATEGY,
            verbose: BVH_CONFIG.TREE.VERBOSE,
        },
    };

    /**
     * Extract static geometry from a skinned mesh and build BVH
     */
    static extractStaticGeometry(
        skinnedMesh: THREE.SkinnedMesh,
        options: SkinnedMeshExtractionOptions = {}
    ): SkinnedMeshExtractionResult | null {
        const startTime = performance.now();
        
        if (!skinnedMesh || !skinnedMesh.geometry) {
            console.warn('SkinnedMeshExtractor: Invalid skinned mesh provided');
            return null;
        }

        const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
        
        try {
            // Create a temporary mesh to compute the world-space positions
            const tempMesh = skinnedMesh.clone();
            tempMesh.updateMatrixWorld(true);

            // Apply skeleton transformations to get final positions
            const geometry = tempMesh.geometry.clone();
            
            // Apply the skinning transformation
            if (tempMesh.skeleton) {
                tempMesh.skeleton.update();
                
                // Create a matrix to transform vertices
                const bindMatrix = tempMesh.bindMatrix;
                const bindMatrixInverse = tempMesh.bindMatrixInverse;
                
                // Get position attribute
                const position = geometry.attributes.position;
                if (!position) {
                    throw new Error('Geometry missing position attribute');
                }

                // Apply skinning transformation
                this.applySkinning(
                    geometry,
                    tempMesh.skeleton,
                    bindMatrix,
                    bindMatrixInverse,
                    finalOptions.highPrecision
                );
            }

            // Ensure geometry has proper attributes for BVH
            if (!geometry.attributes.normal) {
                geometry.computeVertexNormals();
            }

            // Build BVH
            const bvhStartTime = performance.now();
            
            // Set up BVH on the geometry
            geometry.computeBoundsTree({
                maxLeafTris: finalOptions.bvhOptions.maxLeafTris,
                strategy: this.getBVHStrategy(finalOptions.bvhOptions.splitStrategy),
                verbose: finalOptions.bvhOptions.verbose,
            });

            const bvh = geometry.boundsTree;
            if (!bvh) {
                throw new Error('Failed to build BVH tree');
            }

            const bvhEndTime = performance.now();
            const extractionEndTime = performance.now();

            // Clean up temporary mesh if not preserving original
            if (!finalOptions.preserveOriginal) {
                tempMesh.geometry.dispose();
                if (tempMesh.material instanceof THREE.Material) {
                    tempMesh.material.dispose();
                } else if (Array.isArray(tempMesh.material)) {
                    tempMesh.material.forEach(mat => mat.dispose());
                }
            }

            const result: SkinnedMeshExtractionResult = {
                geometry,
                bvh,
                originalMesh: skinnedMesh,
                metadata: {
                    vertexCount: geometry.attributes.position.count,
                    triangleCount: geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3,
                    extractionTime: extractionEndTime - startTime,
                    bvhBuildTime: bvhEndTime - bvhStartTime,
                },
            };

            if (BVH_CONFIG.DEBUG.LOG_PERFORMANCE) {
                console.log('SkinnedMeshExtractor Performance:', {
                    vertices: result.metadata.vertexCount,
                    triangles: result.metadata.triangleCount,
                    extractionTime: `${result.metadata.extractionTime.toFixed(2)}ms`,
                    bvhBuildTime: `${result.metadata.bvhBuildTime.toFixed(2)}ms`,
                });
            }

            return result;

        } catch (error) {
            console.error('SkinnedMeshExtractor: Failed to extract geometry:', error);
            return null;
        }
    }

    /**
     * Apply skinning transformation to geometry
     */
    private static applySkinning(
        geometry: THREE.BufferGeometry,
        skeleton: THREE.Skeleton,
        bindMatrix: THREE.Matrix4,
        bindMatrixInverse: THREE.Matrix4,
        highPrecision: boolean
    ): void {
        const position = geometry.attributes.position;
        const skinIndex = geometry.attributes.skinIndex;
        const skinWeight = geometry.attributes.skinWeight;

        if (!skinIndex || !skinWeight) {
            // No skinning data, apply bind matrix only
            position.applyMatrix4(bindMatrix);
            return;
        }

        const vertex = new THREE.Vector3();
        const temp = new THREE.Vector3();
        const matrix = new THREE.Matrix4();

        for (let i = 0; i < position.count; i++) {
            vertex.fromBufferAttribute(position, i);
            
            // Reset transformation matrix
            matrix.set(
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0
            );

            // Apply weighted bone transformations
            for (let j = 0; j < 4; j++) {
                const weight = skinWeight.getComponent(i, j);
                
                if (weight !== 0) {
                    const boneIndex = Math.floor(skinIndex.getComponent(i, j));
                    const bone = skeleton.bones[boneIndex];
                    
                    if (bone) {
                        temp.copy(vertex);
                        temp.applyMatrix4(skeleton.boneInverses[boneIndex]);
                        temp.applyMatrix4(bone.matrixWorld);
                        temp.multiplyScalar(weight);
                        
                        if (j === 0) {
                            vertex.copy(temp);
                        } else {
                            vertex.add(temp);
                        }
                    }
                }
            }

            // Apply bind matrix
            vertex.applyMatrix4(bindMatrix);
            
            // Update position
            position.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }

        position.needsUpdate = true;
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
     * Find skinned meshes in a scene or object
     */
    static findSkinnedMeshes(object: THREE.Object3D): THREE.SkinnedMesh[] {
        const skinnedMeshes: THREE.SkinnedMesh[] = [];
        
        object.traverse((child) => {
            if (child instanceof THREE.SkinnedMesh) {
                skinnedMeshes.push(child);
            }
        });
        
        return skinnedMeshes;
    }

    /**
     * Extract geometry from the first skinned mesh found in an object
     */
    static extractFirstSkinnedMesh(
        object: THREE.Object3D,
        options?: SkinnedMeshExtractionOptions
    ): SkinnedMeshExtractionResult | null {
        const skinnedMeshes = this.findSkinnedMeshes(object);
        
        if (skinnedMeshes.length === 0) {
            console.warn('SkinnedMeshExtractor: No skinned meshes found in object');
            return null;
        }

        if (skinnedMeshes.length > 1) {
            console.info(`SkinnedMeshExtractor: Found ${skinnedMeshes.length} skinned meshes, using first one`);
        }

        return this.extractStaticGeometry(skinnedMeshes[0], options);
    }
}