import { PrismaClient, MessageRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createCompletion } from '@/lib/ai/openrouter';
import { getAuthSession } from '@/lib/authSession';
import { CreateChatSchema } from '@/types/chat';
import { RedisStore } from '@/lib/ai/InMeomeryStore';

const store = RedisStore.getInstance();

// Function to generate a title from the first message
const generateChatTitle = (message: string) => {
  const maxLength = 50; // Maximum length for title
  return message.length > maxLength 
    ? `${message.substring(0, maxLength - 3)}...`
    : message;
};

export async function GET(req: Request) {
  const prisma = new PrismaClient();
  try {
    const session = await getAuthSession();

    // Fetch all conversations for the user
    const conversations = await prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Use Redis store to get the most up-to-date messages for each conversation
    const enrichedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const messages = await store.get(conversation.id);
        return {
          id: conversation.id,
          userId: conversation.userId,
          title: conversation.title,
          createdAt: conversation.createdAt,
          messages: messages.map(msg => ({
            id: msg.id || null,
            content: msg.content,
            role: msg.role,
            createdAt: new Date(msg.timestamp || new Date()),
          })),
        };
      })
    );

    return NextResponse.json(
      { conversations: enrichedConversations },
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

export async function POST(req: Request) {
  const prisma = new PrismaClient();
  try {
    const session = await getAuthSession();
    const body = await req.json();
    const { message, model } = CreateChatSchema.parse(body);
    
    // Create conversation with a title
    const conversation = await prisma.conversation.create({
      data: { 
        userId: session.user.id,
        title: generateChatTitle(message),
      },
    });
    
    const conversationId = conversation.id;
    
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
          // Send conversationId and title as the first SSE message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              conversationId,
              title: conversation.title 
            })}\n\n`)
          );
          
          await createCompletion(openRouterMessages, model, (chunk: string) => {
            fullAssistantContent += chunk;
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          });
          
          // Add assistant message to cache
          await store.add(conversationId, {
            content: fullAssistantContent,
            role: MessageRole.assistant,
            timestamp: new Date().toISOString(),
          });
          
          // Save both messages to database
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
          
          // Clear Redis cache to ensure consistency
          await store.delete(conversationId);
          
          // Send completion message
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