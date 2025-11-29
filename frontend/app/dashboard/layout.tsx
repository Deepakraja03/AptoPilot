import { metadata, dashboardStructuredData } from "./metadata";

export { metadata };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Dashboard-specific structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(dashboardStructuredData),
        }}
      />

      {/* Performance hints for dashboard assets */}
      <link
        rel="preload"
        href="/api/dashboard/metrics"
        as="fetch"
        crossOrigin="anonymous"
      />
      <link rel="preconnect" href="https://api.coingecko.com" />
      <link rel="dns-prefetch" href="//api.coingecko.com" />

      {children}
    </>
  );
}
