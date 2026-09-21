PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('mentor','mentee','admin','coach'))
);

CREATE TABLE IF NOT EXISTS expertise_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS mentors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  role_title TEXT,
  organisation TEXT,
  sector TEXT,
  years_experience INTEGER DEFAULT 0,
  languages TEXT DEFAULT '',            -- comma separated, e.g. 'English,isiZulu'
  modes TEXT DEFAULT 'online',          -- comma separated: online,in-person
  location TEXT,
  capacity INTEGER NOT NULL DEFAULT 3 CHECK (capacity >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','inactive')),
  bio TEXT
);

CREATE TABLE IF NOT EXISTS mentees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  programme TEXT,
  interests TEXT,
  goals TEXT,
  languages TEXT DEFAULT '',
  preferred_mode TEXT NOT NULL DEFAULT 'either' CHECK (preferred_mode IN ('online','in-person','either')),
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','withdrawn'))
);

CREATE TABLE IF NOT EXISTS mentor_expertise (
  mentor_id INTEGER NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES expertise_categories(id),
  PRIMARY KEY (mentor_id, category_id)
);

CREATE TABLE IF NOT EXISTS mentee_needs (
  mentee_id INTEGER NOT NULL REFERENCES mentees(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES expertise_categories(id),
  PRIMARY KEY (mentee_id, category_id)
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('mentor','mentee')),
  owner_id INTEGER NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),   -- 0 = Sunday
  start_time TEXT NOT NULL,                                    -- 'HH:MM'
  end_time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mentee_id INTEGER NOT NULL REFERENCES mentees(id),
  mentor_id INTEGER NOT NULL REFERENCES mentors(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  score INTEGER,
  explanation TEXT,                     -- JSON: per-factor breakdown at time of assignment
  override_reason TEXT,                 -- set when an admin assigns beyond capacity
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT
);
-- a mentee can only have one active mentor at a time
CREATE UNIQUE INDEX IF NOT EXISTS one_active_match_per_mentee
  ON matches(mentee_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES matches(id),
  start_at TEXT NOT NULL,               -- ISO 8601 UTC
  end_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','confirmed','completed','cancelled','no_show')),
  mode TEXT,
  attendance TEXT CHECK (attendance IN ('attended','absent')),
  duration_min INTEGER,
  focus TEXT,
  guidance TEXT,
  follow_up_date TEXT
);

CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  description TEXT NOT NULL,
  owner_role TEXT NOT NULL CHECK (owner_role IN ('mentor','mentee')),
  due_date TEXT NOT NULL,               -- 'YYYY-MM-DD'
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','complete')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  from_role TEXT NOT NULL CHECK (from_role IN ('mentor','mentee')),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  ratings_json TEXT,
  comments TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (session_id, from_role)
);

CREATE TABLE IF NOT EXISTS outcomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES matches(id),
  description TEXT NOT NULL,
  category TEXT,
  achieved_on TEXT
);
