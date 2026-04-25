"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  ScanLine,
  Trash2,
  Upload,
} from "lucide-react";
import { cn, euro } from "@/lib/utils";
import type { MenuItem } from "./types";

export function UploadArea({
  dragging,
  setDragging,
  onCapture,
  inputRef,
}: {
  dragging: boolean;
  setDragging: (v: boolean) => void;
  onCapture: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.[0]) onCapture();
        }}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "w-full rounded-xl border-2 border-dashed py-10 px-5 transition flex flex-col items-center justify-center gap-1.5",
            dragging
              ? "border-brand-500 bg-brand-50/50 text-brand-700"
              : "border-ink-200 text-ink-500 hover:border-brand-400 hover:bg-brand-50/30 hover:text-brand-700"
          )}
        >
          <Upload className="size-6" />
          <span className="text-sm font-semibold mt-1">
            Drop or click to upload
          </span>
          <span className="text-[11px]">PDF, JPG, PNG · 5 MB max</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) onCapture();
          }}
        />
      </div>
      <button
        type="button"
        onClick={onCapture}
        className="w-full rounded-xl border-2 border-dashed border-ink-200 py-10 px-5 transition flex flex-col items-center justify-center gap-1.5 text-ink-500 hover:border-brand-400 hover:bg-brand-50/30 hover:text-brand-700"
      >
        <Camera className="size-6" />
        <span className="text-sm font-semibold mt-1">Take a photo</span>
        <span className="text-[11px]">Use the back camera</span>
      </button>
    </div>
  );
}

export function ScanningView({ progress }: { progress: number }) {
  return (
    <div className="rounded-xl border border-ink-200 overflow-hidden">
      <div className="relative aspect-[16/8] sm:aspect-[16/6] bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 overflow-hidden">
        <motion.div
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_24px_4px] shadow-brand-400/60"
          animate={{ y: ["10%", "90%", "10%"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
        {[
          "top-3 left-3 border-t-2 border-l-2 rounded-tl-md",
          "top-3 right-3 border-t-2 border-r-2 rounded-tr-md",
          "bottom-3 left-3 border-b-2 border-l-2 rounded-bl-md",
          "bottom-3 right-3 border-b-2 border-r-2 rounded-br-md",
        ].map((c, i) => (
          <span key={i} className={cn("absolute size-6 border-brand-400", c)} />
        ))}
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-2 text-white">
            <ScanLine className="size-7 text-brand-400" />
            <div className="text-sm font-medium">Reading menu…</div>
            <div className="text-[11px] text-ink-300">
              Detecting items, prices and categories
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2 bg-white">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-ink-700 inline-flex items-center gap-1.5">
            <Loader2 className="size-3.5 animate-spin text-brand-500" />
            AI processing
          </span>
          <span className="font-mono text-ink-500 tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-400"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </div>
    </div>
  );
}

export function InventoryPreview({
  items,
  setItems,
  onRescan,
  avgPrice,
}: {
  items: MenuItem[];
  setItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  onRescan: () => void;
  avgPrice: number;
}) {
  const remove = (id: string) =>
    setItems((arr) => arr.filter((i) => i.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 text-[11px] font-medium">
          <Check className="size-3" />
          {items.length} items extracted · avg {euro(avgPrice)}
        </div>
        <button
          type="button"
          onClick={onRescan}
          className="text-xs text-ink-500 hover:text-ink-900 inline-flex items-center gap-1.5"
        >
          <RefreshCw className="size-3.5" />
          Rescan
        </button>
      </div>

      <div className="rounded-xl border border-ink-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_28px] gap-3 px-4 py-2 bg-ink-50 text-[11px] uppercase tracking-wider text-ink-500 font-medium">
          <span>Item</span>
          <span className="text-right">Price</span>
          <span />
        </div>
        <ul className="divide-y divide-ink-100 max-h-[360px] overflow-y-auto">
          <AnimatePresence initial={true}>
            {items.map((item, i) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                className="grid grid-cols-[1fr_auto_28px] items-center gap-3 px-4 py-2.5 hover:bg-ink-50/60 group"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-ink-500">
                    {item.category}
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums">
                  {euro(item.price)}
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="size-7 rounded-md grid place-items-center text-ink-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition"
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <button
          type="button"
          className="w-full text-xs text-ink-500 hover:text-ink-700 inline-flex items-center justify-center gap-1 py-2.5 border-t border-ink-100"
        >
          <Plus className="size-3.5" />
          Add an item manually
        </button>
      </div>
    </div>
  );
}
