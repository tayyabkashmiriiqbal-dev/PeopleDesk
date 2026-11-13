(function () {
  "use strict";
  const H = window.HCM;
  const navAdmin = [
    ["admin.html", "Overview", "⌂", "admin"],
    ["employees.html", "People", "♙", "admin"],
    ["leaves.html", "Time off", "▤", "both"],
    ["payslip.html", "Pay statements", "▧", "both"],
    ["settings.html", "Workspace settings", "⚙", "admin"],
  ];
  const navEmployee = [
    ["employee.html", "My day", "⌂", "employee"],
    ["leaves.html", "My time off", "▤", "employee"],
    ["payslip.html", "My pay", "▧", "employee"],
  ];
  function mount(page, content) {
    const user = H.auth.currentUser();
    const company = H.company();
    const nav = user.role === "admin" ? navAdmin : navEmployee;
    const title = pageTitle(page, user.role);
    document.title = `${title} — PeopleNest`;
    document.querySelector("#app").innerHTML = `
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="app-shell">
        <aside class="sidebar" id="sidebar">
          <a class="brand" href="${user.role === "admin" ? "admin.html" : "employee.html"}"><span class="brand-symbol">P</span><span>People<span class="brand-lite">Nest</span></span></a>
          <div class="nav-caption">Your workspace</div>
          <nav class="nav-list">${nav.map(([href, label, icon]) => `<a class="nav-link ${isActive(href, page) ? "active" : ""}" href="${href}"><span class="nav-icon">${icon}</span>${label}</a>`).join("")}</nav>
          <div class="side-bottom">
            <div class="side-tools"><button class="side-tool" id="theme-toggle" type="button">◐ &nbsp;Appearance</button><button class="side-tool" id="password-toggle" type="button">⌑ &nbsp;Password</button></div>
            <div class="profile-chip"><div class="avatar">${H.escape(H.initials(user.fullName))}</div><div class="profile-text"><strong>${H.escape(user.fullName)}</strong><span>${H.escape(user.role === "admin" ? "Workspace admin" : user.position || "Team member")}</span></div><button class="logout" id="logout" type="button" aria-label="Sign out" title="Sign out">↗</button></div>
          </div>
        </aside>
        <main class="main-area">
          <header class="topbar"><div class="topbar-left"><button class="mobile-menu" id="mobile-menu" type="button" aria-label="Open navigation">☰</button><div><div class="topbar-title">${H.escape(title)}</div><div class="topbar-subtitle">${H.escape(company.name)} &nbsp;·&nbsp; ${H.dateLabel(H.localDate(), { weekday: "long", day: "numeric", month: "long" })}</div></div></div>
            <div class="topbar-right"><span class="today-label">${H.dateLabel(H.localDate(), { weekday: "short", day: "numeric", month: "short" })}</span><div class="topbar-avatar">${H.escape(H.initials(user.fullName))}</div></div></header>
          <section class="page" id="page-content">${content}</section>
        </main>
      </div>
      <div id="modal-root"></div>`;
    document.body.classList.toggle("dark", H.get("theme", "light") === "dark");
    document.querySelector("#logout").addEventListener("click", H.auth.logout);
    document.querySelector("#theme-toggle").addEventListener("click", () => {
      const dark = document.body.classList.toggle("dark");
      H.set("theme", dark ? "dark" : "light");
    });
    document.querySelector("#mobile-menu").addEventListener("click", () => {
      document.querySelector("#sidebar").classList.add("open");
      document.querySelector("#sidebar-overlay").classList.add("show");
    });
    document.querySelector("#sidebar-overlay").addEventListener("click", closeSidebar);
    document.querySelector("#password-toggle").addEventListener("click", passwordModal);
    document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", closeSidebar));
    const help = document.querySelector("#helper-card");
    if (help && H.helper) H.helper.bind(help, user);
  }
  function pageTitle(page, role) {
    const titles = {
      admin: "Good to see you",
      employees: "Your people",
      leaves: role === "admin" ? "Time-off requests" : "My time off",
      settings: "Workspace settings",
      employee: "My day",
      payslip: role === "admin" ? "Pay statements" : "My pay",
    };
    return titles[page] || "PeopleNest";
  }
  function isActive(href, page) {
    return href === `${page}.html` || (page === "admin" && href === "admin.html");
  }
  function closeSidebar() {
    document.querySelector("#sidebar")?.classList.remove("open");
    document.querySelector("#sidebar-overlay")?.classList.remove("show");
  }
  function modal(title, description, body, onSubmit, submitText = "Save changes") {
    const root = document.querySelector("#modal-root");
    root.innerHTML = `<div class="modal-backdrop" id="modal-backdrop"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">${H.escape(title)}</h2><p>${H.escape(description)}</p></div><button class="modal-close" type="button" data-modal-close aria-label="Close">×</button></div><form id="modal-form">${body}<div class="form-actions"><button class="button button-secondary" type="button" data-modal-close>Cancel</button><button class="button button-primary" type="submit">${H.escape(submitText)}</button></div></form></section></div>`;
    root.querySelectorAll("[data-modal-close]").forEach(button => button.addEventListener("click", closeModal));
    root.querySelector("#modal-backdrop").addEventListener("click", event => {
      if (event.target.id === "modal-backdrop") closeModal();
    });
    root.querySelector("#modal-form").addEventListener("submit", async event => {
      event.preventDefault();
      const button = event.currentTarget.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        const result = await onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
        if (result !== false) closeModal();
      } catch (error) {
        H.toast(error.message, "error");
      } finally { button.disabled = false; }
    });
    const first = root.querySelector("input,select,textarea");
    first?.focus();
  }
  function closeModal() {
    document.querySelector("#modal-root").innerHTML = "";
  }
  function passwordModal() {
    modal("Change password", "Use at least 8 characters and choose a password you haven't used here before.", `
      <label class="field"><span>Current password</span><input name="currentPassword" type="password" required autocomplete="current-password"></label>
      <label class="field"><span>New password</span><input name="newPassword" type="password" minlength="8" required autocomplete="new-password"></label>
      <label class="field"><span>Confirm new password</span><input name="confirmPassword" type="password" minlength="8" required autocomplete="new-password"></label>`,
    async values => {
      if (values.newPassword !== values.confirmPassword) throw new Error("Your new passwords don't match.");
      H.auth.changePassword(H.auth.currentUser().id, values.currentPassword, values.newPassword);
      H.toast("Password updated");
    });
  }
  H.ui = { mount, modal, closeModal, closeSidebar };
})();
