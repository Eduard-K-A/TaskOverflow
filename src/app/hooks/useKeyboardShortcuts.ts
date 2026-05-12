import { useEffect } from "react";
import { useStore } from "../store/useStore";

const isTypingTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

export const useKeyboardShortcuts = (onNewTask: () => void, onFocusSearch: () => void) => {
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const setHelpOpen = useStore((s) => s.setHelpOpen);
  const selectTask = useStore((s) => s.selectTask);
  const openGroupDialog = useStore((s) => s.openGroupDialog);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      if (e.key === "Escape") {
        selectTask(null);
        setHelpOpen(false);
        return;
      }

      if (meta && e.key === "k") {
        e.preventDefault();
        onFocusSearch();
        return;
      }

      if (meta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (meta && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        openGroupDialog();
        return;
      }

      if (isTypingTarget(e.target)) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        onNewTask();
        return;
      }
      if (e.key.toLowerCase() === "g") {
        e.preventDefault();
        openGroupDialog();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNewTask, onFocusSearch, toggleSidebar, setHelpOpen, selectTask, openGroupDialog]);
};
