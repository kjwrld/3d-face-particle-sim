/**
 * Unified Transition Vertex Shader
 * 
 * Combines wireframe reveal and particle systems for smooth transitions
 * Supports both wireframe mesh rendering and instanced particle rendering
 */

// Instance attributes (for particles)
attribute vec2 instanceUV;
attribute vec4 instanceLifeData; // life, maxLife, isEmissive, scale
attribute vec3 positionFlip; // Triangle-specific (for triangle particles)

// Transition uniforms
uniform float uTransitionProgress; // 0.0 = wireframe only, 1.0 = particles only
uniform float uRevealHeight;
uniform float uFadeZone;
uniform float uModelHeight;
uniform float uModelBottom;
uniform bool uIsDisappearing;
uniform bool uIsInstancedParticles; // true for particles, false for wireframe
uniform float uParticleRevealOffset; // Controls when particles start appearing relative to wireframe

// Animation uniforms
uniform float uTime;
uniform float uParticleScale;
uniform float uAnimationSpeed;
uniform float uFlipRatio;
uniform bool uUseTriangles;

// Varyings to fragment shader
varying vec2 vUV;
varying vec2 vInstanceUV;
varying vec4 vLifeData;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vRevealFactor;
varying float vParticleRevealFactor;
varying float vDistanceFromCamera;
varying float vTransitionMix;

void main() {
    vec3 vertexPosition = position;
    vec2 uvCoords = uv;
    
    if (uIsInstancedParticles) {
        // PARTICLE MODE: Use instanced rendering
        vInstanceUV = instanceUV;
        vLifeData = instanceLifeData;
        
        // For triangles, interpolate between position and positionFlip
        if (uUseTriangles) {
            vertexPosition = mix(position, positionFlip, uFlipRatio);
        }
        
        // Transform vertex position with instance matrix
        vec4 instancedPos = instanceMatrix * vec4(vertexPosition, 1.0);
        vec4 worldPosition = modelMatrix * instancedPos;
        
        // Calculate particle reveal factor based on world position
        float relativeHeight = (worldPosition.y - uModelBottom) / (uModelHeight - uModelBottom);
        
        // Particles appear during wireframe disappear phase
        // uTransitionProgress: 0.0 = wireframe phase, 1.0 = particle phase
        float particleStartThreshold = 0.3; // Start appearing when wireframe is 70% through disappear
        float particleRevealProgress = (uTransitionProgress - particleStartThreshold) / (1.0 - particleStartThreshold);
        particleRevealProgress = clamp(particleRevealProgress, 0.0, 1.0);
        
        // Top-to-bottom particle reveal (same direction as wireframe disappear)
        float topDownThreshold = 1.0 - particleRevealProgress;
        vParticleRevealFactor = smoothstep(topDownThreshold - uFadeZone * 0.5, topDownThreshold + uFadeZone * 0.5, relativeHeight);
        
        // Calculate view position for lighting
        vec4 mvPosition = modelViewMatrix * instancedPos;
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
        
    } else {
        // WIREFRAME MODE: Use regular mesh rendering
        vec4 worldPosition = modelMatrix * vec4(vertexPosition, 1.0);
        vWorldPosition = worldPosition.xyz;
        uvCoords = uv;
        
        // Calculate wireframe reveal factor
        float relativeHeight = (worldPosition.y - uModelBottom) / (uModelHeight - uModelBottom);
        float revealThreshold = uRevealHeight;
        float fadeZoneHalf = uFadeZone * 0.5;
        
        if (uIsDisappearing) {
            // DISAPPEAR: Top-to-bottom disappear
            vRevealFactor = 1.0 - smoothstep(revealThreshold - fadeZoneHalf, revealThreshold + fadeZoneHalf, relativeHeight);
        } else {
            // REVEAL: Top-to-bottom reveal
            float topDownThreshold = 1.0 - revealThreshold;
            vRevealFactor = smoothstep(topDownThreshold - fadeZoneHalf, topDownThreshold + fadeZoneHalf, relativeHeight);
        }
        
        vParticleRevealFactor = 0.0; // No particle reveal in wireframe mode
        
        // Calculate view position
        vec4 mvPosition = modelViewMatrix * worldPosition;
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
    }
    
    // Shared calculations
    vUV = uvCoords;
    vNormal = normalize(normalMatrix * normal);
    
    // Calculate distance from camera
    vDistanceFromCamera = length(vViewPosition);
    
    // Calculate transition mix factor
    // This determines how much wireframe vs particle to show
    if (uIsInstancedParticles) {
        // For particles: fade in during transition
        vTransitionMix = uTransitionProgress;
    } else {
        // For wireframe: fade out during transition
        vTransitionMix = 1.0 - uTransitionProgress;
    }
}