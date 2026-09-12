import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, Plus } from "lucide-react";
import type { TaskStatus, AccentColor } from "../types";
import { useStore } from "../store/useStore";
import { TaskCheckbox } from "./TaskCheckbox";
import { TagBadge } from "./TagBadge";
import { ACCENT_PALETTE } from "../lib/tokens";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { toDateInputValue, fromDateInputValue, relativeFromNow, formatDueDate } from "../lib/date";
import { cn } from "./ui/utils";

interface Props {
  accent: AccentColor;
}

/** Notes are typed continuously; persist them on a short idle instead of per keystroke. */
const NOTES_COMMIT_DELAY = 400;

export const TaskDetailPanel = ({ accent }: Props) => {
  const selectedId = useStore((s) => s.selectedTaskId);
  const close = useStore((s) => s.selectTask);
  const task = useStore((s) => s.tasks.find((t) => t.id === selectedId) ?? null);
  const group = useStore((s) =>
    task ? s.groups.find((g) => g.id === task.groupId) ?? null : null,
  );

  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const toggleDone = useStore((s) => s.toggleTaskDone);
  const addSubtask = useStore((s) => s.addSubtask);
  const toggleSubtask = useStore((s) => s.toggleSubtask);
  const deleteSubtask = useStore((s) => s.deleteSubtask);
  const updateSubtask = useStore((s) => s.updateSubtask);
  const addTag = useStore((s) => s.addTagToTask);
  const removeTag = useStore((s) => s.removeTagFromTask);
  const confirmDelete = useStore((s) => s.settings.confirmDelete);

  const [tagInput, setTagInput] = useState("");
  const [subtaskInput, setSubtaskInput] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const pendingNotes = useRef<{ id: string; notes: string } | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const taskId = task?.id;

  const flushNotes = useCallback(() => {
    if (notesTimer.current) {
      clearTimeout(notesTimer.current);
      notesTimer.current = null;
    }
    const pending = pendingNotes.current;
    pendingNotes.current = null;
    if (pending) updateTask(pending.id, { notes: pending.notes });
  }, [updateTask]);

  // Write out any unsaved notes before the panel swaps tasks or unmounts.
  useEffect(() => flushNotes, [taskId, flushNotes]);

  useEffect(() => {
    setTitle(task?.title ?? "");
    setNotes(task?.notes ?? "");
    setTagInput("");
    setSubtaskInput("");
  }, [taskId]);

  // Keep the title field sized to its content so long titles wrap instead of scrolling.
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title, taskId]);

  const commitTitle = () => {
    if (!task) return;
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask(task.id, { title: trimmed });
    } else if (!trimmed) {
      setTitle(task.title);
    }
  };

  const onNotesChange = (value: string) => {
    if (!task) return;
    setNotes(value);
    pendingNotes.current = { id: task.id, notes: value };
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(flushNotes, NOTES_COMMIT_DELAY);
  };

  const due = task ? formatDueDate(task.dueDate) : null;
  const accentTokens = ACCENT_PALETTE[group?.accent ?? accent] ?? ACCENT_PALETTE.blue;
  const open = Boolean(task);

  return (
    <AnimatePresence>
      {open && task && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => close(null)}
            className="absolute inset-0 bg-foreground/5 z-30"
          />
          <motion.aside
            role="dialog"
            aria-label={`Task details: ${task.title}`}
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-0 bottom-0 w-[480px] max-w-[92vw] bg-card border-l border-border z-40 flex flex-col"
            style={{ borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}
          >
            <div className="flex items-center justify-between gap-3 px-5 h-14 shrink-0 border-b border-border">
              <div className="min-w-0 flex items-center gap-2">
                {group && (
                  <>
                    <span className={cn("size-2 rounded-full shrink-0", accentTokens.fill)} />
                    <span className="text-sm font-medium truncate">{group.name}</span>
                    <span className="text-muted-foreground/50">·</span>
                  </>
                )}
                <span className="text-sm text-muted-foreground truncate">
                  Created {relativeFromNow(new Date(task.createdAt).toISOString())}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {confirmDelete ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        aria-label="Delete task"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{task.title}" will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTask(task.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => deleteTask(task.id)}
                    aria-label="Delete task"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => close(null)}
                  aria-label="Close"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto themed-scrollbar px-5 pt-5 pb-10 space-y-6">
              <div className="flex items-start gap-3">
                <div className="pt-1.5">
                  <TaskCheckbox
                    checked={task.status === "done"}
                    onToggle={() => toggleDone(task.id)}
                    accent={accent}
                  />
                </div>
                <textarea
                  ref={titleRef}
                  value={title}
                  rows={1}
                  aria-label="Task title"
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  className={cn(
                    "flex-1 resize-none bg-transparent outline-none py-0.5 leading-snug",
                    task.status === "done" && "line-through text-muted-foreground",
                  )}
                  style={{ fontSize: "1.125rem" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="task-status" className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <Select
                    value={task.status}
                    onValueChange={(v) => updateTask(task.id, { status: v as TaskStatus })}
                  >
                    <SelectTrigger id="task-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To-Do</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor="task-due" className="text-xs text-muted-foreground">
                      Due date
                    </Label>
                    {task.dueDate && (
                      <button
                        type="button"
                        onClick={() => updateTask(task.id, { dueDate: null })}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <Input
                    id="task-due"
                    type="date"
                    value={toDateInputValue(task.dueDate)}
                    onChange={(e) =>
                      updateTask(task.id, { dueDate: fromDateInputValue(e.target.value) })
                    }
                  />
                  {due && (
                    <p
                      className={cn(
                        "text-xs",
                        due.overdue && task.status !== "done"
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {due.overdue && task.status !== "done" ? `Overdue · ${due.label}` : due.label}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tags</Label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {task.tags.map((t) => (
                    <TagBadge key={t} tag={t} onRemove={() => removeTag(task.id, t)} />
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagInput.trim()) {
                        e.preventDefault();
                        addTag(task.id, tagInput);
                        setTagInput("");
                      }
                    }}
                    aria-label="Add tag"
                    placeholder="Add tag…"
                    className="bg-transparent outline-none text-sm px-2 h-7 min-w-[100px] flex-1"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-notes" className="text-xs text-muted-foreground">
                  Notes
                </Label>
                <Textarea
                  id="task-notes"
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  onBlur={flushNotes}
                  placeholder="Add notes, context, or links…"
                  rows={5}
                  className="resize-y themed-scrollbar"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Subtasks ({task.subtasks.filter((s) => s.done).length}/{task.subtasks.length})
                </Label>
                <div className="space-y-1">
                  {task.subtasks.map((st) => (
                    <div key={st.id} className="group flex items-center gap-2 pl-1">
                      <TaskCheckbox
                        checked={st.done}
                        onToggle={() => toggleSubtask(task.id, st.id)}
                        accent={accent}
                        size="sm"
                      />
                      <input
                        defaultValue={st.title}
                        aria-label="Subtask title"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== st.title) updateSubtask(task.id, st.id, v);
                          else if (!v) e.target.value = st.title;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        className={cn(
                          "flex-1 min-w-0 bg-transparent outline-none py-1 text-sm",
                          st.done && "line-through text-muted-foreground",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => deleteSubtask(task.id, st.id)}
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        aria-label={`Delete subtask ${st.title}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pl-1">
                    <div className="size-4 rounded-full border-2 border-dashed border-border flex items-center justify-center shrink-0">
                      <Plus className="size-2.5 text-muted-foreground" />
                    </div>
                    <input
                      value={subtaskInput}
                      onChange={(e) => setSubtaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && subtaskInput.trim()) {
                          e.preventDefault();
                          addSubtask(task.id, subtaskInput.trim());
                          setSubtaskInput("");
                        }
                      }}
                      aria-label="Add subtask"
                      placeholder="Add subtask…"
                      className="flex-1 min-w-0 bg-transparent outline-none py-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
