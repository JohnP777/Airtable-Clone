"use client";

import React, { useState, useRef, useEffect } from "react";
import { useView } from "./ViewContext";
import { useSearchContext } from "./SearchContext";

interface ViewSidebarProps {
  tableId: string;
}

export function ViewSidebar({ tableId }: ViewSidebarProps) {
  const { views, currentViewId, switchView, createView, renameView, deleteView, duplicateView } = useView();
  const { clearSearch } = useSearchContext();
  const [hoveredViewId, setHoveredViewId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
        setEditingViewId(null);
        setEditingName("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRenameView = (viewId: string, currentName: string) => {
    setEditingViewId(viewId);
    setEditingName(currentName);
    setOpenDropdownId(null);
  };

  const handleSaveRename = async () => {
    if (editingViewId && editingName.trim()) {
      try {
        await renameView(editingViewId, editingName.trim());
        setEditingViewId(null);
        setEditingName("");
      } catch (error) {
        console.error("Failed to rename view:", error);
      }
    }
  };

  const handleCancelRename = () => {
    setEditingViewId(null);
    setEditingName("");
  };

  const handleDeleteView = async (viewId: string) => {
    try {
      await deleteView(viewId);
      setOpenDropdownId(null);
    } catch (error) {
      console.error("Failed to delete view:", error);
    }
  };

  const handleDuplicateView = async (viewId: string) => {
    try {
      await duplicateView(viewId);
      clearSearch(); // Clear search when duplicating a view
      setOpenDropdownId(null);
    } catch (error) {
      console.error("Failed to duplicate view:", error);
    }
  };

  return (
    <aside className="h-full p-3">
      {/* Create new view button */}
      <button
        onClick={() => {
          createView(`Grid view ${views.length + 1}`);
          clearSearch(); // Clear search when creating a new view
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
            className="relative"
            onMouseEnter={() => setHoveredViewId(view.id)}
            onMouseLeave={() => setHoveredViewId(null)}
          >
            <div
              onClick={() => !editingViewId && switchView(view.id)}
              className={`w-full px-2 py-1.5 rounded-md text-xs flex items-center gap-2 cursor-pointer h-8 ${
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
              
              {editingViewId === view.id ? (
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveRename();
                      } else if (e.key === 'Escape') {
                        handleCancelRename();
                      }
                    }}
                    onBlur={handleSaveRename}
                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              ) : (
                <span className="truncate font-medium flex-1">{view.name}</span>
              )}
              
              {/* Triple dot icon - always present but controlled by opacity */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdownId(openDropdownId === view.id ? null : view.id);
                }}
                className={`p-1 hover:bg-gray-200 rounded transition-opacity ${
                  hoveredViewId === view.id ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <svg className="h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="19" cy="12" r="2"/>
                </svg>
              </button>
            </div>

            {/* Dropdown Menu */}
            {openDropdownId === view.id && (
              <div 
                ref={dropdownRef}
                className="absolute top-full right-0 mt-1 w-68 bg-white border border-gray-200 rounded-md shadow-lg z-50 transform translate-x-60"
              >
                <div className="py-2 px-2">
                  <button className="flex items-center w-full px-6 py-2 text-xs text-gray-700 hover:bg-gray-50">
                    <svg className="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    Add to 'My favorites'
                  </button>
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <button 
                    onClick={() => handleRenameView(view.id, view.name)}
                    className="flex items-center w-full px-6 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Rename view
                  </button>
                  
                  <button 
                    onClick={() => handleDuplicateView(view.id)}
                    className="flex items-center w-full px-6 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Duplicate view
                  </button>
                  
                  <button 
                    onClick={() => handleDeleteView(view.id)}
                    disabled={views.length <= 1}
                    className={`flex items-center w-full px-6 py-2 text-xs ${
                      views.length <= 1 
                        ? "text-gray-400 cursor-not-allowed" 
                        : "text-red-600 hover:bg-red-50"
                    }`}
                  >
                    <svg className={`h-4 w-4 mr-3 ${views.length <= 1 ? "text-gray-400" : "text-red-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete view
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}


