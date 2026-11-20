/**
 * Peacock 3D Loading Animation Engine (ASCII Edition - Pure White on Pure Black)
 * Built with Three.js
 * 
 * Choreography:
 * 1. Body appears with elastic entrance (pure white torso and two "ii" legs)
 * 2. Feathers deploy sequentially from feather1 to feather13 along their radial angle (pure white)
 * 3. Jiggle effect begins on body & plumage
 * 4. The peacock legs ("ii") kick / push the letters A, S, C into place to form "ASCII" (pure white)
 * 5. Completed glory pose on pure black background (no glitter / particle clutter)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['three'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('three'));
  } else {
    root.PeacockLoader = factory(root.THREE);
  }
}(typeof self !== 'undefined' ? self : this, function (THREE) {

  // Color Themes (White on Pure Black is Default)
  const THEMES = {
    white: {
      name: 'Pure White Minimal',
      bg: '#000000',
      bgGlow: '#000000',
      body: '#ffffff',
      bodyEmissive: '#111111',
      bodyRoughness: 0.3,
      bodyMetalness: 0.08,
      feathers: Array(13).fill('#ffffff'),
      letters: {
        A: '#ffffff',
        s: '#ffffff',
        c: '#ffffff'
      },
      accentColor: '#ffffff'
    },
    royal: {
      name: 'Royal Sapphire',
      bg: '#000000',
      bgGlow: '#000000',
      body: '#0096c7',
      bodyEmissive: '#023e8a',
      bodyRoughness: 0.25,
      bodyMetalness: 0.4,
      feathers: [
        '#7b2cbf', '#9d4edd', '#c77dff', '#e0aaff',
        '#ff4d6d', '#ff758f', '#ff9e00', '#ffbe0b',
        '#52b788', '#2a9d8f', '#00b4d8', '#0077b6',
        '#03045e'
      ],
      letters: {
        A: '#7b2cbf',
        s: '#ffbe0b',
        c: '#00b4d8'
      },
      accentColor: '#00b4d8'
    },
    emerald: {
      name: 'Imperial Emerald & Gold',
      bg: '#000000',
      bgGlow: '#000000',
      body: '#10b981',
      bodyEmissive: '#04442a',
      bodyRoughness: 0.2,
      bodyMetalness: 0.6,
      feathers: [
        '#ffd166', '#e9c46a', '#2a9d8f', '#52b788',
        '#74c69d', '#95d5b2', '#b7e4c7', '#95d5b2',
        '#74c69d', '#52b788', '#2a9d8f', '#264653',
        '#e9c46a'
      ],
      letters: {
        A: '#ffd166',
        s: '#52b788',
        c: '#2a9d8f'
      },
      accentColor: '#10b981'
    },
    cyber: {
      name: 'Cyberpunk Neon',
      bg: '#000000',
      bgGlow: '#000000',
      body: '#00f5d4',
      bodyEmissive: '#007f5f',
      bodyRoughness: 0.15,
      bodyMetalness: 0.7,
      feathers: [
        '#7209b7', '#560bad', '#3a0ca3', '#4361ee',
        '#4cc9f0', '#00f5d4', '#70e000', '#ffdd00',
        '#ff9e00', '#ff0054', '#ff5400', '#f72585',
        '#b5179e'
      ],
      letters: {
        A: '#f72585',
        s: '#ffdd00',
        c: '#00f5d4'
      },
      accentColor: '#00f5d4'
    },
    sunset: {
      name: 'Sunset Radiance',
      bg: '#000000',
      bgGlow: '#000000',
      body: '#ff5400',
      bodyEmissive: '#781d00',
      bodyRoughness: 0.3,
      bodyMetalness: 0.3,
      feathers: [
        '#3a0ca3', '#7209b7', '#b5179e', '#f72585',
        '#ff0054', '#ff5400', '#ff7900', '#ff9e00',
        '#ffaa00', '#ffb700', '#ffd000', '#ffe066',
        '#ff5400'
      ],
      letters: {
        A: '#7209b7',
        s: '#ff0054',
        c: '#ffd000'
      },
      accentColor: '#ff7900'
    }
  };

  // Easing functions
  function easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  function easeOutQuad(x) {
    return 1 - (1 - x) * (1 - x);
  }

  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  function easeOutElastic(x) {
    const c4 = (2 * Math.PI) / 3;
    return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
  }

  class PeacockLoader {
    constructor(options = {}) {
      this.container = typeof options.container === 'string' 
        ? document.querySelector(options.container) 
        : (options.container || document.body);
      
      // Default to pure white theme on pure black
      this.themeKey = options.theme || 'white';
      this.currentTheme = THEMES[this.themeKey] || THEMES.white;
      this.speed = options.speed || 1.0;
      this.loop = options.loop !== undefined ? options.loop : true;
      this.interactive = options.interactive !== undefined ? options.interactive : true;
      this.onComplete = options.onComplete || null;
      this.onProgress = options.onProgress || null;
      
      // Feather sequence order: 1 to 13
      this.featherOrder = [];
      for (let i = 1; i <= 13; i++) {
        this.featherOrder.push(`feather${i}`);
      }
      
      // -------------------------------------------------------------
      // Animation Timeline Milestones (seconds)
      // -------------------------------------------------------------
      // 1. Body entrance: 0.0s -> 0.45s
      this.tBodyStart = 0.0;
      this.tBodyEnd = 0.45;
      
      // 2. Feathers sequence (feather1 to feather13): 0.45s -> 1.85s
      this.tFeathersStart = 0.45;
      this.featherStep = 0.095;
      this.featherDuration = 0.24;
      this.tFeathersEnd = this.tFeathersStart + (this.featherOrder.length - 1) * this.featherStep + this.featherDuration; // ~1.83s
      
      // 3. Jiggle + Leg Kick of A, S, C: 1.85s -> 2.85s
      this.tJiggleStart = 1.85;
      this.tKickImpact = 2.15; // Leg strikes / pushes A S C
      this.tAscSettle = 2.75;  // A, S, C locked into baseline
      this.tJiggleEnd = 2.85;
      
      // 4. Completed Glory Pose / Cycle End: 2.85s -> 3.80s
      this.tHoldDuration = 0.95;
      this.tTotalCycle = this.tJiggleEnd + this.tHoldDuration; // ~3.80s
      
      this.animTime = 0.0;
      this.isPlaying = true;
      this.isFinished = false;
      
      // Cache
      this.feathers = {};
      this.letters = {};
      this.bodyPivot = null;
      this.rootGroup = null;
      this.lights = {};
      
      this.initScene();
      this.buildModel();
      this.buildLetters();
      this.bindEvents();
      
      this.lastTimestamp = performance.now();
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    initScene() {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;

      this.scene = new THREE.Scene();
      // Pure black background for the 3D scene
      this.scene.background = new THREE.Color(0x000000);

      const isMobile = width < 600;
      this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      this.camera.position.set(0, 0, isMobile ? 11.2 : 8.2);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setSize(width, height);
      this.renderer.setClearColor(0x000000, 1.0);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;
      
      this.container.appendChild(this.renderer.domElement);

      if (this.interactive && window.THREE && window.THREE.OrbitControls) {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.enablePan = false;
        this.controls.minDistance = 4.0;
        this.controls.maxDistance = 14.0;
        this.controls.maxPolarAngle = Math.PI * 0.75;
        this.controls.minPolarAngle = Math.PI * 0.25;
      }

      this.rootGroup = new THREE.Group();
      this.updateScale();
      this.scene.add(this.rootGroup);

      this.setupLighting();
    }

    updateScale() {
      if (!this.rootGroup) return;
      // Logo size: 45% in laptop (desktop), 35% in mobile (<= 768px)
      const isMobile = window.innerWidth <= 768;
      const targetScale = isMobile ? 0.35 : 0.45;
      this.rootGroup.scale.set(targetScale, targetScale, targetScale);
    }

    setupLighting() {
      // Ambient Light: soft clean neutral fill so dark sides of white model stay visible
      this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.65);
      this.scene.add(this.lights.ambient);

      // Key Directional Light (Front-Top-Right)
      this.lights.key = new THREE.DirectionalLight(0xffffff, 1.4);
      this.lights.key.position.set(3, 4, 6);
      this.scene.add(this.lights.key);

      // Fill Light (Opposite lower side) to give 3D depth to white surfaces
      this.lights.fill = new THREE.DirectionalLight(0xe0e6ed, 0.6);
      this.lights.fill.position.set(-4, -2, 4);
      this.scene.add(this.lights.fill);

      // Rim Light: Back rim lighting to carve the pristine white silhouettes against pure black
      this.lights.rim = new THREE.DirectionalLight(0xffffff, 0.9);
      this.lights.rim.position.set(0, 4, -4);
      this.scene.add(this.lights.rim);
    }

    buildModel() {
      const data = window.PEACOCK_MODEL_DATA;
      const pivots = window.PEACOCK_PIVOT_INFO;
      
      if (!data) {
        console.error('PEACOCK_MODEL_DATA not found.');
        return;
      }

      // 1. Peacock Body (Torso and two "ii" legs)
      const bodyData = data['peacock'];
      if (bodyData) {
        const bodyGeo = new THREE.BufferGeometry();
        bodyGeo.setAttribute('position', new THREE.Float32BufferAttribute(bodyData.vertices, 3));
        bodyGeo.setIndex(bodyData.indices);
        bodyGeo.computeVertexNormals();

        const bCenter = pivots.body ? pivots.body.center : bodyData.pivot;
        this.bodyPivot = new THREE.Group();
        this.bodyPivot.position.set(bCenter[0], bCenter[1], bCenter[2] || 0);
        this.bodyPivotOrigPos = new THREE.Vector3(bCenter[0], bCenter[1], bCenter[2] || 0);

        bodyGeo.translate(-bCenter[0], -bCenter[1], -bCenter[2] || 0);

        this.bodyMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(this.currentTheme.body),
          roughness: this.currentTheme.bodyRoughness,
          metalness: this.currentTheme.bodyMetalness,
          emissive: new THREE.Color(this.currentTheme.bodyEmissive),
          emissiveIntensity: 0.15,
          side: THREE.DoubleSide
        });

        this.bodyMesh = new THREE.Mesh(bodyGeo, this.bodyMat);
        this.bodyPivot.add(this.bodyMesh);
        this.rootGroup.add(this.bodyPivot);

        this.bodyPivot.scale.set(0, 0, 0);
      }

      // 2. Build Feathers (feather1 to feather13)
      this.feathersGroup = new THREE.Group();
      this.rootGroup.add(this.feathersGroup);

      this.featherOrder.forEach((fname, idx) => {
        const fData = data[fname];
        if (!fData) return;

        const fGeo = new THREE.BufferGeometry();
        fGeo.setAttribute('position', new THREE.Float32BufferAttribute(fData.vertices, 3));
        fGeo.setIndex(fData.indices);
        fGeo.computeVertexNormals();

        const pInfo = (pivots && pivots[fname]) || {};
        const base = pInfo.base || fData.pivot || [0, 0, 0];
        const tip = pInfo.tip || [0, 1, 0];
        const angleDeg = pInfo.angle_deg !== undefined ? pInfo.angle_deg : fData.angle_deg;
        const angleRad = (angleDeg * Math.PI) / 180.0;

        const rayDir = new THREE.Vector2(tip[0] - base[0], tip[1] - base[1]).normalize();

        const pivotGroup = new THREE.Group();
        pivotGroup.position.set(base[0], base[1], base[2] || 0);

        fGeo.translate(-base[0], -base[1], -base[2] || 0);

        const colorHex = this.currentTheme.feathers[idx] || this.currentTheme.accentColor;
        const featherMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorHex),
          roughness: 0.3,
          metalness: 0.08,
          emissive: new THREE.Color(colorHex),
          emissiveIntensity: 0.08,
          side: THREE.DoubleSide
        });

        const featherMesh = new THREE.Mesh(fGeo, featherMat);
        pivotGroup.add(featherMesh);
        this.feathersGroup.add(pivotGroup);

        pivotGroup.scale.set(0, 0, 0);

        this.feathers[fname] = {
          pivotGroup,
          mesh: featherMesh,
          material: featherMat,
          basePos: new THREE.Vector3(base[0], base[1], base[2] || 0),
          baseAngle: angleRad,
          rayDir: rayDir,
          colorHex: colorHex,
          index: idx
        };
      });
    }

    buildLetters() {
      const data = window.PEACOCK_MODEL_DATA;
      const pivots = window.PEACOCK_PIVOT_INFO;
      
      this.lettersGroup = new THREE.Group();
      this.rootGroup.add(this.lettersGroup);

      const letterNames = ['A', 's', 'c'];
      letterNames.forEach(key => {
        const lData = data[key];
        if (!lData) return;

        const lGeo = new THREE.BufferGeometry();
        lGeo.setAttribute('position', new THREE.Float32BufferAttribute(lData.vertices, 3));
        lGeo.setIndex(lData.indices);
        lGeo.computeVertexNormals();

        const pInfo = (pivots && pivots[key]) || {};
        const targetCenter = pInfo.center || [0, 0, 0];

        const pivotGroup = new THREE.Group();
        pivotGroup.position.set(targetCenter[0], targetCenter[1], targetCenter[2] || 0);

        lGeo.translate(-targetCenter[0], -targetCenter[1], -targetCenter[2] || 0);

        const colHex = (this.currentTheme.letters && this.currentTheme.letters[key]) || this.currentTheme.accentColor;
        const letterMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colHex),
          roughness: 0.3,
          metalness: 0.1,
          emissive: new THREE.Color(colHex),
          emissiveIntensity: 0.1,
          side: THREE.DoubleSide
        });

        const letterMesh = new THREE.Mesh(lGeo, letterMat);
        pivotGroup.add(letterMesh);
        this.lettersGroup.add(pivotGroup);

        // Hide initially until kicked from legs
        pivotGroup.scale.set(0, 0, 0);

        this.letters[key] = {
          pivotGroup,
          mesh: letterMesh,
          material: letterMat,
          targetPos: new THREE.Vector3(targetCenter[0], targetCenter[1], targetCenter[2] || 0),
          kickStartPos: new THREE.Vector3(-0.35, -1.65, 0.0)
        };
      });
    }

    update(deltaTime) {
      if (!this.isPlaying) return;

      const dt = deltaTime * this.speed;
      this.animTime += dt;

      if (this.animTime >= this.tTotalCycle) {
        if (this.loop && !this.isFinished) {
          this.animTime = this.animTime % this.tTotalCycle;
        } else {
          this.animTime = this.tTotalCycle;
          if (!this.hasTriggeredComplete) {
            this.hasTriggeredComplete = true;
            if (this.onComplete) this.onComplete();
          }
        }
      }

      const t = this.animTime;

      // -------------------------------------------------------------
      // PHASE 1: PEACOCK BODY ENTRANCE (Torso + "ii" legs)
      // -------------------------------------------------------------
      if (this.bodyPivot) {
        if (t < this.tBodyStart) {
          this.bodyPivot.scale.set(0, 0, 0);
        } else if (t <= this.tBodyEnd) {
          const u = (t - this.tBodyStart) / (this.tBodyEnd - this.tBodyStart);
          const s = easeOutBack(u);
          this.bodyPivot.scale.set(s, s, s);
          this.bodyPivot.rotation.z = (1 - u) * 0.25;
        } else if (t < this.tJiggleStart) {
          this.bodyPivot.scale.set(1, 1, 1);
          this.bodyPivot.rotation.z = 0;
          this.bodyPivot.position.copy(this.bodyPivotOrigPos);
        }
      }

      // -------------------------------------------------------------
      // PHASE 2: SEQUENTIAL FEATHER DEPLOYMENT (feather1 -> feather13)
      // "WITH THE SAME ANGLE EACH FEATHER TO ANIMATE"
      // -------------------------------------------------------------
      this.featherOrder.forEach((fname, i) => {
        const item = this.feathers[fname];
        if (!item) return;

        const fStart = this.tFeathersStart + i * this.featherStep;
        const fEnd = fStart + this.featherDuration;

        if (t < fStart) {
          item.pivotGroup.scale.set(0, 0, 0);
          item.pivotGroup.position.copy(item.basePos);
          item.pivotGroup.rotation.z = 0;
          item.material.emissiveIntensity = 0.05;
        } else if (t < fEnd) {
          const u = (t - fStart) / this.featherDuration;
          const s = easeOutBack(u);

          item.pivotGroup.scale.set(s, s, s);
          const angleOffset = (1 - easeOutQuad(u)) * 0.22;
          item.pivotGroup.rotation.z = angleOffset;

          const popDist = (1 - easeOutQuad(u)) * -0.25;
          item.pivotGroup.position.set(
            item.basePos.x + item.rayDir.x * popDist,
            item.basePos.y + item.rayDir.y * popDist,
            item.basePos.z
          );

          item.material.emissiveIntensity = THREE.MathUtils.lerp(0.5, 0.08, u);
        } else if (t < this.tJiggleStart) {
          item.pivotGroup.scale.set(1, 1, 1);
          item.pivotGroup.position.copy(item.basePos);
          item.pivotGroup.rotation.z = 0;
          item.material.emissiveIntensity = 0.08;
        }
      });

      // -------------------------------------------------------------
      // PHASE 3: PEACOCK JIGGLE + LEGS ("ii") KICK & PUSH OF "A S C"
      // -------------------------------------------------------------
      if (t >= this.tJiggleStart && t < this.tJiggleEnd) {
        const tj = (t - this.tJiggleStart) / (this.tJiggleEnd - this.tJiggleStart);
        const decay = Math.exp(-3.2 * tj);

        // Body Jiggle + Leg Kick Motion
        if (this.bodyPivot) {
          let kickAngle = 0;
          if (t < this.tKickImpact) {
            const ku = (t - this.tJiggleStart) / (this.tKickImpact - this.tJiggleStart);
            kickAngle = Math.sin(ku * Math.PI * 0.5) * 0.16; // Windup
          } else {
            const ku = (t - this.tKickImpact) / (this.tJiggleEnd - this.tKickImpact);
            const kickImpulse = Math.exp(-4.5 * ku) * Math.sin(ku * Math.PI * 8);
            kickAngle = -0.22 * Math.exp(-5.0 * ku) + kickImpulse * 0.08;
          }

          const bodySquash = 0.15 * decay * Math.sin(tj * Math.PI * 10);
          this.bodyPivot.scale.set(1.0 - bodySquash * 0.6, 1.0 + bodySquash, 1.0);
          this.bodyPivot.rotation.z = kickAngle;
        }

        // Feather Ripple Jiggle
        this.featherOrder.forEach((fname, i) => {
          const item = this.feathers[fname];
          if (!item) return;

          const wavePhase = i * 0.32;
          const featherDecay = Math.exp(-3.0 * Math.max(0, tj - i * 0.02));
          const jiggleAngle = 0.12 * featherDecay * Math.sin(tj * Math.PI * 12 - wavePhase);
          const jiggleScale = 1.0 + 0.08 * featherDecay * Math.cos(tj * Math.PI * 10 - wavePhase);

          item.pivotGroup.rotation.z = jiggleAngle;
          item.pivotGroup.scale.set(jiggleScale, jiggleScale, jiggleScale);
        });
      } else if (t >= this.tJiggleEnd) {
        // Settle body & feathers in completed glory pose
        const idleTime = t - this.tJiggleEnd;
        const breath = 1.0 + Math.sin(idleTime * 2.5) * 0.015;

        if (this.bodyPivot) {
          this.bodyPivot.scale.set(breath, breath, 1.0);
          this.bodyPivot.rotation.z = 0;
        }
        this.featherOrder.forEach((fname, i) => {
          const item = this.feathers[fname];
          if (item) {
            const fBreath = 1.0 + Math.sin(idleTime * 2.5 + i * 0.15) * 0.012;
            item.pivotGroup.scale.set(fBreath, fBreath, 1.0);
            item.pivotGroup.rotation.z = 0;
          }
        });
      }

      // -------------------------------------------------------------
      // KICK & SLIDE OF LETTERS A, S, C (Spelling ASCII)
      // -------------------------------------------------------------
      const kickOrder = [
        { key: 'c', delay: 0.00, duration: 0.38 },
        { key: 's', delay: 0.08, duration: 0.42 },
        { key: 'A', delay: 0.16, duration: 0.46 }
      ];

      kickOrder.forEach(({ key, delay, duration }) => {
        const item = this.letters[key];
        if (!item) return;

        const letterStart = this.tKickImpact + delay;
        const letterEnd = letterStart + duration;

        if (t < letterStart) {
          item.pivotGroup.scale.set(0, 0, 0);
          item.pivotGroup.position.copy(item.kickStartPos);
        } else if (t < letterEnd) {
          const u = (t - letterStart) / duration;
          const easeProgress = easeOutElastic(u);

          item.pivotGroup.scale.set(easeProgress, easeProgress, easeProgress);
          item.pivotGroup.position.lerpVectors(item.kickStartPos, item.targetPos, easeProgress);
          item.pivotGroup.rotation.z = (1 - easeOutCubic(u)) * (key === 'c' ? 0.35 : key === 's' ? 0.5 : 0.65);
          item.material.emissiveIntensity = THREE.MathUtils.lerp(0.6, 0.1, u);
        } else {
          item.pivotGroup.scale.set(1, 1, 1);
          item.pivotGroup.position.copy(item.targetPos);
          item.pivotGroup.rotation.z = 0;
          item.material.emissiveIntensity = 0.1;
        }
      });

      // Subtle float tilt on the entire logo
      if (this.rootGroup) {
        this.rootGroup.position.y = Math.sin(this.animTime * 1.8) * 0.04;
        this.rootGroup.rotation.y = Math.sin(this.animTime * 1.2) * 0.035;
      }

      // Progress reporting
      const loadingPercent = this.calculateProgress(t);
      if (this.onProgress) {
        let statusText = 'Initializing...';
        if (t < this.tBodyEnd) statusText = 'Summoning Peacock...';
        else if (t < this.tFeathersEnd) {
          const count = Math.min(13, Math.floor(((t - this.tFeathersStart) / (this.tFeathersEnd - this.tFeathersStart)) * 13) + 1);
          statusText = `Fanning Feathers (${count}/13)...`;
        } else if (t < this.tKickImpact) {
          statusText = 'Peacock Jiggle...';
        } else if (t < this.tAscSettle) {
          statusText = 'Legs Kick: A S C I I!';
        } else {
          statusText = 'ASCII Ready!';
        }
        this.onProgress(loadingPercent, statusText);
      }
    }

    calculateProgress(t) {
      if (t <= 0) return 0;
      if (t >= this.tAscSettle) return 100;

      if (t < this.tBodyEnd) {
        return Math.round((t / this.tBodyEnd) * 15);
      } else if (t < this.tFeathersEnd) {
        const u = (t - this.tFeathersStart) / (this.tFeathersEnd - this.tFeathersStart);
        return Math.round(15 + u * 55); // 15% -> 70%
      } else {
        const u = (t - this.tFeathersEnd) / (this.tAscSettle - this.tFeathersEnd);
        return Math.round(70 + u * 30); // 70% -> 100%
      }
    }

    animate() {
      if (!this.isPlaying) return;
      this.animFrameId = requestAnimationFrame(this.animate);
      const now = performance.now();
      const deltaTime = (now - this.lastTimestamp) / 1000.0;
      this.lastTimestamp = now;

      this.update(Math.min(deltaTime, 0.1));

      if (this.controls) {
        this.controls.update();
      }

      this.renderer.render(this.scene, this.camera);
    }

    setTheme(key) {
      if (!THEMES[key]) return;
      this.themeKey = key;
      this.currentTheme = THEMES[key];

      if (this.bodyMat) {
        this.bodyMat.color.set(this.currentTheme.body);
        this.bodyMat.emissive.set(this.currentTheme.bodyEmissive);
        this.bodyMat.roughness = this.currentTheme.bodyRoughness;
        this.bodyMat.metalness = this.currentTheme.bodyMetalness;
      }

      this.featherOrder.forEach((fname, idx) => {
        const item = this.feathers[fname];
        if (!item) return;
        const col = this.currentTheme.feathers[idx] || this.currentTheme.accentColor;
        item.material.color.set(col);
        item.material.emissive.set(col);
      });

      ['A', 's', 'c'].forEach(k => {
        const item = this.letters[k];
        if (!item) return;
        const col = (this.currentTheme.letters && this.currentTheme.letters[k]) || this.currentTheme.accentColor;
        item.material.color.set(col);
        item.material.emissive.set(col);
      });

      if (this.lights.rim) {
        this.lights.rim.color.set(this.currentTheme.accentColor);
      }
    }

    setSpeed(speed) {
      this.speed = Math.max(0.1, Math.min(4.0, speed));
    }

    replay() {
      this.animTime = 0.0;
      this.isPlaying = true;
      this.hasTriggeredComplete = false;
    }

    play() {
      this.isPlaying = true;
    }

    pause() {
      this.isPlaying = false;
    }

    reset() {
      this.animTime = 0.0;
      this.update(0);
    }

    finish() {
      this.isFinished = true;
      if (this.animTime < this.tJiggleStart) {
        this.animTime = this.tJiggleStart;
      }
    }

    bindEvents() {
      window.addEventListener('resize', () => {
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;
        const isMobile = width < 600;
        this.camera.position.z = isMobile ? 11.2 : 8.2;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.updateScale();
      });
    }

    destroy() {
      this.isPlaying = false;
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
      }
      if (this.renderer) {
        if (typeof this.renderer.dispose === 'function') {
          this.renderer.dispose();
        }
        if (this.renderer.domElement) {
          this.renderer.domElement.remove();
        }
      }
    }
  }

  PeacockLoader.THEMES = THEMES;
  return PeacockLoader;
}));
