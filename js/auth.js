(function () {
  "use strict";
  const H = window.HCM;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function session() { return H.get("session", null); }
  function currentUser() {
    const active = session();
    return active ? H.users().find(user => user.id === active.userId) || null : null;
  }
  function redirectFor(user) {
    window.location.href = user.role === "admin" ? "admin.html" : "employee.html";
  }
  function initLogin() {
    const setupForm = document.querySelector("#setup-form");
    const loginForm = document.querySelector("#login-form");
    const message = document.querySelector("#auth-message");
    if (!setupForm || !loginForm) return;
    if (H.company()) {
      document.title = "Sign in — PeopleNest";
      document.querySelector("#auth-eyebrow").textContent = "WELCOME BACK";
      document.querySelector("#auth-title").textContent = "Sign in to your workspace";
      document.querySelector("#auth-description").textContent = `Welcome back to ${H.escape(H.company().name)}.`;
      loginForm.hidden = false;
    } else {
      document.title = "Set up your workspace — PeopleNest";
      document.querySelector("#auth-eyebrow").textContent = "LET'S MAKE A HOME FOR YOUR TEAM";
      document.querySelector("#auth-title").textContent = "Start with your workspace";
      document.querySelector("#auth-description").textContent = "A few details, then your team is ready to go.";
      setupForm.hidden = false;
    }
    const showError = text => {
      message.textContent = text;
      message.className = "message error";
      message.hidden = false;
    };
    setupForm.addEventListener("submit", event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(setupForm));
      const email = values.email.trim().toLowerCase();
      if (!emailPattern.test(email)) return showError("Enter a valid email address.");
      if (values.password.length < 8) return showError("Use a password with at least 8 characters.");
      if (values.password !== values.confirmPassword) return showError("Those passwords do not match.");
      const company = {
        name: values.companyName.trim(),
        officeStart: "09:00",
        graceMinutes: 10,
        yearlyLeaveQuota: 12,
        workingDays: [1, 2, 3, 4, 5, 6],
        halfDayHours: 4,
      };
      if (!company.name) return showError("Enter your company name.");
      const admin = {
        id: "ADMIN-001", role: "admin", fullName: values.fullName.trim(),
        email, password: values.password, department: "Administration",
        position: "Administrator", phone: "", salary: 0,
        joiningDate: H.localDate(), active: true,
      };
      if (!admin.fullName) return showError("Enter the admin's full name.");
      if (!H.set("company", company) || !H.set("users", [admin])) {
        return showError("Your browser could not save this workspace. Check available storage and try again.");
      }
      H.set("session", { userId: admin.id, role: admin.role, signedInAt: Date.now() });
      redirectFor(admin);
    });
    loginForm.addEventListener("submit", event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(loginForm));
      const email = values.email.trim().toLowerCase();
      const user = H.users().find(item => item.email.toLowerCase() === email && item.active !== false);
      if (!user || user.password !== values.password) return showError("We couldn't match that email and password.");
      H.set("session", { userId: user.id, role: user.role, signedInAt: Date.now() });
      redirectFor(user);
    });
  }
  function requireRole(roles) {
    const user = currentUser();
    if (!user) {
      window.location.replace("index.html");
      return null;
    }
    if (!roles.includes(user.role)) {
      window.location.replace(user.role === "admin" ? "admin.html" : "employee.html");
      return null;
    }
    return user;
  }
  function logout() {
    H.set("session", null);
    window.location.replace("index.html");
  }
  function changePassword(userId, currentPassword, newPassword) {
    const user = H.users().find(item => item.id === userId);
    if (!user || user.password !== currentPassword) throw new Error("Your current password isn't correct.");
    if (newPassword.length < 8) throw new Error("Your new password must have at least 8 characters.");
    if (newPassword === currentPassword) throw new Error("Choose a different password.");
    if (!H.update("users", userId, { password: newPassword })) throw new Error("Could not save the new password.");
  }
  if (document.body.classList.contains("auth-page")) initLogin();
  H.auth = { session, currentUser, requireRole, logout, changePassword, redirectFor };
})();
