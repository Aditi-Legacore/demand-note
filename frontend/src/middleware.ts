import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { findMenuRouteAccess } from "@/lib/menuAccess";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (token) {
      const userRoles = (token?.roles as string[]) ?? [];

      const menuRoute = findMenuRouteAccess(pathname);

      if (menuRoute?.allowedRoles) {
        const hasAccess = menuRoute.allowedRoles.some((role) =>
          userRoles.includes(role)
        );

        if (!hasAccess) {
          return NextResponse.redirect(new URL("/", req.url));
        }
      }

      if (
        ["/auth-choice", "/login", "/signup", "/forgot-password"].includes(
          pathname
        )
      ) {
        return NextResponse.redirect(new URL("/", req.url));
      }

      return NextResponse.next();
    }

    if (
      !["/auth-choice", "/login", "/signup", "/forgot-password"].includes(
        pathname
      ) &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/_next") &&
      pathname !== "/favicon.ico"
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        if (
          ["/auth-choice", "/login", "/signup", "/forgot-password"].includes(
            pathname
          )
        ) {
          return true;
        }

        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|embed).*)"],
};
