/**
 * src/lib/workspace/workspaceService.ts
 *
 * Called after a chat completion finishes to persist any interactive
 * content (MCQ / quiz / flashcard) into the user's personal workspace.
 */

import { prisma } from "@/lib/prisma/client";
import { findOrCreateTopic } from "./topicService";

type ItemType = "mcq" | "quiz" | "flashcard";

/**
 * Attempts to detect the item type from raw JSON content.
 * Returns null if the content isn't a recognised interactive format.
 */
function detectType(content: unknown): ItemType | null {
  if (
    content === null ||
    typeof content !== "object" ||
    !("type" in (content as object))
  ) {
    return null;
  }
  const t = (content as { type: unknown }).type;
  if (t === "mcq" || t === "mcw") return "mcq";
  if (t === "quiz") return "quiz";
  if (t === "flashcard") return "flashcard";
  return null;
}

/**
 * Called after fullAssistantContent is collected.
 * Silently no-ops if the content isn't an interactive payload.
 */
export async function saveWorkspaceItem(opts: {
  userId: string;
  conversationId: string;
  conversationTitle: string;
  rawContent: string;
}): Promise<void> {
  const { userId, conversationId, conversationTitle, rawContent } = opts;

  // 1. Parse the assistant message
  let parsed: unknown;
  try {
    const trimmed = rawContent.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return;
    parsed = JSON.parse(trimmed);
  } catch {
    return; // not JSON — normal markdown message, skip
  }

  // 2. Detect type
  const itemType = detectType(parsed);
  if (!itemType) return;

  // 3. Find or create the topic (with embedding similarity)
  // Use conversationTitle as the topic label
  const topicLabel = conversationTitle || "Untitled";
  const topicId = await findOrCreateTopic(userId, topicLabel);

  // 4. Persist the item
  await prisma.workspaceItem.create({
    data: {
      userId,
      topicId,
      type: itemType,
      content: parsed as object,
      sourceConversationId: conversationId,
    },
  });
}