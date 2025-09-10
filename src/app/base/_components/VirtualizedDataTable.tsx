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
import { useViewSidebarVisibility } from "./ViewSidebarVisibilityContext";

// Added strong types for table row shape and cell value
type CellValue = { value: string; cellId?: string; columnId: string; rowId: string };
type RowRecord = Record<string, CellValue>;

interface VirtualizedDataTableProps {
  tableId: string;
}

const ROW_HEIGHT = 36; 
const PAGE_SIZE = 100; 

export function VirtualizedDataTable({ tableId }: VirtualizedDataTableProps) {
  const utils = api.useUtils();
  const { sortRules } = useSortContext();
  const { filterRules, hydrated: filtersHydrated } = useFilterContext();
  const { currentViewId } = useView();
  const { searchResults, currentResultIndex } = useSearchContext();
  const { isFieldHidden, hydrated: hiddenHydrated } = useHiddenFields();
  const { setLoadedRows } = useLoadedRows();
  const { isViewSidebarVisible } = useViewSidebarVisibility();
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

  // State for selected cell (for single-click selection)
  const [selectedCell, setSelectedCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);

  // State for selected column
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

  // State for column context menu
  const [contextMenu, setContextMenu] = useState<{
    columnId: string;
    x: number;
    y: number;
  } | null>(null);

  // State for row context menu
  const [rowContextMenu, setRowContextMenu] = useState<{
    rowId: string;
    x: number;
    y: number;
  } | null>(null);

  // State for new column dropdown
  const [showNewColumnDropdown, setShowNewColumnDropdown] = useState(false);
  const [newColumnType, setNewColumnType] = useState<'text' | 'number' | null>(null);
  const [newColumnName, setNewColumnName] = useState('');

  // Local state to track cell values for immediate/optimistic updates
  const [localCellValues, setLocalCellValues] = useState<Record<string, string>>({});
  
  // Local state to track column names for immediate/optimistic updates
  const [localColumnNames, setLocalColumnNames] = useState<Record<string, string>>({});

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
      filterRules: filterRules.length ? filterRules.map(rule => ({ columnId: rule.columnId, operator: rule.operator as any, value: rule.value, logicalOperator: rule.logicalOperator })) : undefined,
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
      filterRules: filterRules.length ? filterRules.map(rule => ({ columnId: rule.columnId, operator: rule.operator as any, value: rule.value, logicalOperator: rule.logicalOperator })) : undefined,
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
      filterRules: filterRules.length ? filterRules.map(rule => ({ columnId: rule.columnId, operator: rule.operator as any, value: rule.value, logicalOperator: rule.logicalOperator })) : undefined,
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
      filterRules: filterRules.length ? filterRules.map(rule => ({ columnId: rule.columnId, operator: rule.operator as any, value: rule.value, logicalOperator: rule.logicalOperator })) : undefined,
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
      filterRules: filterRules.length ? filterRules.map(rule => ({ columnId: rule.columnId, operator: rule.operator as any, value: rule.value, logicalOperator: rule.logicalOperator })) : undefined,
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
      filter: filterRules.map(r => ({ columnId: r.columnId, operator: r.operator, value: r.value, logicalOperator: r.logicalOperator })),
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
          value: rule.value,
          logicalOperator: rule.logicalOperator
        }))
      });
      
      // Update local column name immediately for instant UI feedback
      setLocalColumnNames(prev => ({ ...prev, [columnId]: name }));
      
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
          value: rule.value,
          logicalOperator: rule.logicalOperator
        }))
      });
      return { previousData, previousColumnName: tableMeta?.columns.find(col => col.id === columnId)?.name };
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
      // Roll back local column name
      if (context?.previousColumnName) {
        setLocalColumnNames(prev => ({ ...prev, [columnId]: context.previousColumnName! }));
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
      // Close dropdown and reset state
      setShowNewColumnDropdown(false);
      setNewColumnName('');
      setNewColumnType(null);
    },
  });

  const deleteColumnMutation = api.table.deleteColumn.useMutation({
    onMutate: async ({ columnId }) => {
      // Optimistically update the table schema to remove the column
      const currentData = utils.table.getTableDataPaginated.getData({ 
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
          value: rule.value,
          logicalOperator: rule.logicalOperator
        }))
      });
      
      if (currentData?.table) {
        const updatedTable = {
          ...currentData.table,
          columns: currentData.table.columns.filter(col => col.id !== columnId)
        };
        
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
            value: rule.value,
            logicalOperator: rule.logicalOperator
          }))
        }, {
          ...currentData,
          table: updatedTable
        });
      }
    },
    onSettled: () => {
      // Invalidate cache after mutation
      void utils.table.getTableDataPaginated.invalidate();
    },
  });

  const addRowMutation = api.table.addRow.useMutation({
    onSuccess: () => {
      console.log("Single row added, invalidating cache...");
      void utils.table.getTableDataPaginated.invalidate();
    },
  });

  const deleteRowMutation = api.table.deleteRow.useMutation({
    onMutate: async ({ rowId }) => {
      // Optimistically update the table data to remove the row
      const currentData = utils.table.getTableDataPaginated.getData({ 
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
          value: rule.value,
          logicalOperator: rule.logicalOperator
        }))
      });
      
      if (currentData?.rows) {
        const updatedRows = currentData.rows.filter(row => row.id !== rowId);
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
            value: rule.value,
            logicalOperator: rule.logicalOperator
          }))
        }, {
          ...currentData,
          rows: updatedRows
        });
      }
    },
    onSettled: () => {
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

  // New column dropdown handlers
  const handleOpenNewColumnDropdown = () => {
    setShowNewColumnDropdown(true);
    setNewColumnName('');
    setNewColumnType(null);
  };

  const handleCloseNewColumnDropdown = () => {
    setShowNewColumnDropdown(false);
    setNewColumnName('');
    setNewColumnType(null);
  };

  const handleSelectColumnType = (type: 'text' | 'number') => {
    setNewColumnType(type);
  };

  const handleCreateColumn = () => {
    if (tableId && newColumnType) {
      addColumnMutation.mutate({
        tableId,
        name: newColumnName.trim() || undefined,
        type: newColumnType
      });
    }
  };

  const handleNewColumnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCreateColumn();
    } else if (e.key === 'Escape') {
      handleCloseNewColumnDropdown();
    }
  };

  // Helper function to check if current cell is the active search result
  const isCurrentSearchResult = useCallback((rowId: string, columnId: string) => {
    if (searchResults.length === 0 || currentResultIndex >= searchResults.length) return false;
    const currentResult = searchResults[currentResultIndex];
    if (!currentResult) return false;
    return currentResult.type === "cell" && 
           currentResult.rowId === rowId && 
           currentResult.columnId === columnId;
  }, [searchResults, currentResultIndex]);

  // Helper function to get column type
  const getColumnType = (columnId: string): string => {
    return tableMeta?.columns?.find((col: any) => col.id === columnId)?.type ?? 'text';
  };

  // Helper function to validate number input
  const isValidNumberInput = (value: string): boolean => {
    if (value === '') return true; // Empty is valid
    return !isNaN(Number(value)) && isFinite(Number(value));
  };

  // Helper function to format number input (add .0 if no decimal point)
  const formatNumberInput = (value: string): string => {
    if (value === '') return value;
    if (!isValidNumberInput(value)) return value;
    
    // If it doesn't contain a decimal point, add .0
    if (!value.includes('.')) {
      return value + '.0';
    }
    return value;
  };

  // Function to scroll to keep selected cell visible (only if out of view)
  const scrollToSelectedCell = useCallback((rowId: string, columnId: string) => {
    // Find the cell element
    const cellElement = document.querySelector(
      `[data-row-id="${rowId}"][data-column-id="${columnId}"]`
    );
    
    if (cellElement) {
      // Check if the cell is already visible in the viewport
      const rect = cellElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Account for fixed headers - the table content starts below the headers
      const headerOffset = 132; // Height of fixed headers (top-22 = 88px + some margin)
      const effectiveViewportTop = headerOffset;
      const effectiveViewportBottom = viewportHeight;
      
      // Add a small margin to trigger scroll before hitting the exact edge
      const margin = 20; // 20px margin to trigger scroll slightly before the edge
      
      // Check if any part of the cell is outside or near the edge of the visible area
      const isOutOfView = 
        rect.top < (effectiveViewportTop + margin) || 
        rect.bottom > (effectiveViewportBottom - margin) ||
        rect.left < margin || 
        rect.right > (viewportWidth - margin);
      
      console.log('Cell visibility check:', {
        rowId,
        columnId,
        rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
        viewport: { top: effectiveViewportTop, bottom: effectiveViewportBottom, width: viewportWidth },
        isOutOfView
      });
      
      // Only scroll if the cell is out of view
      if (isOutOfView) {
        console.log('Scrolling to cell:', rowId, columnId);
        cellElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, []);

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

  // Keyboard navigation for cell selection
  useEffect(() => {
    // When editing a column header name, block global key handling entirely
    if (editingColumn) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // If editing, handle Tab key for saving and moving to next cell
      if (editingCell) {
        if (e.key === "Tab") {
          e.preventDefault();
          e.stopPropagation();
          
          // Save current cell
          const finalValue = currentValueRef.current;
          const columnType = getColumnType(editingCell.columnId);
          const formattedValue = columnType === 'number' ? formatNumberInput(finalValue) : finalValue;
          const cellKey = `${editingCell.rowId}-${editingCell.columnId}`;
          setLocalCellValues(prev => ({ ...prev, [cellKey]: formattedValue }));
          
          void updateCellMutation.mutate({
            tableId,
            rowId: editingCell.rowId,
            columnId: editingCell.columnId,
            value: formattedValue,
          });
          setEditingCell(null);
          
          // Move to next cell (same as Tab navigation logic)
          if (!tableMeta) return;
          const visibleColumns = tableMeta.columns.filter(c => !isFieldHidden(c.id));
          const rowIndex = allRows.findIndex(r => r.id === editingCell.rowId);
          const colIndex = visibleColumns.findIndex(c => c.id === editingCell.columnId);
          
          if (rowIndex !== -1 && colIndex !== -1) {
            let newRowIndex = rowIndex;
            let newColIndex = colIndex + 1;
            
            // If at last column, wrap to next row
            if (newColIndex >= visibleColumns.length) {
              newColIndex = 0;
              newRowIndex = rowIndex + 1;
            }
            
            // If we have a valid next row, move to it
            if (newRowIndex < allRows.length) {
              const newRowId = allRows[newRowIndex]!.id;
              const newColumnId = visibleColumns[newColIndex]!.id;
              setSelectedCell({
                rowId: newRowId,
                columnId: newColumnId
              });
              // Scroll to keep the selected cell visible
              scrollToSelectedCell(newRowId, newColumnId);
            }
          }
          return;
        }
        return; // Don't handle other keys when editing
      }
      
      if (!selectedCell || !tableMeta) return;

      const visibleColumns = tableMeta.columns.filter(c => !isFieldHidden(c.id));
      const rowIndex = allRows.findIndex(r => r.id === selectedCell.rowId);
      const colIndex = visibleColumns.findIndex(c => c.id === selectedCell.columnId);

      if (rowIndex === -1 || colIndex === -1) return;

      let newRowIndex = rowIndex;
      let newColIndex = colIndex;

      // Check if user typed any printable character to start editing
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        
        // Start editing the selected cell with the typed character
        const cellValue = localCellValues[`${selectedCell.rowId}-${selectedCell.columnId}`] ?? 
                         allRows[rowIndex]?.cells.find(c => c.columnId === selectedCell.columnId)?.value ?? "";
        
        // For number columns, only start editing if the character is valid
        const columnType = getColumnType(selectedCell.columnId);
        if (columnType === 'number' && !/[0-9.-]/.test(e.key)) {
          return; // Don't start editing for invalid number input
        }
        
        setEditingCell({
          rowId: selectedCell.rowId,
          columnId: selectedCell.columnId,
          value: e.key // Start with the typed character
        });
        currentValueRef.current = e.key; // Reset the ref to the typed character
        return;
      }

      // Enter -> start editing selected cell (if not already editing)
      if (e.key === "Enter") {
        e.preventDefault();
        
        // If any cell is being edited, skip starting a new edit here
        if (editingCell) {
          return;
        }

        // Start editing the selected cell
        const cellValue = localCellValues[`${selectedCell.rowId}-${selectedCell.columnId}`] ?? 
                         allRows[rowIndex]?.cells.find(c => c.columnId === selectedCell.columnId)?.value ?? "";
        setEditingCell({
          rowId: selectedCell.rowId,
          columnId: selectedCell.columnId,
          value: cellValue
        });
        currentValueRef.current = cellValue; // Reset the ref to the cell value
        return;
      }

      // Tab -> move selection right (or wrap to next row)
      if (e.key === "Tab") {
        e.preventDefault();
        setSelectedColumn(null); // Clear column selection when using Tab
        newColIndex = colIndex + 1;

        // If at last column, wrap to next row
        if (newColIndex >= visibleColumns.length) {
          newColIndex = 0;
          newRowIndex = rowIndex + 1;
        }

        // If we have a valid next row, move to it
        if (newRowIndex < allRows.length) {
          const newRowId = allRows[newRowIndex]!.id;
          const newColumnId = visibleColumns[newColIndex]!.id;
          setSelectedCell({
            rowId: newRowId,
            columnId: newColumnId
          });
          // Scroll to keep the selected cell visible
          scrollToSelectedCell(newRowId, newColumnId);
        }
        return;
      }

      // Arrow key navigation
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedColumn(null); // Clear column selection when using arrow keys

        switch (e.key) {
          case "ArrowUp":
            newRowIndex = Math.max(0, rowIndex - 1);
            break;
          case "ArrowDown":
            newRowIndex = Math.min(allRows.length - 1, rowIndex + 1);
            break;
          case "ArrowLeft":
            newColIndex = Math.max(0, colIndex - 1);
            break;
          case "ArrowRight":
            newColIndex = Math.min(visibleColumns.length - 1, colIndex + 1);
            break;
        }

        // Only update if we have a valid new position
        if (newRowIndex >= 0 && newRowIndex < allRows.length && 
            newColIndex >= 0 && newColIndex < visibleColumns.length) {
          const newRowId = allRows[newRowIndex]!.id;
          const newColumnId = visibleColumns[newColIndex]!.id;
          setSelectedCell({
            rowId: newRowId,
            columnId: newColumnId
          });
          // Scroll to keep the selected cell visible
          scrollToSelectedCell(newRowId, newColumnId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, allRows, tableMeta, isFieldHidden, editingCell, editingColumn, localCellValues, tableId, updateCellMutation, getColumnType, formatNumberInput, scrollToSelectedCell]);

  // Deselect cell when clicking outside the table
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if the click is outside any table cell
      const isTableCell = target.closest('[data-row-id][data-column-id]');
      const isTableHeader = target.closest('[data-field-id]');
      const isContextMenu = target.closest('[data-context-menu]');
      const isRowContextMenu = target.closest('[data-row-context-menu]');
      if (!isTableCell && !isTableHeader && !isContextMenu && !isRowContextMenu && (selectedCell || selectedColumn)) {
        setSelectedCell(null);
        setSelectedColumn(null);
      }
      // Close context menus when clicking outside
      if (!isContextMenu && contextMenu) {
        setContextMenu(null);
      }
      if (!isRowContextMenu && rowContextMenu) {
        setRowContextMenu(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [selectedCell, selectedColumn, contextMenu, rowContextMenu]);

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

  // Helper function to check if a row has a selected cell
  const isRowSelected = useCallback((rowId: string) => {
    return selectedCell?.rowId === rowId;
  }, [selectedCell]);

  // Helper function to check if a column is selected
  const isColumnSelected = useCallback((columnId: string) => {
    return selectedColumn === columnId;
  }, [selectedColumn]);

  // Helper function to check if a column is the primary field
  // For now, we'll consider the first column as primary
  const isPrimaryField = useCallback((columnId: string) => {
    return tableMeta?.columns.find(col => col.id === columnId) === tableMeta?.columns[0];
  }, [tableMeta]);

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
             header: () => <div className="px-2 py-1 font-medium text-gray-700 text-sm">
               <div className="w-3 h-3 border border-gray-400 rounded-sm"></div>
             </div>,
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
             size: 80,
       minSize: 80,
       maxSize: 80,
    };

           // Data columns
  const dataColumns: ColumnDef<RowRecord>[] = tableMeta?.columns
    ?.filter(column => !isFieldHidden(column.id))
    .map((column) => ({
         id: column.id,
         header: () => (
                       <div 
              data-field-id={column.id}
              className={`px-2 py-1 font-medium text-gray-700 text-sm cursor-pointer select-none ${
                isFieldHighlighted(column.id) ? 'bg-orange-100' : ''
              } ${isCurrentFieldResult(column.id) ? 'bg-orange-300' : ''} ${
                isColumnSelected(column.id) ? 'bg-blue-100' : ''
              }`}
             onClick={() => {
               setSelectedColumn(column.id);
               // Select the first data cell in this column
               if (allRows.length > 0) {
                 setSelectedCell({
                   rowId: allRows[0]!.id,
                   columnId: column.id
                 });
               }
             }}
             onDoubleClick={() => {
               setEditingColumn({
                 columnId: column.id,
                 name: localColumnNames[column.id] ?? column.name,
               });
             }}
             onContextMenu={(e) => {
               e.preventDefault();
               setContextMenu({
                 columnId: column.id,
                 x: e.clientX,
                 y: e.clientY
               });
             }}
           >
             {editingColumn?.columnId === column.id ? (
               <input
                 type="text"
                 value={editingColumn.name}
                 onChange={(e) => {
                   setEditingColumn(prev => prev ? { ...prev, name: e.target.value } : null);
                 }}
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
                 {localColumnNames[column.id] ?? column.name}
               </div>
             )}
           </div>
         ),
         accessorKey: column.id,
         cell: ({ row, column: col }: { row: Row<RowRecord>; column: Column<RowRecord, unknown> }) => {
           const cellData = row.getValue<CellValue>(col.id);
           const isEditing = editingCell?.rowId === cellData.rowId && editingCell?.columnId === cellData.columnId;
           const isSelected = selectedCell?.rowId === cellData.rowId && selectedCell?.columnId === cellData.columnId;

           const isHighlighted = isCellHighlighted(cellData.rowId, cellData.columnId);
           const isCurrent = isCurrentSearchResult(cellData.rowId, cellData.columnId);
           
           return (
             <div 
               data-row-id={cellData.rowId}
               data-column-id={cellData.columnId}
               className={`px-2 py-1 cursor-pointer w-full h-full flex items-center pointer-events-none ${
                 isCurrent ? 'bg-orange-300' : isHighlighted ? 'bg-orange-100' : ''
               } ${isSelected ? 'bg-white outline outline-2 outline-blue-500 p-0.5' : ''} ${
                 isColumnSelected(cellData.columnId) && !isSelected ? 'bg-blue-50' : ''
               }`}
               onClick={(e) => {
                 if (isEditing) {
                   // Let the input handle clicks — do not re-select or reset editing
                   e.stopPropagation();
                   return;
                 }
                 setSelectedCell({ rowId: cellData.rowId, columnId: cellData.columnId });
                 setSelectedColumn(null); // Clear column selection when clicking individual cell
                 setEditingCell(null); // Clear editing state when clicking elsewhere
               }}
               onDoubleClick={() => {
                 const cellValue = localCellValues[`${cellData.rowId}-${cellData.columnId}`] ?? cellData.value;
                 setEditingCell({
                   rowId: cellData.rowId,
                   columnId: cellData.columnId,
                   value: cellValue,
                 });
                 currentValueRef.current = cellValue; // Reset the ref to the cell value
               }}
             >
               {isEditing ? (
                 <input
                   ref={inputRef}
                   type="text"
                   defaultValue={editingCell?.value ?? ""}
                   onChange={(e) => {
                     const value = e.target.value;
                     const columnType = getColumnType(cellData.columnId);
                     
                     // For number columns, only allow valid number input
                     if (columnType === 'number') {
                       if (value === '' || isValidNumberInput(value)) {
                         currentValueRef.current = value;
                       } else {
                         // Prevent invalid input by not updating the value
                         e.target.value = currentValueRef.current;
                         return;
                       }
                     } else {
                       currentValueRef.current = value;
                     }
                   }}
                   onKeyDown={(e) => {
                     const columnType = getColumnType(cellData.columnId);
                     
                     // For number columns, prevent non-numeric input
                     if (columnType === 'number') {
                       // Allow: backspace, delete, tab, escape, enter, and arrow keys
                       if ([8, 9, 27, 13, 37, 38, 39, 40, 46].includes(e.keyCode)) {
                         // Handle Enter key
                         if (e.keyCode === 13) {
                           e.preventDefault();
                           e.stopPropagation();
                           
                           if (editingCell) {
                             const finalValue = currentValueRef.current;
                             const columnType = getColumnType(editingCell.columnId);
                             const formattedValue = columnType === 'number' ? formatNumberInput(finalValue) : finalValue;
                             const cellKey = `${editingCell.rowId}-${editingCell.columnId}`;
                             setLocalCellValues(prev => ({ ...prev, [cellKey]: formattedValue }));
                             
                             void updateCellMutation.mutate({
                               tableId,
                               rowId: editingCell.rowId,
                               columnId: editingCell.columnId,
                               value: formattedValue,
                             });
                             setEditingCell(null);
                             
                             // Move selection to the row below (same column)
                             const rowIndex = allRows.findIndex(r => r.id === editingCell.rowId);
                             const nextRow = allRows[rowIndex + 1];
                             if (nextRow) {
                               setSelectedCell({
                                 rowId: nextRow.id,
                                 columnId: editingCell.columnId,
                               });
                             } else {
                               setSelectedCell({ rowId: editingCell.rowId, columnId: editingCell.columnId });
                             }
                           }
                         }
                         return;
                       }
                       // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
                       if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88, 90].includes(e.keyCode)) {
                         return;
                       }
                       // Allow: numbers, decimal point, minus sign
                       if (!/[0-9.-]/.test(e.key)) {
                         e.preventDefault();
                         return;
                       }
                     }
                     
                     if (e.key === "Enter") {
                       e.preventDefault();
                       e.stopPropagation();
                       
                       if (editingCell) {
                         const finalValue = currentValueRef.current;
                         const columnType = getColumnType(editingCell.columnId);
                         const formattedValue = columnType === 'number' ? formatNumberInput(finalValue) : finalValue;
                         const cellKey = `${editingCell.rowId}-${editingCell.columnId}`;
                         setLocalCellValues(prev => ({ ...prev, [cellKey]: formattedValue }));
                         
                         void updateCellMutation.mutate({
                           tableId,
                           rowId: editingCell.rowId,
                           columnId: editingCell.columnId,
                           value: formattedValue,
                         });
                         setEditingCell(null);
                         
                         // Move selection to the row below (same column)
                         const rowIndex = allRows.findIndex(r => r.id === editingCell.rowId);
                         const nextRow = allRows[rowIndex + 1];
                         if (nextRow) {
                           setSelectedCell({
                             rowId: nextRow.id,
                             columnId: editingCell.columnId,
                           });
                         } else {
                           setSelectedCell({ rowId: editingCell.rowId, columnId: editingCell.columnId });
                         }
                       }
                     } else if (e.key === "Escape") {
                       e.stopPropagation();
                       setEditingCell(null);
                       setSelectedCell({ rowId: editingCell?.rowId ?? '', columnId: editingCell?.columnId ?? '' });
                     }
                   }}
                   onBlur={() => {
                     if (editingCell) {
                       const finalValue = currentValueRef.current;
                       const columnType = getColumnType(editingCell.columnId);
                       const formattedValue = columnType === 'number' ? formatNumberInput(finalValue) : finalValue;
                       const cellKey = `${editingCell.rowId}-${editingCell.columnId}`;
                       setLocalCellValues(prev => ({ ...prev, [cellKey]: formattedValue }));
                       
                       void updateCellMutation.mutate({
                         tableId,
                         rowId: editingCell.rowId,
                         columnId: editingCell.columnId,
                         value: formattedValue,
                       });
                       setEditingCell(null);
                       setSelectedCell({ rowId: editingCell.rowId, columnId: editingCell.columnId });
                     }
                   }}
                   className="w-full h-full bg-transparent border-none outline-none focus:ring-0 pointer-events-auto text-[13px]"
                   autoFocus
                   onFocus={(e) => {
                     // If we just started editing with a typed character, use that value
                     if (currentValueRef.current && currentValueRef.current !== e.target.value) {
                       e.target.value = currentValueRef.current;
                     } else {
                       currentValueRef.current = e.target.value;
                     }
                   }}
                 />
               ) : (
                                   <div className="w-full h-full pointer-events-auto overflow-hidden text-ellipsis whitespace-nowrap flex items-center">
                    <span className="truncate block w-full" style={{ fontSize: '13px' }}>
                      {localCellValues[`${cellData.rowId}-${cellData.columnId}`] ?? cellData.value}
                    </span>
                  </div>
               )}
             </div>
           );
         },
                                                           size: 192, // Fixed width for all data columns
                    minSize: 192,
                    maxSize: 192,
       })) ?? [];

    // Return row number column + data columns
    return [rowNumberColumn, ...dataColumns];
  }, [tableData, editingColumn, editingCell, updateColumnMutation, updateCellMutation, tableId, localCellValues, localColumnNames, isCellHighlighted, isCurrentSearchResult, isFieldHighlighted, isCurrentFieldResult, isFieldHidden]);

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
                               <th className="border-t border-b border-l border-gray-200 h-9" style={{ width: '80px' }}>
                 <div className="px-2 py-1 font-medium text-gray-700 text-sm">
                   <div className="w-3 h-3 border border-gray-400 rounded-sm"></div>
                 </div>
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
      <div className="fixed top-33 z-10 bg-[#ffffff] border-t border-l-[0.5px] border-b-0 border-gray-200" style={{ left: isViewSidebarVisible ? '335.5px' : '55.5px' }}>
        <div className="flex">
          {/* Row number column header */}
          <div className="border-t border-b border-gray-200 h-9 px-2 py-1 flex items-center justify-center" style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }}>
            <div className="font-medium text-gray-700 text-sm">
              <div className="w-3 h-3 border border-gray-400 rounded-sm"></div>
            </div>
          </div>
          
          {/* Data column headers */}
          {tableMeta?.columns
            .filter(column => !isFieldHidden(column.id))
            .map((column, index) => (
              <div 
                key={column.id}
                data-field-id={column.id}
                className={`border-t border-b border-r border-gray-200 h-9 px-2 py-1 flex items-center cursor-pointer select-none ${
                  isFieldHighlighted(column.id) ? 'bg-orange-100' : ''
                } ${isCurrentFieldResult(column.id) ? 'bg-orange-300' : ''} ${
                  isColumnSelected(column.id) ? 'bg-blue-100' : ''
                }`}
                style={{ width: '192px', minWidth: '192px', maxWidth: '192px' }}
                onClick={() => {
                  setSelectedColumn(column.id);
                  // Select the first data cell in this column
                  if (allRows.length > 0) {
                    setSelectedCell({
                      rowId: allRows[0]!.id,
                      columnId: column.id
                    });
                  }
                }}
                onDoubleClick={() => {
                  setEditingColumn({
                    columnId: column.id,
                    name: localColumnNames[column.id] ?? column.name,
                  });
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    columnId: column.id,
                    x: e.clientX,
                    y: e.clientY
                  });
                }}
              >
                {editingColumn?.columnId === column.id ? (
                  <input
                    type="text"
                    value={editingColumn.name}
                    onChange={(e) => {
                      setEditingColumn(prev => prev ? { ...prev, name: e.target.value } : null);
                    }}
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
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-gray-400">
                      {column.type === 'text' ? 'A' : column.type === 'number' ? '#' : '?'}
                    </span>
                    {localColumnNames[column.id] ?? column.name}
                  </div>
                )}
              </div>
            ))}
          
          {/* Add column button */}
          <div className="relative border-t border-b border-r border-gray-200 bg-gray-50 h-9 flex items-center justify-center" style={{ width: '32px', minWidth: '32px', maxWidth: '32px' }}>
            <button
              onClick={handleOpenNewColumnDropdown}
              className="w-full h-full px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-xs"
            >
              +
            </button>
            
            {/* New Column Dropdown */}
            {showNewColumnDropdown && (
              <>
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <div className="p-2">
                    {!newColumnType ? (
                      // Initial state - show type selection
                      <>
                        {/* Header */}
                        <div className="text-center mb-2">
                          <h3 className="text-sm font-medium text-gray-900">Create a field</h3>
                        </div>

                        {/* Field Type Selection */}
                        <div className="space-y-1">
                          <button
                            onClick={() => handleSelectColumnType('text')}
                            className="w-full flex items-center space-x-2 p-2 text-left hover:bg-gray-50 rounded text-sm"
                          >
                            <span className="text-xs text-gray-400">A</span>
                            <span>Text</span>
                          </button>
                          
                          <button
                            onClick={() => handleSelectColumnType('number')}
                            className="w-full flex items-center space-x-2 p-2 text-left hover:bg-gray-50 rounded text-sm"
                          >
                            <span className="text-xs text-gray-400">#</span>
                            <span>Number</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      // After selecting type - show field name input and buttons
                      <>
                        <div className="mb-3 px-1 pt-1">
                          <input
                            type="text"
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                            onKeyDown={handleNewColumnKeyDown}
                            placeholder="Field name (optional)"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            autoFocus
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-2 px-1">
                          <button
                            onClick={handleCloseNewColumnDropdown}
                            className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCreateColumn}
                            disabled={addColumnMutation.isPending}
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {addColumnMutation.isPending ? 'Creating...' : 'Create field'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Click outside to close dropdown */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => {
                    setShowNewColumnDropdown(false);
                    setNewColumnType(null);
                    setNewColumnName('');
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
      
                   {/* Table Content with margin-top to account for fixed header */}
      <div style={{ marginTop: '20px', marginLeft: '40px', overflow: 'hidden' }}>
      
                                 {/* Virtualized table body using main page scroll */}
        <div 
          ref={listRef}
          className="border-b border-gray-200 bg-[#ffffff]"
          style={{ 
            height: `${virtualizer.getTotalSize()}px`,
                         width: `${80 + (tableMeta?.columns?.filter(col => !isFieldHidden(col.id)).length ?? 0) * 192}px`,
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
                                    <div className={`h-9 border-b border-gray-200 hover:bg-gray-100 transition-colors duration-150 flex bg-[#ffffff] ${
                                      isRowSelected(row.id) ? 'bg-gray-100' : ''
                                    }`}>
                     {/* Row number */}
                     <div className={`flex items-center justify-center ${isRowSelected(row.id) ? 'bg-gray-100' : ''}`} style={{ width: '80px' }}>
                       <div className="px-2 py-1 text-xs text-gray-500 font-mono">
                         {rowIndex + 1}
                       </div>
                     </div>
                   
                                        {/* Data cells */}
                     {tableMeta?.columns
                       .filter(column => !isFieldHidden(column.id))
                       .map((column, columnIndex) => {
                         const cell = row.cells.find((c: { columnId: string }) => c.columnId === column.id);
                         const cellValue = cell?.value ?? '';
                         
                         const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
                         const isSelected = selectedCell?.rowId === row.id && selectedCell?.columnId === column.id;
                         const isHighlighted = isCellHighlighted(row.id, column.id);
                         const isCurrent = isCurrentSearchResult(row.id, column.id);
                         
                         return (
                           <div 
                             key={column.id}
                             data-row-id={row.id}
                             data-column-id={column.id}
                             className={`flex items-center ${isRowSelected(row.id) && !isSelected ? 'bg-gray-100' : ''}`}
                                                           style={{ 
                                                             width: '192px', 
                                                             minWidth: '192px', 
                                                             maxWidth: '192px',
                                                             borderRight: '1px solid #e5e7eb' // Explicit right border
                                                           }}
                           >
                                                        <div 
                               className={`px-2 py-1 cursor-pointer w-full h-full flex items-center pointer-events-none ${
                                 isCurrent ? 'bg-orange-300' : isHighlighted ? 'bg-orange-100' : ''
                               } ${isSelected ? 'bg-white outline outline-2 outline-blue-500 p-0.5' : ''} ${
                                 isColumnSelected(column.id) && !isSelected ? 'bg-blue-50' : ''
                               }`}
                               onClick={(e) => {
                                 if (isEditing) {
                                   // Let the input handle clicks — do not re-select or reset editing
                                   e.stopPropagation();
                                   return;
                                 }
                                 setSelectedCell({ rowId: row.id, columnId: column.id });
                                 setSelectedColumn(null); // Clear column selection when clicking individual cell
                                 setEditingCell(null); // Clear editing state when clicking elsewhere
                               }}
                             onDoubleClick={() => {
                               const currentCellValue = localCellValues[`${row.id}-${column.id}`] ?? (cell?.value ?? '');
                               setEditingCell({
                                 rowId: row.id,
                                 columnId: column.id,
                                 value: currentCellValue,
                               });
                               currentValueRef.current = currentCellValue; // Reset the ref to the cell value
                             }}
                             onContextMenu={(e) => {
                               e.preventDefault();
                               setRowContextMenu({
                                 rowId: row.id,
                                 x: e.clientX,
                                 y: e.clientY
                               });
                             }}
                           >
                             {isEditing ? (
                               <input
                                 ref={inputRef}
                                 type="text"
                                 defaultValue={editingCell?.value ?? ""}
                                 onChange={(e) => {
                                   const value = e.target.value;
                                   const columnType = getColumnType(column.id);
                                   
                                   // For number columns, only allow valid number input
                                   if (columnType === 'number') {
                                     if (value === '' || isValidNumberInput(value)) {
                                       currentValueRef.current = value;
                                     } else {
                                       // Prevent invalid input by not updating the value
                                       e.target.value = currentValueRef.current;
                                       return;
                                     }
                                   } else {
                                     currentValueRef.current = value;
                                   }
                                 }}
                                 onKeyDown={(e) => {
                                   const columnType = getColumnType(column.id);
                                   
                                   // For number columns, prevent non-numeric input
                                   if (columnType === 'number') {
                                     // Allow: backspace, delete, tab, escape, enter, and arrow keys
                                     if ([8, 9, 27, 13, 37, 38, 39, 40, 46].includes(e.keyCode)) {
                                       // Handle Enter key
                                       if (e.keyCode === 13) {
                                         e.preventDefault();
                                         e.stopPropagation();
                                         
                                         if (editingCell) {
                                           const finalValue = currentValueRef.current;
                                           const columnType = getColumnType(editingCell.columnId);
                                           const formattedValue = columnType === 'number' ? formatNumberInput(finalValue) : finalValue;
                                           const cellKey = `${editingCell.rowId}-${editingCell.columnId}`;
                                           setLocalCellValues(prev => ({ ...prev, [cellKey]: formattedValue }));
                                           
                                           void updateCellMutation.mutate({
                                             tableId,
                                             rowId: editingCell.rowId,
                                             columnId: editingCell.columnId,
                                             value: formattedValue,
                                           });
                                           setEditingCell(null);
                                           
                                           // Move selection to the row below (same column)
                                           const rowIndex = allRows.findIndex(r => r.id === editingCell.rowId);
                                           const nextRow = allRows[rowIndex + 1];
                                           if (nextRow) {
                                             setSelectedCell({
                                               rowId: nextRow.id,
                                               columnId: editingCell.columnId,
                                             });
                                           } else {
                                             setSelectedCell({ rowId: editingCell.rowId, columnId: editingCell.columnId });
                                           }
                                         }
                                       }
                                       return;
                                     }
                                     // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
                                     if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88, 90].includes(e.keyCode)) {
                                       return;
                                     }
                                     // Allow: numbers, decimal point, minus sign
                                     if (!/[0-9.-]/.test(e.key)) {
                                       e.preventDefault();
                                       return;
                                     }
                                   }
                                   
                                   if (e.key === "Enter") {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     
                                     if (editingCell) {
                                       const finalValue = currentValueRef.current;
                                       const columnType = getColumnType(editingCell.columnId);
                                       const formattedValue = columnType === 'number' ? formatNumberInput(finalValue) : finalValue;
                                       const cellKey = `${editingCell.rowId}-${editingCell.columnId}`;
                                       setLocalCellValues(prev => ({ ...prev, [cellKey]: formattedValue }));
                                       
                                       void updateCellMutation.mutate({
                                         tableId,
                                         rowId: editingCell.rowId,
                                         columnId: editingCell.columnId,
                                         value: formattedValue,
                                       });
                                       setEditingCell(null);
                                       
                                       // Move selection to the row below (same column)
                                       const rowIndex = allRows.findIndex(r => r.id === editingCell.rowId);
                                       const nextRow = allRows[rowIndex + 1];
                                       if (nextRow) {
                                         setSelectedCell({
                                           rowId: nextRow.id,
                                           columnId: editingCell.columnId,
                                         });
                                       } else {
                                         setSelectedCell({ rowId: editingCell.rowId, columnId: editingCell.columnId });
                                       }
                                     }
                                   } else if (e.key === "Escape") {
                                     e.stopPropagation();
                                     setEditingCell(null);
                                     setSelectedCell({ rowId: editingCell?.rowId ?? '', columnId: editingCell?.columnId ?? '' });
                                   }
                                 }}
                                 onBlur={() => {
                                   if (editingCell) {
                                     const finalValue = currentValueRef.current;
                                     const columnType = getColumnType(editingCell.columnId);
                                     const formattedValue = columnType === 'number' ? formatNumberInput(finalValue) : finalValue;
                                     const cellKey = `${editingCell.rowId}-${editingCell.columnId}`;
                                     setLocalCellValues(prev => ({ ...prev, [cellKey]: formattedValue }));
                                     
                                     void updateCellMutation.mutate({
                                       tableId,
                                       rowId: editingCell.rowId,
                                       columnId: editingCell.columnId,
                                       value: formattedValue,
                                     });
                                     setEditingCell(null);
                                     setSelectedCell({ rowId: editingCell.rowId, columnId: editingCell.columnId });
                                   }
                                 }}
                                 className="w-full h-full bg-transparent border-none outline-none focus:ring-0 pointer-events-auto text-[13px]"
                                 autoFocus
                                 onFocus={(e) => {
                                   // If we just started editing with a typed character, use that value
                                   if (currentValueRef.current && currentValueRef.current !== e.target.value) {
                                     e.target.value = currentValueRef.current;
                                   } else {
                                     currentValueRef.current = e.target.value;
                                   }
                                 }}
                               />
                             ) : (
                                                               <div className="w-full h-full pointer-events-auto overflow-hidden text-ellipsis whitespace-nowrap flex items-center">
                                  <span className="truncate block w-full" style={{ fontSize: '13px' }}>
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
         className="border border-gray-200 border-t-0 bg-[#ffffff] h-9 flex items-center hover:bg-gray-100 cursor-pointer transition-colors"
                   style={{ width: `${80 + (tableMeta?.columns?.filter(col => !isFieldHidden(col.id)).length ?? 0) * 192}px` }}
         onClick={() => {
           if (!tableId) return;
           void addRowMutation.mutate({ tableId });
         }}
       >
         {addRowMutation.isPending ? (
           /* Centered "Adding..." text when loading */
           <div className="flex items-center justify-center w-full h-full">
             <span className="text-gray-500 text-sm">
               Adding...
             </span>
           </div>
         ) : (
           <>
             {/* Row number area with + button */}
             <div className="flex items-center justify-center w-20 h-full">
               <span className="text-gray-500 text-sm">
                 +
               </span>
             </div>
             
             {/* Empty space for data columns */}
             <div className="flex-1 h-full"></div>
           </>
         )}
       </div>
       
                               {/* Status bar removed - no longer showing to users */}
       
       
      </div>

      {/* Column Context Menu */}
      {contextMenu && (
        <div
          data-context-menu
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[200px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            className={`w-full px-4 py-2 text-sm text-left hover:bg-red-50 transition-colors flex items-center gap-3 ${
              isPrimaryField(contextMenu.columnId) 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-red-600 hover:text-red-700'
            }`}
            disabled={isPrimaryField(contextMenu.columnId)}
            onClick={() => {
              if (!isPrimaryField(contextMenu.columnId)) {
                void deleteColumnMutation.mutate({
                  tableId,
                  columnId: contextMenu.columnId
                });
              }
              setContextMenu(null);
            }}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete field
          </button>
        </div>
      )}

      {/* Row Context Menu */}
      {rowContextMenu && (
        <div
          data-row-context-menu
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[200px]"
          style={{
            left: rowContextMenu.x,
            top: rowContextMenu.y,
          }}
        >
          <button
            className="w-full px-4 py-2 text-sm text-left hover:bg-red-50 transition-colors flex items-center gap-3 text-red-600 hover:text-red-700"
            onClick={() => {
              void deleteRowMutation.mutate({
                tableId,
                rowId: rowContextMenu.rowId
              });
              setRowContextMenu(null);
            }}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete record
          </button>
        </div>
      )}

     </div>
   );
 }
