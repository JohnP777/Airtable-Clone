"use client";

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { api } from "../../../trpc/react";
import { useTableContext } from "./TableContext";

type Ctx = {
  views: Array<{ id: string; name: string; order: number; type: string }>;
  currentViewId: string | null;            // <- allow null
  switchView: (id: string | null) => void; // <- allow clearing on table change
  createView: (name?: string) => Promise<void>;
  renameView: (viewId: string, newName: string) => Promise<void>;
  deleteView: (viewId: string) => Promise<void>;
  duplicateView: (viewId: string) => Promise<void>;
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
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);

  const list = api.table.listViews.useQuery(
    { tableId: selectedTableId! },
    { enabled: !!selectedTableId } //Runs if selected table ID exists
  );

  // Setting up mutations
  const create = api.table.createView.useMutation();
  const rename = api.table.renameView.useMutation();
  const duplicate = api.table.duplicateView.useMutation();
  const deleteView = api.table.deleteView.useMutation({
    onMutate: async ({ viewId }) => {
      // Optimistically update the view list to remove the view
      const currentData = utils.table.listViews.getData({ tableId: selectedTableId! });
      if (currentData) {
        const updatedViews = currentData.filter(v => v.id !== viewId);
        utils.table.listViews.setData({ tableId: selectedTableId! }, updatedViews);
      }
    },
    onSettled: () => {
      void utils.table.listViews.invalidate({ tableId: selectedTableId! });
    },
  });

  // Reset view when table changes
  useEffect(() => { setCurrentViewId(null); }, [selectedTableId]);

  // Initialize to first view when views load
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
    renameView: async (viewId: string, newName: string) => {
      await rename.mutateAsync({ viewId, newName });
      await utils.table.listViews.invalidate({ tableId: selectedTableId! });
    },
    deleteView: async (viewId: string) => {
      await deleteView.mutateAsync({ viewId });
      await utils.table.listViews.invalidate({ tableId: selectedTableId! });
      // If we deleted the current view, switch to the first remaining view
      if (currentViewId === viewId) {
        const remainingViews = list.data?.filter(v => v.id !== viewId);
        setCurrentViewId(remainingViews?.[0]?.id || null);
      }
    },
    duplicateView: async (viewId: string) => {
      const newView = await duplicate.mutateAsync({ viewId });
      await utils.table.listViews.invalidate({ tableId: selectedTableId! });
      setCurrentViewId(newView.id);
    },
  }), [list.data, currentViewId, selectedTableId, create, rename, deleteView, duplicate, utils.table.listViews]);

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}
