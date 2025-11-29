export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  category: "market" | "defi" | "memecoin" | "regulation" | "technology";
  sentiment: "positive" | "negative" | "neutral";
  url?: string;
  imageUrl?: string;
}

export interface TwitterActivity {
  tweet_id: string;
  tweet: string;
  image?: string;
  post_type: string;
  created: string;
  user: {
    username: string;
    display_name: string;
    image: string;
    creator_address: string;
  };
  agent: {
    name: string;
    image: string;
    token_symbol: string;
    category: string;
    curve_address: string;
  };
  twitter_profile: string;
}

export interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  marketCap?: number;
  volume24h?: number;
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  } else if (price >= 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(price);
  } else {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 6,
      maximumFractionDigits: 8,
    }).format(price);
  }
}

export function formatPercentage(percentage: number): string {
  const sign = percentage >= 0 ? "+" : "";
  return `${sign}${percentage.toFixed(2)}%`;
}

export function getNewsEmoji(category: string): string {
  switch (category) {
    case "market":
      return "📈";
    case "defi":
      return "🏦";
    case "memecoin":
      return "🐸";
    case "regulation":
      return "⚖️";
    case "technology":
      return "🔧";
    default:
      return "📰";
  }
}

export function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case "positive":
      return "text-green-400";
    case "negative":
      return "text-red-400";
    case "neutral":
      return "text-gray-400";
    default:
      return "text-gray-400";
  }
}

export function formatTwitterActivity(activity: TwitterActivity): string {
  const timeAgo = new Date(activity.created).toLocaleString();
  return `🐦 ${activity.user.display_name} (@${activity.user.username}) - ${timeAgo}
${activity.tweet}
Token: ${activity.agent.token_symbol} | Type: ${activity.post_type}`;
}

export function getAgentCategoryEmoji(category: string): string {
  switch (category.toLowerCase()) {
    case "entertainment":
      return "🎭";
    case "finance":
      return "💰";
    case "technology":
      return "🔧";
    case "news":
      return "📰";
    case "social":
      return "👥";
    default:
      return "🤖";
  }
}

export function truncateText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
