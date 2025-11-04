// Instanced Sphere Particles Vertex Shader

// Instance attributes
attribute vec2 instanceUV;
attribute vec4 instanceLifeData; // life, maxLife, isEmissive, scale

// Uniforms
uniform float uTime;
uniform float uParticleScale;
uniform float uAnimationSpeed;

// Varyings to fragment shader
varying vec2 vInstanceUV;
varying vec4 vLifeData;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    // Pass instance data to fragment shader
    vInstanceUV = instanceUV;
    vLifeData = instanceLifeData;
    vNormal = normalize(normalMatrix * normal);
    
    // Transform vertex position with instance matrix
    vec4 instancePosition = instanceMatrix * vec4(position, 1.0);
    
    // Calculate view position for lighting calculations
    vec4 mvPosition = modelViewMatrix * instancePosition;
    vViewPosition = -mvPosition.xyz;
    
    // Final position
    gl_Position = projectionMatrix * mvPosition;
}