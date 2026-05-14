/**
 * src/app/api/workspace/route.ts
 */

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/authSession";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    const session = await getAuthSession();

    const topics = await prisma.workspaceTopic.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        items: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            content: true,
            sourceConversationId: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ topics }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}