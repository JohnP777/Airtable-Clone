import { Hero } from "An/app/_components/Hero";
import { HomeContent } from "An/app/_components/HomeContent";
import { AuthedHeader } from "An/app/_components/AuthedHeader";
import { Sidebar } from "An/app/_components/Sidebar";
import { SidebarProvider } from "An/app/_components/SidebarContext";
import { auth } from "An/server/auth";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    // Authenticated home page with sidebar and content
    return (
      <SidebarProvider>
        <AuthedHeader />
        <Sidebar />
        <div className="pl-14 sm:pl-14">
          <HomeContent />
        </div>
      </SidebarProvider>
    );
  }

  // Public welcome page
  return (
    <main>
      <Hero />
    </main>
  );
}
