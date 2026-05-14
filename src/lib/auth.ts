import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...PrismaAdapter(prisma as any),
    createSession: undefined,
    getSessionAndUser: undefined,
    updateSession: undefined,
    deleteSession: undefined,
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
});