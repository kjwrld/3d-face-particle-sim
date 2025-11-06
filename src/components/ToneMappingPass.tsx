import { useEffect, useRef, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import {
    WebGLRenderTarget,
    ShaderMaterial,
    PlaneGeometry,
    Mesh,
    Scene,
    OrthographicCamera,
    LinearFilter,
    RGBAFormat,
} from "three";

const toneMappingShader = {
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uAcesPreMultiply;
        uniform float uGammaPower;
        varying vec2 vUv;

        // ACES constants
        const float ACES_A = 2.51;
        const float ACES_B = 0.03;
        const float ACES_C = 2.43;
        const float ACES_D = 0.59;
        const float ACES_E = 0.14;

        vec3 acesToneMapping(vec3 color, float preMultiply) {
            color = max(color, 0.0);
            color *= preMultiply;
            vec3 numerator = color * (ACES_A * color + ACES_B);
            vec3 denominator = color * (ACES_C * color + ACES_D) + ACES_E;
            return clamp(numerator / denominator, 0.0, 1.0);
        }

        vec3 gammaCorrection(vec3 color, float gammaPower) {
            return pow(color, vec3(1.0 / gammaPower));
        }

        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            vec3 color = acesToneMapping(texel.rgb, uAcesPreMultiply);
            color = gammaCorrection(color, uGammaPower);
            gl_FragColor = vec4(color, texel.a);
        }
    `,
};

interface ToneMappingPassProps {
    acesPreMultiply?: number;
    gammaPower?: number;
}

export function ToneMappingPass({
    acesPreMultiply = 0.6,
    gammaPower = 2.0,
}: ToneMappingPassProps) {
    const { gl, scene, camera, size } = useThree();

    const renderTarget = useMemo(() => {
        return new WebGLRenderTarget(size.width, size.height, {
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            format: RGBAFormat,
        });
    }, [size.width, size.height]);

    const postScene = useMemo(() => new Scene(), []);
    const postCamera = useMemo(() => new OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

    const postMaterial = useMemo(() => {
        return new ShaderMaterial({
            vertexShader: toneMappingShader.vertexShader,
            fragmentShader: toneMappingShader.fragmentShader,
            uniforms: {
                tDiffuse: { value: renderTarget.texture },
                uAcesPreMultiply: { value: acesPreMultiply },
                uGammaPower: { value: gammaPower },
            },
        });
    }, [renderTarget]);

    const postMesh = useMemo(() => {
        const mesh = new Mesh(new PlaneGeometry(2, 2), postMaterial);
        postScene.add(mesh);
        return mesh;
    }, [postScene, postMaterial]);

    // Update uniforms when props change
    useEffect(() => {
        postMaterial.uniforms.uAcesPreMultiply.value = acesPreMultiply;
        postMaterial.uniforms.uGammaPower.value = gammaPower;
    }, [postMaterial, acesPreMultiply, gammaPower]);

    useFrame(() => {
        // Render scene to render target
        gl.setRenderTarget(renderTarget);
        gl.render(scene, camera);

        // Render post-processing quad to screen
        gl.setRenderTarget(null);
        gl.render(postScene, postCamera);
    }, 1); // Priority 1 to render after everything else

    useEffect(() => {
        return () => {
            renderTarget.dispose();
            postMaterial.dispose();
            postMesh.geometry.dispose();
        };
    }, [renderTarget, postMaterial, postMesh]);

    return null;
}
