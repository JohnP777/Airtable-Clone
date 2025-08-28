"use client";

import React from "react";
import { TableButtons } from "./TableButtons";
import { useTableContext } from "./TableContext";

interface TableButtonsWrapperProps {
  baseId: string;
}

export function TableButtonsWrapper({ baseId }: TableButtonsWrapperProps) {
  const { selectedTableId, setSelectedTableId } = useTableContext();

  return (
    <TableButtons 
      baseId={baseId} 
      onTableSelect={setSelectedTableId}
      selectedTableId={selectedTableId}
    />
  );
}
