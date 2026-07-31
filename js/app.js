(function () {
  'use strict';

  // ─────────────────────────────────────────────
  // Constants & State
  // ─────────────────────────────────────────────

  const TASKS_KEY = 'dashboard_tasks';
  const LINKS_KEY = 'dashboard_links';

  const INITIAL_SECONDS = 25 * 60; // 1500

  let tasks = [];        // Array<{ id: string, text: string, done: boolean }>
  let links = [];        // Array<{ id: string, name: string, url: string }>
  let timerSeconds = INITIAL_SECONDS;
  let timerRunning = false;
  let timerInterval = null;

  // ─────────────────────────────────────────────
  // Utility Helpers
  // ─────────────────────────────────────────────

  /**
   * Format a Date object as HH:MM:SS (zero-padded 24-hour).
   * @param {Date} date
   * @returns {string}
   */
  function formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
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
   * Return a time-based greeting string based on the hour (0–23).
   * 5–11  → "Good Morning"
   * 12–17 → "Good Afternoon"
   * 0–4, 18–23 → "Good Evening"
   * @param {number} hour
   * @returns {string}
   */
  function getGreeting(hour) {
    if (hour >= 5 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  /**
   * Format a number of seconds as MM:SS (zero-padded) for values in [0..1500].
   * @param {number} seconds
   * @returns {string}
   */
  function formatTimer(seconds) {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
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
   * Called immediately on load and then once per second via setInterval.
   */
  function updateClock() {
    const date = new Date();
    document.getElementById('greeting-text').textContent = getGreeting(date.getHours());
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
  // Timer Module
  // ─────────────────────────────────────────────

  /**
   * Set button enabled/disabled states for the given timer phase.
   * @param {'stopped'|'running'|'paused'|'completed'} phase
   */
  function setTimerButtonStates(phase) {
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
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
    const display = document.getElementById('timer-display');
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
   * Clear and rebuild the `#todo-list` element from the current `tasks[]`.
   * Each item gets a label <span>, an Edit button, a Delete button, and a
   * completion checkbox. Completed tasks receive the `.done` class for
   * strikethrough styling (Req 5.2).
   */
  function renderTasks() {
    var list = document.getElementById('todo-list');
    if (!list) return;
    list.innerHTML = '';

    tasks.forEach(function (task) {
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
    // Initialise in spec-prescribed order: loadTasks → loadLinks → initGreeting → initTimer
    // (Req 1.7, 2.1, 8.3, 8.4, 8.5, 8.6)

    // Todo Module — restore persisted tasks before anything else
    loadTasks();
    document.getElementById('btn-add-todo').addEventListener('click', addTask);
    document.getElementById('todo-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addTask();
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
      initTimer, startTimer, pauseTimer, resetTimer, tick,
      loadTasks, saveTasks, addTask, renderTasks,
      editTask, confirmEdit, cancelEdit, toggleTask, deleteTask,
      loadLinks, saveLinks, addLink, renderLinks, removeLink,
      get tasks() { return tasks; },
      set tasks(v) { tasks = v; },
      get links() { return links; },
      set links(v) { links = v; },
    };
  }
}());
