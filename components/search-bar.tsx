"use client";

import { IconSearch } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  defaultValue?: string;
}

export function SearchBar({
  onSearch,
  placeholder = "Search movies & TV shows...",
  defaultValue = "",
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) return;

    timerRef.current = setTimeout(() => {
      onSearch(value.trim());
    }, 400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, onSearch]);

  return (
    <div className="relative">
      <IconSearch
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex h-13 w-full rounded-xl border border-border/50 bg-card/50 pl-11 pr-4 text-base backdrop-blur-sm transition-all placeholder:text-muted-foreground/50 focus:border-amber/40 focus:outline-none focus:ring-1 focus:ring-amber/20"
      />
    </div>
  );
}
