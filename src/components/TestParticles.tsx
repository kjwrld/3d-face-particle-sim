import { useRef, useEffect } from 'react'
import { BufferGeometry, Points, Vector3, BufferAttribute } from 'three'

export function TestParticles() {
  const pointsRef = useRef<Points>(null)

  useEffect(() => {
    if (pointsRef.current) {
      console.log('Creating test particles...')
      
      // Create a simple cube of particles
      const vertices: Vector3[] = []
      
      for (let x = -1; x <= 1; x += 0.1) {
        for (let y = -1; y <= 1; y += 0.1) {
          for (let z = -1; z <= 1; z += 0.1) {
            vertices.push(new Vector3(x, y, z))
          }
        }
      }
      
      console.log(`Created ${vertices.length} test particles`)
      
      const geometry = new BufferGeometry()
      const positions = new Float32Array(vertices.length * 3)
      
      vertices.forEach((vertex, index) => {
        positions[index * 3] = vertex.x
        positions[index * 3 + 1] = vertex.y
        positions[index * 3 + 2] = vertex.z
      })
      
      geometry.setAttribute('position', new BufferAttribute(positions, 3))
      pointsRef.current.geometry = geometry
      
      console.log('Test particles assigned to geometry')
    }
  }, [])

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial 
        color="red"
        size={0.05}
        sizeAttenuation={true}
      />
    </points>
  )
}