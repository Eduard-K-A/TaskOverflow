import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../store/useStore";
import { parseImportFile, type ImportGroupDraft } from "../lib/dataTransfer";
import { ACCENT_PALETTE } from "../lib/tokens";
import { dateKeyFromIso } from "../lib/date";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { cn } from "./ui/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Selection = {
  groups: Set<string>;
  tasks: Set<string>;
};

function emptySelection(): Selection {
  return { groups: new Set(), tasks: new Set() };
}

function allSelected(drafts: ImportGroupDraft[]): Selection {
  const groups = new Set(drafts.map((g) => g.id));
  const tasks = new Set(drafts.flatMap((g) => g.tasks.map((t) => t.id)));
  return { groups, tasks };
}

export const DataImportDialog = ({ open, onOpenChange }: Props) => {
  const importDrafts = useStore((s) => s.importSelectedDrafts);

  const [drafts, setDrafts] = useState<ImportGroupDraft[]>([]);
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const [filename, setFilename] = useState("");
  const [importing, setImporting] = useState(false);

  const totalTasks = useMemo(
    () => drafts.reduce((n, g) => n + g.tasks.length, 0),
    [drafts],
  );

  const selectedTaskCount = selection.tasks.size;

  const reset = () => {
    setDrafts([]);
    setSelection(emptySelection());
    setFilename("");
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const parsed = parseImportFile(text, file.name);
        if (parsed.length === 0) {
          toast.error("No groups or tasks found in file");
          return;
        }
        setDrafts(parsed);
        setSelection(allSelected(parsed));
        setFilename(file.name);
        onOpenChange(true);
      } catch {
        toast.error("Could not parse file — use JSON or CSV export format");
      }
    };
    reader.readAsText(file);
  };

  const toggleGroup = (groupId: string, checked: boolean) => {
    const group = drafts.find((g) => g.id === groupId);
    if (!group) return;
    setSelection((prev) => {
      const groups = new Set(prev.groups);
      const tasks = new Set(prev.tasks);
      if (checked) {
        groups.add(groupId);
        for (const t of group.tasks) tasks.add(t.id);
      } else {
        groups.delete(groupId);
        for (const t of group.tasks) tasks.delete(t.id);
      }
      return { groups, tasks };
    });
  };

  const toggleTask = (groupId: string, taskId: string, checked: boolean) => {
    const group = drafts.find((g) => g.id === groupId);
    if (!group) return;
    setSelection((prev) => {
      const groups = new Set(prev.groups);
      const tasks = new Set(prev.tasks);
      if (checked) {
        tasks.add(taskId);
        if (group.tasks.every((t) => tasks.has(t.id) || t.id === taskId)) {
          groups.add(groupId);
        }
      } else {
        tasks.delete(taskId);
        groups.delete(groupId);
      }
      return { groups, tasks };
    });
  };

  const selectAll = (checked: boolean) => {
    setSelection(checked ? allSelected(drafts) : emptySelection());
  };

  const submit = async () => {
    const payload = drafts
      .filter((g) => g.tasks.some((t) => selection.tasks.has(t.id)))
      .map((g) => ({
        ...g,
        tasks: g.tasks.filter((t) => selection.tasks.has(t.id)),
      }));

    if (payload.length === 0) {
      toast.error("Select at least one task to import");
      return;
    }

    setImporting(true);
    try {
      const { groups: createdGroups, tasks: createdTasks } = await importDrafts(payload);
      toast.success(
        `Imported ${createdTasks} task${createdTasks === 1 ? "" : "s"} into ${createdGroups} group${createdGroups === 1 ? "" : "s"}`,
      );
      handleClose(false);
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <label className="inline-flex">
        <input
          type="file"
          accept="application/json,.json,text/csv,.csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" className="h-8" asChild>
          <span className="cursor-pointer">
            <Upload className="size-3.5 mr-1.5" />
            Import
          </span>
        </Button>
      </label>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[720px] w-[94vw] max-h-[88vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Import data</DialogTitle>
            <DialogDescription>
              {filename
                ? `Previewing ${filename} — select groups and tasks to add to your workspace.`
                : "Choose a JSON or CSV file exported from TaskOverflow."}
            </DialogDescription>
          </DialogHeader>

          {drafts.length > 0 && (
            <>
              <div className="px-6 py-2 flex items-center justify-between text-xs text-muted-foreground border-y border-border/60 bg-muted/20">
                <span>
                  {drafts.length} group{drafts.length === 1 ? "" : "s"} · {totalTasks} task
                  {totalTasks === 1 ? "" : "s"}
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedTaskCount === totalTasks && totalTasks > 0}
                    onCheckedChange={(v) => selectAll(v === true)}
                  />
                  Select all
                </label>
              </div>

              <div className="flex-1 overflow-y-auto themed-scrollbar px-6 py-4 space-y-4 min-h-0 max-h-[50vh]">
                {drafts.map((group) => {
                  const groupChecked =
                    group.tasks.length > 0 &&
                    group.tasks.every((t) => selection.tasks.has(t.id));
                  const partial =
                    !groupChecked && group.tasks.some((t) => selection.tasks.has(t.id));

                  return (
                    <div
                      key={group.id}
                      className="rounded-lg border border-border/60 bg-card/40 overflow-hidden"
                    >
                      <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/30 border-b border-border/40">
                        <Checkbox
                          checked={partial ? "indeterminate" : groupChecked}
                          onCheckedChange={(v) => toggleGroup(group.id, v === true)}
                        />
                        <span
                          className={cn(
                            "size-2 rounded-full shrink-0",
                            ACCENT_PALETTE[group.accent].fill,
                          )}
                        />
                        <span className="text-sm font-medium flex-1 truncate">{group.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {group.tasks.length} task{group.tasks.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      {group.tasks.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">No tasks in this group</p>
                      ) : (
                        <ul className="divide-y divide-border/40">
                          {group.tasks.map((task) => (
                            <li key={task.id} className="flex items-start gap-3 px-3 py-2">
                              <Checkbox
                                className="mt-0.5"
                                checked={selection.tasks.has(task.id)}
                                onCheckedChange={(v) => toggleTask(group.id, task.id, v === true)}
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    "text-sm truncate",
                                    task.status === "done" && "line-through text-muted-foreground",
                                  )}
                                >
                                  {task.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                                  <span className="capitalize">{task.status === "done" ? "Done" : "To-Do"}</span>
                                  {task.dueDate && (
                                    <span>Due {dateKeyFromIso(task.dueDate)}</span>
                                  )}
                                  {task.tags.length > 0 && (
                                    <span>{task.tags.join(", ")}</span>
                                  )}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>

              <DialogFooter className="px-6 py-4 border-t border-border/60">
                <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>
                  Cancel
                </Button>
                <Button onClick={() => void submit()} disabled={importing || selectedTaskCount === 0}>
                  {importing
                    ? "Importing…"
                    : `Import ${selectedTaskCount} task${selectedTaskCount === 1 ? "" : "s"}`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
