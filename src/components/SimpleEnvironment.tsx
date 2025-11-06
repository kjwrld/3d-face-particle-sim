import { memo } from 'react'

interface SimpleEnvironmentProps {
  preset?: 'studio' | 'sunset' | 'dawn' | 'night' | 'forest' | 'city' | 'apartment'
}

const EnvironmentLighting = memo(({ preset }: SimpleEnvironmentProps) => {
  const getEnvironmentLighting = () => {
    switch (preset) {
      case 'studio':
        return {
          ambient: { intensity: 0.2, color: '#ffffff' },
          env: { intensity: 0.8, color: '#f0f0f0' }
        }
      
      case 'sunset':
        return {
          ambient: { intensity: 0.3, color: '#ff8c42' },
          env: { intensity: 1.0, color: '#ff6b35' }
        }
      
      case 'dawn':
        return {
          ambient: { intensity: 0.25, color: '#87ceeb' },
          env: { intensity: 0.9, color: '#ffd700' }
        }
      
      case 'night':
        return {
          ambient: { intensity: 0.1, color: '#1a1a2e' },
          env: { intensity: 0.3, color: '#16213e' }
        }
      
      case 'forest':
        return {
          ambient: { intensity: 0.4, color: '#228b22' },
          env: { intensity: 0.7, color: '#90ee90' }
        }
      
      case 'city':
        return {
          ambient: { intensity: 0.3, color: '#708090' },
          env: { intensity: 0.6, color: '#b0c4de' }
        }
      
      case 'apartment':
        return {
          ambient: { intensity: 0.35, color: '#f5f5dc' },
          env: { intensity: 0.5, color: '#fffacd' }
        }
      
      default:
        return {
          ambient: { intensity: 0.2, color: '#ffffff' },
          env: { intensity: 0.8, color: '#f0f0f0' }
        }
    }
  }

  const config = getEnvironmentLighting()

  return (
    <>
      {/* Additional ambient for environment feel */}
      <ambientLight 
        intensity={config.ambient.intensity} 
        color={config.ambient.color} 
      />
      
      {/* Hemisphere light for environment simulation */}
      <hemisphereLight
        args={[config.env.color, "#2c2c2c"]}
        intensity={config.env.intensity}
      />
    </>
  )
})

export { EnvironmentLighting as SimpleEnvironment }