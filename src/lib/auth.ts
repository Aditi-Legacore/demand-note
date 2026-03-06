import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "./prisma";
import { compare } from "bcrypt";
import { AuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
// import GoogleProvider from "next-auth/providers/google";

// Extend the built-in types
declare module "next-auth" {
  interface User {
    roles: string[];
    status: boolean;
    forcePasswordReset: boolean;
    role: string;
  }
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      roles: string[];
      role: string;
      status: boolean;
      forcePasswordReset: boolean;
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roles: string[];
    role: string;
    status: boolean;
    forcePasswordReset: boolean;
  }
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password)
          throw new Error("Missing credentials");

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password)
          throw new Error("No user found with this email");

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) throw new Error("Invalid credentials");

        // Handle roles - ensure it's an array
        let rolesArray: string[] = [];
        
        // Check if user.roles exists and is an array
        if (user.roles && Array.isArray(user.roles)) {
          rolesArray = user.roles;
        } 
        
        // Default to Customer if no roles found
        else {
          rolesArray = ["Customer"];
        }

        return {
          id: user.id,
          email: user.email,
          name: user.firstName || null,
          image: user.image || null,
          roles: rolesArray,
          role: rolesArray[0] ?? "Customer",
          status: user.status ?? false,
          forcePasswordReset: user.forcePasswordReset ?? false,
        };
      },
    }),
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 },
  pages: { signIn: "/auth-choice" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        // const userRoles =
        //   ((user as { roles?: string[] }).roles as string[] | undefined) ??
        //   (((user as { role?: string }).role ? [(user as { role?: string }).role as string] : []));
        token.id = user.id;
        token.roles = user.roles;
        token.role = user.role;
        token.status = user.status;
        token.forcePasswordReset = user.forcePasswordReset;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user.id = token.id;
        session.user.roles = token.roles;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.forcePasswordReset = token.forcePasswordReset;
      }
      return session;
    },
  },
};
