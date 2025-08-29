"use client";

import React from "react";
import { api } from "An/trpc/react";
import { DataTable } from "./DataTable";
import { ViewSidebar } from "./ViewSidebar";
import { useTableContext } from "./TableContext";

interface BaseContentProps {
  baseId: string;
}

export function BaseContent({ baseId }: BaseContentProps) {
  const { data: tables, isLoading } = api.table.list.useQuery({ baseId });
  const { selectedTableId } = useTableContext();

  if (isLoading) {
    return null;
  }

  if (!tables || tables.length === 0) {
    return null;
  }

  // Find the selected table
  const selectedTable = tables.find(table => table.id === selectedTableId) ?? tables[0];
  
  if (!selectedTable) {
    return null;
  }

  return (
    <div className="w-full h-full flex">
      {/* Views sidebar - positioned to touch the third header and primary sidebar */}
      <div className="w-56 shrink-0 border-r border-gray-200 bg-white">
        <ViewSidebar tableId={selectedTable.id} />
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <DataTable tableId={selectedTable.id} />
        </div>
      </div>
    </div>
  );
} 