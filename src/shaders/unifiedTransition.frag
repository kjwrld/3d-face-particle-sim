/**
 * Unified Transition Fragment Shader
 * 
 * Handles both wireframe and particle rendering with smooth transitions
 * Combines reveal animations for seamless wireframe-to-particle effect
 */

precision highp float;

// Texture uniforms
uniform sampler2D uTexture;

// Transition uniforms
uniform float uTransitionProgress;
uniform bool uIsInstancedParticles;

// Wireframe uniforms
uniform vec3 uColor;
uniform float uOpacity;
uniform bool uWireframe;
uniform float uLineWidth;
uniform bool uEnableGlow;
uniform float uGlowIntensity;
uniform vec3 uGlowColor;
uniform bool uEnableEdgeHighlight;
uniform float uEdgeHighlightIntensity;

// Particle uniforms
uniform float uTime;
uniform float uParticleScale;
uniform float uBrightness;
uniform float uAmbientLight;

// Chroma effect uniforms
uniform bool uChromaEnabled;
uniform float uChromaIntensity;
uniform float uChromaSeparation;
uniform float uChromaStartPhase;
uniform vec3 uChromaColor1;
uniform vec3 uChromaColor2;
uniform vec3 uChromaColor3;
uniform int uChromaBlendMode; // 0=additive, 1=multiply, 2=screen, 3=overlay

// Varyings from vertex shader
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

// Utility functions
float linearStep(float edge0, float edge1, float x) {
    return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

float calculateGlow(float revealFactor, float distanceFromCamera) {
    // Create glow effect near the reveal edge
    float edgeGlow = 1.0 - abs(revealFactor - 0.5) * 2.0;
    edgeGlow = pow(edgeGlow, 3.0);
    
    // Distance-based glow falloff
    float distanceGlow = 1.0 / (1.0 + distanceFromCamera * 0.1);
    
    return edgeGlow * distanceGlow;
}

vec3 applyChromaEffect(vec3 baseColor, vec2 uvCoords, float life) {
    if (!uChromaEnabled || life < uChromaStartPhase) {
        return baseColor;
    }
    
    // Calculate chroma intensity based on lifecycle phase
    float chromaPhase = (life - uChromaStartPhase) / (1.0 - uChromaStartPhase);
    float chromaStrength = chromaPhase * uChromaIntensity;
    
    // Sample texture at different UV offsets for each brand color
    vec2 offset1 = vec2(uChromaSeparation * chromaStrength, 0.0);
    vec2 offset2 = vec2(0.0, uChromaSeparation * chromaStrength * 0.5);
    vec2 offset3 = vec2(-uChromaSeparation * chromaStrength, 0.0);
    
    // Sample texture at offset positions
    vec3 sample1 = texture2D(uTexture, uvCoords + offset1).rgb;
    vec3 sample2 = texture2D(uTexture, uvCoords + offset2).rgb;
    vec3 sample3 = texture2D(uTexture, uvCoords + offset3).rgb;
    
    // Calculate luminance for each sample to preserve detail
    float lum1 = dot(sample1, vec3(0.299, 0.587, 0.114));
    float lum2 = dot(sample2, vec3(0.299, 0.587, 0.114));
    float lum3 = dot(sample3, vec3(0.299, 0.587, 0.114));
    
    // Apply brand colors with luminance preservation
    vec3 brandLayer1 = uChromaColor1 * lum1;
    vec3 brandLayer2 = uChromaColor2 * lum2;
    vec3 brandLayer3 = uChromaColor3 * lum3;
    
    // Blend the colored layers based on blend mode
    vec3 chromaResult = baseColor;
    
    if (uChromaBlendMode == 0) {
        // Additive blending
        chromaResult = baseColor + (brandLayer1 + brandLayer2 + brandLayer3) * chromaStrength * 0.3;
    } else if (uChromaBlendMode == 1) {
        // Multiply blending
        vec3 blended = brandLayer1 * brandLayer2 * brandLayer3;
        chromaResult = mix(baseColor, baseColor * blended, chromaStrength);
    } else if (uChromaBlendMode == 2) {
        // Screen blending
        vec3 invBase = vec3(1.0) - baseColor;
        vec3 invBrand = vec3(1.0) - (brandLayer1 + brandLayer2 + brandLayer3) * 0.33;
        chromaResult = mix(baseColor, vec3(1.0) - (invBase * invBrand), chromaStrength);
    } else {
        // Overlay blending
        vec3 blended = (brandLayer1 + brandLayer2 + brandLayer3) * 0.33;
        vec3 overlay = mix(2.0 * baseColor * blended, vec3(1.0) - 2.0 * (vec3(1.0) - baseColor) * (vec3(1.0) - blended), step(0.5, baseColor));
        chromaResult = mix(baseColor, overlay, chromaStrength);
    }
    
    return chromaResult;
}

void main() {
    vec3 finalColor = vec3(1.0);
    float finalAlpha = 1.0;
    vec2 uvCoords;
    
    if (uIsInstancedParticles) {
        // PARTICLE RENDERING MODE
        
        // Early discard for particles not yet revealed
        if (vParticleRevealFactor <= 0.0) {
            discard;
        }
        
        uvCoords = vInstanceUV;
        
        // Sample the face texture
        vec3 faceColor = texture2D(uTexture, uvCoords).rgb;
        
        // Apply chroma effects if enabled
        float life = vLifeData.x;
        faceColor = applyChromaEffect(faceColor, uvCoords, life);
        
        // Calculate particle lifecycle alpha
        float alpha = 1.0;
        
        // Growing phase (0.0 to 0.25)
        if (life < 0.25) {
            alpha = linearStep(0.0, 0.25, life);
        }
        // Stable phase (0.25 to 0.75)
        else if (life < 0.75) {
            alpha = 1.0;
        }
        // Shrinking phase (0.75 to 1.0)
        else {
            alpha = 1.0 - linearStep(0.75, 1.0, life);
        }
        
        // Enhanced lighting calculation
        vec3 lightDirection = normalize(vec3(0.0, 1.0, 1.0));
        float lightIntensity = max(dot(vNormal, lightDirection), uAmbientLight);
        
        // Apply lighting and brightness to face color
        finalColor = faceColor * lightIntensity * uBrightness;
        
        // Apply particle reveal factor (particles appear top-to-bottom)
        finalAlpha = alpha * vParticleRevealFactor;
        
        // Apply transition mix (fade in during transition)
        finalAlpha *= vTransitionMix;
        
        // Add subtle transition glow effect
        if (vParticleRevealFactor > 0.1 && vParticleRevealFactor < 0.9) {
            float transitionGlow = calculateGlow(vParticleRevealFactor, vDistanceFromCamera);
            finalColor += uGlowColor * transitionGlow * 0.3;
        }
        
    } else {
        // WIREFRAME RENDERING MODE
        
        // Early discard for wireframe not yet revealed
        if (vRevealFactor <= 0.0) {
            discard;
        }
        
        uvCoords = vUV;
        
        // Base wireframe color
        finalColor = uColor;
        finalAlpha = uOpacity;
        
        // Apply reveal factor to opacity
        finalAlpha *= vRevealFactor;
        
        // Wireframe-specific rendering
        if (uWireframe) {
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
        finalAlpha *= pulse;
        
        // Apply transition mix (fade out during transition)
        finalAlpha *= vTransitionMix;
        
        // Final alpha based on reveal factor with smooth fade
        finalAlpha *= smoothstep(0.0, 0.1, vRevealFactor);
    }
    
    // Cross-fade enhancement during transition overlap
    if (uTransitionProgress > 0.3 && uTransitionProgress < 0.8) {
        float crossFadeIntensity = 1.0 - abs(uTransitionProgress - 0.55) * 4.0; // Peak at 0.55
        finalColor += uGlowColor * crossFadeIntensity * 0.2;
    }
    
    // Ensure minimum visibility for debugging
    finalAlpha = max(finalAlpha, 0.0);
    
    gl_FragColor = vec4(finalColor, finalAlpha);
}