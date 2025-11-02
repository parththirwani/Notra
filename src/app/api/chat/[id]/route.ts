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

function detectInteractiveIntent(input: string): { type: 'quiz' | 'mcq' | 'flashcard' | null } {
  const text = input.toLowerCase();
  
  // Check for quiz intent (multiple questions)
  if (/(quiz|practice\s*(quiz|questions?)|5\s*questions?|multiple\s*questions?)/i.test(text)) {
    console.log('[DEBUG] Detected QUIZ intent for:', text);
    return { type: 'quiz' };
  }
  
  // Check for single MCQ intent
  if (/(mcq|mcw|multiple\s*choice|single\s*question)/i.test(text)) {
    console.log('[DEBUG] Detected MCQ intent for:', text);
    return { type: 'mcq' };
  }
  
  // Check for flashcard intent
  if (/(flash\s*card|flashcard)/i.test(text)) {
    console.log('[DEBUG] Detected FLASHCARD intent for:', text);
    return { type: 'flashcard' };
  }
  
  console.log('[DEBUG] No interactive intent detected for:', text);
  return { type: null };
}

function getFormattingInstruction(intentType: 'quiz' | 'mcq' | 'flashcard'): string {
  if (intentType === 'quiz') {
    return `You are a quiz generator. Generate a quiz with exactly 5 questions about the requested topic.

CRITICAL: You must respond with ONLY a valid JSON object. No markdown, no code fences, no additional text.

Required JSON format:
{
  "type": "quiz",
  "title": "Quiz Title Here",
  "questions": [
    {
      "question": "Question text here?",
      "options": [
        {"text": "Option A", "correct": false},
        {"text": "Option B", "correct": true},
        {"text": "Option C", "correct": false},
        {"text": "Option D", "correct": false}
      ]
    }
  ]
}

Rules:
- Generate exactly 5 questions
- Each question must have exactly 4 options
- Mark the correct answer with "correct": true
- Make questions educational and challenging
- Respond with ONLY the JSON object, nothing else`;
  }
  
  if (intentType === 'mcq') {
    return `You are an MCQ generator. Generate a single multiple choice question about the requested topic.

CRITICAL: You must respond with ONLY a valid JSON object. No markdown, no code fences, no additional text.

Required JSON format:
{
  "type": "mcq",
  "question": "Question text here?",
  "options": [
    {"text": "Option A", "correct": false},
    {"text": "Option B", "correct": true},
    {"text": "Option C", "correct": false},
    {"text": "Option D", "correct": false}
  ]
}

Rules:
- Generate exactly 1 question with 4 options
- Mark the correct answer with "correct": true
- Respond with ONLY the JSON object, nothing else`;
  }
  
  if (intentType === 'flashcard') {
    return `You are a flashcard generator. Generate a flashcard about the requested topic.

CRITICAL: You must respond with ONLY a valid JSON object. No markdown, no code fences, no additional text.

Required JSON format:
{
  "type": "flashcard",
  "front": "Front side text",
  "back": "Back side text"
}

Rules:
- Create clear front and back content
- Make it educational and concise
- Respond with ONLY the JSON object, nothing else`;
  }
  
  return '';
}

export async function GET(req: Request, context: { params: { id: string } }) {
  const prisma = new PrismaClient();
  try {
    const session = await getAuthSession();
    const { id: conversationId } = await context.params;

    // Fetch the conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Conversation not found or unauthorized' }, { status: 404 });
    }

    // Get messages from Redis cache first, then fallback to database
    let messages = await store.get(conversationId);
    
    if (messages.length === 0) {
      // Fallback to database if Redis is empty
      const dbMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });
      
      messages = dbMessages.map(msg => ({
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
        messages: messages.map(msg => ({
          id: msg.id || null,
          content: msg.content,
          role: msg.role,
          image: msg.image,
          createdAt: new Date(msg.timestamp || new Date()),
        }))
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

export async function POST(req: Request, context: { params: { id: string } }) {
  const prisma = new PrismaClient();
  try {
    const session = await getAuthSession();
    const { id: conversationId } = await context.params;
    const body = await req.json();
    const { message, model, image } = CreateChatWithImageSchema.parse(body);

    // Verify conversation ownership
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Conversation not found or unauthorized' }, { status: 404 });
    }

    // Add user message to cache
    const messages = await store.add(conversationId, {
      content: message,
      role: MessageRole.user,
      timestamp: new Date().toISOString(),
      image,
    });

    console.log('[DEBUG] Existing conversation messages count:', messages.length);

    // Build messages for OpenRouter, optionally prepend a system formatting instruction
    const intent = detectInteractiveIntent(message);
    const openRouterMessages = [
      ...(intent.type ? [{ role: MessageRole.system, content: getFormattingInstruction(intent.type) }] : []),
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        image: msg.image,
      })),
    ];

    console.log('[DEBUG] Intent detected:', intent.type);
    console.log('[DEBUG] System instruction added:', !!intent.type);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullAssistantContent = '';
        try {
          await createCompletion(openRouterMessages as any, model, (chunk: string) => {
            fullAssistantContent += chunk;
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          });

          console.log('[DEBUG] Full assistant response:', fullAssistantContent);

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

export async function DELETE(req: Request, context: { params: { id: string } }) {
  const prisma = new PrismaClient();
  try {
    const session = await getAuthSession();
    const { id: conversationId } = await context.params;

    // Verify conversation ownership
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Conversation not found or unauthorized' }, { status: 404 });
    }

    // Delete from database
    await prisma.message.deleteMany({
      where: { conversationId },
    });
    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    // Clear from Redis cache
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