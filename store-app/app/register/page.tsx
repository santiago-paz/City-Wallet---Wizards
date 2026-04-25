"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import PhotoUpload from "@/components/photo-upload";
import { cn } from "@/lib/utils";

/* ────────── Taxonomy ────────── */

const CUISINES = [
  "Café",
  "Bakery",
  "Bistro",
  "Casual dining",
  "Fine dining",
  "Bar",
  "Quick service",
] as const;
type Cuisine = (typeof CUISINES)[number];

const PRICE_TIERS = ["€", "€€", "€€€", "€€€€"] as const;
type PriceTier = (typeof PRICE_TIERS)[number];

const TONES = ["Warm", "Factual", "Playful"] as const;
type Tone = (typeof TONES)[number];

const VIBE_OPTIONS = [
  "Cozy",
  "Quiet",
  "Lively",
  "Family-friendly",
  "Romantic",
  "Outdoors",
  "Trendy",
  "Local",
] as const;

/* ────────── Description → classification AI ────────── */

type Extracted = {
  cuisine: Cuisine;
  price: PriceTier;
  vibe: string[];
  tone: Tone;
};

const DEFAULT_EXTRACTED: Extracted = {
  cuisine: "Café",
  price: "€€",
  vibe: ["Cozy"],
  tone: "Warm",
};

function extractFromText(text: string): Extracted {
  const t = text.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => t.includes(k));

  let cuisine: Cuisine = "Café";
  if (has("bakery", "bread", "pastry", "pastries", "croissant"))
    cuisine = "Bakery";
  else if (has("bar", "cocktail", "wine", "beer", "pub")) cuisine = "Bar";
  else if (has("fine dining", "tasting menu", "michelin", "chef's table"))
    cuisine = "Fine dining";
  else if (has("bistro", "trattoria")) cuisine = "Bistro";
  else if (has("fast", "quick", "takeaway", "to-go", "grab"))
    cuisine = "Quick service";
  else if (has("restaurant", "dinner", "menu", "lunch"))
    cuisine = "Casual dining";
  else if (has("café", "cafe", "coffee", "espresso", "cappuccino", "latte"))
    cuisine = "Café";

  let price: PriceTier = "€€";
  if (has("fine dining", "michelin", "tasting menu", "premium", "luxury"))
    price = "€€€€";
  else if (has("upscale", "elegant", "refined")) price = "€€€";
  else if (has("cheap", "affordable", "budget", "student", "quick"))
    price = "€";

  const vibe: string[] = [];
  if (has("cozy", "warm", "comfortable", "snug")) vibe.push("Cozy");
  if (has("quiet", "calm", "peaceful")) vibe.push("Quiet");
  if (has("lively", "loud", "buzzing", "energetic")) vibe.push("Lively");
  if (has("family", "kids", "children")) vibe.push("Family-friendly");
  if (has("romantic", "date", "candle", "intimate")) vibe.push("Romantic");
  if (has("terrace", "outdoor", "garden", "patio", "rooftop"))
    vibe.push("Outdoors");
  if (has("trendy", "design", "modern", "stylish")) vibe.push("Trendy");
  if (has("local", "neighbourhood", "neighborhood", "regular"))
    vibe.push("Local");
  if (vibe.length === 0) vibe.push("Cozy");

  let tone: Tone = "Warm";
  if (has("fine dining", "elegant", "michelin", "refined"))
    tone = "Factual";
  else if (has("fun", "playful", "quirky", "cheeky", "kids"))
    tone = "Playful";

  return { cuisine, price, vibe: vibe.slice(0, 4), tone };
}

/* ────────── Discounts AI ────────── */

type DiscountSource = "ai-text" | "ai-menu" | "manual";

type Discount = {
  id: string;
  item: string;
  amount: number;
  unit: "%" | "€";
  trigger: string;
  source: DiscountSource;
};

const DISCOUNT_TEMPLATES: Omit<Discount, "id" | "source">[] = [
  { item: "Cappuccino", amount: 15, unit: "%", trigger: "Weekday afternoons (15–17h)" },
  { item: "Lunch menu", amount: 10, unit: "%", trigger: "Tue–Thu, 12–14h" },
  { item: "Apfelstrudel", amount: 1.5, unit: "€", trigger: "Free with any main" },
  { item: "Hot chocolate", amount: 20, unit: "%", trigger: "When below 10°C outside" },
  { item: "Dessert of the day", amount: 25, unit: "%", trigger: "Last hour before close" },
  { item: "Espresso double", amount: 0.8, unit: "€", trigger: "Mornings before 10h" },
  { item: "Family combo", amount: 12, unit: "%", trigger: "Weekend afternoons" },
  { item: "Wine by the glass", amount: 18, unit: "%", trigger: "Quiet weeknights" },
];

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function suggestFromText(text: string): Discount[] {
  const t = text.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => t.includes(k));
  const pick: Omit<Discount, "id" | "source">[] = [];

  if (has("coffee", "espresso", "cappuccino", "latte", "café", "cafe"))
    pick.push(DISCOUNT_TEMPLATES[0], DISCOUNT_TEMPLATES[5]);
  if (has("lunch", "menu", "midday")) pick.push(DISCOUNT_TEMPLATES[1]);
  if (has("dessert", "cake", "strudel", "pastry", "sweet"))
    pick.push(DISCOUNT_TEMPLATES[2], DISCOUNT_TEMPLATES[4]);
  if (has("rain", "cold", "winter", "warm drink", "chocolate"))
    pick.push(DISCOUNT_TEMPLATES[3]);
  if (has("family", "kids", "children")) pick.push(DISCOUNT_TEMPLATES[6]);
  if (has("wine", "bar", "evening", "dinner")) pick.push(DISCOUNT_TEMPLATES[7]);

  // Try to honour explicit "X% off Y" patterns as a free-form suggestion.
  const explicit = [...t.matchAll(/(\d{1,2})\s*%\s*(?:off|discount)?\s+([a-zà-ü ]{3,30})/gi)];
  const explicitDiscounts: Omit<Discount, "id" | "source">[] = explicit
    .slice(0, 2)
    .map((m) => ({
      item: m[2].trim().replace(/^the\s+/, "").slice(0, 30),
      amount: Math.min(50, Number(m[1])),
      unit: "%" as const,
      trigger: "When demand is low",
    }));

  const final = [...explicitDiscounts, ...pick];
  const deduped = final.filter(
    (d, i, arr) =>
      arr.findIndex((x) => x.item.toLowerCase() === d.item.toLowerCase()) === i
  );
  const chosen = deduped.length ? deduped : DISCOUNT_TEMPLATES.slice(0, 3);
  return chosen.slice(0, 4).map((d) => ({ ...d, id: newId(), source: "ai-text" }));
}

function suggestFromMenu(): Discount[] {
  return [
    DISCOUNT_TEMPLATES[0],
    DISCOUNT_TEMPLATES[1],
    DISCOUNT_TEMPLATES[2],
    DISCOUNT_TEMPLATES[4],
  ].map((d) => ({ ...d, id: newId(), source: "ai-menu" }));
}

/* ────────── Form state ────────── */

type Form = {
  name: string;
  address: string;
  description: string;
  logo: string | null;
  manual: Partial<Extracted>;
  discounts: Discount[];
  discountText: string;
  menuFile: { name: string; size: number } | null;
  inputMode: "describe" | "upload";
  consent: boolean;
};

const INITIAL: Form = {
  name: "",
  address: "",
  description: "",
  logo: null,
  manual: {},
  discounts: [],
  discountText: "",
  menuFile: null,
  inputMode: "describe",
  consent: false,
};

const PLACEHOLDER_DESC =
  "We're a tiny neighbourhood café on Königstraße — espresso, fresh apple strudel and the best window seat for a quiet afternoon. Lunch hours get pretty slow, especially when it rains.";

const PLACEHOLDER_DISCOUNTS =
  "I'd give 15% off coffees on weekday afternoons, free dessert with mains on Tuesdays, and a small discount on hot chocolate when it's cold.";

/* ────────── Page ────────── */

export default function RegisterRestaurantPage() {
  const [form, setForm] = useState<Form>(INITIAL);
  const [submitted, setSubmitted] = useState(false);

  // Description → classification
  const [analyzingDesc, setAnalyzingDesc] = useState(false);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const desc = form.description.trim();
  const longEnough = desc.length >= 24;

  useEffect(() => {
    if (descTimer.current) clearTimeout(descTimer.current);
    if (!longEnough) {
      setAnalyzingDesc(false);
      setExtracted(null);
      return;
    }
    setAnalyzingDesc(true);
    descTimer.current = setTimeout(() => {
      setExtracted(extractFromText(desc));
      setAnalyzingDesc(false);
    }, 750);
    return () => {
      if (descTimer.current) clearTimeout(descTimer.current);
    };
  }, [desc, longEnough]);

  // Discounts text → suggestions (debounced)
  const [analyzingDiscounts, setAnalyzingDiscounts] = useState(false);
  const discountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dText = form.discountText.trim();
  const dLongEnough = dText.length >= 16;

  useEffect(() => {
    if (discountTimer.current) clearTimeout(discountTimer.current);
    if (form.inputMode !== "describe") return;
    if (!dLongEnough) {
      setAnalyzingDiscounts(false);
      return;
    }
    setAnalyzingDiscounts(true);
    discountTimer.current = setTimeout(() => {
      const next = suggestFromText(dText);
      setForm((f) => ({
        ...f,
        discounts: [
          ...f.discounts.filter((d) => d.source !== "ai-text"),
          ...next,
        ],
      }));
      setAnalyzingDiscounts(false);
    }, 900);
    return () => {
      if (discountTimer.current) clearTimeout(discountTimer.current);
    };
  }, [dText, dLongEnough, form.inputMode]);

  const merged: Extracted = useMemo(() => {
    const base = extracted ?? DEFAULT_EXTRACTED;
    return {
      cuisine: form.manual.cuisine ?? base.cuisine,
      price: form.manual.price ?? base.price,
      vibe: form.manual.vibe ?? base.vibe,
      tone: form.manual.tone ?? base.tone,
    };
  }, [extracted, form.manual]);

  const setManual = <K extends keyof Extracted>(key: K, value: Extracted[K]) =>
    setForm((f) => ({ ...f, manual: { ...f.manual, [key]: value } }));

  /* ───── Discount handlers ───── */

  const updateDiscount = (id: string, patch: Partial<Discount>) =>
    setForm((f) => ({
      ...f,
      discounts: f.discounts.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));

  const removeDiscount = (id: string) =>
    setForm((f) => ({
      ...f,
      discounts: f.discounts.filter((d) => d.id !== id),
    }));

  const addManualDiscount = () =>
    setForm((f) => ({
      ...f,
      discounts: [
        ...f.discounts,
        {
          id: newId(),
          item: "",
          amount: 10,
          unit: "%",
          trigger: "Anytime",
          source: "manual",
        },
      ],
    }));

  const handleMenuFile = (file: File) => {
    setForm((f) => ({
      ...f,
      menuFile: { name: file.name, size: file.size },
      inputMode: "upload",
    }));
    setAnalyzingDiscounts(true);
    setTimeout(() => {
      const next = suggestFromMenu();
      setForm((f) => ({
        ...f,
        discounts: [
          ...f.discounts.filter((d) => d.source !== "ai-menu"),
          ...next,
        ],
      }));
      setAnalyzingDiscounts(false);
    }, 1400);
  };

  const removeMenuFile = () =>
    setForm((f) => ({
      ...f,
      menuFile: null,
      discounts: f.discounts.filter((d) => d.source !== "ai-menu"),
    }));

  const valid =
    form.name.trim().length > 1 &&
    form.address.trim().length > 3 &&
    form.consent;

  if (submitted)
    return (
      <SuccessView
        name={form.name}
        merged={merged}
        discountCount={form.discounts.length}
      />
    );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Get more customers — in 60 seconds
        </h1>
        <p className="text-sm text-ink-500 mt-1 max-w-2xl">
          Tell us a little about your place. The AI fills in the rest and
          starts pushing offers when it makes sense.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="rounded-2xl border border-ink-200 bg-white p-6 lg:p-8 space-y-6">
          {/* Identity */}
          <div className="flex items-start gap-4">
            <div className="w-24 shrink-0">
              <PhotoUpload
                initial={form.logo}
                onChange={(url) => setForm((f) => ({ ...f, logo: url }))}
                className="aspect-square"
              />
              <div className="text-[11px] text-ink-400 text-center mt-1.5">
                Logo · optional
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <Field label="Restaurant name" required>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Café Müller"
                  className={inputCls + " text-base"}
                />
              </Field>
              <Field label="Address" required>
                <div className="relative">
                  <MapPin className="size-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={form.address}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: e.target.value }))
                    }
                    placeholder="Königstraße 12, Stuttgart, Germany"
                    className={cn(inputCls, "pl-9")}
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* Description */}
          <Field
            label="Tell us about your place"
            hint="A few sentences in your own words. The AI uses this to set tone, vibe and cuisine."
          >
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={5}
              placeholder={PLACEHOLDER_DESC}
              className={cn(inputCls, "resize-none leading-relaxed")}
            />
            <div className="flex items-center justify-between text-[11px] text-ink-400 mt-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5",
                  longEnough && "text-emerald-600"
                )}
              >
                <Wand2 className="size-3" />
                {longEnough
                  ? analyzingDesc
                    ? "Reading your description…"
                    : "AI has filled in the rest →"
                  : "Write at least a sentence to unlock AI assist"}
              </span>
              <span>{form.description.length} chars</span>
            </div>
          </Field>

          {/* Discounts */}
          <DiscountsSection
            form={form}
            setForm={setForm}
            analyzing={analyzingDiscounts}
            updateDiscount={updateDiscount}
            removeDiscount={removeDiscount}
            addManualDiscount={addManualDiscount}
            handleMenuFile={handleMenuFile}
            removeMenuFile={removeMenuFile}
          />

          {/* Consent */}
          <div className="rounded-xl border border-ink-200 bg-ink-50/40 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, consent: e.target.checked }))
                }
                className="mt-0.5"
              />
              <div className="text-xs text-ink-600 leading-relaxed">
                I&apos;m authorised to register this venue and accept the
                merchant terms. Customer data stays on-device — only an
                abstract intent reaches the cloud.{" "}
                <span className="text-ink-400">GDPR by design.</span>
              </div>
            </label>
          </div>

          <button
            type="button"
            disabled={!valid}
            onClick={() => setSubmitted(true)}
            className={cn(
              "w-full inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-4 py-3 transition",
              valid
                ? "bg-brand-500 hover:bg-brand-600 text-white"
                : "bg-ink-100 text-ink-400 cursor-not-allowed"
            )}
          >
            <Sparkles className="size-4" />
            Start getting customers
          </button>
          <div className="text-[11px] text-ink-400 text-center -mt-2">
            We&apos;ll wire up Payone after your first offer goes out. You can
            tweak everything later in settings.
          </div>
        </div>

        <AssistantPanel
          analyzing={analyzingDesc}
          ready={Boolean(extracted)}
          merged={merged}
          setManual={setManual}
        />
      </div>
    </div>
  );
}

/* ────────── Discounts section ────────── */

function DiscountsSection({
  form,
  setForm,
  analyzing,
  updateDiscount,
  removeDiscount,
  addManualDiscount,
  handleMenuFile,
  removeMenuFile,
}: {
  form: Form;
  setForm: React.Dispatch<React.SetStateAction<Form>>;
  analyzing: boolean;
  updateDiscount: (id: string, patch: Partial<Discount>) => void;
  removeDiscount: (id: string) => void;
  addManualDiscount: () => void;
  handleMenuFile: (file: File) => void;
  removeMenuFile: () => void;
}) {
  const aiCount = form.discounts.filter((d) => d.source !== "manual").length;

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-2">
        <div>
          <div className="text-sm font-medium text-ink-800">
            Discounts to offer
          </div>
          <div className="text-[11px] text-ink-500 leading-relaxed mt-0.5 max-w-md">
            Describe what you&apos;d give, or upload your menu. We suggest a
            few — you decide what goes live.
          </div>
        </div>
        {aiCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-brand-600 shrink-0">
            <Sparkles className="size-3" />
            {aiCount} AI-suggested
          </span>
        )}
      </div>

      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-ink-100 mb-3">
        <ModeTab
          active={form.inputMode === "describe"}
          onClick={() => setForm((f) => ({ ...f, inputMode: "describe" }))}
          icon={<Pencil className="size-3.5" />}
          label="Describe"
        />
        <ModeTab
          active={form.inputMode === "upload"}
          onClick={() => setForm((f) => ({ ...f, inputMode: "upload" }))}
          icon={<Upload className="size-3.5" />}
          label="Upload menu"
        />
      </div>

      {form.inputMode === "describe" ? (
        <div>
          <textarea
            value={form.discountText}
            onChange={(e) =>
              setForm((f) => ({ ...f, discountText: e.target.value }))
            }
            rows={3}
            placeholder={PLACEHOLDER_DISCOUNTS}
            className={cn(inputCls, "resize-none leading-relaxed")}
          />
          <div className="text-[11px] text-ink-400 mt-1.5 flex items-center gap-1.5">
            <Wand2 className="size-3" />
            {form.discountText.trim().length < 16
              ? "Write a sentence — even rough — and we'll turn it into structured offers."
              : analyzing
              ? "Drafting suggestions…"
              : "Suggestions ready below — edit or remove anything."}
          </div>
        </div>
      ) : (
        <MenuDropzone
          file={form.menuFile}
          analyzing={analyzing}
          onFile={handleMenuFile}
          onRemove={removeMenuFile}
        />
      )}

      {/* Suggestions list */}
      <div className="mt-4 space-y-2">
        {form.discounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-xs text-ink-500">
            No discounts yet. Describe a few or upload your menu — or add one
            manually below.
          </div>
        ) : (
          form.discounts.map((d) => (
            <DiscountCard
              key={d.id}
              discount={d}
              onChange={(patch) => updateDiscount(d.id, patch)}
              onRemove={() => removeDiscount(d.id)}
            />
          ))
        )}

        <button
          type="button"
          onClick={addManualDiscount}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink-300 text-ink-500 hover:text-ink-700 hover:border-ink-400 px-3 py-2.5 text-sm font-medium transition"
        >
          <Plus className="size-4" />
          Add manually
        </button>
      </div>

      <div className="mt-3 rounded-lg bg-amber-50/60 border border-amber-200 px-3 py-2 text-[11px] text-amber-900 leading-relaxed">
        <span className="font-semibold">You always have the last word.</span>{" "}
        These are suggestions — only what stays in this list goes live, and
        you can change them anytime from <em>Products</em>.
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
        active ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-700"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MenuDropzone({
  file,
  analyzing,
  onFile,
  onRemove,
}: {
  file: { name: string; size: number } | null;
  analyzing: boolean;
  onFile: (f: File) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  if (file) {
    return (
      <div className="rounded-xl border border-ink-200 bg-ink-50/40 px-4 py-3 flex items-center gap-3">
        <span className="size-9 rounded-lg bg-white border border-ink-200 grid place-items-center shrink-0">
          <FileText className="size-4 text-ink-600" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{file.name}</div>
          <div className="text-[11px] text-ink-500">
            {(file.size / 1024).toFixed(1)} KB ·{" "}
            {analyzing ? (
              <span className="inline-flex items-center gap-1 text-brand-600">
                <span className="size-1.5 rounded-full bg-brand-500 animate-pulse" />
                Reading menu…
              </span>
            ) : (
              <span className="text-emerald-600">Suggestions ready below</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="size-7 rounded-md hover:bg-ink-100 grid place-items-center text-ink-500"
          aria-label="Remove menu file"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={cn(
        "w-full rounded-xl border-2 border-dashed transition flex flex-col items-center justify-center gap-1.5 py-7",
        dragging
          ? "border-brand-500 bg-brand-50/50 text-brand-700"
          : "border-ink-200 text-ink-500 hover:border-brand-400 hover:bg-brand-50/30 hover:text-brand-600"
      )}
    >
      <Upload className="size-5" />
      <span className="text-sm font-medium">
        Drop your menu, or click to upload
      </span>
      <span className="text-[11px]">PDF, JPG or PNG · the AI reads it</span>
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </button>
  );
}

function DiscountCard({
  discount,
  onChange,
  onRemove,
}: {
  discount: Discount;
  onChange: (patch: Partial<Discount>) => void;
  onRemove: () => void;
}) {
  const sourceLabel: Record<DiscountSource, string> = {
    "ai-text": "AI · from text",
    "ai-menu": "AI · from menu",
    manual: "Manual",
  };
  const isAi = discount.source !== "manual";

  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-3 transition",
        isAi
          ? "border-brand-200 bg-gradient-to-br from-brand-50/30 to-white"
          : "border-ink-200"
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider",
            isAi ? "text-brand-600" : "text-ink-500"
          )}
        >
          {isAi && <Sparkles className="size-3" />}
          {sourceLabel[discount.source]}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="size-6 rounded-md hover:bg-ink-100 grid place-items-center text-ink-400 hover:text-rose-600"
          aria-label="Remove discount"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_auto_1.6fr] items-end gap-2">
        <Field label="Item or category">
          <input
            value={discount.item}
            onChange={(e) => onChange({ item: e.target.value })}
            placeholder="e.g. Cappuccino"
            className={cn(inputCls, "py-1.5 text-sm")}
          />
        </Field>
        <Field label="Discount">
          <div className="flex">
            <input
              type="number"
              min={0}
              max={discount.unit === "%" ? 100 : 999}
              step={discount.unit === "%" ? 1 : 0.5}
              value={discount.amount}
              onChange={(e) =>
                onChange({ amount: Number(e.target.value) })
              }
              className={cn(
                inputCls,
                "py-1.5 text-sm rounded-r-none w-[72px] text-right"
              )}
            />
            <button
              type="button"
              onClick={() =>
                onChange({ unit: discount.unit === "%" ? "€" : "%" })
              }
              className="rounded-r-lg border border-l-0 border-ink-200 bg-ink-50 px-2.5 text-xs font-medium text-ink-700 hover:bg-ink-100"
              title="Toggle % or €"
            >
              {discount.unit}
            </button>
          </div>
        </Field>
        <Field label="When">
          <input
            value={discount.trigger}
            onChange={(e) => onChange({ trigger: e.target.value })}
            placeholder="e.g. Weekday afternoons"
            className={cn(inputCls, "py-1.5 text-sm")}
          />
        </Field>
      </div>
    </div>
  );
}

/* ────────── AI assistant panel (classification) ────────── */

function AssistantPanel({
  analyzing,
  ready,
  merged,
  setManual,
}: {
  analyzing: boolean;
  ready: boolean;
  merged: Extracted;
  setManual: <K extends keyof Extracted>(k: K, v: Extracted[K]) => void;
}) {
  const dim = !ready && !analyzing;

  return (
    <aside
      className={cn(
        "rounded-2xl border bg-white p-5 lg:sticky lg:top-6 space-y-4 transition",
        ready ? "border-brand-200 shadow-sm" : "border-ink-200"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-7 rounded-lg grid place-items-center transition",
              ready
                ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white"
                : "bg-ink-100 text-ink-500"
            )}
          >
            <Sparkles className="size-3.5" />
          </span>
          <div className="text-xs uppercase tracking-wider font-semibold text-ink-700">
            AI assistant
          </div>
        </div>
        <Status analyzing={analyzing} ready={ready} />
      </div>

      <div className={cn("space-y-4 transition", dim && "opacity-50")}>
        <Row label="Cuisine">
          <PickerChip
            value={merged.cuisine}
            options={CUISINES as readonly string[]}
            onChange={(v) => setManual("cuisine", v as Cuisine)}
          />
        </Row>

        <Row label="Price tier">
          <div className="flex gap-1">
            {PRICE_TIERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setManual("price", p)}
                className={cn(
                  "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition",
                  merged.price === p
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-ink-200 text-ink-500 hover:border-ink-300"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Vibe">
          <ChipMulti
            value={merged.vibe}
            options={VIBE_OPTIONS as readonly string[]}
            onChange={(v) => setManual("vibe", v)}
          />
        </Row>

        <Row label="Tone">
          <div className="flex gap-1">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setManual("tone", t)}
                className={cn(
                  "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition",
                  merged.tone === t
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-ink-200 text-ink-500 hover:border-ink-300"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </Row>
      </div>

      <div className="text-[11px] text-ink-400 leading-relaxed border-t border-ink-100 pt-3">
        Anything wrong? Tap any chip to override. The AI only suggests — you
        always have the last word.
      </div>
    </aside>
  );
}

function Status({
  analyzing,
  ready,
}: {
  analyzing: boolean;
  ready: boolean;
}) {
  if (analyzing)
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-brand-600">
        <span className="size-1.5 rounded-full bg-brand-500 animate-pulse" />
        Reading…
      </span>
    );
  if (ready)
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
        <Check className="size-3" />
        Suggested
      </span>
    );
  return <span className="text-[11px] text-ink-400">Waiting for input</span>;
}

/* ────────── Atoms ────────── */

const inputCls =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-ink-800 mb-1.5">
        {label}
        {required && <span className="text-brand-500 ml-0.5">*</span>}
      </div>
      {children}
      {hint && (
        <div className="text-[11px] text-ink-500 mt-1.5 leading-relaxed">
          {hint}
        </div>
      )}
    </label>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-ink-500 mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

function PickerChip({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full inline-flex items-center justify-between gap-2 rounded-lg border border-brand-500 bg-brand-50 text-brand-700 px-3 py-1.5 text-sm font-medium"
      >
        {value}
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-ink-200 bg-white shadow-lg overflow-hidden">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-ink-50",
                value === o && "text-brand-700 font-medium"
              )}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChipMulti({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: readonly string[];
  onChange: (v: string[]) => void;
}) {
  const remaining = options.filter((o) => !value.includes(o));
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-wrap gap-1.5">
      {value.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1 rounded-full border border-brand-500 bg-brand-50 text-brand-700 pl-2.5 pr-1 py-1 text-[11px] font-medium"
        >
          {v}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== v))}
            className="size-4 rounded-full hover:bg-brand-100 grid place-items-center"
            aria-label={`Remove ${v}`}
          >
            <X className="size-2.5" />
          </button>
        </span>
      ))}
      {remaining.length > 0 && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-full border border-dashed border-ink-300 text-ink-500 px-2.5 py-1 text-[11px] hover:border-ink-400 hover:text-ink-700"
        >
          + Add
        </button>
      )}
      {adding &&
        remaining.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => {
              onChange([...value, o]);
              setAdding(false);
            }}
            className="rounded-full border border-ink-200 text-ink-600 px-2.5 py-1 text-[11px] hover:border-brand-400 hover:text-brand-600"
          >
            {o}
          </button>
        ))}
    </div>
  );
}

/* ────────── Success ────────── */

function SuccessView({
  name,
  merged,
  discountCount,
}: {
  name: string;
  merged: Extracted;
  discountCount: number;
}) {
  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-8 text-center">
        <div className="size-14 rounded-full bg-emerald-500 text-white grid place-items-center mx-auto shadow-md">
          <Check className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-5">
          {name || "Your restaurant"} is live
        </h1>
        <p className="text-sm text-ink-600 mt-2">
          The AI is now watching the right moments to push your offers.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 text-left">
          <Mini label="Cuisine" value={merged.cuisine} />
          <Mini label="Price" value={merged.price} />
          <Mini label="Vibe" value={merged.vibe.slice(0, 2).join(" · ") || "—"} />
          <Mini
            label="Discounts ready"
            value={discountCount === 0 ? "—" : `${discountCount}`}
          />
        </div>

        <a
          href="/products"
          className="mt-6 w-full inline-flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg px-4 py-2.5"
        >
          Review products & rules
        </a>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wider text-ink-500">
        {label}
      </div>
      <div className="text-sm font-semibold text-ink-900 mt-0.5 truncate">
        {value}
      </div>
    </div>
  );
}
