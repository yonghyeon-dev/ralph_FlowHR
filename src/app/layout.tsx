import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SkipLink } from "@/components/a11y/SkipLink";
import { LiveRegionProvider } from "@/components/a11y/LiveRegion";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FlowHR",
  description: "HR Management Platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AuthProvider>
          <I18nProvider>
            <LiveRegionProvider>
              <SkipLink />
              {children}
            </LiveRegionProvider>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
