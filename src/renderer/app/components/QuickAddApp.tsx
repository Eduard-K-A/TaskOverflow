import { useEffect, useRef, useState } from "react";
import { useStore } from "../store/useStore";
import { Button } from "./ui/button";

export function QuickAddApp() {
  const hydrate = useStore((s) => s.hydrate);
  const isHydrated = useStore((s) => s.isHydrated);
  const groups = useStore((s) => s.groups);
  const activeGroupId = useStore((s) => s.activeGroupId);
  const createTask = useStore((s) => s.createTask);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!window.api?.subscribeReloadState) return;
    return window.api.subscribeReloadState(() => {
      void hydrate();
    });
  }, [hydrate]);

  useEffect(() => {
    if (activeGroupId) setGroupId(activeGroupId);
    else if (groups.length > 0) setGroupId(groups[0].id);
  }, [activeGroupId, groups]);

  useEffect(() => {
    if (!window.api?.onQuickAddPrepare) return;
    return window.api.onQuickAddPrepare(() => {
      setValue("");
      requestAnimationFrame(() => inputRef.current?.focus());
    });
  }, []);

  useEffect(() => {
    if (isHydrated) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isHydrated]);

  const close = (): void => {
    void window.api?.closeQuickAddWindow?.();
  };

  const submit = async (): Promise<void> => {
    const gid = groupId ?? groups[0]?.id;
    if (!gid) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    await createTask({ groupId: gid, title: trimmed });
    setValue("");
    await window.api?.broadcastStateReload?.();
    close();
  };

  if (!isHydrated) {
    return (
      <div className="h-full flex items-center justify-center px-4 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
        <p>Create a group in the main window first.</p>
        <Button type="button" variant="outline" size="sm" onClick={close}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col gap-2 p-3 bg-background text-foreground border-t border-border/60">
      {groups.length > 1 && (
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>Group</span>
          <select
            className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={groupId ?? groups[0].id}
            onChange={(e) => setGroupId(e.target.value)}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.emoji ? `${g.emoji} ` : ""}
                {g.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex items-center gap-2 min-h-0">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a task…"
          className="flex-1 min-w-0 h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
        />
        <Button type="button" size="sm" onClick={() => void submit()}>
          Add
        </Button>
      </div>
    </div>
  );
}
