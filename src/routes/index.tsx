import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Editor } from "@/components/photo/Editor";
import { HomeScreen } from "@/components/photo/HomeScreen";
import { loadImageFromFile } from "@/lib/photo/render";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PhotoPro Editor — Pro photo editing in your browser" },
      {
        name: "description",
        content:
          "Edit photos with Lightroom-style sliders, 60+ filters, crop and rotate, before/after compare and high-resolution JPG, PNG or WebP export.",
      },
      { property: "og:title", content: "PhotoPro Editor — Pro photo editing in your browser" },
      {
        property: "og:description",
        content:
          "Pro-grade adjustments, 60+ cinematic and vintage filters, and high-resolution export — all running locally in your browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("photo.jpg");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const pick = async (file: File) => {
    try {
      const img = await loadImageFromFile(file);
      setFileName(file.name);
      setImage(img);
    } catch {
      toast.error("That file couldn't be opened as a photo");
    }
  };

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  if (!image) {
    return <HomeScreen onPick={pick} theme={theme} onToggleTheme={toggleTheme} />;
  }

  return (
    <Editor
      image={image}
      fileName={fileName}
      onBack={() => setImage(null)}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
