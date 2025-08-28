"use client";

import React, { useState, useEffect } from "react";
import { api } from "An/trpc/react";
import { useTableContext } from "./TableContext";
import { useSortContext } from "./SortContext";
import { useFilterContext } from "./FilterContext";

interface SortRule {
  id: string;
  columnId: string;
  direction: "asc" | "desc";
}

interface FilterRule {
  id: string;
  columnId: string;
  operator: string;
  value: string;
}

export function FilterSortButtons() {
  const { selectedTableId } = useTableContext();
  const { sortRules, setSortRules, addSortRule, removeSortRule, updateSortRule, moveSortRuleUp, moveSortRuleDown } = useSortContext();
  const { filterRules, addFilterRule, removeFilterRule, updateFilterRule } = useFilterContext();
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [autoSortEnabled, setAutoSortEnabled] = useState(true);
  const [showColumnSelect, setShowColumnSelect] = useState(false);
  const [showAddSortColumnSelect, setShowAddSortColumnSelect] = useState(false);

  const utils = api.useUtils();

  // Get the current table data to show available columns
  const { data: tableData } = api.table.getTableData.useQuery(
    { 
      tableId: selectedTableId!,
      sortRules: sortRules.map(rule => ({
        columnId: rule.columnId,
        direction: rule.direction
      })),
      filterRules: filterRules.map(rule => ({
        columnId: rule.columnId,
        operator: rule.operator,
        value: rule.value
      }))
    },
    { enabled: !!selectedTableId }
  );

  // Apply sort mutation
  const applySortMutation = api.table.applySort.useMutation({
    onSuccess: () => {
      // Invalidate and refetch table data with new sort rules
      utils.table.getTableData.invalidate({ 
        tableId: selectedTableId!,
        sortRules: sortRules.map(rule => ({
          columnId: rule.columnId,
          direction: rule.direction
        })),
        filterRules: filterRules.map(rule => ({
          columnId: rule.columnId,
          operator: rule.operator,
          value: rule.value
        }))
      });
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
    if (tableData?.columns && tableData.columns.length > 0) {
      const newRule: FilterRule = {
        id: `filter-${Date.now()}`,
        columnId: tableData.columns[0].id,
        operator: "contains",
        value: ""
      };
      addFilterRule(newRule);
      
      // Invalidate to apply the filter
      utils.table.getTableData.invalidate({ 
        tableId: selectedTableId!,
        sortRules: sortRules.map(rule => ({
          columnId: rule.columnId,
          direction: rule.direction
        })),
        filterRules: [...filterRules, newRule].map(rule => ({
          columnId: rule.columnId,
          operator: rule.operator,
          value: rule.value
        }))
      });
    }
  };

  const handleRemoveFilterRule = (ruleId: string) => {
    const newFilterRules = filterRules.filter(rule => rule.id !== ruleId);
    removeFilterRule(ruleId);
    
    // Invalidate to apply the updated filter
    utils.table.getTableData.invalidate({ 
      tableId: selectedTableId!,
      sortRules: sortRules.map(rule => ({
        columnId: rule.columnId,
        direction: rule.direction
      })),
      filterRules: newFilterRules.map(rule => ({
        columnId: rule.columnId,
        operator: rule.operator,
        value: rule.value
      }))
    });
  };

  const handleUpdateFilterRule = (ruleId: string, field: keyof FilterRule, value: string) => {
    const newFilterRules = filterRules.map(rule => 
      rule.id === ruleId 
        ? { ...rule, [field]: value }
        : rule
    );
    
    updateFilterRule(ruleId, field, value);
    
    // Invalidate to apply the updated filter
    utils.table.getTableData.invalidate({ 
      tableId: selectedTableId!,
      sortRules: sortRules.map(rule => ({
        columnId: rule.columnId,
        direction: rule.direction
      })),
      filterRules: newFilterRules.map(rule => ({
        columnId: rule.columnId,
        operator: rule.operator,
        value: rule.value
      }))
    });
  };

  const handleAddSortRule = () => {
    // Show column selection instead of immediately adding an empty rule
    setShowAddSortColumnSelect(true);
  };

  const handleAddSortColumnSelect = (columnId: string) => {
    const newRule: SortRule = {
      id: `sort-${Date.now()}`,
      columnId: columnId,
      direction: "asc"
    };
    const newSortRules = [...sortRules, newRule];
    addSortRule(newRule);
    setShowAddSortColumnSelect(false);
    
    // Apply the sort rule immediately
    applySortMutation.mutate({
      tableId: selectedTableId!,
      sortRules: newSortRules.map(rule => ({
        columnId: rule.columnId,
        direction: rule.direction
      }))
    });
  };

  const handleRemoveSortRule = (ruleId: string) => {
    const newSortRules = sortRules.filter(rule => rule.id !== ruleId);
    
    // Apply the updated sort rules immediately
    if (newSortRules.length > 0 && autoSortEnabled) {
      applySortMutation.mutate({
        tableId: selectedTableId!,
        sortRules: newSortRules.map(rule => ({
          columnId: rule.columnId,
          direction: rule.direction
        }))
      });
    } else if (newSortRules.length === 0) {
      // Clear sorting by refetching without sort rules
      utils.table.getTableData.invalidate({ 
        tableId: selectedTableId!,
        filterRules: filterRules.map(rule => ({
          columnId: rule.columnId,
          operator: rule.operator,
          value: rule.value
        }))
      });
    }
    
    removeSortRule(ruleId);
  };

  const handleUpdateSortRule = (ruleId: string, field: keyof SortRule, value: string) => {
    const newSortRules = sortRules.map(rule => 
      rule.id === ruleId 
        ? { ...rule, [field]: value }
        : rule
    );
    
    // Apply the updated sort rules immediately if auto-sort is enabled
    if (autoSortEnabled && newSortRules.every(rule => rule.columnId && rule.direction)) {
      applySortMutation.mutate({
        tableId: selectedTableId!,
        sortRules: newSortRules.map(rule => ({
          columnId: rule.columnId,
          direction: rule.direction
        }))
      });
    }
    
    updateSortRule(ruleId, field, value);
  };

  const handleMoveSortRuleUp = (ruleId: string) => {
    moveSortRuleUp(ruleId);
    // Apply the reordered sort rules immediately
    if (autoSortEnabled && sortRules.length > 1) {
      const newSortRules = [...sortRules];
      const index = newSortRules.findIndex(rule => rule.id === ruleId);
      if (index > 0) {
        [newSortRules[index - 1], newSortRules[index]] = [newSortRules[index], newSortRules[index - 1]];
        applySortMutation.mutate({
          tableId: selectedTableId!,
          sortRules: newSortRules.map(rule => ({
            columnId: rule.columnId,
            direction: rule.direction
          }))
        });
      }
    }
  };

  const handleMoveSortRuleDown = (ruleId: string) => {
    moveSortRuleDown(ruleId);
    // Apply the reordered sort rules immediately
    if (autoSortEnabled && sortRules.length > 1) {
      const newSortRules = [...sortRules];
      const index = newSortRules.findIndex(rule => rule.id === ruleId);
      if (index < newSortRules.length - 1) {
        [newSortRules[index], newSortRules[index + 1]] = [newSortRules[index + 1], newSortRules[index]];
        applySortMutation.mutate({
          tableId: selectedTableId!,
          sortRules: newSortRules.map(rule => ({
            columnId: rule.columnId,
            direction: rule.direction
          }))
        });
      }
    }
  };

  const handleColumnSelect = (columnId: string) => {
    const newRule: SortRule = {
      id: `sort-${Date.now()}`,
      columnId: columnId,
      direction: "asc"
    };
    const newSortRules = [...sortRules, newRule];
    addSortRule(newRule);
    setShowColumnSelect(false);
    
    // Apply the sort rule immediately
    applySortMutation.mutate({
      tableId: selectedTableId!,
      sortRules: newSortRules.map(rule => ({
        columnId: rule.columnId,
        direction: rule.direction
      }))
    });
  };

  const getColumnName = (columnId: string) => {
    return tableData?.columns?.find(col => col.id === columnId)?.name || "";
  };

  // Get available columns (excluding already selected ones)
  const getAvailableColumns = () => {
    if (!tableData?.columns) return [];
    const selectedColumnIds = sortRules.map(rule => rule.columnId);
    return tableData.columns.filter(column => !selectedColumnIds.includes(column.id));
  };

  // Apply sort when auto-sort toggle changes
  const handleAutoSortToggle = (enabled: boolean) => {
    setAutoSortEnabled(enabled);
    if (enabled && sortRules.length > 0 && sortRules.every(rule => rule.columnId && rule.direction)) {
      applySortMutation.mutate({
        tableId: selectedTableId!,
        sortRules: sortRules.map(rule => ({
          columnId: rule.columnId,
          direction: rule.direction
        }))
      });
    } else if (!enabled) {
      // Clear sorting when auto-sort is disabled
      utils.table.getTableData.invalidate({ 
        tableId: selectedTableId!,
        filterRules: filterRules.map(rule => ({
          columnId: rule.columnId,
          operator: rule.operator,
          value: rule.value
        }))
      });
    }
  };

  return (
    <div className="flex items-center space-x-2 relative">
      <div className="relative">
        <button
          onClick={handleFilter}
          className={`px-3 py-1 text-xs rounded border shadow-sm ${
            showFilterDropdown 
              ? "bg-blue-500 text-white border-blue-500" 
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Filter
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
                      <div key={rule.id} className="flex items-center space-x-2 mb-3">
                        {index === 0 && <span className="text-sm text-gray-500">Where</span>}
                        {index > 0 && <span className="text-sm text-gray-500">And</span>}
                        
                        {/* Column Dropdown - wider */}
                        <div className="relative flex-[2]">
                          <select
                            className="block w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            value={rule.columnId}
                            onChange={(e) => handleUpdateFilterRule(rule.id, "columnId", e.target.value)}
                          >
                            {tableData?.columns?.map((column) => (
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
                            onChange={(e) => handleUpdateFilterRule(rule.id, "operator", e.target.value)}
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
                            onChange={(e) => handleUpdateFilterRule(rule.id, "value", e.target.value)}
                          />
                        </div>

                        {/* Remove button */}
                        <button 
                          onClick={() => handleRemoveFilterRule(rule.id)}
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
      
      <div className="relative">
        <button
          onClick={handleSort}
          className={`px-3 py-1 text-xs rounded border shadow-sm ${
            showSortDropdown 
              ? "bg-blue-500 text-white border-blue-500" 
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Sort
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
                      {tableData?.columns?.map((column) => (
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
                      <div key={rule.id} className="flex items-center space-x-2 mb-3">
                        {/* Column Dropdown - wider */}
                        <div className="relative flex-[2]">
                          <select
                            className="block w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            value={rule.columnId}
                            onChange={(e) => handleUpdateSortRule(rule.id, "columnId", e.target.value)}
                          >
                            <option value="">Select column</option>
                            {tableData?.columns?.map((column) => (
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
                            onChange={(e) => handleUpdateSortRule(rule.id, "direction", e.target.value)}
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
                          onClick={() => handleRemoveSortRule(rule.id)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        {/* Up/Down arrows for reordering */}
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => handleMoveSortRuleUp(rule.id)}
                            disabled={index === 0}
                            className={`text-gray-400 hover:text-gray-600 p-1 ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleMoveSortRuleDown(rule.id)}
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
