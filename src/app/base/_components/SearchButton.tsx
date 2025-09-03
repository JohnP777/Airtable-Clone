"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { api } from "../../../trpc/react";
import { useTableContext } from "./TableContext";
import { useSearchContext } from "./SearchContext";
import { useLoadedRows } from "./LoadedRowsContext";

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
  const { loadedRows } = useLoadedRows();

  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Server-side global search with manual pagination
  const PAGE_SIZE = 200;
  const [currentOffset, setCurrentOffset] = useState(0);
  const [allGlobalRows, setAllGlobalRows] = useState<Array<{
    id: string;
    order: number;
    cells: Array<{
      columnId: string;
      value: string;
      column: {
        id: string;
        name: string;
      };
    }>;
  }>>([]);
  
  const { data: globalSearchData, isFetching: isGlobalSearching } = api.table.searchPaginated.useQuery(
    {
      tableId: selectedTableId!,
      query: searchTerm.trim(),
      limit: PAGE_SIZE,
      offset: currentOffset,
      sortRules: [],
      filterRules: []
    },
    {
      enabled: !!selectedTableId && searchTerm.trim().length >= 2,
      staleTime: 30000, // Cache results for 30 seconds
    }
  );

  // Accumulate global search results from all pages
  useEffect(() => {
    if (globalSearchData?.rows && currentOffset === 0) {
      // Reset accumulated results when starting a new search
      setAllGlobalRows(globalSearchData.rows);
    } else if (globalSearchData?.rows && currentOffset > 0) {
      // Add new results to existing ones
      setAllGlobalRows(prev => [...prev, ...globalSearchData.rows]);
    }
  }, [globalSearchData?.rows, currentOffset]);

  // Global search results (all accumulated pages)
  const globalRows = useMemo(() => {
    return allGlobalRows;
  }, [allGlobalRows]);

  // Get total matches and pagination info
  const totalMatches = globalSearchData?.pagination?.totalMatches ?? 0;
  const hasMore = globalSearchData?.pagination?.hasMore ?? false;
  const nextOffset = globalSearchData?.pagination?.nextOffset;

  // Instant in-view search results (using actual loaded rows)
  const inViewResults = useMemo(() => {
    if (!searchTerm.trim() || loadedRows.length === 0) return [];

    const results: Array<{
      type: "field" | "cell";
      rowId?: string;
      columnId: string;
      value: string;
      columnName: string;
      isInView: boolean;
    }> = [];

    const searchLower = searchTerm.toLowerCase();

    // Search in cell values (only in actually loaded rows)
    loadedRows.forEach((row) => {
      row.cells.forEach((cell) => {
        if (cell.value.toLowerCase().includes(searchLower)) {
          results.push({
            type: "cell",
            rowId: row.id,
            columnId: cell.columnId,
            value: cell.value,
            columnName: cell.column.name,
            isInView: true,
          });
        }
      });
    });

    return results;
  }, [searchTerm, loadedRows]);

  // Combine in-view and global search results without overwriting
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearchActive(false);
      return;
    }

    // Start with in-view results
    const resultMap = new Map<string, {
      type: "field" | "cell";
      rowId?: string;
      columnId: string;
      value: string;
      columnName: string;
      isInView: boolean;
    }>();
    const getKey = (r: { type: string; rowId?: string; columnId: string }) => `${r.type}:${r.rowId ?? ''}:${r.columnId}`;

    // Add in-view results first
    for (const r of inViewResults) {
      resultMap.set(getKey(r), r);
    }

    // Add global results, preserving in-view status
    for (const row of globalRows) {
      for (const cell of row.cells ?? []) {
        if ((cell.value ?? '').toLowerCase().includes(searchTerm.toLowerCase())) {
          const r = {
            type: "cell" as const,
            rowId: row.id,
            columnId: cell.columnId,
            value: cell.value,
            columnName: cell.column?.name ?? "",
            isInView: resultMap.has(`cell:${row.id}:${cell.columnId}`) || false,
          };
          resultMap.set(getKey(r), r);
        }
      }
    }

    const mergedResults = Array.from(resultMap.values());
    setSearchResults(mergedResults);
    setIsSearchActive(mergedResults.length > 0);
    setIsSearching(false);
  }, [searchTerm, inViewResults, globalRows, setSearchResults, setIsSearchActive]);

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
    // Reset pagination when search term changes
    setCurrentOffset(0);
    setAllGlobalRows([]);
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

  const handleLoadMore = () => {
    if (hasMore && nextOffset !== undefined) {
      setCurrentOffset(nextOffset);
    }
  };

  // Calculate statistics
  const inViewCount = searchResults.filter(r => r.isInView).length;
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
                {isGlobalSearching ? (
                  <div className="text-xs text-gray-500">Searching all rows...</div>
                ) : searchResults.length > 0 ? (
                  <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                    {inViewCount > 0 && (
                      <span className="font-medium">
                        {inViewCount} in view
                        {totalMatches > 0 && `, ${totalMatches} total`}
                      </span>
                    )}
                    {inViewCount === 0 && totalMatches > 0 && (
                      <span className="font-medium">{totalMatches} total matches</span>
                    )}
                    <br />
                    <span className="text-gray-600">
                      {cellCount} cells
                      {cellCount > 0 && ` (within ${uniqueRecords} records)`}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No results found</div>
                )}
              </div>
            )}

            {/* Load More Button */}
            {hasMore && searchResults.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={handleLoadMore}
                  disabled={isGlobalSearching}
                  className="w-full px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                >
                  {isGlobalSearching ? "Loading..." : "Load more matches..."}
                </button>
              </div>
            )}

            {/* Search Tips */}
            {searchTerm && searchTerm.length < 2 && (
              <div className="text-xs text-gray-400 italic">
                Type at least 2 characters to search all rows
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
