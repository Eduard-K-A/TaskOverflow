import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";

function isDndActive(dndHours: string, now: Date): boolean {
  if (dndHours === "off") return false;
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(dndHours);
  if (!m) return false;
  const start = parseInt(m[1], 10);
  const end = parseInt(m[2], 10);
  const h = now.getHours();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  if (start > end) return h >= start || h < end;
  return h >= start && h < end;
}

export function useDueDateReminders(): void {
  const tasks = useStore((s) => s.tasks);
  const notificationsEnabled = useStore((s) => s.settings.notificationsEnabled);
  const remindBefore = useStore((s) => s.settings.remindBefore);
  const dndHours = useStore((s) => s.settings.dndHours);
  const notifSound = useStore((s) => s.settings.notifSound);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!notificationsEnabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const intervalMs = 30_000;

    const tick = (): void => {
      const now = new Date();
      if (isDndActive(dndHours, now)) return;

      const offsetMin = parseInt(remindBefore, 10);
      const offsetMs = (Number.isFinite(offsetMin) ? offsetMin : 30) * 60 * 1000;
      const t = now.getTime();

      for (const task of tasks) {
        if (task.status !== "todo" || !task.dueDate) continue;
        const due = new Date(task.dueDate);
        if (Number.isNaN(due.getTime())) continue;

        const remindAt = due.getTime() - offsetMs;
        const windowEnd = due.getTime() + 60 * 1000;
        if (t < remindAt || t > windowEnd) continue;

        const key = `${task.id}:${due.getTime()}`;
        if (notifiedRef.current.has(key)) continue;
        notifiedRef.current.add(key);

        try {
          new Notification("Task due", {
            body: task.title,
            silent: !notifSound,
          });
        } catch (e) {
          console.error("Notification failed:", e);
        }
      }

      if (notifiedRef.current.size > 500) {
        notifiedRef.current.clear();
      }
    };

    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [tasks, notificationsEnabled, remindBefore, dndHours, notifSound]);
}
