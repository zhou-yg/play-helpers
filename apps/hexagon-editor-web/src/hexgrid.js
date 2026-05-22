/**
 * HEXGRID - Tactical Map Editor
 * Hexagonal Grid Engine
 */

class HexGrid {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = 10; // 10x10 grid
    this.hexSize = 28;
    this.padding = 60;

    // Terrain types with colors
    this.terrains = {
      grass: { color: '#2d5a27', highlight: '#4a8a42', icon: '🌿' },
      water: { color: '#1a4a6e', highlight: '#2d7ab0', icon: '💧' },
      mountain: { color: '#4a4a4a', highlight: '#6a6a6a', icon: '⛰️' },
      forest: { color: '#1a3a1a', highlight: '#2d5a2d', icon: '🌲' },
      sand: { color: '#8a7a4a', highlight: '#b09a5a', icon: '🏜️' },
      stone: { color: '#5a5a6a', highlight: '#7a7a8a', icon: '🪨' }
    };

    this.currentTerrain = 'grass';
    this.hoveredHex = null;
    this.grid = new Map();
    this.isDragging = false;
    this.lastPaintedHex = null;

    this.init();
  }

  init() {
    this.resize();
    this.createGrid();
    this.setupEvents();
    this.render();

    // Hide loading overlay
    setTimeout(() => {
      document.getElementById('canvas-overlay').classList.add('visible');
      setTimeout(() => {
        document.getElementById('canvas-overlay').classList.remove('visible');
      }, 500);
    }, 800);
  }

  resize() {
    const container = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = container.clientWidth * dpr;
    this.canvas.height = container.clientHeight * dpr;
    this.canvas.style.width = container.clientWidth + 'px';
    this.canvas.style.height = container.clientHeight + 'px';
    this.ctx.scale(dpr, dpr);
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    // Calculate hex size based on canvas
    const minDim = Math.min(this.width, this.height);
    const gridWidth = this.size * this.hexSize * Math.sqrt(3);
    this.hexSize = Math.min(28, (minDim - 120) / (this.size * 1.8));
  }

  createGrid() {
    this.grid.clear();
    for (let q = -this.size / 2; q <= this.size / 2; q++) {
      for (let r = -this.size / 2; r <= this.size / 2; r++) {
        const key = `${q},${r}`;
        this.grid.set(key, {
          q, r,
          terrain: 'grass',
          pulsePhase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  axialToWorld(q, r) {
    const x = this.hexSize * Math.sqrt(3) * (q + r / 2);
    const y = this.hexSize * 3 / 2 * r;
    return { x, y };
  }

  worldToAxial(x, y) {
    const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / this.hexSize;
    const r = (2 / 3 * y) / this.hexSize;
    return this.roundAxial(q, r);
  }

  roundAxial(q, r) {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }

    return { q: rq, r: rr };
  }

  getHexPoints(cx, cy, size) {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i - 30);
      points.push({
        x: cx + size * Math.cos(angle),
        y: cy + size * Math.sin(angle)
      });
    }
    return points;
  }

  drawHex(x, y, terrain, isHovered, isPulse = false) {
    const ctx = this.ctx;
    const points = this.getHexPoints(x, y, this.hexSize);

    // Glow effect for hovered
    if (isHovered) {
      ctx.shadowColor = '#00ff41';
      ctx.shadowBlur = 15;
    }

    // Fill
    const t = this.terrains[terrain];
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = isHovered ? t.highlight : t.color;
    ctx.fill();

    // Border
    ctx.strokeStyle = isHovered ? '#00ff41' : 'rgba(0, 255, 65, 0.3)';
    ctx.lineWidth = isHovered ? 2 : 1;
    ctx.stroke();

    // Pulse animation for recently changed
    if (isPulse) {
      ctx.strokeStyle = 'rgba(0, 255, 65, 0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Calculate offset to center grid
    const offsetX = this.width / 2;
    const offsetY = this.height / 2;

    // Draw all hexes
    for (const [key, hex] of this.grid) {
      const world = this.axialToWorld(hex.q, hex.r);
      const x = world.x + offsetX;
      const y = world.y + offsetY;
      const isHovered = this.hoveredHex && this.hoveredHex.q === hex.q && this.hoveredHex.r === hex.r;
      const isPulse = hex.pulsePhase !== null && Date.now() - hex.pulsePhase < 500;
      this.drawHex(x, y, hex.terrain, isHovered, isPulse);
    }

    requestAnimationFrame(() => this.render());
  }

  setupEvents() {
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
    this.canvas.addEventListener('contextmenu', (e) => this.onRightClick(e));

    window.addEventListener('resize', () => {
      this.resize();
    });
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  onMouseMove(e) {
    const pos = this.getMousePos(e);
    const offsetX = this.width / 2;
    const offsetY = this.height / 2;

    const worldX = pos.x - offsetX;
    const worldY = pos.y - offsetY;
    const axial = this.worldToAxial(worldX, worldY);

    const key = `${axial.q},${axial.r}`;
    if (this.grid.has(key)) {
      this.hoveredHex = axial;

      // Update cursor coords display
      document.getElementById('coords-value').textContent =
        `${axial.q.toString().padStart(3, ' ')},${axial.r.toString().padStart(3, ' ')}`;
    } else {
      this.hoveredHex = null;
    }

    // Paint while dragging
    if (this.isDragging && this.hoveredHex) {
      const hexKey = `${this.hoveredHex.q},${this.hoveredHex.r}`;
      if (hexKey !== this.lastPaintedHex) {
        this.paintHex(this.hoveredHex.q, this.hoveredHex.r);
        this.lastPaintedHex = hexKey;
      }
    }
  }

  onMouseDown(e) {
    if (e.button === 0) { // Left click
      this.isDragging = true;
      if (this.hoveredHex) {
        this.paintHex(this.hoveredHex.q, this.hoveredHex.r);
        this.lastPaintedHex = `${this.hoveredHex.q},${this.hoveredHex.r}`;
      }
    }
  }

  onMouseUp() {
    this.isDragging = false;
    this.lastPaintedHex = null;
  }

  onMouseLeave() {
    this.hoveredHex = null;
    this.isDragging = false;
    this.lastPaintedHex = null;
    document.getElementById('coords-value').textContent = '---,---';
  }

  onRightClick(e) {
    e.preventDefault();
    if (this.hoveredHex) {
      const key = `${this.hoveredHex.q},${this.hoveredHex.r}`;
      const hex = this.grid.get(key);
      if (hex) {
        // Pick terrain from clicked hex
        this.setCurrentTerrain(hex.terrain);
        this.updateTerrainButtons();
      }
    }
  }

  paintHex(q, r) {
    const key = `${q},${r}`;
    if (this.grid.has(key)) {
      const hex = this.grid.get(key);
      hex.terrain = this.currentTerrain;
      hex.pulsePhase = Date.now();
    }
  }

  setCurrentTerrain(terrain) {
    this.currentTerrain = terrain;
    this.updateTerrainButtons();
    document.getElementById('edit-mode').textContent = terrain.toUpperCase();
  }

  updateTerrainButtons() {
    document.querySelectorAll('.terrain-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.terrain === this.currentTerrain);
    });
  }

  clearGrid() {
    for (const [key, hex] of this.grid) {
      hex.terrain = 'grass';
      hex.pulsePhase = null;
    }
  }

  toJSON() {
    const hexes = [];
    for (const [key, hex] of this.grid) {
      hexes.push({ q: hex.q, r: hex.r, type: hex.terrain });
    }
    return {
      hexagons: hexes,
      grid_size: this.size
    };
  }

  fromJSON(data) {
    if (!data.hexagons) return;

    // Reset all to grass
    for (const [key, hex] of this.grid) {
      hex.terrain = 'grass';
    }

    // Apply saved data
    for (const saved of data.hexagons) {
      const key = `${saved.q},${saved.r}`;
      if (this.grid.has(key)) {
        this.grid.get(key).terrain = saved.type;
      }
    }

    if (data.grid_size) {
      this.size = data.grid_size;
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('hex-canvas');
  const grid = new HexGrid(canvas);

  // Setup terrain buttons
  const terrainGrid = document.getElementById('terrain-grid');
  for (const terrain of Object.keys(grid.terrains)) {
    const btn = document.createElement('button');
    btn.className = 'terrain-btn' + (terrain === 'grass' ? ' active' : '');
    btn.dataset.terrain = terrain;
    btn.dataset.label = terrain;
    btn.style.setProperty('--terrain-color', grid.terrains[terrain].color);
    btn.addEventListener('click', () => {
      grid.setCurrentTerrain(terrain);
    });
    terrainGrid.appendChild(btn);
  }

  // Save button
  document.getElementById('btn-save').addEventListener('click', () => {
    const data = grid.toJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hexgrid-map.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Load button
  document.getElementById('btn-load').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });

  // File input change
  document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          grid.fromJSON(data);
        } catch (err) {
          console.error('Failed to parse JSON:', err);
        }
      };
      reader.readAsText(file);
    }
  });

  // Clear button
  document.getElementById('btn-clear').addEventListener('click', () => {
    if (confirm('Clear all terrain data?')) {
      grid.clearGrid();
    }
  });

  // Update cell count
  document.getElementById('cell-count').textContent = grid.grid.size;
});
