# Timetable Desk

Smart Resource Booking, Faculty Load and Timetable Management.
It decides who teaches what, when and where, while respecting each teacher's weekly load.

## Stack
- **Frontend:** React 18, Vite, React Router, Framer Motion
- **Backend:** Node.js 20+, Express, JWT login, SQLite (better-sqlite3), PDFKit
- **Database rules:** unique indexes make it impossible to double-book a teacher, class or room

## Project structure
```
timetable-desk/
  backend/
    src/
      server.js        Express app, login route, auth guard
      db.js            SQLite schema and conflict-proof indexes
      auth.js          Accounts, JWT, registration and password reset
      mailer.js        Sends reset codes (SMTP, or prints to the terminal)
      scheduler.js     Automatic timetable generator
      seed.js          Demo data loader (semesters 3 and 5)
      routes/
        auth.js        Login, register, forgot and reset routes
        crud.js        Departments, faculty, subjects, venues, assignments
        planner.js     Set or clear a teacher for a class's subject
        timetable.js   Generate and read the timetable
        bookings.js    Lab and room booking with conflict checks
        insights.js    Dashboard, live availability, workload report
        export.js      Timetable PDF export
  frontend/
    src/
      api.js           Fetch wrapper and PDF opener
      store.jsx        Shared data and toast notifications
      App.jsx          Routes and login guard
      styles.css       Theme (light and dark)
      components/      Layout, Form, Grid, ui helpers
      pages/           Login, Dashboard, Setup, Planner, Assign, Timetable,
                       Availability, Booking, Reports
```

## Run it
Open two terminals.

```bash
# 1) API (http://localhost:4000)
cd backend
npm install
cp .env.example .env        # then edit JWT_SECRET and ADMIN_PASSWORD
npm run seed                # optional: loads demo data and generates a timetable
npm run dev

# 2) Web app (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Sign in with the `ADMIN_USER` and `ADMIN_PASSWORD` from `.env` (defaults: `admin` / `admin123`).

## College branding
- Picture: `frontend/public/campus.svg` is an illustrated college building used as the login backdrop and dashboard banner. To use your own photo, put it in `frontend/public/` (for example `campus.jpg`) and change the file name in `frontend/src/config.js`.
- College name: set `VITE_COLLEGE_NAME` in `frontend/.env` (copy `.env.example` first). For the header of exported PDFs, set `COLLEGE_NAME` in `backend/.env`.
- Colours are defined at the top of `frontend/src/styles.css`.

## Accounts and password reset
The login card has four screens: **Sign in** (username or email), **Create new account**, **Forgot password** and **Reset password**.
- **Create new account** asks for full name, username, email, password and a **staff registration code**. The code is `SIGNUP_CODE` in `backend/.env`. If it is empty, account creation is turned off, so strangers cannot make themselves administrators. Every account has full admin access, so share the code only with trusted staff.
- **Forgot password** asks for a username or email, then sends a 6-digit code that is valid for 15 minutes, works once, and locks after 5 wrong tries. The screen gives the same answer whether or not the account exists. A new code can be requested once a minute.
- **Email delivery:** fill in the `SMTP_*` and `MAIL_FROM` settings in `backend/.env` to send the code by email. With `SMTP_HOST` empty, the code is printed in the backend terminal instead, which is fine for local use and demos.
- Passwords must be 8 to 72 characters and are stored as bcrypt hashes. Sign-in, registration and reset requests are rate limited.
- The built-in `admin` account has no email, so its reset code is always shown in the server terminal. Change its password (`ADMIN_PASSWORD` in `.env`) before real use.

## How to use it
1. **Setup:** add departments (with the number of teachers), then **classes** (department + semester 1 to 8 + section, for example Computer Science, Semester 3, Section A), teachers (with required weekly load), subjects (department, **semester**, hours per week, classroom or lab) and venues.
2. **Semester planner (easiest way):** choose a department and a semester. Add that semester's own sections, subjects and teachers, then pick a teacher for every subject in every section from the table (or use "All sections" to set them together). Each semester keeps its own subjects and teachers. The Teacher load card shows each teacher's hours across all semesters against their required load. When every subject has a teacher, click "Generate semester N timetable".
   **Assign teaching** is the alternative form: pick a class, then one of the subjects for that class's department and semester, then the teacher (and optionally a venue). Each section of a class is assigned separately, so sections can have different teachers.
3. **Timetable:** pick the **semester** you are making, then click Generate. Only that semester is rebuilt; other semesters keep their timetables, and their teachers and rooms stay blocked so nothing clashes. View by class, teacher (all semesters) or venue (all semesters). Export PDF.
4. **Live availability:** see free and busy rooms for any slot, refreshed every 30 seconds.
5. **Lab booking:** book extra periods; clashes with classes or other bookings are refused.
6. **Workload reports:** required vs assigned vs scheduled hours for every teacher.

## Scheduling rules
- One session per teacher, class (department + semester + section) and venue in any slot (enforced in code and by the database).
- A teacher's weekly load counts hours from all semesters together.
- Labs run as 2-period blocks that never cross the lunch break.
- A teacher is never scheduled beyond their required weekly load or more than 6 hours a day.
- Sessions are spread over different days where possible.
- Anything that cannot be placed is listed under "Please review" on the Timetable page.
- Changing a teaching assignment clears only that semester's timetable, so you never see a stale one.

## API summary (all routes except login need `Authorization: Bearer <token>`)
| Method | Route | Purpose |
|---|---|---|
| POST | /api/auth/login | Get a token (body: `identifier`, `password`) |
| POST | /api/auth/register | Create an account (needs the staff registration code) |
| POST | /api/auth/forgot | Send a 6-digit reset code |
| POST | /api/auth/reset | Set a new password with the code |
| GET, POST, DELETE | /api/departments, /classes, /faculty, /subjects, /venues, /assignments | Manage base data |
| GET | /api/timetable | Sessions and scheduling notes per semester |
| POST | /api/timetable/generate | Build one semester: body `{ "semester": 3 }` |
| POST | /api/planner/assign | Set or clear the teacher: `{ class_id, subject_id, faculty_id }` |
| GET, POST, DELETE | /api/bookings | Extra venue bookings |
| GET | /api/availability?day=0&period=0 | Free and busy rooms, free teachers |
| GET | /api/dashboard | Totals, utilisation, workload |
| GET | /api/reports/workload | Per-teacher hours |
| GET | /api/export/timetable.pdf?mode=cls&semester=3 | PDF (mode: cls, fac, ven) |

## Going to production
- Set a long random `JWT_SECRET`, a strong `ADMIN_PASSWORD` and a private `SIGNUP_CODE`; configure SMTP for reset emails; serve over HTTPS.
- Set `CORS_ORIGIN` to your real frontend URL, and `VITE_API_URL` to your API URL before `npm run build`.
- To move to PostgreSQL, replace `db.js` and the prepared statements (the SQL is standard).

## Upgrading from the first version
If you already have a `backend/data.db`, it upgrades itself on start. Departments, teachers, venues and bookings are kept; subjects, assignments and timetables are reset because they now need a semester and a class. Re-add them, or delete `data.db` and run `npm run seed` for fresh demo data.
