import { Metadata } from "next";
import { siteConfig } from "@/lib/utils/site-config";

export const metadata: Metadata = {
  title:
    "DeFi Dashboard | Real-Time Portfolio Analytics & Cross-Chain Management",
  description:
    "Monitor your DeFi portfolio across multiple blockchains with real-time analytics, yield tracking, and automated strategy management on AptoPilot.",
  keywords: [
    "DeFi Dashboard",
    "Portfolio Analytics",
    "Cross-Chain Portfolio",
    "DeFi Analytics",
    "Yield Tracking",
    "Blockchain Portfolio",
    "Multi-Chain Assets",
    "DeFi Portfolio Management",
    "Real-Time Crypto Analytics",
    "Automated DeFi Strategies",
    "Liquidity Pool Analytics",
    "Yield Farming Dashboard",
    "DeFi Performance Metrics",
    "Cross-Chain Analytics",
    "Web3 Portfolio Tracker",
  ],
  openGraph: {
    title: "AptoPilot Dashboard - Real-Time DeFi Portfolio Analytics",
    description:
      "Monitor and manage your DeFi investments across multiple blockchains with advanced analytics and automated strategies.",
    url: `${siteConfig.url}/dashboard`,
    siteName: siteConfig.name,
    images: [
      {
        url: `${siteConfig.url}/og-dashboard.jpg`,
        width: 1200,
        height: 630,
        alt: "AptoPilot Dashboard - DeFi Portfolio Analytics",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AptoPilot Dashboard - Real-Time DeFi Analytics",
    description:
      "Monitor your DeFi portfolio across multiple blockchains with real-time analytics.",
    creator: "@AptoPilot",
    images: [`${siteConfig.url}/twitter-dashboard.jpg`],
  },
  alternates: {
    canonical: `${siteConfig.url}/dashboard`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const dashboardStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AptoPilot Dashboard",
  description: "Real-time DeFi portfolio analytics and management dashboard",
  url: `${siteConfig.url}/dashboard`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web Browser",
  featureList: [
    "Real-time Portfolio Tracking",
    "Cross-Chain Asset Management",
    "Yield Analytics",
    "Performance Metrics",
    "Automated Strategy Management",
    "Risk Assessment Tools",
  ],
  browserRequirements: "Requires Web3 wallet connection",
  softwareVersion: "1.0",
  provider: {
    "@type": "Organization",
    name: "AptoPilot",
    url: siteConfig.url,
  },
};
