import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Editor } from "@/components/photo/Editor";
import { HomeScreen } from "@/components/photo/HomeScreen";
import { BottomNav, type NavKey } from "@/components/shell/BottomNav";
import { InstallBanner } from "@/components/shell/InstallBanner";
import { InstallScreen } from "@/components/shell/InstallScreen";
import { PhoneFrame } from "@/components/shell/PhoneFrame";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { loadImageFromFile } from "@/lib/photo/render";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PhotoPro Editor — Pro photo editing in your browser" },
      {
        name: "description",
        content:
          "Edit photos with Lightroom-style sliders, 60+ filters, AI background removal, text, stickers and high-resolution JPG, PNG or WebP export.",
      },
      { property: "og:title", content: "PhotoPro Editor — Pro photo editing in your browser" },
      {
        property: "og:description",
        content:
          "Pro adjustments, 60+ filters, AI tools and HD export — all running locally in your browser.",
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
  const [nav, setNav] = useState<NavKey>("home");
  const [focusTab, setFocusTab] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { available, installed, install } = usePwaInstall();

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const pick = async (file: File) => {
    try {
      const img = await loadImageFromFile(file);
      setFileName(file.name);
      setImage(img);
      setNav("edit");
      setFocusTab("Filters");
    } catch {
      toast.error("That file couldn't be opened as a photo");
    }
  };

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const selectNav = (key: NavKey) => {
    if ((key === "edit" || key === "ai") && !image) {
      toast.info("Choose a photo first");
      setNav("home");
      return;
    }
    setNav(key);
    if (key === "edit") setFocusTab("Filters");
    if (key === "ai") setFocusTab("AI");
  };

  const onInstall = async () => {
    const outcome = await install();
    if (outcome === "unavailable") {
      setNav("install");
      toast.info("Use your browser menu → Add to Home Screen");
    }
    setBannerDismissed(true);
  };

  let screen: React.ReactNode;
  if (nav === "install") {
    screen = <InstallScreen />;
  } else if (nav === "home" || !image) {
    screen = (
      <div className="no-scrollbar h-full overflow-y-auto pb-24">
        <HomeScreen onPick={pick} theme={theme} onToggleTheme={toggleTheme} />
      </div>
    );
  } else {
    screen = (
      <Editor
        image={image}
        fileName={fileName}
        onBack={() => {
          setImage(null);
          setNav("home");
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        focusTab={focusTab}
        bottomInset
      />
    );
  }

  return (
    <PhoneFrame>
      <div className="relative h-full w-full overflow-hidden bg-background">
        {screen}
        <InstallBanner
          show={!installed && !bannerDismissed && nav !== "install"}
          onInstall={onInstall}
          onDismiss={() => setBannerDismissed(true)}
        />
        <BottomNav active={nav} onSelect={selectNav} />
        {available ? null : null}
      </div>
    </PhoneFrame>
  );
}
