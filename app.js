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

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });

const today = new Date();
const monthTitle = document.getElementById("monthTitle");
const todayHijri = document.getElementById("todayHijri");
const todayGregorian = document.getElementById("todayGregorian");
const calendarGrid = document.getElementById("calendarGrid");
const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");
const prevMonthButton = document.getElementById("prevMonth");
const nextMonthButton = document.getElementById("nextMonth");
const selectedDateLabel = document.getElementById("selectedDate");
const noteInput = document.getElementById("noteInput");
const saveNoteButton = document.getElementById("saveNote");
const reminderForm = document.getElementById("reminderForm");
const reminderText = document.getElementById("reminderText");
const reminderTime = document.getElementById("reminderTime");
const reminderList = document.getElementById("reminderList");

let activeMonth = today.getMonth();
let activeYear = today.getFullYear();
let selectedDate = new Date(activeYear, activeMonth, today.getDate());

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

const getStorageKey = (date) => date.toISOString().split("T")[0];

const loadNotes = () => JSON.parse(localStorage.getItem("hijriNotes") || "{}");
const saveNotes = (data) =>
  localStorage.setItem("hijriNotes", JSON.stringify(data));

const loadReminders = () =>
  JSON.parse(localStorage.getItem("hijriReminders") || "{}");
const saveReminders = (data) =>
  localStorage.setItem("hijriReminders", JSON.stringify(data));

const updateSelectedPanel = () => {
  const dateKey = getStorageKey(selectedDate);
  const notes = loadNotes();
  const reminders = loadReminders();
  const hijriParts = formatHijriParts(selectedDate);

  selectedDateLabel.textContent = `${gregorianFormatter.format(
    selectedDate
  )} • ${hijriParts.day} ${hijriParts.month} ${hijriParts.year}`;
  noteInput.value = notes[dateKey] || "";

  reminderList.innerHTML = "";
  (reminders[dateKey] || []).forEach((reminder, index) => {
    const item = document.createElement("li");
    item.className = "reminder__item";
    item.textContent = reminder.time
      ? `${reminder.time} — ${reminder.text}`
      : reminder.text;

    const removeButton = document.createElement("button");
    removeButton.className = "reminder__remove";
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      const updatedReminders = loadReminders();
      updatedReminders[dateKey].splice(index, 1);
      saveReminders(updatedReminders);
      updateSelectedPanel();
    });

    item.appendChild(removeButton);
    reminderList.appendChild(item);
  });
};

const populateSelectors = () => {
  monthSelect.innerHTML = "";
  for (let month = 0; month < 12; month += 1) {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = monthFormatter.format(new Date(2024, month, 1));
    monthSelect.appendChild(option);
  }

  const yearRangeStart = today.getFullYear() - 5;
  const yearRangeEnd = today.getFullYear() + 5;
  yearSelect.innerHTML = "";
  for (let year = yearRangeStart; year <= yearRangeEnd; year += 1) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  }
};

const buildCalendar = () => {
  const firstDayOfMonth = new Date(activeYear, activeMonth, 1);
  const lastDayOfMonth = new Date(activeYear, activeMonth + 1, 0);

  monthTitle.textContent = `${monthFormatter.format(
    new Date(activeYear, activeMonth, 1)
  )} ${activeYear} — Hijri dates`;

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

  const notes = loadNotes();

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(activeYear, activeMonth, day);
    const hijriParts = formatHijriParts(date);
    const dateKey = getStorageKey(date);

    const cell = document.createElement("div");
    cell.className = "calendar__cell";

    if (date.toDateString() === today.toDateString()) {
      cell.classList.add("calendar__cell--today");
    }

    if (date.toDateString() === selectedDate.toDateString()) {
      cell.classList.add("calendar__cell--selected");
    }

    cell.addEventListener("click", () => {
      selectedDate = new Date(activeYear, activeMonth, day);
      buildCalendar();
      updateSelectedPanel();
    });

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

    if (notes[dateKey]) {
      const noteTag = document.createElement("span");
      noteTag.className = "calendar__note";
      noteTag.textContent = notes[dateKey];
      cell.appendChild(noteTag);
    }

    calendarGrid.appendChild(cell);
  }

  monthSelect.value = activeMonth;
  yearSelect.value = activeYear;
};

prevMonthButton.addEventListener("click", () => {
  activeMonth -= 1;
  if (activeMonth < 0) {
    activeMonth = 11;
    activeYear -= 1;
  }
  buildCalendar();
});

nextMonthButton.addEventListener("click", () => {
  activeMonth += 1;
  if (activeMonth > 11) {
    activeMonth = 0;
    activeYear += 1;
  }
  buildCalendar();
});

monthSelect.addEventListener("change", (event) => {
  activeMonth = Number(event.target.value);
  buildCalendar();
});

yearSelect.addEventListener("change", (event) => {
  activeYear = Number(event.target.value);
  buildCalendar();
});

saveNoteButton.addEventListener("click", () => {
  const notes = loadNotes();
  const dateKey = getStorageKey(selectedDate);
  notes[dateKey] = noteInput.value.trim();
  saveNotes(notes);
  buildCalendar();
  updateSelectedPanel();
});

reminderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = reminderText.value.trim();
  if (!text) {
    return;
  }
  const dateKey = getStorageKey(selectedDate);
  const reminders = loadReminders();
  reminders[dateKey] = reminders[dateKey] || [];
  reminders[dateKey].push({
    text,
    time: reminderTime.value || "",
  });
  saveReminders(reminders);
  reminderText.value = "";
  reminderTime.value = "";
  updateSelectedPanel();
});

populateSelectors();
buildCalendar();
updateSelectedPanel();
