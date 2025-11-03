import { 
  Mesh, 
  Material, 
  MeshStandardMaterial, 
  Group, 
  BufferGeometry,
  Texture
} from 'three'

interface OptimizationOptions {
  mergeGeometries?: boolean
  reduceMaterials?: boolean
  optimizeTextures?: boolean
  enableShadows?: boolean
  frustumCulling?: boolean
}

export function optimizeModel(group: Group, options: OptimizationOptions = {}) {
  const {
    mergeGeometries = true,
    reduceMaterials = true,
    optimizeTextures = true,
    enableShadows = true,
    frustumCulling = true
  } = options

  const meshes: Mesh[] = []
  const materials = new Map<string, Material>()
  
  group.traverse((child) => {
    if (child instanceof Mesh) {
      meshes.push(child)
      
      // Enable shadows
      if (enableShadows) {
        child.castShadow = true
        child.receiveShadow = true
      }
      
      // Enable frustum culling
      if (frustumCulling) {
        child.frustumCulled = true
      }
      
      // Optimize geometry
      if (child.geometry instanceof BufferGeometry) {
        if (!child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals()
        }
        
        // Remove unnecessary attributes to save memory
        if (child.geometry.attributes.uv2) {
          child.geometry.deleteAttribute('uv2')
        }
      }
      
      // Collect materials for deduplication
      if (reduceMaterials && child.material) {
        const material = Array.isArray(child.material) ? child.material[0] : child.material
        if (material instanceof MeshStandardMaterial) {
          const key = getMaterialKey(material)
          if (!materials.has(key)) {
            materials.set(key, material)
          } else {
            child.material = materials.get(key)!
          }
        }
      }
      
      // Optimize textures
      if (optimizeTextures && child.material) {
        optimizeMaterialTextures(child.material)
      }
    }
  })
  
  console.log(`Optimized model with ${meshes.length} meshes, ${materials.size} unique materials`)
  return group
}

function getMaterialKey(material: MeshStandardMaterial): string {
  return `${material.color.getHexString()}_${material.metalness}_${material.roughness}_${material.transparent}`
}

function optimizeMaterialTextures(material: Material | Material[]) {
  const materials = Array.isArray(material) ? material : [material]
  
  materials.forEach(mat => {
    if (mat instanceof MeshStandardMaterial) {
      // Optimize texture settings
      const textures = [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap]
      
      textures.forEach(texture => {
        if (texture instanceof Texture) {
          texture.generateMipmaps = true
          texture.flipY = false // Better for GLTF models
        }
      })
    }
  })
}

export function getFaceModelOptimizations() {
  return {
    mergeGeometries: false, // Keep face parts separate for potential animation
    reduceMaterials: true,
    optimizeTextures: true,
    enableShadows: true,
    frustumCulling: true
  }
}