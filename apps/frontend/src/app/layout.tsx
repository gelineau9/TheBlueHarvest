import type React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { Banner } from '@/components/banner';
import { DashboardLayout } from '@/components/dashboard-layout';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Brandy Hall Archives - Your RP Portal to Middle-earth',
  description: 'A community for Lord of the Rings roleplayers and storytellers',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} flex min-h-screen flex-col bg-[#f5e6c8]`}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            {/*
              Banner is a Server Component that renders the full-bleed hero.
              It contains ProfileButton (client) as a leaf — safe here.
            */}
            <Banner />

            {/*
              DashboardLayout is a Client Component that owns the three-column
              shell (left sidebar · main · right sidebar). Sidebars persist
              across every route because they live here in RootLayout, not in
              individual pages.
            */}
            <DashboardLayout>{children}</DashboardLayout>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
