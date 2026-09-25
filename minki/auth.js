/* ============================================================
   MediShield AI – Authentication & User Management
   auth.js – Credential store, login, logout, register
   ============================================================ */

'use strict';

(function () {

  // ─── DEFAULT CREDENTIAL STORE ──────────────────────────────
  // Stored in localStorage as JSON under key 'ms_users'
  const DEFAULT_USERS = [
    { username: 'Dr. Admin',           password: 'Admin@123', role: 'Administrator',     dept: 'All Departments',  initials: 'DA' },
    { username: 'Dr. Sarah Kim',        password: 'Admin@123', role: 'Doctor',            dept: 'Microbiology',     initials: 'SK' },
    { username: 'Dr. Raj Patel',        password: 'Admin@123', role: 'Doctor',            dept: 'ICU',              initials: 'RP' },
    { username: 'Dr. Emily Chen',       password: 'Admin@123', role: 'Doctor',            dept: 'Respiratory',      initials: 'EC' },
    { username: 'Dr. Carlos Rivera',    password: 'Admin@123', role: 'Doctor',            dept: 'General Medicine', initials: 'CR' },
    { username: 'Dr. James Okafor',     password: 'Admin@123', role: 'Doctor',            dept: 'Surgery',          initials: 'JO' },
    { username: 'Dr. Priya Nair',       password: 'Admin@123', role: 'Doctor',            dept: 'Microbiology',     initials: 'PN' },
    { username: 'Dr. Thomas Walsh',     password: 'Admin@123', role: 'Doctor',            dept: 'Cardiology',       initials: 'TW' },
    { username: 'Dr. Fatima Al-Hassan', password: 'Admin@123', role: 'Doctor',            dept: 'Neurology',        initials: 'FA' },
    { username: 'Dr. Michael Torres',   password: 'Admin@123', role: 'Doctor',            dept: 'Oncology',         initials: 'MT' },
    { username: 'Dr. Lisa Wang',        password: 'Admin@123', role: 'Doctor',            dept: 'Paediatrics',      initials: 'LW' },
    { username: 'Dr. Ahmed Hassan',     password: 'Admin@123', role: 'Doctor',            dept: 'Nephrology',       initials: 'AH' },
    { username: 'Dr. Julia Roberts',    password: 'Admin@123', role: 'Doctor',            dept: 'Gastroenterology', initials: 'JR' },
  ];

  const STORAGE_USERS   = 'ms_users';
  const STORAGE_SESSION = 'ms_session';

  // ─── LOAD / INIT USER STORE ────────────────────────────────
  function loadUsers() {
    try {
      const raw = localStorage.getItem(STORAGE_USERS);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    saveUsers(DEFAULT_USERS);
    return DEFAULT_USERS.slice();
  }

  function saveUsers(users) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  }

  // ─── SESSION ───────────────────────────────────────────────
  function getSession() {
    try {
      const raw = localStorage.getItem(STORAGE_SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function setSession(user) {
    localStorage.setItem(STORAGE_SESSION, JSON.stringify({
      username: user.username,
      role:     user.role,
      dept:     user.dept,
      initials: user.initials,
    }));
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_SESSION);
  }

  // ─── AUTH API ──────────────────────────────────────────────
  function login(username, password) {
    const users = loadUsers();
    const user  = users.find(u =>
      u.username.trim().toLowerCase() === username.trim().toLowerCase() &&
      u.password === password
    );
    if (user) {
      setSession(user);
      return { ok: true, user };
    }
    return { ok: false, error: 'Invalid username or password.' };
  }

  function logout() {
    clearSession();
    window.location.href = 'login.html';
  }

  function register(data) {
    // data: { username, password, role, dept }
    const users = loadUsers();

    if (!data.username || !data.password || !data.role || !data.dept) {
      return { ok: false, error: 'All fields are required.' };
    }
    if (data.password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }
    const exists = users.find(u => u.username.trim().toLowerCase() === data.username.trim().toLowerCase());
    if (exists) {
      return { ok: false, error: 'A user with this name already exists.' };
    }

    const initials = data.username
      .split(' ')
      .filter(Boolean)
      .map(w => w[0].toUpperCase())
      .join('')
      .slice(0, 2);

    const newUser = {
      username: data.username.trim(),
      password: data.password,
      role:     data.role,
      dept:     data.dept.trim(),
      initials,
    };
    users.push(newUser);
    saveUsers(users);
    return { ok: true, user: newUser };
  }

  // ─── RESET PASSWORD ────────────────────────────────────────
  // Verifies username + department match, then updates password.
  function resetPassword(username, dept, newPassword) {
    if (!username || !dept || !newPassword) {
      return { ok: false, error: 'All fields are required.' };
    }
    if (newPassword.length < 6) {
      return { ok: false, error: 'New password must be at least 6 characters.' };
    }

    const users = loadUsers();
    const idx   = users.findIndex(u =>
      u.username.trim().toLowerCase() === username.trim().toLowerCase() &&
      u.dept.trim().toLowerCase()     === dept.trim().toLowerCase()
    );

    if (idx === -1) {
      return { ok: false, error: 'No account found matching that name and department.' };
    }

    users[idx].password = newPassword;
    saveUsers(users);
    return { ok: true };
  }

  // ─── GUARD (call on dashboard pages) ──────────────────────
  function requireAuth() {
    const session = getSession();
    if (!session) {
      window.location.replace('login.html');
      return null;
    }
    return session;
  }

  // ─── EXPOSE GLOBALLY ───────────────────────────────────────
  window.MediAuth = { login, logout, register, resetPassword, requireAuth, getSession, loadUsers };

})();
