# MentorBridge — Front-End Application

**MentorBridge** is a developmental relationship platform designed to streamline mentor-mentee matching, session scheduling, capacity management, and program analytics.

---

## Features & Portal Capabilities

### Authentication & Landing Screen
* **Role Gate Landing View:** Centered initial view allowing users to select their active portal (Mentee, Mentor, or System Administrator) and user profile before entering the main platform.
* **Session Persistence:** Remembers active user role selection across tab switches.

### Mentee Portal
* **Smart Matching Grid:** Displays recommended mentors with calculated match percentages and explainability rationale.
* **Match Requests:** Request mentor capacity directly with instant UI feedback.
* **Mentee Dashboard:** Overview of personal profile details, academic goals, and upcoming scheduled sessions.

### Mentor Portal
* **Capacity Tracking:** Live visual progress bar showing mentor capacity utilization ($Count / Max$).
* **Assigned Mentees:** Overview card grid of active mentee relationships.
* **Session Management:** Panel for accepting or declining incoming mentee session requests.
* **Metrics & Hours:** Track total conducted sessions and logged mentoring hours.

### Admin Dashboard
* System-wide metrics tracking total mentoring hours logged across the platform, active matches, pending requests, and no-show logs.

---

## Tech Stack & Project Architecture

* **HTML5:** Semantic structure, accessible forms, and modular container screens.
* **CSS3:** Custom CSS properties (variables), Flexbox, CSS Grid layouts, and fully responsive dark theme UI.
* **JavaScript (ES6+):** Async/Await API flow, dynamic DOM manipulation, and state-driven portal navigation.

---

## Repository Structure

```text
├── index.html       # Landing page, layout containers, and portal structures
├── style.css        # System-wide styles, theme variables, grids & UI components
├── app.js           # Navigation controllers, state engine, and dynamic DOM renderers
├── script.js        # Data engine & API interface methods (Back-End Integration)
└── README.md        # Documentation
