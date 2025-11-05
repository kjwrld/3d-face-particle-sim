export const PARTICLE_SYSTEM_CONFIG = {
    // Default to triangles since that's what we're using
    particleSystem: "triangles" as "triangles" | "modern" | "legacy",

    // Model transform (from Leva controls)
    position: [0, 0, 0] as [number, number, number],
    rotation: [0.15, 0, 0] as [number, number, number],

    // Particle properties (from Leva controls)
    particleScale: 0.012,
    animationSpeed: 3.0,
    brightness: 2.1,
    ambientLight: 0.7,
    particleDensity: 3.0,
    surfaceSampling: 84,

    // Animation controls (from Leva controls)
    animationMode: "sine_wave" as
        | "sine_wave"
        | "noise_drift"
        | "spiral_vortex"
        | "wave_propagation",
    animationIntensity: 0.02,
    animationFrequency: 1.0,

    // Mouse rotation (from Leva controls)
    mouseRotationEnabled: true,
    rotationSensitivity: 0.2,
    rotationEasing: 0.08,

    // Chroma effects (from Leva controls)
    chromaEnabled: true,
    chromaIntensity: 2.0,
    chromaSeparation: 0.01,
    chromaStartPhase: 0.7,
    chromaColor1: "#e900ff",
    chromaColor2: "#00ffec",
    chromaColor3: "#ffffff",
    chromaBlendMode: "additive" as
        | "additive"
        | "multiply"
        | "screen"
        | "overlay",

    // Background (from Leva controls)
    // backgroundColor: "#f1eee7",
    // backgroundColor: "#101010",
    backgroundColor: "#d5d5d5",

    // === Original nested configuration structures ===

    // Simulation Configuration
    SIMULATION: {
        TEXTURE_SIZE: {
            DESKTOP: 256,
            MOBILE: 128,
        },
        PARTICLE_COUNT: {
            DESKTOP: 256 * 256, // 65,536 particles
            MOBILE: 128 * 128, // 16,384 particles
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

    // Surface sampling configuration
    SURFACE_SAMPLING: {
        SAMPLES_PER_TRIANGLE: 64,
        MIN_SAMPLES: 12,
        AREA_MULTIPLIER: 1000,
        EDGE_SAMPLES_PER_EDGE: 5,
        EDGE_INTERPOLATION_DIVISOR: 6,
        BACK_FACE_CULLING_THRESHOLD: -0.3,
        FALLBACK_UV: { u: 0.5, v: 0.5 },
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
