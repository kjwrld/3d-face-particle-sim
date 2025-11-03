import { useState, memo, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { ShaderFaceParticles } from './components/ShaderFaceParticles'
import { SimpleFaceLighting } from './components/SimpleFaceLighting'
import { SimpleEnvironment } from './components/SimpleEnvironment'
import './App.css'

const FaceModel = memo(() => (
  <Suspense fallback={
    <mesh>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshStandardMaterial color="gray" wireframe />
    </mesh>
  }>
    <ShaderFaceParticles />
  </Suspense>
))

const Controls = memo(() => (
  <OrbitControls 
    enableDamping
    dampingFactor={0.05}
    maxPolarAngle={Math.PI / 1.8}
    minDistance={2}
    maxDistance={10}
  />
))

function Scene({ 
  lightingPreset, 
  environmentPreset 
}: { 
  lightingPreset: 'portrait' | 'studio' | 'dramatic' | 'natural'
  environmentPreset: 'studio' | 'sunset' | 'dawn' | 'night' | 'forest' | 'city' | 'apartment'
}) {
  return (
    <>
      <SimpleFaceLighting preset={lightingPreset} />
      <SimpleEnvironment preset={environmentPreset} />
      <FaceModel />
      <Controls />
    </>
  )
}

function App() {
  const [lightingPreset, setLightingPreset] = useState<'portrait' | 'studio' | 'dramatic' | 'natural'>('portrait')
  const [environmentPreset, setEnvironmentPreset] = useState<'studio' | 'sunset' | 'dawn' | 'night' | 'forest' | 'city' | 'apartment'>('studio')

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Lighting: </label>
          <select 
            value={lightingPreset} 
            onChange={(e) => setLightingPreset(e.target.value as any)}
            style={{ marginLeft: '8px', padding: '4px', borderRadius: '4px' }}
          >
            <option value="portrait">Portrait</option>
            <option value="studio">Studio</option>
            <option value="dramatic">Dramatic</option>
            <option value="natural">Natural</option>
          </select>
        </div>
        <div>
          <label>Environment: </label>
          <select 
            value={environmentPreset} 
            onChange={(e) => setEnvironmentPreset(e.target.value as any)}
            style={{ marginLeft: '8px', padding: '4px', borderRadius: '4px' }}
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
      </div>
      
      <Canvas
        shadows
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
      >
        <Scene 
          lightingPreset={lightingPreset}
          environmentPreset={environmentPreset}
        />
      </Canvas>
    </div>
  )
}

export default App
