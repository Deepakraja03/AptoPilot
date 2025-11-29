/**
 * Intent Service
 *
 * This service handles the processing of natural language intents
 * using AI models (Claude and OpenAI as fallback) to generate execution plans.
 */

import { apiConfig } from "@/app/api/config";

export interface IntentStep {
  description: string;
  chain: string;
  transactionHash?: string;
  requiresKyc?: boolean;
  requiresWalletConnect?: boolean;
  redirectUrl?: string;
  userAddress?: string;
  chainId?: string;
  status?: string;
  details?: Record<string, string | number | boolean | object>;
}

export interface IntentExecutionPlan {
  steps: IntentStep[];
  requiresKyc?: boolean;
  requiresWalletConnect?: boolean;
  requiresUserInput?: boolean;
  details?: Record<string, string | number | boolean | object>;
  error?: string;
}

/**
 * Process a natural language intent and generate an execution plan
 *
 * @param intent The user's natural language intent string
 * @param chainId The chain ID to process the intent on
 * @param userAddress The user's wallet address for KYC verification checks
 * @returns Promise resolving to an execution plan
 */
export async function processIntent(
  intent: string,
  chainId: number,
  userAddress?: string
) {
  try {
    const geminiResult = await processWithGemini(intent, chainId, userAddress);
    return geminiResult;
  } catch (error) {
    console.error(
      "Claude intent processing failed, falling back to OpenAI:",
      error
    );
    // return processWithOpenAI(intent);
  }
}

/**
 * Process intent using Gemini AI model
 */
async function processWithGemini(
  intent: string,
   
  chainId: number,
  userAddress?: string
) {
  try {
    const response = await fetch(`${apiConfig.claude.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiConfig.claude.apiKey,
        "anthropic-version": apiConfig.claude.version,
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `You are the AI for a cross-chain DeFi intent system. I'll give you a financial intent in natural language, and you'll return a structured JSON object with the execution steps, estimated cost, and time.

The JSON should have this format:
{
  "steps": [
    {"chain": "Chain name or 'Multiple' or 'N/A'", "token": "Token name or 'N/A'", chainId: "Chain ID or 'N/A'", "amount": "Amount or 'N/A'", "function": "Function name or 'N/A' only take it in small letters", "to": "Recipient address for transfers"}
  ],
}

Make your responses practical and realistic. For execution steps, consider:
1. Use this information to identify the chainId:
const NETWORK_CONFIGS = {
  rootstock: {
    chainId: 31,
    chain: rootstockTestnet,
    name: "Rootstock Testnet",
    network: "rootstock",
    rpcUrl: "https://public-node.testnet.rsk.co",
  },
  celoAlfajores: {
    chainId: 44787,
    chain: celoAlfajores,
    name: "celoAlfajores",
    network: "celo-alfajores",
    rpcUrl: process.env.CELO_RPC_URL,
    nativeCurrency: {
      decimals: 18,
      name: "CELO",
      symbol: "CELO",
    }
  }
};
2. check if the chainId is valid and the user given and the NETWORK_CONFIGS should be same the user current chainId: "${chainId}"
3. Chekck if the user has given you token name, Amount and chainId
4. For transfers: Extract the recipient address from the intent. Look for phrases like "to 0x...", "send to 0x...", etc.
5. Identify the function of the intent by looking for specific keywords:
   - For balance checks: Use function "balanceof" if the intent contains words like "balance", "how much", "check my", "how many", "see my", "view my"
   - For transfers: Use function "transfer" if the intent contains words like "transfer", "send", "move", "pay"
   - For approvals: Use function "approve" if the intent contains words like "approve", "allow", "permit", "authorize"
   - For allowance checks: Use function "allowance" if the intent contains words like "allowance", "approved amount", "spending limit"
   - For total supply: Use function "totalsupply" if the intent contains words like "total supply", "circulating", "max supply"
   - For converting values: Use function "converttobaseunit" if the intent contains words like "convert to wei", "to base units"
   - For converting from base units: Use function "convertfrombaseunit" if the intent contains words like "convert from wei", "from base units", "to human readable"
   
Here's my intent: "${intent}"

Return ONLY the JSON with no other text.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Claude API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const responseContent = data.content[0].text;
    console.log("Claude response content:", responseContent);

    try {
      const parsedContent = JSON.parse(responseContent);

      if (!parsedContent.steps || !Array.isArray(parsedContent.steps)) {
        throw new Error("Claude response is missing required fields");
      }

      const step = parsedContent.steps[0];
      const chain = step.chain;
      const token = step.token;
      let chainId = step.chainId; // This is a string from Claude's response
      const amount = step.amount;
      const functionName = step.function;

      // Add userAddress to the step for KYC verification
      step.userAddress = userAddress;

      // Fix chainId mapping - Claude sometimes returns mainnet chainIds instead of testnet ones
      if (chain && chain.toLowerCase().includes("celo")) {
        // Force Celo Alfajores chainId regardless of what Claude returned
        chainId = "44787";
        step.chainId = chainId; // Update the step object with corrected chainId
        console.log("Fixed chainId for Celo Alfajores to 44787");
      } else if (chain && chain.toLowerCase().includes("rootstock")) {
        // Force Rootstock testnet chainId
        chainId = "31";
        step.chainId = chainId; // Update the step object with corrected chainId
        console.log("Fixed chainId for Rootstock testnet to 31");
      }

      console.log("Parsed step:", step);
      console.log("Parsed chain:", chain);
      console.log("Parsed token:", token);
      console.log("Parsed chainId:", chainId);
      console.log("Parsed amount:", amount);
      console.log("Parsed functionName:", functionName);

      let result;

      if (functionName === "balanceof") {
        try {
          const address = step.userAddress || userAddress || "";

          if (!address) {
            // If address is not provided, explicitly inform the user we need an address
            result = {
              steps: [
                {
                  description: `Please provide a wallet address to check the ${token} balance.`,
                  chain,
                  requiresWalletConnect: true,
                },
              ],
              requiresWalletConnect: true,
            };
            return result;
          }
        } catch (error) {
          console.error("Error processing with Claude:", error);
          throw error;
        }
      }
    } finally {
      console.log("Final result:");
    }
  } catch (error) {
    console.error("Error processing intent:", error);
    throw error;
  }
}
