import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { ACCENT_KEYS, ACCENT_PALETTE } from "../lib/tokens";
import type { AccentColor } from "../types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
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
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

export const GroupDialog = () => {
  const { open, editingId } = useStore((s) => s.groupDialog);
  const close = useStore((s) => s.closeGroupDialog);
  const groups = useStore((s) => s.groups);
  const createGroup = useStore((s) => s.createGroup);
  const updateGroup = useStore((s) => s.updateGroup);
  const deleteGroup = useStore((s) => s.deleteGroup);

  const editing = editingId ? groups.find((g) => g.id === editingId) ?? null : null;

  const [name, setName] = useState("");
  const [accent, setAccent] = useState<AccentColor>("blue");

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setAccent(editing?.accent ?? "blue");
  }, [open, editing?.id]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editing) {
      updateGroup(editing.id, { name: trimmed, emoji: "", accent });
    } else {
      createGroup({ name: trimmed, emoji: "", accent });
    }
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Group" : "New Group"}</DialogTitle>
          <DialogDescription>
            Groups are isolated workspaces with their own tasks and accent color.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vault-Ledger"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Accent</Label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_KEYS.map((k) => {
                const p = ACCENT_PALETTE[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setAccent(k)}
                    aria-label={p.name}
                    className={cn(
                      "size-7 rounded-full transition-transform",
                      p.fill,
                      accent === k
                        ? "ring-2 ring-offset-2 ring-offset-background ring-ring scale-110"
                        : "hover:scale-105",
                    )}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {editing && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="mr-auto text-destructive hover:text-destructive">
                  <Trash2 className="size-4 mr-2" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this group?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes "{editing.name}" and all of its tasks.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      deleteGroup(editing.id);
                      close();
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            {editing ? "Save changes" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
