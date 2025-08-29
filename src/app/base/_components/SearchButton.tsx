"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "An/trpc/react";
import { useTableContext } from "./TableContext";
import { useSearchContext } from "./SearchContext";

export function SearchButton() {
  const { selectedTableId } = useTableContext();
  const {
    searchTerm,
    setSearchTerm,
    searchResults,
    setSearchResults,
    currentResultIndex,
    isSearchActive,
    setIsSearchActive,
    clearSearch,
    nextResult,
    previousResult,
  } = useSearchContext();

  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get table data for searching
  const { data: tableData } = api.table.getTableData.useQuery(
    { 
      tableId: selectedTableId!,
      sortRules: [],
      filterRules: []
    },
    { enabled: !!selectedTableId }
  );

  // Perform search when search term changes
  useEffect(() => {
    if (!searchTerm.trim() || !tableData) {
      setSearchResults([]);
      setIsSearchActive(false);
      return;
    }

    setIsSearching(true);
    
    // Simulate search delay for better UX
    const timeoutId = setTimeout(() => {
      const results: Array<{
        type: "field" | "cell";
        rowId?: string;
        columnId: string;
        value: string;
        columnName: string;
      }> = [];

      const searchLower = searchTerm.toLowerCase();

      // Search in field names (column names)
      tableData.columns.forEach((column) => {
        if (column.name.toLowerCase().includes(searchLower)) {
          results.push({
            type: "field",
            columnId: column.id,
            value: column.name,
            columnName: column.name,
          });
        }
      });

      // Search in cell values
      tableData.rows.forEach((row) => {
        row.cells.forEach((cell) => {
          if (cell.value.toLowerCase().includes(searchLower)) {
            const column = tableData.columns.find((col) => col.id === cell.columnId);
            if (column) {
              results.push({
                type: "cell",
                rowId: row.id,
                columnId: cell.columnId,
                value: cell.value,
                columnName: column.name,
              });
            }
          }
        });
      });

      setSearchResults(results);
      setIsSearchActive(results.length > 0);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, tableData, setSearchResults, setIsSearchActive]);

  const handleSearchClick = () => {
    setShowSearchDropdown(!showSearchDropdown);
    if (!showSearchDropdown) {
      // Focus the search input when opening
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        previousResult();
      } else {
        nextResult();
      }
    } else if (e.key === "Escape") {
      setShowSearchDropdown(false);
      clearSearch();
    }
  };

  const handleClose = () => {
    setShowSearchDropdown(false);
    clearSearch();
  };

  // Calculate statistics
  const fieldCount = searchResults.filter(r => r.type === "field").length;
  const cellCount = searchResults.filter(r => r.type === "cell").length;
  const uniqueRecords = new Set(searchResults.filter(r => r.type === "cell").map(r => r.rowId)).size;

  return (
    <div className="relative">
              <button
          onClick={handleSearchClick}
          className={`px-3 py-1 text-xs rounded border shadow-sm flex items-center space-x-1 ${
            showSearchDropdown || isSearchActive
              ? "bg-blue-500 text-white border-blue-500" 
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      
             {showSearchDropdown && (
         <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
           <div className="p-3">
                         {/* Search Input */}
             <div className="flex items-center space-x-2 mb-2">
              <div className="flex-1 relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Find in view"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-3 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              {/* Navigation Controls */}
              {isSearchActive && searchResults.length > 0 && (
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500">
                    {currentResultIndex + 1} of {searchResults.length}
                  </span>
                  <button
                    onClick={previousResult}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Previous result (Shift+Enter)"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextResult}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Next result (Enter)"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* Close Button */}
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

                         {/* Search Results Summary */}
             {searchTerm && (
               <div className="mb-1">
                {isSearching ? (
                  <div className="text-xs text-gray-500">Searching...</div>
                ) : searchResults.length > 0 ? (
                  <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                    Found {fieldCount} fields and {cellCount} cells
                    {cellCount > 0 && ` (within ${uniqueRecords} records)`}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No results found</div>
                )}
              </div>
            )}


          </div>
        </div>
      )}
      
      {/* Click outside to close dropdown */}
      {showSearchDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSearchDropdown(false)}
        />
      )}
    </div>
  );
}
