import { auth } from "An/server/auth";
import { redirect } from "next/navigation";
import { BaseHeader } from "../_components/BaseHeader";
import { BaseSidebar } from "../_components/BaseSidebar";
import { BaseContent } from "../_components/BaseContent";

export default async function BasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <BaseHeader />
      {/* Secondary banner - half height of main header */}
      <div className="h-8 bg-[#e6fce8] border-b border-gray-200"></div>
      <BaseSidebar />
      <div className="ml-14 pt-18 p-4">
        <BaseContent baseId={id} />
      </div>
    </div>
  );
} 