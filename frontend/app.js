/* ============================================================
   MENTORBRIDGE — FULL APPLICATION & STATE ENGINE
   ============================================================ */

// Global Application State
const state = {
  isAuthenticated: false,
  role: "mentee",
  menteeId: "N1",
  mentorId: "M1",
  menteeTab: "match",
  mentorTab: "mentees"
};

/* ============================================================
    AUTHENTICATION & LANDING SCREEN HANDLERS
   ============================================================ */

async function initLoginScreen() {
  try {
    const mentees = await API.getMentees();
    const mentors = await API.getMentors();
    
    initMenteeSelector(mentees);
    initMentorSelector(mentors);
    onLoginRoleChange();
  } catch (err) {
    console.error("Error initializing login selectors:", err);
  }
}

function onLoginRoleChange() {
  const role = document.getElementById("login-role").value;
  const userSelectGroup = document.getElementById("user-select-group");
  const userSelect = document.getElementById("login-user-select");

  if (role === "admin") {
    userSelectGroup.classList.add("hidden");
  } else {
    userSelectGroup.classList.remove("hidden");
    const sourceSelect = document.getElementById(role + "-select");
    if (sourceSelect) {
      userSelect.innerHTML = sourceSelect.innerHTML;
    }
  }
}

function handleLogin(evt) {
  evt.preventDefault();
  const role = document.getElementById("login-role").value;
  state.role = role;
  state.isAuthenticated = true;

  if (role === "mentee") {
    const selectedVal = document.getElementById("login-user-select").value;
    state.menteeId = selectedVal || "N1";
    document.getElementById("mentee-select").value = state.menteeId;
  } else if (role === "mentor") {
    const selectedVal = document.getElementById("login-user-select").value;
    state.mentorId = selectedVal || "M1";
    document.getElementById("mentor-select").value = state.mentorId;
  }

  // Hide Landing Screen, Show Main Application
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("main-app").classList.remove("hidden");
  
  switchRole(role);
}

function handleLogout() {
  state.isAuthenticated = false;
  document.getElementById("main-app").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
}

/* ============================================================
    ROLE & NAVIGATION SWITCHING
   ============================================================ */

async function switchRole(role) {
  state.role = role;

  // Toggle View Panels
  document.querySelectorAll(".role-view").forEach(v => v.classList.add("hidden"));
  document.querySelectorAll(".nav-btn[data-role]").forEach(b => b.classList.remove("active"));
  
  const targetView = document.getElementById(role + "-view");
  if (targetView) targetView.classList.remove("hidden");

  const targetBtn = document.querySelector(`.nav-btn[data-role="${role}"]`);
  if (targetBtn) targetBtn.classList.add("active");

  // Load Content for Selected View
  if (role === "mentee") await renderMenteePortal();
  else if (role === "mentor") await renderMentorPortal();
  else if (role === "admin") await renderAdminPortal();
}

function fillSelect(selectElement, items, labelFn, valueFn) {
  if (!selectElement) return;
  selectElement.innerHTML = items
    .map(item => `<option value="${valueFn(item)}">${labelFn(item)}</option>`)
    .join("");
}

/* ============================================================
    MENTEE PORTAL CONTROLLERS
   ============================================================ */

function initMenteeSelector(menteesList) {
  const select = document.getElementById("mentee-select");
  fillSelect(select, menteesList, m => `${m.name} — ${m.programme}`, m => m.id);
  select.value = state.menteeId;
}

function onMenteeChange() {
  state.menteeId = document.getElementById("mentee-select").value;
  renderMenteePortal();
}

async function menteeSubTab(tab) {
  state.menteeTab = tab;
  document.querySelectorAll("#mentee-view .subtab-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  
  document.getElementById("mentee-match-panel").classList.toggle("active", tab === "match");
  document.getElementById("mentee-dashboard-panel").classList.toggle("active", tab === "dashboard");
  
  await renderMenteePortal();
}

async function renderMenteePortal() {
  if (state.menteeTab === "match") {
    const results = await API.getMatchesForMentee(state.menteeId);
    renderMentorMatchCards(results);
  } else {
    await renderMenteeDashboard();
  }
}

function renderMentorMatchCards(results) {
  const grid = document.getElementById("mentor-match-grid");
  if (!grid) return;

  grid.innerHTML = results.map(({ mentor, score, matchReason, isAtCapacity }) => `
    <div class="card mentor-card ${isAtCapacity ? "full-capacity" : ""}">
      <div class="card-header">
        <h3>${mentor.name}</h3>
        <span class="match-badge">${score}% Match</span>
      </div>
      <p class="role-title"><strong>${mentor.role}</strong> at ${mentor.org}</p>
      <p class="muted"><strong>Expertise:</strong> ${mentor.skills.join(", ")}</p>
      <div class="explainability-box">
        <strong>Why this match:</strong> ${matchReason}
      </div>
      <div class="card-actions">
        <button class="btn-primary" 
          onclick="requestMatch('${mentor.id}')" 
          ${isAtCapacity ? "disabled" : ""}>
          ${isAtCapacity ? "Capacity Reached" : "Request Mentor"}
        </button>
      </div>
    </div>
  `).join("");
}

async function requestMatch(mentorId) {
  try {
    const res = await API.createMatchRequest(state.menteeId, mentorId);
    alert(res.message || "Match request submitted successfully!");
    await renderMenteePortal();
  } catch (err) {
    alert("Could not complete request: " + err.message);
  }
}

async function renderMenteeDashboard() {
  const container = document.getElementById("mentee-dashboard-content");
  if (!container) return;

  const mentee = await API.getMentee(state.menteeId);
  const sessions = await API.getSessionsForMentee(state.menteeId);

  const sessionsHTML = sessions.length === 0 
    ? `<p class="muted">No upcoming or logged sessions found.</p>` 
    : sessions.map(s => `
        <div class="session-item">
          <p><strong>Date:</strong> ${s.date} | <strong>Topic:</strong> ${s.topic}</p>
          <p><strong>Status:</strong> <span class="badge badge-${s.status.toLowerCase()}">${s.status}</span></p>
        </div>
      `).join("");

  container.innerHTML = `
    <div class="dash-grid">
      <div class="panel-block">
        <h3>Profile Summary</h3>
        <p><strong>Name:</strong> ${mentee.name}</p>
        <p><strong>Programme:</strong> ${mentee.programme}</p>
        <p><strong>Goals:</strong> ${mentee.goals}</p>
      </div>
      <div class="panel-block">
        <h3>Your Sessions</h3>
        ${sessionsHTML}
      </div>
    </div>
  `;
}

/* ============================================================
    MENTOR PORTAL CONTROLLERS
   ============================================================ */

function initMentorSelector(mentorsList) {
  const select = document.getElementById("mentor-select");
  fillSelect(select, mentorsList, m => `${m.name} — ${m.role}`, m => m.id);
  select.value = state.mentorId;
}

function onMentorChange() {
  state.mentorId = document.getElementById("mentor-select").value;
  renderMentorPortal();
}

async function mentorSubTab(tab) {
  state.mentorTab = tab;
  document.querySelectorAll("#mentor-view .subtab-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  
  ["mentees", "requests", "dashboard"].forEach(t => {
    const panel = document.getElementById("mentor-" + t + "-panel");
    if (panel) panel.classList.toggle("active", t === tab);
  });
  
  await renderMentorPortal();
}

async function renderMentorPortal() {
  const mentor = await API.getMentor(state.mentorId);
  if (!mentor) return;

  document.getElementById("mentor-view-title").textContent = `${mentor.name}'s Portal`;
  document.getElementById("mentor-view-sub").textContent = `${mentor.role} at ${mentor.org}`;

  renderCapacityBar(mentor);

  if (state.mentorTab === "mentees") {
    await renderAssignedMentees(mentor.id);
  } else if (state.mentorTab === "requests") {
    await renderSessionRequests(mentor.id);
  } else if (state.mentorTab === "dashboard") {
    await renderMentorDashboard(mentor.id);
  }
}

function renderCapacityBar(mentor) {
  const capacityContainer = document.getElementById("capacity-indicator");
  if (!capacityContainer) return;

  const currentCount = mentor.assignedMentees ? mentor.assignedMentees.length : 0;
  const maxCapacity = mentor.maxCapacity || 3;
  const percentage = Math.min(100, Math.round((currentCount / maxCapacity) * 100));

  capacityContainer.innerHTML = `
    <div class="capacity-info">
      <span><strong>Capacity Utilization:</strong> ${currentCount} / ${maxCapacity} Mentees</span>
      <span>${percentage}%</span>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
    </div>
  `;
}

async function renderAssignedMentees(mentorId) {
  const grid = document.getElementById("assigned-mentees");
  if (!grid) return;

  const mentees = await API.getMatchesForMentor(mentorId);

  if (mentees.length === 0) {
    grid.innerHTML = `<p class="muted">No mentees currently assigned to you.</p>`;
    return;
  }

  grid.innerHTML = mentees.map(m => `
    <div class="card">
      <h3>${m.name}</h3>
      <p><strong>Programme:</strong> ${m.programme}</p>
      <p><strong>Goals:</strong> ${m.goals}</p>
      <p><strong>Needs:</strong> ${m.needs ? m.needs.join(", ") : "N/A"}</p>
    </div>
  `).join("");
}

async function renderSessionRequests(mentorId) {
  const list = document.getElementById("session-requests-list");
  if (!list) return;

  const requests = await API.getRequestsForMentor(mentorId);

  if (requests.length === 0) {
    list.innerHTML = `<p class="muted">No pending session requests.</p>`;
    return;
  }

  list.innerHTML = requests.map(r => `
    <div class="request-card">
      <div>
        <h4>Request from Mentee #${r.menteeId}</h4>
        <p><strong>Proposed Date:</strong> ${r.date} | <strong>Topic:</strong> ${r.topic}</p>
      </div>
      <div class="request-actions">
        <button class="btn-success" onclick="handleRequestAction('${r.id}', 'accept')">Accept</button>
        <button class="btn-danger" onclick="handleRequestAction('${r.id}', 'decline')">Decline</button>
      </div>
    </div>
  `).join("");
}

async function handleRequestAction(requestId, action) {
  try {
    await API.updateRequestStatus(requestId, action);
    alert(`Request ${action}ed successfully.`);
    await renderMentorPortal();
  } catch (err) {
    alert("Error updating request: " + err.message);
  }
}

async function renderMentorDashboard(mentorId) {
  const container = document.getElementById("mentor-dashboard-content");
  if (!container) return;

  const stats = await API.getMentorMetrics(mentorId);

  container.innerHTML = `
    <div class="dash-grid">
      <div class="stat-card">
        <h3>${stats.totalHoursLogged || 0} hrs</h3>
        <p>Total Hours Completed</p>
      </div>
      <div class="stat-card">
        <h3>${stats.completedSessions || 0}</h3>
        <p>Sessions Conducted</p>
      </div>
      <div class="stat-card">
        <h3>${stats.avgFeedbackRating || "N/A"}</h3>
        <p>Average Feedback Score</p>
      </div>
    </div>
  `;
}

/* ============================================================
    ADMIN PORTAL CONTROLLERS
   ============================================================ */

async function renderAdminPortal() {
  const container = document.getElementById("admin-stats");
  if (!container) return;

  const stats = await API.getAdminStats();

  container.innerHTML = `
    <div class="stat-card">
      <h3>${stats.totalHours || 0} hrs</h3>
      <p>Total System Mentoring Hours</p>
    </div>
    <div class="stat-card">
      <h3>${stats.activeMatches || 0}</h3>
      <p>Active Matches</p>
    </div>
    <div class="stat-card">
      <h3>${stats.pendingRequests || 0}</h3>
      <p>Pending Match Requests</p>
    </div>
    <div class="stat-card">
      <h3>${stats.noShows || 0}</h3>
      <p>Logged No-Shows</p>
    </div>
  `;
}

/* ============================================================
    DOM INITIALIZATION
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  await initLoginScreen();
});