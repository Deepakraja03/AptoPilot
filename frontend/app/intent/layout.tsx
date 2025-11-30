import { metadata, intentStructuredData } from "./metadata";

export { metadata };

export default function IntentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Intent page structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(intentStructuredData),
        }}
      />

      {/* Preload AI/ML related resources */}
      <link rel="preconnect" href="https://api.openai.com" />
      <link rel="dns-prefetch" href="//api.openai.com" />

      {children}
    </>
  );
}
