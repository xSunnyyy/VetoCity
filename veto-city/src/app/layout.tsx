import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veto City - Fantasy Football Hub",
  description: "Your comprehensive fantasy football league dashboard powered by Sleeper",
  applicationName: "Veto City",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Veto City",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-layout="SRC_APP_LAYOUT">
      <body className="bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
