import { auth } from "../../../server/auth";
import { redirect } from "next/navigation";
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
                <div className="h-screen bg-[#f9fafb] relative">
              {/* Fixed Base Header */}
              <div className="fixed top-0 left-0 right-0 z-50 bg-[#f9fafb]">
                <BaseHeader />
              </div>
              
              {/* Fixed Secondary banner with table buttons */}
              <div className="fixed top-12 left-0 right-0 z-40 bg-[#f9fafb]">
                <div className="h-8 bg-[#e6fce8] border-b border-gray-200 flex items-center">
                  <div className="ml-14 px-4">
                    <TableButtonsWrapper baseId={id} />
                  </div>
                </div>
              </div>
              
              {/* Fixed Third header bar with Filter/Sort buttons */}
              <div className="fixed top-20 left-0 right-0 z-30 bg-[#f9fafb]">
                <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center justify-end">
                  <div className="flex items-center space-x-2 pr-4">
                    <FilterSortButtons />
                  </div>
                </div>
              </div>
              
              {/* Main content area with fixed sidebars */}
              <div className="flex" style={{ marginTop: '112px' }}>
                {/* Fixed Left Sidebar - now overlapping everything */}
                <div className="fixed top-0 left-0 bottom-0 z-[999] bg-[#f9fafb] w-14">
                  <BaseSidebar />
                </div>
                
                {/* Content area with fixed right sidebar */}
                <div className="flex flex-1">
                  <BaseContent baseId={id} />
                </div>
              </div>
            </div>
            </HiddenFieldsProvider>
        </SearchProvider>
        </FilterProvider>
      </SortProvider>
        </ViewProvider>
    </TableProvider>
  );
} 