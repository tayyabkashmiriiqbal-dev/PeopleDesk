(function () {
  "use strict";
  const H = window.HCM;
  const page = document.body.dataset.page;
  const roles = {
    admin: ["admin"], employees: ["admin"], settings: ["admin"],
    employee: ["employee"], leaves: ["admin", "employee"], payslip: ["admin", "employee"],
  };
  const user = H.auth.requireRole(roles[page] || []);
  if (!user) return;
  let employeeQuery = "";
  let departmentFilter = "";

  function field(label, name, value = "", options = {}) {
    const type = options.type || "text";
    const required = options.required === false ? "" : "required";
    const extra = options.extra || "";
    const full = options.full ? "field-full" : "";
    return `<label class="field ${full}"><span>${label}</span><input name="${name}" type="${type}" value="${H.escape(value)}" ${required} ${extra}></label>`;
  }
  function statusBadge(status) {
    const options = {
      present: ["Present", ""], late: ["Late", "warning"], absent: ["Absent", "danger"],
      "half-day": ["Half day", "warning"], "on-leave": ["On leave", "neutral"],
      "not-checked-in": ["Not checked in", "neutral"], "not-started": ["Not started", "neutral"],
      "off-day": ["Non-working day", "neutral"],
      pending: ["Pending", "warning"], approved: ["Approved", ""], rejected: ["Declined", "danger"],
    };
    const [label, type] = options[status] || [status, "neutral"];
    return `<span class="status ${type}">${label}</span>`;
  }
  function pageHeading(title, description, actions = "") {
    return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div><div class="page-actions">${actions}</div></div>`;
  }
  function button(label, action, secondary = false, icon = "+") {
    return `<button type="button" class="button ${secondary ? "button-secondary" : "button-primary"}" data-action="${action}"><span>${icon}</span>${label}</button>`;
  }
  function stat(title, value, note, icon) {
    return `<article class="stat-card"><div class="stat-head"><span>${title}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></article>`;
  }
  function emptyRow(columns, title, detail) {
    return `<tr><td colspan="${columns}"><div class="empty-state"><strong>${title}</strong>${detail}</div></td></tr>`;
  }
  function employeeById(id) { return H.employeesApi.find(id); }
  function weekChart() {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const key = H.localDate(date);
      const present = H.employees().filter(person => ["present", "late", "half-day"].includes(H.attendance.status(person.id, key))).length;
      const height = H.employees().length ? Math.round(present / H.employees().length * 100) : 0;
      return { label: date.toLocaleDateString("en-PK", { weekday: "short" }), present, height, today: index === 6 };
    });
    return `<div class="chart-bars">${days.map(day => `<div class="chart-day"><div class="chart-stack"><div class="chart-bar ${day.today ? "present" : ""}" title="${day.present} checked in" style="height:${day.height}%"></div></div><span class="chart-label">${day.label}</span></div>`).join("")}</div><div class="legend"><span>Checked in</span><span>Not checked in</span></div>`;
  }
  function personCell(person) {
    return `<div class="person-cell"><span class="avatar">${H.escape(H.initials(person.fullName))}</span><div><strong>${H.escape(person.fullName)}</strong><span>${H.escape(person.id)}</span></div></div>`;
  }
  function attendanceTable(people = H.employees()) {
    const rows = people.map(person => {
      const record = H.attendance.find(person.id);
      const currentStatus = H.attendance.status(person.id);
      const shownStatus = currentStatus === "half-day" && record?.wasLate ? "Half day · late" : currentStatus;
      return `<tr><td>${personCell(person)}</td><td>${H.escape(person.department)}</td><td>${record ? H.attendance.formatTime(record.checkIn) : "—"}</td><td>${record ? H.attendance.formatTime(record.checkOut) : "—"}</td><td>${statusBadge(shownStatus)}</td></tr>`;
    }).join("");
    return `<div class="table-wrap"><table><thead><tr><th>Team member</th><th>Department</th><th>Check-in</th><th>Check-out</th><th>Status</th></tr></thead><tbody>${rows || emptyRow(5, "No employees yet", "Add your first teammate to get started.")}</tbody></table></div>`;
  }
  function adminPage() {
    const employees = H.employees();
    const today = H.localDate();
    const isWorkday = H.attendance.isWorkingDay(today);
    const todayStatuses = employees.map(person => H.attendance.status(person.id, today));
    const present = isWorkday ? todayStatuses.filter(status => ["present", "late", "half-day"].includes(status)).length : 0;
    const absent = isWorkday ? todayStatuses.filter(status => status === "absent").length : 0;
    const late = isWorkday ? employees.filter(person => H.attendance.find(person.id, today)?.wasLate || H.attendance.status(person.id, today) === "late").length : 0;
    const pending = H.leave.records().filter(item => item.status === "pending");
    const recent = [...employees].sort((a, b) => b.joiningDate.localeCompare(a.joiningDate)).slice(0, 5);
    const recentRows = recent.map(person => `<tr><td>${personCell(person)}</td><td>${H.escape(person.position)}</td><td>${H.escape(person.department)}</td><td>${H.dateLabel(person.joiningDate)}</td><td><span class="status">Active</span></td></tr>`).join("");
    const pendingRows = pending.slice(0, 4).map(leave => {
      const person = employeeById(leave.userId);
      return person ? `<div class="alert-row"><span class="avatar">${H.escape(H.initials(person.fullName))}</span><div class="alert-copy"><strong>${H.escape(person.fullName)}</strong><span>${H.escape(leave.type)} · ${leave.workingDays} day${leave.workingDays === 1 ? "" : "s"}</span></div><button class="plain-link" data-action="leave-review" data-id="${H.escape(leave.id)}" data-decision="approved">Review</button></div>` : "";
    }).join("");
    return `${pageHeading(`Welcome, ${H.escape(user.fullName.split(" ")[0])}`, "Here's a little snapshot of your team today.", `${button("Add a person", "add-employee")}`)}
      <div class="stats-grid">
        ${stat("Team members", employees.length, "Active people in your workspace", "♙")}
        ${stat("Checked in", present, "Present, late or half-day", "✓")}
        ${stat("Absent today", absent, "Marked absent; leave is excluded", "–")}
        ${stat("Arrived late", late, "Beyond today's grace period", "◷")}
        ${stat("Leave to review", pending.length, "Waiting for your decision", "▤")}
      </div>
      <div class="content-grid">
        <section class="panel"><div class="panel-header"><div><div class="panel-title">Attendance at a glance</div><div class="panel-subtitle">Team check-ins over the last 7 days</div></div><span class="status">${H.dateLabel(today, { day: "numeric", month: "short" })}</span></div>${weekChart()}</section>
        <section class="panel"><div class="panel-header"><div><div class="panel-title">Time off to review</div><div class="panel-subtitle">Requests waiting for your decision</div></div><a class="plain-link" href="leaves.html">See requests →</a></div><div class="alert-list">${pendingRows || `<div class="empty-wrap"><strong>All caught up</strong>No pending leave requests.</div>`}</div></section>
      </div>
      <section class="table-card"><div class="table-header"><div><div class="table-title">Today's attendance</div><div class="panel-subtitle">${H.dateLabel(today)}</div></div><div class="table-tools"><button class="button button-small button-secondary" data-action="export-attendance">Export CSV</button><button class="button button-small button-secondary" data-action="mark-absences">Mark absences</button></div></div>${attendanceTable()}</section>
      <section class="table-card"><div class="table-header"><div><div class="table-title">New to the team</div><div class="panel-subtitle">Recently added people</div></div><a href="employees.html" class="plain-link">All people →</a></div><div class="table-wrap"><table><thead><tr><th>Team member</th><th>Position</th><th>Department</th><th>Joined</th><th>Status</th></tr></thead><tbody>${recentRows || emptyRow(5, "Your team starts here", "Add someone new to your workspace.")}</tbody></table></div></section>
      <div class="two-col" style="margin-top:14px"><div>${H.helper.render("admin")}</div><section class="panel"><div class="panel-header"><div><div class="panel-title">A quick note</div><div class="panel-subtitle">Your workspace, your pace</div></div><span class="stat-icon">✳</span></div><p class="muted-note">Keep employee profiles and attendance up to date to make leave and pay summaries more useful. PeopleNest stores this demo workspace in this browser.</p><a class="plain-link" href="settings.html">Review workspace settings →</a></section></div>`;
  }

  function employeesPage() {
    const departments = [...new Set(H.employees().map(person => person.department).filter(Boolean))].sort();
    let people = H.employees();
    if (employeeQuery) {
      const query = employeeQuery.toLowerCase();
      people = people.filter(person => [person.fullName, person.email, person.id, person.position].some(value => String(value).toLowerCase().includes(query)));
    }
    if (departmentFilter) people = people.filter(person => person.department === departmentFilter);
    const rows = people.map(person => `<tr><td>${personCell(person)}</td><td>${H.escape(person.email)}</td><td>${H.escape(person.department)}</td><td>${H.escape(person.position)}</td><td>${H.money(person.salary)}</td><td>${H.dateLabel(person.joiningDate)}</td><td><div class="row-actions"><button class="icon-button" title="View details" aria-label="View details" data-action="view-employee" data-id="${H.escape(person.id)}">⌕</button><button class="icon-button" title="Edit" aria-label="Edit" data-action="edit-employee" data-id="${H.escape(person.id)}">✎</button><button class="icon-button delete" title="Delete" aria-label="Delete" data-action="delete-employee" data-id="${H.escape(person.id)}">×</button></div></td></tr>`).join("");
    return `${pageHeading("Your people", "The people who make your company what it is.", button("Add a person", "add-employee"))}
      <div class="stat-grid-three">${stat("Active people", H.employees().length, "Employee accounts", "♙")}${stat("Departments", departments.length, "Across your organization", "▦")}${stat("Monthly payroll", H.money(H.employees().reduce((sum, item) => sum + item.salary, 0)), "Based on listed salaries", "▧")}</div>
      <section class="table-card"><div class="table-header"><div><div class="table-title">People directory</div><div class="panel-subtitle">${people.length} of ${H.employees().length} team members</div></div><div class="table-tools"><input id="employee-search" class="search-input" type="search" value="${H.escape(employeeQuery)}" placeholder="Search people…" aria-label="Search people"><select id="department-filter" class="filter-select" aria-label="Filter by department"><option value="">All departments</option>${departments.map(department => `<option value="${H.escape(department)}" ${departmentFilter === department ? "selected" : ""}>${H.escape(department)}</option>`).join("")}</select></div></div><div class="table-wrap"><table><thead><tr><th>Team member</th><th>Email</th><th>Department</th><th>Position</th><th>Monthly salary</th><th>Joined</th><th>Actions</th></tr></thead><tbody>${rows || emptyRow(7, "No people found", "Try changing the search or add your first team member.")}</tbody></table></div></section>`;
  }

  function employeeForm(person = null) {
    const editing = Boolean(person);
    const departments = ["Operations", "Engineering", "Finance", "Human Resources", "Marketing", "Sales", "Customer support"];
    const departmentOptions = [...new Set([...departments, ...(person?.department ? [person.department] : [])])];
    H.ui.modal(editing ? "Edit team member" : "Add a team member", "Their account will be ready to sign in as soon as you save.", `
      <div class="form-grid">
        ${field("Full name", "fullName", person?.fullName || "")}
        ${field("Email address", "email", person?.email || "", { type: "email" })}
        <label class="field"><span>Department</span><select name="department" required><option value="">Choose department</option>${departmentOptions.map(value => `<option ${person?.department === value ? "selected" : ""}>${H.escape(value)}</option>`).join("")}<option value="Other">Other</option></select></label>
        ${field("Job position", "position", person?.position || "")}
        ${field("Phone number", "phone", person?.phone || "", { required: false, type: "tel" })}
        ${field("Monthly salary (PKR)", "salary", person?.salary ?? "", { type: "number", extra: 'min="1" step="0.01"' })}
        ${field("Joining date", "joiningDate", person?.joiningDate || H.localDate(), { type: "date" })}
        ${field(editing ? "Set a new password (optional)" : "Temporary password", "password", "", { type: "password", required: !editing, extra: `minlength="8" autocomplete="${editing ? "new-password" : "new-password"}"` })}
      </div>`,
    async values => {
      H.employeesApi.save(values, person?.id || null);
      H.toast(editing ? "Team member updated" : "Team member added");
      render();
    }, editing ? "Save changes" : "Add team member");
  }
  function detailsModal(person) {
    H.ui.modal("A little about them", "Employee profile details.", `
      <div class="profile-block"><span class="avatar">${H.escape(H.initials(person.fullName))}</span><div><h2>${H.escape(person.fullName)}</h2><p>${H.escape(person.id)} · ${H.escape(person.position)}</p></div></div>
      <div class="form-grid">
        <label class="field"><span>Email</span><input value="${H.escape(person.email)}" readonly></label>
        <label class="field"><span>Phone</span><input value="${H.escape(person.phone || "Not provided")}" readonly></label>
        <label class="field"><span>Department</span><input value="${H.escape(person.department)}" readonly></label>
        <label class="field"><span>Monthly salary</span><input value="${H.money(person.salary)}" readonly></label>
        <label class="field"><span>Joined</span><input value="${H.dateLabel(person.joiningDate)}" readonly></label>
      </div>`,
    async () => {}, "Done");
  }

  function employeePage() {
    const today = H.localDate();
    const record = H.attendance.find(user.id);
    const currentStatus = H.attendance.status(user.id);
    const leave = H.leave.balance(user.id);
    const allRecords = H.attendance.records().filter(item => item.userId === user.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
    const statusText = currentStatus === "not-checked-in" ? "Not checked in yet" : currentStatus === "on-leave" ? "You're on approved leave today" : currentStatus === "off-day" ? "Today is a non-working day" : currentStatus === "half-day" && record?.wasLate ? "Today's status · half day, late check-in" : `Today's status · ${currentStatus.replace("-", " ")}`;
    const buttonAction = currentStatus === "off-day" || currentStatus === "not-started" ? `<button class="button button-secondary" disabled>${currentStatus === "off-day" ? "Non-working day" : "Joining date hasn't arrived"}</button>` : currentStatus === "on-leave" ? `<button class="button button-secondary" disabled>On approved leave</button>` : !record || currentStatus === "absent" ? `<button class="button button-primary" data-action="check-in">Check in <span>→</span></button>` : record.checkOut ? `<button class="button button-secondary" disabled>Day complete</button>` : `<button class="button button-primary" data-action="check-out">Check out <span>→</span></button>`;
    const attendanceRows = allRecords.map(item => `<tr><td>${H.dateLabel(item.date)}</td><td>${item.checkIn ? H.attendance.formatTime(item.checkIn) : "—"}</td><td>${item.checkOut ? H.attendance.formatTime(item.checkOut) : "—"}</td><td>${item.hours ? `${Number(item.hours).toFixed(1)} hrs` : "—"}</td><td>${statusBadge(item.status === "half-day" && item.wasLate ? "Half day · late" : item.status)}</td></tr>`).join("");
    return `${pageHeading(`Hello, ${H.escape(user.fullName.split(" ")[0])}`, "Hope your day is off to a good start.", `${button("Request time off", "apply-leave", true, "＋")}<a class="button button-primary" href="payslip.html?month=${today.slice(0, 7)}">View pay statement <span>→</span></a>`)}
      <div class="profile-block"><span class="avatar">${H.escape(H.initials(user.fullName))}</span><div><h2>${H.escape(user.fullName)}</h2><p>${H.escape(user.position)} · ${H.escape(user.department)} · ${H.escape(user.id)}</p></div></div>
      <div class="stats-grid stats-four">
        ${stat("Today's status", statusText, record?.checkIn ? `In at ${H.attendance.formatTime(record.checkIn)}` : "You can check in when you arrive", "◷")}
        ${stat("Hours this week", `${H.attendance.weekHours(user.id).toFixed(1)} hrs`, "From completed check-outs", "⌁")}
        ${stat("Leave available", leave.remaining, `of ${leave.quota} days · ${new Date().getFullYear()}`, "☼")}
        ${stat("Today so far", `${Number(record?.hours || 0).toFixed(1)} hrs`, record?.checkOut ? `Out at ${H.attendance.formatTime(record.checkOut)}` : "Time updates at check-out", "◴")}
      </div>
      <div class="content-grid">
        <section class="panel"><div class="panel-header"><div><div class="panel-title">Your attendance</div><div class="panel-subtitle">${H.dateLabel(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div></div>${statusBadge(currentStatus === "half-day" && record?.wasLate ? "Half day · late" : currentStatus)}</div>
          <div class="attendance-status"><div><strong>${record?.checkIn ? `Checked in at ${H.attendance.formatTime(record.checkIn)}` : statusText}</strong><div class="panel-subtitle">${record?.status === "late" ? "Your check-in was after the office grace period." : record?.status === "half-day" ? "Your recorded hours are under the half-day threshold." : "Attendance is recorded on this device."}</div></div><div class="hours-value">${Number(record?.hours || 0).toFixed(1)}h</div></div>
          <div class="attendance-controls">${buttonAction}</div>
        </section>
        <section class="panel"><div class="panel-header"><div><div class="panel-title">Your time off</div><div class="panel-subtitle">Annual allowance and pending requests</div></div><a class="plain-link" href="leaves.html">View requests →</a></div>
          <div class="attendance-status"><div><strong>${leave.remaining} days available</strong><div class="panel-subtitle">${leave.used} days approved or pending this year</div></div><span class="stat-icon">☼</span></div>
          <p class="muted-note">Weekends don't count toward your leave days. Requests need your manager's approval.</p>
        </section>
      </div>
      <div class="two-col" style="margin-top:14px"><section class="table-card"><div class="table-header"><div><div class="table-title">Recent attendance</div><div class="panel-subtitle">Your latest recorded days</div></div></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>In</th><th>Out</th><th>Hours</th><th>Status</th></tr></thead><tbody>${attendanceRows || emptyRow(5, "No attendance yet", "Your check-ins will appear here.")}</tbody></table></div></section><div>${H.helper.render("employee")}</div></div>`;
  }

  function leavesPage() {
    const adminView = user.role === "admin";
    const allLeaves = H.leave.records();
    const leaves = allLeaves.filter(item => adminView || item.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const balance = !adminView ? H.leave.balance(user.id) : null;
    const action = adminView ? "" : button("Request time off", "apply-leave");
    const summary = adminView
      ? `<div class="stat-grid-three">${stat("Waiting for review", allLeaves.filter(item => item.status === "pending").length, "Requests to look at", "◷")}${stat("Approved this year", allLeaves.filter(item => item.status === "approved" && item.startDate.slice(0, 4) === String(new Date().getFullYear())).length, "Approved requests", "✓")}${stat("Team on leave today", H.leave.onLeaveToday().length, "Approved absence", "☼")}</div>`
      : `<div class="stat-grid-three">${stat("Available", balance.remaining, `of ${balance.quota} days this year`, "☼")}${stat("Used or pending", balance.used, "Pending requests reserve days", "◷")}${stat("Approved requests", leaves.filter(item => item.status === "approved").length, "In your request history", "✓")}</div>`;
    const comment = leave => leave.comment ? `<span class="muted-note">${H.escape(leave.comment)}</span>` : adminView ? "" : `<span class="muted-note">Awaiting review</span>`;
    const rows = leaves.map(leave => {
      const person = employeeById(leave.userId);
      if (!person) return "";
      return `<tr>${adminView ? `<td>${personCell(person)}</td>` : `<td><strong>${H.escape(leave.reason)}</strong></td>`}<td>${H.escape(leave.type)}</td><td>${H.dateLabel(leave.startDate)} – ${H.dateLabel(leave.endDate)}</td><td>${leave.workingDays}</td><td>${statusBadge(leave.status)}</td><td>${adminView && leave.status === "pending" ? `<button class="button button-small button-secondary" data-action="leave-review" data-id="${H.escape(leave.id)}">Review</button>` : comment(leave)}</td></tr>`;
    }).join("");
    return `${pageHeading(adminView ? "Time-off requests" : "My time off", adminView ? "Review and decide on your team's upcoming leave." : "Plan some time away and keep track of your allowance.", action)}
      ${summary}
      <section class="table-card"><div class="table-header"><div><div class="table-title">${adminView ? "All team requests" : "Your requests"}</div><div class="panel-subtitle">${leaves.length} request${leaves.length === 1 ? "" : "s"}</div></div><select id="leave-filter" class="filter-select" aria-label="Filter leave requests"><option value="all">All requests</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Declined</option></select></div>
        <div class="table-wrap"><table><thead><tr>${adminView ? "<th>Team member</th>" : "<th>Reason</th>"}<th>Leave type</th><th>Dates</th><th>Workdays</th><th>Status</th><th>${adminView ? "Action" : "Review note"}</th></tr></thead><tbody id="leave-table-body">${rows || emptyRow(6, "No leave requests yet", adminView ? "Your team's requests will appear here." : "Your leave history will appear here.")}</tbody></table></div></section>`;
  }

  function leaveForm() {
    H.ui.modal("Request time off", "Leave days are counted using your company's configured workweek.", `
      <div class="form-grid">
        <label class="field"><span>Leave type</span><select name="type" required><option>Annual leave</option><option>Sick leave</option><option>Personal leave</option><option>Unpaid leave</option></select></label>
        ${field("Start date", "startDate", H.localDate(), { type: "date", extra: `min="${H.localDate()}"` })}
        ${field("End date", "endDate", H.localDate(), { type: "date", extra: `min="${H.localDate()}"` })}
        <label class="field field-full"><span>Reason</span><textarea name="reason" required maxlength="500" placeholder="A short note for your manager"></textarea></label>
      </div>`,
    async values => {
      H.leave.apply(user.id, values);
      H.toast("Your request has been sent");
      render();
    }, "Send request");
  }

  function reviewLeave(id) {
    const leave = H.leave.records().find(item => item.id === id);
    if (!leave) return H.toast("This request is no longer available.", "error");
    const person = employeeById(leave.userId);
    H.ui.modal(`Review ${person?.fullName || "leave request"}`, `${H.dateLabel(leave.startDate)} – ${H.dateLabel(leave.endDate)} · ${leave.workingDays} working days · ${leave.type}`, `
      <div class="panel" style="padding:12px"><strong>${H.escape(leave.reason)}</strong></div>
      <label class="field"><span>Comment for the employee (optional)</span><textarea name="comment" maxlength="500" placeholder="Add a note about your decision"></textarea></label>
      <div class="inline-meta"><button class="button button-danger button-small" type="button" data-decline>Decline request</button></div>`,
    async values => {
      H.leave.decide(id, "approved", values.comment);
      H.toast("Leave request approved");
      render();
    }, "Approve request");
    const form = document.querySelector("#modal-form");
    const decline = form.querySelector("[data-decline]");
    decline.addEventListener("click", async () => {
      try {
        H.leave.decide(id, "rejected", form.elements.comment.value);
        H.ui.closeModal();
        H.toast("Leave request declined");
        render();
      } catch (error) { H.toast(error.message, "error"); }
    });
  }

  function settingsPage() {
    const company = H.company();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${pageHeading("Workspace settings", "Set the rhythm and leave allowance that work for your team.")}
      <form class="panel settings-form" id="settings-form">
        <div class="panel-header"><div><div class="panel-title">Company details</div><div class="panel-subtitle">The name shown across your PeopleNest workspace.</div></div></div>
        <div class="form-grid">
          ${field("Company name", "name", company.name)}
          ${field("Office start time", "officeStart", company.officeStart || "09:00", { type: "time" })}
          ${field("Grace period (minutes)", "graceMinutes", company.graceMinutes ?? 10, { type: "number", extra: 'min="0" max="180" step="1"' })}
          ${field("Yearly leave quota (days)", "yearlyLeaveQuota", company.yearlyLeaveQuota ?? 12, { type: "number", extra: 'min="0" max="365" step="1"' })}
          ${field("Half-day threshold (hours)", "halfDayHours", company.halfDayHours ?? 4, { type: "number", extra: 'min="1" max="12" step="0.5"' })}
          <div class="field field-full"><span>Working days <small class="panel-subtitle">Unchecked days are weekends.</small></span><div class="weekday-grid">${days.map((day, index) => `<label class="weekday-option"><input type="checkbox" name="workingDays" value="${index}" ${(company.workingDays || []).includes(index) ? "checked" : ""}>${day}</label>`).join("")}</div></div>
        </div><div class="form-actions"><button class="button button-primary" type="submit">Save settings</button></div>
      </form>
      <p class="muted-note" style="max-width:760px;margin-top:12px">PeopleNest is a browser-based demo. Your workspace is stored in this browser's LocalStorage; clearing site data will remove it.</p>`;
  }

  function saveSettings(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const workingDays = [...form.querySelectorAll('input[name="workingDays"]:checked')].map(input => Number(input.value));
    const grace = Number(values.graceMinutes);
    const quota = Number(values.yearlyLeaveQuota);
    const halfDayHours = Number(values.halfDayHours);
    if (!values.name.trim()) return H.toast("Enter your company name.", "error");
    const [officeHour, officeMinute] = String(values.officeStart || "").split(":").map(Number);
    if (!/^\d{2}:\d{2}$/.test(values.officeStart) || officeHour > 23 || officeMinute > 59) return H.toast("Enter a valid office start time.", "error");
    if (!Number.isInteger(grace) || grace < 0 || grace > 180) return H.toast("Grace period must be between 0 and 180 minutes.", "error");
    if (!Number.isInteger(quota) || quota < 0 || quota > 365) return H.toast("Yearly leave quota must be between 0 and 365 days.", "error");
    if (!Number.isFinite(halfDayHours) || halfDayHours < 1 || halfDayHours > 12) return H.toast("Half-day hours must be between 1 and 12.", "error");
    if (!workingDays.length) return H.toast("Choose at least one working day.", "error");
    if (!H.set("company", { ...H.company(), name: values.name.trim(), officeStart: values.officeStart, graceMinutes: grace, yearlyLeaveQuota: quota, halfDayHours, workingDays })) {
      return H.toast("Could not save your settings.", "error");
    }
    H.toast("Workspace settings saved");
    render();
  }

  function payslipPage() {
    const employees = user.role === "admin" ? H.employees() : [user];
    const params = new URLSearchParams(window.location.search);
    const month = params.get("month") || H.localDate().slice(0, 7);
    const selectedId = user.role === "admin" ? params.get("employee") || employees[0]?.id : user.id;
    const selected = employeeById(selectedId);
    const selector = user.role === "admin" ? `<label class="field"><span>Team member</span><select id="pay-employee">${employees.map(person => `<option value="${H.escape(person.id)}" ${selectedId === person.id ? "selected" : ""}>${H.escape(person.fullName)} · ${H.escape(person.id)}</option>`).join("")}</select></label>` : "";
    if (!selected) return `${pageHeading("Pay statements", "Create a printable monthly pay summary.")}<div class="panel empty-wrap"><strong>No employee accounts yet</strong>Add a team member to create a pay statement.</div>`;
    const pay = H.payslip.calculate(selected.id, month);
    const [year, monthNumber] = month.split("-").map(Number);
    const monthName = new Date(year, monthNumber - 1, 1).toLocaleDateString("en-PK", { month: "long", year: "numeric" });
    return `${pageHeading(user.role === "admin" ? "Pay statements" : "My pay", user.role === "admin" ? "Generate a print-ready monthly salary summary." : "Your monthly salary and recorded attendance, all in one place.", `<button class="button button-primary" data-action="print-payslip">Print / Save PDF &nbsp; ↗</button>`)}
      <div class="table-card no-print"><div class="table-header"><div><div class="table-title">Choose a pay period</div><div class="panel-subtitle">Salary is prorated against this month's configured workdays.</div></div><div class="table-tools">${selector}<label class="field"><span>Month</span><input id="pay-month" class="control" type="month" value="${H.escape(month)}" max="${H.localDate().slice(0, 7)}"></label></div></div></div>
      <article class="payslip" id="payslip-print">
        <div class="payslip-head"><div class="payslip-brand"><span class="brand-symbol">P</span><div><h2>${H.escape(H.company().name)}</h2><p>PeopleNest · Monthly salary statement</p></div></div><div class="payslip-title"><span>PAY STATEMENT</span><h1>${H.escape(monthName)}</h1></div></div>
        <div class="payslip-info">
          <div class="info-pair"><span>Team member</span><strong>${H.escape(pay.employee.fullName)}</strong></div><div class="info-pair"><span>Employee ID</span><strong>${H.escape(pay.employee.id)}</strong></div>
          <div class="info-pair"><span>Department</span><strong>${H.escape(pay.employee.department)}</strong></div><div class="info-pair"><span>Position</span><strong>${H.escape(pay.employee.position)}</strong></div>
          <div class="info-pair"><span>Pay period</span><strong>${H.escape(monthName)}</strong></div><div class="info-pair"><span>Working days this month</span><strong>${pay.workingDays}</strong></div>
        </div>
        <div class="table-wrap salary-table"><table><thead><tr><th>Pay and attendance summary</th><th>Days</th><th>Amount (PKR)</th></tr></thead><tbody>
          <tr><td><strong>Monthly salary</strong></td><td>—</td><td><strong>${H.money(pay.monthlySalary)}</strong></td></tr>
          <tr><td>Present days</td><td>${pay.presentDays}</td><td>${H.money(0)}</td></tr>
          <tr><td>Approved leave days (not deducted)</td><td>${pay.leaveDays}</td><td>${H.money(0)}</td></tr>
          <tr><td>Half days</td><td>${pay.halfDays}</td><td>− ${H.money(pay.monthlySalary / Math.max(1, pay.workingDays) * .5 * pay.halfDays)}</td></tr>
          <tr><td>Absent days</td><td>${pay.absentDays}</td><td>− ${H.money(pay.monthlySalary / Math.max(1, pay.workingDays) * pay.absentDays)}</td></tr>
          <tr><td><strong>Total deduction</strong></td><td>${(pay.absentDays + .5 * pay.halfDays).toFixed(1)} days</td><td><strong>− ${H.money(pay.deduction)}</strong></td></tr>
        </tbody></table></div>
        <div class="salary-total"><span>Estimated net salary</span><strong>${H.money(pay.netSalary)}</strong></div>
        <p class="payslip-note">Estimate only. Daily salary is monthly salary divided by configured workdays in the selected month. Deductions include recorded absences and half days; approved leave is not deducted. This statement is generated from browser-stored demo data and is not an official payroll document.</p>
      </article>`;
  }

  function render() {
    let content;
    if (page === "admin") content = adminPage();
    else if (page === "employees") content = employeesPage();
    else if (page === "employee") content = employeePage();
    else if (page === "leaves") content = leavesPage();
    else if (page === "settings") content = settingsPage();
    else content = payslipPage();
    H.ui.mount(page, content);
    bind();
  }

  function bind() {
    const content = document.querySelector("#page-content");
    content?.addEventListener("click", handleClick);
    const form = document.querySelector("#settings-form");
    form?.addEventListener("submit", saveSettings);
    const search = document.querySelector("#employee-search");
    search?.addEventListener("input", event => {
      employeeQuery = event.target.value;
      const position = event.target.selectionStart;
      render();
      const next = document.querySelector("#employee-search");
      next?.focus();
      next?.setSelectionRange(position, position);
    });
    document.querySelector("#department-filter")?.addEventListener("change", event => {
      departmentFilter = event.target.value;
      render();
    });
    document.querySelector("#leave-filter")?.addEventListener("change", event => {
      const filter = event.target.value;
      const rows = [...H.leave.records()].filter(item => user.role === "admin" || item.userId === user.id)
        .filter(item => filter === "all" || item.status === filter)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const adminView = user.role === "admin";
      const tbody = document.querySelector("#leave-table-body");
      if (tbody) tbody.innerHTML = rows.map(leave => {
        const person = employeeById(leave.userId);
        if (!person) return "";
        const action = adminView && leave.status === "pending" ? `<button class="button button-small button-secondary" data-action="leave-review" data-id="${H.escape(leave.id)}">Review</button>` : statusBadge(leave.status);
        return `<tr><td>${adminView ? personCell(person) : `<strong>${H.escape(leave.reason)}</strong>`}</td><td>${H.escape(leave.type)}</td><td>${H.dateLabel(leave.startDate)} – ${H.dateLabel(leave.endDate)}</td><td>${leave.workingDays}</td><td>${statusBadge(leave.status)}</td><td>${action}</td></tr>`;
      }).join("") || emptyRow(6, "Nothing to see here", "No requests match this status.");
    });
    const updatePaySelection = () => {
      const params = new URLSearchParams(window.location.search);
      const selectedMonth = document.querySelector("#pay-month")?.value;
      const selectedEmployee = document.querySelector("#pay-employee")?.value;
      if (selectedMonth) params.set("month", selectedMonth);
      if (selectedEmployee) params.set("employee", selectedEmployee);
      history.replaceState(null, "", `payslip.html?${params.toString()}`);
      render();
    };
    document.querySelector("#pay-month")?.addEventListener("change", updatePaySelection);
    document.querySelector("#pay-employee")?.addEventListener("change", updatePaySelection);
  }

  function handleClick(event) {
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const id = action.dataset.id;
    try {
      switch (action.dataset.action) {
        case "add-employee": employeeForm(); break;
        case "edit-employee": {
          const person = employeeById(id);
          if (person) employeeForm(person);
          break;
        }
        case "view-employee": {
          const person = employeeById(id);
          if (person) detailsModal(person);
          break;
        }
        case "delete-employee": {
          const person = employeeById(id);
          if (!person || !window.confirm(`Remove ${person.fullName} and their LocalStorage attendance and leave history?`)) break;
          H.employeesApi.remove(id);
          H.toast("Team member removed");
          render();
          break;
        }
        case "mark-absences": {
          if (!window.confirm("Mark every employee without a check-in or approved leave as absent today?")) break;
          const count = H.attendance.markAbsences();
          H.toast(`${count} absence${count === 1 ? "" : "s"} recorded`);
          render();
          break;
        }
        case "export-attendance": H.attendance.csvForDate(); H.toast("Attendance CSV downloaded"); break;
        case "check-in":
          H.attendance.checkIn(user.id);
          H.toast("You're checked in. Have a good day!");
          render();
          break;
        case "check-out": {
          const result = H.attendance.checkOut(user.id);
          H.toast(`Checked out · ${result.hours.toFixed(1)} hours recorded`);
          render();
          break;
        }
        case "apply-leave": leaveForm(); break;
        case "leave-review": reviewLeave(id); break;
        case "print-payslip": H.payslip.print(); break;
      }
    } catch (error) {
      H.toast(error.message, "error");
    }
  }
  render();
})();
