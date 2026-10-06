import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "NIKHATU — Rooted in India. Ready for everywhere.",
  description: "Discover elevated everyday fashion for men, women, and kids. Thoughtfully designed in India. Shop oversized essentials, effortless layers, and your new favourites at NIKHATU.",
  applicationName: "NIKHATU",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
