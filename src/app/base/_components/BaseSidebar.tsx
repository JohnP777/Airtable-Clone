"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export function BaseSidebar() {
  return (
    <aside
      className="fixed top-0 left-0 bottom-0 z-[999] w-14 border-r-2 border-gray-200 bg-white/80 backdrop-blur-sm"
      aria-label="Base Sidebar"
    >
      {/* Home button in top left corner */}
      <div className="p-3">
        <Link href="/" className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors">
          <Image src="/10.PNG" alt="Home" width={26} height={26} />
        </Link>
      </div>
      
      {/* Second button below home button */}
      <div className="px-3 -mt-1">
        <button className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors">
          <Image src="/11.png" alt="Second Button" width={33} height={33} />
        </button>
      </div>

      {/* Bottom icons - positioned at the bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        {/* Question mark icon */}
        <div className="px-3 pb-2">
          <button className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors">
            <Image src="/questionmark.png" alt="Help" width={16} height={16} />
          </button>
        </div>
        
        {/* Bell icon */}
        <div className="px-3 pb-2">
          <button className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors">
            <Image src="/bell.png" alt="Notifications" width={18} height={18} />
          </button>
        </div>
        
        {/* Profile icon */}
        <div className="px-3 pb-3">
          <button className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors">
            <Image src="/profile.svg" alt="Profile" width={28} height={28} />
          </button>
        </div>
      </div>

    </aside>
  );
} 