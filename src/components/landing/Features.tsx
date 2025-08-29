
import { MessageSquare, UploadCloud, Layers3, FileCheck2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

const items = [
  {
    icon: Layers3,
    title: "Subject rooms",
    desc: "Spin up focused spaces for Physics, Calculus, CS and more — keep materials and chats organized.",
  },
  {
    icon: UploadCloud,
    title: "Bring your material",
    desc: "Drop notes, PDFs, problem sets. Notra parses and understands your content for precise help.",
  },
  {
    icon: MessageSquare,
    title: "Chat that learns",
    desc: "Converse with your notes. Notra cites, links, and remembers context within each room.",
  },
  {
    icon: FileCheck2,
    title: "Assessments on tap",
    desc: "Generate flashcards, MCQs, and full-length 3‑hour exams with solutions — tailored to your inputs.",
  },
];

const Features = () => {
  return (
    <section id="features" className="bg-subtle">
      <div className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl tracking-tight md:text-4xl">Everything in one focused workspace</h2>
          <p className="mt-3 text-muted-foreground">
            Private rooms, structured knowledge, and rigorous testing — all in clean black & white.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <Card key={it.title} className="transition-colors hover:bg-accent/50">
              <CardHeader>
                <it.icon className="h-6 w-6" />
                <CardTitle className="mt-3 text-lg">{it.title}</CardTitle>
                <CardDescription>{it.desc}</CardDescription>
              </CardHeader>
              <CardContent>{/* reserved for future visuals */}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
