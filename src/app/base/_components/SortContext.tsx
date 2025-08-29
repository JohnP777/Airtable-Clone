"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useView } from "./ViewContext";

interface SortRule {
  id: string;
  columnId: string;
  direction: "asc" | "desc";
}

interface SortContextType {
  sortRules: SortRule[];
  setSortRules: (rules: SortRule[]) => void;
  addSortRule: (rule: SortRule) => void;
  removeSortRule: (ruleId: string) => void;
  updateSortRule: (ruleId: string, field: keyof SortRule, value: string) => void;
  clearSortRules: () => void;
  moveSortRuleUp: (ruleId: string) => void;
  moveSortRuleDown: (ruleId: string) => void;
}

const SortContext = createContext<SortContextType | undefined>(undefined);

interface SortProviderProps {
  children: ReactNode;
}

export function SortProvider({ children }: SortProviderProps) {
  const { currentView, updateView } = useView();
  const [sortRules, setSortRules] = useState<SortRule[]>([]);

  // Sync with current view's sort rules
  useEffect(() => {
    if (currentView) {
      setSortRules(currentView.sortRules);
    }
  }, [currentView?.id]);

  // Update view when sort rules change
  useEffect(() => {
    if (currentView) {
      updateView(currentView.id, { sortRules });
    }
  }, [sortRules, currentView?.id]);

  const addSortRule = (rule: SortRule) => {
    setSortRules(prev => [...prev, rule]);
  };

  const removeSortRule = (ruleId: string) => {
    setSortRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  const updateSortRule = (ruleId: string, field: keyof SortRule, value: string) => {
    setSortRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { ...rule, [field]: value }
        : rule
    ));
  };

  const clearSortRules = () => {
    setSortRules([]);
  };

  const moveSortRuleUp = (ruleId: string) => {
    setSortRules(prev => {
      const index = prev.findIndex(rule => rule.id === ruleId);
      if (index <= 0) return prev; // Can't move up if it's the first or not found
      
      const newRules = [...prev];
      const temp = newRules[index - 1]!;
      newRules[index - 1] = newRules[index]!;
      newRules[index] = temp;
      return newRules;
    });
  };

  const moveSortRuleDown = (ruleId: string) => {
    setSortRules(prev => {
      const index = prev.findIndex(rule => rule.id === ruleId);
      if (index === -1 || index === prev.length - 1) return prev; // Can't move down if it's the last or not found
      
      const newRules = [...prev];
      const temp = newRules[index]!;
      newRules[index] = newRules[index + 1]!;
      newRules[index + 1] = temp;
      return newRules;
    });
  };

  return (
    <SortContext.Provider value={{
      sortRules,
      setSortRules,
      addSortRule,
      removeSortRule,
      updateSortRule,
      clearSortRules,
      moveSortRuleUp,
      moveSortRuleDown
    }}>
      {children}
    </SortContext.Provider>
  );
}

export function useSortContext() {
  const context = useContext(SortContext);
  if (context === undefined) {
    throw new Error("useSortContext must be used within a SortProvider");
  }
  return context;
}
