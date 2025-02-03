import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';

// Move shaders outside component to prevent recreating on each render
const vertexShader = `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Add 2D Mandelbrot shader
const mandelbrotShader = `
  varying vec3 vPos;
  uniform float time;
  uniform vec2 rotation;
  uniform float zoom;
  uniform float power;
  uniform float colorSpeed;
  uniform float colorIntensity;
  uniform float distortionScale;
  uniform float pulseSpeed;
  uniform float pulseIntensity;

  vec3 palette(float t) {
    t = t * 0.5;
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 0.7);
    vec3 d = vec3(0.30, 0.20, 0.20);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    vec2 uv = vPos.xy;
    
    // Transform coordinates
    vec2 c = (uv * 4.0) / zoom;
    c += vec2(rotation.x * 2.0 - 1.5, rotation.y);
    
    vec2 z = vec2(0.0);
    float n = 0.0;
    
    // Mandelbrot iteration
    for(int i = 0; i < 256; i++) {
      z = vec2(
        z.x * z.x - z.y * z.y + c.x,
        2.0 * z.x * z.y + c.y
      );
      
      if(dot(z, z) > 4.0) break;
      n += 1.0;
    }
    
    // Coloring
    float t = n / 256.0;
    t = pow(t, 0.5); // Smooth color distribution
    vec3 color = palette(t * colorIntensity + time * colorSpeed);
    
    // Add pulse effect
    float pulse = sin(time * pulseSpeed) * 0.5 + 0.5;
    color *= 1.0 + pulse * pulseIntensity;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Fragment shader for 3D Mandelbulb
const mandelbulbShader = `
  varying vec3 vPos;
  uniform float time;
  uniform vec2 rotation;
  uniform float zoom;
  uniform float power;
  uniform float colorSpeed;
  uniform float colorIntensity;
  uniform float distortionScale;
  uniform float pulseSpeed;
  uniform float pulseIntensity;

  // Optimize by reducing iterations and simplifying calculations
  const int MAX_STEPS = 64;  // Reduced from 100
  const float MIN_DIST = 0.001;
  const float MAX_DIST = 50.0; // Reduced from 100

  // Smooth color palette with better transitions
  vec3 palette(float t) {
    // Slower color cycling for smoother transitions
    t = t * 0.5;
    
    // Softer, more harmonious colors
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 0.7);
    vec3 d = vec3(0.30, 0.20, 0.20);

    // Smooth mouse influence
    float mouseInfluence = (sin(time * 0.5) * 0.5 + 0.5) * length(rotation);
    d += vec3(rotation.x, rotation.y, mouseInfluence) * 0.1;
    
    return a + b * cos(6.28318 * (c * t + d));
  }

  // Smooth blend between two colors
  vec3 smoothColor(float t) {
    vec3 col1 = palette(t);
    vec3 col2 = palette(t + 0.1);
    float blend = fract(t * 10.0);
    blend = smoothstep(0.0, 1.0, blend);
    return mix(col1, col2, blend);
  }

  vec2 hexCoords(vec2 uv) {
    vec2 r = vec2(1.0, 1.73);
    vec2 h = r * 0.5;
    vec2 a = mod(uv, r) - h;
    vec2 b = mod(uv + h, r) - h;
    return dot(a, a) < dot(b, b) ? a : b;
  }

  float mandelbulb(vec3 pos) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    
    // Smoother power variation
    float power = float(power) + rotation.x * sin(time) * 1.5;
    
    for (int i = 0; i < 12; i++) {
      r = length(z);
      if (r > 2.0) break;
      
      float theta = acos(z.z/r) + rotation.y * 0.2 * sin(time);
      float phi = atan(z.y, z.x) + rotation.x * 0.2 * cos(time);
      dr = pow(r, power-1.0) * power * dr + 1.0;
      
      float zr = pow(r, power);
      theta = theta * power;
      phi = phi * power;
      
      z = zr * vec3(
        sin(theta) * cos(phi),
        sin(theta) * sin(phi),
        cos(theta)
      );
      z += pos;
    }
    return 0.5 * log(r) * r / dr;
  }

  // Ray marching function
  float rayMarch(vec3 ro, vec3 rd) {
    float depth = 0.0;
    
    for (int i = 0; i < MAX_STEPS; i++) {
      vec3 pos = ro + depth * rd;
      float dist = mandelbulb(pos);
      
      if (dist < MIN_DIST) return depth;
      depth += dist;
      if (depth >= MAX_DIST) break;
    }
    
    return MAX_DIST;
  }

  // Calculate normal
  vec3 getNormal(vec3 p) {
    float d = mandelbulb(p);
    vec2 e = vec2(0.001, 0.0);
    vec3 n = d - vec3(
      mandelbulb(p - e.xyy),
      mandelbulb(p - e.yxy),
      mandelbulb(p - e.yyx)
    );
    return normalize(n);
  }

  void main() {
    vec2 uv = vPos.xy;
    
    // Smoother hexagonal distortion
    vec2 hex = hexCoords(uv * 3.0 + rotation * sin(time * 0.5));
    uv += hex * (sin(time) * 0.01);
    
    float rotX = rotation.y * 2.0 * 3.14159 + time * 0.1;
    float rotY = rotation.x * 2.0 * 3.14159 + time * 0.1;
    
    vec3 ro = vec3(
      2.5 * sin(rotY) * cos(rotX),
      2.5 * sin(rotX),
      2.5 * cos(rotY) * cos(rotX)
    ) / zoom;
    
    vec3 target = vec3(0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);
    vec3 rd = normalize(forward + right * uv.x + up * uv.y);
    
    float d = rayMarch(ro, rd);
    
    if (d >= MAX_DIST) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    
    vec3 p = ro + rd * d;
    vec3 normal = getNormal(p);
    vec3 light = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(0.0, dot(normal, light));
    
    // Smoother color transitions
    float colorTime = time * 0.2;
    vec3 baseColor = smoothColor(length(p) * 0.1 + colorTime);
    baseColor *= smoothColor(dot(normal, vec3(1.0)) * 0.2 + colorTime * 0.7);
    vec3 color = baseColor;
    
    // Smooth rim lighting
    float rim = 1.0 - max(0.0, dot(normal, -rd));
    rim = smoothstep(0.0, 1.0, rim);
    color += smoothColor(rim + colorTime * 0.5) * pow(rim, 1.5) * 0.5;
    
    // Smooth specular highlights
    vec3 reflected = reflect(-light, normal);
    float spec = pow(max(0.0, dot(reflected, -rd)), 8.0);
    spec = smoothstep(0.0, 1.0, spec);
    color += smoothColor(spec + colorTime) * spec * 0.3;
    
    // Smooth lighting transitions
    diff = smoothstep(0.0, 1.0, diff);
    color *= diff;
    color += baseColor * 0.15; // ambient
    
    // Smooth pulsing
    float pulse = sin(colorTime + length(p) * 2.0) * 0.5 + 0.5;
    pulse = smoothstep(0.0, 1.0, pulse);
    color *= 1.0 + pulse * 0.1;
    
    // Smooth distance fog
    float fog = exp(-d * 0.08);
    fog = smoothstep(0.0, 1.0, fog);
    color *= fog;
    
    // Smooth final color blend
    vec3 cycleColor = smoothColor(rotation.x + rotation.y + colorTime * 0.5);
    color = mix(color, cycleColor, 0.2);
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function ThreeScene() {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const materialRef = useRef(null);
  const frameIdRef = useRef(null);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1.0);
  const startTime = useRef(Date.now());

  // Memoize controls to prevent unnecessary rerenders
  const [controls, setControls] = useState({
    is2D: false,
    power: 8,
    colorSpeed: 0.2,
    colorIntensity: 0.5,
    distortionScale: 3.0,
    pulseSpeed: 2.0,
    pulseIntensity: 0.1
  });

  // Memoize handlers
  const handleMouseDown = useCallback((event) => {
    isDraggingRef.current = true;
    lastMouseRef.current = {
      x: event.clientX,
      y: event.clientY
    };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleMouseMove = useCallback((event) => {
    if (!isDraggingRef.current) return;
    
    const deltaX = (event.clientX - lastMouseRef.current.x) / window.innerWidth;
    const deltaY = (event.clientY - lastMouseRef.current.y) / window.innerHeight;
    
    rotationRef.current.x = (rotationRef.current.x + deltaY * 2) % (Math.PI * 2);
    rotationRef.current.y = (rotationRef.current.y + deltaX * 2) % (Math.PI * 2);
    
    lastMouseRef.current = {
      x: event.clientX,
      y: event.clientY
    };
  }, []);

  const handleWheel = useCallback((event) => {
    event.preventDefault();
    const zoomSpeed = 0.1;
    const delta = -Math.sign(event.deltaY) * zoomSpeed;
    zoomRef.current = Math.max(0.5, Math.min(5.0, zoomRef.current + delta));
  }, []);

  // Setup scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene only once
    if (!sceneRef.current) {
      sceneRef.current = new THREE.Scene();
      rendererRef.current = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
      });
    }

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 1;

    // Create or update material with selected shader
    const geometry = new THREE.PlaneGeometry(2, 2);
    const shader = controls.is2D ? mandelbrotShader : mandelbulbShader;
    
    if (materialRef.current) {
      materialRef.current.dispose();
    }
    
    materialRef.current = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: shader,
      uniforms: {
        time: { value: 0.0 },
        rotation: { value: new THREE.Vector2(0.0, 0.0) },
        zoom: { value: 1.0 },
        power: { value: controls.power },
        colorSpeed: { value: controls.colorSpeed },
        colorIntensity: { value: controls.colorIntensity },
        distortionScale: { value: controls.distortionScale },
        pulseSpeed: { value: controls.pulseSpeed },
        pulseIntensity: { value: controls.pulseIntensity }
      }
    });

    const plane = new THREE.Mesh(geometry, materialRef.current);
    scene.clear();
    scene.add(plane);

    // Optimize animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      const material = materialRef.current;
      if (!material) return;

      // Update only necessary uniforms
      material.uniforms.time.value = (Date.now() - startTime.current) * 0.001;
      material.uniforms.rotation.value.set(rotationRef.current.y, rotationRef.current.x);
      material.uniforms.zoom.value += (zoomRef.current - material.uniforms.zoom.value) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    // Optimized resize handler
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseUp);
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
      
      cancelAnimationFrame(frameIdRef.current);
    };
  }, [controls.is2D]); // Add is2D to dependency array

  // Update uniforms when controls change
  useEffect(() => {
    if (!materialRef.current) return;
    
    Object.keys(controls).forEach(key => {
      if (materialRef.current.uniforms[key]) {
        materialRef.current.uniforms[key].value = controls[key];
      }
    });
  }, [controls]);

  const handleControlChange = (name, value) => {
    setControls(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  return (
    <>
      <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} />
      
      {/* Controls Panel */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        color: 'white',
        background: 'rgba(0,0,0,0.7)',
        padding: '20px',
        borderRadius: '10px',
        width: '300px'
      }}>
        <h2 style={{ margin: '0 0 15px 0' }}>Fractal Controls</h2>
        
        {/* Add 2D/3D toggle */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={controls.is2D}
              onChange={(e) => {
                setControls(prev => ({ ...prev, is2D: e.target.checked }));
                // Reset rotation and zoom when switching modes
                rotationRef.current = { x: 0, y: 0 };
                zoomRef.current = 1.0;
              }}
              style={{ marginRight: '10px' }}
            />
            2D Mandelbrot Mode
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Power: {controls.power}
          </label>
          <input
            type="range"
            min="2"
            max="16"
            step="0.1"
            value={controls.power}
            onChange={(e) => handleControlChange('power', e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Color Speed: {controls.colorSpeed}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={controls.colorSpeed}
            onChange={(e) => handleControlChange('colorSpeed', e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Color Intensity: {controls.colorIntensity}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={controls.colorIntensity}
            onChange={(e) => handleControlChange('colorIntensity', e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Distortion Scale: {controls.distortionScale}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={controls.distortionScale}
            onChange={(e) => handleControlChange('distortionScale', e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Pulse Speed: {controls.pulseSpeed}
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={controls.pulseSpeed}
            onChange={(e) => handleControlChange('pulseSpeed', e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Pulse Intensity: {controls.pulseIntensity}
          </label>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={controls.pulseIntensity}
            onChange={(e) => handleControlChange('pulseIntensity', e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginTop: '20px', fontSize: '0.9em', opacity: '0.8' }}>
          <p style={{ margin: '5px 0' }}>• Move mouse to rotate view</p>
          <p style={{ margin: '5px 0' }}>• Scroll to zoom in/out</p>
        </div>
      </div>
    </>
  );
} 