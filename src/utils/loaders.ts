import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let dracoLoader: DRACOLoader | null = null;
let gltfLoader: GLTFLoader | null = null;

export function getDracoLoader(): DRACOLoader {
    if (!dracoLoader) {
        dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("/draco/");
        dracoLoader.preload();
    }
    return dracoLoader;
}

export function getGLTFLoader(): GLTFLoader {
    if (!gltfLoader) {
        gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(getDracoLoader());
    }
    return gltfLoader;
}

export function disposeLoaders() {
    if (dracoLoader) {
        dracoLoader.dispose();
        dracoLoader = null;
    }
    gltfLoader = null;
}
