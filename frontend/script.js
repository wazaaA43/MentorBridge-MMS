/* ============================================================
   MENTORBRIDGE — API CLIENT
   Talks to the Mentor Management backend (Node + Express).
   - Real email/password login; the JWT is kept in sessionStorage.
   - Every request sends the token; a 401 signs the user out.
   - Errors are thrown as ApiError (status, code, message, body)
     so screens can react to e.g. "capacity_reached" or
     "double_booking".
   ============================================================ */

// Where the backend lives. Override with <script>window.MENTORBRIDGE_API_URL="..."</script> before this file.
const API_BASE =
  window.MENTORBRIDGE_API_URL ||
  (["localhost", "127.0.0.1"].includes(location.hostname)
    ? "http://localhost:3000"
    : "https://MentorBridge-MMS.onrender.com");

const SESSION_KEY = "mentorbridge.session";

const Auth = {
  get() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; } },
  save(token, user) { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, user })); },
  clear() { sessionStorage.removeItem(SESSION_KEY); },
  token() { const s = this.get(); return s ? s.token : null; },
  user() { const s = this.get(); return s ? s.user : null; },
};

class ApiError extends Error {
  constructor(status, body) {
    super((body && (body.message || body.error)) || `Request failed (${status})`);
    this.status = status;
    this.code = body && body.error;
    this.body = body || {};
  }
}

// app.js sets this so an expired/invalid token returns the user to the login screen
let onUnauthorized = null;

async function request(method, path, body, query) {
  const url = new URL(API_BASE + path);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
  }
  const headers = {};
  const token = Auth.token();
  if (token) headers.Authorization = "Bearer " + token;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(url.toString(), { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, {
      error: "network",
      message: "Cannot reach the server. If it has been idle, the free host can take up to a minute to wake up — please try again shortly.",
    });
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 && path !== "/auth/login" && onUnauthorized) onUnauthorized();
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

const API = {
  // ----- auth -----
  async login(email, password) {
    const d = await request("POST", "/auth/login", { email, password });
    Auth.save(d.token, d.user);
    return d.user;
  },
  me: () => request("GET", "/auth/me"),
  logout() { Auth.clear(); },

  // ----- lookups & profiles -----
  categories: () => request("GET", "/expertise-categories"),
  mentors: () => request("GET", "/mentors"),
  mentees: () => request("GET", "/mentees"),

  // ----- matching, assignment & capacity -----
  recommendations: (menteeId, limit = 10) => request("GET", `/mentees/${menteeId}/recommendations`, undefined, { limit }),
  matches: (status) => request("GET", "/matches", undefined, { status }),
  assign: (menteeId, mentorId, override, reason) =>
    request("POST", "/matches", { mentee_id: menteeId, mentor_id: mentorId, override: !!override, override_reason: reason }),
  reassign: (matchId, mentorId, override, reason) =>
    request("PUT", `/matches/${matchId}/reassign`, { mentor_id: mentorId, override: !!override, override_reason: reason }),
  addOutcome: (matchId, data) => request("POST", `/matches/${matchId}/outcomes`, data),

  // ----- sessions, notes, actions, feedback -----
  sessions: (query) => request("GET", "/sessions", undefined, query),
  session: (id) => request("GET", `/sessions/${id}`),
  createSession: (data) => request("POST", "/sessions", data),
  setSessionStatus: (id, status) => request("PUT", `/sessions/${id}/status`, { status }),
  saveNotes: (id, data) => request("PUT", `/sessions/${id}/notes`, data),
  addAction: (sessionId, data) => request("POST", `/sessions/${sessionId}/actions`, data),
  actions: (status) => request("GET", "/actions", undefined, { status }),
  updateAction: (id, data) => request("PUT", `/actions/${id}`, data),
  giveFeedback: (sessionId, data) => request("POST", `/sessions/${sessionId}/feedback`, data),

  // ----- dashboards (mentor/mentee ignore the id and return their own data) -----
  mentorDashboard: (mentorId) => request("GET", "/dashboard/mentor", undefined, { mentor_id: mentorId }),
  menteeDashboard: (menteeId) => request("GET", "/dashboard/mentee", undefined, { mentee_id: menteeId }),
  adminDashboard: (from, to) => request("GET", "/dashboard/admin", undefined, { from, to }),
};
