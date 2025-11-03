import { useRef, useEffect, useState } from 'react'
import { Group } from 'three'
import { loadModel } from '../utils/modelCache'

interface GLTF {
  scene: Group
  scenes: Group[]
  animations: any[]
  cameras: any[]
  asset: any
  parser: any
  userData: any
}

interface ModelProps {
  url: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number] | number
  onLoad?: (gltf: GLTF) => void
  onError?: (error: Error) => void
}

export function Model({ 
  url, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  scale = 1,
  onLoad,
  onError 
}: ModelProps) {
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
        
        const error = err instanceof Error ? err : new Error('Failed to load model')
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
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      
      groupRef.current.add(scene)
    }
  }, [gltf])

  if (loading) {
    return (
      <mesh position={position}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="gray" wireframe />
      </mesh>
    )
  }

  if (error) {
    return (
      <mesh position={position}>
        <boxGeometry args={[1, 1, 1]} />
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