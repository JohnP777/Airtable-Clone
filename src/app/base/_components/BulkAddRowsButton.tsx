"use client";

import React, { useState } from "react";
import { api } from "../../../trpc/react";
import { useTableContext } from "./TableContext";

export function BulkAddRowsButton() {
  const { selectedTableId } = useTableContext();
  const [isAdding, setIsAdding] = useState(false);
  const utils = api.useUtils();

  const addBulkRowsMutation = api.table.addBulkRowsFast.useMutation({
    onMutate: async ({ tableId, rowCount }) => {
      // Cancel any outgoing refetches
      await utils.table.getTableData.cancel({ tableId });
      
      // Snapshot the previous value
      const previousData = utils.table.getTableData.getData({ tableId });
      
      return { previousData };
    },
    onError: (err, { tableId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        utils.table.getTableData.setData({ tableId }, context.previousData);
      }
    },
    onSettled: (data, error, { tableId }) => {
      // Always refetch after error or success
      void utils.table.getTableData.invalidate({ tableId });
    },
  });

  const handleAddBulkRows = async () => {
    if (!selectedTableId) return;
    
    setIsAdding(true);
    try {
                   await addBulkRowsMutation.mutateAsync({ 
               tableId: selectedTableId, 
               rowCount: 1000 
             });
    } catch (error) {
      console.error("Failed to add bulk rows:", error);
    } finally {
      setIsAdding(false);
    }
  };

  if (!selectedTableId) return null;

  return (
    <button
      onClick={handleAddBulkRows}
      disabled={isAdding || addBulkRowsMutation.isPending}
      className="px-3 py-1 text-xs bg-green-500 text-white rounded border border-green-600 shadow-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                   title="Add 1,000 rows with fake data"
    >
                   {isAdding || addBulkRowsMutation.isPending ? "Adding..." : "Add 1k rows"}
    </button>
  );
}
