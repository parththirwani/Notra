import { PrismaClient, MessageRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createCompletion } from '@/lib/ai/openrouter';
import { getAuthSession } from '@/lib/authSession';
import { CreateChatSchema } from '@/types/chat';
import { RedisStore } from '@/lib/ai/InMeomeryStore';

const store = RedisStore.getInstance();

// Updated schema to include optional image
const CreateChatWithImageSchema = CreateChatSchema.extend({
  image: z.string().optional(), // base64 data URL
});

// Function to generate a title from the first message
const generateChatTitle = (message: string, hasImage: boolean) => {
  const maxLength = 50;
  if (hasImage && !message.trim()) {
    return "Image analysis";
  }
  if (hasImage && message.trim()) {
    return `Image: ${message.length > maxLength ? message.substring(0, maxLength - 3) + '...' : message}`;
  }
  return message.length > maxLength 
    ? `${message.substring(0, maxLength - 3)}...`
    : message;
};

function detectInteractiveIntent(input: string): boolean {
  const text = input.toLowerCase();
  return /(mcq|mcw|multiple\s*choice|flash\s*card|flashcard|practice\s*(quiz|question|mcq))/i.test(text);
}

function getFormattingInstruction(): string {
  return [
    'You are an API message formatter. If and only if the user requests MCQ/MCW/flashcard practice, respond with a SINGLE JSON object and nothing else.',
    'Do NOT wrap in markdown code fences, do NOT add any prose before or after. No newlines before/after the JSON.',
    'Supported schemas:',
    '{ "type": "mcq", "question": string, "options": Array< { "text": string, "correct"?: boolean } | string >, "multipleCorrect"?: boolean }',
    '{ "type": "flashcard", "front": string, "back": string }',
    'Rules:',
    '- For MCQ, include "correct": true on the correct options when answers are known; omit otherwise.',
    '- Use "type": "mcw" interchangeably with "mcq" when the user says MCW.',
    '- Keep text concise; avoid excessive formatting or extra fields.',
  ].join('\n');
}

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
            image: msg.image || undefined,
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
    const { message, model, image } = CreateChatWithImageSchema.parse(body);
    
    // Create conversation with a title
    const conversation = await prisma.conversation.create({
      data: { 
        userId: session.user.id,
        title: generateChatTitle(message, !!image),
      },
    });
    
    const conversationId = conversation.id;
    
    const messages = await store.add(conversationId, {
      content: message,
      role: MessageRole.user,
      timestamp: new Date().toISOString(),
      image,
    });
    
    console.log('[DEBUG] New conversation messages count:', messages.length);
    
    // Build messages for OpenRouter, optionally prepend a system formatting instruction
    const shouldFormat = detectInteractiveIntent(message);
    const openRouterMessages = [
      ...(shouldFormat ? [{ role: MessageRole.system, content: getFormattingInstruction() }] : []),
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
          // Send conversationId and title as the first SSE message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              conversationId,
              title: conversation.title 
            })}\n\n`)
          );
          
          await createCompletion(openRouterMessages as any, model, (chunk: string) => {
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