/**
 * ASCIITECH — Studio Front-End Scripts
 * Handles Lenis Smooth Inertial Scrolling, Hero Parallax (--p),
 * Right-Side Slide-in Panel Dialog, Direct Contact Actions, and Scroll Reveal
 */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // DOM Elements
  // --------------------------------------------------------------------------
  const menuToggle = document.getElementById('menu-toggle');
  const menuPanel = document.getElementById('menu-panel');
  const menuScrim = document.getElementById('menu-scrim');
  const heroSection = document.querySelector('.hero-section');
  const disciplinesSection = document.getElementById('core-disciplines');
  const interactiveElements = menuPanel.querySelectorAll('.panel-link, .contact-pill');
  const firstFocusableElement = menuPanel.querySelector('.panel-link');

  let isMenuOpen = false;

  // --------------------------------------------------------------------------
  // Smooth Inertial Scrolling via Lenis & Parallax Tracking
  // --------------------------------------------------------------------------
  let lenis = null;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;

  let cachedHeroHeight = heroSection ? heroSection.offsetHeight : (window.innerHeight * 0.86);
  let cachedWindowHeight = window.innerHeight || 1;
  let scrollTicking = false;

  let lastP = -1;
  function updateParallax(scrollY) {
    const heroH = cachedHeroHeight || window.innerHeight;
    const p = Math.min(Math.max(scrollY / (heroH || 1), 0), 1);

    // Hero stays completely static - no parallax drift
    // When scrolling reaches Core Disciplines, the solid header background fades in
    if (scrollY >= heroH - 64 || p >= 0.85) {
      document.body.classList.add('header-on-light');
      document.body.classList.add('header--solid');
      document.body.classList.add('header--scrolled');
    } else {
      document.body.classList.remove('header-on-light');
      document.body.classList.remove('header--solid');
      document.body.classList.remove('header--scrolled');
    }
  }

  // Only enable Lenis inertia smoothing on mouse/trackpad desktop devices.
  // On touch screens (phones, iPads), use native 120Hz hardware scrolling for zero lag/glitches.
  if (!prefersReducedMotion && typeof Lenis !== 'undefined' && !isTouchDevice) {
    lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 0,
      smoothTouch: false,
    });
    window.lenis = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    lenis.on('scroll', (e) => {
      const scrollY = typeof e.scroll === 'number' ? e.scroll : window.scrollY;
      updateParallax(scrollY);
    });
  } else {
    // Native high-refresh-rate hardware scroll handler with rAF debouncing
    window.addEventListener('scroll', () => {
      if (!scrollTicking) {
        requestAnimationFrame(() => {
          updateParallax(window.scrollY);
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    }, { passive: true });
  }

  window.addEventListener('resize', () => {
    cachedHeroHeight = heroSection ? heroSection.offsetHeight : (window.innerHeight * 0.86);
    cachedWindowHeight = window.innerHeight || 1;
    updateParallax(window.scrollY);
  }, { passive: true });

  // --------------------------------------------------------------------------
  // Wire Terrain WebGL Background (Originkit — ASCIITECH Color Palette)
  // Infinite synthwave procedural terrain, segmented sun & interactive steering
  // Color Palette: Deep Charcoal (#0c0b0a), Brand Orange (#FF8C1A), Warm Ember
  // Hardware-accelerated 120FPS, touch/pointer steering, offscreen auto-pause
  // --------------------------------------------------------------------------
  const heroTerrainCanvas = document.getElementById('hero-wire-terrain') || document.getElementById('hero-supernova-canvas');
  if (heroTerrainCanvas) {
    const gl = heroTerrainCanvas.getContext('webgl', { antialias: true, alpha: false, depth: true });
    if (gl) {
      const DEPTH = 60;
      const HALF_X = 64;
      const BACK = 10;
      const FOG_NEAR = 14;
      const FOG_FAR = 46;
      const FLIGHT_RATE = 4;
      const EYE_HEIGHT = 1.7;
      const RIDGE = 4.2;
      const VALLEY = 3;
      const FOV = (58 * Math.PI) / 180;
      const SUN_ELEV = 0.02;
      const SUN_RADIUS = 0.22;
      const BASE_PITCH = (6.5 * Math.PI) / 180;
      const STEER_YAW = (11 * Math.PI) / 180;
      const STEER_LIFT = 0.8;
      const DPR_CAP = 2;
      const DEG = Math.PI / 180;

      const TERRAIN_VERT = `
      precision highp float;
      attribute vec3 aP;
      uniform float uCamZ;
      uniform vec3 uCam;
      uniform vec3 uR0;
      uniform vec3 uR1;
      uniform vec3 uR2;
      uniform vec4 uProj;
      uniform float uAmp;
      uniform vec2 uNudge;
      varying float vFog;
      varying float vDist;

      float hash(vec2 c) {
          return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453);
      }
      float vnoise(vec2 p, float period) {
          vec2 i = floor(p);
          vec2 f = p - i;
          vec2 u = f * f * (3.0 - 2.0 * f);
          float z0 = mod(i.y, period);
          float z1 = mod(i.y + 1.0, period);
          float a = hash(vec2(i.x, z0));
          float b = hash(vec2(i.x + 1.0, z0));
          float c = hash(vec2(i.x, z1));
          float d = hash(vec2(i.x + 1.0, z1));
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }
      float height(float x, float z) {
          float n = vnoise(vec2(x, z) / 6.0, 10.0) * 0.6
                  + vnoise(vec2(x, z) / 3.0, 20.0) * 0.27
                  + vnoise(vec2(x, z) / 1.5, 40.0) * 0.13;
          float ax = abs(x);
          float side = smoothstep(3.0, 16.0, ax);
          return uAmp * (side * (pow(n, 1.6) * 2.1 + 0.55 * ax / 64.0) + 0.1 * (n - 0.5));
      }

      void main() {
          float relA = mod(aP.y - uCamZ + 10.0, 60.0) - 10.0;
          float zr = relA + aP.z;
          float h = height(aP.x, uCamZ + zr);
          vec3 q = vec3(aP.x - uCam.x, h - uCam.y, zr);
          vec3 v = vec3(dot(uR0, q), dot(uR1, q), dot(uR2, q));
          float dist = length(vec2(q.x * 0.55, zr));
          vDist = dist;
          vFog = 1.0 - smoothstep(14.0, 46.0, dist);
          gl_Position = vec4(v.x * uProj.x, v.y * uProj.y, uProj.z * v.z + uProj.w, v.z);
          gl_Position.xy += uNudge * v.z;
      }
      `;

      const TERRAIN_FRAG = `
      precision highp float;
      uniform vec4 uColor;
      uniform float uSolid;
      varying float vFog;
      varying float vDist;
      void main() {
          float fillFog = 1.0 - smoothstep(41.0, 46.0, vDist);
          float a = uColor.a * mix(vFog, fillFog, uSolid);
          gl_FragColor = vec4(uColor.rgb, a);
      }
      `;

      const SKY_VERT = `
      attribute vec3 aP;
      void main() { gl_Position = vec4(aP.xy, 0.0, 1.0); }
      `;

      const SKY_FRAG = `
      precision highp float;
      uniform vec2 uRes;
      uniform vec3 uUp;
      uniform vec2 uFocal;
      uniform vec3 uSun;
      uniform float uBandT;
      uniform vec3 uBg;
      uniform vec4 uAccent;

      void main() {
          vec2 p = gl_FragCoord.xy;
          vec2 ndc = p / uRes * 2.0 - 1.0;
          vec3 ray = vec3(ndc.x / uFocal.x, ndc.y / uFocal.y, 1.0);
          float worldY = dot(uUp, ray) / length(ray);
          float pxPerRad = uRes.y * 0.5 * uFocal.y;
          float above = clamp(worldY * pxPerRad + 0.5, 0.0, 1.0);

          vec3 col = uBg;
          float R = max(uSun.z, 1.0);
          vec2 dv = p - uSun.xy;
          float d = length(dv);

          float halo = exp(-max(d - R, 0.0) / (R * 0.9)) * 0.16;
          col = mix(col, uAccent.rgb, halo * uAccent.a * (0.35 + 0.65 * above));

          float disc = clamp(R - d + 0.5, 0.0, 1.0);
          float yy = (uSun.y - p.y) / R;
          float period = max(R * 0.11, 3.0);
          float s = fract((uSun.y - p.y) / period + uBandT) * period;
          float cut = clamp((yy + 0.3) * 0.5, 0.0, 0.8) * period;
          float band = yy > -0.3 ? clamp(s - cut + 0.5, 0.0, 1.0) : 1.0;
          vec3 sunTop = mix(uAccent.rgb, vec3(1.0, 0.93, 0.78), 0.32);
          vec3 sunCol = mix(sunTop, uAccent.rgb * 0.9, clamp(yy * 0.5 + 0.5, 0.0, 1.0));
          col = mix(col, sunCol, disc * band * uAccent.a);

          gl_FragColor = vec4(col, 1.0);
      }
      `;

      function compile(type, src) {
        const sh = gl.createShader(type);
        if (!sh) return null;
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          console.error('WireTerrain shader:', gl.getShaderInfoLog(sh));
          gl.deleteShader(sh);
          return null;
        }
        return sh;
      }

      function link(vs, fs) {
        const v = compile(gl.VERTEX_SHADER, vs);
        const f = compile(gl.FRAGMENT_SHADER, fs);
        if (!v || !f) return null;
        const prog = gl.createProgram();
        if (!prog) return null;
        gl.attachShader(prog, v);
        gl.attachShader(prog, f);
        gl.bindAttribLocation(prog, 0, 'aP');
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          console.error('WireTerrain link:', gl.getProgramInfoLog(prog));
          return null;
        }
        return prog;
      }

      function buildLattice(rows) {
        const s = DEPTH / rows;
        const nx = Math.max(2, 2 * Math.round(HALF_X / s));
        const tris = new Float32Array(nx * rows * 18);
        const lines = new Float32Array(nx * rows * 12);
        let t = 0;
        let l = 0;
        for (let j = 0; j < rows; j++) {
          const z0 = j * s;
          for (let i = 0; i < nx; i++) {
            const x0 = -HALF_X + (i + 0.5) * s;
            const x1 = x0 + s;
            tris.set([x0, z0, 0, x1, z0, 0, x1, z0, s, x0, z0, 0, x1, z0, s, x0, z0, s], t);
            t += 18;
            lines.set([x0, z0, 0, x1, z0, 0, x0, z0, 0, x0, z0, s], l);
            l += 12;
          }
        }
        return { tris, lines };
      }

      const terrain = link(TERRAIN_VERT, TERRAIN_FRAG);
      const sky = link(SKY_VERT, SKY_FRAG);

      if (terrain && sky) {
        const tu = {
          camZ: gl.getUniformLocation(terrain, 'uCamZ'),
          cam: gl.getUniformLocation(terrain, 'uCam'),
          r0: gl.getUniformLocation(terrain, 'uR0'),
          r1: gl.getUniformLocation(terrain, 'uR1'),
          r2: gl.getUniformLocation(terrain, 'uR2'),
          proj: gl.getUniformLocation(terrain, 'uProj'),
          amp: gl.getUniformLocation(terrain, 'uAmp'),
          nudge: gl.getUniformLocation(terrain, 'uNudge'),
          color: gl.getUniformLocation(terrain, 'uColor'),
          solid: gl.getUniformLocation(terrain, 'uSolid'),
        };
        const su = {
          res: gl.getUniformLocation(sky, 'uRes'),
          up: gl.getUniformLocation(sky, 'uUp'),
          focal: gl.getUniformLocation(sky, 'uFocal'),
          sun: gl.getUniformLocation(sky, 'uSun'),
          bandT: gl.getUniformLocation(sky, 'uBandT'),
          bg: gl.getUniformLocation(sky, 'uBg'),
          accent: gl.getUniformLocation(sky, 'uAccent'),
        };

        const quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), gl.STATIC_DRAW);
        const triBuf = gl.createBuffer();
        const lineBuf = gl.createBuffer();
        let triCount = 0;
        let lineCount = 0;
        gl.enableVertexAttribArray(0);
        gl.depthFunc(gl.LEQUAL);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        let W = 0, H = 0, dpr = 1;
        const resize = () => {
          dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
          W = heroTerrainCanvas.parentElement ? heroTerrainCanvas.parentElement.offsetWidth : window.innerWidth;
          H = heroTerrainCanvas.parentElement ? heroTerrainCanvas.parentElement.offsetHeight : window.innerHeight;
          W = W || window.innerWidth || 1200;
          H = H || window.innerHeight || 800;
          const bw = Math.max(1, Math.round(W * dpr));
          const bh = Math.max(1, Math.round(H * dpr));
          if (heroTerrainCanvas.width !== bw || heroTerrainCanvas.height !== bh) {
            heroTerrainCanvas.width = bw;
            heroTerrainCanvas.height = bh;
          }
        };
        resize();
        window.addEventListener('resize', resize, { passive: true });

        // ASCIITECH BRAND PALETTE:
        // Deep Charcoal (#0c0b0a), Radiant Orange wireframe (#FF8C1A), Horizon segmented sun (#FF8C1A)
        const bg = [12, 11, 10, 1]; // #0c0b0a
        const line = [255, 140, 26, 0.95]; // #FF8C1A
        const acc = [255, 140, 26, 1.0]; // #FF8C1A

        const rows = W < 600 ? 80 : 120;
        const speed = 85;
        const relief = 1.0;
        const sunSize = W < 600 ? 0.85 : 0.95;
        const eye = 0.94 * EYE_HEIGHT;
        const hover = 2.0;

        const lat = buildLattice(rows);
        gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
        gl.bufferData(gl.ARRAY_BUFFER, lat.tris, gl.STATIC_DRAW);
        triCount = lat.tris.length / 3;
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
        gl.bufferData(gl.ARRAY_BUFFER, lat.lines, gl.STATIC_DRAW);
        lineCount = lat.lines.length / 3;

        const pointer = { nx: 0, ny: 0, active: false, presence: 0 };
        const cam = { yaw: 0, roll: 0, lift: 0, init: false };
        let camZ = 0;
        let tIdle = 0;
        let raf = 0;
        let last = -1;
        let isVisible = true;

        const frame = (now) => {
          if (!isVisible) return;

          const dt = last < 0 ? 0 : Math.min(0.05, Math.max(0, (now - last) / 1000));
          last = now;
          const rate = speed / 50;
          camZ = (camZ + dt * rate * FLIGHT_RATE) % DEPTH;
          tIdle += dt * rate;

          const pe = 1 - Math.exp(-dt * 3);
          pointer.presence += ((pointer.active ? 1 : 0) - pointer.presence) * pe;
          if (!pointer.active && pointer.presence < 0.002) pointer.presence = 0;
          const k = pointer.presence * Math.min(1, hover);

          // On mobile devices, fly strictly straight forward (yaw = 0, roll = 0, no lateral wobble).
          // On desktop/laptop, cursor steering directs the flight path.
          const isMobileDevice = window.innerWidth <= 768 || window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
          const idleYaw = isMobileDevice ? 0 : (Math.sin(tIdle * 0.21) * 3 + Math.sin(tIdle * 0.13 + 2) * 1.5) * DEG;
          const idleRoll = isMobileDevice ? 0 : Math.sin(tIdle * 0.17 + 1) * 1.8 * DEG;
          const idleLift = isMobileDevice ? 0 : Math.sin(tIdle * 0.11) * 0.12;

          const yawT = isMobileDevice ? 0 : (idleYaw * (1 - k) + pointer.nx * STEER_YAW * hover * k);
          const liftT = isMobileDevice ? 0 : (idleLift * (1 - k) + -pointer.ny * STEER_LIFT * hover * k);
          const rollT = isMobileDevice ? 0 : (idleRoll * (1 - k) - yawT * 0.55 * k);

          if (isMobileDevice) {
            cam.yaw = 0;
            cam.roll = 0;
            cam.lift = 0;
            cam.init = true;
          } else {
            if (!cam.init) {
              cam.yaw = yawT;
              cam.roll = rollT;
              cam.lift = liftT;
              cam.init = true;
            }
            const ce = 1 - Math.exp(-dt * 2.5);
            cam.yaw += (yawT - cam.yaw) * ce;
            cam.roll += (rollT - cam.roll) * ce;
            cam.lift += (liftT - cam.lift) * ce;
          }

          const camY = Math.max(0.35, eye * (1 + cam.lift));
          const pitch = BASE_PITCH + (camY / EYE_HEIGHT - 1) * 2.2 * DEG;

          const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
          const cp = Math.cos(pitch), sp = Math.sin(pitch);
          const cr = Math.cos(cam.roll), sr = Math.sin(cam.roll);
          const a0 = [cy, 0, -sy];
          const a1 = [sp * sy, cp, sp * cy];
          const a2 = [cp * sy, -sp, cp * cy];
          const r0 = [cr * a0[0] - sr * a1[0], cr * a0[1] - sr * a1[1], cr * a0[2] - sr * a1[2]];
          const r1 = [sr * a0[0] + cr * a1[0], sr * a0[1] + cr * a1[1], sr * a0[2] + cr * a1[2]];
          const r2 = a2;

          const aspect = W / Math.max(1, H);
          const fy = 1 / Math.tan(FOV / 2);
          const fx = fy / aspect;
          const near = 0.05;
          const far = 200;
          const A = (far + near) / (far - near);
          const B = (-2 * far * near) / (far - near);

          const sd = [0, SUN_ELEV, 1];
          const sv = [
            r0[0] * sd[0] + r0[1] * sd[1] + r0[2] * sd[2],
            r1[0] * sd[0] + r1[1] * sd[1] + r1[2] * sd[2],
            r2[0] * sd[0] + r2[1] * sd[1] + r2[2] * sd[2],
          ];
          const svz = Math.max(1e-3, sv[2]);
          const bw = heroTerrainCanvas.width;
          const bh = heroTerrainCanvas.height;
          const sunX = ((sv[0] / svz) * fx * 0.5 + 0.5) * bw;
          const sunY = ((sv[1] / svz) * fy * 0.5 + 0.5) * bh;

          gl.viewport(0, 0, bw, bh);
          gl.clearColor(bg[0] / 255, bg[1] / 255, bg[2] / 255, 1);
          gl.depthMask(true);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          // sky + sun
          gl.disable(gl.DEPTH_TEST);
          gl.disable(gl.BLEND);
          gl.useProgram(sky);
          gl.bindBuffer(gl.ARRAY_BUFFER, quad);
          gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
          gl.uniform2f(su.res, bw, bh);
          gl.uniform3f(su.up, r0[1], r1[1], r2[1]);
          gl.uniform2f(su.focal, fx, fy);
          gl.uniform3f(su.sun, sunX, sunY, SUN_RADIUS * sunSize * bh);
          gl.uniform1f(su.bandT, tIdle * 0.12);
          gl.uniform3f(su.bg, bg[0] / 255, bg[1] / 255, bg[2] / 255);
          gl.uniform4f(su.accent, acc[0] / 255, acc[1] / 255, acc[2] / 255, sunSize > 0 ? acc[3] : 0);
          gl.drawArrays(gl.TRIANGLES, 0, 3);

          // terrain
          gl.useProgram(terrain);
          gl.uniform1f(tu.camZ, camZ);
          gl.uniform3f(tu.cam, 0, camY, 0);
          gl.uniform3f(tu.r0, r0[0], r0[1], r0[2]);
          gl.uniform3f(tu.r1, r1[0], r1[1], r1[2]);
          gl.uniform3f(tu.r2, r2[0], r2[1], r2[2]);
          gl.uniform4f(tu.proj, fx, fy, A, B);
          gl.uniform1f(tu.amp, RIDGE * relief);
          gl.enable(gl.DEPTH_TEST);
          gl.enable(gl.BLEND);

          // hidden-line fill: Background
          gl.depthMask(true);
          gl.enable(gl.POLYGON_OFFSET_FILL);
          gl.polygonOffset(1, 1);
          gl.uniform2f(tu.nudge, 0, 0);
          gl.uniform1f(tu.solid, 1);
          gl.uniform4f(tu.color, bg[0] / 255, bg[1] / 255, bg[2] / 255, 1);
          gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
          gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.TRIANGLES, 0, triCount);
          gl.disable(gl.POLYGON_OFFSET_FILL);

          // lines
          gl.depthMask(false);
          gl.uniform1f(tu.solid, 0);
          gl.uniform4f(tu.color, line[0] / 255, line[1] / 255, line[2] / 255, line[3]);
          gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
          gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.LINES, 0, lineCount);
          if (dpr > 1.25) {
            gl.uniform2f(tu.nudge, 2 / bw, 2 / bh);
            gl.drawArrays(gl.LINES, 0, lineCount);
          }
          gl.depthMask(true);

          if (!prefersReducedMotion) {
            raf = requestAnimationFrame(frame);
          }
        };

        raf = requestAnimationFrame(frame);

        // Pointer steer interaction:
        // On mobile view, the hero background runs ONLY the autonomous scenic flight animation
        // without distortion from hand gestures/touch.
        // Steering is exclusively active on laptop/desktop with mouse cursor movement.
        window.addEventListener('pointermove', (e) => {
          if (e.pointerType === 'touch' || window.innerWidth < 768) {
            pointer.active = false;
            return;
          }
          pointer.nx = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1));
          pointer.ny = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1));
          pointer.active = true;
        }, { passive: true });

        window.addEventListener('pointerleave', () => {
          pointer.active = false;
        }, { passive: true });

        // Performance Observer: pause loop when hero is off-screen
        if ('IntersectionObserver' in window) {
          const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                if (!isVisible) {
                  isVisible = true;
                  raf = requestAnimationFrame(frame);
                }
              } else {
                isVisible = false;
                if (raf) cancelAnimationFrame(raf);
              }
            });
          }, { threshold: 0.01 });

          const heroEl = document.getElementById('hero') || heroTerrainCanvas;
          heroObserver.observe(heroEl);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Menu Slide-in Panel Functions
  // --------------------------------------------------------------------------
  function openMenu() {
    isMenuOpen = true;
    menuToggle.setAttribute('aria-expanded', 'true');
    menuPanel.classList.add('is-open');
    menuPanel.setAttribute('aria-hidden', 'false');
    menuScrim.classList.add('is-open');
    document.body.classList.add('menu-open', 'scroll-locked');

    // Stop Lenis smooth scroll while menu is open
    if (lenis) {
      lenis.stop();
    }

    // Move focus into panel
    window.setTimeout(() => {
      if (firstFocusableElement) {
        firstFocusableElement.focus();
      }
    }, 120);
  }

  function closeMenu(restoreFocus = true) {
    if (!isMenuOpen) return;
    isMenuOpen = false;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuPanel.classList.remove('is-open');
    menuPanel.setAttribute('aria-hidden', 'true');
    menuScrim.classList.remove('is-open');
    document.body.classList.remove('menu-open', 'scroll-locked');

    // Resume Lenis smooth scroll
    if (lenis) {
      lenis.start();
    }

    if (restoreFocus) {
      menuToggle.focus();
    }
  }

  function toggleMenu() {
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  menuToggle.addEventListener('click', toggleMenu);

  menuScrim.addEventListener('click', () => {
    closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMenuOpen) {
      closeMenu();
    }
  });

  // Focus trap inside slide-in panel dialog
  menuPanel.addEventListener('keydown', (e) => {
    if (!isMenuOpen || e.key !== 'Tab') return;

    const focusableElements = menuPanel.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  });

  // Navigation Links behavior
  interactiveElements.forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');

      if (href === '#core-disciplines' || href === '#brand-identity' || href === '#showcase') {
        e.preventDefault();
        closeMenu(false);

        // Smooth scroll to target section via Lenis or native
        if (lenis) {
          lenis.scrollTo(href, {
            offset: 0,
            duration: 1.2,
          });
        } else {
          const targetSection = document.querySelector(href);
          if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth' });
          }
        }
      } else if (href && href.startsWith('#')) {
        e.preventDefault();
        closeMenu();
      } else {
        // External (WhatsApp), tel:, or mailto: links
        closeMenu(false);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Direct Gmail Web Compose Redirect for "Contact Us" & Inquiries
  // --------------------------------------------------------------------------
  const GMAIL_COMPOSE_URL = 'https://mail.google.com/mail/?view=cm&fs=1&to=asciisupport@gmail.com';
  document.addEventListener('click', (e) => {
    const targetLink = e.target.closest('a');
    if (!targetLink) return;
    const href = targetLink.getAttribute('href') || '';
    const text = (targetLink.textContent || '').trim().toLowerCase();
    if (
      href.includes('asciisupport@gmail.com') ||
      href.startsWith('mailto:') ||
      targetLink.classList.contains('footer-cta-btn') ||
      text === 'contact us' ||
      text === 'direct enquiries'
    ) {
      e.preventDefault();
      window.open(GMAIL_COMPOSE_URL, '_blank', 'noopener,noreferrer');
    }
  });

  // --------------------------------------------------------------------------
  // Core Disciplines: Expanding Panels (Snippet 2)
  // --------------------------------------------------------------------------
  (function initCoreDisciplines() {
    const panels = [...document.querySelectorAll('.cd .pn')];
    if (!panels.length) return;
    const cnt = document.getElementById('cnt');
    const prog = document.getElementById('prog');
    let cur = 0;

    function setActive(i) {
      cur = i;
      panels.forEach((p, k) => {
        const isOn = (k === i);
        p.classList.toggle('on', isOn);
        p.setAttribute('aria-expanded', isOn ? 'true' : 'false');
      });
      if (cnt) cnt.textContent = '0' + (i + 1) + ' / 04';
      if (prog && typeof gsap !== 'undefined') {
        gsap.to(prog, { scaleX: (i + 1) / 4, duration: 0.8, ease: 'expo.out' });
      }
    }

    panels.forEach((p, i) => {
      p.addEventListener('mouseenter', () => {
        if (window.matchMedia('(hover:hover)').matches) setActive(i);
      });
      p.addEventListener('click', () => setActive(i));
      p.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActive(i);
        }
      });
    });

    if (!prefersReducedMotion && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      // Heading word rise
      const ttl = document.getElementById('ttl');
      if (ttl) {
        ttl.innerHTML = ttl.textContent.split(' ').map(w => `<span class="w"><span class="wi">${w}</span></span>`).join(' ');
        gsap.from('#ttl .wi', {
          yPercent: 110,
          duration: 1.2,
          ease: 'expo.out',
          stagger: 0.12,
          scrollTrigger: { trigger: '.cd', start: 'top 75%', once: true }
        });
      }

      // Panels rise in
      gsap.from('.cd .pn', {
        yPercent: 40,
        opacity: 0,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.12,
        scrollTrigger: { trigger: '.cd', start: 'top 70%', once: true }
      });
    }
  })();

  // --------------------------------------------------------------------------
  // Brand Identity Marks Accordion & In-Site PDF Viewer
  // --------------------------------------------------------------------------
  const brandCards = document.querySelectorAll('.brand-card');
  const pdfModal = document.getElementById('pdfViewerModal');
  const pdfBackdrop = document.getElementById('pdfModalBackdrop');
  const pdfCloseBtn = document.getElementById('pdfModalClose');
  const pdfFrame = document.getElementById('pdfViewerFrame');
  const pdfTitleEl = document.getElementById('pdfModalTitle');
  const pdfDownloadBtn = document.getElementById('pdfModalDownload');
  const pdfLoader = document.getElementById('pdfModalLoader');
  let isPdfModalOpen = false;
  let brandHoverTimer = null;

  function setBrandActive(targetCard) {
    if (!targetCard || targetCard.classList.contains('is-active')) return;
    brandCards.forEach((c) => {
      c.classList.remove('is-active');
      c.removeAttribute('aria-current');
    });
    targetCard.classList.add('is-active');
    targetCard.setAttribute('aria-current', 'true');
  }

  function isMobileDevice() {
    return (
      window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  }

  function openPdf(pdfUrl, title) {
    if (!pdfUrl) return;

    try {
      sessionStorage.setItem('peacock_skip_once', '1');
      sessionStorage.setItem('asciitech_last_scroll_y', Math.round(window.scrollY).toString());
      sessionStorage.setItem('asciitech_return_target', '#brand-identity');
    } catch (e) {}

    if (isMobileDevice()) {
      // Mobile: open directly in the dedicated native app / browser PDF handler
      window.location.href = pdfUrl;
      return;
    }

    // Desktop: directly open inside the website only via in-site modal viewer
    if (!pdfModal || !pdfFrame) return;

    if (pdfTitleEl) {
      pdfTitleEl.textContent = title || 'Brand Deck';
    }
    if (pdfDownloadBtn) {
      pdfDownloadBtn.setAttribute('href', pdfUrl);
      const cleanFileName = (title || 'brand-deck').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() + '.pdf';
      pdfDownloadBtn.setAttribute('download', cleanFileName);
    }
    if (pdfLoader) {
      pdfLoader.classList.remove('is-hidden');
    }

    pdfFrame.onload = () => {
      if (pdfLoader) {
        pdfLoader.classList.add('is-hidden');
      }
    };
    pdfFrame.src = pdfUrl;

    pdfModal.classList.add('is-open');
    pdfModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pdf-modal-open');
    isPdfModalOpen = true;

    if (lenis) {
      lenis.stop();
    }

    window.setTimeout(() => {
      if (pdfCloseBtn) {
        pdfCloseBtn.focus();
      }
    }, 100);
  }

  function closePdfModal() {
    if (!isPdfModalOpen || !pdfModal) return;

    pdfModal.classList.remove('is-open');
    pdfModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pdf-modal-open');
    isPdfModalOpen = false;

    if (pdfFrame) {
      pdfFrame.src = 'about:blank';
    }

    if (lenis) {
      lenis.start();
    }
  }

  if (pdfCloseBtn) {
    pdfCloseBtn.addEventListener('click', closePdfModal);
  }
  if (pdfBackdrop) {
    pdfBackdrop.addEventListener('click', closePdfModal);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isPdfModalOpen) {
      closePdfModal();
    }
  });

  let lastTappedBrandCard = null;

  brandCards.forEach((card) => {
    const link = card.querySelector('.brand-card-link');
    const pdfUrl = card.getAttribute('data-pdf') || (link ? link.getAttribute('href') : null);
    const title = card.getAttribute('data-title') || 'Brand Deck';

    // Desktop hover expands accordion
    card.addEventListener('pointerenter', () => {
      clearTimeout(brandHoverTimer);
      brandHoverTimer = setTimeout(() => {
        if (card.matches(':hover')) {
          setBrandActive(card);
        }
      }, 70);
    });

    card.addEventListener('pointerleave', () => {
      clearTimeout(brandHoverTimer);
    });

    // Keyboard focus activates
    card.addEventListener('focus', () => {
      clearTimeout(brandHoverTimer);
      setBrandActive(card);
    });

    // Unified activation handler: on mobile, 1st tap selects, 2nd tap on active opens PDF
    function handleCardActivation(e) {
      e.preventDefault();
      e.stopPropagation();
      clearTimeout(brandHoverTimer);

      if (isMobileDevice()) {
        if (lastTappedBrandCard === card && card.classList.contains('is-active')) {
          // Second tap on the active card -> open brand deck PDF
          openPdf(pdfUrl, title);
        } else {
          // First tap -> select and expand
          lastTappedBrandCard = card;
          setBrandActive(card);
        }
      } else {
        // Desktop: select and open PDF in modal
        setBrandActive(card);
        openPdf(pdfUrl, title);
      }
    }

    card.addEventListener('click', handleCardActivation);
    if (link) {
      link.addEventListener('click', handleCardActivation);
    }
  });

  // --------------------------------------------------------------------------
  // Scroll Reveal: Core Disciplines Section (IntersectionObserver)
  // --------------------------------------------------------------------------
  if (disciplinesSection) {
    if (prefersReducedMotion) {
      disciplinesSection.classList.add('is-revealed');
    } else if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              disciplinesSection.classList.add('is-revealed');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          root: null,
          threshold: 0.15,
          rootMargin: '0px 0px -50px 0px'
        }
      );

      revealObserver.observe(disciplinesSection);
    } else {
      disciplinesSection.classList.add('is-revealed');
    }
  }

  // --------------------------------------------------------------------------
  // Crafted from Imagination Sticky Scrub Animation
  // --------------------------------------------------------------------------
  const craftedTrack = document.getElementById('crafted-track');
  const craftedStage = document.getElementById('crafted-stage');
  const craftedHint = document.getElementById('crafted-hint');
  if (craftedTrack && craftedStage) {
    const its = Array.from(craftedTrack.querySelectorAll('.it'));
    // Stagger config: [start, duration, from-offset-x (vw), from-offset-y (vh)]
    const cfg = [
      [0.06, 0.24, -5, 0],
      [0.18, 0.24, 0, -9],
      [0.30, 0.24, -4, 9],
      [0.42, 0.24, 0, 10],
      [0.54, 0.26, 6, 0]
    ];
    const reduceMotion = prefersReducedMotion;
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function clampVal(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

    function updateCrafted() {
      const rect = craftedTrack.getBoundingClientRect();
      // Skip updates if track is far out of view
      if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return;

      const maxScroll = craftedTrack.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      // Map progress so all 5 photos finish right as track completes, or active by default on compact mobile
      const p = maxScroll > 0 ? clampVal(scrolled / (maxScroll * 0.94)) : 1;

      its.forEach((el, i) => {
        const c = cfg[i];
        const t = reduceMotion ? (p > c[0] ? 1 : 0) : easeOutCubic(clampVal((p - c[0]) / c[1]));
        el.style.opacity = t;
        el.style.transform = `translate3d(${c[2] * (1 - t)}vw, ${c[3] * (1 - t)}vh, 0) scale(${0.9 + 0.1 * t})`;
      });

      // Animate title entrance when track reaches 80% of viewport height
      if (rect.top <= window.innerHeight * 0.8) {
        craftedStage.classList.add('go');
      }
      if (craftedHint) {
        craftedHint.classList.toggle('off', scrolled > 60);
      }
    }

    function onScrollCrafted() {
      updateCrafted();
    }

    window.addEventListener('scroll', onScrollCrafted, { passive: true });
    window.addEventListener('resize', onScrollCrafted);
    if (window.lenis) {
      window.lenis.on('scroll', onScrollCrafted);
    }
    updateCrafted();
  }

  // --------------------------------------------------------------------------
  // Scroll Reveal & Off-screen Pause: Workflow Video Section (IntersectionObserver)
  // --------------------------------------------------------------------------
  const workflowSection = document.getElementById('workflow-video');
  const workflowVideo = document.querySelector('.workflow-video-media');
  if (workflowSection) {
    if (prefersReducedMotion) {
      workflowSection.classList.add('is-revealed');
    } else if ('IntersectionObserver' in window) {
      const workflowRevealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              workflowSection.classList.add('is-revealed');
              if (workflowVideo) workflowVideo.play().catch(() => {});
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      workflowRevealObserver.observe(workflowSection);

      // Dedicated play/pause observer to free up mobile GPU/CPU decoders when off-screen
      if (workflowVideo) {
        const videoPlayObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                workflowVideo.play().catch(() => {});
              } else {
                workflowVideo.pause();
              }
            });
          },
          { threshold: 0.05 }
        );
        videoPlayObserver.observe(workflowVideo);
      }
    } else {
      workflowSection.classList.add('is-revealed');
    }
  }

  // --------------------------------------------------------------------------
  // Scroll Reveal: Brand Identity Marks Section (IntersectionObserver)
  // --------------------------------------------------------------------------
  const brandSection = document.getElementById('brand-identity');
  if (brandSection) {
    if (prefersReducedMotion) {
      brandSection.classList.add('is-revealed');
    } else if ('IntersectionObserver' in window) {
      const brandRevealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              brandSection.classList.add('is-revealed');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          root: null,
          threshold: 0.12,
          rootMargin: '0px 0px -40px 0px'
        }
      );

      brandRevealObserver.observe(brandSection);
    } else {
      brandSection.classList.add('is-revealed');
    }
  }

  // --------------------------------------------------------------------------
  // Showcase Section: Interactive Card Hover, Click & Touch Behavior
  // --------------------------------------------------------------------------
  const showcaseCards = document.querySelectorAll('.showcase-card');
  showcaseCards.forEach((card) => {
    let touchedOnce = false;

    card.addEventListener('mouseenter', () => {
      card.classList.add('is-active');
    });

    card.addEventListener('mouseleave', () => {
      card.classList.remove('is-active');
      touchedOnce = false;
    });

    card.addEventListener('focus', () => {
      card.classList.add('is-active');
    });

    card.addEventListener('blur', () => {
      card.classList.remove('is-active');
    });

    card.addEventListener('click', () => {
      const url = card.getAttribute('data-url');
      if (!url) return;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  });

  // --------------------------------------------------------------------------
  // 3D Motion Video Section Loop & Autoplay
  // --------------------------------------------------------------------------
  const motionVideoSection = document.getElementById('motion-video');
  const motionVideo = motionVideoSection ? motionVideoSection.querySelector('.motion-video-media') : null;
  if (motionVideo) {
    const isMobileViewport = window.innerWidth <= 768;
    const mobileSrc = 'assets/videos/motion_animation_mobile.mp4';
    const desktopSrc = 'assets/videos/motion_animation.mp4';
    const targetSrc = isMobileViewport ? mobileSrc : desktopSrc;
    if (motionVideo.getAttribute('src') !== targetSrc) {
      motionVideo.src = targetSrc;
    }

    motionVideo.muted = true;
    motionVideo.defaultMuted = true;
    motionVideo.playsInline = true;
    motionVideo.loop = true;

    const playVideo = () => {
      const p = motionVideo.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    };

    playVideo();
    motionVideo.addEventListener('canplay', playVideo);
    motionVideo.addEventListener('loadedmetadata', playVideo);

    if ('IntersectionObserver' in window) {
      const motionVideoObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              playVideo();
            } else {
              motionVideo.pause();
            }
          });
        },
        { threshold: 0.05 }
      );
      motionVideoObserver.observe(motionVideoSection);
    }
  }

  // --------------------------------------------------------------------------
  // Scroll Reveal: Showcase Section (IntersectionObserver)
  // --------------------------------------------------------------------------
  const showcaseSection = document.getElementById('showcase');
  if (showcaseSection) {
    if (prefersReducedMotion) {
      showcaseSection.classList.add('is-revealed');
    } else if ('IntersectionObserver' in window) {
      const showcaseRevealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              showcaseSection.classList.add('is-revealed');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          root: null,
          threshold: 0.1,
          rootMargin: '0px 0px -40px 0px',
        }
      );

      showcaseRevealObserver.observe(showcaseSection);
    } else {
      showcaseSection.classList.add('is-revealed');
    }
  }

  // --------------------------------------------------------------------------
  // Capabilities & Services: SVG Path + Unified Dark-to-Light Transition + Live Stats (Snippet 1)
  // --------------------------------------------------------------------------
  (function initServicesAndReveal() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.config({ ignoreMobileResize: true });
    }

    const still = prefersReducedMotion;
    const servicesEl = document.getElementById('services');
    const p = document.getElementById('p');
    const dot = document.querySelector('.pth .dot');
    const labs = gsap.utils.toArray('.pth .lab');
    const pthEl = document.querySelector('.pth');
    const ltEl = document.getElementById('lt');
    const marks = [0.03, 0.28, 0.58, 0.94];
    const len = p && p.getTotalLength ? p.getTotalLength() : 1800;

    // Easy tuning knobs:
    // DRAW_END: Where the path finishes drawing (e.g. 0.60 = 60% of scroll)
    // FADE_DURATION: How long the color blend and movement lasts (e.g. 0.28 = 28% of scroll)
    const DRAW_END = 0.60;
    const FADE_DURATION = 0.28;

    let countersAnimated = false;
    function animateCounters() {
      document.querySelectorAll('.lt [data-n]').forEach((el) => {
        const targetVal = +el.dataset.n;
        const o = { v: 0 };
        gsap.to(o, {
          v: targetVal,
          duration: 1.8,
          ease: 'power2.out',
          overwrite: true,
          onUpdate: () => {
            el.textContent = Math.round(o.v) + (el.dataset.n === '100' ? '%' : '+');
          }
        });
      });
    }

    function resetCounters() {
      document.querySelectorAll('.lt [data-n]').forEach((el) => {
        el.textContent = '0' + (el.dataset.n === '100' ? '%' : '+');
      });
    }

    function clampVal(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

    if (still) {
      if (p) gsap.set(p, { strokeDasharray: 'none', strokeDashoffset: 0 });
      labs.forEach((l) => gsap.set(l, { opacity: 1, y: 0 }));
      if (servicesEl) {
        servicesEl.style.setProperty('--services-bg', '#E5E5E5');
        servicesEl.style.setProperty('--services-hero-text', '#0c0b0a');
        servicesEl.style.setProperty('--services-shadow-alpha', '0');
        servicesEl.style.setProperty('--services-ghost-alpha', '0');
      }
      if (pthEl) pthEl.style.transform = 'translate3d(0, -100%, 0)';
      if (ltEl) ltEl.style.transform = 'translate3d(0, 0, 0)';
      animateCounters();
    } else if (servicesEl && p) {
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });

      ScrollTrigger.create({
        id: 'servicesTransition',
        trigger: '#services',
        start: 'top top',
        end: '+=220%',
        pin: true,
        scrub: 0.6,
        onUpdate(s) {
          const pr = s.progress;

          // 1. Draw SVG path and travel dot (0.00 to DRAW_END)
          const pathPr = clampVal(pr / DRAW_END);
          gsap.set(p, { strokeDashoffset: len * (1 - pathPr) });
          if (p.getPointAtLength) {
            const pt = p.getPointAtLength(len * pathPr);
            if (dot) {
              dot.style.left = (pt.x / 10) + '%';
              dot.style.top = (pt.y / 8) + '%';
            }
          }

          // Hero discipline labels appear in sequence along the path
          labs.forEach((l, i) => {
            const on = pathPr > marks[i];
            gsap.to(l, { opacity: on ? 1 : 0, y: on ? 0 : 20, duration: 0.3, overwrite: true });
          });

          // 2. Smooth color blend & upward drift (DRAW_END to DRAW_END + FADE_DURATION)
          const t = clampVal((pr - DRAW_END) / FADE_DURATION);

          // Hero curve drifts upward slowly, stats section rises into view from below
          if (pthEl) {
            pthEl.style.transform = `translate3d(0, ${-100 * t}%, 0)`;
          }
          if (ltEl) {
            ltEl.style.transform = `translate3d(0, ${100 * (1 - t)}%, 0)`;
          }

          // Continuous background color blend:
          // dark #1c1c1e (28, 28, 30) -> light #E5E5E5 (229, 229, 229)
          const bgR = Math.round(28 + t * (229 - 28));
          const bgG = Math.round(28 + t * (229 - 28));
          const bgB = Math.round(30 + t * (229 - 30));

          // Label text color: white #ffffff (255, 255, 255) -> dark #0c0b0a (12, 11, 10)
          const heroR = Math.round(255 - t * (255 - 12));
          const heroG = Math.round(255 - t * (255 - 11));
          const heroB = Math.round(255 - t * (255 - 10));

          // Text shadow and ghost line fade out as the background lightens
          const shadowA = (0.6 * (1 - t)).toFixed(2);
          const ghostA = (0.12 * (1 - t)).toFixed(2);

          servicesEl.style.setProperty('--services-bg', `rgb(${bgR}, ${bgG}, ${bgB})`);
          servicesEl.style.setProperty('--services-hero-text', `rgb(${heroR}, ${heroG}, ${heroB})`);
          servicesEl.style.setProperty('--services-shadow-alpha', shadowA);
          servicesEl.style.setProperty('--services-ghost-alpha', ghostA);

          // 3. Trigger live statistics counter animation once stats enter view
          if (t >= 0.45 && !countersAnimated) {
            countersAnimated = true;
            animateCounters();
          } else if (pr < 0.20 && countersAnimated) {
            countersAnimated = false;
            resetCounters();
          }
        }
      });
    }

    // 3. Circle reveal section transition seamlessly revealing Founders
    const cr = document.getElementById('cr');
    if (cr) {
      const crTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.cr',
          start: 'top top',
          end: '+=100%',
          pin: true,
          scrub: 0.6
        }
      });

      crTl
        .to('.cr .a h2', { scale: 0.88, opacity: 0.2, ease: 'none' }, 0)
        .to('.cr .b', { clipPath: 'circle(150% at 50% 50%)', ease: 'none' }, 0)
        .from('.cr-founders-title', { y: 25, opacity: 0, duration: 0.4, ease: 'power2.out' }, 0.2)
        .from('.cr .team-card', { y: 40, opacity: 0, stagger: 0.1, duration: 0.5, ease: 'power2.out' }, 0.3);
    }
  })();

  // --------------------------------------------------------------------------
  // Contact CTA: Let's talk · Start a project (GSAP Scramble, Liquid Fill, Burst)
  // --------------------------------------------------------------------------
  (function initContactCta() {
    if (typeof gsap === 'undefined') return;
    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
      if (window.lenis) {
        window.lenis.on('scroll', ScrollTrigger.update);
      }
    }

    const still = prefersReducedMotion;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (!still) {
      /* 1. ASCII scramble-decode when the section scrolls into view */
      const G = '01#@$%&*+<>/\\|{}[]';
      function scramble(el, delay) {
        const txt = el.dataset.t || (el.dataset.t = el.textContent);
        const n = txt.length;
        const o = { p: 0 };
        gsap.to(o, {
          p: 1,
          delay: delay || 0,
          duration: 0.9 + n * 0.03,
          ease: 'none',
          onUpdate() {
            const done = Math.floor(o.p * n);
            el.textContent = txt
              .split('')
              .map((c, i) => (c === ' ' ? ' ' : i < done ? c : G[Math.floor(Math.random() * G.length)]))
              .join('');
          },
          onComplete() {
            el.textContent = txt;
          }
        });
      }

      document.querySelectorAll('[data-scr]').forEach((el, i) => {
        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.create({
            trigger: el,
            start: 'top 88%',
            once: true,
            onEnter: () => scramble(el, i * 0.15)
          });
        } else {
          scramble(el, i * 0.15);
        }
      });

      /* 2. Button pops in with a bounce, ring pulses forever */
      const ctaBtn = document.getElementById('cta');
      if (ctaBtn) {
        if (typeof ScrollTrigger !== 'undefined') {
          gsap.from('#cta', {
            scale: 0.4,
            opacity: 0,
            duration: 1.1,
            ease: 'elastic.out(1, 0.5)',
            scrollTrigger: { trigger: '#cta', start: 'top 92%', once: true }
          });
        }
        gsap.fromTo(
          '.cta-btn-wrap .ring',
          { scale: 1, opacity: 0.5 },
          { scale: 1.25, opacity: 0, duration: 1.8, repeat: -1, ease: 'power2.out' }
        );

        if (fine) {
          const fill = ctaBtn.querySelector('.fill');
          const lblWrap = ctaBtn.querySelector('.lbl');
          const lbls = ctaBtn.querySelectorAll('.lbl span');

          /* 3. Magnetic pull, label drifting */
          ctaBtn.addEventListener('mousemove', (e) => {
            const r = ctaBtn.getBoundingClientRect();
            const dx = e.clientX - r.left - r.width / 2;
            const dy = e.clientY - r.top - r.height / 2;
            gsap.to(ctaBtn, { x: dx * 0.35, y: dy * 0.5, duration: 0.4, ease: 'power3.out' });
            if (lblWrap) {
              gsap.to(lblWrap, { x: dx * 0.12, y: dy * 0.2, duration: 0.4 });
            }
          });

          /* 4. Liquid fill rises + label rolls to twin */
          ctaBtn.addEventListener('mouseenter', () => {
            if (fill) gsap.to(fill, { yPercent: -75, duration: 0.6, ease: 'expo.out' });
            if (lbls.length) gsap.to(lbls, { yPercent: -100, duration: 0.5, ease: 'expo.out' });
            gsap.to(ctaBtn, { color: '#0c0b0a', duration: 0.3 });
          });

          ctaBtn.addEventListener('mouseleave', () => {
            gsap.to(ctaBtn, { x: 0, y: 0, color: '#fff', duration: 0.9, ease: 'elastic.out(1, 0.4)' });
            if (lblWrap) gsap.to(lblWrap, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' });
            if (fill) gsap.to(fill, { yPercent: 0, duration: 0.6, ease: 'expo.out' });
            if (lbls.length) gsap.to(lbls, { yPercent: 0, duration: 0.5, ease: 'expo.out' });
          });
        }

        /* 5. Click: burst of accent dots */
        ctaBtn.addEventListener('click', (e) => {
          for (let i = 0; i < 14; i++) {
            const d = document.createElement('i');
            Object.assign(d.style, {
              position: 'fixed',
              left: e.clientX + 'px',
              top: e.clientY + 'px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--color-accent)',
              pointerEvents: 'none',
              zIndex: '9999'
            });
            document.body.appendChild(d);
            const a = (i / 14) * Math.PI * 2;
            const r = gsap.utils.random(60, 140);
            gsap.to(d, {
              x: Math.cos(a) * r,
              y: Math.sin(a) * r,
              opacity: 0,
              scale: 0.2,
              duration: 0.8,
              ease: 'power3.out',
              onComplete: () => d.remove()
            });
          }
        });
      }
    }
  })();

  // --------------------------------------------------------------------------
  // Founders Section Scroll Reveal (IntersectionObserver)
  // --------------------------------------------------------------------------
  const foundersSection = document.getElementById('founders');
  if (foundersSection) {
    if (prefersReducedMotion) {
      foundersSection.classList.add('is-revealed');
    } else if ('IntersectionObserver' in window) {
      const foundersRevealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              foundersSection.classList.add('is-revealed');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          root: null,
          threshold: 0.05,
          rootMargin: '0px 0px -20px 0px'
        }
      );
      foundersRevealObserver.observe(foundersSection);
    } else {
      foundersSection.classList.add('is-revealed');
    }
  }

  // --------------------------------------------------------------------------
  // Creative Process: 3D Drum + Morph + Seamless Flood into Footer (Snippet 3)
  // --------------------------------------------------------------------------
  (function initCreativeProcess() {
    const cpSection = document.getElementById('process');
    if (!cpSection || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    /* ---- Shape morph: four polar radius profiles, blended by scroll ---- */
    const N = 140, TAU = Math.PI * 2;
    const mod = (x, m) => ((x % m) + m) % m;
    const profiles = [
      th => 62,                                                                              // Discover: circle
      th => 62 / Math.pow(Math.pow(Math.abs(Math.cos(th)), 4) + Math.pow(Math.abs(Math.sin(th)), 4), 0.25), // Define: squircle
      th => 58 + 16 * Math.cos(5 * th),                                                      // Design: flower
      th => { const f = mod(th + Math.PI / 2, TAU / 3); return 0.85 * 34 / Math.cos(f - Math.PI / 3) + 0.15 * 58; } // Deliver: triangle
    ];
    const radii = profiles.map(fn => Array.from({ length: N }, (_, k) => fn((k / N) * TAU)));
    const blob = document.getElementById('blob');
    const ease = t => t * t * (3 - 2 * t);

    function drawShape(s) {
      if (!blob) return;
      const i = Math.min(2, Math.floor(s)), f = ease(Math.min(1, s - i));
      let d = '';
      for (let k = 0; k < N; k++) {
        const th = (k / N) * TAU, r = radii[i][k] + (radii[i + 1][k] - radii[i][k]) * f;
        d += (k ? 'L' : 'M') + (r * Math.cos(th)).toFixed(2) + ' ' + (r * Math.sin(th)).toFixed(2);
      }
      blob.setAttribute('d', d + 'Z');
    }

    const cpFaces = [...document.querySelectorAll('.cp .face')];
    const barrel = document.getElementById('barrel');
    const shape = document.getElementById('shape');
    const orb = document.getElementById('orb');

    function updateProcess(p) {
      const s = Math.min(3, p * 3);
      drawShape(s);
      if (barrel) gsap.set(barrel, { rotateX: -s * 90 });
      cpFaces.forEach((f, i) => f.style.opacity = Math.max(0, 1 - Math.abs(i - s) * 0.9));
      
      const a = p * Math.PI * 4;
      if (orb) {
        orb.setAttribute('cx', (92 * Math.sin(a)).toFixed(2));
        orb.setAttribute('cy', (-92 * Math.cos(a)).toFixed(2));
      }
      if (shape) gsap.set(shape, { rotate: s * 40 });
    }

    if (prefersReducedMotion) {
      updateProcess(0);
    } else {
      updateProcess(0);

      // Entrance animation
      const cpTtl = document.getElementById('cp-ttl');
      if (cpTtl) {
        cpTtl.innerHTML = [...cpTtl.textContent].map(c => c === ' ' ? ' ' : `<span class="c">${c}</span>`).join('');
        const once = { trigger: '#process', start: 'top 75%', once: true };
        gsap.from('#cp-ttl .c', { yPercent: 120, rotate: () => gsap.utils.random(-25, 25), opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.03, scrollTrigger: once });
        gsap.from('.cp .drum', { y: 90, rotateX: 55, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: once });
        gsap.from('.cp .rt', { scale: 0.3, opacity: 0, duration: 1.4, ease: 'elastic.out(1,.6)', scrollTrigger: once });
      }

      // Single pinned scroll (75vh) for 4 drum stages, then immediately transitions directly to footer
      ScrollTrigger.create({
        trigger: '#process',
        start: 'top top',
        end: '+=75%',
        pin: true,
        scrub: 0.5,
        onUpdate: s => updateProcess(s.progress)
      });
    }
  })();

  // --------------------------------------------------------------------------
  // Footer Section Scroll Reveal & Staggered Column Entrance
  // --------------------------------------------------------------------------
  const footerSection = document.getElementById('contact');
  if (footerSection) {
    if (prefersReducedMotion) {
      footerSection.classList.add('is-revealed');
    } else if ('IntersectionObserver' in window) {
      const footerRevealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              footerSection.classList.add('is-revealed');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          root: null,
          threshold: 0.05,
          rootMargin: '0px 0px -40px 0px'
        }
      );
      footerRevealObserver.observe(footerSection);
    } else {
      footerSection.classList.add('is-revealed');
    }
  }

  // --------------------------------------------------------------------------
  // Smooth Scroll Navigation for Anchor Links
  // --------------------------------------------------------------------------
  const smoothScrollLinks = document.querySelectorAll('a[href^="#"]');
  smoothScrollLinks.forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      const targetEl = document.querySelector(href);
      if (targetEl) {
        e.preventDefault();
        if (window.lenis) {
          window.lenis.scrollTo(targetEl, {
            offset: 0,
            duration: 1.2
          });
        } else {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // Intelligent Section-Based Scroll Continuity on Refresh & Navigation
  // Ensures refreshing always continues from whichever section the user was viewing
  // --------------------------------------------------------------------------
  const allTrackedSections = [
    'hero',
    'core-disciplines',
    'crafted-imagination',
    'workflow-video',
    'brand-identity',
    'motion-video',
    'showcase',
    'services',
    'founders',
    'process',
    'contact'
  ];

  function getCurrentlyViewedSection() {
    if (window.scrollY < 120) return 'hero';

    const triggerLine = window.innerHeight * 0.4;
    let activeId = 'hero';

    for (let i = 0; i < allTrackedSections.length; i++) {
      const id = allTrackedSections[i];
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= triggerLine && rect.bottom > 60) {
          activeId = id;
        }
      }
    }
    return activeId;
  }

  let saveSectionTimer = null;
  function saveCurrentSection() {
    try {
      const current = getCurrentlyViewedSection();
      sessionStorage.setItem('asciitech_active_section', current);
    } catch (e) {}
  }

  window.addEventListener('scroll', () => {
    clearTimeout(saveSectionTimer);
    saveSectionTimer = setTimeout(saveCurrentSection, 120);
  }, { passive: true });

  window.addEventListener('beforeunload', saveCurrentSection);
  window.addEventListener('pagehide', saveCurrentSection);

  // Track outgoing links to posters.html to remember return position
  document.querySelectorAll('a[href*="posters.html"]').forEach((link) => {
    link.addEventListener('click', () => {
      try {
        sessionStorage.setItem('peacock_skip_once', '1');
        sessionStorage.setItem('asciitech_active_section', 'showcase');
      } catch (e) {}
    });
  });

  function restoreActiveSection() {
    try {
      const targetId = sessionStorage.getItem('asciitech_active_section');
      if (!targetId || targetId === 'hero') {
        if (window.scrollY > 0) {
          if (window.lenis) {
            window.lenis.scrollTo(0, { immediate: true });
          } else {
            window.scrollTo(0, 0);
          }
        }
        return;
      }

      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const doScroll = () => {
          if (window.lenis) {
            window.lenis.scrollTo(targetEl, { immediate: true });
          } else {
            targetEl.scrollIntoView({ behavior: 'instant', block: 'start' });
          }
          if (typeof updateParallax === 'function') {
            updateParallax(window.scrollY);
          }
        };

        doScroll();
        window.requestAnimationFrame(doScroll);
        window.setTimeout(doScroll, 80);
        window.setTimeout(doScroll, 350);
      }
    } catch (e) {}
  }

  // Restore section on load, pageshow, and after layout settles
  restoreActiveSection();
  window.addEventListener('pageshow', restoreActiveSection);
  window.addEventListener('load', () => {
    window.setTimeout(restoreActiveSection, 50);
  });
});
