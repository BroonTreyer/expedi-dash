import { useState, useCallback, useMemo } from "react";

type SortDir = "asc" | "desc";

export interface SortState {
  key: string | null;
  dir: SortDir;
}

function compare(a: any, b: any): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? -1 : 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base" });
}

export function useSortableTable(defaultKey?: string, defaultDir: SortDir = "asc") {
  const [sort, setSort] = useState<SortState>({ key: defaultKey ?? null, dir: defaultDir });

  const toggleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { key, dir: "asc" };
    });
  }, []);

  const sortData = useCallback(<T,>(data: T[], accessors: Record<string, (item: T) => any>): T[] => {
    if (!sort.key || !accessors[sort.key]) return data;
    const accessor = accessors[sort.key];
    return [...data].sort((a, b) => {
      const result = compare(accessor(a), accessor(b));
      return sort.dir === "asc" ? result : -result;
    });
  }, [sort]);

  return { sort, toggleSort, sortData };
}
