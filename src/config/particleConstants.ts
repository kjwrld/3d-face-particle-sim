/**
 * Particle System Configuration Constants
 * Centralized configuration for all particle system parameters
 */

export const PARTICLE_SYSTEM_CONFIG = {
    // Simulation Configuration
    SIMULATION: {
        TEXTURE_SIZE: {
            DESKTOP: 256,
            MOBILE: 128,
        },
        PARTICLE_COUNT: {
            DESKTOP: 256 * 256, // 65,536 particles
            MOBILE: 128 * 128,  // 16,384 particles
        },
        EMISSIVE_COUNT: 4,
        TIME_SCALE: {
            BASE: 0.25,
            AMPLITUDE: 3.0,
        },
    },

    // Rendering Configuration
    RENDERING: {
        SPHERE_SEGMENTS: {
            WIDTH: 8,
            HEIGHT: 8,
        },
        SCALE: {
            BASE: 0.03,
            EMISSIVE_MULTIPLIER: 1.5,
            MOBILE_MULTIPLIER: 1.5,
        },
        POINT_SIZE: {
            DEFAULT: 5.0,
            MIN: 1.0,
            MAX: 20.0,
        },
    },

    // Particle Lifecycle
    LIFECYCLE: {
        PHASES: {
            GROW_START: 0.0,
            GROW_END: 0.25,
            STABLE_START: 0.25,
            STABLE_END: 0.75,
            SHRINK_START: 0.75,
            SHRINK_END: 1.0,
        },
        SCALE_CURVES: {
            GROW_FACTOR: 1.0,
            STABLE_FACTOR: 1.0,
            SHRINK_FACTOR: 0.0,
        },
    },

    // Animation Parameters
    ANIMATION: {
        NOISE: {
            OCTAVES: 4,
            FREQUENCY: 0.01,
            AMPLITUDE: 1.0,
            LACUNARITY: 2.0,
            PERSISTENCE: 0.5,
        },
        MOTION: {
            SPEED_MULTIPLIER: 1.0,
            TURBULENCE_STRENGTH: 0.5,
            FLOW_DIRECTION: [0, 1, 0] as const,
        },
    },

    // Proximity & Lighting
    PROXIMITY: {
        INFLUENCE_RADIUS: 2.0,
        ATTENUATION: {
            SOFT: 1.0,
            MID: 2.0,
            HARD: 4.0,
        },
        GLOW_INTENSITY: {
            MIN: 0.0,
            MAX: 2.0,
        },
    },

    // Performance Thresholds
    PERFORMANCE: {
        MOBILE_DETECTION: {
            MAX_TEXTURE_SIZE: 2048,
            MIN_WEBGL_VERSION: 1.0,
        },
        LOD_DISTANCES: {
            HIGH: 5.0,
            MEDIUM: 15.0,
            LOW: 30.0,
        },
        CULLING: {
            BACK_FACE_THRESHOLD: -0.3,
            FRUSTUM_MARGIN: 1.2,
        },
    },

    // Material Properties
    MATERIAL: {
        PBR: {
            METALNESS: {
                DEFAULT: 0.1,
                EMISSIVE: 0.8,
                RANGE: [0.0, 1.0] as const,
            },
            ROUGHNESS: {
                DEFAULT: 0.4,
                EMISSIVE: 0.2,
                RANGE: [0.0, 1.0] as const,
            },
        },
        COLORS: {
            DEFAULT: "#ffdbb3",
            EMISSIVE: "#bb0000",
            FALLBACK: "#808080",
        },
    },

    // GPU Simulation
    GPU_SIMULATION: {
        BUFFER_FORMAT: {
            POSITION_LIFE: "RGBA32F",
            VELOCITY_LIFE: "RGBA32F",
        },
        PING_PONG_TARGETS: 2,
        CLEAR_COLOR: [0, 0, 0, 0] as const,
    },

    // Debug & Development
    DEBUG: {
        SHOW_WIREFRAME: false,
        SHOW_EMISSIVE_MARKERS: false,
        LOG_PERFORMANCE: false,
        PARTICLE_COUNT_DISPLAY: true,
    },
} as const;

/**
 * Derived constants calculated from base configuration
 */
export const DERIVED_CONSTANTS = {
    get TOTAL_EMISSIVE_PARTICLES() {
        return PARTICLE_SYSTEM_CONFIG.SIMULATION.EMISSIVE_COUNT;
    },
    
    get DESKTOP_PARTICLE_COUNT() {
        return PARTICLE_SYSTEM_CONFIG.SIMULATION.PARTICLE_COUNT.DESKTOP;
    },
    
    get MOBILE_PARTICLE_COUNT() {
        return PARTICLE_SYSTEM_CONFIG.SIMULATION.PARTICLE_COUNT.MOBILE;
    },
    
    get SPHERE_VERTEX_COUNT() {
        const { WIDTH, HEIGHT } = PARTICLE_SYSTEM_CONFIG.RENDERING.SPHERE_SEGMENTS;
        return (WIDTH + 1) * (HEIGHT + 1);
    },
    
    get LIFECYCLE_GROW_DURATION() {
        const { GROW_START, GROW_END } = PARTICLE_SYSTEM_CONFIG.LIFECYCLE.PHASES;
        return GROW_END - GROW_START;
    },
    
    get LIFECYCLE_SHRINK_DURATION() {
        const { SHRINK_START, SHRINK_END } = PARTICLE_SYSTEM_CONFIG.LIFECYCLE.PHASES;
        return SHRINK_END - SHRINK_START;
    },
} as const;

/**
 * Environment-specific configuration
 */
export const ENVIRONMENT_CONFIG = {
    DEVELOPMENT: {
        ENABLE_DEBUG: true,
        SHOW_PERFORMANCE_STATS: true,
        ENABLE_HOT_RELOAD: true,
    },
    PRODUCTION: {
        ENABLE_DEBUG: false,
        SHOW_PERFORMANCE_STATS: false,
        ENABLE_HOT_RELOAD: false,
    },
} as const;

/**
 * WebGL capability requirements
 */
export const WEBGL_REQUIREMENTS = {
    MIN_VERSION: 1.0,
    REQUIRED_EXTENSIONS: [
        'OES_texture_float',
        'WEBGL_draw_buffers',
    ] as const,
    OPTIONAL_EXTENSIONS: [
        'EXT_color_buffer_float',
        'OES_texture_float_linear',
        'WEBGL_color_buffer_float',
    ] as const,
    MIN_TEXTURE_SIZE: 512,
    MIN_MAX_TEXTURE_SIZE: 2048,
} as const;