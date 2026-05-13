import { Download } from "lucide-react";
import type { Group } from "../types";
import { useStore } from "../store/useStore";
import { ACCENT_PALETTE } from "../lib/tokens";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface Props {
  group: Group;
  totalCount: number;
  doneCount: number;
}

export const GroupHeader = ({ group, totalCount, doneCount }: Props) => {
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
          <Button
            variant="ghost"
            className="h-9 gap-2 px-3"
            aria-label="Export group"
            title="Export group"
          >
            <Download className="size-4" />
            <span>Export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => exportGroup(group.id, "json")}>
            <Download className="mr-2 size-4" />
            JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportGroup(group.id, "csv")}>
            <Download className="mr-2 size-4" />
            CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
