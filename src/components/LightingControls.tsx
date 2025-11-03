import { useState } from 'react'

interface LightingControlsProps {
  onPresetChange: (preset: 'portrait' | 'studio' | 'dramatic' | 'natural') => void
  onEnvironmentChange: (env: 'studio' | 'sunset' | 'dawn' | 'night' | 'forest' | 'city' | 'apartment') => void
  showHelpers: boolean
  onHelpersToggle: (show: boolean) => void
}

export function LightingControls({ 
  onPresetChange, 
  onEnvironmentChange, 
  showHelpers, 
  onHelpersToggle 
}: LightingControlsProps) {
  const [selectedPreset, setSelectedPreset] = useState<'portrait' | 'studio' | 'dramatic' | 'natural'>('portrait')
  const [selectedEnvironment, setSelectedEnvironment] = useState<'studio' | 'sunset' | 'dawn' | 'night' | 'forest' | 'city' | 'apartment'>('studio')

  const handlePresetChange = (preset: 'portrait' | 'studio' | 'dramatic' | 'natural') => {
    setSelectedPreset(preset)
    onPresetChange(preset)
  }

  const handleEnvironmentChange = (env: 'studio' | 'sunset' | 'dawn' | 'night' | 'forest' | 'city' | 'apartment') => {
    setSelectedEnvironment(env)
    onEnvironmentChange(env)
  }

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.8)',
      padding: '20px',
      borderRadius: '8px',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      minWidth: '200px'
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Lighting Controls</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Lighting Preset:
        </label>
        <select 
          value={selectedPreset} 
          onChange={(e) => handlePresetChange(e.target.value as any)}
          style={{
            width: '100%',
            padding: '5px',
            borderRadius: '4px',
            border: 'none',
            background: '#333',
            color: 'white'
          }}
        >
          <option value="portrait">Portrait (Soft)</option>
          <option value="studio">Studio (Professional)</option>
          <option value="dramatic">Dramatic (High Contrast)</option>
          <option value="natural">Natural (Daylight)</option>
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Environment:
        </label>
        <select 
          value={selectedEnvironment} 
          onChange={(e) => handleEnvironmentChange(e.target.value as any)}
          style={{
            width: '100%',
            padding: '5px',
            borderRadius: '4px',
            border: 'none',
            background: '#333',
            color: 'white'
          }}
        >
          <option value="studio">Studio</option>
          <option value="sunset">Sunset</option>
          <option value="dawn">Dawn</option>
          <option value="night">Night</option>
          <option value="forest">Forest</option>
          <option value="city">City</option>
          <option value="apartment">Apartment</option>
        </select>
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showHelpers}
            onChange={(e) => onHelpersToggle(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Show Light Helpers
        </label>
      </div>
    </div>
  )
}