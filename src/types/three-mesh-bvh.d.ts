import { MeshBVH } from 'three-mesh-bvh';

declare module 'three' {
  interface BufferGeometry {
    boundsTree?: MeshBVH;
    computeBoundsTree(options?: {
      maxLeafTris?: number;
      strategy?: number;
      verbose?: boolean;
    }): void;
    disposeBoundsTree(): void;
  }

  interface Mesh {
    raycast: (raycaster: Raycaster, intersects: Intersection[]) => void;
  }
}