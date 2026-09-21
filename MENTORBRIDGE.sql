--CREATE DATABASE MENTORBRIDGE;

--USE MENTORBRIDGE;

CREATE TABLE USERS
(USER_ID INT IDENTITY(1,1) PRIMARY KEY,
 FIRST_NAME VARCHAR(50) NOT NULL,
 SURNAME VARCHAR(50) NOT NULL,
 EMAIL VARCHAR(100) NOT NULL UNIQUE,
 PASSWORD VARCHAR(255) NOT NULL,
 ROLE VARCHAR(20) NOT NULL);
 
 CREATE TABLE ADMIN
(ADMIN_ID INT IDENTITY(1,1) PRIMARY KEY,
 USER_ID INT NOT NULL,
 ADMIN_ROLE VARCHAR(50) NOT NULL,
 FOREIGN KEY (USER_ID)REFERENCES USERS(USER_ID));

 CREATE TABLE MENTORS
(MENTOR_ID INT IDENTITY(1,1) PRIMARY KEY,
 USER_ID INT NOT NULL,
 MENTOR_ROLE VARCHAR(100) NOT NULL,
 ORGANISATION VARCHAR(100) NOT NULL,
 SECTOR VARCHAR(100) NOT NULL,
 EXPERIENCE_YEARS INT NOT NULL,
 LANGUAGE VARCHAR(50) NOT NULL,
 MODE VARCHAR(30) NOT NULL,
 CAPACITY INT NOT NULL,
 STATUS VARCHAR(30) NOT NULL,
 FOREIGN KEY (USER_ID)REFERENCES USERS(USER_ID));

 CREATE TABLE MENTEES
(MENTEE_ID INT IDENTITY(1,1) PRIMARY KEY,
 USER_ID INT NOT NULL,
 PROGRAMME VARCHAR(100) NOT NULL,
 CAREER_INTEREST VARCHAR(150) NOT NULL,
 GOALS VARCHAR(500) NOT NULL,
 SUPPORT_AREAS VARCHAR(500) NOT NULL,
 PREFERRED_MODE VARCHAR(30) NOT NULL,
 PREFERRED_LANGUAGE VARCHAR(50) NOT NULL,
 FOREIGN KEY (USER_ID)REFERENCES USERS(USER_ID));

 CREATE TABLE EXPERTISE
(EXPERTISE_ID INT IDENTITY(1,1) PRIMARY KEY,
 EXPERTISE_NAME VARCHAR(100) NOT NULL);

 CREATE TABLE MENTOR_EXPERTISE
(MENTOR_ID INT NOT NULL,
 EXPERTISE_ID INT NOT NULL,
 PRIMARY KEY (MENTOR_ID, EXPERTISE_ID),
 FOREIGN KEY (MENTOR_ID)REFERENCES MENTORS(MENTOR_ID),
 FOREIGN KEY (EXPERTISE_ID)REFERENCES EXPERTISE(EXPERTISE_ID));

 CREATE TABLE AVAILABILITY
(AVAILABILITY_ID INT IDENTITY(1,1) PRIMARY KEY,
 MENTOR_ID INT NOT NULL,
 AVAILABLE_DATE DATE NOT NULL,
 START_TIME TIME NOT NULL,
 END_TIME TIME NOT NULL,
 FOREIGN KEY (MENTOR_ID)REFERENCES MENTORS(MENTOR_ID));

 CREATE TABLE MENTOR_MATCHES
(MATCH_ID INT IDENTITY(1,1) PRIMARY KEY,
 MENTOR_ID INT NOT NULL,
 MENTEE_ID INT NOT NULL,
 MATCH_SCORE DECIMAL(5,2),
 MATCH_REASON VARCHAR(1000) NOT NULL,
 MATCH_STATUS VARCHAR(30) NOT NULL,
 MATCH_DATE DATE NOT NULL,
 FOREIGN KEY (MENTOR_ID)REFERENCES MENTORS(MENTOR_ID),
 FOREIGN KEY (MENTEE_ID)REFERENCES MENTEES(MENTEE_ID));

 CREATE TABLE SESSIONS
(SESSION_ID INT IDENTITY(1,1) PRIMARY KEY,
 MENTOR_ID INT NOT NULL,
 MENTEE_ID INT NOT NULL,
 SESSION_DATE DATE NOT NULL,
 START_TIME TIME NOT NULL,
 END_TIME TIME NOT NULL,
 STATUS VARCHAR(30) NOT NULL,
 FOREIGN KEY (MENTOR_ID)REFERENCES MENTORS(MENTOR_ID),
 FOREIGN KEY (MENTEE_ID)REFERENCES MENTEES(MENTEE_ID));

 CREATE TABLE SESSION_ATTENDANCE
(ATTENDANCE_ID INT IDENTITY(1,1) PRIMARY KEY,
 SESSION_ID INT NOT NULL,
 MENTOR_ATTENDANCE VARCHAR(20) NOT NULL,
 MENTEE_ATTENDANCE VARCHAR(20) NOT NULL,
 FOREIGN KEY (SESSION_ID)REFERENCES SESSIONS(SESSION_ID));

 CREATE TABLE SESSION_NOTES
(NOTE_ID INT IDENTITY(1,1) PRIMARY KEY,
 SESSION_ID INT NOT NULL,
 SESSION_FOCUS VARCHAR(500) NOT NULL,
 GUIDANCE VARCHAR(1000) NOT NULL,
 FOLLOW_UP_DATE DATE,
 FOREIGN KEY (SESSION_ID)REFERENCES SESSIONS(SESSION_ID));

 CREATE TABLE ACTION_ITEMS
(ACTION_ID INT IDENTITY(1,1) PRIMARY KEY,
 SESSION_ID INT NOT NULL,
 ACTION_DESCRIPTION VARCHAR(500) NOT NULL,
 DUE_DATE DATE,
 STATUS VARCHAR(30) NOT NULL,
 FOREIGN KEY (SESSION_ID)REFERENCES SESSIONS(SESSION_ID));

 CREATE TABLE MENTOR_FEEDBACK
(MENTOR_FEEDBACK_ID INT IDENTITY(1,1) PRIMARY KEY,
 SESSION_ID INT NOT NULL,
 MENTOR_ID INT NOT NULL,
 RATING INT NOT NULL,
 COMMENTS VARCHAR(1000),
 FOREIGN KEY (SESSION_ID)REFERENCES SESSIONS(SESSION_ID),
 FOREIGN KEY (MENTOR_ID)REFERENCES MENTORS(MENTOR_ID));

 CREATE TABLE MENTEE_FEEDBACK
(MENTEE_FEEDBACK_ID INT IDENTITY(1,1) PRIMARY KEY,
 SESSION_ID INT NOT NULL,
 MENTEE_ID INT NOT NULL,
 RATING INT NOT NULL,
 COMMENTS VARCHAR(1000),
 FOREIGN KEY (SESSION_ID)REFERENCES SESSIONS(SESSION_ID),
 FOREIGN KEY (MENTEE_ID)REFERENCES MENTEES(MENTEE_ID));

 CREATE TABLE OUTCOMES
(OUTCOME_ID INT IDENTITY(1,1) PRIMARY KEY,
 MENTEE_ID INT NOT NULL,
 OUTCOME_DESCRIPTION VARCHAR(1000) NOT NULL,
 OUTCOME_DATE DATE NOT NULL,
 STATUS VARCHAR(30) NOT NULL,
 FOREIGN KEY (MENTEE_ID)REFERENCES MENTEES(MENTEE_ID));


SET IDENTITY_INSERT USERS ON;
INSERT INTO USERS (USER_ID, FIRST_NAME, SURNAME, EMAIL, PASSWORD, ROLE) VALUES
(1, 'Programme', 'Admin', 'admin@example.com', 'Password123!', 'admin'),
(2, 'Programme', 'Coach', 'coach@example.com', 'Password123!', 'coach'),
(3, 'Thandi', 'Mokoena', 'thandi.mokoena@example.com', 'Password123!', 'mentor'),
(4, 'Pieter', 'van der Merwe', 'pieter.merwe@example.com', 'Password123!', 'mentor'),
(5, 'Naledi', 'Sithole', 'naledi.sithole@example.com', 'Password123!', 'mentor'),
(6, 'Sipho', 'Dlamini', 'sipho.dlamini@example.com', 'Password123!', 'mentor'),
(7, 'Ayesha', 'Patel', 'ayesha.patel@example.com', 'Password123!', 'mentor'),
(8, 'Lerato', 'Molefe', 'lerato.molefe@example.com', 'Password123!', 'mentor'),
(9, 'Johan', 'Botha', 'johan.botha@example.com', 'Password123!', 'mentor'),
(10, 'Zanele', 'Khumalo', 'zanele.khumalo@example.com', 'Password123!', 'mentor'),
(11, 'Michael', 'Naidoo', 'michael.naidoo@example.com', 'Password123!', 'mentor'),
(12, 'Refilwe', 'Nkosi', 'refilwe.nkosi@example.com', 'Password123!', 'mentor'),
(13, 'Kagiso', 'Mahlangu', 'kagiso.mahlangu@example.com', 'Password123!', 'mentee'),
(14, 'Lindiwe', 'Zulu', 'lindiwe.zulu@example.com', 'Password123!', 'mentee'),
(15, 'Ethan', 'Jacobs', 'ethan.jacobs@example.com', 'Password123!', 'mentee'),
(16, 'Palesa', 'Radebe', 'palesa.radebe@example.com', 'Password123!', 'mentee'),
(17, 'Sanele', 'Ndlovu', 'sanele.ndlovu@example.com', 'Password123!', 'mentee'),
(18, 'Amira', 'Hassan', 'amira.hassan@example.com', 'Password123!', 'mentee'),
(19, 'Thabo', 'Sekgoma', 'thabo.sekgoma@example.com', 'Password123!', 'mentee'),
(20, 'Megan', 'Pillay', 'megan.pillay@example.com', 'Password123!', 'mentee'),
(21, 'Bongani', 'Cele', 'bongani.cele@example.com', 'Password123!', 'mentee'),
(22, 'Zodwa', 'Mthembu', 'zodwa.mthembu@example.com', 'Password123!', 'mentee'),
(23, 'Ruan', 'Steyn', 'ruan.steyn@example.com', 'Password123!', 'mentee'),
(24, 'Nomsa', 'Buthelezi', 'nomsa.buthelezi@example.com', 'Password123!', 'mentee'),
(25, 'Tshepo', 'Maseko', 'tshepo.maseko@example.com', 'Password123!', 'mentee'),
(26, 'Fatima', 'Moosa', 'fatima.moosa@example.com', 'Password123!', 'mentee'),
(27, 'Liam', 'OConnor', 'liam.oconnor@example.com', 'Password123!', 'mentee'),
(28, 'Ayanda', 'Ngcobo', 'ayanda.ngcobo@example.com', 'Password123!', 'mentee'),
(29, 'Karabo', 'Mokwena', 'karabo.mokwena@example.com', 'Password123!', 'mentee'),
(30, 'Chloe', 'Adams', 'chloe.adams@example.com', 'Password123!', 'mentee'),
(31, 'Sizwe', 'Dube', 'sizwe.dube@example.com', 'Password123!', 'mentee'),
(32, 'Precious', 'Maluleke', 'precious.maluleke@example.com', 'Password123!', 'mentee');
SELECT * FROM USERS;
SET IDENTITY_INSERT USERS OFF;

SET IDENTITY_INSERT MENTORS ON;
INSERT INTO MENTORS (MENTOR_ID, USER_ID, MENTOR_ROLE, ORGANISATION, SECTOR, EXPERIENCE_YEARS, LANGUAGE, MODE, CAPACITY, STATUS) VALUES
(1, 3, 'Senior Financial Manager', 'Nedbank', 'Finance', 15, 'English,isiZulu', 'online,in-person', 2, 'active'),
(2, 4, 'Supply Chain Director', 'Barloworld', 'Logistics', 20, 'English,Afrikaans', 'online,in-person', 3, 'active'),
(3, 5, 'Head of Marketing', 'Takealot', 'Retail', 12, 'English,Sesotho', 'online', 4, 'active'),
(4, 6, 'Engineering Manager', 'Discovery', 'Technology', 14, 'English,isiZulu', 'online,in-person', 3, 'active'),
(5, 7, 'Corporate Lawyer', 'Bowmans', 'Legal', 11, 'English', 'online', 2, 'active'),
(6, 8, 'HR & Talent Executive', 'Sasol', 'Energy', 18, 'English,Setswana', 'online,in-person', 3, 'active'),
(7, 9, 'Founder & CFO', 'Cape Agri Group', 'Agriculture', 22, 'English,Afrikaans', 'in-person', 2, 'active'),
(8, 10, 'Digital Growth Lead', 'Yoco', 'Fintech', 9, 'English,isiZulu', 'online', 4, 'active'),
(9, 11, 'Strategy Consultant', 'Deloitte', 'Consulting', 16, 'English', 'online,in-person', 3, 'active'),
(10, 12, 'Careers Coach', 'Independent', 'Education', 10, 'English,Setswana,Sesotho', 'online', 3, 'paused');
SELECT * FROM MENTORS;
SET IDENTITY_INSERT MENTORS OFF;

SET IDENTITY_INSERT MENTEES ON;
INSERT INTO MENTEES (MENTEE_ID, USER_ID, PROGRAMME, CAREER_INTEREST, GOALS, SUPPORT_AREAS, PREFERRED_MODE, PREFERRED_LANGUAGE) VALUES
(1, 13, 'Entrepreneurship Accelerator', 'Launch a small catering business', 'Launch a small catering business', 'Finance & Funding, Marketing & Sales', 'online', 'English,Setswana'),
(2, 14, 'Entrepreneurship Accelerator', 'Register a company and understand tax', 'Register a company and understand tax', 'Legal & Compliance, Finance & Funding', 'either', 'English,isiZulu'),
(3, 15, 'Graduate Development', 'Move into a supply chain role', 'Move into a supply chain role', 'Operations & Supply Chain, Career Development', 'in-person', 'English,Afrikaans'),
(4, 16, 'Youth Leadership', 'Lead a community project', 'Lead a community project', 'Leadership, Business Strategy', 'online', 'English,Sesotho'),
(5, 17, 'Graduate Development', 'Break into software development', 'Break into software development', 'Technology & Digital, Career Development', 'online', 'English,isiZulu'),
(6, 18, 'Entrepreneurship Accelerator', 'Grow an online clothing brand', 'Grow an online clothing brand', 'Marketing & Sales, Technology & Digital', 'online', 'English'),
(7, 19, 'Graduate Development', 'Prepare for a management track', 'Prepare for a management track', 'Leadership, Career Development', 'either', 'English,Setswana'),
(8, 20, 'Entrepreneurship Accelerator', 'Secure a first round of funding', 'Secure a first round of funding', 'Finance & Funding, Business Strategy', 'in-person', 'English'),
(9, 21, 'Youth Leadership', 'Build confidence leading teams', 'Build confidence leading teams', 'Leadership', 'either', 'English,isiZulu'),
(10, 22, 'Entrepreneurship Accelerator', 'Improve logistics for a courier start-up', 'Improve logistics for a courier start-up', 'Operations & Supply Chain, Business Strategy', 'online', 'English,isiZulu'),
(11, 23, 'Graduate Development', 'Explore legal-tech careers', 'Explore legal-tech careers', 'Legal & Compliance, Technology & Digital', 'online', 'English,Afrikaans'),
(12, 24, 'Entrepreneurship Accelerator', 'Price products and manage cash flow', 'Price products and manage cash flow', 'Finance & Funding, Operations & Supply Chain', 'either', 'English,isiZulu'),
(13, 25, 'Youth Leadership', 'Public speaking and mentoring peers', 'Public speaking and mentoring peers', 'Leadership, Career Development', 'either', 'English,Setswana,Sesotho'),
(14, 26, 'Graduate Development', 'Land a first marketing role', 'Land a first marketing role', 'Marketing & Sales, Career Development', 'online', 'English'),
(15, 27, 'Entrepreneurship Accelerator', 'Turn a side hustle into a company', 'Turn a side hustle into a company', 'Business Strategy, Finance & Funding', 'in-person', 'English,Afrikaans'),
(16, 28, 'Youth Leadership', 'Start a youth coding club', 'Start a youth coding club', 'Technology & Digital, Leadership', 'online', 'English,isiZulu'),
(17, 29, 'Graduate Development', 'Plan a career pivot into consulting', 'Plan a career pivot into consulting', 'Business Strategy, Career Development', 'either', 'English,Setswana'),
(18, 30, 'Entrepreneurship Accelerator', 'Meet compliance rules for a food business', 'Meet compliance rules for a food business', 'Legal & Compliance, Operations & Supply Chain', 'online', 'English'),
(19, 31, 'Graduate Development', 'Improve interview and networking skills', 'Improve interview and networking skills', 'Career Development, Marketing & Sales', 'online', 'English,isiZulu'),
(20, 32, 'Entrepreneurship Accelerator', 'Build a business plan', 'Build a business plan', 'Business Strategy, Marketing & Sales', 'either', 'English,Sesotho');
SELECT * FROM MENTEES;
SET IDENTITY_INSERT MENTEES OFF;

SET IDENTITY_INSERT ADMIN ON;
INSERT INTO ADMIN (ADMIN_ID, USER_ID, ADMIN_ROLE) VALUES
(1, 1, 'Programme Manager');
SELECT * FROM ADMIN;
SET IDENTITY_INSERT ADMIN OFF;

SET IDENTITY_INSERT EXPERTISE ON;
INSERT INTO EXPERTISE (EXPERTISE_ID, EXPERTISE_NAME) VALUES
(1, 'Business Strategy'),
(2, 'Finance & Funding'),
(3, 'Marketing & Sales'),
(4, 'Leadership'),
(5, 'Technology & Digital'),
(6, 'Operations & Supply Chain'),
(7, 'Legal & Compliance'),
(8, 'Career Development');
SELECT * FROM EXPERTISE;
SET IDENTITY_INSERT EXPERTISE OFF;

SET IDENTITY_INSERT MENTOR_EXPERTISE ON;
INSERT INTO MENTOR_EXPERTISE (MENTOR_ID, EXPERTISE_ID) VALUES
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
SELECT * FROM MENTOR_EXPERTISE;
SET IDENTITY_INSERT MENTOR_EXPERTISE OFF;

SET IDENTITY_INSERT AVAILABILITY ON;
INSERT INTO AVAILABILITY (AVAILABILITY_ID, MENTOR_ID, AVAILABLE_DATE, START_TIME, END_TIME) VALUES
(1, 1, '2026-09-21', '09:00', '12:00'),
(2, 1, '2026-09-22', '13:00', '17:00'),
(3, 1, '2026-09-23', '17:00', '19:00'),
(4, 1, '2026-09-24', '09:00', '12:00'),
(5, 2, '2026-09-22', '13:00', '17:00'),
(6, 2, '2026-09-23', '17:00', '19:00'),
(7, 2, '2026-09-24', '09:00', '12:00'),
(8, 2, '2026-09-25', '13:00', '17:00'),
(9, 3, '2026-09-23', '17:00', '19:00'),
(10, 3, '2026-09-24', '09:00', '12:00'),
(11, 3, '2026-09-25', '13:00', '17:00'),
(12, 3, '2026-09-21', '17:00', '19:00'),
(13, 4, '2026-09-24', '09:00', '12:00'),
(14, 4, '2026-09-25', '13:00', '17:00'),
(15, 4, '2026-09-21', '17:00', '19:00'),
(16, 4, '2026-09-22', '09:00', '12:00'),
(17, 5, '2026-09-25', '13:00', '17:00'),
(18, 5, '2026-09-21', '17:00', '19:00'),
(19, 5, '2026-09-22', '09:00', '12:00'),
(20, 5, '2026-09-23', '13:00', '17:00'),
(21, 6, '2026-09-28', '17:00', '19:00'),
(22, 6, '2026-09-29', '09:00', '12:00'),
(23, 6, '2026-09-30', '13:00', '17:00'),
(24, 6, '2026-10-01', '17:00', '19:00'),
(25, 7, '2026-09-29', '09:00', '12:00'),
(26, 7, '2026-09-30', '13:00', '17:00'),
(27, 7, '2026-10-01', '17:00', '19:00'),
(28, 7, '2026-10-02', '09:00', '12:00'),
(29, 8, '2026-09-30', '13:00', '17:00'),
(30, 8, '2026-10-01', '17:00', '19:00'),
(31, 8, '2026-10-02', '09:00', '12:00'),
(32, 8, '2026-09-28', '13:00', '17:00'),
(33, 9, '2026-10-01', '17:00', '19:00'),
(34, 9, '2026-10-02', '09:00', '12:00'),
(35, 9, '2026-09-28', '13:00', '17:00'),
(36, 9, '2026-09-29', '17:00', '19:00'),
(37, 10, '2026-10-02', '09:00', '12:00'),
(38, 10, '2026-09-28', '13:00', '17:00'),
(39, 10, '2026-09-29', '17:00', '19:00'),
(40, 10, '2026-09-30', '09:00', '12:00');
SELECT * FROM AVAILABILITY;
SET IDENTITY_INSERT AVAILABILITY OFF;

SET IDENTITY_INSERT MENTOR_MATCHES ON;
INSERT INTO MENTOR_MATCHES (MATCH_ID, MENTOR_ID, MENTEE_ID, MATCH_SCORE, MATCH_REASON, MATCH_STATUS, MATCH_DATE) VALUES
(1, 1, 1, 67, 'Expertise: 20/40, Availability: 7/20, Language: 15/15, Mode: 10/10, Capacity: 15/15; Covers Finance & Funding', 'active', '2026-08-12'),
(2, 1, 2, 66, 'Expertise: 20/40, Availability: 13/20, Language: 15/15, Mode: 10/10, Capacity: 8/15; Covers Finance & Funding', 'active', '2026-08-12'),
(3, 2, 3, 67, 'Expertise: 20/40, Availability: 13/20, Language: 15/15, Mode: 4/10, Capacity: 15/15; Covers Operations & Supply Chain', 'active', '2026-08-12'),
(4, 2, 10, 82, 'Expertise: 40/40, Availability: 7/20, Language: 15/15, Mode: 10/10, Capacity: 10/15; Covers Operations & Supply Chain, Business Strategy', 'active', '2026-08-12'),
(5, 3, 5, 73, 'Expertise: 20/40, Availability: 13/20, Language: 15/15, Mode: 10/10, Capacity: 15/15; Covers Career Development', 'active', '2026-08-12'),
(6, 4, 6, 73, 'Expertise: 20/40, Availability: 13/20, Language: 15/15, Mode: 10/10, Capacity: 15/15; Covers Technology & Digital', 'active', '2026-08-12'),
(7, 4, 4, 62, 'Expertise: 20/40, Availability: 7/20, Language: 15/15, Mode: 10/10, Capacity: 10/15; Covers Leadership', 'active', '2026-08-12'),
(8, 5, 8, 63, 'Expertise: 20/40, Availability: 13/20, Language: 15/15, Mode: 0/10, Capacity: 15/15; Covers Business Strategy', 'active', '2026-08-12'),
(9, 6, 7, 93, 'Expertise: 40/40, Availability: 13/20, Language: 15/15, Mode: 10/10, Capacity: 15/15; Covers Leadership, Career Development', 'active', '2026-08-12'),
(10, 7, 9, 53, 'Expertise: 0/40, Availability: 13/20, Language: 15/15, Mode: 10/10, Capacity: 15/15; No overlap with requested support areas', 'active', '2026-08-12');
SELECT * FROM MENTOR_MATCHES;
SET IDENTITY_INSERT MENTOR_MATCHES OFF;

SET IDENTITY_INSERT SESSIONS ON;
INSERT INTO SESSIONS (SESSION_ID, MENTOR_ID, MENTEE_ID, SESSION_DATE, START_TIME, END_TIME, STATUS) VALUES
(1, 1, 1, '2026-09-18', '00:00:00', '00:00:00', 'completed'),
(2, 1, 2, '2026-09-17', '00:00:00', '00:00:00', 'completed'),
(3, 2, 3, '2026-09-16', '00:00:00', '00:00:00', 'completed'),
(4, 2, 10, '2026-09-15', '00:00:00', '00:00:00', 'completed'),
(5, 3, 5, '2026-09-14', '00:00:00', '00:00:00', 'completed'),
(6, 4, 6, '2026-09-13', '00:00:00', '00:00:00', 'completed'),
(7, 4, 4, '2026-09-12', '00:00:00', '00:00:00', 'completed'),
(8, 5, 8, '2026-09-11', '00:00:00', '00:00:00', 'completed'),
(9, 6, 7, '2026-09-10', '00:00:00', '00:00:00', 'completed'),
(10, 7, 9, '2026-09-09', '00:00:00', '00:00:00', 'completed'),
(11, 1, 1, '2026-09-22', '00:00:00', '00:00:00', 'confirmed'),
(12, 1, 2, '2026-09-23', '00:00:00', '00:00:00', 'requested'),
(13, 2, 3, '2026-09-24', '00:00:00', '00:00:00', 'confirmed'),
(14, 2, 10, '2026-09-25', '00:00:00', '00:00:00', 'requested'),
(15, 3, 5, '2026-09-26', '00:00:00', '00:00:00', 'confirmed'),
(16, 4, 6, '2026-09-27', '00:00:00', '00:00:00', 'requested'),
(17, 4, 4, '2026-09-28', '00:00:00', '00:00:00', 'confirmed'),
(18, 5, 8, '2026-09-29', '00:00:00', '00:00:00', 'requested'),
(19, 6, 7, '2026-09-30', '00:00:00', '00:00:00', 'confirmed'),
(20, 7, 9, '2026-10-01', '00:00:00', '00:00:00', 'requested'),
(21, 1, 1, '2026-10-03', '00:00:00', '00:00:00', 'confirmed'),
(22, 1, 2, '2026-10-04', '00:00:00', '00:00:00', 'requested'),
(23, 2, 3, '2026-10-05', '00:00:00', '00:00:00', 'confirmed'),
(24, 2, 10, '2026-10-06', '00:00:00', '00:00:00', 'requested'),
(25, 3, 5, '2026-10-07', '00:00:00', '00:00:00', 'confirmed'),
(26, 2, 3, '2026-09-01', '00:00:00', '00:00:00', 'no_show'),
(27, 4, 6, '2026-08-27', '00:00:00', '00:00:00', 'no_show'),
(28, 5, 8, '2026-09-06', '00:00:00', '00:00:00', 'cancelled');
SELECT * FROM SESSIONS;
SET IDENTITY_INSERT SESSIONS OFF;

SET IDENTITY_INSERT SESSION_ATTENDANCE ON;
INSERT INTO SESSION_ATTENDANCE (ATTENDANCE_ID, SESSION_ID, MENTOR_ATTENDANCE, MENTEE_ATTENDANCE) VALUES
(1, 1, 'attended', 'attended'),
(2, 2, 'attended', 'attended'),
(3, 3, 'attended', 'attended'),
(4, 4, 'attended', 'attended'),
(5, 5, 'attended', 'attended'),
(6, 6, 'attended', 'attended'),
(7, 7, 'attended', 'attended'),
(8, 8, 'attended', 'attended'),
(9, 9, 'attended', 'attended'),
(10, 10, 'attended', 'attended'),
(11, 26, 'attended', 'absent'),
(12, 27, 'attended', 'absent');
SELECT * FROM SESSION_ATTENDANCE;
SET IDENTITY_INSERT SESSION_ATTENDANCE OFF;

SET IDENTITY_INSERT SESSION_NOTES ON;
INSERT INTO SESSION_NOTES (NOTE_ID, SESSION_ID, SESSION_FOCUS, GUIDANCE, FOLLOW_UP_DATE) VALUES
(1, 1, 'Cash-flow basics and first budget', 'Break costs into fixed and variable; build a 3-month cash-flow sheet before approaching lenders.', '2026-10-02'),
(2, 2, 'Understanding company registration and tax', 'Register with CIPC first, then SARS; keep personal and business accounts separate.', '2026-10-01'),
(3, 3, 'Career map into supply chain', 'Target planner or buyer roles; get a short APICS/SAPICS course under your belt.', '2026-09-30'),
(4, 4, 'Route planning and fleet costs', 'Track cost per delivery; consolidate routes before adding vehicles.', '2026-09-29'),
(5, 5, 'Portfolio and first project', 'Ship one small project publicly; write a README that explains decisions, not just features.', '2026-09-28'),
(6, 6, 'Brand positioning', 'Pick one customer segment and speak to them directly; drop the generic messaging.', '2026-09-27'),
(7, 7, 'Leading a project team', 'Set roles and check-ins early; delegate outcomes rather than tasks.', '2026-09-26'),
(8, 8, 'Investor-ready pitch', 'Lead with the problem and traction; keep the deck to 10 slides.', '2026-09-25'),
(9, 9, 'Preparing for a management track', 'Ask for a stretch assignment and a sponsor; document your wins monthly.', '2026-09-24'),
(10, 10, 'Team confidence and feedback', 'Practise giving specific, kind feedback; use a simple situation-behaviour-impact structure.', '2026-09-23');
SELECT * FROM SESSION_NOTES;
SET IDENTITY_INSERT SESSION_NOTES OFF;

SET IDENTITY_INSERT ACTION_ITEMS ON;
INSERT INTO ACTION_ITEMS (ACTION_ID, SESSION_ID, ACTION_DESCRIPTION, DUE_DATE, STATUS) VALUES
(1, 1, 'Build a 3-month cash-flow forecast', '2026-09-13', 'complete'),
(2, 1, 'Open a separate business bank account', '2026-09-17', 'in_progress'),
(3, 2, 'Draft CIPC registration documents', '2026-09-21', 'open'),
(4, 2, 'Book a SARS tax-registration appointment', '2026-09-25', 'complete'),
(5, 3, 'Complete a supply chain short course', '2026-09-29', 'in_progress'),
(6, 3, 'Update CV with logistics experience', '2026-09-13', 'open'),
(7, 4, 'Map delivery routes and costs', '2026-09-17', 'complete'),
(8, 4, 'Interview two other courier operators', '2026-09-21', 'in_progress'),
(9, 5, 'Publish a portfolio project on GitHub', '2026-09-25', 'open'),
(10, 5, 'Write the project README', '2026-09-29', 'complete'),
(11, 6, 'Define one target customer segment', '2026-09-13', 'in_progress'),
(12, 7, 'Redesign the landing page copy', '2026-09-17', 'open'),
(13, 8, 'Draft a one-page project plan', '2026-09-21', 'complete'),
(14, 9, 'Create a 10-slide investor deck', '2026-09-25', 'in_progress'),
(15, 10, 'Ask manager for a stretch assignment', '2026-09-29', 'open');
SELECT * FROM ACTION_ITEMS;
SET IDENTITY_INSERT ACTION_ITEMS OFF;

SET IDENTITY_INSERT MENTOR_FEEDBACK ON;
INSERT INTO MENTOR_FEEDBACK (MENTOR_FEEDBACK_ID, SESSION_ID, MENTOR_ID, RATING, COMMENTS) VALUES
(1, 1, 1, 5, 'Mentee arrived prepared and followed up on the previous actions.'),
(2, 2, 1, 4, 'Good engagement; needs to break goals into smaller steps.'),
(3, 3, 2, 4, 'Strong progress since last session.'),
(4, 4, 2, 5, 'Very motivated; we covered more than planned.'),
(5, 5, 3, 3, 'Slightly unprepared but open to guidance.'),
(6, 6, 4, 4, 'Clear goals and thoughtful questions.'),
(7, 7, 4, 5, 'Excellent session, great discussion on next steps.'),
(8, 8, 5, 4, 'Making steady progress on actions.'),
(9, 9, 6, 4, 'Confident and keen to apply the advice.'),
(10, 10, 7, 5, 'Strong reflection on the previous feedback.');
SELECT * FROM MENTOR_FEEDBACK;
SET IDENTITY_INSERT MENTOR_FEEDBACK OFF;

SET IDENTITY_INSERT MENTEE_FEEDBACK ON;
INSERT INTO MENTEE_FEEDBACK (MENTEE_FEEDBACK_ID, SESSION_ID, MENTEE_ID, RATING, COMMENTS) VALUES
(1, 1, 1, 5, 'My mentor gave me practical steps I can use straight away.'),
(2, 2, 2, 5, 'Really helpful, I feel much clearer on my plan.'),
(3, 3, 3, 4, 'Great advice, would like a bit more time next session.'),
(4, 4, 10, 4, 'Very supportive and knowledgeable.'),
(5, 5, 5, 4, 'Useful session, the examples helped a lot.'),
(6, 6, 6, 5, 'Learned a lot about how to position my business.'),
(7, 7, 4, 3, 'Slightly rushed, but the guidance was good.'),
(8, 8, 8, 5, 'Inspiring conversation and clear actions.'),
(9, 9, 7, 4, 'Helped me see my next career step.'),
(10, 10, 9, 5, 'Excellent and encouraging feedback.');
SELECT * FROM MENTEE_FEEDBACK;
SET IDENTITY_INSERT MENTEE_FEEDBACK OFF;

SET IDENTITY_INSERT OUTCOMES ON;
INSERT INTO OUTCOMES (OUTCOME_ID, MENTEE_ID, OUTCOME_DESCRIPTION, OUTCOME_DATE, STATUS) VALUES
(1, 1, 'Completed first 3-month cash-flow forecast', '2026-09-20', 'achieved'),
(2, 2, 'Registered company with CIPC', '2026-09-20', 'achieved'),
(3, 3, 'Enrolled in a supply chain short course', '2026-09-20', 'achieved'),
(4, 5, 'Published first portfolio project on GitHub', '2026-09-20', 'achieved'),
(5, 6, 'Defined target customer segment and relaunched brand page', '2026-09-20', 'achieved'),
(6, 8, 'Delivered a 10-slide investor pitch to a panel', '2026-09-20', 'achieved');
SELECT * FROM OUTCOMES;
SET IDENTITY_INSERT OUTCOMES OFF;
