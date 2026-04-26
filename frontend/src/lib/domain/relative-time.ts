const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelative(input: string | Date | null, now: Date = new Date()): string {
  if (!input) return "—";
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < MINUTE) return "agora";
  if (diffMs < HOUR) return `${Math.floor(diffMs / MINUTE)}min`;
  if (diffMs < DAY) return `${Math.floor(diffMs / HOUR)}h`;
  if (diffMs < 2 * DAY) return "ontem";
  if (diffMs < 7 * DAY) return `${Math.floor(diffMs / DAY)} dias`;

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

export function formatPhoneBR(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    if (rest.length === 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatAbsoluteTime(input: string | Date | null, now: Date = new Date()): string {
  if (!input) return "";
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "";

  const hhmm = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  if (isSameDay(date, now)) return hhmm;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return `ontem ${hhmm}`;

  const dd = pad2(date.getDate());
  const mm = pad2(date.getMonth() + 1);
  return `${dd}/${mm} ${hhmm}`;
}

export function formatDayHeader(input: string | Date, now: Date = new Date()): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "";

  if (isSameDay(date, now)) return "Hoje";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Ontem";

  const dd = pad2(date.getDate());
  const mm = pad2(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function initialsFrom(name: string | null, phone: string): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-2);
}
