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
const reminderModal = document.getElementById("reminderModal");
const reminderModalTitle = document.getElementById("reminderModalTitle");
const reminderModalSubtitle = document.getElementById("reminderModalSubtitle");
const reminderInput = document.getElementById("reminderInput");
const reminderModalError = document.getElementById("reminderModalError");
const reminderSave = document.getElementById("reminderSave");
const reminderDelete = document.getElementById("reminderDelete");
const reminderCloseButtons = reminderModal.querySelectorAll("[data-reminder-close]");
const remindersKey = "hijri-reminders-v1";
let activeReminderContext = null;

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

let reminders = loadReminders();

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

const updateReminderList = (list, reminders, onEdit) => {
  list.innerHTML = "";
  if (!reminders || reminders.length === 0) {
    const empty = document.createElement("span");
    empty.className = "calendar__reminder-empty";
    empty.textContent = "No reminders yet";
    list.appendChild(empty);
    return;
  }

  reminders.forEach((reminder, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "calendar__reminder-button";
    item.textContent = reminder;
    item.addEventListener("click", (event) => {
      event.stopPropagation();
      onEdit(reminder, index);
    });
    list.appendChild(item);
  });
};

const openReminderModal = (context) => {
  activeReminderContext = context;
  reminderModalError.textContent = "";
  reminderModalTitle.textContent = context.index === null ? "New reminder" : "Edit reminder";
  reminderModalSubtitle.textContent = context.subtitle;
  reminderInput.value = context.text;
  reminderDelete.style.display = context.index === null ? "none" : "inline-flex";
  reminderModal.classList.add("is-visible");
  reminderModal.setAttribute("aria-hidden", "false");
  reminderInput.focus();
};

const closeReminderModal = () => {
  reminderModal.classList.remove("is-visible");
  reminderModal.setAttribute("aria-hidden", "true");
  activeReminderContext = null;
};

const showReminderError = (message) => {
  reminderModalError.textContent = message;
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
    const refreshList = () => {
      updateReminderList(remindersList, reminders[dateKey], (text, index) => {
        openReminderModal({
          dateKey,
          index,
          text,
          subtitle: `Editing reminder for ${gregorianFormatter.format(date)}`,
          onRefresh: refreshList,
        });
      });
    };

    refreshList();

    const addReminder = () => {
      openReminderModal({
        dateKey,
        index: null,
        text: "",
        subtitle: `Add reminder for ${gregorianFormatter.format(date)}`,
        onRefresh: refreshList,
      });
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

reminderCloseButtons.forEach((button) => {
  button.addEventListener("click", closeReminderModal);
});

reminderSave.addEventListener("click", () => {
  if (!activeReminderContext) {
    return;
  }
  const trimmed = reminderInput.value.trim();
  if (!trimmed) {
    showReminderError("Please add reminder details before saving.");
    return;
  }
  const { dateKey, index, onRefresh } = activeReminderContext;
  const currentReminders = reminders[dateKey] ? [...reminders[dateKey]] : [];
  if (index === null) {
    currentReminders.push(trimmed);
  } else {
    currentReminders[index] = trimmed;
  }
  reminders[dateKey] = currentReminders;
  saveReminders(reminders);
  onRefresh?.();
  closeReminderModal();
});

reminderDelete.addEventListener("click", () => {
  if (!activeReminderContext || activeReminderContext.index === null) {
    return;
  }
  const { dateKey, index, onRefresh } = activeReminderContext;
  const currentReminders = reminders[dateKey] ? [...reminders[dateKey]] : [];
  currentReminders.splice(index, 1);
  if (currentReminders.length === 0) {
    delete reminders[dateKey];
  } else {
    reminders[dateKey] = currentReminders;
  }
  saveReminders(reminders);
  onRefresh?.();
  closeReminderModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && reminderModal.classList.contains("is-visible")) {
    closeReminderModal();
  }
});

buildCalendar();
