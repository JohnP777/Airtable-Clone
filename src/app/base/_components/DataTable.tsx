"use client";

import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Column,
  type Row,
} from "@tanstack/react-table";
import { api } from "An/trpc/react";

// Added strong types for table row shape and cell value
type CellValue = { value: string; cellId?: string; columnId: string; rowId: string };
type RowRecord = { id: string } & Record<string, CellValue>;

interface DataTableProps {
  tableId: string;
}

export function DataTable({ tableId }: DataTableProps) {
  const utils = api.useUtils();
  const { data: tableData } = api.table.getTableData.useQuery({ tableId });
  
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
    value: string;
  } | null>(null);

  const [editingColumn, setEditingColumn] = useState<{
    columnId: string;
    name: string;
  } | null>(null);

  // No more loading state tracking - we want everything to stay stable

  // Local state to track cell values for immediate updates
  const [localCellValues, setLocalCellValues] = useState<Record<string, string>>({});

  const updateCellMutation = api.table.updateCell.useMutation({
    onMutate: async ({ tableId, rowId, columnId, value }) => {
      // Cancel any outgoing refetches
      await utils.table.getTableData.cancel({ tableId });
      
      // Update local state immediately for instant UI feedback
      const cellKey = `${rowId}-${columnId}`;
      setLocalCellValues(prev => ({ ...prev, [cellKey]: value }));
      
      // Snapshot the previous value
      const previousData = utils.table.getTableData.getData({ tableId });
      
      // Optimistically update the cache
      utils.table.getTableData.setData({ tableId }, (old) => {
        if (!old) return old;
        
        return {
          ...old,
          rows: old.rows.map(row => {
            if (row.id === rowId) {
              return {
                ...row,
                cells: row.cells.map(cell => {
                  if (cell.columnId === columnId) {
                    return { ...cell, value };
                  }
                  return cell;
                })
              };
            }
            return row;
          })
        };
      });
      
      // Return a context object with the snapshotted value
      return { previousData, rowId, columnId, previousLocalValue: localCellValues[cellKey] };
    },
    onError: (err, { tableId, rowId, columnId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        utils.table.getTableData.setData({ tableId }, context.previousData);
      }
      // Also rollback local state
      if (context?.previousLocalValue !== undefined) {
        const cellKey = `${rowId}-${columnId}`;
        setLocalCellValues(prev => {
          const newState = { ...prev };
          if (context.previousLocalValue !== undefined) {
            newState[cellKey] = context.previousLocalValue;
          }
          return newState;
        });
      }
    },
    // No onSettled - we don't want to refetch or change anything
  });

  const updateColumnMutation = api.table.updateColumn.useMutation({
    onMutate: async ({ columnId, name }) => {
      // Cancel any outgoing refetches
      await utils.table.getTableData.cancel({ tableId });
      
      // Snapshot the previous value
      const previousData = utils.table.getTableData.getData({ tableId });
      
      // Optimistically update the cache
      utils.table.getTableData.setData({ tableId }, (old) => {
        if (!old) return old;
        
        return {
          ...old,
          columns: old.columns.map(column => {
            if (column.id === columnId) {
              return { ...column, name };
            }
            return column;
          })
        };
      });
      
      // Return a context object with the snapshotted value
      return { previousData, columnId };
    },
    onError: (err, { columnId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        utils.table.getTableData.setData({ tableId }, context.previousData);
      }
    },
    // No onSettled - we don't want to refetch or change anything
  });

  const addRowMutation = api.table.addRow.useMutation({
    onMutate: async ({ tableId }) => {
      // Cancel any outgoing refetches
      await utils.table.getTableData.cancel({ tableId });
      
      // Snapshot the previous value
      const previousData = utils.table.getTableData.getData({ tableId });
      
      // Optimistically add a new row
      utils.table.getTableData.setData({ tableId }, (old) => {
        if (!old) return old;
        
        const tempId = `temp-${Date.now()}`;
        const newRow = {
          id: tempId,
          order: old.rows.length,
          createdAt: new Date(),
          updatedAt: new Date(),
          tableId: tableId,
          cells: old.columns.map(column => ({
            id: `temp-cell-${Date.now()}-${column.id}`,
            value: "",
            columnId: column.id,
            rowId: tempId,
            tableId: tableId,
            createdAt: new Date(),
            updatedAt: new Date(),
            column: column
          }))
        };
        
        return {
          ...old,
          rows: [...old.rows, newRow]
        };
      });
      
      // Return a context object with the snapshotted value
      return { previousData, tempId: `temp-${Date.now()}` };
    },
    onError: (err, { tableId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        utils.table.getTableData.setData({ tableId }, context.previousData);
      }
    },
    onSuccess: (data, variables, context) => {
      // Update the cache to replace temporary IDs with real IDs
      utils.table.getTableData.setData({ tableId: variables.tableId }, (old) => {
        if (!old) return old;
        
        return {
          ...old,
          rows: old.rows.map(row => {
            if (row.id.startsWith('temp-')) {
              return {
                ...row,
                id: data.id,
                cells: row.cells.map(cell => ({
                  ...cell,
                  rowId: data.id
                }))
              };
            }
            return row;
          })
        };
      });
    },
    // No onSettled - we don't want to refetch or change anything
  });

  const addColumnMutation = api.table.addColumn.useMutation({
    onMutate: async ({ tableId, name }) => {
      // Cancel any outgoing refetches
      await utils.table.getTableData.cancel({ tableId });
      
      // Snapshot the previous value
      const previousData = utils.table.getTableData.getData({ tableId });
      
      // Optimistically add a new column
      utils.table.getTableData.setData({ tableId }, (old) => {
        if (!old) return old;
        
        const tempId = `temp-col-${Date.now()}`;
        const newColumn = {
          id: tempId,
          name: name ?? `Column ${old.columns.length + 1}`,
          order: old.columns.length,
          tableId: tableId,
          type: "text",
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Add cells for the new column to all existing rows
        const updatedRows = old.rows.map(row => ({
          ...row,
          cells: [
            ...row.cells,
            {
              id: `temp-cell-${Date.now()}-${row.id}`,
              value: "",
              columnId: tempId,
              rowId: row.id,
              tableId: tableId,
              createdAt: new Date(),
              updatedAt: new Date(),
              column: newColumn
            }
          ]
        }));
        
        return {
          ...old,
          columns: [...old.columns, newColumn],
          rows: updatedRows
        };
      });
      
      // Return a context object with the snapshotted value
      return { previousData, tempId: `temp-col-${Date.now()}` };
    },
    onError: (err, { tableId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        utils.table.getTableData.setData({ tableId }, context.previousData);
      }
    },
    onSuccess: (data, variables, context) => {
      // Update the cache to replace temporary IDs with real IDs
      utils.table.getTableData.setData({ tableId: variables.tableId }, (old) => {
        if (!old) return old;
        
        return {
          ...old,
          columns: old.columns.map(column => {
            if (column.id.startsWith('temp-col-')) {
              return {
                ...column,
                id: data.id,
                name: data.name,
                type: data.type
              };
            }
            return column;
          }),
          rows: old.rows.map(row => ({
            ...row,
            cells: row.cells.map(cell => {
              if (cell.columnId.startsWith('temp-col-')) {
                return {
                  ...cell,
                  columnId: data.id,
                  column: {
                    ...cell.column,
                    id: data.id,
                    name: data.name,
                    type: data.type
                  }
                };
              }
              return cell;
            })
          }))
        };
      });
    },
    // No onSettled - we don't want to refetch or change anything
  });

  // Transform data for TanStack Table
  const tableRows = useMemo(() => {
    if (!tableData) return [] as RowRecord[];

    return tableData.rows.map((row: { id: string; cells: { id?: string; value?: string; columnId: string; rowId: string }[] }) => {
      const rowData = { id: row.id } as RowRecord;
      
      tableData.columns.forEach((column: { id: string; name: string }) => {
        const cell = row.cells.find((c: { columnId: string }) => c.columnId === column.id);
        rowData[column.id] = {
          value: cell?.value ?? "",
          cellId: cell?.id,
          columnId: column.id,
          rowId: row.id,
        };
      });
      
      return rowData;
    });
  }, [tableData]);

  // Create column definitions
  const columns = useMemo<ColumnDef<RowRecord, CellValue>[]>(() => {
    if (!tableData) return [] as ColumnDef<RowRecord, CellValue>[];

    // Add row number column as the first column
    const rowNumberColumn: ColumnDef<RowRecord, CellValue> = {
      id: 'rowNumber',
      header: () => (
        <div className="px-2 py-2 font-medium text-gray-900 w-full h-full flex items-center justify-center">
          #
        </div>
      ),
      cell: ({ row }) => (
        <div className="px-2 py-2 w-full h-full flex items-center justify-center text-gray-600 font-medium">
          {row.index + 1}
        </div>
      ),
      size: 60, // Narrow column for row numbers
    };

    // Create data columns
    const dataColumns = tableData.columns.map((column: { id: string; name: string }) => ({
      id: column.id,
      header: () => (
        <div className={`px-2 py-2 font-medium text-gray-900 w-full h-full flex items-center`}>
          {editingColumn?.columnId === column.id ? (
            <input
              type="text"
              value={editingColumn?.name ?? ""}
              onChange={(e) => setEditingColumn((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
              onBlur={() => {
                setEditingColumn((prev) => {
                  if (!prev) return prev;
                  void updateColumnMutation.mutate({
                    columnId: prev.columnId,
                    name: prev.name,
                  });
                  return null;
                });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setEditingColumn((prev) => {
                    if (!prev) return prev;
                    void updateColumnMutation.mutate({
                      columnId: prev.columnId,
                      name: prev.name,
                    });
                    return null;
                  });
                } else if (e.key === "Escape") {
                  setEditingColumn(null);
                }
              }}
              className="w-full h-full bg-transparent border-none outline-none focus:ring-0 font-medium"
              autoFocus
            />
          ) : (
            <div
              onDoubleClick={() => setEditingColumn({ columnId: column.id, name: column.name })}
              className="cursor-pointer truncate"
            >
              {column.name}
            </div>
          )}
        </div>
      ),
      accessorKey: column.id,
      cell: ({ row, column }: { row: Row<RowRecord>; column: Column<RowRecord, CellValue> }) => {
        const cellData = row.getValue<CellValue>(column.id);
        const isEditing = editingCell?.rowId === cellData.rowId && editingCell?.columnId === cellData.columnId;

        return (
          <div 
            className="px-2 py-2 cursor-pointer w-full h-full flex items-center pointer-events-none"
            onDoubleClick={() => {
              setEditingCell({
                rowId: cellData.rowId,
                columnId: cellData.columnId,
                value: localCellValues[`${cellData.rowId}-${cellData.columnId}`] ?? cellData.value,
              });
            }}
          >
            {isEditing ? (
              <input
                type="text"
                value={editingCell?.value ?? ""}
                onChange={(e) => editingCell && setEditingCell({ ...editingCell, value: e.target.value })}
                onBlur={() => {
                  if (editingCell) {
                    void updateCellMutation.mutate({
                      tableId,
                      rowId: editingCell.rowId,
                      columnId: editingCell.columnId,
                      value: editingCell.value,
                    });
                    setEditingCell(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (editingCell) {
                      void updateCellMutation.mutate({
                        tableId,
                        rowId: editingCell.rowId,
                        columnId: editingCell.columnId,
                        value: editingCell.value,
                      });
                      setEditingCell(null);
                    }
                  } else if (e.key === "Escape") {
                    setEditingCell(null);
                  }
                }}
                className="w-full h-full bg-transparent border-none outline-none focus:ring-0 pointer-events-auto"
                autoFocus
              />
            ) : (
              <div className="w-full h-full flex items-center pointer-events-auto">
                {localCellValues[`${cellData.rowId}-${cellData.columnId}`] ?? cellData.value}
              </div>
            )}
          </div>
        );
      },
    }));

    // Return row number column + data columns
    return [rowNumberColumn, ...dataColumns];
  }, [tableData, editingColumn, editingCell, updateColumnMutation, updateCellMutation, tableId, localCellValues]);

  const table = useReactTable({
    data: tableRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!tableData) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="h-12">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="border border-gray-200 h-12">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
                <th className="border border-gray-200 bg-gray-50 w-8 h-12">
                  <button
                    onClick={() => void addColumnMutation.mutate({ tableId })}
                    className="w-full h-full px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-sm"
                  >
                    +
                  </button>
                </th>
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-100 transition-colors duration-150 h-12">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="border border-gray-200 h-12">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td
                colSpan={tableData.columns.length + 3}
                className="border border-gray-200 bg-gray-50 h-12"
              >
                <button
                  onClick={() => void addRowMutation.mutate({ tableId })}
                  className="w-full px-3 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-sm"
                >
                  +
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
} 