/**
 * Lumina Slide - Audio Engine
 * Calming harmonic background pads and sound effects using Web Audio API
 */
class RelaxingAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMusicPlaying = false;
    this.chordTimer = null;
    this.melodyTimer = null;
    this.masterGain = null;
    this.chordIndex = 0;
    
    // Warm, deeply relaxing chords (Fmaj9, Cmaj9, Am9, Em7, G6)
    this.chordProgression = [
      [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9 (F, A, C, E, G)
      [130.81, 196.00, 246.94, 329.63, 392.00], // Cmaj9 (C, G, B, E, G)
      [110.00, 164.81, 196.00, 261.63, 329.63], // Am9   (A, E, G, C, E)
      [164.81, 246.94, 293.66, 329.63, 392.00], // Em7   (E, B, D, E, G)
      [196.00, 246.94, 293.66, 329.63, 440.00]  // G6/9  (G, B, D, E, A)
    ];

    // Soothing pentatonic melody notes (Hz)
    this.melodyNotes = [
      261.63, 293.66, 329.63, 392.00, 440.00, // C4, D4, E4, G4, A4
      523.25, 587.33, 659.25, 783.99, 880.00  // C5, D5, E5, G5, A5
    ];
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.28, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startMusic() {
    this.initContext();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;

    // 1. Play warm harmonic ambient pads
    const playWarmPad = () => {
      if (!this.isMusicPlaying) return;
      const now = this.ctx.currentTime;
      const chord = this.chordProgression[this.chordIndex % this.chordProgression.length];
      this.chordIndex++;

      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const env = this.ctx.createGain();

        // Layer warm sine and gentle triangle waves with subtle detune for chorus warmth
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((idx - 2) * 4, now); // Natural slow chorus beat

        // Gentle low-pass filter for velvety softness
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(550, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + 3);
        filter.frequency.exponentialRampToValueAtTime(500, now + 7);

        // Slow breathing envelope
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(0.12 / chord.length, now + 2.8);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 7.8);

        osc.connect(filter);
        filter.connect(env);
        env.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 8.0);
      });
    };

    // 2. Play calm, crystal wind chimes / soft piano drop melody
    const playSoftMelody = () => {
      if (!this.isMusicPlaying) return;
      const now = this.ctx.currentTime;
      // Pick 1 to 2 gentle melody notes
      const count = Math.random() > 0.4 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const note = this.melodyNotes[Math.floor(Math.random() * this.melodyNotes.length)];
        const delay = i * 0.45;
        const noteTime = now + delay;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note, noteTime);

        // Soft bell/rhodes chime envelope
        gain.gain.setValueAtTime(0.0001, noteTime);
        gain.gain.linearRampToValueAtTime(0.045, noteTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 3.8);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + 4.0);
      }
    };

    playWarmPad();
    this.chordTimer = setInterval(playWarmPad, 7000);

    setTimeout(() => {
      playSoftMelody();
      this.melodyTimer = setInterval(playSoftMelody, 3200);
    }, 1200);
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.chordTimer) {
      clearInterval(this.chordTimer);
      this.chordTimer = null;
    }
    if (this.melodyTimer) {
      clearInterval(this.melodyTimer);
      this.melodyTimer = null;
    }
  }

  playSlideSound() {
    this.initContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playWinChime() {
    this.initContext();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const now = this.ctx.currentTime + i * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.68);
    });
  }
}

/**
 * Lumina Slide - Main Puzzle Game Engine
 */
class PuzzleGame {
  constructor(options = {}) {
    this.state = {
      level: 1,
      gridSize: 3,
      board: [],
      moves: 0,
      seconds: 0,
      timerId: null,
      isPlaying: false,
      theme: 'zen',
      musicEnabled: true,
      sfxEnabled: true,
      bestScores: {},
      currentSessionId: null
    };

    this.audio = new RelaxingAudioEngine();
    this.onWin = options.onWin || null;
    this.onMove = options.onMove || null;
    this.lastHintVal = null;
    this.history = []; // History stack for undoing moves
    this.isAutoSolving = false;
    this.autoSolveTimer = null;

    this.initTouch();
    this.loadLocalData();
  }

  loadLocalData() {
    try {
      const saved = JSON.parse(localStorage.getItem('lumina_game_state') || '{}');
      if (saved.level) this.state.level = saved.level;
      if (saved.bestScores) this.state.bestScores = saved.bestScores;
    } catch (_) {}
  }

  saveLocalData() {
    try {
      localStorage.setItem('lumina_game_state', JSON.stringify({
        level: this.state.level,
        bestScores: this.state.bestScores
      }));
    } catch (_) {}
  }

  getGridSizeForLevel(lvl) {
    return Math.min(lvl + 2, 7);
  }

  async startLevel(levelNum) {
    this.state.level = levelNum;
    this.state.gridSize = this.getGridSizeForLevel(levelNum);
    const totalTiles = this.state.gridSize * this.state.gridSize;

    const levelBadge = document.getElementById('level-badge');
    if (levelBadge) {
      levelBadge.textContent = `LEVEL ${this.state.level} • ${totalTiles} TILES (${this.state.gridSize}×${this.state.gridSize})`;
    }

    this.updateBestDisplay();
    this.resetStats();
    this.generateSolvedBoard();
    this.shuffleBoardSolvable();
    this.renderBoard();
    this.renderPeekPreview();

    // Start API session in background
    try {
      const session = await API.startGame(this.state.level);
      if (session && session.session_id) {
        this.state.currentSessionId = session.session_id;
      }
    } catch (err) {
      console.warn('Could not record game session start:', err.message);
    }
  }

  resetStats() {
    clearInterval(this.state.timerId);
    if (this.autoSolveTimer) {
      clearInterval(this.autoSolveTimer);
      this.autoSolveTimer = null;
    }
    this.isAutoSolving = false;
    this.history = [];
    this.state.moves = 0;
    this.state.seconds = 0;
    this.state.isPlaying = false;
    const movesEl = document.getElementById('moves-val');
    const timeEl = document.getElementById('time-val');
    if (movesEl) movesEl.textContent = '0';
    if (timeEl) timeEl.textContent = '00:00';
  }

  startTimer() {
    if (this.state.isPlaying) return;
    this.state.isPlaying = true;
    this.state.timerId = setInterval(() => {
      this.state.seconds++;
      const timeEl = document.getElementById('time-val');
      if (timeEl) timeEl.textContent = this.formatTime(this.state.seconds);
    }, 1000);
  }

  formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  generateSolvedBoard() {
    const total = this.state.gridSize * this.state.gridSize;
    this.state.board = [];
    for (let i = 1; i < total; i++) this.state.board.push(i);
    this.state.board.push(0);
  }

  getAdjacentIndices(idx, size) {
    const row = Math.floor(idx / size);
    const col = idx % size;
    const adj = [];
    if (row > 0) adj.push(idx - size);
    if (row < size - 1) adj.push(idx + size);
    if (col > 0) adj.push(idx - 1);
    if (col < size - 1) adj.push(idx + 1);
    return adj;
  }

  shuffleBoardSolvable() {
    const size = this.state.gridSize;
    const lvl = this.state.level;
    
    // Progressive difficulty: step count scales with grid size and level
    // Level 1: gentle/intermediate shuffle, higher levels: deeper, more complex entanglement
    const baseMultiplier = Math.min(10 + lvl * 4, 38);
    const shuffleSteps = size * size * baseMultiplier;
    
    // Varied shuffle patterns: 0=Random walk, 1=Directional sweep, 2=Spiral vortex, 3=Chaotic bounce
    const shuffleMode = Math.floor(Math.random() * 4);
    
    let emptyIdx = this.state.board.indexOf(0);
    let prevIdx = -1;
    let preferredDir = 0; // 0=right, 1=down, 2=left, 3=up

    for (let step = 0; step < shuffleSteps; step++) {
      const neighbors = this.getAdjacentIndices(emptyIdx, size).filter(idx => idx !== prevIdx);
      if (neighbors.length === 0) break;

      let nextIdx;

      if (shuffleMode === 1 && Math.random() < 0.65) {
        // Mode 1: Directional Sweeps
        const emptyRow = Math.floor(emptyIdx / size);
        const emptyCol = emptyIdx % size;
        const directional = neighbors.filter(nIdx => {
          const nRow = Math.floor(nIdx / size);
          const nCol = nIdx % size;
          if (preferredDir === 0) return nCol > emptyCol;
          if (preferredDir === 1) return nRow > emptyRow;
          if (preferredDir === 2) return nCol < emptyCol;
          return nRow < emptyRow;
        });

        if (directional.length > 0) {
          nextIdx = directional[Math.floor(Math.random() * directional.length)];
        } else {
          preferredDir = (preferredDir + 1) % 4;
          nextIdx = neighbors[Math.floor(Math.random() * neighbors.length)];
        }
      } else if (shuffleMode === 2 && Math.random() < 0.7) {
        // Mode 2: Corner-to-Center Vortex
        // Biases moves that drag perimeter tiles inward
        neighbors.sort((a, b) => {
          const center = (size - 1) / 2;
          const distA = Math.hypot((a % size) - center, Math.floor(a / size) - center);
          const distB = Math.hypot((b % size) - center, Math.floor(b / size) - center);
          return (step % 2 === 0 ? distA - distB : distB - distA) + (Math.random() * 0.4 - 0.2);
        });
        nextIdx = neighbors[0];
      } else {
        // Mode 0 & 3: Chaotic Weighted Random Walk
        nextIdx = neighbors[Math.floor(Math.random() * neighbors.length)];
      }

      [this.state.board[emptyIdx], this.state.board[nextIdx]] = [this.state.board[nextIdx], this.state.board[emptyIdx]];
      prevIdx = emptyIdx;
      emptyIdx = nextIdx;
    }

    if (this.isBoardSolved()) this.shuffleBoardSolvable();
  }

  handleTileClick(clickedIdx) {
    if (this.isAutoSolving) return; // Prevent manual moves during auto-solve
    const size = this.state.gridSize;
    const emptyIdx = this.state.board.indexOf(0);
    if (clickedIdx === emptyIdx) return;

    const clickRow = Math.floor(clickedIdx / size);
    const clickCol = clickedIdx % size;
    const emptyRow = Math.floor(emptyIdx / size);
    const emptyCol = emptyIdx % size;

    if (clickRow === emptyRow) {
      // Save board state to history before sliding
      this.history.push([...this.state.board]);
      this.startTimer();
      const step = clickCol < emptyCol ? -1 : 1;
      for (let c = emptyCol; c !== clickCol; c += step) {
        const curr = emptyRow * size + c;
        const next = emptyRow * size + (c + step);
        this.state.board[curr] = this.state.board[next];
      }
      this.state.board[clickedIdx] = 0;
      this.afterMove();
    } else if (clickCol === emptyCol) {
      // Save board state to history before sliding
      this.history.push([...this.state.board]);
      this.startTimer();
      const step = clickRow < emptyRow ? -1 : 1;
      for (let r = emptyRow; r !== clickRow; r += step) {
        const curr = r * size + emptyCol;
        const next = (r + step) * size + emptyCol;
        this.state.board[curr] = this.state.board[next];
      }
      this.state.board[clickedIdx] = 0;
      this.afterMove();
    }
  }

  undoMove() {
    if (this.isAutoSolving) return;
    if (this.history.length === 0) return;

    const previousBoard = this.history.pop();
    this.state.board = previousBoard;
    if (this.state.moves > 0) this.state.moves--;
    const movesEl = document.getElementById('moves-val');
    if (movesEl) movesEl.textContent = this.state.moves;
    if (this.state.sfxEnabled) this.audio.playSlideSound();
    this.renderBoard();
  }

  autoSolve() {
    if (this.isAutoSolving || this.isBoardSolved()) return;
    this.isAutoSolving = true;

    // Fast, aesthetically pleasing auto-assembly sequence
    const size = this.state.gridSize;
    const total = size * size;

    // Create a target sequence of solved boards
    let stepsLeft = 14; // Number of visual intermediate alignment steps
    if (this.autoSolveTimer) clearInterval(this.autoSolveTimer);

    const autoBtn = document.getElementById('auto-solve-btn');
    if (autoBtn) {
      autoBtn.textContent = '⏳ Solving...';
      autoBtn.style.opacity = '0.7';
    }

    this.autoSolveTimer = setInterval(() => {
      if (!this.isAutoSolving) {
        clearInterval(this.autoSolveTimer);
        return;
      }

      // Step-by-step heuristic move toward solved state
      const emptyIdx = this.state.board.indexOf(0);
      const neighbors = this.getAdjacentIndices(emptyIdx, size);

      let bestIdx = null;
      let minDistance = Infinity;

      neighbors.forEach(nIdx => {
        const testBoard = [...this.state.board];
        testBoard[emptyIdx] = testBoard[nIdx];
        testBoard[nIdx] = 0;

        let dist = 0;
        for (let i = 0; i < testBoard.length; i++) {
          const val = testBoard[i];
          if (val === 0) continue;
          const targetRow = Math.floor((val - 1) / size);
          const targetCol = (val - 1) % size;
          const curRow = Math.floor(i / size);
          const curCol = i % size;
          dist += Math.abs(curRow - targetRow) + Math.abs(curCol - targetCol);
        }
        if (dist < minDistance) {
          minDistance = dist;
          bestIdx = nIdx;
        }
      });

      stepsLeft--;

      // If close or running out of steps, snap towards final solved layout
      if (bestIdx !== null && minDistance > 0 && stepsLeft > 0) {
        this.state.board[emptyIdx] = this.state.board[bestIdx];
        this.state.board[bestIdx] = 0;
        this.state.moves++;
        const movesEl = document.getElementById('moves-val');
        if (movesEl) movesEl.textContent = this.state.moves;
        if (this.state.sfxEnabled) this.audio.playSlideSound();
        this.renderBoard();
      } else {
        // Complete the board to solved state
        this.generateSolvedBoard();
        this.renderBoard();
        clearInterval(this.autoSolveTimer);
        this.isAutoSolving = false;
        if (autoBtn) {
          autoBtn.textContent = '⚡ Auto Solve';
          autoBtn.style.opacity = '1';
        }
        this.handleLevelComplete();
      }
    }, 180);
  }

  afterMove() {
    this.state.moves++;
    const movesEl = document.getElementById('moves-val');
    if (movesEl) movesEl.textContent = this.state.moves;
    if (this.state.sfxEnabled) this.audio.playSlideSound();
    this.renderBoard();
    if (this.onMove) this.onMove(this.state.moves);
    if (this.isBoardSolved()) this.handleLevelComplete();
  }

  isBoardSolved() {
    const total = this.state.gridSize * this.state.gridSize;
    for (let i = 0; i < total - 1; i++) {
      if (this.state.board[i] !== i + 1) return false;
    }
    return this.state.board[total - 1] === 0;
  }

  getArtSvgDataUri(theme) {
    if (theme === 'aurora') {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#09152b"/>
            <stop offset="65%" stop-color="#1b3b6f"/>
            <stop offset="100%" stop-color="#2ec4b6"/>
          </linearGradient>
          <linearGradient id="wave" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#80ffdb" stop-opacity="0.85"/>
            <stop offset="50%" stop-color="#48bfe3" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#7400b8" stop-opacity="0.7"/>
          </linearGradient>
        </defs>
        <rect width="400" height="400" fill="url(#sky)"/>
        <circle cx="310" cy="85" r="34" fill="#fff3b0" opacity="0.9"/>
        <path d="M0 190 Q110 90 210 175 T400 130 L400 260 Q280 210 180 265 T0 235 Z" fill="url(#wave)"/>
        <polygon points="0,400 95,220 195,400" fill="#0d1b2a"/>
        <polygon points="130,400 255,195 385,400" fill="#1b263b"/>
        <polygon points="240,400 340,245 400,400" fill="#09152b"/>
      </svg>`;
      return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
    } else {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
        <defs>
          <radialGradient id="bg" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stop-color="#3a0ca3"/>
            <stop offset="55%" stop-color="#240046"/>
            <stop offset="100%" stop-color="#10002b"/>
          </radialGradient>
          <linearGradient id="petal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ff9ebb"/>
            <stop offset="100%" stop-color="#f72585"/>
          </linearGradient>
        </defs>
        <rect width="400" height="400" fill="url(#bg)"/>
        <circle cx="200" cy="200" r="145" fill="none" stroke="#ffd166" stroke-width="2" opacity="0.35"/>
        <g transform="translate(200,215)">
          <ellipse cx="0" cy="-70" rx="28" ry="85" fill="url(#petal)"/>
          <ellipse cx="0" cy="-70" rx="28" ry="85" fill="url(#petal)" transform="rotate(35)"/>
          <ellipse cx="0" cy="-70" rx="28" ry="85" fill="url(#petal)" transform="rotate(-35)"/>
          <ellipse cx="0" cy="-65" rx="26" ry="80" fill="#ff758f" transform="rotate(68)"/>
          <ellipse cx="0" cy="-65" rx="26" ry="80" fill="#ff758f" transform="rotate(-68)"/>
          <circle cx="0" cy="-15" r="24" fill="#ffd166"/>
        </g>
      </svg>`;
      return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
    }
  }

  renderBoard(hintTileValue = null) {
    const grid = document.getElementById('puzzle-grid');
    if (!grid) return;
    const size = this.state.gridSize;
    grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    grid.innerHTML = '';

    const fontSize = size <= 3 ? '28px' : size === 4 ? '22px' : size === 5 ? '18px' : '15px';
    const artUri = this.state.theme !== 'zen' ? this.getArtSvgDataUri(this.state.theme) : null;

    this.state.board.forEach((val, idx) => {
      const tile = document.createElement('div');
      tile.className = 'tile';

      if (val === 0) {
        tile.classList.add('empty');
      } else {
        if (val === idx + 1) tile.classList.add('correct');
        if (val === hintTileValue) tile.classList.add('hint-glow');

        if (this.state.theme === 'zen') {
          const hue = 175 + ((val * 11) % 65);
          tile.style.background = `linear-gradient(145deg, hsl(${hue}, 62%, 44%), hsl(${hue + 18}, 68%, 28%))`;
          tile.style.fontSize = fontSize;
          tile.textContent = val;
        } else {
          const correctRow = Math.floor((val - 1) / size);
          const correctCol = (val - 1) % size;
          tile.style.backgroundImage = artUri;
          tile.style.backgroundSize = `${size * 100}% ${size * 100}%`;
          const posX = size > 1 ? (correctCol / (size - 1)) * 100 : 0;
          const posY = size > 1 ? (correctRow / (size - 1)) * 100 : 0;
          tile.style.backgroundPosition = `${posX}% ${posY}%`;

          const badge = document.createElement('span');
          badge.className = 'tile-badge';
          badge.textContent = val;
          tile.appendChild(badge);
        }

        tile.addEventListener('click', () => this.handleTileClick(idx));
      }

      grid.appendChild(tile);
    });
  }

  renderPeekPreview() {
    const overlay = document.getElementById('peek-overlay');
    if (!overlay) return;
    if (this.state.theme === 'zen') {
      overlay.style.backgroundImage = 'none';
      overlay.innerHTML = `<div style="text-align:center;padding:20px;">
        <div style="font-size:20px;font-weight:800;color:#8ef6f3;margin-bottom:8px;">Goal Order</div>
        <div style="font-size:14px;color:#9fb3c8;">Arrange numbers <strong>1</strong> to <strong>${this.state.gridSize * this.state.gridSize - 1}</strong> sequentially.</div>
      </div>`;
    } else {
      overlay.innerHTML = '';
      overlay.style.backgroundImage = this.getArtSvgDataUri(this.state.theme);
      overlay.style.backgroundSize = 'cover';
      overlay.style.backgroundPosition = 'center';
    }
  }

  showSmartHint() {
    const size = this.state.gridSize;
    const emptyIdx = this.state.board.indexOf(0);
    const neighbors = this.getAdjacentIndices(emptyIdx, size);

    let bestTileVal = null;
    let bestScore = Infinity;

    neighbors.forEach(nIdx => {
      const tileVal = this.state.board[nIdx];
      const simBoard = [...this.state.board];
      simBoard[emptyIdx] = tileVal;
      simBoard[nIdx] = 0;

      let manhattan = 0;
      for (let i = 0; i < simBoard.length; i++) {
        const v = simBoard[i];
        if (v === 0) continue;
        const targetIdx = v - 1;
        const r1 = Math.floor(i / size), c1 = i % size;
        const r2 = Math.floor(targetIdx / size), c2 = targetIdx % size;
        manhattan += Math.abs(r1 - r2) + Math.abs(c1 - c2);
      }

      const penalty = tileVal === this.lastHintVal ? 1.5 : 0;
      if (manhattan + penalty < bestScore) {
        bestScore = manhattan + penalty;
        bestTileVal = tileVal;
      }
    });

    this.lastHintVal = bestTileVal;
    this.renderBoard(bestTileVal);
  }

  async handleLevelComplete() {
    clearInterval(this.state.timerId);
    this.state.isPlaying = false;
    if (this.state.sfxEnabled) this.audio.playWinChime();
    this.launchConfetti();

    const completedLvl = this.state.level;
    const moves = this.state.moves;
    const seconds = this.state.seconds;
    const score = Math.max(0, 1000 - (moves * 10) - (seconds * 2));

    const levelKey = `L${completedLvl}`;
    if (!this.state.bestScores[levelKey] || moves < this.state.bestScores[levelKey]) {
      this.state.bestScores[levelKey] = moves;
    }
    this.updateBestDisplay();
    this.saveLocalData();

    // Call backend API if session exists
    let apiResult = null;
    if (this.state.currentSessionId) {
      try {
        apiResult = await API.completeGame(this.state.currentSessionId, moves, seconds);
      } catch (err) {
        console.warn('Backend completion sync error:', err.message);
      }
    }

    if (this.onWin) {
      this.onWin({
        level: completedLvl,
        moves,
        seconds,
        score: (apiResult && apiResult.score) || score,
        isNewBest: (apiResult && apiResult.is_new_best) || false,
        newAchievements: (apiResult && apiResult.new_achievements) || []
      });
    }
  }

  updateBestDisplay() {
    const levelKey = `L${this.state.level}`;
    const best = this.state.bestScores[levelKey];
    const bestEl = document.getElementById('best-val');
    if (bestEl) bestEl.textContent = best ? `${best}m` : '--';
  }

  launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      r: 4 + Math.random() * 5,
      c: ['#5bc0be', '#8ef6f3', '#ffd166', '#ff758f', '#48cae4'][Math.floor(Math.random() * 5)],
      vx: -2 + Math.random() * 4,
      vy: 2.5 + Math.random() * 4
    }));

    let frames = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      frames++;
      if (frames < 130) requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    draw();
  }

  initTouch() {
    let touchStartX = 0, touchStartY = 0;
    const boardWrapper = document.getElementById('board-wrapper');
    if (!boardWrapper) return;

    boardWrapper.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    boardWrapper.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;

      const size = this.state.gridSize;
      const emptyIdx = this.state.board.indexOf(0);
      const emptyRow = Math.floor(emptyIdx / size);
      const emptyCol = emptyIdx % size;
      let targetIdx = -1;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && emptyCol > 0) targetIdx = emptyIdx - 1;
        else if (dx < 0 && emptyCol < size - 1) targetIdx = emptyIdx + 1;
      } else {
        if (dy > 0 && emptyRow > 0) targetIdx = emptyIdx - size;
        else if (dy < 0 && emptyRow < size - 1) targetIdx = emptyIdx + size;
      }
      if (targetIdx !== -1) this.handleTileClick(targetIdx);
    }, { passive: true });
  }
}
