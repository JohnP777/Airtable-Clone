"use client";

import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface LoadedRow {
  id: string;
  order: number;
  cells: Array<{
    columnId: string;
    value: string;
    column: {
      id: string;
      name: string;
    };
  }>;
}

interface LoadedRowsContextType {
  loadedRows: LoadedRow[];
  setLoadedRows: (rows: LoadedRow[]) => void;
  addLoadedRows: (rows: LoadedRow[]) => void;
  clearLoadedRows: () => void;
}

const LoadedRowsContext = createContext<LoadedRowsContextType | undefined>(undefined);

export function useLoadedRows() {
  const context = useContext(LoadedRowsContext);
  if (context === undefined) {
    throw new Error("useLoadedRows must be used within a LoadedRowsProvider");
  }
  return context;
}

export function LoadedRowsProvider({ children }: { children: ReactNode }) {
  const [loadedRows, setLoadedRows] = useState<LoadedRow[]>([]);

  const addLoadedRows = (newRows: LoadedRow[]) => {
    setLoadedRows(prev => {
      // Merge new rows with existing ones, avoiding duplicates
      const existingIds = new Set(prev.map(row => row.id));
      const uniqueNewRows = newRows.filter(row => !existingIds.has(row.id));
      return [...prev, ...uniqueNewRows];
    });
  };

  const clearLoadedRows = () => {
    setLoadedRows([]);
  };

  return (
    <LoadedRowsContext.Provider value={{
      loadedRows,
      setLoadedRows,
      addLoadedRows,
      clearLoadedRows,
    }}>
      {children}
    </LoadedRowsContext.Provider>
  );
}



