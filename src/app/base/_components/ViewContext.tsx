"use client";

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { api } from "../../../trpc/react";
import { useTableContext } from "./TableContext";

type Ctx = {
  views: Array<{ id: string; name: string; order: number; type: string }>;
  currentViewId: string | null;            // <- allow null
  switchView: (id: string | null) => void; // <- allow clearing on table change
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

  const list = api.table.listViews.useQuery(
    { tableId: selectedTableId! },
    { enabled: !!selectedTableId }
  );

  const create = api.table.createView.useMutation();
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);

  // reset view when table changes
  useEffect(() => { setCurrentViewId(null); }, [selectedTableId]);

  // initialize to first view when views load
  useEffect(() => {
    if (!currentViewId && list.data?.[0]) setCurrentViewId(list.data[0].id);
  }, [list.data, currentViewId]);

  const value = useMemo<Ctx>(() => ({
    views: list.data ?? [],
    currentViewId,
    switchView: setCurrentViewId,
    createView: async (name?: string) => {
      if (!selectedTableId) return;
      const v = await create.mutateAsync({ tableId: selectedTableId, name });
      await utils.table.listViews.invalidate({ tableId: selectedTableId });
      setCurrentViewId(v.id);
    },
  }), [list.data, currentViewId, selectedTableId, create, utils.table.listViews]);

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}
