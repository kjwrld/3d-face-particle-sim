import { Suspense, useState, useEffect } from 'react'
import { Environment as DreiEnvironment } from '@react-three/drei'

interface EnvironmentProps {
  preset?: 'studio' | 'sunset' | 'dawn' | 'night' | 'forest' | 'city' | 'apartment'
  background?: boolean
  blur?: number
}

function EnvironmentInner({ preset, background, blur }: EnvironmentProps) {
  return (
    <DreiEnvironment
      preset={preset}
      background={background}
      blur={blur}
    />
  )
}

export function Environment({ 
  preset = 'studio', 
  background = false, 
  blur = 0.3 
}: EnvironmentProps) {
  const [key, setKey] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    setError(false)
    setKey(prev => prev + 1)
  }, [preset])

  if (error) {
    console.warn(`Environment preset "${preset}" failed to load`)
    return null
  }

  return (
    <Suspense fallback={null}>
      <ErrorBoundary onError={() => setError(true)}>
        <EnvironmentInner 
          key={key}
          preset={preset}
          background={background}
          blur={blur}
        />
      </ErrorBoundary>
    </Suspense>
  )
}

function ErrorBoundary({ children, onError }: { children: React.ReactNode, onError: () => void }) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('Environment') || event.message.includes('HDRI')) {
        event.preventDefault()
        onError()
      }
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [onError])

  return <>{children}</>
}

export function CustomEnvironment() {
  return (
    <DreiEnvironment
      files={[
        '/env/px.jpg', // positive x
        '/env/nx.jpg', // negative x  
        '/env/py.jpg', // positive y
        '/env/ny.jpg', // negative y
        '/env/pz.jpg', // positive z
        '/env/nz.jpg'  // negative z
      ]}
      background={false}
    />
  )
}