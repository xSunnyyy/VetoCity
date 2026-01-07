import "./globals.css";

export const metadata = {
  title: "Veto City",
  description: "Sleeper fantasy football league hub",
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
