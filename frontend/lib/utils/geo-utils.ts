// Utility functions for geolocation and international features

export interface GeoLocation {
  country: string;
  city: string;
  region: string;
  timezone: string;
  ip: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
}

// Get country flag emoji from country code
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode === "XX") return "🌍";

  try {
    return countryCode
      .toUpperCase()
      .replace(/./g, (char) =>
        String.fromCodePoint(127397 + char.charCodeAt(0))
      );
  } catch {
    return "🌍";
  }
}

// Get time-based greeting
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Get localized time format
export function getLocalizedTime(timezone?: string): string {
  try {
    return new Date().toLocaleString("en-US", {
      timeZone: timezone || "UTC",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date().toLocaleString();
  }
}

// Check if country is in restricted list (for compliance)
export function isRestrictedCountry(countryCode: string): boolean {
  const restrictedCountries: string[] = [
    // Add any countries that have restrictions
    // Example: 'KP', 'IR', etc.
  ];
  return restrictedCountries.includes(countryCode.toUpperCase());
}

// Get continent from country code
export function getContinent(countryCode: string): string {
  const continentMap: Record<string, string> = {
    // Europe
    DE: "Europe",
    FR: "Europe",
    IT: "Europe",
    ES: "Europe",
    GB: "Europe",
    NL: "Europe",
    CH: "Europe",
    AT: "Europe",
    BE: "Europe",
    SE: "Europe",
    NO: "Europe",
    DK: "Europe",
    FI: "Europe",
    IE: "Europe",
    PT: "Europe",

    // North America
    US: "North America",
    CA: "North America",
    MX: "North America",

    // Asia
    CN: "Asia",
    JP: "Asia",
    KR: "Asia",
    IN: "Asia",
    SG: "Asia",
    HK: "Asia",
    TW: "Asia",
    TH: "Asia",
    VN: "Asia",
    MY: "Asia",

    // Oceania
    AU: "Oceania",
    NZ: "Oceania",

    // South America
    BR: "South America",
    AR: "South America",
    CL: "South America",
    CO: "South America",
    PE: "South America",

    // Africa
    ZA: "Africa",
    NG: "Africa",
    EG: "Africa",
    MA: "Africa",
    KE: "Africa",
  };

  return continentMap[countryCode.toUpperCase()] || "Unknown";
}

// Generate geo-specific welcome message
export function generateWelcomeMessage(location: GeoLocation): string {
  const greeting = getTimeBasedGreeting();
  const flag = getCountryFlag(location.countryCode);
  const continent = getContinent(location.countryCode);

  const messages = [
    `${greeting} from ${location.city}, ${location.country}! ${flag}`,
    `Welcome to AptoPilot, developer from ${location.country}! ${flag}`,
    `${greeting}! Ready to bootstrap your wallet in ${location.country}? ${flag}`,
    `Hello from the ${continent} region! Welcome to AptoPilot ${flag}`,
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

// Calculate distance between two geo points (optional feature)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Detect user's preferred language from location
export function getPreferredLanguage(countryCode: string): string {
  const languageMap: Record<string, string> = {
    US: "en-US",
    GB: "en-GB",
    CA: "en-CA",
    DE: "de-DE",
    FR: "fr-FR",
    ES: "es-ES",
    IT: "it-IT",
    PT: "pt-PT",
    BR: "pt-BR",
    JP: "ja-JP",
    KR: "ko-KR",
    CN: "zh-CN",
    RU: "ru-RU",
    IN: "hi-IN",
    AR: "ar-SA",
  };

  return languageMap[countryCode.toUpperCase()] || "en-US";
}

// Format currency based on location
export function formatCurrencyByLocation(
  amount: number,
  countryCode: string
): string {
  const locale = getPreferredLanguage(countryCode);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD", // Default to USD for crypto
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

// Check if it's business hours in user's timezone
export function isBusinessHours(timezone?: string): boolean {
  try {
    const now = new Date();
    const userTime = new Date(
      now.toLocaleString("en-US", { timeZone: timezone || "UTC" })
    );
    const hour = userTime.getHours();
    return hour >= 9 && hour < 17; // 9 AM to 5 PM
  } catch {
    return true; // Default to always available
  }
}

// Get regional compliance message
export function getComplianceMessage(countryCode: string): string | null {
  const euCountries = [
    "DE",
    "FR",
    "IT",
    "ES",
    "NL",
    "BE",
    "AT",
    "SE",
    "DK",
    "FI",
    "IE",
    "PT",
    "GR",
    "LU",
    "MT",
    "CY",
    "SI",
    "SK",
    "EE",
    "LV",
    "LT",
    "PL",
    "CZ",
    "HU",
    "HR",
    "RO",
    "BG",
  ];

  if (euCountries.includes(countryCode.toUpperCase())) {
    return "This service complies with GDPR regulations. Your data is processed securely.";
  }

  return null;
}

// Generate SEO keywords based on location
export function generateLocalizedKeywords(location: GeoLocation): string[] {
  const baseKeywords = [
    "testnet faucet",
    "free crypto tokens",
    "ISOL faucet",
    "Solana testnet",
    "DeFi development",
  ];

  const locationKeywords = [
    `crypto faucet ${location.country}`,
    `blockchain development ${location.city}`,
    `Solana faucet ${location.country}`,
    `testnet tokens ${location.region}`,
  ];

  return [...baseKeywords, ...locationKeywords];
}
