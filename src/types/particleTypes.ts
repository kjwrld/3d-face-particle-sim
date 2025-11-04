/**
 * TypeScript Type Definitions for Particle System
 * Comprehensive type definitions for all particle-related interfaces and types
 */

import { Vector3, Color, Texture, WebGLRenderTarget, ShaderMaterial } from 'three';

/**
 * Core particle system state interface
 */
export interface ParticleSystemState {
    isInitialized: boolean;
    particleCount: number;
    emissiveParticleIndices: number[];
    currentSimulationTarget: number;
    lastUpdateTime: number;
    animationSpeed: number;
}

/**
 * Individual particle data structure
 */
export interface ParticleData {
    position: Vector3;
    velocity: Vector3;
    life: number;
    maxLife: number;
    scale: number;
    isEmissive: boolean;
    emissiveIntensity: number;
    proximityInfluence: number;
}

/**
 * Particle lifecycle phase enumeration
 */
export enum ParticleLifecyclePhase {
    GROWING = 'growing',
    STABLE = 'stable',
    SHRINKING = 'shrinking',
    DEAD = 'dead',
}

/**
 * Particle lifecycle state
 */
export interface ParticleLifeCycle {
    phase: ParticleLifecyclePhase;
    normalizedLife: number; // 0.0 to 1.0
    scaleMultiplier: number;
    alphaMultiplier: number;
    phaseProgress: number; // Progress within current phase (0.0 to 1.0)
}

/**
 * GPU simulation uniforms interface
 */
export interface SimulationUniforms {
    // Time-based uniforms
    uTime: { value: number };
    uDeltaTime: { value: number };
    uTimeScale: { value: number };
    
    // Simulation parameters
    uSimulationSpeed: { value: number };
    uNoiseScale: { value: number };
    uNoiseAmplitude: { value: number };
    uTurbulenceStrength: { value: number };
    
    // Particle properties
    uParticleCount: { value: number };
    uEmissiveCount: { value: number };
    uBaseScale: { value: number };
    uEmissiveScale: { value: number };
    
    // Proximity & influence
    uProximityRadius: { value: number };
    uAttenuationSoft: { value: number };
    uAttenuationMid: { value: number };
    uAttenuationHard: { value: number };
    
    // Lifecycle
    uGrowPhaseEnd: { value: number };
    uShrinkPhaseStart: { value: number };
    
    // Textures
    uPositionTexture: { value: Texture | null };
    uVelocityTexture: { value: Texture | null };
    uPreviousPositionTexture: { value: Texture | null };
    
    // Colors
    uBaseColor: { value: Color };
    uEmissiveColor: { value: Color };
}

/**
 * Particle rendering uniforms
 */
export interface RenderingUniforms extends SimulationUniforms {
    // Camera and matrices
    uViewMatrix: { value: Float32Array };
    uProjectionMatrix: { value: Float32Array };
    uModelViewMatrix: { value: Float32Array };
    uNormalMatrix: { value: Float32Array };
    
    // Lighting
    uLightDirection: { value: Vector3 };
    uLightColor: { value: Color };
    uAmbientLight: { value: Color };
    
    // Material properties
    uMetalness: { value: number };
    uRoughness: { value: number };
    uEmissiveIntensity: { value: number };
    
    // Face texture (for our specific use case)
    uFaceTexture: { value: Texture | null };
    
    // Screen-space properties
    uResolution: { value: Vector3 };
    uPixelRatio: { value: number };
}

/**
 * Particle system configuration interface
 */
export interface ParticleSystemConfig {
    particleCount: number;
    emissiveCount: number;
    sphereSegments: { width: number; height: number };
    baseScale: number;
    animationSpeed: number;
    enableGPUSimulation: boolean;
    enableProximityEffects: boolean;
    qualityLevel: ParticleQualityLevel;
}

/**
 * Quality level enumeration
 */
export enum ParticleQualityLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    ULTRA = 'ultra',
}

/**
 * Performance metrics interface
 */
export interface ParticlePerformanceMetrics {
    frameRate: number;
    averageFrameTime: number;
    simulationTime: number;
    renderTime: number;
    memoryUsage: number;
    particlesRendered: number;
    culledParticles: number;
}

/**
 * GPU simulation targets interface
 */
export interface GPUSimulationTargets {
    positionTargets: [WebGLRenderTarget, WebGLRenderTarget];
    velocityTargets: [WebGLRenderTarget, WebGLRenderTarget];
    currentIndex: number;
    textureSize: number;
}

/**
 * Emissive particle configuration
 */
export interface EmissiveParticleConfig {
    indices: number[];
    color: Color;
    intensity: number;
    scale: number;
    influenceRadius: number;
}

/**
 * Proximity influence calculation result
 */
export interface ProximityInfluence {
    distance: number;
    influence: number;
    glowIntensity: number;
    emissiveParticleIndex: number;
}

/**
 * Noise configuration for particle animation
 */
export interface NoiseConfig {
    octaves: number;
    frequency: number;
    amplitude: number;
    lacunarity: number;
    persistence: number;
    seed: number;
}

/**
 * Particle material configuration
 */
export interface ParticleMaterialConfig {
    baseColor: Color;
    emissiveColor: Color;
    metalness: number;
    roughness: number;
    opacity: number;
    transparent: boolean;
    vertexColors: boolean;
}

/**
 * LOD (Level of Detail) configuration
 */
export interface ParticleLODConfig {
    distances: {
        high: number;
        medium: number;
        low: number;
    };
    particleCounts: {
        high: number;
        medium: number;
        low: number;
    };
    qualitySettings: {
        high: ParticleQualityLevel;
        medium: ParticleQualityLevel;
        low: ParticleQualityLevel;
    };
}

/**
 * Animation state interface
 */
export interface ParticleAnimationState {
    isPlaying: boolean;
    isPaused: boolean;
    speed: number;
    currentTime: number;
    loopCount: number;
    direction: 'forward' | 'reverse' | 'pingpong';
}

/**
 * WebGL capability check result
 */
export interface WebGLCapabilities {
    isSupported: boolean;
    version: number;
    maxTextureSize: number;
    supportedExtensions: string[];
    missingExtensions: string[];
    canUseFloatTextures: boolean;
    canUseMultipleRenderTargets: boolean;
}

/**
 * Particle preset interface for saving/loading configurations
 */
export interface ParticlePreset {
    name: string;
    description: string;
    config: ParticleSystemConfig;
    materialConfig: ParticleMaterialConfig;
    animationConfig: NoiseConfig;
    version: string;
    createdAt: Date;
}

/**
 * Event interfaces for particle system
 */
export interface ParticleSystemEvents {
    onInitialized: (state: ParticleSystemState) => void;
    onParticleSpawned: (particle: ParticleData) => void;
    onParticleDied: (particle: ParticleData) => void;
    onPerformanceUpdate: (metrics: ParticlePerformanceMetrics) => void;
    onError: (error: Error) => void;
}

/**
 * Utility type for partial updates
 */
export type PartialParticleConfig = Partial<ParticleSystemConfig>;
export type PartialMaterialConfig = Partial<ParticleMaterialConfig>;
export type PartialAnimationConfig = Partial<NoiseConfig>;

/**
 * Face-specific particle data (for our face model use case)
 */
export interface FaceParticleData extends ParticleData {
    uvCoordinate: { u: number; v: number };
    faceRegion: 'eye' | 'nose' | 'mouth' | 'cheek' | 'forehead' | 'chin' | 'other';
    skinTone: Color;
    originalVertexIndex: number;
}

/**
 * Export all types for easy importing
 */
export type {
    Vector3 as ThreeVector3,
    Color as ThreeColor,
    Texture as ThreeTexture,
    WebGLRenderTarget as ThreeWebGLRenderTarget,
    ShaderMaterial as ThreeShaderMaterial,
};