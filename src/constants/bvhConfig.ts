/**
 * BVH (Bounding Volume Hierarchy) Configuration Constants
 * 
 * Configuration for three-mesh-bvh operations on the face model
 * Used for skinned mesh extraction and spatial queries
 */

export const BVH_CONFIG = {
    /**
     * BVH Tree Construction Settings
     */
    TREE: {
        /** Maximum triangles per leaf node in BVH tree */
        MAX_LEAF_TRIANGLES: 10,
        
        /** Strategy for splitting BVH nodes */
        SPLIT_STRATEGY: 'SAH' as const, // Surface Area Heuristic
        
        /** Enable verbose logging during BVH construction */
        VERBOSE: false,
    },

    /**
     * Skinned Mesh Processing
     */
    SKINNED_MESH: {
        /** Whether to use high precision for skinned mesh calculations */
        HIGH_PRECISION: true,
        
        /** Update frequency for dynamic skinned meshes (frames) */
        UPDATE_FREQUENCY: 1,
        
        /** Whether to preserve original mesh after BVH creation */
        PRESERVE_ORIGINAL: true,
    },

    /**
     * Material and Rendering Settings
     */
    RENDERING: {
        /** Default material properties for BVH mesh */
        MATERIAL: {
            /** Default wireframe state */
            WIREFRAME: false,
            
            /** Default opacity for mesh */
            OPACITY: 1.0,
            
            /** Whether material is transparent */
            TRANSPARENT: false,
            
            /** Default mesh color */
            COLOR: '#ffdbb3',
            
            /** Wireframe line width */
            WIREFRAME_LINE_WIDTH: 1.0,
        },
        
        /** Mesh visibility settings */
        VISIBILITY: {
            /** Initial visibility state */
            VISIBLE: true,
            
            /** Whether to cast shadows */
            CAST_SHADOW: true,
            
            /** Whether to receive shadows */
            RECEIVE_SHADOW: true,
        },
    },

    /**
     * Performance and Optimization
     */
    PERFORMANCE: {
        /** Whether to use geometry instancing when possible */
        USE_INSTANCING: false,
        
        /** Maximum vertices before LOD reduction */
        MAX_VERTICES_BEFORE_LOD: 50000,
        
        /** Geometry update buffer time (ms) */
        GEOMETRY_UPDATE_DEBOUNCE: 16.67, // ~60fps
    },

    /**
     * Debug and Development
     */
    DEBUG: {
        /** Show BVH tree visualization */
        SHOW_BVH_TREE: false,
        
        /** Log BVH construction performance */
        LOG_PERFORMANCE: false,
        
        /** Show geometry bounds */
        SHOW_BOUNDS: false,
        
        /** Color for BVH tree visualization */
        BVH_TREE_COLOR: '#ff0000',
        
        /** Color for geometry bounds */
        BOUNDS_COLOR: '#00ff00',
    },
} as const;

/**
 * Type definitions for BVH configuration
 */
export type BVHSplitStrategy = typeof BVH_CONFIG.TREE.SPLIT_STRATEGY;
export type BVHMaterialConfig = typeof BVH_CONFIG.RENDERING.MATERIAL;
export type BVHVisibilityConfig = typeof BVH_CONFIG.RENDERING.VISIBILITY;