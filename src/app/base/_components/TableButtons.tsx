"use client";

import React, { useState, useEffect } from "react";
import { api } from "An/trpc/react";

interface TableButtonsProps {
  baseId: string;
  onTableSelect: (tableId: string) => void;
  selectedTableId?: string;
}

export function TableButtons({ baseId, onTableSelect, selectedTableId }: TableButtonsProps) {
  const { data: tables, isLoading } = api.table.list.useQuery({ baseId });
  const utils = api.useUtils();
  
  const createTableMutation = api.table.createTable.useMutation({
    onSuccess: (newTable) => {
      // Invalidate and refetch the table list to show the new table
      void utils.table.list.invalidate({ baseId });
      // Automatically switch to the newly created table
      onTableSelect(newTable.id);
    },
  });

  const handleAddTable = () => {
    createTableMutation.mutate({ baseId });
  };

  const handleTableSelect = (tableId: string) => {
    onTableSelect(tableId);
  };

  // Auto-select the first table when tables are loaded
  useEffect(() => {
    if (tables && tables.length > 0 && !selectedTableId && tables[0]) {
      onTableSelect(tables[0].id);
    }
  }, [tables, selectedTableId, onTableSelect]);

  if (isLoading) {
    return <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />;
  }

  return (
    <div className="flex items-center space-x-2">
      {tables?.map((table, index) => (
        <button
          key={table.id}
          onClick={() => handleTableSelect(table.id)}
          className={`px-3 py-1 text-xs rounded border shadow-sm ${
            selectedTableId === table.id
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Table {index + 1}
        </button>
      ))}
      <button 
        onClick={handleAddTable}
        disabled={createTableMutation.isPending}
        className="px-3 py-1 text-xs bg-white rounded border border-gray-200 shadow-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {createTableMutation.isPending ? "Creating..." : "+ Add Table"}
      </button>
    </div>
  );
}
