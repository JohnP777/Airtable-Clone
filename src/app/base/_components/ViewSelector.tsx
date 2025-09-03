"use client";

import React, { useState } from "react";
import { useView } from "./ViewContext";

export function ViewSelector() {
  const { views, currentViewId, switchView, createView } = useView();
  const [showAddView, setShowAddView] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  const handleCreateView = () => {
    if (newViewName.trim()) {
      createView(newViewName.trim());
      setNewViewName("");
      setShowAddView(false);
    }
  };

  // Note: deleteView functionality not yet implemented in the new ViewContext

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* View List */}
      <div className="flex flex-col items-center space-y-1">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => switchView(view.id)}
            className={`w-10 h-10 text-xs rounded border shadow-sm flex items-center justify-center relative ${
              currentViewId === view.id
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span className="truncate text-xs">{view.name}</span>
          </button>
        ))}
      </div>

      {/* Add View Button */}
      <div className="relative">
        <button
          onClick={() => setShowAddView(!showAddView)}
          className="w-10 h-10 text-xs rounded border shadow-sm bg-white text-gray-700 border-gray-200 hover:bg-gray-50 flex items-center justify-center"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>

        {showAddView && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="p-3">
              <input
                type="text"
                placeholder="View name"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateView();
                  } else if (e.key === "Escape") {
                    setShowAddView(false);
                    setNewViewName("");
                  }
                }}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex space-x-2 mt-2">
                <button
                  onClick={handleCreateView}
                  className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowAddView(false);
                    setNewViewName("");
                  }}
                  className="flex-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {showAddView && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowAddView(false);
            setNewViewName("");
          }}
        />
      )}
    </div>
  );
}
