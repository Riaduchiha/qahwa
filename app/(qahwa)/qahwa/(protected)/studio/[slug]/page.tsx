"use client";



import { useParams, useRouter } from "next/navigation";

import { useRef, useState } from "react";



type TextElement =

  | "title"

  | "subtitle"

  | "description"

  | "price"

  | "date";



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

    color: "#FF6B00",

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



export default function StudioEditorPage() {

    const [activeTab, setActiveTab] = useState<

    "texte" | "images" | "formes" | "format"

  >("texte");

  const params = useParams();

  const router = useRouter();



  const canvasRef = useRef<HTMLDivElement>(null);

  const heroInputRef = useRef<HTMLInputElement>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);



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

  const [logoImage, setLogoImage] = useState<string | null>(null);



  const [logoSize, setLogoSize] = useState(80);

  const [logoOpacity, setLogoOpacity] = useState(100);

  const [logoPosition, setLogoPosition] =

    useState<LogoPosition>("top-right");



  const [selectedElement, setSelectedElement] =

    useState<TextElement>("title");



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

        className={`z-20 cursor-move select-none whitespace-pre-wrap ${

          isSelected

            ? "rounded border border-dashed border-[#FF6B00] px-2 py-1"

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

      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0D0D0D] px-3 py-3 sm:px-5">

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

              <span className="h-2 w-2 rounded-full bg-[#FF6B00]" />



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



          <button

            type="button"

            onClick={handleDownload}

            className="rounded-lg bg-[#FF6B00] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-black transition hover:bg-[#ff812b]"

          >

            Télécharger

          </button>

        </div>

      </header>



      {/* WORKSPACE */}

      <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">

        {/* CANVAS */}

        <main className="flex min-w-0 flex-1 items-center justify-center overflow-auto bg-[#090909] p-3 sm:p-6 lg:p-8">

          <div

            className="flex min-h-full w-full items-center justify-center"

            style={{

              backgroundImage:

                "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",

              backgroundSize:

                "24px 24px",

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

                  className="absolute inset-0 h-full w-full object-cover"

                />

              ) : (

                <div className="absolute inset-0 bg-gradient-to-br from-[#1b1b1b] via-[#111111] to-[#090909]" />

              )}



              {/* OVERLAY */}

              <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/20 to-black/85" />



              {/* LOGO */}

              {logoImage && (

                <img

                  src={logoImage}

                  alt=""

                  className={`absolute z-20 object-contain ${logoPositionClass[logoPosition]}`}

                  style={{

                    width: `${(logoSize / 1080) * 100}cqw`,

                    opacity: logoOpacity / 100,

                  }}

                />

              )}



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

        </main>



        {/* PANNEAU */}

        <aside className="w-full shrink-0 overflow-y-auto border-t border-white/10 bg-[#121212] p-3 sm:p-4 lg:max-h-[calc(100vh-4rem)] lg:w-[380px] lg:border-l lg:border-t-0">

                    <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-[#0D0D0D] p-1">

            {[

              { id: "texte", label: "Texte", icon: "T" },

              { id: "images", label: "Images", icon: "▧" },

              { id: "formes", label: "Formes", icon: "◇" },

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

                className={`flex flex-col items-center gap-1 rounded-lg px-1 py-3 text-[10px] transition ${

                  activeTab === tab.id

                    ? "bg-[#FF6B00]/15 text-[#FF6B00]"

                    : "text-white/45 hover:bg-white/5 hover:text-white"

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

              className="overflow-hidden rounded-xl border border-[#2E2E2E] bg-[#1B1B1B]"

              open

            >

              <summary className="cursor-pointer list-none px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">

                <div className="flex items-center justify-between">

                  <span>CONTENU</span>

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

                        className="w-full resize-none rounded-lg border border-white/10 bg-[#101010] px-3 py-2.5 text-xs text-white outline-none transition placeholder:text-white/20 focus:border-[#FF6B00]"

                      />

                    </div>

                  )

                )}

              </div>

            </details>



            {/* ================= POLICE ================= */}

            <details className="overflow-hidden rounded-xl border border-[#2E2E2E] bg-[#1B1B1B]">

              <summary className="cursor-pointer list-none px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">

                <div className="flex items-center justify-between">

                  <span>POLICE</span>

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



                  <select

                    value={selectedElement}

                    onChange={(event) =>

                      setSelectedElement(

                        event.target

                          .value as TextElement

                      )

                    }

                    className="w-full rounded-lg border border-white/10 bg-[#101010] px-3 py-2.5 text-xs text-white outline-none focus:border-[#FF6B00]"

                  >

                    {data.fields.map(

                      (field) => (

                        <option

                          key={field}

                          value={field}

                        >

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

                        </option>

                      )

                    )}

                  </select>

                </div>



                <div>

                  <label className="mb-2 block text-[9px] uppercase tracking-[0.14em] text-white/40">

                    Famille

                  </label>



                  <select

                    value={

                      selectedStyle.fontFamily

                    }

                    onChange={(event) =>

                      updateSelectedStyle({

                        fontFamily:

                          event.target.value,

                      })

                    }

                    className="w-full rounded-lg border border-white/10 bg-[#101010] px-3 py-2.5 text-xs text-white outline-none focus:border-[#FF6B00]"

                  >

                    <option value="Arial">

                      Arial

                    </option>

                    <option value="Helvetica">

                      Helvetica

                    </option>

                    <option value="Georgia">

                      Georgia

                    </option>

                    <option value="Times New Roman">

                      Times New Roman

                    </option>

                    <option value="Verdana">

                      Verdana

                    </option>

                  </select>

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

                    className="w-full accent-[#FF6B00]"

                  />

                </div>



                <div>

                  <label className="mb-2 block text-[9px] uppercase tracking-[0.14em] text-white/40">

                    Épaisseur

                  </label>



                  <select

                    value={

                      selectedStyle.fontWeight

                    }

                    onChange={(event) =>

                      updateSelectedStyle({

                        fontWeight:

                          Number(

                            event.target

                              .value

                          ),

                      })

                    }

                    className="w-full rounded-lg border border-white/10 bg-[#101010] px-3 py-2.5 text-xs text-white outline-none focus:border-[#FF6B00]"

                  >

                    <option value="400">

                      Normal

                    </option>

                    <option value="500">

                      Medium

                    </option>

                    <option value="600">

                      Semi-bold

                    </option>

                    <option value="700">

                      Bold

                    </option>

                    <option value="800">

                      Extra-bold

                    </option>

                  </select>

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

                              ? "border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]"

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

            <details className="overflow-hidden rounded-xl border border-[#2E2E2E] bg-[#1B1B1B]">

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

                    className="w-full accent-[#FF6B00]"

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

                    className="w-full accent-[#FF6B00]"

                  />

                </div>



                <button

                  type="button"

                  onClick={

                    resetSelectedPosition

                  }

                  className="w-full rounded-lg border border-white/10 bg-[#101010] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/55 transition hover:border-[#FF6B00] hover:text-[#FF6B00]"

                >

                  Réinitialiser la position

                </button>

              </div>

            </details>



            {/* ================= COULEUR ================= */}

            <details className="overflow-hidden rounded-xl border border-[#2E2E2E] bg-[#1B1B1B]">

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

                    "#FF6B00",

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

            <details className="overflow-hidden rounded-xl border border-[#2E2E2E] bg-[#1B1B1B]">

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

                  className="w-full rounded-lg border border-white/10 bg-[#101010] px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60 transition hover:border-[#FF6B00] hover:text-[#FF6B00]"

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



            {/* ================= LOGO ================= */}

            <details className="overflow-hidden rounded-xl border border-[#2E2E2E] bg-[#1B1B1B]">

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

                  className="w-full rounded-lg border border-white/10 bg-[#101010] px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60 transition hover:border-[#FF6B00] hover:text-[#FF6B00]"

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

                    className="w-full accent-[#FF6B00]"

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

                    className="w-full accent-[#FF6B00]"

                  />

                </div>



                <div>

                  <label className="mb-2 block text-[9px] uppercase tracking-[0.14em] text-white/40">

                    Position

                  </label>



                  <select

                    value={logoPosition}

                    onChange={(event) =>

                      setLogoPosition(

                        event.target

                          .value as LogoPosition

                      )

                    }

                    className="w-full rounded-lg border border-white/10 bg-[#101010] px-3 py-2.5 text-xs text-white outline-none focus:border-[#FF6B00]"

                  >

                    <option value="top-left">

                      Haut gauche

                    </option>



                    <option value="top-center">

                      Haut centre

                    </option>



                    <option value="top-right">

                      Haut droite

                    </option>



                    <option value="bottom-left">

                      Bas gauche

                    </option>



                    <option value="bottom-center">

                      Bas centre

                    </option>



                    <option value="bottom-right">

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

            <details className="overflow-hidden rounded-xl border border-[#2E2E2E] bg-[#1B1B1B]">

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
              <div className="rounded-xl border border-white/10 bg-[#1B1B1B] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg text-[#FF6B00]">◇</span>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.12em]">Formes</h2>
                </div>
                <p className="text-xs leading-5 text-white/50">
                  Le panneau des formes sera ajouté dans la prochaine étape.
                  Tu peux déjà utiliser les onglets Texte, Images et Format.
                </p>
              </div>
            )}

          </div>

        </aside>

      </div>

    </div>

  );

}