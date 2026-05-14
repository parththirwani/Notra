import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/authSession';
import { CreateChatSchema } from '@/types/chat';
import { MessageRole } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import { SYSTEM_PROMPT, SECURITY_POLICY, MODEL_IDENTITY_PROMPT } from '@/lib/prompts/systemPrompts';
import { RedisStore } from '@/store/upstash';
import { createCompletion } from '@/lib/ai/openrouter';
import { generateChatTitle } from '@/lib/titleService';

const store = RedisStore.getInstance();

const CreateChatWithImageSchema = CreateChatSchema.extend({
  image: z.string().optional(),
});

function detectInteractiveIntent(input: string): { type: 'quiz' | 'mcq' | 'flashcard' | null } {
  if (/(quiz|practice\s*(quiz|questions?)|5\s*questions?|multiple\s*questions?)/i.test(input)) {
    return { type: 'quiz' };
  }
  if (/(mcq|mcw|multiple\s*choice|single\s*question)/i.test(input)) {
    return { type: 'mcq' };
  }
  if (/(flash\s*card|flashcard)/i.test(input)) {
    return { type: 'flashcard' };
  }
  return { type: null };
}

function getFormattingInstruction(intentType: 'quiz' | 'mcq' | 'flashcard'): string {
  if (intentType === 'quiz') {
    return `Generate a quiz with exactly 5 multiple choice questions about the requested topic.
Each question must have exactly 4 options, with one marked as correct.
The response will be automatically formatted as a structured JSON object.`;
  }
  if (intentType === 'mcq') {
    return `Generate a single multiple choice question about the requested topic.
The question must have exactly 4 options, with one marked as correct.
The response will be automatically formatted as a structured JSON object.`;
  }
  if (intentType === 'flashcard') {
    return `Generate a flashcard about the requested topic.
Create clear front and back content that is educational and concise.
The response will be automatically formatted as a structured JSON object.`;
  }
  return '';
}

const COMBINED_SYSTEM_MESSAGE = {
  role: MessageRole.system,
  content: [SECURITY_POLICY, '', SYSTEM_PROMPT, '', MODEL_IDENTITY_PROMPT].join('\n'),
};

export async function GET() {
  try {
    const session = await getAuthSession();

    const conversations = await prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({ conversations }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    const body = await req.json();
    const { message, model, image } = CreateChatWithImageSchema.parse(body);

    // Generate a semantic title via the LLM title service
    const title = await generateChatTitle(message, !!image);

    const conversation = await prisma.conversation.create({
      data: {
        userId: session.user.id,
        title,
      },
    });

    const conversationId = conversation.id;

    const messages = await store.add(conversationId, {
      content: message,
      role: MessageRole.user,
      timestamp: new Date().toISOString(),
      image,
    });

    const intent = detectInteractiveIntent(message);

    const openRouterMessages = [
      COMBINED_SYSTEM_MESSAGE,
      ...(intent.type
        ? [{ role: MessageRole.system, content: getFormattingInstruction(intent.type) }]
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
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                conversationId,
                title: conversation.title,
              })}\n\n`
            )
          );

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