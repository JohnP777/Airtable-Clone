"use client";

import React from "react";
import { TableButtons } from "./TableButtons";
import { useTableContext } from "./TableContext";

interface TableButtonsWrapperProps {
  baseId: string;
}

// Exported into page.tsx
export function TableButtonsWrapper({ baseId }: TableButtonsWrapperProps) {
  const { selectedTableId, setSelectedTableId } = useTableContext();

  // Buttons to switch between tables
  return (
    <TableButtons 
      baseId={baseId} 
      onTableSelect={setSelectedTableId}
      selectedTableId={selectedTableId}
    />
  );
}
