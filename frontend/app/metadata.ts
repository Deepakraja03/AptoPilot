import { Metadata } from "next";
import { siteConfig } from "@/lib/utils/site-config";

export const homeMetadata: Metadata = {
  title: "AI-Powered DeFi Intent Engine | Turn Words into Web3 Actions",
  description:
    "AptoPilot transforms natural language into automated, gasless, cross-chain DeFi strategies. Experience the future of decentralized finance with AI-powered intent execution.",
  keywords: [
    "AI DeFi",
    "Intent Engine",
    "Cross-Chain DeFi",
    "Automated Trading",
    "Natural Language DeFi",
    "Gasless Transactions",
    "Web3 AI Assistant",
    "DeFi Automation",
    "Smart Contract Execution",
    "Blockchain AI",
    "Decentralized Finance AI",
    "Multi-Chain Finance",
    "Intent-Based Trading",
    "DeFi Strategy Automation",
    "Crypto Portfolio Management",
  ],
  openGraph: {
    title: "AptoPilot - AI-Powered DeFi Intent Engine",
    description:
      "Turn natural language into automated, gasless, cross-chain DeFi strategies with AptoPilot's revolutionary AI engine.",
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: `${siteConfig.url}/og-home.jpg`,
        width: 1200,
        height: 630,
        alt: "AptoPilot - AI-Powered DeFi Intent Engine",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AptoPilot - AI-Powered DeFi Intent Engine",
    description:
      "Turn natural language into automated, gasless, cross-chain DeFi strategies.",
    creator: "@AptoPilotnance",
    images: [`${siteConfig.url}/twitter-home.jpg`],
  },
  alternates: {
    canonical: siteConfig.url,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const homeStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AptoPilot",
  description:
    "AI-powered intent engine for DeFi that turns natural language into automated, gasless, cross-chain strategies",
  url: siteConfig.url,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free to use DeFi automation platform",
  },
  creator: {
    "@type": "Organization",
    name: "AptoPilot Team",
    url: siteConfig.url,
  },
  featureList: [
    "Natural Language Processing for DeFi",
    "Cross-Chain Strategy Execution",
    "Gasless Transactions",
    "AI-Powered Trade Automation",
    "Multi-Blockchain Support",
    "Real-time Portfolio Analytics",
  ],
  screenshot: `${siteConfig.url}/app-screenshot.jpg`,
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "150",
  },
};
