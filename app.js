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
const appContainer = document.querySelector(".app");
const reminderModal = document.getElementById("reminderModal");
const reminderModalTitle = document.getElementById("reminderModalTitle");
const reminderModalSubtitle = document.getElementById("reminderModalSubtitle");
const reminderInput = document.getElementById("reminderInput");
const reminderModalError = document.getElementById("reminderModalError");
const reminderPriority = document.getElementById("reminderPriority");
const reminderRecurrence = document.getElementById("reminderRecurrence");
const reminderSave = document.getElementById("reminderSave");
const reminderDelete = document.getElementById("reminderDelete");
const reminderCloseButtons = reminderModal.querySelectorAll("[data-reminder-close]");
const reminderSearch = document.getElementById("reminderSearch");
const reminderFilter = document.getElementById("reminderFilter");
const reminderList = document.getElementById("reminderList");
const exportReminders = document.getElementById("exportReminders");
const importReminders = document.getElementById("importReminders");
const syncCodeInput = document.getElementById("syncCode");
const copySyncCode = document.getElementById("copySyncCode");
const applySyncCode = document.getElementById("applySyncCode");
const backupStatus = document.getElementById("backupStatus");
const prevMonthButton = document.getElementById("prevMonth");
const nextMonthButton = document.getElementById("nextMonth");
const shortcutHelp = document.getElementById("shortcutHelp");
const shortcutPopover = document.getElementById("shortcutPopover");
const liveRegion = document.getElementById("appLiveRegion");
const primaryDateButtons = document.querySelectorAll("[data-primary-date]");
const remindersKey = "hijri-reminders-v1";
const backupKey = "hijri-reminders-backup-v1";
let activeReminderContext = null;
let lastFocusedElement = null;
let currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);

const normalizeReminder = (reminder) => {
  if (typeof reminder === "string") {
    return { text: reminder, priority: "medium", recurrence: "none" };
  }
  if (!reminder) {
    return { text: "", priority: "medium", recurrence: "none" };
  }
  return {
    text: reminder.text ?? "",
    priority: reminder.priority ?? "medium",
    recurrence: reminder.recurrence ?? "none",
  };
};

const normalizeReminderData = (parsed) =>
  Object.entries(parsed || {}).reduce((acc, [key, value]) => {
    if (!Array.isArray(value)) {
      acc[key] = [];
      return acc;
    }
    acc[key] = value.map(normalizeReminder).filter((item) => item.text.trim());
    return acc;
  }, {});

const loadReminders = () => {
  const stored = localStorage.getItem(remindersKey);
  if (!stored) {
    return {};
  }
  try {
    return normalizeReminderData(JSON.parse(stored));
  } catch (error) {
    console.error("Failed to parse reminders", error);
    return {};
  }
};

let reminders = loadReminders();

const saveReminders = (reminders) => {
  localStorage.setItem(remindersKey, JSON.stringify(reminders));
};

const updateBackupStatus = () => {
  const stored = localStorage.getItem(backupKey);
  if (!stored) {
    backupStatus.textContent = "No backup created yet.";
    return;
  }
  try {
    const parsed = JSON.parse(stored);
    if (!parsed?.timestamp) {
      backupStatus.textContent = "Backup timestamp unavailable.";
      return;
    }
    const timestamp = new Date(parsed.timestamp);
    backupStatus.textContent = `Local backup saved ${timestamp.toLocaleString()}.`;
  } catch (error) {
    backupStatus.textContent = "Backup status unavailable.";
  }
};

const saveBackup = () => {
  const payload = {
    timestamp: new Date().toISOString(),
    data: reminders,
  };
  localStorage.setItem(backupKey, JSON.stringify(payload));
  updateBackupStatus();
};

const announce = (message) => {
  liveRegion.textContent = "";
  window.setTimeout(() => {
    liveRegion.textContent = message;
  }, 50);
};

const encodeSyncCode = (data) =>
  window.btoa(unescape(encodeURIComponent(JSON.stringify(data))));

const decodeSyncCode = (code) =>
  JSON.parse(decodeURIComponent(escape(window.atob(code))));

const applyReminderData = (data, message) => {
  reminders = normalizeReminderData(data);
  saveReminders(reminders);
  saveBackup();
  buildCalendar();
  announce(message);
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
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

const highlightDates = [
  { month: "Ramadan", day: "1", label: "Ramadan" },
  { month: "Shawwal", day: "1", label: "Eid al-Fitr" },
  { month: "Dhu al-Hijjah", day: "10", label: "Eid al-Adha" },
];

const getHighlightLabel = (hijriParts) => {
  const match = highlightDates.find(
    (item) => item.month === hijriParts.month && item.day === hijriParts.day
  );
  return match?.label ?? "";
};

const getRemindersForDate = (date) => {
  const dateKey = toDateKey(date);
  const direct = reminders[dateKey] ? [...reminders[dateKey]] : [];
  const recurring = [];
  Object.entries(reminders).forEach(([key, list]) => {
    const originDate = fromDateKey(key);
    list.forEach((item, index) => {
      if (item.recurrence === "none") {
        return;
      }
      if (key === dateKey) {
        return;
      }
      if (date < originDate) {
        return;
      }
      if (item.recurrence === "weekly" && date.getDay() === originDate.getDay()) {
        recurring.push({ ...item, sourceDateKey: key, sourceIndex: index });
      }
      if (item.recurrence === "monthly" && date.getDate() === originDate.getDate()) {
        recurring.push({ ...item, sourceDateKey: key, sourceIndex: index });
      }
    });
  });
  return direct.map((item, index) => ({
    ...item,
    sourceDateKey: dateKey,
    sourceIndex: index,
  })).concat(recurring);
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
    item.dataset.priority = reminder.priority;
    const text = document.createElement("span");
    text.textContent = reminder.text;
    item.appendChild(text);
    if (reminder.recurrence !== "none") {
      const meta = document.createElement("span");
      meta.className = "calendar__reminder-button__meta";
      meta.textContent = reminder.recurrence;
      item.appendChild(meta);
    }
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
  reminderPriority.value = context.priority;
  reminderRecurrence.value = context.recurrence;
  reminderDelete.style.display = context.index === null ? "none" : "inline-flex";
  reminderModal.classList.add("is-visible");
  reminderModal.setAttribute("aria-hidden", "false");
  appContainer.setAttribute("aria-hidden", "true");
  document.body.classList.add("modal-open");
  lastFocusedElement = document.activeElement;
  reminderInput.focus();
};

const closeReminderModal = () => {
  reminderModal.classList.remove("is-visible");
  reminderModal.setAttribute("aria-hidden", "true");
  appContainer.removeAttribute("aria-hidden");
  document.body.classList.remove("modal-open");
  activeReminderContext = null;
  lastFocusedElement?.focus?.();
};

const showReminderError = (message) => {
  reminderModalError.textContent = message;
};

const buildCalendar = () => {
  const currentMonth = currentMonthDate.getMonth();
  const currentYear = currentMonthDate.getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

  monthTitle.textContent = `${monthFormatter.format(currentMonthDate)} — Hijri dates`;

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
      const remindersForDate = getRemindersForDate(date);
      updateReminderList(remindersList, remindersForDate, (reminder, index) => {
        openReminderModal({
          dateKey: reminder.sourceDateKey,
          index: reminder.sourceIndex ?? index,
          text: reminder.text,
          priority: reminder.priority,
          recurrence: reminder.recurrence,
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
        priority: "medium",
        recurrence: "none",
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

    const highlightLabel = getHighlightLabel(hijriParts);
    if (highlightLabel) {
      cell.classList.add("calendar__cell--highlight");
    }

    cell.append(monthLabel, hijriDay, gregorianDay);
    if (highlightLabel) {
      const highlightBadge = document.createElement("span");
      highlightBadge.className = "calendar__highlight-badge";
      highlightBadge.textContent = highlightLabel;
      cell.appendChild(highlightBadge);
    }
    cell.appendChild(remindersList);
    calendarGrid.appendChild(cell);

  }

  buildReminderPanel();
};

const buildReminderPanel = () => {
  const searchValue = reminderSearch.value.trim().toLowerCase();
  const filterValue = reminderFilter.value;
  const todayDate = new Date();
  const startOfMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1);
  const endOfMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0);
  const rangeStart = new Date(todayDate);
  const rangeEnd = new Date(todayDate);
  rangeEnd.setDate(rangeEnd.getDate() + 30);
  const pastStart = new Date(todayDate);
  pastStart.setDate(pastStart.getDate() - 30);

  const items = [];
  Object.entries(reminders).forEach(([dateKey, list]) => {
    const date = fromDateKey(dateKey);
    list.forEach((reminder, index) => {
      const entry = {
        date,
        dateKey,
        reminder,
        index,
        isRecurring: reminder.recurrence !== "none",
      };
      items.push(entry);
    });
  });

  let displayItems = [];
  if (filterValue === "month") {
    displayItems = getOccurrencesInRange(startOfMonth, endOfMonth);
  } else if (filterValue === "upcoming") {
    displayItems = getOccurrencesInRange(rangeStart, rangeEnd);
  } else if (filterValue === "past") {
    displayItems = getOccurrencesInRange(pastStart, todayDate);
  } else {
    displayItems = items.map((item) => ({
      ...item,
      occurrenceDate: item.date,
      sourceDateKey: item.dateKey,
      sourceIndex: item.index,
    }));
  }

  if (searchValue) {
    displayItems = displayItems.filter((item) =>
      item.reminder.text.toLowerCase().includes(searchValue)
    );
  }

  displayItems.sort((a, b) => a.occurrenceDate - b.occurrenceDate);

  reminderList.innerHTML = "";
  if (displayItems.length === 0) {
    const empty = document.createElement("p");
    empty.className = "reminder-panel__empty";
    empty.textContent = "No reminders match your search.";
    reminderList.appendChild(empty);
    return;
  }

  displayItems.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reminder-panel__item";
    const header = document.createElement("div");
    header.className = "reminder-panel__item-header";
    const dateLabel = document.createElement("span");
    dateLabel.className = "reminder-panel__date";
    dateLabel.textContent = gregorianFormatter.format(item.occurrenceDate);
    const recurrenceBadge = document.createElement("span");
    recurrenceBadge.className = "reminder-badge reminder-badge--recurrence";
    recurrenceBadge.textContent =
      item.reminder.recurrence === "none" ? "One-time" : item.reminder.recurrence;
    header.append(dateLabel, recurrenceBadge);

    const text = document.createElement("div");
    text.className = "reminder-panel__text";
    text.textContent = item.reminder.text;

    const badges = document.createElement("div");
    badges.className = "reminder-panel__badges";
    const priorityBadge = document.createElement("span");
    priorityBadge.className = `reminder-badge reminder-badge--${item.reminder.priority}`;
    priorityBadge.textContent = `${item.reminder.priority} priority`;
    badges.appendChild(priorityBadge);

    button.append(header, text, badges);
    button.addEventListener("click", () => {
      currentMonthDate = new Date(
        item.occurrenceDate.getFullYear(),
        item.occurrenceDate.getMonth(),
        1
      );
      buildCalendar();
      openReminderModal({
        dateKey: item.sourceDateKey,
        index: item.sourceIndex,
        text: item.reminder.text,
        priority: item.reminder.priority,
        recurrence: item.reminder.recurrence,
        subtitle: `Editing reminder for ${gregorianFormatter.format(item.occurrenceDate)}`,
        onRefresh: buildCalendar,
      });
    });
    reminderList.appendChild(button);
  });
};

const getOccurrencesInRange = (startDate, endDate) => {
  const occurrences = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayReminders = getRemindersForDate(current);
    dayReminders.forEach((reminder) => {
      occurrences.push({
        occurrenceDate: new Date(current),
        reminder,
        sourceDateKey: reminder.sourceDateKey,
        sourceIndex: reminder.sourceIndex,
      });
    });
    current.setDate(current.getDate() + 1);
  }
  return occurrences;
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
  const nextReminder = normalizeReminder({
    text: trimmed,
    priority: reminderPriority.value,
    recurrence: reminderRecurrence.value,
  });
  if (index === null) {
    currentReminders.push(nextReminder);
  } else {
    currentReminders[index] = nextReminder;
  }
  reminders[dateKey] = currentReminders;
  saveReminders(reminders);
  saveBackup();
  onRefresh?.();
  closeReminderModal();
  announce("Reminder saved.");
});

reminderInput.addEventListener("input", () => {
  if (reminderModalError.textContent) {
    reminderModalError.textContent = "";
  }
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
  saveBackup();
  onRefresh?.();
  closeReminderModal();
  announce("Reminder deleted.");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && reminderModal.classList.contains("is-visible")) {
    closeReminderModal();
  }
  if (
    (event.metaKey || event.ctrlKey) &&
    event.key === "Enter" &&
    reminderModal.classList.contains("is-visible")
  ) {
    reminderSave.click();
  }
});

reminderModal.addEventListener("keydown", (event) => {
  if (!reminderModal.classList.contains("is-visible") || event.key !== "Tab") {
    return;
  }
  const focusable = reminderModal.querySelectorAll(
    "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
  );
  const focusableArray = Array.from(focusable);
  if (focusableArray.length === 0) {
    return;
  }
  const first = focusableArray[0];
  const last = focusableArray[focusableArray.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

shortcutHelp.addEventListener("click", () => {
  shortcutPopover.classList.toggle("is-visible");
});

document.addEventListener("click", (event) => {
  if (
    shortcutPopover.classList.contains("is-visible") &&
    !shortcutPopover.contains(event.target) &&
    event.target !== shortcutHelp
  ) {
    shortcutPopover.classList.remove("is-visible");
  }
});

primaryDateButtons.forEach((button) => {
  button.addEventListener("click", () => {
    primaryDateButtons.forEach((btn) => btn.classList.remove("is-active"));
    button.classList.add("is-active");
    const mode = button.dataset.primaryDate;
    if (mode === "gregorian") {
      appContainer.classList.add("app--gregorian-primary");
    } else {
      appContainer.classList.remove("app--gregorian-primary");
    }
  });
});

reminderSearch.addEventListener("input", buildReminderPanel);
reminderFilter.addEventListener("change", buildReminderPanel);

exportReminders.addEventListener("click", () => {
  const data = JSON.stringify(reminders, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hijri-reminders-${toDateKey(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  announce("Reminders exported.");
});

importReminders.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      applyReminderData(parsed, "Reminders imported.");
    } catch (error) {
      announce("Unable to import reminders.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
});

copySyncCode.addEventListener("click", async () => {
  const code = encodeSyncCode(reminders);
  syncCodeInput.value = code;
  try {
    await navigator.clipboard.writeText(code);
    announce("Sync code copied.");
  } catch (error) {
    syncCodeInput.select();
    announce("Sync code ready to copy.");
  }
});

applySyncCode.addEventListener("click", () => {
  const code = syncCodeInput.value.trim();
  if (!code) {
    announce("Add a sync code to apply.");
    return;
  }
  try {
    const parsed = decodeSyncCode(code);
    applyReminderData(parsed, "Sync code applied.");
  } catch (error) {
    announce("Sync code could not be applied.");
  }
});

prevMonthButton.addEventListener("click", () => {
  currentMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
  buildCalendar();
});

nextMonthButton.addEventListener("click", () => {
  currentMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1);
  buildCalendar();
});

updateBackupStatus();
buildCalendar();
