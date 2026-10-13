"use client";



import { useParams, useRouter } from "next/navigation";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";



type TextElement =

  | "title"

  | "subtitle"

  | "description"

  | "price"

  | "date";



type CustomLayer = {
  id: string;
  type: "text" | "image" | "shape";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  text?: string;
  src?: string;
  shape?: "rectangle" | "circle" | "line";
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
};

type TextAlign = "left" | "center" | "right";



type TextStyle = {

  fontFamily: string;

  fontSize: number;

  fontWeight: number;

  textAlign: TextAlign;

  color: string;

};



type TextPosition = {

  x: number;

  y: number;

};



type LogoPosition =

  | "top-left"

  | "top-center"

  | "top-right"

  | "bottom-left"

  | "bottom-center"

  | "bottom-right";



const studioData = {

  publication: {

    title: "Publication",

    category: "CONTENU",

    format: "Instagram Portrait",

    width: 1080,

    height: 1350,

    ratio: "aspect-[4/5]",

    fields: ["title", "subtitle", "description", "price"] as TextElement[],

  },

  "nouveau-produit": {

    title: "Nouveau produit",

    category: "CONTENU",

    format: "Instagram Portrait",

    width: 1080,

    height: 1350,

    ratio: "aspect-[4/5]",

    fields: ["title", "subtitle", "description", "price"] as TextElement[],

  },

  promotion: {

    title: "Promotion",

    category: "CONTENU",

    format: "Instagram Portrait",

    width: 1080,

    height: 1350,

    ratio: "aspect-[4/5]",

    fields: ["title", "subtitle", "price"] as TextElement[],

  },

  evenement: {

    title: "Événement",

    category: "CONTENU",

    format: "Story",

    width: 1080,

    height: 1920,

    ratio: "aspect-[9/16]",

    fields: ["title", "subtitle", "description", "date"] as TextElement[],

  },

};



const defaultTextStyles: Record<TextElement, TextStyle> = {

  title: {

    fontFamily: "Arial",

    fontSize: 42,

    fontWeight: 700,

    textAlign: "left",

    color: "#FFFFFF",

  },

  subtitle: {

    fontFamily: "Arial",

    fontSize: 18,

    fontWeight: 500,

    textAlign: "left",

    color: "#FFFFFF",

  },

  description: {

    fontFamily: "Arial",

    fontSize: 15,

    fontWeight: 400,

    textAlign: "left",

    color: "#FFFFFF",

  },

  price: {

    fontFamily: "Arial",

    fontSize: 26,

    fontWeight: 700,

    textAlign: "left",

    color: "#FFFFFF",

  },

  date: {

    fontFamily: "Arial",

    fontSize: 16,

    fontWeight: 500,

    textAlign: "left",

    color: "#FFFFFF",

  },

};



const defaultTextPositions: Record<TextElement, TextPosition> = {

  title: {

    x: 8,

    y: 68,

  },

  subtitle: {

    x: 8,

    y: 62,

  },

  description: {

    x: 8,

    y: 76,

  },

  price: {

    x: 8,

    y: 84,

  },

  date: {

    x: 8,

    y: 90,

  },

};



function StudioDarkSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-[#101010] px-3 py-2.5 text-left text-xs text-white outline-none transition hover:border-[#FFFFFF] focus:border-[#FFFFFF]"
      >
        <span>{selected?.label ?? value}</span>
        <span className={`ml-3 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <>
          <button type="button" aria-label="Fermer le menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div role="listbox" className="relative z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[#333333] bg-[#101010] p-1 shadow-2xl shadow-black/60">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  key={option.value}
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className={`block w-full rounded-md px-3 py-2 text-left text-xs transition ${active ? "bg-[#FFFFFF] font-semibold text-white" : "bg-transparent text-white/80 hover:bg-white/10 hover:text-white"}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function StudioEditorPage() {

    const [activeTab, setActiveTab] = useState<

    "texte" | "images" | "formes" | "format"

  >("texte");

  const params = useParams();

  const router = useRouter();

  useEffect(() => {
    const id = "qahwa-studio-google-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat+Brush&family=Inter:wght@400;500;600;700;800&family=Lato:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800&family=Open+Sans:wght@400;500;600;700;800&family=Oswald:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Roboto:wght@400;500;700;900&display=swap";
    document.head.appendChild(link);
  }, []);



  const canvasRef = useRef<HTMLDivElement>(null);

  const heroInputRef = useRef<HTMLInputElement>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);

  const extraImagesInputRef = useRef<HTMLInputElement>(null);



  const slug =

    typeof params.slug === "string"

      ? params.slug

      : Array.isArray(params.slug)

        ? params.slug[0]

        : "publication";



  const data =

    studioData[slug as keyof typeof studioData] ??

    studioData.publication;



  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [savedCreationId, setSavedCreationId] = useState<string | null>(null);
  const [creationName, setCreationName] = useState("Ma création");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [canvasBackground, setCanvasBackground] = useState("linear-gradient(135deg, #1b1b1b 0%, #111111 58%, #090909 100%)");

  const [logoImage, setLogoImage] = useState<string | null>(null);

  const [customLayers, setCustomLayers] = useState<CustomLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [newTextValue, setNewTextValue] = useState("Votre texte");

  // Ordre global des calques, du fond (premier) au premier plan (dernier).
  const [layerOrder, setLayerOrder] = useState<string[]>([
    "background", "overlay", "logo",
    "text:subtitle", "text:title", "text:description", "text:price", "text:date",
  ]);

  const selectedLayer = customLayers.find((layer) => layer.id === selectedLayerId) ?? null;

  const updateCustomLayer = (id: string, changes: Partial<CustomLayer>) => {
    setCustomLayers((layers) => layers.map((layer) => layer.id === id ? { ...layer, ...changes } : layer));
  };

  const getLayerZ = (id: string) => {
    const index = layerOrder.indexOf(id);
    return index < 0 ? 1 : index + 1;
  };

  const moveLayerOrder = (id: string, direction: "up" | "down") => {
    setLayerOrder((current) => {
      const next = [...current];
      const from = next.indexOf(id);
      const to = direction === "up" ? from + 1 : from - 1;
      if (from < 0 || to < 0 || to >= next.length) return current;
      const fromItem = next[from];
      const toItem = next[to];
      if (!fromItem || !toItem) return current;
      next[from] = toItem;
      next[to] = fromItem;
      return next;
    });
  };

  const registerLayerOrder = (id: string) => {
    setLayerOrder((current) => current.includes(id) ? current : [...current, id]);
  };

  const getLayerLabel = (id: string) => {
    if (id === "background") return "Image / fond";
    if (id === "overlay") return "Voile sombre";
    if (id === "logo") return "Logo Qahwa";
    if (id.startsWith("text:")) {
      const field = id.slice(5) as TextElement;
      return field === "title" ? "Titre" : field === "subtitle" ? "Sous-titre"
        : field === "description" ? "Description" : field === "price" ? "Prix" : "Date";
    }
    const layer = customLayers.find((item) => item.id === id);
    if (!layer) return "Élément";
    if (layer.type === "text") return `Texte : ${layer.text || "Sans texte"}`;
    if (layer.type === "image") return "Image ajoutée";
    return `Forme : ${layer.shape === "rectangle" ? "Rectangle" : layer.shape === "circle" ? "Cercle" : "Ligne"}`;
  };

  const addCustomText = () => {
    const id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCustomLayers((layers) => [...layers, { id, type: "text", text: newTextValue.trim() || "Votre texte", x: 8, y: 42 + (layers.length % 4) * 8, width: 72, height: 10, color: "#FFFFFF", opacity: 100, fontFamily: "Inter, Arial, sans-serif", fontSize: 40, fontWeight: 700 }]);
    registerLayerOrder(id);
    setSelectedLayerId(id);
  };

  const addShape = (shape: "rectangle" | "circle" | "line") => {
    const id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCustomLayers((layers) => [...layers, { id, type: "shape", shape, x: 12 + (layers.length % 4) * 5, y: 35 + (layers.length % 5) * 6, width: shape === "line" ? 65 : 34, height: shape === "line" ? 1.2 : 18, color: "#FFFFFF", opacity: 85 }]);
    registerLayerOrder(id);
    setSelectedLayerId(id);
  };

  const handleExtraImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        const id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setCustomLayers((layers) => [...layers, { id, type: "image", src: reader.result as string, x: 12 + (index % 4) * 5, y: 25 + (index % 5) * 7, width: 36, height: 25, color: "#FFFFFF", opacity: 100 }]);
        registerLayerOrder(id);
        setSelectedLayerId(id);
      };
      reader.readAsDataURL(file);
    });
    event.target.value = "";
  };

  const handleCustomLayerPointerDown = (event: React.PointerEvent<HTMLElement>, layer: CustomLayer) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedLayerId(layer.id);
    const parent = canvasRef.current;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startLayerX = layer.x;
    const startLayerY = layer.y;
    const move = (moveEvent: PointerEvent) => {
      const x = Math.max(0, Math.min(100 - layer.width, startLayerX + ((moveEvent.clientX - startX) / rect.width) * 100));
      const y = Math.max(0, Math.min(100 - layer.height, startLayerY + ((moveEvent.clientY - startY) / rect.height) * 100));
      updateCustomLayer(layer.id, { x, y });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };



  const handleLogoPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!logoImage) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedLayerId("logo");
    const parent = canvasRef.current;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = logoX;
    const initialY = logoY;
    const move = (moveEvent: PointerEvent) => {
      setLogoX(Math.max(0, Math.min(100 - (logoSize / 1080) * 100, initialX + ((moveEvent.clientX - startX) / rect.width) * 100)));
      setLogoY(Math.max(0, Math.min(96, initialY + ((moveEvent.clientY - startY) / rect.height) * 100)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const [logoSize, setLogoSize] = useState(80);

  const [logoOpacity, setLogoOpacity] = useState(100);
  const [logoX, setLogoX] = useState(78);
  const [logoY, setLogoY] = useState(4);

  const [logoPosition, setLogoPosition] = useState<LogoPosition>("top-right");



  const [selectedElement, setSelectedElement] =

    useState<TextElement>("title");
  const [activeCanvasText, setActiveCanvasText] = useState<TextElement | null>(null);



  const [textStyles, setTextStyles] =

    useState<Record<TextElement, TextStyle>>(

      defaultTextStyles

    );



  const [textPositions, setTextPositions] =

    useState<Record<TextElement, TextPosition>>(

      defaultTextPositions

    );



  const [text, setText] = useState({

    title: "Nouveau produit",

    subtitle: "Une nouvelle création Qahwa",

    description: "Découvrez notre nouvelle création.",

    price: "850 DA",

    date: "Samedi 12 octobre",

  });

  // Chaque création choisie dans la bibliothèque charge une mise en page prête à modifier.
  useEffect(() => {
    const designId = new URLSearchParams(window.location.search).get("design");
    if (!designId) return;

    const variant = designId.endsWith("-editorial") ? "editorial" : designId.endsWith("-bold") ? "bold" : "premium";
    const isProduct = slug === "nouveau-produit";
    const isPromotion = slug === "promotion";
    const isEvent = slug === "evenement";

    const title = isProduct ? "NOUVELLE CRÉATION" : isPromotion ? "OFFRE SPÉCIALE" : isEvent ? "RENDEZ-VOUS QAHWA" : "L'ART DU CAFÉ";
    const subtitle = isProduct ? "À découvrir chez Qahwa" : isPromotion ? "Une offre à ne pas manquer" : isEvent ? "Un moment à partager" : "Une pause qui vous ressemble";
    const description = isProduct ? "Une recette généreuse, préparée avec soin." : isPromotion ? "Profitez de notre sélection du moment." : isEvent ? "Rejoignez-nous pour une expérience unique." : "Des saveurs soigneusement choisies, chaque jour.";
    const theme = variant === "editorial"
      ? { background: "linear-gradient(145deg, #18231f 0%, #0c1210 100%)", color: "#FFFFFF", family: "Playfair Display", align: "center" as TextAlign, titleSize: 62 }
      : variant === "bold"
        ? { background: "linear-gradient(155deg, #3a2524 0%, #151111 70%, #090909 100%)", color: "#FFFFFF", family: "Bebas Neue", align: "left" as TextAlign, titleSize: 78 }
        : { background: "linear-gradient(135deg, #242424 0%, #090909 72%)", color: "#FFFFFF", family: "Montserrat", align: "left" as TextAlign, titleSize: 56 };

    setCanvasBackground(theme.background);
    setHeroImage(null);
    setText({
      title,
      subtitle,
      description,
      price: isPromotion ? "-20%" : isProduct ? "850 DA" : "À PARTIR DE 500 DA",
      date: "SAMEDI · 10H — 18H",
    });
    setTextStyles({
      title: { fontFamily: theme.family, fontSize: theme.titleSize, fontWeight: 800, textAlign: theme.align, color: theme.color },
      subtitle: { fontFamily: variant === "editorial" ? "Playfair Display" : "Inter", fontSize: variant === "bold" ? 22 : 19, fontWeight: 600, textAlign: theme.align, color: theme.color },
      description: { fontFamily: variant === "editorial" ? "Lato" : "Inter", fontSize: 16, fontWeight: 400, textAlign: theme.align, color: theme.color },
      price: { fontFamily: variant === "bold" ? "Bebas Neue" : "Montserrat", fontSize: variant === "bold" ? 52 : 34, fontWeight: 800, textAlign: theme.align, color: theme.color },
      date: { fontFamily: "Inter", fontSize: 16, fontWeight: 600, textAlign: theme.align, color: theme.color },
    });
    setTextPositions(variant === "editorial"
      ? { subtitle: { x: 8, y: 48 }, title: { x: 8, y: 55 }, description: { x: 12, y: 69 }, price: { x: 8, y: 80 }, date: { x: 8, y: 89 } }
      : variant === "bold"
        ? { subtitle: { x: 7, y: 48 }, title: { x: 7, y: 55 }, description: { x: 7, y: 70 }, price: { x: 7, y: 81 }, date: { x: 7, y: 91 } }
        : { subtitle: { x: 8, y: 55 }, title: { x: 8, y: 61 }, description: { x: 8, y: 73 }, price: { x: 8, y: 83 }, date: { x: 8, y: 91 } });

    const decorations: CustomLayer[] = variant === "editorial"
      ? [{ id: "template-deco-line", type: "shape", shape: "line", x: 18, y: 43, width: 64, height: 0.5, color: "#FFFFFF", opacity: 75 }]
      : variant === "bold"
        ? [{ id: "template-deco-block", type: "shape", shape: "rectangle", x: 7, y: 43, width: 22, height: 1.2, color: "#FFFFFF", opacity: 95 }]
        : [{ id: "template-deco-circle", type: "shape", shape: "circle", x: 78, y: 8, width: 15, height: 12, color: "#FFFFFF", opacity: 12 }];
    setCustomLayers(decorations);
    setSelectedLayerId(null);
    setLayerOrder(["background", "overlay", "logo", ...decorations.map((layer) => layer.id), "text:subtitle", "text:title", "text:description", "text:price", "text:date"]);
  }, []);

  // Charge une création enregistrée si l'URL contient ?saved=<id>.
  useEffect(() => {
    const savedId = new URLSearchParams(window.location.search).get("saved");
    if (!savedId) return;

    let cancelled = false;

    const loadCreation = async () => {
      const supabase = createSupabaseBrowserClient() as any;
      const { data: creation, error } = await supabase
        .from("qahwa_studio_creations")
        .select("id, name, category, design")
        .eq("id", savedId)
        .single();

      if (cancelled) return;
      if (error || !creation) {
        setSaveMessage("Impossible de charger cette création. Vérifie ta connexion.");
        return;
      }

      const design = creation.design ?? {};
      setSavedCreationId(creation.id);
      setCreationName(creation.name || "Ma création");
      if (design.heroImage !== undefined) setHeroImage(design.heroImage);
      if (design.canvasBackground !== undefined) setCanvasBackground(design.canvasBackground);
      if (design.logoImage !== undefined) setLogoImage(design.logoImage);
      if (Array.isArray(design.customLayers)) setCustomLayers(design.customLayers);
      if (Array.isArray(design.layerOrder)) setLayerOrder(design.layerOrder);
      if (typeof design.logoSize === "number") setLogoSize(design.logoSize);
      if (typeof design.logoOpacity === "number") setLogoOpacity(design.logoOpacity);
      if (typeof design.logoX === "number") setLogoX(design.logoX);
      if (typeof design.logoY === "number") setLogoY(design.logoY);
      if (design.logoPosition) setLogoPosition(design.logoPosition);
      if (design.selectedElement) setSelectedElement(design.selectedElement);
      if (design.textStyles) setTextStyles(design.textStyles);
      if (design.textPositions) setTextPositions(design.textPositions);
      if (design.text) setText(design.text);
      if (typeof design.newTextValue === "string") setNewTextValue(design.newTextValue);
    };

    void loadCreation();
    return () => { cancelled = true; };
  }, []);

  const handleSaveCreation = async () => {
    if (isSaving) return;

    let name = creationName.trim();
    if (!savedCreationId) {
      const enteredName = window.prompt("Donne un nom à ton affiche :", name || "Ma création");
      if (enteredName === null) return;
      name = enteredName.trim();
    }
    if (!name) {
      setSaveMessage("Entre un nom pour ta création.");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");
    try {
      const supabase = createSupabaseBrowserClient() as any;
      const design = {
        heroImage, canvasBackground, logoImage, customLayers, layerOrder,
        logoSize, logoOpacity, logoX, logoY, logoPosition, selectedElement, textStyles,
        textPositions, text, newTextValue,
      };
      const payload = {
        name,
        category: slug,
        design,
        updated_at: new Date().toISOString(),
      };

      const result = savedCreationId
        ? await supabase.from("qahwa_studio_creations").update(payload).eq("id", savedCreationId).select("id").single()
        : await supabase.from("qahwa_studio_creations").insert(payload).select("id").single();

      if (result.error) throw result.error;
      const id = result.data.id as string;
      setSavedCreationId(id);
      setCreationName(name);
      const url = new URL(window.location.href);
      url.searchParams.set("saved", id);
      url.searchParams.delete("new");
      url.searchParams.delete("design");
      window.history.replaceState({}, "", url.toString());
      setSaveMessage("Création enregistrée !");
    } catch (error) {
      console.error("Erreur de sauvegarde Studio :", error);
      setSaveMessage("Échec de l’enregistrement. Vérifie que tu es connecté à Qahwa et que la table Supabase existe.");
    } finally {
      setIsSaving(false);
    }
  };

  const hasField = (element: TextElement) =>

    data.fields.includes(element);



  const handleImageChange = (

    event: React.ChangeEvent<HTMLInputElement>

  ) => {

    const file = event.target.files?.[0];



    if (!file) return;



    const reader = new FileReader();



    reader.onload = () => {

      if (typeof reader.result === "string") {

        setHeroImage(reader.result);

      }

    };



    reader.readAsDataURL(file);

  };



  const handleLogoChange = (

    event: React.ChangeEvent<HTMLInputElement>

  ) => {

    const file = event.target.files?.[0];



    if (!file) return;



    const reader = new FileReader();



    reader.onload = () => {

      if (typeof reader.result === "string") {

        setLogoImage(reader.result);

      }

    };



    reader.readAsDataURL(file);

  };



  const updateText = (

    element: TextElement,

    value: string

  ) => {

    setText((current) => ({

      ...current,

      [element]: value,

    }));

  };



  const updateSelectedStyle = (

    changes: Partial<TextStyle>

  ) => {

    setTextStyles((current) => ({

      ...current,

      [selectedElement]: {

        ...current[selectedElement],

        ...changes,

      },

    }));

  };



  const updateSelectedPosition = (

    changes: Partial<TextPosition>

  ) => {

    setTextPositions((current) => ({

      ...current,

      [selectedElement]: {

        ...current[selectedElement],

        ...changes,

      },

    }));

  };



  const resetSelectedPosition = () => {

    setTextPositions((current) => ({

      ...current,

      [selectedElement]:

        defaultTextPositions[selectedElement],

    }));

  };



  const handleTextPointerDown = (

    event: React.PointerEvent<HTMLDivElement>,

    element: TextElement

  ) => {

    event.preventDefault();

    event.stopPropagation();



    setSelectedElement(element);
    setActiveCanvasText(element);



    const parent = canvasRef.current;



    if (!parent) return;



    const rect = parent.getBoundingClientRect();



    const startX = event.clientX;

    const startY = event.clientY;



    const startPosition = textPositions[element];



    const handlePointerMove = (

      moveEvent: PointerEvent

    ) => {

      const deltaX =

        ((moveEvent.clientX - startX) /

          rect.width) *

        100;



      const deltaY =

        ((moveEvent.clientY - startY) /

          rect.height) *

        100;



      const newX = Math.max(

        0,

        Math.min(84, startPosition.x + deltaX)

      );



      const newY = Math.max(

        0,

        Math.min(94, startPosition.y + deltaY)

      );



      setTextPositions((current) => ({

        ...current,

        [element]: {

          x: newX,

          y: newY,

        },

      }));

    };



    const handlePointerUp = () => {

      window.removeEventListener(

        "pointermove",

        handlePointerMove

      );



      window.removeEventListener(

        "pointerup",

        handlePointerUp

      );

    };



    window.addEventListener(

      "pointermove",

      handlePointerMove

    );



    window.addEventListener(

      "pointerup",

      handlePointerUp

    );

  };



  const renderTextElement = (

    element: TextElement,

    content: string

  ) => {

    if (!hasField(element) || !content) {

      return null;

    }



    const style = textStyles[element];

    const position = textPositions[element];



    const commonStyle = {

      position: "absolute" as const,
      zIndex: getLayerZ(`text:${element}`),

      left: `${position.x}%`,

      top: `${position.y}%`,

      fontFamily: style.fontFamily,

      // Le texte reste proportionnel à l’affiche, quelle que soit sa taille à l’écran.

      fontSize: `${(style.fontSize / 1080) * 100}cqw`,

      fontWeight: style.fontWeight,

      textAlign: style.textAlign,

      color: style.color,

      maxWidth: "84%",

      lineHeight: 1.15,

    };



    const isSelected =

      selectedElement === element;



    return (

      <div

        key={element}

        onPointerDown={(event) =>

          handleTextPointerDown(

            event,

            element

          )

        }

        style={commonStyle}

        className={`cursor-move select-none whitespace-pre-wrap ${

          isSelected

            ? "rounded border border-dashed border-[#FFFFFF] px-2 py-1"

            : ""

        }`}

      >

        {element === "title"

          ? content.toUpperCase()

          : content}

      </div>

    );

  };



  /*

   * TÉLÉCHARGEMENT

   * Cette fonction est volontairement en dehors

   * de renderTextElement.

   */

  const handleDownload = async () => {

    if (!canvasRef.current) return;



    const width = 1080;



    const height =

      data.ratio === "aspect-[9/16]"

        ? 1920

        : 1350;



    const canvas =

      document.createElement("canvas");



    canvas.width = width;

    canvas.height = height;



    const ctx = canvas.getContext("2d");



    if (!ctx) return;



    const loadImage = (

      src: string

    ) =>

      new Promise<HTMLImageElement>(

        (resolve, reject) => {

          const image = new Image();



          image.onload = () =>

            resolve(image);



          image.onerror = reject;



          image.src = src;

        }

      );



    /*

     * FOND

     */

    if (heroImage) {

      try {

        const image =

          await loadImage(heroImage);



        const scale = Math.max(

          width / image.naturalWidth,

          height / image.naturalHeight

        );



        const imageWidth =

          image.naturalWidth * scale;



        const imageHeight =

          image.naturalHeight * scale;



        const imageX =

          (width - imageWidth) / 2;



        const imageY =

          (height - imageHeight) / 2;



        ctx.drawImage(

          image,

          imageX,

          imageY,

          imageWidth,

          imageHeight

        );

      } catch {

        ctx.fillStyle = "#111111";

        ctx.fillRect(

          0,

          0,

          width,

          height

        );

      }

    } else {

      const gradient =

        ctx.createLinearGradient(

          0,

          0,

          width,

          height

        );



      gradient.addColorStop(

        0,

        "#1b1b1b"

      );



      gradient.addColorStop(

        0.5,

        "#111111"

      );



      gradient.addColorStop(

        1,

        "#090909"

      );



      ctx.fillStyle = gradient;



      ctx.fillRect(

        0,

        0,

        width,

        height

      );

    }



    /*

     * OVERLAY

     */

    const overlay =

      ctx.createLinearGradient(

        0,

        0,

        0,

        height

      );



    overlay.addColorStop(

      0,

      "rgba(0,0,0,0.25)"

    );



    overlay.addColorStop(

      0.55,

      "rgba(0,0,0,0.20)"

    );



    overlay.addColorStop(

      1,

      "rgba(0,0,0,0.85)"

    );



    ctx.fillStyle = overlay;



    ctx.fillRect(

      0,

      0,

      width,

      height

    );



    /*

     * LOGO

     */

    if (logoImage) {

      try {

        const logo =

          await loadImage(logoImage);



        const logoWidth =

          logoSize;



        const logoHeight =

          (logo.naturalHeight /

            logo.naturalWidth) *

          logoWidth;



        let logoX = 24;

        let logoY = 24;



        if (

          logoPosition ===

          "top-center"

        ) {

          logoX =

            (width - logoWidth) / 2;



          logoY = 24;

        }



        if (

          logoPosition ===

          "top-right"

        ) {

          logoX =

            width -

            logoWidth -

            24;



          logoY = 24;

        }



        if (

          logoPosition ===

          "bottom-left"

        ) {

          logoX = 24;



          logoY =

            height -

            logoHeight -

            24;

        }



        if (

          logoPosition ===

          "bottom-center"

        ) {

          logoX =

            (width - logoWidth) / 2;



          logoY =

            height -

            logoHeight -

            24;

        }



        if (

          logoPosition ===

          "bottom-right"

        ) {

          logoX =

            width -

            logoWidth -

            24;



          logoY =

            height -

            logoHeight -

            24;

        }



        ctx.save();

        ctx.globalAlpha = logoOpacity / 100;

        ctx.drawImage(

          logo,

          logoX,

          logoY,

          logoWidth,

          logoHeight

        );

        ctx.restore();

      } catch {}

    }



    /*

     * TEXTE

     */

    const drawText = (

      element: TextElement,

      content: string

    ) => {

      if (

        !hasField(element) ||

        !content

      ) {

        return;

      }



      const style =

        textStyles[element];



      const position =

        textPositions[element];



      const x =

        (position.x / 100) *

        width;



      const y =

        (position.y / 100) *

        height;



      const fontSize =

        style.fontSize *

        (width / 1080);



      ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;



      ctx.fillStyle =

        style.color;



      ctx.textAlign =

        style.textAlign === "left"

          ? "left"

          : style.textAlign ===

              "center"

            ? "center"

            : "right";



      ctx.textBaseline = "top";



      const maxWidth =

        width * 0.84;



      const words =

        content.split(" ");



      const lines: string[] = [];



      let currentLine = "";



      for (const word of words) {

        const testLine =

          currentLine

            ? `${currentLine} ${word}`

            : word;



        if (

          ctx.measureText(

            testLine

          ).width > maxWidth &&

          currentLine

        ) {

          lines.push(

            currentLine

          );



          currentLine = word;

        } else {

          currentLine =

            testLine;

        }

      }



      if (currentLine) {

        lines.push(

          currentLine

        );

      }



      const lineHeight =

        fontSize * 1.15;



      lines.forEach(

        (line, index) => {

          ctx.fillText(

            element === "title"

              ? line.toUpperCase()

              : line,

            x,

            y +

              index *

                lineHeight

          );

        }

      );

    };



    drawText(

      "subtitle",

      text.subtitle

    );



    drawText(

      "title",

      text.title

    );



    drawText(

      "description",

      text.description

    );



    drawText(

      "price",

      text.price

    );



    drawText(

      "date",

      text.date

    );



    /*

     * TÉLÉCHARGEMENT PNG

     */

    // Dessiner les éléments ajoutés par l'utilisateur dans l'image exportée.
    for (const layer of customLayers) {
      const x = (layer.x / 100) * width;
      const y = (layer.y / 100) * height;
      const layerWidth = (layer.width / 100) * width;
      const layerHeight = (layer.height / 100) * height;
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      if (layer.type === "text") {
        ctx.fillStyle = layer.color;
        ctx.font = `${layer.fontWeight ?? 700} ${layer.fontSize ?? Math.max(20, width * 0.036)}px ${layer.fontFamily ?? "Arial"}`;
        const lines = (layer.text || "").split("\n");
        lines.forEach((line, lineIndex) => ctx.fillText(line, x, y + lineIndex * Math.max(24, width * 0.042), layerWidth));
      } else if (layer.type === "image" && layer.src) {
        try {
          const image = await loadImage(layer.src);
          const scale = Math.min(layerWidth / image.naturalWidth, layerHeight / image.naturalHeight);
          const drawWidth = image.naturalWidth * scale;
          const drawHeight = image.naturalHeight * scale;
          ctx.drawImage(image, x, y, drawWidth, drawHeight);
        } catch {}
      } else if (layer.type === "shape") {
        ctx.fillStyle = layer.color;
        const shapeHeight = layer.shape === "line" ? Math.max(3, layerHeight) : layerHeight;
        if (layer.shape === "circle") {
          ctx.beginPath();
          ctx.ellipse(x + layerWidth / 2, y + shapeHeight / 2, layerWidth / 2, shapeHeight / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, layerWidth, shapeHeight);
        }
      }
      ctx.restore();
    }

    canvas.toBlob(

      (blob) => {

        if (!blob) return;



        const url =

          URL.createObjectURL(

            blob

          );



        const link =

          document.createElement(

            "a"

          );



        link.href = url;



        link.download =

          `qahwa-${slug}.png`;



        document.body.appendChild(

          link

        );



        link.click();



        link.remove();



        URL.revokeObjectURL(

          url

        );

      },

      "image/png"

    );

  };



  const selectedStyle =

    textStyles[selectedElement];



  const selectedPosition =

    textPositions[selectedElement];



  const logoPositionClass: Record<

    LogoPosition,

    string

  > = {

    "top-left":

      "left-3 top-3",

    "top-center":

      "left-1/2 top-3 -translate-x-1/2",

    "top-right":

      "right-3 top-3",

    "bottom-left":

      "bottom-3 left-3",

    "bottom-center":

      "bottom-3 left-1/2 -translate-x-1/2",

    "bottom-right":

      "bottom-3 right-3",

  };



  return (

    <div className="min-h-screen bg-[#090909] text-white">

      {/* HEADER */}

      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/25 px-3 py-3 backdrop-blur-2xl sm:px-5">

        <div className="flex items-center gap-4">

          <button

            type="button"

            onClick={() =>

              router.push(

                "/qahwa/studio"

              )

            }

            className="text-sm text-white/60 transition hover:text-white"

          >

            ← Studio

          </button>



          <div className="h-5 w-px bg-white/10" />



          <div>

            <div className="flex items-center gap-2">

              <span className="h-2 w-2 rounded-full bg-[#FFFFFF]" />



              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">

                {data.category}

              </span>

            </div>



            <h1 className="mt-0.5 text-sm font-semibold uppercase tracking-[0.08em]">

              {data.title}

            </h1>

          </div>

        </div>



        <div className="flex items-center gap-4">

          <div className="hidden text-right sm:block">

            <p className="text-[9px] uppercase tracking-[0.16em] text-white/35">

              {data.format}

            </p>



            <p className="text-[10px] text-white/55">

              {data.width} ×{" "}

              {data.height} px

            </p>

          </div>



          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={handleSaveCreation}
              disabled={isSaving}
              className="rounded-lg border border-white/20 bg-[#FF6B00] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#e85f00] disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving ? "Enregistrement…" : savedCreationId ? "Enregistrer" : "Enregistrer ma création"}
            </button>
            {saveMessage ? <span role="status" className="max-w-56 text-right text-[10px] text-white/75">{saveMessage}</span> : null}
          </div>

          <button

            type="button"

            onClick={handleDownload}

            className="rounded-lg bg-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-black transition hover:bg-white/85"

          >

            Télécharger l’affiche

          </button>

        </div>

      </header>



      {/* WORKSPACE */}

      <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">

        {/* CANVAS */}

        <main className="flex min-w-0 flex-1 flex-col items-center justify-center overflow-auto bg-[#090909] p-3 sm:p-6 lg:p-8">
          <div className="mb-3 flex w-full max-w-[520px] items-center gap-2 rounded-lg border border-white/10 bg-[#141414] px-3 py-2 text-[11px] text-white/55">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFFFFF]/15 font-bold text-[#FFFFFF]">i</span>
            Clique sur un texte ou un élément, puis fais-le glisser pour le déplacer.
          </div>
          <div className="flex min-h-0 w-full flex-1 items-center justify-center">
            <div
              className="flex min-h-full w-full items-center justify-center"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            >

            <div

              ref={canvasRef}

              className={`relative w-full max-w-[520px] overflow-hidden bg-[#111111] shadow-2xl ${data.ratio}`}

              style={{ containerType: "inline-size" }}

            >

              {/* IMAGE DE FOND */}

              {heroImage ? (

                <img

                  src={heroImage}

                  alt=""

                  className="absolute inset-0 h-full w-full object-cover" style={{ zIndex: getLayerZ("background") }}

                />

              ) : (

                <div className="absolute inset-0" style={{ zIndex: getLayerZ("background"), background: canvasBackground }} />

              )}



              {/* OVERLAY */}

              <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/20 to-black/85" style={{ zIndex: getLayerZ("overlay") }} />



              {/* LOGO */}

              {logoImage && (
                <div
                  onPointerDown={handleLogoPointerDown}
                  onClick={() => setSelectedLayerId("logo")}
                  title="Fais glisser pour déplacer le logo"
                  className="absolute cursor-move touch-none"
                  style={{
                    zIndex: getLayerZ("logo"),
                    left: `${logoX}%`,
                    top: `${logoY}%`,
                    width: `${(logoSize / 1080) * 100}%`,
                    outline: selectedLayerId === "logo" ? "1px dashed rgba(255,255,255,.9)" : "none",
                    opacity: logoOpacity / 100,
                  }}
                >
                  <img src={logoImage} alt="Logo Qahwa" draggable={false} className="block h-auto w-full object-contain" />
                  {selectedLayerId === "logo" && <span className="absolute -bottom-2 -right-2 h-3 w-3 rounded-sm border border-white bg-black" aria-hidden="true" />}
                </div>
              )}



              {/* ÉLÉMENTS AJOUTÉS : textes, images et formes */}
              {customLayers.map((layer) => {
                const selected = selectedLayerId === layer.id;
                const commonStyle: React.CSSProperties = {
                  position: "absolute",
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  width: `${layer.width}%`,
                  height: layer.type === "text" ? "auto" : `${layer.height}%`,
                  opacity: layer.opacity / 100,
                  zIndex: getLayerZ(layer.id),
                  cursor: "move",
                  touchAction: "none",
                  outline: selected ? "1px dashed #FFFFFF" : "none",
                };
                if (layer.type === "text") {
                  return <div key={layer.id} onPointerDown={(event) => handleCustomLayerPointerDown(event, layer)} style={{ ...commonStyle, color: layer.color, fontFamily: layer.fontFamily ?? "Arial", fontSize: `${((layer.fontSize ?? 40) / 1080) * 100}cqw`, fontWeight: layer.fontWeight ?? 700, lineHeight: 1.15, whiteSpace: "pre-wrap" }}>{layer.text}</div>;
                }
                if (layer.type === "image") {
                  return <img key={layer.id} src={layer.src} alt="Image ajoutée" onPointerDown={(event) => handleCustomLayerPointerDown(event, layer)} style={{ ...commonStyle, objectFit: "contain" }} />;
                }
                return <div key={layer.id} aria-label={`Forme ${layer.shape}`} onPointerDown={(event) => handleCustomLayerPointerDown(event, layer)} style={{ ...commonStyle, backgroundColor: layer.shape === "line" ? layer.color : layer.color, borderRadius: layer.shape === "circle" ? "9999px" : layer.shape === "line" ? "9999px" : "2px", height: `${layer.height}%`, minHeight: layer.shape === "line" ? "2px" : undefined }} />;
              })}

              {/* TEXTES */}

              {renderTextElement(

                "subtitle",

                text.subtitle

              )}



              {renderTextElement(

                "title",

                text.title

              )}



              {renderTextElement(

                "description",

                text.description

              )}



              {renderTextElement(

                "price",

                text.price

              )}



              {renderTextElement(

                "date",

                text.date

              )}



              {/* BARRE D’OUTILS CONTEXTUELLE — édition rapide façon Canva */}
              {selectedLayer && (
                <div
                  className="absolute bottom-3 left-3 right-3 z-[2147483000] max-h-[62%] overflow-y-auto rounded-2xl border border-black/10 bg-white p-3 text-black shadow-[0_12px_40px_rgba(0,0,0,0.28)] sm:left-1/2 sm:right-auto sm:w-[min(520px,calc(100%-24px))] sm:-translate-x-1/2"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <div className="mb-3 flex items-center gap-3 border-b border-black/10 pb-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                      <span className="text-base">{selectedLayer.type === "text" ? "T" : selectedLayer.type === "image" ? "▧" : "◇"}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold tracking-tight">{getLayerLabel(selectedLayer.id)}</p>
                      <p className="mt-0.5 text-[10px] text-black/50">Sélectionné · modifie directement ton élément</p>
                    </div>
                    <button type="button" onClick={() => { const layer = selectedLayer; const id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; const copy = { ...layer, id, x: Math.min(100 - layer.width, layer.x + 3), y: Math.min(100 - layer.height, layer.y + 3) }; setCustomLayers((layers) => [...layers, copy]); setLayerOrder((order) => [...order, id]); setSelectedLayerId(id); }} className="rounded-lg border border-black/10 px-3 py-2 text-[10px] font-semibold transition hover:bg-black/5" title="Dupliquer cet élément">⧉ Dupliquer</button>
                    <button type="button" onClick={() => setSelectedLayerId(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/5 text-sm transition hover:bg-black/10" aria-label="Fermer les outils">✕</button>
                  </div>

                  {selectedLayer.type === "text" && (
                    <div className="mb-3">
                      <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-black/50">Contenu du texte</label>
                      <textarea rows={2} aria-label="Contenu du texte" value={selectedLayer.text ?? ""} onChange={(event) => updateCustomLayer(selectedLayer.id, { text: event.target.value })} className="w-full resize-y rounded-xl border border-black/10 bg-[#F7F7F7] px-3 py-2.5 text-xs text-black outline-none transition focus:border-black focus:bg-white" />
                    </div>
                  )}

                  <div className="mb-3 grid grid-cols-2 gap-2">
                    {selectedLayer.type !== "image" && (
                      <label className="flex items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2.5 text-[10px] font-semibold">
                        Couleur <input aria-label="Couleur" type="color" value={selectedLayer.color} onChange={(event) => updateCustomLayer(selectedLayer.id, { color: event.target.value })} className="h-7 w-9 cursor-pointer rounded-md border border-black/10 bg-white p-0.5" />
                      </label>
                    )}
                    <label className="rounded-xl border border-black/10 px-3 py-2.5 text-[10px] font-semibold">Opacité <span className="float-right tabular-nums text-black/55">{selectedLayer.opacity}%</span>
                      <input aria-label="Opacité" type="range" min="0" max="100" value={selectedLayer.opacity} onChange={(event) => updateCustomLayer(selectedLayer.id, { opacity: Number(event.target.value) })} className="mt-2 w-full accent-black" />
                    </label>
                    <label className="rounded-xl border border-black/10 px-3 py-2.5 text-[10px] font-semibold">Largeur <span className="float-right tabular-nums text-black/55">{Math.round(selectedLayer.width)}%</span>
                      <input aria-label="Largeur" type="range" min="1" max="100" value={selectedLayer.width} onChange={(event) => updateCustomLayer(selectedLayer.id, { width: Number(event.target.value), x: Math.min(selectedLayer.x, 100 - Number(event.target.value)) })} className="mt-2 w-full accent-black" />
                    </label>
                    {selectedLayer.type !== "text" && (
                      <label className="rounded-xl border border-black/10 px-3 py-2.5 text-[10px] font-semibold">Hauteur <span className="float-right tabular-nums text-black/55">{Math.round(selectedLayer.height)}%</span>
                        <input aria-label="Hauteur" type="range" min="1" max="100" value={Math.min(100, Math.max(1, selectedLayer.height))} onChange={(event) => updateCustomLayer(selectedLayer.id, { height: Number(event.target.value), y: Math.min(selectedLayer.y, 100 - Number(event.target.value)) })} className="mt-2 w-full accent-black" />
                      </label>
                    )}
                    {selectedLayer.type === "text" && (
                      <label className="rounded-xl border border-black/10 px-3 py-2.5 text-[10px] font-semibold">Taille du texte <span className="float-right tabular-nums text-black/55">{selectedLayer.fontSize ?? 40}px</span>
                        <input aria-label="Taille du texte" type="range" min="12" max="160" value={selectedLayer.fontSize ?? 40} onChange={(event) => updateCustomLayer(selectedLayer.id, { fontSize: Number(event.target.value) })} className="mt-2 w-full accent-black" />
                      </label>
                    )}
                  </div>

                  <div className="mb-3 rounded-xl bg-[#F7F7F7] p-2.5">
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-black/50">Position rapide</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button type="button" onClick={() => updateCustomLayer(selectedLayer.id, { x: 0 })} className="rounded-lg border border-black/10 bg-white px-2 py-2 text-[10px] font-semibold hover:border-black/40">← Gauche</button>
                      <button type="button" onClick={() => updateCustomLayer(selectedLayer.id, { x: Math.max(0, (100 - selectedLayer.width) / 2) })} className="rounded-lg border border-black/10 bg-white px-2 py-2 text-[10px] font-semibold hover:border-black/40">↔ Centrer</button>
                      <button type="button" onClick={() => updateCustomLayer(selectedLayer.id, { x: Math.max(0, 100 - selectedLayer.width) })} className="rounded-lg border border-black/10 bg-white px-2 py-2 text-[10px] font-semibold hover:border-black/40">Droite →</button>
                      <button type="button" onClick={() => updateCustomLayer(selectedLayer.id, { y: 0 })} className="rounded-lg border border-black/10 bg-white px-2 py-2 text-[10px] font-semibold hover:border-black/40">↑ Haut</button>
                      <button type="button" onClick={() => updateCustomLayer(selectedLayer.id, { y: Math.max(0, (100 - selectedLayer.height) / 2) })} className="rounded-lg border border-black/10 bg-white px-2 py-2 text-[10px] font-semibold hover:border-black/40">↕ Milieu</button>
                      <button type="button" onClick={() => updateCustomLayer(selectedLayer.id, { y: Math.max(0, 100 - selectedLayer.height) })} className="rounded-lg border border-black/10 bg-white px-2 py-2 text-[10px] font-semibold hover:border-black/40">Bas ↓</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <button type="button" onClick={() => moveLayerOrder(selectedLayer.id, "down")} disabled={layerOrder.indexOf(selectedLayer.id) <= 0} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[10px] font-semibold transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30">↓ Envoyer derrière</button>
                    <button type="button" onClick={() => moveLayerOrder(selectedLayer.id, "up")} disabled={layerOrder.indexOf(selectedLayer.id) === layerOrder.length - 1} className="rounded-xl bg-black px-3 py-2.5 text-[10px] font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-30">↑ Mettre devant</button>
                    <button type="button" onClick={() => { const id = selectedLayer.id; setCustomLayers((layers) => layers.filter((item) => item.id !== id)); setLayerOrder((order) => order.filter((item) => item !== id)); setSelectedLayerId(null); }} className="rounded-xl border border-red-200 px-3 py-2.5 text-[10px] font-semibold text-red-600 transition hover:bg-red-50" title="Supprimer">✕</button>
                  </div>
                </div>
              )}

              {/* BARRE CONTEXTUELLE POUR LES TEXTES PRÉDÉFINIS */}
              {!selectedLayer && activeCanvasText && (
                <div className="absolute bottom-2 left-2 right-2 z-[2147483000] max-h-[55%] overflow-y-auto rounded-xl border-2 border-black bg-white p-3 text-black shadow-2xl" onPointerDown={(event) => event.stopPropagation()}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold">Modifier : {activeCanvasText}</p>
                      <p className="text-[9px] text-black/55">Outils rapides du texte sélectionné</p>
                    </div>
                    <button type="button" onClick={() => setActiveCanvasText(null)} className="rounded-md border border-black/15 px-2 py-1 text-xs text-black hover:bg-black/5" aria-label="Fermer les outils">✕</button>
                  </div>
                  <textarea rows={2} aria-label="Contenu du texte sélectionné" value={text[activeCanvasText] ?? ""} onChange={(event) => updateText(activeCanvasText, event.target.value)} className="mb-2 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs text-black outline-none focus:border-black" />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="rounded-lg border border-black/10 px-2 py-2 text-[10px]">Couleur
                      <input type="color" value={textStyles[activeCanvasText].color} onChange={(event) => setTextStyles((current) => ({ ...current, [activeCanvasText]: { ...current[activeCanvasText], color: event.target.value } }))} className="ml-2 h-6 w-8 cursor-pointer border-0 bg-transparent align-middle" />
                    </label>
                    <label className="rounded-lg border border-black/10 px-2 py-2 text-[10px]">Taille · {textStyles[activeCanvasText].fontSize}px
                      <input aria-label="Taille du texte" type="range" min="12" max="160" value={textStyles[activeCanvasText].fontSize} onChange={(event) => setTextStyles((current) => ({ ...current, [activeCanvasText]: { ...current[activeCanvasText], fontSize: Number(event.target.value) } }))} className="mt-1 w-full accent-black" />
                    </label>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => moveLayerOrder(`text:${activeCanvasText}`, "down")} className="rounded-lg border border-black/15 bg-white px-2 py-2 text-[10px] font-semibold text-black hover:bg-black/5">← Derrière</button>
                    <button type="button" onClick={() => moveLayerOrder(`text:${activeCanvasText}`, "up")} className="rounded-lg border border-black/15 bg-white px-2 py-2 text-[10px] font-semibold text-black hover:bg-black/5">Devant →</button>
                  </div>
                </div>
              )}

              {/* MESSAGE VIDE */}

              {!heroImage && (

                <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">

                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/20">

                    Ajoute une image

                  </p>

                </div>

              )}

            </div>

            </div>

          </div>

        </main>



        {/* PANNEAU */}

        <aside className="w-full shrink-0 overflow-y-auto border-t border-white/5 bg-transparent p-3 backdrop-blur-none sm:p-4 lg:max-h-[calc(100vh-4rem)] lg:w-[400px] lg:border-l lg:border-t-0">

          <div className="mb-3 rounded-xl border border-white/10 bg-transparent p-3">
            <p className="text-xs font-semibold text-white">Crée ton affiche en 3 étapes</p>
            <p className="mt-1 text-[11px] leading-5 text-white/55">1. Choisis un outil. 2. Clique sur un élément pour le modifier ou fais-le glisser pour le déplacer. 3. Clique sur « Télécharger ».</p>
          </div>

          <div className="mb-3 grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-transparent p-1">

            {[

              { id: "texte", label: "Texte", icon: "T" },

              { id: "images", label: "Photos", icon: "▧" },

              { id: "formes", label: "Éléments", icon: "◇" },

              { id: "format", label: "Format", icon: "□" },

            ].map((tab) => (

              <button

                key={tab.id}

                type="button"

                onClick={() =>

                  setActiveTab(

                    tab.id as "texte" | "images" | "formes" | "format"

                  )

                }

                className={`flex min-h-[66px] flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 text-[10px] transition ${
                  activeTab === tab.id
                    ? "border-[#FFFFFF]/40 bg-[#FFFFFF]/10 text-[#FFFFFF]"
                    : "border-transparent text-white/45 hover:border-white/10 hover:bg-white/5 hover:text-white"
                }`}

              >

                <span className="text-base font-bold">{tab.icon}</span>

                <span>{tab.label}</span>

              </button>

            ))}

          </div>




          <div className="space-y-3">



            {activeTab === "texte" && (
              <>
            {/* ================= CONTENU ================= */}

            <details

              className="overflow-hidden rounded-xl border border-white/10 bg-transparent"

              open

            >

              <summary className="cursor-pointer list-none px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">

                <div className="flex items-center justify-between">

                  <span>Modifier les textes de l’affiche</span>

                  <span className="text-white/35">

                    +

                  </span>

                </div>

              </summary>



              <div className="space-y-4 border-t border-white/5 px-4 pb-4 pt-4">

                {data.fields.map(

                  (field) => (

                    <div key={field}>

                      <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">

                        {field ===

                        "title"

                          ? "Titre"

                          : field ===

                              "subtitle"

                            ? "Sous-titre"

                            : field ===

                                "description"

                              ? "Description"

                              : field ===

                                  "price"

                                ? "Prix"

                                : "Date"}

                      </label>



                      <textarea

                        value={text[field]}

                        onChange={(event) =>

                          updateText(

                            field,

                            event.target

                              .value

                          )

                        }

                        rows={

                          field ===

                          "description"

                            ? 3

                            : 1

                        }

                        className="w-full resize-none rounded-lg border border-white/10 bg-[#101010] px-3 py-2.5 text-xs text-white outline-none transition placeholder:text-white/20 focus:border-[#FFFFFF]"

                      />

                    </div>

                  )

                )}

              </div>

            </details>



            <details className="overflow-hidden rounded-xl border border-white/10 bg-transparent">
              <summary className="cursor-pointer list-none px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white"><div className="flex items-center justify-between"><span>Ajouter un texte libre</span><span className="text-white/35">+</span></div></summary>
              <div className="space-y-3 border-t border-white/5 px-4 pb-4 pt-4">
                <input value={newTextValue} onChange={(event) => setNewTextValue(event.target.value)} placeholder="Écris ton texte" className="w-full rounded-lg border border-white/10 bg-[#101010] px-3 py-2.5 text-xs text-white outline-none focus:border-[#FFFFFF]" />
                <button type="button" onClick={addCustomText} className="w-full rounded-lg bg-white px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-black hover:bg-white/85">+ Ajouter ce texte</button>
              </div>
            </details>

            {/* ================= POLICE ================= */}

            <details className="overflow-hidden rounded-xl border border-white/10 bg-transparent">

              <summary className="cursor-pointer list-none px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">

                <div className="flex items-center justify-between">

                  <span>Style du texte</span>

                  <span className="text-white/35">

                    +

                  </span>

                </div>

              </summary>



              <div className="space-y-4 border-t border-white/5 px-4 pb-4 pt-4">

                <div>

                  <label className="mb-2 block text-[9px] uppercase tracking-[0.14em] text-white/40">

                    Élément

                  </label>



                  <StudioDarkSelect
                    value={selectedElement}
                    onChange={(value) => setSelectedElement(value as TextElement)}
                    options={data.fields.map((field) => ({
                      value: field,
                      label:
                        field === "title" ? "Titre"
                        : field === "subtitle" ? "Sous-titre"
                        : field === "description" ? "Description"
                        : field === "price" ? "Prix"
                        : "Date",
                    }))}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setText((current) => ({ ...current, [selectedElement]: "" })); setSelectedLayerId(null); }} className="rounded-lg border border-red-400/30 bg-transparent px-3 py-2 text-[10px] font-semibold text-red-300 hover:bg-red-500/10">Supprimer ce texte</button>
                    <button type="button" onClick={() => setText((current) => ({ ...current, [selectedElement]: selectedElement === "title" ? "Nouveau produit" : selectedElement === "subtitle" ? "Une nouvelle création Qahwa" : selectedElement === "description" ? "Découvrez notre nouvelle création." : selectedElement === "price" ? "850 DA" : "Samedi 12 octobre" }))} className="rounded-lg border border-white/15 bg-transparent px-3 py-2 text-[10px] font-semibold text-white/75 hover:bg-white/10">Restaurer le texte</button>
                  </div>

                </div>



                <div>

                  <label className="mb-2 block text-[9px] uppercase tracking-[0.14em] text-white/40">

                    Famille

                  </label>



                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-transparent p-1.5" aria-label="Choisir une police, aperçu instantané">
                    {[
                      { label: "Arial", value: "Arial" },
                      { label: "Arial Black", value: "Arial Black" },
                      { label: "Helvetica", value: "Helvetica" },
                      { label: "Verdana", value: "Verdana" },
                      { label: "Tahoma", value: "Tahoma" },
                      { label: "Trebuchet MS", value: "Trebuchet MS" },
                      { label: "Georgia", value: "Georgia" },
                      { label: "Times New Roman", value: "Times New Roman" },
                      { label: "Garamond", value: "Garamond" },
                      { label: "Palatino Linotype", value: "Palatino Linotype" },
                      { label: "Courier New", value: "Courier New" },
                      { label: "Lucida Sans", value: "Lucida Sans" },
                      { label: "Impact", value: "Impact" },
                      { label: "Comic Sans MS", value: "Comic Sans MS" },
                      { label: "Inter", value: "Inter, Arial, sans-serif" },
                      { label: "Roboto", value: "Roboto, Arial, sans-serif" },
                      { label: "Montserrat", value: "Montserrat, Arial, sans-serif" },
                      { label: "Poppins", value: "Poppins, Arial, sans-serif" },
                      { label: "Open Sans", value: "Open Sans, Arial, sans-serif" },
                      { label: "Lato", value: "Lato, Arial, sans-serif" },
                      { label: "Oswald", value: "Oswald, Arial, sans-serif" },
                      { label: "Playfair Display", value: "Playfair Display, Georgia, serif" },
                      { label: "Caveat Brush ✦", value: '"Caveat Brush", cursive' },
                      { label: "Bebas Neue", value: "Bebas Neue, Impact, sans-serif" },
                      { label: "Caveat Brush ✦", value: '"Caveat Brush", cursive' },
                    ].map((font) => (
                      <button key={font.value} type="button" onClick={() => updateSelectedStyle({ fontFamily: font.value })}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${selectedStyle.fontFamily === font.value ? "border-white/60 bg-white/10 text-white" : "border-transparent bg-transparent text-white/75 hover:border-white/20 hover:bg-white/5 hover:text-white"}`}
                        aria-pressed={selectedStyle.fontFamily === font.value}>
                        <span style={{ fontFamily: font.value }} className="text-sm">{font.label}</span>
                        <span style={{ fontFamily: font.value }} className="max-w-[55%] truncate text-xs text-white/45">Aa Qahwa</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-4 text-white/45">Clique sur une police : l’aperçu sur l’affiche change immédiatement. La liste reste ouverte pour comparer les styles.</p>

                </div>



                <div>

                  <div className="mb-2 flex items-center justify-between">

                    <label className="text-[9px] uppercase tracking-[0.14em] text-white/40">

                      Taille

                    </label>



                    <span className="text-[10px] text-white/50">

                      {

                        selectedStyle.fontSize

                      }{" "}

                      px

                    </span>

                  </div>



                  <input

                    type="range"

                    min="10"

                    max="100"

                    value={

                      selectedStyle.fontSize

                    }

                    onChange={(event) =>

                      updateSelectedStyle({

                        fontSize:

                          Number(

                            event.target

                              .value

                          ),

                      })

                    }

                    className="w-full accent-[#FFFFFF]"

                  />

                </div>



                <div>

                  <label className="mb-2 block text-[9px] uppercase tracking-[0.14em] text-white/40">

                    Épaisseur

                  </label>



                  <StudioDarkSelect
                    value={String(selectedStyle.fontWeight)}
                    onChange={(value) => updateSelectedStyle({ fontWeight: Number(value) })}
                    options={[
                      { label: "Normal", value: "400" },
                      { label: "Medium", value: "500" },
                      { label: "Semi-bold", value: "600" },
                      { label: "Bold", value: "700" },
                      { label: "Extra-bold", value: "800" },
                    ]}
                  />

                </div>



                <div>

                  <label className="mb-2 block text-[9px] uppercase tracking-[0.14em] text-white/40">

                    Alignement

                  </label>



                  <div className="grid grid-cols-3 gap-2">

                    {(

                      [

                        "left",

                        "center",

                        "right",

                      ] as TextAlign[]

                    ).map(

                      (align) => (

                        <button

                          key={align}

                          type="button"

                          onClick={() =>

                            updateSelectedStyle(

                              {

                                textAlign:

                                  align,

                              }

                            )

                          }

                          className={`rounded-lg border px-3 py-2 text-[9px] uppercase ${

                            selectedStyle.textAlign ===

                            align

                              ? "border-[#FFFFFF] bg-[#FFFFFF]/10 text-[#FFFFFF]"

                              : "border-white/10 bg-[#101010] text-white/50"

                          }`}

                        >

                          {align ===

                          "left"

                            ? "Gauche"

                            : align ===

                                "center"

                              ? "Centre"

                              : "Droite"}

                        </button>

                      )

                    )}

                  </div>

                </div>

              </div>

            </details>



            {/* ================= POSITION ================= */}

            <details className="overflow-hidden rounded-xl border border-white/10 bg-transparent">

              <summary className="cursor-pointer list-none px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">

                <div className="flex items-center justify-between">

                  <span>POSITION</span>

                  <span className="text-white/35">

                    +

                  </span>

                </div>

              </summary>



              <div className="space-y-4 border-t border-white/5 px-4 pb-4 pt-4">

                <div>

                  <div className="mb-2 flex items-center justify-between">

                    <label className="text-[9px] uppercase tracking-[0.14em] text-white/40">

                      Horizontal

                    </label>



                    <span className="text-[10px] text-white/50">

                      {Math.round(

                        selectedPosition.x

                      )}

                      %

                    </span>

                  </div>



                  <input

                    type="range"

                    min="0"

                    max="84"

                    step="0.5"

                    value={

                      selectedPosition.x

                    }

                    onChange={(event) =>

                      updateSelectedPosition({

                        x: Number(

                          event.target.value

                        ),

                      })

                    }

                    className="w-full accent-[#FFFFFF]"

                  />

                </div>



                <div>

                  <div className="mb-2 flex items-center justify-between">

                    <label className="text-[9px] uppercase tracking-[0.14em] text-white/40">

                      Vertical

                    </label>



                    <span className="text-[10px] text-white/50">

                      {Math.round(

                        selectedPosition.y

                      )}

                      %

                    </span>

                  </div>



                  <input

                    type="range"

                    min="0"

                    max="94"

                    step="0.5"

                    value={

                      selectedPosition.y

                    }

                    onChange={(event) =>

                      updateSelectedPosition({

                        y: Number(

                          event.target.value

                        ),

                      })

                    }

                    className="w-full accent-[#FFFFFF]"

                  />

                </div>



                <button

                  type="button"

                  onClick={

                    resetSelectedPosition

                  }

                  className="w-full rounded-lg border border-white/10 bg-[#101010] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/55 transition hover:border-[#FFFFFF] hover:text-[#FFFFFF]"

                >

                  Réinitialiser la position

                </button>

              </div>

            </details>



            {/* ================= COULEUR ================= */}

            <details className="overflow-hidden rounded-xl border border-white/10 bg-transparent">

              <summary className="cursor-pointer list-none px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">

                <div className="flex items-center justify-between">

                  <span>COULEUR</span>

                  <span className="text-white/35">

                    +

                  </span>

                </div>

              </summary>



              <div className="space-y-4 border-t border-white/5 px-4 pb-4 pt-4">

                <div>

                  <label className="mb-2 block text-[9px] uppercase tracking-[0.14em] text-white/40">

                    Couleur du texte

                  </label>



                  <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#101010] p-2">

                    <input

                      type="color"

                      value={

                        selectedStyle.color

                      }

                      onChange={(event) =>

                        updateSelectedStyle({

                          color:

                            event.target

                              .value,

                        })

                      }

                      className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"

                    />



                    <span className="text-xs uppercase text-white/60">

                      {

                        selectedStyle.color

                      }

                    </span>

                  </div>

                </div>



                <div className="grid grid-cols-5 gap-2">

                  {[

                    "#FFFFFF",

                    "#000000",

                    "#FFFFFF",

                    "#FFF3E8",

                    "#9A9A9A",

                  ].map(

                    (color) => (

                      <button

                        key={color}

                        type="button"

                        onClick={() =>

                          updateSelectedStyle(

                            { color }

                          )

                        }

                        className="h-8 rounded border border-white/10"

                        style={{

                          backgroundColor:

                            color,

                        }}

                        aria-label={

                          color

                        }

                      />

                    )

                  )}

                </div>

              </div>

            </details>



              </>
            )}

            {activeTab === "images" && (
              <>
            {/* ================= HERO ================= */}

            <details className="overflow-hidden rounded-xl border border-white/10 bg-transparent">

              <summary className="cursor-pointer list-none px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">

                <div className="flex items-center justify-between">

                  <span>HERO</span>

                  <span className="text-white/35">

                    +

                  </span>

                </div>

              </summary>



              <div className="space-y-3 border-t border-white/5 px-4 pb-4 pt-4">

                <input

                  ref={heroInputRef}

                  type="file"

                  accept="image/*"

                  onChange={

                    handleImageChange

                  }

                  className="hidden"

                />



                <button

                  type="button"

                  onClick={() =>

                    heroInputRef.current?.click()

                  }

                  className="w-full rounded-lg border border-white/10 bg-[#101010] px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60 transition hover:border-[#FFFFFF] hover:text-[#FFFFFF]"

                >

                  {heroImage

                    ? "Changer l'image"

                    : "Ajouter une image"}

                </button>



                {heroImage && (

                  <div className="relative overflow-hidden rounded-lg border border-white/10">

                    <img

                      src={heroImage}

                      alt=""

                      className="h-32 w-full object-cover"

                    />



                    <button

                      type="button"

                      onClick={() =>

                        setHeroImage(

                          null

                        )

                      }

                      className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[8px] uppercase text-white/70 hover:text-white"

                    >

                      Supprimer

                    </button>

                  </div>

                )}

              </div>

            </details>



            <details className="overflow-hidden rounded-xl border border-white/10 bg-transparent" open>
              <summary className="cursor-pointer list-none px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white"><div className="flex items-center justify-between"><span>IMAGES SUPPLÉMENTAIRES</span><span className="text-white/35">+</span></div></summary>
              <div className="space-y-3 border-t border-white/5 px-4 pb-4 pt-4">
                <input ref={extraImagesInputRef} type="file" accept="image/*" multiple onChange={handleExtraImagesChange} className="hidden" />
                <button type="button" onClick={() => extraImagesInputRef.current?.click()} className="w-full rounded-lg bg-white px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-black hover:bg-white/85">+ Ajouter une ou plusieurs images</button>
                <p className="text-[10px] leading-4 text-white/40">Chaque image ajoutée apparaît sur l’affiche. Déplace-la directement avec la souris ou le doigt.</p>
                {customLayers.filter((layer) => layer.type === "image").map((layer, index) => <div key={layer.id} className={`flex items-center gap-2 rounded-lg border p-2 ${selectedLayerId === layer.id ? "border-[#FFFFFF]" : "border-white/10"}`}><button type="button" onClick={() => setSelectedLayerId(layer.id)} className="min-w-0 flex-1 truncate text-left text-xs text-white">Image supplémentaire {index + 1}</button><button type="button" onClick={() => { setCustomLayers((layers) => layers.filter((item) => item.id !== layer.id)); setLayerOrder((order) => order.filter((id) => id !== layer.id)); if (selectedLayerId === layer.id) setSelectedLayerId(null); }} className="rounded px-2 py-1 text-xs text-white/50 hover:bg-white/10 hover:text-white">Supprimer</button></div>)}
              </div>
            </details>

            {/* ================= LOGO ================= */}

            <details className="overflow-hidden rounded-xl border border-white/10 bg-transparent">

              <summary className="cursor-pointer list-none px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">

                <div className="flex items-center justify-between">

                  <span>LOGO</span>

                  <span className="text-white/35">

                    +

                  </span>

                </div>

              </summary>



              <div className="space-y-4 border-t border-white/5 px-4 pb-4 pt-4">

                <input

                  ref={logoInputRef}

                  type="file"

                  accept="image/*"

                  onChange={

                    handleLogoChange

                  }

                  className="hidden"

                />



                <button

                  type="button"

                  onClick={() =>

                    logoInputRef.current?.click()

                  }

                  className="w-full rounded-lg border border-white/10 bg-[#101010] px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60 transition hover:border-[#FFFFFF] hover:text-[#FFFFFF]"

                >

                  {logoImage

                    ? "Changer le logo"

                    : "Ajouter le logo"}

                </button>



                {logoImage && (

                  <div className="flex items-center justify-center rounded-lg border border-white/10 bg-[#101010] p-4">

                    <img

                      src={logoImage}

                      alt=""

                      className="max-h-20 max-w-full object-contain"

                    />

                  </div>

                )}

                {logoImage && (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setSelectedLayerId("logo")} className="rounded-lg border border-white/15 bg-transparent px-3 py-2.5 text-[10px] font-semibold text-white hover:bg-white/10">Sélectionner le logo</button>
                    <button type="button" onClick={() => { setLogoImage(null); setSelectedLayerId(null); }} className="rounded-lg border border-red-400/30 bg-transparent px-3 py-2.5 text-[10px] font-semibold text-red-300 hover:bg-red-500/10">Supprimer le logo</button>
                    <button type="button" onClick={() => moveLayerOrder("logo", "down")} className="rounded-lg border border-white/15 bg-transparent px-3 py-2.5 text-[10px] font-semibold text-white/75 hover:bg-white/10">Envoyer derrière</button>
                    <button type="button" onClick={() => moveLayerOrder("logo", "up")} className="rounded-lg border border-white/15 bg-transparent px-3 py-2.5 text-[10px] font-semibold text-white/75 hover:bg-white/10">Mettre devant</button>
                  </div>
                )}

                <div>

                  <div className="mb-2 flex items-center justify-between">

                    <label className="text-[9px] uppercase tracking-[0.14em] text-white/40">

                      Taille

                    </label>



                    <span className="text-[10px] text-white/50">

                      {logoSize} px

                    </span>

                  </div>



                  <input

                    type="range"

                    min="30"

                    max="180"

                    value={logoSize}

                    onChange={(event) =>

                      setLogoSize(

                        Number(

                          event.target.value

                        )

                      )

                    }

                    className="w-full accent-[#FFFFFF]"

                  />

                </div>



                <div>

                  <div className="mb-2 flex items-center justify-between">

                    <label className="text-[9px] uppercase tracking-[0.14em] text-white/40">

                      Transparence

                    </label>

                    <span className="text-[10px] text-white/50">{logoOpacity}%</span>

                  </div>

                  <input

                    type="range"

                    min="10"

                    max="100"

                    value={logoOpacity}

                    onChange={(event) => setLogoOpacity(Number(event.target.value))}

                    className="w-full accent-[#FFFFFF]"

                  />

                </div>



                <div className="space-y-3 rounded-xl border border-white/10 bg-transparent p-3">
                  <label className="block text-[10px] text-white/70">Position horizontale <span className="float-right tabular-nums">{Math.round(logoX)}%</span>
                    <input type="range" min="0" max="95" value={logoX} onChange={(event) => setLogoX(Number(event.target.value))} className="mt-2 w-full accent-white" />
                  </label>
                  <label className="block text-[10px] text-white/70">Position verticale <span className="float-right tabular-nums">{Math.round(logoY)}%</span>
                    <input type="range" min="0" max="96" value={logoY} onChange={(event) => setLogoY(Number(event.target.value))} className="mt-2 w-full accent-white" />
                  </label>
                </div>

                <div>

                  <label className="mb-2 block text-[9px] uppercase tracking-[0.14em] text-white/40">

                    Position prédéfinie

                  </label>



                  <select

                    value={logoPosition}

                    onChange={(event) => {
                      const position = event.target.value as LogoPosition;
                      setLogoPosition(position);
                      const positions: Record<LogoPosition, { x: number; y: number }> = {
                        "top-left": { x: 3, y: 3 },
                        "top-center": { x: 46, y: 3 },
                        "top-right": { x: 90, y: 3 },
                        "bottom-left": { x: 3, y: 88 },
                        "bottom-center": { x: 46, y: 88 },
                        "bottom-right": { x: 90, y: 88 },
                      };
                      setLogoX(positions[position].x);
                      setLogoY(positions[position].y);
                    }}

                    className="w-full rounded-lg border border-white/10 bg-[#101010] px-3 py-2.5 text-xs text-white [color-scheme:dark] accent-[#FFFFFF] outline-none focus:border-[#FFFFFF]"

                  >

                    <option className="bg-[#101010] text-white checked:bg-[#FFFFFF] checked:text-white" value="top-left">

                      Haut gauche

                    </option>



                    <option className="bg-[#101010] text-white checked:bg-[#FFFFFF] checked:text-white" value="top-center">

                      Haut centre

                    </option>



                    <option className="bg-[#101010] text-white checked:bg-[#FFFFFF] checked:text-white" value="top-right">

                      Haut droite

                    </option>



                    <option className="bg-[#101010] text-white checked:bg-[#FFFFFF] checked:text-white" value="bottom-left">

                      Bas gauche

                    </option>



                    <option className="bg-[#101010] text-white checked:bg-[#FFFFFF] checked:text-white" value="bottom-center">

                      Bas centre

                    </option>



                    <option className="bg-[#101010] text-white checked:bg-[#FFFFFF] checked:text-white" value="bottom-right">

                      Bas droite

                    </option>

                  </select>

                </div>

              </div>

            </details>



              </>
            )}

            {activeTab === "format" && (
              <>
            {/* ================= FORMAT ================= */}

            <details className="overflow-hidden rounded-xl border border-white/10 bg-transparent">

              <summary className="cursor-pointer list-none px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">

                <div className="flex items-center justify-between">

                  <span>FORMAT</span>

                  <span className="text-white/35">

                    +

                  </span>

                </div>

              </summary>



              <div className="space-y-3 border-t border-white/5 px-4 pb-4 pt-4">

                <div className="rounded-lg border border-white/10 bg-[#101010] p-3">

                  <p className="text-[9px] uppercase tracking-[0.14em] text-white/35">

                    Format

                  </p>



                  <p className="mt-1 text-xs text-white">

                    {data.format}

                  </p>

                </div>



                <div className="grid grid-cols-2 gap-3">

                  <div className="rounded-lg border border-white/10 bg-[#101010] p-3">

                    <p className="text-[9px] uppercase tracking-[0.14em] text-white/35">

                      Largeur

                    </p>



                    <p className="mt-1 text-xs text-white">

                      {data.width} px

                    </p>

                  </div>



                  <div className="rounded-lg border border-white/10 bg-[#101010] p-3">

                    <p className="text-[9px] uppercase tracking-[0.14em] text-white/35">

                      Hauteur

                    </p>



                    <p className="mt-1 text-xs text-white">

                      {data.height} px

                    </p>

                  </div>

                </div>



                <div className="rounded-lg border border-white/10 bg-[#101010] p-3">

                  <p className="text-[9px] uppercase tracking-[0.14em] text-white/35">

                    Ratio

                  </p>



                  <p className="mt-1 text-xs text-white">

                    {data.ratio ===

                    "aspect-[9/16]"

                      ? "9 : 16"

                      : "4 : 5"}

                  </p>

                </div>

              </div>

            </details>
              </>
            )}

            {activeTab === "formes" && (
              <div className="space-y-3">
                <details className="overflow-hidden rounded-xl border border-white/10 bg-transparent">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-xs font-semibold text-white">
                    <span>Options avancées : avant / arrière</span>
                    <span className="text-[10px] font-normal text-white/40">Calques +</span>
                  </summary>
                  <div className="border-t border-white/5 p-4">
                    <p className="mb-3 text-[10px] leading-4 text-white/45">Pour faire passer un élément devant ou derrière un autre, ouvre cette section.</p>
                  <div className="space-y-1.5">
                    {[...layerOrder].reverse().map((id) => {
                      const index = layerOrder.indexOf(id);
                      const isCustom = customLayers.some((layer) => layer.id === id);
                      const isText = id.startsWith("text:");
                      const available = id === "background" || id === "overlay" ||
                        (id === "logo" && !!logoImage) ||
                        (isText && data.fields.includes(id.slice(5) as TextElement)) || isCustom;
                      if (!available) return null;
                      return (
                        <div key={id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#101010] p-2">
                          <span className="w-5 shrink-0 text-center text-[9px] text-white/35">{index + 1}</span>
                          <span className="min-w-0 flex-1 truncate text-[10px] text-white/80">{getLayerLabel(id)}</span>
                          <button type="button" aria-label={`Envoyer ${getLayerLabel(id)} derrière`} onClick={() => moveLayerOrder(id, "down")} disabled={index === 0} className="rounded border border-white/10 px-2 py-1 text-[10px] text-white/70 hover:border-[#FFFFFF] hover:text-[#FFFFFF] disabled:opacity-25">↓</button>
                          <button type="button" aria-label={`Amener ${getLayerLabel(id)} devant`} onClick={() => moveLayerOrder(id, "up")} disabled={index === layerOrder.length - 1} className="rounded border border-white/10 px-2 py-1 text-[10px] text-white/70 hover:border-[#FFFFFF] hover:text-[#FFFFFF] disabled:opacity-25">↑</button>
                        </div>
                      );
                    })}
                  </div>
                  </div>
                </details>
                <div className="rounded-xl border border-white/10 bg-[#1B1B1B] p-4">
                  <div className="mb-3 flex items-center gap-2"><span className="text-lg text-[#FFFFFF]">◇</span><h2 className="text-xs font-semibold uppercase tracking-[0.12em]">Ajouter une forme</h2></div>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => addShape("rectangle")} className="rounded-lg border border-white/10 bg-[#101010] px-2 py-3 text-[10px] text-white/80 transition hover:border-[#FFFFFF] hover:text-[#FFFFFF]">▰ Rectangle</button>
                    <button type="button" onClick={() => addShape("circle")} className="rounded-lg border border-white/10 bg-[#101010] px-2 py-3 text-[10px] text-white/80 transition hover:border-[#FFFFFF] hover:text-[#FFFFFF]">● Cercle</button>
                    <button type="button" onClick={() => addShape("line")} className="rounded-lg border border-white/10 bg-[#101010] px-2 py-3 text-[10px] text-white/80 transition hover:border-[#FFFFFF] hover:text-[#FFFFFF]">━ Ligne</button>
                  </div>
                  <p className="mt-3 text-[10px] leading-4 text-white/45">Choisis une forme pour l’ajouter. Clique ensuite dessus dans l’aperçu ou dans la liste pour modifier sa couleur, sa taille, sa position ou sa transparence. Un rectangle peut couvrir toute l’affiche.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#1B1B1B] p-4">
                  <div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-[0.12em]">Éléments ajoutés</h2><span className="text-[10px] text-white/40">{customLayers.length}</span></div>
                  {customLayers.length === 0 ? <p className="text-xs text-white/40">Ajoute une forme, une image ou un texte pour commencer.</p> : <div className="space-y-2">{customLayers.map((layer, index) => <div key={layer.id} className={`flex items-center gap-2 rounded-lg border p-2 ${selectedLayerId === layer.id ? "border-[#FFFFFF] bg-[#FFFFFF]/5" : "border-white/10"}`}><button type="button" onClick={() => setSelectedLayerId(layer.id)} className="min-w-0 flex-1 truncate text-left text-xs text-white">{layer.type === "text" ? `Texte : ${layer.text || "Sans texte"}` : layer.type === "image" ? `Image ${index + 1}` : `Forme : ${layer.shape === "rectangle" ? "Rectangle" : layer.shape === "circle" ? "Cercle" : "Ligne"}`}</button><button type="button" onClick={() => { setCustomLayers((layers) => layers.filter((item) => item.id !== layer.id)); setLayerOrder((order) => order.filter((id) => id !== layer.id)); if (selectedLayerId === layer.id) setSelectedLayerId(null); }} className="rounded px-2 py-1 text-[10px] text-white/50 hover:bg-white/10 hover:text-white">✕</button></div>)}</div>}
                </div>
                {selectedLayer && (
                  <div className="space-y-4 rounded-xl border border-[#FFFFFF]/40 bg-[#1B1B1B] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#FFFFFF]">Modifier la sélection</h2>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => moveLayerOrder(selectedLayer.id, "down")} disabled={layerOrder.indexOf(selectedLayer.id) <= 0} className="rounded-md border border-white/10 bg-[#101010] px-2 py-1.5 text-[9px] text-white/70 hover:border-[#FFFFFF] hover:text-[#FFFFFF] disabled:cursor-not-allowed disabled:opacity-30">← Derrière</button>
                        <button type="button" onClick={() => moveLayerOrder(selectedLayer.id, "up")} disabled={layerOrder.indexOf(selectedLayer.id) === layerOrder.length - 1} className="rounded-md border border-white/10 bg-[#101010] px-2 py-1.5 text-[9px] text-white/70 hover:border-[#FFFFFF] hover:text-[#FFFFFF] disabled:cursor-not-allowed disabled:opacity-30">Devant →</button>
                      </div>
                    </div>
                    {selectedLayer.type === "text" && <div><label className="mb-2 block text-[9px] uppercase tracking-[0.14em] text-white/40">Contenu du texte</label><textarea rows={2} value={selectedLayer.text ?? ""} onChange={(event) => updateCustomLayer(selectedLayer.id, { text: event.target.value })} className="w-full rounded-lg border border-white/10 bg-[#101010] px-3 py-2 text-xs text-white outline-none focus:border-[#FFFFFF]" /></div>}
                    {selectedLayer.type === "text" && <div className="space-y-3 rounded-lg border border-white/10 bg-[#101010] p-3">
                      <div>
                        <label className="mb-2 block text-[9px] uppercase tracking-[0.14em] text-white/40">Famille de police</label>
                        <StudioDarkSelect
                          value={selectedLayer.fontFamily ?? "Inter, Arial, sans-serif"}
                          onChange={(value) => updateCustomLayer(selectedLayer.id, { fontFamily: value })}
                          options={[
                            { label: "Inter", value: "Inter, Arial, sans-serif" },
                            { label: "Roboto", value: "Roboto, Arial, sans-serif" },
                            { label: "Montserrat", value: "Montserrat, Arial, sans-serif" },
                            { label: "Poppins", value: "Poppins, Arial, sans-serif" },
                            { label: "Open Sans", value: "Open Sans, Arial, sans-serif" },
                            { label: "Lato", value: "Lato, Arial, sans-serif" },
                            { label: "Oswald", value: "Oswald, Arial, sans-serif" },
                            { label: "Playfair Display", value: "Playfair Display, Georgia, serif" },
                            { label: "Caveat Brush ✦", value: '"Caveat Brush", cursive' },
                            { label: "Bebas Neue", value: "Bebas Neue, Impact, sans-serif" },
                            { label: "Caveat Brush ✦", value: '"Caveat Brush", cursive' },
                            { label: "Arial", value: "Arial" },
                            { label: "Georgia", value: "Georgia" },
                            { label: "Impact", value: "Impact" },
                          ]}
                        />
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between"><label className="text-[9px] uppercase tracking-[0.14em] text-white/40">Taille du texte</label><span className="text-[10px] text-white/50">{selectedLayer.fontSize ?? 40} px</span></div>
                        <input type="range" min="12" max="160" value={selectedLayer.fontSize ?? 40} onChange={(event) => updateCustomLayer(selectedLayer.id, { fontSize: Number(event.target.value) })} className="w-full accent-[#FFFFFF]" />
                      </div>
                      <div>
                        <label className="mb-2 block text-[9px] uppercase tracking-[0.14em] text-white/40">Épaisseur du texte</label>
                        <StudioDarkSelect
                          value={String(selectedLayer.fontWeight ?? 700)}
                          onChange={(value) => updateCustomLayer(selectedLayer.id, { fontWeight: Number(value) })}
                          options={[
                            { label: "Normal", value: "400" },
                            { label: "Medium", value: "500" },
                            { label: "Semi-bold", value: "600" },
                            { label: "Bold", value: "700" },
                            { label: "Extra-bold", value: "800" },
                          ]}
                        />
                      </div>
                    </div>}
                    {selectedLayer.type !== "image" && <div><label className="mb-2 block text-[9px] uppercase tracking-[0.14em] text-white/40">Couleur</label><input type="color" value={selectedLayer.color} onChange={(event) => updateCustomLayer(selectedLayer.id, { color: event.target.value })} className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-[#101010] p-1" /></div>}
                    <div><div className="mb-2 flex items-center justify-between"><label className="text-[9px] uppercase tracking-[0.14em] text-white/40">Transparence</label><span className="text-[10px] text-white/50">{selectedLayer.opacity}%</span></div><input type="range" min="10" max="100" value={selectedLayer.opacity} onChange={(event) => updateCustomLayer(selectedLayer.id, { opacity: Number(event.target.value) })} className="w-full accent-[#FFFFFF]" /></div>
                    <div><div className="mb-2 flex items-center justify-between"><label className="text-[9px] uppercase tracking-[0.14em] text-white/40">Largeur</label><span className="text-[10px] text-white/50">{Math.round(selectedLayer.width)}%</span></div><input type="range" min="1" max="100" value={selectedLayer.width} onChange={(event) => updateCustomLayer(selectedLayer.id, { width: Number(event.target.value), x: Math.min(selectedLayer.x, 100 - Number(event.target.value)) })} className="w-full accent-[#FFFFFF]" /></div>
                    {selectedLayer.type !== "text" && <div><div className="mb-2 flex items-center justify-between"><label className="text-[9px] uppercase tracking-[0.14em] text-white/40">Hauteur</label><span className="text-[10px] text-white/50">{Math.round(selectedLayer.height)}%</span></div><input type="range" min="1" max="100" value={selectedLayer.height} onChange={(event) => updateCustomLayer(selectedLayer.id, { height: Number(event.target.value), y: Math.min(selectedLayer.y, 100 - Number(event.target.value)) })} className="w-full accent-[#FFFFFF]" /></div>}
                    <div className="grid grid-cols-2 gap-3">
                      <div><div className="mb-2 flex items-center justify-between"><label className="text-[9px] uppercase tracking-[0.14em] text-white/40">Position X</label><span className="text-[10px] text-white/50">{Math.round(selectedLayer.x)}%</span></div><input type="range" min="0" max={Math.max(0, 100 - selectedLayer.width)} value={selectedLayer.x} onChange={(event) => updateCustomLayer(selectedLayer.id, { x: Number(event.target.value) })} className="w-full accent-[#FFFFFF]" /></div>
                      <div><div className="mb-2 flex items-center justify-between"><label className="text-[9px] uppercase tracking-[0.14em] text-white/40">Position Y</label><span className="text-[10px] text-white/50">{Math.round(selectedLayer.y)}%</span></div><input type="range" min="0" max={Math.max(0, 100 - selectedLayer.height)} value={selectedLayer.y} onChange={(event) => updateCustomLayer(selectedLayer.id, { y: Number(event.target.value) })} className="w-full accent-[#FFFFFF]" /></div>
                    </div>
                    {selectedLayer.type === "shape" && selectedLayer.shape === "rectangle" && <button type="button" onClick={() => updateCustomLayer(selectedLayer.id, { x: 0, y: 0, width: 100, height: 100, opacity: selectedLayer.opacity })} className="w-full rounded-lg border border-[#FFFFFF]/40 bg-[#FFFFFF]/10 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#FFFFFF] hover:bg-[#FFFFFF]/20">Étendre sur toute l’affiche</button>}
                    <button type="button" onClick={() => { setCustomLayers((layers) => layers.filter((item) => item.id !== selectedLayer.id)); setLayerOrder((order) => order.filter((id) => id !== selectedLayer.id)); setSelectedLayerId(null); }} className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-red-300 hover:bg-red-500/20">Supprimer cet élément</button>
                  </div>
                )}
              </div>
            )}

          </div>

        </aside>

      </div>

    </div>

  );

}