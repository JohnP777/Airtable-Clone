"use client";

import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export interface View {
  id: string;
  name: string;
  type: "grid";
  sortRules: Array<{ id: string; columnId: string; direction: "asc" | "desc" }>;
  filterRules: Array<{ id: string; columnId: string; operator: string; value: string }>;
  hiddenFields: Set<string>;
  searchTerm: string;
  searchResults: Array<{ type: "field" | "cell"; rowId?: string; columnId: string; value: string; columnName: string }>;
  currentResultIndex: number;
  isSearchActive: boolean;
}

interface ViewContextType {
  views: View[];
  currentViewId: string;
  currentView: View | null;
  createView: (name: string) => void;
  switchView: (viewId: string) => void;
  updateView: (viewId: string, updates: Partial<View>) => void;
  deleteView: (viewId: string) => void;
  getViewSettings: (viewId: string) => View | null;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error("useView must be used within a ViewProvider");
  }
  return context;
}

interface ViewProviderProps {
  children: ReactNode;
  baseId: string;
}

export function ViewProvider({ children, baseId }: ViewProviderProps) {
  const [views, setViews] = useState<View[]>(() => {
    // Initialize with a default view
    const defaultView: View = {
      id: `${baseId}-view-1`,
      name: "Grid view",
      type: "grid",
      sortRules: [],
      filterRules: [],
      hiddenFields: new Set(),
      searchTerm: "",
      searchResults: [],
      currentResultIndex: 0,
      isSearchActive: false,
    };
    return [defaultView];
  });

  const [currentViewId, setCurrentViewId] = useState<string>(`${baseId}-view-1`);

  const currentView = views.find(view => view.id === currentViewId) ?? null;

  const createView = (name: string) => {
    const newViewNumber = views.length + 1;
    const newView: View = {
      id: `${baseId}-view-${newViewNumber}`,
      name: name ?? `Grid view ${newViewNumber}`,
      type: "grid",
      sortRules: [],
      filterRules: [],
      hiddenFields: new Set(),
      searchTerm: "",
      searchResults: [],
      currentResultIndex: 0,
      isSearchActive: false,
    };
    setViews(prev => [...prev, newView]);
    setCurrentViewId(newView.id);
  };

  const switchView = (viewId: string) => {
    setCurrentViewId(viewId);
  };

  const updateView = (viewId: string, updates: Partial<View>) => {
    setViews(prev => prev.map(view => 
      view.id === viewId ? { ...view, ...updates } : view
    ));
  };

  const deleteView = (viewId: string) => {
    if (views.length <= 1) return; // Don't delete the last view
    
    setViews(prev => prev.filter(view => view.id !== viewId));
    
    // If we deleted the current view, switch to the first available view
    if (currentViewId === viewId) {
      const remainingViews = views.filter(view => view.id !== viewId);
      if (remainingViews.length > 0 && remainingViews[0]) {
        setCurrentViewId(remainingViews[0].id);
      }
    }
  };

  const getViewSettings = (viewId: string) => {
    return views.find(view => view.id === viewId) ?? null;
  };

  const value: ViewContextType = {
    views,
    currentViewId,
    currentView,
    createView,
    switchView,
    updateView,
    deleteView,
    getViewSettings,
  };

  return (
    <ViewContext.Provider value={value}>
      {children}
    </ViewContext.Provider>
  );
}
