import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, isPast } from "date-fns";

export const formatDueDate = (iso: string | null): { label: string; overdue: boolean } | null => {
  if (!iso) return null;
  const d = new Date(iso);
  const overdue = isPast(d) && !isToday(d);
  if (isToday(d)) return { label: "Today", overdue: false };
  if (isTomorrow(d)) return { label: "Tomorrow", overdue: false };
  if (isYesterday(d)) return { label: "Yesterday", overdue: true };
  return { label: format(d, "MMM d"), overdue };
};

export const relativeFromNow = (iso: string | null): string => {
  if (!iso) return "";
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
};

export const toDateInputValue = (iso: string | null): string => {
  if (!iso) return "";
  return format(new Date(iso), "yyyy-MM-dd");
};

export const fromDateInputValue = (v: string): string | null => {
  if (!v) return null;
  return new Date(`${v}T12:00:00`).toISOString();
};
