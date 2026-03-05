import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { menuItems } from "@/lib/menuItems";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // If the user has a valid session token
    if (token) {
      // Check if user has roles
      const userRoles = token.roles as string[] || [];
      
      // Using menuItems allowedRoles
      const menuItem = menuItems.find(item => item.path === pathname);
      if (menuItem?.allowedRoles) {
        const hasAccess = menuItem.allowedRoles.some(role => userRoles.includes(role));
        if (!hasAccess) {
          return NextResponse.redirect(new URL("/", req.url));
        }
      }

      // Prevent logged-in users from visiting auth pages
      if (pathname === "/auth-choice" || pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password") {
        return NextResponse.redirect(new URL("/", req.url));
      }
      
      return NextResponse.next();
    }

    // 🚫 No valid token (session expired or not logged in)
    // Redirect to auth-choice page if accessing a protected route
    if (
      pathname !== "/auth-choice" &&
      pathname !== "/login" &&
      pathname !== "/signup" &&
      pathname !== "/forgot-password" &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/_next") &&
      pathname !== "/favicon.ico"
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Allow unauthenticated users to access auth pages
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow access to auth pages
        if (pathname === "/auth-choice" || pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password") {
          return true;
        }

        // Require authentication for other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|embed).*)"],
};