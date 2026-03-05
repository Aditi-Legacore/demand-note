import type { Session } from "next-auth";

export const isAppAdminRole = (role?: string | null): boolean =>
  role === "App admin" || role === "App Admin";

export const isAppAdminSession = (session?: Session | null): boolean => {
  const legacyRole = (session?.user as { role?: string | null } | undefined)?.role;
  if (isAppAdminRole(legacyRole)) return true;

  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  return roles.some((role) => isAppAdminRole(role));
};
