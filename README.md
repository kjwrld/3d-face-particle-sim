# 3D Face Particle Simulation

A real-time particle simulation of a 3D face mesh using Three.js, React Three Fiber, and custom GLSL shaders.

## Demo

[View Live Demo](https://kjwrld.github.io/3d-face-particle-sim/)

## Overview

This project renders a 3D face model as dynamic particles with custom shader effects including:
- Triangle-based particle rendering (inspired by [Edan Kwan](https://github.com/edankwan))
- Vertical line trail effects (inspired by [@junkiyoshi](https://github.com/junkiyoshi))
- Wireframe-to-particle transitions
- BVH-accelerated mesh operations
- Real-time chromatic aberration and lighting effects

## How It Was Made

### 1. Face Model Creation
Created a realistic 3D face mesh using [KeenTools FaceBuilder for Blender](https://keentools.io/download/facebuilder-for-blender):
- Uploaded reference photos
- Generated 3D face topology
- UV mapped and textured the model
- Exported as `.glb` with Draco compression

### 2. Particle System Setup
Built with React Three Fiber and Three.js:
- Extracted vertex positions from the face mesh
- Implemented surface sampling for higher particle density
- Applied barycentric coordinate interpolation for smooth distribution
- Sampled texture colors at UV coordinates

### 3. Custom Shader Development
Wrote GLSL vertex and fragment shaders for:
- **Triangle particles**: Each particle rendered as a camera-facing triangle
- **Vertical line trails**: Motion trails that follow particle movement
- **Lighting effects**: Dynamic ambient and directional lighting
- **Chromatic aberration**: RGB color separation effects

### 4. Advanced Features
- BVH (Bounding Volume Hierarchy) acceleration for raycasting
- Wireframe reveal animations with fade zones
- Unified transition system between wireframe and particles
- Instanced rendering for performance optimization
- Leva GUI controls for real-time parameter tweaking

## Tech Stack

- **React** + **TypeScript** + **Vite**
- **Three.js** - 3D graphics engine
- **React Three Fiber** - React renderer for Three.js
- **React Three Drei** - Useful helpers for R3F
- **three-mesh-bvh** - BVH acceleration structure
- **Leva** - GUI controls for real-time adjustments
- **GLSL** - Custom vertex and fragment shaders

## Installation

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Project Structure

```
src/
├── components/       # React Three Fiber components
├── shaders/         # GLSL shader files (.vert, .frag)
├── utils/           # Helper utilities (loaders, mesh extraction)
├── constants/       # Configuration constants
└── App.tsx          # Main application

public/
├── models/          # 3D models (.glb)
└── draco/          # Draco decoder for compression
```

## Credits

- **Triangle Particles**: Inspired by [Edan Kwan](https://github.com/edankwan)'s particle techniques
- **Vertical Line Trails**: Inspired by [@junkiyoshi](https://github.com/junkiyoshi)'s creative coding
- **Face Model**: Created with [KeenTools FaceBuilder](https://keentools.io/)

## License

MIT
