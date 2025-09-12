"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProfileDropdownUpward } from "../../_components/ProfileDropdownUpward";

export function BaseSidebar() {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isProfileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 z-[999] w-14 border-r border-gray-200 bg-white/80 backdrop-blur-sm"
      aria-label="Base Sidebar"
    >
      {/* Home button */}
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

      {/* Icons at bottom of sidebar */}
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
        <div className="px-3 pb-3 relative" ref={dropdownRef}>
          <button 
            className={`flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors ${
              isProfileDropdownOpen ? 'bg-gray-100' : ''
            }`}
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} //Toggle profile button dropdown
          >
            <Image src="/profile.svg" alt="Profile" width={28} height={28} />
          </button>
          <ProfileDropdownUpward 
            isOpen={isProfileDropdownOpen} 
            onClose={() => setIsProfileDropdownOpen(false)} 
          />
        </div>
      </div>

    </aside>
  );
} 