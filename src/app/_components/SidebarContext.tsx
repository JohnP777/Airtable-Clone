"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type SidebarContextValue = {
  isPinnedOpen: boolean;
  setPinnedOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isPinnedOpen, setPinnedOpen] = useState(false);

  const value = useMemo(
    () => ({ isPinnedOpen, setPinnedOpen }),
    [isPinnedOpen]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
} 