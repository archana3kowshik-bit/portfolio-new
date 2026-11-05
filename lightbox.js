/* ── Lightbox + scatter sparkles + draggable polaroids ── */
(function () {
  const overlay  = document.getElementById('lb-overlay');
  const img      = document.getElementById('lb-img');
  const prevBtn  = document.getElementById('lb-prev');
  const nextBtn  = document.getElementById('lb-next');
  const closeBtn = document.getElementById('lb-close');
  if (!overlay) return;

  const thumbs = Array.from(document.querySelectorAll('.lb-thumb'));
  let current = 0;

  /* ── Lightbox ── */
  function show(index) {
    current = index;
    img.classList.add('lb-fade');
    setTimeout(() => {
      img.src = thumbs[index].dataset.src;
      img.onload = () => img.classList.remove('lb-fade');
    }, 120);
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === thumbs.length - 1;
  }

  function open(index) {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    show(index);
  }

  function close() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    img.src = '';
  }

  thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => open(i)));
  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => { if (current > 0) show(current - 1); });
  nextBtn.addEventListener('click', () => { if (current < thumbs.length - 1) show(current + 1); });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  document.addEventListener('keydown', e => {
    if (overlay.hidden) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowRight') { if (current < thumbs.length - 1) show(current + 1); }
    if (e.key === 'ArrowLeft')  { if (current > 0) show(current - 1); }
  });

  /* ── Sparkle doodles on hover ── */
  const CHARS = ['✦', '✧', '✩', '✳', '✻', '⊹', '✦', '✧'];

  function rand(min, max) { return min + Math.random() * (max - min); }

  function addSparkles(el) {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const positions = [
      { x: rand(-14, 4),             y: rand(-18, -4)              },
      { x: rand(w - 8, w + 14),      y: rand(-16, -2)              },
      { x: rand(-14, 2),             y: rand(h - 14, h + 6)        },
      { x: rand(w * 0.3, w * 0.7),   y: rand(-20, -8)              },
      { x: rand(w - 4, w + 16),      y: rand(h * 0.3, h * 0.7)    },
    ];
    positions.forEach((pos, i) => {
      const sp = document.createElement('span');
      sp.className = 'sparkle';
      sp.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
      sp.style.left = pos.x + 'px';
      sp.style.top  = pos.y + 'px';
      sp.style.fontSize = rand(0.75, 1.2) + 'rem';
      sp.style.animationDelay = (i * 55) + 'ms';
      el.appendChild(sp);
      sp.addEventListener('animationend', () => sp.remove(), { once: true });
    });
  }

  document.querySelectorAll('.scatter-item').forEach(item => {
    let cooldown = false;
    item.addEventListener('mouseenter', () => {
      if (cooldown) return;
      addSparkles(item);
      cooldown = true;
      setTimeout(() => { cooldown = false; }, 700);
    });
  });

  /* ── Draggable polaroids ── */
  function makeDraggable(item) {
    let startMouseX, startMouseY, startLeft, startTop;
    let dragging = false, moved = false;

    item.style.cursor = 'grab';

    item.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      startMouseX = e.clientX;
      startMouseY = e.clientY;
      startLeft   = parseFloat(item.style.left) || 0;
      startTop    = parseFloat(item.style.top)  || 0;
      dragging    = false;
      moved       = false;

      const onMove = e => {
        const dx = e.clientX - startMouseX;
        const dy = e.clientY - startMouseY;

        if (!dragging && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          dragging = true;
          moved    = true;
          item.style.cursor    = 'grabbing';
          item.style.zIndex    = '50';
          item.style.transform = 'rotate(-1.5deg) scale(1.06)';
          item.style.boxShadow = '0 16px 40px rgba(0,0,0,0.28), 0 40px 80px rgba(0,0,0,0.16)';
          item.style.transition = 'transform 0.12s ease, box-shadow 0.12s ease';
        }

        if (dragging) {
          item.style.transition = 'none';
          item.style.left = (startLeft + dx) + 'px';
          item.style.top  = (startTop  + dy) + 'px';
        }
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (dragging) {
          dragging = false;
          item.style.cursor    = 'grab';
          item.style.zIndex    = '';
          item.style.transition = 'transform 0.25s ease, box-shadow 0.25s ease';
          item.style.transform = '';
          item.style.boxShadow = '';
        }
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // Capture-phase click: block lightbox if this was a drag
    item.addEventListener('click', e => {
      if (moved) { e.stopPropagation(); moved = false; }
    }, true);
  }

  function initDraggableScatter() {
    const grid = document.querySelector('.scatter-grid');
    if (!grid) return;
    const items = Array.from(grid.querySelectorAll('.scatter-item'));
    if (!items.length) return;

    // Force-load all images (override lazy) so heights are correct before locking positions
    const images = Array.from(grid.querySelectorAll('img'));
    images.forEach(img => { img.loading = 'eager'; });

    const allLoaded = Promise.race([
      Promise.all(images.map(img =>
        img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; })
      )),
      new Promise(res => setTimeout(res, 8000)), // 8s safety fallback
    ]);

    allLoaded.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      const gridRect = grid.getBoundingClientRect();

      // Capture each card's rendered position relative to the grid
      const positions = items.map(item => {
        const r = item.getBoundingClientRect();
        return {
          left:   r.left   - gridRect.left,
          top:    r.top    - gridRect.top,
          width:  r.width,
          height: r.height,
        };
      });

      const maxBottom = Math.max(...positions.map(p => p.top + p.height));

      // Switch grid to a free-form canvas
      grid.style.display  = 'block';
      grid.style.position = 'relative';
      grid.style.height   = (maxBottom + 60) + 'px';

      // Lock every card at its current visual spot
      items.forEach((item, i) => {
        const p = positions[i];
        item.style.position = 'absolute';
        item.style.left     = p.left + 'px';
        item.style.top      = p.top  + 'px';
        item.style.width    = p.width + 'px';
        makeDraggable(item);
      });
    })));
  }

  // Initialise drag as soon as the sketchbook section is revealed
  const section = document.getElementById('sketchbook-section');
  if (section) {
    const obs = new MutationObserver(() => {
      if (!section.hidden) {
        obs.disconnect();
        initDraggableScatter();
      }
    });
    obs.observe(section, { attributes: true, attributeFilter: ['hidden'] });
  }
})();
