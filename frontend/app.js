/* ============================================================
   MENTORBRIDGE — APPLICATION LOGIC
   Screens are driven entirely by the backend API (see script.js).
   Roles: mentee → My Mentoring, mentor → Mentor Portal,
          admin → full admin, coach → read-only admin.
   ============================================================ */

const state = {
  user: null,
  role: null,          // which portal is showing: mentee | mentor | admin
  menteeTab: "match",
  mentorTab: "mentees",
  adminTab: "overview",
  adminMenteeId: null,
  mentorDash: null,    // cached mentor dashboard (for the mentor's mentee list)
};

/* ---------- small helpers ---------- */
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const label = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const badge = (s) => `<span class="badge badge-${esc(String(s).replace(/_/g, "-"))}">${esc(label(s))}</span>`;
const canWrite = () => state.user && state.user.role === "admin";
const isCoach = () => state.user && state.user.role === "coach";

function toast(message, type = "info") {
  const root = $("toast-root");
  if (!root) return;
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

function loading(el, text = "Loading...") {
  if (el) el.innerHTML = `<p class="muted">${esc(text)}</p>`;
}
function showError(el, err) {
  if (el) el.innerHTML = `<p class="form-error">${esc(err.message || err)}</p>`;
}

/* ---------- modal ---------- */
function openModal(title, bodyHTML, onSubmit, submitLabel = "Save") {
  $("modal-root").innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <h3>${esc(title)}</h3>
        <form id="modal-form">
          ${bodyHTML}
          <p id="modal-error" class="form-error hidden"></p>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn-primary" id="modal-submit">${esc(submitLabel)}</button>
          </div>
        </form>
      </div>
    </div>`;
  $("modal-form").onsubmit = async (e) => {
    e.preventDefault();
    const btn = $("modal-submit");
    const errBox = $("modal-error");
    btn.disabled = true;
    errBox.classList.add("hidden");
    try {
      await onSubmit(new FormData(e.target));
      closeModal();
    } catch (err) {
      errBox.textContent = err.message || String(err);
      errBox.classList.remove("hidden");
      btn.disabled = false;
    }
  };
}
function closeModal() { $("modal-root").innerHTML = ""; }

const optionList = (items, valueFn, labelFn, selected) =>
  items.map((i) => `<option value="${esc(valueFn(i))}" ${String(valueFn(i)) === String(selected) ? "selected" : ""}>${esc(labelFn(i))}</option>`).join("");

const ratingSelect = (name, text) =>
  `<label>${esc(text)}<select name="${name}">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${n}${n === 5 ? " — excellent" : n === 1 ? " — poor" : ""}</option>`).join("")}</select></label>`;

function localDateTimeToIso(value, plusMinutes = 0) {
  const d = new Date(value);
  return new Date(d.getTime() + plusMinutes * 60000).toISOString();
}

/* ============================================================
   AUTH
   ============================================================ */
function fillDemo(email) {
  $("login-email").value = email;
  $("login-password").value = "Password123!";
}

async function handleLogin(evt) {
  evt.preventDefault();
  const btn = $("login-submit");
  const errBox = $("login-error");
  errBox.classList.add("hidden");
  btn.disabled = true;
  $("login-hint").classList.remove("hidden");
  try {
    const user = await API.login($("login-email").value.trim(), $("login-password").value);
    await enterApp(user);
  } catch (err) {
    errBox.textContent = err.status === 401 ? "Incorrect email or password." : err.message;
    errBox.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    $("login-hint").classList.add("hidden");
  }
}

function handleLogout() {
  API.logout();
  state.user = null;
  state.mentorDash = null;
  $("main-app").classList.add("hidden");
  $("login-screen").classList.remove("hidden");
  $("login-password").value = "";
}

function defaultPortal(role) {
  return role === "mentor" ? "mentor" : role === "mentee" ? "mentee" : "admin";
}

async function enterApp(user) {
  state.user = user;
  $("login-screen").classList.add("hidden");
  $("main-app").classList.remove("hidden");
  const portal = defaultPortal(user.role);
  // each user only sees the portal for their own role
  document.querySelectorAll(".nav-btn[data-role]").forEach((b) => b.classList.toggle("hidden", b.dataset.role !== portal));
  $("user-badge").textContent = `${user.name} · ${label(user.role)}`;
  $("admin-view-sub").textContent = isCoach()
    ? "Read-only view for programme coaches/supervisors."
    : "Mentoring hours, capacity, matching and assignment.";
  await switchRole(portal);
}

/* ============================================================
   ROLE & NAVIGATION
   ============================================================ */
async function switchRole(role) {
  state.role = role;
  document.querySelectorAll(".role-view").forEach((v) => v.classList.add("hidden"));
  document.querySelectorAll(".nav-btn[data-role]").forEach((b) => b.classList.remove("active"));
  const view = $(role + "-view");
  if (view) view.classList.remove("hidden");
  const btn = document.querySelector(`.nav-btn[data-role="${role}"]`);
  if (btn) btn.classList.add("active");

  if (role === "mentee") await renderMenteePortal();
  else if (role === "mentor") await renderMentorPortal();
  else if (role === "admin") await renderAdminPortal();
}

function setSubtab(viewId, panelPrefix, tabs, tab) {
  document.querySelectorAll(`#${viewId} .subtab-btn`).forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  tabs.forEach((t) => {
    const p = $(`${panelPrefix}-${t}-panel`);
    if (p) p.classList.toggle("active", t === tab);
  });
}

/* ============================================================
   MENTEE PORTAL
   ============================================================ */
async function menteeSubTab(tab) {
  state.menteeTab = tab;
  setSubtab("mentee-view", "mentee", ["match", "dashboard"], tab);
  await renderMenteePortal();
}

async function renderMenteePortal() {
  const u = state.user;
  $("mentee-view-title").textContent = `Welcome, ${u.name.split(" ")[0]}`;
  if (!u.profile_id) {
    const msg = `<p class="muted">Your mentee profile has not been set up yet. Please ask a programme administrator.</p>`;
    $("mentor-match-grid").innerHTML = msg;
    $("mentee-dashboard-content").innerHTML = msg;
    return;
  }
  if (state.menteeTab === "match") await renderMenteeMatching();
  else await renderMenteeDashboard();
}

async function renderMenteeMatching() {
  const grid = $("mentor-match-grid");
  const current = $("mentee-current-mentor");
  loading(grid, "Finding your best matches...");
  try {
    const [recs, dash] = await Promise.all([API.recommendations(state.user.profile_id, 10), API.menteeDashboard()]);
    current.innerHTML = dash.mentor
      ? `<div class="notice">You are matched with <strong>${esc(dash.mentor.mentor_name)}</strong> (${esc(dash.mentor.role_title)}, ${esc(dash.mentor.organisation)}). The list below shows how other mentors compare.</div>`
      : `<div class="notice">Recommendations are advisory — your programme manager confirms the final assignment so mentor capacity is respected.</div>`;
    renderMentorMatchCards(recs.recommendations, false);
  } catch (err) {
    showError(grid, err);
  }
}

function factorRows(factors) {
  return (factors || [])
    .map((f) => {
      const pct = f.max ? Math.round((f.points / f.max) * 100) : 0;
      return `<div class="factor">
        <div class="factor-top"><span>${esc(label(f.factor))}</span><span>${f.points}/${f.max}</span></div>
        <div class="factor-bar"><div style="width:${pct}%"></div></div>
        <small class="muted">${esc(f.detail)}</small>
      </div>`;
    })
    .join("");
}

// Shared by the mentee "Find a Mentor" tab and the admin "Match & Assign" tab
function renderMentorMatchCards(recs, withAssign, assignedMentorId, matchId, menteeId) {
  const grid = withAssign ? $("admin-recs") : $("mentor-match-grid");
  if (!grid) return;
  if (!recs.length) {
    grid.innerHTML = `<p class="muted">No active mentors available.</p>`;
    return;
  }
  grid.innerHTML = recs
    .map((r) => {
      const isCurrent = assignedMentorId === r.mentor_id;
      let action = "";
      if (withAssign && canWrite()) {
        action = isCurrent
          ? `<button class="btn-secondary" disabled>Current mentor</button>`
          : `<button class="${r.full ? "btn-danger" : "btn-primary"}" onclick="doAssign(${menteeId}, ${r.mentor_id}, ${matchId || "null"})">${matchId ? "Reassign" : "Assign"}${r.full ? " (over capacity)" : ""}</button>`;
      }
      return `
      <div class="card mentor-card ${r.full ? "full-capacity" : ""}">
        <div class="card-header">
          <h3>${esc(r.name)}</h3>
          <span class="match-badge">${r.score}% Match</span>
        </div>
        <p class="role-title"><strong>${esc(r.role_title)}</strong> at ${esc(r.organisation)}${r.location ? " · " + esc(r.location) : ""}</p>
        <p class="muted"><strong>Expertise:</strong> ${esc((r.expertise || []).join(", "))}</p>
        <p class="muted"><strong>Capacity:</strong> ${r.active_mentees} / ${r.capacity} mentees${r.full ? " — <span class=\"text-danger\">full</span>" : ""}</p>
        <div class="explainability-box">
          <strong>Why this match:</strong> ${esc(r.summary || "Limited overlap with the requested support areas")}
          <div class="factor-list">${factorRows(r.factors)}</div>
        </div>
        ${action ? `<div class="card-actions">${action}</div>` : ""}
      </div>`;
    })
    .join("");
}

async function renderMenteeDashboard() {
  const box = $("mentee-dashboard-content");
  loading(box);
  try {
    const d = await API.menteeDashboard();
    const p = d.progress;
    const mentorHTML = d.mentor
      ? `<p><strong>${esc(d.mentor.mentor_name)}</strong></p>
         <p class="muted">${esc(d.mentor.role_title)} at ${esc(d.mentor.organisation)}${d.mentor.sector ? " · " + esc(d.mentor.sector) : ""}</p>
         <p class="muted">Match score: ${d.mentor.score}%</p>
         <div class="card-actions"><button class="btn-primary" onclick="openBookSession(${d.mentor.match_id})">Request a session</button></div>`
      : `<p class="muted">${esc(d.message || "No mentor yet.")}</p>`;

    const upcoming = d.sessions.upcoming.length
      ? d.sessions.upcoming.map((s) => `
          <div class="session-item">
            <div><strong>${fmtDateTime(s.start_at)}</strong> ${badge(s.status)}<br><span class="muted">${esc(s.focus || "No focus set")}${s.mode ? " · " + esc(s.mode) : ""}</span></div>
            <div class="row-actions"><button class="btn-small btn-danger" onclick="changeSessionStatus(${s.id}, 'cancelled')">Cancel</button></div>
          </div>`).join("")
      : `<p class="muted">No upcoming sessions.</p>`;

    const recent = d.sessions.recent.length
      ? d.sessions.recent.map((s) => `
          <div class="session-item">
            <div><strong>${fmtDate(s.start_at)}</strong> · ${s.duration_min || 0} min<br>
              <span class="muted">${esc(s.focus || "—")}</span>
              ${s.guidance ? `<br><small>${esc(s.guidance)}</small>` : ""}
              ${s.follow_up_date ? `<br><small class="muted">Follow-up: ${fmtDate(s.follow_up_date)}</small>` : ""}</div>
            <div class="row-actions"><button class="btn-small btn-primary" onclick="openFeedback(${s.id}, 'mentee')">Give feedback</button></div>
          </div>`).join("")
      : `<p class="muted">No completed sessions yet.</p>`;

    box.innerHTML = `
      <div class="stats-overview">
        ${statCard(p.mentoring_hours + " hrs", "Mentoring hours")}
        ${statCard(p.sessions_completed, "Sessions completed")}
        ${statCard(p.action_completion_pct === null ? "—" : p.action_completion_pct + "%", `Actions done (${p.actions_completed}/${p.actions_total})`)}
        ${statCard(p.outcomes_achieved, "Outcomes achieved")}
      </div>
      <div class="dash-grid">
        <div class="panel-block"><h3>My Profile</h3>
          <p><strong>${esc(d.mentee.name)}</strong> · ${esc(d.mentee.programme)}</p>
          <p><strong>Goals:</strong> ${esc(d.mentee.goals || "—")}</p>
          <p><strong>Support needed:</strong> ${esc((d.mentee.needs || []).join(", ") || "—")}</p></div>
        <div class="panel-block"><h3>My Mentor</h3>${mentorHTML}</div>
        <div class="panel-block"><h3>Upcoming Sessions</h3>${upcoming}</div>
        <div class="panel-block"><h3>Past Sessions</h3>${recent}</div>
        <div class="panel-block panel-wide"><h3>My Actions</h3>${actionListHTML(d.actions.list)}</div>
        <div class="panel-block panel-wide"><h3>Development Outcomes</h3>${
          d.outcomes.length
            ? d.outcomes.map((o) => `<div class="session-item"><div><strong>${esc(o.description)}</strong><br><span class="muted">${esc(o.category || "")} · ${fmtDate(o.achieved_on)}</span></div></div>`).join("")
            : `<p class="muted">No outcomes recorded yet — your mentor records these as you progress.</p>`
        }</div>
      </div>`;
  } catch (err) {
    showError(box, err);
  }
}

const statCard = (value, text, cls = "") => `<div class="stat-card ${cls}"><h3>${esc(value)}</h3><p>${esc(text)}</p></div>`;

function actionListHTML(list, nameByMatch) {
  if (!list.length) return `<p class="muted">No actions yet.</p>`;
  return list.map((a) => `
    <div class="session-item">
      <div><strong>${esc(a.description)}</strong> ${badge(a.display_status)}<br>
        <span class="muted">Owner: ${esc(label(a.owner_role))} · Due ${fmtDate(a.due_date)}${nameByMatch && nameByMatch[a.match_id] ? " · " + esc(nameByMatch[a.match_id]) : ""}</span></div>
      <div class="row-actions">${
        a.status === "complete" ? "" : `
        ${a.status !== "in_progress" ? `<button class="btn-small btn-secondary" onclick="setActionStatus(${a.id}, 'in_progress')">Start</button>` : ""}
        <button class="btn-small btn-success" onclick="setActionStatus(${a.id}, 'complete')">Mark complete</button>`
      }</div>
    </div>`).join("");
}

async function setActionStatus(id, status) {
  try {
    await API.updateAction(id, { status });
    toast("Action updated", "success");
    await refreshCurrent();
  } catch (err) { toast(err.message, "error"); }
}

async function changeSessionStatus(id, status) {
  try {
    await API.setSessionStatus(id, status);
    toast(`Session ${label(status).toLowerCase()}`, "success");
    if (status === "completed") { await refreshCurrent(); return openNotes(id); }
    await refreshCurrent();
  } catch (err) { toast(err.message, "error"); }
}

// Mentees request; mentors schedule (confirmed straight away). Overlaps are rejected by the server.
function openBookSession(matchId) {
  const isMentor = state.user.role === "mentor";
  openModal(isMentor ? "Schedule a session" : "Request a session", `
    <label>Date &amp; time<input type="datetime-local" name="start" required /></label>
    <label>Duration<select name="minutes"><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60" selected>60 minutes</option><option value="90">90 minutes</option></select></label>
    <label>Mode<select name="mode"><option value="online">Online</option><option value="in-person">In person</option></select></label>
    <label>Session focus<input type="text" name="focus" placeholder="e.g. Pricing strategy" /></label>`,
    async (fd) => {
      const r = await API.createSession({
        match_id: matchId,
        start_at: localDateTimeToIso(fd.get("start")),
        end_at: localDateTimeToIso(fd.get("start"), Number(fd.get("minutes"))),
        mode: fd.get("mode"),
        focus: fd.get("focus") || null,
      });
      toast(r.status === "requested" ? "Session requested — waiting for your mentor to confirm" : "Session scheduled", "success");
      await refreshCurrent();
    }, isMentor ? "Schedule" : "Send request");
}

// Structured feedback from either side (one per role per completed session)
function openFeedback(sessionId, role) {
  const fields = role === "mentor"
    ? ratingSelect("a", "Mentee preparedness") + ratingSelect("b", "Engagement") + ratingSelect("c", "Progress made")
    : ratingSelect("a", "How useful was the session?") + ratingSelect("b", "Clarity of guidance") + ratingSelect("c", "Support received");
  const keys = role === "mentor" ? ["preparedness", "engagement", "progress"] : ["usefulness", "clarity", "support"];
  openModal(role === "mentor" ? "Mentor feedback" : "Session feedback", `${fields}
    <label>Comments<textarea name="comments" rows="3" placeholder="What went well? What could improve?"></textarea></label>`,
    async (fd) => {
      const scores = ["a", "b", "c"].map((k) => Number(fd.get(k)));
      const ratings = Object.fromEntries(keys.map((k, i) => [k, scores[i]]));
      const overall = Math.round(scores.reduce((x, y) => x + y, 0) / scores.length);
      await API.giveFeedback(sessionId, { rating: overall, ratings, comments: fd.get("comments") || null });
      toast("Thank you — feedback saved", "success");
    }, "Submit feedback");
}

/* ============================================================
   MENTOR PORTAL
   ============================================================ */
async function mentorSubTab(tab) {
  state.mentorTab = tab;
  setSubtab("mentor-view", "mentor", ["mentees", "sessions", "actions", "dashboard"], tab);
  await renderMentorPortal();
}

async function renderMentorPortal() {
  if (!state.user.profile_id) {
    $("assigned-mentees").innerHTML = `<p class="muted">Your mentor profile has not been set up yet. Please ask a programme administrator.</p>`;
    return;
  }
  try {
    state.mentorDash = await API.mentorDashboard();
  } catch (err) {
    showError($("assigned-mentees"), err);
    return;
  }
  const d = state.mentorDash;
  $("mentor-view-title").textContent = `${d.mentor.name}'s Portal`;
  $("mentor-view-sub").textContent = `${d.mentor.role_title} at ${d.mentor.organisation}`;
  renderCapacityBar(d.capacity);

  if (state.mentorTab === "mentees") renderAssignedMentees(d.mentees);
  else if (state.mentorTab === "sessions") await renderMentorSessions();
  else if (state.mentorTab === "actions") await renderMentorActions();
  else renderMentorDashboard(d);
}

function renderCapacityBar(c) {
  const el = $("capacity-indicator");
  if (!el) return;
  const pct = c.capacity ? Math.min(100, Math.round((c.active / c.capacity) * 100)) : 100;
  el.innerHTML = `
    <div class="capacity-info">
      <span><strong>Capacity:</strong> ${c.active} / ${c.capacity} mentees${c.full ? ` — <span class="text-danger">${c.active > c.capacity ? "over capacity (admin override)" : "at capacity"}</span>` : ` — ${c.remaining} place${c.remaining === 1 ? "" : "s"} free`}</span>
      <span>${pct}%</span>
    </div>
    <div class="progress-bar-bg"><div class="progress-bar-fill ${c.full ? "fill-full" : ""}" style="width:${pct}%;"></div></div>`;
}

function renderAssignedMentees(mentees) {
  const grid = $("assigned-mentees");
  if (!mentees.length) { grid.innerHTML = `<p class="muted">No mentees currently assigned to you.</p>`; return; }
  grid.innerHTML = mentees.map((m) => `
    <div class="card">
      <h3>${esc(m.name)}</h3>
      <p><strong>Programme:</strong> ${esc(m.programme)}</p>
      <p><strong>Goals:</strong> ${esc(m.goals || "—")}</p>
      <p class="muted">Sessions completed: ${m.sessions_completed} · Open actions: ${m.open_actions}</p>
      <p class="muted">Next session: ${m.next_session ? fmtDateTime(m.next_session) : "none booked"}</p>
      <div class="card-actions">
        <button class="btn-primary" onclick="openBookSession(${m.match_id})">Schedule session</button>
        <button class="btn-secondary" onclick="openOutcome(${m.match_id})">Record outcome</button>
      </div>
    </div>`).join("");
}

function openOutcome(matchId) {
  const m = ((state.mentorDash && state.mentorDash.mentees) || []).find((x) => x.match_id === matchId);
  openModal(`Development outcome${m ? " — " + m.name : ""}`, `
    <label>What was achieved?<textarea name="description" rows="3" required placeholder="e.g. Registered the company and opened a business account"></textarea></label>
    <label>Area<input type="text" name="category" placeholder="e.g. Finance &amp; Funding" /></label>
    <label>Date achieved<input type="date" name="date" value="${new Date().toISOString().slice(0, 10)}" /></label>`,
    async (fd) => {
      await API.addOutcome(matchId, { description: fd.get("description"), category: fd.get("category") || null, achieved_on: fd.get("date") });
      toast("Outcome recorded", "success");
      await refreshCurrent();
    }, "Record outcome");
}

async function renderMentorSessions() {
  const box = $("mentor-sessions-content");
  loading(box);
  try {
    const sessions = await API.sessions();
    const group = (title, list, actionsFn) => `
      <h3 class="list-title">${title} (${list.length})</h3>
      ${list.length ? list.map((s) => `
        <div class="request-card">
          <div><h4>${esc(s.mentee_name)} — ${fmtDateTime(s.start_at)}</h4>
            <p class="muted">${esc(s.focus || "No focus set")}${s.mode ? " · " + esc(s.mode) : ""} · ${badge(s.status)}${s.duration_min ? " · " + s.duration_min + " min" : ""}</p></div>
          <div class="request-actions">${actionsFn(s)}</div>
        </div>`).join("") : `<p class="muted">None.</p>`}`;

    const by = (st) => sessions.filter((s) => st.includes(s.status));
    box.innerHTML =
      group("Requests to confirm", by(["requested"]).sort((a, b) => a.start_at.localeCompare(b.start_at)), (s) => `
        <button class="btn-success" onclick="changeSessionStatus(${s.id}, 'confirmed')">Confirm</button>
        <button class="btn-danger" onclick="changeSessionStatus(${s.id}, 'cancelled')">Decline</button>`) +
      group("Confirmed sessions", by(["confirmed"]).sort((a, b) => a.start_at.localeCompare(b.start_at)), (s) => `
        <button class="btn-success" onclick="changeSessionStatus(${s.id}, 'completed')">Mark completed</button>
        <button class="btn-danger" onclick="changeSessionStatus(${s.id}, 'no_show')">No-show</button>
        <button class="btn-secondary" onclick="changeSessionStatus(${s.id}, 'cancelled')">Cancel</button>`) +
      group("Completed sessions", by(["completed"]).sort((a, b) => b.start_at.localeCompare(a.start_at)), (s) => `
        <button class="btn-primary" onclick="openNotes(${s.id})">Notes &amp; actions</button>
        <button class="btn-secondary" onclick="openFeedback(${s.id}, 'mentor')">Feedback</button>`) +
      group("Cancelled / no-show", by(["cancelled", "no_show"]).sort((a, b) => b.start_at.localeCompare(a.start_at)), () => "");
  } catch (err) { showError(box, err); }
}

// Record attendance, duration, focus, guidance, follow-up date and (optionally) a new agreed action
async function openNotes(sessionId) {
  let s;
  try { s = await API.session(sessionId); } catch (err) { return toast(err.message, "error"); }
  openModal(`Session notes — ${s.mentee_name}`, `
    <label>Attendance<select name="attendance"><option value="attended" ${s.attendance !== "absent" ? "selected" : ""}>Attended</option><option value="absent" ${s.attendance === "absent" ? "selected" : ""}>Absent</option></select></label>
    <label>Duration (minutes)<input type="number" name="duration" min="0" max="480" value="${s.duration_min ?? 60}" required /></label>
    <label>Session focus<input type="text" name="focus" value="${esc(s.focus || "")}" /></label>
    <label>Guidance given<textarea name="guidance" rows="3">${esc(s.guidance || "")}</textarea></label>
    <label>Follow-up date<input type="date" name="follow_up" value="${esc(s.follow_up_date || "")}" /></label>
    ${s.actions.length ? `<p class="muted">Existing actions: ${s.actions.map((a) => esc(a.description)).join("; ")}</p>` : ""}
    <fieldset><legend>Add an agreed action (optional)</legend>
      <label>Action<input type="text" name="action" placeholder="e.g. Draft a 3-month cash-flow forecast" /></label>
      <label>Owner<select name="owner"><option value="mentee">Mentee</option><option value="mentor">Mentor</option></select></label>
      <label>Due date<input type="date" name="due" /></label>
    </fieldset>`,
    async (fd) => {
      const action = (fd.get("action") || "").trim();
      if (action && !fd.get("due") && !fd.get("follow_up")) throw new Error("Please set a due date for the action.");
      await API.saveNotes(sessionId, {
        attendance: fd.get("attendance"),
        duration_min: Number(fd.get("duration")),
        focus: fd.get("focus"),
        guidance: fd.get("guidance"),
        follow_up_date: fd.get("follow_up") || undefined,
      });
      if (action) await API.addAction(sessionId, { description: action, owner_role: fd.get("owner"), due_date: fd.get("due") || fd.get("follow_up") });
      toast("Notes saved", "success");
      await refreshCurrent();
    }, "Save notes");
}

async function renderMentorActions() {
  const box = $("mentor-actions-content");
  loading(box);
  try {
    const actions = await API.actions();
    const names = Object.fromEntries((state.mentorDash.mentees || []).map((m) => [m.match_id, m.name]));
    box.innerHTML = actionListHTML(actions, names);
  } catch (err) { showError(box, err); }
}

function renderMentorDashboard(d) {
  const c = d.sessions.counts;
  const a = d.actions.counts;
  $("mentor-dashboard-content").innerHTML = `
    <div class="stats-overview">
      ${statCard(d.hours.total_hours + " hrs", "Total hours completed")}
      ${statCard(d.hours.this_month_hours + " hrs", "Hours this month")}
      ${statCard(c.completed, "Sessions conducted")}
      ${statCard(d.feedback_received.avg_rating ?? "N/A", `Avg. mentee feedback (${d.feedback_received.count})`)}
      ${statCard(a.overdue, "Overdue actions", a.overdue ? "stat-warn" : "")}
      ${statCard(d.outcomes_recorded, "Outcomes recorded")}
    </div>
    <div class="dash-grid">
      <div class="panel-block"><h3>Sessions by status</h3>${Object.entries(c).map(([k, v]) => `<p>${badge(k)} <strong>${v}</strong></p>`).join("")}</div>
      <div class="panel-block"><h3>Actions by status</h3>${Object.entries(a).map(([k, v]) => `<p>${badge(k)} <strong>${v}</strong></p>`).join("")}</div>
      <div class="panel-block panel-wide"><h3>Upcoming sessions</h3>${
        d.sessions.upcoming.length ? d.sessions.upcoming.map((s) => `<div class="session-item"><div><strong>${fmtDateTime(s.start_at)}</strong> — ${esc(s.mentee_name)} ${badge(s.status)}<br><span class="muted">${esc(s.focus || "")}</span></div></div>`).join("") : `<p class="muted">Nothing booked.</p>`
      }</div>
      <div class="panel-block panel-wide"><h3>Overdue actions</h3>${
        d.actions.overdue.length ? d.actions.overdue.map((x) => `<div class="session-item"><div><strong>${esc(x.description)}</strong><br><span class="muted">${esc(x.mentee_name)} · due ${fmtDate(x.due_date)}</span></div></div>`).join("") : `<p class="muted">Nothing overdue.</p>`
      }</div>
    </div>`;
}

/* ============================================================
   ADMIN PORTAL
   ============================================================ */
async function adminSubTab(tab) {
  state.adminTab = tab;
  setSubtab("admin-view", "admin", ["overview", "assign", "mentors"], tab);
  await renderAdminPortal();
}

async function renderAdminPortal() {
  if (state.adminTab === "overview") await renderAdminOverview();
  else if (state.adminTab === "assign") await renderAdminAssign();
  else await renderAdminMentors();
}

async function renderAdminOverview() {
  const box = $("admin-overview-content");
  const from = ($("filter-from") || {}).value;
  const to = ($("filter-to") || {}).value;
  if (!$("filter-from")) loading(box);
  try {
    const d = await API.adminDashboard(from, to);
    const c = d.sessions.counts;
    const maxH = Math.max(1, ...d.hours.by_month.map((m) => m.hours));
    box.innerHTML = `
      <div class="filter-row">
        <label>From <input type="date" id="filter-from" value="${esc(from || "")}" /></label>
        <label>To <input type="date" id="filter-to" value="${esc(to || "")}" /></label>
        <button class="btn-small btn-primary" onclick="renderAdminOverview()">Apply</button>
        <button class="btn-small btn-secondary" onclick="clearAdminFilter()">Clear</button>
      </div>
      <div class="stats-overview">
        ${statCard(d.hours.total_hours + " hrs", "Total mentoring hours")}
        ${statCard(d.totals.active_matches, "Active matches")}
        ${statCard(c.completed, "Sessions completed")}
        ${statCard(c.no_show + (d.sessions.no_show_rate_pct === null ? "" : ` (${d.sessions.no_show_rate_pct}%)`), "No-shows", c.no_show ? "stat-warn" : "")}
        ${statCard(d.totals.mentors.active + " / " + d.totals.mentors.total, "Active mentors")}
        ${statCard(d.totals.mentees.matched + " / " + d.totals.mentees.total, "Mentees matched")}
        ${statCard(d.totals.mentors_at_capacity, "Mentors at capacity")}
        ${statCard(c.requested + c.confirmed, "Sessions booked")}
      </div>
      <div class="dash-grid">
        <div class="panel-block"><h3>Sessions by status</h3>${Object.entries(c).map(([k, v]) => `<p>${badge(k)} <strong>${v}</strong></p>`).join("")}</div>
        <div class="panel-block"><h3>Actions by status</h3>${Object.entries(d.actions).map(([k, v]) => `<p>${badge(k)} <strong>${v}</strong></p>`).join("")}</div>
        <div class="panel-block"><h3>Hours by month</h3>${
          d.hours.by_month.length ? d.hours.by_month.map((m) => `<div class="bar-row"><span>${esc(m.month)}</span><div class="factor-bar"><div style="width:${Math.round((m.hours / maxH) * 100)}%"></div></div><span>${m.hours} h</span></div>`).join("") : `<p class="muted">No completed sessions in this period.</p>`
        }</div>
        <div class="panel-block"><h3>Feedback averages</h3>${
          d.feedback_averages.length ? d.feedback_averages.map((f) => `<p>${esc(label(f.from_role))}: <strong>${f.avg_rating}</strong> / 5 <span class="muted">(${f.count} responses)</span></p>`).join("") : `<p class="muted">No feedback yet.</p>`
        }</div>
        <div class="panel-block panel-wide"><h3>Requested expertise vs supply</h3>
          <table class="data-table"><thead><tr><th>Expertise</th><th>Requested</th><th>By unmatched</th><th>Mentors offering</th></tr></thead><tbody>
          ${d.requested_expertise.map((e) => `<tr><td>${esc(e.category)}</td><td>${e.requested}</td><td class="${e.requested_by_unmatched > e.mentors_offering ? "text-danger" : ""}">${e.requested_by_unmatched}</td><td>${e.mentors_offering}</td></tr>`).join("")}
          </tbody></table></div>
        <div class="panel-block"><h3>Mentees without a mentor (${d.attention.unmatched_mentees.length})</h3>${
          d.attention.unmatched_mentees.length ? d.attention.unmatched_mentees.map((m) => `<p>${esc(m.name)} <span class="muted">· ${esc(m.programme)}</span></p>`).join("") : `<p class="muted">Everyone is matched.</p>`
        }</div>
        <div class="panel-block"><h3>Stalled relationships (${d.attention.stalled_matches.length})</h3>${
          d.attention.stalled_matches.length ? d.attention.stalled_matches.map((m) => `<p>${esc(m.mentee_name)} ↔ ${esc(m.mentor_name)} <span class="muted">· last session ${fmtDate(m.last_completed_session)}</span></p>`).join("") : `<p class="muted">No relationships stalling (no session in 30 days and none booked).</p>`
        }</div>
      </div>`;
  } catch (err) { showError(box, err); }
}
function clearAdminFilter() { $("filter-from").value = ""; $("filter-to").value = ""; renderAdminOverview(); }

async function renderAdminMentors() {
  const box = $("admin-mentors-content");
  loading(box);
  try {
    const d = await API.adminDashboard();
    box.innerHTML = `<table class="data-table"><thead><tr><th>Mentor</th><th>Status</th><th>Capacity</th><th>Hours</th><th>Completed</th><th>No-shows</th></tr></thead><tbody>
      ${d.mentors.map((m) => {
        const pct = m.capacity ? Math.min(100, Math.round((m.active_mentees / m.capacity) * 100)) : 100;
        return `<tr><td>${esc(m.name)}</td><td>${badge(m.status)}</td>
          <td><div class="bar-row"><div class="progress-bar-bg"><div class="progress-bar-fill ${m.full ? "fill-full" : ""}" style="width:${pct}%"></div></div><span>${m.active_mentees}/${m.capacity}${m.active_mentees > m.capacity ? " over" : m.full ? " full" : ""}</span></div></td>
          <td>${m.hours}</td><td>${m.completed_sessions}</td><td class="${m.no_shows ? "text-danger" : ""}">${m.no_shows}</td></tr>`;
      }).join("")}</tbody></table>`;
  } catch (err) { showError(box, err); }
}

// Match & Assign: pick a mentee, see explainable recommendations, assign / reassign with a capacity guard
async function renderAdminAssign() {
  const box = $("admin-assign-content");
  loading(box);
  try {
    const [mentees, mentors] = await Promise.all([API.mentees(), API.mentors()]);
    if (!state.adminMenteeId || !mentees.some((m) => m.id === state.adminMenteeId)) state.adminMenteeId = mentees[0] && mentees[0].id;
    const mentee = mentees.find((m) => m.id === state.adminMenteeId);
    if (!mentee) { box.innerHTML = `<p class="muted">No mentees found.</p>`; return; }
    const mentorName = (id) => (mentors.find((m) => m.id === id) || {}).name || "Unknown";

    box.innerHTML = `
      <div class="filter-row">
        <label>Mentee
          <select id="admin-mentee-select" onchange="onAdminMenteeChange()">${optionList(mentees, (m) => m.id, (m) => `${m.name} — ${m.active_match ? "matched" : "no mentor"}`, state.adminMenteeId)}</select>
        </label>
      </div>
      <div class="notice"><strong>${esc(mentee.name)}</strong> · ${esc(mentee.programme)} · Needs: ${esc((mentee.needs || []).join(", ") || "—")}<br>
        Goals: ${esc(mentee.goals || "—")}<br>
        ${mentee.active_match ? `Current mentor: <strong>${esc(mentorName(mentee.active_match.mentor_id))}</strong>` : `No mentor assigned yet.`}
        ${isCoach() ? `<br><span class="muted">Read-only: coaches can review matches but not change assignments.</span>` : ""}</div>
      <div id="admin-recs" class="cards-grid"></div>`;
    const recs = await API.recommendations(mentee.id, 10);
    state.adminRecs = recs.recommendations;
    renderMentorMatchCards(recs.recommendations, true, mentee.active_match && mentee.active_match.mentor_id, mentee.active_match && mentee.active_match.id, mentee.id);
  } catch (err) { showError(box, err); }
}
function onAdminMenteeChange() { state.adminMenteeId = Number($("admin-mentee-select").value); renderAdminAssign(); }

// Assign / reassign. If the mentor is full the server blocks it; the admin may override with a written reason.
async function doAssign(menteeId, mentorId, matchId) {
  const call = (override, reason) => (matchId ? API.reassign(matchId, mentorId, override, reason) : API.assign(menteeId, mentorId, override, reason));
  try {
    const r = await call(false);
    toast(r.warning || "Mentor assigned", r.warning ? "info" : "success");
    await renderAdminAssign();
  } catch (err) {
    if (err.code === "capacity_reached") {
      const rec = (state.adminRecs || []).find((x) => x.mentor_id === mentorId);
      openModal("Mentor is at capacity", `
        <p><strong>${esc(rec ? rec.name : "This mentor")}</strong> already has ${err.body.active}/${err.body.capacity} mentees. Assigning another would over-allocate them.</p>
        <label>Reason for overriding<textarea name="reason" rows="3" required placeholder="Why is this exception justified?"></textarea></label>`,
        async (fd) => {
          const r = await call(true, fd.get("reason"));
          toast(r.warning || "Assigned with override", "info");
          await renderAdminAssign();
        }, "Assign anyway");
    } else {
      toast(err.message, "error");
    }
  }
}

/* ============================================================
   REFRESH + INIT
   ============================================================ */
async function refreshCurrent() {
  if (state.role) await switchRole(state.role);
}

document.addEventListener("DOMContentLoaded", async () => {
  onUnauthorized = () => {
    if (state.user) { toast("Your session expired — please sign in again.", "error"); handleLogout(); }
  };
  const stored = Auth.user();
  if (stored) {
    try {
      const user = await API.me();
      await enterApp(user);
      return;
    } catch { API.logout(); }
  }
  $("login-screen").classList.remove("hidden");
});
