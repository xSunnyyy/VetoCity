import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { QueryProvider } from "./components/QueryProvider";
import { ToastProvider } from "./components/ui";
import ThemeToggle from "./components/ThemeToggle";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

// Runs before hydration so a returning visitor's saved light-mode choice
// applies before first paint — otherwise the page would flash dark (the
// default) and then snap to light a moment later.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    if (localStorage.getItem("vetocity-theme") === "light") {
      document.documentElement.classList.add("light");
    }
  } catch (e) {}
})();
`;

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
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
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
      <body className="bg-zinc-950 light:bg-white text-zinc-100 light:text-zinc-900">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ThemeToggle />
        <ServiceWorkerRegister />
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
