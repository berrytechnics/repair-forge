"use client";

import { usePathname } from "next/navigation";
import { useUser } from "@/lib/UserContext";

interface MainContentProps {
  children: React.ReactNode;
}

export default function MainContent({ children }: MainContentProps) {
  const pathname = usePathname();
  const { user, isLoading } = useUser();
  
  // Don't apply sidebar margin on auth pages, home page, or when user is not logged in
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isHomePage = pathname === "/";
  const shouldShowSidebar = !isLoading && user && !isAuthPage && !isHomePage;
  
  return (
    <main className={`flex-1 p-4 lg:p-8 bg-background ${shouldShowSidebar ? "lg:ml-64" : ""}`}>
      {children}
    </main>
  );
}

