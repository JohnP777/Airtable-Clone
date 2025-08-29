"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export function BaseSidebar() {
  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-50 border-r-2 border-gray-200 bg-white/80 backdrop-blur-sm w-14"
      aria-label="Base Sidebar"
    >
      {/* Home button in top left corner */}
      <div className="p-3">
        <Link href="/" className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors">
          <Image src="/10.PNG" alt="Home" width={33} height={33} />
        </Link>
      </div>
      

    </aside>
  );
} 