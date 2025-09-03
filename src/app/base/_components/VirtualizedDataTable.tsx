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
import { useView } from "./ViewContext";
import { useTableContext } from "./TableContext";
import { useSortContext } from "./SortContext";
import { useFilterContext } from "./FilterContext";
import { useSearchContext } from "./SearchContext";
import { useHiddenFields } from "./HiddenFieldsContext";
import { useLoadedRows } from "./LoadedRowsContext";

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
  const { filterRules, hydrated: filtersHydrated } = useFilterContext();
  const { currentViewId } = useView();
  const { searchResults, currentResultIndex } = useSearchContext();
  const { isFieldHidden, hydrated: hiddenHydrated } = useHiddenFields();
  const { setLoadedRows } = useLoadedRows();
  const inputRef = useRef<HTMLInputElement>(null);
  const currentValueRef = useRef<string>("");
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  
  // When switching views, clear cached pages and reset scroll so the table reflects that view's persisted rules
  useEffect(() => {
    if (!currentViewId) return;
    void utils.table.getTableDataPaginated.invalidate();
    requestAnimationFrame(() => {
      virtualizer.scrollToIndex(0, { align: 'start' });
    });
  }, [currentViewId]);

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

  // Wait for contexts to be hydrated before enabling queries
  const hasView = !!currentViewId;
  const metaEnabled = !!tableId && hasView;                     // <-- runs immediately for schema
  const rowsEnabled = !!tableId && hasView && filtersHydrated && hiddenHydrated; // rows wait for hydration

  // Get total row count for the scrollbar
  const { data: totalCountData } = api.table.getTableDataPaginated.useQuery(
    {
      tableId,
      viewId: currentViewId ?? undefined,
      page: 0,
      pageSize: 1,
      sortRules: sortRules.length ? sortRules.map(rule => ({ columnId: rule.columnId, direction: rule.direction })) : undefined,
      filterRules: filterRules.length ? filterRules.map(rule => ({ columnId: rule.columnId, operator: rule.operator as any, value: rule.value })) : undefined,
    },
    { 
      enabled: metaEnabled,      // <-- not blocked by hydration
      staleTime: 5000,
      refetchInterval: false,
      placeholderData: (prev) => prev, // Keep previous for a tick to avoid resize flicker
    }
  );

  // Keep total count stable to prevent virtualizer collapse during fast scrolling
  const [stableTotal, setStableTotal] = useState<number | null>(null);
  const prevTotalRef = useRef(0);
  
  const countForVirtualizer = stableTotal ?? prevTotalRef.current ?? 0;
  const totalRows = countForVirtualizer;

  // Measure the table container's offset from the top of the page
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const getOffsetTop = () => {
      // Robustly accumulate offsetTop up the offsetParent chain
      let y = 0, n: HTMLElement | null = el;
      while (n) { y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
      return y;
    };
    const update = () => setScrollMargin(getOffsetTop());
    update(); // on mount

    const ro = new ResizeObserver(update); // layout changes
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
    overscan: 48,
    scrollMargin,
  });

  // Calculate which pages we need based on virtualizer range
  const virtualizerRange = virtualizer.getVirtualItems();
  const startIndex = virtualizerRange[0]?.index ?? 0;
  const endIndex = virtualizerRange[virtualizerRange.length - 1]?.index ?? 0;
  
  const startPage = Math.floor(startIndex / PAGE_SIZE);
  const endPage = Math.floor(endIndex / PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const safeStartPage = Math.min(Math.max(0, startPage), totalPages - 1);
  const safeEndPage = Math.min(Math.max(0, endPage), totalPages - 1);

  // Debug logging
  console.log('Virtualizer range:', { startIndex, endIndex, startPage, endPage, totalRows, virtualizerRange: virtualizerRange.length });

  // Remove manual measure call - it can cause jitter during fast scrolling

  // Remove manual scroll listener - useWindowVirtualizer handles it automatically

  // Load current page data (the page containing the visible rows)
  const { data: tableData, isLoading } = api.table.getTableDataPaginated.useQuery(
    {
      tableId,
      viewId: currentViewId ?? undefined,
      page: safeStartPage,
      pageSize: PAGE_SIZE,
      sortRules: sortRules.length ? sortRules.map(rule => ({ columnId: rule.columnId, direction: rule.direction })) : undefined,
      filterRules: filterRules.length ? filterRules.map(rule => ({ columnId: rule.columnId, operator: rule.operator as any, value: rule.value })) : undefined,
    },
    { 
      enabled: rowsEnabled && safeStartPage >= 0,
      staleTime: 600000,
      refetchOnWindowFocus: false,
      placeholderData: (prev) => prev, // Keep previous page data to prevent unmounting
    }
  );

  // Load the page that contains the tail of the visible window
  const needEndPage = safeEndPage > safeStartPage;
  const { data: endPageData } = api.table.getTableDataPaginated.useQuery(
    {
      tableId,
      viewId: currentViewId ?? undefined,
      page: safeEndPage,
      pageSize: PAGE_SIZE,
      sortRules: sortRules.length ? sortRules.map(rule => ({ columnId: rule.columnId, direction: rule.direction })) : undefined,
      filterRules: filterRules.length ? filterRules.map(rule => ({ columnId: rule.columnId, operator: rule.operator as any, value: rule.value })) : undefined,
    },
    { 
      enabled: rowsEnabled && needEndPage,
      staleTime: 600000,
      refetchOnWindowFocus: false,
      placeholderData: (prev) => prev, // Keep previous page data to prevent unmounting
    }
  );

  // Load the page that contains the tail of the visible window
  const needMidPage = safeEndPage - safeStartPage >= 2;
  const midPage = safeStartPage + 1;
  const { data: midPageData } = api.table.getTableDataPaginated.useQuery(
    {
      tableId,
      viewId: currentViewId ?? undefined,
      page: midPage,
      pageSize: PAGE_SIZE,
      sortRules: sortRules.length ? sortRules.map(rule => ({ columnId: rule.columnId, direction: rule.direction })) : undefined,
      filterRules: filterRules.length ? filterRules.map(rule => ({ columnId: rule.columnId, operator: rule.operator as any, value: rule.value })) : undefined,
    },
    { 
      enabled: rowsEnabled && needMidPage,
      staleTime: 600000,
      refetchOnWindowFocus: false,
      placeholderData: (prev) => prev, // Keep previous page data to prevent unmounting
    }
  );

  // Load previous page for smooth scrolling
  const { data: prevPageData } = api.table.getTableDataPaginated.useQuery(
    {
      tableId,
      viewId: currentViewId ?? undefined,
      page: Math.max(0, safeStartPage - 1),
      pageSize: PAGE_SIZE,
      sortRules: sortRules.length ? sortRules.map(rule => ({ columnId: rule.columnId, direction: rule.direction })) : undefined,
      filterRules: filterRules.length ? filterRules.map(rule => ({ columnId: rule.columnId, operator: rule.operator as any, value: rule.value })) : undefined,
    },
    { 
      enabled: rowsEnabled && safeStartPage > 0,
      staleTime: 600000,
      refetchOnWindowFocus: false,
      placeholderData: (prev) => prev, // Keep previous page data to prevent unmounting
    }
  );

  // Reset cached pages when the table/view/sort/filter signature changes
  const sortFilterSig = useMemo(
    () => JSON.stringify({
      tableId,
      viewId: currentViewId ?? undefined,
      sort: sortRules.map(r => ({ columnId: r.columnId, direction: r.direction })),
      filter: filterRules.map(r => ({ columnId: r.columnId, operator: r.operator, value: r.value })),
    }),
    [tableId, currentViewId, sortRules, filterRules]
  );
  const prevSigRef = useRef(sortFilterSig);
  useEffect(() => {
    if (prevSigRef.current !== sortFilterSig) {
      // Invalidate cached pages for this table/view; they will be refetched with new sort/filter
      void utils.table.getTableDataPaginated.invalidate();
      prevSigRef.current = sortFilterSig;
    }
  }, [sortFilterSig, utils.table.getTableDataPaginated]);

  // Update stable total when count changes - prefer page query results over count query
  useEffect(() => {
    const t =
      tableData?.pagination?.totalRows ??
      prevPageData?.pagination?.totalRows ??
      midPageData?.pagination?.totalRows ??
      endPageData?.pagination?.totalRows ??
      totalCountData?.pagination?.totalRows;

    if (typeof t === 'number') {
      if (stableTotal !== t) setStableTotal(t);
      prevTotalRef.current = t;
    }
  }, [
    tableData?.pagination?.totalRows,
    prevPageData?.pagination?.totalRows,
    midPageData?.pagination?.totalRows,
    endPageData?.pagination?.totalRows,
    totalCountData?.pagination?.totalRows,
    stableTotal
  ]);

  // Reset scroll to top when sort/filter changes (with safety guards)
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { 
      firstRun.current = false; 
      return; 
    }
    const id = setTimeout(() => {
      virtualizer?.scrollToIndex(0, { align: 'start' });
    }, 150);
    return () => clearTimeout(id);
  }, [sortFilterSig, virtualizer]);

  // Keep last known table schema so the table shell never unmounts during page transitions
  type TableMeta = NonNullable<typeof tableData>["table"];
  const tableMetaRef = useRef<TableMeta | null>(null);
  useEffect(() => {
    if (totalCountData?.table) tableMetaRef.current = totalCountData.table; // <-- NEW: schema probe fills this first
    if (tableData?.table) tableMetaRef.current = tableData.table;
    if (prevPageData?.table) tableMetaRef.current = prevPageData.table;
    if (midPageData?.table) tableMetaRef.current = midPageData.table;
    if (endPageData?.table) tableMetaRef.current = endPageData.table;
  }, [
    totalCountData?.table,
    tableData?.table,
    prevPageData?.table,
    midPageData?.table,
    endPageData?.table,
  ]);
  const tableMeta = tableMetaRef.current;

  // Combine all loaded data (current + middle + end + previous pages)
  const allRows = useMemo(() => {
    const rows: Array<{
      id: string;
      order: number;
      cells: Array<{ columnId: string; value: string; id?: string }>;
    }> = [];
    if (prevPageData?.rows) rows.push(...prevPageData.rows);
    if (tableData?.rows) rows.push(...tableData.rows);
    if (midPageData?.rows) rows.push(...midPageData.rows);
    if (endPageData?.rows) rows.push(...endPageData.rows);
    return rows;
  }, [tableData?.rows, midPageData?.rows, endPageData?.rows, prevPageData?.rows]);

  // Map absolute virtual index -> row from loaded pages, respecting server sort order
  const indexToRow = useMemo(() => {
    const map = new Map<number, typeof allRows[number]>();
    const attach = (data?: typeof tableData) => {
      const page = data?.pagination?.page;
      if (!data?.rows || typeof page !== 'number') return;
      for (let i = 0; i < data.rows.length; i++) {
        map.set(page * PAGE_SIZE + i, data.rows[i]!);
      }
    };
    attach(prevPageData);
    attach(tableData);
    attach(midPageData);
    attach(endPageData);
    return map;
  }, [
    prevPageData?.pagination?.page,
    tableData?.pagination?.page,
    midPageData?.pagination?.page,
    endPageData?.pagination?.page,
    prevPageData?.rows,
    tableData?.rows,
    midPageData?.rows,
    endPageData?.rows,
  ]);

  // Update loaded rows context with current data
  useEffect(() => {
    if (tableData?.table && allRows.length > 0) {
      const loadedRowsData = allRows.map(row => ({
        id: row.id,
        order: row.order,
        cells: row.cells.map(cell => ({
          columnId: cell.columnId,
          value: cell.value,
          column: {
            id: cell.columnId,
            name: tableMeta?.columns.find(col => col.id === cell.columnId)?.name ?? ''
          }
        }))
      }));
      setLoadedRows(loadedRowsData);
    }
  }, [allRows, tableData?.table, setLoadedRows]);

  // No longer rely on base row.order; use absolute index mapping to reflect sorted order

  const updateCellMutation = api.table.updateCell.useMutation({
    onMutate: async ({ tableId, rowId, columnId, value }) => {
      // Cancel any outgoing refetches
      await utils.table.getTableDataPaginated.cancel({ 
        tableId,
        viewId: currentViewId ?? undefined,
        page: startPage,
        pageSize: PAGE_SIZE,
      });
      
      // Update local state immediately for instant UI feedback
      const cellKey = `${rowId}-${columnId}`;
      setLocalCellValues(prev => ({ ...prev, [cellKey]: value }));
      
      // Snapshot the previous value
      const previousData = utils.table.getTableDataPaginated.getData({ 
        tableId,
        viewId: currentViewId ?? undefined,
        page: startPage,
        pageSize: PAGE_SIZE,
      });
      return { previousData };
    },
    onError: (err, { tableId }, context) => {
      // Roll back on error
      if (context?.previousData) {
        utils.table.getTableDataPaginated.setData({ 
          tableId,
          viewId: currentViewId ?? undefined,
          page: startPage,
          pageSize: PAGE_SIZE,
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
        viewId: currentViewId ?? undefined,
        page: startPage,
        pageSize: PAGE_SIZE,
        sortRules: sortRules.map(rule => ({
          columnId: rule.columnId,
          direction: rule.direction
        })),
        filterRules: filterRules.map(rule => ({
          columnId: rule.columnId,
          operator: rule.operator as "contains" | "does not contain" | "is" | "is not" | "is empty" | "is not empty",
          value: rule.value
        }))
      });
      
      // Snapshot the previous value
      const previousData = utils.table.getTableDataPaginated.getData({ 
        tableId,
        viewId: currentViewId ?? undefined,
        page: startPage,
        pageSize: PAGE_SIZE,
        sortRules: sortRules.map(rule => ({
          columnId: rule.columnId,
          direction: rule.direction
        })),
        filterRules: filterRules.map(rule => ({
          columnId: rule.columnId,
          operator: rule.operator as "contains" | "does not contain" | "is" | "is not" | "is empty" | "is not empty",
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
          viewId: currentViewId ?? undefined,
          page: startPage,
          pageSize: PAGE_SIZE,
          sortRules: sortRules.map(rule => ({
            columnId: rule.columnId,
            direction: rule.direction
          })),
          filterRules: filterRules.map(rule => ({
            columnId: rule.columnId,
            operator: rule.operator as "contains" | "does not contain" | "is" | "is not" | "is empty" | "is not empty",
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

  const reorderRowsMutation = api.table.reorderRows.useMutation({
    onSuccess: () => {
      console.log("Rows reordered, invalidating cache...");
      void utils.table.getTableDataPaginated.invalidate({ tableId, viewId: currentViewId ?? undefined });
    },
  });

  // Handle row reordering
  const handleMoveRow = useCallback((rowId: string, direction: 'up' | 'down') => {
    if (!currentViewId || !allRows) return;
    
    const currentIndex = allRows.findIndex(row => row.id === rowId);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= allRows.length) return;
    
    const targetRowId = allRows[targetIndex]?.id;
    if (!targetRowId) return;
    
    console.log(`Moving row ${rowId} ${direction} to swap with ${targetRowId}`);
    reorderRowsMutation.mutate({
      viewId: currentViewId ?? undefined,
      tableId,
      aRowId: rowId,
      bRowId: targetRowId,
    });
  }, [currentViewId, allRows, reorderRowsMutation, tableId]);

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
    if (!tableMeta || !allRows) return [];

    return allRows.map((row) => {
      const rowRecord: RowRecord = {};
      
      // Add row number column - use virtual index instead of global row.order
      rowRecord['row-number'] = {
        value: '', // Will be set by the column renderer using virtual index
        cellId: `row-${row.id}`,
        columnId: 'row-number',
        rowId: row.id
      };
      
      // Add data columns
      tableMeta.columns.forEach((column) => {
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
  }, [tableMeta, allRows, isFieldHidden]);





  // Build columns definition
  const columns = useMemo(() => {
    if (!tableData?.table) return [];

    // Row number column
    const rowNumberColumn: ColumnDef<RowRecord> = {
      id: 'row-number',
             header: () => <div className="px-2 py-1 font-medium text-gray-700">#</div>,
       accessorKey: 'row-number',
       cell: ({ row }) => {
         // Get the row ID from the allRows array using the virtual index
         const rowData = allRows?.[row.index];
         const rowId = rowData?.id;
         const isFirstRow = row.index === 0;
         const isLastRow = row.index === (allRows?.length ?? 0) - 1;
         
         // Don't render move buttons if we don't have a valid row ID
         if (!rowId) {
           return (
             <div className="px-2 py-1 text-xs text-gray-500 font-mono">
               {row.index + 1}
             </div>
           );
         }
         
         return (
           <div className="px-2 py-1 text-xs text-gray-500 font-mono flex items-center gap-1">
             <span>{row.index + 1}</span>
             <div className="flex flex-col">
               <button
                 onClick={() => handleMoveRow(rowId, 'up')}
                 disabled={isFirstRow}
                 className={`w-3 h-3 text-xs ${isFirstRow ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700 cursor-pointer'}`}
                 title="Move row up"
               >
                 ↑
               </button>
               <button
                 onClick={() => handleMoveRow(rowId, 'down')}
                 disabled={isLastRow}
                 className={`w-3 h-3 text-xs ${isLastRow ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700 cursor-pointer'}`}
                 title="Move row down"
               >
                 ↓
               </button>
             </div>
           </div>
         );
       },
             size: 40,
       minSize: 40,
       maxSize: 40,
    };

           // Data columns
  const dataColumns: ColumnDef<RowRecord>[] = tableMeta?.columns
    ?.filter(column => !isFieldHidden(column.id))
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
       })) ?? [];

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

  // Only show empty state if the table really has 0 rows
  if (totalRows === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No data available</p>
          <button
            onClick={() => {
              if (!tableId) return;
              void addRowMutation.mutate({ tableId });
            }}
            disabled={addRowMutation.isPending}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {addRowMutation.isPending ? "Adding..." : "Add your first row"}
          </button>
        </div>
      </div>
    );
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
          {tableMeta?.columns
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
                         width: `${40 + (tableMeta?.columns?.filter(col => !isFieldHidden(col.id)).length ?? 0) * 250}px`,
            position: 'relative',
            overflow: 'hidden', // Prevent any internal scrolling
            maxHeight: 'none' // Ensure no max-height constraints
          }}
        >
           {virtualizer.getVirtualItems().map((virtualRow) => {
             const rowIndex = virtualRow.index;
             const row = indexToRow.get(rowIndex);
             
             if (!row) {
               return (
                 <div
                   key={virtualRow.index}
                   className="absolute top-0 left-0 w-full"
                   style={{
                     height: `${virtualRow.size}px`,
                     transform: `translateY(${virtualRow.start}px)`,
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
                   transform: `translateY(${virtualRow.start}px)`,
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
                     {tableMeta?.columns
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
                             className="flex items-center"
                                                           style={{ 
                                                             width: '250px', 
                                                             minWidth: '250px', 
                                                             maxWidth: '250px',
                                                             borderRight: '1px solid #e5e7eb' // Explicit right border
                                                           }}
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
                   style={{ width: `${40 + (tableMeta?.columns?.filter(col => !isFieldHidden(col.id)).length ?? 0) * 250}px` }}
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
       
                               {/* Status bar removed - no longer showing to users */}
       
       
      </div>
     </div>
   );
 }
