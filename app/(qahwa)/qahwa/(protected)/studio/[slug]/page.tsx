"use client";

/*
 * STUDIO QAHWA — éditeur d'affiches (v3)
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
import type { CSSProperties, ReactNode, PointerEvent as ReactPointerEvent } from "react";
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
type Tool = "select" | "pen";
type Anchor = { x: number; y: number; dx: number; dy: number }; // dx,dy = poignée de sortie (l'entrée est son opposé)
type TextPreset = "title" | "subtitle" | "body" | "price" | "ar-title" | "ar-body" | "ar-quran";
type CropHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

type Layer = {
  id: string;
  kind: "text" | "image" | "shape" | "path";
  name?: string;
  x: number; // % de la largeur de l'affiche
  y: number; // % de la hauteur
  w: number; // % de la largeur
  h: number; // % de la hauteur (ignoré pour le texte : hauteur automatique)
  opacity: number;
  rotation?: number; // degrés, 0 par défaut
  color: string;
  visible: boolean;
  locked: boolean;
  text?: string;
  fontFamily?: string;
  fontSize?: number; // en px sur une affiche de 1080 px de large
  fontWeight?: number;
  lineHeight?: number; // interligne (1.2 par défaut)
  align?: Align;
  uppercase?: boolean;
  shadow?: boolean;
  src?: string;
  fit?: "contain" | "cover";
  shape?: ShapeKind;
  // Images : taille d'origine + position de l'image dans son cadre (recadrage).
  // ix, iy, iw, ih sont des % relatifs au cadre (cadre = 100 × 100).
  nw?: number;
  nh?: number;
  ix?: number;
  iy?: number;
  iw?: number;
  ih?: number;
    groupId?: string;
  // Tracés (plume) : points relatifs au cadre (0–100), trait et remplissage
  pts?: Anchor[];
  closed?: boolean;
  sw?: number; // épaisseur du trait en px sur 1080 px de large
  fill?: string; // "none" ou une couleur
};

type CropLayer = Layer & { ix: number; iy: number; iw: number; ih: number };

type Background = {
  c1: string;
  c2: string;
  angle: number;
  image: string | null;
  overlay: number; // 0–100, voile sombre (seulement avec une photo)
  zoom?: number; // 100–300, cadrage de la photo de fond
  px?: number; // 0–100, position horizontale
  py?: number; // 0–100, position verticale
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

type SelectOption = { label: string; value: string; font?: string; group?: string; sample?: string };

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

/** Polices arabes et coraniques (Google Fonts). */
const A = {
  quran: '"Amiri Quran", "Scheherazade New", serif',
  scheherazade: '"Scheherazade New", Amiri, serif',
  amiri: 'Amiri, "Noto Naskh Arabic", serif',
  naskh: '"Noto Naskh Arabic", Amiri, serif',
  lateef: 'Lateef, "Noto Naskh Arabic", serif',
  ruqaa: '"Aref Ruqaa", Amiri, serif',
  reem: '"Reem Kufi", "Noto Kufi Arabic", sans-serif',
  kufi: '"Noto Kufi Arabic", Cairo, sans-serif',
  tajawal: "Tajawal, Cairo, sans-serif",
  messiri: '"El Messiri", Cairo, sans-serif',
  cairo: "Cairo, Arial, sans-serif",
  lalezar: "Lalezar, Cairo, sans-serif",
  rakkas: "Rakkas, Cairo, sans-serif",
};

const FONTS: SelectOption[] = [
  { label: "Archivo Black", value: F.archivo, group: "Latines" },
  { label: "Inter", value: F.inter, group: "Latines" },
  { label: "Montserrat", value: F.montserrat, group: "Latines" },
  { label: "Poppins", value: "Poppins, Arial, sans-serif", group: "Latines" },
  { label: "Roboto", value: "Roboto, Arial, sans-serif", group: "Latines" },
  { label: "Open Sans", value: "Open Sans, Arial, sans-serif", group: "Latines" },
  { label: "Lato", value: F.lato, group: "Latines" },
  { label: "Oswald", value: "Oswald, Arial, sans-serif", group: "Latines" },
  { label: "Bebas Neue", value: F.bebas, group: "Latines" },
  { label: "Playfair Display", value: F.playfair, group: "Latines" },
  { label: "Caveat Brush", value: '"Caveat Brush", cursive', group: "Latines" },
  { label: "Arial", value: "Arial", group: "Latines" },
  { label: "Georgia", value: "Georgia", group: "Latines" },
  { label: "Impact", value: "Impact", group: "Latines" },
  { label: "Courier New", value: '"Courier New", monospace', group: "Latines" },
  { label: "Amiri Quran · style Coran", value: A.quran, group: "Arabe & coranique", sample: "القرآن" },
  { label: "Scheherazade New · Naskh classique", value: A.scheherazade, group: "Arabe & coranique", sample: "نسخ" },
  { label: "Amiri · Naskh élégant", value: A.amiri, group: "Arabe & coranique", sample: "أميري" },
  { label: "Noto Naskh Arabic", value: A.naskh, group: "Arabe & coranique", sample: "نسخ" },
  { label: "Lateef", value: A.lateef, group: "Arabe & coranique", sample: "لطيف" },
  { label: "Aref Ruqaa · Ruqʿa", value: A.ruqaa, group: "Arabe & coranique", sample: "رقعة" },
  { label: "Reem Kufi · Kufi", value: A.reem, group: "Arabe & coranique", sample: "كوفي" },
  { label: "Noto Kufi Arabic", value: A.kufi, group: "Arabe & coranique", sample: "كوفي" },
  { label: "Tajawal", value: A.tajawal, group: "Arabe & coranique", sample: "تجوال" },
  { label: "El Messiri", value: A.messiri, group: "Arabe & coranique", sample: "المسيري" },
  { label: "Cairo", value: A.cairo, group: "Arabe & coranique", sample: "القاهرة" },
  { label: "Lalezar · titres", value: A.lalezar, group: "Arabe & coranique", sample: "عنوان" },
  { label: "Rakkas · titres", value: A.rakkas, group: "Arabe & coranique", sample: "عنوان" },
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

const TEXT_PRESETS: Record<TextPreset, Partial<Layer> & { text: string }> = {
  title: { text: "Votre titre", fontSize: 96, fontWeight: 800, fontFamily: F.archivo, uppercase: true, y: 40 },
  subtitle: { text: "Votre sous-titre", fontSize: 40, fontWeight: 600, fontFamily: F.inter, uppercase: false, y: 50 },
  body: { text: "Votre texte", fontSize: 32, fontWeight: 400, fontFamily: F.inter, uppercase: false, y: 60 },
  price: { text: "850 DA", fontSize: 72, fontWeight: 800, fontFamily: F.archivo, uppercase: false, y: 75 },
  "ar-title": { text: "عنوان الإعلان", fontSize: 96, fontWeight: 700, fontFamily: A.reem, align: "center", lineHeight: 1.4, y: 38 },
  "ar-body": { text: "اكتب نصك هنا", fontSize: 44, fontWeight: 500, fontFamily: A.naskh, align: "right", lineHeight: 1.9, y: 58 },
  "ar-quran": { text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", fontSize: 72, fontWeight: 400, fontFamily: A.quran, align: "center", lineHeight: 2.1, y: 45 },
};

const CROP_HANDLES: { h: CropHandle; style: CSSProperties; cursor: string }[] = [
  { h: "nw", style: { left: -8, top: -8 }, cursor: "nwse-resize" },
  { h: "n", style: { left: "50%", top: -8, marginLeft: -8 }, cursor: "ns-resize" },
  { h: "ne", style: { right: -8, top: -8 }, cursor: "nesw-resize" },
  { h: "e", style: { right: -8, top: "50%", marginTop: -8 }, cursor: "ew-resize" },
  { h: "se", style: { right: -8, bottom: -8 }, cursor: "nwse-resize" },
  { h: "s", style: { left: "50%", bottom: -8, marginLeft: -8 }, cursor: "ns-resize" },
  { h: "sw", style: { left: -8, bottom: -8 }, cursor: "nesw-resize" },
  { h: "w", style: { left: -8, top: "50%", marginTop: -8 }, cursor: "ew-resize" },
];

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2" +
  "?family=Amiri:wght@400;700" +
  "&family=Amiri+Quran" +
  "&family=Archivo+Black" +
  "&family=Aref+Ruqaa:wght@400;700" +
  "&family=Bebas+Neue" +
  "&family=Cairo:wght@400;600;700;800" +
  "&family=Caveat+Brush" +
  "&family=El+Messiri:wght@400;500;600;700" +
  "&family=Inter:wght@400;500;600;700;800" +
  "&family=Lalezar" +
  "&family=Lateef:wght@400;500;600;700;800" +
  "&family=Lato:wght@400;700;900" +
  "&family=Montserrat:wght@400;500;600;700;800" +
  "&family=Noto+Kufi+Arabic:wght@400;500;600;700;800" +
  "&family=Noto+Naskh+Arabic:wght@400;500;600;700" +
  "&family=Open+Sans:wght@400;600;700;800" +
  "&family=Oswald:wght@400;500;600;700" +
  "&family=Playfair+Display:wght@400;500;600;700;800" +
  "&family=Poppins:wght@400;500;600;700;800" +
  "&family=Rakkas" +
  "&family=Reem+Kufi:wght@400;500;600;700" +
  "&family=Roboto:wght@400;500;700;900" +
  "&family=Scheherazade+New:wght@400;500;600;700" +
  "&family=Tajawal:wght@400;500;700;800" +
  "&display=swap";

/* ───────────────────────────── Utilitaires ───────────────────────────── */

const uid = () => `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const normAngle = (r: number) => ((((r + 180) % 360) + 360) % 360) - 180;

const RTL_RE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const LTR_RE = /[A-Za-z\u00C0-\u024F]/;

/** Même règle que dir="auto" : le premier caractère « fort » décide du sens d'écriture. */
function isRtlText(text: string) {
  for (const ch of text) {
    if (RTL_RE.test(ch)) return true;
    if (LTR_RE.test(ch)) return false;
  }
  return false;
}

const hasCrop = (l: Layer): l is CropLayer =>
  l.kind === "image" && l.ix != null && l.iy != null && l.iw != null && l.ih != null;
/** Chemin SVG (courbes de Bézier) à partir de points 0–100 dans un cadre de bw × bh. */
function pathD(pts: Anchor[], closed: boolean, bw: number, bh: number) {
  if (pts.length < 2) return "";
  const X = (v: number) => ((v / 100) * bw).toFixed(2);
  const Y = (v: number) => ((v / 100) * bh).toFixed(2);
  const seg = (a: Anchor, b: Anchor) =>
    `C ${X(a.x + a.dx)} ${Y(a.y + a.dy)} ${X(b.x - b.dx)} ${Y(b.y - b.dy)} ${X(b.x)} ${Y(b.y)}`;
  const first = pts[0]!;
  let d = `M ${X(first.x)} ${Y(first.y)}`;
  for (let i = 1; i < pts.length; i++) d += ` ${seg(pts[i - 1]!, pts[i]!)}`;
  if (closed) d += ` ${seg(pts[pts.length - 1]!, first)} Z`;
  return d;
}

/** Crée un calque « tracé » à partir de points exprimés en % de l'affiche. */
function pathLayer(pts: Anchor[], closed: boolean): Layer {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  let minX = Math.min(...xs), minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX, spanY = Math.max(...ys) - minY;
  const bw = Math.max(spanX, 3), bh = Math.max(spanY, 3); // cadre minimal pour pouvoir cliquer une ligne droite
  minX = clamp(minX - (bw - spanX) / 2, 0, 100 - bw);
  minY = clamp(minY - (bh - spanY) / 2, 0, 100 - bh);
  return {
    id: uid(), kind: "path", name: "Tracé", x: minX, y: minY, w: bw, h: bh, opacity: 100,
    color: "#FF6B00", visible: true, locked: false, closed, sw: 8, fill: "none",
    pts: pts.map((p) => ({
      x: ((p.x - minX) / bw) * 100, y: ((p.y - minY) / bh) * 100,
      dx: (p.dx / bw) * 100, dy: (p.dy / bh) * 100,
    })),
  };
}

/** Position de l'image dans son cadre pour « remplir » (cover) ou « image entière » (contain). */
function fitRect(l: Layer, nw: number, nh: number, mode: "cover" | "contain", W: number, H: number) {
  const pw = (l.w / 100) * W;
  const ph = (l.h / 100) * H;
  const k = mode === "cover" ? Math.max(pw / nw, ph / nh) : Math.min(pw / nw, ph / nh);
  const iw = ((nw * k) / pw) * 100;
  const ih = ((nh * k) / ph) * 100;
  return { ix: (100 - iw) / 2, iy: (100 - ih) / 2, iw, ih };
}

/** Empêche de laisser un vide dans le cadre quand l'image est assez grande pour le couvrir. */
function clampPan(ix: number, iy: number, iw: number, ih: number) {
  return {
    ix: iw >= 100 ? clamp(ix, 100 - iw, 0) : clamp(ix, 0, 100 - iw),
    iy: ih >= 100 ? clamp(iy, 100 - ih, 0) : clamp(iy, 0, 100 - ih),
  };
}

/** Change le cadre d'une image en gardant l'image exactement au même endroit sur l'affiche (rognage). */
function reframe(l: CropLayer, f: { x: number; y: number; w: number; h: number }): Partial<Layer> {
  const X = l.x + (l.ix * l.w) / 100;
  const Y = l.y + (l.iy * l.h) / 100;
  const Wc = (l.iw * l.w) / 100;
  const Hc = (l.ih * l.h) / 100;
  return {
    x: f.x, y: f.y, w: f.w, h: f.h,
    ix: ((X - f.x) / f.w) * 100,
    iy: ((Y - f.y) / f.h) * 100,
    iw: (Wc / f.w) * 100,
    ih: (Hc / f.h) * 100,
  };
}

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
    nw: img.nw, nh: img.nh, ix: 0, iy: 0, iw: 100, ih: 100,
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

function drawCover(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement, bx: number, by: number, bw: number, bh: number,
  fit: "contain" | "cover", px = 0.5, py = 0.5
) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const k = fit === "cover" ? Math.max(bw / iw, bh / ih) : Math.min(bw / iw, bh / ih);
  const dw = iw * k, dh = ih * k;
  ctx.save();
  ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
  ctx.drawImage(img, bx + (bw - dw) * px, by + (bh - dh) * py, dw, dh);
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
  await Promise.all([...fonts].map((f) => document.fonts.load(f, "Aa أب بِسْمِ").catch(() => [])));

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
      const z = (bg.zoom ?? 100) / 100;
      const px = (bg.px ?? 50) / 100;
      const py = (bg.py ?? 50) / 100;
      ctx.save();
      ctx.translate(W * px, H * py);
      ctx.scale(z, z);
      ctx.translate(-W * px, -H * py);
      drawCover(ctx, img, 0, 0, W, H, "cover", px, py);
      ctx.restore();
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
    if (l.kind !== "text" && l.rotation) {
      const cx = bx + bw / 2, cy = by + bh / 2;
      ctx.translate(cx, cy); ctx.rotate((l.rotation * Math.PI) / 180); ctx.translate(-cx, -cy);
    }
    if (l.kind === "text") {
      const size = (l.fontSize ?? 40) * s;
      ctx.font = `${l.fontWeight ?? 700} ${size}px ${l.fontFamily ?? "Arial"}`;
      ctx.fillStyle = l.color;
      ctx.textAlign = l.align ?? "left";
      if (l.shadow) { ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 0.012 * W; ctx.shadowOffsetY = 0.0025 * W; }
      const content = l.uppercase ? (l.text ?? "").toUpperCase() : l.text ?? "";
      ctx.direction = isRtlText(content) ? "rtl" : "ltr";
      const ax = l.align === "center" ? bx + bw / 2 : l.align === "right" ? bx + bw : bx;
      const lh = size * (l.lineHeight ?? 1.2);
      // Même modèle que le navigateur : le texte est centré dans sa ligne selon les métriques de la police.
      const m = ctx.measureText("Hg");
      const asc = m.fontBoundingBoxAscent;
      const desc = m.fontBoundingBoxDescent;
      let baseline = lh / 2;
      if (typeof asc === "number" && typeof desc === "number") {
        ctx.textBaseline = "alphabetic";
        baseline = (lh - (asc + desc)) / 2 + asc;
      } else {
        ctx.textBaseline = "middle";
      }
      const lines = wrapLines(ctx, content, bw);
      if (l.rotation) {
        const cx = bx + bw / 2, cy = by + (lh * lines.length) / 2;
        ctx.translate(cx, cy); ctx.rotate((l.rotation * Math.PI) / 180); ctx.translate(-cx, -cy);
      }
      lines.forEach((line, i) => ctx.fillText(line, ax, by + lh * i + baseline));
    } else if (l.kind === "image" && l.src) {
      try {
        const img = await loadImage(l.src);
        if (hasCrop(l)) {
          ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
          ctx.drawImage(img, bx + (l.ix / 100) * bw, by + (l.iy / 100) * bh, (l.iw / 100) * bw, (l.ih / 100) * bh);
        } else {
          drawCover(ctx, img, bx, by, bw, bh, l.fit ?? "contain");
        }
      } catch { /* ignoré */ }
          } else if (l.kind === "path" && l.pts) {
      ctx.translate(bx, by);
      const p2 = new Path2D(pathD(l.pts, !!l.closed, bw, bh));
      if (l.fill && l.fill !== "none") { ctx.fillStyle = l.fill; ctx.fill(p2); }
      ctx.strokeStyle = l.color;
      ctx.lineWidth = (l.sw ?? 8) * s;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke(p2);
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

function Section({ title, children }: { title: string; children: ReactNode }) {
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
        <span className="tabular-nums text-white/85">{Math.round(value * 100) / 100}{unit}</span>
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
  value: string; options: SelectOption[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? options[0];
  return (
    <div className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-[#121212] px-3 py-2.5 text-left text-sm text-white outline-none transition hover:border-white/30 focus:border-[#FF6B00]">
        <span className="truncate" style={{ fontFamily: selected?.font }}>{selected?.label ?? value}</span>
        <span className={`ml-3 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <>
          <button type="button" aria-label="Fermer la liste" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div role="listbox" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-white/15 bg-[#161616] p-1 shadow-2xl shadow-black/70">
            {options.map((o, i) => (
              <div key={o.value}>
                {o.group && o.group !== options[i - 1]?.group && (
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">{o.group}</p>
                )}
                <button type="button" role="option" aria-selected={o.value === value} onClick={() => { onChange(o.value); setOpen(false); }}
                  style={{ fontFamily: o.font }}
                  className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition ${o.value === value ? "bg-[#FF6B00] font-semibold text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
                  <span className="truncate">{o.label}</span>
                  {o.sample && <span className="shrink-0 text-base" dir="rtl">{o.sample}</span>}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const btn = "rounded-lg border border-white/10 bg-[#121212] px-3 py-2.5 text-xs font-medium text-white/80 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30";

/* Barres de défilement fines, arrondies, orange au survol */
const SCROLLBAR_CSS = `
  /* Firefox */
  html,
  .studio-root * {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
  }

  /* Chrome, Edge, Safari */
  html::-webkit-scrollbar,
  .studio-root *::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  html::-webkit-scrollbar-track,
  .studio-root *::-webkit-scrollbar-track {
    background: transparent;
  }

  html::-webkit-scrollbar-thumb,
  .studio-root *::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.16);
    border: 3px solid transparent;
    background-clip: padding-box;
    border-radius: 999px;
  }

  html::-webkit-scrollbar-thumb:hover,
  .studio-root *::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 107, 0, 0.7);
    background-clip: padding-box;
  }

  html::-webkit-scrollbar-thumb:active,
  .studio-root *::-webkit-scrollbar-thumb:active {
    background: #ff6b00;
    background-clip: padding-box;
  }

  html::-webkit-scrollbar-corner,
  .studio-root *::-webkit-scrollbar-corner {
    background: transparent;
  }

  /* Le défilement du panneau et de la liste de polices ne fait plus défiler la page derrière */
  .studio-root aside,
  .studio-root [role="listbox"] {
    overscroll-behavior: contain;
  }
`;

/* ───────────────────────────────── Page ───────────────────────────────── */

export default function StudioEditorPage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = typeof params.slug === "string" ? params.slug : Array.isArray(params.slug) ? params.slug[0] ?? "publication" : "publication";
  const slug = FORMATS[rawSlug] ? rawSlug : "publication";
  const fmt = getFormat(slug);
  const W = 1080;
  const H = fmt.height;
  const isStory = H > W * 1.5;

  /* — Notifications (système QAHWA) — */
  const toast = useToast();
  const confirm = useConfirm();

  /* — État du document + historique (annuler / rétablir) — */
  const [doc, setDocState] = useState<Doc>(() => buildDoc(slug, "classic"));
  const docRef = useRef(doc);
  const pastRef = useRef<Doc[]>([]);
  const futureRef = useRef<Doc[]>([]);
  const lastEdit = useRef<{ key: string; t: number } | null>(null);

  const [selIds, setSelIds] = useState<string[]>([]);
const selIdsRef = useRef<string[]>([]);
selIdsRef.current = selIds;
const selectedId = selIds.length ? selIds[selIds.length - 1]! : null;
const setSelectedId = (id: string | null) => setSelIds(id ? [id] : []);
const [tool, setTool] = useState<Tool>("select");
const [penPts, setPenPts] = useState<Anchor[]>([]);
const penRef = useRef<Anchor[]>([]);
penRef.current = penPts;
const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [cropId, setCropId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("add");
  const [name, setName] = useState("Ma création");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [dragLayerId, setDragLayerId] = useState<string | null>(null);
  const [view, setView] = useState(1);
  const [showSafe, setShowSafe] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  const mainRef = useRef<HTMLElement>(null);
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

 const multi = selIds.length > 1;
const sel = selIds.length === 1 ? doc.layers.find((l) => l.id === selIds[0]) ?? null : null;
const selHasGroup = doc.layers.some((l) => selIds.includes(l.id) && l.groupId);
  const cropLayer = sel && sel.id === cropId && hasCrop(sel) ? sel : null;

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
    setCropId(null);
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

    const groupIds = (id: string): string[] => {
    const layers = docRef.current.layers;
    const l = layers.find((x) => x.id === id);
    return l?.groupId ? layers.filter((x) => x.groupId === l.groupId).map((x) => x.id) : [id];
  };

  const selectIds = (ids: string[], switchTab = true) => {
    setSelIds(ids);
    setCropId(null);
    if (switchTab && ids.length) setTab("edit");
  };

  const select = (id: string | null, switchTab = true) => {
    const ids = id ? groupIds(id) : [];
    setSelIds(id ? [...ids.filter((x) => x !== id), id] : []);
    setCropId((c) => (c && c === id ? c : null));
    if (!switchTab) return;
    if (id) setTab("edit");
    else setTab((t) => (t === "edit" ? "add" : t));
  };

  /** Maj / Ctrl + clic : ajoute ou retire un élément (ou tout son groupe) de la sélection. */
  const toggleSelect = (id: string, switchTab = true) => {
    const ids = groupIds(id);
    const cur = selIdsRef.current;
    const allIn = ids.every((i) => cur.includes(i));
    selectIds(allIn ? cur.filter((i) => !ids.includes(i)) : [...cur, ...ids.filter((i) => !cur.includes(i))], switchTab);
  };

  const selectAll = () => selectIds(docRef.current.layers.filter((l) => l.visible && !l.locked).map((l) => l.id));

  const removeLayers = (ids: string[]) => {
    apply((d) => ({ ...d, layers: d.layers.filter((l) => !ids.includes(l.id)) }));
    select(null);
  };

  const duplicateMany = (ids: string[]) => {
    const src = docRef.current.layers.filter((l) => ids.includes(l.id));
    if (!src.length) return;
    const gmap: Record<string, string> = {};
    const copies: Layer[] = src.map((l) => ({
      ...l, id: uid(), name: undefined,
      groupId: l.groupId ? (gmap[l.groupId] ??= uid()) : undefined,
      x: clamp(l.x + 3, 0, 100 - l.w), y: clamp(l.y + 3, 0, 96),
    }));
    apply((d) => ({ ...d, layers: [...d.layers, ...copies] }));
    selectIds(copies.map((c) => c.id));
  };

  const groupSelected = () => {
    const ids = selIdsRef.current;
    if (ids.length < 2) return;
    const gid = uid();
    apply((d) => {
      const members = d.layers.filter((l) => ids.includes(l.id)).map((l) => ({ ...l, groupId: gid }));
      const topIdx = d.layers.reduce((m, l, i) => (ids.includes(l.id) ? i : m), -1);
      const rest = d.layers.filter((l) => !ids.includes(l.id));
      const at = topIdx + 1 - members.length; // le groupe reste à la place de son élément le plus haut
      return { ...d, layers: [...rest.slice(0, at), ...members, ...rest.slice(at)] };
    });
  };

  const ungroupSelected = () => {
    const gids = new Set(docRef.current.layers.filter((l) => selIdsRef.current.includes(l.id) && l.groupId).map((l) => l.groupId!));
    if (!gids.size) return;
    apply((d) => ({ ...d, layers: d.layers.map((l) => (l.groupId && gids.has(l.groupId) ? { ...l, groupId: undefined } : l)) }));
  };

  /** Aligne les éléments sélectionnés les uns par rapport aux autres. */
  const alignSelection = (a: "l" | "c" | "r" | "t" | "m" | "b") => {
    const items = docRef.current.layers
      .filter((l) => selIdsRef.current.includes(l.id) && !l.locked)
      .map((l) => ({ id: l.id, w: l.w, h: l.kind === "text" ? measureH(l.id) : l.h, x: l.x, y: l.y }));
    if (items.length < 2) return;
    const minX = Math.min(...items.map((i) => i.x)), maxX = Math.max(...items.map((i) => i.x + i.w));
    const minY = Math.min(...items.map((i) => i.y)), maxY = Math.max(...items.map((i) => i.y + i.h));
    apply((d) => ({
      ...d,
      layers: d.layers.map((l) => {
        const it = items.find((i) => i.id === l.id);
        if (!it) return l;
        const p: Partial<Layer> =
          a === "l" ? { x: minX } : a === "c" ? { x: (minX + maxX) / 2 - it.w / 2 } : a === "r" ? { x: maxX - it.w }
          : a === "t" ? { y: minY } : a === "m" ? { y: (minY + maxY) / 2 - it.h / 2 } : { y: maxY - it.h };
        return { ...l, ...p };
      }),
    }), "alignsel");
  };

  /** Flèches du clavier : déplace toute la sélection. */
  const nudgeSelection = (mx: number, my: number) => {
    const ls = docRef.current.layers.filter((l) => selIdsRef.current.includes(l.id) && !l.locked);
    if (!ls.length) return;
    const hs = ls.map((l) => (l.kind === "text" ? measureH(l.id) : l.h));
    const dx = clamp(mx, -Math.min(...ls.map((l) => l.x)), 100 - Math.max(...ls.map((l) => l.x + l.w)));
    const dy = clamp(my, -Math.min(...ls.map((l) => l.y)), 100 - Math.max(...ls.map((l, i) => l.y + hs[i]!)));
    const ids = ls.map((l) => l.id);
    apply((d) => ({ ...d, layers: d.layers.map((l) => (ids.includes(l.id) ? { ...l, x: l.x + dx, y: l.y + dy } : l)) }), `nudge:${ids.join(",")}`);
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

  /* — Recadrage des photos — */

  /** Taille d'origine d'une image (mémorisée, sinon lue dans la page pour les anciennes créations). */
  const getNat = (l: Layer): { nw: number; nh: number } | null => {
    if (l.nw && l.nh) return { nw: l.nw, nh: l.nh };
    const img = canvasRef.current?.querySelector<HTMLImageElement>(`[data-layer="${l.id}"] img`);
    if (img && img.naturalWidth) return { nw: img.naturalWidth, nh: img.naturalHeight };
    return null;
  };

  const zoomOf = (l: Layer) => {
    if (!hasCrop(l)) return 100;
    const nat = getNat(l);
    if (!nat) return 100;
    const base = fitRect(l, nat.nw, nat.nh, "cover", W, H).iw;
    return clamp(Math.round((l.iw / base) * 100), 50, 400);
  };

  const startCropMode = (id: string) => {
    const l = docRef.current.layers.find((x) => x.id === id);
    if (!l || l.kind !== "image" || l.locked) return;
    if (!hasCrop(l)) {
      const nat = getNat(l);
      if (!nat) return;
      updateLayer(id, { nw: nat.nw, nh: nat.nh, ...fitRect(l, nat.nw, nat.nh, l.fit === "cover" ? "cover" : "contain", W, H) }, `cropinit:${id}`);
    }
    setSelectedId(id);
    setCropId(id);
    setTab("edit");
  };

  const setImageFit = (id: string, mode: "cover" | "contain") => {
    const l = docRef.current.layers.find((x) => x.id === id);
    if (!l || l.kind !== "image") return;
    const nat = getNat(l);
    if (!nat) return;
    updateLayer(id, { nw: nat.nw, nh: nat.nh, fit: mode, ...fitRect(l, nat.nw, nat.nh, mode, W, H) }, `fit:${id}`);
  };

  const setCropZoom = (id: string, percent: number) => {
    const l = docRef.current.layers.find((x) => x.id === id);
    if (!l || !hasCrop(l)) return;
    const nat = getNat(l);
    if (!nat) return;
    const pw = (l.w / 100) * W;
    const ph = (l.h / 100) * H;
    const iw = fitRect(l, nat.nw, nat.nh, "cover", W, H).iw * (clamp(percent, 50, 400) / 100);
    const ih = iw * (pw / ph) * (nat.nh / nat.nw);
    // Le point de l'image au centre du cadre reste au centre.
    const u = (50 - l.ix) / l.iw;
    const v = (50 - l.iy) / l.ih;
    const p = clampPan(50 - u * iw, 50 - v * ih, iw, ih);
    updateLayer(id, { iw, ih, ...p }, `czoom:${id}`);
  };

  const zoomCropBy = (id: string, factor: number) => {
    const l = docRef.current.layers.find((x) => x.id === id);
    if (!l) return;
    setCropZoom(id, zoomOf(l) * factor);
  };

  /** Taille proportionnelle d'une photo (le cadre et l'image grandissent ensemble). */
  const resizeProportional = (id: string, nw: number) => {
    const l = docRef.current.layers.find((x) => x.id === id);
    if (!l) return;
    const h = clamp((l.h * nw) / l.w, 0.5, 100);
    updateLayer(id, { w: nw, h, x: clamp(l.x, 0, 100 - nw), y: clamp(l.y, 0, 100 - h) }, `size:${id}`);
  };

  const zoomView = (factor: number) => setView((v) => clamp(Math.round(v * factor * 100) / 100, 0.5, 3));

  /* — Déplacement et redimensionnement à la souris / au doigt — */
  const startDrag = (e: ReactPointerEvent, layer: Layer, mode: "move" | "resize" | "text-e" | "text-w") => {
    e.preventDefault();
    e.stopPropagation();
    const multiSel = mode === "move" && selIdsRef.current.length > 1 && selIdsRef.current.includes(layer.id);
    if (!multiSel) select(layer.id);
    if (layer.locked) return;
    const members = multiSel ? selIdsRef.current : groupIds(layer.id);
    if (mode === "move" && members.length > 1) { startMultiDrag(e, members); return; }
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
      } else if (mode === "text-e") {
        updateLayer(layer.id, { w: clamp(start.w + dx, 8, 100 - start.x) }, `edge:${layer.id}`);
      } else if (mode === "text-w") {
        const nx = clamp(start.x + dx, 0, start.x + start.w - 8);
        updateLayer(layer.id, { x: nx, w: start.w - (nx - start.x) }, `edge:${layer.id}`);
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

  /** Mode recadrage : déplacer la photo dans son cadre, ou rogner le cadre avec les poignées. */
  const startCrop = (e: ReactPointerEvent, layer: Layer, handle: "pan" | CropHandle) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasCrop(layer)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const start = { ...layer };
    const X = start.x + (start.ix * start.w) / 100;
    const Y = start.y + (start.iy * start.h) / 100;
    const Wc = (start.iw * start.w) / 100;
    const Hc = (start.ih * start.h) / 100;
    const minX = Math.max(0, Math.min(X, start.x)), maxX = Math.min(100, Math.max(X + Wc, start.x + start.w));
    const minY = Math.max(0, Math.min(Y, start.y)), maxY = Math.min(100, Math.max(Y + Hc, start.y + start.h));

    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / rect.width) * 100;
      const dy = ((ev.clientY - sy) / rect.height) * 100;
      if (handle === "pan") {
        const p = clampPan(start.ix + (dx / start.w) * 100, start.iy + (dy / start.h) * 100, start.iw, start.ih);
        updateLayer(layer.id, p, `cpan:${layer.id}`);
        return;
      }
      let x = start.x, y = start.y, w = start.w, h = start.h;
      if (handle.includes("e")) w = clamp(start.w + dx, 3, maxX - start.x);
      if (handle.includes("w")) { const nx = clamp(start.x + dx, minX, start.x + start.w - 3); w = start.w - (nx - start.x); x = nx; }
      if (handle.includes("s")) h = clamp(start.h + dy, 1, maxY - start.y);
      if (handle.includes("n")) { const ny = clamp(start.y + dy, minY, start.y + start.h - 1); h = start.h - (ny - start.y); y = ny; }
      updateLayer(layer.id, reframe(start, { x, y, w, h }), `cframe:${layer.id}`);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  /** Rotation à la souris : la poignée ronde au-dessus de l'élément. Maj = pas de 15°. */
  const startRotate = (e: ReactPointerEvent, layer: Layer) => {
    e.preventDefault();
    e.stopPropagation();
    select(layer.id);
    if (layer.locked) return;
    const el = canvasRef.current?.querySelector<HTMLElement>(`[data-layer="${layer.id}"]`);
    if (!el) return;
    // Le centre de l'élément ne bouge pas quand il tourne : on le mesure une seule fois.
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    const move = (ev: PointerEvent) => {
      let deg = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
      if (ev.shiftKey) {
        deg = Math.round(deg / 15) * 15;
      } else {
        // Aimantation douce sur 0°, 45°, 90°, 135°, 180°…
        const n = Math.round(deg / 45) * 45;
        if (Math.abs(deg - n) <= 3) deg = n;
      }
      updateLayer(layer.id, { rotation: Math.round(normAngle(deg)) }, `rotate:${layer.id}`);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
    /* — Outil Plume — */
  const cancelPen = () => { setPenPts([]); setTool("select"); };

  const togglePen = () => {
    if (tool === "pen") return cancelPen();
    setTool("pen");
    setPenPts([]);
    setSelIds([]);
    setCropId(null);
  };

  const undoPenPoint = () => setPenPts((pts) => pts.slice(0, -1));

  const finishPen = (closed = false) => {
    const pts = penRef.current.filter((p, i, arr) => i === 0 || Math.hypot(p.x - arr[i - 1]!.x, p.y - arr[i - 1]!.y) > 0.3);
    setPenPts([]);
    setTool("select");
    if (pts.length < 2) return;
    addLayer(pathLayer(pts, closed && pts.length >= 3));
  };

  const penDown = (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const toPt = (ev: { clientX: number; clientY: number }) => ({
      x: clamp(((ev.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((ev.clientY - rect.top) / rect.height) * 100, 0, 100),
    });
    const p = toPt(e);
    const cur = penRef.current;
    const first = cur[0];
    // Clic sur le premier point : on ferme le tracé.
    if (first && cur.length >= 3 && Math.hypot(((p.x - first.x) / 100) * rect.width, ((p.y - first.y) / 100) * rect.height) < 14) {
      finishPen(true);
      return;
    }
    const idx = cur.length;
    setPenPts([...cur, { x: p.x, y: p.y, dx: 0, dy: 0 }]);
    // Glisser après le clic : tire une poignée de Bézier (courbe).
    const move = (ev: PointerEvent) => {
      const q = toPt(ev);
      if (Math.hypot(((q.x - p.x) / 100) * rect.width, ((q.y - p.y) / 100) * rect.height) < 4) return;
      setPenPts((pts) => pts.map((a, i) => (i === idx ? { ...a, dx: q.x - p.x, dy: q.y - p.y } : a)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
    /** Glisser sur le fond de l'affiche : rectangle de sélection. Maj/Ctrl = ajouter à la sélection. */
  const startMarquee = (e: ReactPointerEvent) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pt = (ev: { clientX: number; clientY: number }) => ({
      x: clamp(((ev.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((ev.clientY - rect.top) / rect.height) * 100, 0, 100),
    });
    const s0 = pt(e);
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    const base = additive ? selIdsRef.current : [];
    let moved = false;

    const move = (ev: PointerEvent) => {
      const p = pt(ev);
      if (!moved && Math.hypot(p.x - s0.x, p.y - s0.y) < 0.8) return;
      moved = true;
      const r = { x0: Math.min(s0.x, p.x), y0: Math.min(s0.y, p.y), x1: Math.max(s0.x, p.x), y1: Math.max(s0.y, p.y) };
      setMarquee(r);
      const hit = docRef.current.layers
        .filter((l) => l.visible && !l.locked)
        .filter((l) => {
          const h = l.kind === "text" ? measureH(l.id) : l.h;
          return l.x < r.x1 && l.x + l.w > r.x0 && l.y < r.y1 && l.y + h > r.y0;
        })
        .flatMap((l) => groupIds(l.id));
      setSelIds(Array.from(new Set([...base, ...hit])));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setMarquee(null);
      if (!moved) { if (!additive) select(null); return; }
      if (selIdsRef.current.length) setTab("edit");
      else select(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /** Déplace plusieurs éléments (sélection multiple ou groupe) d'un seul bloc. */
  const startMultiDrag = (e: ReactPointerEvent, ids: string[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const items = docRef.current.layers
      .filter((l) => ids.includes(l.id) && !l.locked)
      .map((l) => ({ id: l.id, x: l.x, y: l.y, w: l.w, h: l.kind === "text" ? measureH(l.id) : l.h }));
    if (!items.length) return;
    const minX = Math.min(...items.map((i) => i.x)), maxX = Math.max(...items.map((i) => i.x + i.w));
    const minY = Math.min(...items.map((i) => i.y)), maxY = Math.max(...items.map((i) => i.y + i.h));
    const pos = new Map(items.map((i) => [i.id, i]));

    const move = (ev: PointerEvent) => {
      let dx = clamp(((ev.clientX - sx) / rect.width) * 100, -minX, 100 - maxX);
      let dy = clamp(((ev.clientY - sy) / rect.height) * 100, -minY, 100 - maxY);
      let gx: number | null = null, gy: number | null = null;
      if (!ev.altKey) { // aimantation du centre du groupe sur le centre de l'affiche
        const cx = (minX + maxX) / 2 + dx, cy = (minY + maxY) / 2 + dy;
        if (Math.abs(cx - 50) <= 1.2) { dx += 50 - cx; gx = 50; }
        if (Math.abs(cy - 50) <= 1.2) { dy += 50 - cy; gy = 50; }
      }
      setGuides({ x: gx, y: gy });
      apply((d) => ({
        ...d,
        layers: d.layers.map((l) => { const i = pos.get(l.id); return i ? { ...l, x: i.x + dx, y: i.y + dy } : l; }),
      }), `dragm:${ids.join(",")}`);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setGuides({ x: null, y: null });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const layerDown = (e: ReactPointerEvent, l: Layer, cropping: boolean) => {
    if (cropping) return startCrop(e, l, "pan");
    if (e.shiftKey || e.ctrlKey || e.metaKey) { e.preventDefault(); e.stopPropagation(); toggleSelect(l.id); return; }
    startDrag(e, l, "move");
  };
  /* — Ajout d'éléments — */

  const addText = (preset: TextPreset) => {
    const p = TEXT_PRESETS[preset];
    const y = clamp((p.y ?? 40) + (docRef.current.layers.length % 4) * 3, 0, 90);
    addLayer(textLayer({ ...p, x: 8, y }));
    setTimeout(() => textAreaRef.current?.select(), 80);
  };

  const handleFiles = async (files: FileList | null, as: "photo" | "logo" | "bg") => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setBusy(true);
    for (const file of list) {
      try {
        const img = await storeImage(file, as === "logo" ? 800 : 1800);
        if (as === "bg") updateBg({ image: img.src, overlay: docRef.current.bg.image ? docRef.current.bg.overlay : 75, zoom: 100, px: 50, py: 50 }, "bg:image");
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
    act.current = {
    undo, redo, save, select, selIds, cropId, setCropId, zoomCropBy, zoomView, tool,
    finishPen, cancelPen, undoPenPoint, togglePen, selectAll, groupSelected, ungroupSelected,
    duplicateMany, removeLayers, nudgeSelection,
  };
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
      if (t.closest?.('[role="alertdialog"]')) return;
      if (a.tool === "pen") {
        if (key === "enter") { e.preventDefault(); a.finishPen(false); return; }
        if (key === "escape") { e.preventDefault(); a.cancelPen(); return; }
        if (key === "backspace" || key === "delete") { e.preventDefault(); a.undoPenPoint(); return; }
      }
      if (a.cropId && (key === "escape" || key === "enter")) { e.preventDefault(); a.setCropId(null); return; }
      if (mod && key === "z") { e.preventDefault(); if (e.shiftKey) a.redo(); else a.undo(); return; }
      if (mod && key === "y") { e.preventDefault(); a.redo(); return; }
      if (t.tagName === "INPUT") return;
      if (mod && key === "a") { e.preventDefault(); a.selectAll(); return; }
      if (mod && key === "g") { e.preventDefault(); if (e.shiftKey) a.ungroupSelected(); else a.groupSelected(); return; }
      if (!mod && key === "p") { e.preventDefault(); a.togglePen(); return; }
      const ids: string[] = a.selIds;
      if (!ids.length) return;
      if (mod && key === "d") { e.preventDefault(); a.duplicateMany(ids); return; }
      if (key === "delete" || key === "backspace") { e.preventDefault(); a.removeLayers(ids); return; }
      if (key === "escape") { a.select(null); return; }
      const step = e.shiftKey ? 2 : 0.5;
      const d = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }[key];
      if (!d) return;
      e.preventDefault();
      a.nudgeSelection(d[0]!, d[1]!);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);{tab === "edit" && multi && (
  <>
    <Section title={`${selIds.length} éléments sélectionnés`}>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={btn} onClick={groupSelected}>Grouper</button>
        <button type="button" className={btn} disabled={!selHasGroup} onClick={ungroupSelected}>Dégrouper</button>
        <button type="button" className={btn} onClick={() => duplicateMany(selIds)}>Dupliquer</button>
        <button type="button" className={btn} onClick={() => selIds.forEach((id) => updateLayer(id, { locked: true }))}>🔒 Verrouiller</button>
      </div>
      <button type="button" onClick={() => removeLayers(selIds)}
        className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20">Supprimer la sélection</button>
    </Section>
    <Section title="Aligner entre eux">
      <div className="grid grid-cols-3 gap-2">
        {([["⇤ Gauche", "l"], ["↔ Centre", "c"], ["⇥ Droite", "r"], ["⤒ Haut", "t"], ["↕ Milieu", "m"], ["⤓ Bas", "b"]] as const).map(([label, a]) => (
          <button key={a} type="button" className={btn + " !px-1"} onClick={() => alignSelection(a)}>{label}</button>
        ))}
      </div>
      <p className="text-[11px] leading-4 text-white/45">Glisse un des éléments pour déplacer toute la sélection. Maj + clic ajoute ou retire un élément.</p>
    </Section>
  </>
)}

  // Molette : zoom de la photo en mode recadrage, zoom du plan avec Ctrl (ou Cmd).
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const a = act.current;
      const overCanvas = !!canvasRef.current?.contains(e.target as Node);
      if (a.cropId && overCanvas) {
        e.preventDefault();
        a.zoomCropBy(a.cropId, e.deltaY < 0 ? 1.08 : 1 / 1.08);
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        a.zoomView(e.deltaY < 0 ? 1.1 : 1 / 1.1);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* — Libellés — */
  const layerLabel = (l: Layer) =>
    l.kind === "text" ? (l.text?.split("\n")[0]?.slice(0, 28) || "Texte vide")
       : l.kind === "image" ? l.name ?? "Image"
    : l.kind === "path" ? l.name ?? "Tracé"
    : l.name ?? (l.shape === "rectangle" ? "Rectangle" : l.shape === "circle" ? "Cercle" : "Ligne");
  const layerIcon = (l: Layer) => (l.kind === "text" ? "T" : l.kind === "image" ? "▧" : l.kind === "path" ? "✒" : l.shape === "circle" ? "●" : l.shape === "line" ? "━" : "▰");

  const [bgTop, bgBottom] = overlayAlphas(doc.bg.overlay);
  const statusText = dirty ? "Modifications non enregistrées" : savedId ? "Enregistré" : "Nouvelle création";
  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  const chipOn = "!border-[#FF6B00] !text-white";

  /* ───────────────────────────── Rendu ───────────────────────────── */
  return (
    <div className="studio-root min-h-screen bg-[#0A0A0A] text-white">
      <style>{SCROLLBAR_CSS}</style>

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
        <main ref={mainRef} className="flex min-w-0 flex-1 flex-col items-center gap-3 overflow-auto p-3 sm:p-5"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          onPointerDown={() => select(null)}>
          {/* Barres d'outils : élément sélectionné + zoom du plan */}
          <div className="flex w-full max-w-[760px] flex-wrap items-stretch gap-2" onPointerDown={(e) => e.stopPropagation()}>
            <div className="flex min-h-[44px] min-w-0 flex-1 flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#121212] px-3 py-1.5 text-[11px]">
              {tool === "pen" ? (
  <>
    <span className="mr-auto min-w-0 text-white/75">
      <span className="font-semibold text-[#FF6B00]">✒ Plume</span> · clic = point · glisser = courbe · clic sur le 1er point = fermer · Entrée = terminer
    </span>
    <button type="button" className={btn + " !py-1.5 !bg-[#FF6B00] !text-white"} disabled={penPts.length < 2} onClick={() => finishPen(false)}>Terminer</button>
    <button type="button" className={btn + " !py-1.5"} disabled={!penPts.length} onClick={undoPenPoint}>↶ Point</button>
    <button type="button" className={btn + " !py-1.5"} onClick={cancelPen}>Annuler</button>
  </>
) : multi ? (
  <>
    <span className="mr-auto font-semibold text-white/80">{selIds.length} éléments sélectionnés</span>
    <button type="button" className={btn + " !py-1.5"} onClick={groupSelected} title="Grouper (Ctrl+G)">Grouper</button>
    <button type="button" className={btn + " !py-1.5"} disabled={!selHasGroup} onClick={ungroupSelected} title="Dégrouper (Ctrl+Maj+G)">Dégrouper</button>
    <button type="button" className={btn + " !py-1.5"} onClick={() => duplicateMany(selIds)}>Dupliquer</button>
    <button type="button" className={btn + " !py-1.5 !text-red-300"} onClick={() => removeLayers(selIds)}>Supprimer</button>
  </>
) : cropLayer ? (
                <>
                  <span className="mr-auto min-w-0 text-white/75">
                    <span className="font-semibold text-[#FF6B00]">✂ Recadrage</span> · glisse pour déplacer · molette pour zoomer · poignées pour rogner
                  </span>
                  <button type="button" className={btn + " !py-1.5 !bg-[#FF6B00] !text-white"} onClick={() => setCropId(null)}>Terminer</button>
                </>
              ) : sel ? (
                <>
                  <span className="mr-auto max-w-[40%] truncate font-semibold text-white/80">{layerIcon(sel)} {layerLabel(sel)}</span>
                  {sel.kind === "image" && !sel.locked && (
                    <button type="button" className={btn + " !py-1.5"} onClick={() => startCropMode(sel.id)} title="Recadrer la photo">✂ Recadrer</button>
                  )}
                  <button type="button" className={btn + " !py-1.5"} onClick={() => duplicateLayer(sel.id)} title="Dupliquer (Ctrl+D)">Dupliquer</button>
                  <button type="button" className={btn + " !py-1.5"} onClick={() => moveLayer(sel.id, "down")} title="Envoyer derrière">↓ Derrière</button>
                  <button type="button" className={btn + " !py-1.5"} onClick={() => moveLayer(sel.id, "up")} title="Mettre devant">↑ Devant</button>
                  <button type="button" className={btn + " !py-1.5 !text-red-300"} onClick={() => removeLayer(sel.id)} title="Supprimer (Suppr)">Supprimer</button>
                </>
              ) : (
                <span className="text-white/50">Clique sur un élément pour le modifier, glisse-le pour le déplacer, tire le coin orange pour l'agrandir. Double-clique une photo pour la recadrer.</span>
              )}
            </div>

            <div className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-[#121212] px-2 text-[11px]">
              <button type="button" className={btn + " !px-2.5 !py-1.5"} onClick={() => zoomView(1 / 1.25)} aria-label="Dézoomer" title="Dézoomer (Ctrl + molette)">−</button>
              <button type="button" className={btn + " !px-2 !py-1.5 min-w-[3.4rem] tabular-nums"} onClick={() => setView(1)} title="Ajuster à l'écran">{Math.round(view * 100)}%</button>
              <button type="button" className={btn + " !px-2.5 !py-1.5"} onClick={() => zoomView(1.25)} aria-label="Zoomer" title="Zoomer (Ctrl + molette)">+</button>
              <span className="mx-0.5 h-5 w-px bg-white/10" />
              <button type="button" aria-pressed={showSafe} className={`${btn} !px-2.5 !py-1.5 ${showSafe ? chipOn : ""}`} onClick={() => setShowSafe((v) => !v)} title="Marges de sécurité">Marges</button>
              <button type="button" aria-pressed={showGrid} className={`${btn} !px-2.5 !py-1.5 ${showGrid ? chipOn : ""}`} onClick={() => setShowGrid((v) => !v)} title="Grille des tiers">Grille</button>
              <span className="mx-0.5 h-5 w-px bg-white/10" />
<button type="button" aria-pressed={tool === "pen"} className={`${btn} !px-2.5 !py-1.5 ${tool === "pen" ? chipOn : ""}`} onClick={togglePen} title="Outil Plume (P)">✒ Plume</button>
            </div>
          </div>

          <div className="flex w-full flex-1">
            <div
              ref={canvasRef}
              onPointerDown={(e) => (tool === "pen" ? penDown(e) : startMarquee(e))}
              className="relative m-auto shrink-0 overflow-hidden bg-[#111] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
              style={{
                width: `calc(min(100%, calc((100vh - 16rem) * ${W / H})) * ${view})`,
                aspectRatio: `${W} / ${H}`,
                containerType: "inline-size",
                cursor: tool === "pen" ? "crosshair" : undefined,
              }}
            >
              {/* Fond */}
              <div className="absolute inset-0" style={{ zIndex: 0, background: doc.bg.image ? "#111" : bgCss(doc.bg) }}>
                {doc.bg.image && (
                  <img src={doc.bg.image} alt="" draggable={false} className="h-full w-full object-cover"
                    style={{
                      objectPosition: `${doc.bg.px ?? 50}% ${doc.bg.py ?? 50}%`,
                      transform: `scale(${(doc.bg.zoom ?? 100) / 100})`,
                      transformOrigin: `${doc.bg.px ?? 50}% ${doc.bg.py ?? 50}%`,
                    }} />
                )}
              </div>
              {doc.bg.image && (
                <div className="absolute inset-0" style={{ zIndex: 0, background: `linear-gradient(to bottom, rgba(0,0,0,${bgTop}), rgba(0,0,0,${bgBottom}))` }} />
              )}

              {/* Calques */}
              {doc.layers.map((l, i) => {
                if (!l.visible) return null;
                const selected = selIds.includes(l.id);
const single = selIds.length === 1;
                const cropping = cropId === l.id && hasCrop(l);
                return (
                  <div
                    key={l.id}
                    data-layer={l.id}
                    onPointerDown={(e) => layerDown(e, l, cropping)}
                    onDoubleClick={() => {
                      if (l.kind === "text") { select(l.id); setTimeout(() => textAreaRef.current?.focus(), 60); }
                      else if (l.kind === "image") startCropMode(l.id);
                    }}
                    style={{
                      position: "absolute", left: `${l.x}%`, top: `${l.y}%`, width: `${l.w}%`,
                      pointerEvents: tool === "pen" ? "none" : "auto",
                      height: l.kind === "text" ? "auto" : `${l.h}%`, zIndex: cropping ? 9000 : i + 1,
                      cursor: cropping ? "grab" : l.locked ? "default" : "move", touchAction: "none", userSelect: "none",
                      
                      transform: l.rotation ? `rotate(${l.rotation}deg)` : undefined,
                      transformOrigin: "center center",
                    }}
                  >
                    {/* En recadrage : l'image entière apparaît en transparence autour du cadre */}
                    {hasCrop(l) && cropping && (
                      <img src={l.src} alt="" draggable={false}
                        style={{ position: "absolute", left: `${l.ix}%`, top: `${l.iy}%`, width: `${l.iw}%`, height: `${l.ih}%`, maxWidth: "none", opacity: 0.35, pointerEvents: "none" }} />
                    )}
                    <div style={{ opacity: l.opacity / 100, width: "100%", height: l.kind === "text" ? "auto" : "100%" }}>
                      {l.kind === "text" && (
                        <div dir="auto" style={{
                          fontFamily: l.fontFamily, fontSize: `${((l.fontSize ?? 40) / 1080) * 100}cqw`, fontWeight: l.fontWeight,
                          textAlign: l.align, color: l.color, lineHeight: l.lineHeight ?? 1.2, whiteSpace: "pre-wrap",
                          textTransform: l.uppercase ? "uppercase" : "none",
                          textShadow: l.shadow ? "0 0.25cqw 1.2cqw rgba(0,0,0,0.55)" : "none",
                        }}>{l.text || "\u00A0"}</div>
                      )}
                      {l.kind === "image" && (
                        hasCrop(l) ? (
                          <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
                            <img src={l.src} alt={l.name ?? "Image"} draggable={false}
                              style={{ position: "absolute", left: `${l.ix}%`, top: `${l.iy}%`, width: `${l.iw}%`, height: `${l.ih}%`, maxWidth: "none", display: "block", pointerEvents: "none" }} />
                          </div>
                        ) : (
                          <img src={l.src} alt={l.name ?? "Image"} draggable={false}
                            style={{ width: "100%", height: "100%", objectFit: l.fit ?? "contain", display: "block", pointerEvents: "none" }} />
                        )
                      )}
                      {l.kind === "shape" && (
                        <div style={{ width: "100%", height: "100%", background: l.color, borderRadius: l.shape === "circle" ? "50%" : 0 }} />
                      )}
                      {l.kind === "path" && (
  <svg width="100%" height="100%" viewBox={`0 0 ${(l.w / 100) * W} ${(l.h / 100) * H}`} preserveAspectRatio="none"
    style={{ overflow: "visible", display: "block", pointerEvents: "none" }}>
    <path d={pathD(l.pts ?? [], !!l.closed, (l.w / 100) * W, (l.h / 100) * H)}
      fill={l.fill && l.fill !== "none" ? l.fill : "none"} stroke={l.color} strokeWidth={l.sw ?? 8}
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)}
                    </div>
                    {selected && (
                      <>
                        <div className="pointer-events-none absolute inset-0" style={{ outline: `2px ${cropping ? "solid" : l.locked ? "solid" : "dashed"} #FF6B00`, outlineOffset: 1 }} />
                        {cropping ? (
                          CROP_HANDLES.map((c) => (
                            <span key={c.h}
                              onPointerDown={(e) => startCrop(e, l, c.h)}
                              className="absolute h-4 w-4 rounded-sm border-2 border-white bg-[#FF6B00]"
                              style={{ ...c.style, cursor: c.cursor, touchAction: "none" }}
                              aria-label="Rogner" />
                          ))
                        ) : (
                          !l.locked && single && (
                            <>
                              <span className="pointer-events-none absolute -top-6 left-1/2 h-5 w-px -translate-x-1/2 bg-[#FF6B00]" />
                              <span
                                onPointerDown={(e) => startRotate(e, l)}
                                className="absolute -top-10 left-1/2 h-5 w-5 -translate-x-1/2 cursor-grab rounded-full border-2 border-white bg-[#FF6B00]"
                                style={{ touchAction: "none" }}
                                aria-label="Faire pivoter"
                                title="Faire pivoter (Maj = pas de 15°)"
                              />
                              <span
                                onPointerDown={(e) => startDrag(e, l, "resize")}
                                className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-white bg-[#FF6B00]"
                                style={{ touchAction: "none" }}
                                aria-label="Redimensionner"
                              />
                              {l.kind === "text" && (
                                <>
                                  <span
                                    onPointerDown={(e) => startDrag(e, l, "text-w")}
                                    className="absolute -left-2 top-1/2 h-7 w-2.5 -translate-y-1/2 cursor-ew-resize rounded-full border border-white bg-[#FF6B00]"
                                    style={{ touchAction: "none" }}
                                    aria-label="Ajuster la largeur du texte (gauche)"
                                  />
                                  <span
                                    onPointerDown={(e) => startDrag(e, l, "text-e")}
                                    className="absolute -right-2 top-1/2 h-7 w-2.5 -translate-y-1/2 cursor-ew-resize rounded-full border border-white bg-[#FF6B00]"
                                    style={{ touchAction: "none" }}
                                    aria-label="Ajuster la largeur du texte (droite)"
                                  />
                                </>
                              )}
                            </>
                          )
                        )}
                      </>
                    )}
                  </div>
                );
              })}
{tool === "pen" && (
  <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} style={{ zIndex: 9990, overflow: "visible" }}>
    <path d={pathD(penPts, false, W, H)} fill="none" stroke="#FF6B00" strokeWidth={5} strokeLinecap="round" />
    {penPts.map((a, i) => {
      const ax = (a.x / 100) * W, ay = (a.y / 100) * H;
      const ox = ((a.x + a.dx) / 100) * W, oy = ((a.y + a.dy) / 100) * H;
      const ix = ((a.x - a.dx) / 100) * W, iy = ((a.y - a.dy) / 100) * H;
      const curved = a.dx !== 0 || a.dy !== 0;
      return (
        <g key={i}>
          {curved && (
            <>
              <line x1={ix} y1={iy} x2={ox} y2={oy} stroke="#fff" strokeWidth={2} />
              <circle cx={ox} cy={oy} r={7} fill="#fff" />
              <circle cx={ix} cy={iy} r={7} fill="#fff" />
            </>
          )}
          <circle cx={ax} cy={ay} r={i === 0 ? 13 : 9} fill={i === 0 ? "#FF6B00" : "#fff"} stroke={i === 0 ? "#fff" : "#FF6B00"} strokeWidth={3} />
        </g>
      );
    })}
  </svg>
)}
{marquee && (
  <div className="pointer-events-none absolute border border-dashed border-[#FF6B00] bg-[#FF6B00]/10"
    style={{ left: `${marquee.x0}%`, top: `${marquee.y0}%`, width: `${marquee.x1 - marquee.x0}%`, height: `${marquee.y1 - marquee.y0}%`, zIndex: 9995 }} />
)}
              {/* Guides d'alignement */}
              {guides.x !== null && <div className="pointer-events-none absolute inset-y-0 w-px bg-[#FF6B00]" style={{ left: `${guides.x}%`, zIndex: 9999 }} />}
              {guides.y !== null && <div className="pointer-events-none absolute inset-x-0 h-px bg-[#FF6B00]" style={{ top: `${guides.y}%`, zIndex: 9999 }} />}

              {/* Repères (jamais exportés) */}
              {showGrid && (
                <div className="pointer-events-none absolute inset-0" style={{ zIndex: 9996 }}>
                  <div className="absolute inset-y-0 w-px bg-white/25" style={{ left: "33.333%" }} />
                  <div className="absolute inset-y-0 w-px bg-white/25" style={{ left: "66.666%" }} />
                  <div className="absolute inset-x-0 h-px bg-white/25" style={{ top: "33.333%" }} />
                  <div className="absolute inset-x-0 h-px bg-white/25" style={{ top: "66.666%" }} />
                </div>
              )}
              {showSafe && (
                <div className="pointer-events-none absolute inset-0" style={{ zIndex: 9997 }}>
                  {isStory && (
                    <>
                      <div className="absolute inset-x-0 top-0 flex items-end justify-center bg-black/30 pb-1 text-[10px] text-white/60" style={{ height: "14%" }}>Zone couverte par l'interface</div>
                      <div className="absolute inset-x-0 bottom-0 flex items-start justify-center bg-black/30 pt-1 text-[10px] text-white/60" style={{ height: "20%" }}>Zone couverte par l'interface</div>
                    </>
                  )}
                  <div className="absolute border border-dashed border-white/60"
                    style={{ left: "5%", right: "5%", top: isStory ? "14%" : "5%", bottom: isStory ? "20%" : "5%" }} />
                </div>
              )}

              {/* Invitation à ajouter une photo (non exportée) */}
              {!doc.bg.image && !selIds.length && tool === "select" && (
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
                <Section title="Texte arabe & coranique">
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => addText("ar-title")} className={btn + " flex flex-col items-center gap-1 !py-3"}>
                      <span className="text-xl leading-none" style={{ fontFamily: A.reem }} dir="rtl">عنوان</span>
                      <span className="text-[10px] text-white/50">Titre</span>
                    </button>
                    <button type="button" onClick={() => addText("ar-body")} className={btn + " flex flex-col items-center gap-1 !py-3"}>
                      <span className="text-xl leading-none" style={{ fontFamily: A.naskh }} dir="rtl">نص</span>
                      <span className="text-[10px] text-white/50">Texte</span>
                    </button>
                    <button type="button" onClick={() => addText("ar-quran")} className={btn + " flex flex-col items-center gap-1 !py-3"}>
                      <span className="text-xl leading-none" style={{ fontFamily: A.quran }} dir="rtl">آية</span>
                      <span className="text-[10px] text-white/50">Verset</span>
                    </button>
                  </div>
                  <p className="text-[11px] leading-4 text-white/45">Le texte arabe s'écrit de droite à gauche automatiquement. Pour un verset, colle le texte depuis un Mushaf ou un site de référence (avec ses signes de vocalisation), puis choisis une police du groupe « Arabe & coranique ».</p>
                </Section>
                <Section title="Images">
                  <button type="button" onClick={() => photoInputRef.current?.click()} disabled={busy}
                    className="w-full rounded-lg bg-white px-3 py-3 text-xs font-bold text-black transition hover:bg-white/85 disabled:opacity-60">+ Ajouter une ou plusieurs photos</button>
                  <button type="button" onClick={() => logoInputRef.current?.click()} disabled={busy} className={btn + " w-full"}>+ Ajouter le logo Qahwa</button>
                  <p className="text-[11px] leading-4 text-white/45">Les images sont réduites automatiquement pour garder l'éditeur rapide. Double-clique une photo pour la recadrer. Pour une photo plein cadre, utilise l'onglet Fond.</p>
                </Section>
                <Section title="Dessin">
  <button type="button" onClick={togglePen} className={btn + ` w-full ${tool === "pen" ? chipOn : ""}`}>✒ Outil Plume (P)</button>
  <p className="text-[11px] leading-4 text-white/45">Clique pour poser des points, glisse pour faire une courbe, clique sur le premier point pour fermer la forme. Le tracé devient un calque : couleur, épaisseur, remplissage, rotation et taille se règlent dans l'onglet Édition.</p>
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
                  <p className="text-[11px] leading-5 text-white/55">Ctrl+Z annuler · Ctrl+Maj+Z rétablir · Ctrl+D dupliquer · Suppr supprimer · flèches pour déplacer (Maj = plus loin) · Alt en glissant pour désactiver l'aimantation · Ctrl+S enregistrer · Ctrl+molette zoomer le plan · Entrée ou Échap pour terminer un recadrage.</p>
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
                      <textarea ref={textAreaRef} rows={3} aria-label="Contenu du texte" value={sel.text ?? ""} dir="auto"
                        onChange={(e) => updateLayer(sel.id, { text: e.target.value }, `text:${sel.id}`)}
                        className="w-full resize-y rounded-lg border border-white/10 bg-[#121212] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF6B00]" />
                      {isRtlText(sel.text ?? "") && (sel.align ?? "left") === "left" && (
                        <button type="button" className={btn + " w-full"} onClick={() => updateLayer(sel.id, { align: "right" })}>
                          Texte arabe détecté : aligner à droite
                        </button>
                      )}
                      <p className="text-[11px] leading-4 text-white/45">Astuce : tire les poignées sur les côtés du texte pour changer la largeur de son cadre ; le texte se réorganise sur plus ou moins de lignes.</p>
                    </Section>
                    <Section title="Police">
                      <StudioSelect value={sel.fontFamily ?? F.inter} onChange={(v) => updateLayer(sel.id, { fontFamily: v })}
                        options={FONTS.map((f) => ({ ...f, font: f.value }))} />
                      <Range label="Taille" value={sel.fontSize ?? 40} min={12} max={300} unit=" px" onChange={(v) => updateLayer(sel.id, { fontSize: v })} />
                      <Range label="Interligne" value={sel.lineHeight ?? 1.2} min={0.8} max={3} step={0.05} onChange={(v) => updateLayer(sel.id, { lineHeight: v })} />
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
  <Section title={sel.kind === "path" ? "Couleur du trait" : "Couleur"}>
                    <ColorField value={sel.color} onChange={(v) => updateLayer(sel.id, { color: v })} />
                  </Section>
                  
                )}{sel.kind === "path" && (
  <Section title="Tracé">
    <Range label="Épaisseur du trait" value={sel.sw ?? 8} min={1} max={80} unit=" px" onChange={(v) => updateLayer(sel.id, { sw: v })} />
    <div className="grid grid-cols-2 gap-2">
      <Toggle label="Remplissage" on={!!sel.fill && sel.fill !== "none"} onChange={(v) => updateLayer(sel.id, { fill: v ? sel.color : "none" })} />
      <Toggle label="Tracé fermé" on={!!sel.closed} onChange={(v) => updateLayer(sel.id, { closed: v })} />
    </div>
    {sel.fill && sel.fill !== "none" && <ColorField value={sel.fill} onChange={(v) => updateLayer(sel.id, { fill: v })} />}
  </Section>
)}

                {sel.kind === "image" && (
                  <Section title="Recadrage de la photo">
                    <button type="button" disabled={sel.locked}
                      className={btn + ` w-full ${cropLayer ? "!border-[#FF6B00] !text-white" : ""}`}
                      onClick={() => (cropLayer ? setCropId(null) : startCropMode(sel.id))}>
                      {cropLayer ? "✓ Terminer le recadrage" : "✂ Recadrer la photo"}
                    </button>
                    {hasCrop(sel) && (
                      <Range label="Zoom de la photo" value={zoomOf(sel)} min={50} max={400} unit="%" onChange={(v) => setCropZoom(sel.id, v)} />
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className={btn} onClick={() => setImageFit(sel.id, "cover")}>Remplir le cadre</button>
                      <button type="button" className={btn} onClick={() => setImageFit(sel.id, "contain")}>Image entière</button>
                    </div>
                    <p className="text-[11px] leading-4 text-white/45">En recadrage : glisse la photo pour la déplacer, utilise la molette pour zoomer et tire les poignées du cadre pour rogner.</p>
                  </Section>
                )}

                <Section title="Taille et transparence">
                  <Range label="Transparence" value={100 - sel.opacity} min={0} max={95} unit="%" onChange={(v) => updateLayer(sel.id, { opacity: 100 - v })} />
                  {sel.kind === "image" && hasCrop(sel) ? (
                    <Range label="Taille de la photo" value={sel.w} min={3} max={Math.max(3.1, Math.min(100, (sel.w * 100) / sel.h))} step={0.5} unit="%" onChange={(v) => resizeProportional(sel.id, v)} />
                  ) : (
                    <>
                      <Range label={sel.kind === "text" ? "Largeur du cadre de texte" : "Largeur"} value={sel.w} min={3} max={100} unit="%" onChange={(v) => updateLayer(sel.id, { w: v, x: Math.min(sel.x, 100 - v) })} />
                      {sel.kind !== "text" && (
                        <Range label="Hauteur" value={sel.h} min={0.3} max={100} step={0.1} unit="%" onChange={(v) => updateLayer(sel.id, { h: v, y: Math.min(sel.y, 100 - v) })} />
                      )}
                    </>
                  )}
                  {sel.kind === "shape" && sel.shape === "rectangle" && (
                    <button type="button" className={btn + " w-full"} onClick={() => updateLayer(sel.id, { x: 0, y: 0, w: 100, h: 100 })}>Couvrir toute l'affiche</button>
                  )}
                </Section>
                <Section title="Rotation">
                  <Range label="Angle" value={sel.rotation ?? 0} min={-180} max={180} step={1} unit="°"
                    onChange={(v) => updateLayer(sel.id, { rotation: v })} />
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" className={btn} disabled={sel.locked}
                      onClick={() => updateLayer(sel.id, { rotation: normAngle((sel.rotation ?? 0) - 90) }, `rot:${sel.id}`)}>↺ −90°</button>
                    <button type="button" className={btn} disabled={sel.locked}
                      onClick={() => updateLayer(sel.id, { rotation: normAngle((sel.rotation ?? 0) + 90) }, `rot:${sel.id}`)}>↻ +90°</button>
                    <button type="button" className={btn} disabled={sel.locked || !sel.rotation}
                      onClick={() => updateLayer(sel.id, { rotation: 0 }, `rot:${sel.id}`)}>Remettre 0°</button>
                  </div>
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
                      <Range label="Zoom de la photo" value={doc.bg.zoom ?? 100} min={100} max={300} unit="%" onChange={(v) => updateBg({ zoom: v })} />
                      <Range label="Position horizontale" value={doc.bg.px ?? 50} min={0} max={100} unit="%" onChange={(v) => updateBg({ px: v })} />
                      <Range label="Position verticale" value={doc.bg.py ?? 50} min={0} max={100} unit="%" onChange={(v) => updateBg({ py: v })} />
                      <button type="button" className={btn + " w-full"} onClick={() => updateBg({ zoom: 100, px: 50, py: 50 }, "bg:reset")}>Réinitialiser le cadrage</button>
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
                        className={`flex items-center gap-1.5 rounded-lg border p-1.5 ${selIds.includes(l.id) ? "border-[#FF6B00] bg-[#FF6B00]/10" : "border-white/10 bg-[#121212]"} ${l.visible ? "" : "opacity-50"}`}>
                        <span className="w-4 cursor-grab text-center text-white/30" aria-hidden="true">⋮⋮</span>
                        <button type="button" onClick={(e) => (e.shiftKey || e.ctrlKey || e.metaKey ? toggleSelect(l.id, false) : select(l.id, false))} className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs">
  <span className="w-4 shrink-0 text-center text-white/50">{layerIcon(l)}</span>
  <span className="truncate" dir="auto">{layerLabel(l)}</span>
  {l.groupId && <span className="shrink-0 text-[10px] text-[#FF6B00]">⧉ groupe</span>}
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