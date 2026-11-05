/* ── Pixel art cursor ── */
(function buildPixelCursor() {
  const map = [
    [1,0,0,0,0,0,0,0,0,0,0,0],
    [1,1,0,0,0,0,0,0,0,0,0,0],
    [1,1,1,0,0,0,0,0,0,0,0,0],
    [1,1,1,1,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,0,0,0,0,0],
    [1,1,1,1,1,1,1,1,0,0,0,0],
    [1,1,1,1,1,1,0,0,0,0,0,0],
    [1,1,1,0,1,1,1,0,0,0,0,0],
    [1,1,0,0,0,1,1,1,0,0,0,0],
    [1,0,0,0,0,0,1,1,1,0,0,0],
    [0,0,0,0,0,0,0,1,1,0,0,0],
    [0,0,0,0,0,0,0,0,1,0,0,0],
  ];
  const H = map.length, W = map[0].length, S = 2;
  const c = document.createElement('canvas');
  c.width = W * S; c.height = H * S;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#fff';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!map[y][x]) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const ny = y + dy, nx = x + dx;
        if (ny < 0 || ny >= H || nx < 0 || nx >= W || map[ny][nx]) continue;
        ctx.fillRect(nx * S, ny * S, S, S);
      }
    }
  }
  ctx.fillStyle = '#000';
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (map[y][x]) ctx.fillRect(x * S, y * S, S, S);
  document.body.style.cursor = `url(${c.toDataURL()}) 0 0, default`;
})();



/* ── Food scene responsive scale ── */
(function scaleFoodScene() {
  const scene = document.querySelector('.food-scene');
  if (!scene) return;
  const SCENE_W = 640;
  const SCENE_H = 520;

  function update() {
    const avail = scene.parentElement.clientWidth;
    if (avail >= SCENE_W) {
      scene.style.transform = '';
      scene.style.marginBottom = '';
    } else {
      const s = avail / SCENE_W;
      scene.style.transform = `scale(${s})`;
      scene.style.transformOrigin = 'top left';
      scene.style.marginBottom = `${(s - 1) * SCENE_H}px`;
    }
  }

  update();
  window.addEventListener('resize', update);
})();

/* ── Scroll progress + nav scroll state + parallax ── */
const prog     = document.getElementById('scroll-prog');
const nav      = document.getElementById('nav');
const heroIllus = document.querySelector('.hero-illustration');

window.addEventListener('scroll', () => {
  const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
  if (prog) prog.style.width = pct + '%';
  if (nav)  nav.classList.toggle('scrolled', window.scrollY > 60);

  // Parallax hero illustration — desktop only
  if (heroIllus && window.innerWidth > 768) {
    heroIllus.style.transform = `translateY(${window.scrollY * 0.18}px)`;
  }
}, { passive: true });

/* ── Smooth scroll ── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ── Cycling word animation (type + backspace) ── */
const CYCLE_WORDS = ['sketches', 'doodles', 'ideas', 'colour', 'chaos'];
const cycleEl = document.getElementById('cycle-word');
let cycleIdx = 0;

function typeWord(word, onDone) {
  if (!cycleEl) return;
  cycleEl.classList.add('typing');
  let i = 0;
  const tick = setInterval(() => {
    cycleEl.textContent = word.slice(0, ++i);
    if (i >= word.length) {
      clearInterval(tick);
      cycleEl.classList.remove('typing');
      setTimeout(onDone, 1800);
    }
  }, 80);
}

function eraseWord(onDone) {
  if (!cycleEl) return;
  cycleEl.classList.add('typing'); // keep cursor visible while erasing
  const tick = setInterval(() => {
    cycleEl.textContent = cycleEl.textContent.slice(0, -1);
    if (cycleEl.textContent.length === 0) {
      clearInterval(tick);
      cycleEl.classList.remove('typing');
      setTimeout(onDone, 150);
    }
  }, 50);
}

function cycleNext() {
  eraseWord(() => {
    cycleIdx = (cycleIdx + 1) % CYCLE_WORDS.length;
    typeWord(CYCLE_WORDS[cycleIdx], cycleNext);
  });
}

if (cycleEl) {
  // Only lock width on desktop — on mobile let it flow naturally
  if (window.innerWidth > 700) {
    const wrap = cycleEl.parentElement;
    let maxW = 0;
    CYCLE_WORDS.forEach(w => {
      cycleEl.textContent = w;
      maxW = Math.max(maxW, cycleEl.getBoundingClientRect().width);
    });
    wrap.style.minWidth = Math.ceil(maxW) + 'px';
    cycleEl.textContent = CYCLE_WORDS[0];
  }
  typeWord(CYCLE_WORDS[0], cycleNext);
}

/* ── Magnetic buttons ── */
document.querySelectorAll('.magnetic').forEach(el => {
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.35;
    const y = (e.clientY - r.top - r.height / 2) * 0.35;
    el.style.transition = 'transform 0.1s ease';
    el.style.transform = `translate(${x}px, ${y}px)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
    el.style.transform = '';
  });
});

/* ── Draggable sticky notes ── */
document.querySelectorAll('[data-draggable]').forEach(el => {
  let dragging = false, startX, startY, origLeft, origTop;

  el.addEventListener('mousedown', e => {
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    origLeft = el.offsetLeft; origTop = el.offsetTop;
    el.style.zIndex = 50;
    el.style.transition = 'box-shadow 0.2s';
    el.style.boxShadow = '8px 12px 32px rgba(26,26,26,0.28)';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    el.style.left = origLeft + (e.clientX - startX) + 'px';
    el.style.top  = origTop  + (e.clientY - startY) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    el.style.zIndex = '';
    el.style.boxShadow = '';
  });
});

/* ── Work filters ── */
const sketchbookSection = document.getElementById('sketchbook-section');
const workList = document.querySelector('.work-list');

function applyFilter(filter) {
  const isPersonal = filter === 'personal';
  if (sketchbookSection) sketchbookSection.hidden = !isPersonal;
  if (workList) workList.style.display = isPersonal ? 'none' : '';
  document.querySelectorAll('.work-card').forEach(card => {
    card.classList.toggle('hidden', filter !== 'all' && card.dataset.filter !== filter);
  });
}

applyFilter('campaign');

document.querySelectorAll('.work-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.work-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilter(btn.dataset.filter);
  });
});

/* ── Stagger delays on work cards ── */
document.querySelectorAll('.work-card').forEach((card, i) => {
  card.style.setProperty('--stagger', `${i * 90}ms`);
});

/* ── Scroll reveal ── */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (!e.isIntersecting) return;
    setTimeout(() => e.target.classList.add('in'), i * 80);
    revealObs.unobserve(e.target);
  });
}, { threshold: 0.07 });

document.querySelectorAll(
  '.reveal, .sec-title, .chip, .about-grid, .polaroid, .skills-cloud, .footer-inner'
).forEach(el => {
  if (!el.classList.contains('reveal')) el.classList.add('reveal');
  revealObs.observe(el);
});
