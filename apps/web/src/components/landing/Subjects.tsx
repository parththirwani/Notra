const subjects = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
  "Electrical Eng.", "Mechanical Eng.", "Civil Eng."
];

const Subjects = () => {
  return (
    <section id="subjects" className="border-t bg-background">
      <div className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl tracking-tight md:text-4xl">Built for STEM</h2>
          <p className="mt-3 text-muted-foreground">Start with any of these, or create your own subject room.</p>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {subjects.map((s) => (
            <div
              key={s}
              className="rounded-md border bg-secondary px-3 py-2 text-center text-sm text-secondary-foreground hover:bg-muted/60 hover-scale"
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Subjects;