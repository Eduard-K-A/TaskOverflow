import { useStore, type StatusFilter } from "../store/useStore";
import { TagBadge } from "./TagBadge";
import { cn } from "./ui/utils";

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "todo", label: "To-Do" },
  { value: "done", label: "Done" },
  { value: "overdue", label: "Overdue" },
];

interface Props {
  availableTags: string[];
}

export const FilterBar = ({ availableTags }: Props) => {
  const statusFilter = useStore((s) => s.statusFilter);
  const setStatusFilter = useStore((s) => s.setStatusFilter);
  const tagFilter = useStore((s) => s.tagFilter);
  const toggleTagFilter = useStore((s) => s.toggleTagFilter);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-muted">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStatusFilter(opt.value)}
            className={cn(
              "h-7 px-3 rounded-md text-xs transition-colors",
              statusFilter === opt.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {availableTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {availableTags.map((t) => (
            <TagBadge
              key={t}
              tag={t}
              active={tagFilter.includes(t)}
              onClick={() => toggleTagFilter(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
