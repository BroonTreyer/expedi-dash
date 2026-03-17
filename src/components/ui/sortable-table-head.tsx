import * as React from "react";
import { TableHead } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortState } from "@/hooks/useSortableTable";

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sort: SortState;
  sortKey: string;
  onSort: (key: string) => void;
  children: React.ReactNode;
}

export function SortableTableHead({ sort, sortKey, onSort, children, className, ...props }: SortableTableHeadProps) {
  const isActive = sort.key === sortKey;
  return (
    <TableHead
      onClick={() => onSort(sortKey)}
      className={cn("cursor-pointer select-none hover:bg-muted/60 transition-colors", className)}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          sort.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5 shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-30" />
        )}
      </div>
    </TableHead>
  );
}
