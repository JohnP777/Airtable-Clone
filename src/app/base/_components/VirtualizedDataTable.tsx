"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Column,
  type Row,
} from "@tanstack/react-table";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

import { api } from "../../../trpc/react";
import { useTableContext } from "./TableContext";
import { useSortContext } from "./SortContext";
import { useFilterContext } from "./FilterContext";
import { useSearchContext } from "./SearchContext";
import { useHiddenFields } from "./HiddenFieldsContext";

// Added strong types for table row shape and cell value
type CellValue = { value: string; cellId?: string; columnId: string; rowId: string };
type RowRecord = Record<string, CellValue>;

interface VirtualizedDataTableProps {
  tableId: string;
}

const ROW_HEIGHT = 36; // 36px for smaller rows
const PAGE_SIZE = 100; // Load 100 rows per page (backend limit)

export function VirtualizedDataTable({ tableId }: VirtualizedDataTableProps) {
  const utils = api.useUtils();
  const { sortRules } = useSortContext();
  const { filterRules } = useFilterContext();
  const { searchResults, currentResultIndex } = useSearchContext();
  const { isFieldHidden } = useHiddenFields();
  const inputRef = useRef<HTMLInputElement>(null);
  const currentValueRef = useRef<string>("");
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
    value: string;
  } | null>(null);

  const [editingColumn, setEditingColumn] = useState<{
    columnId: string;
    name: string;
  } | null>(null);

  // Local state to track cell values for immediate updates
  const [localCellValues, setLocalCellValues] = useState<Record<string, string>>({});

  // Get total row count for the scrollbar
  const { data: totalCountData } = api.table.getTableDataPaginated.useQuery(
    {
      tableId,
      page: 0,
      pageSize: 1,
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
    { 
      enabled: !!tableId,
      staleTime: 30000, // Cache total count for 30 seconds
    }
  );

  // Keep total count stable to prevent virtualizer collapse during fast scrolling
  const [stableTotal, setStableTotal] = useState<number | null>(null);
  const prevTotalRef = useRef(0);
  
  useEffect(() => {
    const t = totalCountData?.pagination?.totalRows;
    if (typeof t === 'number') { 
      prevTotalRef.current = t; 
      setStableTotal(t); 
    }
  }, [totalCountData?.pagination?.totalRows]);

  const countForVirtualizer = stableTotal ?? prevTotalRef.current ?? 0;
  const totalRows = countForVirtualizer;

  // Measure the table container's offset from the top of the page
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setScrollMargin(rect.top + window.scrollY);
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Use window virtualizer for proper page-level scrolling
  const virtualizer = useWindowVirtualizer({
    count: totalRows,
    estimateSize: () => ROW_HEIGHT,
    overscan: 50, // Increased overscan for smoother loading
    scrollMargin,
  });

  // Calculate which pages we need based on virtualizer range
  const virtualizerRange = virtualizer.getVirtualItems();
  const startIndex = virtualizerRange[0]?.index ?? 0;
  const endIndex = virtualizerRange[virtualizerRange.length - 1]?.index ?? 0;
  
  const startPage = Math.floor(startIndex / PAGE_SIZE);
  const endPage = Math.floor(endIndex / PAGE_SIZE);

  // Debug logging
  console.log('Virtualizer range:', { startIndex, endIndex, startPage, endPage, totalRows, virtualizerRange: virtualizerRange.length });

  // Remove manual measure call - it can cause jitter during fast scrolling

  // Remove manual scroll listener - useWindowVirtualizer handles it automatically

  // Load current page data (the page containing the visible rows)
  const { data: tableData, isLoading } = api.table.getTableDataPaginated.useQuery(
    {
      tableId,
      page: startPage,
      pageSize: PAGE_SIZE,
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
    { 
      enabled: !!tableId && totalRows > 0 && startPage >= 0,
      staleTime: 2000, // Reduced stale time for more responsive updates
      placeholderData: (prev) => prev, // Keep previous data while loading to prevent flicker
      refetchOnWindowFocus: false,
    }
  );

  // Load next page for smooth scrolling
  const { data: nextPageData } = api.table.getTableDataPaginated.useQuery(
    {
      tableId,
      page: endPage + 1,
      pageSize: PAGE_SIZE,
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
    { 
      enabled: !!tableId && totalRows > 0 && endPage + 1 < Math.ceil(totalRows / PAGE_SIZE),
      staleTime: 2000, // Reduced stale time for more responsive updates
      placeholderData: (prev) => prev, // Keep previous data while loading to prevent flicker
      refetchOnWindowFocus: false,
    }
  );

  // Load previous page for smooth scrolling
  const { data: prevPageData } = api.table.getTableDataPaginated.useQuery(
    {
      tableId,
      page: Math.max(0, startPage - 1),
      pageSize: PAGE_SIZE,
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
    { 
      enabled: !!tableId && totalRows > 0 && startPage > 0,
      staleTime: 2000, // Reduced stale time for more responsive updates
      placeholderData: (prev) => prev, // Keep previous data while loading to prevent flicker
      refetchOnWindowFocus: false,
    }
  );

  // Combine all loaded data (current + next + previous pages)
  const allRows = useMemo(() => {
    const rows: Array<{
      id: string;
      order: number;
      cells: Array<{ columnId: string; value: string; id?: string }>;
    }> = [];
    
    // Add previous page rows if available
    if (prevPageData?.rows) {
      rows.push(...prevPageData.rows);
    }
    
    // Add current page rows
    if (tableData?.rows) {
      rows.push(...tableData.rows);
    }
    
    // Add next page rows if available
    if (nextPageData?.rows) {
      rows.push(...nextPageData.rows);
    }
    
    return rows;
  }, [tableData?.rows, nextPageData?.rows, prevPageData?.rows]);

  const updateCellMutation = api.table.updateCell.useMutation({
    onMutate: async ({ tableId, rowId, columnId, value }) => {
      // Cancel any outgoing refetches
      await utils.table.getTableDataPaginated.cancel({ 
        tableId,
        page: startPage,
        pageSize: PAGE_SIZE,
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
      const previousData = utils.table.getTableDataPaginated.getData({ 
        tableId,
        page: startPage,
        pageSize: PAGE_SIZE,
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
      // Roll back on error
      if (context?.previousData) {
        utils.table.getTableDataPaginated.setData({ 
          tableId,
          page: startPage,
          pageSize: PAGE_SIZE,
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
    onSettled: () => {
      // Invalidate cache after mutation
      void utils.table.getTableDataPaginated.invalidate();
    },
  });

  const updateColumnMutation = api.table.updateColumn.useMutation({
    onMutate: async ({ columnId, name }) => {
      // Cancel any outgoing refetches
      await utils.table.getTableDataPaginated.cancel({ 
        tableId,
        page: startPage,
        pageSize: PAGE_SIZE,
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
        page: startPage,
        pageSize: PAGE_SIZE,
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
    onError: (err, { columnId }, context) => {
      // Roll back on error
      if (context?.previousData) {
        utils.table.getTableDataPaginated.setData({ 
          tableId,
          page: startPage,
          pageSize: PAGE_SIZE,
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
    onSettled: () => {
      // Invalidate cache after mutation
      void utils.table.getTableDataPaginated.invalidate();
    },
  });

  const addColumnMutation = api.table.addColumn.useMutation({
    onSuccess: () => {
      // Invalidate cache after adding column
      void utils.table.getTableDataPaginated.invalidate();
    },
  });

  const addRowMutation = api.table.addRow.useMutation({
    onSuccess: () => {
      console.log("Single row added, invalidating cache...");
      void utils.table.getTableDataPaginated.invalidate();
    },
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

  // Transform table data to the format expected by the table
  const tableRows = useMemo(() => {
    if (!tableData?.table || !allRows) return [];

    return allRows.map((row) => {
      const rowRecord: RowRecord = {};
      
      // Add row number column
      rowRecord['row-number'] = {
        value: (row.order + 1).toString(),
        cellId: `row-${row.id}`,
        columnId: 'row-number',
        rowId: row.id
      };
      
      // Add data columns
      tableData.table.columns.forEach((column) => {
        if (isFieldHidden(column.id)) return;
        
        const cell = row.cells.find((c: { columnId: string }) => c.columnId === column.id);
        const cellValue = cell?.value ?? '';
        
        rowRecord[column.id] = {
          value: cellValue,
          cellId: cell?.id,
          columnId: column.id,
          rowId: row.id
        };
      });
      
      return rowRecord;
    });
  }, [tableData?.table, allRows, isFieldHidden]);





  // Build columns definition
  const columns = useMemo(() => {
    if (!tableData?.table) return [];

    // Row number column
    const rowNumberColumn: ColumnDef<RowRecord> = {
      id: 'row-number',
             header: () => <div className="px-2 py-1 font-medium text-gray-700">#</div>,
       accessorKey: 'row-number',
       cell: ({ row }) => {
         const cellData = row.getValue<CellValue>('row-number');
         return (
           <div className="px-2 py-1 text-xs text-gray-500 font-mono">
             {cellData.value}
           </div>
         );
       },
             size: 40,
       minSize: 40,
       maxSize: 40,
    };

         // Data columns
     const dataColumns: ColumnDef<RowRecord>[] = tableData.table.columns
       .filter(column => !isFieldHidden(column.id))
       .map((column) => ({
         id: column.id,
         header: () => (
                       <div 
              data-field-id={column.id}
              className={`px-2 py-1 font-medium text-gray-700 cursor-pointer select-none ${
                isFieldHighlighted(column.id) ? 'bg-orange-100' : ''
              } ${isCurrentFieldResult(column.id) ? 'bg-orange-300' : ''}`}
             onDoubleClick={() => {
               setEditingColumn({
                 columnId: column.id,
                 name: column.name,
               });
             }}
           >
             {editingColumn?.columnId === column.id ? (
               <input
                 type="text"
                 defaultValue={editingColumn.name}
                 onBlur={() => {
                   if (editingColumn) {
                     void updateColumnMutation.mutate({
                       columnId: editingColumn.columnId,
                       name: editingColumn.name
                     });
                     setEditingColumn(null);
                   }
                 }}
                 onKeyDown={(e) => {
                   if (e.key === "Enter") {
                     if (editingColumn) {
                       void updateColumnMutation.mutate({
                         columnId: editingColumn.columnId,
                         name: editingColumn.name
                       });
                       setEditingColumn(null);
                     }
                   } else if (e.key === "Escape") {
                     setEditingColumn(null);
                   }
                 }}
                 className="w-full bg-transparent border-none outline-none focus:ring-0"
                 autoFocus
               />
             ) : (
               <div className="flex items-center gap-2">
                 <span className="text-xs text-gray-400">
                   {column.type === 'text' ? 'A' : column.type === 'number' ? '#' : '?'}
                 </span>
                 {column.name}
               </div>
             )}
           </div>
         ),
         accessorKey: column.id,
         cell: ({ row, column: col }: { row: Row<RowRecord>; column: Column<RowRecord, unknown> }) => {
           const cellData = row.getValue<CellValue>(col.id);
           const isEditing = editingCell?.rowId === cellData.rowId && editingCell?.columnId === cellData.columnId;

           const isHighlighted = isCellHighlighted(cellData.rowId, cellData.columnId);
           const isCurrent = isCurrentSearchResult(cellData.rowId, cellData.columnId);
           
           return (
             <div 
               data-row-id={cellData.rowId}
               data-column-id={cellData.columnId}
               className={`px-2 py-1 cursor-pointer w-full h-full flex items-center pointer-events-none ${
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
                     currentValueRef.current = e.target.value;
                   }}
                   onBlur={() => {
                     if (editingCell) {
                       const finalValue = currentValueRef.current;
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
                     currentValueRef.current = e.target.value;
                   }}
                 />
               ) : (
                                   <div className="w-full h-full pointer-events-auto overflow-hidden text-ellipsis whitespace-nowrap flex items-center">
                    <span className="truncate block w-full">
                      {localCellValues[`${cellData.rowId}-${cellData.columnId}`] ?? cellData.value}
                    </span>
                  </div>
               )}
             </div>
           );
         },
                                                           size: 250, // Fixed width for all data columns
                    minSize: 250,
                    maxSize: 250,
       }));

    // Return row number column + data columns
    return [rowNumberColumn, ...dataColumns];
  }, [tableData, editingColumn, editingCell, updateColumnMutation, updateCellMutation, tableId, localCellValues, isCellHighlighted, isCurrentSearchResult, isFieldHighlighted, isCurrentFieldResult, isFieldHidden]);

  const table = useReactTable({
    data: tableRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
  });

  // Don't return null on loading - keep the table mounted to prevent layout collapse
  // The loading state is handled by showing "Loading row..." placeholders in the rows

  // If no data and no rows, show empty table structure
  if (!tableData && totalRows === 0) {
    return (
      <div className="w-full">
        <table className="border-collapse border border-gray-200 table-fixed">
          <thead className="bg-gray-50 sticky top-0 z-10 bg-white">
                         <tr className="h-9">
                               <th className="border border-gray-200 h-9" style={{ width: '40px' }}>
                 <div className="px-2 py-1 font-medium text-gray-700">#</div>
               </th>
                              <th className="border border-gray-200 bg-gray-50 w-8 h-9">
                 <button
                   onClick={() => void addColumnMutation.mutate({ tableId })}
                   className="w-full h-full px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-xs"
                 >
                   +
                 </button>
               </th>
            </tr>
          </thead>
        </table>
        
        {/* Empty table body */}
        <div className="border border-gray-200 border-t-0 h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
        
        {/* Add row button */}
        <div className="border border-gray-200 border-t-0 bg-gray-50 h-9 flex items-center justify-center">
          <button
            onClick={() => {
              if (!tableId) return;
              void addRowMutation.mutate({ tableId });
            }}
            disabled={addRowMutation.isPending}
            className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Add a new row"
          >
            {addRowMutation.isPending ? "Adding..." : "+"}
          </button>
        </div>
      </div>
    );
  }

  if (!tableData) {
    return <div className="flex items-center justify-center h-64">No data available</div>;
  }

  return (
    <div className="w-full overflow-hidden">
                   {/* Fixed Table Header */}
      <div className="fixed top-28 left-70 z-10 bg-white border border-gray-200 border-b-0">
        <div className="flex">
          {/* Row number column header */}
          <div className="border border-gray-200 h-9 px-2 py-1 flex items-center justify-center" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>
            <div className="font-medium text-gray-700">#</div>
          </div>
          
          {/* Data column headers */}
          {tableData.table.columns
            .filter(column => !isFieldHidden(column.id))
            .map((column) => (
              <div 
                key={column.id}
                data-field-id={column.id}
                className={`border border-gray-200 h-9 px-2 py-1 flex items-center cursor-pointer select-none ${
                  isFieldHighlighted(column.id) ? 'bg-orange-100' : ''
                } ${isCurrentFieldResult(column.id) ? 'bg-orange-300' : ''}`}
                style={{ width: '250px', minWidth: '250px', maxWidth: '250px' }}
                onDoubleClick={() => {
                  setEditingColumn({
                    columnId: column.id,
                    name: column.name,
                  });
                }}
              >
                {editingColumn?.columnId === column.id ? (
                  <input
                    type="text"
                    defaultValue={editingColumn.name}
                    onBlur={() => {
                      if (editingColumn) {
                        void updateColumnMutation.mutate({
                          columnId: editingColumn.columnId,
                          name: editingColumn.name
                        });
                        setEditingColumn(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (editingColumn) {
                          void updateColumnMutation.mutate({
                            columnId: editingColumn.columnId,
                            name: editingColumn.name
                          });
                          setEditingColumn(null);
                        }
                      } else if (e.key === "Escape") {
                        setEditingColumn(null);
                      }
                    }}
                    className="w-full bg-transparent border-none outline-none focus:ring-0"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {column.type === 'text' ? 'A' : column.type === 'number' ? '#' : '?'}
                    </span>
                    {column.name}
                  </div>
                )}
              </div>
            ))}
          
          {/* Add column button */}
          <div className="border border-gray-200 bg-gray-50 h-9 flex items-center justify-center" style={{ width: '32px', minWidth: '32px', maxWidth: '32px' }}>
            <button
              onClick={() => void addColumnMutation.mutate({ tableId })}
              className="w-full h-full px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-xs"
            >
              +
            </button>
          </div>
        </div>
      </div>
      
                   {/* Table Content with margin-top to account for fixed header */}
      <div style={{ marginTop: '20px', marginLeft: '40px', overflow: 'hidden' }}>
      
                                 {/* Virtualized table body using main page scroll */}
        <div 
          ref={listRef}
          className="border-l border-b border-gray-200"
          style={{ 
            height: `${virtualizer.getTotalSize()}px`,
            width: `${40 + (tableData.table.columns.filter(col => !isFieldHidden(col.id)).length * 250)}px`,
            position: 'relative',
            overflow: 'hidden', // Prevent any internal scrolling
            maxHeight: 'none' // Ensure no max-height constraints
          }}
        >
           {virtualizer.getVirtualItems().map((virtualRow) => {
             const rowIndex = virtualRow.index;
             
             // Calculate which page this row belongs to
             const targetPage = Math.floor(rowIndex / PAGE_SIZE);
             
             // Find the row data in our loaded pages
             const row = allRows.find(r => {
               const rowPage = Math.floor((r.order) / PAGE_SIZE);
               return rowPage === targetPage && (r.order) === rowIndex;
             });
             
             if (!row) {
               return (
                 <div
                   key={virtualRow.index}
                   className="absolute top-0 left-0 w-full"
                   style={{
                     height: `${virtualRow.size}px`,
                     transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                   }}
                 >
                   <div className="h-9 border-b border-gray-200 bg-gray-50 flex items-center justify-center text-gray-500">
                     Loading row {rowIndex + 1}...
                   </div>
                 </div>
               );
             }

             return (
               <div
                 key={virtualRow.index}
                 className="absolute top-0 left-0 w-full"
                 style={{
                   height: `${virtualRow.size}px`,
                   transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                 }}
               >
                                    <div className="h-9 border-b border-gray-200 hover:bg-gray-100 transition-colors duration-150 flex">
                     {/* Row number */}
                     <div className="border-r border-gray-200 flex items-center justify-center" style={{ width: '40px' }}>
                       <div className="px-2 py-1 text-xs text-gray-500 font-mono">
                         {rowIndex + 1}
                       </div>
                     </div>
                   
                                        {/* Data cells */}
                     {tableData.table.columns
                       .filter(column => !isFieldHidden(column.id))
                       .map((column) => {
                         const cell = row.cells.find((c: { columnId: string }) => c.columnId === column.id);
                         const cellValue = cell?.value ?? '';
                         
                         const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
                         const isHighlighted = isCellHighlighted(row.id, column.id);
                         const isCurrent = isCurrentSearchResult(row.id, column.id);
                         
                         return (
                           <div 
                             key={column.id}
                             data-row-id={row.id}
                             data-column-id={column.id}
                             className="border-r border-gray-200 flex items-center"
                                                           style={{ width: '250px', minWidth: '250px', maxWidth: '250px' }}
                           >
                                                        <div 
                               className={`px-2 py-1 cursor-pointer w-full h-full flex items-center pointer-events-none ${
                                 isCurrent ? 'bg-orange-300' : isHighlighted ? 'bg-orange-100' : ''
                               }`}
                             onDoubleClick={() => {
                               setEditingCell({
                                 rowId: row.id,
                                 columnId: column.id,
                                 value: localCellValues[`${row.id}-${column.id}`] ?? cellValue,
                               });
                             }}
                           >
                             {isEditing ? (
                               <input
                                 ref={inputRef}
                                 type="text"
                                 defaultValue={editingCell?.value ?? ""}
                                 onChange={(e) => {
                                   currentValueRef.current = e.target.value;
                                 }}
                                 onBlur={() => {
                                   if (editingCell) {
                                     const finalValue = currentValueRef.current;
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
                                   currentValueRef.current = e.target.value;
                                 }}
                               />
                             ) : (
                                                               <div className="w-full h-full pointer-events-auto overflow-hidden text-ellipsis whitespace-nowrap flex items-center">
                                  <span className="truncate block w-full">
                                    {localCellValues[`${row.id}-${column.id}`] ?? cellValue}
                                  </span>
                                </div>
                             )}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               );
             })}
        </div>
       
       {/* Add row button */}
       <div 
         className="border border-gray-200 border-t-0 bg-gray-50 h-9 flex items-center justify-center"
         style={{ width: `${40 + (tableData.table.columns.filter(col => !isFieldHidden(col.id)).length * 250)}px` }}
       >
         <button
           onClick={() => {
             if (!tableId) return;
             void addRowMutation.mutate({ tableId });
           }}
           disabled={addRowMutation.isPending}
           className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
           title="Add a new row"
         >
           {addRowMutation.isPending ? "Adding..." : "+"}
         </button>
       </div>
       
               {/* Status bar */}
        <div 
          className="border border-gray-200 border-t-0 bg-gray-50 px-4 py-2 text-sm text-gray-600"
          style={{ width: `${40 + (tableData.table.columns.filter(col => !isFieldHidden(col.id)).length * 250)}px` }}
        >
          Total: {totalRows.toLocaleString()}. 
          Visible: {startIndex + 1}-{Math.min(endIndex + 1, totalRows)}. 
          Loaded pages: {Math.ceil((endPage - startPage + 1) * PAGE_SIZE / PAGE_SIZE)}.
        </div>
       
       
      </div>
     </div>
   );
 }
