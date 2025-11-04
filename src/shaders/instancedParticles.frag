// Instanced Sphere Particles Fragment Shader

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform float uParticleScale;
uniform float uAnimationSpeed;

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
    
    // Basic lighting calculation
    vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
    float lightIntensity = max(dot(vNormal, lightDirection), 0.2); // Min ambient
    
    // Apply lighting to face color
    vec3 litColor = faceColor * lightIntensity;
    
    // Emissive particles glow
    if (isEmissive > 0.5) {
        vec3 emissiveColor = vec3(0.8, 0.1, 0.1); // Red glow
        float emissiveStrength = 0.5 + 0.3 * sin(uTime * 2.0 + life * 10.0);
        litColor += emissiveColor * emissiveStrength;
        alpha = max(alpha, 0.8); // Emissive particles stay more visible
    }
    
    // Apply alpha fade
    gl_FragColor = vec4(litColor, alpha);
}