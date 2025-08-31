"use client";

import React, { useState } from "react";
import { api } from "../../../trpc/react";
import { useTableContext } from "./TableContext";
import { useSortContext } from "./SortContext";
import { useFilterContext } from "./FilterContext";

export function BulkAddRowsButton() {
  const { selectedTableId } = useTableContext();
  const { sortRules } = useSortContext();
  const { filterRules } = useFilterContext();
  const [isAdding, setIsAdding] = useState(false);
  const utils = api.useUtils();

  const addBulkRowsMutation = api.table.addBulkRowsFast.useMutation({
    onMutate: async ({ tableId, rowCount }) => {
      // Cancel any outgoing refetches
      await utils.table.getTableDataPaginated.cancel({ 
        tableId,
        page: 0,
        pageSize: 100,
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
      
      // Snapshot the previous value
      const previousData = utils.table.getTableDataPaginated.getData({ 
        tableId,
        page: 0,
        pageSize: 100,
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
      
      return { previousData };
    },
    onError: (err, { tableId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        utils.table.getTableDataPaginated.setData({ 
          tableId,
          page: 0,
          pageSize: 100,
          sortRules: sortRules.map(rule => ({
            columnId: rule.columnId,
            direction: rule.direction
          })),
          filterRules: filterRules.map(rule => ({
            columnId: rule.columnId,
            operator: rule.operator,
            value: rule.value
          }))
        }, context.previousData);
      }
    },
    onSettled: (data, error, { tableId }) => {
      // Always refetch after error or success
      console.log("Bulk rows added, invalidating cache...");
      
      // Force immediate cache invalidation for paginated data
      void utils.table.getTableDataPaginated.invalidate({ 
        tableId,
        page: 0,
        pageSize: 100,
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
      
      // Also invalidate all table data queries for this table
      void utils.table.getTableDataPaginated.invalidate();
    },
  });

  const handleAddBulkRows = async () => {
    if (!selectedTableId) return;
    
    setIsAdding(true);
    
    try {
      await addBulkRowsMutation.mutateAsync({ 
        tableId: selectedTableId, 
        rowCount: 10000 
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
      title="Add 10,000 rows with fake data (optimized for speed)"
    >
      {isAdding || addBulkRowsMutation.isPending ? "Adding..." : "Add 10k rows"}
    </button>
  );
}
