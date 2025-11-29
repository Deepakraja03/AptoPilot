import type { Metadata } from "next";
import { siteConfig } from "./site-config";
import { seoConfig } from "./performance-config";

/**
 * SEO utilities for AptoPilot
 * Provides consistent metadata generation across pages
 */

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  path?: string;
  image?: string;
  noIndex?: boolean;
  structuredData?: object;
}

/**
 * Generate consistent metadata for pages
 */
export function generateMetadata({
  title,
  description,
  keywords = [],
  path = "",
  image,
  noIndex = false,
}: SEOProps): Metadata {
  const pageTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name;
  const pageDescription = description || siteConfig.description;
  const pageUrl = `${siteConfig.url}${path}`;
  const pageImage = image || seoConfig.openGraph.images.default;
  const fullImageUrl = pageImage.startsWith("http")
    ? pageImage
    : `${siteConfig.url}${pageImage}`;

  return {
    title: pageTitle,
    description: pageDescription,
    keywords: [...keywords],
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: pageUrl,
      siteName: siteConfig.name,
      images: [
        {
          url: fullImageUrl,
          width: 1200,
          height: 630,
          alt: pageTitle,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [fullImageUrl],
      creator: seoConfig.twitter.creator,
      site: seoConfig.twitter.site,
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      nocache: noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        noimageindex: noIndex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

/**
 * Generate JSON-LD structured data
 */
export function generateStructuredData(
  type: string,
  data: Record<string, unknown>
) {
  const baseData = {
    "@context": "https://schema.org",
    "@type": type,
    ...data,
  };

  return JSON.stringify(baseData);
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate FAQ structured data
 */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate WebApplication structured data
 */
export function generateWebAppSchema(appData: {
  name: string;
  description: string;
  url: string;
  features: string[];
  category?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: appData.name,
    description: appData.description,
    url: appData.url,
    applicationCategory: appData.category || "FinanceApplication",
    operatingSystem: "Web browser",
    featureList: appData.features,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    provider: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };
}

/**
 * Common SEO keywords for AptoPilot
 */
export const commonKeywords = [
  "AptoPilot",
  "DeFi",
  "decentralized finance",
  "blockchain",
  "cryptocurrency",
  "AI-powered",
  "intent-based",
  "cross-chain",
  "yield optimization",
  "automated trading",
  "smart contracts",
  "web3",
  "financial technology",
  "portfolio management",
];

/**
 * Page-specific keyword sets
 */
export const pageKeywords = {
  home: [
    ...commonKeywords,
    "DeFi automation",
    "AI trading",
    "yield farming",
    "portfolio analytics",
  ],
  faucet: [
    ...commonKeywords,
    "crypto faucet",
    "free tokens",
    "testnet tokens",
    "developer tools",
    "blockchain development",
  ],
  dashboard: [
    ...commonKeywords,
    "DeFi dashboard",
    "portfolio tracking",
    "yield analytics",
    "performance metrics",
  ],
  swap: [
    ...commonKeywords,
    "crypto swap",
    "token exchange",
    "DEX aggregator",
    "best rates",
    "slippage protection",
  ],
  intent: [
    ...commonKeywords,
    "intent execution",
    "automated strategies",
    "smart execution",
    "DeFi automation",
  ],
};

/**
 * Generate canonical URL
 */
export function generateCanonicalUrl(path: string = "") {
  return `${siteConfig.url}${path}`;
}

/**
 * Generate social sharing URLs
 */
export function generateSocialUrls(url: string, text: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  return {
    twitter: `https://x.com/intent_fi/tweet?url=${encodedUrl}&text=${encodedText}&via=AptoPilot`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
    telegram: `https://telegram.me/share/url?url=${encodedUrl}&text=${encodedText}`,
  };
}
