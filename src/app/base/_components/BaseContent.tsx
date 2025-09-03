"use client";

import React from "react";
import { api } from "../../../trpc/react";
import { VirtualizedDataTable } from "./VirtualizedDataTable";
import { ViewSidebar } from "./ViewSidebar";
import { useTableContext } from "./TableContext";
import { useView } from "./ViewContext";

interface BaseContentProps {
  baseId: string;
}

export function BaseContent({ baseId }: BaseContentProps) {
  const { data: tables, isLoading } = api.table.list.useQuery({ baseId });
  const { selectedTableId } = useTableContext();
  const { currentViewId } = useView();

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
      <div className="w-56 shrink-0 border-r border-gray-200 bg-white fixed left-14 top-28 bottom-0 z-10">
        <ViewSidebar tableId={selectedTable.id} />
      </div>
      <div className="flex-1 ml-56">
        <div className="p-4">
          <VirtualizedDataTable key={currentViewId} tableId={selectedTable.id} />
        </div>
      </div>
    </div>
  );
} 