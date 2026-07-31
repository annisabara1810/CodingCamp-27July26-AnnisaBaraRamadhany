# Implementation Plan: To-Do List Life Dashboard

## Overview

Implement a static single-page productivity dashboard using plain HTML5, CSS3, and ES2020 Vanilla JavaScript — no build tools, no frameworks, no external dependencies. The app delivers four widgets (Greeting/Clock, Focus Timer, To-Do List, Quick Links) in three files (`index.html`, `css/style.css`, `js/app.js`). All user data is persisted to `localStorage`. After each feature section is built, property-based and unit tests validate correctness against the design's 19 correctness properties.

---

## Tasks

- [x] 1. Set up project structure and testing infrastructure
  - Create `index.html` at the project root with the full page shell: `<!DOCTYPE html>`, `<head>` linking `css/style.css`, `<body>` with four widget sections (`#greeting`, `#timer`, `#todo`, `#links`), and `<script defer src="js/app.js">`
  - Create `css/style.css` as an empty file (dark theme scaffold added in task 3)
  - Create `js/app.js` as an IIFE scaffold with clearly labelled section comments: Constants & State, Utility Helpers, Greeting Module, Timer Module, Todo Module, Links Module
  - Initialize `package.json` with `"type": "module"` and add `vitest` + `fast-check` as dev dependencies; create `vitest.config.js`
  - Create `tests/` directory with empty test files: `utils.test.js`, `timer.test.js`, `todo.test.js`, `links.test.js`
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2. Implement utility helper functions
  - [x] 2.1 Implement `formatTime(date)`, `formatDate(date)`, `getGreeting(hour)`, `formatTimer(seconds)`, `normalizeUrl(url)`, and `generateId()` inside `js/app.js`
    - Export each function conditionally: `if (typeof module !== 'undefined') module.exports = { ... }` so Vitest can import them
    - `formatTime` → `HH:MM:SS` (zero-padded 24-hour)
    - `formatDate` → `"Weekday, DD Month YYYY"` using `toLocaleDateString` with explicit locale options
    - `getGreeting` → `"Good Morning"` (5–11), `"Good Afternoon"` (12–17), `"Good Evening"` (0–4, 18–23)
    - `formatTimer` → `MM:SS` zero-padded for seconds in [0..1500]
    - `normalizeUrl` → prefix `"https://"` if no `http://` or `https://` present
    - `generateId` → `Date.now().toString(36) + Math.random().toString(36).slice(2)`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.10, 6.4_

  - [ ]* 2.2 Write property tests for utility helpers (`tests/utils.test.js`)
    - **Property 1: formatTime always returns HH:MM:SS** — `fc.date()` → match `/^\d{2}:\d{2}:\d{2}$/`
    - **Property 2: formatDate always returns Weekday, DD Month YYYY** — `fc.date()` → match expected structure
    - **Property 3: getGreeting is determined entirely by hour** — `fc.integer({min:0, max:23})` → correct bucket
    - **Property 4: formatTimer always returns MM:SS for [0..1500]** — `fc.integer({min:0, max:1500})` → match `/^\d{2}:\d{2}$/`
    - **Property 15: normalizeUrl always produces a protocol-prefixed URL** — filtered `fc.string()` without protocol → starts with `"https://"`
    - _Tag: `// Feature: todo-list-life-dashboard, Property N`_
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.10, 6.4_

- [x] 3. Implement Greeting / Clock widget
  - [x] 3.1 Implement `initGreeting()` and `updateClock()` in the Greeting Module section of `js/app.js`
    - `updateClock()` reads `new Date()`, calls `formatTime`, `formatDate`, `getGreeting(date.getHours())`, sets `textContent` on `#greeting-text`, `#clock-display`, `#date-display`
    - `initGreeting()` calls `updateClock()` immediately then `setInterval(updateClock, 1000)`
    - Add the three DOM elements to `index.html` inside the greeting widget section
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 3.2 Write unit tests for the Greeting module (`tests/utils.test.js`)
    - Test that `getGreeting(5)` returns `"Good Morning"`, `getGreeting(12)` returns `"Good Afternoon"`, `getGreeting(0)` returns `"Good Evening"`
    - Test boundary hours: 4→Evening, 5→Morning, 11→Morning, 12→Afternoon, 17→Afternoon, 18→Evening, 23→Evening
    - _Requirements: 1.3, 1.4, 1.5_

- [x] 4. Implement Focus Timer widget
  - [x] 4.1 Add timer DOM elements to `index.html`: `#timer-display`, `#btn-start`, `#btn-pause`, `#btn-reset`; add event listeners in `js/app.js`
    - Implement `initTimer()`: set `timerSeconds = 1500`, render `"25:00"`, disable `#btn-pause`
    - Implement `startTimer()`: no-op if `timerRunning`; set `timerRunning = true`; start `setInterval(tick, 1000)`; enable/disable buttons
    - Implement `pauseTimer()`: clear interval; set `timerRunning = false`; preserve `timerSeconds`
    - Implement `resetTimer()`: clear interval; `timerSeconds = 1500`; `timerRunning = false`; render `"25:00"`; disable pause
    - Implement `tick()`: decrement `timerSeconds`; render via `formatTimer`; if 0: clear interval, show completion indicator (`#timer-display` text or an alert class), disable pause button
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [ ]* 4.2 Write property tests for timer logic (`tests/timer.test.js`)
    - **Property 5: startTimer is idempotent when already running** — set `timerRunning = true`, `timerSeconds = N`; call `startTimer()`; assert `timerSeconds === N` and no new interval
    - **Property 6: pauseTimer preserves remaining time** — `fc.integer({min:1, max:1500})` → set running state, pause, assert `timerSeconds` unchanged and `timerRunning === false`
    - **Property 7: resetTimer always returns to initial state** — `fc.record(...)` any timer state → reset → `timerSeconds === 1500`, `timerRunning === false`
    - _Requirements: 2.3, 2.4, 2.5, 2.7_

  - [ ]* 4.3 Write unit tests for timer edge cases (`tests/timer.test.js`)
    - Timer initializes to `"25:00"` with pause button disabled (Req 2.1, 2.6)
    - Timer completion at `"00:00"` shows completion indicator and disables pause (Req 2.8, 2.9)
    - `tick()` is a no-op when `timerSeconds` is already 0 (guards against interval race)
    - `resetTimer()` clears any active interval before resetting (no multiple intervals)
    - _Requirements: 2.1, 2.6, 2.8, 2.9_

- [x] 5. Checkpoint — Ensure all tests pass
  - Run `npx vitest --run` and confirm all utility and timer tests pass. Ask the user if any questions arise before continuing.

- [x] 6. Implement To-Do List widget — add, persist, and render tasks
  - [x] 6.1 Add todo DOM elements to `index.html`: `#todo-input` (`maxlength="500"`), `#btn-add-todo`, `#todo-list`; wire event listeners in `js/app.js`
    - Implement `loadTasks()`: `localStorage.getItem(TASKS_KEY)` → `JSON.parse` in try/catch → populate `tasks[]` → call `renderTasks()`
    - Implement `saveTasks()`: `localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))` in try/catch (silent failure)
    - Implement `addTask()`: trim `#todo-input` value; if blank show validation message and return; push `{id: generateId(), text, done: false}`; `saveTasks()`; `renderTasks()`; clear input
    - Implement `renderTasks()`: clear `#todo-list`; for each task create `<li>` with label, edit button, delete button, completion checkbox; apply strikethrough class when `done === true`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.2, 5.4, 5.5, 8.1, 8.3, 8.5_

  - [ ]* 6.2 Write property tests for task add and persistence (`tests/todo.test.js`)
    - **Property 8: Adding a valid task grows the list by exactly one** — `fc.string().filter(s => s.trim().length > 0)` → call `addTask()` → `tasks.length === original + 1`, `tasks.last.text === input.trim()`
    - **Property 9: Blank input never creates a task** — whitespace-only strings → `tasks.length` unchanged
    - **Property 10: Task persistence round-trip** — `fc.array(taskArbitrary)` → `saveTasks()` → `loadTasks()` → deep equal
    - _Requirements: 3.2, 3.3, 3.5, 8.1, 8.3_

- [x] 7. Implement To-Do List widget — edit, complete, and delete tasks
  - [x] 7.1 Implement `editTask(id)`, `confirmEdit(id)`, `cancelEdit(id)`, `toggleTask(id)`, `deleteTask(id)` in `js/app.js`
    - `editTask(id)`: replace task label with `<input maxlength="200">` pre-populated with `task.text`; bind Enter → `confirmEdit(id)`, Escape → `cancelEdit(id)`
    - `confirmEdit(id)`: trim input; if blank call `cancelEdit(id)` and return; update `task.text`; `saveTasks()`; `renderTasks()`
    - `cancelEdit(id)`: call `renderTasks()` without modifying `tasks[]`
    - `toggleTask(id)`: flip `task.done`; `saveTasks()`; `renderTasks()`
    - `deleteTask(id)`: filter task out of `tasks[]`; `saveTasks()`; `renderTasks()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 7.2 Write property tests for task edit, toggle, and delete (`tests/todo.test.js`)
    - **Property 11: cancelEdit restores original text** — `fc.string({minLength:1})` → edit then cancel → `task.text === original`
    - **Property 12: Blank edit confirmation discards the change** — `fc.string().filter(s => s.trim() === '')` → confirmEdit with blank → `task.text` unchanged
    - **Property 13: toggleTask is an involution** — `fc.boolean()` → toggle twice → `done` returns to original
    - **Property 14: deleteTask removes exactly the targeted task** — `fc.array(taskArbitrary, {minLength:1})` → delete tasks[i] → length−1, target absent, others preserved in order
    - _Requirements: 4.4, 4.5, 5.1, 5.3_

  - [ ]* 7.3 Write unit tests for todo edge cases (`tests/todo.test.js`)
    - Edit mode: `<input>` element is present in DOM and pre-populated (Req 4.1)
    - `maxlength="200"` attribute on edit input (Req 4.2)
    - Confirming valid edit returns to display mode and updates localStorage (Req 4.3, 4.6)
    - Completed task has strikethrough CSS class (Req 5.2)
    - `localStorage.setItem` throws → in-memory state still updated correctly (Req 5.5)
    - localStorage absent on load → `tasks` initializes to `[]` (Req 8.5)
    - Corrupted localStorage value → graceful fallback to `[]`
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 5.2, 5.5, 8.5_

- [x] 8. Implement Quick Links widget
  - [x] 8.1 Add links DOM elements to `index.html`: `#link-name-input` (`maxlength="100"`), `#link-url-input` (`maxlength="2048"`), `#btn-add-link`, `#links-list`; wire event listeners
    - Implement `loadLinks()`: `localStorage.getItem(LINKS_KEY)` → `JSON.parse` in try/catch → populate `links[]` → call `renderLinks()`
    - Implement `saveLinks()`: `localStorage.setItem(LINKS_KEY, JSON.stringify(links))` in try/catch (silent failure)
    - Implement `addLink()`: validate both name and URL non-empty (highlight invalid fields); call `normalizeUrl(url)`; push `{id: generateId(), name, url}`; `saveLinks()`; `renderLinks()`; clear inputs
    - Implement `renderLinks()`: clear `#links-list`; for each link create `<a href=url target="_blank">name</a>` plus a remove button
    - Implement `removeLink(id)`: filter link out of `links[]`; `saveLinks()`; `renderLinks()`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 8.2, 8.4, 8.6_

  - [ ]* 8.2 Write property tests for links add, persist, and remove (`tests/links.test.js`)
    - **Property 15: normalizeUrl always produces a protocol-prefixed URL** — strings without protocol → starts with `"https://"`
    - **Property 16: Adding a valid link grows the list by exactly one** — non-empty name + URL → `links.length === original + 1`
    - **Property 17: Blank name or URL never creates a link** — empty/whitespace for either field → `links.length` unchanged
    - **Property 18: Link persistence round-trip** — `fc.array(linkArbitrary)` → `saveLinks()` → `loadLinks()` → deep equal
    - **Property 19: removeLink removes exactly the targeted link** — `fc.array(linkArbitrary, {minLength:1})` → remove links[i] → length−1, target absent, others preserved
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 8.2, 8.4_

  - [ ]* 8.3 Write unit tests for links edge cases (`tests/links.test.js`)
    - Link click opens URL in a new tab (`target="_blank"`) (Req 7.1)
    - Each link renders its display name as visible text (Req 7.2)
    - `maxlength` attributes are correct: name=100, URL=2048 (Req 6.1)
    - Submitting with empty name highlights name field; submitting with empty URL highlights URL field (Req 6.3)
    - localStorage absent on load → `links` initializes to `[]` (Req 8.6)
    - _Requirements: 6.1, 6.3, 7.1, 7.2, 8.6_

- [x] 9. Checkpoint — Ensure all tests pass
  - Run `npx vitest --run` and confirm all 19 property tests and all unit tests pass. Ask the user if any questions arise before continuing.

- [x] 10. Implement dark-theme CSS layout
  - [x] 10.1 Write `css/style.css` with a dark color scheme, four-widget responsive grid layout, and accessibility-friendly typography
    - Dark background (`#121212` or similar), light text, accent color for interactive elements
    - CSS Grid or Flexbox layout: two-column grid on desktop (≥768 px), single-column stack on mobile
    - Consistent font sizing (`1rem` base, `1.5rem` headings) and `1.5` line-height
    - Style widget cards with border-radius and subtle box-shadow for visual separation
    - Timer display uses a larger monospace font; strikethrough class `.done` for completed tasks
    - Focus/hover states for all interactive controls (buttons, inputs, links)
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 10.2 Verify responsive layout manually against Req 9.3
    - Resize browser viewport below 768 px and confirm all four widgets stack without horizontal scroll
    - _Requirements: 9.3_

- [x] 11. Wire DOMContentLoaded and validate full integration
  - [x] 11.1 Add the `DOMContentLoaded` handler to `js/app.js` that calls `loadTasks()`, `loadLinks()`, `initGreeting()`, `initTimer()` in order
    - Confirm all four widgets initialize correctly on a fresh page load (no prior localStorage)
    - Confirm data restored correctly when localStorage contains previously saved tasks and links
    - _Requirements: 1.7, 2.1, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 11.2 Write integration smoke tests (`tests/utils.test.js` or a new `tests/integration.test.js`)
    - Simulate `DOMContentLoaded` with a mock DOM: all four widget sections present
    - Add a task → save → reload state → task appears in rendered list (Req 3.5, 8.1, 8.3)
    - Add a link → save → reload state → link appears in rendered list (Req 6.6, 8.2, 8.4)
    - localStorage absent scenario → widgets render with empty lists (Req 8.5, 8.6)
    - _Requirements: 3.5, 6.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 12. Final checkpoint — Verify all requirements
  - Run `npx vitest --run` and confirm the full test suite passes with zero failures.
  - Open `index.html` directly via `file://` protocol in Chrome and Firefox and confirm: clock ticks, timer counts down, tasks persist after refresh, links open in new tabs (Req 10.5).
  - Ask the user if any questions arise.

- [x] 13. Implement Light / Dark Theme Toggle
  - [x] 13.1 Add theme toggle button to `index.html` inside `#greeting` section
    - Add `<button id="btn-theme-toggle" aria-label="Toggle theme">🌙</button>` inside the greeting widget
    - _Requirements: 11.1_

  - [x] 13.2 Implement theme functions in `js/app.js`
    - Add storage key `THEME_KEY = 'dashboard_theme'`
    - Implement `initTheme()`: read `THEME_KEY` from localStorage; if `'light'`, set `document.body.dataset.theme = 'light'` and button icon `☀️`; otherwise apply dark (no attribute) with icon `🌙`
    - Implement `toggleTheme()`: flip between light/dark on `document.body.dataset.theme`; save new value to `THEME_KEY`; update button icon
    - Wire `#btn-theme-toggle` click listener in `DOMContentLoaded`; call `initTheme()` first in init sequence
    - Export `initTheme`, `toggleTheme` in `module.exports`
    - _Requirements: 11.2, 11.3, 11.4, 11.5_

  - [x] 13.3 Add light theme CSS to `css/style.css`
    - Add `body[data-theme="light"]` block overriding custom properties: `--bg-page: #f5f5f5`, `--bg-widget: #ffffff`, `--bg-input: #f0f0f0`, `--border-color: #d0d0d0`, `--text-primary: #1a1a1a`, `--text-secondary: #555555`; keep `--accent` and `--danger` unchanged
    - Style `#btn-theme-toggle`: position top-right of greeting widget, transparent background, no border, font-size 1.2rem, cursor pointer
    - _Requirements: 11.6_

  - [ ]* 13.4 Write property tests for theme toggle (`tests/utils.test.js`)
    - **Property 20: toggleTheme is an involution** — toggle twice → body.dataset.theme unchanged
    - **Property 21: theme persistence round-trip** — set theme, simulate reload via initTheme → same theme applied
    - _Requirements: 11.2, 11.3, 11.4, 11.5_

- [x] 14. Implement Custom Name in Greeting
  - [x] 14.1 Add username input and button to `index.html` inside `#greeting` section
    - Add `<input id="username-input" type="text" maxlength="50" placeholder="Your name…" />` and `<button id="btn-set-username">Set</button>` below `#greeting-text`
    - _Requirements: 12.1, 12.5_

  - [x] 14.2 Implement username functions in `js/app.js`
    - Add storage key `USERNAME_KEY = 'dashboard_username'`
    - Implement `initUsername()`: read `USERNAME_KEY` from localStorage; populate `#username-input` with stored name; call `updateClock()` to refresh greeting display
    - Implement `setUsername()`: read and trim `#username-input`; if non-empty save to `USERNAME_KEY`; if empty remove key from localStorage; call `updateClock()`
    - Update `getGreeting(hour, name)` to accept optional second parameter: if `name` is a non-empty string return e.g. `"Good Morning, Annisa!"`; otherwise return plain greeting
    - Update `updateClock()` to read current username from `#username-input` and pass to `getGreeting`
    - Wire `#btn-set-username` click listener and Enter keydown on `#username-input` in `DOMContentLoaded`; call `initUsername()` in init sequence
    - Export `initUsername`, `setUsername` in `module.exports`
    - _Requirements: 12.2, 12.3, 12.4, 12.6_

  - [ ]* 14.3 Write property tests for greeting with name (`tests/utils.test.js`)
    - **Property 22: getGreeting with name includes name and ends with "!"** — `fc.integer({min:0,max:23})` × `fc.string({minLength:1})` → result contains name, ends `"!"`
    - **Property 23: getGreeting without name has no punctuation suffix** — `fc.integer({min:0,max:23})` → result exactly `"Good Morning"` / `"Good Afternoon"` / `"Good Evening"`
    - _Requirements: 12.2, 12.4_

- [x] 15. Implement Task Sort Control
  - [x] 15.1 Add sort select to `index.html` inside `#todo` section
    - Add `<select id="sort-select"><option value="default">Default</option><option value="az">A→Z</option><option value="za">Z→A</option><option value="done-last">Done last</option></select>` above `#todo-list`
    - _Requirements: 13.1_

  - [x] 15.2 Implement sort functions in `js/app.js`
    - Add storage key `SORT_KEY = 'dashboard_sort'`
    - Add state variable `let currentSort = 'default'`
    - Implement `initSort()`: read `SORT_KEY` from localStorage; set `currentSort`; set `#sort-select` value; call `renderTasks()`
    - Implement `sortTasks(taskArray)`: return a new sorted copy of `taskArray` based on `currentSort` without mutating the original
      - `'az'`: `[...arr].sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()))`
      - `'za'`: reverse of `'az'`
      - `'done-last'`: incomplete (`done === false`) first, complete (`done === true`) last, preserving relative order within each group (stable sort)
      - `'default'`: return `[...arr]` (copy of original order)
    - Update `renderTasks()` to call `sortTasks(tasks)` and iterate over the sorted copy
    - Wire `#sort-select` change listener in `DOMContentLoaded`: update `currentSort`, save to `SORT_KEY`, call `renderTasks()`; call `initSort()` in init sequence
    - Export `initSort`, `sortTasks` in `module.exports`
    - _Requirements: 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [ ]* 15.3 Write property tests for task sorting (`tests/todo.test.js`)
    - **Property 24: sortTasks never mutates the original array** — any array, any mode → original unchanged
    - **Property 25: sortTasks 'az' produces ascending order** — pairwise `<=` comparison on lowercased text
    - **Property 26: sortTasks 'done-last' groups incomplete before complete** — no incomplete after complete
    - _Requirements: 13.3, 13.5, 13.6_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All 19 design correctness properties are covered by property-based test sub-tasks
- Each task references specific requirements for full traceability
- Checkpoints at tasks 5, 9, and 12 ensure incremental validation at key milestones
- The `if (typeof module !== 'undefined')` CommonJS guard in `app.js` keeps `file://` compatibility while enabling Vitest imports
- Property tests use `fast-check` with a minimum of 100 iterations per property

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["6.2", "7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3", "8.1"] },
    { "id": 8, "tasks": ["8.2", "8.3", "10.1"] },
    { "id": 9, "tasks": ["10.2", "11.1"] },
    { "id": 10, "tasks": ["11.2"] },
    { "id": 11, "tasks": ["13.1", "13.2", "13.3", "14.1", "14.2", "15.1", "15.2"] },
    { "id": 12, "tasks": ["13.4", "14.3", "15.3"] }
  ]
}
```
