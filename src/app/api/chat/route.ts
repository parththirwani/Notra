import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createCompletion } from '@/lib/ai/openrouter';
import { getAuthSession } from '@/lib/authSession';
import { CreateChatSchema } from '@/types/chat';
import { RedisStore } from '@/lib/ai/InMeomeryStore';
import { MessageRole } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import { SYSTEM_PROMPT, SECURITY_POLICY, MODEL_IDENTITY_PROMPT } from '@/lib/prompts/systemPrompts';

const store = RedisStore.getInstance();

const CreateChatWithImageSchema = CreateChatSchema.extend({
  image: z.string().optional(),
});

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

// Updated system message that combines security policy and system prompt
const COMBINED_SYSTEM_MESSAGE = {
  role: MessageRole.system,
  content: [
    SECURITY_POLICY,
    '',
    SYSTEM_PROMPT,
    '',
    MODEL_IDENTITY_PROMPT,
  ].join('\n')
};

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    const body = await req.json();
    const { message, model, image } = CreateChatWithImageSchema.parse(body);
    
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
    
    const shouldFormat = detectInteractiveIntent(message);
    
    // Build messages with combined system prompt
    const openRouterMessages = [
      COMBINED_SYSTEM_MESSAGE, // Security policy + system prompt + model identity
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