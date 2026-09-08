import { motion } from "framer-motion";
import { Home, Sliders, Wand2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavKey = "home" | "edit" | "ai" | "install";

const ITEMS: { key: NavKey; label: string; icon: typeof Home }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "edit", label: "Edit", icon: Sliders },
  { key: "ai", label: "AI Tools", icon: Wand2 },
  { key: "install", label: "Install", icon: Download },
];

export function BottomNav({
  active,
  onSelect,
}: {
  active: NavKey;
  onSelect: (key: NavKey) => void;
}) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 px-3 pb-3">
      <div className="mx-auto flex max-w-md items-center justify-between gap-1 rounded-[24px] border border-border/70 bg-surface-2/70 p-1.5 shadow-[var(--shadow-panel)] backdrop-blur-xl">
        {ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <motion.button
              key={item.key}
              type="button"
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onClick={() => onSelect(item.key)}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 rounded-[20px] px-2 py-2.5 text-[10px] font-semibold tracking-wide transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-[20px] bg-primary/15"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <item.icon className="relative size-5" />
              <span className="relative">{item.label.toUpperCase()}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
