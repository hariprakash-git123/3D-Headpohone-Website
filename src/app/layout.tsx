import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { preload } from "react-dom";
import { SITE_URL } from "@/lib/site";
import {
  getSequenceFramePath,
  SMALL_FRAMES_MEDIA_QUERY,
} from "@/lib/sequenceStore";
import "./globals.css";

// Self-hosted at build time: no render-blocking request to Google, no layout shift.
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

const TITLE = "boAt Rockerz 440 — Sound. Without Limits.";
const DESCRIPTION =
  "Meet boAt Rockerz 440 wireless headphones. Experience a scroll-driven 3D interactive look at the design, comfort, and engineering behind your sound.";
const OG_IMAGE = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "boAt Rockerz 440 wireless headphones on a dark studio background",
};

if (!SITE_URL && process.env.NODE_ENV === "production") {
  console.warn(
    "[metadata] NEXT_PUBLIC_SITE_URL is not set: canonical URL and social share image tags are omitted."
  );
}

// Social crawlers need absolute URLs, so URL-dependent tags are only emitted when SITE_URL is known.
export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: TITLE,
  description: DESCRIPTION,
  alternates: SITE_URL ? { canonical: "/" } : undefined,
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    ...(SITE_URL ? { url: "/", images: [OG_IMAGE] } : {}),
  },
  twitter: {
    card: SITE_URL ? "summary_large_image" : "summary",
    title: TITLE,
    description: DESCRIPTION,
    ...(SITE_URL ? { images: [OG_IMAGE.url] } : {}),
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Start fetching the hero frame before JS runs. The media queries mirror pickFrameVariant(),
  // so the runtime loader reuses this response instead of downloading the frame again.
  preload(getSequenceFramePath(1, "sm"), {
    as: "image",
    media: SMALL_FRAMES_MEDIA_QUERY,
    fetchPriority: "high",
  });
  preload(getSequenceFramePath(1, "lg"), {
    as: "image",
    media: "(min-width: 768px)",
    fetchPriority: "high",
  });

  return (
    <html lang="en" className={`dark bg-obsidian ${inter.variable}`}>
      <body className="font-sans antialiased bg-obsidian text-white selection:bg-boatRed/35 selection:text-white">
        {children}
      </body>
    </html>
  );
}
