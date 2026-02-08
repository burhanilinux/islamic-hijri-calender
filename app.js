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
const remindersKey = "hijri-reminders-v1";

const loadReminders = () => {
  const stored = localStorage.getItem(remindersKey);
  if (!stored) {
    return {};
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse reminders", error);
    return {};
  }
};

const saveReminders = (reminders) => {
  localStorage.setItem(remindersKey, JSON.stringify(reminders));
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

const updateReminderList = (list, reminders) => {
  list.innerHTML = "";
  if (!reminders || reminders.length === 0) {
    const empty = document.createElement("span");
    empty.className = "calendar__reminder-empty";
    empty.textContent = "No reminders yet";
    list.appendChild(empty);
    return;
  }

  reminders.forEach((reminder) => {
    const item = document.createElement("span");
    item.className = "calendar__reminder";
    item.textContent = reminder;
    list.appendChild(item);
  });
};

const buildCalendar = () => {
  const reminders = loadReminders();
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
    const dateKey = toDateKey(date);

    const cell = document.createElement("div");
    cell.className = "calendar__cell calendar__cell--interactive";
    cell.setAttribute("role", "button");
    cell.setAttribute("tabindex", "0");
    cell.setAttribute(
      "aria-label",
      `Add reminder for ${gregorianFormatter.format(date)}`
    );

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

    const remindersList = document.createElement("div");
    remindersList.className = "calendar__reminders";
    updateReminderList(remindersList, reminders[dateKey]);

    const addReminder = () => {
      const reminder = window.prompt(
        `Add reminder for ${gregorianFormatter.format(date)}`,
        ""
      );
      if (!reminder) {
        return;
      }
      const trimmed = reminder.trim();
      if (!trimmed) {
        return;
      }
      const nextReminders = reminders[dateKey] ? [...reminders[dateKey]] : [];
      nextReminders.push(trimmed);
      reminders[dateKey] = nextReminders;
      saveReminders(reminders);
      updateReminderList(remindersList, nextReminders);
    };

    cell.addEventListener("click", addReminder);
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        addReminder();
      }
    });

    cell.append(monthLabel, hijriDay, gregorianDay, remindersList);
    calendarGrid.appendChild(cell);
  }
};

buildCalendar();
