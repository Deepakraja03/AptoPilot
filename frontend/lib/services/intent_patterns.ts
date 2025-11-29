interface IntentPattern {
  pattern: RegExp;
  response: string | ((matches: RegExpMatchArray) => string);
  tokens: boolean;
  actions: {
    label: string;
    action: string;
    intent?: string;
  }[];
  extractVariables?: (matches: RegExpMatchArray) => Record<string, string>;
}

export const INTENT_PATTERNS: IntentPattern[] = [
  {
    pattern: /deposit|add|put/i,
    response:
      "I can help you deposit funds. Which token would you like to deposit?",
    tokens: true,
    actions: [
      {
        label: "Deposit with max yield",
        action: "SUGGEST_INTENT",
        intent:
          "Deposit my [TOKEN] to earn the highest yield across all chains",
      },
      {
        label: "Deposit with lowest risk",
        action: "SUGGEST_INTENT",
        intent:
          "Deposit my [TOKEN] into the most secure protocol with reasonable yield",
      },
    ],
  },
  {
    pattern: /withdraw|remove|take out/i,
    response:
      "I can help you withdraw your assets. Which token would you like to withdraw?",
    tokens: true,
    actions: [
      {
        label: "Withdraw to my wallet",
        action: "SUGGEST_INTENT",
        intent: "Withdraw my [TOKEN] to my current wallet",
      },
      {
        label: "Convert to stablecoins",
        action: "SUGGEST_INTENT",
        intent: "Withdraw my [TOKEN] and convert to USDC",
      },
    ],
  },
  {
    pattern: /swap|exchange|convert/i,
    response: "I can help you swap tokens. What would you like to exchange?",
    tokens: true,
    actions: [
      {
        label: "Get best exchange rate",
        action: "SUGGEST_INTENT",
        intent: "Swap [TOKEN] for USDC at the best possible rate",
      },
      {
        label: "Swap with lowest fees",
        action: "SUGGEST_INTENT",
        intent: "Swap [TOKEN] for ETH with minimal fees",
      },
    ],
  },
  {
    pattern: /yield|interest|apy|earn/i,
    response:
      "Looking for the best yields? Here are some options for your assets:",
    tokens: true,
    actions: [
      {
        label: "Highest yield strategy",
        action: "SUGGEST_INTENT",
        intent: "Find the highest yield for my [TOKEN] across all chains",
      },
      {
        label: "Yield with insurance",
        action: "SUGGEST_INTENT",
        intent: "Earn yield on my [TOKEN] with insurance protection",
      },
    ],
  },
  {
    pattern: /stake|staking/i,
    response:
      "I can help you stake your assets for rewards. Which asset would you like to stake?",
    tokens: true,
    actions: [
      {
        label: "Best staking rewards",
        action: "SUGGEST_INTENT",
        intent: "Find the best staking rewards for my [TOKEN]",
      },
      {
        label: "Liquid staking",
        action: "SUGGEST_INTENT",
        intent: "Convert my [TOKEN] to a liquid staking derivative",
      },
    ],
  },
  {
    pattern: /bridge|transfer to|move to/i,
    response:
      "I can help you bridge your assets to different chains. Which token would you like to bridge?",
    tokens: true,
    actions: [
      {
        label: "Bridge with lowest fees",
        action: "SUGGEST_INTENT",
        intent: "Bridge my [TOKEN] to [CHAIN] with the lowest fees",
      },
      {
        label: "Fastest bridge option",
        action: "SUGGEST_INTENT",
        intent: "Find the fastest bridge to transfer my [TOKEN] to [CHAIN]",
      },
    ],
  },
  {
    pattern: /deposit (\d+) ([a-zA-Z]+)/i,
    response: ((matches: RegExpMatchArray) => {
      const amount = matches[1];
      const token = matches[2].toUpperCase();
      return `I'll help you deposit ${amount} ${token}. Which chain would you like to use?`;
    }) as IntentPattern["response"],
    tokens: true,
    actions: [
      {
        label: "Deposit on Celo",
        action: "SUGGEST_INTENT",
        intent: "Deposit [AMOUNT] [TOKEN] on Celo",
      },
      {
        label: "Deposit with best yield",
        action: "SUGGEST_INTENT",
        intent: "Deposit [AMOUNT] [TOKEN] with highest yield",
      },
    ],
    extractVariables: (matches: RegExpMatchArray) => ({
      amount: matches[1],
      token: matches[2].toUpperCase(),
    }),
  },
  {
    pattern: /borrow (\d+) ([a-zA-Z]+)/i,
    response: ((matches: RegExpMatchArray) => {
      const amount = matches[1];
      const token = matches[2].toUpperCase();
      return `I'll help you borrow ${amount} ${token}. Here are some options:`;
    }) as IntentPattern["response"],
    tokens: false,
    actions: [
      {
        label: "Borrow on Rootstock",
        action: "SUGGEST_INTENT",
        intent: "Borrow [AMOUNT] [TOKEN] on Rootstock",
      },
      {
        label: "Borrow at lowest interest",
        action: "SUGGEST_INTENT",
        intent: "Borrow [AMOUNT] [TOKEN] at lowest interest rate",
      },
    ],
    extractVariables: (matches: RegExpMatchArray) => ({
      amount: matches[1],
      token: matches[2].toUpperCase(),
    }),
  },
];
