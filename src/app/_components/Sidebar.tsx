"use client";

import React, { useState } from "react";
import { useSidebar } from "./SidebarContext";

const HEADER_HEIGHT = 48; // matches h-12 in header

export function Sidebar() {
  const { isPinnedOpen } = useSidebar();
  const [isHovering, setIsHovering] = useState(false);

  const isOpen = isPinnedOpen || isHovering;

  return (
    <aside
      className={`${isOpen ? "w-72" : "w-14"} fixed left-0` +
        ` top-[${HEADER_HEIGHT}px] bottom-0 z-40 border-r-2 border-gray-200 bg-white/80 backdrop-blur-sm transition-all duration-200`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      aria-label="Sidebar"
    >
      {/* Empty placeholder content for now */}
    </aside>
  );
} 