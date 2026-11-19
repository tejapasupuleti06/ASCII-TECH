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
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

  let cachedHeroHeight = heroSection ? heroSection.offsetHeight : (window.innerHeight * 0.86);
  let cachedWindowHeight = window.innerHeight || 1;
  let scrollTicking = false;

  let lastP = -1;
  function updateParallax(scrollY) {
    const isMobile = window.matchMedia('(max-width: 599px)').matches;

    if (isMobile) {
      // Mobile calculation: clamp(scrollY / cachedHeroHeight, 0, 1)
      const p = Math.min(Math.max(scrollY / (cachedHeroHeight || 1), 0), 1);

      if (!prefersReducedMotion && heroSection && Math.abs(p - lastP) > 0.002) {
        heroSection.style.setProperty('--p', p.toFixed(4));
        lastP = p;
      }

      // Add solid header background once the sheet reaches the top on mobile
      if (p >= 0.98) {
        document.body.classList.add('header--solid');
      } else {
        document.body.classList.remove('header--solid');
      }
    } else {
      // Desktop / Tablet calculation: clamp(scrollY / innerHeight, 0, 1)
      const p = Math.min(Math.max(scrollY / cachedWindowHeight, 0), 1);

      if (!prefersReducedMotion && heroSection && Math.abs(p - lastP) > 0.002) {
        heroSection.style.setProperty('--p', p.toFixed(4));
        lastP = p;
      }

      if (p >= 0.75) {
        document.body.classList.add('header-on-light');
      } else {
        document.body.classList.remove('header-on-light');
      }
      document.body.classList.remove('header--solid');
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
  // Flowing Curves Canvas Background for Hero Section
  // Smooth-blended dark charcoal & glowing peach wave field
  // Fully responsive & optimized for both desktop and mobile viewports
  // --------------------------------------------------------------------------
  const heroCurvesCanvas = document.getElementById('hero-flowing-curves');
  if (heroCurvesCanvas) {
    const ctx = heroCurvesCanvas.getContext('2d');

    function hsl(h, s, l) {
      s /= 100;
      l /= 100;
      const k = n => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return [f(0) * 255, f(8) * 255, f(4) * 255];
    }

    const peach = [];
    const gray = [];
    for (let L = 0; L <= 100; L++) {
      peach.push(hsl(21, 100, L));
      const g = L * 2.55;
      gray.push([g, g, g]);
    }

    const w = 0.16;
    const cl = x => x < 0 ? 0 : x > 1 ? 1 : x;
    const ss = (a, b, x) => {
      x = cl((x - a) / (b - a));
      return x * x * (3 - 2 * x);
    };

    function gc(v, lo, p) {
      const u = cl((v - lo) / (p - lo));
      const ln = Math.abs((u * 14) % 1 - 0.5) < 0.06 ? 3 : 0;
      const idx = Math.round(46 - Math.min(3, Math.floor(u * 4)) * 4.5 - ln);
      return gray[Math.max(0, Math.min(100, idx))];
    }

    function pc(v, p, hi) {
      const u = cl((v - p) / (hi - p));
      const ln = Math.abs((u * 10) % 1 - 0.5) < 0.07 ? 4 : 0;
      const idx = Math.round(86 - Math.min(4, Math.floor(u * 5)) * 5.5 - ln);
      return peach[Math.max(0, Math.min(100, idx))];
    }

    let W = 320;
    let H = 160;
    let img = null;
    let d = null;
    let F = null;
    let isPortrait = false;
    let animId = null;
    let isVisible = true;
    let lastFrameMs = 0;
    let isScrollPausing = false;
    let scrollPauseTimer = null;

    window.addEventListener('scroll', () => {
      // Pause canvas rendering during active scroll to yield 100% CPU to mobile touch gesture
      isScrollPausing = true;
      clearTimeout(scrollPauseTimer);
      scrollPauseTimer = setTimeout(() => {
        isScrollPausing = false;
      }, 80);

      // Completely pause canvas if hero is scrolled past
      if (window.scrollY > (cachedHeroHeight || 800)) {
        if (isVisible) {
          isVisible = false;
          if (animId) cancelAnimationFrame(animId);
        }
      } else {
        if (!isVisible) {
          isVisible = true;
          animId = requestAnimationFrame(frame);
        }
      }
    }, { passive: true });

    function resizeCanvas() {
      const rect = heroCurvesCanvas.getBoundingClientRect();
      const screenW = rect.width || window.innerWidth || 320;
      const screenH = rect.height || window.innerHeight || 160;
      isPortrait = window.innerWidth <= 768 || screenW < screenH;

      if (isPortrait) {
        // High-definition mobile buffer (240x420, crisp curves on all mobile screens)
        W = 240;
        H = 420;
      } else {
        // High-definition desktop buffer (480x260, crisp silky gradient curves)
        W = 480;
        H = 260;
      }

      heroCurvesCanvas.width = W;
      heroCurvesCanvas.height = H;
      img = ctx.createImageData(W, H);
      d = img.data;
      F = new Float32Array(W * H);
    }

    function field(x, y, t) {
      // Portrait uses px = x * 3, py = y * 6; Landscape uses px = x * 6, py = y * 3
      const px = isPortrait ? x * 3 : x * 6;
      const py = isPortrait ? y * 6 : y * 3;
      const wx = Math.sin(py * 0.9 + t * 0.6) + 0.5 * Math.sin(px * 1.7 - t * 0.4 + py * 0.5);
      const wy = Math.sin(px * 1.1 - t * 0.5) + 0.5 * Math.sin(py * 1.3 + t * 0.35 + px * 0.8);
      const qx = px + 0.8 * wx;
      const qy = py + 0.8 * wy;
      return Math.sin(qx * 1.2 + qy * 0.7 + t * 0.3) +
             0.6 * Math.sin(qx * 0.5 - qy * 1.3 - t * 0.25) +
             0.4 * Math.sin(qy * 1.1 + qx * 0.3 + t * 0.2);
    }

    function frame(ms) {
      if (!isVisible) return;

      // Yield 100% CPU to the browser compositor during active touch/wheel scroll
      if (isScrollPausing && window.scrollY > 20) {
        if (!prefersReducedMotion) {
          animId = requestAnimationFrame(frame);
        }
        return;
      }

      // Throttle: 30fps on mobile (delta >= 33ms), 45fps on desktop (delta >= 22ms)
      const minDelta = isPortrait ? 33 : 22;
      if (ms - lastFrameMs < minDelta) {
        if (!prefersReducedMotion) {
          animId = requestAnimationFrame(frame);
        }
        return;
      }
      lastFrameMs = ms;

      const t = ms / 1000;
      for (let j = 0; j < H; j++) {
        const rowOffset = j * W;
        const yNorm = j / H;
        for (let i = 0; i < W; i++) {
          F[rowOffset + i] = field(i / W, yNorm, t);
        }
      }

      const s = [];
      const step = isPortrait ? 8 : 10;
      for (let j = 0; j < H; j += step) {
        const rowOffset = j * W;
        for (let i = 0; i < W; i += step) {
          s.push(F[rowOffset + i]);
        }
      }
      s.sort((a, b) => a - b);
      const lo = s[0];
      const p70 = s[Math.floor(s.length * 0.8)];
      const hi = s[s.length - 1];

      for (let n = 0; n < W * H; n++) {
        const v = F[n];
        let r, g, bl;
        if (v < p70 - w) {
          const c = gc(v, lo, p70);
          r = c[0];
          g = c[1];
          bl = c[2];
        } else if (v < p70 + w) {
          const x = gc(v, lo, p70);
          const y = pc(v, p70, hi);
          const tBlend = ss(p70 - w, p70 + w, v);
          r = x[0] + (y[0] - x[0]) * tBlend;
          g = x[1] + (y[1] - x[1]) * tBlend;
          bl = x[2] + (y[2] - x[2]) * tBlend;
        } else {
          const c = pc(v, p70, hi);
          r = c[0];
          g = c[1];
          bl = c[2];
        }
        const k = n * 4;
        d[k] = r;
        d[k + 1] = g;
        d[k + 2] = bl;
        d[k + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(frame);
      }
    }

    resizeCanvas();
    window.addEventListener('resize', () => {
      resizeCanvas();
      if (prefersReducedMotion) frame(performance.now());
    }, { passive: true });

    // Performance Observer: pause loop when hero is off-screen
    if ('IntersectionObserver' in window) {
      const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!isVisible) {
              isVisible = true;
              animId = requestAnimationFrame(frame);
            }
          } else {
            isVisible = false;
            if (animId) cancelAnimationFrame(animId);
          }
        });
      }, { threshold: 0.01 });
      heroObserver.observe(heroSection || heroCurvesCanvas);
    }

    animId = requestAnimationFrame(frame);
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
      // Map progress so all 5 photos finish right as the track completes, eliminating dead scroll space
      const p = maxScroll > 0 ? clampVal(scrolled / (maxScroll * 0.94)) : 0;

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

  if (serviceRows.length && serviceCaptionText) {
    const activateService = (row) => {
      if (row.classList.contains('is-active')) return;

      serviceRows.forEach((r) => {
        r.classList.remove('is-active');
        r.setAttribute('aria-pressed', 'false');
      });

      row.classList.add('is-active');
      row.setAttribute('aria-pressed', 'true');

      const asciiId = row.getAttribute('data-ascii') || 's1';
      const nextCaption = row.getAttribute('data-caption') || '';

      // Switch active ASCII Symbol block
      asciiSymbols.forEach((s) => {
        s.classList.remove('is-active');
      });
      const activeSymbol = document.getElementById(`ascii-${asciiId}`);
      if (activeSymbol) {
        activeSymbol.classList.add('is-active');
      }

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
      function donutLoop(t) {
        if (t - lastDonutT > 38) {
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
  // Scroll Position Persistence & Instant Restoration Across Navigation
  // (Branddeck PDF Return & Posters Gallery Return)
  // --------------------------------------------------------------------------
  if ('scrollRestoration' in history) {
    try {
      history.scrollRestoration = 'manual';
    } catch (e) {}
  }

  let saveScrollDebounce = null;
  function persistCurrentScroll() {
    try {
      if (window.scrollY > 0) {
        sessionStorage.setItem('asciitech_last_scroll_y', Math.round(window.scrollY).toString());
      }
    } catch (e) {}
  }

  window.addEventListener('scroll', () => {
    clearTimeout(saveScrollDebounce);
    saveScrollDebounce = setTimeout(persistCurrentScroll, 100);
  }, { passive: true });

  window.addEventListener('beforeunload', persistCurrentScroll);
  window.addEventListener('pagehide', persistCurrentScroll);

  // Track any outgoing links to posters.html to remember return position
  document.querySelectorAll('a[href*="posters.html"]').forEach((link) => {
    link.addEventListener('click', () => {
      try {
        sessionStorage.setItem('peacock_skip_once', '1');
        sessionStorage.setItem('asciitech_last_scroll_y', Math.round(window.scrollY).toString());
        sessionStorage.setItem('asciitech_return_target', '#showcase');
      } catch (e) {}
    });
  });

  function performScrollRestoration() {
    try {
      const returnTarget = sessionStorage.getItem('asciitech_return_target');
      const savedYStr = sessionStorage.getItem('asciitech_last_scroll_y');
      const savedY = savedYStr ? parseInt(savedYStr, 10) : 0;

      if (returnTarget) {
        sessionStorage.removeItem('asciitech_return_target');
        const targetEl = document.querySelector(returnTarget);
        if (targetEl) {
          if (window.lenis) {
            window.lenis.scrollTo(targetEl, { immediate: true });
          } else {
            targetEl.scrollIntoView({ behavior: 'instant', block: 'start' });
          }
          if (typeof updateParallax === 'function') {
            updateParallax(window.scrollY);
          }
          return;
        }
      }

      if (!isNaN(savedY) && savedY > 0) {
        if (window.lenis) {
          window.lenis.scrollTo(savedY, { immediate: true });
        } else {
          window.scrollTo(0, savedY);
        }
        if (typeof updateParallax === 'function') {
          updateParallax(savedY);
        }
      }
    } catch (e) {}
  }

  // Restore scroll position on load and on pageshow
  performScrollRestoration();
  window.setTimeout(performScrollRestoration, 60);
  window.setTimeout(performScrollRestoration, 250);

  window.addEventListener('pageshow', (event) => {
    performScrollRestoration();
    window.setTimeout(performScrollRestoration, 60);
  });
});
