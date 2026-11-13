(function () {
  "use strict";
  const H = window.HCM;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function all() { return H.employees(); }
  function find(id) { return all().find(user => user.id === id) || null; }
  function nextId() {
    const numbers = H.users().filter(user => user.role === "employee").map(user => Number(String(user.id).replace(/\D/g, "")) || 0);
    return `EMP-${String(Math.max(0, ...numbers) + 1).padStart(4, "0")}`;
  }
  function save(values, id = null) {
    const fullName = String(values.fullName || "").trim();
    const email = String(values.email || "").trim().toLowerCase();
    const department = String(values.department || "").trim();
    const position = String(values.position || "").trim();
    const phone = String(values.phone || "").trim();
    const salary = Number(values.salary);
    const joiningDate = String(values.joiningDate || "");
    const password = String(values.password || "");
    if (!fullName || !department || !position || !joiningDate) throw new Error("Complete all required employee details.");
    if (!emailPattern.test(email)) throw new Error("Enter a valid email address.");
    if (!Number.isFinite(salary) || salary <= 0 || salary > 1_000_000_000) throw new Error("Monthly salary must be a positive amount.");
    if (!id && password.length < 8) throw new Error("Set a temporary password with at least 8 characters.");
    if (id && password && password.length < 8) throw new Error("Password must have at least 8 characters.");
    const duplicate = H.users().some(user => user.email.toLowerCase() === email && user.id !== id);
    if (duplicate) throw new Error("That email address already has an account.");
    const record = {
      id: id || nextId(), role: "employee", fullName, email, department,
      position, phone, salary: Math.round(salary * 100) / 100, joiningDate, active: true,
    };
    if (password) record.password = password;
    if (id) {
      if (!H.update("users", id, record)) throw new Error("Employee could not be found.");
    } else {
      record.password = password;
      if (!H.add("users", record)) throw new Error("Could not save this employee.");
    }
    return record;
  }
  function remove(id) {
    const user = find(id);
    if (!user) throw new Error("Employee could not be found.");
    H.set("users", H.users().filter(item => item.id !== id));
    H.set("attendance", H.get("attendance", []).filter(item => item.userId !== id));
    H.set("leaves", H.get("leaves", []).filter(item => item.userId !== id));
  }
  H.employeesApi = { all, find, save, remove };
})();
