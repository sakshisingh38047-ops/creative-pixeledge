import { AnimatePresence, motion } from "framer-motion";
import { Download, X } from "lucide-react";
const appIcon = "/app-icon.png";

export function InstallBanner({
  show,
  onInstall,
  onDismiss,
}: {
  show: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="absolute inset-x-0 bottom-[86px] z-40 px-3"
        >
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-[24px] border border-border/70 bg-surface-2/80 p-3 shadow-[var(--shadow-panel)] backdrop-blur-xl">
            <img src={appIcon} alt="" width={40} height={40} className="size-10 rounded-[14px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">Add PhotoPro to your Home Screen</p>
              <p className="truncate text-[11px] text-muted-foreground">Full-screen, app-like editing</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={onInstall}
              className="inline-flex items-center gap-1.5 rounded-[18px] bg-primary px-3.5 py-2 text-[11px] font-bold text-primary-foreground"
            >
              <Download className="size-3.5" /> Install
            </motion.button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss install banner"
              className="rounded-full p-1 text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
