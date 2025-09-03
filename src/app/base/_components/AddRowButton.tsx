"use client";

import React from "react";
import { api } from "../../../trpc/react";
import { useTableContext } from "./TableContext";

interface AddRowButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function AddRowButton({ className = "", children }: AddRowButtonProps) {
  const { selectedTableId } = useTableContext();
  const utils = api.useUtils();

  const addRowMutation = api.table.addRow.useMutation({
    onSuccess: () => {
      // Invalidate and refetch table data to show the new row
      void utils.table.getTableDataPaginated.invalidate();
    },
  });

  const handleAddRow = () => {
    if (!selectedTableId) return;
    void addRowMutation.mutate({ tableId: selectedTableId });
  };

  if (!selectedTableId) return null;

  return (
    <button
      onClick={handleAddRow}
      disabled={addRowMutation.isPending}
      className={`px-3 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      title="Add a new row"
    >
      {children ?? (addRowMutation.isPending ? "Adding..." : "+")}
    </button>
  );
}
