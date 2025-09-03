"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { useView } from "./ViewContext";

export type FilterRule = {
  columnId: string;
  operator: "contains" | "does not contain" | "is" | "is not" | "is empty" | "is not empty";
  value: string;
};

type Ctx = {
  filterRules: FilterRule[];
  setFilterRules: (rules: FilterRule[]) => void;
  clearFilterRules: () => void;
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
  const [byView, setByView] = useState<Record<string, FilterRule[]>>({});

  const filterRules = byView[currentViewId ?? ''] ?? [];
  const setFilterRules = (rules: FilterRule[]) =>
    setByView(prev => ({ ...prev, [currentViewId ?? '']: rules }));
  const clearFilterRules = () =>
    setByView(prev => ({ ...prev, [currentViewId ?? '']: [] }));

  const value = useMemo(() => ({ filterRules, setFilterRules, clearFilterRules }), [filterRules]);
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}
