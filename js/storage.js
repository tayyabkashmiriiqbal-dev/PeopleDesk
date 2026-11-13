(function () {
  "use strict";
  const keys = {
    company: "hcm_company",
    users: "hcm_users",
    attendance: "hcm_attendance",
    leaves: "hcm_leaves",
    session: "hcm_session",
    theme: "hcm_theme",
  };
  function get(name, fallback) {
    try {
      const value = localStorage.getItem(keys[name] || name);
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      console.error("Could not read local app data:", error);
      return fallback;
    }
  }
  function set(name, value) {
    try {
      localStorage.setItem(keys[name] || name, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Could not save local app data:", error);
      return false;
    }
  }
  function add(name, value) {
    const records = get(name, []);
    records.push(value);
    return set(name, records);
  }
  function update(name, id, patch) {
    const records = get(name, []);
    const index = records.findIndex(record => String(record.id) === String(id));
    if (index < 0) return false;
    records[index] = { ...records[index], ...patch };
    return set(name, records);
  }
  function remove(name, id) {
    return set(name, get(name, []).filter(record => String(record.id) !== String(id)));
  }
  function localDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[char]));
  }
  function initials(value) {
    return String(value || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
  }
  function company() {
    return get("company", null);
  }
  function users() {
    return get("users", []);
  }
  function employees() {
    return users().filter(user => user.role === "employee" && user.active !== false);
  }
  function money(value) {
    return new Intl.NumberFormat("en-PK", {
      style: "currency", currency: "PKR", maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  }
  function dateLabel(value, options = { day: "numeric", month: "short", year: "numeric" }) {
    if (!value) return "—";
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-PK", options);
  }
  function showToast(message, type = "success") {
    const toast = document.querySelector("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show${type === "error" ? " error" : ""}`;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.className = "toast"; }, 2800);
  }
  window.HCM = {
    keys, get, set, add, update, remove, localDate, escape, initials,
    company, users, employees, money, dateLabel, toast: showToast,
  };
})();
