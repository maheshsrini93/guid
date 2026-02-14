import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.hashedPassword) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionTier: user.subscriptionTier,
          subscriptionEndsAt: user.subscriptionEndsAt?.toISOString() ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = (user as unknown as { role: string }).role;
        token.subscriptionTier =
          (user as unknown as { subscriptionTier: string }).subscriptionTier ?? "free";
        token.subscriptionEndsAt =
          (user as unknown as { subscriptionEndsAt: string | null }).subscriptionEndsAt ?? null;
      }
      // Re-fetch subscription tier on session update to reflect webhook changes
      if (trigger === "update" && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { subscriptionTier: true, subscriptionEndsAt: true },
        });
        if (dbUser) {
          token.subscriptionTier = dbUser.subscriptionTier;
          token.subscriptionEndsAt = dbUser.subscriptionEndsAt?.toISOString() ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as {
          id: string;
          role: string;
          subscriptionTier: string;
          subscriptionEndsAt: string | null;
        };
        u.id = token.sub!;
        u.role = (token.role as string) ?? "user";
        u.subscriptionTier = (token.subscriptionTier as string) ?? "free";
        u.subscriptionEndsAt = (token.subscriptionEndsAt as string) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
