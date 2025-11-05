import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

enum MovementDirection {
    UP = 'up',
    LEFT = 'left',
    RIGHT = 'right'
}

interface TrailActorProps {
    facePosition: THREE.Vector3;
    faceRadius: number;
    speed: number;
    trailColors: {
        color1: string;
        color2: string;
        color3: string;
    };
    trailIntensity: number;
    maxLifespan: number;
    trailHeight: number;
}

function TrailActor({ facePosition, faceRadius, speed, trailColors, trailIntensity, maxLifespan, trailHeight }: TrailActorProps) {
    const trailRef = useRef<THREE.BufferGeometry>(null);
    
    const MAX_TRAIL_LENGTH = 12;
    
    const state = useRef((() => {
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * faceRadius;
        const z = Math.sin(angle) * faceRadius;
        const y = -2 + Math.random() * (trailHeight + 2); // Random height throughout entire range
        const position = new THREE.Vector3(x, y, z).add(facePosition);
        return {
            currentPosition: position,
            trail: [] as THREE.Vector3[], // Start with empty trail
            framesSinceReset: 0, // Track frames since last reset
            lastDirection: MovementDirection.UP,
            stepsSinceLastTurn: 0,
            minStepsBeforeNextTurn: 2 + Math.floor(Math.random() * 3), // 2-4 steps before can turn again
            lastMoveTime: 0, // Track when we last moved
            horizontalMovesRemaining: 0, // Track remaining horizontal moves
            life: 0,
            maxLife: maxLifespan * (0.5 + Math.random() * 0.5), // 50-100% of maxLifespan
            isDead: false,
        };
    })());

    // Force initialization on mount and when speed changes
    useEffect(() => {
        // Reset and force immediate start
        state.current.framesSinceReset = 0;
        state.current.trail = [state.current.currentPosition.clone()];
        
        // Force a render by updating the geometry if it exists
        if (trailRef.current) {
            const positions = new Float32Array([
                state.current.currentPosition.x,
                state.current.currentPosition.y,
                state.current.currentPosition.z,
                state.current.currentPosition.x,
                state.current.currentPosition.y + 0.01,
                state.current.currentPosition.z
            ]);
            trailRef.current.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        }
    }, [speed]);

    useFrame(() => {
        const { trail } = state.current;
        
        // Increment frames since reset
        state.current.framesSinceReset++;
        
        // Update life (much slower rate)
        state.current.life += speed * 0.01;
        if (state.current.life >= state.current.maxLife) {
            state.current.isDead = true;
        }
        
        // Handle death and respawn
        if (state.current.isDead) {
            const angle = Math.random() * Math.PI * 2;
            const x = Math.cos(angle) * faceRadius;
            const z = Math.sin(angle) * faceRadius;
            const y = -2 + Math.random() * (trailHeight + 2); // Random height throughout entire range
            const newPosition = new THREE.Vector3(x, y, z).add(facePosition);
            state.current.currentPosition = newPosition;
            state.current.trail = [];
            state.current.framesSinceReset = 0;
            state.current.lastDirection = MovementDirection.UP;
            state.current.stepsSinceLastTurn = 0;
            state.current.minStepsBeforeNextTurn = 2 + Math.floor(Math.random() * 3);
            state.current.horizontalMovesRemaining = 0;
            state.current.life = 0;
            state.current.maxLife = maxLifespan * (0.5 + Math.random() * 0.5);
            state.current.isDead = false;
            return;
        }
        
        // Simple frame-based speed control
        if (state.current.framesSinceReset % Math.ceil(60 / (speed * 10)) !== 0) {
            return; // Skip frames based on speed
        }
        
        // Decide next movement direction
        let nextDirection = MovementDirection.UP; // Default: always move up
        
        // If we still have horizontal moves remaining, continue in that direction
        if (state.current.horizontalMovesRemaining > 0) {
            nextDirection = state.current.lastDirection;
            state.current.horizontalMovesRemaining--;
        }
        // Can only start turning left/right if:
        // 1. Last direction was UP
        // 2. Enough steps have passed since last turn
        // 3. Random chance (30% - increased from 20%)
        else if (state.current.lastDirection === MovementDirection.UP && 
            state.current.stepsSinceLastTurn >= state.current.minStepsBeforeNextTurn &&
            Math.random() < 0.3) {
            
            // Randomly choose left or right and set to move 2 times
            nextDirection = Math.random() < 0.5 ? MovementDirection.LEFT : MovementDirection.RIGHT;
            state.current.horizontalMovesRemaining = 1; // Will move 2 times total (this move + 1 more)
            state.current.stepsSinceLastTurn = 0;
            state.current.minStepsBeforeNextTurn = 2 + Math.floor(Math.random() * 3);
        } else {
            // Default: move UP
            nextDirection = MovementDirection.UP;
            state.current.stepsSinceLastTurn++;
        }
        
        // Calculate next position based on direction
        const stepSize = 0.1; // Keep step size constant for proper 90° turns
        const nextPosition = state.current.currentPosition.clone();
        
        switch (nextDirection) {
            case MovementDirection.UP:
                nextPosition.y += stepSize;
                break;
            case MovementDirection.LEFT:
                // Move left around the cylinder
                const currentAngle = Math.atan2(nextPosition.z - facePosition.z, nextPosition.x - facePosition.x);
                const newAngleLeft = currentAngle + stepSize / faceRadius;
                nextPosition.x = facePosition.x + Math.cos(newAngleLeft) * faceRadius;
                nextPosition.z = facePosition.z + Math.sin(newAngleLeft) * faceRadius;
                break;
            case MovementDirection.RIGHT:
                // Move right around the cylinder
                const currentAngleR = Math.atan2(nextPosition.z - facePosition.z, nextPosition.x - facePosition.x);
                const newAngleRight = currentAngleR - stepSize / faceRadius;
                nextPosition.x = facePosition.x + Math.cos(newAngleRight) * faceRadius;
                nextPosition.z = facePosition.z + Math.sin(newAngleRight) * faceRadius;
                break;
        }
        
        state.current.currentPosition = nextPosition;
        state.current.lastDirection = nextDirection;
        
        // Optional: Kill trail if it goes too high (backup death condition)
        if (state.current.currentPosition.y > facePosition.y + trailHeight + 1) {
            state.current.isDead = true;
            return;
        }
        
        // Always build trail (no delay)
        trail.push(state.current.currentPosition.clone());
        if (trail.length > MAX_TRAIL_LENGTH) trail.shift();
        
        // Update trail geometry
        if (trailRef.current && trail.length >= 2) {
            const positions = new Float32Array(
                trail.flatMap((vec) => [vec.x, vec.y, vec.z])
            );
            
            trailRef.current.setAttribute(
                "position",
                new THREE.BufferAttribute(positions, 3)
            );
            
            const colors = new Float32Array(
                trail.flatMap((_, i) => {
                    const alpha = (1 - i / trail.length) * trailIntensity;
                    return [1, 1, 1, alpha]; // White with fading alpha
                })
            );
            
            trailRef.current.setAttribute(
                "color",
                new THREE.BufferAttribute(colors, 4)
            );
        }
    });

    // Don't render if trail too short
    if (state.current.trail.length < 2) {
        return null;
    }

    return (
        <line>
            <bufferGeometry ref={trailRef} />
            <lineBasicMaterial
                color="white"
                transparent
                opacity={trailIntensity}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </line>
    );
}

interface VerticalTrailsProps {
    facePosition: THREE.Vector3;
    faceScale: number;
    trailsEnabled: boolean;
    trailCount: number;
    trailSpeed: number;
    trailHeight: number;
    trailIntensity: number;
    maxLifespan: number;
    trailColors: {
        color1: string;
        color2: string;
        color3: string;
    };
}

export function VerticalTrails({
    facePosition,
    faceScale,
    trailsEnabled,
    trailCount,
    trailSpeed,
    trailHeight,
    trailIntensity,
    maxLifespan,
    trailColors,
}: VerticalTrailsProps) {

    if (!trailsEnabled) return null;

    return (
        <group>
            {Array.from({ length: trailCount }).map((_, i) => (
                <TrailActor
                    key={i}
                    facePosition={facePosition}
                    faceRadius={faceScale}
                    speed={trailSpeed}
                    trailColors={trailColors}
                    trailIntensity={trailIntensity}
                    maxLifespan={maxLifespan}
                    trailHeight={trailHeight}
                />
            ))}
        </group>
    );
}