import { useRef, useEffect, useState } from 'react'
import { Group } from 'three'
import { loadModel } from '../utils/modelCache'
import { optimizeModel, getFaceModelOptimizations } from '../utils/modelOptimizer'

interface GLTF {
  scene: Group
  scenes: Group[]
  animations: any[]
  cameras: any[]
  asset: any
  parser: any
  userData: any
}

interface OptimizedFaceModelProps {
  url: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number] | number
  onLoad?: (gltf: GLTF) => void
  onError?: (error: Error) => void
  enableOptimizations?: boolean
}

export function OptimizedFaceModel({ 
  url, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  scale = 1,
  onLoad,
  onError,
  enableOptimizations = true
}: OptimizedFaceModelProps) {
  const groupRef = useRef<Group>(null)
  const [gltf, setGltf] = useState<GLTF | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const loadedGltf = await loadModel(url)
        
        if (!mounted) return
        
        setGltf(loadedGltf)
        setLoading(false)
        onLoad?.(loadedGltf)
      } catch (err) {
        if (!mounted) return
        
        const error = err instanceof Error ? err : new Error('Failed to load face model')
        setError(error)
        setLoading(false)
        onError?.(error)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [url, onLoad, onError])

  useEffect(() => {
    if (gltf && groupRef.current) {
      groupRef.current.clear()
      
      const scene = gltf.scene.clone()
      
      // Apply face-specific optimizations
      if (enableOptimizations) {
        const optimizations = getFaceModelOptimizations()
        optimizeModel(scene, optimizations)
        
        // Additional face-specific optimizations
        scene.traverse((child) => {
          if (child.name.toLowerCase().includes('eye')) {
            // Keep eyes separate for potential eye tracking
            child.userData.isEye = true
          }
          
          if (child.name.toLowerCase().includes('mouth')) {
            // Keep mouth separate for potential lip sync
            child.userData.isMouth = true
          }
        })
      }
      
      groupRef.current.add(scene)
    }
  }, [gltf, enableOptimizations])

  if (loading) {
    return (
      <mesh position={position}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="gray" wireframe />
      </mesh>
    )
  }

  if (error) {
    return (
      <mesh position={position}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color="red" />
      </mesh>
    )
  }

  return (
    <group 
      ref={groupRef} 
      position={position} 
      rotation={rotation} 
      scale={scale}
    />
  )
}