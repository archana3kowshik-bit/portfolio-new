/* ── Visitor Doodle Wall ── */

// ─────────────────────────────────────────────
// TODO: Fill in your Firebase config below.
// Go to Firebase Console → Project Settings → Your Apps → Firebase SDK snippet
// Replace the placeholder values with your actual config.
// If you leave apiKey as 'YOUR_KEY', the app will fall back to localStorage.
// ─────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyB4jskDS88l7xrbyPpaIMWRBgnIsm2VsX4',
  authDomain:        'arc-portfolio-6ce87.firebaseapp.com',
  databaseURL:       'https://arc-portfolio-6ce87-default-rtdb.firebaseio.com',
  projectId:         'arc-portfolio-6ce87',
  storageBucket:     'arc-portfolio-6ce87.firebasestorage.app',
  messagingSenderId: '329431976138',
  appId:             '1:329431976138:web:a60750f65f5e19b3b70c33',
};

// ─────────────────────────────────────────────
// Firebase init (falls back to localStorage if config not filled in)
// ─────────────────────────────────────────────
let db = null;
const USE_FIREBASE = FIREBASE_CONFIG.apiKey !== 'YOUR_KEY';

if (USE_FIREBASE) {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
  } catch (e) {
    console.warn('[doodle] Firebase init failed, falling back to localStorage:', e);
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────
// Canvas setup
// ─────────────────────────────────────────────
const canvas = document.getElementById('doodle-canvas');
const ctx    = canvas.getContext('2d');

// Fill white so saved images have white background
ctx.fillStyle = '#FFFFFF';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.lineCap  = 'round';
ctx.lineJoin = 'round';

// ─────────────────────────────────────────────
// Drawing state
// ─────────────────────────────────────────────
let isDrawing   = false;
let lastX       = 0;
let lastY       = 0;
let activeTool  = 'pen';
let activeColor = '#000000';
let brushSize   = 2;
let isDirty     = false;
let history     = [];
const MAX_HISTORY = 20;

function saveHistory() {
  history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (history.length > MAX_HISTORY) history.shift();
}

function undo() {
  if (history.length === 0) return;
  const prev = history.pop();
  ctx.putImageData(prev, 0, 0);
  if (history.length === 0) isDirty = false;
}

// ─────────────────────────────────────────────
// Get canvas position (handles scaling & touch)
// ─────────────────────────────────────────────
function getCanvasPos(e) {
  const rect  = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;

  let clientX, clientY;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top)  * scaleY,
  };
}

// ─────────────────────────────────────────────
// Draw
// ─────────────────────────────────────────────
function startDraw(e) {
  const pos = getCanvasPos(e);
  if (activeTool === 'bucket') {
    saveHistory();
    floodFill(pos.x, pos.y);
    isDirty = true;
    scheduleCompliment();
    return;
  }

  saveHistory();
  isDrawing = true;
  lastX = pos.x;
  lastY = pos.y;

  // Dot on click/tap
  ctx.beginPath();
  if (activeTool === 'eraser') {
    ctx.fillStyle = '#FFFFFF';
    ctx.arc(pos.x, pos.y, brushSize * 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (activeTool === 'spray' || activeTool === 'glitter') {
    applySpecialBrush(pos.x, pos.y);
  } else {
    ctx.fillStyle = activeColor;
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─────────────────────────────────────────────
// Flood fill (paint bucket)
// ─────────────────────────────────────────────
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function floodFill(startX, startY) {
  startX = Math.floor(startX);
  startY = Math.floor(startY);
  const W = canvas.width;
  const H = canvas.height;
  if (startX < 0 || startX >= W || startY < 0 || startY >= H) return;

  const imageData = ctx.getImageData(0, 0, W, H);
  const data      = imageData.data;
  const visited   = new Uint8Array(W * H);

  const si = (startX + startY * W) * 4;
  const tR = data[si], tG = data[si + 1], tB = data[si + 2], tA = data[si + 3];
  const fill = hexToRgb(activeColor);
  if (tR === fill.r && tG === fill.g && tB === fill.b && tA === 255) return;

  const TOL = 30;
  function canFill(pi) {
    if (visited[pi]) return false;
    const i = pi * 4;
    return Math.abs(data[i]     - tR) <= TOL &&
           Math.abs(data[i + 1] - tG) <= TOL &&
           Math.abs(data[i + 2] - tB) <= TOL &&
           Math.abs(data[i + 3] - tA) <= TOL;
  }
  function paint(pi) {
    const i = pi * 4;
    data[i] = fill.r; data[i + 1] = fill.g; data[i + 2] = fill.b; data[i + 3] = 255;
    visited[pi] = 1;
  }

  const stack = [[startX, startY]];
  while (stack.length) {
    let [x, y] = stack.pop();
    while (x > 0 && canFill((x - 1) + y * W)) x--;
    let above = false, below = false;
    while (x < W && canFill(x + y * W)) {
      paint(x + y * W);
      if (y > 0) {
        const a = canFill(x + (y - 1) * W);
        if (a && !above) { stack.push([x, y - 1]); above = true; }
        else if (!a)       above = false;
      }
      if (y < H - 1) {
        const b = canFill(x + (y + 1) * W);
        if (b && !below) { stack.push([x, y + 1]); below = true; }
        else if (!b)      below = false;
      }
      x++;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applySpecialBrush(x, y) {
  if (activeTool === 'spray') {
    const density = brushSize * 6;
    const radius  = brushSize * 8;
    ctx.fillStyle = activeColor;
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r     = Math.random() * radius;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * r, y + Math.sin(angle) * r, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (activeTool === 'glitter') {
    const count  = brushSize * 3;
    const spread = brushSize * 10;
    ctx.fillStyle = activeColor;
    for (let i = 0; i < count; i++) {
      const gx   = x + (Math.random() - 0.5) * spread;
      const gy   = y + (Math.random() - 0.5) * spread;
      const size = Math.random() * brushSize * 0.8 + 0.5;
      const rot  = Math.random() * Math.PI;
      // 4-pointed star
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(rot);
      ctx.beginPath();
      for (let p = 0; p < 4; p++) {
        const a = (p / 4) * Math.PI * 2;
        const b = a + Math.PI / 4;
        ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
        ctx.lineTo(Math.cos(b) * size * 0.3, Math.sin(b) * size * 0.3);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

function draw(e) {
  if (!isDrawing) return;
  isDirty = true;

  const pos = getCanvasPos(e);

  if (activeTool === 'spray' || activeTool === 'glitter') {
    applySpecialBrush(pos.x, pos.y);
    lastX = pos.x;
    lastY = pos.y;
    updateCoords(pos.x, pos.y);
    return;
  }

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(pos.x, pos.y);

  if (activeTool === 'eraser') {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth   = brushSize * 5;
    ctx.lineCap     = 'round';
  } else if (activeTool === 'marker') {
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = activeColor;
    ctx.lineWidth   = brushSize * 3.5;
    ctx.lineCap     = 'round';
  } else {
    ctx.strokeStyle = activeColor;
    ctx.lineWidth   = brushSize;
    ctx.lineCap     = 'round';
  }

  ctx.stroke();
  ctx.globalAlpha = 1;

  lastX = pos.x;
  lastY = pos.y;

  updateCoords(pos.x, pos.y);
}

function stopDraw(e) {
  if (!isDrawing) return;
  isDrawing = false;
  if (isDirty) {
    scheduleCompliment();
  }
}

// ─────────────────────────────────────────────
// Mouse events
// ─────────────────────────────────────────────
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', (e) => {
  const pos = getCanvasPos(e);
  updateCoords(pos.x, pos.y);
  draw(e);
});
canvas.addEventListener('mouseup',    stopDraw);
canvas.addEventListener('mouseleave', stopDraw);

// ─────────────────────────────────────────────
// Touch events
// ─────────────────────────────────────────────
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  startDraw(e);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  draw(e);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  stopDraw(e);
}, { passive: false });

// ─────────────────────────────────────────────
// Status bar coords
// ─────────────────────────────────────────────
const statusCoords = document.getElementById('doodle-status-coords');
const statusTool   = document.getElementById('doodle-status-tool');

function updateCoords(x, y) {
  if (statusCoords) {
    statusCoords.textContent = `${Math.round(x)}, ${Math.round(y)}`;
  }
}

function updateToolStatus(name) {
  if (statusTool) {
    statusTool.textContent = name;
  }
}

// ─────────────────────────────────────────────
// Tool buttons
// ─────────────────────────────────────────────
document.querySelectorAll('.pt-tool').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pt-tool').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeTool = btn.dataset.tool;
    const toolNames = { pen: 'Pencil', marker: 'Marker', spray: 'Spray', glitter: 'Glitter', eraser: 'Eraser', bucket: 'Fill' };
    updateToolStatus(toolNames[activeTool] || activeTool);
  });
});

// ─────────────────────────────────────────────
// Size buttons
// ─────────────────────────────────────────────
document.querySelectorAll('.pt-sz').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pt-sz').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    brushSize = parseInt(btn.dataset.size, 10);
  });
});

// ─────────────────────────────────────────────
// Color palette
// ─────────────────────────────────────────────
const PALETTE_COLORS = [
  '#000000', '#808080', '#800000', '#FF0000',
  '#FF8000', '#FFFF00', '#008000', '#00FF00',
  '#008080', '#00FFFF', '#000080', '#0000FF',
  '#800080', '#FF00FF', '#804000', '#FF8080',
  '#FFFFFF', '#C0C0C0', '#FFD700', '#98FB98',
];

const paletteEl = document.getElementById('doodle-palette');
const fgSwatch  = document.getElementById('doodle-fg-swatch');

if (paletteEl) {
  PALETTE_COLORS.forEach((color, i) => {
    const sw = document.createElement('div');
    sw.className    = 'color-swatch' + (i === 0 ? ' active' : '');
    sw.style.background = color;
    sw.title        = color;
    sw.dataset.color = color;
    sw.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      activeColor = color;
      if (fgSwatch) fgSwatch.style.background = color;
      // Switch to pen if eraser was active
      if (activeTool === 'eraser') {
        activeTool = 'pen';
        document.querySelectorAll('.pt-tool').forEach((b) => {
          b.classList.toggle('active', b.dataset.tool === 'pen');
        });
        updateToolStatus('Pencil');
      }
    });
    paletteEl.appendChild(sw);
  });
}

// ─────────────────────────────────────────────
// Compliment bubble
// ─────────────────────────────────────────────
const COMPLIMENTS = [
  'Picasso WHO?? 🎨',
  'This belongs in a museum fr',
  'Certified masterpiece 🏆',
  'okay but you\'re literally an artist',
  'I\'m obsessed with this 😍',
  'The Louvre called, they want this',
  'You just cooked 🔥',
  '10/10 no notes ✨',
  'This doodle has MAIN CHARACTER energy',
  'Archana would be so proud of this 🌟',
  'Absolute banger of a doodle',
  'Your talent is unreal, bestie',
];

const bubble        = document.getElementById('doodle-compliment');
let complimentTimer = null;
let hideTimer       = null;

function showCompliment() {
  if (!bubble) return;
  // Pick a random compliment
  const text = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
  bubble.innerHTML = `<span class="bubble-star">✦</span>${text}`;

  // Reset animation
  bubble.classList.remove('show', 'hide');
  // Force reflow
  void bubble.offsetWidth;
  bubble.classList.add('show');

  // Auto-hide after 3.5s
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    bubble.classList.remove('show');
    bubble.classList.add('hide');
    hideTimer = setTimeout(() => {
      bubble.classList.remove('hide');
    }, 300);
  }, 3500);
}

function scheduleCompliment() {
  clearTimeout(complimentTimer);
  complimentTimer = setTimeout(() => {
    if (isDirty) showCompliment();
  }, 700);
}

// ─────────────────────────────────────────────
// Undo button + keyboard shortcut
// ─────────────────────────────────────────────
const undoBtn = document.getElementById('doodle-undo');
if (undoBtn) undoBtn.addEventListener('click', undo);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    const inCanvas = e.target === canvas || e.target.closest('.paint-tool-wrap');
    if (inCanvas || e.target === document.body) {
      e.preventDefault();
      undo();
    }
  }
});

// ─────────────────────────────────────────────
// Clear button
// ─────────────────────────────────────────────
const clearBtn = document.getElementById('doodle-clear');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    const msg = 'Wipe the canvas? This can\'t be undone! 🧹';
    if (!confirm(msg)) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    isDirty = false;
    // Hide compliment if showing
    if (bubble) {
      bubble.classList.remove('show');
      bubble.classList.add('hide');
      clearTimeout(hideTimer);
      clearTimeout(complimentTimer);
    }
  });
}

// ─────────────────────────────────────────────
// Save / Add to gallery
// ─────────────────────────────────────────────
const saveBtn = document.getElementById('doodle-save');

function flashSaved(success) {
  if (!saveBtn) return;
  const origText = saveBtn.textContent;
  saveBtn.textContent = success ? '✦ Saved!' : '✗ Error';
  saveBtn.classList.toggle('saved', success);
  setTimeout(() => {
    saveBtn.textContent = origText;
    saveBtn.classList.remove('saved');
  }, 2000);
}

function createThumb() {
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width  = 220;
  thumbCanvas.height = 130;
  const tCtx = thumbCanvas.getContext('2d');
  tCtx.fillStyle = '#FFFFFF';
  tCtx.fillRect(0, 0, 220, 130);
  tCtx.drawImage(canvas, 0, 0, 220, 130);
  return thumbCanvas.toDataURL('image/jpeg', 0.65);
}

// ─────────────────────────────────────────────
// Name dialog
// ─────────────────────────────────────────────
const nameOverlay  = document.getElementById('doodle-name-overlay');
const nameInput    = document.getElementById('doodle-name-input');
const nameOkBtn    = document.getElementById('doodle-name-ok');
const nameCancelBtn= document.getElementById('doodle-name-cancel');
const nameCancelX  = document.getElementById('doodle-name-cancel-x');

function showNameDialog(onConfirm) {
  if (!nameOverlay) { onConfirm(''); return; }
  nameInput.value = '';
  nameOverlay.style.display = 'flex';
  setTimeout(() => nameInput.focus(), 50);

  function finish(name) {
    nameOverlay.style.display = 'none';
    cleanup();
    onConfirm((name || '').trim());
  }

  function cleanup() {
    nameOkBtn.removeEventListener('click', ok);
    nameCancelBtn.removeEventListener('click', skip);
    nameCancelX.removeEventListener('click', skip);
    nameInput.removeEventListener('keydown', keydown);
    nameOverlay.removeEventListener('click', backdrop);
  }

  function ok()     { finish(nameInput.value); }
  function skip()   { finish(''); }
  function keydown(e) { if (e.key === 'Enter') ok(); if (e.key === 'Escape') skip(); }
  function backdrop(e) { if (e.target === nameOverlay) skip(); }

  nameOkBtn.addEventListener('click', ok);
  nameCancelBtn.addEventListener('click', skip);
  nameCancelX.addEventListener('click', skip);
  nameInput.addEventListener('keydown', keydown);
  nameOverlay.addEventListener('click', backdrop);
}

if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    if (!isDirty) {
      alert('Draw something first! 🎨');
      return;
    }

    showNameDialog((name) => {
      const img   = createThumb();
      const ts    = Date.now();
      const today = todayKey();

      if (USE_FIREBASE && db) {
        const ref = db.ref(`doodles/${today}`);
        ref.push({ img, ts, name })
          .then(() => {
            flashSaved(true);
            if (confirm('Your doodle has joined the gallery! 🎉 Clear the canvas?')) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              isDirty = false;
            }
          })
          .catch((err) => {
            console.error('[doodle] Firebase save error:', err);
            flashSaved(false);
          });
      } else {
        const key = `doodles-${today}`;
        let arr = [];
        try { arr = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { /* empty */ }
        arr.push({ img, ts, name });
        if (arr.length > 40) arr = arr.slice(arr.length - 40);
        localStorage.setItem(key, JSON.stringify(arr));
        flashSaved(true);
        renderGallery(arr);
        if (confirm('Your doodle has joined the gallery! 🎉 Clear the canvas?')) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          isDirty = false;
        }
      }
    });
  });
}

// ─────────────────────────────────────────────
// Gallery render
// ─────────────────────────────────────────────
const galleryEl    = document.getElementById('doodle-gallery');
const galleryEmpty = document.getElementById('doodle-gallery-empty');

function renderGallery(doodles) {
  if (!galleryEl) return;

  // Sort newest first, limit 40
  const sorted = [...doodles]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 40);

  if (sorted.length === 0) {
    if (galleryEmpty) galleryEmpty.style.display = '';
    galleryEl.innerHTML = '';
    return;
  }

  if (galleryEmpty) galleryEmpty.style.display = 'none';

  // Track existing card ids to animate only new ones
  const existing = new Set(
    Array.from(galleryEl.querySelectorAll('.dg-card')).map((c) => c.dataset.ts)
  );

  galleryEl.innerHTML = '';

  sorted.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'dg-card';
    card.dataset.ts = item.ts;
    if (!existing.has(String(item.ts))) {
      card.style.animationDelay = '0ms';
    } else {
      card.style.animation = 'none';
    }
    const img = document.createElement('img');
    img.src   = item.img;
    img.alt   = 'visitor doodle';
    img.loading = 'lazy';
    const timeEl = document.createElement('div');
    timeEl.className = 'dg-card-time';
    timeEl.textContent = item.name ? item.name : formatTime(item.ts);
    card.appendChild(img);
    card.appendChild(timeEl);
    galleryEl.appendChild(card);
  });
}

// ─────────────────────────────────────────────
// Load gallery
// ─────────────────────────────────────────────
function loadGallery() {
  const today = todayKey();

  if (USE_FIREBASE && db) {
    // Real-time listener
    db.ref(`doodles/${today}`).on('value', (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        renderGallery([]);
        return;
      }
      const items = Object.values(val);
      renderGallery(items);
    });
  } else {
    // localStorage
    const key = `doodles-${today}`;
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { /* empty */ }
    renderGallery(arr);
  }
}

// ─────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────
loadGallery();
updateToolStatus('Pencil');
