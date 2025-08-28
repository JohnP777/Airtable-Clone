import { auth } from "An/server/auth";
import { redirect } from "next/navigation";
import { BaseHeader } from "../_components/BaseHeader";
import { BaseSidebar } from "../_components/BaseSidebar";
import { BaseContent } from "../_components/BaseContent";
import { TableButtonsWrapper } from "../_components/TableButtonsWrapper";
import { TableProvider } from "../_components/TableContext";
import { SortProvider } from "../_components/SortContext";
import { FilterProvider } from "../_components/FilterContext";
import { FilterSortButtons } from "../_components/FilterSortButtons";

export default async function BasePage({ params, }: { params: Promise<{ id: string }>; }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) { redirect("/"); }

  return (
    <TableProvider baseId={id}>
      <SortProvider>
        <FilterProvider>
          <div className="min-h-screen bg-[#f9fafb]">
            <BaseHeader />
            {/* Secondary banner with table buttons */}
            <div className="h-8 bg-[#e6fce8] border-b border-gray-200 flex items-center">
              <div className="ml-14 px-4">
                <TableButtonsWrapper baseId={id} />
              </div>
            </div>
            {/* Third header bar with Filter and Sort buttons */}
            <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
              <div className="ml-14"></div>
              <div className="flex items-center space-x-2 pr-4">
                <FilterSortButtons />
              </div>
            </div>
            <BaseSidebar />
            <div className="ml-14 flex">
              <BaseContent baseId={id} />
            </div>
          </div>
        </FilterProvider>
      </SortProvider>
    </TableProvider>
  );
} 