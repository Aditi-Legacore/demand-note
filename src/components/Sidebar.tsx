"use client";

import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { menuItems } from "@/lib/menuItems";
import LoginLogoBg from "../../public/assets/images/auth/logo.png";
import Image from "next/image";
import { useSession } from "next-auth/react";
import LoadingSkeleton from "@/components/ui/loading-skeleton";

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Get user roles from session
  const userRoles = session?.user?.roles || [];
  
  // Filter menu items based on allowedRoles
  const filteredMenuItems = menuItems.filter(item => {
    // If item has allowedRoles, check if user has any of those roles
    if (item.allowedRoles) {
      return item.allowedRoles.some(role => userRoles.includes(role));
    }
    // If no allowedRoles specified, show to everyone
    return true;
  });

  const isPathActive = (itemPath: string, activePaths?: string[]) => {
    const pathsToMatch = activePaths?.length ? activePaths : [itemPath];
    return pathsToMatch.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        ) : (
          <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          h-screen w-64 sm:w-72 lg:w-64 xl:w-72
          p-2 lg:p-3
          bg-white dark:bg-gray-900 
          flex flex-col 
          border-r border-gray-200 dark:border-gray-800
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Top Section */}
        <div className="mb-8 flex items-center gap-2">
          <Link 
            href="/" 
            className="flex items-center gap-2"
            onClick={() => {
              setIsMobileMenuOpen(false);
            }}
          >
            <Image
              src={LoginLogoBg}
              alt="Legacore Infomatics"
              width={40}
              height={40}
              className="h-5 lg:h-5 w-auto object-contain"
            />
            <h2 className="text-md lg:text-md font-bold">
              Lega<span className="font-semibold text-green-300">sys</span>
            </h2>
          </Link>
        </div>

        {/* Menu Section */}
        <nav className="flex-1 overflow-y-auto">
          {status === "loading" ? (
            <LoadingSkeleton
              message={null}
              rowCount={7}
              cardClassName="shadow-none border-none bg-transparent"
              contentClassName="p-0 space-y-3"
              rowWidths={["w-5/6", "w-full", "w-4/5", "w-3/4", "w-full", "w-2/3", "w-5/6"]}
              rowClassNames={["h-8 rounded-sm", "h-8 rounded-sm", "h-8 rounded-sm", "h-8 rounded-sm", "h-8 rounded-sm", "h-8 rounded-sm", "h-8 rounded-sm"]}
            />
          ) : (
            <ul className="space-y-0">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = isPathActive(item.path, item.activePaths);

                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-2 py-2  transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
