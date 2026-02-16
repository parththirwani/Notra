import NextAuth from "next-auth";
import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma/client";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
  }
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    session({ session, token }: { session: any; token: JWT }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      console.log("Session User ID:", session.user?.id);
      return session;
    },
    jwt({ token, user }: { token: JWT; user: any }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);