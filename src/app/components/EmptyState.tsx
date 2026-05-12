import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: "tasks" | "groups" | "search";
}

const Illustration = ({ variant }: { variant: Props["illustration"] }) => {
  if (variant === "search") {
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
        <circle cx="52" cy="52" r="28" stroke="currentColor" strokeWidth="3" opacity="0.4" />
        <line x1="72" y1="72" x2="92" y2="92" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      </svg>
    );
  }
  if (variant === "groups") {
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
        <rect x="20" y="30" width="80" height="60" rx="10" stroke="currentColor" strokeWidth="3" opacity="0.4" />
        <line x1="20" y1="48" x2="100" y2="48" stroke="currentColor" strokeWidth="2" opacity="0.4" />
        <circle cx="32" cy="39" r="2" fill="currentColor" opacity="0.5" />
        <circle cx="40" cy="39" r="2" fill="currentColor" opacity="0.5" />
      </svg>
    );
  }
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <rect x="24" y="24" width="72" height="72" rx="12" stroke="currentColor" strokeWidth="3" opacity="0.4" />
      <path
        d="M40 50 L48 58 L62 44"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <line x1="40" y1="72" x2="80" y2="72" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <line x1="40" y1="82" x2="68" y2="82" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    </svg>
  );
};

export const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
  illustration = "tasks",
}: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center text-center py-16 px-6 text-muted-foreground"
    >
      <Illustration variant={illustration} />
      <h3 className="mt-4 text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-5">
          <Sparkles className="size-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
};
