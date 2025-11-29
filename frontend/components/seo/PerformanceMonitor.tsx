"use client";

import { useEffect } from "react";
import { webVitalsConfig } from "@/lib/utils/performance-config";

// Type definitions for Web Vitals
interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
}

interface WindowWithGtag extends Window {
  gtag?: (
    command: string,
    action: string,
    parameters: Record<string, unknown>
  ) => void;
}

/**
 * Performance monitoring component for Core Web Vitals
 * Tracks and reports performance metrics to improve SEO
 */
export function PerformanceMonitor() {
  useEffect(() => {
    // Only run in production and if performance APIs are available
    if (
      process.env.NODE_ENV !== "production" ||
      typeof window === "undefined"
    ) {
      return;
    }

    // Check if Performance Observer is supported
    if (!("PerformanceObserver" in window)) {
      console.warn("PerformanceObserver not supported");
      return;
    }

    try {
      // Monitor Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const lcp = entry.startTime;
          console.log("LCP:", lcp);

          // Report to analytics if LCP is above threshold
          if (lcp > webVitalsConfig.lcpThreshold) {
            // Could send to Google Analytics, Sentry, etc.
            console.warn(`LCP above threshold: ${lcp}ms`);
          }
        }
      });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });

      // Monitor First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as PerformanceEventTiming;
          const fid = fidEntry.processingStart - fidEntry.startTime;
          console.log("FID:", fid);

          if (fid > webVitalsConfig.fidThreshold) {
            console.warn(`FID above threshold: ${fid}ms`);
          }
        }
      });
      fidObserver.observe({ entryTypes: ["first-input"] });

      // Monitor Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const clsEntry = entry as LayoutShiftEntry;
          // Only count layout shifts without recent input
          if (!clsEntry.hadRecentInput) {
            clsValue += clsEntry.value;
          }
        }

        console.log("CLS:", clsValue);

        if (clsValue > webVitalsConfig.clsThreshold) {
          console.warn(`CLS above threshold: ${clsValue}`);
        }
      });
      clsObserver.observe({ entryTypes: ["layout-shift"] });

      // Monitor First Contentful Paint (FCP)
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") {
            const fcp = entry.startTime;
            console.log("FCP:", fcp);

            if (fcp > webVitalsConfig.fcpThreshold) {
              console.warn(`FCP above threshold: ${fcp}ms`);
            }
          }
        }
      });
      fcpObserver.observe({ entryTypes: ["paint"] });

      // Clean up observers on unmount
      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
        fcpObserver.disconnect();
      };
    } catch (error) {
      console.error("Error setting up performance monitoring:", error);
    }
  }, []);

  // This component doesn't render anything
  return null;
}

/**
 * Hook for tracking custom performance metrics
 */
export function usePerformanceMetrics() {
  useEffect(() => {
    // Mark when React component is mounted
    if (typeof window !== "undefined" && "performance" in window) {
      performance.mark("react-component-mounted");
    }
  }, []);

  const trackCustomMetric = (name: string, value: number) => {
    if (typeof window !== "undefined" && "performance" in window) {
      performance.mark(name);
      console.log(`Custom metric ${name}:`, value);

      // Could send to analytics service
      // gtag('event', 'custom_metric', { name, value });
    }
  };

  return { trackCustomMetric };
}

/**
 * SEO performance tracking for specific actions
 */
export function trackSEOEvent(action: string, category: string = "SEO") {
  if (typeof window !== "undefined") {
    // Track with Google Analytics if available
    if ("gtag" in window) {
      (window as WindowWithGtag).gtag?.("event", action, {
        event_category: category,
        event_label: window.location.pathname,
      });
    }

    // Console log for development
    console.log(`SEO Event: ${category} - ${action}`);
  }
}
