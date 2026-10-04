import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DIG-viewer",
  description:
    "Digital assets viewer for 3d game development files — images, 3d models, audio, video",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
