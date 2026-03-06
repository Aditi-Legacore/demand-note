"use client";

import { Menu } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface SidebarTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

export function SidebarTrigger({ children, className = "", ...props }: SidebarTriggerProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-md border border-transparent bg-transparent text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:text-gray-300 ${className}`}
      {...props}
    >
      {children || <Menu className="h-5 w-5" aria-hidden />}
    </button>
  );
}
