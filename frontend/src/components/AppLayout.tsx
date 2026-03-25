'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  session: unknown;
}

export default function AppLayout({ children, session }: AppLayoutProps) {
  const pathname = usePathname();

  // For fill and embed pages, render without navbar/sidebar for embedding
  const isEmbedPage = pathname.includes('/fill') || pathname.includes('/embed');

  // Auth pages should never show sidebar/navbar, regardless of session state
  // This fixes the issue where sidebar sometimes shows on auth-choice page after session expiration
  const isAuthPage = 
    pathname === '/auth-choice' || 
    pathname === '/login' || 
    pathname === '/signup' || 
    pathname === '/forgot-password';

  if (session && !isEmbedPage && !isAuthPage) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">{children}</main>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen">{children}</div>;
}
