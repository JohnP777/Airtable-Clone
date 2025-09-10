"use client";

import React from "react";
import { useViewSidebarVisibility } from "./ViewSidebarVisibilityContext";

export function BurgerToggleButton() {
  const { toggleViewSidebar } = useViewSidebarVisibility();
  return (
    <button onClick={toggleViewSidebar} className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors">
      <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2"/>
        <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2"/>
        <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2"/>
      </svg>
    </button>
  );
}


