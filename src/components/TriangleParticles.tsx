import { InstancedSphereParticles } from "./InstancedSphereParticles";

/**
 * Triangle Particles Component
 * Wrapper for the instanced particle system in triangle mode
 * This uses The Spirit-inspired triangle particles with flipping animation
 */
export function TriangleParticles() {
    return <InstancedSphereParticles defaultMode="triangles" />;
}