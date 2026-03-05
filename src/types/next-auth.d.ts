import { DefaultSession } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      roles: string[];
      status: boolean;
      forcePasswordReset: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: string;
    roles: string[];
    status: boolean;
    forcePasswordReset: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: string;
    roles: string[];
    status: boolean;
    forcePasswordReset: boolean;
  }
}
