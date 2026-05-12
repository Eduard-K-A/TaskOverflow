import { MoreHorizontal, Pencil, Download, FileJson, FileText } from "lucide-react";
import type { Group } from "../types";
import { useStore } from "../store/useStore";
import { ACCENT_PALETTE } from "../lib/tokens";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface Props {
  group: Group;
  totalCount: number;
  doneCount: number;
}

export const GroupHeader = ({ group, totalCount, doneCount }: Props) => {
  const openGroupDialog = useStore((s) => s.openGroupDialog);
  const exportGroup = useStore((s) => s.exportGroup);
  const palette = ACCENT_PALETTE[group.accent];

  return (
    <div className="flex items-center gap-3">
      <span className={`size-2.5 rounded-full ${palette.fill}`} aria-hidden />
      <div className="flex-1 min-w-0">
        <h1 className="truncate">{group.name}</h1>
        <p className="text-xs text-muted-foreground tabular-nums">
          {totalCount === 0
            ? "No tasks yet"
            : `${doneCount} of ${totalCount} complete`}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9" aria-label="Group options">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openGroupDialog(group.id)}>
            <Pencil className="size-4 mr-2" /> Edit group
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Download className="size-4 mr-2" /> Export
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => exportGroup(group.id, "json")}>
                <FileJson className="size-4 mr-2" /> JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportGroup(group.id, "csv")}>
                <FileText className="size-4 mr-2" /> CSV
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
