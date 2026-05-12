import { X } from "lucide-react";
import { cn } from "./ui/utils";

interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
  active?: boolean;
  onClick?: () => void;
}

export const TagBadge = ({ tag, onRemove, active, onClick }: TagBadgeProps) => {
  const Wrapper = onClick ? "button" : "span";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 h-6 text-xs transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-accent text-accent-foreground hover:bg-accent/80",
      )}
    >
      <span className="opacity-60">#</span>
      <span>{tag}</span>
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Remove ${tag}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onRemove();
            }
          }}
          className="opacity-60 hover:opacity-100"
        >
          <X className="size-3" />
        </span>
      )}
    </Wrapper>
  );
};
