# PeopleNest

PeopleNest is a responsive, no-framework HR workspace demo for a small team. It runs in the browser and uses the same LocalStorage records across its seven HTML pages.

## Run it

1. Open the project with a static web server (for example, VS Code Live Server) or publish the folder to GitHub Pages.
2. Visit `index.html` on that same site origin.
3. Create the company and first admin account.
4. From **Your people**, add employee accounts and give each person a temporary password to sign in.

No build step, package installation, backend, or external chart library is required. Attendance charts are drawn with CSS. The first admin can use the workspace on the same browser to check both role-specific experiences.

The workflow in `.github/workflows/pages.yml` publishes the static site to GitHub Pages whenever `main` is pushed. After the first deployment succeeds, the expected site URL for the PeopleDesk repository is `https://tayyabkashmiriiqbal-dev.github.io/PeopleDesk/`.

## Pages

- `index.html` — workspace setup and sign-in
- `admin.html` — team overview, attendance, export, and helper
- `employees.html` — employee accounts and profiles
- `leaves.html` — employee requests and admin decisions
- `settings.html` — company schedule, grace period, and leave quota
- `employee.html` — personal attendance and leave dashboard
- `payslip.html` — monthly pay estimates and print-to-PDF

Shared logic is in `js/`; the responsive theme is in `css/style.css`. All pages use the required `hcm_company`, `hcm_users`, `hcm_attendance`, and `hcm_leaves` keys. The UI preference and current session are stored separately.

## Demo security and data notes

This is a learning/demo app, not production HR or payroll software. LocalStorage is editable by the person using the browser; passwords are stored in demo form, and role checks are client-side. Do not enter real employee information or passwords. A production system needs a trusted server, real authentication and authorization, encrypted transport and storage, audit logs, backups, and appropriate privacy controls.

Attendance check-in is a browser-based demo, not verified proof of physical presence. Admins can mark unrecorded employees absent after confirming. Check-in is late after the configured office start plus grace period; a completed shift shorter than the configured half-day threshold is marked half day.

Leave requests count configured working days, exclude weekends, reserve pending requests against the yearly quota, and cannot overlap another pending or approved request. Payslips are estimates: monthly salary is divided by configured workdays, then recorded absences and half days are deducted. Approved leave is not deducted.

The app's data is scoped to the website origin and browser profile. Clearing site data removes it; use the browser's site-data export or another appropriate backup approach before clearing it. GitHub Pages serves the static demo but does not make LocalStorage shared between users or devices.
