(function () {
  "use strict";
  const H = window.HCM;
  function render(role) {
    return `<section class="panel helper-card" id="helper-card"><div class="panel-header"><div><div class="panel-title">A little help</div><div class="panel-subtitle">Ask PeopleNest about ${role === "admin" ? "your team" : "your workday"}.</div></div><span class="stat-icon">✳</span></div>
      <div class="chat-messages" id="chat-messages"><div class="chat-message">Hi there! Ask me something like “${role === "admin" ? "Who was late today?" : "How many hours did I work this week?"}”</div></div>
      <form class="chat-form" id="chat-form"><input name="question" autocomplete="off" placeholder="Ask a question…" aria-label="Ask the PeopleNest helper" required><button type="submit" aria-label="Send">→</button></form>
    </section>`;
  }
  function answer(question, user) {
    const text = question.toLowerCase();
    if (user.role === "admin") {
      const employees = H.employees();
      const today = H.localDate();
      if (text.includes("leave") || text.includes("holiday") || text.includes("time off")) {
        const away = H.leave.onLeaveToday().map(item => H.employeesApi.find(item.userId)?.fullName).filter(Boolean);
        return away.length ? `On approved leave today: ${away.join(", ")}.` : "No one is on approved leave today.";
      }
      if (text.includes("late") || text.includes("tardy")) {
        const late = employees.filter(person => H.attendance.find(person.id, today)?.wasLate || H.attendance.status(person.id, today) === "late");
        return late.length ? `Late today (${late.length}): ${late.map(person => person.fullName).join(", ")}.` : "No employees are marked late today.";
      }
      if (text.includes("present") || text.includes("attendance")) {
        const count = employees.filter(person => ["present", "late", "half-day"].includes(H.attendance.status(person.id, today))).length;
          return `${count} of ${employees.length} active employees have checked in today.`;
      }
      if (text.includes("employee") || text.includes("team") || text.includes("people") || text.includes("headcount")) {
        return `There ${employees.length === 1 ? "is" : "are"} ${employees.length} active employee${employees.length === 1 ? "" : "s"} in ${H.company().name}.`;
      }
      return "Try asking how many employees you have, who is on leave today, who was late, or how many people are present.";
    }
    const year = new Date().getFullYear();
    if (text.includes("leave") || text.includes("holiday") || text.includes("time off")) {
      const leave = H.leave.balance(user.id, year);
      return `You have ${leave.remaining} of ${leave.quota} leave days available for ${year}. Pending requests count against your available balance.`;
    }
    if (text.includes("late") || text.includes("tardy")) {
      const status = H.attendance.status(user.id);
      const record = H.attendance.find(user.id);
      return status === "late" || record?.wasLate ? "Yes — your check-in is marked late today." : ["not-checked-in", "absent"].includes(status) ? "There is no check-in recorded for you today." : status === "on-leave" ? "You are on approved leave today." : status === "off-day" ? "Today is a configured non-working day." : "No — your check-in is not marked late today.";
    }
    if (text.includes("hour") || text.includes("week")) {
      return `You have ${H.attendance.weekHours(user.id).toFixed(1)} recorded working hours this week.`;
    }
    if (text.includes("attendance") || text.includes("record") || text.includes("check-in")) {
      const latest = H.attendance.records().filter(item => item.userId === user.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
      return latest.length ? `Your recent attendance: ${latest.map(item => `${H.dateLabel(item.date, { day: "numeric", month: "short" })} — ${item.status}${item.hours ? `, ${item.hours}h` : ""}`).join("; ")}.` : "You don't have any attendance records yet.";
    }
    return "Try asking how much leave you have left, whether you were late today, your hours this week, or to show your attendance.";
  }
  function bind(card, user) {
    const form = card.querySelector("#chat-form");
    const messages = card.querySelector("#chat-messages");
    form?.addEventListener("submit", event => {
      event.preventDefault();
      const question = new FormData(form).get("question").trim();
      if (!question) return;
      const userMessage = document.createElement("div");
      userMessage.className = "chat-message user";
      userMessage.textContent = question;
      const response = document.createElement("div");
      response.className = "chat-message";
      response.textContent = answer(question, user);
      messages.append(userMessage, response);
      messages.scrollTop = messages.scrollHeight;
      form.reset();
    });
  }
  H.helper = { render, answer, bind };
})();
