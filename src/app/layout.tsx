import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "PIN&TELL Administration",
    template: "%s | PIN&TELL",
  },

  description:
    "PIN&TELL administration and platform management system.",

  applicationName:
    "PIN&TELL Administration",

  robots: {
    index: false,
    follow: false,
  },
};