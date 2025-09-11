"use client";

import React, { createContext, useContext, useMemo, useState, useEffect, useRef } from "react";
import { useView } from "./ViewContext";
import { useTableContext } from "./TableContext";
import { api } from "../../../trpc/react";

export type FilterRule = {
  columnId: string;
  operator: "contains" | "does not contain" | "is" | "is not" | "is empty" | "is not empty" | "equals" | "not equals" | "less than" | "greater than" | "less than or equal" | "greater than or equal";
  value: string;
  logicalOperator?: "AND" | "OR" | null; 
};

type Ctx = {
  filterRules: FilterRule[];
  setFilterRules: (rules: FilterRule[]) => void;
  clearFilterRules: () => void;
  hydrated: boolean;
  isFiltering: boolean;
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
  const { selectedTableId } = useTableContext();
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
      staleTime: 5 * 60 * 1000, // 5 minutes - view state doesn't change often
      refetchOnWindowFocus: false, // don't refetch on window focus
    }
  );
  const setRulesMutation = api.table.setFilterRules.useMutation({
    onMutate: async ({ viewId, rules }) => {
      // Store previous rules for rollback
      const previousRules = byView[viewId] ?? [];
      // Optimistic context update happens before server call
      setByView(prev => ({ ...prev, [viewId]: rules }));
      return { previousRules };
    },
    onError: (err, { viewId }, context) => {
      // Roll back context
      if (context?.previousRules) {
        setByView(prev => ({ ...prev, [viewId]: context.previousRules }));
      }
    },
    onSuccess: async (_, { viewId }) => {
      if (!selectedTableId) return;
      // Only invalidate after successful mutation
      await utils.table.getTableDataPaginated.invalidate({
        tableId: selectedTableId,
        viewId: viewId ?? undefined,
      });
    },
  });

  // hydrate on load / view change
  useEffect(() => {
    if (!viewId) return;
    if (data) setByView(prev => ({ ...prev, [viewId]: data.filterRules ?? [] }));
    setHydratedViews(prev => ({ ...prev, [viewId]: true })); // <-- ensure true even with empty data
  }, [viewId, data]);

  const filterRules = byView[viewId ?? ''] ?? [];
  const hydrated = !!hydratedViews[viewId ?? ''];
  const isFiltering = setRulesMutation.isPending;

  const setFilterRules = (rules: FilterRule[]) => {
    if (!hasView) return;
    setByView(prev => ({ ...prev, [viewId!]: rules }));
    setRulesMutation.mutate({ viewId: viewId!, rules });
  };

  const clearFilterRules = () => setFilterRules([]);

  const value = useMemo(
    () => ({ filterRules, setFilterRules, clearFilterRules, hydrated, isFiltering }),
    [filterRules, hydrated, isFiltering]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}
