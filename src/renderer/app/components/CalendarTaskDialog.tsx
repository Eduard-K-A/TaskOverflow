import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../store/useStore";
import type { TaskStatus } from "../types";
import { fromDateInputValue } from "../lib/date";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ACCENT_PALETTE } from "../lib/tokens";
import { cn } from "./ui/utils";

const NEW_GROUP = "__new__";

export const CalendarTaskDialog = () => {
  const { open, defaultDate } = useStore((s) => s.calendarTaskDialog);
  const close = useStore((s) => s.closeCalendarTaskDialog);
  const groups = useStore((s) => s.groups);
  const activeGroupId = useStore((s) => s.activeGroupId);
  const createGroup = useStore((s) => s.createGroup);
  const createTaskWithDetails = useStore((s) => s.createTaskWithDetails);
  const selectCalendarTask = useStore((s) => s.selectCalendarTask);

  const [groupChoice, setGroupChoice] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  // Seed the form once per opening; later store updates must not wipe what is typed.
  const latest = useRef({ activeGroupId, groups });
  latest.current = { activeGroupId, groups };

  useEffect(() => {
    if (!open) return;
    const { activeGroupId: active, groups: list } = latest.current;
    const fallback = active ?? list[0]?.id ?? NEW_GROUP;
    setGroupChoice(list.length > 0 ? fallback : NEW_GROUP);
    setNewGroupName("");
    setTitle("");
    setStatus("todo");
    setDueDate(defaultDate ?? "");
    setNotes("");
    setTagInput("");
    setTags([]);
    setSubtasks([""]);
  }, [open, defaultDate]);

  const addTag = () => {
    const clean = tagInput.trim().toLowerCase();
    if (!clean || tags.includes(clean)) return;
    setTags((t) => [...t, clean]);
    setTagInput("");
  };

  const submit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Task title is required");
      return;
    }

    setSaving(true);
    try {
      let groupId = groupChoice;
      if (groupChoice === NEW_GROUP) {
        const name = newGroupName.trim();
        if (!name) {
          toast.error("Group name is required");
          setSaving(false);
          return;
        }
        const group = await createGroup({ name, emoji: "", accent: "blue" });
        groupId = group.id;
      }

      const task = await createTaskWithDetails({
        groupId,
        title: trimmedTitle,
        status,
        dueDate: fromDateInputValue(dueDate),
        notes: notes.trim(),
        tags,
        subtaskTitles: subtasks.filter((s) => s.trim()),
      });

      selectCalendarTask(task.id);
      toast.success("Task created");
      close();
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent className="sm:max-w-[720px] w-[94vw] max-h-[88vh] overflow-y-auto themed-scrollbar p-8 gap-5">
        <DialogHeader>
          <DialogTitle>Add task</DialogTitle>
          <DialogDescription>
            Create a task on the selected date. Pick an existing group or create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label>Group</Label>
            <Select value={groupChoice} onValueChange={setGroupChoice}>
              <SelectTrigger>
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <span className="flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", ACCENT_PALETTE[g.accent].fill)} />
                      {g.name}
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value={NEW_GROUP}>+ New group…</SelectItem>
              </SelectContent>
            </Select>
            {groupChoice === NEW_GROUP && (
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="New group name"
                autoFocus
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cal-task-title">Task</Label>
            <Input
              id="cal-task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To-Do</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cal-task-due">Due date</Label>
              <Input
                id="cal-task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5 items-center min-h-8">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags((t) => t.filter((x) => x !== tag))}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag…"
                className="h-8 flex-1 min-w-[120px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cal-task-notes">Notes</Label>
            <Textarea
              id="cal-task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context or links…"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Subtasks</Label>
            <div className="space-y-2">
              {subtasks.map((st, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={st}
                    onChange={(e) =>
                      setSubtasks((list) => list.map((v, j) => (j === i ? e.target.value : v)))
                    }
                    placeholder={`Subtask ${i + 1}`}
                  />
                  {subtasks.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => setSubtasks((list) => list.filter((_, j) => j !== i))}
                      aria-label="Remove subtask"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setSubtasks((list) => [...list, ""])}
              >
                <Plus className="size-3.5 mr-1" />
                Add subtask
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={saving}>
            {saving ? "Creating…" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
