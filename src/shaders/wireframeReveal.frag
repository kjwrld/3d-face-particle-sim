/**
 * Wireframe Reveal Fragment Shader
 * 
 * Creates a smooth bottom-up reveal animation with fadeout edges
 * Supports both wireframe and solid rendering modes with customizable appearance
 */

// Precision declaration
precision highp float;

// Uniforms for reveal animation
uniform float uRevealHeight;
uniform float uFadeZone;
uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
uniform bool uWireframe;
uniform float uLineWidth;

// Visual effect uniforms
uniform bool uEnableGlow;
uniform float uGlowIntensity;
uniform vec3 uGlowColor;
uniform bool uEnableEdgeHighlight;
uniform float uEdgeHighlightIntensity;

// Varyings from vertex shader
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vRevealFactor;
varying float vDistanceFromCamera;

// Utility functions
float getEdgeFactor(vec3 barycentricCoords, float lineWidth) {
    vec3 d = fwidth(barycentricCoords);
    vec3 f = step(d * lineWidth, barycentricCoords);
    return min(min(f.x, f.y), f.z);
}

float calculateGlow(float revealFactor, float distanceFromCamera) {
    // Create glow effect near the reveal edge
    float edgeGlow = 1.0 - abs(revealFactor - 0.5) * 2.0;
    edgeGlow = pow(edgeGlow, 3.0);
    
    // Distance-based glow falloff
    float distanceGlow = 1.0 / (1.0 + distanceFromCamera * 0.1);
    
    return edgeGlow * distanceGlow;
}

void main() {
    // Early discard for performance - if completely above reveal height (start hidden)
    if (vRevealFactor <= 0.0) {
        discard;
    }
    
    // Base color
    vec3 finalColor = uColor;
    float finalOpacity = uOpacity;
    
    // Apply reveal factor to opacity
    finalOpacity *= vRevealFactor;
    
    // Wireframe rendering
    if (uWireframe) {
        // For wireframe, we use the built-in wireframe mode
        // but enhance it with reveal effects
        finalColor = uColor;
    } else {
        // Solid rendering with lighting
        vec3 normal = normalize(vNormal);
        vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
        
        // Simple diffuse lighting
        float diffuse = max(dot(normal, lightDirection), 0.0);
        finalColor = uColor * (0.3 + 0.7 * diffuse);
    }
    
    // Add glow effect if enabled
    if (uEnableGlow) {
        float glowAmount = calculateGlow(vRevealFactor, vDistanceFromCamera);
        vec3 glow = uGlowColor * glowAmount * uGlowIntensity;
        finalColor += glow;
    }
    
    // Add edge highlighting for reveal boundary
    if (uEnableEdgeHighlight) {
        float edgeHighlight = 1.0 - smoothstep(0.45, 0.55, vRevealFactor);
        edgeHighlight *= uEdgeHighlightIntensity;
        finalColor += vec3(edgeHighlight);
    }
    
    // Subtle animation pulse
    float pulse = sin(uTime * 2.0) * 0.1 + 0.9;
    finalOpacity *= pulse;
    
    // Final alpha based on reveal factor with smooth fade
    float alpha = finalOpacity * smoothstep(0.0, 0.1, vRevealFactor);
    
    // Ensure minimum visibility for debugging
    alpha = max(alpha, 0.05);
    
    gl_FragColor = vec4(finalColor, alpha);
}