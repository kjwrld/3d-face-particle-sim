/**
 * Environment Map Loader for Image-Based Lighting
 * Handles loading and processing of HDR environment maps
 */

import { 
    CubeTextureLoader, 
    EquirectangularReflectionMapping, 
    TextureLoader,
    DataTexture,
    RGBFormat,
    FloatType,
    CubeTexture,
    Texture
} from 'three';

export type EnvironmentPreset = 'studio' | 'outdoor' | 'dramatic' | 'soft';

/**
 * Environment map data structure
 */
export interface EnvironmentMap {
    texture: CubeTexture | Texture;
    name: string;
    preset: EnvironmentPreset;
    intensity: number;
}

/**
 * Environment loader class
 */
export class EnvironmentLoader {
    private static cubeLoader = new CubeTextureLoader();
    private static textureLoader = new TextureLoader();
    private static cache = new Map<string, EnvironmentMap>();

    /**
     * Load a cube environment map from 6 separate images
     */
    static async loadCubeEnvironment(
        urls: [string, string, string, string, string, string],
        preset: EnvironmentPreset = 'studio'
    ): Promise<EnvironmentMap> {
        const cacheKey = urls.join('|');
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        return new Promise((resolve, reject) => {
            this.cubeLoader.load(
                urls,
                (texture) => {
                    const envMap: EnvironmentMap = {
                        texture,
                        name: `Cube Environment (${preset})`,
                        preset,
                        intensity: 1.0
                    };
                    
                    this.cache.set(cacheKey, envMap);
                    resolve(envMap);
                },
                undefined,
                reject
            );
        });
    }

    /**
     * Load an equirectangular environment map
     */
    static async loadEquirectangularEnvironment(
        url: string,
        preset: EnvironmentPreset = 'studio'
    ): Promise<EnvironmentMap> {
        const cacheKey = `equirect_${url}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                url,
                (texture) => {
                    texture.mapping = EquirectangularReflectionMapping;
                    
                    const envMap: EnvironmentMap = {
                        texture,
                        name: `Equirectangular Environment (${preset})`,
                        preset,
                        intensity: 1.0
                    };
                    
                    this.cache.set(cacheKey, envMap);
                    resolve(envMap);
                },
                undefined,
                reject
            );
        });
    }

    /**
     * Create a simple procedural environment for testing
     */
    static createProceduralEnvironment(preset: EnvironmentPreset = 'studio'): EnvironmentMap {
        const cacheKey = `procedural_${preset}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        // Create a simple gradient environment
        const size = 64;
        const data = new Float32Array(size * size * 3);
        
        // Define colors based on preset
        const presetColors = {
            studio: {
                top: [0.9, 0.9, 0.95],
                middle: [0.8, 0.8, 0.85],
                bottom: [0.7, 0.7, 0.75]
            },
            outdoor: {
                top: [0.5, 0.7, 1.0],
                middle: [0.8, 0.9, 1.0],
                bottom: [0.3, 0.5, 0.3]
            },
            dramatic: {
                top: [0.2, 0.1, 0.1],
                middle: [0.4, 0.2, 0.1],
                bottom: [0.1, 0.05, 0.05]
            },
            soft: {
                top: [1.0, 0.95, 0.9],
                middle: [0.95, 0.9, 0.85],
                bottom: [0.9, 0.85, 0.8]
            }
        };

        const colors = presetColors[preset];

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const index = (i * size + j) * 3;
                
                // Create vertical gradient
                const t = i / size; // 0 to 1 from top to bottom
                
                let color;
                if (t < 0.5) {
                    // Interpolate between top and middle
                    const factor = t * 2;
                    color = [
                        colors.top[0] + (colors.middle[0] - colors.top[0]) * factor,
                        colors.top[1] + (colors.middle[1] - colors.top[1]) * factor,
                        colors.top[2] + (colors.middle[2] - colors.top[2]) * factor,
                    ];
                } else {
                    // Interpolate between middle and bottom
                    const factor = (t - 0.5) * 2;
                    color = [
                        colors.middle[0] + (colors.bottom[0] - colors.middle[0]) * factor,
                        colors.middle[1] + (colors.bottom[1] - colors.middle[1]) * factor,
                        colors.middle[2] + (colors.bottom[2] - colors.middle[2]) * factor,
                    ];
                }
                
                data[index] = color[0];
                data[index + 1] = color[1];
                data[index + 2] = color[2];
            }
        }

        const texture = new DataTexture(data, size, size, RGBFormat, FloatType);
        texture.mapping = EquirectangularReflectionMapping;
        texture.needsUpdate = true;

        const envMap: EnvironmentMap = {
            texture,
            name: `Procedural ${preset.charAt(0).toUpperCase() + preset.slice(1)}`,
            preset,
            intensity: 1.0
        };

        this.cache.set(cacheKey, envMap);
        return envMap;
    }

    /**
     * Get all available environment presets
     */
    static getAvailablePresets(): EnvironmentPreset[] {
        return ['studio', 'outdoor', 'dramatic', 'soft'];
    }

    /**
     * Clear the cache
     */
    static clearCache(): void {
        // Dispose of textures
        this.cache.forEach(envMap => {
            if (envMap.texture.dispose) {
                envMap.texture.dispose();
            }
        });
        this.cache.clear();
    }
}