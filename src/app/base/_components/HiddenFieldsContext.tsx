"use client";

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useView } from "./ViewContext";
import { api } from "../../../trpc/react";

type Ctx = {
  isFieldHidden: (id: string) => boolean;
  toggleFieldHidden: (id: string) => void;
  setHiddenFields: (ids: string[]) => void;
  hiddenFieldIds: string[];
  hydrated: boolean;
};

const HiddenFieldsContext = createContext<Ctx | null>(null);

export function useHiddenFields() {
  const v = useContext(HiddenFieldsContext);
  if (!v) throw new Error("useHiddenFields must be used within HiddenFieldsProvider");
  return v;
}

interface HiddenFieldsProviderProps {
  children: React.ReactNode;
}

export function HiddenFieldsProvider({ children }: HiddenFieldsProviderProps) {
  const { currentViewId } = useView();
  const [byView, setByView] = useState<Record<string, Set<string>>>({});
  const [hydratedViews, setHydratedViews] = useState<Record<string, boolean>>({});
  const utils = api.useUtils();

  const viewId = currentViewId;
  const hasView = !!viewId;
  const { data } = api.table.getViewState.useQuery(
    { viewId: viewId! }, 
    { 
      enabled: hasView,
      retry: false,
    }
  );

  // Save hidden fields
  const saveMutation = api.table.setHiddenFields.useMutation({
    onSuccess: () => void utils.table.getTableDataPaginated.invalidate(),
  });

  // Invalidate and refetch when viewId changes to ensure fresh data
  useEffect(() => {
    if (viewId) {
      utils.table.getViewState.invalidate({ viewId });
    }
  }, [viewId, utils.table.getViewState]);

  // Hydrate hidden fields when data is received
  useEffect(() => {
    if (!viewId) return;
    if (data) {
      setByView(prev => ({ ...prev, [viewId]: new Set(data.hiddenFields ?? []) }));
      setHydratedViews(prev => ({ ...prev, [viewId]: true }));
    }
  }, [viewId, data]);

  const hiddenSet = byView[viewId ?? ''] ?? new Set<string>(); //Hidden fields for the current view
  const hiddenFieldIds = Array.from(hiddenSet);
  const hydrated = !!hydratedViews[viewId ?? '']; //Whether view's hidden fields have been fetched from backend

  const persist = (set: Set<string>) => {
    if (!hasView) return;
    saveMutation.mutate({ viewId: viewId!, hiddenFieldIds: Array.from(set) });
  };

  const setHiddenFields = (ids: string[]) => {
    const set = new Set(ids);
    setByView(prev => ({ ...prev, [viewId!]: set })); //Optimistically update
    persist(set); //sync with backend
  };

  const toggleFieldHidden = (id: string) => {
    const set = new Set(hiddenSet);
    set.has(id) ? set.delete(id) : set.add(id); //Flips a field's hidden/shown state
    setByView(prev => ({ ...prev, [viewId!]: set }));
    persist(set);
  };

  const isFieldHidden = (id: string) => hiddenSet.has(id);

  const value = useMemo(
    () => ({ isFieldHidden, toggleFieldHidden, setHiddenFields, hiddenFieldIds, hydrated }),
    [hiddenFieldIds, hiddenSet, hydrated, viewId]
  );

  return <HiddenFieldsContext.Provider value={value}>{children}</HiddenFieldsContext.Provider>;
}
