import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Brush,
  Crop,
  Eye,
  FlipHorizontal,
  FlipVertical,
  Redo2,
  RotateCw,
  RotateCcw,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Sun,
  Moon,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
  Download,
  RefreshCw,
  Wand2,

} from "lucide-react";
import { toast } from "sonner";
import { adjustmentMeta } from "@/lib/photo/adjustments";
import { filterGroups, filterPresets } from "@/lib/photo/filters";
import { outputSize, renderToCanvas } from "@/lib/photo/render";
import {
  uid,
  type Overlays,
  type StickerItem,
  type TextItem,
} from "@/lib/photo/overlays";
import {
  defaultAdjustments,
  defaultEditState,
  type Adjustments,
  type EditState,
} from "@/lib/photo/types";
import {
  applyArtStyle,
  autoAdjust,
  canvasToImage,
  composeBackground,
  inpaint,
  retouch as retouchOp,
  upscaleEnhance,
  type BackgroundChoice,
  type RetouchSettings,
} from "@/lib/photo/ai/ops";
import { removeBackground } from "@/lib/photo/ai/bgRemoval";
import { cn } from "@/lib/utils";
import { AdjustSlider } from "./AdjustSlider";
import { FilterThumb } from "./FilterThumb";
import { ExportDialog, type ExportOptions } from "./ExportDialog";
import { OverlayLayer, type BrushSettings } from "./OverlayLayer";
import { TextPanel } from "./TextPanel";
import { StickerPanel } from "./StickerPanel";
import { DrawPanel } from "./DrawPanel";
import { AiPanel, type AiTool } from "./AiPanel";
import { MaskLayer, buildMaskCanvas, type MaskStroke } from "./MaskLayer";

type Snapshot = { state: EditState; base: HTMLImageElement };

type Tab =
  | "Filters"
  | "Light"
  | "Color"
  | "Detail"
  | "Effects"
  | "Crop"
  | "Text"
  | "Stickers"
  | "Draw"
  | "AI";
const TABS: { id: Tab; icon: typeof Crop }[] = [
  { id: "AI", icon: Wand2 },
  { id: "Crop", icon: Crop },
  { id: "Filters", icon: Sparkles },
  { id: "Text", icon: Type },
  { id: "Stickers", icon: Smile },
  { id: "Draw", icon: Brush },
  { id: "Light", icon: Sun },
  { id: "Color", icon: SlidersHorizontal },
  { id: "Detail", icon: Eye },
  { id: "Effects", icon: Sparkles },
];


const ASPECTS: { label: string; value: number | null }[] = [
  { label: "Original", value: null },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:4", value: 3 / 4 },
  { label: "2:3", value: 2 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
  { label: "3:2", value: 3 / 2 },
];

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 8;

export function Editor({
  image,
  fileName,
  onBack,
  theme,
  onToggleTheme,
}: {
  image: HTMLImageElement;
  fileName: string;
  onBack: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}) {
  const [state, setState] = useState<EditState>(defaultEditState);
  const [base, setBase] = useState<HTMLImageElement>(image);
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [tab, setTab] = useState<Tab>("Filters");
  const [showOriginal, setShowOriginal] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fit, setFit] = useState({ w: 0, h: 0 });
  const [brush, setBrush] = useState<BrushSettings>({
    color: "#ffcc00",
    size: 0.012,
    opacity: 1,
    erase: false,
  });

  /* --------------------------------------------------------------- AI state */
  const [aiTool, setAiTool] = useState<AiTool>("bg");
  const [busyTool, setBusyTool] = useState<AiTool | null>(null);
  const [aiProgress, setAiProgress] = useState(0);
  const [cutout, setCutout] = useState<HTMLCanvasElement | null>(null);
  const [bgBlur, setBgBlur] = useState(60);
  const [maskStrokes, setMaskStrokes] = useState<MaskStroke[]>([]);
  const [maskBrush, setMaskBrush] = useState(0.05);
  const [retouchSettings, setRetouchSettings] = useState<RetouchSettings>({
    smooth: 0.5,
    teeth: 0.3,
    eyes: 0.3,
  });
  const [artStrength, setArtStrength] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const dimensions = useMemo(() => outputSize(base, state), [base, state]);
  const drawMode = tab === "Draw";
  const maskMode = tab === "AI" && aiTool === "object";

  // Render preview whenever the edit state changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const id = requestAnimationFrame(() => {
      renderToCanvas(
        canvas,
        base,
        showOriginal ? defaultEditState : { ...state, overlays: { items: [], strokes: [] } },
        1800,
      );
    });
    return () => cancelAnimationFrame(id);
  }, [base, state, showOriginal]);

  // Keep the stage box matched to the photo aspect so overlays line up exactly.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const availW = Math.max(40, rect.width - 32);
      const availH = Math.max(40, rect.height - 32);
      const scale = Math.min(availW / dimensions.w, availH / dimensions.h);
      setFit({ w: Math.round(dimensions.w * scale), h: Math.round(dimensions.h * scale) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dimensions.w, dimensions.h]);

  const commit = useCallback(
    (next: EditState) => {
      setPast((p) => [...p.slice(-49), { state, base }]);
      setFuture([]);
      setState(next);
    },
    [state, base],
  );

  /** Records an AI result (a whole new base photo) as one undoable step. */
  const commitBase = useCallback(
    (nextBase: HTMLImageElement, nextState?: EditState) => {
      setPast((p) => [...p.slice(-49), { state, base }]);
      setFuture([]);
      setBase(nextBase);
      if (nextState) setState(nextState);
    },
    [state, base],
  );


  const patchAdjustment = (key: keyof Adjustments, value: number) => {
    setState((s) => ({ ...s, adjustments: { ...s.adjustments, [key]: value } }));
  };
  const beginAdjustment = useCallback(() => {
    setPast((p) => [...p.slice(-49), { state, base }]);
    setFuture([]);
  }, [state, base]);

  const setOverlays = useCallback((overlays: Overlays) => {
    setState((s) => ({ ...s, overlays }));
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1]!;
      setFuture((fu) => [{ state, base }, ...fu]);
      setState(prev.state);
      setBase(prev.base);
      return p.slice(0, -1);
    });
  }, [state, base]);

  const redo = useCallback(() => {
    setFuture((fu) => {
      if (!fu.length) return fu;
      const next = fu[0]!;
      setPast((p) => [...p, { state, base }]);
      setState(next.state);
      setBase(next.base);
      return fu.slice(1);
    });
  }, [state, base]);


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /INPUT|TEXTAREA/.test(target.tagName)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Wheel / pinch zoom anchored at the cursor.
  const zoomRef = useRef({ zoom, offset });
  zoomRef.current = { zoom, offset };
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const current = zoomRef.current;
      const next = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, current.zoom * Math.exp(-dy * 0.0015)),
      );
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left - rect.width / 2;
      const py = e.clientY - rect.top - rect.height / 2;
      const k = next / current.zoom;
      setOffset({
        x: px - (px - current.offset.x) * k,
        y: py - (py - current.offset.y) * k,
      });
      setZoom(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  /* ------------------------------------------------------------- AI actions */

  /** Runs an AI job that produces a new base photo, with progress + history. */
  const runAi = useCallback(
    async (
      tool: AiTool,
      job: (report: (r: number) => void) => Promise<HTMLCanvasElement | null> | HTMLCanvasElement | null,
      successMessage: string,
    ) => {
      if (busyTool) return;
      setBusyTool(tool);
      setAiProgress(0.03);
      try {
        // Let the spinner paint before the heavy synchronous pixel work starts.
        await new Promise((r) => setTimeout(r, 30));
        const result = await job(setAiProgress);
        if (!result) return;
        const img = await canvasToImage(result);
        commitBase(img);
        setAiProgress(1);
        toast.success(successMessage);
      } catch {
        toast.error("That didn't work on this photo — try again");
      } finally {
        setBusyTool(null);
        setAiProgress(0);
      }
    },
    [busyTool, commitBase],
  );

  const handleRemoveBg = () =>
    runAi(
      "bg",
      async (report) => {
        const cut = await removeBackground(base, report);
        setCutout(cut);
        return cut;
      },
      "Background removed",
    );

  const handleBackground = (choice: BackgroundChoice) => {
    if (!cutout) return;
    void runAi("bg", () => composeBackground(cutout, base, choice), "Background updated");
  };

  const handleEraseObject = () => {
    if (!maskStrokes.length) return;
    void runAi(
      "object",
      (report) => {
        const mask = buildMaskCanvas(base.width, base.height, maskStrokes);
        report(0.4);
        const out = inpaint(base, mask);
        setMaskStrokes([]);
        return out;
      },
      "Object removed",
    );
  };

  const handleEnhance = (factor: 2 | 4) =>
    runAi("enhance", (report) => {
      report(0.3);
      return upscaleEnhance(base, factor);
    }, `Photo enhanced ${factor}×`);

  const handleAutoAdjust = () => {
    setBusyTool("auto");
    setAiProgress(0.4);
    try {
      const patch = autoAdjust(base);
      commit({ ...state, adjustments: { ...state.adjustments, ...patch } });
      toast.success("Auto fix applied");
    } catch {
      toast.error("Auto fix didn't work on this photo");
    } finally {
      setBusyTool(null);
      setAiProgress(0);
    }
  };

  const handleRetouch = () =>
    runAi("retouch", (report) => {
      report(0.35);
      return retouchOp(base, retouchSettings);
    }, "Retouch applied");

  const handleArt = (styleId: string) =>
    runAi("art", (report) => {
      report(0.35);
      return applyArtStyle(base, styleId, artStrength);
    }, "Style applied");

  const renderFull = (maxDimension: number | null) => {
    const canvas = document.createElement("canvas");
    renderToCanvas(canvas, base, state, maxDimension ?? undefined);
    return canvas;

  };

  const toBlob = (opts: ExportOptions) =>
    new Promise<Blob | null>((resolve) => {
      const canvas = renderFull(opts.maxDimension);
      canvas.toBlob((b) => resolve(b), opts.format, opts.quality / 100);
    });

  const saveBlob = (blob: Blob, ext: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${fileName.replace(/\.[^.]+$/, "")}-photopro.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleExport = async (opts: ExportOptions) => {
    setBusy(true);
    try {
      const blob = await toBlob(opts);
      if (!blob) throw new Error("export failed");
      saveBlob(blob, opts.format.split("/")[1]!.replace("jpeg", "jpg"));
      toast.success("Photo saved to your downloads");
      setExportOpen(false);
    } catch {
      toast.error("Could not export the photo");
    } finally {
      setBusy(false);
    }
  };

  const quickHd = async () => {
    setBusy(true);
    try {
      const blob = await toBlob({ format: "image/jpeg", quality: 95, maxDimension: 1920 });
      if (!blob) throw new Error("no blob");
      saveBlob(blob, "jpg");
      toast.success("HD photo saved to your downloads");
    } catch {
      toast.error("Could not save the photo");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async (opts: ExportOptions) => {
    setBusy(true);
    try {
      const blob = await toBlob(opts);
      if (!blob) throw new Error("no blob");
      const ext = opts.format.split("/")[1]!.replace("jpeg", "jpg");
      const file = new File([blob], `photopro.${ext}`, { type: opts.format });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Edited with PhotoPro Editor" });
        setExportOpen(false);
      } else {
        toast.info("Sharing isn't supported here — saving instead");
        await handleExport(opts);
      }
    } catch {
      /* user cancelled */
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------------------------------------ overlays */

  const selectedItem = state.overlays.items.find((i) => i.id === selectedId) ?? null;
  const selectedText = selectedItem?.kind === "text" ? (selectedItem as TextItem) : null;

  const addText = () => {
    const item: TextItem = {
      id: uid(),
      kind: "text",
      text: "Your text",
      x: 0.5,
      y: 0.5,
      size: 0.12,
      rotation: 0,
      font: "Anton",
      color: "#ffffff",
      strokeColor: "#000000",
      strokeWidth: 0,
      shadow: 0.4,
      opacity: 1,
      bold: false,
      italic: false,
    };
    commit({ ...state, overlays: { ...state.overlays, items: [...state.overlays.items, item] } });
    setSelectedId(item.id);
    setTab("Text");
  };

  const addSticker = (char: string) => {
    const item: StickerItem = {
      id: uid(),
      kind: "sticker",
      char,
      x: 0.5,
      y: 0.5,
      size: 0.2,
      rotation: 0,
      opacity: 1,
    };
    commit({ ...state, overlays: { ...state.overlays, items: [...state.overlays.items, item] } });
    setSelectedId(item.id);
  };

  const patchSelected = (patch: Partial<TextItem>) => {
    if (!selectedId) return;
    setState((s) => ({
      ...s,
      overlays: {
        ...s.overlays,
        items: s.overlays.items.map((i) =>
          i.id === selectedId && i.kind === "text" ? { ...i, ...patch } : i,
        ),
      },
    }));
  };

  const deleteItem = (id: string) => {
    commit({
      ...state,
      overlays: { ...state.overlays, items: state.overlays.items.filter((i) => i.id !== id) },
    });
    setSelectedId(null);
  };

  const groupSliders = adjustmentMeta.filter((m) => m.group === tab);
  const activePreset = filterPresets.find((p) => p.id === state.filterId);
  const isEdited = JSON.stringify(state) !== JSON.stringify(defaultEditState);
  const layerCount = state.overlays.items.length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-1">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-2 border-b border-border bg-surface-2 px-2 py-2 sm:px-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to home"
          >
            <ArrowLeft className="size-4" />
          </button>
          <span className="hidden max-w-45 truncate text-sm font-medium sm:block">{fileName}</span>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={!past.length}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
            aria-label="Undo"
          >
            <Undo2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!future.length}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
            aria-label="Redo"
          >
            <Redo2 className="size-4" />
          </button>
          <button
            type="button"
            onPointerDown={() => setShowOriginal(true)}
            onPointerUp={() => setShowOriginal(false)}
            onPointerLeave={() => setShowOriginal(false)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors",
              showOriginal
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Eye className="size-4" />
            <span className="hidden sm:inline">Before</span>
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button
            type="button"
            onClick={quickHd}
            disabled={busy}
            className="ml-1 flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Download className="size-4" />
            HD
          </button>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="rounded-lg border border-border bg-secondary px-2.5 py-2 text-xs font-semibold transition-colors hover:bg-muted"
          >
            Export
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Canvas viewport */}
        <div
          ref={viewportRef}
          onPointerDown={(e) => {
            if (drawMode) return;
            if (e.target !== viewportRef.current) return;
            dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          }}
          onPointerMove={(e) => {
            const d = dragRef.current;
            if (!d) return;
            setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          className="relative flex min-w-0 flex-1 touch-none items-center justify-center overflow-hidden bg-canvas-bg"
        >
          <div
            className="relative"
            style={{
              width: fit.w || 1,
              height: fit.h || 1,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transition: dragRef.current ? "none" : "transform 60ms linear",
            }}
          >
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full select-none" />
            {!showOriginal && fit.w > 0 && (
              <OverlayLayer
                overlays={state.overlays}
                width={fit.w}
                height={fit.h}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onBegin={beginAdjustment}
                onChange={setOverlays}
                onDelete={deleteItem}
                drawMode={drawMode}
                brush={brush}
              />
            )}
            {maskMode && fit.w > 0 && (
              <MaskLayer
                width={fit.w}
                height={fit.h}
                strokes={maskStrokes}
                brushSize={maskBrush}
                onChange={setMaskStrokes}
              />
            )}
          </div>


          {showOriginal && (
            <span className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
              Original
            </span>
          )}

          <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-xl border border-border bg-surface-2/90 p-1 backdrop-blur">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.3))}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Zoom out"
            >
              <ZoomOut className="size-4" />
            </button>
            <span className="w-11 text-center text-xs tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.3))}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Zoom in"
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              type="button"
              onClick={resetView}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Reset view"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>

          <span className="absolute bottom-3 left-3 rounded-lg border border-border bg-surface-2/90 px-2.5 py-1 text-[11px] tabular-nums text-muted-foreground backdrop-blur">
            {dimensions.w} × {dimensions.h}
          </span>
        </div>

        {/* Right panel */}
        <aside className="hidden w-72 shrink-0 flex-col border-l border-border bg-surface-2 lg:flex">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">
              EDIT STACK
            </h2>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
            <StackRow label="Base photo" value={`${base.width} × ${base.height}`} />
            <StackRow label="Filter" value={activePreset?.name ?? "Original"} />
            <StackRow
              label="Geometry"
              value={`${state.geometry.rotation}°${state.geometry.flipH ? " · flip H" : ""}${
                state.geometry.flipV ? " · flip V" : ""
              }`}
            />
            <StackRow label="History" value={`${past.length} step${past.length === 1 ? "" : "s"}`} />

            {layerCount > 0 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-[10px] font-semibold tracking-widest text-muted-foreground">
                  LAYERS
                </p>
                {state.overlays.items
                  .slice()
                  .reverse()
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id);
                        setTab(item.kind === "text" ? "Text" : "Stickers");
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                        selectedId === item.id
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-secondary hover:bg-muted",
                      )}
                    >
                      <span className="truncate">
                        {item.kind === "text" ? item.text || "Text" : item.char}
                      </span>
                      <span className="text-muted-foreground">{item.kind}</span>
                    </button>
                  ))}
              </div>
            )}
            {state.overlays.strokes.length > 0 && (
              <StackRow label="Brush strokes" value={`${state.overlays.strokes.length}`} />
            )}

            <button
              type="button"
              disabled={!isEdited}
              onClick={() => {
                commit(defaultEditState);
                setSelectedId(null);
              }}
              className="mt-2 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
            >
              Reset all edits
            </button>
          </div>
        </aside>
      </div>

      {/* Bottom toolbar */}
      <section className="border-t border-border bg-surface-2">
        <div className="max-h-64 overflow-y-auto px-3 py-3 sm:px-4">
          {tab === "Filters" && (
            <div className="space-y-3">
              {activePreset && activePreset.id !== "original" && (
                <AdjustSlider
                  label={`${activePreset.name} strength`}
                  value={state.filterStrength}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(v) => setState((s) => ({ ...s, filterStrength: v }))}
                  onReset={() => setState((s) => ({ ...s, filterStrength: 100 }))}
                />
              )}
              {filterGroups.map((group) => (
                <div key={group}>
                  <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground">
                    {group.toUpperCase()}
                  </p>
                  <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                    {filterPresets
                      .filter((p) => p.group === group)
                      .map((preset) => (
                        <FilterThumb
                          key={preset.id}
                          preset={preset}
                          source={base}
                          active={state.filterId === preset.id}
                          onSelect={() =>
                            commit({ ...state, filterId: preset.id, filterStrength: 100 })
                          }
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "Text" && (
            <TextPanel
              item={selectedText}
              onAdd={addText}
              onPatch={patchSelected}
              onDelete={() => selectedId && deleteItem(selectedId)}
              onBegin={beginAdjustment}
            />
          )}

          {tab === "Stickers" && <StickerPanel onAdd={addSticker} />}

          {tab === "Draw" && (
            <DrawPanel
              brush={brush}
              onChange={(patch) => setBrush((b) => ({ ...b, ...patch }))}
              strokeCount={state.overlays.strokes.length}
              onUndoStroke={() =>
                commit({
                  ...state,
                  overlays: { ...state.overlays, strokes: state.overlays.strokes.slice(0, -1) },
                })
              }
              onClear={() =>
                commit({ ...state, overlays: { ...state.overlays, strokes: [] } })
              }
            />
          )}

          {tab === "Crop" && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground">
                  ASPECT RATIO
                </p>
                <div className="flex flex-wrap gap-2">
                  {ASPECTS.map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() =>
                        commit({ ...state, geometry: { ...state.geometry, cropAspect: a.value } })
                      }
                      className={cn(
                        "rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                        state.geometry.cropAspect === a.value
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-secondary hover:bg-muted",
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground">
                  TRANSFORM
                </p>
                <div className="flex flex-wrap gap-2">
                  <ToolButton
                    icon={RotateCcw}
                    label="Rotate left"
                    onClick={() =>
                      commit({
                        ...state,
                        geometry: { ...state.geometry, rotation: state.geometry.rotation - 90 },
                      })
                    }
                  />
                  <ToolButton
                    icon={RotateCw}
                    label="Rotate right"
                    onClick={() =>
                      commit({
                        ...state,
                        geometry: { ...state.geometry, rotation: state.geometry.rotation + 90 },
                      })
                    }
                  />
                  <ToolButton
                    icon={FlipHorizontal}
                    label="Flip H"
                    active={state.geometry.flipH}
                    onClick={() =>
                      commit({
                        ...state,
                        geometry: { ...state.geometry, flipH: !state.geometry.flipH },
                      })
                    }
                  />
                  <ToolButton
                    icon={FlipVertical}
                    label="Flip V"
                    active={state.geometry.flipV}
                    onClick={() =>
                      commit({
                        ...state,
                        geometry: { ...state.geometry, flipV: !state.geometry.flipV },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {(tab === "Light" || tab === "Color" || tab === "Detail" || tab === "Effects") && (
            <div className="grid gap-x-8 sm:grid-cols-2">
              {groupSliders.map((meta) => (
                <AdjustSlider
                  key={meta.key}
                  label={meta.label}
                  value={state.adjustments[meta.key]}
                  min={meta.min}
                  max={meta.max}
                  step={meta.step}
                  onChange={(v) => patchAdjustment(meta.key, v)}
                  onReset={() => patchAdjustment(meta.key, defaultAdjustments[meta.key])}
                />
              ))}
              <div className="col-span-full pt-1">
                <button
                  type="button"
                  onMouseDown={beginAdjustment}
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      adjustments: groupSliders.reduce(
                        (acc, m) => ({ ...acc, [m.key]: defaultAdjustments[m.key] }),
                        s.adjustments,
                      ),
                    }))
                  }
                  className="text-[11px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Reset {tab.toLowerCase()}
                </button>
              </div>
            </div>
          )}
        </div>

        <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto border-t border-border px-2 py-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex min-w-16 flex-1 shrink-0 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium tracking-wide transition-colors",
                tab === t.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <t.icon className="size-4" />
              {t.id.toUpperCase()}
            </button>
          ))}
        </nav>
      </section>

      <ExportDialog
        open={exportOpen}
        busy={busy}
        dimensions={dimensions}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        onShare={handleShare}
      />
    </div>
  );
}

function StackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-secondary px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-32 truncate text-xs font-medium">{value}</span>
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: typeof Crop;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-secondary hover:bg-muted",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
