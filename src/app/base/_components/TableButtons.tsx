"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "../../../trpc/react";

interface TableButtonsProps {
  baseId: string;
  onTableSelect: (tableId: string) => void;
  selectedTableId?: string;
}

export function TableButtons({ baseId, onTableSelect, selectedTableId }: TableButtonsProps) {
  const { data: tables, isLoading } = api.table.list.useQuery({ baseId });
  const utils = api.useUtils();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [deletingTableId, setDeletingTableId] = useState<string | null>(null);
  const [showAddTableDropdown, setShowAddTableDropdown] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [recordName, setRecordName] = useState("Record");
  const [tempTableName, setTempTableName] = useState("");
  const [newlyCreatedTableId, setNewlyCreatedTableId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const addTableRef = useRef<HTMLDivElement>(null);
  
  const createTableMutation = api.table.createTable.useMutation({
    onSuccess: (newTable) => {
      // Invalidate and refetch the table list to show the new table
      void utils.table.list.invalidate({ baseId });
      // Automatically switch to the newly created table
      onTableSelect(newTable.id);
      // Store the newly created table ID for potential renaming
      setNewlyCreatedTableId(newTable.id);
    },
  });

  const deleteTableMutation = api.table.deleteTable.useMutation({
    onSuccess: () => {
      void utils.table.list.invalidate({ baseId });
      setDeletingTableId(null);
      setOpenDropdown(null);
      // If we deleted the currently selected table, switch to the first remaining table
      if (tables && tables.length > 1) {
        const remainingTables = tables.filter(t => t.id !== selectedTableId);
        if (remainingTables.length > 0) {
          onTableSelect(remainingTables[0]!.id);
        }
      }
    },
    onError: (error) => {
      alert(error.message || "Failed to delete table");
      setDeletingTableId(null);
    },
  });

  const renameTableMutation = api.table.renameTable.useMutation({
    onSuccess: () => {
      void utils.table.list.invalidate({ baseId });
      setEditingTableId(null);
      setNewTableName("");
      setRecordName("Record");
      setOpenDropdown(null);
    },
  });

  const handleAddTable = () => {
    // Create table immediately with default name
    createTableMutation.mutate({ baseId });
    // Show dropdown for renaming
    setShowAddTableDropdown(true);
    setTempTableName("");
  };

  const handleSaveNewTable = () => {
    if (tempTableName.trim() && newlyCreatedTableId) {
      // Rename the newly created table
      renameTableMutation.mutate({ 
        tableId: newlyCreatedTableId,
        newName: tempTableName.trim()
      });
    }
    setShowAddTableDropdown(false);
    setTempTableName("");
    setNewlyCreatedTableId(null);
  };

  const handleCancelNewTable = () => {
    setShowAddTableDropdown(false);
    setTempTableName("");
    setNewlyCreatedTableId(null);
  };

  const handleTableSelect = (tableId: string) => {
    onTableSelect(tableId);
    setOpenDropdown(null); // Close dropdown when switching tables
  };

  const handleDeleteTable = (tableId: string) => {
    // Check if this is the last table
    if (tables && tables.length <= 1) {
      alert("Cannot delete the last remaining table in the base. A base must have at least one table.");
      return;
    }
    setDeletingTableId(tableId);
  };

  const handleRenameTable = (tableId: string, currentName: string) => {
    setEditingTableId(tableId);
    setNewTableName(currentName);
    setRecordName("Record");
  };

  const handleConfirmDelete = () => {
    if (deletingTableId) {
      deleteTableMutation.mutate({ tableId: deletingTableId });
    }
  };

  const handleCancelDelete = () => {
    setDeletingTableId(null);
  };

  const handleSaveRename = () => {
    if (editingTableId && newTableName.trim()) {
      renameTableMutation.mutate({ 
        tableId: editingTableId, 
        newName: newTableName.trim() 
      });
    }
  };

  const handleCancelRename = () => {
    setEditingTableId(null);
    setNewTableName("");
    setRecordName("Record");
  };

  // Auto-select the first table when tables are loaded
  useEffect(() => {
    if (tables && tables.length > 0 && !selectedTableId && tables[0]) {
      onTableSelect(tables[0].id);
    }
  }, [tables, selectedTableId, onTableSelect]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
        setEditingTableId(null);
        setDeletingTableId(null);
        setNewTableName("");
        setRecordName("Record");
      }
      if (addTableRef.current && !addTableRef.current.contains(event.target as Node)) {
        setShowAddTableDropdown(false);
        setTempTableName("");
        setNewlyCreatedTableId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />;
  }

  return (
    <div className="flex items-center space-x-0" ref={dropdownRef}>
      {tables?.map((table, index) => (
        <div key={table.id} className="relative">
          <button
            onClick={() => handleTableSelect(table.id)}
            className={`flex items-center ${index === 0 ? 'pl-4' : 'pl-2'} pr-1 py-3 text-[13px] ${
              selectedTableId === table.id
                ? "text-black font-semibold bg-white rounded-t-lg -mb-px"
                : "text-gray-700 hover:text-gray-900"
            }`}
            style={{ fontFamily: 'Mundo Sans Regular, sans-serif' }}
          >
            <span className="flex-1 text-left">{table.name}</span>
            <div className="ml-1 w-4 h-4 flex items-center justify-center">
              {selectedTableId === table.id && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(openDropdown === table.id ? null : table.id);
                  }}
                  className="p-0.5 hover:bg-gray-100 rounded"
                >
                  <svg className="h-3 w-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          </button>
          
          {/* Dropdown Menu */}
          {openDropdown === table.id && (
            <div className={`absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 ${editingTableId === table.id ? 'w-80' : deletingTableId === table.id ? 'w-64' : 'w-48'}`}>
              {editingTableId === table.id ? (
                // Rename form
                <div className="p-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Table name
                    </label>
                    <input
                      type="text"
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveRename();
                        } else if (e.key === 'Escape') {
                          handleCancelRename();
                        }
                      }}
                      className="w-full px-3 py-2 border border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Enter table name"
                      autoFocus
                    />
                  </div>


                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={handleCancelRename}
                      className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRename}
                      disabled={!newTableName.trim() || renameTableMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {renameTableMutation.isPending ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : deletingTableId === table.id ? (
                // Delete confirmation
                <div className="p-3">
                  <h2 className="text-sm font-semibold text-gray-900 mb-2">
                    Are you sure you want to delete this table?
                  </h2>
                  
                  <p className="text-xs text-gray-600 mb-4">
                    Recently deleted tables can be restored from{" "}
                    <span className="inline-flex items-center">
                      trash
                      <button className="ml-1 w-3 h-3 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs text-gray-600">?</span>
                      </button>
                    </span>
                  </p>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={handleCancelDelete}
                      className="px-3 py-1.5 text-xs text-gray-700 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      disabled={deleteTableMutation.isPending}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteTableMutation.isPending ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ) : (
                // Regular dropdown menu
                <div className="py-1">
                  <button 
                    onClick={() => handleRenameTable(table.id, table.name)}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Rename table
                  </button>
                  <button 
                    onClick={() => handleDeleteTable(table.id)}
                    className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <svg className="h-4 w-4 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete table
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      
      {/* Add Table Button with Dropdown */}
      <div className="relative ml-2" ref={addTableRef}>
        <button 
          onClick={handleAddTable}
          disabled={createTableMutation.isPending}
          className="flex items-center space-x-1 text-[13px] text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Mundo Sans Regular, sans-serif' }}
        >
          <img src="/24.PNG" alt="Add" className="h-4 w-4" />
          <span>{createTableMutation.isPending ? "Creating..." : "Add or import"}</span>
        </button>

        {/* Add Table Dropdown */}
        {showAddTableDropdown && (
          <div className="absolute top-full left-0 transform -translate-x-40 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="p-3">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Table name
                </label>
                <input
                  type="text"
                  value={tempTableName}
                  onChange={(e) => setTempTableName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveNewTable();
                    } else if (e.key === 'Escape') {
                      handleCancelNewTable();
                    }
                  }}
                  className="w-full px-3 py-2 border border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Enter table name"
                  autoFocus
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={handleCancelNewTable}
                  className="px-3 py-1.5 text-xs text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNewTable}
                  disabled={createTableMutation.isPending}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createTableMutation.isPending ? "Creating..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
