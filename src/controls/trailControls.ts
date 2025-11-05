import { useControls } from "leva";

export function useTrailControls() {
    return useControls("Vertical Trails", {
        // Enable/Disable
        trailsEnabled: {
            value: true,
            label: "Enable Trails",
        },

        // Performance Controls
        trailCount: {
            value: 15,
            step: 5,
            min: 0,
            max: 150,
            label: "Trail Count",
        },

        // Animation Controls
        trailSpeed: {
            value: 1.5,
            step: 0.05,
            min: 1.0,
            max: 2.0,
            label: "Trail Speed",
        },
        trailHeight: {
            value: 1.8,
            step: 0.1,
            min: 1.0,
            max: 8.0,
            label: "Trail Height Range",
        },

        // Lifecycle Controls
        maxLifespan: {
            value: 1,
            step: 0.5,
            min: 0.5,
            max: 10,
            label: "Max Trail Lifespan",
        },

        // Visual Controls
        trailIntensity: {
            value: 0.8,
            step: 0.1,
            min: 0.1,
            max: 2.0,
            label: "Trail Opacity",
        },

        // Colors (defaulted to white)
        trailColor1: {
            value: "#ffffff",
            label: "Trail Color",
        },
        trailColor2: {
            value: "#ffffff",
            label: "Trail Color 2 (unused)",
        },
        trailColor3: {
            value: "#ffffff",
            label: "Trail Color 3 (unused)",
        },

        // Positioning
        trailRadius: {
            value: 1.3,
            step: 0.1,
            min: 0.5,
            max: 3.0,
            label: "Distance from Face",
        },
    });
}
