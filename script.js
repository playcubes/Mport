// --- Global Configuration & State ---
const state = {
  // Cursor
  mouseX: window.innerWidth / 2,
  mouseY: window.innerHeight / 2,
  trailX: window.innerWidth / 2,
  trailY: window.innerHeight / 2,
  isHoveringInteractive: false,
  prevMouseX: window.innerWidth / 2,
  prevMouseY: window.innerHeight / 2,
  mouseSpeed: 0,
  
  // Section Tracking
  activeHoverSection: 'default', // 'default', 'baking', 'sales'
  
  // Carousel
  currentSlide: 0,
  
  // Counters
  countersAnimated: false
};

// Elements
const cursorDot = document.getElementById('custom-cursor-dot');
const cursorTrail = document.getElementById('custom-cursor-trail');
const particleCanvas = document.getElementById('particle-canvas');
const ctx = particleCanvas.getContext('2d');

// --- Setup Canvas ---
function resizeCanvas() {
  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Particle Engine ---
const particles = [];
const maxBackgroundParticles = 14;
const clickParticles = [];
const trailParticles = [];
const MAX_TRAIL_PARTICLES = 18;

// Emoji sprite cache: pre-render each emoji once to an offscreen canvas,
// then blit with drawImage (much cheaper than fillText + scale every frame).
const emojiSpriteCache = new Map();
function getEmojiSprite(char, px) {
  const size = Math.max(12, Math.round(px));
  const key = char + '_' + size;
  let sprite = emojiSpriteCache.get(key);
  if (!sprite) {
    sprite = document.createElement('canvas');
    sprite.width = size;
    sprite.height = size;
    const sctx = sprite.getContext('2d');
    sctx.font = size + 'px sans-serif';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillText(char, size / 2, size / 2);
    // Bound cache growth: drop oldest entry past 60 sprites
    if (emojiSpriteCache.size > 60) {
      const firstKey = emojiSpriteCache.keys().next().value;
      emojiSpriteCache.delete(firstKey);
    }
    emojiSpriteCache.set(key, sprite);
  }
  return sprite;
}

class BackgroundParticle {
  constructor() {
    this.reset(true);
  }

  reset(randomY = false) {
    this.x = Math.random() * particleCanvas.width;
    this.y = randomY ? Math.random() * particleCanvas.height : particleCanvas.height + 20;
    this.size = Math.random() * 4 + 2;
    this.vx = Math.random() * 0.6 - 0.3;
    this.vy = -(Math.random() * 0.8 + 0.2); // Float upwards
    this.opacity = Math.random() * 0.5 + 0.2;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = Math.random() * 0.02 - 0.01;
    
    // Morph states
    this.currentType = 'default'; // 'default', 'baking', 'sales'
    this.morphScale = 1;
    this.char = '';
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
    
    // Morph logic
    const targetType = state.activeHoverSection;
    if (this.currentType !== targetType) {
      this.morphScale -= 0.08;
      if (this.morphScale <= 0) {
        this.currentType = targetType;
        this.morphScale = 0;
        if (targetType === 'baking') {
          this.char = ['🍪', '🍩', '🍕', '🥐'][Math.floor(Math.random() * 4)];
        } else if (targetType === 'sales') {
          this.char = ['🔑', '🎨', '🪙', '📈'][Math.floor(Math.random() * 4)];
        } else if (targetType === 'projects') {
          this.char = ['💻', '⚡', '🚀', '⌨️', '⚙️', '🔌', '</>'][Math.floor(Math.random() * 7)];
        }
      }
    } else if (this.morphScale < 1) {
      this.morphScale += 0.08;
    }

    // Boundary check
    if (this.y < -20 || this.x < -20 || this.x > particleCanvas.width + 20) {
      this.reset(false);
    }
  }

  draw() {
    ctx.save();
    if (this.currentType === 'default') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * this.morphScale, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(159, 203, 152, ${this.opacity})`; // Mint Accent
      ctx.fill();
    } else {
      // Draw morphing emoji via cached sprite (fast drawImage blit)
      const dim = Math.max(1, this.size * 5 * this.morphScale);
      const sprite = getEmojiSprite(this.char, this.size * 5);
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = this.opacity;
      ctx.drawImage(sprite, -dim / 2, -dim / 2, dim, dim);
    }
    ctx.restore();
  }
}

// Spark/Splash particle when clicking
class SplashParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 4 + 3;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.opacity = 1;
    this.gravity = 0.15;
    
    // Choose particle item based on section
    if (state.activeHoverSection === 'baking') {
      this.type = 'emoji';
      this.char = '✨';
    } else if (state.activeHoverSection === 'sales') {
      this.type = 'emoji';
      this.char = '🪙';
    } else if (state.activeHoverSection === 'projects') {
      this.type = 'emoji';
      this.char = '⚡';
    } else {
      this.type = 'circle';
    }
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.opacity -= 0.03;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    if (this.type === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = '#79AE6F'; // Leaf green
      ctx.fill();
    } else {
      ctx.translate(this.x, this.y);
      ctx.globalAlpha = this.opacity;
      const dim = this.size * 4;
      ctx.drawImage(getEmojiSprite(this.char, dim), -dim / 2, -dim / 2, dim, dim);
    }
    ctx.restore();
  }
}

// Trail particles emitted during fast movements
class TrailParticle {
  constructor(x, y, sectionType) {
    this.x = x;
    this.y = y;
    this.sectionType = sectionType;
    this.size = Math.random() * 8 + 6;
    this.vx = Math.random() * 1.5 - 0.75;
    
    if (sectionType === 'baking') {
      this.vy = Math.random() * 2 + 1; // Fall downwards (gravity)
      this.char = ['🍪', '🍩', '🍕', '🥐'][Math.floor(Math.random() * 4)];
    } else if (sectionType === 'projects') {
      this.vy = -(Math.random() * 1.5 + 0.5); // Drift upwards
      this.char = ['💻', '⚡', '🚀', '⌨️', '⚙️', '🔌', '</>'][Math.floor(Math.random() * 7)];
    } else { // sales
      this.vy = -(Math.random() * 1.5 + 0.5); // Drift upwards (bubbles/coins)
      this.char = ['🔑', '🎨', '🪙'][Math.floor(Math.random() * 3)];
    }
    
    this.opacity = 0.8;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = Math.random() * 0.1 - 0.05;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
    this.opacity -= 0.045;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.opacity;
    const dim = this.size * 2.2;
    ctx.drawImage(getEmojiSprite(this.char, dim), -dim / 2, -dim / 2, dim, dim);
    ctx.restore();
  }
}

// Initialize Background Particles
for (let i = 0; i < maxBackgroundParticles; i++) {
  particles.push(new BackgroundParticle());
}

// --- Animation Loop ---
let lastFrameTime = performance.now();
function animate(timestamp) {
  ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

  // Frame-time guard: skip new trail spawns on slow frames to avoid spiral
  const frameDelta = timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  const slowFrame = frameDelta > 40;
  
  // 1. Custom Cursor Elastic Trail Lerp
  state.trailX += (state.mouseX - state.trailX) * 0.15;
  state.trailY += (state.mouseY - state.trailY) * 0.15;
  
  if (cursorDot && cursorTrail) {
    cursorDot.style.transform = `translate3d(${state.mouseX}px, ${state.mouseY}px, 0) translate(-50%, -50%)`;
    cursorTrail.style.transform = `translate3d(${state.trailX}px, ${state.trailY}px, 0) translate(-50%, -50%)`;
  }
  
  // Calculate mouse speed
  const dx = state.mouseX - state.prevMouseX;
  const dy = state.mouseY - state.prevMouseY;
  state.mouseSpeed = Math.sqrt(dx * dx + dy * dy);
  
  // Spawn trail particles if moving and in active custom section, with a hard limit on max particles to avoid frame drops
  if (!slowFrame && state.mouseSpeed > 12 && state.activeHoverSection !== 'default' && trailParticles.length < MAX_TRAIL_PARTICLES) {
    if (Math.random() < 0.08) { // limit spawn rate
      trailParticles.push(new TrailParticle(state.mouseX, state.mouseY, state.activeHoverSection));
    }
  }
  
  // Save previous coordinates
  state.prevMouseX = state.mouseX;
  state.prevMouseY = state.mouseY;

  // 2. Update and Draw Background Particles
  particles.forEach(p => {
    p.update();
    p.draw();
  });

  // 3. Update and Draw Click Splash Particles
  for (let i = clickParticles.length - 1; i >= 0; i--) {
    const cp = clickParticles[i];
    cp.update();
    if (cp.opacity <= 0) {
      clickParticles.splice(i, 1);
    } else {
      cp.draw();
    }
  }

  // 4. Update and Draw Trail Particles
  for (let i = trailParticles.length - 1; i >= 0; i--) {
    const tp = trailParticles[i];
    tp.update();
    if (tp.opacity <= 0) {
      trailParticles.splice(i, 1);
    } else {
      tp.draw();
    }
  }

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// --- Mouse Tracking & Custom Cursor Event Listeners ---
window.addEventListener('mousemove', (e) => {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
});

// Bind section tracking listeners
function initSectionTracking() {
  const projectsSec = document.getElementById('projects');
  const bakingSec = document.getElementById('baking');
  const salesSec = document.getElementById('ventures');
  
  const isDesktop = window.matchMedia('(pointer: fine)').matches;
  
  if (isDesktop) {
    // Zero-cost browser-native hover listeners
    if (projectsSec) {
      projectsSec.addEventListener('mouseenter', () => { state.activeHoverSection = 'projects'; });
      projectsSec.addEventListener('mouseleave', () => { if (state.activeHoverSection === 'projects') state.activeHoverSection = 'default'; });
    }
    if (bakingSec) {
      bakingSec.addEventListener('mouseenter', () => { state.activeHoverSection = 'baking'; });
      bakingSec.addEventListener('mouseleave', () => { if (state.activeHoverSection === 'baking') state.activeHoverSection = 'default'; });
    }
    if (salesSec) {
      salesSec.addEventListener('mouseenter', () => { state.activeHoverSection = 'sales'; });
      salesSec.addEventListener('mouseleave', () => { if (state.activeHoverSection === 'sales') state.activeHoverSection = 'default'; });
    }
  } else {
    // Asynchronous layout-safe IntersectionObserver for mobile
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target.id === 'projects') {
            state.activeHoverSection = 'projects';
          } else if (entry.target.id === 'baking') {
            state.activeHoverSection = 'baking';
          } else if (entry.target.id === 'ventures') {
            state.activeHoverSection = 'sales';
          }
        }
      });
    }, {
      rootMargin: '-30% 0px -30% 0px',
      threshold: 0.1
    });
    
    if (projectsSec) sectionObserver.observe(projectsSec);
    if (bakingSec) sectionObserver.observe(bakingSec);
    if (salesSec) sectionObserver.observe(salesSec);
  }
}
initSectionTracking();

// Click Ripple Splash
window.addEventListener('click', (e) => {
  // 1. Spawning DOM Splash
  const splash = document.createElement('div');
  splash.className = 'click-splash';
  splash.style.left = `${e.clientX}px`;
  splash.style.top = `${e.clientY}px`;
  document.body.appendChild(splash);
  
  // Remove splash DOM element after animation ends
  setTimeout(() => {
    splash.remove();
  }, 500);

  // 2. Spawn Canvas Splash Particles
  for (let i = 0; i < 8; i++) {
    clickParticles.push(new SplashParticle(e.clientX, e.clientY));
  }
});

// Handle Custom Cursor hover states via lightweight event delegation
document.addEventListener('mouseover', (e) => {
  const target = e.target.closest('a, button, input, textarea, select, .sales-card, #video-lazy-overlay, video, .carousel-slide, [role="button"]');
  if (target) {
    document.body.classList.add('cursor-hover');
  } else {
    document.body.classList.remove('cursor-hover');
  }
});

// --- Media Gallery Carousel Component ---
const slides = document.querySelectorAll('.carousel-slide');
const prevBtn = document.getElementById('carousel-prev');
const nextBtn = document.getElementById('carousel-next');
const dotsContainer = document.getElementById('carousel-dots');
let autoplayTimer = null;

function renderCarousel() {
  slides.forEach((slide, index) => {
    // Reset classes
    slide.classList.remove('opacity-100', 'z-20', 'pointer-events-auto');
    slide.classList.add('opacity-0', 'z-0', 'pointer-events-none');
    
    // Pause videos when not active
    const video = slide.querySelector('video');
    if (video && index !== state.currentSlide) {
      video.pause();
    }
    
    // Show active slide
    if (index === state.currentSlide) {
      slide.classList.remove('opacity-0', 'z-0', 'pointer-events-none');
      slide.classList.add('opacity-100', 'z-20', 'pointer-events-auto');
    }
  });

  // Render indicators
  const dots = dotsContainer.querySelectorAll('.carousel-dot');
  dots.forEach((dot, index) => {
    if (index === state.currentSlide) {
      dot.classList.add('bg-forest', 'scale-125');
      dot.classList.remove('bg-forest/30');
    } else {
      dot.classList.remove('bg-forest', 'scale-125');
      dot.classList.add('bg-forest/30');
    }
  });
}

function nextSlide() {
  state.currentSlide = (state.currentSlide + 1) % slides.length;
  renderCarousel();
  resetAutoplay();
}

function prevSlide() {
  state.currentSlide = (state.currentSlide - 1 + slides.length) % slides.length;
  renderCarousel();
  resetAutoplay();
}

function initCarousel() {
  if (slides.length === 0) return;

  // Build dots dynamically
  dotsContainer.innerHTML = '';
  slides.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot w-3 h-3 rounded-full bg-forest/30 transition-all duration-300 focus:outline-none';
    dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
    dot.addEventListener('click', () => {
      state.currentSlide = index;
      renderCarousel();
      resetAutoplay();
    });
    dotsContainer.appendChild(dot);
  });

  prevBtn.addEventListener('click', prevSlide);
  nextBtn.addEventListener('click', nextSlide);

  renderCarousel();
  startAutoplay();
}

function startAutoplay() {
  autoplayTimer = setInterval(() => {
    // Only autoplay if active slide doesn't contain a playing video
    const activeSlide = slides[state.currentSlide];
    const video = activeSlide ? activeSlide.querySelector('video') : null;
    const isVideoPlaying = video && !video.paused;
    
    if (!isVideoPlaying) {
      nextSlide();
    }
  }, 6000);
}

function resetAutoplay() {
  clearInterval(autoplayTimer);
  startAutoplay();
}

initCarousel();

// --- Lazy Loading compilation video (Slide 8) ---
const videoOverlay = document.getElementById('video-lazy-overlay');
const largeVideo = document.getElementById('vid-large');

if (videoOverlay && largeVideo) {
  videoOverlay.addEventListener('click', () => {
    // Hide overlay
    videoOverlay.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
      videoOverlay.classList.add('hidden');
    }, 300);
    
    // Show and load video
    largeVideo.classList.remove('hidden');
    largeVideo.setAttribute('preload', 'auto');
    largeVideo.load();
    largeVideo.play();
  });
}

// --- Sales Section Numeric Counter Reveal ---
const counterElements = document.querySelectorAll('.counter-num');

function animateCounters() {
  if (state.countersAnimated) return;
  state.countersAnimated = true;

  counterElements.forEach(counter => {
    const target = parseInt(counter.getAttribute('data-target'), 10);
    const duration = 2000; // 2 seconds
    const startTime = performance.now();

    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing out quadratic function
      const easeProgress = progress * (2 - progress);
      const currentValue = Math.floor(easeProgress * target);

      // Format with comma separator for readability (e.g. 3,000) and only use 'K' for very large numbers
      if (target >= 10000) {
        counter.textContent = (currentValue / 1000).toFixed(0) + 'K';
      } else {
        counter.textContent = currentValue.toLocaleString();
      }

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        // Guarantee final target number is styled correctly
        if (target >= 10000) {
          counter.textContent = (target / 1000).toFixed(0) + 'K';
        } else {
          counter.textContent = target.toLocaleString();
        }
      }
    }
    requestAnimationFrame(updateCounter);
  });
}

// Setup intersection observer for Sales Section counters
const salesObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounters();
    }
  });
}, { threshold: 0.25 });

const salesSec = document.getElementById('ventures');
if (salesSec) {
  salesObserver.observe(salesSec);
}

// --- Mobile Navigation Drawer Toggle ---
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileDrawer = document.getElementById('mobile-drawer');
const hamburgerIcon = document.getElementById('hamburger-icon');
const closeIcon = document.getElementById('close-icon');

if (mobileMenuBtn && mobileDrawer) {
  mobileMenuBtn.addEventListener('click', () => {
    const isHidden = mobileDrawer.classList.contains('hidden');
    if (isHidden) {
      mobileDrawer.classList.remove('hidden');
      hamburgerIcon.classList.add('hidden');
      closeIcon.classList.remove('hidden');
    } else {
      mobileDrawer.classList.add('hidden');
      hamburgerIcon.classList.remove('hidden');
      closeIcon.classList.add('hidden');
    }
  });

  // Close mobile drawer when clicking nav links
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileDrawer.classList.add('hidden');
      hamburgerIcon.classList.remove('hidden');
      closeIcon.classList.add('hidden');
    });
  });
}

// --- Contact Form Submission Handler (Netlify Forms via AJAX) ---
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalLabel = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-60', 'cursor-wait');
    }
    const body = new URLSearchParams(new FormData(contactForm)).toString();
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    })
      .then(() => {
        alert('Thank you for your message, Muhammad will get back to you shortly!');
        contactForm.reset();
      })
      .catch(() => {
        alert('Something went wrong sending your message. Please email allocator123@gmail.com directly.');
      })
      .finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalLabel;
          submitBtn.classList.remove('opacity-60', 'cursor-wait');
        }
      });
  });
}

// --- Dynamic Header Scroll Shadow ---
const header = document.getElementById('main-header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    header.classList.add('shadow-md', 'py-3');
    header.classList.remove('py-4');
  } else {
    header.classList.remove('shadow-md', 'py-3');
    header.classList.add('py-4');
  }
});
