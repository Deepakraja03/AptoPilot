import { Metadata } from "next";
import { siteConfig } from "@/lib/utils/site-config";

export const metadata: Metadata = {
  title: "Intent Creation | Natural Language DeFi Automation | IntentiFi",
  description:
    "Create automated DeFi strategies using natural language. Tell IntentiFi what you want to achieve and let AI execute complex cross-chain transactions for you.",
  keywords: [
    "Intent Creation",
    "Natural Language DeFi",
    "DeFi Automation",
    "AI Trading",
    "Smart Contract Automation",
    "Cross-Chain Intents",
    "Automated Trading Strategies",
    "DeFi Intent Engine",
    "Blockchain Automation",
    "Voice-to-DeFi",
    "AI-Powered Trading",
    "Gasless DeFi",
    "Intent-Based Finance",
    "DeFi Strategy Builder",
    "Automated Yield Strategies",
    "Natural Language Blockchain",
    "DeFi Command Interface",
    "AI Financial Assistant",
  ],
  openGraph: {
    title: "IntentiFi Intent Creation - Natural Language DeFi Automation",
    description:
      "Create automated DeFi strategies using simple natural language commands. AI-powered cross-chain execution made simple.",
    url: `${siteConfig.url}/intent`,
    siteName: siteConfig.name,
    images: [
      {
        url: `${siteConfig.url}/og-intent.jpg`,
        width: 1200,
        height: 630,
        alt: "IntentiFi Intent Creation - Natural Language DeFi",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create DeFi Intents with Natural Language | IntentiFi",
    description:
      "Turn your DeFi ideas into automated strategies using simple commands.",
    creator: "@IntentiFinance",
    images: [`${siteConfig.url}/twitter-intent.jpg`],
  },
  alternates: {
    canonical: `${siteConfig.url}/intent`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const intentStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "IntentiFi Intent Engine",
  description:
    "Natural language interface for creating automated DeFi strategies",
  url: `${siteConfig.url}/intent`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web Browser",
  featureList: [
    "Natural Language Processing",
    "Intent Recognition",
    "Automated Strategy Creation",
    "Cross-Chain Execution",
    "Real-time Strategy Monitoring",
    "Risk Management",
    "Gasless Transactions",
  ],
  userInteractionType: "Natural Language Input",
  browserRequirements: "Modern web browser with Web3 support",
  audience: {
    "@type": "Audience",
    audienceType: "DeFi Users, Crypto Traders, Blockchain Developers",
  },
  provider: {
    "@type": "Organization",
    name: "IntentiFi",
    url: siteConfig.url,
  },
  potentialAction: {
    "@type": "UseAction",
    object: {
      "@type": "WebApplication",
      name: "Create DeFi Intent",
    },
    description: "Create automated DeFi strategies using natural language",
  },
};
