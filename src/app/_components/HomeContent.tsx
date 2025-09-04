"use client";

import Image from "next/image";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSidebar } from "./SidebarContext";
import { api } from "../../trpc/react";
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
      <div className={`${isPinnedOpen ? 'ml-72' : 'ml-6'} pr-4 max-w-[1480px] transition-all duration-200`}>
        <h1 className="mb-6 mt-4 text-3xl font-semibold text-gray-900" style={{ fontFamily: 'Grotesk S SH Bold, sans-serif' }}>
          Home
        </h1>

        <div className="grid grid-cols-4 gap-4 mb-8 pr-5">
          <div className="rounded-lg border border-gray-200 bg-white py-4 px-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Image src="/1.PNG" alt="Omni" width={26} height={26} />
              <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'FF Zwo Pro Semi Bold, sans-serif' }}>
                Start with Omni
              </h3>
            </div>
            <p className="text-[13px] text-gray-600 leading-normal" style={{ fontFamily: 'Neue Frutiger Cyrillic Condensed Light, sans-serif' }}>
              Use AI to build a custom app tailored to your workflow
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white py-4 px-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Image src="/2.PNG" alt="Templates" width={26} height={26} />
              <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'FF Zwo Pro Semi Bold, sans-serif' }}>
                Start with templates
              </h3>
            </div>
            <p className="text-[13px] text-gray-600 leading-normal" style={{ fontFamily: 'Neue Frutiger Cyrillic Condensed Light, sans-serif' }}>
              Select a template to get started and customize as you go.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white py-4 px-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Image src="/3.PNG" alt="Upload" width={26} height={26} />
              <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'FF Zwo Pro Semi Bold, sans-serif' }}>
                Quickly upload
              </h3>
            </div>
            <p className="text-[13px] text-gray-600 leading-normal" style={{ fontFamily: 'Neue Frutiger Cyrillic Condensed Light, sans-serif' }}>
              Easily migrate your existing projects in just a few minutes.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white py-4 px-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={handleCreateBase}>
            <div className="flex items-center gap-2 mb-1">
              <Image src="/4.PNG" alt="Build" width={26} height={26} />
              <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'FF Zwo Pro Semi Bold, sans-serif' }}>
                Build an app on your own
              </h3>
            </div>
            <p className="text-[13px] text-gray-600 leading-normal" style={{ fontFamily: 'Neue Frutiger Cyrillic Condensed Light, sans-serif' }}>
              Start with a blank app and build your ideal workflow.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6 pr-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Neue Frutiger Cyrillic Condensed Light, sans-serif' }}>Opened anytime</span>
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
          <>
            {(() => {
              const now = Date.now();
              const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();
              const today = recentBases.filter(base => isToday(new Date(base.lastOpened).getTime()));
              const past7Days = recentBases.filter(base => {
                const ts = new Date(base.lastOpened).getTime();
                const daysAgo = Math.floor((now - ts) / (1000 * 60 * 60 * 24));
                // Exclude today; include strictly 1..7 days
                return !isToday(ts) && daysAgo >= 1 && daysAgo <= 7;
              });
              const past30Days = recentBases.filter(base => {
                const daysAgo = Math.floor((now - new Date(base.lastOpened).getTime()) / (1000 * 60 * 60 * 24));
                // Exclude anything 7 days or newer; include strictly 8..30 days
                return daysAgo > 7 && daysAgo <= 30;
              });

              return (
                <>
                  {today.length > 0 && (
                    <>
                      <h2 className="text-xs font-medium text-gray-900 mb-3" style={{ fontFamily: 'Neue Frutiger Cyrillic Condensed Light, sans-serif' }}>
                        Today
                      </h2>
                      <div className="grid gap-4 pr-5 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, 332px)' }}>
                        {today.map((base: { id: string; name: string; lastOpened: Date }) => (
                          <BaseCard
                            key={base.id}
                            base={base}
                            onContextMenu={handleContextMenu}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  {past7Days.length > 0 && (
                    <>
                      <h2 className="text-xs font-medium text-gray-700 mb-3" style={{ fontFamily: 'Neue Frutiger Cyrillic Condensed Light, sans-serif' }}>
                        Past 7 days
                      </h2>
                      <div className="grid gap-4 pr-5 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, 320px)' }}>
                        {past7Days.map((base: { id: string; name: string; lastOpened: Date }) => (
                          <BaseCard
                            key={base.id}
                            base={base}
                            onContextMenu={handleContextMenu}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  {past30Days.length > 0 && (
                    <>
                      <h2 className="text-xs font-medium text-gray-700 mb-3" style={{ fontFamily: 'Neue Frutiger Cyrillic Condensed Light, sans-serif' }}>
                        Past 30 days
                      </h2>
                      <div className="grid gap-4 pr-5" style={{ gridTemplateColumns: 'repeat(auto-fit, 324px)' }}>
                        {past30Days.map((base: { id: string; name: string; lastOpened: Date }) => (
                          <BaseCard
                            key={base.id}
                            base={base}
                            onContextMenu={handleContextMenu}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </>
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