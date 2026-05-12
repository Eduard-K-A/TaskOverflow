import { useEffect, useState } from "react";
import {
  Palette,
  ListTodo,
  Bell,
  Database,
  MonitorCog,
  Keyboard,
  Info,
  AlertTriangle,
  Download,
  Upload,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useStore, DEFAULT_SETTINGS, type Settings } from "../store/useStore";
import { useTheme } from "../hooks/useTheme";
import { ACCENT_PALETTE, ACCENT_KEYS } from "../lib/tokens";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
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
import { cn } from "./ui/utils";

type SectionId =
  | "appearance"
  | "tasks"
  | "notifications"
  | "data"
  | "system"
  | "shortcuts"
  | "about"
  | "danger";

const SECTIONS: Array<{ id: SectionId; label: string; icon: typeof Palette }> = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "tasks", label: "Tasks & behaviour", icon: ListTodo },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data", label: "Data & storage", icon: Database },
  { id: "system", label: "System", icon: MonitorCog },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  { id: "about", label: "About", icon: Info },
  { id: "danger", label: "Danger zone", icon: AlertTriangle },
];

const Row = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-6 px-4 py-3">
    <div className="min-w-0">
      <div className="text-sm text-foreground">{title}</div>
      {description && (
        <div className="text-xs text-muted-foreground/80 mt-0.5">{description}</div>
      )}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Card = ({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    {(title || description) && (
      <div className="px-1">
        {title && <h4 className="text-xs uppercase tracking-wider text-muted-foreground/70">{title}</h4>}
        {description && <p className="text-xs text-muted-foreground/60 mt-1">{description}</p>}
      </div>
    )}
    <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/40 overflow-hidden">
      {children}
    </div>
  </div>
);

const SectionHeader = ({
  title,
  description,
}: {
  icon?: typeof Palette;
  title: string;
  description: string;
}) => (
  <div className="mb-6">
    <h2 style={{ fontSize: "1.5rem" }} className="text-foreground">{title}</h2>
    <p className="text-sm text-muted-foreground/80 mt-1">{description}</p>
  </div>
);

const KeyHint = ({ keys }: { keys: string[] }) => (
  <span className="flex items-center gap-1">
    {keys.map((k) => (
      <kbd
        key={k}
        className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md border border-border bg-muted text-xs"
      >
        {k}
      </kbd>
    ))}
  </span>
);

export const SettingsDialog = () => {
  const open = useStore((s) => s.settingsOpen);
  const setOpen = useStore((s) => s.setSettingsOpen);
  const savedSettings = useStore((s) => s.settings);
  const saveSettings = useStore((s) => s.saveSettings);
  const resetSettingsStore = useStore((s) => s.resetSettings);
  const { theme, setTheme } = useTheme();
  const exportGroup = useStore((s) => s.exportGroup);
  const groups = useStore((s) => s.groups);
  const deleteGroup = useStore((s) => s.deleteGroup);
  const tasks = useStore((s) => s.tasks);

  const [active, setActive] = useState<SectionId>("appearance");
  const [draft, setDraft] = useState<Settings>(savedSettings);
  const [draftTheme, setDraftTheme] = useState(theme);
  const [deleteGroupChoice, setDeleteGroupChoice] = useState<string>("");

  // Reset draft whenever dialog opens
  useEffect(() => {
    if (open) {
      setDraft(savedSettings);
      setDraftTheme(theme);
    }
  }, [open]);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const dirty =
    draftTheme !== theme ||
    (Object.keys(draft) as Array<keyof Settings>).some((k) => draft[k] !== savedSettings[k]);

  const handleSave = () => {
    saveSettings(draft);
    if (draftTheme !== theme) setTheme(draftTheme);
    toast.success("Settings saved");
    setOpen(false);
  };

  const handleCancel = () => {
    setDraft(savedSettings);
    setDraftTheme(theme);
    setOpen(false);
  };

  const handleResetToDefaults = () => {
    setDraft(DEFAULT_SETTINGS);
    setDraftTheme("system");
  };

  const completedCount = tasks.filter((t) => t.status === "done").length;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleCancel())}>
      <DialogContent className="p-0 overflow-hidden gap-0 sm:max-w-[880px] w-[92vw] h-[80vh] flex flex-col border-border/60 shadow-2xl">
        <DialogTitle className="sr-only">Settings</DialogTitle>

        <div className="flex flex-1 min-h-0">
          <aside className="w-52 shrink-0 border-r border-border/60 bg-muted/30 flex flex-col">
            <div className="px-5 pt-5 pb-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground/70">Settings</div>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
              {SECTIONS.map(({ id, label, icon: Icon }) => {
                const isActive = active === id;
                const isDanger = id === "danger";
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActive(id)}
                    className={cn(
                      "relative w-full flex items-center gap-2.5 pl-3 pr-2.5 h-9 rounded-lg text-sm text-left transition-colors",
                      isActive
                        ? isDanger
                          ? "bg-destructive/10 text-destructive"
                          : "bg-foreground/10 text-foreground"
                        : isDanger
                          ? "text-destructive/70 hover:bg-destructive/5 hover:text-destructive"
                          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                    )}
                  >
                    {isActive && (
                      <span
                        className={cn(
                          "absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full",
                          isDanger ? "bg-destructive" : "bg-foreground",
                        )}
                      />
                    )}
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </nav>
            <Separator className="bg-border/60" />
            <div className="px-5 py-3 text-[11px] text-muted-foreground/70 leading-snug">
              Created for you by Eduard King Anterola
            </div>
          </aside>

          <div className="flex-1 overflow-y-auto bg-background">
            <div className="px-10 py-8 max-w-[640px]">
              {active === "appearance" && (
                <section>
                  <SectionHeader icon={Palette} title="Appearance" description="Theme, font, and layout density" />
                  <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/40 overflow-hidden">
                    <Row title="Theme" description="Follow system, or force light / dark">
                      <Select value={draftTheme} onValueChange={(v) => setDraftTheme(v as typeof theme)}>
                        <SelectTrigger className="w-44 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System default</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </Row>
                    <Row title="Accent color palette" description="Colors available when creating groups">
                      <div className="flex gap-1.5">
                        {ACCENT_KEYS.map((k) => (
                          <span key={k} className={cn("size-4 rounded-full", ACCENT_PALETTE[k].fill)} />
                        ))}
                      </div>
                    </Row>
                    <Row title="Layout density" description="Controls task row height and spacing">
                      <Select value={draft.density} onValueChange={(v) => update("density", v as Settings["density"])}>
                        <SelectTrigger className="w-44 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">Compact</SelectItem>
                          <SelectItem value="comfortable">Comfortable</SelectItem>
                          <SelectItem value="spacious">Spacious</SelectItem>
                        </SelectContent>
                      </Select>
                    </Row>
                    <Row title="Sidebar width" description="Default width when not collapsed">
                      <Select
                        value={String(draft.sidebarWidth)}
                        onValueChange={(v) => update("sidebarWidth", Number(v))}
                      >
                        <SelectTrigger className="w-44 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="220">220px</SelectItem>
                          <SelectItem value="264">264px</SelectItem>
                          <SelectItem value="300">300px</SelectItem>
                        </SelectContent>
                      </Select>
                    </Row>
                    <Row title="Show task count badges" description="Numbers next to group names in sidebar">
                      <Switch
                        checked={draft.showCounts}
                        onCheckedChange={(v) => update("showCounts", v)}
                      />
                    </Row>
                  </div>
                </section>
              )}

              {active === "tasks" && (
                <section>
                  <SectionHeader icon={ListTodo} title="Tasks" description="How tasks behave when created and completed" />
                  <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/40 overflow-hidden">
                    <Row title="Move completed tasks to bottom" description="Checked tasks sink below unchecked ones automatically">
                      <Switch
                        checked={draft.moveCompletedDown}
                        onCheckedChange={(v) => update("moveCompletedDown", v)}
                      />
                    </Row>
                    <Row title="Show completed tasks" description="Hide done tasks from the list by default">
                      <Switch
                        checked={draft.showCompleted}
                        onCheckedChange={(v) => update("showCompleted", v)}
                      />
                    </Row>
                    <Row title="Default due date" description="Pre-fill due date when creating a new task">
                      <Select
                        value={draft.defaultDueDate}
                        onValueChange={(v) => update("defaultDueDate", v as Settings["defaultDueDate"])}
                      >
                        <SelectTrigger className="w-44 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="tomorrow">Tomorrow</SelectItem>
                          <SelectItem value="next-week">Next week</SelectItem>
                        </SelectContent>
                      </Select>
                    </Row>
                    <Row title="Confirm before deleting a task" description="Show a prompt before permanent deletion">
                      <Switch
                        checked={draft.confirmDelete}
                        onCheckedChange={(v) => update("confirmDelete", v)}
                      />
                    </Row>
                    <Row title="Mark overdue tasks in red" description="Highlight due dates that have passed">
                      <Switch
                        checked={draft.overdueRed}
                        onCheckedChange={(v) => update("overdueRed", v)}
                      />
                    </Row>
                  </div>
                </section>
              )}

              {active === "notifications" && (
                <section>
                  <SectionHeader icon={Bell} title="Notifications" description="OS-level reminders for due tasks" />
                  <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/40 overflow-hidden">
                    <Row title="Enable due date reminders" description="Send a native OS notification when a task is due">
                      <Switch
                        checked={draft.notificationsEnabled}
                        onCheckedChange={async (v) => {
                          if (v && "Notification" in window && Notification.permission === "default") {
                            await Notification.requestPermission();
                          }
                          update("notificationsEnabled", v);
                        }}
                      />
                    </Row>
                    <Row title="Remind me before due" description="How early to send the reminder">
                      <Select
                        value={draft.remindBefore}
                        onValueChange={(v) => update("remindBefore", v)}
                      >
                        <SelectTrigger className="w-44 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">At time of due</SelectItem>
                          <SelectItem value="15">15 minutes before</SelectItem>
                          <SelectItem value="30">30 minutes before</SelectItem>
                          <SelectItem value="60">1 hour before</SelectItem>
                          <SelectItem value="1440">1 day before</SelectItem>
                        </SelectContent>
                      </Select>
                    </Row>
                    <Row title="Notification sound" description="Play a sound with the reminder">
                      <Switch checked={draft.notifSound} onCheckedChange={(v) => update("notifSound", v)} />
                    </Row>
                    <Row title="Do not disturb hours" description="Suppress reminders between set hours">
                      <Select value={draft.dndHours} onValueChange={(v) => update("dndHours", v)}>
                        <SelectTrigger className="w-44 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="off">Off</SelectItem>
                          <SelectItem value="22-08">10 PM – 8 AM</SelectItem>
                          <SelectItem value="23-07">11 PM – 7 AM</SelectItem>
                          <SelectItem value="00-09">Midnight – 9 AM</SelectItem>
                        </SelectContent>
                      </Select>
                    </Row>
                  </div>
                </section>
              )}

              {active === "data" && (
                <section>
                  <SectionHeader icon={Database} title="Data" description="Database location, backup, and export" />
                  <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/40 overflow-hidden">
                    <Row title="Database location" description="Where taskoverflow.db is stored on disk">
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-muted-foreground bg-muted px-2 h-7 inline-flex items-center rounded-md max-w-[200px] truncate">
                          C:\Users\Eduard\AppData\…
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => toast.info("Database location is fixed in browser mode")}
                        >
                          Change
                        </Button>
                      </div>
                    </Row>
                    <Row title="Export all data" description="Download every group and task as JSON">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          groups.forEach((g) => exportGroup(g.id, "json"));
                          toast.success(`Exported ${groups.length} group${groups.length === 1 ? "" : "s"} as JSON`);
                        }}
                      >
                        <Download className="size-3.5 mr-1.5" />
                        Export JSON
                      </Button>
                    </Row>
                    <Row title="Export as CSV" description="Flat spreadsheet — one row per task across all groups">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          groups.forEach((g) => exportGroup(g.id, "csv"));
                          toast.success(`Exported ${groups.length} group${groups.length === 1 ? "" : "s"} as CSV`);
                        }}
                      >
                        <Download className="size-3.5 mr-1.5" />
                        Export CSV
                      </Button>
                    </Row>
                    <Row title="Import from JSON" description="Restore groups and tasks from a previous export">
                      <ImportButton />
                    </Row>
                    <Row title="Auto-backup" description="Save a daily .db snapshot to a backup folder">
                      <Switch
                        checked={draft.autoBackup}
                        onCheckedChange={(v) => update("autoBackup", v)}
                      />
                    </Row>
                    <Row title="Database size" description="Current size of taskoverflow.db">
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {estimateSize()} KB
                      </span>
                    </Row>
                  </div>
                </section>
              )}

              {active === "system" && (
                <section>
                  <SectionHeader icon={MonitorCog} title="System" description="Startup, tray, and window behaviour" />
                  <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/40 overflow-hidden">
                    <Row title="Launch at login" description="Start TaskOverflow automatically when you log in">
                      <Switch
                        checked={draft.launchAtLogin}
                        onCheckedChange={(v) => update("launchAtLogin", v)}
                      />
                    </Row>
                    <Row title="Start minimized to tray" description="Open in the background without showing the window">
                      <Switch
                        checked={draft.startMinimized}
                        onCheckedChange={(v) => update("startMinimized", v)}
                      />
                    </Row>
                    <Row title="Close to system tray" description="Clicking × minimizes to tray instead of quitting">
                      <Switch
                        checked={draft.closeToTray}
                        onCheckedChange={(v) => update("closeToTray", v)}
                      />
                    </Row>
                    <Row title="Remember window size and position" description="Restore last window state on next launch">
                      <Switch
                        checked={draft.rememberWindow}
                        onCheckedChange={(v) => update("rememberWindow", v)}
                      />
                    </Row>
                    <Row title="Global shortcut — Quick Add" description="Open the quick-add mini window from anywhere">
                      <KeyHint keys={["Ctrl", "Shift", "N"]} />
                    </Row>
                  </div>
                </section>
              )}

              {active === "shortcuts" && (
                <section>
                  <SectionHeader icon={Keyboard} title="Shortcuts" description="In-app keyboard shortcut reference" />
                  <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/40 overflow-hidden">
                    <Row title="Focus quick-add task input"><KeyHint keys={["N"]} /></Row>
                    <Row title="Open search"><KeyHint keys={["Ctrl", "K"]} /></Row>
                    <Row title="Toggle sidebar"><KeyHint keys={["Ctrl", "B"]} /></Row>
                    <Row title="New group"><KeyHint keys={["G"]} /></Row>
                    <Row title="New group (anywhere)"><KeyHint keys={["Ctrl", "Shift", "N"]} /></Row>
                    <Row title="Show this help"><KeyHint keys={["?"]} /></Row>
                    <Row title="Close panel or dialog"><KeyHint keys={["Esc"]} /></Row>
                  </div>
                </section>
              )}

              {active === "about" && (
                <section>
                  <SectionHeader icon={Info} title="About TaskOverflow" description="Version info and update channel" />
                  <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/40 overflow-hidden">
                    <Row title="Version">
                      <span className="text-sm text-muted-foreground tabular-nums">v1.0.0</span>
                    </Row>
                    <Row title="Check for updates" description="You are on the latest version">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => toast.success("You are on the latest version")}
                      >
                        Check now
                      </Button>
                    </Row>
                    <Row title="Release notes" description="View changelog">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => toast.info("No changelog available yet")}
                      >
                        Open
                        <ExternalLink className="size-3.5 ml-1.5" />
                      </Button>
                    </Row>
                    <Row title="Built with">
                      <span className="text-xs text-muted-foreground">
                        Electron · React · SQLite · Tailwind
                      </span>
                    </Row>
                  </div>
                </section>
              )}

              {active === "danger" && (
                <section>
                  <SectionHeader icon={AlertTriangle} title="Danger zone" description="Irreversible actions — proceed with caution" />
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 divide-y divide-destructive/20 overflow-hidden">
                    <Row
                      title="Delete all completed tasks"
                      description={`Permanently remove ${completedCount} done task${completedCount === 1 ? "" : "s"} across all groups`}
                    >
                      <DangerConfirm
                        label="Delete"
                        disabled={completedCount === 0}
                        title="Delete completed tasks?"
                        body={`This removes ${completedCount} completed task${completedCount === 1 ? "" : "s"} across every group.`}
                        onConfirm={() => {
                          tasks
                            .filter((t) => t.status === "done")
                            .forEach((t) => useStore.getState().deleteTask(t.id));
                          toast.success(`Deleted ${completedCount} task${completedCount === 1 ? "" : "s"}`);
                        }}
                      />
                    </Row>
                    <Row title="Delete a group" description="Remove a group and all its tasks permanently">
                      <div className="flex items-center gap-2">
                        <Select value={deleteGroupChoice} onValueChange={setDeleteGroupChoice}>
                          <SelectTrigger className="w-44 h-8">
                            <SelectValue placeholder="Choose group" />
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <DangerConfirm
                          label="Delete"
                          disabled={!deleteGroupChoice}
                          title="Delete this group?"
                          body="This removes the group and every task inside it."
                          onConfirm={() => {
                            if (deleteGroupChoice) {
                              const name = groups.find((g) => g.id === deleteGroupChoice)?.name;
                              deleteGroup(deleteGroupChoice);
                              setDeleteGroupChoice("");
                              toast.success(`Deleted "${name}"`);
                            }
                          }}
                        />
                      </div>
                    </Row>
                    <Row title="Reset all settings" description="Restore all preferences to factory defaults">
                      <DangerConfirm
                        label="Reset"
                        title="Reset all settings?"
                        body="Preferences will return to defaults. Tasks and groups stay intact. You'll still need to click Save."
                        onConfirm={() => {
                          handleResetToDefaults();
                          toast.info("Settings reset to defaults — click Save to apply");
                        }}
                      />
                    </Row>
                    <Row title="Wipe all data" description="Delete every group, task, and setting. Cannot be undone.">
                      <DangerConfirm
                        label="Wipe data"
                        title="Wipe all data?"
                        body="Every group, task, tag, and setting will be erased. This action cannot be undone."
                        onConfirm={() => {
                          try {
                            localStorage.removeItem("taskoverflow-state");
                          } catch {}
                          resetSettingsStore();
                          location.reload();
                        }}
                      />
                    </Row>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-6 py-3 bg-muted/30">
          <span className="text-xs text-muted-foreground inline-flex items-center gap-2">
            <span
              className={cn(
                "size-1.5 rounded-full",
                dirty ? "bg-amber-500" : "bg-emerald-500/70",
              )}
            />
            {dirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!dirty}
              className={cn(dirty && "shadow-sm")}
            >
              Save changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DangerConfirm = ({
  label,
  title,
  body,
  onConfirm,
  disabled,
}: {
  label: string;
  title: string;
  body: string;
  onConfirm: () => void;
  disabled?: boolean;
}) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive" size="sm" className="h-8" disabled={disabled}>
        {label}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{body}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const ImportButton = () => {
  const groups = useStore((s) => s.groups);
  void groups;
  const onImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const data = JSON.parse(text);
        const incoming = Array.isArray(data) ? data : [data];
        let imported = 0;
        for (const entry of incoming) {
          const group = entry?.group;
          const tasks = entry?.tasks;
          if (!group?.name) continue;
          const created = useStore.getState().createGroup({
            name: group.name,
            emoji: group.emoji ?? "",
            accent: group.accent ?? "blue",
          });
          if (Array.isArray(tasks)) {
            for (const t of tasks) {
              if (typeof t?.title === "string") {
                const task = useStore.getState().createTask({
                  groupId: created.id,
                  title: t.title,
                });
                useStore.getState().updateTask(task.id, {
                  notes: t.notes ?? "",
                  status: t.status === "done" ? "done" : "todo",
                  dueDate: t.dueDate ?? null,
                  tags: Array.isArray(t.tags) ? t.tags : [],
                });
              }
            }
          }
          imported += 1;
        }
        toast.success(`Imported ${imported} group${imported === 1 ? "" : "s"}`);
      } catch {
        toast.error("Could not parse JSON file");
      }
    };
    reader.readAsText(file);
  };
  return (
    <label className="inline-flex">
      <input
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
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
  );
};

const estimateSize = () => {
  try {
    const raw = localStorage.getItem("taskoverflow-state") ?? "";
    return Math.max(1, Math.round(new Blob([raw]).size / 1024));
  } catch {
    return 0;
  }
};
