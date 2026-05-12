import { Calendar } from "lucide-react";
import { formatDueDate } from "../lib/date";
import { useStore } from "../store/useStore";
import { cn } from "./ui/utils";

export const DueDateLabel = ({ iso, done }: { iso: string | null; done?: boolean }) => {
  const overdueRed = useStore((s) => s.settings.overdueRed);
  const formatted = formatDueDate(iso);
  if (!formatted) return null;
  const isOverdue = formatted.overdue && !done;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs tabular-nums",
        isOverdue && overdueRed ? "text-destructive" : "text-muted-foreground",
        done && "line-through",
      )}
    >
      <Calendar className="size-3" />
      {formatted.label}
    </span>
  );
};
