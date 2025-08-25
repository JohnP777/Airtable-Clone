"use client";

import Image from "next/image";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSidebar } from "./SidebarContext";
import { api } from "An/trpc/react";
import { BaseContextMenu } from "./BaseContextMenu";
import { BaseCard } from "./BaseCard";

export function HomeContent() {
  const { isPinnedOpen } = useSidebar();
  const router = useRouter();
  
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    baseId: string;
    baseName: string;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    baseId: "",
    baseName: "",
    position: { x: 0, y: 0 },
  });
  
  const utils = api.useUtils();
  const { data: recentBases } = api.base.getRecent.useQuery({ limit: 10 });
  const createBaseMutation = api.base.create.useMutation({
    onSuccess: (base) => {
      // Invalidate and refetch recent bases
      void utils.base.getRecent.invalidate();
      router.push(`/base/${base.id}`);
    },
  });


  const handleCreateBase = () => {
    void createBaseMutation.mutate({});
  };

  const handleContextMenu = (e: React.MouseEvent, baseId: string, baseName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      baseId,
      baseName,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, baseId: "", baseName: "", position: { x: 0, y: 0 } });
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] p-4">
      <div className={`${isPinnedOpen ? 'ml-72' : 'ml-14'} transition-all duration-200`}>
        <h1 className="mb-6 mt-4 text-2xl font-semibold text-gray-900" style={{ fontFamily: 'FF Zwo Pro Semi Bold, sans-serif' }}>
          Home
        </h1>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Image src="/1.PNG" alt="Omni" width={24} height={24} />
              <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'FF Zwo Pro Semi Bold, sans-serif' }}>
                Start with Omni
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed" style={{ fontFamily: 'awanzaman light, sans-serif' }}>
              Use AI to build a custom app tailored to your workflow
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Image src="/2.PNG" alt="Templates" width={24} height={24} />
              <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'FF Zwo Pro Semi Bold, sans-serif' }}>
                Start with templates
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed" style={{ fontFamily: 'awanzaman light, sans-serif' }}>
              Select a template to get started and customize as you go.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Image src="/3.PNG" alt="Upload" width={24} height={24} />
              <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'FF Zwo Pro Semi Bold, sans-serif' }}>
                Quickly upload
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed" style={{ fontFamily: 'awanzaman light, sans-serif' }}>
              Easily migrate your existing projects in just a few minutes.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={handleCreateBase}>
            <div className="flex items-center gap-2 mb-2">
              <Image src="/4.PNG" alt="Build" width={24} height={24} />
              <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'FF Zwo Pro Semi Bold, sans-serif' }}>
                Build an app on your own
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed" style={{ fontFamily: 'awanzaman light, sans-serif' }}>
              Start with a blank app and build your ideal workflow.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">Opened anytime</span>
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1 text-gray-500 hover:text-gray-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button className="p-1 text-gray-500 hover:text-gray-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>

        {recentBases && recentBases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recentBases.map((base: { id: string; name: string; lastOpened: Date }) => (
              <BaseCard
                key={base.id}
                base={base}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        ) : (
          <div className="text-center mt-32">
            <h2 className="mb-2 text-xl text-gray-900">You haven&apos;t opened anything recently</h2>
            <p className="mb-6 text-xs text-gray-600">Apps that you have recently opened will appear here.</p>
            <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Go to all workspaces
            </button>
          </div>
        )}
      </div>
      
      {/* Context Menu */}
              <BaseContextMenu
          baseId={contextMenu.baseId}
          isOpen={contextMenu.isOpen}
          onClose={closeContextMenu}
          position={contextMenu.position}
        />
    </div>
  );
} 