import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { AccentColor } from "../types";
import { useStore } from "../store/useStore";

export interface AddTaskInlineHandle {
  focus: () => void;
}

interface Props {
  groupId: string;
  accent: AccentColor;
}

export const AddTaskInline = forwardRef<AddTaskInlineHandle, Props>(
  ({ groupId, accent }, ref) => {
    const createTask = useStore((s) => s.createTask);
    const selectTask = useStore((s) => s.selectTask);
    const [value, setValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    void accent;

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    const submit = async () => {
      const trimmed = value.trim();
      if (!trimmed) return;
      await createTask({ groupId, title: trimmed });
      setValue("");
      selectTask(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    };

    return (
      <div className="group flex items-center gap-3 px-3 py-3 border-b border-border/60 hover:bg-accent/30 focus-within:bg-accent/40 transition-colors">
        <div className="size-5 rounded-full border border-border/80 flex items-center justify-center text-muted-foreground group-focus-within:border-foreground/50 transition-colors">
          <Plus className="size-3" />
        </div>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") {
              setValue("");
              inputRef.current?.blur();
            }
          }}
          placeholder="Add a task…"
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>
    );
  },
);
AddTaskInline.displayName = "AddTaskInline";
