import type { Metadata } from 'next';
import './globals.css';
import { AssetProvider } from '@/app/context/AssetContext';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'DAM Resource Viewer',
  description: 'View Godot project assets',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AssetProvider>{children}</AssetProvider>
      </body>
    </html>
  );
}
