import { motion } from "motion/react";
import { Check } from "lucide-react";
import type { AccentColor } from "../types";
import { ACCENT_PALETTE } from "../lib/tokens";
import { cn } from "./ui/utils";

interface Props {
  checked: boolean;
  onToggle: () => void;
  accent: AccentColor;
  size?: "sm" | "md";
}

export const TaskCheckbox = ({ checked, onToggle, accent, size = "md" }: Props) => {
  const palette = ACCENT_PALETTE[accent];
  const dimension = size === "sm" ? "size-4" : "size-5";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "shrink-0 rounded-full border-2 border-border flex items-center justify-center transition-colors",
        dimension,
        checked && `${palette.fill} border-transparent`,
        !checked && "hover:border-foreground/50",
      )}
    >
      <motion.span
        initial={false}
        animate={checked ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="text-white flex items-center justify-center"
      >
        <Check className={size === "sm" ? "size-2.5" : "size-3"} strokeWidth={3} />
      </motion.span>
    </button>
  );
};
