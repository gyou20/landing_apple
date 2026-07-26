"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER = `
  attribute vec2 a_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform vec2 u_pointer;
  uniform float u_time;
  uniform float u_scroll;

  const float PI = 3.14159265359;
  const float TAU = 6.28318530718;

  float hash(float value) {
    return fract(sin(value * 127.1) * 43758.5453123);
  }

  float softSpot(float distanceValue, float size) {
    return exp(-distanceValue * distanceValue / max(size, 0.0001));
  }

  void main() {
    vec2 resolution = max(u_resolution, vec2(1.0));
    vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);

    vec2 pointerOffset = (u_pointer * 2.0 - 1.0) * vec2(0.24, 0.16);
    vec2 center = vec2(0.42, 0.02) + pointerOffset;
    vec2 p = uv - center;
    float radius = length(p);
    float angle = atan(p.y, p.x);

    float pull = 0.52 / (radius + 0.14);
    float warpedAngle = angle + pull - u_time * 0.11 - u_scroll * 0.18;
    float normalizedAngle = fract((warpedAngle + PI) / TAU);
    float sectorPosition = normalizedAngle * 56.0;
    float sector = floor(sectorPosition);
    float sectorCenter = fract(sectorPosition) - 0.5;
    float seed = hash(sector + 11.0);
    float nextSeed = hash(sector + 37.0);

    float beamWidth = mix(0.025, 0.12, seed);
    float beam = softSpot(sectorCenter, beamWidth);
    beam *= mix(0.08, 0.75, seed);
    beam *= smoothstep(1.45, 0.05, radius);
    beam *= smoothstep(0.025, 0.14, radius);

    float travel = fract(
      seed * 4.7
      - u_time * mix(0.11, 0.26, nextSeed)
      - u_scroll * mix(0.16, 0.38, seed)
    );
    float particleRadius = mix(0.045, 1.55, travel * travel);
    float radialDistance = abs(radius - particleRadius);
    float particle = softSpot(radialDistance, mix(0.00005, 0.0018, travel));
    particle *= softSpot(sectorCenter, mix(0.002, 0.018, travel));
    particle *= mix(0.45, 1.6, nextSeed);

    float depth = 1.0 / (radius + 0.08);
    float ringPhase = depth * 4.8 - u_time * 1.9 - u_scroll * 2.8;
    float ring = pow(max(0.0, sin(ringPhase)), 18.0);
    ring *= smoothstep(1.35, 0.06, radius) * 0.13;

    float core = softSpot(radius, 0.0075);
    float halo = softSpot(radius, 0.16) * 0.22;
    float edgeFade = smoothstep(1.65, 0.32, radius);

    vec3 lime = vec3(0.72, 1.0, 0.24);
    vec3 ice = vec3(0.45, 0.78, 0.92);
    vec3 violet = vec3(0.35, 0.25, 0.88);
    vec3 color = mix(ice, lime, seed);
    color += violet * ring;
    color *= beam * 0.44 + particle * 1.5;
    color += mix(ice, lime, 0.58) * (core * 0.9 + halo);
    color *= edgeFade;

    float vignette = smoothstep(1.5, 0.28, length(uv * vec2(0.78, 1.0)));
    float alpha = clamp(max(max(beam * 0.28, particle), halo) * vignette, 0.0, 0.86);

    gl_FragColor = vec4(color, alpha);
  }
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader-create-failed");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "unknown-shader-error";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    FRAGMENT_SHADER,
  );
  const program = gl.createProgram();

  if (!program) throw new Error("program-create-failed");

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "unknown-link-error";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
}

export function VortexBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let stopRenderer: (() => void) | undefined;

    const startRenderer = () => {
      const gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        powerPreference: "high-performance",
        premultipliedAlpha: true,
      });

      if (!gl) {
        canvas.dataset.webgl = "unsupported";
        console.warn("[aether:webgl:unsupported]");
        return () => undefined;
      }

      let program: WebGLProgram;
      try {
        program = createProgram(gl);
      } catch (error) {
        canvas.dataset.webgl = "shader-error";
        console.error("[aether:webgl:shader-failed]", error);
        return () => undefined;
      }

      const positionLocation = gl.getAttribLocation(program, "a_position");
      const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
      const pointerLocation = gl.getUniformLocation(program, "u_pointer");
      const timeLocation = gl.getUniformLocation(program, "u_time");
      const scrollLocation = gl.getUniformLocation(program, "u_scroll");
      const positionBuffer = gl.createBuffer();

      if (
        positionLocation < 0 ||
        !resolutionLocation ||
        !pointerLocation ||
        !timeLocation ||
        !scrollLocation ||
        !positionBuffer
      ) {
        canvas.dataset.webgl = "binding-error";
        console.error("[aether:webgl:binding-failed]");
        gl.deleteProgram(program);
        return () => undefined;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );
      gl.useProgram(program);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const pointerTarget = { x: 0.56, y: 0.5 };
      const pointerCurrent = { ...pointerTarget };
      let scrollImpulse = 0;
      let scrollCurrent = 0;
      let frameId = 0;
      let disposed = false;

      const resize = () => {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
        const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }
      };

      const handlePointerMove = (event: PointerEvent) => {
        pointerTarget.x = event.clientX / Math.max(window.innerWidth, 1);
        pointerTarget.y =
          1 - event.clientY / Math.max(window.innerHeight, 1);
        canvas.dataset.pointer = "active";
      };

      const handlePointerLeave = () => {
        pointerTarget.x = 0.56;
        pointerTarget.y = 0.5;
      };

      const handleWheel = (event: WheelEvent) => {
        scrollImpulse = Math.max(
          -2.2,
          Math.min(2.2, scrollImpulse + event.deltaY * 0.0015),
        );
        canvas.dataset.scroll = "active";
      };

      const render = (timestamp: number) => {
        if (disposed) return;

        resize();
        pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.055;
        pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.055;
        const scrollPosition =
          window.scrollY / Math.max(window.innerHeight, 1);
        const scrollTarget = scrollPosition + scrollImpulse;
        scrollCurrent += (scrollTarget - scrollCurrent) * 0.075;
        scrollImpulse *= 0.925;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.uniform2f(pointerLocation, pointerCurrent.x, pointerCurrent.y);
        gl.uniform1f(timeLocation, timestamp * 0.001);
        gl.uniform1f(scrollLocation, scrollCurrent);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        if (!reducedMotion) {
          frameId = window.requestAnimationFrame(render);
        }
      };

      window.addEventListener("resize", resize, { passive: true });

      if (!reducedMotion) {
        window.addEventListener("pointermove", handlePointerMove, {
          passive: true,
        });
        document.documentElement.addEventListener(
          "pointerleave",
          handlePointerLeave,
          { passive: true },
        );
        window.addEventListener("wheel", handleWheel, { passive: true });
      }

      canvas.dataset.webgl = reducedMotion ? "static" : "active";
      console.info("[aether:webgl:ready]", {
        mode: canvas.dataset.webgl,
        renderer: gl.getParameter(gl.RENDERER),
      });
      render(reducedMotion ? 1400 : window.performance.now());

      return () => {
        disposed = true;
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", handlePointerMove);
        document.documentElement.removeEventListener(
          "pointerleave",
          handlePointerLeave,
        );
        window.removeEventListener("wheel", handleWheel);
        gl.deleteBuffer(positionBuffer);
        gl.deleteProgram(program);
      };
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      stopRenderer?.();
      canvas.dataset.webgl = "context-lost";
      console.warn("[aether:webgl:context-lost]");
    };

    const handleContextRestored = () => {
      console.info("[aether:webgl:context-restored]");
      stopRenderer = startRenderer();
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
    stopRenderer = startRenderer();

    return () => {
      stopRenderer?.();
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, []);

  return (
    <div className="vortex-field" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="vortex-canvas"
        data-testid="vortex-canvas"
        data-webgl="initializing"
        data-pointer="idle"
        data-scroll="idle"
      />
    </div>
  );
}
