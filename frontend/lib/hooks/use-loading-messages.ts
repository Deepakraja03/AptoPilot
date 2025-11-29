"use client";

import { useState, useEffect } from "react";

// Different loading messages for different contexts
export const loadingMessages = {
  dashboard: [
    // 🚦 Catchy Blockchain Phrases
    "WAGMI — your assets are almost loaded! 🚀",
    "HODLing... just like Satoshi intended. 💎",
    "Crypto never sleeps. Neither do we (well, kind of). ⚡",
    "Loading blocks like a true node operator... ⛏️",
    "Minting your data... please stand by! 🪙",
    "Gwei-t a moment, we're optimizing gas fees. ⛽",
    "Zero-knowledge. Maximum loading. 🔐",
    "Frens, your wallet is almost synced. 🤝",
    "Sending your coins through the memepool... 🏊‍♂️",
    "Running proof-of-wait... success imminent! ⏳",

    // 😂 Classic Meme Dialogue & References
    "To the moon… just need a few more seconds! 🌙",
    "Bear or bull, you're always in control. 🐻🐂",
    "Not your keys, not your load speed (jk, secure as ever). 🔑",
    "Sir, this is a decentralized loading screen. 🏪",
    "I was early, but this load is even earlier. ⏰",
    "Much wow. Such loading. Very patience. 🐕",
    "When Lambo? After this progress bar. 🏎️",
    "Deploying quantum meme reactors… 🚀",
    "Diamond hands, just for a moment more! 💎🙌",
    "This is the gwei. 🛤️",
    "Few understand... but you will soon! 🧠",
    "Probably nothing... just your entire portfolio! 📈",
    "Number go up technology loading... 📊",
    "Wen moon? Soon moon! 🌕",
    "Have fun staying poor... loading screen! 😄",

    // 🧠 Fun Blockchain & Crypto Facts
    "Did you know? The Bitcoin whitepaper fits on just nine pages. 📄",
    "Fun fact: Ethereum was inspired by sci-fi novels! 📚",
    "Crypto Twitter makes news… sometimes before it happens. 🐦",
    "There are over 20,000 cryptocurrencies — and many are memes! 🎭",
    "Vitalik was 19 when he wrote the Ethereum whitepaper. 👨‍💻",
    "The longest blockchain is over 450GB! 💾",
    "Lost private keys? Some wallets have been unrecoverable for over a decade. 🔒",
    "The first Bitcoin transaction bought two pizzas for 10,000 BTC. 🍕",
    "Smart contracts aren't that smart… but they're getting there! 🤖",
    "Satoshi Nakamoto's identity remains a mystery to this day. 🕵️",
    "The term 'HODL' came from a misspelled 'hold' in a Bitcoin forum. ✍️",
    "Ethereum processes about 1.2 million transactions daily. ⚡",
    "The smallest unit of Bitcoin is called a 'satoshi' (0.00000001 BTC). 🔬",
    "Dogecoin was created as a joke in just 2 hours! 😂",
    "The Bitcoin network uses more energy than some countries. ⚡",

    // 🎯 Original Dashboard Messages
    "🚀 Fetching your multi-chain portfolio...",
    "💎 Calculating your crypto wealth...",
    "⚡ Scanning blockchain networks...",
    "🌟 Discovering yield opportunities...",
    "🔥 Analyzing your DeFi positions...",
    "💰 Counting your digital assets...",
    "🎯 Finding cross-chain arbitrage...",
    "🌈 Syncing wallet balances...",
    "⭐ Optimizing your portfolio...",
    "🚀 Loading your financial universe...",
    "💫 Aggregating chain data...",
    "🎨 Painting your wealth picture...",
    "🔮 Predicting market movements...",
    "⚡ Supercharging your dashboard...",
    "🌊 Riding the DeFi waves...",

    // 🎪 Extra Fun & Easter Eggs
    "Summoning the blockchain spirits... 👻",
    "Teaching smart contracts to be smarter... 🎓",
    "Convincing validators to validate faster... 🏃‍♂️",
    "Bribing the mempool with extra gas... ⛽💰",
    "Asking Vitalik for optimization tips... 💭",
    "Downloading more RAM for the blockchain... 💾",
    "Turning coffee into code... ☕➡️💻",
    "Negotiating with the crypto gods... 🙏",
    "Charging the flux capacitor... ⚡🚗",
    "Consulting the Bitcoin oracle... 🔮",
    "Defragmenting the distributed ledger... 🧩",
    "Optimizing for maximum hopium... 📈✨",
    "Loading 1337 h4x0r mode... 💻🔥",
    "Synchronizing with the multiverse... 🌌",
    "Calibrating moon trajectory... 🚀🌙",
    "Activating diamond hand protocols... 💎🤖",
    "Compiling meme energy into data... 😂⚡",
    "Establishing connection to Satoshi's WiFi... 📶",
    "Inflating the hopium balloon... 🎈📈",
    "Debugging the matrix... again... 🐛🔴",
    "Convincing bears to become bulls... 🐻➡️🐂",
    "Installing diamond hand firmware... 💎🔧",
    "Translating whale movements... 🐋📊",
    "Activating number-go-up technology... 📈🚀",
    "Consulting the ancient DeFi scrolls... 📜✨",
  ],
  portfolio: [
    "📊 Analyzing portfolio performance...",
    "💹 Calculating asset allocation...",
    "🎯 Optimizing your holdings...",
    "📈 Tracking market movements...",
    "💎 Evaluating your investments...",
  ],
  transactions: [
    "🔍 Scanning transaction history...",
    "📝 Organizing your trades...",
    "⚡ Processing blockchain data...",
    "🔗 Connecting the dots...",
    "📊 Analyzing your activity...",
  ],
  tokens: [
    "🪙 Counting your tokens...",
    "⚖️ Weighing your assets...",
    "🌐 Exploring all chains...",
    "💰 Calculating token values...",
    "🔍 Discovering hidden gems...",
  ],
  opportunities: [
    "🎯 Hunting for opportunities...",
    "💡 Finding smart moves...",
    "🚀 Discovering yield farms...",
    "⚡ Spotting arbitrage chances...",
    "🌟 Uncovering DeFi gems...",
  ],
};

export function useLoadingMessages(
  category: keyof typeof loadingMessages = "dashboard",
  interval: number = 2000
) {
  const messages = loadingMessages[category];
  const [currentMessage, setCurrentMessage] = useState(messages[0]);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setMessageIndex((prev) => {
        const newIndex = (prev + 1) % messages.length;
        setCurrentMessage(messages[newIndex]);
        return newIndex;
      });
    }, interval);

    return () => clearInterval(intervalId);
  }, [messages, interval]);

  return {
    currentMessage,
    messageIndex,
    totalMessages: messages.length,
  };
}

// Hook for random loading messages (Swiggy style)
export function useRandomLoadingMessage(
  category: keyof typeof loadingMessages = "dashboard"
) {
  const messages = loadingMessages[category];
  const [currentMessage, setCurrentMessage] = useState(() => {
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  });

  const getRandomMessage = () => {
    const randomIndex = Math.floor(Math.random() * messages.length);
    setCurrentMessage(messages[randomIndex]);
    return messages[randomIndex];
  };

  return {
    currentMessage,
    getRandomMessage,
    allMessages: messages,
  };
}