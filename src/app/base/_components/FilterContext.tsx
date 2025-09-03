"use client";

import React, { createContext, useContext, useMemo, useState, useEffect, useRef } from "react";
import { useView } from "./ViewContext";
import { api } from "../../../trpc/react";

export type FilterRule = {
  columnId: string;
  operator: "contains" | "does not contain" | "is" | "is not" | "is empty" | "is not empty";
  value: string;
};

type Ctx = {
  filterRules: FilterRule[];
  setFilterRules: (rules: FilterRule[]) => void;
  clearFilterRules: () => void;
  hydrated: boolean;
};

const FilterContext = createContext<Ctx | null>(null);

export function useFilterContext() {
  const v = useContext(FilterContext);
  if (!v) throw new Error("useFilterContext must be used within FilterProvider");
  return v;
}

interface FilterProviderProps {
  children: React.ReactNode;
}

export function FilterProvider({ children }: FilterProviderProps) {
  const { currentViewId } = useView();
  const utils = api.useUtils();
  const [byView, setByView] = useState<Record<string, FilterRule[]>>({});
  const [hydratedViews, setHydratedViews] = useState<Record<string, boolean>>({});

  const viewId = currentViewId;
  const hasView = !!viewId;
  const { data } = api.table.getViewState.useQuery(
    { viewId: viewId! },
    { 
      enabled: hasView, // fetch persisted state only when we have a real viewId
      retry: false, // don't retry if it fails
    }
  );
  const setRulesMutation = api.table.setFilterRules.useMutation({
    onSuccess: () => void utils.table.getTableDataPaginated.invalidate(), // refetch all pages for this view
  });

  // hydrate on load / view change
  useEffect(() => {
    if (!viewId) return;
    if (data) setByView(prev => ({ ...prev, [viewId]: data.filterRules ?? [] }));
    setHydratedViews(prev => ({ ...prev, [viewId]: true })); // <-- ensure true even with empty data
  }, [viewId, data]);

  const filterRules = byView[viewId ?? ''] ?? [];
  const hydrated = !!hydratedViews[viewId ?? ''];

  const setFilterRules = (rules: FilterRule[]) => {
    if (!hasView) return;
    setByView(prev => ({ ...prev, [viewId!]: rules }));
    setRulesMutation.mutate({ viewId: viewId!, rules });
  };

  const clearFilterRules = () => setFilterRules([]);

  const value = useMemo(
    () => ({ filterRules, setFilterRules, clearFilterRules, hydrated }),
    [filterRules, hydrated]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}
