/**
 * Particle System Utility Functions
 * Core utility functions for particle system operations
 */

import { Vector3, Color, MathUtils } from 'three';
import { ParticleQualityLevel, ParticleLifecyclePhase } from '../types/particleTypes';
import type { 
    ParticleSystemConfig, 
    WebGLCapabilities,
    ParticleLifeCycle,
    ProximityInfluence,
    ParticleData
} from '../types/particleTypes';
import { PARTICLE_SYSTEM_CONFIG, WEBGL_REQUIREMENTS } from '../config/particleConstants';

/**
 * Device and platform detection utilities
 */
export class DeviceDetection {
    /**
     * Detect if the current device is mobile
     */
    static isMobileDevice(): boolean {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'tablet'];
        
        return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
               window.innerWidth < 768 ||
               ('ontouchstart' in window);
    }

    /**
     * Detect if device has limited memory
     */
    static hasLimitedMemory(): boolean {
        // @ts-ignore - navigator.deviceMemory is experimental
        const deviceMemory = navigator.deviceMemory;
        return deviceMemory ? deviceMemory < 4 : this.isMobileDevice();
    }

    /**
     * Get recommended quality level based on device capabilities
     */
    static getRecommendedQualityLevel(): ParticleQualityLevel {
        if (this.hasLimitedMemory()) {
            return ParticleQualityLevel.LOW;
        } else if (this.isMobileDevice()) {
            return ParticleQualityLevel.MEDIUM;
        } else {
            return ParticleQualityLevel.HIGH;
        }
    }
}

/**
 * Particle count calculation utilities
 */
export class ParticleCountCalculator {
    /**
     * Calculate particle count based on device capabilities
     */
    static calculateParticleCount(qualityLevel?: ParticleQualityLevel): number {
        const isMobile = DeviceDetection.isMobileDevice();
        const baseCount = isMobile 
            ? PARTICLE_SYSTEM_CONFIG.SIMULATION.PARTICLE_COUNT.MOBILE
            : PARTICLE_SYSTEM_CONFIG.SIMULATION.PARTICLE_COUNT.DESKTOP;

        const level = qualityLevel || DeviceDetection.getRecommendedQualityLevel();

        const multipliers = {
            [ParticleQualityLevel.LOW]: 0.25,
            [ParticleQualityLevel.MEDIUM]: 0.5,
            [ParticleQualityLevel.HIGH]: 1.0,
            [ParticleQualityLevel.ULTRA]: 1.5,
        };

        return Math.floor(baseCount * multipliers[level]);
    }

    /**
     * Calculate texture size for GPU simulation based on particle count
     */
    static calculateTextureSize(particleCount: number): number {
        const size = Math.ceil(Math.sqrt(particleCount));
        // Ensure power of 2 for better GPU performance
        return Math.pow(2, Math.ceil(Math.log2(size)));
    }

    /**
     * Get emissive particle indices
     */
    static getEmissiveParticleIndices(particleCount: number): number[] {
        const emissiveCount = Math.min(
            PARTICLE_SYSTEM_CONFIG.SIMULATION.EMISSIVE_COUNT,
            particleCount
        );
        
        return Array.from({ length: emissiveCount }, (_, i) => i);
    }
}

/**
 * WebGL capability detection and validation
 */
export class WebGLCapabilityChecker {
    /**
     * Check WebGL capabilities and requirements
     */
    static checkCapabilities(canvas?: HTMLCanvasElement): WebGLCapabilities {
        const testCanvas = canvas || document.createElement('canvas');
        const gl = (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

        if (!gl) {
            return {
                isSupported: false,
                version: 0,
                maxTextureSize: 0,
                supportedExtensions: [],
                missingExtensions: WEBGL_REQUIREMENTS.REQUIRED_EXTENSIONS.slice(),
                canUseFloatTextures: false,
                canUseMultipleRenderTargets: false,
            };
        }

        const supportedExtensions = gl.getSupportedExtensions() || [];
        const missingExtensions = WEBGL_REQUIREMENTS.REQUIRED_EXTENSIONS.filter(
            ext => !supportedExtensions.includes(ext)
        );

        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        const canUseFloatTextures = supportedExtensions.includes('OES_texture_float');
        const canUseMultipleRenderTargets = supportedExtensions.includes('WEBGL_draw_buffers');

        return {
            isSupported: missingExtensions.length === 0 && maxTextureSize >= WEBGL_REQUIREMENTS.MIN_MAX_TEXTURE_SIZE,
            version: 1.0,
            maxTextureSize,
            supportedExtensions,
            missingExtensions,
            canUseFloatTextures,
            canUseMultipleRenderTargets,
        };
    }

    /**
     * Check if GPU simulation is supported
     */
    static canUseGPUSimulation(capabilities?: WebGLCapabilities): boolean {
        const caps = capabilities || this.checkCapabilities();
        return caps.canUseFloatTextures && caps.canUseMultipleRenderTargets;
    }
}

/**
 * Particle data generation utilities
 */
export class ParticleDataGenerator {
    /**
     * Generate initial particle positions in spherical distribution
     */
    static generateSphericalDistribution(count: number, radius: number = 1.0): Vector3[] {
        const positions: Vector3[] = [];

        for (let i = 0; i < count; i++) {
            // Use cubic root for even distribution in sphere volume
            const r = radius * Math.cbrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            positions.push(new Vector3(x, y, z));
        }

        return positions;
    }

    /**
     * Generate initial particle data array
     */
    static generateInitialParticleData(
        positions: Vector3[],
        emissiveIndices: number[]
    ): ParticleData[] {
        return positions.map((position, index) => ({
            position: position.clone(),
            velocity: new Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            ),
            life: Math.random(),
            maxLife: 1.0 + Math.random() * 2.0,
            scale: 1.0,
            isEmissive: emissiveIndices.includes(index),
            emissiveIntensity: emissiveIndices.includes(index) ? 1.0 : 0.0,
            proximityInfluence: 0.0,
        }));
    }

    /**
     * Convert particle data to texture-ready format
     */
    static particleDataToTextureData(particles: ParticleData[]): {
        positionData: Float32Array;
        velocityData: Float32Array;
    } {
        const positionData = new Float32Array(particles.length * 4);
        const velocityData = new Float32Array(particles.length * 4);

        particles.forEach((particle, i) => {
            const i4 = i * 4;
            
            // Position + life
            positionData[i4] = particle.position.x;
            positionData[i4 + 1] = particle.position.y;
            positionData[i4 + 2] = particle.position.z;
            positionData[i4 + 3] = particle.life;

            // Velocity + maxLife
            velocityData[i4] = particle.velocity.x;
            velocityData[i4 + 1] = particle.velocity.y;
            velocityData[i4 + 2] = particle.velocity.z;
            velocityData[i4 + 3] = particle.maxLife;
        });

        return { positionData, velocityData };
    }
}

/**
 * Particle lifecycle utilities
 */
export class ParticleLifecycleUtils {
    /**
     * Calculate lifecycle phase from normalized life value
     */
    static getLifecyclePhase(normalizedLife: number): ParticleLifecyclePhase {
        const phases = PARTICLE_SYSTEM_CONFIG.LIFECYCLE.PHASES;

        if (normalizedLife <= phases.GROW_END) {
            return ParticleLifecyclePhase.GROWING;
        } else if (normalizedLife <= phases.SHRINK_START) {
            return ParticleLifecyclePhase.STABLE;
        } else if (normalizedLife < phases.SHRINK_END) {
            return ParticleLifecyclePhase.SHRINKING;
        } else {
            return ParticleLifecyclePhase.DEAD;
        }
    }

    /**
     * Calculate complete lifecycle state
     */
    static calculateLifecycleState(normalizedLife: number): ParticleLifeCycle {
        const phase = this.getLifecyclePhase(normalizedLife);
        const phases = PARTICLE_SYSTEM_CONFIG.LIFECYCLE.PHASES;
        
        let phaseProgress = 0;
        let scaleMultiplier = 1;

        switch (phase) {
            case ParticleLifecyclePhase.GROWING:
                phaseProgress = normalizedLife / phases.GROW_END;
                scaleMultiplier = MathUtils.smoothstep(0, 1, phaseProgress);
                break;
                
            case ParticleLifecyclePhase.STABLE:
                phaseProgress = (normalizedLife - phases.GROW_END) / (phases.SHRINK_START - phases.GROW_END);
                scaleMultiplier = 1.0;
                break;
                
            case ParticleLifecyclePhase.SHRINKING:
                phaseProgress = (normalizedLife - phases.SHRINK_START) / (phases.SHRINK_END - phases.SHRINK_START);
                scaleMultiplier = MathUtils.smoothstep(1, 0, phaseProgress);
                break;
                
            case ParticleLifecyclePhase.DEAD:
                phaseProgress = 1.0;
                scaleMultiplier = 0.0;
                break;
        }

        return {
            phase,
            normalizedLife,
            scaleMultiplier,
            alphaMultiplier: scaleMultiplier, // Same as scale for now
            phaseProgress,
        };
    }
}

/**
 * Proximity calculation utilities
 */
export class ProximityCalculator {
    /**
     * Calculate proximity influence between particles
     */
    static calculateProximityInfluence(
        particlePosition: Vector3,
        emissivePositions: Vector3[],
        influenceRadius: number = PARTICLE_SYSTEM_CONFIG.PROXIMITY.INFLUENCE_RADIUS
    ): ProximityInfluence[] {
        return emissivePositions.map((emissivePos, index) => {
            const distance = particlePosition.distanceTo(emissivePos);
            const normalizedDistance = Math.min(distance / influenceRadius, 1.0);
            
            // Calculate influence using smooth falloff
            const influence = Math.max(0, 1.0 - normalizedDistance * normalizedDistance);
            const glowIntensity = influence * PARTICLE_SYSTEM_CONFIG.PROXIMITY.GLOW_INTENSITY.MAX;

            return {
                distance,
                influence,
                glowIntensity,
                emissiveParticleIndex: index,
            };
        });
    }

    /**
     * Get the strongest proximity influence
     */
    static getStrongestInfluence(influences: ProximityInfluence[]): ProximityInfluence | null {
        if (influences.length === 0) return null;
        
        return influences.reduce((strongest, current) => 
            current.influence > strongest.influence ? current : strongest
        );
    }
}

/**
 * Color utilities for particles
 */
export class ParticleColorUtils {
    /**
     * Interpolate between two colors based on influence
     */
    static interpolateColors(baseColor: Color, targetColor: Color, factor: number): Color {
        const result = baseColor.clone();
        result.lerp(targetColor, MathUtils.clamp(factor, 0, 1));
        return result;
    }

    /**
     * Sample texture color at UV coordinates (fallback implementation)
     */
    static sampleTextureAtUV(imageData: ImageData, u: number, v: number): Color {
        const x = Math.max(0, Math.min(imageData.width - 1, Math.floor(u * imageData.width)));
        const y = Math.max(0, Math.min(imageData.height - 1, Math.floor((1 - v) * imageData.height)));
        
        const index = (y * imageData.width + x) * 4;
        const r = imageData.data[index] / 255;
        const g = imageData.data[index + 1] / 255;
        const b = imageData.data[index + 2] / 255;
        
        return new Color(r, g, b);
    }

    /**
     * Convert hex color string to Color object
     */
    static hexToColor(hex: string): Color {
        return new Color(hex);
    }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
    private static frameCount = 0;
    private static lastTime = 0;
    private static frameRate = 0;

    /**
     * Update frame rate calculation
     */
    static updateFrameRate(): number {
        const currentTime = performance.now();
        this.frameCount++;

        if (currentTime - this.lastTime >= 1000) {
            this.frameRate = this.frameCount;
            this.frameCount = 0;
            this.lastTime = currentTime;
        }

        return this.frameRate;
    }

    /**
     * Get current frame rate
     */
    static getFrameRate(): number {
        return this.frameRate;
    }

    /**
     * Check if performance is adequate
     */
    static isPerformanceAdequate(targetFPS: number = 30): boolean {
        return this.frameRate >= targetFPS;
    }
}

/**
 * Mathematical utilities for particle calculations
 */
export class ParticleMathUtils {
    /**
     * Linear interpolation with clamping
     */
    static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * MathUtils.clamp(t, 0, 1);
    }

    /**
     * Smooth step function
     */
    static smoothStep(edge0: number, edge1: number, x: number): number {
        const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    }

    /**
     * Remap value from one range to another
     */
    static remap(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
        const normalized = (value - fromMin) / (fromMax - fromMin);
        return toMin + normalized * (toMax - toMin);
    }

    /**
     * Generate random value with normal distribution
     */
    static randomNormal(mean: number = 0, stdDev: number = 1): number {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return z0 * stdDev + mean;
    }
}

/**
 * Configuration validation utilities
 */
export class ConfigValidator {
    /**
     * Validate particle system configuration
     */
    static validateConfig(config: Partial<ParticleSystemConfig>): string[] {
        const errors: string[] = [];

        if (config.particleCount !== undefined) {
            if (config.particleCount < 1) {
                errors.push('Particle count must be greater than 0');
            }
            if (config.particleCount > 1000000) {
                errors.push('Particle count too high (max: 1,000,000)');
            }
        }

        if (config.emissiveCount !== undefined) {
            if (config.emissiveCount < 0) {
                errors.push('Emissive count cannot be negative');
            }
            if (config.particleCount && config.emissiveCount > config.particleCount) {
                errors.push('Emissive count cannot exceed total particle count');
            }
        }

        if (config.baseScale !== undefined) {
            if (config.baseScale <= 0) {
                errors.push('Base scale must be greater than 0');
            }
        }

        return errors;
    }

    /**
     * Sanitize configuration values
     */
    static sanitizeConfig(config: Partial<ParticleSystemConfig>): ParticleSystemConfig {
        const defaults = {
            particleCount: ParticleCountCalculator.calculateParticleCount(),
            emissiveCount: PARTICLE_SYSTEM_CONFIG.SIMULATION.EMISSIVE_COUNT,
            sphereSegments: {
                width: PARTICLE_SYSTEM_CONFIG.RENDERING.SPHERE_SEGMENTS.WIDTH,
                height: PARTICLE_SYSTEM_CONFIG.RENDERING.SPHERE_SEGMENTS.HEIGHT,
            },
            baseScale: PARTICLE_SYSTEM_CONFIG.RENDERING.SCALE.BASE,
            animationSpeed: 1.0,
            enableGPUSimulation: WebGLCapabilityChecker.canUseGPUSimulation(),
            enableProximityEffects: true,
            qualityLevel: DeviceDetection.getRecommendedQualityLevel(),
        };

        return {
            ...defaults,
            ...config,
            particleCount: Math.max(1, Math.min(1000000, config.particleCount || defaults.particleCount)),
            emissiveCount: Math.max(0, Math.min(config.particleCount || defaults.particleCount, config.emissiveCount || defaults.emissiveCount)),
            baseScale: Math.max(0.001, config.baseScale || defaults.baseScale),
            animationSpeed: Math.max(0, config.animationSpeed || defaults.animationSpeed),
        };
    }
}