(function () {
  "use strict";
  const H = window.HCM;
  function records() { return H.get("attendance", []); }
  function company() { return H.company() || {}; }
  function find(userId, date = H.localDate()) {
    return records().find(item => item.userId === userId && item.date === date) || null;
  }
  function approvedLeave(userId, date = H.localDate()) {
    return H.get("leaves", []).find(item =>
      item.userId === userId && item.status === "approved" && item.startDate <= date && item.endDate >= date
    ) || null;
  }
  function isWorkingDay(date = H.localDate()) {
    const weekday = new Date(`${date}T12:00:00`).getDay();
    return (company().workingDays || []).includes(weekday);
  }
  function status(userId, date = H.localDate()) {
    const record = find(userId, date);
    const user = H.users().find(item => item.id === userId);
    if (user?.joiningDate && date < user.joiningDate) return "not-started";
    if (record && record.status !== "absent") return record.status;
    if (approvedLeave(userId, date)) return "on-leave";
    if (record) return record.status;
    return isWorkingDay(date) ? "not-checked-in" : "off-day";
  }
  function formatTime(value) {
    if (!value) return "—";
    return new Date(value).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" });
  }
  function lateAt(time) {
    const settings = company();
    const [hour, minute] = String(settings.officeStart || "09:00").split(":").map(Number);
    const deadline = new Date();
    deadline.setHours(hour, minute + Number(settings.graceMinutes || 0), 0, 0);
    return time.getTime() > deadline.getTime();
  }
  function checkIn(userId) {
    const date = H.localDate();
    if (!isWorkingDay(date)) throw new Error("Today is a configured non-working day.");
    if (approvedLeave(userId, date)) throw new Error("You have approved leave today, so you can't check in.");
    const user = H.users().find(item => item.id === userId);
    if (user?.joiningDate && date < user.joiningDate) throw new Error("Your joining date hasn't arrived yet.");
    const existing = find(userId, date);
    if (existing && existing.status !== "absent") throw new Error("You already checked in today.");
    const now = new Date();
    const wasLate = lateAt(now);
    const item = {
      id: existing?.id || `ATT-${userId}-${date}`,
      userId, date, checkIn: now.toISOString(), checkOut: null,
      status: wasLate ? "late" : "present",
      wasLate, hours: 0,
    };
    const all = records().filter(record => record.id !== item.id);
    all.push(item);
    if (!H.set("attendance", all)) throw new Error("Could not save your check-in. Check browser storage.");
    return item;
  }
  function checkOut(userId) {
    const item = find(userId);
    if (!item || !item.checkIn || item.status === "absent") throw new Error("Check in before checking out.");
    if (item.checkOut) throw new Error("You have already checked out today.");
    const now = new Date();
    const hours = Math.max(0, (now.getTime() - new Date(item.checkIn).getTime()) / 3600000);
    const updated = {
      ...item, checkOut: now.toISOString(), hours: Math.round(hours * 100) / 100,
      status: hours < Number(company().halfDayHours || 4) ? "half-day" : item.status,
    };
    if (!H.update("attendance", item.id, updated)) throw new Error("Could not save your check-out.");
    return updated;
  }
  function markAbsences(date = H.localDate()) {
    if (!isWorkingDay(date)) throw new Error("Today is a configured non-working day; no absences were marked.");
    const all = records();
    const ids = new Set(all.filter(record => record.date === date).map(record => record.userId));
    let count = 0;
    H.employees().forEach(user => {
      if (ids.has(user.id) || (user.joiningDate && date < user.joiningDate) || approvedLeave(user.id, date)) return;
      all.push({ id: `ATT-${user.id}-${date}`, userId: user.id, date, status: "absent", checkIn: null, checkOut: null, hours: 0 });
      count += 1;
    });
    if (!H.set("attendance", all)) throw new Error("Could not save attendance records.");
    return count;
  }
  function weekHours(userId) {
    const now = new Date();
    const mondayOffset = (now.getDay() + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    return records().filter(record =>
      record.userId === userId && record.date >= H.localDate(monday) && record.date <= H.localDate(now)
    ).reduce((sum, record) => sum + Number(record.hours || 0), 0);
  }
  function csvForDate(date = H.localDate()) {
    const rows = [["Employee ID", "Employee", "Department", "Date", "Status", "Late", "Check-in", "Check-out", "Hours"]];
    H.employees().forEach(user => {
      const record = find(user.id, date);
      rows.push([
        user.id, user.fullName, user.department, date, status(user.id, date), record?.wasLate ? "Yes" : "No",
        record ? formatTime(record.checkIn) : "", record ? formatTime(record.checkOut) : "",
        record?.hours || 0,
      ]);
    });
    const csv = rows.map(row => row.map(value => {
      let text = String(value ?? "");
      if (/^[=+\-@]/.test(text)) text = "'" + text;
      return `"${text.replace(/"/g, '""')}"`;
    }).join(",")).join("\r\n");
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.href = url;
    link.download = `peoplenest-attendance-${date}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  H.attendance = { records, find, status, formatTime, checkIn, checkOut, markAbsences, weekHours, csvForDate, approvedLeave, isWorkingDay };
})();
