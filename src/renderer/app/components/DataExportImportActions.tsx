import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../store/useStore";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { DataImportDialog } from "./DataImportDialog";

export const DataExportImportActions = () => {
  const exportAllData = useStore((s) => s.exportAllData);
  const [importOpen, setImportOpen] = useState(false);

  const handleExport = (format: "json" | "csv") => {
    exportAllData(format);
    toast.success(`Exported all data as ${format.toUpperCase()}`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Download className="mr-1.5 size-3.5" />
            Export
            <ChevronDown className="ml-1 size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExport("json")}>Export as JSON</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("csv")}>Export as CSV</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DataImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
};
