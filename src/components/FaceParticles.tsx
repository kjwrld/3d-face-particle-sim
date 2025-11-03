import { useRef, useEffect, useState } from "react";
import {
    BufferGeometry,
    Points,
    Vector3,
    BufferAttribute,
    Color,
    CanvasTexture,
    Mesh,
    Material,
    MeshStandardMaterial,
} from "three";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getDracoLoader } from "../utils/loaders";

export function FaceParticles() {
    const pointsRef = useRef<Points>(null);
    const [vertices, setVertices] = useState<Vector3[]>([]);

    // Load the GLTF model with Draco compression
    const gltf = useLoader(GLTFLoader, "/models/kj_face.glb", (loader) => {
        loader.setDRACOLoader(getDracoLoader());
    });

    useEffect(() => {
        if (gltf && pointsRef.current) {
            console.log("GLTF loaded, extracting vertices...");

            const extractedVertices: Vector3[] = [];
            const extractedColors: Color[] = [];

            // Cache canvas for reuse
            let cachedCanvas: HTMLCanvasElement | null = null;
            let cachedCtx: CanvasRenderingContext2D | null = null;

            // Sample texture color at UV coordinates
            const sampleTextureAtUV = (
                texture: any,
                u: number,
                v: number
            ): Color => {
                if (!texture || !texture.image) {
                    return new Color(0xffdbb3);
                }

                try {
                    // Reuse canvas instead of creating new one each time
                    if (!cachedCanvas) {
                        cachedCanvas = document.createElement("canvas");
                        cachedCtx = cachedCanvas.getContext("2d");
                        if (!cachedCtx) return new Color(0xffdbb3);

                        const img = texture.image;
                        cachedCanvas.width = img.width;
                        cachedCanvas.height = img.height;
                        cachedCtx.drawImage(img, 0, 0);
                    }

                    // Clamp UV coordinates and convert to pixel coordinates
                    const img = texture.image;
                    const x = Math.max(
                        0,
                        Math.min(img.width - 1, Math.floor(u * img.width))
                    );
                    const y = Math.max(
                        0,
                        Math.min(
                            img.height - 1,
                            Math.floor((1 - v) * img.height)
                        )
                    );

                    const imageData = cachedCtx!.getImageData(x, y, 1, 1);
                    const pixel = imageData.data;

                    return new Color(
                        pixel[0] / 255,
                        pixel[1] / 255,
                        pixel[2] / 255
                    );
                } catch (error) {
                    console.warn("Texture sampling failed:", error);
                    return new Color(0xffdbb3);
                }
            };

            // Traverse and extract vertices with texture colors
            gltf.scene.traverse((child: any) => {
                if (child.isMesh && child.geometry) {
                    const positionAttribute =
                        child.geometry.attributes.position;
                    const uvAttribute = child.geometry.attributes.uv;
                    const texture = child.material?.map;

                    if (positionAttribute) {
                        const positions = positionAttribute.array;
                        const uvs = uvAttribute?.array;

                        // Sample vertices (existing points)
                        for (let i = 0; i < positions.length; i += 3) {
                            const vertex = new Vector3(
                                positions[i],
                                positions[i + 1],
                                positions[i + 2]
                            );

                            let color = new Color(0xffdbb3); // Default

                            // If we have UVs and texture, sample the actual texture color
                            if (uvs && texture && texture.image) {
                                const uvIndex = (i / 3) * 2;
                                if (uvIndex + 1 < uvs.length) {
                                    const u = uvs[uvIndex];
                                    const v = uvs[uvIndex + 1];
                                    color = sampleTextureAtUV(texture, u, v);
                                }
                            }

                            extractedVertices.push(vertex);
                            extractedColors.push(color);
                        }

                        // Add extra surface sampling for more density
                        for (let i = 0; i < positions.length - 9; i += 9) { // Every triangle
                            // Get triangle vertices
                            const v1 = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
                            const v2 = new Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
                            const v3 = new Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);

                            // Sample 3 points inside this triangle
                            for (let j = 0; j < 3; j++) {
                                const r1 = Math.random();
                                const r2 = Math.random();
                                
                                // Barycentric coordinates
                                const a = 1 - Math.sqrt(r1);
                                const b = Math.sqrt(r1) * (1 - r2);
                                const c = Math.sqrt(r1) * r2;
                                
                                // Interpolated position
                                const sampledVertex = new Vector3()
                                    .copy(v1).multiplyScalar(a)
                                    .add(v2.clone().multiplyScalar(b))
                                    .add(v3.clone().multiplyScalar(c));

                                // Interpolated UV for color sampling
                                let color = new Color(0xffdbb3);
                                if (uvs && texture && texture.image) {
                                    const uv1Index = (i / 3) * 2;
                                    const uv2Index = ((i + 3) / 3) * 2;
                                    const uv3Index = ((i + 6) / 3) * 2;
                                    
                                    if (uv3Index + 1 < uvs.length) {
                                        const u = a * uvs[uv1Index] + b * uvs[uv2Index] + c * uvs[uv3Index];
                                        const v = a * uvs[uv1Index + 1] + b * uvs[uv2Index + 1] + c * uvs[uv3Index + 1];
                                        color = sampleTextureAtUV(texture, u, v);
                                    }
                                }

                                extractedVertices.push(sampledVertex);
                                extractedColors.push(color);
                            }
                        }
                    }
                }
            });

            if (extractedVertices.length > 0) {
                setVertices(extractedVertices);

                // Create geometry with colors
                const geometry = new BufferGeometry();
                const positions = new Float32Array(
                    extractedVertices.length * 3
                );
                const colors = new Float32Array(extractedVertices.length * 3);

                extractedVertices.forEach((vertex, index) => {
                    positions[index * 3] = vertex.x;
                    positions[index * 3 + 1] = vertex.y;
                    positions[index * 3 + 2] = vertex.z;

                    colors[index * 3] = extractedColors[index].r;
                    colors[index * 3 + 1] = extractedColors[index].g;
                    colors[index * 3 + 2] = extractedColors[index].b;
                });

                geometry.setAttribute(
                    "position",
                    new BufferAttribute(positions, 3)
                );
                geometry.setAttribute("color", new BufferAttribute(colors, 3));

                // Update the points geometry
                if (pointsRef.current) {
                    if (pointsRef.current.geometry) {
                        pointsRef.current.geometry.dispose();
                    }
                    pointsRef.current.geometry = geometry;
                }

                console.log("Face particles created!");
            }
        }
    }, [gltf]);

    return (
        <points ref={pointsRef} position={[0, 0, 0]}>
            <bufferGeometry />
            <pointsMaterial
                vertexColors={true}
                size={0.015}
                sizeAttenuation={true}
                alphaTest={0.1}
            />
        </points>
    );
}
