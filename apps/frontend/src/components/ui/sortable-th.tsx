"use client";

interface SortableThProps {
  label: string;
  sortKey: string;
  currentKey: string | null;
  direction: "asc" | "desc";
  onSort: (key: string) => void;
  align?: "left" | "right" | "center";
  className?: string;
}

export function SortableTh({
  label,
  sortKey,
  currentKey,
  direction,
  onSort,
  align = "left",
  className = "",
}: SortableThProps) {
  const active = currentKey === sortKey;
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <th className={`px-5 py-3 font-medium ${alignClass} ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 whitespace-nowrap transition hover:text-gray-700 ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-gray-900" : ""}`}
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className={`shrink-0 transition ${active ? "opacity-100" : "opacity-30"} ${
            active && direction === "desc" ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </th>
  );
}
