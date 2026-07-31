/**
 * Life Dashboard — app.js
 * Vanilla JS | No frameworks | localStorage persistence
 */

'use strict';

/* ============================================================
   CONSTANTS & STATE
   ============================================================ */

const STORAGE_KEYS = {
  TODOS: 'dashboard_todos',
  LINKS: 'dashboard_links',
};

const TIMER_DURATION = 25 * 60; // seconds

let timerSeconds   = TIMER_DURATION;
let timerInterval  = null;
let timerRunning   = false;

/** @type {Array<{id: string, text: string, done: boolean}>} */
let todos = [];

/** @type {Array<{id: string, name: string, url: string}>} */
let links = [];

/* ============================================================
   UTILITY
   ============================================================ */

/**
 * Generate a simple unique ID.
 * @returns {string}
 */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Persist data to localStorage.
 * @param {string} key
 * @param {*} value
 */
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}

/**
 * Load data from localStorage.
 * @param {string} key
 * @param {*} fallback
 * @returns {*}
 */
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

/* ============================================================
   1. GREETING  —  Live clock, date, greeting message
   ============================================================ */

const elClock    = document.getElementById('clock');
const elGreeting = document.getElementById('greeting-text');
const elDate     = document.getElementById('date-text');

/**
 * Return a greeting string based on the current hour.
 * @param {number} hour  0–23
 * @returns {string}
 */
function getGreeting(hour) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Update the clock display every second.
 */
function updateClock() {
  const now  = new Date();
  const h    = now.getHours();
  const m    = now.getMinutes().toString().padStart(2, '0');
  const s    = now.getSeconds().toString().padStart(2, '0');
  const h12  = (h % 12 || 12).toString().padStart(2, '0');
  const ampm = h < 12 ? 'AM' : 'PM';

  elClock.textContent    = `${h12}:${m}:${s} ${ampm}`;
  elGreeting.textContent = getGreeting(h);

  elDate.textContent = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

// Tick immediately, then every second
updateClock();
setInterval(updateClock, 1000);

/* ============================================================
   2. FOCUS TIMER
   ============================================================ */

const elTimerDisplay = document.getElementById('timer-display');
const elTimerStart   = document.getElementById('timer-start');
const elTimerStop    = document.getElementById('timer-stop');
const elTimerReset   = document.getElementById('timer-reset');

/**
 * Format seconds into MM:SS.
 * @param {number} total  seconds
 * @returns {string}
 */
function formatTime(total) {
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Render the current timer value to the DOM. */
function renderTimer() {
  elTimerDisplay.textContent = formatTime(timerSeconds);

  // Visual state classes
  elTimerDisplay.classList.toggle('running', timerRunning && timerSeconds > 0);
  elTimerDisplay.classList.toggle('finished', timerSeconds === 0);
}

/** Start the countdown. */
function startTimer() {
  if (timerRunning || timerSeconds === 0) return;

  timerRunning = true;
  elTimerStart.disabled = true;
  elTimerStop.disabled  = false;

  timerInterval = setInterval(() => {
    timerSeconds -= 1;
    renderTimer();

    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      elTimerStart.disabled = true;
      elTimerStop.disabled  = true;
      // Notify user
      elTimerDisplay.textContent = 'Done!';
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Focus session complete!', {
          body: 'Take a short break.',
          icon: '',
        });
      }
    }
  }, 1000);
}

/** Pause the countdown. */
function stopTimer() {
  if (!timerRunning) return;

  clearInterval(timerInterval);
  timerRunning = false;
  elTimerStart.disabled = false;
  elTimerStop.disabled  = true;
  renderTimer();
}

/** Reset to 25 minutes. */
function resetTimer() {
  clearInterval(timerInterval);
  timerRunning  = false;
  timerSeconds  = TIMER_DURATION;
  elTimerStart.disabled = false;
  elTimerStop.disabled  = true;
  renderTimer();
}

elTimerStart.addEventListener('click', startTimer);
elTimerStop.addEventListener('click', stopTimer);
elTimerReset.addEventListener('click', resetTimer);

// Initial render
renderTimer();

// Request notification permission (best-effort, no prompt spam)
if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
  Notification.requestPermission();
}

/* ============================================================
   3. TO-DO LIST
   ============================================================ */

const elTodoForm  = document.getElementById('todo-form');
const elTodoInput = document.getElementById('todo-input');
const elTodoList  = document.getElementById('todo-list');
const elTodoEmpty = document.getElementById('todo-empty');

/** Load persisted todos from localStorage. */
function loadTodos() {
  todos = load(STORAGE_KEYS.TODOS, []);
}

/** Save current todos array to localStorage. */
function saveTodos() {
  save(STORAGE_KEYS.TODOS, todos);
}

/** Re-render the entire todo list from state. */
function renderTodos() {
  elTodoList.innerHTML = '';

  if (todos.length === 0) {
    elTodoEmpty.style.display = 'block';
    return;
  }

  elTodoEmpty.style.display = 'none';

  todos.forEach((todo) => {
    const li = createTodoElement(todo);
    elTodoList.appendChild(li);
  });
}

/**
 * Build a <li> element for a single todo item.
 * @param {{id: string, text: string, done: boolean}} todo
 * @returns {HTMLLIElement}
 */
function createTodoElement(todo) {
  const li = document.createElement('li');
  li.className = `todo-item${todo.done ? ' done' : ''}`;
  li.dataset.id = todo.id;

  // --- Checkbox ---
  const checkbox = document.createElement('input');
  checkbox.type      = 'checkbox';
  checkbox.className = 'todo-checkbox';
  checkbox.checked   = todo.done;
  checkbox.setAttribute('aria-label', `Mark "${todo.text}" as done`);

  checkbox.addEventListener('change', () => toggleTodo(todo.id));

  // --- Label ---
  const label = document.createElement('span');
  label.className   = 'todo-label';
  label.textContent = todo.text;
  label.title       = 'Double-click to edit';

  // Inline edit on double-click
  label.addEventListener('dblclick', () => startInlineEdit(li, todo));

  // --- Action buttons ---
  const actions = document.createElement('div');
  actions.className = 'todo-actions';

  const editBtn = document.createElement('button');
  editBtn.className          = 'btn-icon';
  editBtn.innerHTML          = '✏️';
  editBtn.setAttribute('aria-label', 'Edit task');
  editBtn.addEventListener('click', () => startInlineEdit(li, todo));

  const deleteBtn = document.createElement('button');
  deleteBtn.className         = 'btn-icon danger';
  deleteBtn.innerHTML         = '🗑️';
  deleteBtn.setAttribute('aria-label', 'Delete task');
  deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  li.appendChild(checkbox);
  li.appendChild(label);
  li.appendChild(actions);

  return li;
}

/**
 * Replace the label span with an input for inline editing.
 * @param {HTMLLIElement} li
 * @param {{id: string, text: string, done: boolean}} todo
 */
function startInlineEdit(li, todo) {
  const label = li.querySelector('.todo-label');
  if (!label) return; // already in edit mode

  const input = document.createElement('input');
  input.type      = 'text';
  input.className = 'todo-label-input';
  input.value     = todo.text;
  input.maxLength = 200;

  li.replaceChild(input, label);
  input.focus();
  input.select();

  // Commit on Enter or blur
  const commit = () => {
    const newText = input.value.trim();
    if (newText && newText !== todo.text) {
      todo.text = newText;
      saveTodos();
    }
    renderTodos();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { renderTodos(); }          // discard
  });

  input.addEventListener('blur', commit);
}

/**
 * Toggle the done state of a todo.
 * @param {string} id
 */
function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  todo.done = !todo.done;
  saveTodos();
  renderTodos();
}

/**
 * Delete a todo by id.
 * @param {string} id
 */
function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  renderTodos();
}

/**
 * Add a new todo from the form input.
 * @param {Event} e
 */
function handleTodoSubmit(e) {
  e.preventDefault();
  const text = elTodoInput.value.trim();
  if (!text) return;

  todos.push({ id: uid(), text, done: false });
  saveTodos();
  renderTodos();

  elTodoInput.value = '';
  elTodoInput.focus();
}

elTodoForm.addEventListener('submit', handleTodoSubmit);

// Load & render on startup
loadTodos();
renderTodos();

/* ============================================================
   4. QUICK LINKS
   ============================================================ */

const elLinksForm  = document.getElementById('links-form');
const elLinkName   = document.getElementById('link-name');
const elLinkUrl    = document.getElementById('link-url');
const elLinksGrid  = document.getElementById('links-grid');
const elLinksEmpty = document.getElementById('links-empty');

/** Load persisted links from localStorage. */
function loadLinks() {
  links = load(STORAGE_KEYS.LINKS, []);
}

/** Save current links array to localStorage. */
function saveLinks() {
  save(STORAGE_KEYS.LINKS, links);
}

/**
 * Ensure a URL has a protocol prefix.
 * @param {string} url
 * @returns {string}
 */
function ensureProtocol(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return 'https://' + url;
}

/** Re-render the links grid from state. */
function renderLinks() {
  elLinksGrid.innerHTML = '';

  if (links.length === 0) {
    elLinksEmpty.style.display = 'block';
    return;
  }

  elLinksEmpty.style.display = 'none';

  links.forEach((link) => {
    const chip = createLinkChip(link);
    elLinksGrid.appendChild(chip);
  });
}

/**
 * Build a chip element for a single link.
 * @param {{id: string, name: string, url: string}} link
 * @returns {HTMLElement}
 */
function createLinkChip(link) {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'inline-flex';

  const anchor = document.createElement('a');
  anchor.className = 'link-chip';
  anchor.href      = link.url;
  anchor.target    = '_blank';
  anchor.rel       = 'noopener noreferrer';
  anchor.textContent = link.name;
  anchor.title      = link.url;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'link-chip-delete';
  deleteBtn.innerHTML = '✕';
  deleteBtn.setAttribute('aria-label', `Remove ${link.name}`);
  deleteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    deleteLink(link.id);
  });

  anchor.appendChild(deleteBtn);
  wrapper.appendChild(anchor);
  return wrapper;
}

/**
 * Delete a link by id.
 * @param {string} id
 */
function deleteLink(id) {
  links = links.filter((l) => l.id !== id);
  saveLinks();
  renderLinks();
}

/**
 * Add a new link from the form inputs.
 * @param {Event} e
 */
function handleLinksSubmit(e) {
  e.preventDefault();

  const name = elLinkName.value.trim();
  const rawUrl = elLinkUrl.value.trim();

  if (!name || !rawUrl) return;

  const url = ensureProtocol(rawUrl);

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    elLinkUrl.focus();
    elLinkUrl.setCustomValidity('Please enter a valid URL.');
    elLinkUrl.reportValidity();
    return;
  }

  elLinkUrl.setCustomValidity('');

  links.push({ id: uid(), name, url });
  saveLinks();
  renderLinks();

  elLinkName.value = '';
  elLinkUrl.value  = '';
  elLinkName.focus();
}

elLinksForm.addEventListener('submit', handleLinksSubmit);

// Load & render on startup
loadLinks();
renderLinks();
