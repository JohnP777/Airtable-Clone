"use client";

import React, { useState, useEffect } from "react";
import { api } from "../../../trpc/react";
import { useTableContext } from "./TableContext";
import { useSortContext } from "./SortContext";
import { useFilterContext } from "./FilterContext";
import { useView } from "./ViewContext";
import { SearchButton } from "./SearchButton";
import { HideFieldsButton } from "./HideFieldsButton";
import { BulkAddRowsButton } from "./BulkAddRowsButton";

interface SortRule {
  columnId: string;
  direction: "asc" | "desc";
}

interface FilterRule {
  columnId: string;
  operator: "contains" | "does not contain" | "is" | "is not" | "is empty" | "is not empty";
  value: string;
}

export function FilterSortButtons() {
  const { selectedTableId } = useTableContext();
  const { sortRules, setSortRules, clearSortRules } = useSortContext();
  const { filterRules, setFilterRules, clearFilterRules } = useFilterContext();
  const { createView, views, currentViewId } = useView();
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [autoSortEnabled, setAutoSortEnabled] = useState(true);
  const [showColumnSelect, setShowColumnSelect] = useState(false);
  const [showAddSortColumnSelect, setShowAddSortColumnSelect] = useState(false);

  const utils = api.useUtils();

  // Get the current table data to show available columns - use paginated version with minimal data
  const { data: tableData } = api.table.getTableDataPaginated.useQuery(
    { 
      tableId: selectedTableId!,
      viewId: currentViewId ?? undefined,
      page: 0,
      pageSize: 1, // Only need 1 row to get table structure
      sortRules: sortRules.length ? sortRules : undefined,
      filterRules: filterRules.length ? filterRules : undefined
    },
    { enabled: !!selectedTableId }
  );

  // Apply sort mutation
  const applySortMutation = api.table.applySort.useMutation({
    onSuccess: () => {
      // Broadly invalidate all paginated table queries so first page refreshes immediately
      if (currentViewId) {
        void utils.table.getTableDataPaginated.invalidate({ tableId: selectedTableId!, viewId: currentViewId });
      } else {
        void utils.table.getTableDataPaginated.invalidate({ tableId: selectedTableId! });
      }
    },
  });

  const handleFilter = () => {
    setShowFilterDropdown(!showFilterDropdown);
    setShowSortDropdown(false);
  };

  const handleSort = () => {
    setShowSortDropdown(!showSortDropdown);
    setShowFilterDropdown(false);
    setShowColumnSelect(false);
    setShowAddSortColumnSelect(false);
  };

  const handleAddFilterRule = () => {
    if (tableData?.table?.columns && tableData.table.columns.length > 0 && tableData.table.columns[0]) {
      const newRule: FilterRule = {
        columnId: tableData.table.columns[0].id,
        operator: "contains",
        value: ""
      };
      setFilterRules([...filterRules, newRule]);
      
      // Invalidate to apply the filter
      void utils.table.getTableDataPaginated.invalidate({ 
        tableId: selectedTableId!,
        page: 0,
        pageSize: 1,
        sortRules: sortRules.length ? sortRules : undefined,
        filterRules: [...filterRules, newRule]
      });
    }
  };

  const handleRemoveFilterRule = (columnId: string) => {
    const newFilterRules = filterRules.filter(rule => rule.columnId !== columnId);
    setFilterRules(newFilterRules);
    
    // Invalidate to apply the updated filter
    void utils.table.getTableDataPaginated.invalidate({ 
      tableId: selectedTableId!,
      page: 0,
      pageSize: 1,
      sortRules: sortRules.length ? sortRules : undefined,
      filterRules: newFilterRules
    });
  };

  const handleUpdateFilterRule = (columnId: string, field: keyof FilterRule, value: string) => {
    const newFilterRules = filterRules.map(rule => 
      rule.columnId === columnId 
        ? { ...rule, [field]: value }
        : rule
    );
    
    setFilterRules(newFilterRules);
    
    // Invalidate to apply the updated filter
    void utils.table.getTableDataPaginated.invalidate({ 
      tableId: selectedTableId!,
      page: 0,
      pageSize: 1,
      sortRules: sortRules.length ? sortRules : undefined,
      filterRules: newFilterRules
    });
  };

  const handleAddSortRule = () => {
    // Show column selection instead of immediately adding an empty rule
    setShowAddSortColumnSelect(true);
  };

  const handleAddSortColumnSelect = (columnId: string) => {
    const newRule: SortRule = {
      columnId: columnId,
      direction: "asc"
    };
    setSortRules([...sortRules, newRule]);
    setShowAddSortColumnSelect(false);
    
    // Apply the sort immediately if auto-sort is enabled
    if (autoSortEnabled) {
      applySortMutation.mutate({
        tableId: selectedTableId!,
        viewId: currentViewId!,
        sortRules: [...sortRules, newRule]
      });
    }
  };

  const handleRemoveSortRule = (columnId: string) => {
    const newSortRules = sortRules.filter(rule => rule.columnId !== columnId);
    setSortRules(newSortRules);
    
    // Apply the updated sort immediately if auto-sort is enabled
    if (autoSortEnabled && newSortRules.length > 0) {
      applySortMutation.mutate({
        tableId: selectedTableId!,
        viewId: currentViewId!,
        sortRules: newSortRules
      });
    }
  };

  const handleUpdateSortRule = (columnId: string, field: keyof SortRule, value: string) => {
    const newSortRules = sortRules.map(rule => 
      rule.columnId === columnId 
        ? { ...rule, [field]: value }
        : rule
    );
    
    setSortRules(newSortRules);
    
    // Apply the updated sort immediately if auto-sort is enabled
    if (autoSortEnabled && newSortRules.length > 0) {
      applySortMutation.mutate({
        tableId: selectedTableId!,
        viewId: currentViewId!,
        sortRules: newSortRules
      });
    }
  };

  const handleMoveSortRuleUp = (columnId: string) => {
    const newSortRules = [...sortRules];
    const index = newSortRules.findIndex(rule => rule.columnId === columnId);
    if (index > 0 && index < newSortRules.length) {
      const temp = newSortRules[index - 1]!;
      newSortRules[index - 1] = newSortRules[index]!;
      newSortRules[index] = temp;
      setSortRules(newSortRules);
      // Apply the reordered sort rules immediately
      if (autoSortEnabled && newSortRules.length > 1) {
        applySortMutation.mutate({
          tableId: selectedTableId!,
          viewId: currentViewId!,
          sortRules: newSortRules
        });
      }
    }
  };

  const handleMoveSortRuleDown = (columnId: string) => {
    const newSortRules = [...sortRules];
    const index = newSortRules.findIndex(rule => rule.columnId === columnId);
    if (index >= 0 && index < newSortRules.length - 1) {
      const temp = newSortRules[index]!;
      newSortRules[index] = newSortRules[index + 1]!;
      newSortRules[index + 1] = temp;
      setSortRules(newSortRules);
      // Apply the reordered sort rules immediately
      if (autoSortEnabled && newSortRules.length > 1) {
        applySortMutation.mutate({
          tableId: selectedTableId!,
          viewId: currentViewId!,
          sortRules: newSortRules
        });
      }
    }
  };

  const handleColumnSelect = (columnId: string) => {
    const newRule: SortRule = {
      columnId: columnId,
      direction: "asc"
    };
    setSortRules([...sortRules, newRule]);
    setShowColumnSelect(false);
    
    // Apply the sort immediately if auto-sort is enabled
    if (autoSortEnabled) {
      applySortMutation.mutate({
        tableId: selectedTableId!,
        viewId: currentViewId!,
        sortRules: [...sortRules, newRule]
      });
    }
  };

  const getColumnName = (columnId: string) => {
    return tableData?.table?.columns?.find(col => col.id === columnId)?.name ?? "";
  };

  // Get available columns (excluding already selected ones)
  const getAvailableColumns = () => {
    if (!tableData?.table?.columns) return [];
    const selectedColumnIds = sortRules.map(rule => rule.columnId);
    return tableData.table.columns.filter(column => !selectedColumnIds.includes(column.id));
  };

  // Apply sort when auto-sort toggle changes
  const handleAutoSortToggle = (enabled: boolean) => {
    setAutoSortEnabled(enabled);
    if (enabled && sortRules.length > 0 && sortRules.every(rule => rule.columnId && rule.direction)) {
      if (currentViewId) {
        applySortMutation.mutate({
          tableId: selectedTableId!,
          viewId: currentViewId,
          sortRules: sortRules.map(rule => ({
            columnId: rule.columnId,
            direction: rule.direction
          }))
        });
      }
    } else if (!enabled) {
      // Clear sorting when auto-sort is disabled
      if (currentViewId) {
        void utils.table.getTableDataPaginated.invalidate({ 
          tableId: selectedTableId!,
          viewId: currentViewId,
          page: 0,
          pageSize: 1,
          filterRules: filterRules.map(rule => ({
            columnId: rule.columnId,
            operator: rule.operator,
            value: rule.value
          }))
        });
      }
    }
  };

  return (
    <div className="flex items-center space-x-2 relative">
      <div className="-mr-0">
        <BulkAddRowsButton />
      </div>
      <HideFieldsButton tableId={selectedTableId!} />
      
      <div className="relative -mr-1">
        <button
          onClick={handleFilter}
          className="flex items-center space-x-1 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50 rounded"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 5h18M6 12h12M10 19h4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-normal" style={{ fontFamily: 'Mundo Sans Regular, sans-serif' }}>Filter</span>
        </button>
        
        {showFilterDropdown && (
          <div className="absolute right-0 top-full mt-1 w-[36rem] bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">
                  In this view, show records
                </h3>
              </div>

              <div className="border-t border-gray-200 pt-3">
                {filterRules.length === 0 ? (
                  // No filters state
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-4">No filter conditions are applied</p>
                    <button
                      onClick={handleAddFilterRule}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-700 mx-auto"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add condition
                    </button>
                  </div>
                ) : (
                  // Filter rules view
                  <div>
                    {filterRules.map((rule, index) => (
                      <div key={rule.columnId} className="flex items-center space-x-2 mb-3">
                        {index === 0 && <span className="text-sm text-gray-500">Where</span>}
                        {index > 0 && <span className="text-sm text-gray-500">And</span>}
                        
                        {/* Column Dropdown - wider */}
                        <div className="relative flex-[2]">
                          <select
                            className="block w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            value={rule.columnId}
                            onChange={(e) => handleUpdateFilterRule(rule.columnId, "columnId", e.target.value)}
                          >
                            {tableData?.table?.columns?.map((column) => (
                              <option key={column.id} value={column.id}>
                                {column.name}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* Operator Dropdown - narrower */}
                        <div className="relative flex-1">
                          <select
                            className="block w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            value={rule.operator}
                            onChange={(e) => handleUpdateFilterRule(rule.columnId, "operator", e.target.value)}
                          >
                            <option value="contains">contains</option>
                            <option value="does not contain">does not contain</option>
                            <option value="is">is</option>
                            <option value="is not">is not</option>
                            <option value="is empty">is empty</option>
                            <option value="is not empty">is not empty</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* Value Input */}
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Enter a value"
                            className="block w-full pl-3 pr-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={rule.value}
                            onChange={(e) => handleUpdateFilterRule(rule.columnId, "value", e.target.value)}
                          />
                        </div>

                        {/* Remove button */}
                        <button 
                          onClick={() => handleRemoveFilterRule(rule.columnId)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        {/* More options icon */}
                        <div className="text-gray-400 p-1">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                          </svg>
                        </div>
                      </div>
                    ))}

                    {/* Add condition button */}
                    <button 
                      onClick={handleAddFilterRule}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-700 mt-4"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add condition
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <button className="flex items-center space-x-1 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50 rounded -mr-2">
        <img src="/21.PNG" alt="Group" className="h-4 w-4" />
        <span className="font-normal" style={{ fontFamily: 'Mundo Sans Regular, sans-serif' }}>Group</span>
      </button>
      
      <div className="relative -mr-1">
        <button
          onClick={handleSort}
          className="flex items-center space-x-1 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50 rounded"
        >
          <img src="/20.PNG" alt="Sort" className="h-4 w-4" />
          <span className="font-normal" style={{ fontFamily: 'Mundo Sans Regular, sans-serif' }}>Sort</span>
        </button>
        
        {showSortDropdown && (
          <div className="absolute right-0 top-full mt-1 w-[28rem] bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">
                  Sort by
                </h3>
              </div>

              <div className="border-t border-gray-200 pt-3">
                {sortRules.length === 0 ? (
                  // Column selection view when no sorts exist
                  <div>
                    {/* Search bar */}
                    <div className="mb-3">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Find a field"
                          className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    {/* Column list */}
                    <div className="space-y-1">
                      {tableData?.table?.columns?.map((column) => (
                        <button
                          key={column.id}
                          onClick={() => handleColumnSelect(column.id)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center space-x-3"
                        >
                          {/* Column icon - using first letter as placeholder */}
                          <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs font-medium text-gray-600">
                            {column.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{column.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Sort rules view when sorts exist
                  <div>
                    {/* Sort Rules */}
                    {sortRules.map((rule, index) => (
                      <div key={rule.columnId} className="flex items-center space-x-2 mb-3">
                        {/* Column Dropdown - wider */}
                        <div className="relative flex-[2]">
                          <select
                            className="block w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            value={rule.columnId}
                            onChange={(e) => handleUpdateSortRule(rule.columnId, "columnId", e.target.value)}
                          >
                            <option value="">Select column</option>
                            {tableData?.table?.columns?.map((column) => (
                              <option key={column.id} value={column.id}>
                                {column.name}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* Direction Dropdown - narrower */}
                        <div className="relative flex-1">
                          <select
                            className="block w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            value={rule.direction}
                            onChange={(e) => handleUpdateSortRule(rule.columnId, "direction", e.target.value)}
                          >
                            <option value="asc">A → Z</option>
                            <option value="desc">Z → A</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* Remove button */}
                        <button 
                          onClick={() => handleRemoveSortRule(rule.columnId)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        {/* Up/Down arrows for reordering */}
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => handleMoveSortRuleUp(rule.columnId)}
                            disabled={index === 0}
                            className={`text-gray-400 hover:text-gray-600 p-1 ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleMoveSortRuleDown(rule.columnId)}
                            disabled={index === sortRules.length - 1}
                            className={`text-gray-400 hover:text-gray-600 p-1 ${index === sortRules.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add another sort button */}
                    <button 
                      onClick={handleAddSortRule}
                      className="flex items-center text-sm text-gray-700 hover:text-gray-900 mt-4"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add another sort
                    </button>

                    {/* Column selection dropdown for adding another sort */}
                    {showAddSortColumnSelect && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Select a column to sort by:</h4>
                          <div className="relative">
                            <select
                              className="block w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none"
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddSortColumnSelect(e.target.value);
                                }
                              }}
                              defaultValue=""
                            >
                              <option value="">Choose a column...</option>
                              {getAvailableColumns().map((column) => (
                                <option key={column.id} value={column.id}>
                                  {column.name}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        {getAvailableColumns().length === 0 && (
                          <p className="text-sm text-gray-500 italic">All columns are already being used for sorting.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Separator and toggle */}
              <div className="mt-4 pt-3 border-t border-gray-200 bg-gray-50 -mx-4 px-4 py-2 rounded-b-md flex items-center justify-between">
                <span className="text-sm text-gray-700">Automatically sort records</span>
                {/* Toggle switch */}
                <label htmlFor="auto-sort-toggle" className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="auto-sort-toggle"
                      className="sr-only"
                      checked={autoSortEnabled}
                      onChange={() => handleAutoSortToggle(!autoSortEnabled)}
                    />
                    <div
                      className={`block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                        autoSortEnabled ? "bg-green-500" : "bg-gray-300"
                      }`}
                    ></div>
                    <div
                      className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${
                        autoSortEnabled ? "translate-x-full" : ""
                      }`}
                    ></div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <button className="flex items-center space-x-1 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50 rounded -mr-1">
        <img src="/19.PNG" alt="Color" className="h-4 w-4" />
        <span className="font-normal" style={{ fontFamily: 'Mundo Sans Regular, sans-serif' }}>Color</span>
      </button>
      
      <button className="flex items-center justify-center p-2 text-gray-500 hover:bg-gray-50 rounded -mr-0">
        <img src="/18.PNG" alt="List and sort" className="h-4 w-5" />
      </button>
      
      <button className="flex items-center space-x-1 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50 rounded">
        <img src="/17.PNG" alt="Share and sync" className="h-4 w-5" />
        <span className="font-normal" style={{ fontFamily: 'Mundo Sans Regular, sans-serif' }}>Share and sync</span>
      </button>
      
      <SearchButton />
      
      {/* Click outside to close dropdowns */}
      {(showSortDropdown || showFilterDropdown) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowSortDropdown(false);
            setShowFilterDropdown(false);
          }}
        />
      )}
    </div>
  );
}
