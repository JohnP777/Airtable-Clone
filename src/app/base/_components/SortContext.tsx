"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { useView } from "./ViewContext";

export type SortRule = { columnId: string; direction: "asc" | "desc" };

type Ctx = {
  sortRules: SortRule[];
  setSortRules: (rules: SortRule[]) => void;
  clearSortRules: () => void;
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
  const [byView, setByView] = useState<Record<string, SortRule[]>>({});

  const sortRules = byView[currentViewId ?? ''] ?? [];
  const setSortRules = (rules: SortRule[]) =>
    setByView(prev => ({ ...prev, [currentViewId ?? '']: rules }));
  const clearSortRules = () =>
    setByView(prev => ({ ...prev, [currentViewId ?? '']: [] }));

  const value = useMemo(() => ({ sortRules, setSortRules, clearSortRules }), [sortRules]);
  return <SortContext.Provider value={value}>{children}</SortContext.Provider>;
}
