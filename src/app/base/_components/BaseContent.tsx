"use client";

import React from "react";
import { api } from "../../../trpc/react";
import { VirtualizedDataTable } from "./VirtualizedDataTable";
import { ViewSidebar } from "./ViewSidebar";
import { useTableContext } from "./TableContext";
import { useView } from "./ViewContext";
import { useViewSidebarVisibility } from "./ViewSidebarVisibilityContext";

interface BaseContentProps {
  baseId: string;
}

export function BaseContent({ baseId }: BaseContentProps) {
  const { data: tables, isLoading } = api.table.list.useQuery({ baseId });
  const { selectedTableId } = useTableContext();
  const { currentViewId } = useView();
  const { isViewSidebarVisible } = useViewSidebarVisibility();

  // Find the selected table if available
  const selectedTable = tables?.find(table => table.id === selectedTableId) ?? tables?.[0];

  return (
    <div className="w-full h-full flex">
      {/* Renders views sidebar if its toggled on (default on) */}
      {isViewSidebarVisible && (
        <div className="w-70 shrink-0 border-r border-gray-200 bg-white fixed left-14 top-28 bottom-0 z-10">
          <ViewSidebar tableId={selectedTable?.id ?? ""} />
        </div>
      )}
      <div className={`flex-1 ${isViewSidebarVisible ? 'ml-70' : 'ml-0'} bg-[#f6f8fc]`}>
        <div className="p-4">
          <VirtualizedDataTable key={currentViewId ?? 'skeleton'} tableId={selectedTable?.id ?? ""} />
        </div>
      </div>
    </div>
  );
} 