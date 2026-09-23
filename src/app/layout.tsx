import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PIN & TELL Administration",
    template: "%s | PIN & TELL",
  },

  description:
    "PIN & TELL administration and platform management system.",

  applicationName:
    "PIN & TELL Administration",

  robots: {
    index: false,
    follow: false,
  },
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