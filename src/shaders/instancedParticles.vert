// Instanced Particles Vertex Shader (Sphere + Triangle)

// Instance attributes
attribute vec2 instanceUV;
attribute vec4 instanceLifeData; // life, maxLife, isEmissive, scale

// Triangle-specific attributes (will be undefined for spheres)
attribute vec3 positionFlip;

// Uniforms
uniform float uTime;
uniform float uParticleScale;
uniform float uAnimationSpeed;
uniform float uFlipRatio;
uniform bool uUseTriangles;

// Reveal animation uniforms
uniform float uRevealProgress;
uniform float uRevealHeight;
uniform float uFadeZone;
uniform float uModelHeight;
uniform float uModelBottom;

// Varyings to fragment shader
varying vec2 vInstanceUV;
varying vec4 vLifeData;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
    // Pass instance data to fragment shader
    vInstanceUV = instanceUV;
    vLifeData = instanceLifeData;
    vNormal = normalize(normalMatrix * normal);
    
    // Calculate base vertex position
    vec3 vertexPosition = position;
    
    // For triangles, interpolate between position and positionFlip
    if (uUseTriangles) {
        // Use positionFlip directly (it will be defined for triangle geometry)
        vertexPosition = mix(position, positionFlip, uFlipRatio);
    }
    
    // Transform vertex position with instance matrix
    vec4 instancePosition = instanceMatrix * vec4(vertexPosition, 1.0);
    
    // Calculate world position for reveal animation
    vec4 worldPosition = modelMatrix * instancePosition;
    vWorldPosition = worldPosition.xyz;
    
    // Calculate view position for lighting calculations
    vec4 mvPosition = modelViewMatrix * instancePosition;
    vViewPosition = -mvPosition.xyz;
    
    // Final position
    gl_Position = projectionMatrix * mvPosition;
}