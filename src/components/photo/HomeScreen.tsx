import { useRef } from "react";
import { Images, Sparkles, Wand2, Layers, SlidersHorizontal, Sun, Moon } from "lucide-react";

const HIGHLIGHTS = [
  { icon: SlidersHorizontal, title: "Pro adjustments", body: "Exposure, curveless tone control, grain, vignette and more, live." },
  { icon: Sparkles, title: "60+ looks", body: "Cinematic, vintage, portrait and mono presets with strength control." },
  { icon: Wand2, title: "AI tools", body: "Background removal and swap, object eraser, HD enhance, auto fix and retouch." },
  { icon: Layers, title: "Layers & text", body: "Text with 25+ fonts, 100+ stickers, brushes and a live layer stack." },
];

export function HomeScreen({
  onPick,
  theme,
  onToggleTheme,
}: {
  onPick: (file: File) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">PhotoPro Editor</span>
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-xl border border-border bg-secondary p-2 text-secondary-foreground transition-colors hover:bg-muted"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-16">
        <p className="mb-4 inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-xs tracking-widest text-muted-foreground">
          STAGE 1 — CORE EDITOR LIVE
        </p>
        <h1 className="max-w-3xl text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
          Edit photos like a pro,{" "}
          <span className="brand-text">right in your browser</span>.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground">
          A full-screen editor with Lightroom-style sliders, 60+ filters, crop and rotate,
          before/after comparison and high-resolution export.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Images className="size-4" />
            Choose a photo
          </button>
          <span className="text-xs text-muted-foreground">JPG, PNG or WebP — nothing leaves your device</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = "";
          }}
        />

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((item) => (
            <article key={item.title} className="panel rounded-2xl p-5">
              <item.icon className="mb-3 size-5 text-primary" />
              <h2 className="text-sm font-semibold">{item.title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
