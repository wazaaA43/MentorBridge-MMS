# MentorBridge-MMS
# Mentor Management System

Simply Complex Africa 2026 - ICT Hackathon, Tech Build Challenge 08.
A development-relationship platform (not a booking system) that helps the right mentee find the right mentor, manages assignment and capacity, records sessions/actions, and reports mentoring progress.

## Team
| Name     | Primary Role              |
|----------|---------------------------|
| Leah     | Version control           |
| Matete   | Front end                 |
| Ndzalama | Back end                  |
| Mpho     | Database / matching logic |
| Lerato   | Dashboards / Reporting, Authentication |

## Tech Stack
- Front end: HTML/CSS/JavaScript
- Back end: Node.js + Express
- Database: SQLite (via better-sqlite3)
- Hosting: TBD

## Project Structure
/frontend - UI code
/backend - API and business logic
/docs - README, architecture diagram, user guide, roadmap, contribution statement

## Requirements Checklist
- [x] A. Mentor profile & expertise
- [x] B. Mentee profile & development needs
- [x] C. Matching (explainable results)
- [x] D. Assignment & capacity
- [x] E. Availability & booking
- [x] F. Attendance, notes & actions
- [x] G. Feedback & outcomes
- [x] H. Dashboards & hours reporting

## Getting Started
1. Clone the repo: `git clone https://github.com/<your-org-or-username>/MentorBridge-MMS.git`
2. Backend: `cd backend`, run `npm install`, then `node app.js`
3. The SQLite database is created automatically on first run (from `schema.sql`) - no separate database setup needed
4. Frontend: open `frontend/index.html` in your browser

## Known Limitations
- No automated test suite; testing was done manually during the 7-day build
- No password-reset flow for authentication
- No email/SMS notifications for bookings or matches
- Matching algorithm is rule-based, not machine-learning driven
- Limited mobile responsiveness; optimised for desktop browsers
- No production-grade error handling/logging yet

## Roadmap
- **30 days:** automated tests, mobile responsiveness, password reset
- **60 days:** email/SMS notifications for bookings and matches
- **90 days:** smarter weighted matching, analytics/export for reporting
