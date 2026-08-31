import { useEffect, useState } from "react";
import { format, getMonth, getYear, startOfMonth } from "date-fns";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), "MMM"));

/** Years are browsed a page at a time, aligned so a page always starts on a multiple of 12. */
const YEAR_PAGE = 12;
const yearPageStart = (year: number) => Math.floor(year / YEAR_PAGE) * YEAR_PAGE;

interface Props {
  /** The month currently shown by the calendar. */
  value: Date;
  onChange: (month: Date) => void;
  onOpenChange?: (open: boolean) => void;
}

export const MonthYearPicker = ({ value, onChange, onOpenChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [pane, setPane] = useState<"month" | "year">("month");
  const [year, setYear] = useState(() => getYear(value));
  const [pageStart, setPageStart] = useState(() => yearPageStart(getYear(value)));

  const today = new Date();
  const selectedYear = getYear(value);
  const selectedMonth = getMonth(value);

  // Every opening starts from the month the calendar is actually showing.
  useEffect(() => {
    if (!open) return;
    setPane("month");
    setYear(selectedYear);
    setPageStart(yearPageStart(selectedYear));
  }, [open, selectedYear]);

  const setOpenState = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const step = (direction: 1 | -1) => {
    if (pane === "month") setYear((y) => y + direction);
    else setPageStart((s) => s + direction * YEAR_PAGE);
  };

  const pickMonth = (monthIndex: number) => {
    onChange(startOfMonth(new Date(year, monthIndex, 1)));
    setOpenState(false);
  };

  const cellClass = (selected: boolean, isCurrent: boolean) =>
    cn(
      "h-9 rounded-md text-sm tabular-nums transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      selected
        ? "bg-primary text-primary-foreground font-medium"
        : "hover:bg-accent hover:text-accent-foreground",
      !selected && isCurrent && "ring-1 ring-primary/40 font-medium",
    );

  return (
    <Popover open={open} onOpenChange={setOpenState}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="min-w-[160px] justify-center gap-2 px-2 font-medium"
          aria-label={`${format(value, "MMMM yyyy")} — choose a different month`}
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          <span className="tabular-nums" aria-live="polite">
            {format(value, "MMMM yyyy")}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="center" className="w-64 p-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => step(-1)}
            aria-label={pane === "month" ? "Previous year" : "Earlier years"}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <button
            type="button"
            onClick={() => setPane((p) => (p === "month" ? "year" : "month"))}
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-sm font-medium tabular-nums transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label={pane === "month" ? "Choose a year" : "Back to months"}
          >
            {pane === "month" ? year : `${pageStart} – ${pageStart + YEAR_PAGE - 1}`}
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => step(1)}
            aria-label={pane === "month" ? "Next year" : "Later years"}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {pane === "month" ? (
          <div className="grid grid-cols-3 gap-1">
            {MONTH_LABELS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => pickMonth(index)}
                aria-current={
                  year === selectedYear && index === selectedMonth ? "true" : undefined
                }
                className={cellClass(
                  year === selectedYear && index === selectedMonth,
                  year === getYear(today) && index === getMonth(today),
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: YEAR_PAGE }, (_, i) => pageStart + i).map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => {
                  setYear(y);
                  setPane("month");
                }}
                className={cellClass(y === year, y === getYear(today))}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3"
          onClick={() => {
            onChange(startOfMonth(new Date()));
            setOpenState(false);
          }}
        >
          Jump to today
        </Button>
      </PopoverContent>
    </Popover>
  );
};
