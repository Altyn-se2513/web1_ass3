/* =========================================================
   Digital Book Collection — Account (Firebase Auth), Streak & Shelf
   Author: Altyn Abdinurova | Group: SE-2513
   ========================================================= */
import { auth } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ============ localStorage keys (streak / shelf / progress) ============ */
const KEY_BOOKS = 'bc_books';
const KEY_DAYS  = 'bc_readDays';
const KEY_SHELF = 'bc_shelf';
const KEY_EXTRA = 'bc_user_extras';

const $ = (id) => document.getElementById(id);
const todayKey = () => new Date().toISOString().slice(0, 10);

const getDays  = () => JSON.parse(localStorage.getItem(KEY_DAYS)  || '[]');
const setDays  = (a) => localStorage.setItem(KEY_DAYS, JSON.stringify(a));
const getBooks = () => JSON.parse(localStorage.getItem(KEY_BOOKS) || '[]');
const setBooks = (a) => localStorage.setItem(KEY_BOOKS, JSON.stringify(a));
const getShelf = () => JSON.parse(localStorage.getItem(KEY_SHELF) || '[]');
const setShelf = (a) => localStorage.setItem(KEY_SHELF, JSON.stringify(a));
const getExtras = () => JSON.parse(localStorage.getItem(KEY_EXTRA) || '{}');
const setExtras = (o) => localStorage.setItem(KEY_EXTRA, JSON.stringify(o));

/* ============ Streak ============ */
function computeStreak(days) {
  if (!days.length) return { current: 0, best: 0 };
  const set = new Set(days);
  const sorted = [...set].sort();

  let current = 0;
  let d = new Date();
  if (!set.has(todayKey())) d.setDate(d.getDate() - 1);
  while (set.has(d.toISOString().slice(0, 10))) {
    current++;
    d.setDate(d.getDate() - 1);
  }

  let best = 0, run = 0, prev = null;
  for (const k of sorted) {
    if (prev) {
      const p = new Date(prev);
      p.setDate(p.getDate() + 1);
      run = (p.toISOString().slice(0, 10) === k) ? run + 1 : 1;
    } else run = 1;
    if (run > best) best = run;
    prev = k;
  }
  return { current, best };
}

function renderStreak() {
  const days = getDays();
  const { current, best } = computeStreak(days);

  const sc = $('streak-count'); if (sc) sc.textContent = current;
  const s1 = $('stat-current'); if (s1) s1.textContent = current;
  const s2 = $('stat-best');    if (s2) s2.textContent = best;
  const s3 = $('stat-total');   if (s3) s3.textContent = days.length;

  const hero = $('hero-streak'); if (hero) hero.textContent = current;
  const sc2 = $('stat-current-2'); if (sc2) sc2.textContent = current;
  const sb2 = $('stat-best-2');    if (sb2) sb2.textContent = best;
  const st2 = $('stat-total-2');   if (st2) st2.textContent = days.length;

  const msg = $('streak-message');
  if (msg) {
    if (current === 0)     msg.textContent = 'Log your first 20-min session today!';
    else if (current < 3)  msg.textContent = `Keep going! ${current} day(s) so far.`;
    else if (current < 7)  msg.textContent = `Great pace — ${current} days in a row!`;
    else if (current < 30) msg.textContent = `🔥 On fire! ${current} day streak!`;
    else                   msg.textContent = `🏆 Legendary — ${current} days!`;
  }
  renderCalendar(days);
}

function renderCalendar(days) {
  const cal = $('streak-calendar');
  if (!cal) return;
  const set = new Set(days);
  const today = new Date();
  let html = '';
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const cls = 'cal-cell' + (set.has(key) ? ' active' : '') + (i === 0 ? ' today' : '');
    html += `<div class="${cls}" title="${key}">${d.getDate()}</div>`;
  }
  cal.innerHTML = html;
}

/* ============ Utils ============ */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g,
    (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

/* ============ Shelf ============ */
function renderShelf() {
  const shelf = getShelf();
  const box = $('my-shelf');
  if (!box) return;
  if (!shelf.length) {
    box.innerHTML = '<p class="empty-msg p-3">Your shelf is empty. Browse the <a href="3product.html">catalog</a> and click "Add to Shelf" 🔖</p>';
    return;
  }
  box.innerHTML = shelf.map((b, i) => `
    <div class="shelf-item p-3">
      <div class="shelf-bookmark">🔖</div>
      <img src="${escapeHtml(b.cover)}" alt="${escapeHtml(b.title)} cover">
      <div class="shelf-item-info">
        <h4 class="mb-1">${escapeHtml(b.title)}</h4>
        <p class="mb-2">${escapeHtml(b.author || 'Unknown')}</p>
        <a href="8reader.html?id=${encodeURIComponent(b.id)}" class="btn btn-sm btn-primary">📖 Read</a>
      </div>
      <button class="btn btn-sm btn-outline-danger shelf-remove"
              data-i="${i}" title="Remove from shelf"
              aria-label="Remove ${escapeHtml(b.title)} from shelf">✕</button>
    </div>
  `).join('');
}

/* ============ Reading progress ============ */
function renderBooks() {
  const books = getBooks();
  const box = $('my-books');
  if (!box) return;
  if (!books.length) {
    box.innerHTML = '<p class="empty-msg p-3">No reading progress yet. Add a book below!</p>';
    return;
  }
  box.innerHTML = books.map((b, i) => {
    const pct = b.totalPages
      ? Math.min(100, Math.round((b.currentPage / b.totalPages) * 100))
      : 0;
    return `
      <div class="book-item p-3">
        <div class="book-item-info">
          <h4 class="mb-1">${escapeHtml(b.title)}</h4>
          <p class="book-item-author mb-1">${escapeHtml(b.author || 'Unknown')}</p>
          <p class="book-item-progress mb-2">${b.currentPage || 0} / ${b.totalPages || '?'} pages · ${pct}%</p>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="book-item-actions">
          <button class="btn btn-sm btn-outline-primary" data-action="update" data-i="${i}">Update</button>
          <button class="btn btn-sm btn-outline-danger" data-action="remove" data-i="${i}">Remove</button>
        </div>
      </div>`;
  }).join('');
}

/* ============ Auth UI ============ */
function showLoginTab() {
  const l = $('login-section');
  const r = $('register-section');
  const tl = $('tab-login');
  const tr = $('tab-register');
  if (!l || !r) return;
  l.hidden = false;
  r.hidden = true;
  if (tl) tl.classList.add('active');
  if (tr) tr.classList.remove('active');
  const le = $('login-error'); if (le) le.hidden = true;
  const re = $('register-error'); if (re) re.hidden = true;
}

function showRegisterTab() {
  const l = $('login-section');
  const r = $('register-section');
  const tl = $('tab-login');
  const tr = $('tab-register');
  if (!l || !r) return;
  l.hidden = true;
  r.hidden = false;
  if (tl) tl.classList.remove('active');
  if (tr) tr.classList.add('active');
  const le = $('login-error'); if (le) le.hidden = true;
  const re = $('register-error'); if (re) re.hidden = true;
}

function showAuthError(which, msg) {
  const el = $(which === 'login' ? 'login-error' : 'register-error');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}

/* ============ Profile render ============ */
function renderProfileForUser(user) {
  const authSec = $('auth-section');
  const prof = $('profile-section');
  if (!authSec || !prof) return;

  if (user) {
    authSec.hidden = true;
    prof.hidden = false;

    const displayName = user.displayName || (user.email || '').split('@')[0];
    const un = $('user-name');   if (un) un.textContent = displayName;

    const aN = $('acc-name');    if (aN) aN.textContent = displayName;
    const aE = $('acc-email');   if (aE) aE.textContent = user.email || '—';

    const extras = getExtras()[user.email] || {};
    const aG = $('acc-genre');   if (aG) aG.textContent = extras.genre || '—';
    const aGo = $('acc-goal');   if (aGo) aGo.textContent = extras.goal || 20;

    const aS = $('acc-since');
    if (aS) {
      const ct = user.metadata && user.metadata.creationTime;
      aS.textContent = ct ? new Date(ct).toLocaleDateString() : '—';
    }
  } else {
    authSec.hidden = false;
    prof.hidden = true;
    showLoginTab();
  }
}

/* ============ Bind events ============ */
function bindEvents() {
  const tabLogin = $('tab-login');
  const tabRegister = $('tab-register');
  const linkReg = $('link-to-register');
  const linkLog = $('link-to-login');
  if (tabLogin) tabLogin.addEventListener('click', showLoginTab);
  if (tabRegister) tabRegister.addEventListener('click', showRegisterTab);
  if (linkReg) linkReg.addEventListener('click', (e) => { e.preventDefault(); showRegisterTab(); });
  if (linkLog) linkLog.addEventListener('click', (e) => { e.preventDefault(); showLoginTab(); });

  const regForm = $('register-form');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('reg-name').value.trim();
      const email = $('reg-email').value.trim().toLowerCase();
      const password = $('reg-password').value;
      const genre = $('reg-genre').value;
      const goal = parseInt($('reg-goal').value, 10) || 20;

      if (!name || !email || !password) {
        showAuthError('register', 'Please fill in all required fields.');
        return;
      }
      if (password.length < 6) {
        showAuthError('register', 'Password must be at least 6 characters.');
        return;
      }

      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        const extras = getExtras();
        extras[email] = { genre, goal };
        setExtras(extras);
        regForm.reset();
      } catch (error) {
        console.error('Registration error:', error);
        let message = 'Registration failed. Please try again.';
        if (error.code === 'auth/email-already-in-use')
          message = 'This email is already registered. Try logging in.';
        else if (error.code === 'auth/weak-password')
          message = 'Password is too weak. Use at least 6 characters.';
        else if (error.code === 'auth/invalid-email')
          message = 'Please enter a valid email address.';
        showAuthError('register', message);
      }
    });
  }

  const loginForm = $('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('login-email').value.trim().toLowerCase();
      const password = $('login-password').value;

      try {
        await signInWithEmailAndPassword(auth, email, password);
        loginForm.reset();
      } catch (error) {
        console.error('Login error:', error);
        let message = 'Login failed. Please check your credentials.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential')
          message = 'Incorrect email or password.';
        else if (error.code === 'auth/too-many-requests')
          message = 'Too many failed attempts. Try again later.';
        else if (error.code === 'auth/invalid-email')
          message = 'Please enter a valid email address.';
        showAuthError('login', message);
      }
    });
  }

  const forgot = $('forgot-password-link');
  if (forgot) {
    forgot.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = prompt('Enter your email address to receive a password reset link:');
      if (!email) return;
      try {
        await sendPasswordResetEmail(auth, email.trim().toLowerCase());
        alert('Password reset email sent! Check your inbox (and spam folder).');
      } catch (error) {
        console.error('Reset error:', error);
        alert('Could not send reset email. Please make sure the email is registered.');
      }
    });
  }

  const logout = $('logout-btn');
  if (logout) {
    logout.addEventListener('click', async () => {
      if (!confirm('Log out? Your streak, shelf and progress stay saved on this device.')) return;
      try { await signOut(auth); } catch (e) { console.error(e); }
    });
  }

  const logBtn = $('log-read-btn');
  if (logBtn) {
    logBtn.addEventListener('click', () => {
      const key = todayKey();
      const days = getDays();
      if (days.includes(key)) {
        alert('You already logged today. See you tomorrow! 🔥');
        return;
      }
      days.push(key);
      setDays(days);
      renderStreak();
      alert('Logged! Your streak grew. 🔥');
    });
  }

  const addForm = $('add-book-form');
  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = $('book-title').value.trim();
      const author = $('book-author').value.trim();
      const total = parseInt($('book-total').value, 10) || 0;
      const current = parseInt($('book-current').value, 10) || 0;
      if (!title) return;
      const books = getBooks();
      books.push({ title, author, totalPages: total, currentPage: current });
      setBooks(books);
      e.target.reset();
      renderBooks();
    });
  }

  const myBooks = $('my-books');
  if (myBooks) {
    myBooks.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const i = parseInt(btn.dataset.i, 10);
      const books = getBooks();
      if (btn.dataset.action === 'remove') {
        if (confirm('Remove this book?')) {
          books.splice(i, 1);
          setBooks(books);
          renderBooks();
        }
      } else if (btn.dataset.action === 'update') {
        const val = prompt('Current page:', books[i].currentPage || 0);
        if (val !== null) {
          books[i].currentPage = Math.max(0, parseInt(val, 10) || 0);
          setBooks(books);
          renderBooks();
        }
      }
    });
  }

  const shelfBox = $('my-shelf');
  if (shelfBox) {
    shelfBox.addEventListener('click', (e) => {
      const btn = e.target.closest('.shelf-remove');
      if (!btn) return;
      const i = parseInt(btn.dataset.i, 10);
      const sh = getShelf();
      sh.splice(i, 1);
      setShelf(sh);
      renderShelf();
    });
  }

  const toggle = $('streak-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const panel = $('streak-panel');
      const open = !panel.hidden;
      panel.hidden = open;
      toggle.setAttribute('aria-expanded', String(!open));
    });
  }
}

/* ============ Init ============ */
document.addEventListener('DOMContentLoaded', () => {
  renderStreak();
  renderShelf();
  renderBooks();
  bindEvents();

  onAuthStateChanged(auth, (user) => {
    renderProfileForUser(user);
    renderStreak();
  });
});