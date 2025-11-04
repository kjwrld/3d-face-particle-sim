import { InstancedSphereParticles } from "./InstancedSphereParticles";

/**
 * Modern Sphere Particles Component
 * Wrapper for the new instanced sphere particle system
 * This represents the evolution towards LudoGL-style particles
 */
export function ModernSphereParticles() {
    return <InstancedSphereParticles defaultMode="spheres" />;
}