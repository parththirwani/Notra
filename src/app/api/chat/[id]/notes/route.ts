import { NextResponse } from 'next/server';
import { MessageRole } from '@prisma/client';
import { getAuthSession } from '@/lib/authSession';
import { createCompletionOnce } from '@/lib/ai/openrouter';
import { MODEL, SUPPORTED_MODELS } from '@/types/chat';
import { prisma } from '@/lib/prisma/client';
import { NOTES_GENERATION_PROMPT } from '@/lib/prompts/systemPrompts';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    const { id: conversationId } = await params;
    const { model }: { model?: MODEL } = await req.json().catch(() => ({}));

    const conversation = await prisma.conversation.findUnique({ 
      where: { id: conversationId } 
    });
    
    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Conversation not found or unauthorized' }, 
        { status: 404 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    // Build transcript (no image references)
    const transcript = messages.map((m) => {
      return `${m.role.toUpperCase()}: ${m.content}`;
    }).join('\n\n');

    const prompt: Array<{ role: MessageRole; content: string }> = [
      { 
        role: MessageRole.system, 
        content: NOTES_GENERATION_PROMPT
      },
      { 
        role: MessageRole.user, 
        content: `Create study notes for this chat transcript:\n\n${transcript}` 
      },
    ];

    const chosenModel: MODEL = (model && SUPPORTED_MODELS.includes(model)) 
      ? model 
      : 'openai/gpt-4o';
    
    const md = await createCompletionOnce(prompt, chosenModel);

    return NextResponse.json({ markdown: md }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Failed to generate notes' }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}