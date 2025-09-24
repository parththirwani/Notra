import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { Session } from "next-auth";

export const getAuthSession = async (): Promise<Session & { user: { id: string } }> => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    throw new Error("Unauthorized: No valid session found");
  }
  return session as Session & { user: { id: string } };
};