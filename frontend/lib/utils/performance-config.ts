/**
 * Performance optimization utilities for AptoPilot
 * Helps improve Core Web Vitals scores
 */

// Critical resource hints for better performance
export const performanceConfig = {
  // DNS prefetch for external APIs
  dnsPrefetch: [
    "//api.coingecko.com",
    "//ipapi.co",
    "//ipinfo.io",
    "//fonts.googleapis.com",
    "//fonts.gstatic.com",
    "//www.google-analytics.com",
    "//googletagmanager.com",
    "//api.1inch.dev",
    "//api.0x.org",
    "//api.dexscreener.com",
  ],

  // Preconnect for critical third-party origins
  preconnect: [
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    "https://api.coingecko.com",
    "https://ipapi.co",
  ],

  // Preload critical assets
  preload: [
    {
      href: "/logo.svg",
      as: "image",
      type: "image/svg+xml",
    },
    {
      href: "/sounds/cha-ching.mp3",
      as: "audio",
      type: "audio/mpeg",
    },
  ],

  // Resource hints for specific pages
  pageSpecific: {
    faucet: {
      preconnect: ["https://ipapi.co", "https://ipinfo.io"],
      preload: ["/sounds/cha-ching.mp3"],
    },
    swap: {
      preconnect: ["https://api.1inch.dev", "https://api.0x.org"],
      dnsPrefetch: ["//api.dexscreener.com"],
    },
    dashboard: {
      preconnect: ["https://api.coingecko.com"],
      dnsPrefetch: ["//api.etherscan.io"],
    },
  },
};

// Core Web Vitals monitoring
export const webVitalsConfig = {
  // Largest Contentful Paint (LCP) - should be < 2.5s
  lcpThreshold: 2500,

  // First Input Delay (FID) - should be < 100ms
  fidThreshold: 100,

  // Cumulative Layout Shift (CLS) - should be < 0.1
  clsThreshold: 0.1,

  // First Contentful Paint (FCP) - should be < 1.8s
  fcpThreshold: 1800,

  // Time to Interactive (TTI) - should be < 3.8s
  ttiThreshold: 3800,
};

// SEO optimization settings
export const seoConfig = {
  // Default meta tags that should be on every page
  defaultMeta: {
    viewport: "width=device-width, initial-scale=1, maximum-scale=5",
    charset: "utf-8",
    "theme-color": "#ADFEB9",
    "color-scheme": "dark light",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },

  // JSON-LD structured data templates
  structuredData: {
    organization: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "AptoPilot",
      url: "https://intentifi.com",
      logo: "https://intentifi.com/logo.svg",
      description: "AI-powered DeFi automation platform",
      foundingDate: "2024",
      industry: "Decentralized Finance",
    },
    website: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "AptoPilot",
      url: "https://intentifi.com",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://intentifi.com/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  },

  // Open Graph defaults
  openGraph: {
    type: "website",
    locale: "en_US",
    site_name: "AptoPilot",
    images: {
      default: "/og-default.jpg",
      home: "/og-home.jpg",
      faucet: "/og-faucet.jpg",
      dashboard: "/og-dashboard.jpg",
      swap: "/og-swap.jpg",
      intent: "/og-intent.jpg",
    },
  },

  // Twitter Card defaults
  twitter: {
    card: "summary_large_image",
    site: "@AptoPilot",
    creator: "@AptoPilot",
  },
};

// Image optimization settings
export const imageConfig = {
  // Next.js Image component defaults
  defaults: {
    quality: 85,
    format: "webp",
    sizes: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  },

  // Responsive image breakpoints
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1536,
  },

  // Critical images that should be prioritized
  critical: ["/logo.svg", "/hero-bg.jpg", "/app/assets/orb.svg"],
};

export type PerformanceConfig = typeof performanceConfig;
export type WebVitalsConfig = typeof webVitalsConfig;
export type SEOConfig = typeof seoConfig;
export type ImageConfig = typeof imageConfig;
