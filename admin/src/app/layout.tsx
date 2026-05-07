import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AlbaGo Admin',
  description: 'Content and publishing control plane for AlbaGo MVP'
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
