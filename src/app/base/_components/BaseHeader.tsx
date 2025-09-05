"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { api } from "../../../trpc/react";

interface BaseHeaderProps {
  baseId: string;
}

export function BaseHeader({ baseId }: BaseHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState("Untitled Base");
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const utils = api.useUtils();
  
  // Get current base data
  const { data: currentBase } = api.base.getById.useQuery({ id: baseId });
  
  const renameBaseMutation = api.base.rename.useMutation({
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await utils.base.getById.cancel({ id: baseId });
      
      // Snapshot the previous value
      const previousBase = utils.base.getById.getData({ id: baseId });
      
      // Optimistically update to the new value
      utils.base.getById.setData({ id: baseId }, (old) => {
        if (!old) return old;
        return { ...old, name: newData.name };
      });
      
      // Return a context object with the snapshotted value
      return { previousBase };
    },
    onError: (err, newData, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBase) {
        utils.base.getById.setData({ id: baseId }, context.previousBase);
      }
      console.error("Failed to rename base:", err);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      void utils.base.getById.invalidate({ id: baseId });
      void utils.base.getRecent.invalidate();
    },
  });

  // Update editing name when base data changes
  useEffect(() => {
    if (currentBase?.name) {
      setEditingName(currentBase.name);
    }
  }, [currentBase?.name]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setIsEditingName(false);
        setEditingName(currentBase?.name || "Untitled Base");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [currentBase?.name]);

  const handleNameClick = () => {
    setIsEditingName(true);
    setEditingName(currentBase?.name || "Untitled Base");
  };

  const handleSaveName = () => {
    if (editingName.trim() && editingName !== currentBase?.name) {
      // Call the mutation with optimistic update
      renameBaseMutation.mutate({
        id: baseId,
        name: editingName.trim(),
      });
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditingName(currentBase?.name || "Untitled Base");
  };

  return (
    <header className="relative z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto flex w-full h-14 items-center px-4 ml-14">
        {/* Left side - Base icon, name, and dropdown */}
        <div className="flex items-center">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
            style={{ 
              backgroundColor: `hsl(${currentBase?.name ? currentBase.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 360 : 0}, 70%, 50%)` 
            }}
          >
            {currentBase?.name.substring(0, 2) || "Un"}
          </div>
          <div className="relative ml-0.5" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
            >
              <span className="font-bold text-gray-900 text-base">{currentBase?.name || "Untitled Base"}</span>
              <div className="bg-white rounded p-1 ml-1">
                <Image src="/5.PNG" alt="Dropdown" width={20} height={20} />
              </div>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-4">
                  {/* Header with base name and actions */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center flex-1">
                      {isEditingName ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveName();
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          onBlur={handleSaveName}
                          className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={handleNameClick}
                          className="flex-1 text-left text-gray-900 text-lg hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1"
                        >
                          {currentBase?.name || "Untitled Base"}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-1.5 hover:bg-gray-100 rounded">
                        <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 rounded">
                        <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 rounded">
                        <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="19" cy="12" r="1" />
                          <circle cx="5" cy="12" r="1" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="border-t border-gray-200 mb-3"></div>

                  {/* Menu items */}
                  <div className="space-y-1">
                    <button className="flex items-center w-full px-2 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded">
                      <svg className="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Appearance
                    </button>
                    
                    {/* Separator between menu items */}
                    <div className="border-t border-gray-200 my-1"></div>
                    
                    <button className="flex items-center w-full px-2 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded">
                      <svg className="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Base guide
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Center - Navigation tabs */}
        <div className="flex items-center space-x-4 h-full justify-center flex-1 ml-32">
          <div className="relative">
            <button className="font-semibold text-gray-900" style={{ fontSize: '13px' }}>
              Data
            </button>
            <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-orange-800"></div>
          </div>
          <button className="text-gray-700 hover:text-gray-900" style={{ fontSize: '13px' }}>
            Automations
          </button>
          <button className="text-gray-700 hover:text-gray-900" style={{ fontSize: '13px' }}>
            Interfaces
          </button>
          <button className="text-gray-700 hover:text-gray-900" style={{ fontSize: '13px' }}>
            Forms
          </button>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center space-x-2 pr-12">
          {/* 12.PNG button */}
          <button className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors">
            <Image src="/12.PNG" alt="Refresh" width={20} height={20} />
          </button>
          
          {/* Trial button */}
          <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 transition-colors">
            Trial: 9 days left
          </button>
          
          {/* Launch button */}
          <button className="flex items-center space-x-1.5 px-2 py-1.5 bg-white border border-gray-300 rounded-full text-gray-700 text-xs hover:bg-gray-50 transition-colors">
            <Image src="/13.PNG" alt="Launch" width={14} height={14} />
            <span>Launch</span>
          </button>
          
          {/* Share button */}
          <button className="px-2 py-1.5 bg-orange-800 text-white rounded-lg text-xs hover:bg-orange-900 transition-colors">
            Share
          </button>
        </div>
      </div>
    </header>
  );
} 