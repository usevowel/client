/**
 * MeshGradient Component
 * 
 * Extracted from @paper-design/shaders-react v0.0.61
 * License: https://github.com/paper-design/shaders/blob/main/LICENSE
 * 
 * This is a self-contained implementation to avoid the 1MB+ dependency.
 * Only includes the MeshGradient shader that we actually use.
 */

import { useEffect, useRef, forwardRef, useState, memo, type CSSProperties } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface MeshGradientProps {
  // Shader-specific props
  speed?: number;
  frame?: number;
  colors?: string[];
  distortion?: number;
  swirl?: number;
  grainMixer?: number;
  grainOverlay?: number;
  
  // Sizing props
  fit?: 'cover' | 'contain' | 'fill' | 'none';
  rotation?: number;
  scale?: number;
  originX?: number;
  originY?: number;
  offsetX?: number;
  offsetY?: number;
  worldWidth?: number;
  worldHeight?: number;
  
  // HTML div props
  style?: CSSProperties;
  className?: string;
  minPixelRatio?: number;
  maxPixelCount?: number;
}

type ShaderColor = [number, number, number, number];

const ShaderFitOptions = {
  cover: 0,
  contain: 1,
  fill: 2,
  none: 3
};

// ============================================================================
// Shader Code
// ============================================================================

const meshGradientFragmentShader = `#version 300 es
precision mediump float;

uniform float u_time;
uniform vec4 u_colors[10];
uniform float u_colorsCount;
uniform float u_distortion;
uniform float u_swirl;
uniform float u_grainMixer;
uniform float u_grainOverlay;

// Sizing uniforms
uniform int u_fit;
uniform float u_rotation;
uniform float u_scale;
uniform float u_offsetX;
uniform float u_offsetY;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;

// Sizing variables (calculated in vertex shader)
in vec2 v_objectUV;
in vec2 v_objectBoxSize;

out vec4 fragColor;

#define PI 3.14159265358979323846

mat2 rotate(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  mat2 m = mat2(c, -s, s, c);
  return m;
}

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

float noise(vec2 n, vec2 seedOffset) {
  return valueNoise(n + seedOffset);
}

vec2 getPosition(int i, float t) {
  float a = float(i) * .37;
  float b = .6 + fract(float(i) / 3.) * .9;
  float c = .8 + fract(float(i + 1) / 4.);
  float x = sin(t * b + a);
  float y = cos(t * c + a * 1.5);
  return .5 + .5 * vec2(x, y);
}

void main() {
  vec2 shape_uv = v_objectUV;
  shape_uv += .5;

  vec2 grainUV = v_objectUV;
  float grainUVRot = u_rotation * PI / 180.;
  mat2 graphicRotation = mat2(cos(grainUVRot), sin(grainUVRot), -sin(grainUVRot), cos(grainUVRot));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);
  grainUV = transpose(graphicRotation) * grainUV;
  grainUV *= u_scale;
  grainUV *= .7;
  grainUV -= graphicOffset;
  grainUV *= v_objectBoxSize;
  
  float grain = noise(grainUV, vec2(0.));
  float mixerGrain = .4 * u_grainMixer * (grain - .5);

  const float firstFrameOffset = 41.5;
  float t = .5 * (u_time + firstFrameOffset);

  float radius = smoothstep(0., 1., length(shape_uv - .5));
  float center = 1. - radius;
  for (float i = 1.; i <= 2.; i++) {
    shape_uv.x += u_distortion * center / i * sin(t + i * .4 * smoothstep(.0, 1., shape_uv.y)) * cos(.2 * t + i * 2.4 * smoothstep(.0, 1., shape_uv.y));
    shape_uv.y += u_distortion * center / i * cos(t + i * 2. * smoothstep(.0, 1., shape_uv.x));
  }

  vec2 uvRotated = shape_uv;
  uvRotated -= vec2(.5);
  float angle = 3. * u_swirl * radius;
  uvRotated = rotate(uvRotated, -angle);
  uvRotated += vec2(.5);

  vec3 color = vec3(0.);
  float opacity = 0.;
  float totalWeight = 0.;

  for (int i = 0; i < 10; i++) {
    if (i >= int(u_colorsCount)) break;
    vec2 pos = getPosition(i, t) + mixerGrain;
    vec3 colorFraction = u_colors[i].rgb * u_colors[i].a;
    float opacityFraction = u_colors[i].a;
    float dist = length(uvRotated - pos);
    dist = pow(dist, 3.5);
    float weight = 1. / (dist + 1e-3);
    color += colorFraction * weight;
    opacity += opacityFraction * weight;
    totalWeight += weight;
  }

  color /= max(1e-4, totalWeight);
  opacity /= max(1e-4, totalWeight);

  float rr = noise(rotate(grainUV, 1.), vec2(3.));
  float gg = noise(rotate(grainUV, 2.) + 10., vec2(-1.));
  float bb = noise(grainUV - 2., vec2(5.));
  vec3 grainColor = vec3(rr, gg, bb);
  color = mix(color, grainColor, .01 + .3 * u_grainOverlay);
  
  fragColor = vec4(color, opacity);
}
`;

const vertexShader = `#version 300 es
precision mediump float;

in vec2 position;

// Sizing uniforms
uniform int u_fit;
uniform float u_rotation;
uniform float u_scale;
uniform float u_offsetX;
uniform float u_offsetY;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform vec2 u_resolution;

// Output to fragment shader
out vec2 v_objectUV;
out vec2 v_objectBoxSize;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  
  // Calculate aspect ratios
  float canvasAspect = u_resolution.x / u_resolution.y;
  float worldAspect = u_worldWidth / u_worldHeight;
  
  vec2 scale = vec2(1.0);
  if (u_fit == 0) { // cover
    scale = canvasAspect > worldAspect 
      ? vec2(1.0, worldAspect / canvasAspect)
      : vec2(canvasAspect / worldAspect, 1.0);
  } else if (u_fit == 1) { // contain
    scale = canvasAspect > worldAspect
      ? vec2(canvasAspect / worldAspect, 1.0)
      : vec2(1.0, worldAspect / canvasAspect);
  }
  
  // Apply transformations
  vec2 uv = position;
  uv *= scale * u_scale;
  
  // Apply rotation
  float rot = u_rotation * 3.14159265 / 180.0;
  mat2 rotMat = mat2(cos(rot), sin(rot), -sin(rot), cos(rot));
  uv = rotMat * uv;
  
  // Apply offset
  uv += vec2(u_offsetX, -u_offsetY);
  
  v_objectUV = uv;
  v_objectBoxSize = u_resolution / vec2(u_worldWidth, u_worldHeight);
}
`;

// ============================================================================
// Utility Functions
// ============================================================================

function getShaderColorFromString(colorString: string): ShaderColor {
  // Parse hex color to RGBA
  const hex = colorString.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
  return [r, g, b, a];
}

// ============================================================================
// WebGL Shader Mount
// ============================================================================

class ShaderMountVanilla {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private uniformLocations: Map<string, WebGLUniformLocation> = new Map();
  private startTime: number = Date.now();
  private animationId: number | null = null;
  private uniforms: Record<string, any>;
  private speed: number;
  private frame: number;

  constructor(
    container: HTMLElement,
    fragmentShader: string,
    uniforms: Record<string, any>,
    speed: number = 0,
    frame: number = 0
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);

    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
    });
    
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;

    this.uniforms = uniforms;
    this.speed = speed;
    this.frame = frame;

    // Compile shaders
    const program = this.createProgram(vertexShader, fragmentShader);
    if (!program) throw new Error('Failed to create shader program');
    this.program = program;

    // Setup geometry
    this.setupGeometry();
    
    // Start render loop
    this.resize();
    this.render();
    
    // Handle resize
    window.addEventListener('resize', () => this.resize());
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  private createProgram(vertSource: string, fragSource: string): WebGLProgram | null {
    const vertShader = this.createShader(this.gl.VERTEX_SHADER, vertSource);
    const fragShader = this.createShader(this.gl.FRAGMENT_SHADER, fragSource);
    
    if (!vertShader || !fragShader) return null;
    
    const program = this.gl.createProgram();
    if (!program) return null;
    
    this.gl.attachShader(program, vertShader);
    this.gl.attachShader(program, fragShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program link error:', this.gl.getProgramInfoLog(program));
      return null;
    }
    
    return program;
  }

  private setupGeometry() {
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
    
    const positionLoc = this.gl.getAttribLocation(this.program, 'position');
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);
  }

  private getUniformLocation(name: string): WebGLUniformLocation | null {
    if (this.uniformLocations.has(name)) {
      return this.uniformLocations.get(name)!;
    }
    const loc = this.gl.getUniformLocation(this.program, name);
    if (loc) {
      this.uniformLocations.set(name, loc);
    }
    return loc;
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private render = () => {
    const time = this.frame + (this.speed * (Date.now() - this.startTime) / 1000);
    
    this.gl.useProgram(this.program);
    
    // Set time uniform
    const timeLoc = this.getUniformLocation('u_time');
    if (timeLoc) this.gl.uniform1f(timeLoc, time);
    
    // Set resolution uniform
    const resLoc = this.getUniformLocation('u_resolution');
    if (resLoc) this.gl.uniform2f(resLoc, this.canvas.width, this.canvas.height);
    
    // Set custom uniforms
    for (const [name, value] of Object.entries(this.uniforms)) {
      const loc = this.getUniformLocation(name);
      if (!loc) continue;
      
      if (Array.isArray(value)) {
        if (Array.isArray(value[0])) {
          // Array of vec4
          const flat = value.flat();
          this.gl.uniform4fv(loc, flat);
        } else {
          this.gl.uniform4fv(loc, value);
        }
      } else if (typeof value === 'number') {
        this.gl.uniform1f(loc, value);
      }
    }
    
    // Draw
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    
    this.animationId = requestAnimationFrame(this.render);
  };

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.gl.deleteProgram(this.program);
    this.canvas.remove();
  }

  public setUniforms(uniforms: Record<string, any>) {
    this.uniforms = uniforms;
  }
}

// ============================================================================
// React Component
// ============================================================================

const MeshGradientImpl = forwardRef<HTMLDivElement, MeshGradientProps>(
  function MeshGradientComponent({
    // Shader props
    speed = 1,
    frame = 0,
    colors = ["#e0eaff", "#241d9a", "#f75092", "#9f50d3"],
    distortion = 0.8,
    swirl = 0.1,
    grainMixer = 0,
    grainOverlay = 0,
    
    // Sizing props
    fit = 'cover',
    rotation = 0,
    scale = 1,
    originX = 0.5,
    originY = 0.5,
    offsetX = 0,
    offsetY = 0,
    worldWidth = 1920,
    worldHeight = 1080,
    
    // HTML props
    style,
    className,
    ...props
  }, ref) {
    const divRef = useRef<HTMLDivElement>(null);
    const shaderMountRef = useRef<ShaderMountVanilla | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
      if (!divRef.current || shaderMountRef.current) return;

      const uniforms = {
        u_colors: colors.map(getShaderColorFromString),
        u_colorsCount: colors.length,
        u_distortion: distortion,
        u_swirl: swirl,
        u_grainMixer: grainMixer,
        u_grainOverlay: grainOverlay,
        u_fit: ShaderFitOptions[fit],
        u_rotation: rotation,
        u_scale: scale,
        u_offsetX: offsetX,
        u_offsetY: offsetY,
        u_originX: originX,
        u_originY: originY,
        u_worldWidth: worldWidth,
        u_worldHeight: worldHeight,
      };

      shaderMountRef.current = new ShaderMountVanilla(
        divRef.current,
        meshGradientFragmentShader,
        uniforms,
        speed,
        frame
      );
      setIsInitialized(true);

      return () => {
        shaderMountRef.current?.destroy();
        shaderMountRef.current = null;
      };
    }, []);

    // Update uniforms when props change
    useEffect(() => {
      if (!isInitialized || !shaderMountRef.current) return;

      const uniforms = {
        u_colors: colors.map(getShaderColorFromString),
        u_colorsCount: colors.length,
        u_distortion: distortion,
        u_swirl: swirl,
        u_grainMixer: grainMixer,
        u_grainOverlay: grainOverlay,
        u_fit: ShaderFitOptions[fit],
        u_rotation: rotation,
        u_scale: scale,
        u_offsetX: offsetX,
        u_offsetY: offsetY,
        u_originX: originX,
        u_originY: originY,
        u_worldWidth: worldWidth,
        u_worldHeight: worldHeight,
      };

      shaderMountRef.current.setUniforms(uniforms);
    }, [isInitialized, colors, distortion, swirl, grainMixer, grainOverlay, fit, rotation, scale, offsetX, offsetY, originX, originY, worldWidth, worldHeight]);

    return (
      <div
        ref={(node) => {
          (divRef as any).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          ...style,
        }}
        className={className}
        {...props}
      />
    );
  }
);

// Memoize to prevent unnecessary re-renders
export const MeshGradient = memo(MeshGradientImpl, (prevProps, nextProps) => {
  // Custom comparison for color arrays
  if (prevProps.colors && nextProps.colors) {
    if (prevProps.colors.length !== nextProps.colors.length) return false;
    if (prevProps.colors.some((c, i) => c !== nextProps.colors![i])) return false;
  }
  
  // Compare other props
  return (
    prevProps.speed === nextProps.speed &&
    prevProps.frame === nextProps.frame &&
    prevProps.distortion === nextProps.distortion &&
    prevProps.swirl === nextProps.swirl &&
    prevProps.grainMixer === nextProps.grainMixer &&
    prevProps.grainOverlay === nextProps.grainOverlay &&
    prevProps.fit === nextProps.fit &&
    prevProps.rotation === nextProps.rotation &&
    prevProps.scale === nextProps.scale
  );
});

MeshGradient.displayName = 'MeshGradient';

