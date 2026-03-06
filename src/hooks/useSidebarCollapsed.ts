"use client";

import { useEffect, useState } from "react";

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("sidebarCollapsed");
    setCollapsed(stored === "true");
  }, []);

  return collapsed;
}
