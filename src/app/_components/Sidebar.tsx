"use client";

import React, { useState } from "react";
import { useSidebar } from "./SidebarContext";

 

export function Sidebar() {
  const { isPinnedOpen } = useSidebar();
  const [isHovering, setIsHovering] = useState(false);

  const isOpen = isPinnedOpen || isHovering;

  return (
    <aside
      className={`${isOpen ? "w-72" : "w-14"} fixed left-0 top-[48px] bottom-0 z-40 border-r-2 border-gray-200 bg-white/80 backdrop-blur-sm transition-all duration-200`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      aria-label="Sidebar"
    >
      {/* Empty placeholder content for now */}
    </aside>
  );
} 