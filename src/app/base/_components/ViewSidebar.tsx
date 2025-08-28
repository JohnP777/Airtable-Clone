"use client";

import React from "react";
import { api } from "An/trpc/react";

interface ViewSidebarProps {
  tableId: string;
}

export function ViewSidebar({ tableId }: ViewSidebarProps) {
  const { data: views, isLoading } = api.table.listViews.useQuery({ tableId });

  if (isLoading) return null;

  return (
    <aside className="h-full p-3">
      <ul className="space-y-1">
        {(views ?? [{ id: "default", name: "Grid view", type: "grid", order: 0 }]).map((v, idx) => (
          <li
            key={v.id}
            className={`px-2 py-2 rounded-md text-sm flex items-center gap-2 ${idx === 0 ? "bg-blue-50 text-black" : "hover:bg-gray-100 text-gray-900"}`}
          >
            <span className="truncate">{v.name}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}


