"use client";

import React from "react";
import { useView } from "./ViewContext";

interface ViewSidebarProps {
  tableId: string;
}

export function ViewSidebar({ tableId }: ViewSidebarProps) {
  const { views, currentViewId, switchView, createView } = useView();

  return (
    <aside className="h-full p-3">
      {/* Create new view button */}
      <button
        onClick={() => {
          createView(`Grid view ${views.length + 1}`);
        }}
        className="w-full px-2 py-2 rounded-md text-sm flex items-center gap-2 cursor-pointer hover:bg-gray-100 text-gray-900 mb-2"
      >
        <span className="truncate">+ Create new view</span>
      </button>
      
      <ul className="space-y-1">
        {views.map((view) => (
          <li
            key={view.id}
            onClick={() => switchView(view.id)}
            className={`px-2 py-2 rounded-md text-sm flex items-center gap-2 cursor-pointer ${
              currentViewId === view.id 
                ? "bg-gray-100 text-gray-900" 
                : "hover:bg-gray-100 text-gray-900"
            }`}
          >
            <span className="truncate">{view.name}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}


