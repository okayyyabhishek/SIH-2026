import type { Metadata, Viewport } from "next";
import { Noto_Sans, Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import React from "react";

const notoSans = Noto_Sans({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-noto-sans",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Sentinel NER | राष्ट्रीय भूस्खलन पूर्व चेतावनी मंच | National Landslide Early Warning Platform",
    template: "%s | Sentinel NER — National Landslide Early Warning Platform",
  },
  description:
    "Multi-hazard landslide early warning, risk management, and operational intervention platform for Northeast India. An initiative under the Government of India for disaster resilience and infrastructure protection.",
  applicationName: "Sentinel NER",
  authors: [{ name: "Government of India — Disaster Resilience Consortium" }],
  keywords: [
    "landslide", "early warning system", "LEWS", "Mizoram", "Northeast India",
    "disaster management", "NDMA", "GSI", "geospatial", "government of india",
    "भूस्खलन", "पूर्व चेतावनी", "आपदा प्रबंधन",
  ],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#003580",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`light ${notoSans.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem('sentinel_theme');
                if (saved === 'dark' || saved === 'high-contrast') {
                  document.documentElement.classList.remove('light');
                  document.documentElement.classList.add(saved);
                } else {
                  document.documentElement.classList.remove('dark', 'high-contrast');
                  document.documentElement.classList.add('light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="bg-[#F8FAFC] dark:bg-[#030712] text-slate-900 dark:text-slate-100 min-h-screen font-sans antialiased selection:bg-blue-100 selection:text-gov-blue">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
