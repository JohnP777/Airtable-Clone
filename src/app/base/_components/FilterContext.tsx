"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useView } from "./ViewContext";

interface FilterRule {
  id: string;
  columnId: string;
  operator: string;
  value: string;
}

interface FilterContextType {
  filterRules: FilterRule[];
  setFilterRules: (rules: FilterRule[]) => void;
  addFilterRule: (rule: FilterRule) => void;
  removeFilterRule: (ruleId: string) => void;
  updateFilterRule: (ruleId: string, field: keyof FilterRule, value: string) => void;
  clearFilterRules: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

interface FilterProviderProps {
  children: ReactNode;
}

export function FilterProvider({ children }: FilterProviderProps) {
  const { currentView, updateView } = useView();
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  // Sync with current view's filter rules
  useEffect(() => {
    if (currentView) {
      setFilterRules(currentView.filterRules);
    }
  }, [currentView?.id]);

  // Update view when filter rules change
  useEffect(() => {
    if (currentView) {
      updateView(currentView.id, { filterRules });
    }
  }, [filterRules, currentView?.id]);

  const addFilterRule = (rule: FilterRule) => {
    setFilterRules(prev => [...prev, rule]);
  };

  const removeFilterRule = (ruleId: string) => {
    setFilterRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  const updateFilterRule = (ruleId: string, field: keyof FilterRule, value: string) => {
    setFilterRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { ...rule, [field]: value }
        : rule
    ));
  };

  const clearFilterRules = () => {
    setFilterRules([]);
  };

  return (
    <FilterContext.Provider value={{
      filterRules,
      setFilterRules,
      addFilterRule,
      removeFilterRule,
      updateFilterRule,
      clearFilterRules
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilterContext() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilterContext must be used within a FilterProvider");
  }
  return context;
}
