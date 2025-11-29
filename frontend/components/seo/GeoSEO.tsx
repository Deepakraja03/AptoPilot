"use client";

import { useEffect } from "react";

interface GeoSEOProps {
  pageName: string;
  pageDescription: string;
  location?: {
    country: string;
    city: string;
    countryCode: string;
  };
}

export function GeoSEO({ pageName, pageDescription, location }: GeoSEOProps) {
  useEffect(() => {
    // Add geo-specific structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `${pageName}${location ? ` - Available in ${location.country}` : ""}`,
      description: pageDescription,
      provider: {
        "@type": "Organization",
        name: "AptoPilot",
        url: "https://intentifi.xyz",
      },
      areaServed: location
        ? {
            "@type": "Country",
            name: location.country,
          }
        : "Worldwide",
      availableLanguage: "en",
      serviceType: "Cryptocurrency Faucet",
    };

    // Remove existing geo structured data
    const existingScript = document.querySelector("script[data-geo-seo]");
    if (existingScript) {
      existingScript.remove();
    }

    // Add new geo structured data
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-geo-seo", "true");
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    // Update page title with location if available
    if (location && typeof window !== "undefined") {
      const originalTitle = document.title;
      const newTitle = `${pageName} - Available in ${location.country} | AptoPilot`;
      document.title = newTitle;

      // Cleanup on unmount
      return () => {
        document.title = originalTitle;
        const currentScript = document.querySelector("script[data-geo-seo]");
        if (currentScript) {
          currentScript.remove();
        }
      };
    }
  }, [location, pageName, pageDescription]);

  return null;
}

// Hook for tracking page views with geo data
export function useGeoAnalytics(pageName: string) {
  useEffect(() => {
    const trackPageView = async () => {
      try {
        // Get basic geo info (you could use the same geo service as the faucet)
        const response = await fetch("https://ipapi.co/json/");
        const geoData = await response.json();

        // Track the page view
        await fetch("/api/analytics/page-view", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            page: pageName,
            country: geoData.country_name || "Unknown",
            city: geoData.city || "Unknown",
            countryCode: geoData.country_code || "XX",
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
          }),
        });
      } catch (error) {
        console.error("Error tracking page view:", error);
      }
    };

    trackPageView();
  }, [pageName]);
}
