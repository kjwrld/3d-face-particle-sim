interface SimpleFaceLightingProps {
  preset?: 'portrait' | 'studio' | 'dramatic' | 'natural'
}

export function SimpleFaceLighting({ preset = 'portrait' }: SimpleFaceLightingProps) {
  const getLightingConfig = () => {
    switch (preset) {
      case 'portrait':
        return {
          ambient: { intensity: 0.3, color: '#f0f0f0' },
          key: { position: [2, 3, 3] as [number, number, number], intensity: 1.2, color: '#ffffff' },
          fill: { position: [-2, 1, 2] as [number, number, number], intensity: 0.4, color: '#b3d9ff' },
          rim: { position: [-1, 2, -2] as [number, number, number], intensity: 0.8, color: '#fff5e6' }
        }
      
      case 'studio':
        return {
          ambient: { intensity: 0.2, color: '#ffffff' },
          key: { position: [3, 4, 2] as [number, number, number], intensity: 1.5, color: '#ffffff' },
          fill: { position: [-3, 2, 1] as [number, number, number], intensity: 0.6, color: '#f0f8ff' },
          rim: { position: [0, 3, -3] as [number, number, number], intensity: 1.0, color: '#fffacd' }
        }
      
      case 'dramatic':
        return {
          ambient: { intensity: 0.1, color: '#1a1a2e' },
          key: { position: [4, 5, 1] as [number, number, number], intensity: 2.0, color: '#ffffff' },
          fill: { position: [-1, 1, 2] as [number, number, number], intensity: 0.2, color: '#16213e' },
          rim: { position: [-2, 3, -4] as [number, number, number], intensity: 1.5, color: '#0f3460' }
        }
      
      case 'natural':
        return {
          ambient: { intensity: 0.4, color: '#87ceeb' },
          key: { position: [1, 4, 2] as [number, number, number], intensity: 1.0, color: '#fffaf0' },
          fill: { position: [-2, 2, 3] as [number, number, number], intensity: 0.5, color: '#e6f3ff' },
          rim: { position: [2, 1, -1] as [number, number, number], intensity: 0.6, color: '#fff8dc' }
        }
      
      default:
        return {
          ambient: { intensity: 0.3, color: '#f0f0f0' },
          key: { position: [2, 3, 3] as [number, number, number], intensity: 1.2, color: '#ffffff' },
          fill: { position: [-2, 1, 2] as [number, number, number], intensity: 0.4, color: '#b3d9ff' },
          rim: { position: [-1, 2, -2] as [number, number, number], intensity: 0.8, color: '#fff5e6' }
        }
    }
  }

  const config = getLightingConfig()

  return (
    <>
      {/* Ambient Light */}
      <ambientLight 
        intensity={config.ambient.intensity} 
        color={config.ambient.color} 
      />
      
      {/* Key Light */}
      <directionalLight
        position={config.key.position}
        intensity={config.key.intensity}
        color={config.key.color}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      
      {/* Fill Light */}
      <directionalLight
        position={config.fill.position}
        intensity={config.fill.intensity}
        color={config.fill.color}
      />
      
      {/* Rim Light */}
      <pointLight
        position={config.rim.position}
        intensity={config.rim.intensity}
        color={config.rim.color}
        distance={10}
        decay={2}
      />
    </>
  )
}