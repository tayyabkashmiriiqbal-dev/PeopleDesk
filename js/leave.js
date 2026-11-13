(function () {
  "use strict";
  const H = window.HCM;
  function records() { return H.get("leaves", []); }
  function workingDaysBetween(start, end) {
    const company = H.company();
    const working = new Set(company?.workingDays || [1, 2, 3, 4, 5]);
    const from = new Date(`${start}T12:00:00`);
    const until = new Date(`${end}T12:00:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime()) || from > until) return 0;
    let days = 0;
    for (const cursor = new Date(from); cursor <= until; cursor.setDate(cursor.getDate() + 1)) {
      if (working.has(cursor.getDay())) days += 1;
    }
    return days;
  }
  function daysInYear(leave, year) {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    const from = leave.startDate > start ? leave.startDate : start;
    const until = leave.endDate < end ? leave.endDate : end;
    return from <= until ? workingDaysBetween(from, until) : 0;
  }
  function countedFor(userId, year, exceptId) {
    return records().filter(item =>
      item.userId === userId && item.id !== exceptId &&
      (item.status === "approved" || item.status === "pending") &&
      daysInYear(item, year) > 0
    ).reduce((sum, item) => sum + daysInYear(item, year), 0);
  }
  function balance(userId, year = new Date().getFullYear(), exceptId = null) {
    const quota = Number(H.company()?.yearlyLeaveQuota || 0);
    const used = countedFor(userId, year, exceptId);
    return { quota, used, remaining: Math.max(0, quota - used) };
  }
  function overlaps(userId, start, end) {
    return records().some(item =>
      item.userId === userId && ["pending", "approved"].includes(item.status) &&
      start <= item.endDate && end >= item.startDate
    );
  }
  function apply(userId, values) {
    const startDate = values.startDate;
    const endDate = values.endDate;
    if (!startDate || !endDate || startDate < H.localDate()) throw new Error("Choose a valid leave period starting today or later.");
    if (endDate < startDate) throw new Error("The end date must be on or after the start date.");
    const workingDays = workingDaysBetween(startDate, endDate);
    if (!workingDays) throw new Error("That period contains no configured working days.");
    if (overlaps(userId, startDate, endDate)) throw new Error("This request overlaps another pending or approved leave.");
    let year = Number(startDate.slice(0, 4));
    const lastYear = Number(endDate.slice(0, 4));
    for (; year <= lastYear; year += 1) {
      const requested = daysInYear({ startDate, endDate }, year);
      if (requested > balance(userId, year).remaining) {
        throw new Error(`This request exceeds your available leave for ${year}.`);
      }
    }
    const reason = String(values.reason || "").trim();
    if (!reason) throw new Error("Add a short reason for your request.");
    const leave = {
      id: `LEAVE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId, type: values.type || "Annual leave", startDate, endDate,
      workingDays, reason, status: "pending", comment: "",
      createdAt: new Date().toISOString(),
    };
    if (!H.add("leaves", leave)) throw new Error("Could not save the leave request.");
    return leave;
  }
  function decide(id, status, comment = "") {
    if (!["approved", "rejected"].includes(status)) throw new Error("Choose approve or reject.");
    const leave = records().find(item => item.id === id);
    if (!leave || leave.status !== "pending") throw new Error("This request is no longer pending.");
    if (status === "approved") {
      let year = Number(leave.startDate.slice(0, 4));
      const lastYear = Number(leave.endDate.slice(0, 4));
      for (; year <= lastYear; year += 1) {
        if (daysInYear(leave, year) > balance(leave.userId, year, leave.id).remaining) {
          throw new Error(`Approval would exceed the leave quota for ${year}.`);
        }
      }
    }
    if (!H.update("leaves", id, { status, comment: String(comment).trim(), reviewedAt: new Date().toISOString() })) {
      throw new Error("Could not update this leave request.");
    }
  }
  function onLeaveToday() {
    const today = H.localDate();
    return records().filter(item => item.status === "approved" && item.startDate <= today && item.endDate >= today);
  }
  H.leave = { records, workingDaysBetween, balance, apply, decide, onLeaveToday, daysInYear };
})();
