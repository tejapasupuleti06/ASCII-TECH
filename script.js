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
  // 3D Saturn Cosmic Supernova WebGL Background (matching ASCIITECH palette)
  // Driven by Three.js InstancedMesh with 20,000 crystal shard particles
  // Palette: Deep Charcoal (#0c0b0a), Warm Amber/Orange (#FF8C1A), Incandescent Core (#FFF8EE)
  // Interactive mouse/touch parallax, smooth 120FPS, offscreen auto-pause
  // --------------------------------------------------------------------------
  const heroSupernovaCanvas = document.getElementById('hero-supernova-canvas');
  if (heroSupernovaCanvas && typeof THREE !== 'undefined') {
    let animId = null;
    let isVisible = true;
    let mouseX = 0, mouseY = 0;
    let targetRotX = 0, targetRotY = 0;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0c0b0a, 0.007);

    const getDimensions = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      return { w, h };
    };

    let { w, h } = getDimensions();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, w > 768 ? 6 : 5, w > 768 ? 76 : 88);

    const renderer = new THREE.WebGLRenderer({
      canvas: heroSupernovaCanvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    // Supernova Group
    const supernovaGroup = new THREE.Group();
    supernovaGroup.position.set(w > 768 ? 10 : 0, w > 768 ? 4 : 8, 0);
    scene.add(supernovaGroup);

    // Deep bronze ambient light
    const ambientLight = new THREE.AmbientLight(0x281a10, 1.4);
    scene.add(ambientLight);

    // Incandescent Core PointLight
    const coreLight = new THREE.PointLight(0xFFB84D, 4.2, 95, 1.4);
    coreLight.position.set(0, 0, 0);
    supernovaGroup.add(coreLight);

    // Key rim light with brand accent orange (#FF8C1A)
    const rimLight = new THREE.DirectionalLight(0xFF8C1A, 2.5);
    rimLight.position.set(45, 50, 40);
    scene.add(rimLight);

    // Secondary fill backlight
    const backLight = new THREE.DirectionalLight(0x4A2508, 1.8);
    backLight.position.set(-45, -30, -35);
    scene.add(backLight);

    // Stardust Core Halo
    const starGeo = new THREE.BufferGeometry();
    const starCount = 350;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const sr = Math.pow(Math.random(), 1.8) * 16;
      starPos[i * 3]     = sr * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = sr * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = sr * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xFFC066,
      size: 0.9,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    supernovaGroup.add(starPoints);

    // Palette Colors matching ASCIITECH theme
    const cCore   = new THREE.Color('#FFF8EE'); // Blazing white-gold core
    const cLight  = new THREE.Color('#FFD182'); // Luminous warm amber
    const cOrange = new THREE.Color('#FF8C1A'); // Primary brand accent (#FF8C1A)
    const cEmber  = new THREE.Color('#C95400'); // Deep radiant ember
    const cDust   = new THREE.Color('#4D1E00'); // Cosmic dark bronze dust

    // Setup InstancedMesh
    function buildMesh(centers) {
      const count = centers.length / 3;
      const geom = new THREE.TetrahedronGeometry(0.36, 0);
      const mat = new THREE.MeshStandardMaterial({
        roughness: 0.3,
        metalness: 0.7,
        flatShading: true
      });

      const instancedMesh = new THREE.InstancedMesh(geom, mat, count);
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();

      for (let i = 0; i < count; i++) {
        const x = centers[i * 3];
        const y = centers[i * 3 + 1];
        const z = centers[i * 3 + 2];

        dummy.position.set(x, y, z);
        dummy.rotation.set(
          (x * 7.91) % Math.PI,
          (y * 11.37) % Math.PI,
          (z * 13.82) % Math.PI
        );
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);

        // Radial color gradient
        const r = Math.sqrt(x * x + y * y + z * z);
        const normR = Math.min(r / 62, 1.0);

        if (normR < 0.22) {
          color.copy(cCore).lerp(cLight, normR / 0.22);
        } else if (normR < 0.55) {
          color.copy(cLight).lerp(cOrange, (normR - 0.22) / 0.33);
        } else if (normR < 0.82) {
          color.copy(cOrange).lerp(cEmber, (normR - 0.55) / 0.27);
        } else {
          color.copy(cEmber).lerp(cDust, (normR - 0.82) / 0.18);
        }

        instancedMesh.setColorAt(i, color);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
      supernovaGroup.add(instancedMesh);
      return instancedMesh;
    }

    let instancedMesh = null;

    // Fetch binary centers with fallback
    fetch('assets/models/saturn_centers.bin')
      .then(res => {
        if (!res.ok) throw new Error('Fetch failed');
        return res.arrayBuffer();
      })
      .then(buf => {
        instancedMesh = buildMesh(new Float32Array(buf));
      })
      .catch(() => {
        // Fallback procedural distribution if offline
        const count = 15000;
        const fallback = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = 10 + Math.pow(Math.random(), 0.7) * 45;
          fallback[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
          fallback[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
          fallback[i * 3 + 2] = r * Math.cos(phi);
        }
        instancedMesh = buildMesh(fallback);
      });

    // Mouse & Touch Parallax
    window.addEventListener('mousemove', e => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    window.addEventListener('touchmove', e => {
      if (e.touches && e.touches.length > 0) {
        mouseX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
      }
    }, { passive: true });

    // Resize Handler
    window.addEventListener('resize', () => {
      const { w: newW, h: newH } = getDimensions();
      camera.aspect = newW / newH;
      camera.position.set(0, newW > 768 ? 6 : 5, newW > 768 ? 76 : 88);
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      supernovaGroup.position.set(newW > 768 ? 10 : 0, newW > 768 ? 4 : 8, 0);
    }, { passive: true });

    // Animation Loop
    let t = 0;
    function renderFrame() {
      if (!isVisible) return;

      t += 0.0035;
      targetRotY = mouseX * 0.35;
      targetRotX = mouseY * 0.25;

      supernovaGroup.rotation.y += (t * 0.6 + targetRotY - supernovaGroup.rotation.y) * 0.04;
      supernovaGroup.rotation.x += (Math.sin(t * 0.45) * 0.12 + targetRotX - supernovaGroup.rotation.x) * 0.04;
      supernovaGroup.rotation.z = Math.cos(t * 0.35) * 0.08;

      starPoints.rotation.y = t * 0.9;
      starPoints.rotation.x = t * 0.4;

      renderer.render(scene, camera);

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(renderFrame);
      }
    }

    // Performance Observer: pause render loop when hero is scrolled out of view
    if ('IntersectionObserver' in window) {
      const heroObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (!isVisible) {
              isVisible = true;
              animId = requestAnimationFrame(renderFrame);
            }
          } else {
            isVisible = false;
            if (animId) cancelAnimationFrame(animId);
          }
        });
      }, { threshold: 0.01 });

      const heroEl = document.getElementById('hero') || heroSupernovaCanvas;
      heroObserver.observe(heroEl);
    }

    animId = requestAnimationFrame(renderFrame);
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
  // Core Disciplines: Interactive Card Hover & Selection
  // --------------------------------------------------------------------------
  const disciplinesGrid = document.querySelector('.disciplines-grid');
  const disciplineCards = document.querySelectorAll('.discipline-card');

  disciplineCards.forEach((card) => {
    card.addEventListener('pointerenter', () => {
      disciplineCards.forEach((c) => c.classList.remove('is-active'));
      card.classList.add('is-active');
      if (disciplinesGrid) disciplinesGrid.classList.add('has-active-card');
    });

    card.addEventListener('focus', () => {
      disciplineCards.forEach((c) => c.classList.remove('is-active'));
      card.classList.add('is-active');
      if (disciplinesGrid) disciplinesGrid.classList.add('has-active-card');
    });

    card.addEventListener('click', () => {
      disciplineCards.forEach((c) => c.classList.remove('is-active'));
      card.classList.add('is-active');
      if (disciplinesGrid) disciplinesGrid.classList.add('has-active-card');
    });
  });

  if (disciplinesGrid) {
    disciplinesGrid.addEventListener('pointerleave', () => {
      disciplineCards.forEach((c) => c.classList.remove('is-active'));
      disciplinesGrid.classList.remove('has-active-card');
    });
  }

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
  // Capabilities & Services Section Interaction (Animated ASCII Symbols)
  // --------------------------------------------------------------------------
  const serviceRows = document.querySelectorAll('.service-row');
  const serviceCaptionText = document.getElementById('service-caption-text');
  const asciiSymbols = document.querySelectorAll('.ascii-preview-stage .s');

  if (serviceRows.length) {
    const activateService = (row) => {
      if (row.classList.contains('is-active')) return;

      serviceRows.forEach((r) => {
        r.classList.remove('is-active');
        r.setAttribute('aria-pressed', 'false');
      });

      row.classList.add('is-active');
      row.setAttribute('aria-pressed', 'true');

      const asciiId = row.getAttribute('data-ascii') || 's1';

      // Switch active ASCII Symbol block
      asciiSymbols.forEach((s) => {
        s.classList.remove('is-active');
      });
      const activeSymbol = document.getElementById(`ascii-${asciiId}`);
      if (activeSymbol) {
        activeSymbol.classList.add('is-active');
      }

      if (serviceCaptionText) {
        const nextCaption = row.getAttribute('data-caption') || '';
        if (prefersReducedMotion) {
          serviceCaptionText.textContent = nextCaption;
        } else {
          serviceCaptionText.style.transition = 'opacity 0.16s cubic-bezier(0.16, 1, 0.3, 1), transform 0.16s cubic-bezier(0.16, 1, 0.3, 1)';
          serviceCaptionText.style.opacity = '0';
          serviceCaptionText.style.transform = 'translateY(6px)';

          setTimeout(() => {
            serviceCaptionText.textContent = nextCaption;
            serviceCaptionText.style.transition = 'opacity 0.32s cubic-bezier(0.16, 1, 0.3, 1), transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)';
            serviceCaptionText.style.opacity = '1';
            serviceCaptionText.style.transform = 'translateY(0)';
          }, 160);
        }
      }
    };

    serviceRows.forEach((row) => {
      row.addEventListener('mouseenter', () => activateService(row));
      row.addEventListener('focus', () => activateService(row));
      row.addEventListener('click', () => activateService(row));
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateService(row);
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // ASCII Donut Animation for Branding Service
  // --------------------------------------------------------------------------
  (function initAsciiDonut() {
    const el = document.getElementById('donut');
    if (!el) return;
    const W = 64, H = 28, ch = '.,-~:;=!*#$@';
    let A = 0, B = 0, lastDonutT = 0;

    function renderDonutFrame() {
      const b = new Array(W * H).fill(' ');
      const z = new Array(W * H).fill(0);
      const s = Math.sin, c0 = Math.cos;
      for (let j = 0; j < 6.28; j += 0.08) {
        for (let i = 0; i < 6.28; i += 0.035) {
          const c = s(i), d = c0(j), e = s(A), f = s(j), g = c0(A), h = d + 2,
                D = 1 / (c * h * e + f * g + 5), l = c0(i), m = c0(B), n = s(B), t = c * h * g - f * e,
                x = 0 | (W / 2 + 34 * D * (l * h * m - t * n)),
                y = 0 | (H / 2 + 16 * D * (l * h * n + t * m)),
                o = x + W * y,
                N = 0 | (8 * ((f * e - c * d * g) * m - c * d * e - f * g - l * d * n));
          if (y >= 0 && y < H && x >= 0 && x < W && D > z[o]) {
            z[o] = D;
            b[o] = ch[N > 0 ? N : 0];
          }
        }
      }
      let out = '';
      for (let k = 0; k < W * H; k++) {
        out += b[k];
        if (k % W === W - 1) out += '\n';
      }
      el.textContent = out;
      A += 0.04;
      B += 0.025;
    }

    renderDonutFrame();

    if (!prefersReducedMotion) {
      let isDonutVisible = false;
      const servicesSection = document.getElementById('services');
      if ('IntersectionObserver' in window && servicesSection) {
        const donutObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            isDonutVisible = entry.isIntersecting;
          });
        }, { threshold: 0.05 });
        donutObserver.observe(servicesSection);
      } else {
        isDonutVisible = true;
      }

      function donutLoop(t) {
        if (isDonutVisible && (t - lastDonutT > 40)) {
          renderDonutFrame();
          lastDonutT = t;
        }
        requestAnimationFrame(donutLoop);
      }
      requestAnimationFrame(donutLoop);
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
  // Creative Process Section Scroll Reveal
  // --------------------------------------------------------------------------
  const processSection = document.getElementById('process');
  if (processSection) {
    if (prefersReducedMotion) {
      processSection.classList.add('is-revealed');
    } else if ('IntersectionObserver' in window) {
      const processRevealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              processSection.classList.add('is-revealed');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          root: null,
          threshold: 0.05,
          rootMargin: '0px 0px -30px 0px'
        }
      );
      processRevealObserver.observe(processSection);
    } else {
      processSection.classList.add('is-revealed');
    }
  }

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
