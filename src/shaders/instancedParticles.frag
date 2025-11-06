// Instanced Sphere Particles Fragment Shader

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform float uParticleScale;
uniform float uAnimationSpeed;
uniform float uBrightness;
uniform float uAmbientLight;
uniform float uMasterOpacity;

// Reveal animation uniforms
uniform float uRevealProgress;
uniform float uRevealHeight;
uniform float uFadeZone;
uniform float uModelHeight;
uniform float uModelBottom;

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
varying vec2 vInstanceUV;
varying vec4 vLifeData; // life, maxLife, isEmissive, scale
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

// Utility functions
float linearStep(float edge0, float edge1, float x) {
    return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

void main() {
    // Calculate reveal factor based on world Y position (top-to-bottom reveal)
    float relativeHeight = (vWorldPosition.y - uModelBottom) / (uModelHeight - uModelBottom);
    
    // Top-to-bottom reveal: reveal starts from top (high Y) to bottom (low Y)
    float topDownThreshold = 1.0 - uRevealProgress;
    float revealFactor = smoothstep(topDownThreshold - uFadeZone * 0.5, topDownThreshold + uFadeZone * 0.5, relativeHeight);
    
    // Early discard for particles not yet revealed
    if (revealFactor <= 0.0) {
        discard;
    }

    // Sample the face texture at UV coordinates
    vec3 faceColor = texture2D(uTexture, vInstanceUV).rgb;
    
    // Calculate if particle should have chroma effects
    float life = vLifeData.x;
    bool shouldApplyChroma = uChromaEnabled && life >= uChromaStartPhase;
    
    if (shouldApplyChroma) {
        // Calculate chroma intensity based on lifecycle phase
        float chromaPhase = (life - uChromaStartPhase) / (1.0 - uChromaStartPhase);
        float chromaStrength = chromaPhase * uChromaIntensity;
        
        // Sample texture at different UV offsets for each brand color
        vec2 offset1 = vec2(uChromaSeparation * chromaStrength, 0.0);
        vec2 offset2 = vec2(0.0, uChromaSeparation * chromaStrength * 0.5);
        vec2 offset3 = vec2(-uChromaSeparation * chromaStrength, 0.0);
        
        // Sample texture at offset positions
        vec3 sample1 = texture2D(uTexture, vInstanceUV + offset1).rgb;
        vec3 sample2 = texture2D(uTexture, vInstanceUV + offset2).rgb;
        vec3 sample3 = texture2D(uTexture, vInstanceUV + offset3).rgb;
        
        // Calculate luminance for each sample to preserve detail
        float lum1 = dot(sample1, vec3(0.299, 0.587, 0.114));
        float lum2 = dot(sample2, vec3(0.299, 0.587, 0.114));
        float lum3 = dot(sample3, vec3(0.299, 0.587, 0.114));
        
        // Apply brand colors with luminance preservation
        vec3 brandLayer1 = uChromaColor1 * lum1;
        vec3 brandLayer2 = uChromaColor2 * lum2;
        vec3 brandLayer3 = uChromaColor3 * lum3;
        
        // Blend the colored layers based on blend mode
        vec3 chromaResult = faceColor;
        
        if (uChromaBlendMode == 0) {
            // Additive blending
            chromaResult = faceColor + (brandLayer1 + brandLayer2 + brandLayer3) * chromaStrength * 0.3;
        } else if (uChromaBlendMode == 1) {
            // Multiply blending
            vec3 blended = brandLayer1 * brandLayer2 * brandLayer3;
            chromaResult = mix(faceColor, faceColor * blended, chromaStrength);
        } else if (uChromaBlendMode == 2) {
            // Screen blending
            vec3 invFace = vec3(1.0) - faceColor;
            vec3 invBrand = vec3(1.0) - (brandLayer1 + brandLayer2 + brandLayer3) * 0.33;
            chromaResult = mix(faceColor, vec3(1.0) - (invFace * invBrand), chromaStrength);
        } else {
            // Overlay blending
            vec3 blended = (brandLayer1 + brandLayer2 + brandLayer3) * 0.33;
            vec3 overlay = mix(2.0 * faceColor * blended, vec3(1.0) - 2.0 * (vec3(1.0) - faceColor) * (vec3(1.0) - blended), step(0.5, faceColor));
            chromaResult = mix(faceColor, overlay, chromaStrength);
        }
        
        faceColor = chromaResult;
    }
    
    // Extract life data (life already declared above)
    float maxLife = vLifeData.y;
    float isEmissive = vLifeData.z;
    float scale = vLifeData.w;
    
    // Calculate lifecycle alpha based on life phases
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
    
    // Enhanced lighting calculation - more centered lighting
    vec3 lightDirection = normalize(vec3(0.0, 1.0, 1.0)); // From above and front, no side bias
    float lightIntensity = max(dot(vNormal, lightDirection), uAmbientLight);
    
    // Apply lighting and brightness to face color
    vec3 litColor = faceColor * lightIntensity * uBrightness;
    
    // Apply alpha fade with master opacity and reveal factor
    gl_FragColor = vec4(litColor, alpha * uMasterOpacity * revealFactor);
}