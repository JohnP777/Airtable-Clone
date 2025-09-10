"use client";

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useTableContext } from "./TableContext";

type ViewSidebarVisibilityContextValue = {
  isViewSidebarVisible: boolean;
  setViewSidebarVisible: (visible: boolean) => void;
  toggleViewSidebar: () => void;
};

const ViewSidebarVisibilityContext = createContext<ViewSidebarVisibilityContextValue | null>(null);

export function ViewSidebarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [isViewSidebarVisible, setViewSidebarVisible] = useState(true);
  const { selectedTableId } = useTableContext();

  // Reset to visible whenever the selected table changes
  useEffect(() => {
    setViewSidebarVisible(true);
  }, [selectedTableId]);

  const value = useMemo(
    () => ({
      isViewSidebarVisible,
      setViewSidebarVisible,
      toggleViewSidebar: () => setViewSidebarVisible(v => !v)
    }),
    [isViewSidebarVisible]
  );

  return (
    <ViewSidebarVisibilityContext.Provider value={value}>
      {children}
    </ViewSidebarVisibilityContext.Provider>
  );
}

export function useViewSidebarVisibility() {
  const ctx = useContext(ViewSidebarVisibilityContext);
  if (!ctx) throw new Error("useViewSidebarVisibility must be used within ViewSidebarVisibilityProvider");
  return ctx;
}


