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

  function updateParallax(scrollY) {
    const isMobile = window.matchMedia('(max-width: 599px)').matches;

    if (isMobile) {
      // Mobile calculation: clamp(scrollY / cachedHeroHeight, 0, 1)
      const p = Math.min(Math.max(scrollY / (cachedHeroHeight || 1), 0), 1);

      if (!prefersReducedMotion && heroSection) {
        heroSection.style.setProperty('--p', p.toFixed(4));
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

      if (!prefersReducedMotion && heroSection) {
        heroSection.style.setProperty('--p', p.toFixed(4));
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

    let W = 512;
    let H = 256;
    let img = null;
    let d = null;
    let F = null;
    let isPortrait = false;
    let animId = null;
    let isVisible = true;

    function resizeCanvas() {
      const rect = heroCurvesCanvas.getBoundingClientRect();
      const screenW = rect.width || window.innerWidth || 512;
      const screenH = rect.height || window.innerHeight || 256;
      isPortrait = window.innerWidth <= 768 || screenW < screenH;

      if (isPortrait) {
        // Mobile portrait exact specification from Flowing_Curves2.html: 256 x 512 buffer
        W = 256;
        H = 512;
      } else {
        // Desktop landscape exact specification from Flowing_Curves_(Landscape)1.html: 512 x 256 buffer
        W = 512;
        H = 256;
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
      const t = ms / 1000;
      for (let j = 0; j < H; j++) {
        const rowOffset = j * W;
        const yNorm = j / H;
        for (let i = 0; i < W; i++) {
          F[rowOffset + i] = field(i / W, yNorm, t);
        }
      }

      const s = [];
      const step = 7;
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

    // Clicking / tapping anywhere on card or link directly opens the PDF
    card.addEventListener('click', (e) => {
      e.preventDefault();
      clearTimeout(brandHoverTimer);
      setBrandActive(card);
      openPdf(pdfUrl, title);
    });

    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(brandHoverTimer);
        setBrandActive(card);
        openPdf(pdfUrl, title);
      });
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

    let ticking = false;
    function updateCrafted() {
      ticking = false;
      const rect = craftedTrack.getBoundingClientRect();
      const maxScroll = craftedTrack.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const p = maxScroll > 0 ? clampVal(scrolled / (maxScroll * 0.65)) : 0;

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
      if (!ticking) {
        requestAnimationFrame(updateCrafted);
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScrollCrafted, { passive: true });
    window.addEventListener('resize', onScrollCrafted);
    if (window.lenis) {
      window.lenis.on('scroll', onScrollCrafted);
    }
    updateCrafted();
  }

  // --------------------------------------------------------------------------
  // Scroll Reveal: Workflow Video Section (IntersectionObserver)
  // --------------------------------------------------------------------------
  const workflowSection = document.getElementById('workflow-video');
  if (workflowSection) {
    if (prefersReducedMotion) {
      workflowSection.classList.add('is-revealed');
    } else if ('IntersectionObserver' in window) {
      const workflowRevealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              workflowSection.classList.add('is-revealed');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      workflowRevealObserver.observe(workflowSection);
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

    card.addEventListener('click', (e) => {
      const url = card.getAttribute('data-url');
      if (!url) return;

      const isTouch = window.matchMedia('(hover: none)').matches;
      if (isTouch && !touchedOnce) {
        e.preventDefault();
        showcaseCards.forEach((c) => c.classList.remove('is-active'));
        card.classList.add('is-active');
        touchedOnce = true;
        return;
      }

      window.open(url, '_blank', 'noopener,noreferrer');
    });
  });

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
  // Capabilities & Services Section Interaction (Hover, Tap, Keyboard Focus)
  // --------------------------------------------------------------------------
  const serviceRows = document.querySelectorAll('.service-row');
  const servicePreviewImg = document.getElementById('service-preview-img');
  const serviceCaptionText = document.getElementById('service-caption-text');

  if (serviceRows.length && servicePreviewImg && serviceCaptionText) {
    // Preload all 4 images for instant switching
    const serviceImages = [
      'assets/services/service-branding.webp',
      'assets/services/service-development.webp',
      'assets/services/service-websites.webp',
      'assets/services/service-art-direction.webp',
    ];
    serviceImages.forEach((src) => {
      const preloadImg = new Image();
      preloadImg.src = src;
    });

    const activateService = (row) => {
      if (row.classList.contains('is-active')) return;

      serviceRows.forEach((r) => {
        r.classList.remove('is-active');
        r.setAttribute('aria-pressed', 'false');
      });

      row.classList.add('is-active');
      row.setAttribute('aria-pressed', 'true');

      const nextImg = row.getAttribute('data-image');
      const nextCaption = row.getAttribute('data-caption');

      if (prefersReducedMotion) {
        servicePreviewImg.src = nextImg;
        serviceCaptionText.textContent = nextCaption;
      } else {
        // Crossfade image & caption with smooth scale & slide
        servicePreviewImg.style.transition = 'opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
        serviceCaptionText.style.transition = 'opacity 0.16s cubic-bezier(0.16, 1, 0.3, 1), transform 0.16s cubic-bezier(0.16, 1, 0.3, 1)';
        servicePreviewImg.style.opacity = '0';
        servicePreviewImg.style.transform = 'scale(1.035)';
        serviceCaptionText.style.opacity = '0';
        serviceCaptionText.style.transform = 'translateY(6px)';

        setTimeout(() => {
          servicePreviewImg.src = nextImg;
          serviceCaptionText.textContent = nextCaption;

          servicePreviewImg.style.transition = 'opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
          serviceCaptionText.style.transition = 'opacity 0.32s cubic-bezier(0.16, 1, 0.3, 1), transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)';
          servicePreviewImg.style.opacity = '1';
          servicePreviewImg.style.transform = 'scale(1)';
          serviceCaptionText.style.opacity = '1';
          serviceCaptionText.style.transform = 'translateY(0)';
        }, 180);
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
});
