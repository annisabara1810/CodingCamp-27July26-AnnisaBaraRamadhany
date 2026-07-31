(function () {
  'use strict';

  // ─────────────────────────────────────────────
  // Constants & State
  // ─────────────────────────────────────────────

  const TASKS_KEY    = 'dashboard_tasks';
  const LINKS_KEY    = 'dashboard_links';
  const THEME_KEY    = 'dashboard_theme';
  const USERNAME_KEY = 'dashboard_username';
  const SORT_KEY     = 'dashboard_sort';

  const INITIAL_SECONDS = 25 * 60; // 1500

  let tasks        = [];        // Array<{ id: string, text: string, done: boolean }>
  let links        = [];        // Array<{ id: string, name: string, url: string }>
  let timerSeconds = INITIAL_SECONDS;
  let timerRunning = false;
  let timerInterval = null;
  let currentSort  = 'default'; // 'default' | 'az' | 'za' | 'done-last'

  // ─────────────────────────────────────────────
  // Utility Helpers
  // ─────────────────────────────────────────────

  /**
   * Format a Date object as HH:MM:SS (zero-padded 24-hour).
   * @param {Date} date
   * @returns {string}
   */
  function formatTime(date) {
    var hh = String(date.getHours()).padStart(2, '0');
    var mm = String(date.getMinutes()).padStart(2, '0');
    var ss = String(date.getSeconds()).padStart(2, '0');
    return hh + ':' + mm + ':' + ss;
  }

  /**
   * Format a Date object as "Weekday, DD Month YYYY" using the user's locale.
   * @param {Date} date
   * @returns {string}
   */
  function formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Return a time-based greeting string based on the hour (0–23) and an
   * optional name. When a non-empty name is provided the greeting becomes
   * personalised (e.g. "Good Morning, Annisa!").
   * 5–11  → "Good Morning[, Name!]"
   * 12–17 → "Good Afternoon[, Name!]"
   * 0–4, 18–23 → "Good Evening[, Name!]"
   * @param {number} hour
   * @param {string} [name]
   * @returns {string}
   */
  function getGreeting(hour, name) {
    var base;
    if (hour >= 5 && hour <= 11) {
      base = 'Good Morning';
    } else if (hour >= 12 && hour <= 17) {
      base = 'Good Afternoon';
    } else {
      base = 'Good Evening';
    }
    var trimmedName = (name && typeof name === 'string') ? name.trim() : '';
    if (trimmedName) {
      return base + ', ' + trimmedName + '!';
    }
    return base;
  }

  /**
   * Format a number of seconds as MM:SS (zero-padded) for values in [0..1500].
   * @param {number} seconds
   * @returns {string}
   */
  function formatTimer(seconds) {
    var mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    var ss = String(seconds % 60).padStart(2, '0');
    return mm + ':' + ss;
  }

  /**
   * Ensure a URL has a protocol prefix. If neither "http://" nor "https://"
   * is present, prepend "https://".
   * @param {string} url
   * @returns {string}
   */
  function normalizeUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return 'https://' + url;
  }

  /**
   * Generate a unique ID using the current timestamp and a random suffix.
   * @returns {string}
   */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // ─────────────────────────────────────────────
  // Greeting Module
  // ─────────────────────────────────────────────

  /**
   * Read the current time and update all greeting DOM elements.
   * Passes the current username to getGreeting so the display stays in sync.
   * Called immediately on load and then once per second via setInterval.
   */
  function updateClock() {
    var date = new Date();
    var usernameInput = document.getElementById('username-input');
    var currentName = usernameInput ? usernameInput.value : '';
    document.getElementById('greeting-text').textContent = getGreeting(date.getHours(), currentName);
    document.getElementById('clock-display').textContent = formatTime(date);
    document.getElementById('date-display').textContent = formatDate(date);
  }

  /**
   * Initialise the greeting widget: render immediately then refresh every second.
   */
  function initGreeting() {
    updateClock();
    setInterval(updateClock, 1000);
  }

  // ─────────────────────────────────────────────
  // Theme Module  (Feature A — Req 11)
  // ─────────────────────────────────────────────

  /**
   * Apply the saved theme from localStorage on page load.
   * Defaults to dark if no preference is stored.
   */
  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    var btn = document.getElementById('btn-theme-toggle');
    if (saved === 'light') {
      document.body.dataset.theme = 'light';
      if (btn) btn.textContent = '☀️';
    } else {
      delete document.body.dataset.theme;
      if (btn) btn.textContent = '🌙';
    }
  }

  /**
   * Toggle between dark and light themes, persist the choice, update the icon.
   */
  function toggleTheme() {
    var btn = document.getElementById('btn-theme-toggle');
    if (document.body.dataset.theme === 'light') {
      delete document.body.dataset.theme;
      localStorage.setItem(THEME_KEY, 'dark');
      if (btn) btn.textContent = '🌙';
    } else {
      document.body.dataset.theme = 'light';
      localStorage.setItem(THEME_KEY, 'light');
      if (btn) btn.textContent = '☀️';
    }
  }

  // ─────────────────────────────────────────────
  // Username Module  (Feature B — Req 12)
  // ─────────────────────────────────────────────

  /**
   * Load the stored username and populate the input field and greeting.
   */
  function initUsername() {
    var stored = localStorage.getItem(USERNAME_KEY) || '';
    var input = document.getElementById('username-input');
    if (input) input.value = stored;
    // updateClock reads from the input, so just call it to refresh the greeting
    updateClock();
  }

  /**
   * Read the username input, trim it, persist or clear, and update the greeting.
   */
  function setUsername() {
    var input = document.getElementById('username-input');
    if (!input) return;
    var name = input.value.trim();
    if (name) {
      localStorage.setItem(USERNAME_KEY, name);
    } else {
      localStorage.removeItem(USERNAME_KEY);
    }
    // Sync the input to the trimmed value so updateClock reads it correctly
    input.value = name;
    updateClock();
  }

  // ─────────────────────────────────────────────
  // Timer Module
  // ─────────────────────────────────────────────

  /**
   * Set button enabled/disabled states for the given timer phase.
   * @param {'stopped'|'running'|'paused'|'completed'} phase
   */
  function setTimerButtonStates(phase) {
    var btnStart = document.getElementById('btn-start');
    var btnPause = document.getElementById('btn-pause');
    if (phase === 'running') {
      btnStart.disabled = true;
      btnPause.disabled = false;
    } else {
      // stopped, paused, completed
      btnStart.disabled = false;
      btnPause.disabled = true;
    }
  }

  /**
   * Initialise the timer widget: reset state to 25:00 and disable pause button.
   * Called once on DOMContentLoaded.
   */
  function initTimer() {
    timerSeconds = INITIAL_SECONDS;
    timerRunning = false;
    timerInterval = null;
    document.getElementById('timer-display').textContent = formatTimer(timerSeconds);
    document.getElementById('timer-display').classList.remove('timer-complete');
    setTimerButtonStates('stopped');
  }

  /**
   * Start the countdown. No-op if the timer is already running.
   * Sets timerRunning = true, kicks off setInterval(tick, 1000), updates buttons.
   */
  function startTimer() {
    if (timerRunning) return; // Req 2.3 — idempotent when already running
    timerRunning = true;
    timerInterval = setInterval(tick, 1000);
    setTimerButtonStates('running');
  }

  /**
   * Pause the countdown. Clears the interval, preserves timerSeconds.
   */
  function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    setTimerButtonStates('paused');
  }

  /**
   * Reset the timer to 25:00, stopping any active countdown.
   */
  function resetTimer() {
    clearInterval(timerInterval); // always clear to prevent multiple intervals
    timerInterval = null;
    timerSeconds = INITIAL_SECONDS;
    timerRunning = false;
    document.getElementById('timer-display').textContent = formatTimer(timerSeconds);
    document.getElementById('timer-display').classList.remove('timer-complete');
    setTimerButtonStates('stopped');
  }

  /**
   * Called every second by setInterval. Decrements timerSeconds, updates display.
   * When countdown reaches 0: stops, shows completion indicator, disables pause.
   */
  function tick() {
    if (timerSeconds <= 0) return; // guard against race conditions
    timerSeconds -= 1;
    var display = document.getElementById('timer-display');
    display.textContent = formatTimer(timerSeconds);
    if (timerSeconds === 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerRunning = false;
      display.classList.add('timer-complete'); // Req 2.8 — completion indicator
      setTimerButtonStates('completed');       // Req 2.9 — disable pause at 00:00
    }
  }

  // ─────────────────────────────────────────────
  // Todo Module
  // ─────────────────────────────────────────────

  /**
   * Load tasks from localStorage into the in-memory `tasks[]` array
   * and render them. Silently falls back to an empty array on any
   * parse/access error (Req 8.5 — no entry → empty list).
   */
  function loadTasks() {
    try {
      var stored = localStorage.getItem(TASKS_KEY);
      tasks = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(tasks)) tasks = [];
    } catch (e) {
      tasks = [];
    }
    renderTasks();
  }

  /**
   * Persist the current `tasks[]` array to localStorage as JSON.
   * Failure is silent — in-memory state remains authoritative (Req 5.5).
   */
  function saveTasks() {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch (e) {
      // Silent failure: in-memory state is still correct (Req 5.5)
    }
  }

  /**
   * Return a new sorted copy of the given task array based on currentSort.
   * Does NOT mutate the original array (Req 13.6).
   * @param {Array} taskArray
   * @returns {Array}
   */
  function sortTasks(taskArray) {
    var copy = taskArray.slice(); // shallow copy — never mutate original
    if (currentSort === 'az') {
      copy.sort(function (a, b) {
        return a.text.toLowerCase().localeCompare(b.text.toLowerCase());
      });
    } else if (currentSort === 'za') {
      copy.sort(function (a, b) {
        return b.text.toLowerCase().localeCompare(a.text.toLowerCase());
      });
    } else if (currentSort === 'done-last') {
      // Stable partition: incomplete first, complete last.
      // Array.prototype.sort is stable in all modern engines (ES2019+).
      copy.sort(function (a, b) {
        if (a.done === b.done) return 0;
        return a.done ? 1 : -1; // false (incomplete) before true (complete)
      });
    }
    // 'default' — already a copy of original order, nothing more to do
    return copy;
  }

  /**
   * Initialise the sort control from localStorage.
   * Sets currentSort and syncs the #sort-select value.
   */
  function initSort() {
    var saved = localStorage.getItem(SORT_KEY);
    var validModes = ['default', 'az', 'za', 'done-last'];
    currentSort = (saved && validModes.indexOf(saved) !== -1) ? saved : 'default';
    var select = document.getElementById('sort-select');
    if (select) select.value = currentSort;
  }

  /**
   * Read the text input, validate it, then append a new task, persist,
   * re-render, and clear the input (Req 3.2). Shows a validation message
   * for empty/whitespace-only input without creating a task (Req 3.3).
   */
  function addTask() {
    var input = document.getElementById('todo-input');
    var validationMsg = document.getElementById('todo-validation');
    var text = input.value.trim();

    if (!text) {
      // Show validation message (Req 3.3)
      if (validationMsg) {
        validationMsg.textContent = 'Please enter a task.';
        validationMsg.style.display = 'block';
      }
      return;
    }

    // Hide any previous validation message
    if (validationMsg) {
      validationMsg.textContent = '';
      validationMsg.style.display = 'none';
    }

    tasks.push({ id: generateId(), text: text, done: false });
    saveTasks();
    renderTasks();
    input.value = '';
  }

  /**
   * Clear and rebuild the `#todo-list` element from a sorted copy of `tasks[]`.
   * Each item gets a label <span>, an Edit button, a Delete button, and a
   * completion checkbox. Completed tasks receive the `.done` class for
   * strikethrough styling (Req 5.2). Sort is visual-only (Req 13.6).
   */
  function renderTasks() {
    var list = document.getElementById('todo-list');
    if (!list) return;
    list.innerHTML = '';

    var displayTasks = sortTasks(tasks); // sorted view; original tasks[] untouched

    displayTasks.forEach(function (task) {
      var li = document.createElement('li');
      li.dataset.id = task.id;

      // Label
      var label = document.createElement('span');
      label.textContent = task.text;
      label.className = 'task-label' + (task.done ? ' done' : '');

      // Completion checkbox
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.setAttribute('aria-label', 'Mark task complete');
      checkbox.addEventListener('change', function () {
        toggleTask(task.id);
      });

      // Edit button
      var editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.addEventListener('click', function () {
        editTask(task.id);
      });

      // Delete button
      var deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('aria-label', 'Delete task');
      deleteBtn.addEventListener('click', function () {
        deleteTask(task.id);
      });

      li.appendChild(checkbox);
      li.appendChild(label);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  }

  /**
   * Switch a task's label into an inline edit input pre-populated with its
   * current text. Enter confirms; Escape cancels (Req 4.1, 4.2, 4.3, 4.4).
   * @param {string} id
   */
  function editTask(id) {
    var task = tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    var list = document.getElementById('todo-list');
    var li = list ? list.querySelector('li[data-id="' + id + '"]') : null;
    if (!li) return;

    // Replace the label span with an edit input
    var label = li.querySelector('.task-label');
    if (!label) return;

    var input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 200; // Req 4.2
    input.value = task.text;
    input.className = 'task-edit-input';
    input.setAttribute('aria-label', 'Edit task text');

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        confirmEdit(id);
      } else if (e.key === 'Escape') {
        cancelEdit(id);
      }
    });

    li.replaceChild(input, label);

    // Move cursor to end (Req 4.1)
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  /**
   * Read the edit input value. If blank, cancel; otherwise update the task,
   * persist, and re-render (Req 4.3, 4.5, 4.6).
   * @param {string} id
   */
  function confirmEdit(id) {
    var list = document.getElementById('todo-list');
    var li = list ? list.querySelector('li[data-id="' + id + '"]') : null;
    var input = li ? li.querySelector('input.task-edit-input') : null;
    if (!input) return;

    var trimmed = input.value.trim();

    if (!trimmed) {
      // Blank input — discard change and restore original (Req 4.5)
      cancelEdit(id);
      return;
    }

    var task = tasks.find(function (t) { return t.id === id; });
    if (task) {
      task.text = trimmed;
    }

    saveTasks();   // Req 4.6 — persist before returning to display mode
    renderTasks();
  }

  /**
   * Abort an in-progress edit, restoring the task's original display without
   * modifying tasks[] (Req 4.4).
   * @param {string} id
   */
  function cancelEdit(id) {
    renderTasks(); // Re-render from unchanged tasks[] (Req 4.4)
    void id;
  }

  /**
   * Flip task.done true↔false, persist, and re-render (Req 5.1, 5.2, 5.4).
   * @param {string} id
   */
  function toggleTask(id) {
    var task = tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    task.done = !task.done;
    saveTasks(); // Req 5.4 — persist within 500 ms
    renderTasks();
  }

  /**
   * Remove the task with the given id from tasks[], persist, and re-render
   * (Req 5.3, 5.4).
   * @param {string} id
   */
  function deleteTask(id) {
    tasks = tasks.filter(function (t) { return t.id !== id; }); // Req 5.3
    saveTasks(); // Req 5.4
    renderTasks();
  }

  // ─────────────────────────────────────────────
  // Links Module
  // ─────────────────────────────────────────────

  /**
   * Load links from localStorage into the in-memory `links[]` array
   * and render them. Silently falls back to an empty array on any
   * parse/access error (Req 8.6 — no entry → empty list).
   */
  function loadLinks() {
    try {
      var stored = localStorage.getItem(LINKS_KEY);
      links = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(links)) links = [];
    } catch (e) {
      links = [];
    }
    renderLinks();
  }

  /**
   * Persist the current `links[]` array to localStorage as JSON.
   * Failure is silent — in-memory state remains authoritative (Req 8.2).
   */
  function saveLinks() {
    try {
      localStorage.setItem(LINKS_KEY, JSON.stringify(links));
    } catch (e) {
      // Silent failure: in-memory state is still correct (Req 8.2)
    }
  }

  /**
   * Read both link inputs, validate non-empty, normalize the URL,
   * push a new Link, persist, re-render, and clear inputs (Req 6.2).
   * Highlights invalid fields if either is empty (Req 6.3).
   */
  function addLink() {
    var nameInput = document.getElementById('link-name-input');
    var urlInput = document.getElementById('link-url-input');
    var name = nameInput.value.trim();
    var url = urlInput.value.trim();

    var nameInvalid = !name;
    var urlInvalid = !url;

    // Highlight invalid fields and bail out (Req 6.3)
    if (nameInvalid) {
      nameInput.classList.add('input-error');
    } else {
      nameInput.classList.remove('input-error');
    }

    if (urlInvalid) {
      urlInput.classList.add('input-error');
    } else {
      urlInput.classList.remove('input-error');
    }

    if (nameInvalid || urlInvalid) return;

    // Normalize URL — prefix with https:// if no protocol present (Req 6.4)
    url = normalizeUrl(url);

    links.push({ id: generateId(), name: name, url: url });
    saveLinks();
    renderLinks();

    // Clear inputs (Req 6.2)
    nameInput.value = '';
    urlInput.value = '';
    nameInput.classList.remove('input-error');
    urlInput.classList.remove('input-error');
  }

  /**
   * Clear and rebuild the `#links-list` element from the current `links[]`.
   * Each item renders as a clickable <a> opening in a new tab plus a Remove
   * button (Req 7.1, 7.2).
   */
  function renderLinks() {
    var list = document.getElementById('links-list');
    if (!list) return;
    list.innerHTML = '';

    links.forEach(function (link) {
      var li = document.createElement('li');
      li.dataset.id = link.id;

      // Clickable link (Req 7.1, 7.2)
      var anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = link.name;

      // Remove button (Req 6.5)
      var removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.setAttribute('aria-label', 'Remove link');
      removeBtn.addEventListener('click', function () {
        removeLink(link.id);
      });

      li.appendChild(anchor);
      li.appendChild(removeBtn);
      list.appendChild(li);
    });
  }

  /**
   * Remove the link with the given id from links[], persist, and re-render
   * (Req 6.5).
   * @param {string} id
   */
  function removeLink(id) {
    links = links.filter(function (l) { return l.id !== id; });
    saveLinks();
    renderLinks();
  }

  // ─────────────────────────────────────────────
  // Bootstrap
  // ─────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    // Theme — must be first to avoid flash of unstyled content
    initTheme();
    document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);

    // Username — initialise before clock so first render includes the name
    initUsername();
    document.getElementById('btn-set-username').addEventListener('click', setUsername);
    document.getElementById('username-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') setUsername();
    });

    // Todo Module — restore persisted tasks
    initSort(); // must run before loadTasks so sortTasks uses the correct mode
    loadTasks();
    document.getElementById('btn-add-todo').addEventListener('click', addTask);
    document.getElementById('todo-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addTask();
    });
    document.getElementById('sort-select').addEventListener('change', function (e) {
      currentSort = e.target.value;
      try { localStorage.setItem(SORT_KEY, currentSort); } catch (ex) { /* silent */ }
      renderTasks();
    });

    // Links Module — restore persisted links
    loadLinks();
    document.getElementById('btn-add-link').addEventListener('click', addLink);
    document.getElementById('link-url-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addLink();
    });

    // Greeting — render clock/date/greeting immediately then every second
    initGreeting();

    // Timer — set to 25:00 and wire controls
    initTimer();
    document.getElementById('btn-start').addEventListener('click', startTimer);
    document.getElementById('btn-pause').addEventListener('click', pauseTimer);
    document.getElementById('btn-reset').addEventListener('click', resetTimer);
  });

  // CommonJS export guard — allows Vitest to import pure functions for testing
  // while keeping file:// protocol compatibility (no ES module syntax)
  if (typeof module !== 'undefined') {
    module.exports = {
      formatTime, formatDate, getGreeting, formatTimer, normalizeUrl, generateId,
      initTheme, toggleTheme,
      initUsername, setUsername,
      initTimer, startTimer, pauseTimer, resetTimer, tick,
      loadTasks, saveTasks, addTask, renderTasks,
      sortTasks, initSort,
      editTask, confirmEdit, cancelEdit, toggleTask, deleteTask,
      loadLinks, saveLinks, addLink, renderLinks, removeLink,
      get tasks()       { return tasks; },
      set tasks(v)      { tasks = v; },
      get links()       { return links; },
      set links(v)      { links = v; },
      get currentSort() { return currentSort; },
      set currentSort(v){ currentSort = v; },
    };
  }
}());
