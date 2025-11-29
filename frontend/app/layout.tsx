import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layouts/site-header";
import { siteConfig } from "@/lib/utils/site-config";
import { Toaster } from "sonner";
import WalletProvider from "@/lib/provider/walletProvider";
import { SolanaProvider } from "@/lib/provider/SolanaProvider";
import { Providers } from "@/lib/store/providers";
import { AuthProvider } from "@/lib/auth";
import ConditionalBanner from "@/components/ConditionalBanner";
import Script from "next/script";
import TurnkeyClientProvider from "@/components/providers/TurnkeyClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Improve font loading performance
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "Cross-Chain DeFi",
    "Intent Finance",
    "AI-Powered DeFi",
    "Blockchain Automation",
    "Solana DeFi",
    "Ethereum DeFi",
    "Self Protocol",
    "Hyperlane",
    "Circle USDC",
    "Decentralized Finance",
    "Smart Contract Automation",
    "Multi-Chain Finance",
    "Yield Farming",
    "Liquidity Management",
    "DeFi Analytics",
    "Web3 Finance",
    "Cryptocurrency Trading",
    "Blockchain Integration",
    "Financial Technology",
    "Crypto Portfolio Management",
  ],
  authors: [
    {
      name: siteConfig.creator,
      url: siteConfig.url,
    },
  ],
  creator: siteConfig.creator,
  publisher: siteConfig.creator,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: siteConfig.url,
    languages: {
      "en-US": siteConfig.url,
      "x-default": siteConfig.url,
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: `${siteConfig.url}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    creator: "@AptoPilotnance",
    images: [`${siteConfig.url}/twitter-image.jpg`],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  category: "technology",
  classification: "DeFi, Blockchain, Finance, Technology",
  other: {
    "application-name": siteConfig.name,
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "theme-color": "#FA4C15",
    "color-scheme": "dark light",
    "supported-color-schemes": "dark light",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Structured data for organization
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    name: "AptoPilot",
    description:
      "AI-powered intent finance platform that transforms how users interact with decentralized finance across multiple blockchains",
    url: siteConfig.url,
    logo: {
      "@type": "ImageObject",
      url: `${siteConfig.url}/logo.svg`,
      width: 60,
      height: 60,
    },
    sameAs: [siteConfig.links.twitter, siteConfig.links.github],
    founders: [
      {
        "@type": "Person",
        name: "AptoPilot Team",
      },
    ],
    foundingDate: "2025",
    areaServed: "Worldwide",
    knowsAbout: [
      "Decentralized Finance",
      "Blockchain Technology",
      "Smart Contracts",
      "Cross-Chain Integration",
      "AI-Powered Finance",
    ],
    serviceType: "Financial Technology",
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/logo.svg`,
      },
    },
  };

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://api.coingecko.com" />
        <link rel="preconnect" href="https://ipapi.co" />

        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//googletagmanager.com" />

        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen custom-gradient`}
      >
        {/* Skip to main content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-[#FA4C15] text-white px-4 py-2 z-50"
        >
          Skip to main content
        </a>

        <Providers>
          <TurnkeyClientProvider>
            <AuthProvider>
            <Toaster position="top-right" richColors closeButton />
            <WalletProvider>
              <SolanaProvider>
                <ConditionalBanner>
                  <div className="relative flex min-h-screen flex-col mx-10">
                    <div className="h-10"></div>
                    <SiteHeader />
                    <main id="main-content" className="flex-1">
                      {children}
                    </main>
                  </div>
                </ConditionalBanner>
              </SolanaProvider>
            </WalletProvider>
            </AuthProvider>
          </TurnkeyClientProvider>
        </Providers>

        {/* Performance monitoring script */}
        <Script
          id="performance-observer"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                  for (const entry of list.getEntries()) {
                    if (entry.entryType === 'largest-contentful-paint') {
                      console.log('LCP:', entry.startTime);
                    }
                    if (entry.entryType === 'first-input') {
                      console.log('FID:', entry.processingStart - entry.startTime);
                    }
                    if (entry.entryType === 'layout-shift') {
                      if (!entry.hadRecentInput) {
                        console.log('CLS:', entry.value);
                      }
                    }
                  }
                });
                observer.observe({entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift']});
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
