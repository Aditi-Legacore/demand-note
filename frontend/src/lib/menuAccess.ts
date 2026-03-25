export interface MenuRouteAccess {
  path: string;
  allowedRoles?: string[];
}

export const menuRouteAccess: MenuRouteAccess[] = [
  {
    path: "/",
    allowedRoles: ["admin", "App admin", "Legacore User", "Customer"],
  },
  {
    path: "/users",
    allowedRoles: ["admin", "App admin"],
  },
  {
    path: "/leads",
    allowedRoles: ["admin", "App admin", "Legacore User", "Customer"],
  },
  {
    path: "/intake-list",
    allowedRoles: ["admin", "App admin", "Legacore User"],
  },
  {
    path: "/intake-preview",
    allowedRoles: ["admin", "App admin", "Legacore User"],
  },
  {
    path: "/intake-form",
    allowedRoles: ["admin", "App admin", "Legacore User"],
  },
  {
    path: "/stages",
    allowedRoles: ["admin", "App admin", "Legacore User", "Customer"],
  },
  {
    path: "/reports",
    allowedRoles: ["admin", "App admin", "Legacore User", "Customer"],
  },
  {
    path: "/forms",
    allowedRoles: ["admin", "App admin", "Legacore User"],
  },
  {
    path: "/form-templates",
    allowedRoles: ["admin", "App admin", "Legacore User"],
  },
  {
    path: "/documents",
    allowedRoles: ["admin", "App admin", "Legacore User"],
  },
  {
    path: "/demand-notes",
    allowedRoles: ["admin", "App admin", "Legacore User", "Customer"],
  },
  {
    path: "/prompt-management",
    allowedRoles: ["App admin"],
  },
];

export function findMenuRouteAccess(path: string) {
  return menuRouteAccess.find((route) => route.path === path);
}
