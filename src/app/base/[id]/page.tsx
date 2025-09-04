import { auth } from "../../../server/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { BaseHeader } from "../_components/BaseHeader";
import { BaseSidebar } from "../_components/BaseSidebar";
import { BaseContent } from "../_components/BaseContent";
import { TableButtonsWrapper } from "../_components/TableButtonsWrapper";
import { TableProvider } from "../_components/TableContext";
import { SortProvider } from "../_components/SortContext";
import { FilterProvider } from "../_components/FilterContext";
import { SearchProvider } from "../_components/SearchContext";
import { HiddenFieldsProvider } from "../_components/HiddenFieldsContext";
import { ViewProvider } from "../_components/ViewContext";
import { LoadedRowsProvider } from "../_components/LoadedRowsContext";
import { FilterSortButtons } from "../_components/FilterSortButtons";

export default async function BasePage({ params, }: { params: Promise<{ id: string }>; }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) { redirect("/"); }

  return (
    <TableProvider baseId={id}>
      <ViewProvider baseId={id}>
        <SortProvider>
          <FilterProvider>
            <SearchProvider>
              <HiddenFieldsProvider>
                <LoadedRowsProvider>
                <div className="min-h-screen bg-[#f6f8fc] relative overflow-hidden">
                  {/* Fixed Base Header */}
                  <div className="fixed top-0 left-0 right-0 z-50 bg-[#f6f8fc]">
                    <BaseHeader />
                  </div>
                  
                  {/* Fixed Secondary banner with table buttons */}
                  <div className="fixed top-12 left-0 right-0 z-40 bg-[#f6f8fc]">
                    <div className="h-10 bg-[#fff4dc] border-b border-gray-200 flex items-center justify-between">
                      <div className="ml-14 px-4">
                        <TableButtonsWrapper baseId={id} />
                      </div>
                      <div className="-mr-2 pt-2">
                        <button className="flex items-center space-x-1 px-3 py-1.5 bg-[#fff4dc] text-gray-700 rounded-md text-xs">
                          <span>Tools</span>
                          <Image src="/14.PNG" alt="Dropdown" width={16} height={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Fixed Third header bar with Filter/Sort buttons */}
                  <div className="fixed top-22 left-0 right-0 z-30 bg-[#f6f8fc]">
                    <div className="h-12 bg-[#ffffff] border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center space-x-2 pl-18">
                        <button className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors">
                          <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2"/>
                            <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2"/>
                            <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </button>
                                                 <button className="flex items-center space-x-2 px-2 py-1.5 rounded-md text-xs hover:bg-gray-100 transition-colors">
                           <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                             <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.5"/>
                             <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="1.5"/>
                             <line x1="12" y1="9" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5"/>
                           </svg>
                           <span className="font-medium text-gray-700">Grid view</span>
                           <Image src="/5.PNG" alt="Dropdown" width={12} height={12} />
                         </button>
                      </div>
                      <div className="flex items-center space-x-2 pr-4">
                        <FilterSortButtons />
                      </div>
                    </div>
                  </div>
                  
                  {/* Main content area with fixed sidebars */}
                  <div className="flex" style={{ marginTop: '132px' }}>
                    {/* Fixed Left Sidebar - now overlapping everything */}
                    <div className="fixed top-0 left-0 bottom-0 z-[999] bg-[#f6f8fc] w-14">
                      <BaseSidebar />
                    </div>
                    
                    {/* Content area with fixed right sidebar */}
                    <div className="flex flex-1 overflow-hidden">
                      <BaseContent baseId={id} />
                    </div>
                  </div>
                                  </div>
                </LoadedRowsProvider>
              </HiddenFieldsProvider>
            </SearchProvider>
          </FilterProvider>
        </SortProvider>
      </ViewProvider>
    </TableProvider>
  );
} 