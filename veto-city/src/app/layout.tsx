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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
