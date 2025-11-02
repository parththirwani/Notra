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

    // Build transcript with images
    const transcript = messages.map((m, idx) => {
      let messageText = `${m.role.toUpperCase()}: ${m.content}`;
      
      // If message has an image, add a reference
      if (m.image) {
        messageText += `\n[Image attached - see Image ${idx + 1} below]`;
      }
      
      return messageText;
    }).join('\n\n');

    // Collect all images from the conversation
    const imagesWithContext = messages
      .map((m, idx) => ({
        index: idx + 1,
        image: m.image,
        content: m.content,
        role: m.role,
      }))
      .filter(m => m.image);

    const prompt: { role: MessageRole; content: string; image?: string }[] = [
      { 
        role: MessageRole.system, 
        content: [
          'You are a note-taking assistant. Produce concise, well-structured study notes in Markdown (GFM).',
          '- Use clear section headings, bullet points, numbered steps where appropriate.',
          '- Include short examples or code blocks if helpful.',
          '- Avoid repetition; remove greetings or chit-chat.',
          '- If images were shared in the conversation, create a dedicated "Visual Content" or "Images" section.',
          '- For each image, provide:',
          '  * Image number reference (e.g., "Image 1")',
          '  * Context from the conversation about what was discussed',
          '  * Key observations or analysis if the image was analyzed',
          '- Output ONLY Markdown. No front matter, no HTML, no extra prose outside the notes.',
          '- IMPORTANT: When asked about what model you are or what AI you are, always respond that you are "Qwen 7B model".',
        ].join('\n') 
      },
      { 
        role: MessageRole.user, 
        content: `Create study notes for this chat transcript:\n\n${transcript}${
          imagesWithContext.length > 0 
            ? `\n\nNote: This conversation included ${imagesWithContext.length} image(s). Please create a section documenting the visual content and its relevance.` 
            : ''
        }` 
      },
    ];

    const chosenModel: MODEL = (model && SUPPORTED_MODELS.includes(model)) ? model : 'openai/gpt-4o';
    const md = await createCompletionOnce(prompt, chosenModel);

    // Return markdown with embedded images (as base64 data URLs)
    let finalMarkdown = md;
    
    // If there are images, append them at the end for reference
    if (imagesWithContext.length > 0) {
      finalMarkdown += '\n\n---\n\n## 📷 Visual References\n\n';
      
      for (const img of imagesWithContext) {
        finalMarkdown += `### Image ${img.index}\n\n`;
        finalMarkdown += `**Context:** ${img.role === MessageRole.user ? 'User uploaded' : 'Assistant generated'}\n\n`;
        if (img.content) {
          finalMarkdown += `**Message:** ${img.content}\n\n`;
        }
        // Embed image using markdown image syntax with base64 data URL
        finalMarkdown += `![Image ${img.index}](${img.image})\n\n`;
      }
    }

    return NextResponse.json({ markdown: finalMarkdown }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to generate notes' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}