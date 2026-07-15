"use client";

import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";
export type SortAccessor<T> = (row: T) => string | number | null | undefined;

// Tri générique côté client pour les tableaux : chaque colonne triable déclare
// un accesseur (valeur brute à comparer, pas le libellé affiché). Cliquer une
// 2e fois sur la même colonne inverse le sens ; changer de colonne repart en asc.
export function useSortableRows<T>(
  rows: T[],
  accessors: Record<string, SortAccessor<T>>,
) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [direction, setDirection] = useState<SortDirection>("asc");

  function toggleSort(key: string) {
    if (sortKey === key) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  }

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const accessor = accessors[sortKey];
    if (!accessor) return rows;

    const withIndex = rows.map((row, index) => ({ row, index, value: accessor(row) }));
    withIndex.sort((a, b) => {
      if (a.value == null && b.value == null) return a.index - b.index;
      if (a.value == null) return 1;
      if (b.value == null) return -1;
      let cmp: number;
      if (typeof a.value === "string" || typeof b.value === "string") {
        cmp = String(a.value).localeCompare(String(b.value), "fr");
      } else {
        cmp = a.value - (b.value as number);
      }
      return cmp !== 0 ? cmp : a.index - b.index;
    });

    const sorted = withIndex.map((entry) => entry.row);
    return direction === "desc" ? sorted.reverse() : sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, direction]);

  return { sortedRows, sortKey, direction, toggleSort };
}
