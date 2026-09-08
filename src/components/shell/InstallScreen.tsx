import { motion } from "framer-motion";
import { Download, Share2, ShieldCheck, Star, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import appIcon from "@/assets/app-icon.png";
import shot1 from "@/assets/shot-1.jpg";
import shot2 from "@/assets/shot-2.jpg";
import shot3 from "@/assets/shot-3.jpg";
import { usePwaInstall } from "@/hooks/use-pwa-install";

const SHOTS = [shot1, shot2, shot3];

const STATS = [
  { value: "4.8★", label: "12K reviews" },
  { value: "500K+", label: "Downloads" },
  { value: "3+", label: "Rated for" },
];

const BARS = [92, 6, 1, 0.5, 0.5];

export function InstallScreen() {
  const { available, installed, install } = usePwaInstall();

  const onInstall = async () => {
    const outcome = await install();
    if (outcome === "unavailable") {
      toast.info("Use your browser menu → Add to Home Screen to install");
    } else if (outcome === "accepted") {
      toast.success("Installing PhotoPro Editor");
    }
  };

  return (
    <div className="no-scrollbar h-full overflow-y-auto bg-background pb-28">
      <div className="px-5 pt-8">
        <div className="flex items-start gap-4">
          <img
            src={appIcon}
            alt="PhotoPro Editor app icon"
            width={96}
            height={96}
            className="size-20 rounded-[24px] border border-border/70 shadow-[var(--shadow-pop)]"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl leading-tight font-semibold tracking-tight">PhotoPro Editor</h1>
            <p className="mt-0.5 text-sm font-medium text-primary">PhotoPro Studio</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Contains no ads · In-app free</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 divide-x divide-border/70 rounded-[24px] border border-border/60 bg-surface-2/60 py-3 backdrop-blur-xl">
          {STATS.map((s) => (
            <div key={s.label} className="px-2 text-center">
              <p className="text-sm font-semibold">{s.value}</p>
              <p className="mt-0.5 text-[10px] tracking-wide text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={onInstall}
          disabled={installed}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-[24px] bg-[oklch(0.72_0.17_150)] px-6 py-4 text-sm font-bold tracking-wide text-[oklch(0.16_0.02_150)] shadow-[var(--shadow-pop)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {installed ? <Check className="size-4" /> : <Download className="size-4" />}
          {installed ? "Installed" : "Install"}
        </motion.button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {available
            ? "One tap — installs straight to your home screen"
            : "Works offline-ready as a home screen app"}
        </p>

        <div className="mt-5 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(window.location.origin);
              toast.success("Link copied");
            }}
            className="inline-flex items-center gap-1.5"
          >
            <Share2 className="size-4" /> Share
          </button>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-4" /> Private on-device
          </span>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="px-5 text-sm font-semibold">Screenshots</h2>
        <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
          {SHOTS.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`PhotoPro Editor screenshot ${i + 1}`}
              loading="lazy"
              width={512}
              height={1024}
              className="h-64 w-auto shrink-0 snap-center rounded-[24px] border border-border/70 object-cover"
            />
          ))}
        </div>
      </section>

      <section className="mt-8 px-5">
        <h2 className="text-sm font-semibold">Ratings and reviews</h2>
        <div className="mt-3 flex items-center gap-5 rounded-[24px] border border-border/60 bg-surface-2/60 p-4 backdrop-blur-xl">
          <div className="text-center">
            <p className="text-4xl font-semibold">4.8</p>
            <div className="mt-1 flex justify-center gap-0.5 text-primary">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="size-3 fill-current" />
              ))}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">12,418</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {BARS.map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2 text-[10px] text-muted-foreground">{5 - i}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${w}%` }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 px-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" /> What's new
        </h2>
        <ul className="mt-3 space-y-2 rounded-[24px] border border-border/60 bg-surface-2/60 p-4 text-xs leading-relaxed text-muted-foreground backdrop-blur-xl">
          <li>• AI background remover, background changer and magic object eraser.</li>
          <li>• HD Enhance 2×/4×, auto adjust and portrait retouch sliders.</li>
          <li>• 13 AI art styles plus 60+ film and cinematic filters.</li>
          <li>• Text with 25+ fonts, 100+ stickers, brush drawing and layers.</li>
        </ul>
      </section>

      <section className="mt-8 px-5">
        <h2 className="text-sm font-semibold">About this app</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          PhotoPro Editor is a pro-grade photo studio that runs entirely on your device. Nothing is
          uploaded — every filter, AI tool and export happens locally, so your photos stay private.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Version</dt>
            <dd className="font-medium">4.0.0</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Updated</dt>
            <dd className="font-medium">Today</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Size</dt>
            <dd className="font-medium">Web app</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Category</dt>
            <dd className="font-medium">Photography</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
