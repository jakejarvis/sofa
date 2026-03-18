import { ImageResponse } from "@takumi-rs/image-response";
import { notFound } from "next/navigation";

import { getPageImage, source } from "@/lib/source";

export const revalidate = false;

async function loadFont(family: string, weight: number): Promise<ArrayBuffer> {
  const params = new URLSearchParams({
    family: `${family}:wght@${weight}`,
    display: "swap",
  });
  const css = await fetch(`https://fonts.googleapis.com/css2?${params}`, {
    headers: {
      // Old user-agent to get TrueType format (not woff2)
      "User-Agent":
        "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
    },
  }).then((res) => res.text());

  const url = css.match(/src: url\((.+?)\)/)?.[1];
  if (!url) throw new Error(`Could not load font: ${family} ${weight}`);
  return fetch(url).then((res) => res.arrayBuffer());
}

const fonts = Promise.all([
  loadFont("DM Sans", 400),
  loadFont("DM Sans", 500),
  loadFont("DM Serif Display", 400),
]);

// oklch(0.13 0.006 55)  → background
const BG = "#090706";
// oklch(0.93 0.015 80)  → foreground
const FG = "#ede7dd";
// oklch(0.8 0.14 65)    → primary / amber accent
const PRIMARY = "#fba952";
// oklch(0.63 0.02 80)   → muted foreground
const MUTED = "#90887c";

export async function GET(_req: Request, { params }: RouteContext<"/og/docs/[...slug]">) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  const [dmSans, dmSansMedium, dmSerif] = await fonts;
  const { title, description } = page.data;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "60px 80px",
        backgroundColor: BG,
        backgroundImage: `radial-gradient(ellipse at 80% 0%, rgba(180, 140, 50, 0.07) 0%, transparent 50%)`,
        fontFamily: "DM Sans",
        color: FG,
        border: `1px solid rgba(236, 231, 223, 0.08)`,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <svg width="28" height="28" viewBox="0 0 24 24">
          <title>Sofa Logo</title>
          <path
            fill={PRIMARY}
            d="M7 12v1h10v-1a3 3 0 0 1 2.993-3a4.6 4.6 0 0 0-.07-.78a4 4 0 0 0-3.143-3.143C16.394 5 15.93 5 15 5H9c-.93 0-1.394 0-1.78.077A4 4 0 0 0 4.077 8.22a4.6 4.6 0 0 0-.07.78A3 3 0 0 1 7 12"
          />
          <path
            fill={PRIMARY}
            d="M18.444 18H5.556a3.6 3.6 0 0 1-.806-.092V19a.75.75 0 0 1-1.5 0v-1.849A3.55 3.55 0 0 1 2 14.444V12a2 2 0 1 1 4 0v1.2a.8.8 0 0 0 .8.8h10.4a.8.8 0 0 0 .8-.8V12a2 2 0 1 1 4 0v2.444a3.55 3.55 0 0 1-1.25 2.707V19a.75.75 0 0 1-1.5 0v-1.092a3.6 3.6 0 0 1-.806.092"
          />
        </svg>
        <span
          style={{
            fontSize: "20px",
            fontWeight: 500,
            color: PRIMARY,
            letterSpacing: "0.02em",
          }}
        >
          Sofa
        </span>
      </div>

      {/* Title + description */}
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          gap: "20px",
        }}
      >
        <div
          style={{
            fontFamily: "DM Serif Display",
            fontSize: title.length > 30 ? 56 : 68,
            fontWeight: 400,
            lineHeight: 1.1,
            color: FG,
          }}
        >
          {title}
        </div>
        {description ? (
          <div style={{ fontSize: "24px", lineHeight: 1.5, color: MUTED }}>{description}</div>
        ) : null}
      </div>

      {/* Accent bar */}
      <div
        style={{
          display: "flex",
          width: "120px",
          height: "3px",
          borderRadius: "2px",
          background: PRIMARY,
        }}
      />
    </div>,
    {
      width: 1200,
      height: 630,
      format: "webp",
      fonts: [
        { name: "DM Sans", data: dmSans, weight: 400 as const },
        { name: "DM Sans", data: dmSansMedium, weight: 500 as const },
        { name: "DM Serif Display", data: dmSerif, weight: 400 as const },
      ],
    },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImage(page).segments,
  }));
}
