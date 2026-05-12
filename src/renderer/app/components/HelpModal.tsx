import { useStore } from "../store/useStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["N"], label: "New task in current group" },
  { keys: ["G"], label: "New group" },
  { keys: ["Ctrl", "Shift", "N"], label: "New group (anywhere)" },
  { keys: ["Ctrl", "K"], label: "Focus search" },
  { keys: ["Ctrl", "B"], label: "Toggle sidebar" },
  { keys: ["?"], label: "Show this help" },
  { keys: ["Esc"], label: "Close panel or dialog" },
];

export const HelpModal = () => {
  const open = useStore((s) => s.helpOpen);
  const setOpen = useStore((s) => s.setHelpOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Move quickly without touching the mouse.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 py-2">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-md border border-border bg-muted text-xs"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
};
