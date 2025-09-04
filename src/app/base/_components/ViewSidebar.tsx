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
        className="w-full px-2 py-0.5 rounded-md text-xs flex items-center gap-3 cursor-pointer hover:bg-gray-100 text-gray-900 mb-2 mt-6"
      >
        <span className="text-xl ml-1 -mt-0.5">+</span>
        <span className="truncate">Create new...</span>
      </button>
      
      {/* Search bar */}
      <div className="relative mb-3">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button className="text-gray-400 hover:text-gray-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        <input
          type="text"
          placeholder="Find a view"
          className="w-full pl-9 pr-10 py-1.5 text-xs border-0 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border focus:border-blue-500"
        />
      </div>
      
      <ul className="space-y-1">
        {views.map((view) => (
          <li
            key={view.id}
            onClick={() => switchView(view.id)}
            className={`w-full px-2 py-1.5 rounded-md text-xs flex items-center gap-2 cursor-pointer ${
              currentViewId === view.id 
                ? "bg-gray-100 text-gray-900" 
                : "hover:bg-gray-100 text-gray-900"
            }`}
          >
            <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="12" y1="9" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span className="truncate font-medium">{view.name}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}


