import { useState, memo, Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TriangleParticles } from "./components/TriangleParticles";
import { BVHFaceMesh } from "./components/BVHFaceMesh";
import { SimpleFaceLighting } from "./components/SimpleFaceLighting";
import { SimpleEnvironment } from "./components/SimpleEnvironment";
import { VerticalTrails } from "./components/VerticalTrails";
import { useTrailControls } from "./controls/trailControls";
import { Vector3 } from "three";
import "./App.css";

const FaceModel = memo(() => {
    return (
        <Suspense fallback={null}>
            <TriangleParticles />
            {/* BVH Face Mesh for testing - positioned slightly behind particles */}
            <BVHFaceMesh 
                position={[0, 0, -0.1]}
                wireframe={true}
                color="#00ff88"
                opacity={0.3}
                transparent={true}
            />
        </Suspense>
    );
});

const Controls = memo(() => (
    <OrbitControls
        enableRotate={false}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.05}
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
    // Trail controls
    const {
        trailsEnabled,
        trailCount,
        trailSpeed,
        trailHeight,
        trailIntensity,
        maxLifespan,
        trailColor1,
        trailColor2,
        trailColor3,
        trailRadius,
        tubeRadius,
        tubeSegments,
        tubeSmoothness,
    } = useTrailControls();

    // Force trail initialization after mount - multiple attempts
    const [kickstart, setKickstart] = useState(0);
    useEffect(() => {
        let attempt = 0;
        const maxAttempts = 5;
        
        const tryKickstart = () => {
            attempt++;
            setKickstart(attempt * 0.001); // Increment slightly each time
            
            if (attempt < maxAttempts) {
                setTimeout(tryKickstart, 200); // Try again after 200ms
            }
        };
        
        const timer = setTimeout(tryKickstart, 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <SimpleFaceLighting preset={lightingPreset} />
            <SimpleEnvironment preset={environmentPreset} />
            <FaceModel />
            <VerticalTrails
                facePosition={new Vector3(0, 0, 0)}
                faceScale={trailRadius}
                trailsEnabled={trailsEnabled}
                trailCount={trailCount}
                trailSpeed={trailSpeed + kickstart}
                trailHeight={trailHeight}
                trailIntensity={trailIntensity}
                maxLifespan={maxLifespan}
                trailColors={{
                    color1: trailColor1,
                    color2: trailColor2,
                    color3: trailColor3,
                }}
                tubeRadius={tubeRadius}
                tubeSegments={tubeSegments}
                tubeSmoothness={tubeSmoothness}
            />
            <Controls />
        </>
    );
}

function App() {
    const [lightingPreset, setLightingPreset] = useState<
        "portrait" | "studio" | "dramatic" | "natural"
    >("natural");
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
