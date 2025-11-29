/**
 * API Configuration
 *
 * This file contains sensitive API keys.
 * In a production environment, these should be stored in environment variables.
 */

interface ApiConfig {
  claude: {
    apiKey: string;
    baseUrl: string;
    version: string;
  };
  openai: {
    apiKey: string;
    baseUrl: string;
  };
  oneinch: {
    apiKey: string;
    baseUrl: string;
  };
}

export const apiConfig: ApiConfig = {
  claude: {
    apiKey: process.env.NEXT_PUBLIC_CLAUDE_API_KEY || "",
    baseUrl: "https://api.anthropic.com",
    version: "2023-06-01",
  },
  openai: {
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || "",
    baseUrl: "https://api.openai.com/v1",
  },
  oneinch: {
    apiKey: process.env.NEXT_PUBLIC_ONEINCH_API_KEY || "",
    baseUrl: "https://api.1inch.io/v5.0",
  },
};
