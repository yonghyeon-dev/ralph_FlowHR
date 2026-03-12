import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      role: string | null;
      tenantId: string | null;
      tenantSlug: string | null;
    };
  }

  interface User {
    role?: string | null;
    tenantId?: string | null;
    tenantSlug?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string | null;
    tenantId: string | null;
    tenantSlug: string | null;
  }
}
