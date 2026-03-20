import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "KatibAI - Professional AI Content Writing Tool",
  description:
    "Generate professional marketing content, emails, social media posts, and more with the power of AI. Save time and create compelling content instantly.",
  keywords: [
    "AI writing",
    "content generation",
    "copywriting",
    "marketing content",
    "AI tool",
  ],
  authors: [{ name: "KatibAI" }],
  openGraph: {
    title: "KatibAI - Professional AI Content Writing Tool",
    description:
      "Generate professional marketing content, emails, social media posts, and more with the power of AI.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
