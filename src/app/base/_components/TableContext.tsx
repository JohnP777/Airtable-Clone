"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { api } from "../../../trpc/react";

interface TableContextType {
  selectedTableId: string | undefined;
  setSelectedTableId: (tableId: string) => void;
}

const TableContext = createContext<TableContextType | undefined>(undefined);

interface TableProviderProps {
  children: ReactNode;
  baseId: string;
}

export function TableProvider({ children, baseId }: TableProviderProps) {
  const { data: tables } = api.table.list.useQuery({ baseId });
  const [selectedTableId, setSelectedTableId] = useState<string | undefined>();

  // Auto-select the first table when tables are loaded
  useEffect(() => {
    if (tables && tables.length > 0 && !selectedTableId && tables[0]) {
      setSelectedTableId(tables[0].id);
    }
  }, [tables, selectedTableId]);

  const handleSetSelectedTableId = (tableId: string) => {
    setSelectedTableId(tableId);
  };

  return (
    <TableContext.Provider value={{ selectedTableId, setSelectedTableId: handleSetSelectedTableId }}>
      {children}
    </TableContext.Provider>
  );
}

export function useTableContext() {
  const context = useContext(TableContext);
  if (context === undefined) {
    throw new Error("useTableContext must be used within a TableProvider");
  }
  return context;
}
