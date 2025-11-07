import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let dracoLoader: DRACOLoader | null = null;
let gltfLoader: GLTFLoader | null = null;

export function getDracoLoader(): DRACOLoader {
    if (!dracoLoader) {
        dracoLoader = new DRACOLoader();
        // Use Vite's base URL for proper path resolution in dev and production
        dracoLoader.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
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
