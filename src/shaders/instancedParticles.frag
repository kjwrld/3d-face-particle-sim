// Instanced Sphere Particles Fragment Shader

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform float uParticleScale;
uniform float uAnimationSpeed;
uniform float uBrightness;
uniform float uAmbientLight;

// Varyings from vertex shader
varying vec2 vInstanceUV;
varying vec4 vLifeData; // life, maxLife, isEmissive, scale
varying vec3 vNormal;
varying vec3 vViewPosition;

// Utility functions
float linearStep(float edge0, float edge1, float x) {
    return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

void main() {
    // Sample the face texture at UV coordinates
    vec3 faceColor = texture2D(uTexture, vInstanceUV).rgb;
    
    // Extract life data
    float life = vLifeData.x;
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
    
    // Apply alpha fade
    gl_FragColor = vec4(litColor, alpha);
}