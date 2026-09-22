-- ============================================================
-- MENTORBRIDGE database — matches the live backend exactly
-- Generated from backend/src/schema.sql + backend/src/seed.js
-- Engine: SQLite (this is what backend/src/db.js actually runs)
-- ============================================================

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

-- 32 rows
INSERT INTO users (id, name, email, password_hash, role) VALUES
(1, 'Programme Admin', 'admin@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'admin'),
(2, 'Programme Coach', 'coach@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'coach'),
(3, 'Thandi Mokoena', 'thandi.mokoena@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentor'),
(4, 'Pieter van der Merwe', 'pieter.van.der.merwe@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentor'),
(5, 'Naledi Sithole', 'naledi.sithole@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentor'),
(6, 'Sipho Dlamini', 'sipho.dlamini@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentor'),
(7, 'Ayesha Patel', 'ayesha.patel@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentor'),
(8, 'Lerato Molefe', 'lerato.molefe@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentor'),
(9, 'Johan Botha', 'johan.botha@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentor'),
(10, 'Zanele Khumalo', 'zanele.khumalo@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentor'),
(11, 'Michael Naidoo', 'michael.naidoo@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentor'),
(12, 'Refilwe Nkosi', 'refilwe.nkosi@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentor'),
(13, 'Kagiso Mahlangu', 'kagiso.mahlangu@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(14, 'Lindiwe Zulu', 'lindiwe.zulu@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(15, 'Ethan Jacobs', 'ethan.jacobs@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(16, 'Palesa Radebe', 'palesa.radebe@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(17, 'Sanele Ndlovu', 'sanele.ndlovu@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(18, 'Amira Hassan', 'amira.hassan@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(19, 'Thabo Sekgoma', 'thabo.sekgoma@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(20, 'Megan Pillay', 'megan.pillay@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(21, 'Bongani Cele', 'bongani.cele@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(22, 'Zodwa Mthembu', 'zodwa.mthembu@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(23, 'Ruan Steyn', 'ruan.steyn@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(24, 'Nomsa Buthelezi', 'nomsa.buthelezi@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(25, 'Tshepo Maseko', 'tshepo.maseko@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(26, 'Fatima Moosa', 'fatima.moosa@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(27, 'Liam O''Connor', 'liam.oconnor@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(28, 'Ayanda Ngcobo', 'ayanda.ngcobo@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(29, 'Karabo Mokwena', 'karabo.mokwena@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(30, 'Chloe Adams', 'chloe.adams@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(31, 'Sizwe Dube', 'sizwe.dube@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee'),
(32, 'Precious Maluleke', 'precious.maluleke@example.com', '$2a$10$K3nJq8mJ4jGZ6y1QwXwL6uJZ8oQ9E0mZ1v3cQ7fL2xW4nB9rP0sHy', 'mentee');

-- 8 rows
INSERT INTO expertise_categories (id, name) VALUES
(1, 'Business Strategy'),
(2, 'Finance & Funding'),
(3, 'Marketing & Sales'),
(4, 'Leadership'),
(5, 'Technology & Digital'),
(6, 'Operations & Supply Chain'),
(7, 'Legal & Compliance'),
(8, 'Career Development');

-- 10 rows
INSERT INTO mentors (id, user_id, role_title, organisation, sector, years_experience, languages, modes, location, capacity, status, bio) VALUES
(1, 3, 'Senior Financial Manager', 'Nedbank', 'Finance', 15, 'English,isiZulu', 'online,in-person', 'Johannesburg', 2, 'active', NULL),
(2, 4, 'Supply Chain Director', 'Barloworld', 'Logistics', 20, 'English,Afrikaans', 'online,in-person', 'Pretoria', 3, 'active', NULL),
(3, 5, 'Head of Marketing', 'Takealot', 'Retail', 12, 'English,Sesotho', 'online', 'Johannesburg', 4, 'active', NULL),
(4, 6, 'Engineering Manager', 'Discovery', 'Technology', 14, 'English,isiZulu', 'online,in-person', 'Pretoria', 3, 'active', NULL),
(5, 7, 'Corporate Lawyer', 'Bowmans', 'Legal', 11, 'English', 'online', 'Durban', 2, 'active', NULL),
(6, 8, 'HR & Talent Executive', 'Sasol', 'Energy', 18, 'English,Setswana', 'online,in-person', 'Pretoria', 3, 'active', NULL),
(7, 9, 'Founder & CFO', 'Cape Agri Group', 'Agriculture', 22, 'English,Afrikaans', 'in-person', 'Cape Town', 2, 'active', NULL),
(8, 10, 'Digital Growth Lead', 'Yoco', 'Fintech', 9, 'English,isiZulu', 'online', 'Durban', 4, 'active', NULL),
(9, 11, 'Strategy Consultant', 'Deloitte', 'Consulting', 16, 'English', 'online,in-person', 'Johannesburg', 3, 'active', NULL),
(10, 12, 'Careers Coach', 'Independent', 'Education', 10, 'English,Setswana,Sesotho', 'online', 'Pretoria', 3, 'paused', NULL);

-- 20 rows
INSERT INTO mentees (id, user_id, programme, interests, goals, languages, preferred_mode, location, status) VALUES
(1, 13, 'Entrepreneurship Accelerator', 'Finance & Funding, Marketing & Sales', 'Launch a small catering business', 'English,Setswana', 'online', 'Pretoria', 'active'),
(2, 14, 'Entrepreneurship Accelerator', 'Legal & Compliance, Finance & Funding', 'Register a company and understand tax', 'English,isiZulu', 'either', 'Johannesburg', 'active'),
(3, 15, 'Graduate Development', 'Operations & Supply Chain, Career Development', 'Move into a supply chain role', 'English,Afrikaans', 'in-person', 'Cape Town', 'active'),
(4, 16, 'Youth Leadership', 'Leadership, Business Strategy', 'Lead a community project', 'English,Sesotho', 'online', 'Johannesburg', 'active'),
(5, 17, 'Graduate Development', 'Technology & Digital, Career Development', 'Break into software development', 'English,isiZulu', 'online', 'Durban', 'active'),
(6, 18, 'Entrepreneurship Accelerator', 'Marketing & Sales, Technology & Digital', 'Grow an online clothing brand', 'English', 'online', 'Durban', 'active'),
(7, 19, 'Graduate Development', 'Leadership, Career Development', 'Prepare for a management track', 'English,Setswana', 'either', 'Pretoria', 'active'),
(8, 20, 'Entrepreneurship Accelerator', 'Finance & Funding, Business Strategy', 'Secure a first round of funding', 'English', 'in-person', 'Johannesburg', 'active'),
(9, 21, 'Youth Leadership', 'Leadership', 'Build confidence leading teams', 'English,isiZulu', 'either', 'Durban', 'active'),
(10, 22, 'Entrepreneurship Accelerator', 'Operations & Supply Chain, Business Strategy', 'Improve logistics for a courier start-up', 'English,isiZulu', 'online', 'Pretoria', 'active'),
(11, 23, 'Graduate Development', 'Legal & Compliance, Technology & Digital', 'Explore legal-tech careers', 'English,Afrikaans', 'online', 'Cape Town', 'active'),
(12, 24, 'Entrepreneurship Accelerator', 'Finance & Funding, Operations & Supply Chain', 'Price products and manage cash flow', 'English,isiZulu', 'either', 'Johannesburg', 'active'),
(13, 25, 'Youth Leadership', 'Leadership, Career Development', 'Public speaking and mentoring peers', 'English,Setswana,Sesotho', 'either', 'Pretoria', 'active'),
(14, 26, 'Graduate Development', 'Marketing & Sales, Career Development', 'Land a first marketing role', 'English', 'online', 'Durban', 'active'),
(15, 27, 'Entrepreneurship Accelerator', 'Business Strategy, Finance & Funding', 'Turn a side hustle into a company', 'English,Afrikaans', 'in-person', 'Cape Town', 'active'),
(16, 28, 'Youth Leadership', 'Technology & Digital, Leadership', 'Start a youth coding club', 'English,isiZulu', 'online', 'Durban', 'active'),
(17, 29, 'Graduate Development', 'Business Strategy, Career Development', 'Plan a career pivot into consulting', 'English,Setswana', 'either', 'Pretoria', 'active'),
(18, 30, 'Entrepreneurship Accelerator', 'Legal & Compliance, Operations & Supply Chain', 'Meet compliance rules for a food business', 'English', 'online', 'Johannesburg', 'active'),
(19, 31, 'Graduate Development', 'Career Development, Marketing & Sales', 'Improve interview and networking skills', 'English,isiZulu', 'online', 'Johannesburg', 'active'),
(20, 32, 'Entrepreneurship Accelerator', 'Business Strategy, Marketing & Sales', 'Build a business plan', 'English,Sesotho', 'either', 'Pretoria', 'active');

-- 20 rows
INSERT INTO mentor_expertise (mentor_id, category_id) VALUES
(1, 2),
(1, 1),
(2, 6),
(2, 1),
(3, 3),
(3, 8),
(4, 5),
(4, 4),
(5, 7),
(5, 1),
(6, 4),
(6, 8),
(7, 2),
(7, 6),
(8, 3),
(8, 5),
(9, 1),
(9, 7),
(10, 8),
(10, 4);

-- 39 rows
INSERT INTO mentee_needs (mentee_id, category_id) VALUES
(1, 2),
(1, 3),
(2, 7),
(2, 2),
(3, 6),
(3, 8),
(4, 4),
(4, 1),
(5, 5),
(5, 8),
(6, 3),
(6, 5),
(7, 4),
(7, 8),
(8, 2),
(8, 1),
(9, 4),
(10, 6),
(10, 1),
(11, 7),
(11, 5),
(12, 2),
(12, 6),
(13, 4),
(13, 8),
(14, 3),
(14, 8),
(15, 1),
(15, 2),
(16, 5),
(16, 4),
(17, 1),
(17, 8),
(18, 7),
(18, 6),
(19, 8),
(19, 3),
(20, 1),
(20, 3);

-- 100 rows
INSERT INTO availability_slots (id, owner_type, owner_id, weekday, start_time, end_time) VALUES
(1, 'mentor', 1, 1, '09:00', '12:00'),
(2, 'mentor', 1, 2, '13:00', '17:00'),
(3, 'mentor', 1, 3, '17:00', '19:00'),
(4, 'mentor', 1, 4, '09:00', '12:00'),
(5, 'mentor', 2, 2, '13:00', '17:00'),
(6, 'mentor', 2, 3, '17:00', '19:00'),
(7, 'mentor', 2, 4, '09:00', '12:00'),
(8, 'mentor', 2, 5, '13:00', '17:00'),
(9, 'mentor', 3, 3, '17:00', '19:00'),
(10, 'mentor', 3, 4, '09:00', '12:00'),
(11, 'mentor', 3, 5, '13:00', '17:00'),
(12, 'mentor', 3, 1, '17:00', '19:00'),
(13, 'mentor', 4, 4, '09:00', '12:00'),
(14, 'mentor', 4, 5, '13:00', '17:00'),
(15, 'mentor', 4, 1, '17:00', '19:00'),
(16, 'mentor', 4, 2, '09:00', '12:00'),
(17, 'mentor', 5, 5, '13:00', '17:00'),
(18, 'mentor', 5, 1, '17:00', '19:00'),
(19, 'mentor', 5, 2, '09:00', '12:00'),
(20, 'mentor', 5, 3, '13:00', '17:00'),
(21, 'mentor', 6, 1, '17:00', '19:00'),
(22, 'mentor', 6, 2, '09:00', '12:00'),
(23, 'mentor', 6, 3, '13:00', '17:00'),
(24, 'mentor', 6, 4, '17:00', '19:00'),
(25, 'mentor', 7, 2, '09:00', '12:00'),
(26, 'mentor', 7, 3, '13:00', '17:00'),
(27, 'mentor', 7, 4, '17:00', '19:00'),
(28, 'mentor', 7, 5, '09:00', '12:00'),
(29, 'mentor', 8, 3, '13:00', '17:00'),
(30, 'mentor', 8, 4, '17:00', '19:00'),
(31, 'mentor', 8, 5, '09:00', '12:00'),
(32, 'mentor', 8, 1, '13:00', '17:00'),
(33, 'mentor', 9, 4, '17:00', '19:00'),
(34, 'mentor', 9, 5, '09:00', '12:00'),
(35, 'mentor', 9, 1, '13:00', '17:00'),
(36, 'mentor', 9, 2, '17:00', '19:00'),
(37, 'mentor', 10, 5, '09:00', '12:00'),
(38, 'mentor', 10, 1, '13:00', '17:00'),
(39, 'mentor', 10, 2, '17:00', '19:00'),
(40, 'mentor', 10, 3, '09:00', '12:00'),
(41, 'mentee', 1, 1, '09:00', '12:00'),
(42, 'mentee', 1, 3, '13:00', '17:00'),
(43, 'mentee', 1, 5, '17:00', '19:00'),
(44, 'mentee', 2, 2, '13:00', '17:00'),
(45, 'mentee', 2, 4, '17:00', '19:00'),
(46, 'mentee', 2, 1, '09:00', '12:00'),
(47, 'mentee', 3, 3, '17:00', '19:00'),
(48, 'mentee', 3, 5, '09:00', '12:00'),
(49, 'mentee', 3, 2, '13:00', '17:00'),
(50, 'mentee', 4, 4, '09:00', '12:00'),
(51, 'mentee', 4, 1, '13:00', '17:00'),
(52, 'mentee', 4, 3, '17:00', '19:00'),
(53, 'mentee', 5, 5, '13:00', '17:00'),
(54, 'mentee', 5, 2, '17:00', '19:00'),
(55, 'mentee', 5, 4, '09:00', '12:00'),
(56, 'mentee', 6, 1, '17:00', '19:00'),
(57, 'mentee', 6, 3, '09:00', '12:00'),
(58, 'mentee', 6, 5, '13:00', '17:00'),
(59, 'mentee', 7, 2, '09:00', '12:00'),
(60, 'mentee', 7, 4, '13:00', '17:00'),
(61, 'mentee', 7, 1, '17:00', '19:00'),
(62, 'mentee', 8, 3, '13:00', '17:00'),
(63, 'mentee', 8, 5, '17:00', '19:00'),
(64, 'mentee', 8, 2, '09:00', '12:00'),
(65, 'mentee', 9, 4, '17:00', '19:00'),
(66, 'mentee', 9, 1, '09:00', '12:00'),
(67, 'mentee', 9, 3, '13:00', '17:00'),
(68, 'mentee', 10, 5, '09:00', '12:00'),
(69, 'mentee', 10, 2, '13:00', '17:00'),
(70, 'mentee', 10, 4, '17:00', '19:00'),
(71, 'mentee', 11, 1, '13:00', '17:00'),
(72, 'mentee', 11, 3, '17:00', '19:00'),
(73, 'mentee', 11, 5, '09:00', '12:00'),
(74, 'mentee', 12, 2, '17:00', '19:00'),
(75, 'mentee', 12, 4, '09:00', '12:00'),
(76, 'mentee', 12, 1, '13:00', '17:00'),
(77, 'mentee', 13, 3, '09:00', '12:00'),
(78, 'mentee', 13, 5, '13:00', '17:00'),
(79, 'mentee', 13, 2, '17:00', '19:00'),
(80, 'mentee', 14, 4, '13:00', '17:00'),
(81, 'mentee', 14, 1, '17:00', '19:00'),
(82, 'mentee', 14, 3, '09:00', '12:00'),
(83, 'mentee', 15, 5, '17:00', '19:00'),
(84, 'mentee', 15, 2, '09:00', '12:00'),
(85, 'mentee', 15, 4, '13:00', '17:00'),
(86, 'mentee', 16, 1, '09:00', '12:00'),
(87, 'mentee', 16, 3, '13:00', '17:00'),
(88, 'mentee', 16, 5, '17:00', '19:00'),
(89, 'mentee', 17, 2, '13:00', '17:00'),
(90, 'mentee', 17, 4, '17:00', '19:00'),
(91, 'mentee', 17, 1, '09:00', '12:00'),
(92, 'mentee', 18, 3, '17:00', '19:00'),
(93, 'mentee', 18, 5, '09:00', '12:00'),
(94, 'mentee', 18, 2, '13:00', '17:00'),
(95, 'mentee', 19, 4, '09:00', '12:00'),
(96, 'mentee', 19, 1, '13:00', '17:00'),
(97, 'mentee', 19, 3, '17:00', '19:00'),
(98, 'mentee', 20, 5, '13:00', '17:00'),
(99, 'mentee', 20, 2, '17:00', '19:00'),
(100, 'mentee', 20, 4, '09:00', '12:00');

-- 10 rows
INSERT INTO matches (id, mentee_id, mentor_id, status, score, explanation, override_reason, assigned_at, ended_at) VALUES
(1, 1, 1, 'active', 67, '{"summary":"Covers Finance & Funding (1 of 2 support areas). Shared language: English. Mentor offers online sessions","factors":[{"factor":"expertise","points":20,"max":40,"detail":"Covers Finance & Funding (1 of 2 support areas)"},{"factor":"availability","points":7,"max":20,"detail":"Both free on Mon"},{"factor":"language","points":15,"max":15,"detail":"Shared language: English"},{"factor":"mode","points":10,"max":10,"detail":"Mentor offers online sessions"},{"factor":"capacity","points":15,"max":15,"detail":"2 of 2 places free"}]}', NULL, '2026-08-13T09:00:00.000Z', NULL),
(2, 2, 1, 'active', 66, '{"summary":"Covers Finance & Funding (1 of 2 support areas). Shared language: English, isiZulu. Both free on Mon, Tue","factors":[{"factor":"expertise","points":20,"max":40,"detail":"Covers Finance & Funding (1 of 2 support areas)"},{"factor":"availability","points":13,"max":20,"detail":"Both free on Mon, Tue"},{"factor":"language","points":15,"max":15,"detail":"Shared language: English, isiZulu"},{"factor":"mode","points":10,"max":10,"detail":"Mentee is flexible on mode"},{"factor":"capacity","points":8,"max":15,"detail":"1 of 2 places free"}]}', NULL, '2026-08-13T09:00:00.000Z', NULL),
(3, 3, 2, 'active', 67, '{"summary":"Covers Operations & Supply Chain (1 of 2 support areas). Shared language: English, Afrikaans. Both free on Tue, Wed","factors":[{"factor":"expertise","points":20,"max":40,"detail":"Covers Operations & Supply Chain (1 of 2 support areas)"},{"factor":"availability","points":13,"max":20,"detail":"Both free on Tue, Wed"},{"factor":"language","points":15,"max":15,"detail":"Shared language: English, Afrikaans"},{"factor":"mode","points":4,"max":10,"detail":"Offers in-person but is based in Pretoria"},{"factor":"capacity","points":15,"max":15,"detail":"3 of 3 places free"}]}', NULL, '2026-08-13T09:00:00.000Z', NULL),
(4, 10, 2, 'active', 82, '{"summary":"Covers Business Strategy, Operations & Supply Chain (2 of 2 support areas). Shared language: English. Mentor offers online sessions","factors":[{"factor":"expertise","points":40,"max":40,"detail":"Covers Business Strategy, Operations & Supply Chain (2 of 2 support areas)"},{"factor":"availability","points":7,"max":20,"detail":"Both free on Tue"},{"factor":"language","points":15,"max":15,"detail":"Shared language: English"},{"factor":"mode","points":10,"max":10,"detail":"Mentor offers online sessions"},{"factor":"capacity","points":10,"max":15,"detail":"2 of 3 places free"}]}', NULL, '2026-08-13T09:00:00.000Z', NULL),
(5, 5, 3, 'active', 73, '{"summary":"Covers Career Development (1 of 2 support areas). Shared language: English. Both free on Thu, Fri","factors":[{"factor":"expertise","points":20,"max":40,"detail":"Covers Career Development (1 of 2 support areas)"},{"factor":"availability","points":13,"max":20,"detail":"Both free on Thu, Fri"},{"factor":"language","points":15,"max":15,"detail":"Shared language: English"},{"factor":"mode","points":10,"max":10,"detail":"Mentor offers online sessions"},{"factor":"capacity","points":15,"max":15,"detail":"4 of 4 places free"}]}', NULL, '2026-08-13T09:00:00.000Z', NULL),
(6, 6, 4, 'active', 73, '{"summary":"Covers Technology & Digital (1 of 2 support areas). Shared language: English. Both free on Mon, Fri","factors":[{"factor":"expertise","points":20,"max":40,"detail":"Covers Technology & Digital (1 of 2 support areas)"},{"factor":"availability","points":13,"max":20,"detail":"Both free on Mon, Fri"},{"factor":"language","points":15,"max":15,"detail":"Shared language: English"},{"factor":"mode","points":10,"max":10,"detail":"Mentor offers online sessions"},{"factor":"capacity","points":15,"max":15,"detail":"3 of 3 places free"}]}', NULL, '2026-08-13T09:00:00.000Z', NULL),
(7, 4, 4, 'active', 62, '{"summary":"Covers Leadership (1 of 2 support areas). Shared language: English. Mentor offers online sessions","factors":[{"factor":"expertise","points":20,"max":40,"detail":"Covers Leadership (1 of 2 support areas)"},{"factor":"availability","points":7,"max":20,"detail":"Both free on Thu"},{"factor":"language","points":15,"max":15,"detail":"Shared language: English"},{"factor":"mode","points":10,"max":10,"detail":"Mentor offers online sessions"},{"factor":"capacity","points":10,"max":15,"detail":"2 of 3 places free"}]}', NULL, '2026-08-13T09:00:00.000Z', NULL),
(8, 8, 5, 'active', 63, '{"summary":"Covers Business Strategy (1 of 2 support areas). Shared language: English. Both free on Tue, Wed","factors":[{"factor":"expertise","points":20,"max":40,"detail":"Covers Business Strategy (1 of 2 support areas)"},{"factor":"availability","points":13,"max":20,"detail":"Both free on Tue, Wed"},{"factor":"language","points":15,"max":15,"detail":"Shared language: English"},{"factor":"mode","points":0,"max":10,"detail":"Mentee wants in-person; mentor is online only"},{"factor":"capacity","points":15,"max":15,"detail":"2 of 2 places free"}]}', NULL, '2026-08-13T09:00:00.000Z', NULL),
(9, 7, 6, 'active', 93, '{"summary":"Covers Leadership, Career Development (2 of 2 support areas). Shared language: English, Setswana. Both free on Mon, Tue","factors":[{"factor":"expertise","points":40,"max":40,"detail":"Covers Leadership, Career Development (2 of 2 support areas)"},{"factor":"availability","points":13,"max":20,"detail":"Both free on Mon, Tue"},{"factor":"language","points":15,"max":15,"detail":"Shared language: English, Setswana"},{"factor":"mode","points":10,"max":10,"detail":"Mentee is flexible on mode"},{"factor":"capacity","points":15,"max":15,"detail":"3 of 3 places free"}]}', NULL, '2026-08-13T09:00:00.000Z', NULL),
(10, 9, 7, 'active', 53, '{"summary":"Shared language: English. Both free on Wed, Thu. Mentee is flexible on mode","factors":[{"factor":"expertise","points":0,"max":40,"detail":"No overlap with the requested support areas"},{"factor":"availability","points":13,"max":20,"detail":"Both free on Wed, Thu"},{"factor":"language","points":15,"max":15,"detail":"Shared language: English"},{"factor":"mode","points":10,"max":10,"detail":"Mentee is flexible on mode"},{"factor":"capacity","points":15,"max":15,"detail":"2 of 2 places free"}]}', NULL, '2026-08-13T09:00:00.000Z', NULL);

-- 28 rows
INSERT INTO sessions (id, match_id, start_at, end_at, status, mode, attendance, duration_min, focus, guidance, follow_up_date) VALUES
(1, 1, '2026-09-19T10:00:00.000Z', '2026-09-19T11:00:00.000Z', 'completed', 'online', 'attended', 60, 'Cash-flow basics and first budget', 'Break costs into fixed and variable; build a 3-month cash-flow sheet before approaching lenders.', '2026-10-03'),
(2, 2, '2026-09-18T10:00:00.000Z', '2026-09-18T11:00:00.000Z', 'completed', 'online', 'attended', 55, 'Understanding company registration and tax', 'Register with CIPC first, then SARS; keep personal and business accounts separate.', '2026-10-02'),
(3, 3, '2026-09-17T10:00:00.000Z', '2026-09-17T11:00:00.000Z', 'completed', 'online', 'attended', 50, 'Career map into supply chain', 'Target planner or buyer roles; get a short APICS/SAPICS course under your belt.', '2026-10-01'),
(4, 4, '2026-09-16T10:00:00.000Z', '2026-09-16T11:00:00.000Z', 'completed', 'online', 'attended', 60, 'Route planning and fleet costs', 'Track cost per delivery; consolidate routes before adding vehicles.', '2026-09-30'),
(5, 5, '2026-09-15T10:00:00.000Z', '2026-09-15T11:00:00.000Z', 'completed', 'online', 'attended', 55, 'Portfolio and first project', 'Ship one small project publicly; write a README that explains decisions, not just features.', '2026-09-29'),
(6, 6, '2026-09-14T10:00:00.000Z', '2026-09-14T11:00:00.000Z', 'completed', 'online', 'attended', 50, 'Brand positioning', 'Pick one customer segment and speak to them directly; drop the generic messaging.', '2026-09-28'),
(7, 7, '2026-09-13T10:00:00.000Z', '2026-09-13T11:00:00.000Z', 'completed', 'online', 'attended', 60, 'Leading a project team', 'Set roles and check-ins early; delegate outcomes rather than tasks.', '2026-09-27'),
(8, 8, '2026-09-12T10:00:00.000Z', '2026-09-12T11:00:00.000Z', 'completed', 'online', 'attended', 55, 'Investor-ready pitch', 'Lead with the problem and traction; keep the deck to 10 slides.', '2026-09-26'),
(9, 9, '2026-09-11T10:00:00.000Z', '2026-09-11T11:00:00.000Z', 'completed', 'online', 'attended', 50, 'Preparing for a management track', 'Ask for a stretch assignment and a sponsor; document your wins monthly.', '2026-09-25'),
(10, 10, '2026-09-10T10:00:00.000Z', '2026-09-10T11:00:00.000Z', 'completed', 'in-person', 'attended', 60, 'Team confidence and feedback', 'Practise giving specific, kind feedback; use a simple situation-behaviour-impact structure.', '2026-09-24'),
(11, 1, '2026-09-23T14:00:00.000Z', '2026-09-23T15:00:00.000Z', 'confirmed', 'online', NULL, NULL, NULL, NULL, NULL),
(12, 2, '2026-09-24T14:00:00.000Z', '2026-09-24T15:00:00.000Z', 'requested', 'online', NULL, NULL, NULL, NULL, NULL),
(13, 3, '2026-09-25T14:00:00.000Z', '2026-09-25T15:00:00.000Z', 'confirmed', 'online', NULL, NULL, NULL, NULL, NULL),
(14, 4, '2026-09-26T14:00:00.000Z', '2026-09-26T15:00:00.000Z', 'requested', 'online', NULL, NULL, NULL, NULL, NULL),
(15, 5, '2026-09-27T14:00:00.000Z', '2026-09-27T15:00:00.000Z', 'confirmed', 'online', NULL, NULL, NULL, NULL, NULL),
(16, 6, '2026-09-28T14:00:00.000Z', '2026-09-28T15:00:00.000Z', 'requested', 'online', NULL, NULL, NULL, NULL, NULL),
(17, 7, '2026-09-29T14:00:00.000Z', '2026-09-29T15:00:00.000Z', 'confirmed', 'online', NULL, NULL, NULL, NULL, NULL),
(18, 8, '2026-09-30T14:00:00.000Z', '2026-09-30T15:00:00.000Z', 'requested', 'online', NULL, NULL, NULL, NULL, NULL),
(19, 9, '2026-10-01T14:00:00.000Z', '2026-10-01T15:00:00.000Z', 'confirmed', 'online', NULL, NULL, NULL, NULL, NULL),
(20, 10, '2026-10-02T14:00:00.000Z', '2026-10-02T15:00:00.000Z', 'requested', 'in-person', NULL, NULL, NULL, NULL, NULL),
(21, 1, '2026-10-04T09:00:00.000Z', '2026-10-04T10:00:00.000Z', 'confirmed', 'online', NULL, NULL, NULL, NULL, NULL),
(22, 2, '2026-10-05T09:00:00.000Z', '2026-10-05T10:00:00.000Z', 'requested', 'online', NULL, NULL, NULL, NULL, NULL),
(23, 3, '2026-10-06T09:00:00.000Z', '2026-10-06T10:00:00.000Z', 'confirmed', 'online', NULL, NULL, NULL, NULL, NULL),
(24, 4, '2026-10-07T09:00:00.000Z', '2026-10-07T10:00:00.000Z', 'requested', 'online', NULL, NULL, NULL, NULL, NULL),
(25, 5, '2026-10-08T09:00:00.000Z', '2026-10-08T10:00:00.000Z', 'confirmed', 'online', NULL, NULL, NULL, NULL, NULL),
(26, 3, '2026-09-02T11:00:00.000Z', '2026-09-02T12:00:00.000Z', 'no_show', 'online', 'absent', 0, NULL, NULL, NULL),
(27, 6, '2026-08-28T11:00:00.000Z', '2026-08-28T12:00:00.000Z', 'no_show', 'online', 'absent', 0, NULL, NULL, NULL),
(28, 8, '2026-09-07T11:00:00.000Z', '2026-09-07T12:00:00.000Z', 'cancelled', 'online', NULL, NULL, NULL, NULL, NULL);

-- 15 rows
INSERT INTO actions (id, session_id, description, owner_role, due_date, status, completed_at) VALUES
(1, 1, 'Build a 3-month cash-flow forecast', 'mentee', '2026-09-14', 'complete', '2026-09-21T12:00:00.000Z'),
(2, 1, 'Open a separate business bank account', 'mentor', '2026-09-18', 'in_progress', NULL),
(3, 2, 'Draft CIPC registration documents', 'mentee', '2026-09-22', 'open', NULL),
(4, 2, 'Book a SARS tax-registration appointment', 'mentor', '2026-09-26', 'complete', '2026-09-21T12:00:00.000Z'),
(5, 3, 'Complete a supply chain short course', 'mentee', '2026-09-30', 'in_progress', NULL),
(6, 3, 'Update CV with logistics experience', 'mentor', '2026-09-14', 'open', NULL),
(7, 4, 'Map delivery routes and costs', 'mentee', '2026-09-18', 'complete', '2026-09-21T12:00:00.000Z'),
(8, 4, 'Interview two other courier operators', 'mentor', '2026-09-22', 'in_progress', NULL),
(9, 5, 'Publish a portfolio project on GitHub', 'mentee', '2026-09-26', 'open', NULL),
(10, 5, 'Write the project README', 'mentor', '2026-09-30', 'complete', '2026-09-21T12:00:00.000Z'),
(11, 6, 'Define one target customer segment', 'mentee', '2026-09-14', 'in_progress', NULL),
(12, 7, 'Redesign the landing page copy', 'mentor', '2026-09-18', 'open', NULL),
(13, 8, 'Draft a one-page project plan', 'mentee', '2026-09-22', 'complete', '2026-09-21T12:00:00.000Z'),
(14, 9, 'Create a 10-slide investor deck', 'mentor', '2026-09-26', 'in_progress', NULL),
(15, 10, 'Ask manager for a stretch assignment', 'mentee', '2026-09-30', 'open', NULL);

-- 20 rows
INSERT INTO feedback (id, session_id, from_role, rating, ratings_json, comments, created_at) VALUES
(1, 1, 'mentor', 5, '{"preparedness":5,"engagement":5,"progress":5}', 'Mentee arrived prepared and followed up on the previous actions.', '2026-09-22 05:57:25'),
(2, 1, 'mentee', 5, '{"usefulness":5,"clarity":5,"support":5}', 'My mentor gave me practical steps I can use straight away.', '2026-09-22 05:57:25'),
(3, 2, 'mentor', 4, '{"preparedness":4,"engagement":5,"progress":4}', 'Good engagement; needs to break goals into smaller steps.', '2026-09-22 05:57:25'),
(4, 2, 'mentee', 5, '{"usefulness":5,"clarity":5,"support":5}', 'Really helpful, I feel much clearer on my plan.', '2026-09-22 05:57:25'),
(5, 3, 'mentor', 4, '{"preparedness":4,"engagement":4,"progress":4}', 'Strong progress since last session.', '2026-09-22 05:57:25'),
(6, 3, 'mentee', 4, '{"usefulness":4,"clarity":4,"support":4}', 'Great advice, would like a bit more time next session.', '2026-09-22 05:57:25'),
(7, 4, 'mentor', 5, '{"preparedness":5,"engagement":5,"progress":5}', 'Very motivated; we covered more than planned.', '2026-09-22 05:57:25'),
(8, 4, 'mentee', 4, '{"usefulness":4,"clarity":4,"support":5}', 'Very supportive and knowledgeable.', '2026-09-22 05:57:25'),
(9, 5, 'mentor', 3, '{"preparedness":3,"engagement":3,"progress":3}', 'Slightly unprepared but open to guidance.', '2026-09-22 05:57:25'),
(10, 5, 'mentee', 4, '{"usefulness":4,"clarity":4,"support":4}', 'Useful session, the examples helped a lot.', '2026-09-22 05:57:25'),
(11, 6, 'mentor', 4, '{"preparedness":4,"engagement":5,"progress":4}', 'Clear goals and thoughtful questions.', '2026-09-22 05:57:25'),
(12, 6, 'mentee', 5, '{"usefulness":5,"clarity":5,"support":5}', 'Learned a lot about how to position my business.', '2026-09-22 05:57:25'),
(13, 7, 'mentor', 5, '{"preparedness":5,"engagement":5,"progress":5}', 'Excellent session, great discussion on next steps.', '2026-09-22 05:57:25'),
(14, 7, 'mentee', 3, '{"usefulness":3,"clarity":3,"support":3}', 'Slightly rushed, but the guidance was good.', '2026-09-22 05:57:25'),
(15, 8, 'mentor', 4, '{"preparedness":4,"engagement":5,"progress":4}', 'Making steady progress on actions.', '2026-09-22 05:57:25'),
(16, 8, 'mentee', 5, '{"usefulness":5,"clarity":5,"support":5}', 'Inspiring conversation and clear actions.', '2026-09-22 05:57:25'),
(17, 9, 'mentor', 4, '{"preparedness":4,"engagement":4,"progress":4}', 'Confident and keen to apply the advice.', '2026-09-22 05:57:25'),
(18, 9, 'mentee', 4, '{"usefulness":4,"clarity":4,"support":4}', 'Helped me see my next career step.', '2026-09-22 05:57:25'),
(19, 10, 'mentor', 5, '{"preparedness":5,"engagement":5,"progress":5}', 'Strong reflection on the previous feedback.', '2026-09-22 05:57:25'),
(20, 10, 'mentee', 5, '{"usefulness":5,"clarity":5,"support":5}', 'Excellent and encouraging feedback.', '2026-09-22 05:57:25');

-- 6 rows
INSERT INTO outcomes (id, match_id, description, category, achieved_on) VALUES
(1, 1, 'Completed first 3-month cash-flow forecast', 'Finance & Funding', '2026-09-21'),
(2, 2, 'Registered company with CIPC', 'Legal & Compliance', '2026-09-18'),
(3, 3, 'Enrolled in a supply chain short course', 'Career Development', '2026-09-15'),
(4, 5, 'Published first portfolio project on GitHub', 'Technology & Digital', '2026-09-12'),
(5, 6, 'Defined target customer segment and relaunched brand page', 'Marketing & Sales', '2026-09-09'),
(6, 8, 'Delivered a 10-slide investor pitch to a panel', 'Finance & Funding', '2026-09-06');
