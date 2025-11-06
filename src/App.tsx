import { useState, memo, Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TriangleParticles } from "./components/TriangleParticles";
import { BVHFaceMesh } from "./components/BVHFaceMesh";
import { SimpleFaceLighting } from "./components/SimpleFaceLighting";
import { SimpleEnvironment } from "./components/SimpleEnvironment";
import { VerticalTrails } from "./components/VerticalTrails";
import { ToneMappingPass } from "./components/ToneMappingPass";
import { useTrailControls } from "./controls/trailControls";
import { useControls, Leva } from "leva";
import { Vector3 } from "three";
import "./App.css";

const FaceModel = memo(({ onRevealComplete }: { onRevealComplete: () => void }) => {
    return (
        <Suspense fallback={null}>
            {/* Particle reveal prototype - shader-based reveal animation */}
            <TriangleParticles onRevealComplete={onRevealComplete} />
            
            {/* Wireframe animation - commented out for prototype */}
            {/* <BVHFaceMesh 
                position={[0, 0, -0.1]}
                wireframe={true}
                color="#ffffff"
                opacity={0.8}
                transparent={true}
                useAnimatedReveal={true}
                autoStartReveal={true}
                revealDuration={2.0}
                revealLoop={true}
            /> */}
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
    const [showTrails, setShowTrails] = useState(false);

    // Simple timer to start trails after 3 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowTrails(true);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    // Tone mapping controls (not collapsed by default)
    const toneMappingControls = useControls('Tone Mapping', {
        toneMappingEnabled: {
            value: true,
            label: 'Enable Tone Mapping',
        },
        acesPreMultiply: {
            value: 1.0,
            min: 0.1,
            max: 2.0,
            step: 0.05,
            label: 'ACES Pre-Multiply',
        },
        gammaPower: {
            value: 1.3,
            min: 1.0,
            max: 3.0,
            step: 0.1,
            label: 'Gamma Power',
        },
    });

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

    // Force trail initialization when trails should show - multiple attempts
    const [kickstart, setKickstart] = useState(0);
    useEffect(() => {
        if (!showTrails) return; // Only kickstart when trails should be visible
        
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
    }, [showTrails]);

    return (
        <>
            <SimpleFaceLighting preset={lightingPreset} />
            <SimpleEnvironment preset={environmentPreset} />
            <FaceModel onRevealComplete={() => {}} />
            <VerticalTrails
                facePosition={new Vector3(0, 0, 0)}
                faceScale={trailRadius}
                trailsEnabled={showTrails && trailsEnabled}
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

            {/* Scene-wide tone mapping post-processing */}
            {toneMappingControls.toneMappingEnabled && (
                <ToneMappingPass
                    acesPreMultiply={toneMappingControls.acesPreMultiply}
                    gammaPower={toneMappingControls.gammaPower}
                />
            )}
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
        <>
            <Leva hidden={true} />
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
        </>
    );
}

export default App;
