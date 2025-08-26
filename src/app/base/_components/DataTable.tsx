"use client";

import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
} from "@tanstack/react-table";
import { api } from "An/trpc/react";

interface CellData {
  id: string;
  value: string;
  columnId: string;
  rowId: string;
}

interface ColumnData {
  id: string;
  name: string;
  order: number;
}

interface RowData {
  id: string;
  order: number;
  cells: CellData[];
}

interface TableData {
  id: string;
  name: string;
  columns: ColumnData[];
  rows: RowData[];
}

interface DataTableProps {
  tableId: string;
}

export function DataTable({ tableId }: DataTableProps) {
  const utils = api.useUtils();
  const { data: tableData, isLoading } = api.table.getTableData.useQuery({ tableId });
  
  const updateCellMutation = api.table.updateCell.useMutation({
    onSuccess: () => {
      void utils.table.getTableData.invalidate({ tableId });
    },
  });

  const updateColumnMutation = api.table.updateColumn.useMutation({
    onSuccess: () => {
      void utils.table.getTableData.invalidate({ tableId });
    },
  });

  const addRowMutation = api.table.addRow.useMutation({
    onSuccess: () => {
      void utils.table.getTableData.invalidate({ tableId });
    },
  });

  const addColumnMutation = api.table.addColumn.useMutation({
    onSuccess: () => {
      void utils.table.getTableData.invalidate({ tableId });
    },
  });

  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
    value: string;
  } | null>(null);

  const [editingColumn, setEditingColumn] = useState<{
    columnId: string;
    name: string;
  } | null>(null);

  // Transform data for TanStack Table
  const tableRows = useMemo(() => {
    if (!tableData) return [];

    return tableData.rows.map((row) => {
      const rowData: Record<string, any> = { id: row.id };
      
      tableData.columns.forEach((column) => {
        const cell = row.cells.find((c) => c.columnId === column.id);
        rowData[column.id] = {
          value: cell?.value || "",
          cellId: cell?.id,
          columnId: column.id,
          rowId: row.id,
        };
      });
      
      return rowData;
    });
  }, [tableData]);

  // Create column definitions
  const columns = useMemo(() => {
    if (!tableData) return [];

    return tableData.columns.map((column) => ({
      id: column.id,
      header: () => (
        <div className="px-2 py-2 font-medium text-gray-900 min-w-[120px] max-w-[120px]">
          {editingColumn?.columnId === column.id ? (
            <input
              type="text"
              value={editingColumn.name}
              onChange={(e) => setEditingColumn({ ...editingColumn, name: e.target.value })}
              onBlur={() => {
                if (editingColumn) {
                  void updateColumnMutation.mutate({
                    columnId: editingColumn.columnId,
                    name: editingColumn.name,
                  });
                  setEditingColumn(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (editingColumn) {
                    void updateColumnMutation.mutate({
                      columnId: editingColumn.columnId,
                      name: editingColumn.name,
                    });
                    setEditingColumn(null);
                  }
                } else if (e.key === "Escape") {
                  setEditingColumn(null);
                }
              }}
              className="w-full bg-transparent border-none outline-none focus:ring-0 font-medium max-w-[120px]"
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
      cell: ({ row, column }: any) => {
        const cellData = row.getValue(column.id);
        const isEditing = editingCell?.rowId === cellData.rowId && editingCell?.columnId === cellData.columnId;

        return (
          <div 
            className="px-2 py-2 min-w-[120px] max-w-[120px] cursor-pointer w-full flex items-center pointer-events-none"
            onDoubleClick={() =>
              setEditingCell({
                rowId: cellData.rowId,
                columnId: cellData.columnId,
                value: cellData.value,
              })
            }
          >
            {isEditing ? (
              <input
                type="text"
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
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
                className="w-full bg-transparent border-none outline-none focus:ring-0 max-w-[120px] pointer-events-auto"
                autoFocus
              />
            ) : (
              <div className="min-h-[20px] truncate w-full pointer-events-auto">
                {cellData.value}
              </div>
            )}
          </div>
        );
      },
    }));
  }, [tableData, editingColumn, editingCell, updateColumnMutation, updateCellMutation, tableId]);

  const table = useReactTable({
    data: tableRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return null;
  }

  if (!tableData) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="border border-gray-200">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
                <th className="border border-gray-200 bg-gray-50 w-8">
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
              <tr key={row.id} className="hover:bg-gray-100 transition-colors duration-150">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="border border-gray-200">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td
                colSpan={tableData.columns.length + 2}
                className="border border-gray-200 bg-gray-50"
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