/**
 * Wireframe Reveal Vertex Shader
 * 
 * Passes world position to fragment shader for height-based reveal animation
 * Supports both wireframe and solid rendering modes
 */

// Note: position, normal, modelMatrix, viewMatrix, projectionMatrix, normalMatrix
// are automatically provided by Three.js - no need to redeclare them

// Reveal animation uniforms
uniform float uRevealHeight;
uniform float uFadeZone;
uniform float uModelHeight;
uniform float uModelBottom;
uniform bool uIsDisappearing;

// Varyings to pass to fragment shader
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vRevealFactor;
varying float vDistanceFromCamera;

void main() {
    // Transform position to world space
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    // Transform normal
    vNormal = normalize(normalMatrix * normal);
    
    // Calculate reveal factor based on world Y position
    float relativeHeight = (worldPosition.y - uModelBottom) / (uModelHeight - uModelBottom);
    
    // Create smooth reveal transition
    // When uRevealHeight = 0.0, nothing is visible
    // When uRevealHeight = 1.0, everything is visible
    float revealThreshold = uRevealHeight;
    float fadeZoneHalf = uFadeZone * 0.5;
    
    if (uIsDisappearing) {
        // DISAPPEAR: Top-to-bottom disappear
        // When uRevealHeight = 1.0 → all visible
        // When uRevealHeight = 0.0 → none visible  
        // Hide pixels where relativeHeight > uRevealHeight (top pixels hide first)
        vRevealFactor = 1.0 - smoothstep(revealThreshold - fadeZoneHalf, revealThreshold + fadeZoneHalf, relativeHeight);
    } else {
        // REVEAL: Top-to-bottom reveal
        // When uRevealHeight = 0.0 → none visible
        // When uRevealHeight = 1.0 → all visible
        // Show pixels where relativeHeight > (1.0 - uRevealHeight) (top pixels show first)
        float topDownThreshold = 1.0 - revealThreshold;
        vRevealFactor = smoothstep(topDownThreshold - fadeZoneHalf, topDownThreshold + fadeZoneHalf, relativeHeight);
    }
    
    // Calculate distance from camera for additional effects
    vec4 viewPosition = viewMatrix * worldPosition;
    vDistanceFromCamera = length(viewPosition.xyz);
    
    // Standard vertex transformation
    gl_Position = projectionMatrix * viewPosition;
}