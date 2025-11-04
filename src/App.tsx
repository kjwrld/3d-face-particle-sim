import { useState, memo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useControls } from "leva";
import { LegacyPointParticles } from "./components/LegacyPointParticles";
import { ModernSphereParticles } from "./components/ModernSphereParticles";
import { SimpleFaceLighting } from "./components/SimpleFaceLighting";
import { SimpleEnvironment } from "./components/SimpleEnvironment";
import "./App.css";

const FaceModel = memo(() => {
    const { particleSystem } = useControls("Particle System", {
        particleSystem: {
            value: "modern",
            options: {
                "Modern Spheres": "modern",
                "Legacy Points": "legacy",
            },
        },
    });

    return (
        <Suspense
            fallback={
                <mesh>
                    <sphereGeometry args={[0.5, 8, 8]} />
                    <meshStandardMaterial color="gray" wireframe />
                </mesh>
            }
        >
            {particleSystem === "modern" ? (
                <ModernSphereParticles />
            ) : (
                <LegacyPointParticles />
            )}
        </Suspense>
    );
});

const Controls = memo(() => (
    <OrbitControls
        enableDamping
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 1.8}
        minDistance={2}
        maxDistance={10}
    />
));

function Scene({
    lightingPreset,
    environmentPreset,
}: {
    lightingPreset: "portrait" | "studio" | "dramatic" | "natural";
    environmentPreset:
        | "studio"
        | "sunset"
        | "dawn"
        | "night"
        | "forest"
        | "city"
        | "apartment";
}) {
    return (
        <>
            <SimpleFaceLighting preset={lightingPreset} />
            <SimpleEnvironment preset={environmentPreset} />
            <FaceModel />
            <Controls />
        </>
    );
}

function App() {
    const [lightingPreset, setLightingPreset] = useState<
        "portrait" | "studio" | "dramatic" | "natural"
    >("portrait");
    const [environmentPreset, setEnvironmentPreset] = useState<
        "studio" | "sunset" | "dawn" | "night" | "forest" | "city" | "apartment"
    >("studio");

    return (
        <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
            <Canvas
                shadows
                camera={{ position: [0, 0, 5], fov: 50 }}
                gl={{ antialias: true, alpha: false }}
            >
                <Scene
                    lightingPreset={lightingPreset}
                    environmentPreset={environmentPreset}
                />
            </Canvas>
        </div>
    );
}

export default App;
