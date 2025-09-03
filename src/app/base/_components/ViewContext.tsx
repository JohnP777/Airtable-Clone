"use client";

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { api } from "../../../trpc/react";
import { useTableContext } from "./TableContext";

type Ctx = {
  views: Array<{ id: string; name: string; order: number; type: string }>;
  currentViewId: string; // Never null
  switchView: (id: string) => void;
  createView: (name?: string) => Promise<void>;
};

const ViewContext = createContext<Ctx | null>(null);
export const useView = () => {
  const v = useContext(ViewContext);
  if (!v) throw new Error("useView must be used within ViewProvider");
  return v;
};

export function ViewProvider({ baseId, children }: { baseId: string; children: React.ReactNode }) {
  const utils = api.useUtils();
  const { selectedTableId } = useTableContext();
  const list = api.table.listViews.useQuery({ tableId: selectedTableId! }, { enabled: !!selectedTableId });
  const create = api.table.createView.useMutation();
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);

  // Initialize current view to first one
  useEffect(() => {
    if (!currentViewId && list.data?.[0]) setCurrentViewId(list.data[0].id);
  }, [list.data, currentViewId]);

  // Ensure we always have a valid viewId
  const effectiveViewId = currentViewId || list.data?.[0]?.id || 'default-view';

  const value = useMemo<Ctx>(() => ({
    views: list.data ?? [],
    currentViewId: effectiveViewId,
    switchView: setCurrentViewId,
    createView: async (name?: string) => {
      if (!selectedTableId) return;
      const v = await create.mutateAsync({ tableId: selectedTableId, name });
      await utils.table.listViews.invalidate({ tableId: selectedTableId });
      setCurrentViewId(v.id);
    },
  }), [list.data, effectiveViewId, selectedTableId, create, utils.table.listViews]);

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}
