"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Column,
  type Row,
} from "@tanstack/react-table";
import { api } from "An/trpc/react";
import { useTableContext } from "./TableContext";
import { useSortContext } from "./SortContext";
import { useFilterContext } from "./FilterContext";
import { useSearchContext } from "./SearchContext";
import { useHiddenFields } from "./HiddenFieldsContext";

// Added strong types for table row shape and cell value
type CellValue = { value: string; cellId?: string; columnId: string; rowId: string };
type RowRecord = { id: string } & Record<string, CellValue>;

interface DataTableProps {
  tableId: string;
}

export function DataTable({ tableId }: DataTableProps) {
  const utils = api.useUtils();
  const { sortRules } = useSortContext();
  const { filterRules } = useFilterContext();
  const { searchResults, currentResultIndex } = useSearchContext();
  const { isFieldHidden } = useHiddenFields();
  const inputRef = useRef<HTMLInputElement>(null);
  const currentValueRef = useRef<string>("");
  
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

  const { data: tableData, isLoading } = api.table.getTableData.useQuery(
    {
      tableId,
      sortRules: sortRules.map(rule => ({
        columnId: rule.columnId,
        direction: rule.direction
      })),
      filterRules: filterRules.map(rule => ({
        columnId: rule.columnId,
        operator: rule.operator,
        value: rule.value
      }))
    },
    { enabled: !!tableId }
  );

  const updateCellMutation = api.table.updateCell.useMutation({
    onMutate: async ({ tableId, rowId, columnId, value }) => {
      // Cancel any outgoing refetches
      await utils.table.getTableData.cancel({ 
        tableId,
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
      
      // Update local state immediately for instant UI feedback
      const cellKey = `${rowId}-${columnId}`;
      setLocalCellValues(prev => ({ ...prev, [cellKey]: value }));
      
      // Snapshot the previous value
      const previousData = utils.table.getTableData.getData({ 
        tableId,
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
      
      // Optimistically update the cache
      utils.table.getTableData.setData({ 
        tableId,
        sortRules: sortRules.map(rule => ({
          columnId: rule.columnId,
          direction: rule.direction
        })),
        filterRules: filterRules.map(rule => ({
          columnId: rule.columnId,
          operator: rule.operator,
          value: rule.value
        }))
      }, (old) => {
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
    onError: (err, { tableId, rowId, columnId }, _context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (_context?.previousData) {
        utils.table.getTableData.setData({ 
          tableId,
          sortRules: sortRules.map(rule => ({
            columnId: rule.columnId,
            direction: rule.direction
          })),
          filterRules: filterRules.map(rule => ({
            columnId: rule.columnId,
            operator: rule.operator,
            value: rule.value
          }))
        }, _context.previousData);
      }
      // Also rollback local state
      if (_context?.previousLocalValue !== undefined) {
        const cellKey = `${rowId}-${columnId}`;
        setLocalCellValues(prev => {
          const newState = { ...prev };
          if (_context.previousLocalValue !== undefined) {
            newState[cellKey] = _context.previousLocalValue;
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
      await utils.table.getTableData.cancel({ 
        tableId,
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
      const previousData = utils.table.getTableData.getData({ 
        tableId,
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
      
      // Optimistically update the cache
      utils.table.getTableData.setData({ 
        tableId,
        sortRules: sortRules.map(rule => ({
          columnId: rule.columnId,
          direction: rule.direction
        })),
        filterRules: filterRules.map(rule => ({
          columnId: rule.columnId,
          operator: rule.operator,
          value: rule.value
        }))
      }, (old) => {
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
      
      return { previousData };
    },
    onError: (err, { columnId, name }, _context) => {
      if (_context?.previousData) {
        utils.table.getTableData.setData({ 
          tableId,
          sortRules: sortRules.map(rule => ({
            columnId: rule.columnId,
            direction: rule.direction
          })),
          filterRules: filterRules.map(rule => ({
            columnId: rule.columnId,
            operator: rule.operator,
            value: rule.value
          }))
        }, _context.previousData);
      }
    },
    // No onSettled - we don't want to refetch or change anything
  });

  const addRowMutation = api.table.addRow.useMutation({
    onMutate: async ({ tableId }) => {
      // Cancel any outgoing refetches
      await utils.table.getTableData.cancel({ 
        tableId,
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
      const previousData = utils.table.getTableData.getData({ 
        tableId,
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
      
      // Optimistically add a new row
      utils.table.getTableData.setData({ 
        tableId,
        sortRules: sortRules.map(rule => ({
          columnId: rule.columnId,
          direction: rule.direction
        })),
        filterRules: filterRules.map(rule => ({
          columnId: rule.columnId,
          operator: rule.operator,
          value: rule.value
        }))
      }, (old) => {
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
    onError: (err, { tableId }, _context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (_context?.previousData) {
        utils.table.getTableData.setData({ 
          tableId,
          sortRules: sortRules.map(rule => ({
            columnId: rule.columnId,
            direction: rule.direction
          })),
          filterRules: filterRules.map(rule => ({
            columnId: rule.columnId,
            operator: rule.operator,
            value: rule.value
          }))
        }, _context.previousData);
      }
    },
    onSuccess: (data, variables, _context) => {
      // Update the cache to replace temporary IDs with real IDs
      utils.table.getTableData.setData({ 
        tableId: variables.tableId,
        sortRules: sortRules.map(rule => ({
          columnId: rule.columnId,
          direction: rule.direction
        })),
        filterRules: filterRules.map(rule => ({
          columnId: rule.columnId,
          operator: rule.operator,
          value: rule.value
        }))
      }, (old) => {
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
      await utils.table.getTableData.cancel({ 
        tableId,
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
      const previousData = utils.table.getTableData.getData({ 
        tableId,
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
      
      // Optimistically add a new column
      utils.table.getTableData.setData({ 
        tableId,
        sortRules: sortRules.map(rule => ({
          columnId: rule.columnId,
          direction: rule.direction
        })),
        filterRules: filterRules.map(rule => ({
          columnId: rule.columnId,
          operator: rule.operator,
          value: rule.value
        }))
      }, (old) => {
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
    onError: (err, { tableId }, _context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (_context?.previousData) {
        utils.table.getTableData.setData({ 
          tableId,
          sortRules: sortRules.map(rule => ({
            columnId: rule.columnId,
            direction: rule.direction
          })),
          filterRules: filterRules.map(rule => ({
            columnId: rule.columnId,
            operator: rule.operator,
            value: rule.value
          }))
        }, _context.previousData);
      }
    },
    onSuccess: (data, variables, _context) => {
      // Update the cache to replace temporary IDs with real IDs
      utils.table.getTableData.setData({ 
        tableId: variables.tableId,
        sortRules: sortRules.map(rule => ({
          columnId: rule.columnId,
          direction: rule.direction
        })),
        filterRules: filterRules.map(rule => ({
          columnId: rule.columnId,
          operator: rule.operator,
          value: rule.value
        }))
      }, (old) => {
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

  // Helper function to check if a cell should be highlighted
  const isCellHighlighted = useCallback((rowId: string, columnId: string) => {
    return searchResults.some(result => 
      result.type === "cell" && 
      result.rowId === rowId && 
      result.columnId === columnId
    );
  }, [searchResults]);

  // Helper function to check if current cell is the active search result
  const isCurrentSearchResult = useCallback((rowId: string, columnId: string) => {
    if (searchResults.length === 0 || currentResultIndex >= searchResults.length) return false;
    const currentResult = searchResults[currentResultIndex];
    if (!currentResult) return false;
    return currentResult.type === "cell" && 
           currentResult.rowId === rowId && 
           currentResult.columnId === columnId;
  }, [searchResults, currentResultIndex]);

  // Scroll to current search result when it changes
  useEffect(() => {
    if (searchResults.length > 0 && currentResultIndex < searchResults.length) {
      const currentResult = searchResults[currentResultIndex];
      
      if (currentResult?.type === "cell") {
        // Find the cell element and scroll to it
        const cellElement = document.querySelector(
          `[data-row-id="${currentResult.rowId}"][data-column-id="${currentResult.columnId}"]`
        );
        
        if (cellElement) {
          // Use scrollIntoView with a simpler approach
          console.log('Scrolling to cell:', currentResult.rowId, currentResult.columnId);
          cellElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      } else if (currentResult?.type === "field") {
        // Find the field header element and scroll to it
        const fieldElement = document.querySelector(
          `[data-field-id="${currentResult.columnId}"]`
        );
        
        if (fieldElement) {
          // Use scrollIntoView with a simpler approach
          console.log('Scrolling to field:', currentResult.columnId);
          fieldElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }
    }
  }, [currentResultIndex, searchResults]);

  // Helper function to check if a field (column) should be highlighted
  const isFieldHighlighted = useCallback((columnId: string) => {
    return searchResults.some(result => 
      result.type === "field" && 
      result.columnId === columnId
    );
  }, [searchResults]);

  // Helper function to check if current field is the active search result
  const isCurrentFieldResult = useCallback((columnId: string) => {
    if (searchResults.length === 0 || currentResultIndex >= searchResults.length) return false;
    const currentResult = searchResults[currentResultIndex];
    if (!currentResult) return false;
    return currentResult.type === "field" && 
           currentResult.columnId === columnId;
  }, [searchResults, currentResultIndex]);

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

    // Create data columns (filter out hidden columns)
    const dataColumns = tableData.columns
      .filter((column: { id: string; name: string }) => !isFieldHidden(column.id))
      .map((column: { id: string; name: string }) => ({
      id: column.id,
      size: 200, // Fixed width for data columns
      header: () => {
        const isHighlighted = isFieldHighlighted(column.id);
        const isCurrent = isCurrentFieldResult(column.id);
        
        return (
          <div 
            data-field-id={column.id}
            className={`px-2 py-2 font-medium text-gray-900 w-full h-full flex items-center ${
              isCurrent ? 'bg-orange-300' : isHighlighted ? 'bg-orange-100' : ''
            }`}>
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
        );
      },
      accessorKey: column.id,
      cell: ({ row, column }: { row: Row<RowRecord>; column: Column<RowRecord, CellValue> }) => {
        const cellData = row.getValue<CellValue>(column.id);
        const isEditing = editingCell?.rowId === cellData.rowId && editingCell?.columnId === cellData.columnId;

        const isHighlighted = isCellHighlighted(cellData.rowId, cellData.columnId);
        const isCurrent = isCurrentSearchResult(cellData.rowId, cellData.columnId);
        
        return (
          <div 
            data-row-id={cellData.rowId}
            data-column-id={cellData.columnId}
            className={`px-2 py-2 cursor-pointer w-full h-full flex items-center pointer-events-none ${
              isCurrent ? 'bg-orange-300' : isHighlighted ? 'bg-orange-100' : ''
            }`}
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
                ref={inputRef}
                type="text"
                defaultValue={editingCell?.value ?? ""}
                onChange={(e) => {
                  // Only update the ref, don't update state during typing
                  currentValueRef.current = e.target.value;
                }}
                onBlur={() => {
                  if (editingCell) {
                    const finalValue = currentValueRef.current;
                    // Update local state and trigger mutation only when editing is complete
                    const cellKey = `${editingCell.rowId}-${editingCell.columnId}`;
                    setLocalCellValues(prev => ({ ...prev, [cellKey]: finalValue }));
                    
                    void updateCellMutation.mutate({
                      tableId,
                      rowId: editingCell.rowId,
                      columnId: editingCell.columnId,
                      value: finalValue,
                    });
                    setEditingCell(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (editingCell) {
                      const finalValue = currentValueRef.current;
                      // Update local state and trigger mutation only when editing is complete
                      const cellKey = `${editingCell.rowId}-${editingCell.columnId}`;
                      setLocalCellValues(prev => ({ ...prev, [cellKey]: finalValue }));
                      
                      void updateCellMutation.mutate({
                        tableId,
                        rowId: editingCell.rowId,
                        columnId: editingCell.columnId,
                        value: finalValue,
                      });
                      setEditingCell(null);
                    }
                  } else if (e.key === "Escape") {
                    setEditingCell(null);
                  }
                }}
                className="w-full h-full bg-transparent border-none outline-none focus:ring-0 pointer-events-auto"
                autoFocus
                onFocus={(e) => {
                  // Set the ref to the current value when focusing
                  currentValueRef.current = e.target.value;
                }}
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
  }, [tableData, editingColumn, editingCell, updateColumnMutation, updateCellMutation, tableId, localCellValues, isCellHighlighted, isCurrentSearchResult, isFieldHighlighted, isCurrentFieldResult]);

  const table = useReactTable({
    data: tableRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!tableData) {
    return <div className="flex items-center justify-center h-64">No data available</div>;
  }

  return (
    <div className="w-full">
      <table className="border-collapse border border-gray-200 table-fixed">
          <thead className="bg-gray-50 sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="h-12">
                {headerGroup.headers.map((header) => (
                  <th 
                    key={header.id} 
                    className="border border-gray-200 h-12"
                    style={{ width: header.getSize() }}
                  >
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
                  <td 
                    key={cell.id} 
                    className="border border-gray-200 h-12"
                    style={{ width: cell.column.getSize() }}
                  >
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
  );
} 