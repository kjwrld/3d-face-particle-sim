import { getGLTFLoader } from './loaders'
import type { Group } from 'three'

interface GLTF {
  scene: Group
  scenes: Group[]
  animations: any[]
  cameras: any[]
  asset: any
  parser: any
  userData: any
}

const modelCache = new Map<string, GLTF>()
const loadingPromises = new Map<string, Promise<GLTF>>()

export async function loadModel(url: string): Promise<GLTF> {
  if (modelCache.has(url)) {
    return modelCache.get(url)!
  }

  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!
  }

  const loader = getGLTFLoader()
  const promise = new Promise<GLTF>((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        modelCache.set(url, gltf)
        loadingPromises.delete(url)
        resolve(gltf)
      },
      undefined,
      (error) => {
        loadingPromises.delete(url)
        reject(error)
      }
    )
  })

  loadingPromises.set(url, promise)
  return promise
}

export function preloadModel(url: string): Promise<GLTF> {
  return loadModel(url)
}

export function clearModelCache() {
  modelCache.clear()
  loadingPromises.clear()
}

export function getModelFromCache(url: string): GLTF | null {
  return modelCache.get(url) || null
}