"use client";

import React from "react";
import Image from "next/image";



export function BaseHeader() {
  return (
    <header className="relative z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto flex w-full h-14 items-center px-4 ml-14">
        {/* Left side - Base icon, name, and dropdown */}
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
            Un
          </div>
          <span className="font-bold text-gray-900 text-base ml-2">Untitled Base</span>
          <div className="bg-white rounded p-1">
            <Image src="/5.PNG" alt="Dropdown" width={20} height={20} />
          </div>
        </div>
        
        {/* Center - Navigation tabs */}
        <div className="flex items-center space-x-4 h-full justify-center flex-1 ml-32">
          <div className="relative">
            <button className="font-semibold text-gray-900" style={{ fontSize: '13px' }}>
              Data
            </button>
            <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-orange-800"></div>
          </div>
          <button className="text-gray-700 hover:text-gray-900" style={{ fontSize: '13px' }}>
            Automations
          </button>
          <button className="text-gray-700 hover:text-gray-900" style={{ fontSize: '13px' }}>
            Interfaces
          </button>
          <button className="text-gray-700 hover:text-gray-900" style={{ fontSize: '13px' }}>
            Forms
          </button>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center space-x-2 pr-12">
          {/* 12.PNG button */}
          <button className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors">
            <Image src="/12.PNG" alt="Refresh" width={20} height={20} />
          </button>
          
          {/* Trial button */}
          <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 transition-colors">
            Trial: 9 days left
          </button>
          
          {/* Launch button */}
          <button className="flex items-center space-x-1.5 px-2 py-1.5 bg-white border border-gray-300 rounded-full text-gray-700 text-xs hover:bg-gray-50 transition-colors">
            <Image src="/13.PNG" alt="Launch" width={14} height={14} />
            <span>Launch</span>
          </button>
          
          {/* Share button */}
          <button className="px-2 py-1.5 bg-orange-800 text-white rounded-lg text-xs hover:bg-orange-900 transition-colors">
            Share
          </button>
        </div>
      </div>
    </header>
  );
} 