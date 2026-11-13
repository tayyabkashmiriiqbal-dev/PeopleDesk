(function () {
  "use strict";
  const H = window.HCM;
  function monthRecords(userId, month) {
    const employee = H.employeesApi.find(userId);
    if (!employee) throw new Error("Choose an employee with a valid account.");
    const [year, monthNumber] = month.split("-").map(Number);
    if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) throw new Error("Choose a valid month.");
    const config = H.company();
    const working = new Set(config.workingDays || []);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const today = H.localDate();
    const currentMonth = today.slice(0, 7) === month;
    let workingDays = 0, presentDays = 0, absentDays = 0, halfDays = 0, leaveDays = 0;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const weekday = new Date(`${date}T12:00:00`).getDay();
      if (!working.has(weekday)) continue;
      workingDays += 1;
      if (date < employee.joiningDate) continue;
      const record = H.attendance.find(userId, date);
      if (H.attendance.approvedLeave(userId, date)) {
        leaveDays += 1;
        continue;
      }
      if (currentMonth && date > today) continue;
      if (record?.status === "half-day") halfDays += 1;
      else if (record && ["present", "late"].includes(record.status)) presentDays += 1;
      else if (record?.status === "absent" || date < today || !currentMonth) absentDays += 1;
    }
    return { workingDays, presentDays, absentDays, halfDays, leaveDays };
  }
  function calculate(userId, month) {
    const employee = H.employeesApi.find(userId);
    if (!employee) throw new Error("Choose an employee with a valid account.");
    const days = monthRecords(userId, month);
    const dailySalary = days.workingDays ? employee.salary / days.workingDays : 0;
    const deduction = dailySalary * (days.absentDays + .5 * days.halfDays);
    const [year, monthNumber] = month.split("-").map(Number);
    const monthEnd = `${year}-${String(monthNumber).padStart(2, "0")}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, "0")}`;
    const employedInMonth = employee.joiningDate <= monthEnd;
    const monthlySalary = employedInMonth ? employee.salary : 0;
    return {
      employee, month, ...days, monthlySalary,
      deduction: Math.round(deduction * 100) / 100,
      netSalary: Math.max(0, Math.round((monthlySalary - deduction) * 100) / 100),
    };
  }
  function print() {
    window.print();
  }
  H.payslip = { calculate, monthRecords, print };
})();
