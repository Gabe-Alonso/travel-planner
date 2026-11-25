import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wayfarers – plan trips with friends",
  description: "Vote on destinations, collect places to go, and compare places to stay with your crew.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script adds the `dark` class before React hydrates
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
