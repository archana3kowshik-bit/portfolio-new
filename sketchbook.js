/* ── Sketchbook viewer (Personal filter) ── */
(function () {
  const SPREADS = [
    { type: 'cover' },
    { left: 'projects/personal-work/illus-01.png', right: 'projects/personal-work/illus-02.png' },
    { left: 'projects/personal-work/illus-03.png', right: 'projects/personal-work/illus-04.png' },
    { left: 'projects/personal-work/illus-05.png', right: 'projects/personal-work/illus-06.png' },
    { left: 'projects/personal-work/illus-07.png', right: 'projects/personal-work/illus-08.png' },
    { left: 'projects/personal-work/illus-09.png', right: 'projects/personal-work/illus-10.png' },
    { left: 'projects/personal-work/illus-11.png', right: 'projects/personal-work/illus-12.png' },
    { left: 'projects/personal-work/illus-13.png', right: 'projects/personal-work/illus-14.png' },
    { left: 'projects/personal-work/dinner-is-served.png', right: 'projects/personal-work/punk-future-1.png' },
    { type: 'back' },
  ];

  const book    = document.getElementById('sk-book');
  const dotsEl  = document.getElementById('sk-dots');
  const prevBtn = document.getElementById('sk-prev');
  const nextBtn = document.getElementById('sk-next');
  if (!book) return;

  let current   = 0;
  let animating = false;

  const section = document.getElementById('sketchbook-section');

  function setBookShape(idx) {
    const isPortrait = SPREADS[idx].type === 'cover' || SPREADS[idx].type === 'back';
    book.classList.toggle('sk-book--portrait', isPortrait);
    if (section) section.classList.toggle('sk-showing-cover', isPortrait);
  }

  // ── Build spreads ──
  SPREADS.forEach((spread, i) => {
    const el = document.createElement('div');
    el.className = 'sk-spread' + (i === 0 ? ' active' : '');
    el.dataset.index = i;

    if (spread.type === 'cover') {
      el.classList.add('sk-spread--single');
      el.innerHTML = `<img src="projects/personal-work/notebook-cover.png" alt="Sketchbook cover" />`;
    } else if (spread.type === 'back') {
      el.classList.add('sk-spread--single');
      el.innerHTML = `<img src="projects/personal-work/notebook-back.png" alt="Back cover" />`;
    } else {
      el.innerHTML = `
        <div class="sk-page sk-page-left">
          ${spread.left ? `<img src="${spread.left}" alt="illustration" />` : ''}
        </div>
        <div class="sk-page sk-page-right">
          ${spread.right ? `<img src="${spread.right}" alt="illustration" />` : ''}
        </div>`;
    }
    book.appendChild(el);
  });

  // ── Build dots ──
  SPREADS.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'sk-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Page ${i + 1}`);
    dot.addEventListener('click', () => goTo(i, i > current ? 'next' : 'prev'));
    dotsEl.appendChild(dot);
  });

  function updateDots() {
    dotsEl.querySelectorAll('.sk-dot').forEach((d, i) => d.classList.toggle('active', i === current));
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === SPREADS.length - 1;
  }

  function goTo(index, dir) {
    if (animating || index === current) return;
    animating = true;

    setBookShape(index); // kick off size transition immediately

    const outEl  = book.querySelector('.sk-spread.active');
    const inEl   = book.querySelector(`.sk-spread[data-index="${index}"]`);
    const isNext = dir === 'next';

    inEl.classList.add('active');
    inEl.style.zIndex  = '0';
    outEl.style.zIndex = '1';

    const srcPage = isNext ? outEl.querySelector('.sk-page-right') : outEl.querySelector('.sk-page-left');
    const revPage = isNext ? inEl.querySelector('.sk-page-left')   : inEl.querySelector('.sk-page-right');

    // If either end is a single-image spread, crossfade instead of flipping
    if (!srcPage || !revPage) {
      outEl.classList.add('sk-spread--fadeout');
      setTimeout(() => {
        outEl.classList.remove('active', 'sk-spread--fadeout');
        outEl.style.zIndex = '';
        inEl.style.zIndex  = '';
        current = index;
        updateDots();
        animating = false;
      }, 380);
      return;
    }

    const flipEl = document.createElement('div');
    flipEl.className = 'sk-flip-page ' + (isNext ? 'sk-flip-next' : 'sk-flip-prev');

    const front = document.createElement('div');
    front.className = 'sk-flip-face sk-flip-front ' + (isNext ? 'sk-flip-face-right' : 'sk-flip-face-left');
    front.innerHTML = srcPage.innerHTML;

    const back = document.createElement('div');
    back.className = 'sk-flip-face sk-flip-back ' + (isNext ? 'sk-flip-face-left' : 'sk-flip-face-right');
    back.innerHTML = revPage.innerHTML;

    flipEl.appendChild(front);
    flipEl.appendChild(back);
    book.appendChild(flipEl);

    requestAnimationFrame(() => {
      srcPage.style.visibility = 'hidden';
      requestAnimationFrame(() => {
        flipEl.classList.add('sk-flip-go');
      });
    });

    let done = false;
    function finish() {
      if (done) return;
      done = true;
      flipEl.remove();
      outEl.querySelectorAll('.sk-page').forEach(p => { p.style.visibility = ''; });
      outEl.classList.remove('active');
      outEl.style.zIndex = '';
      inEl.style.zIndex  = '';
      current = index;
      updateDots();
      animating = false;
    }

    flipEl.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 700);
  }

  prevBtn.addEventListener('click', () => { if (current > 0) goTo(current - 1, 'prev'); });
  nextBtn.addEventListener('click', () => { if (current < SPREADS.length - 1) goTo(current + 1, 'next'); });

  book.addEventListener('click', (e) => {
    if (animating) return;
    const rect = book.getBoundingClientRect();
    const mid  = rect.left + rect.width / 2;
    if (e.clientX > mid) {
      if (current < SPREADS.length - 1) goTo(current + 1, 'next');
    } else {
      if (current > 0) goTo(current - 1, 'prev');
    }
  });

  document.addEventListener('keydown', (e) => {
    const sec = document.getElementById('sketchbook-section');
    if (!sec || sec.hidden) return;
    if (e.key === 'ArrowRight') { if (current < SPREADS.length - 1) goTo(current + 1, 'next'); }
    if (e.key === 'ArrowLeft')  { if (current > 0) goTo(current - 1, 'prev'); }
  });

  setBookShape(0);
  updateDots();
})();
