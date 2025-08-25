"use client";

import React from "react";
import Image from "next/image";

export function BaseHeader() {
  return (
    <header className="relative z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto flex w-full h-14 items-center px-4 ml-14">
        {/* Left side - Base icon, name, and dropdown */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
            U
          </div>
          <span className="font-bold text-gray-900 text-base">Untitled Base</span>
          <Image src="/5.PNG" alt="Dropdown" width={12} height={12} />
        </div>
        
        {/* Center - Navigation tabs */}
        <div className="flex items-center space-x-4 h-full justify-center flex-1">
          <button className="text-xs font-semibold text-gray-900">
            Data
          </button>
          <button className="text-xs text-gray-500 hover:text-gray-700">
            Automations
          </button>
          <button className="text-xs text-gray-500 hover:text-gray-700">
            Interfaces
          </button>
          <button className="text-xs text-gray-500 hover:text-gray-700">
            Forms
          </button>
        </div>
        
        {/* Right side - empty for now */}
        <div className="w-28"></div>
      </div>
    </header>
  );
} 