"use client";

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useView } from "./ViewContext";
import { useTableContext } from "./TableContext";
import { api } from "../../../trpc/react";

export type SortRule = { columnId: string; direction: "asc" | "desc" };

type Ctx = {
  sortRules: SortRule[];
  setSortRules: (rules: SortRule[]) => void;
  clearSortRules: () => void;
  hydrated: boolean;
  isSorting: boolean;
};

const SortContext = createContext<Ctx | null>(null);

export function useSortContext() {
  const v = useContext(SortContext);
  if (!v) throw new Error("useSortContext must be used within SortProvider");
  return v;
}

interface SortProviderProps {
  children: React.ReactNode;
}

export function SortProvider({ children }: SortProviderProps) {
  const { currentViewId } = useView();
  const { selectedTableId } = useTableContext();
  const [byView, setByView] = useState<Record<string, SortRule[]>>({});
  const [hydratedViews, setHydratedViews] = useState<Record<string, boolean>>({});
  const utils = api.useUtils();

  const viewId = currentViewId;
  const hasView = !!viewId; // Check if valid view (not null/undefined)
  const { data } = api.table.getViewState.useQuery(
    { viewId: viewId! },
    { 
      enabled: hasView, // fetch persisted state only when we have a real viewId
      retry: false, 
    }
  );

  const setSortRulesMutation = api.table.setSortRules.useMutation({
    onMutate: async ({ viewId, sortRules }: { viewId: string; sortRules: SortRule[] }) => {
      // Store previous rules for rollback
      const previousRules = byView[viewId] ?? [];
      // Optimistic context update happens before server call
      setByView(prev => ({ ...prev, [viewId]: sortRules }));
      return { previousRules };
    },
    onError: (err: any, { viewId }: { viewId: string }, context: any) => {
      // Roll back context
      if (context?.previousRules) {
        setByView(prev => ({ ...prev, [viewId]: context.previousRules }));
      }
    },
    onSettled: async (_: any, __: any, { viewId }: { viewId: string }) => {
      if (!selectedTableId) return;
      // Refetch, but don't nuke local rules
      await utils.table.getTableDataPaginated.refetch({
        tableId: selectedTableId,
        viewId: viewId ?? undefined,
        page: 0,
        pageSize: 1,
      });
    },
  });

  // Hydrate on load / view change
  useEffect(() => {
    if (!viewId) return;
    if (data) setByView(prev => ({ ...prev, [viewId]: data.sortRules ?? [] }));
    setHydratedViews(prev => ({ ...prev, [viewId]: true }));
  }, [viewId, data]);

  const sortRules = byView[currentViewId ?? ''] ?? [];
  const hydrated = !!hydratedViews[currentViewId ?? ''];
  const isSorting = setSortRulesMutation.isPending;

  const setSortRules = (rules: SortRule[]) => {
    if (!hasView) return;
    setByView(prev => ({ ...prev, [viewId!]: rules })); // Optimistic update, bit redundant though since already did in onMutate
    setSortRulesMutation.mutate({ viewId: viewId!, sortRules: rules });
  };

  const clearSortRules = () => {
    if (!hasView) return;
    setByView(prev => ({ ...prev, [viewId!]: [] }));
    setSortRulesMutation.mutate({ viewId: viewId!, sortRules: [] });
  };

  const value = useMemo(() => ({ sortRules, setSortRules, clearSortRules, hydrated, isSorting }), [sortRules, hydrated, isSorting]);
  return <SortContext.Provider value={value}>{children}</SortContext.Provider>;
}
