uniform sampler2D uTexture;

varying vec2 vUv;

void main() {
    // Sample the face texture at UV coordinates
    vec3 faceColor = texture2D(uTexture, vUv).rgb;
    
    gl_FragColor = vec4(faceColor, 1.0);
}