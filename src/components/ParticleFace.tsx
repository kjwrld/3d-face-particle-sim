import { useRef, useEffect, useState } from 'react'
import { BufferGeometry, Points, PointsMaterial, Vector3, BufferAttribute } from 'three'
import { loadModel } from '../utils/modelCache'

interface GLTF {
  scene: any
  scenes: any[]
  animations: any[]
  cameras: any[]
  asset: any
  parser: any
  userData: any
}

interface ParticleFaceProps {
  url: string
  position?: [number, number, number]
  scale?: [number, number, number] | number
  onLoad?: (vertexCount: number) => void
  onError?: (error: Error) => void
}

export function ParticleFace({ 
  url, 
  position = [0, 0, 0], 
  scale = 1,
  onLoad,
  onError 
}: ParticleFaceProps) {
  const pointsRef = useRef<Points>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [vertexCount, setVertexCount] = useState(0)

  useEffect(() => {
    let mounted = true

    const extractVertices = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const gltf = await loadModel(url)
        
        if (!mounted) return
        
        const vertices: Vector3[] = []
        
        // Traverse the model and extract all vertices
        gltf.scene.traverse((child: any) => {
          console.log('Found child:', child.type, child.name)
          
          if (child.isMesh && child.geometry) {
            console.log('Processing mesh:', child.name, 'vertices:', child.geometry.attributes.position?.count)
            
            const geometry = child.geometry
            const positionAttribute = geometry.attributes.position
            
            if (positionAttribute) {
              const positions = positionAttribute.array
              console.log('Position array length:', positions.length)
              
              for (let i = 0; i < positions.length; i += 3) {
                const vertex = new Vector3(
                  positions[i],
                  positions[i + 1], 
                  positions[i + 2]
                )
                vertices.push(vertex)
              }
            }
          }
        })
        
        console.log(`Extracted ${vertices.length} vertices from face model`)
        setVertexCount(vertices.length)
        
        // If no vertices found, create a test sphere pattern
        if (vertices.length === 0) {
          console.warn('No vertices found, creating test pattern')
          for (let i = 0; i < 1000; i++) {
            const phi = Math.acos(-1 + (2 * i) / 1000)
            const theta = Math.sqrt(1000 * Math.PI) * phi
            
            vertices.push(new Vector3(
              Math.cos(theta) * Math.sin(phi) * 0.5,
              Math.sin(theta) * Math.sin(phi) * 0.5,
              Math.cos(phi) * 0.5
            ))
          }
        }
        
        // Create particle geometry
        const particleGeometry = new BufferGeometry()
        const positions = new Float32Array(vertices.length * 3)
        
        vertices.forEach((vertex, index) => {
          positions[index * 3] = vertex.x
          positions[index * 3 + 1] = vertex.y
          positions[index * 3 + 2] = vertex.z
        })
        
        particleGeometry.setAttribute('position', new BufferAttribute(positions, 3))
        
        // Create and assign to points ref
        if (pointsRef.current) {
          pointsRef.current.geometry.dispose()
          pointsRef.current.geometry = particleGeometry
        }
        
        setLoading(false)
        onLoad?.(vertices.length)
        
      } catch (err) {
        if (!mounted) return
        
        const error = err instanceof Error ? err : new Error('Failed to extract vertices')
        setError(error)
        setLoading(false)
        onError?.(error)
      }
    }

    extractVertices()

    return () => {
      mounted = false
    }
  }, [url, onLoad, onError])

  if (loading) {
    return (
      <mesh position={position}>
        <sphereGeometry args={[0.5, 8, 8]} />
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
    <points ref={pointsRef} position={position} scale={scale}>
      <bufferGeometry />
      <pointsMaterial 
        color="white"
        size={0.02}
        sizeAttenuation={true}
      />
    </points>
  )
}