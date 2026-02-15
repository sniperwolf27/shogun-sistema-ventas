import type { Metadata } from 'next';
import './globals.css';
import { GlassProvider } from '@/components/providers/GlassProvider';

export const metadata: Metadata = {
  title: 'Shogun Dashboard',
  description: 'Modern glass morphism dashboard for Shogun clothing store',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-950 relative overflow-x-hidden min-h-screen">
        {/* Aurora Background - Static gradients */}
        <div className="aurora-bg" />

        {/* Noise Overlay */}
        <div className="noise-overlay" />

        {/* Glass Budget Provider - Max 3 blur surfaces */}
        <GlassProvider maxBlurSurfaces={3}>{children}</GlassProvider>
      </body>
    </html>
  );
}
