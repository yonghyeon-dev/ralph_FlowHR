import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            role: true,
            tenant: true,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordValid) {
          // Fallback: allow plain-text demo passwords during development
          if (
            process.env.NODE_ENV !== "production" &&
            credentials.password === user.password
          ) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role?.name ?? null,
              tenantId: user.tenantId,
              tenantSlug: user.tenant?.slug ?? null,
            };
          }
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role?.name ?? null,
          tenantId: user.tenantId,
          tenantSlug: user.tenant?.slug ?? null,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            tenantId: process.env.AZURE_AD_TENANT_ID ?? "common",
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, link to existing user or create new one
      if (account?.provider !== "credentials" && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { role: true, tenant: true },
        });

        if (existingUser) {
          // Ensure account link exists
          const existingAccount = await prisma.account.findFirst({
            where: {
              userId: existingUser.id,
              provider: account!.provider,
            },
          });

          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account!.type,
                provider: account!.provider,
                providerAccountId: account!.providerAccountId,
                access_token: account!.access_token,
                refresh_token: account!.refresh_token,
                expires_at: account!.expires_at,
                token_type: account!.token_type,
                scope: account!.scope,
                id_token: account!.id_token,
                session_state: account!.session_state as string | undefined,
              },
            });
          }

          user.id = existingUser.id;
          user.role = existingUser.role?.name ?? null;
          user.tenantId = existingUser.tenantId;
          user.tenantSlug = existingUser.tenant?.slug ?? null;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? null;
        token.tenantId = user.tenantId ?? null;
        token.tenantSlug = user.tenantSlug ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.tenantId = token.tenantId;
      session.user.tenantSlug = token.tenantSlug;
      return session;
    },
  },
};
