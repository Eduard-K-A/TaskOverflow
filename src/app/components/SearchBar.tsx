import { forwardRef, useImperativeHandle, useRef } from "react";
import { Search, X } from "lucide-react";
import { useStore } from "../store/useStore";
import { cn } from "./ui/utils";

export interface SearchBarHandle {
  focus: () => void;
}

export const SearchBar = forwardRef<SearchBarHandle>((_, ref) => {
  const query = useStore((s) => s.searchQuery);
  const setSearch = useStore((s) => s.setSearch);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  return (
    <div
      className={cn(
        "relative flex items-center w-full max-w-sm h-9 rounded-lg bg-transparent border border-transparent",
        "hover:bg-accent/40 focus-within:bg-background focus-within:border-border transition-colors",
      )}
    >
      <Search className="size-4 ml-2.5 text-muted-foreground shrink-0" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search tasks…"
        className="flex-1 bg-transparent outline-none px-2 placeholder:text-muted-foreground text-sm"
      />
      {query && (
        <button
          type="button"
          onClick={() => setSearch("")}
          className="mr-1 size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
});
SearchBar.displayName = "SearchBar";
