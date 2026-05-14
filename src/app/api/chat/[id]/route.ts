import { MessageRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/authSession';
import { CreateChatSchema } from '@/types/chat';
import { prisma } from '@/lib/prisma/client';
import { SYSTEM_PROMPT, SECURITY_POLICY, MODEL_IDENTITY_PROMPT } from '@/lib/prompts/systemPrompts';
import { RedisStore } from '@/store/upstash';
import { createCompletion } from '@/lib/ai/openrouter';

const store = RedisStore.getInstance();

const CreateChatWithImageSchema = CreateChatSchema.extend({
  image: z.string().optional(),
});

function detectInteractiveIntent(input: string): { type: 'quiz' | 'mcq' | 'flashcard' | null } {
  const text = input.toLowerCase();
  if (/(quiz|practice\s*(quiz|questions?)|5\s*questions?|multiple\s*questions?)/i.test(text)) {
    return { type: 'quiz' };
  }
  if (/(mcq|mcw|multiple\s*choice|single\s*question)/i.test(text)) {
    return { type: 'mcq' };
  }
  if (/(flash\s*card|flashcard)/i.test(text)) {
    return { type: 'flashcard' };
  }
  return { type: null };
}

/**
 * Extract topic from the persisted DB history (not Redis, which is cleared after each turn).
 * Grabs the last substantive assistant message to ground MCQ/quiz/flashcard generation.
 */
function extractTopicFromHistory(
  dbMessages: { role: MessageRole; content: string }[]
): string {
  // Walk backwards — find the most recent assistant message with real content
  for (let i = dbMessages.length - 1; i >= 0; i--) {
    const msg = dbMessages[i];
    if (msg.role === MessageRole.assistant && msg.content.trim().length > 80) {
      return msg.content.trim().slice(0, 600);
    }
  }
  // Fallback: last user message that isn't an intent trigger
  for (let i = dbMessages.length - 1; i >= 0; i--) {
    const msg = dbMessages[i];
    if (
      msg.role === MessageRole.user &&
      msg.content.trim().length > 10 &&
      !detectInteractiveIntent(msg.content).type
    ) {
      return msg.content.trim().slice(0, 600);
    }
  }
  return '';
}

function getFormattingInstruction(
  intentType: 'quiz' | 'mcq' | 'flashcard',
  topic: string
): string {
  const topicBlock = topic
    ? `You MUST base all questions STRICTLY on the following content from the conversation. Do NOT reference anything outside of it — not the platform name, not the model name, nothing else.\n\nConversation content:\n"""\n${topic}\n"""`
    : 'Use only the topic discussed in the conversation above.';

  if (intentType === 'quiz') {
    return `Generate a quiz with exactly 5 multiple choice questions.\n\n${topicBlock}\n\nEach question must have exactly 4 options with one marked as correct. The response will be formatted as a structured JSON object.`;
  }
  if (intentType === 'mcq') {
    return `Generate a single multiple choice question.\n\n${topicBlock}\n\nThe question must have exactly 4 options with one marked as correct. The response will be formatted as a structured JSON object.`;
  }
  if (intentType === 'flashcard') {
    return `Generate a flashcard.\n\n${topicBlock}\n\nCreate clear front and back content that is educational and concise. The response will be formatted as a structured JSON object.`;
  }
  return '';
}

const COMBINED_SYSTEM_MESSAGE = {
  role: MessageRole.system,
  content: [SECURITY_POLICY, '', SYSTEM_PROMPT, '', MODEL_IDENTITY_PROMPT].join('\n'),
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    const { id: conversationId } = await params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Conversation not found or unauthorized' },
        { status: 404 }
      );
    }

    let messages = await store.get(conversationId);

    if (messages.length === 0) {
      const dbMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });

      messages = dbMessages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: msg.createdAt.toISOString(),
        image: msg.image || undefined,
      }));
    }

    return NextResponse.json(
      {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          createdAt: conversation.createdAt,
        },
        messages: messages.map((msg) => ({
          id: msg.id || null,
          content: msg.content,
          role: msg.role,
          image: msg.image,
          createdAt: new Date(msg.timestamp || new Date()),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    const { id: conversationId } = await params;
    const body = await req.json();
    const { message, model, image } = CreateChatWithImageSchema.parse(body);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Conversation not found or unauthorized' },
        { status: 404 }
      );
    }

    const intent = detectInteractiveIntent(message);

    // Fetch persisted DB history BEFORE adding the new message.
    // Redis cache is deleted after each turn so cannot be used for topic extraction.
    let conversationTopic = '';
    if (intent.type) {
      const dbHistory = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true },
      });
      conversationTopic = extractTopicFromHistory(dbHistory);
    }

    const messages = await store.add(conversationId, {
      content: message,
      role: MessageRole.user,
      timestamp: new Date().toISOString(),
      image,
    });

    const openRouterMessages = [
      COMBINED_SYSTEM_MESSAGE,
      ...(intent.type
        ? [
            {
              role: MessageRole.system,
              content: getFormattingInstruction(intent.type, conversationTopic),
            },
          ]
        : []),
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        image: msg.image,
      })),
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullAssistantContent = '';
        try {
          await createCompletion(
            openRouterMessages,
            model,
            (chunk: string) => {
              fullAssistantContent += chunk;
              controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
            },
            intent.type || undefined
          );

          await store.add(conversationId, {
            content: fullAssistantContent,
            role: MessageRole.assistant,
            timestamp: new Date().toISOString(),
          });

          await prisma.message.create({
            data: {
              conversationId,
              content: message,
              role: MessageRole.user,
              image,
            },
          });
          await prisma.message.create({
            data: {
              conversationId,
              content: fullAssistantContent,
              role: MessageRole.assistant,
            },
          });

          await store.delete(conversationId);

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    const { id: conversationId } = await params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Conversation not found or unauthorized' },
        { status: 404 }
      );
    }

    await prisma.message.deleteMany({ where: { conversationId } });
    await prisma.conversation.delete({ where: { id: conversationId } });
    await store.delete(conversationId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}