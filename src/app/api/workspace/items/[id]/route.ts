/**
 * src/app/api/workspace/items/[id]/route.ts
 *
 * DELETE a single workspace item. Also cleans up the parent topic if
 * it becomes empty after deletion.
 */

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/authSession";
import { prisma } from "@/lib/prisma/client";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    const { id } = await params;

    const item = await prisma.workspaceItem.findUnique({
      where: { id },
      select: { userId: true, topicId: true },
    });

    if (!item || item.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.workspaceItem.delete({ where: { id } });

    // Clean up empty topic
    const remaining = await prisma.workspaceItem.count({
      where: { topicId: item.topicId },
    });
    if (remaining === 0) {
      await prisma.workspaceTopic.delete({ where: { id: item.topicId } });
    }

    return NextResponse.json({ success: true });
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