import { NextResponse } from 'next/server';
import { PrismaClient, MessageRole } from '@prisma/client';
import { getAuthSession } from '@/lib/authSession';
import { createCompletionOnce } from '@/lib/ai/openrouter';
import { MODEL, SUPPORTED_MODELS } from '@/types/chat';

const prisma = new PrismaClient();

export async function POST(req: Request, context: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    const { id: conversationId } = await context.params;
    const { model }: { model?: MODEL } = await req.json().catch(() => ({}));

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Conversation not found or unauthorized' }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    const transcript = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

    const prompt: { role: MessageRole; content: string }[] = [
      { role: MessageRole.system, content: [
        'You are a note-taking assistant. Produce concise, well-structured study notes in Markdown (GFM).',
        '- Use clear section headings, bullet points, numbered steps where appropriate.',
        '- Include short examples or code blocks if helpful.',
        '- Avoid repetition; remove greetings or chit-chat.',
        '- Output ONLY Markdown. No front matter, no HTML, no extra prose outside the notes.'
      ].join('\n') },
      { role: MessageRole.user, content: `Create study notes for this chat transcript:\n\n${transcript}` },
    ];

    const chosenModel: MODEL = (model && SUPPORTED_MODELS.includes(model)) ? model : 'openai/gpt-4o';
    const md = await createCompletionOnce(prompt, chosenModel);

    return NextResponse.json({ markdown: md }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to generate notes' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 