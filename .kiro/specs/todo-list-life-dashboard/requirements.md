# Requirements Document

## Introduction

The To-Do List Life Dashboard is a static, single-page web application that serves as a personal productivity hub. It combines a live greeting with clock, a Pomodoro-style focus timer, a persistent to-do list, and a quick-access links panel — all running entirely in the browser using HTML, CSS, and Vanilla JavaScript. No backend or build tooling is required. All user data is persisted via the browser's `localStorage` API.

---

## Glossary

- **Dashboard**: The single HTML page (`index.html`) that contains all four feature widgets.
- **Greeting_Widget**: The UI section that displays the live clock, current date, and a time-based greeting.
- **Focus_Timer**: The countdown timer widget initialized to 25 minutes.
- **Todo_List**: The widget that manages a collection of user-defined task items.
- **Task**: A single to-do item with text content and a completion state.
- **Quick_Links**: The widget that manages a collection of user-defined bookmark entries.
- **Link**: A bookmark entry consisting of a display name and a URL.
- **localStorage**: The browser-native key-value storage API used for data persistence across sessions.
- **App**: The single JavaScript file (`js/app.js`) that implements all widget logic.
- **Stylesheet**: The single CSS file (`css/style.css`) that implements all visual styling.

---

## Requirements

### Requirement 1: Live Greeting and Clock

**User Story:** As a user, I want to see the current time, date, and a contextual greeting when I open the dashboard, so that I am immediately oriented to the current moment.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM:SS (24-hour) format, updated exactly every 1 second via setInterval.
2. THE Greeting_Widget SHALL display the current date in "Weekday, DD Month YYYY" format using the user's local timezone (e.g., "Sunday, 27 July 2025").
3. WHEN the local hour is 05 through 11 (inclusive), THE Greeting_Widget SHALL display the text "Good Morning".
4. WHEN the local hour is 12 through 17 (inclusive), THE Greeting_Widget SHALL display the text "Good Afternoon".
5. WHEN the local hour is 18 through 23 (inclusive) OR 00 through 04 (inclusive), THE Greeting_Widget SHALL display the text "Good Evening".
6. THE Greeting_Widget SHALL update the greeting text within 1 second of the local hour crossing a time boundary without requiring a page reload.
7. WHEN the page loads, THE Greeting_Widget SHOULD render the current time, date, and greeting within 1 second (this is a performance goal; rendering that takes longer is still acceptable).

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with Start, Pause, and Reset controls, so that I can manage focused work sessions using the Pomodoro technique.

#### Acceptance Criteria

1. WHEN the page loads, THE Focus_Timer SHALL initialize with a countdown value of 25:00.
2. WHEN the user activates the Start control, THE Focus_Timer SHALL begin counting down at exactly 1 second per real-world second without altering the current timerSeconds value.
3. WHEN the Focus_Timer is already running and the user activates the Start control, THE Focus_Timer SHALL take no action.
4. WHEN the Focus_Timer is running and the user activates the Stop/Pause control, THE Focus_Timer SHALL pause the countdown and preserve the remaining time.
5. WHEN the Focus_Timer is paused and the user activates the Start control, THE Focus_Timer SHALL resume counting down from the preserved remaining time.
6. WHILE the Focus_Timer is in its initial stopped state (not yet started), THE Focus_Timer SHALL disable the Stop/Pause control.
7. WHEN the user activates the Reset control, THE Focus_Timer SHALL stop any active countdown and reset the displayed value to 25:00.
8. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and display a user-facing completion indication.
9. WHEN the countdown has reached 00:00, THE Focus_Timer SHALL disable the Stop/Pause control until the Reset control is activated.
10. THE Focus_Timer SHALL display the remaining time in MM:SS format at all times.

---

### Requirement 3: To-Do List — Add Tasks

**User Story:** As a user, I want to add tasks to my to-do list, so that I can track what I need to accomplish.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a text input field (maximum 500 characters) and an "Add" control for entering new tasks.
2. WHEN the user submits a non-empty input via the Add control or by pressing the Enter key, THE Todo_List SHALL trim leading and trailing whitespace, append the new Task to the list, and clear the input field.
3. IF the user attempts to submit an empty or whitespace-only input, THEN THE Todo_List SHALL not create a Task and SHALL display a visible indication to the user.
4. THE Todo_List SHALL not accept input longer than 500 characters; characters beyond the limit SHALL not be entered into the input field.
5. THE Todo_List SHALL persist all Tasks to localStorage so that the task list is restored within 1 second of page load with no data loss.

---

### Requirement 4: To-Do List — Edit Tasks

**User Story:** As a user, I want to edit existing tasks inline, so that I can correct or update task descriptions without deleting and re-adding them.

#### Acceptance Criteria

1. WHEN the user activates the edit control on a Task, THE Todo_List SHALL replace the task display label with an input field pre-populated with the current task text and the cursor positioned at the end.
2. THE Todo_List SHALL limit the edit input field to a maximum of 200 characters.
3. WHEN the user presses Enter to confirm the edit, THE Todo_List SHALL return to display mode within 100ms.
4. WHEN the user presses Escape during an edit, THE Todo_List SHALL cancel the edit and restore the original task text without saving any changes, regardless of system state.
5. IF the user confirms an edit with an empty or whitespace-only value, THEN THE Todo_List SHALL discard the change, restore the original Task text, and SHALL NOT modify localStorage.
6. WHEN the user confirms a valid non-empty edit, THE Todo_List SHALL persist the updated Task list to localStorage before returning to display mode.

---

### Requirement 5: To-Do List — Complete and Delete Tasks

**User Story:** As a user, I want to mark tasks as done and delete tasks, so that I can track progress and keep my list clean.

#### Acceptance Criteria

1. WHEN the user activates the completion toggle on a Task, THE Todo_List SHALL toggle the Task's completion state between complete and incomplete.
2. WHILE a Task is in the complete state, THE Todo_List SHALL display strikethrough styling on the task text.
3. WHEN the user activates the delete control on a Task, THE Todo_List SHALL permanently remove that Task from the list; the Task SHALL NOT appear in the list after deletion.
4. WHEN a Task's completion state is toggled or a Task is deleted, THE Todo_List SHALL initiate persistence of the updated Task list to localStorage within 500ms of the state change; the persistence operation SHALL complete successfully even if it exceeds the 500ms window.
5. IF a localStorage write fails, THEN THE Todo_List SHALL update both the in-memory state AND the displayed list to reflect the change, ensuring display and memory remain synchronized.

---

### Requirement 6: Quick Links — Add and Remove Links

**User Story:** As a user, I want to save and remove favorite website links by name and URL, so that I can quickly access the sites I use most.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide a name input field (maximum 100 characters), a URL input field (maximum 2048 characters), and an "Add" control for saving a new Link.
2. WHEN the user submits a Link entry with both a non-empty name and a non-empty URL, THE Quick_Links SHALL append the new Link to the links list within 100ms and clear both input fields.
3. IF the user attempts to submit a Link with an empty name or an empty URL, THEN THE Quick_Links SHALL not create a Link and SHALL indicate to the user which field is missing.
4. WHEN the submitted URL does not begin with "http://" or "https://", THE Quick_Links SHALL automatically prefix the URL with "https://" before saving.
5. WHEN the user activates the remove control on a Link, THE Quick_Links SHALL permanently remove that Link from the list within 100ms.
6. THE Quick_Links SHALL persist all Links to localStorage so that the links list, including order and content, is fully restored after a page reload.
7. IF the user activates the remove control when the links list is empty, THE Quick_Links SHALL proceed silently with no error.

---

### Requirement 7: Quick Links — Open Links

**User Story:** As a user, I want to open a saved link in a new browser tab, so that I can navigate to my favorite sites without losing the dashboard.

#### Acceptance Criteria

1. WHEN the user activates a saved Link, THE Quick_Links SHALL open the corresponding URL in a new browser tab; IF opening a new tab fails (e.g. popup blocker), THEN THE Quick_Links SHALL fall back to opening the URL in the same tab.
2. THE Quick_Links SHALL render each saved Link as a visible, clickable element displaying its display name.

---

### Requirement 8: Data Persistence

**User Story:** As a user, I want my tasks and links to be saved between sessions, so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. THE App SHALL serialize and write the full Task list to localStorage whenever the Task list is modified (add, edit, complete, delete).
2. THE App SHALL serialize and write the full Link list to localStorage whenever the Link list is modified (add, remove).
3. WHEN the page loads, THE App SHALL read and deserialize the Task list from localStorage and render all persisted Tasks.
4. WHEN the page loads, THE App SHALL read and deserialize the Link list from localStorage and render all persisted Links.
5. IF localStorage does not contain a Task list entry on page load, THEN THE App SHALL initialize the Todo_List with an empty list.
6. IF localStorage does not contain a Link list entry on page load, THEN THE App SHALL initialize the Quick_Links with an empty list.

---

### Requirement 9: Visual Design and Responsiveness

**User Story:** As a user, I want a clean, minimal dark interface that is readable and responsive, so that the dashboard is pleasant to use on any screen size.

#### Acceptance Criteria

1. THE Stylesheet SHALL implement a dark color scheme as the default and only theme.
2. THE Stylesheet SHALL apply consistent font sizing and line-height values that ensure text is legible at standard screen resolutions.
3. THE Dashboard SHALL arrange all four widgets in a layout that adapts to both desktop and mobile viewport widths without horizontal scrolling.
4. THE Dashboard SHALL render correctly in the latest stable versions of Chrome, Firefox, Edge, and Safari.
5. THE Dashboard SHOULD provide an accessibility theme option (e.g. high-contrast or light theme) for users who require it, in addition to the default dark theme.

---

### Requirement 10: Technical Architecture

**User Story:** As a developer, I want the project to use only HTML, CSS, and Vanilla JavaScript in the prescribed file structure, so that the application requires no build tools, dependencies, or backend services.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented as a single `index.html` file at the project root that references exactly one stylesheet and one script file.
2. THE Stylesheet SHALL be located at `css/style.css` and SHALL be the only CSS file in the project.
3. THE App SHALL be located at `js/app.js` and SHALL be the only JavaScript file in the project.
4. THE App SHALL use only browser-native Web APIs with no external libraries, frameworks, or module bundlers.
5. THE Dashboard SHALL load and function correctly when opened directly as a local file in a browser (via `file://` protocol) without requiring a web server.
