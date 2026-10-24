import { Task } from "@/store/useScheduleStore";

/**
 * Escapes characters for iCalendar text values (RFC 5545).
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Formats a Date object into ICS local timestamp: YYYYMMDDTHHMMSS
 */
function formatIcsDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}`;
}

/**
 * Converts a timelineData array into a valid RFC 5545 .ics formatted string,
 * anchoring task start and end times to today's date.
 */
export function convertTimelineToIcs(tasks: Task[]): string {
  const now = new Date();
  const dtstamp = formatIcsDateTime(now);

  const events = tasks.map((task, index) => {
    // Parse start time (format "HH:MM")
    const [startH, startM] = (task.startTime || "09:00")
      .split(":")
      .map(Number);
    const startDate = new Date(now);
    if (task.date && /^\d{4}-\d{2}-\d{2}$/.test(task.date)) {
      const [year, month, day] = task.date.split("-").map(Number);
      startDate.setFullYear(year, month - 1, day);
    }
    startDate.setHours(
      isNaN(startH) ? 9 : startH,
      isNaN(startM) ? 0 : startM,
      0,
      0
    );

    // Compute end date: use endTime if available, otherwise add duration
    const endDate = new Date(startDate);
    if (task.endTime && task.endTime.includes(":")) {
      const [endH, endM] = task.endTime.split(":").map(Number);
      if (!isNaN(endH) && !isNaN(endM)) {
        endDate.setHours(endH, endM, 0, 0);
        // If end time is earlier than start time, it rolled over to the next day
        if (endDate <= startDate) {
          endDate.setDate(endDate.getDate() + 1);
        }
      } else {
        endDate.setTime(startDate.getTime() + (task.duration || 30) * 60 * 1000);
      }
    } else {
      endDate.setTime(startDate.getTime() + (task.duration || 30) * 60 * 1000);
    }

    const uid = task.id || `task-${index}-${Date.now()}@allili.app`;
    const summary = escapeIcsText(task.title || "Untitled Task");
    const description = escapeIcsText(task.description || "");
    const category = escapeIcsText(task.category || "routine").toUpperCase();

    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${formatIcsDateTime(startDate)}`,
      `DTEND:${formatIcsDateTime(endDate)}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : null,
      `CATEGORIES:${category}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    ]
      .filter(Boolean)
      .join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Allili//AI Schedule Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Converts timeline tasks into a .ics file and triggers a browser download.
 */
export function downloadIcsFile(
  tasks: Task[],
  filename = "allili-schedule.ics"
): void {
  if (typeof window === "undefined") return;

  const icsString = convertTimelineToIcs(tasks);
  const blob = new Blob([icsString], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
