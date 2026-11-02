import type { Metadata, Viewport } from "next";

import "./globals.css";

/**
 * PIN & TELL — shared root layout
 * File: src/app/layout.tsx
 *
 * This layout serves BOTH the public website and the private admin application.
 * Do not add public navigation, animations, or authentication redirects here:
 * those belong to their respective pages/layouts.
 */

const siteUrl = new URL("https://pin-and-tell-webadmin.vercel.app");

const siteDescription =
  "Discover community-shared places, follow your journeys, log fuel activity, " +
  "and explore smarter with PIN & TELL, the community-powered Android app.";

export const metadata: Metadata = {
  metadataBase: siteUrl,

  // Each public page can provide its own full, branded title.
  // A string here avoids requiring a title template (and avoids duplicate branding).
  title: "PIN & TELL | Every Place Has a Story",

  description: siteDescription,
  applicationName: "PIN & TELL",
  category: "travel",

  icons: {
    icon: {
      url: "/images/pin-tell-logo.png",
      type: "image/png",
    },
    apple: "/images/pin-tell-logo.png",
  },

  openGraph: {
    type: "website",
    locale: "en_PH",
    siteName: "PIN & TELL",
    title: "PIN & TELL | Every Place Has a Story",
    description: siteDescription,
    images: [
      {
        url: "/images/pin-tell-logo.png",
        alt: "PIN & TELL logo",
      },
    ],
  },

  // Preserved: shared default indexing rule, until admin/public routing is separated.
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#72213A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
