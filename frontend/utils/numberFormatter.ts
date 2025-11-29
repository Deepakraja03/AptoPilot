/**
 * Formats large numbers with K, M, B, T abbreviations
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with abbreviation
 */
export function formatLargeNumber(num: number, decimals: number = 1): string {
  if (num === 0) return "0";

  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  const abbreviations = [
    { value: 1e12, symbol: "T" }, // Trillion
    { value: 1e9, symbol: "B" }, // Billion
    { value: 1e6, symbol: "M" }, // Million
    { value: 1e3, symbol: "K" }, // Thousand
  ];

  for (const { value, symbol } of abbreviations) {
    if (absNum >= value) {
      const formatted = (absNum / value).toFixed(decimals);
      // Remove trailing zeros and decimal point if not needed
      const cleanFormatted = parseFloat(formatted).toString();
      return `${sign}${cleanFormatted}${symbol}`;
    }
  }

  // For numbers less than 1000, show with appropriate decimal places
  if (absNum < 1) {
    return `${sign}${absNum.toFixed(decimals)}`;
  } else if (absNum < 100) {
    return `${sign}${absNum.toFixed(2)}`;
  } else {
    return `${sign}${Math.round(absNum).toString()}`;
  }
}

/**
 * Formats numbers with locale-specific formatting and abbreviations
 * @param num - The number to format
 * @param locale - Locale string (default: 'en-US')
 * @param decimals - Number of decimal places for abbreviations
 * @returns Formatted string
 */
export function formatNumberWithLocale(
  num: number,
  locale: string = "en-US",
  decimals: number = 1
): string {
  if (num === 0) return "0";

  const absNum = Math.abs(num);

  // Use abbreviations for large numbers
  if (absNum >= 1000) {
    return formatLargeNumber(num, decimals);
  }

  // Use locale formatting for smaller numbers
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: absNum < 1 ? 4 : 2,
  }).format(num);
}
