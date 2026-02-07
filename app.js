const hijriFormatter = new Intl.DateTimeFormat("en-TN-u-ca-islamic", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const gregorianFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const today = new Date();
const monthTitle = document.getElementById("monthTitle");
const todayHijri = document.getElementById("todayHijri");
const todayGregorian = document.getElementById("todayGregorian");
const calendarGrid = document.getElementById("calendarGrid");

const formatHijriParts = (date) => {
  const parts = hijriFormatter.formatToParts(date);
  const partMap = parts.reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    day: partMap.day,
    month: partMap.month,
    year: partMap.year,
  };
};

const buildCalendar = () => {
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

  monthTitle.textContent = `${monthFormatter.format(today)} — Hijri dates`;

  const todayHijriParts = formatHijriParts(today);
  todayHijri.textContent = `${todayHijriParts.day} ${todayHijriParts.month} ${todayHijriParts.year}`;
  todayGregorian.textContent = gregorianFormatter.format(today);

  const startWeekday = firstDayOfMonth.getDay();
  const totalDays = lastDayOfMonth.getDate();

  calendarGrid.innerHTML = "";

  for (let i = 0; i < startWeekday; i += 1) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar__cell calendar__cell--empty";
    calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(currentYear, currentMonth, day);
    const hijriParts = formatHijriParts(date);

    const cell = document.createElement("div");
    cell.className = "calendar__cell";

    if (date.toDateString() === today.toDateString()) {
      cell.classList.add("calendar__cell--today");
    }

    const monthLabel = document.createElement("span");
    monthLabel.className = "calendar__month";
    monthLabel.textContent = hijriParts.month;

    const hijriDay = document.createElement("span");
    hijriDay.className = "calendar__hijri";
    hijriDay.textContent = `${hijriParts.day} ${hijriParts.year}`;

    const gregorianDay = document.createElement("span");
    gregorianDay.className = "calendar__gregorian";
    gregorianDay.textContent = gregorianFormatter.format(date);

    cell.append(monthLabel, hijriDay, gregorianDay);
    calendarGrid.appendChild(cell);
  }
};

buildCalendar();
