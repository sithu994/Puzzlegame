/**
 * Lumina Slide - API Client Module
 * Handles all backend communication with JWT authentication.
 */

const API = (() => {
  const TOKEN_KEY = 'lumina_token';
  const USER_KEY = 'lumina_user';

  // ── Helpers ──────────────────────────────────────────────

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getStoredUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function setStoredUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function isLoggedIn() {
    return !!getToken();
  }

  /**
   * Build request headers with optional JWT token.
   */
  function buildHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (includeAuth) {
      const token = getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  /**
   * Handle the response - parse JSON, handle errors, auto-logout on 401.
   */
  async function handleResponse(response) {
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
      const message = (data && data.error) || (data && data.message) || `Request failed (${response.status})`;
      throw new Error(message);
    }

    return data;
  }

  // ── Core Request Methods ─────────────────────────────────

  async function apiGet(url) {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(),
    });
    return handleResponse(response);
  }

  async function apiPost(url, body = {}) {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  }

  async function apiPut(url, body = {}) {
    const response = await fetch(url, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  }

  // ── Authentication ───────────────────────────────────────

  async function register(username, email, password, displayName = null) {
    const payload = { username, email, password };
    if (displayName) payload.display_name = displayName;
    const data = await apiPost('/api/auth/register', payload);
    if (data.token) {
      setToken(data.token);
    }
    if (data.user) {
      setStoredUser(data.user);
    }
    return data;
  }

  async function login(email, password) {
    const data = await apiPost('/api/auth/login', { email, password });
    if (data.token) {
      setToken(data.token);
    }
    if (data.user) {
      setStoredUser(data.user);
    }
    return data;
  }

  function logout() {
    removeToken();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  // ── User Profile ─────────────────────────────────────────

  async function getProfile() {
    const data = await apiGet('/api/auth/me');
    if (data.user) {
      setStoredUser(data.user);
    }
    return data;
  }

  async function updateProfile(profileData) {
    const data = await apiPut('/api/auth/profile', profileData);
    if (data.user) {
      setStoredUser(data.user);
    }
    return data;
  }

  // ── Game Sessions ────────────────────────────────────────

  async function startGame(level) {
    return apiPost('/api/game/start', { level });
  }

  async function completeGame(sessionId, moves, timeSeconds) {
    return apiPut(`/api/game/complete/${sessionId}`, { moves, time_seconds: timeSeconds });
  }

  // ── Progress ─────────────────────────────────────────────

  async function getProgress() {
    return apiGet('/api/game/progress');
  }

  async function getGameHistory(page = 1) {
    return apiGet(`/api/game/history?page=${page}`);
  }

  // ── Leaderboard ──────────────────────────────────────────

  async function getLeaderboard(level) {
    return apiGet(`/api/leaderboard/${level}`);
  }

  async function getGlobalLeaderboard() {
    return apiGet('/api/leaderboard/global/top');
  }

  // ── Achievements ─────────────────────────────────────────

  async function getAchievements() {
    return apiGet('/api/achievements');
  }

  async function getUserAchievements() {
    return apiGet('/api/achievements/user');
  }

  // ── Public API ───────────────────────────────────────────

  return {
    getToken,
    isLoggedIn,
    getStoredUser,
    logout,
    register,
    login,
    getProfile,
    updateProfile,
    startGame,
    completeGame,
    getProgress,
    getGameHistory,
    getLeaderboard,
    getGlobalLeaderboard,
    getAchievements,
    getUserAchievements,
  };
})();
