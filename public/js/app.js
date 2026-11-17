/**
 * Lumina Slide - Main Application Controller
 */

let game = null;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  game = new PuzzleGame({
    onWin: handleWin,
    onMove: () => {}
  });

  setupEventListeners();
  updateAuthUI();
  loadInitialData();

  // Start Level 1
  game.startLevel(game.state.level || 1);
}

function setupEventListeners() {
  // Audio toggles
  const musicBtn = document.getElementById('music-toggle');
  if (musicBtn) {
    musicBtn.addEventListener('click', (e) => {
      game.state.musicEnabled = !game.state.musicEnabled;
      e.currentTarget.classList.toggle('active', game.state.musicEnabled);
      e.currentTarget.textContent = game.state.musicEnabled ? '🎵' : '🔇';
      if (game.state.musicEnabled) game.audio.startMusic();
      else game.audio.stopMusic();
    });
  }

  const sfxBtn = document.getElementById('sfx-toggle');
  if (sfxBtn) {
    sfxBtn.addEventListener('click', (e) => {
      game.state.sfxEnabled = !game.state.sfxEnabled;
      e.currentTarget.classList.toggle('active', game.state.sfxEnabled);
      e.currentTarget.textContent = game.state.sfxEnabled ? '🔊' : '🔈';
    });
  }

  // Start relaxing ambient music on the very first interaction (click, tap, or move)
  const tryStartMusic = () => {
    if (game.state.musicEnabled && !game.audio.isMusicPlaying) {
      game.audio.startMusic();
    }
  };
  ['pointerdown', 'click', 'touchstart', 'keydown'].forEach(evt => {
    document.addEventListener(evt, tryStartMusic, { once: true });
  });

  // Theme selector
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      game.state.theme = btn.dataset.theme;
      game.renderBoard();
      game.renderPeekPreview();
    });
  });

  // Puzzle Size selector (9, 16, 25, 36, 49 tiles)
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetLevel = parseInt(btn.dataset.level, 10);
      game.startLevel(targetLevel);
      refreshLeaderboard(targetLevel);
    });
  });

  // Action buttons
  const undoBtn = document.getElementById('undo-btn');
  if (undoBtn) undoBtn.addEventListener('click', () => game.undoMove());

  const hintBtn = document.getElementById('hint-btn');
  if (hintBtn) hintBtn.addEventListener('click', () => game.showSmartHint());

  const peekBtn = document.getElementById('peek-btn');
  const peekOverlay = document.getElementById('peek-overlay');
  if (peekBtn && peekOverlay) {
    peekBtn.addEventListener('pointerdown', () => peekOverlay.classList.add('visible'));
    peekBtn.addEventListener('pointerup', () => peekOverlay.classList.remove('visible'));
    peekBtn.addEventListener('pointerleave', () => peekOverlay.classList.remove('visible'));
  }

  const autoSolveBtn = document.getElementById('auto-solve-btn');
  if (autoSolveBtn) autoSolveBtn.addEventListener('click', () => game.autoSolve());

  const shuffleBtn = document.getElementById('shuffle-btn');
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      game.resetStats();
      game.shuffleBoardSolvable();
      game.renderBoard();
    });
  }

  // Next level button
  const nextLevelBtn = document.getElementById('next-level-btn');
  if (nextLevelBtn) {
    nextLevelBtn.addEventListener('click', () => {
      document.getElementById('win-modal').classList.remove('open');
      game.startLevel(game.state.level + 1);
      refreshLeaderboard(game.state.level);
    });
  }

  // Modals & Auth Forms
  setupAuthModals();

  // Tab switching for Leaderboard / Achievements
  document.querySelectorAll('.side-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.side-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.target);
      if (target) target.style.display = 'block';
    });
  });
}

function setupAuthModals() {
  const loginModal = document.getElementById('auth-modal');
  const openLoginBtn = document.getElementById('login-btn');
  const closeAuthBtn = document.getElementById('close-auth-btn');
  const authToggleTab = document.querySelectorAll('.auth-tab-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const logoutBtn = document.getElementById('logout-btn');

  if (openLoginBtn && loginModal) {
    openLoginBtn.addEventListener('click', () => {
      loginModal.classList.add('open');
    });
  }

  if (closeAuthBtn && loginModal) {
    closeAuthBtn.addEventListener('click', () => {
      loginModal.classList.remove('open');
    });
  }

  authToggleTab.forEach(tab => {
    tab.addEventListener('click', () => {
      authToggleTab.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (tab.dataset.mode === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
      } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
      }
    });
  });

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;
      const errorMsg = document.getElementById('login-error');
      try {
        errorMsg.textContent = '';
        await API.login(email, pass);
        loginModal.classList.remove('open');
        updateAuthUI();
        loadInitialData();
      } catch (err) {
        errorMsg.textContent = err.message;
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = document.getElementById('reg-username').value;
      const email = document.getElementById('reg-email').value;
      const pass = document.getElementById('reg-password').value;
      const errorMsg = document.getElementById('register-error');
      try {
        errorMsg.textContent = '';
        await API.register(user, email, pass);
        loginModal.classList.remove('open');
        updateAuthUI();
        loadInitialData();
      } catch (err) {
        errorMsg.textContent = err.message;
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      API.logout();
      updateAuthUI();
      loadInitialData();
    });
  }

  window.addEventListener('auth:logout', () => {
    updateAuthUI();
  });
}

function updateAuthUI() {
  const loggedIn = API.isLoggedIn();
  const user = API.getStoredUser();

  const authActions = document.getElementById('auth-actions');
  const userBadge = document.getElementById('user-badge');
  const playerName = document.getElementById('player-name');
  const playerInitial = document.getElementById('player-initial');

  if (loggedIn && user) {
    if (authActions) authActions.style.display = 'none';
    if (userBadge) userBadge.style.display = 'flex';
    if (playerName) playerName.textContent = user.display_name || user.username;
    if (playerInitial) playerInitial.textContent = (user.username || 'P').charAt(0).toUpperCase();
  } else {
    if (authActions) authActions.style.display = 'flex';
    if (userBadge) userBadge.style.display = 'none';
    if (playerName) playerName.textContent = 'Guest Player';
    if (playerInitial) playerInitial.textContent = 'G';
  }
}

async function loadInitialData() {
  refreshLeaderboard(game ? game.state.level : 1);
  refreshAchievements();
  if (API.isLoggedIn()) {
    try {
      const prog = await API.getProgress();
      if (prog && prog.progress && prog.progress.highest_level) {
        // Can optionally set game.state.level
      }
    } catch (_) {}
  }
}

async function refreshLeaderboard(lvl = 1) {
  const listEl = document.getElementById('leaderboard-list');
  if (!listEl) return;
  try {
    listEl.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:8px;">Loading ranks...</div>';
    const data = await API.getLeaderboard(lvl);
    if (!data.leaderboard || data.leaderboard.length === 0) {
      listEl.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:8px;">No scores yet for this level!</div>';
      return;
    }
    listEl.innerHTML = data.leaderboard.map(entry => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;">
        <span style="font-weight:700;color:${entry.rank === 1 ? '#ffd166' : '#8ef6f3'};">#${entry.rank} ${entry.display_name}</span>
        <span style="color:var(--text-muted);">${entry.score} pts (${entry.best_moves}m)</span>
      </div>
    `).join('');
  } catch (err) {
    listEl.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:8px;">Play level to set a score!</div>`;
  }
}

async function refreshAchievements() {
  const achEl = document.getElementById('achievements-list');
  if (!achEl) return;
  try {
    const all = await API.getAchievements();
    let unlockedIds = [];
    if (API.isLoggedIn()) {
      const userAchs = await API.getUserAchievements();
      if (userAchs && userAchs.achievements) {
        unlockedIds = userAchs.achievements.map(a => a.id);
      }
    }

    if (!all.achievements || all.achievements.length === 0) return;
    achEl.innerHTML = all.achievements.map(ach => {
      const isUnlocked = unlockedIds.includes(ach.id);
      return `
        <div style="display:flex;gap:10px;align-items:center;padding:8px;border-radius:10px;background:rgba(255,255,255,${isUnlocked ? '0.08' : '0.02'});opacity:${isUnlocked ? '1' : '0.5'};border:1px solid ${isUnlocked ? 'var(--accent)' : 'rgba(255,255,255,0.05)'};margin-bottom:6px;">
          <div style="font-size:20px;">${isUnlocked ? '⭐' : '🔒'}</div>
          <div>
            <div style="font-weight:700;font-size:13px;color:#fff;">${ach.name}</div>
            <div style="font-size:11px;color:var(--text-muted);">${ach.description}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (_) {}
}

function handleWin(result) {
  const winModal = document.getElementById('win-modal');
  const winTitle = document.getElementById('win-title');
  const winSub = document.getElementById('win-subtitle');
  const winMoves = document.getElementById('win-moves');
  const winTime = document.getElementById('win-time');
  const winScore = document.getElementById('win-score');
  const nextBtn = document.getElementById('next-level-btn');

  const nextLvl = result.level + 1;
  const nextSize = Math.min(nextLvl + 2, 7);

  if (winTitle) winTitle.textContent = `Level ${result.level} Solved!`;
  if (winSub) winSub.innerHTML = `Great work! Next up: <strong>Level ${nextLvl} (${nextSize}×${nextSize})</strong>`;
  if (winMoves) winMoves.textContent = result.moves;
  if (winTime) winTime.textContent = game.formatTime(result.seconds);
  if (winScore) winScore.textContent = `${result.score} pts`;
  if (nextBtn) nextBtn.textContent = `Play Level ${nextLvl} →`;

  if (winModal) winModal.classList.add('open');

  // Sync size selector button state
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.level, 10) === nextLvl);
  });

  refreshLeaderboard(result.level);
  refreshAchievements();
}
