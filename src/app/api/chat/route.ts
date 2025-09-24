import { PrismaClient, MessageRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createCompletion } from '@/lib/ai/openrouter';
import { getAuthSession } from '@/lib/authSession';
import { CreateChatSchema } from '@/types/chat';
import { RedisStore } from '@/lib/ai/InMeomeryStore';

const store = RedisStore.getInstance();

export async function POST(req: Request) {
  const prisma = new PrismaClient();
  try {
    const session = await getAuthSession();
    const body = await req.json();
    const { message, model } = CreateChatSchema.parse(body);
    
    const conversation = await prisma.conversation.create({
      data: { userId: session.user.id },
    });
    
    const conversationId = conversation.id;
    
    // ✅ Get messages from add() - for new conversation, this will be just the user message
    const messages = await store.add(conversationId, {
      content: message,
      role: MessageRole.user,
      timestamp: new Date().toISOString(),
    });
    
    console.log('[DEBUG] New conversation messages count:', messages.length);
    
    const openRouterMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullAssistantContent = '';
        try {
          // Send conversationId as the first SSE message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ conversationId })}\n\n`)
          );
          
          await createCompletion(openRouterMessages, model, (chunk: string) => {
            fullAssistantContent += chunk;
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          });
          
          // ✅ Add assistant message
          await store.add(conversationId, {
            content: fullAssistantContent,
            role: MessageRole.assistant,
            timestamp: new Date().toISOString(),
          });
          
          // Save to database
          await prisma.message.create({
            data: { conversationId, content: message, role: MessageRole.user },
          });
          await prisma.message.create({
            data: {
              conversationId,
              content: fullAssistantContent,
              role: MessageRole.assistant,
            },
          });
          
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

