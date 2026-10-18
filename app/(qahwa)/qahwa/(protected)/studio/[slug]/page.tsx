"use client";

/*
 * STUDIO QAHWA — éditeur d'affiches (v2)
 * Chemin : app/qahwa/studio/[slug]/page.tsx (remplace l'ancien fichier)
 *
 * (Optionnel mais recommandé) SQL à exécuter une fois dans Supabase pour stocker
 * les images en fichiers au lieu de base64 dans la base :
 *
 *   insert into storage.buckets (id, name, public) values ('studio', 'studio', true)
 *     on conflict (id) do nothing;
 *   create policy "studio lecture publique" on storage.objects
 *     for select using (bucket_id = 'studio');
 *   create policy "studio upload connecte" on storage.objects
 *     for insert to authenticated with check (bucket_id = 'studio');
 *
 * Sans ce bucket, tout fonctionne quand même (les images sont alors gardées en base64).
 */

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  useConfirm,
  useToast,
  useUnsavedChangesGuard,
} from "@/components/qahwa/NotificationProvider";

/* ───────────────────────────── Types ───────────────────────────── */

type Field = "title" | "subtitle" | "description" | "price" | "date";
type Align = "left" | "center" | "right";
type ShapeKind = "rectangle" | "circle" | "line";
type Variant = "classic" | "premium" | "editorial" | "bold";
type Tab = "add" | "edit" | "background" | "layers";

type Layer = {
  id: string;
  kind: "text" | "image" | "shape";
  name?: string;
  x: number; // % de la largeur de l'affiche
  y: number; // % de la hauteur
  w: number; // % de la largeur
  h: number; // % de la hauteur (ignoré pour le texte : hauteur automatique)
  opacity: number;
  color: string;
  visible: boolean;
  locked: boolean;
  text?: string;
  fontFamily?: string;
  fontSize?: number; // en px sur une affiche de 1080 px de large
  fontWeight?: number;
  align?: Align;
  uppercase?: boolean;
  shadow?: boolean;
  src?: string;
  fit?: "contain" | "cover";
  shape?: ShapeKind;
};

type Background = {
  c1: string;
  c2: string;
  angle: number;
  image: string | null;
  overlay: number; // 0–100, voile sombre (seulement avec une photo)
};

type Doc = { bg: Background; layers: Layer[] };

type Format = {
  title: string;
  category: string;
  format: string;
  width: number;
  height: number;
  fields: Field[];
};

/* ─────────────────────────── Constantes ─────────────────────────── */

const FORMATS: Record<string, Format> = {
  publication: { title: "Publication", category: "Contenu", format: "Instagram portrait", width: 1080, height: 1350, fields: ["title", "subtitle", "description", "price"] },
  "nouveau-produit": { title: "Nouveau produit", category: "Contenu", format: "Instagram portrait", width: 1080, height: 1350, fields: ["title", "subtitle", "description", "price"] },
  promotion: { title: "Promotion", category: "Contenu", format: "Instagram portrait", width: 1080, height: 1350, fields: ["title", "subtitle", "price"] },
  evenement: { title: "Événement", category: "Contenu", format: "Story", width: 1080, height: 1920, fields: ["title", "subtitle", "description", "date"] },
};

const FIELD_LABEL: Record<Field, string> = {
  title: "Titre",
  subtitle: "Sous-titre",
  description: "Description",
  price: "Prix",
  date: "Date",
};

const F = {
  archivo: '"Archivo Black", Impact, sans-serif',
  inter: "Inter, Arial, sans-serif",
  montserrat: "Montserrat, Arial, sans-serif",
  playfair: "Playfair Display, Georgia, serif",
  lato: "Lato, Arial, sans-serif",
  bebas: "Bebas Neue, Impact, sans-serif",
};

const FONTS: { label: string; value: string }[] = [
  { label: "Archivo Black", value: F.archivo },
  { label: "Inter", value: F.inter },
  { label: "Montserrat", value: F.montserrat },
  { label: "Poppins", value: "Poppins, Arial, sans-serif" },
  { label: "Roboto", value: "Roboto, Arial, sans-serif" },
  { label: "Open Sans", value: "Open Sans, Arial, sans-serif" },
  { label: "Lato", value: F.lato },
  { label: "Oswald", value: "Oswald, Arial, sans-serif" },
  { label: "Bebas Neue", value: F.bebas },
  { label: "Playfair Display", value: F.playfair },
  { label: "Caveat Brush", value: '"Caveat Brush", cursive' },
  { label: "Cairo (arabe)", value: "Cairo, Arial, sans-serif" },
  { label: "Arial", value: "Arial" },
  { label: "Georgia", value: "Georgia" },
  { label: "Impact", value: "Impact" },
  { label: "Courier New", value: '"Courier New", monospace' },
];

const WEIGHTS = [
  { label: "Normal", value: "400" },
  { label: "Medium", value: "500" },
  { label: "Semi-bold", value: "600" },
  { label: "Bold", value: "700" },
  { label: "Extra-bold", value: "800" },
];

const PALETTE = ["#FFFFFF", "#0A0A0A", "#FF6B00", "#FF8A2B", "#FFF3E8", "#9A9A9A"];

const BG_PRESETS: { name: string; c1: string; c2: string; angle: number }[] = [
  { name: "Nuit", c1: "#1B1B1B", c2: "#090909", angle: 135 },
  { name: "Braise", c1: "#3A2524", c2: "#090909", angle: 155 },
  { name: "Orange", c1: "#FF8A2B", c2: "#FF6B00", angle: 160 },
  { name: "Crème", c1: "#FFF3E8", c2: "#F2D9C2", angle: 160 },
  { name: "Forêt", c1: "#18231F", c2: "#0C1210", angle: 145 },
  { name: "Noir", c1: "#0A0A0A", c2: "#0A0A0A", angle: 0 },
];

const POS_PORTRAIT: Record<Field, number> = { subtitle: 55, title: 60, description: 76, price: 85, date: 90 };
const POS_STORY: Record<Field, number> = { subtitle: 58, title: 63, description: 79, price: 86, date: 90 };

const COPY: Record<string, Record<Field, string>> = {
  publication: { title: "L'art du café", subtitle: "Une pause qui vous ressemble", description: "Des saveurs soigneusement choisies, chaque jour.", price: "À partir de 500 DA", date: "Samedi · 10h — 18h" },
  "nouveau-produit": { title: "Nouvelle création", subtitle: "À découvrir chez Qahwa", description: "Une recette généreuse, préparée avec soin.", price: "850 DA", date: "Samedi · 10h — 18h" },
  promotion: { title: "Offre spéciale", subtitle: "Une offre à ne pas manquer", description: "Profitez de notre sélection du moment.", price: "-20%", date: "Samedi · 10h — 18h" },
  evenement: { title: "Rendez-vous Qahwa", subtitle: "Un moment à partager", description: "Rejoignez-nous pour une expérience unique.", price: "À partir de 500 DA", date: "Samedi · 10h — 18h" },
};

/** Accès sûrs : renvoient toujours une valeur définie (compatible noUncheckedIndexedAccess). */
const getFormat = (slug: string): Format => FORMATS[slug] ?? FORMATS.publication!;
const getCopy = (slug: string): Record<Field, string> => COPY[slug] ?? COPY.publication!;

const THEMES: Record<Variant, {
  bg: { c1: string; c2: string; angle: number };
  titleFont: string; bodyFont: string; priceFont: string;
  align: Align; upper: boolean;
  sizes: Record<Field, number>;
}> = {
  classic: { bg: { c1: "#1B1B1B", c2: "#090909", angle: 135 }, titleFont: F.archivo, bodyFont: F.inter, priceFont: F.archivo, align: "left", upper: true, sizes: { title: 92, subtitle: 36, description: 32, price: 64, date: 34 } },
  premium: { bg: { c1: "#242424", c2: "#090909", angle: 135 }, titleFont: F.montserrat, bodyFont: F.inter, priceFont: F.montserrat, align: "left", upper: true, sizes: { title: 84, subtitle: 36, description: 32, price: 64, date: 34 } },
  editorial: { bg: { c1: "#18231F", c2: "#0C1210", angle: 145 }, titleFont: F.playfair, bodyFont: F.lato, priceFont: F.playfair, align: "center", upper: false, sizes: { title: 96, subtitle: 38, description: 32, price: 56, date: 34 } },
  bold: { bg: { c1: "#3A2524", c2: "#090909", angle: 155 }, titleFont: F.bebas, bodyFont: F.inter, priceFont: F.bebas, align: "left", upper: true, sizes: { title: 150, subtitle: 40, description: 32, price: 110, date: 36 } },
};

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Bebas+Neue&family=Cairo:wght@400;600;700;800&family=Caveat+Brush&family=Inter:wght@400;500;600;700;800&family=Lato:wght@400;700;900&family=Montserrat:wght@400;500;600;700;800&family=Open+Sans:wght@400;600;700;800&family=Oswald:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Roboto:wght@400;500;700;900&display=swap";

/* ───────────────────────────── Utilitaires ───────────────────────────── */

const uid = () => `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function bgCss(bg: Background) {
  return bg.c1 === bg.c2 ? bg.c1 : `linear-gradient(${bg.angle}deg, ${bg.c1}, ${bg.c2})`;
}

function overlayAlphas(overlay: number): [number, number] {
  const k = overlay / 100;
  return [0.3 * k, 1.0 * k];
}

function textLayer(p: Partial<Layer> & { text: string }): Layer {
  return {
    id: uid(), kind: "text", x: 8, y: 50, w: 84, h: 0, opacity: 100, color: "#FFFFFF",
    visible: true, locked: false, fontFamily: F.inter, fontSize: 64, fontWeight: 700,
    align: "left", uppercase: false, shadow: false, ...p,
  };
}

function shapeLayer(p: Partial<Layer> & { shape: ShapeKind }): Layer {
  const isLine = p.shape === "line";
  return {
    id: uid(), kind: "shape", x: 20, y: 30, w: isLine ? 60 : 34, h: isLine ? 0.4 : 18,
    opacity: 100, color: "#FFFFFF", visible: true, locked: false, ...p,
  };
}

function imageLayer(img: { src: string; nw: number; nh: number }, as: "photo" | "logo", W: number, H: number): Layer {
  let w = as === "logo" ? 22 : 60;
  let h = (((w / 100) * W * img.nh) / img.nw / H) * 100;
  if (h > 90) { const k = 90 / h; w *= k; h = 90; }
  return {
    id: uid(), kind: "image", name: as === "logo" ? "Logo" : "Photo", src: img.src, fit: "contain",
    x: as === "logo" ? Math.max(0, 97 - w) : (100 - w) / 2, y: as === "logo" ? 3 : 12, w, h,
    opacity: 100, color: "#FFFFFF", visible: true, locked: false,
  };
}

function buildDoc(slug: string, variant: Variant): Doc {
  const f = getFormat(slug);
  const story = f.height > f.width * 1.5;
  const pos = story ? POS_STORY : POS_PORTRAIT;
  const t = THEMES[variant];
  const c = getCopy(slug);

  const decos: Layer[] = [];
  if (variant === "editorial") decos.push(shapeLayer({ shape: "line", name: "Filet", x: 30, y: pos.subtitle - 4, w: 40, h: 0.25, opacity: 75 }));
  if (variant === "bold") decos.push(shapeLayer({ shape: "rectangle", name: "Barre", x: 8, y: pos.subtitle - 3, w: 20, h: 0.9, color: "#FF6B00" }));
  if (variant === "premium") decos.push(shapeLayer({ shape: "circle", name: "Cercle", x: 76, y: 5, w: 16, h: ((16 * f.width) / f.height), color: "#FF6B00", opacity: 14 }));

  const weights: Record<Field, number> = { title: 800, subtitle: 600, description: 400, price: 800, date: 600 };
  const texts = f.fields.map((field) =>
    textLayer({
      id: `field:${field}`, name: FIELD_LABEL[field], text: c[field], y: pos[field],
      fontFamily: field === "title" ? t.titleFont : field === "price" ? t.priceFont : t.bodyFont,
      fontSize: t.sizes[field], fontWeight: weights[field], align: t.align,
      uppercase: field === "title" ? t.upper : false,
    })
  );

  return { bg: { ...t.bg, image: null, overlay: 75 }, layers: [...decos, ...texts] };
}

/** Convertit une création enregistrée avec l'ancien éditeur (v1) vers le format actuel. */
function migrateV1(d: any, slug: string): Doc {
  const f = getFormat(slug);
  const css: string = typeof d.canvasBackground === "string" ? d.canvasBackground : "";
  const hex = css.match(/#[0-9a-fA-F]{6}/g) ?? [];
  const bg: Background = {
    c1: hex[0] ?? "#1B1B1B", c2: hex[hex.length - 1] ?? hex[0] ?? "#090909",
    angle: parseInt(css.match(/(\d+)deg/)?.[1] ?? "135", 10), image: d.heroImage ?? null, overlay: 85,
  };
  const customs: Layer[] = Array.isArray(d.customLayers)
    ? d.customLayers.map((l: any): Layer => ({
        id: l.id, kind: l.type, x: l.x, y: l.y, w: l.width, h: l.height ?? 0, opacity: l.opacity ?? 100,
        color: l.color ?? "#FFFFFF", visible: true, locked: false, text: l.text, src: l.src, shape: l.shape,
        fit: "contain", fontFamily: l.fontFamily, fontSize: l.fontSize, fontWeight: l.fontWeight, align: "left",
      }))
    : [];
  const byId = new Map<string, Layer>(customs.map((l) => [l.id, l]));

  (f.fields as Field[]).forEach((field) => {
    const s = d.textStyles?.[field], p = d.textPositions?.[field], content = d.text?.[field];
    if (!s || !p || !content) return;
    byId.set(`text:${field}`, textLayer({
      id: `field:${field}`, name: FIELD_LABEL[field], text: content, x: p.x, y: p.y, w: 84,
      fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, align: s.textAlign,
      color: s.color, uppercase: field === "title",
    }));
  });
  if (d.logoImage) {
    const w = ((d.logoSize ?? 80) / 1080) * 100;
    byId.set("logo", {
      id: uid(), kind: "image", name: "Logo", src: d.logoImage, fit: "contain", x: d.logoX ?? 78, y: d.logoY ?? 4,
      w, h: (w * f.width) / f.height, opacity: d.logoOpacity ?? 100, color: "#FFFFFF", visible: true, locked: false,
    });
  }
  const order: string[] = Array.isArray(d.layerOrder) ? d.layerOrder : [];
  const layers: Layer[] = [];
  order.forEach((id) => { const l = byId.get(id); if (l) { layers.push(l); byId.delete(id); } });
  byId.forEach((l) => layers.push(l));
  return { bg, layers };
}

/* ─────────────────────── Images : redimensionnement + stockage ─────────────────────── */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function storeImage(file: File, max: number): Promise<{ src: string; nw: number; nh: number }> {
  const objectUrl = URL.createObjectURL(file);
  let img: HTMLImageElement;
  try { img = await loadImage(objectUrl); } finally { URL.revokeObjectURL(objectUrl); }
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const nw = Math.round(img.naturalWidth * k), nh = Math.round(img.naturalHeight * k);
  const canvas = document.createElement("canvas");
  canvas.width = nw; canvas.height = nh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0, nw, nh);
  const type = /png|gif|svg|webp/.test(file.type) ? "image/png" : "image/jpeg";
  const dataUrl = canvas.toDataURL(type, 0.88);
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, type, 0.88));
  if (blob) {
    try {
      const supabase = createSupabaseBrowserClient() as any;
      const path = `${new Date().getFullYear()}/${uid()}.${type === "image/png" ? "png" : "jpg"}`;
      const { error } = await supabase.storage.from("studio").upload(path, blob, { contentType: type, cacheControl: "31536000" });
      if (error) throw error;
      const { data } = supabase.storage.from("studio").getPublicUrl(path);
      if (data?.publicUrl) return { src: data.publicUrl, nw, nh };
    } catch { /* bucket absent : on garde l'image en base64 */ }
  }
  return { src: dataUrl, nw, nh };
}

/* ───────────────────────── Rendu canvas (export & miniature) ───────────────────────── */

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxW) { out.push(line); line = word; } else line = test;
    }
    out.push(line);
  }
  return out;
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, bx: number, by: number, bw: number, bh: number, fit: "contain" | "cover") {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const k = fit === "cover" ? Math.max(bw / iw, bh / ih) : Math.min(bw / iw, bh / ih);
  const dw = iw * k, dh = ih * k;
  ctx.save();
  ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
  ctx.drawImage(img, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh);
  ctx.restore();
}

async function renderDoc(doc: Doc, W: number, H: number): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const s = W / 1080;

  // Les polices doivent être chargées avant de dessiner, sinon le texte sort en police par défaut.
  const fonts = new Set(doc.layers.filter((l) => l.kind === "text" && l.visible).map((l) => `${l.fontWeight ?? 700} 40px ${l.fontFamily}`));
  await Promise.all([...fonts].map((f) => document.fonts.load(f, "Aa أب").catch(() => [])));

  // Fond (dégradé CSS reproduit à l'identique : mêmes angles, mêmes couleurs)
  const { bg } = doc;
  const a = (bg.angle * Math.PI) / 180;
  const len = Math.abs(W * Math.sin(a)) + Math.abs(H * Math.cos(a));
  const dx = (Math.sin(a) * len) / 2, dy = (-Math.cos(a) * len) / 2;
  const grad = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
  grad.addColorStop(0, bg.c1); grad.addColorStop(1, bg.c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (bg.image) {
    try {
      const img = await loadImage(bg.image);
      drawCover(ctx, img, 0, 0, W, H, "cover");
      const [top, bottom] = overlayAlphas(bg.overlay);
      const ov = ctx.createLinearGradient(0, 0, 0, H);
      ov.addColorStop(0, `rgba(0,0,0,${top})`); ov.addColorStop(1, `rgba(0,0,0,${bottom})`);
      ctx.fillStyle = ov;
      ctx.fillRect(0, 0, W, H);
    } catch { /* image illisible : le dégradé reste */ }
  }

  // Calques, du fond vers le premier plan
  for (const l of doc.layers) {
    if (!l.visible) continue;
    const bx = (l.x / 100) * W, by = (l.y / 100) * H, bw = (l.w / 100) * W, bh = (l.h / 100) * H;
    ctx.save();
    ctx.globalAlpha = l.opacity / 100;
    if (l.kind === "text") {
      const size = (l.fontSize ?? 40) * s;
      ctx.font = `${l.fontWeight ?? 700} ${size}px ${l.fontFamily ?? "Arial"}`;
      ctx.fillStyle = l.color;
      ctx.textBaseline = "middle";
      ctx.textAlign = l.align ?? "left";
      if (l.shadow) { ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 0.012 * W; ctx.shadowOffsetY = 0.0025 * W; }
      const content = l.uppercase ? (l.text ?? "").toUpperCase() : l.text ?? "";
      const ax = l.align === "center" ? bx + bw / 2 : l.align === "right" ? bx + bw : bx;
      const lh = size * 1.2;
      wrapLines(ctx, content, bw).forEach((line, i) => ctx.fillText(line, ax, by + lh * (i + 0.5)));
    } else if (l.kind === "image" && l.src) {
      try { drawCover(ctx, await loadImage(l.src), bx, by, bw, bh, l.fit ?? "contain"); } catch { /* ignoré */ }
    } else if (l.kind === "shape") {
      ctx.fillStyle = l.color;
      if (l.shape === "circle") { ctx.beginPath(); ctx.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(bx, by, bw, bh);
    }
    ctx.restore();
  }
  return canvas;
}

/* ───────────────────────── Petits composants d'interface ───────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/10 py-4 last:border-b-0">
      <h3 className="mb-3 text-xs font-semibold text-white/65">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Range({ label, value, min, max, step = 1, unit = "", onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex justify-between text-[11px] text-white/60">
        <span>{label}</span>
        <span className="tabular-nums text-white/85">{Math.round(value * 10) / 10}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#FF6B00]" />
    </label>
  );
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { label: string; value: T }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-1 rounded-lg bg-white/5 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`rounded-md px-2 py-2 text-[11px] font-medium transition ${o.value === value ? "bg-[#FF6B00] text-white" : "text-white/65 hover:bg-white/10 hover:text-white"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-[11px] font-medium transition ${on ? "border-[#FF6B00] bg-[#FF6B00]/10 text-white" : "border-white/10 text-white/65 hover:bg-white/5"}`}>
      {label}
      <span className={`h-4 w-7 rounded-full p-0.5 transition ${on ? "bg-[#FF6B00]" : "bg-white/20"}`}>
        <span className={`block h-3 w-3 rounded-full bg-white transition ${on ? "translate-x-3" : ""}`} />
      </span>
    </button>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#121212] p-2">
        <input type="color" aria-label="Choisir une couleur" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent" />
        <span className="text-xs uppercase tabular-nums text-white/70">{value}</span>
      </div>
      <div className="mt-2 flex gap-2">
        {PALETTE.map((c) => (
          <button key={c} type="button" aria-label={c} onClick={() => onChange(c)}
            className={`h-7 flex-1 rounded-md border ${value.toLowerCase() === c.toLowerCase() ? "border-[#FF6B00] ring-1 ring-[#FF6B00]" : "border-white/15"}`} style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  );
}

function StudioSelect({ value, options, onChange }: {
  value: string; options: { label: string; value: string; font?: string }[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? options[0];
  return (
    <div className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-[#121212] px-3 py-2.5 text-left text-sm text-white outline-none transition hover:border-white/30 focus:border-[#FF6B00]">
        <span style={{ fontFamily: selected?.font }}>{selected?.label ?? value}</span>
        <span className={`ml-3 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <>
          <button type="button" aria-label="Fermer la liste" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div role="listbox" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-white/15 bg-[#161616] p-1 shadow-2xl shadow-black/70">
            {options.map((o) => (
              <button key={o.value} type="button" role="option" aria-selected={o.value === value} onClick={() => { onChange(o.value); setOpen(false); }}
                style={{ fontFamily: o.font }}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm transition ${o.value === value ? "bg-[#FF6B00] font-semibold text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const btn = "rounded-lg border border-white/10 bg-[#121212] px-3 py-2.5 text-xs font-medium text-white/80 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30";

/* ───────────────────────────────── Page ───────────────────────────────── */

export default function StudioEditorPage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = typeof params.slug === "string" ? params.slug : Array.isArray(params.slug) ? params.slug[0] ?? "publication" : "publication";
  const slug = FORMATS[rawSlug] ? rawSlug : "publication";
  const fmt = getFormat(slug);
  const W = 1080;
  const H = fmt.height;

  /* — Notifications (système QAHWA) — */
  const toast = useToast();
  const confirm = useConfirm();

  /* — État du document + historique (annuler / rétablir) — */
  const [doc, setDocState] = useState<Doc>(() => buildDoc(slug, "classic"));
  const docRef = useRef(doc);
  const pastRef = useRef<Doc[]>([]);
  const futureRef = useRef<Doc[]>([]);
  const lastEdit = useRef<{ key: string; t: number } | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("add");
  const [name, setName] = useState("Ma création");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [dragLayerId, setDragLayerId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const act = useRef<any>({});

  // Prévient (avec la fenêtre QAHWA) quand on quitte la page avec des modifications non enregistrées.
  useUnsavedChangesGuard(dirty, {
    title: "Quitter le Studio sans enregistrer ?",
    message: "Tu as des modifications non enregistrées sur cette affiche. Si tu quittes maintenant, elles seront perdues.",
    confirmLabel: "Quitter sans enregistrer",
    cancelLabel: "Rester dans l'éditeur",
  });

  const sel = doc.layers.find((l) => l.id === selectedId) ?? null;

  const notify = (text: string, tone: "ok" | "error" = "ok") => {
    if (tone === "error") toast.error(text);
    else toast.success(text);
  };

  const commit = (next: Doc) => {
    docRef.current = next;
    setDocState(next);
    setDirty(true);
  };

  /** Applique une modification. Les modifications répétées avec la même clé (curseur, glisser) comptent pour une seule étape d'historique. */
  const apply = (fn: (d: Doc) => Doc, key?: string) => {
    const prev = docRef.current;
    const next = fn(prev);
    if (next === prev) return;
    const now = Date.now();
    const merge = !!key && lastEdit.current?.key === key && now - lastEdit.current.t < 700;
    if (!merge) {
      pastRef.current = [...pastRef.current.slice(-49), prev];
      futureRef.current = [];
    }
    lastEdit.current = key ? { key, t: now } : null;
    commit(next);
  };

  const loadDoc = (d: Doc) => {
    docRef.current = d;
    pastRef.current = [];
    futureRef.current = [];
    lastEdit.current = null;
    setDocState(d);
    setSelectedId(null);
    setDirty(false);
  };

  const undo = () => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(docRef.current);
    lastEdit.current = null;
    commit(prev);
  };
  const redo = () => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(docRef.current);
    lastEdit.current = null;
    commit(next);
  };

  const select = (id: string | null, switchTab = true) => {
    setSelectedId(id);
    if (!switchTab) return;
    if (id) setTab("edit");
    else setTab((t) => (t === "edit" ? "add" : t));
  };

  const updateLayer = (id: string, patch: Partial<Layer>, key?: string) =>
    apply((d) => ({ ...d, layers: d.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) }), key ?? `u:${id}:${Object.keys(patch).join(",")}`);

  const updateBg = (patch: Partial<Background>, key?: string) =>
    apply((d) => ({ ...d, bg: { ...d.bg, ...patch } }), key ?? `bg:${Object.keys(patch).join(",")}`);

  /** Les photos et formes s'insèrent sous les textes ; les textes et logos arrivent au premier plan. */
  const addLayer = (layer: Layer, behindText = false) => {
    apply((d) => {
      const firstText = d.layers.findIndex((l) => l.kind === "text");
      const at = behindText && firstText >= 0 ? firstText : d.layers.length;
      const layers = [...d.layers];
      layers.splice(at, 0, layer);
      return { ...d, layers };
    });
    select(layer.id);
  };

  const removeLayer = (id: string) => {
    apply((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== id) }));
    if (selectedId === id) select(null);
  };

  const duplicateLayer = (id: string) => {
    const l = docRef.current.layers.find((x) => x.id === id);
    if (!l) return;
    const copy: Layer = { ...l, id: uid(), name: undefined, x: clamp(l.x + 3, 0, 100 - l.w), y: clamp(l.y + 3, 0, 96) };
    apply((d) => {
      const i = d.layers.findIndex((x) => x.id === id);
      const layers = [...d.layers];
      layers.splice(i + 1, 0, copy);
      return { ...d, layers };
    });
    select(copy.id);
  };

  const moveLayer = (id: string, dir: "up" | "down" | "front" | "back") =>
    apply((d) => {
      const from = d.layers.findIndex((l) => l.id === id);
      if (from < 0) return d;
      const to = dir === "up" ? from + 1 : dir === "down" ? from - 1 : dir === "front" ? d.layers.length - 1 : 0;
      if (to < 0 || to >= d.layers.length || to === from) return d;
      const layers = [...d.layers];
      const [item] = layers.splice(from, 1);
      layers.splice(to, 0, item!);
      return { ...d, layers };
    });

  const reorderLayer = (fromId: string, toId: string) =>
    apply((d) => {
      const from = d.layers.findIndex((l) => l.id === fromId);
      const to = d.layers.findIndex((l) => l.id === toId);
      if (from < 0 || to < 0 || from === to) return d;
      const layers = [...d.layers];
      const [item] = layers.splice(from, 1);
      layers.splice(to, 0, item!);
      return { ...d, layers };
    });

  /** Hauteur réelle (en %) d'un calque, utile pour le texte dont la hauteur est automatique. */
  const measureH = (id: string) => {
    const canvas = canvasRef.current;
    const el = canvas?.querySelector<HTMLElement>(`[data-layer="${id}"]`);
    if (canvas && el && canvas.offsetHeight) return (el.offsetHeight / canvas.offsetHeight) * 100;
    return docRef.current.layers.find((l) => l.id === id)?.h ?? 5;
  };

  const alignLayer = (id: string, a: "l" | "c" | "r" | "t" | "m" | "b") => {
    const l = docRef.current.layers.find((x) => x.id === id);
    if (!l) return;
    const h = l.kind === "text" ? measureH(id) : l.h;
    const mx = l.w >= 90 ? 0 : 5, my = h >= 90 ? 0 : 5;
    const patch: Partial<Layer> =
      a === "l" ? { x: mx } : a === "c" ? { x: (100 - l.w) / 2 } : a === "r" ? { x: Math.max(0, 100 - l.w - mx) }
      : a === "t" ? { y: my } : a === "m" ? { y: Math.max(0, (100 - h) / 2) } : { y: Math.max(0, 100 - h - my) };
    updateLayer(id, patch, `align:${id}`);
  };

  /* — Déplacement et redimensionnement à la souris / au doigt — */
  const startDrag = (e: React.PointerEvent, layer: Layer, mode: "move" | "resize") => {
    e.preventDefault();
    e.stopPropagation();
    select(layer.id);
    if (layer.locked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const start = { ...layer };
    const startH = layer.kind === "text" ? measureH(layer.id) : layer.h;

    const snapAxis = (pos: number, size: number) => {
      const cands: [number, number][] = [[0, 0], [0, 5], [size / 2, 50], [size, 95], [size, 100]];
      let best: { d: number; g: number } | null = null;
      for (const [off, target] of cands) {
        const d = target - (pos + off);
        if (Math.abs(d) <= 1.2 && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, g: target };
      }
      return best;
    };

    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / rect.width) * 100;
      const dy = ((ev.clientY - sy) / rect.height) * 100;
      if (mode === "move") {
        let x = clamp(start.x + dx, 0, 100 - start.w);
        let y = clamp(start.y + dy, 0, 100 - startH);
        let gx: number | null = null, gy: number | null = null;
        if (!ev.altKey) {
          const sxn = snapAxis(x, start.w), syn = snapAxis(y, startH);
          if (sxn) { x += sxn.d; gx = sxn.g; }
          if (syn) { y += syn.d; gy = syn.g; }
        }
        setGuides({ x: gx, y: gy });
        updateLayer(layer.id, { x: clamp(x, 0, 100 - start.w), y: clamp(y, 0, 100 - startH) }, `drag:${layer.id}`);
      } else {
        const nw = clamp(start.w + dx, 3, 100 - start.x);
        const r = nw / start.w;
        let patch: Partial<Layer>;
        if (start.kind === "text") patch = { w: nw, fontSize: clamp(Math.round((start.fontSize ?? 40) * r), 12, 400) };
        else if (start.kind === "image") patch = { w: nw, h: clamp(start.h * r, 2, 100 - start.y) };
        else patch = { w: nw, h: clamp(start.h + dy, 0.3, 100 - start.y) };
        updateLayer(layer.id, patch, `resize:${layer.id}`);
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setGuides({ x: null, y: null });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /* — Ajout d'éléments — */
  const addText = (preset: "title" | "subtitle" | "body" | "price") => {
    const p = {
      title: { text: "Votre titre", fontSize: 96, fontWeight: 800, fontFamily: F.archivo, uppercase: true, y: 40 },
      subtitle: { text: "Votre sous-titre", fontSize: 40, fontWeight: 600, fontFamily: F.inter, uppercase: false, y: 50 },
      body: { text: "Votre texte", fontSize: 32, fontWeight: 400, fontFamily: F.inter, uppercase: false, y: 60 },
      price: { text: "850 DA", fontSize: 72, fontWeight: 800, fontFamily: F.archivo, uppercase: false, y: 75 },
    }[preset];
    addLayer(textLayer({ ...p, x: 8, y: clamp(p.y + (docRef.current.layers.length % 4) * 3, 0, 90) }));
    setTimeout(() => textAreaRef.current?.select(), 80);
  };

  const handleFiles = async (files: FileList | null, as: "photo" | "logo" | "bg") => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setBusy(true);
    for (const file of list) {
      try {
        const img = await storeImage(file, as === "logo" ? 800 : 1800);
        if (as === "bg") updateBg({ image: img.src, overlay: docRef.current.bg.image ? docRef.current.bg.overlay : 75 }, "bg:image");
        else addLayer(imageLayer(img, as, W, H), as === "photo");
      } catch {
        notify("Impossible de lire cette image.", "error");
      }
    }
    setBusy(false);
  };

  /* — Retour au Studio (avec confirmation si besoin) — */
  const goBack = async () => {
    if (dirty) {
      const leave = await confirm({
        title: "Quitter le Studio sans enregistrer ?",
        message: "Tu as des modifications non enregistrées sur cette affiche. Si tu quittes maintenant, elles seront perdues.",
        confirmLabel: "Quitter sans enregistrer",
        cancelLabel: "Rester dans l'éditeur",
        tone: "danger",
      });
      if (!leave) return;
    }
    router.push("/qahwa/studio");
  };

  /* — Enregistrement — */
  const save = async () => {
    if (saving) return;
    const title = name.trim();
    if (!title) return notify("Donne un nom à ta création.", "error");
    setSaving(true);
    try {
      let thumbnail: string | undefined;
      try {
        const small = await renderDoc(docRef.current, 360, Math.round((360 * H) / W));
        thumbnail = small.toDataURL("image/jpeg", 0.7);
      } catch { /* miniature facultative */ }
      const supabase = createSupabaseBrowserClient() as any;
      const payload = {
        name: title,
        category: slug,
        design: { version: 2, bg: docRef.current.bg, layers: docRef.current.layers, thumbnail },
        updated_at: new Date().toISOString(),
      };
      const result = savedId
        ? await supabase.from("qahwa_studio_creations").update(payload).eq("id", savedId).select("id").single()
        : await supabase.from("qahwa_studio_creations").insert(payload).select("id").single();
      if (result.error) throw result.error;
      const id = result.data.id as string;
      setSavedId(id);
      setDirty(false);
      const url = new URL(window.location.href);
      url.searchParams.set("saved", id);
      url.searchParams.delete("new");
      url.searchParams.delete("design");
      window.history.replaceState({}, "", url.toString());
      notify("Création enregistrée.");
    } catch (error) {
      console.error("Erreur de sauvegarde Studio :", error);
      notify("Échec de l'enregistrement. Vérifie ta connexion et que tu es connecté à Qahwa.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* — Export — */
  const download = async (type: "png" | "jpg") => {
    setExportOpen(false);
    setBusy(true);
    try {
      const canvas = await renderDoc(docRef.current, W, H);
      const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, type === "png" ? "image/png" : "image/jpeg", 0.92));
      if (!blob) throw new Error("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const base = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "affiche";
      a.href = url;
      a.download = `qahwa-${base}.${type}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify(`Image ${type.toUpperCase()} téléchargée.`);
    } catch (error) {
      console.error("Erreur d'export :", error);
      notify("Export impossible : une image du Studio est bloquée. Réimporte-la puis réessaie.", "error");
    } finally {
      setBusy(false);
    }
  };

  /* — Effets — */
  // Brouillon automatique : évite de perdre le travail en cas de rechargement.
useEffect(() => {
  if (!dirty) return;
  const t = setTimeout(() => {
    try {
      localStorage.setItem(
        `qahwa-studio-draft:${savedId ?? slug}`,
        JSON.stringify({ name, doc: docRef.current })
      );
    } catch { /* stockage plein : on ignore */ }
  }, 1000);
  return () => clearTimeout(t);
}, [doc, name, dirty, savedId, slug]);
  useEffect(() => {
    const id = "qahwa-studio-google-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_URL;
    document.head.appendChild(link);
  }, []);

  // Charge un modèle (?design=...) ou une création enregistrée (?saved=...).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const savedParam = q.get("saved");
    const designParam = q.get("design");
    let cancelled = false;
    if (savedParam) {
      (async () => {
        const supabase = createSupabaseBrowserClient() as any;
        const { data: creation, error } = await supabase
          .from("qahwa_studio_creations").select("id, name, category, design").eq("id", savedParam).single();
        if (cancelled) return;
        if (error || !creation) return notify("Impossible de charger cette création. Vérifie ta connexion.", "error");
        const d = creation.design ?? {};
        const loaded: Doc = d.version === 2 && d.bg && Array.isArray(d.layers) ? { bg: d.bg, layers: d.layers } : migrateV1(d, slug);
        loadDoc(loaded);
        setSavedId(creation.id);
        setName(creation.name || "Ma création");
      })();
    } else if (designParam) {
      const variant: Variant = designParam.endsWith("-editorial") ? "editorial" : designParam.endsWith("-bold") ? "bold" : "premium";
      loadDoc(buildDoc(slug, variant));
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Raccourcis clavier (les fonctions sont lues via act.current pour toujours être à jour).
  act.current = { undo, redo, save, select, duplicateLayer, removeLayer, selectedId, updateLayer };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const a = act.current;
      const t = e.target as HTMLElement;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "s") { e.preventDefault(); a.save(); return; }
      const textEntry = t.tagName === "TEXTAREA" || t.tagName === "SELECT" ||
        (t.tagName === "INPUT" && !["range", "color", "checkbox", "file"].includes((t as HTMLInputElement).type));
      if (textEntry) return;
      // Quand une fenêtre de confirmation est ouverte, les raccourcis de l'éditeur sont suspendus.
      if (t.closest?.('[role="alertdialog"]')) return;
      if (mod && key === "z") { e.preventDefault(); if (e.shiftKey) a.redo(); else a.undo(); return; }
      if (mod && key === "y") { e.preventDefault(); a.redo(); return; }
      if (t.tagName === "INPUT") return;
      const id: string | null = a.selectedId;
      if (!id) return;
      if (mod && key === "d") { e.preventDefault(); a.duplicateLayer(id); return; }
      if (key === "delete" || key === "backspace") { e.preventDefault(); a.removeLayer(id); return; }
      if (key === "escape") { a.select(null); return; }
      const step = e.shiftKey ? 2 : 0.5;
      const d = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }[key];
      if (!d) return;
      e.preventDefault();
      const l = docRef.current.layers.find((x) => x.id === id);
      if (!l || l.locked) return;
      a.updateLayer(id, { x: clamp(l.x + d[0]!, 0, 100 - l.w), y: clamp(l.y + d[1]!, 0, 100) }, `nudge:${id}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* — Libellés — */
  const layerLabel = (l: Layer) =>
    l.kind === "text" ? (l.text?.split("\n")[0]?.slice(0, 28) || "Texte vide")
    : l.kind === "image" ? l.name ?? "Image"
    : l.name ?? (l.shape === "rectangle" ? "Rectangle" : l.shape === "circle" ? "Cercle" : "Ligne");
  const layerIcon = (l: Layer) => (l.kind === "text" ? "T" : l.kind === "image" ? "▧" : l.shape === "circle" ? "●" : l.shape === "line" ? "━" : "▰");

  const [bgTop, bgBottom] = overlayAlphas(doc.bg.overlay);
  const statusText = dirty ? "Modifications non enregistrées" : savedId ? "Enregistré" : "Nouvelle création";
  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  /* ───────────────────────────── Rendu ───────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* EN-TÊTE */}
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#0F0F0F] px-3 py-2.5 sm:px-5">
        <button type="button" onClick={() => void goBack()}
          className="text-sm text-white/60 transition hover:text-white">← Studio</button>
        <div className="h-5 w-px bg-white/10" />
        <div className="min-w-0 flex-1 sm:flex-none">
          <input value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} aria-label="Nom de la création" maxLength={60}
            className="w-full min-w-[10rem] rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold outline-none transition hover:border-white/15 focus:border-[#FF6B00] sm:w-64" />
          <p className="px-2 text-[10px] text-white/45">
            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${dirty ? "bg-[#FF6B00]" : "bg-emerald-400"}`} />
            {statusText} · {fmt.title} · {fmt.format} · {fmt.width} × {fmt.height} px
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={undo} disabled={!canUndo} title="Annuler (Ctrl+Z)" className={btn}>↶ Annuler</button>
          <button type="button" onClick={redo} disabled={!canRedo} title="Rétablir (Ctrl+Maj+Z)" className={btn}>↷ Rétablir</button>
          <button type="button" onClick={save} disabled={saving} title="Enregistrer (Ctrl+S)"
            className="rounded-lg bg-[#FF6B00] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#e85f00] disabled:cursor-wait disabled:opacity-60">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <div className="relative">
            <button type="button" onClick={() => setExportOpen((o) => !o)} disabled={busy}
              className="rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-black transition hover:bg-white/85 disabled:opacity-60">
              {busy ? "Patiente…" : "Télécharger ▾"}
            </button>
            {exportOpen && (
              <>
                <button type="button" aria-label="Fermer" className="fixed inset-0 z-40 cursor-default" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-white/15 bg-[#161616] p-1 shadow-2xl">
                  <button type="button" onClick={() => download("png")} className="block w-full rounded-md px-3 py-2.5 text-left text-xs hover:bg-white/10">
                    <span className="font-semibold">PNG</span> <span className="text-white/50">· qualité maximale</span>
                  </button>
                  <button type="button" onClick={() => download("jpg")} className="block w-full rounded-md px-3 py-2.5 text-left text-xs hover:bg-white/10">
                    <span className="font-semibold">JPG</span> <span className="text-white/50">· fichier plus léger</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4.5rem)] flex-col lg:flex-row">
        {/* ZONE D'AFFICHE */}
        <main className="flex min-w-0 flex-1 flex-col items-center gap-3 overflow-auto p-3 sm:p-5"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          onPointerDown={() => select(null)}>
          {/* Barre d'actions de l'élément sélectionné */}
          <div className="flex min-h-[44px] w-full max-w-[640px] flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#121212] px-3 py-1.5 text-[11px]"
            onPointerDown={(e) => e.stopPropagation()}>
            {sel ? (
              <>
                <span className="mr-auto max-w-[40%] truncate font-semibold text-white/80">{layerIcon(sel)} {layerLabel(sel)}</span>
                <button type="button" className={btn + " !py-1.5"} onClick={() => duplicateLayer(sel.id)} title="Dupliquer (Ctrl+D)">Dupliquer</button>
                <button type="button" className={btn + " !py-1.5"} onClick={() => moveLayer(sel.id, "down")} title="Envoyer derrière">↓ Derrière</button>
                <button type="button" className={btn + " !py-1.5"} onClick={() => moveLayer(sel.id, "up")} title="Mettre devant">↑ Devant</button>
                <button type="button" className={btn + " !py-1.5 !text-red-300"} onClick={() => removeLayer(sel.id)} title="Supprimer (Suppr)">Supprimer</button>
              </>
            ) : (
              <span className="text-white/50">Clique sur un élément pour le modifier, glisse-le pour le déplacer, tire le coin orange pour l'agrandir.</span>
            )}
          </div>

          <div className="flex w-full flex-1 items-start justify-center sm:items-center">
            <div
              ref={canvasRef}
              onPointerDown={(e) => { e.stopPropagation(); select(null); }}
              className="relative overflow-hidden bg-[#111] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
              style={{ width: `min(100%, calc((100vh - 16rem) * ${W / H}))`, aspectRatio: `${W} / ${H}`, containerType: "inline-size" }}
            >
              {/* Fond */}
              <div className="absolute inset-0" style={{ zIndex: 0, background: doc.bg.image ? "#111" : bgCss(doc.bg) }}>
                {doc.bg.image && <img src={doc.bg.image} alt="" draggable={false} className="h-full w-full object-cover" />}
              </div>
              {doc.bg.image && (
                <div className="absolute inset-0" style={{ zIndex: 0, background: `linear-gradient(to bottom, rgba(0,0,0,${bgTop}), rgba(0,0,0,${bgBottom}))` }} />
              )}

              {/* Calques */}
              {doc.layers.map((l, i) => {
                if (!l.visible) return null;
                const selected = l.id === selectedId;
                return (
                  <div
                    key={l.id}
                    data-layer={l.id}
                    onPointerDown={(e) => startDrag(e, l, "move")}
                    onDoubleClick={() => { if (l.kind === "text") { select(l.id); setTimeout(() => textAreaRef.current?.focus(), 60); } }}
                    style={{
                      position: "absolute", left: `${l.x}%`, top: `${l.y}%`, width: `${l.w}%`,
                      height: l.kind === "text" ? "auto" : `${l.h}%`, zIndex: i + 1,
                      cursor: l.locked ? "default" : "move", touchAction: "none", userSelect: "none",
                    }}
                  >
                    <div style={{ opacity: l.opacity / 100, width: "100%", height: l.kind === "text" ? "auto" : "100%" }}>
                      {l.kind === "text" && (
                        <div style={{
                          fontFamily: l.fontFamily, fontSize: `${((l.fontSize ?? 40) / 1080) * 100}cqw`, fontWeight: l.fontWeight,
                          textAlign: l.align, color: l.color, lineHeight: 1.2, whiteSpace: "pre-wrap",
                          textTransform: l.uppercase ? "uppercase" : "none",
                          textShadow: l.shadow ? "0 0.25cqw 1.2cqw rgba(0,0,0,0.55)" : "none",
                        }}>{l.text || "\u00A0"}</div>
                      )}
                      {l.kind === "image" && (
                        <img src={l.src} alt={l.name ?? "Image"} draggable={false} style={{ width: "100%", height: "100%", objectFit: l.fit ?? "contain", display: "block", pointerEvents: "none" }} />
                      )}
                      {l.kind === "shape" && (
                        <div style={{ width: "100%", height: "100%", background: l.color, borderRadius: l.shape === "circle" ? "50%" : 0 }} />
                      )}
                    </div>
                    {selected && (
                      <>
                        <div className="pointer-events-none absolute inset-0" style={{ outline: `2px ${l.locked ? "solid" : "dashed"} #FF6B00`, outlineOffset: 1 }} />
                        {!l.locked && (
                          <span
                            onPointerDown={(e) => startDrag(e, l, "resize")}
                            className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-white bg-[#FF6B00]"
                            style={{ touchAction: "none" }}
                            aria-label="Redimensionner"
                          />
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {/* Guides d'alignement */}
              {guides.x !== null && <div className="pointer-events-none absolute inset-y-0 w-px bg-[#FF6B00]" style={{ left: `${guides.x}%`, zIndex: 9999 }} />}
              {guides.y !== null && <div className="pointer-events-none absolute inset-x-0 h-px bg-[#FF6B00]" style={{ top: `${guides.y}%`, zIndex: 9999 }} />}

              {/* Invitation à ajouter une photo (non exportée) */}
              {!doc.bg.image && !selectedId && (
                <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => bgInputRef.current?.click()}
                  className="absolute left-1/2 top-[4%] -translate-x-1/2 rounded-full border border-dashed border-white/40 bg-black/30 px-4 py-2 text-[11px] font-medium text-white/80 backdrop-blur transition hover:border-[#FF6B00] hover:text-white"
                  style={{ zIndex: 9998 }}>
                  + Ajouter une photo de fond
                </button>
              )}
            </div>
          </div>
        </main>

        {/* PANNEAU DE DROITE */}
        <aside className="w-full shrink-0 border-t border-white/10 bg-[#0F0F0F] lg:max-h-[calc(100vh-4.5rem)] lg:w-[380px] lg:overflow-y-auto lg:border-l lg:border-t-0">
          <div role="tablist" className="sticky top-0 z-30 grid grid-cols-4 gap-1 border-b border-white/10 bg-[#0F0F0F] p-2">
            {([
              ["add", "Ajouter", "＋"],
              ["edit", "Édition", "✎"],
              ["background", "Fond", "◐"],
              ["layers", "Calques", "☰"],
            ] as [Tab, string, string][]).map(([id, label, icon]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[11px] font-medium transition ${tab === id ? "bg-[#FF6B00] text-white" : "text-white/55 hover:bg-white/5 hover:text-white"}`}>
                <span className="text-base leading-none">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          <div className="px-4 pb-8">
            <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void handleFiles(e.target.files, "bg"); e.target.value = ""; }} />
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void handleFiles(e.target.files, "photo"); e.target.value = ""; }} />
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void handleFiles(e.target.files, "logo"); e.target.value = ""; }} />

            {/* ───── AJOUTER ───── */}
            {tab === "add" && (
              <>
                <Section title="Texte">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => addText("title")} className={btn + " !py-4"} style={{ fontFamily: F.archivo }}>Titre</button>
                    <button type="button" onClick={() => addText("subtitle")} className={btn + " !py-4"} style={{ fontWeight: 600 }}>Sous-titre</button>
                    <button type="button" onClick={() => addText("body")} className={btn + " !py-4"}>Paragraphe</button>
                    <button type="button" onClick={() => addText("price")} className={btn + " !py-4"} style={{ fontFamily: F.archivo }}>Prix</button>
                  </div>
                </Section>
                <Section title="Images">
                  <button type="button" onClick={() => photoInputRef.current?.click()} disabled={busy}
                    className="w-full rounded-lg bg-white px-3 py-3 text-xs font-bold text-black transition hover:bg-white/85 disabled:opacity-60">+ Ajouter une ou plusieurs photos</button>
                  <button type="button" onClick={() => logoInputRef.current?.click()} disabled={busy} className={btn + " w-full"}>+ Ajouter le logo Qahwa</button>
                  <p className="text-[11px] leading-4 text-white/45">Les images sont réduites automatiquement pour garder l'éditeur rapide. Pour une photo plein cadre, utilise l'onglet Fond.</p>
                </Section>
                <Section title="Formes">
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => addLayer(shapeLayer({ shape: "rectangle" }), true)} className={btn + " !py-3"}>▰ Rectangle</button>
                    <button type="button" onClick={() => addLayer(shapeLayer({ shape: "circle", h: (34 * W) / H }), true)} className={btn + " !py-3"}>● Cercle</button>
                    <button type="button" onClick={() => addLayer(shapeLayer({ shape: "line" }), true)} className={btn + " !py-3"}>━ Ligne</button>
                  </div>
                  <p className="text-[11px] leading-4 text-white/45">Un rectangle peut servir de bandeau de couleur derrière un texte : il se place automatiquement sous les textes.</p>
                </Section>
                <Section title="Raccourcis">
                  <p className="text-[11px] leading-5 text-white/55">Ctrl+Z annuler · Ctrl+Maj+Z rétablir · Ctrl+D dupliquer · Suppr supprimer · flèches pour déplacer (Maj = plus loin) · Alt en glissant pour désactiver l'aimantation · Ctrl+S enregistrer.</p>
                </Section>
              </>
            )}

            {/* ───── ÉDITION ───── */}
            {tab === "edit" && !sel && (
              <div className="mt-6 rounded-xl border border-dashed border-white/15 p-6 text-center text-xs leading-5 text-white/55">
                Aucun élément sélectionné.<br />Clique sur un texte, une image ou une forme de l'affiche, ou choisis-en un dans l'onglet Calques.
              </div>
            )}

            {tab === "edit" && sel && (
              <>
                {sel.kind === "text" && (
                  <>
                    <Section title="Texte">
                      <textarea ref={textAreaRef} rows={3} aria-label="Contenu du texte" value={sel.text ?? ""}
                        onChange={(e) => updateLayer(sel.id, { text: e.target.value }, `text:${sel.id}`)}
                        className="w-full resize-y rounded-lg border border-white/10 bg-[#121212] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF6B00]" />
                    </Section>
                    <Section title="Police">
                      <StudioSelect value={sel.fontFamily ?? F.inter} onChange={(v) => updateLayer(sel.id, { fontFamily: v })}
                        options={FONTS.map((f) => ({ ...f, font: f.value }))} />
                      <Range label="Taille" value={sel.fontSize ?? 40} min={12} max={300} unit=" px" onChange={(v) => updateLayer(sel.id, { fontSize: v })} />
                      <StudioSelect value={String(sel.fontWeight ?? 700)} onChange={(v) => updateLayer(sel.id, { fontWeight: Number(v) })} options={WEIGHTS} />
                      <Seg<Align> value={sel.align ?? "left"} onChange={(v) => updateLayer(sel.id, { align: v })}
                        options={[{ label: "Gauche", value: "left" }, { label: "Centre", value: "center" }, { label: "Droite", value: "right" }]} />
                      <div className="grid grid-cols-2 gap-2">
                        <Toggle label="Majuscules" on={!!sel.uppercase} onChange={(v) => updateLayer(sel.id, { uppercase: v })} />
                        <Toggle label="Ombre" on={!!sel.shadow} onChange={(v) => updateLayer(sel.id, { shadow: v })} />
                      </div>
                    </Section>
                  </>
                )}

                {sel.kind !== "image" && (
                  <Section title="Couleur">
                    <ColorField value={sel.color} onChange={(v) => updateLayer(sel.id, { color: v })} />
                  </Section>
                )}

                {sel.kind === "image" && (
                  <Section title="Affichage de l'image">
                    <Seg<"contain" | "cover"> value={sel.fit ?? "contain"} onChange={(v) => updateLayer(sel.id, { fit: v })}
                      options={[{ label: "Image entière", value: "contain" }, { label: "Remplir le cadre", value: "cover" }]} />
                  </Section>
                )}

                <Section title="Taille et transparence">
                  <Range label="Transparence" value={100 - sel.opacity} min={0} max={95} unit="%" onChange={(v) => updateLayer(sel.id, { opacity: 100 - v })} />
                  <Range label="Largeur" value={sel.w} min={3} max={100} unit="%" onChange={(v) => updateLayer(sel.id, { w: v, x: Math.min(sel.x, 100 - v) })} />
                  {sel.kind !== "text" && (
                    <Range label="Hauteur" value={sel.h} min={0.3} max={100} step={0.1} unit="%" onChange={(v) => updateLayer(sel.id, { h: v, y: Math.min(sel.y, 100 - v) })} />
                  )}
                  {sel.kind === "shape" && sel.shape === "rectangle" && (
                    <button type="button" className={btn + " w-full"} onClick={() => updateLayer(sel.id, { x: 0, y: 0, w: 100, h: 100 })}>Couvrir toute l'affiche</button>
                  )}
                </Section>

                <Section title="Position">
                  <div className="grid grid-cols-3 gap-2">
                    {([["⇤ Gauche", "l"], ["↔ Centre", "c"], ["⇥ Droite", "r"], ["⤒ Haut", "t"], ["↕ Milieu", "m"], ["⤓ Bas", "b"]] as const).map(([label, a]) => (
                      <button key={a} type="button" className={btn + " !px-1"} onClick={() => alignLayer(sel.id, a)}>{label}</button>
                    ))}
                  </div>
                </Section>

                <Section title="Élément">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className={btn} onClick={() => updateLayer(sel.id, { locked: !sel.locked })}>{sel.locked ? "🔓 Déverrouiller" : "🔒 Verrouiller"}</button>
                    <button type="button" className={btn} onClick={() => duplicateLayer(sel.id)}>Dupliquer</button>
                    <button type="button" className={btn} onClick={() => moveLayer(sel.id, "back")}>Tout au fond</button>
                    <button type="button" className={btn} onClick={() => moveLayer(sel.id, "front")}>Tout devant</button>
                  </div>
                  <button type="button" onClick={() => removeLayer(sel.id)}
                    className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20">Supprimer cet élément</button>
                </Section>
              </>
            )}

            {/* ───── FOND ───── */}
            {tab === "background" && (
              <>
                <Section title="Couleurs prêtes à l'emploi">
                  <div className="grid grid-cols-3 gap-2">
                    {BG_PRESETS.map((p) => (
                      <button key={p.name} type="button" onClick={() => updateBg({ c1: p.c1, c2: p.c2, angle: p.angle })}
                        className="overflow-hidden rounded-lg border border-white/15 text-[11px] transition hover:border-[#FF6B00]">
                        <span className="block h-12" style={{ background: bgCss({ ...doc.bg, c1: p.c1, c2: p.c2, angle: p.angle }) }} />
                        <span className="block bg-[#121212] py-1.5 text-white/75">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </Section>
                <Section title="Couleurs personnalisées">
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="mb-1.5 text-[11px] text-white/60">Couleur 1</p><input type="color" aria-label="Couleur 1" value={doc.bg.c1} onChange={(e) => updateBg({ c1: e.target.value })} className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-[#121212] p-1" /></div>
                    <div><p className="mb-1.5 text-[11px] text-white/60">Couleur 2</p><input type="color" aria-label="Couleur 2" value={doc.bg.c2} onChange={(e) => updateBg({ c2: e.target.value })} className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-[#121212] p-1" /></div>
                  </div>
                  <Range label="Angle du dégradé" value={doc.bg.angle} min={0} max={360} unit="°" onChange={(v) => updateBg({ angle: v })} />
                  <button type="button" className={btn + " w-full"} onClick={() => updateBg({ c2: doc.bg.c1 })}>Couleur unie (sans dégradé)</button>
                </Section>
                <Section title="Photo de fond">
                  <button type="button" onClick={() => bgInputRef.current?.click()} disabled={busy} className={btn + " w-full"}>
                    {doc.bg.image ? "Changer la photo" : "+ Ajouter une photo de fond"}
                  </button>
                  {doc.bg.image && (
                    <>
                      <div className="relative overflow-hidden rounded-lg border border-white/10">
                        <img src={doc.bg.image} alt="" className="h-32 w-full object-cover" />
                      </div>
                      <Range label="Voile sombre (pour lire le texte)" value={doc.bg.overlay} min={0} max={100} unit="%" onChange={(v) => updateBg({ overlay: v })} />
                      <button type="button" onClick={() => updateBg({ image: null })}
                        className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/20">Retirer la photo</button>
                    </>
                  )}
                </Section>
              </>
            )}

            {/* ───── CALQUES ───── */}
            {tab === "layers" && (
              <Section title={`Calques (${doc.layers.length}) · du premier plan au fond`}>
                {doc.layers.length === 0 && <p className="text-xs text-white/45">Rien sur l'affiche pour l'instant. Ajoute un texte, une photo ou une forme.</p>}
                <div className="space-y-1.5">
                  {[...doc.layers].reverse().map((l) => {
                    const index = doc.layers.findIndex((x) => x.id === l.id);
                    return (
                      <div key={l.id} draggable
                        onDragStart={() => setDragLayerId(l.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => { if (dragLayerId) reorderLayer(dragLayerId, l.id); setDragLayerId(null); }}
                        className={`flex items-center gap-1.5 rounded-lg border p-1.5 ${l.id === selectedId ? "border-[#FF6B00] bg-[#FF6B00]/10" : "border-white/10 bg-[#121212]"} ${l.visible ? "" : "opacity-50"}`}>
                        <span className="w-4 cursor-grab text-center text-white/30" aria-hidden="true">⋮⋮</span>
                        <button type="button" onClick={() => select(l.id, false)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs">
                          <span className="w-4 shrink-0 text-center text-white/50">{layerIcon(l)}</span>
                          <span className="truncate">{layerLabel(l)}</span>
                        </button>
                        <button type="button" title={l.visible ? "Masquer" : "Afficher"} onClick={() => updateLayer(l.id, { visible: !l.visible })} className="rounded px-1.5 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white">{l.visible ? "👁" : "—"}</button>
                        <button type="button" title={l.locked ? "Déverrouiller" : "Verrouiller"} onClick={() => updateLayer(l.id, { locked: !l.locked })} className="rounded px-1.5 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white">{l.locked ? "🔒" : "🔓"}</button>
                        <button type="button" aria-label="Monter" disabled={index === doc.layers.length - 1} onClick={() => moveLayer(l.id, "up")} className="rounded px-1.5 py-1 text-xs text-white/60 hover:bg-white/10 disabled:opacity-20">↑</button>
                        <button type="button" aria-label="Descendre" disabled={index === 0} onClick={() => moveLayer(l.id, "down")} className="rounded px-1.5 py-1 text-xs text-white/60 hover:bg-white/10 disabled:opacity-20">↓</button>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] leading-4 text-white/45">Glisse une ligne pour changer l'ordre. L'élément tout en haut de la liste est devant les autres.</p>
              </Section>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
