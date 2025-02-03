# Interactive Fractal Explorer

A real-time, interactive fractal visualization tool built with Next.js and Three.js. Explore both 2D Mandelbrot sets and 3D Mandelbulb fractals with dynamic controls and smooth animations.

![Fractal Explorer Demo](demo.gif)

## Features

- **Dual Mode Visualization**
  - 2D Mandelbrot Set
  - 3D Mandelbulb Fractal
  - Easy toggle between modes

- **Interactive Controls**
  - Real-time parameter adjustments
  - Smooth zoom functionality
  - Drag-based rotation
  - Dynamic color cycling

- **Customizable Parameters**
  - Power (fractal complexity)
  - Color Speed
  - Color Intensity
  - Distortion Scale
  - Pulse Speed
  - Pulse Intensity

- **Performance Optimized**
  - GPU-accelerated rendering
  - Efficient shader implementations
  - Smooth transitions and animations

## Getting Started

### Prerequisites

- Node.js 14.0 or later
- npm or yarn

### Installation

1. Clone the repository:
bash
git clone https://github.com/yourusername/fractal-explorer.git
cd fractal-explorer
2. Install dependencies:
bash
npm install
or
yarn install
3. Run the development server:
bash
npm run dev
or
yarn dev

4. Open your browser and navigate to http://localhost:3000 to see the fractal explorer.
## Usage

### Navigation

- **Rotate**: Click and drag to rotate the view
- **Zoom**: Use mouse wheel to zoom in/out
- **Mode Switch**: Toggle between 2D and 3D modes using the checkbox

### Controls Panel

- **2D/3D Toggle**: Switch between Mandelbrot and Mandelbulb visualizations
- **Power**: Adjust the fractal's mathematical power/complexity
- **Color Speed**: Control the rate of color cycling
- **Color Intensity**: Adjust the vibrancy of colors
- **Distortion Scale**: Modify the geometric distortion
- **Pulse Speed**: Control the animation pulse rate
- **Pulse Intensity**: Adjust the strength of the pulsing effect

## Technical Details

### Built With

- [Next.js](https://nextjs.org/) - React framework
- [Three.js](https://threejs.org/) - 3D graphics library
- WebGL Shaders - Custom GLSL shaders for fractal rendering

### Key Components

- **Mandelbrot Shader**: Implements the classic 2D Mandelbrot set
- **Mandelbulb Shader**: Implements the 3D Mandelbulb fractal
- **ThreeScene Component**: Main React component handling the 3D scene
- **Control Panel**: React-based UI for parameter adjustments

## Performance Tips

- Lower the power setting for smoother performance
- Reduce distortion scale when rotating rapidly
- Use 2D mode on lower-end devices

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

- Inspired by the mathematical beauty of fractals thank you Mandelbrot.
- Built on the shoulders of the Three.js and Next.js communities
- Special thanks to Benoit Mandelbrot and Daniel White
