# Design Document

## To-Do List Life Dashboard

---

## Overview

The To-Do List Life Dashboard is a static single-page application (SPA) that runs entirely in the browser with no server, no build step, and no external dependencies. It is delivered as three files:

- `index.html` — the single page shell
- `css/style.css` — all visual styling
- `js/app.js` — all application logic

The application provides four widgets on one screen: a live Greeting/Clock, a Pomodoro-style Focus Timer, a persistent To-Do List, and a Quick Links panel. All user data is stored in `localStorage` as JSON so that the app works offline, survives page refreshes, and runs correctly when opened via `file://` protocol.

No frameworks, bundlers, or transpilers are used. The entire app is plain HTML5, CSS3, and ES2020 Vanilla JavaScript.

---

## Architecture

The app follows a **module-within-a-script** pattern: `app.js` is one IIFE-style file divided into clearly named logical sections. Each section owns its own DOM interaction, state, and `localStorage` key. Sections communicate only through shared state variables defined at the top of the file; there is no event bus or global pub/sub system.

```
Browser
└── index.html
    ├── <link> css/style.css
    └── <script defer> js/app.js
        ├── Constants & State         (INITIAL_SECONDS, storage keys, in-memory arrays,
        │                              currentSort)
        ├── Utility Helpers           (formatTime, formatDate, getGreeting, normalizeUrl)
        ├── Greeting Module           (updateClock — called by setInterval every 1 s,
        │                              initTheme, toggleTheme, initUsername, setUsername)
        ├── Timer Module              (startTimer, pauseTimer, resetTimer, tick)
        ├── Todo Module               (addTask, editTask, confirmEdit, cancelEdit,
        │                              toggleTask, deleteTask, saveTasks, loadTasks,
        │                              sortTasks, initSort, renderTasks)
        └── Links Module              (addLink, removeLink, saveLinks, loadLinks)
```

All DOM queries use `getElementById` / `querySelector` targeting IDs defined in `index.html`. No dynamic imports, no `<module>` type script tags — this keeps `file://` compatibility intact.

**Data flow for every mutation:**

```
User Action → Event Listener → Module Function → Mutate In-Memory State
                                                → Re-render Affected DOM
                                                → Persist to localStorage (JSON.stringify)
```

**Data flow on page load:**

```
DOMContentLoaded → initTheme()    → localStorage.getItem('dashboard_theme') → apply data-theme + icon
                → initUsername()  → localStorage.getItem('dashboard_username') → populate input + greeting
                → initSort()      → localStorage.getItem('dashboard_sort') → set sort-select value
                → loadTasks()     → localStorage.getItem → JSON.parse → renderAllTasks()
                → loadLinks()     → localStorage.getItem → JSON.parse → renderAllLinks()
                → initGreeting()  → updateClock() + setInterval(updateClock, 1000)
                → initTimer()     → render 25:00, disable pause button
```

---

## Components and Interfaces

### 1. Constants & Shared State

```js
// Storage keys
const TASKS_KEY    = 'dashboard_tasks';
const LINKS_KEY    = 'dashboard_links';
const THEME_KEY    = 'dashboard_theme';
const USERNAME_KEY = 'dashboard_username';
const SORT_KEY     = 'dashboard_sort';

// Timer constant
const INITIAL_SECONDS = 25 * 60; // 1500

// In-memory state
let tasks        = [];       // Array<{ id: string, text: string, done: boolean }>
let links        = [];       // Array<{ id: string, name: string, url: string }>
let timerSeconds = INITIAL_SECONDS;
let timerRunning = false;
let timerInterval = null;
let currentSort  = 'default'; // 'default' | 'az' | 'za' | 'done-last'
```

### 2. Utility Helpers

Pure functions with no side effects. These are the primary targets for property-based testing.

| Function | Signature | Description |
|---|---|---|
| `formatTime(date)` | `Date → string` | Returns `"HH:MM:SS"` from a Date object |
| `formatDate(date)` | `Date → string` | Returns `"Weekday, DD Month YYYY"` |
| `getGreeting(hour, name)` | `(number(0-23), string?) → string` | Returns `"Good Morning, Name!"` if name set, or `"Good Morning"` etc. without |
| `formatTimer(seconds)` | `number(0-1500) → string` | Returns `"MM:SS"` zero-padded |
| `normalizeUrl(url)` | `string → string` | Prefixes bare URLs with `"https://"` if no protocol present |
| `generateId()` | `() → string` | Returns a unique ID using `Date.now()` + random suffix |

### 3. Greeting Module

**DOM elements:** `#greeting-text`, `#clock-display`, `#date-display`, `#btn-theme-toggle`, `#username-input`, `#btn-set-username`

**`updateClock()`** — reads `new Date()`, calls `formatTime`, `formatDate`, `getGreeting(hour, currentUsername)`, then sets `textContent` on each element. Called immediately on load and then every 1000 ms via `setInterval`.

**`initTheme()`** — reads `dashboard_theme` from localStorage. Applies `data-theme="light"` to `<body>` if stored value is `'light'`; otherwise leaves `<body>` without the attribute (dark default). Sets toggle button icon (☀️ for light, 🌙 for dark).

**`toggleTheme()`** — reads the current `data-theme` attribute on `<body>`. If `'light'`, removes it (dark). Otherwise sets `data-theme="light"`. Persists new value to `dashboard_theme`. Updates toggle button icon.

**`initUsername()`** — reads `dashboard_username` from localStorage. If found, populates `#username-input` with the stored name and calls `updateClock()` to reflect the name in the greeting.

**`setUsername()`** — reads `#username-input`, trims whitespace. If non-empty, saves to `dashboard_username` and updates greeting. If empty, removes `dashboard_username` from localStorage and reverts to unnamed greeting.

### 4. Timer Module

**DOM elements:** `#timer-display`, `#btn-start`, `#btn-pause`, `#btn-reset`

**State machine:**

```
         reset()
    ┌──────────────────────────────┐
    ▼                              │
 STOPPED ──start()──► RUNNING ──pause()──► PAUSED
                         │                   │
                         │    start()         │
                         └───────────────────►│
                         │                   │
                      tick reaches 0
                         │
                         ▼
                     COMPLETED
```

| Function | Description |
|---|---|
| `initTimer()` | Sets `timerSeconds = INITIAL_SECONDS`, renders `"25:00"`, disables pause button |
| `startTimer()` | No-op if already running. Sets `timerRunning = true`, starts `setInterval(tick, 1000)`, updates button states |
| `pauseTimer()` | Clears interval, sets `timerRunning = false`, preserves `timerSeconds` |
| `resetTimer()` | Clears interval, resets `timerSeconds = INITIAL_SECONDS`, sets `timerRunning = false`, renders `"25:00"`, disables pause |
| `tick()` | Decrements `timerSeconds`. If reaches 0: clears interval, renders `"00:00"`, shows completion indication, disables pause |

### 5. Todo Module

**DOM elements:** `#todo-input`, `#btn-add-todo`, `#todo-list`, `#sort-select`

**Task object:**
```js
{ id: string, text: string, done: boolean }
```

| Function | Description |
|---|---|
| `loadTasks()` | Reads `TASKS_KEY` from localStorage, parses JSON, populates `tasks[]`, renders all |
| `saveTasks()` | JSON-stringifies `tasks[]`, writes to `localStorage.setItem(TASKS_KEY, ...)`. Wrapped in try/catch — failure is silent (in-memory state is authoritative) |
| `addTask()` | Reads `#todo-input`, trims value. If blank: shows validation message, returns. Otherwise: pushes new Task, calls `saveTasks()`, renders, clears input |
| `sortTasks(taskArray)` | Returns a **new** sorted array based on `currentSort`. Does NOT mutate the original array. `'az'` → case-insensitive alpha ascending; `'za'` → descending; `'done-last'` → incomplete first then complete; `'default'` → original order |
| `renderTasks()` | Calls `sortTasks(tasks)` to get the display array. Clears `#todo-list`, creates a `<li>` for each task with edit/delete/toggle controls |
| `initSort()` | Reads `SORT_KEY` from localStorage, sets `currentSort` and `#sort-select` value |
| `editTask(id)` | Puts task into edit mode: replaces label with `<input maxlength="200">` pre-populated with current text |
| `confirmEdit(id)` | Trims input value. If blank: calls `cancelEdit(id)`. Otherwise: updates `task.text`, calls `saveTasks()`, re-renders |
| `cancelEdit(id)` | Re-renders the task without modifying `tasks[]` |
| `toggleTask(id)` | Flips `task.done`, calls `saveTasks()`, re-renders |
| `deleteTask(id)` | Filters `task` out of `tasks[]`, calls `saveTasks()`, re-renders |

### 6. Links Module

**DOM elements:** `#link-name-input`, `#link-url-input`, `#btn-add-link`, `#links-list`

**Link object:**
```js
{ id: string, name: string, url: string }
```

| Function | Description |
|---|---|
| `loadLinks()` | Reads `LINKS_KEY` from localStorage, parses JSON, populates `links[]`, renders all |
| `saveLinks()` | JSON-stringifies `links[]`, writes to localStorage. Wrapped in try/catch |
| `addLink()` | Validates both name and URL are non-empty. Normalizes URL via `normalizeUrl()`. Pushes new Link, calls `saveLinks()`, renders, clears inputs |
| `renderLinks()` | Clears `#links-list`, creates a `<a>` element per link opening in `_blank` |
| `removeLink(id)` | Filters link out of `links[]`, calls `saveLinks()`, re-renders |

---

## Data Models

### Task

```js
/**
 * @typedef {Object} Task
 * @property {string} id   - Unique identifier (generated at creation time)
 * @property {string} text - Task description, trimmed, max 500 chars
 * @property {boolean} done - Whether the task is marked complete
 */
```

### Link

```js
/**
 * @typedef {Object} Link
 * @property {string} id   - Unique identifier
 * @property {string} name - Display name, max 100 chars
 * @property {string} url  - Full URL (always includes protocol), max 2048 chars
 */
```

### localStorage Schema

| Key | Value | Format |
|---|---|---|
| `dashboard_tasks` | Array of Task objects | `JSON.stringify(Task[])` |
| `dashboard_links` | Array of Link objects | `JSON.stringify(Link[])` |
| `dashboard_theme` | `'light'` or `'dark'` | Plain string |
| `dashboard_username` | User's display name (max 50 chars) | Plain string |
| `dashboard_sort` | `'default'`, `'az'`, `'za'`, or `'done-last'` | Plain string |

Both task and link keys are absent on first run; the app defaults to empty arrays. The theme key is absent on first run; the app defaults to dark. The username key is absent on first run; the greeting shows without a name. The sort key is absent on first run; the app defaults to insertion order.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Time format is always HH:MM:SS

*For any* Date object, `formatTime(date)` shall return a string matching the pattern `HH:MM:SS` where each component is zero-padded to two digits.

**Validates: Requirements 1.1**

---

### Property 2: Date format is always "Weekday, DD Month YYYY"

*For any* Date object, `formatDate(date)` shall return a string of the form `"<Weekday>, <DD> <Month> <YYYY>"` where the weekday is the full English day name, DD is zero-padded to two digits, Month is the full English month name, and YYYY is the four-digit year.

**Validates: Requirements 1.2**

---

### Property 3: Greeting is determined entirely by hour

*For any* integer hour in [0..23]:
- Hours [5..11] → `getGreeting(hour)` returns exactly `"Good Morning"`
- Hours [12..17] → `getGreeting(hour)` returns exactly `"Good Afternoon"`
- Hours [0..4] and [18..23] → `getGreeting(hour)` returns exactly `"Good Evening"`

**Validates: Requirements 1.3, 1.4, 1.5**

---

### Property 4: Timer display is always MM:SS

*For any* integer seconds value in [0..1500], `formatTimer(seconds)` shall return a string matching the pattern `MM:SS` where both components are zero-padded to two digits.

**Validates: Requirements 2.10**

---

### Property 5: Start is idempotent when already running

*For any* running timer state (isRunning = true, remainingSeconds = N), calling `startTimer()` shall leave `timerSeconds` unchanged at N and shall not create an additional interval.

**Validates: Requirements 2.3**

---

### Property 6: Pause preserves remaining time

*For any* running timer with `timerSeconds = N` (where N ∈ [1..1500]), calling `pauseTimer()` shall result in `timerRunning = false` and `timerSeconds = N` (unchanged).

**Validates: Requirements 2.4, 2.5**

---

### Property 7: Reset always returns to initial state

*For any* timer state (running, paused, or completed), calling `resetTimer()` shall result in `timerSeconds = 1500` and `timerRunning = false`.

**Validates: Requirements 2.7**

---

### Property 8: Adding a valid task grows the list by exactly one

*For any* existing tasks array and any non-empty, non-whitespace-only task description string, calling `addTask()` with that description shall increase `tasks.length` by exactly 1 and the new task's `text` shall equal the trimmed input.

**Validates: Requirements 3.2**

---

### Property 9: Blank input never creates a task

*For any* string composed entirely of whitespace characters (including the empty string), calling `addTask()` with that input shall leave `tasks.length` unchanged.

**Validates: Requirements 3.3**

---

### Property 10: Task persistence round-trip

*For any* array of Task objects, serializing the array to localStorage via `saveTasks()` and then deserializing via `loadTasks()` shall produce an array that is deeply equal to the original (same ids, texts, and done states, in the same order).

**Validates: Requirements 3.5, 8.1, 8.3**

---

### Property 11: Escape during edit restores original text

*For any* task with any text string T, starting an edit and then canceling via `cancelEdit()` shall leave `task.text` equal to T without modifying localStorage.

**Validates: Requirements 4.4**

---

### Property 12: Blank edit confirmation discards the change

*For any* task with original text T and any whitespace-only edit input W, confirming the edit with W shall leave `task.text` equal to T.

**Validates: Requirements 4.5**

---

### Property 13: Toggle completion is an involution

*For any* task with `done = D`, calling `toggleTask(id)` once shall set `done = !D`. Calling it twice shall return `done` to its original value D.

**Validates: Requirements 5.1**

---

### Property 14: Delete removes exactly the targeted task

*For any* tasks array of length N and any valid index i, calling `deleteTask(tasks[i].id)` shall produce a tasks array of length N−1 that does not contain any task with `id = tasks[i].id`, and all other tasks shall be preserved in their original order.

**Validates: Requirements 5.3**

---

### Property 15: URL normalization always produces a protocol-prefixed URL

*For any* URL string that does not begin with `"http://"` or `"https://"`, calling `normalizeUrl(url)` shall return a string that begins with `"https://"` and whose remaining content equals the original input.

**Validates: Requirements 6.4**

---

### Property 16: Adding a valid link grows the list by exactly one

*For any* existing links array and any pair of non-empty name and URL strings, calling `addLink()` shall increase `links.length` by exactly 1 and the new link's `name` and normalized `url` shall match the submitted values.

**Validates: Requirements 6.2**

---

### Property 17: Blank name or URL never creates a link

*For any* combination where the name is empty/whitespace, the URL is empty/whitespace, or both, calling `addLink()` shall leave `links.length` unchanged.

**Validates: Requirements 6.3**

---

### Property 18: Link persistence round-trip

*For any* array of Link objects, serializing via `saveLinks()` and deserializing via `loadLinks()` shall produce an array deeply equal to the original (same ids, names, and urls, in the same order).

**Validates: Requirements 6.6, 8.2, 8.4**

---

### Property 19: Remove link removes exactly the targeted link

*For any* links array of length N and any valid index i, calling `removeLink(links[i].id)` shall produce a links array of length N−1 that does not contain any link with `id = links[i].id`, and all other links shall be preserved in their original order.

**Validates: Requirements 6.5**

---

### Property 20: Theme toggle is an involution

*For any* starting theme state T ('light' or 'dark'), calling `toggleTheme()` once shall switch to the opposite theme. Calling `toggleTheme()` twice shall return `document.body.dataset.theme` to the value equivalent to the original theme T.

**Validates: Requirements 11.2, 11.3**

---

### Property 21: Theme persistence round-trip

*For any* theme value V ∈ {'light', 'dark'}, calling `toggleTheme()` to reach theme V and then calling `initTheme()` (simulating a page reload) shall result in the same theme V being applied.

**Validates: Requirements 11.4, 11.5**

---

### Property 22: Greeting with name always includes name and ends with "!"

*For any* integer hour in [0..23] and any non-empty trimmed name string N, `getGreeting(hour, N)` shall return a string that contains N and ends with `"!"`.

**Validates: Requirements 12.2**

---

### Property 23: Greeting without name never contains punctuation suffix

*For any* integer hour in [0..23], `getGreeting(hour, '')` and `getGreeting(hour, undefined)` shall return exactly `"Good Morning"`, `"Good Afternoon"`, or `"Good Evening"` (no trailing comma, colon, or exclamation mark).

**Validates: Requirements 12.4**

---

### Property 24: sortTasks never mutates the original array

*For any* tasks array A and any sort mode M ∈ {'default', 'az', 'za', 'done-last'}, calling `sortTasks(A)` shall return a new array containing the same elements as A without modifying A's order or length.

**Validates: Requirements 13.6**

---

### Property 25: sortTasks 'az' produces a stable ascending sort

*For any* tasks array, `sortTasks` in `'az'` mode shall return an array where every adjacent pair (tasks[i], tasks[i+1]) satisfies `tasks[i].text.toLowerCase() <= tasks[i+1].text.toLowerCase()`.

**Validates: Requirements 13.3**

---

### Property 26: sortTasks 'done-last' groups incomplete before complete

*For any* tasks array containing at least one incomplete and one complete task, `sortTasks` in `'done-last'` mode shall return an array where no incomplete task appears after any complete task.

**Validates: Requirements 13.5**

---

## Error Handling

### localStorage Write Failures

`saveTasks()` and `saveLinks()` both wrap `localStorage.setItem` in a `try/catch`. If the write fails (e.g., quota exceeded, private browsing mode in some browsers), the failure is silent. The in-memory `tasks[]` / `links[]` arrays remain authoritative for the current session — the UI reflects the correct state even if persistence fails.

**Rationale:** In a no-backend static app, crashing or reverting the UI on a storage error is worse UX than silently degrading to session-only persistence.

### JSON Parse Failures

`loadTasks()` and `loadLinks()` wrap `JSON.parse` in a `try/catch`. If the stored value is corrupted (e.g., partial write from a previous crash), the catch block returns an empty array — same as if the key had never been set. This prevents a corrupt `localStorage` entry from permanently breaking the app.

### Input Validation

- Empty/whitespace task input: inline error message shown near the input field; task is not created.
- Empty name or URL for links: the relevant input is highlighted with an error indicator; link is not created.
- Whitespace-only edit confirmation: edit is silently discarded, original text is restored (no error message needed since the user's intent is clear from the context).

### Timer Edge Cases

- `tick()` is a no-op if `timerSeconds` has already reached 0 (guard against race conditions with interval callbacks).
- `resetTimer()` always clears the active interval before resetting state, preventing multiple concurrent intervals.

---

## Testing Strategy

### Dual Approach: Unit Tests + Property-Based Tests

The app is a pure-logic JavaScript file with no build tooling. Tests are written using **Vitest** (or Jest — both run without a bundler using `--experimental-vm-modules`). Property-based tests use **fast-check**.

```
tests/
├── utils.test.js        (unit + property tests for utility helpers)
├── timer.test.js        (unit + property tests for timer state logic)
├── todo.test.js         (unit + property tests for task CRUD and persistence)
└── links.test.js        (unit + property tests for link CRUD and persistence)
```

Since `app.js` is a single IIFE file, the testable pure functions and state-mutation functions are extracted into testable units either by exposing them as `window.*` in test builds or by restructuring `app.js` to export named functions when `typeof module !== 'undefined'` (CommonJS guard for Node test runner compatibility).

### Property-Based Tests

Using **fast-check** with a minimum of **100 iterations per property**.

Each property test is tagged with a comment identifying the design property it validates:
> Tag format: `// Feature: todo-list-life-dashboard, Property N: <property_text>`

| Property | Test Description | Generator |
|---|---|---|
| P1: formatTime | Arbitrary Date → HH:MM:SS | `fc.date()` |
| P2: formatDate | Arbitrary Date → Weekday, DD Month YYYY | `fc.date()` |
| P3: getGreeting | Hour in [0..23] → correct greeting | `fc.integer({ min: 0, max: 23 })` |
| P4: formatTimer | Seconds in [0..1500] → MM:SS | `fc.integer({ min: 0, max: 1500 })` |
| P5: start idempotent | Running state, call start → unchanged | `fc.integer({ min: 1, max: 1500 })` |
| P6: pause preserves time | Any running timer → pause preserves seconds | `fc.integer({ min: 1, max: 1500 })` |
| P7: reset returns to initial | Any timer state → reset gives 1500/false | `fc.record({ seconds, running })` |
| P8: valid task grows list | Non-empty non-blank string → list+1 | `fc.string().filter(s => s.trim().length > 0)` |
| P9: blank input rejected | Whitespace-only string → list unchanged | `fc.string({ minLength: 0 }).map(s => s.replace(/\S/g, ' '))` |
| P10: task round-trip | Task array → save → load → equal | `fc.array(taskArbitrary)` |
| P11: Escape restores text | Any task text, cancel edit → unchanged | `fc.string({ minLength: 1 })` |
| P12: blank edit discarded | Any task text, blank edit → unchanged | `fc.string().filter(s => s.trim() === '')` |
| P13: toggle is involution | Any done state → toggle twice = original | `fc.boolean()` |
| P14: delete removes one | Array + valid index → length-1, target absent | `fc.array(taskArbitrary, { minLength: 1 })` |
| P15: URL normalization | URL without protocol → prefixed with https:// | `fc.webUrl()` or raw `fc.string()` filtered |
| P16: valid link grows list | Non-empty name+URL pair → links+1 | `fc.record({ name: nonEmpty, url: nonEmpty })` |
| P17: blank link rejected | Name or URL empty → links unchanged | Cases where name or url is empty |
| P18: link round-trip | Link array → save → load → equal | `fc.array(linkArbitrary)` |
| P19: remove link removes one | Array + valid index → length-1, target absent | `fc.array(linkArbitrary, { minLength: 1 })` |
| P20: theme toggle is involution | Any theme state → toggle twice = original | `fc.constantFrom('light', 'dark')` |
| P21: theme persistence round-trip | Any theme V → toggleTheme → initTheme → V | `fc.constantFrom('light', 'dark')` |
| P22: greeting with name includes name + "!" | Any hour + non-empty name → contains name, ends "!" | `fc.integer({min:0,max:23})`, `fc.string({minLength:1})` |
| P23: greeting without name has no punctuation suffix | Any hour, empty/undefined name → plain greeting | `fc.integer({min:0,max:23})` |
| P24: sortTasks never mutates original | Any tasks array, any sort mode → original unchanged | `fc.array(taskArbitrary)`, `fc.constantFrom(...)` |
| P25: sortTasks 'az' ascending | Any tasks → sorted result pairwise ascending | `fc.array(taskArbitrary)` |
| P26: sortTasks 'done-last' groups incomplete first | Mixed done/undone → no incomplete after complete | `fc.array(taskArbitrary, {minLength:2})` |

### Unit Tests (example-based)

Unit tests cover specific examples, initialization states, and edge cases not suited for property generation:

- Timer initializes to `25:00` with pause button disabled (Req 2.1, 2.6)
- Timer completion at 00:00 shows completion indicator and disables pause (Req 2.8, 2.9)
- Edit mode: correct DOM state (input element present, pre-populated) (Req 4.1)
- Completing a task applies strikethrough CSS class (Req 5.2)
- Link click calls `window.open(url, '_blank')` (Req 7.1)
- `localStorage` absent on load → tasks and links initialize to `[]` (Req 8.5, 8.6)
- Corrupted `localStorage` value → graceful fallback to `[]`
- `localStorage.setItem` throws → in-memory state still updated (Req 5.5)
- HTML structure: input elements have correct `maxlength` attributes (Req 3.1, 3.4, 4.2, 6.1)

### Integration / Smoke Tests (manual or Playwright)

For a `file://`-compatible static app without a dev server, a lightweight Playwright smoke test can open `index.html` locally and verify:

- All four widget sections are present in the DOM
- Clock updates its text within 2 seconds
- Adding a task via the UI persists it across a page reload
- Adding a link opens a new tab (checked via `page.waitForEvent('popup')`)

These are run manually before release, not in CI.
