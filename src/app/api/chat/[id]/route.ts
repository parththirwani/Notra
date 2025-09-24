import { PrismaClient, MessageRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createCompletion } from '@/lib/ai/openrouter';
import { getAuthSession } from '@/lib/authSession';
import { CreateChatSchema } from '@/types/chat';
import { RedisStore } from '@/lib/ai/InMeomeryStore';

const store = RedisStore.getInstance();

export async function POST(req: Request, context: { params: { id: string } }) {
  const prisma = new PrismaClient();
  try {
    const session = await getAuthSession();
    const { id: conversationId } = await context.params;
    
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    
    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Conversation not found or unauthorized' },
        { status: 404 }
      );
    }
    
    const body = await req.json();
    const { message, model } = CreateChatSchema.parse(body);
    
    // ✅ Get messages from add() to avoid race condition
    const messages = await store.add(conversationId, {
      content: message,
      role: MessageRole.user,
      timestamp: new Date().toISOString(),
    });
    
    console.log('[DEBUG] Messages count:', messages.length);
    console.log('[DEBUG] Last message:', messages[messages.length - 1]);
    
    const openRouterMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullAssistantContent = '';
        try {
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