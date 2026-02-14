import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { HeaderNav } from "@/components/header-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://guid.how"),
  title: {
    default: "Guid — Product guides for everything",
    template: "%s | Guid",
  },
  description:
    "Step-by-step assembly, setup, and troubleshooting guides for any product.",
  openGraph: {
    type: "website",
    siteName: "Guid",
    title: "Guid — Product guides for everything",
    description:
      "Step-by-step assembly, setup, and troubleshooting guides for any product.",
    url: "https://guid.how",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guid — Product guides for everything",
    description:
      "Step-by-step assembly, setup, and troubleshooting guides for any product.",
  },
  alternates: {
    canonical: "https://guid.how",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#e5932c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${ibmPlexSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <HeaderNav />
          <main id="main-content">
            {children}
          </main>
          <ServiceWorkerRegister />
          <PwaInstallPrompt />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
