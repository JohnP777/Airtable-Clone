"use client";

import React, { useRef } from "react";
import { useSearchContext } from "./SearchContext";

export function SearchButton() {
  const { 
    searchTerm, 
    setSearchTerm, 
    clearSearch, 
    isDropdownOpen, 
    setIsDropdownOpen, 
    closeDropdown,
    isSearching,
    searchResults
  } = useSearchContext();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchClick = () => {
    if (isDropdownOpen) {
      // If dropdown is open, close it and clear search
      closeDropdown();
      clearSearch();
    } else {
      // If dropdown is closed, open it and focus input
      setIsDropdownOpen(true);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Clear search when dropdown is closed in any way
  const handleDropdownClose = () => {
    if (isDropdownOpen) {
      clearSearch();
    }
    closeDropdown();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleDropdownClose();
    }
  };

  const handleClose = () => {
    closeDropdown();
    clearSearch();
  };


  return (
    <div className="relative">
      <button
        onClick={handleSearchClick}
        className="p-2 text-xs rounded flex items-center justify-center text-gray-500 hover:bg-gray-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
      
      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-3">
            {/* Search Input */}
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex-1 relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search in all fields..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-3 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              {/* Close Search 'x' button */}
              <button
                onClick={handleClose}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Close search (Esc)"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Status */}
            {searchTerm && (
              <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                {isSearching ? (
                  <span>Searching for: "{searchTerm}"</span>
                ) : searchResults ? (
                  <span>
                    Found {searchResults.cellCount} cell{searchResults.cellCount !== 1 ? 's' : ''} 
                    {searchResults.cellCount > 0 && ` (within ${searchResults.recordCount} record${searchResults.recordCount !== 1 ? 's' : ''})`}
                  </span>
                ) : (
                  <span>Searching for: "{searchTerm}"</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Clicking anywhere outside dropdown closes it */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={handleDropdownClose}
        />
      )}
    </div>
  );
}
