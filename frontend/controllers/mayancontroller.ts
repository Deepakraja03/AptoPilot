/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { MayanFinanceSwap } from "@/lib/services/mayanfinance";
import turnkeyService from "../lib/services/turnkey/index";
import { tokenCacheService } from "@/lib/services/token-cache";
import { nonceManager } from "@/lib/services/nonce-manager";
import { ethers } from "ethers";
import {
  Quote,
  ReferrerAddresses,
  swapFromEvm,
  swapFromSolana,
} from "@mayanfinance/swap-sdk";
import {
  DEFAULT_REFERRER_BPS,
  EVM_Referral_Address,
  SOL_Referral_Address,
} from "@/lib/constant";
import { ComputeBudgetProgram } from "@solana/web3.js";

// Get quote for cross-chain swap
export async function getMayanQuote(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      amountIn,
      fromToken,
      toToken,
      fromChain,
      toChain,
      slippageBps = 100,
      userOrganizationId,
    } = body;

    if (!amountIn || !fromToken || !toToken || !fromChain || !toChain) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get user wallet addresses from database (no Turnkey API calls)
    const user =
      await turnkeyService.getUserByOrganizationId(userOrganizationId);
    if (!user || !user.wallets || user.wallets.length === 0) {
      throw new Error(
        `No wallets found for user organization: ${userOrganizationId}`
      );
    }

    const wallet = user.wallets[0];
    const walletAccounts = await turnkeyService.getWalletAccountsByWalletId(
      wallet.walletId
    );

    // Find addresses for different chains
    const evmAccount = walletAccounts.find(
      (account) => account.addressFormat === "ADDRESS_FORMAT_ETHEREUM"
    );
    const solanaAccount = walletAccounts.find(
      (account) => account.addressFormat === "ADDRESS_FORMAT_SOLANA"
    );

    // Setup wallet connections using database addresses (no Turnkey signers)
    const walletConnections = {
      solanaConnection: turnkeyService.getSolanaConnection(),
      solanaWallet: {
        publicKey: { toString: () => solanaAccount?.address || "" },
      },
      solanaAddress: solanaAccount?.address,
      evmProvider: turnkeyService.getEvmProvider(),
      evmAddress: evmAccount?.address,
      suiClient: turnkeyService.getSuiProvider(),
      // Store wallet info for signing
      walletId: wallet.walletId,
      userOrganizationId: userOrganizationId,
    };

    const mayanSwap = new MayanFinanceSwap(walletConnections);

    // Get tokens to find the full token objects
    const [fromTokens, toTokens] = await Promise.all([
      mayanSwap.getTokens(fromChain),
      mayanSwap.getTokens(toChain),
    ]);

    // Find the token objects by contract address
    const fromTokenObj = fromTokens.find(
      (t) => t.contract.toLowerCase() === fromToken.toLowerCase()
    );
    const toTokenObj = toTokens.find(
      (t) => t.contract.toLowerCase() === toToken.toLowerCase()
    );

    if (!fromTokenObj) {
      return NextResponse.json(
        { error: `From token not found: ${fromToken} on ${fromChain}` },
        { status: 400 }
      );
    }

    if (!toTokenObj) {
      return NextResponse.json(
        { error: `To token not found: ${toToken} on ${toChain}` },
        { status: 400 }
      );
    }

    // Format amount with proper decimals
    const formattedAmount = mayanSwap.formatAmount(
      amountIn,
      fromTokenObj.decimals
    );

    const quote = await mayanSwap.getQuote({
      amountIn: formattedAmount,
      fromToken: fromTokenObj,
      toToken: toTokenObj,
      fromChain,
      toChain,
      slippageBps,
    });

    return NextResponse.json({ success: true, quote });
  } catch (error) {
    console.error("Get quote error:", error);

    // Extract meaningful error message
    let errorMessage = "Unknown error";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Handle specific error types with appropriate status codes
      if (errorMessage.includes("Amount too small")) {
        statusCode = 400;
      } else if (errorMessage.includes("not found")) {
        statusCode = 404;
      } else if (errorMessage.includes("required")) {
        statusCode = 400;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        success: false,
      },
      { status: statusCode }
    );
  }
}

function getChainId(chainName: string): number {
  const chainIds: { [key: string]: number } = {
    ethereum: 1,
    bsc: 56,
    polygon: 137,
    avalanche: 43114,
    arbitrum: 42161,
    optimism: 10,
    base: 8453,
    unichain: 1301, // Unichain testnet, update with mainnet ID when available
    linea: 59144,
  };

  const chainId = chainIds[chainName.toLowerCase()];
  if (!chainId) {
    throw new Error(`Unsupported chain: ${chainName}`);
  }

  return chainId;
}

function createReferrerAddresses(
  fromChain: string,
  toChain: string
): ReferrerAddresses {
  const referrerAddresses: ReferrerAddresses = {};

  if (fromChain.toLowerCase() === "solana") {
    referrerAddresses.solana = SOL_Referral_Address;
  } else {
    referrerAddresses.evm = EVM_Referral_Address;
  }

  if (
    toChain.toLowerCase() === "solana" &&
    fromChain.toLowerCase() !== "solana"
  ) {
    referrerAddresses.solana = SOL_Referral_Address;
  } else if (
    toChain.toLowerCase() !== "solana" &&
    fromChain.toLowerCase() === "solana"
  ) {
    referrerAddresses.evm = EVM_Referral_Address;
  }

  return referrerAddresses;
}

// Get blockchain explorer URL for a transaction
function getExplorerUrl(chainName: string, txHash: string): string {
  const explorers: { [key: string]: string } = {
    ethereum: "https://etherscan.io/tx/",
    bsc: "https://bscscan.com/tx/",
    polygon: "https://polygonscan.com/tx/",
    avalanche: "https://snowtrace.io/tx/",
    arbitrum: "https://arbiscan.io/tx/",
    optimism: "https://optimistic.etherscan.io/tx/",
    base: "https://basescan.org/tx/",
    solana: "https://solscan.io/tx/",
    linea: "https://lineascan.build/tx/",
  };

  const baseUrl =
    explorers[chainName.toLowerCase()] || "https://etherscan.io/tx/";
  return `${baseUrl}${txHash}`;
}

// Execute cross-chain swap with rate limiting protection
export async function executeMayanSwap(request: NextRequest) {
  try {
    const body = await request.json();
    const { quote, originAddress, destinationAddress, userOrganizationId } =
      body;

    if (
      !quote ||
      !originAddress ||
      !destinationAddress ||
      !userOrganizationId
    ) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log(
      "🚀 Starting Mayan swap execution for user:",
      userOrganizationId
    );

    // Add initial delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get user wallet addresses from database
    let evmAddress: string | undefined, solanaAddress: string | undefined;
    // walletId: string;
    let evmWalletId: string | undefined, solanaWalletId: string | undefined;

    try {
      const user =
        await turnkeyService.getUserByOrganizationId(userOrganizationId);
      if (!user || !user.wallets || user.wallets.length === 0) {
        throw new Error(
          `No wallets found for user organization: ${userOrganizationId}`
        );
      }

      // Find EVM and Solana accounts
      let evmAccount, solanaAccount;
      for (const wallet of user.wallets) {
        const walletAccounts = await turnkeyService.getWalletAccountsByWalletId(
          wallet.walletId
        );

        if (!evmAccount) {
          evmAccount = walletAccounts.find(
            (account) => account.addressFormat === "ADDRESS_FORMAT_ETHEREUM"
          );
          if (evmAccount) evmWalletId = wallet.walletId;
        }

        if (!solanaAccount) {
          solanaAccount = walletAccounts.find(
            (account) => account.addressFormat === "ADDRESS_FORMAT_SOLANA"
          );
          if (solanaAccount) solanaWalletId = wallet.walletId;
        }

        if (evmAccount && solanaAccount) break;
      }

      evmAddress = evmAccount?.address;
      solanaAddress = solanaAccount?.address;
      // walletId = evmWalletId || solanaWalletId || user.wallets[0].walletId;

      console.log("🔑 Retrieved wallet addresses:", {
        evmAddress,
        solanaAddress,
        evmWalletId,
        solanaWalletId,
      });
    } catch (error) {
      console.error("❌ Failed to retrieve wallet addresses:", error);
      throw new Error(
        "Unable to retrieve wallet information. Please try again."
      );
    }

    // Validate quote structure
    const selectedQuote = Array.isArray(quote) ? quote[0] : quote;
    if (!selectedQuote || !selectedQuote.fromChain || !selectedQuote.toChain) {
      throw new Error("Invalid quote structure");
    }

    const fromChain = selectedQuote.fromChain.toLowerCase();
    const toChain = selectedQuote.toChain.toLowerCase();

    console.log(`🔄 Processing ${fromChain} → ${toChain} swap`);

    // Create referrer addresses object with proper chain-specific addresses
    const referrerAddresses = createReferrerAddresses(fromChain, toChain);

    console.log("💰 Using referrer addresses:", referrerAddresses);

    // Validate wallet requirements and addresses
    let resolvedOriginAddress: string;
    let resolvedDestinationAddress: string;

    if (fromChain === "solana") {
      // Solana origin swap
      if (!solanaAddress) {
        throw new Error(
          "Solana wallet required for Solana origin swaps. Please create a Solana account in your Turnkey wallet."
        );
      }

      // Validate Solana address format
      try {
        // Use proper Solana PublicKey validation
        if (!solanaAddress.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
          throw new Error("Invalid Solana address format");
        }
        resolvedOriginAddress = solanaAddress;
      } catch {
        throw new Error("Invalid Solana address format in wallet");
      }

      // For SOL→EVM swaps, destination should be EVM address
      if (toChain !== "solana") {
        if (!ethers.isAddress(destinationAddress)) {
          // If user doesn't have EVM address, use their EVM wallet if available
          if (evmAddress && ethers.isAddress(evmAddress)) {
            resolvedDestinationAddress = ethers.getAddress(evmAddress);
            console.log(
              "🔄 Using user's EVM wallet for destination:",
              resolvedDestinationAddress
            );
          } else {
            throw new Error(
              `Invalid destination address for ${toChain}. Please provide a valid ${toChain} address.`
            );
          }
        } else {
          resolvedDestinationAddress = ethers.getAddress(destinationAddress);
        }
      } else {
        // SOL→SOL (same chain), validate Solana destination
        if (!destinationAddress.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
          throw new Error("Invalid Solana destination address");
        }
        resolvedDestinationAddress = destinationAddress;
      }
    } else {
      // EVM origin swap
      if (!evmAddress) {
        throw new Error(
          `${fromChain.toUpperCase()} wallet required. Please create an Ethereum account in your Turnkey wallet.`
        );
      }

      if (!ethers.isAddress(evmAddress)) {
        throw new Error("Invalid EVM address format in wallet");
      }

      resolvedOriginAddress = ethers.getAddress(evmAddress);

      // For EVM→SOL swaps, destination should be Solana address
      if (toChain === "solana") {
        if (!solanaAddress) {
          throw new Error(
            "Solana wallet required for cross-chain swaps to Solana. Please create a Solana account in your Turnkey wallet."
          );
        }

        if (!solanaAddress.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
          throw new Error("Invalid Solana address format in wallet");
        }

        resolvedDestinationAddress = solanaAddress;
        console.log(
          "🔄 Using user's Solana wallet for destination:",
          resolvedDestinationAddress
        );
      } else {
        // EVM→EVM, validate destination address
        if (!ethers.isAddress(destinationAddress)) {
          resolvedDestinationAddress = ethers.getAddress(evmAddress); // Use same address
        } else {
          resolvedDestinationAddress = ethers.getAddress(destinationAddress);
        }
      }
    }

    console.log("✅ Resolved addresses:", {
      origin: resolvedOriginAddress,
      destination: resolvedDestinationAddress,
      fromChain,
      toChain,
    });

    // Execute swap based on source chain
    let result: any;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        if (fromChain === "solana") {
          // SOL→EVM or SOL→SOL swap
          result = await executeSolanaSwap(
            selectedQuote,
            resolvedOriginAddress,
            resolvedDestinationAddress,
            referrerAddresses, // Pass referrer addresses
            solanaWalletId!,
            userOrganizationId
          );
        } else {
          // EVM→SOL or EVM→EVM swap
          result = await executeEvmSwap(
            selectedQuote,
            resolvedOriginAddress,
            resolvedDestinationAddress,
            referrerAddresses, // Pass referrer addresses
            evmWalletId!,
            userOrganizationId,
            retryCount // Pass current retry count for better nonce management
          );
          console.log("EVM swap result received");
        }

        if (result) {
          return NextResponse.json({
            success: true,
            result,
            addresses: {
              origin: resolvedOriginAddress,
              destination: resolvedDestinationAddress,
            },
            referralInfo: {
              referrerAddresses,
              referrerBps: DEFAULT_REFERRER_BPS,
            },
            statusTracking: result.statusCheckEnabled
              ? {
                  enabled: true,
                  message:
                    "Transaction status will be monitored and you'll be notified of the result.",
                  explorerUrl:
                    result.explorerUrl ||
                    getExplorerUrl(
                      fromChain,
                      result.transactionHash || result.signature || ""
                    ),
                }
              : undefined,
          });
        } else {
          return NextResponse.json(
            {
              success: false,
              error: "Swap execution failed",
              details: result,
            },
            { status: 400 }
          );
        }
      } catch (error) {
        retryCount++;
        console.error(`❌ Swap attempt ${retryCount} failed:`, error);

        if (error instanceof Error) {
          // Handle nonce errors specially
          if (
            error.message.includes("nonce too low") ||
            error.message.includes("nonce has already been used") ||
            error.message.includes("NONCE_EXPIRED")
          ) {
            console.log(
              "⚠️ Nonce error detected, will use increased nonce offset for retry"
            );

            // Add more delay for nonce errors
            if (retryCount < maxRetries) {
              // Use increasing offset based on retry count to avoid nonce conflicts
              const nonceOffset = retryCount; // Use retry count as offset for next attempt
              console.log(
                `📊 Will use nonce offset of ${nonceOffset} on next attempt`
              );

              const delay = Math.min(retryCount * 3000, 15000);
              console.log(
                `⏳ Retrying with increased delay in ${delay}ms... (${retryCount}/${maxRetries})`
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
          }

          // Handle rate limiting
          else if (
            error.message.includes("rate limiting") ||
            error.message.includes("INTERNAL")
          ) {
            if (retryCount < maxRetries) {
              const delay = Math.min(retryCount * 2000, 10000);
              console.log(
                `⏳ Retrying in ${delay}ms... (${retryCount}/${maxRetries})`
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
          }

          // Handle specific error types
          if (error.message.includes("Insufficient funds")) {
            throw new Error(
              "Insufficient funds to complete this transaction. Please add more tokens to your wallet."
            );
          }

          if (error.message.includes("Non-base58 character")) {
            throw new Error(
              "Invalid address format detected. Please ensure you have the correct wallet addresses for both chains."
            );
          }
        }

        if (retryCount >= maxRetries) {
          throw error;
        }
      }
    }

    throw new Error("Max retries exceeded");
  } catch (error) {
    console.error("Execute swap error:", error);

    if (error instanceof Error && error.message.includes("rate limiting")) {
      return NextResponse.json(
        {
          error: "Service temporarily busy. Please try again in a few seconds.",
          retryAfter: 5000,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

// Fixed Execute Solana-based swap
async function executeSolanaSwap(
  quote: Quote,
  originAddress: string,
  destinationAddress: string,
  referrerAddresses: ReferrerAddresses,
  walletId: string,
  userOrganizationId: string
): Promise<any> {
  try {
    console.log("🔄 Executing Solana swap...");

    // Import Solana types dynamically to avoid build issues
    const { PublicKey, VersionedTransaction, LAMPORTS_PER_SOL } = await import(
      "@solana/web3.js"
    );

    // Create Solana connection
    const connection = turnkeyService.getSolanaConnection();

    // Check account balance and initialization
    console.log("🔍 Checking Solana account balance and initialization...");
    const publicKey = new PublicKey(originAddress);

    // Check SOL balance for transaction fees (optimized for lower fees)
    const balance = await connection.getBalance(publicKey);
    const minRequiredBalance = 0.001 * LAMPORTS_PER_SOL; // 0.001 SOL minimum for fees (much lower)

    console.log(`💰 Account balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    console.log(
      `💰 Minimum required: ${minRequiredBalance / LAMPORTS_PER_SOL} SOL`
    );

    if (balance < minRequiredBalance) {
      throw new Error(
        `Insufficient SOL balance for transaction fees. Current: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL, Required: ${(minRequiredBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`
      );
    }

    // Check if account exists on-chain
    const accountInfo = await connection.getAccountInfo(publicKey);
    if (!accountInfo) {
      console.log(
        "⚠️ Account not found on-chain, but this might be normal for new accounts"
      );
    } else {
      console.log("✅ Account exists on-chain");
    }

    // For SPL token swaps, check if token account exists
    const fromTokenContract = quote.fromToken?.contract;
    if (
      fromTokenContract &&
      fromTokenContract !== "So11111111111111111111111111111111111111112"
    ) {
      try {
        // Check for Ethereum placeholder address and handle accordingly
        if (
          fromTokenContract === "0x0000000000000000000000000000000000000000"
        ) {
          console.warn(
            "⚠️ Placeholder address detected, this might be a native SOL swap. Continuing with swap execution..."
          );
          // Don't return here - continue with the swap execution
        } else {
          // Import SPL token utilities
          const { getAssociatedTokenAddress, getAccount } = await import(
            "@solana/spl-token"
          );

          // Validate that fromTokenContract is a valid base58 string
          if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(fromTokenContract)) {
            throw new Error(
              `Invalid base58 string for token contract: ${fromTokenContract}`
            );
          }

          const tokenMint = new PublicKey(fromTokenContract);
          const associatedTokenAddress = await getAssociatedTokenAddress(
            tokenMint,
            publicKey
          );

          console.log(
            `🔍 Checking token account for mint: ${fromTokenContract}`
          );
          console.log(
            `🔍 Associated token address: ${associatedTokenAddress.toString()}`
          );

          try {
            const tokenAccount = await getAccount(
              connection,
              associatedTokenAddress
            );
            console.log(
              `✅ Token account exists with balance: ${tokenAccount.amount.toString()}`
            );

            // Check if token account has sufficient balance
            if (tokenAccount.amount === BigInt(0)) {
              throw new Error(
                `Token account exists but has zero balance for token ${fromTokenContract}`
              );
            }
          } catch (tokenAccountError: any) {
            if (tokenAccountError.name === "TokenAccountNotFoundError") {
              throw new Error(
                `Token account not found for ${fromTokenContract}. Please ensure you have the token in your wallet and the associated token account is created.`
              );
            }
            throw tokenAccountError;
          }
        }
      } catch (splError) {
        console.error("❌ SPL token account check failed:", splError);
        throw new Error(
          `Failed to verify token account: ${splError instanceof Error ? splError.message : "Unknown error"}`
        );
      }
    }

    // Create Turnkey signer for Solana
    const signTransaction = async (
      transaction: any // Use any to handle both Transaction and VersionedTransaction
    ): Promise<any> => {
      try {
        console.log("🔐 Signing Solana transaction with Turnkey...");

        // Serialize transaction for signing
        let serializedTxHex: string;

        if (transaction instanceof VersionedTransaction) {
          const serializedTx = transaction.serialize();
          serializedTxHex = Buffer.from(serializedTx).toString("hex");
        } else {
          // For legacy Transaction, optimize blockhash and fee settings
          const { blockhash } =
            await connection.getLatestBlockhash("confirmed");
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = new PublicKey(originAddress);

          // Optional: Set a lower priority fee if the transaction allows it
          // This reduces the priority fee component
          const priorityFeeInstruction =
            ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: 1000, // Lower priority fee (adjust as needed)
            });

          // Optional: Set compute unit limit to prevent over-allocation
          const computeLimitInstruction =
            ComputeBudgetProgram.setComputeUnitLimit({
              units: 200000, // Adjust based on transaction complexity
            });

          // Add fee optimization instructions at the beginning
          transaction.instructions.unshift(
            computeLimitInstruction,
            priorityFeeInstruction
          );

          const serializedTx = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          });
          serializedTxHex = Buffer.from(serializedTx).toString("hex");
        }

        // Sign with Turnkey using the unified signTransaction method
        const signedResult = await turnkeyService.signTransaction(
          originAddress, // signWith
          serializedTxHex, // unsignedTransaction as hex string
          "TRANSACTION_TYPE_SOLANA" // type
        );

        // Convert the signed transaction back to bytes
        const signedTxBytes = Buffer.from(
          signedResult.signedTransaction,
          "hex"
        );

        // Return the properly formatted signed transaction
        if (transaction instanceof VersionedTransaction) {
          return VersionedTransaction.deserialize(signedTxBytes);
        } else {
          const { Transaction } = await import("@solana/web3.js");
          return Transaction.from(signedTxBytes);
        }
      } catch (error) {
        console.error("❌ Failed to sign Solana transaction:", error);
        throw new Error(
          `Transaction signing failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    };

    // Execute Solana swap using SDK with referrer addresses
    console.log("🚀 Executing swap with Mayan SDK...");
    const swapResult = await swapFromSolana(
      quote,
      originAddress,
      destinationAddress,
      referrerAddresses, // Pass referrer addresses
      signTransaction,
      connection
    );

    console.log("✅ Solana swap completed:", swapResult);

    // Start monitoring transaction status in the background
    // Don't await this to prevent blocking the response
    setTimeout(() => {
      monitorTransactionStatus(
        swapResult.signature,
        quote.fromChain,
        userOrganizationId
      );
    }, 15000); // Increased delay to ensure transaction is broadcasted and indexed

    return {
      success: true,
      signature: swapResult.signature,
      serializedTx: swapResult.serializedTrx,
      statusCheckEnabled: true,
      explorerUrl: getExplorerUrl(quote.fromChain, swapResult.signature),
    };
  } catch (error) {
    console.error("❌ Solana swap failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Solana swap failed",
    };
  }
}

// Fixed Execute EVM-based swap
async function executeEvmSwap(
  quote: Quote,
  originAddress: string,
  destinationAddress: string,
  referrerAddresses: ReferrerAddresses | undefined,
  walletId: string,
  userOrganizationId: string,
  currentRetryCount: number = 0 // Add retry count parameter with default 0
): Promise<any> {
  // Define provider and chainId here
  let provider: ethers.JsonRpcProvider;
  let chainId: number;

  try {
    console.log(
      `🔄 Executing EVM swap... ${currentRetryCount > 0 ? `(retry #${currentRetryCount})` : ""}`
    );

    // Get chain ID for the source chain
    chainId = getChainId(quote.fromChain);

    // Create provider
    provider = turnkeyService.getEvmProvider(chainId);
    if (!provider) {
      throw new Error(`Failed to create provider for chain ${quote.fromChain}`);
    }

    console.log("✅ EVM provider created for chain:", chainId);

    // Create a proper signer object that implements the required interface

    // Create a proper signer object that implements the required interface
    const customSigner = {
      getAddress: async () => originAddress,
      signTransaction: async (transaction: any) => {
        try {
          console.log("🔐 Signing EVM transaction with Turnkey...");

          // Serialize the UNSIGNED transaction for Turnkey
          const serializedTx =
            ethers.Transaction.from(transaction).unsignedSerialized;

          // Use Turnkey service directly with the unified signTransaction method
          const signedResult = await turnkeyService.signTransaction(
            originAddress, // signWith
            serializedTx, // unsignedTransaction as hex string
            "TRANSACTION_TYPE_ETHEREUM" // type
          );

          return signedResult.signedTransaction;
        } catch (error) {
          console.error("❌ Failed to sign EVM transaction:", error);
          throw new Error(
            `Transaction signing failed: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      },
      estimateGas: async (transaction: any) => {
        try {
          console.log("📊 Estimating gas for transaction...");
          const gasEstimate = await provider.estimateGas(transaction);
          return gasEstimate;
        } catch (error) {
          console.error("❌ Gas estimation failed:", error);
          // Return a reasonable default gas limit
          return ethers.parseUnits("300000", "wei");
        }
      },
      sendTransaction: async (transaction: any) => {
        try {
          console.log("📤 Sending transaction...");
          // Sign the transaction first
          const signedTx = await customSigner.signTransaction(transaction);

          // Ensure the signed transaction has 0x prefix for broadcasting
          const prefixedSignedTx = signedTx.startsWith("0x")
            ? signedTx
            : `0x${signedTx}`;

          console.log(
            "🚀 Broadcasting signed transaction:",
            prefixedSignedTx.substring(0, 20) + "..."
          );

          // Send the signed transaction
          const txResponse =
            await provider.broadcastTransaction(prefixedSignedTx);
          return txResponse;
        } catch (error) {
          console.error("❌ Send transaction failed:", error);
          throw error;
        }
      },
      populateTransaction: async (transaction: any) => {
        try {
          console.log("📋 Populating transaction...");

          // Use nonce manager to get a safe nonce that prevents conflicts
          // Use retryCount for increasingly larger offsets on retries
          const nonceOffset =
            currentRetryCount > 0
              ? currentRetryCount * 2
              : Math.floor(Math.random() * 2);
          const safeNonce = await nonceManager.getNextNonce(
            provider,
            originAddress,
            nonceOffset
          );

          console.log(
            `🔢 Using nonce ${safeNonce} for transaction${nonceOffset > 0 ? ` (with +${nonceOffset} offset)` : ""}`
          );

          // Create populated transaction with basic fields only
          // Gas fees will be handled via overrides parameter
          const populatedTx = {
            ...transaction,
            from: originAddress,
            nonce: safeNonce,
            chainId: chainId,
          };

          console.log(
            "✅ Transaction populated with managed nonce:",
            safeNonce,
            nonceOffset > 0 ? `(with +${nonceOffset} offset)` : ""
          );
          return populatedTx;
        } catch (error) {
          console.error("❌ Populate transaction failed:", error);
          throw error;
        }
      },
      connect: (newProvider: any) => {
        // Return a new signer connected to the new provider
        return {
          ...customSigner,
          provider: newProvider,
        };
      },
      provider: provider,
    };

    // Get current gas fees for overrides with optimized, reasonable fees
    const feeData = await provider.getFeeData();
    let gasOverrides: any = {};

    // Set optimized gas fees to minimize transaction costs while ensuring reliability
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      // EIP-1559 transaction with optimized fees
      const minPriorityFee = ethers.parseUnits("0.01", "gwei"); // 0.01 gwei minimum (very low)
      const networkPriorityFee = feeData.maxPriorityFeePerGas;

      // Use a small buffer over network fee instead of 2x multiplier
      const calculatedPriorityFee =
        (networkPriorityFee * BigInt(105)) / BigInt(100); // Only 5% increase
      const finalPriorityFee =
        calculatedPriorityFee > minPriorityFee
          ? calculatedPriorityFee
          : minPriorityFee;

      // Set max fee with minimal buffer to keep costs low
      const bufferedMaxFee =
        feeData.maxFeePerGas + (finalPriorityFee * BigInt(110)) / BigInt(100);

      gasOverrides = {
        type: 2,
        maxPriorityFeePerGas: finalPriorityFee,
        maxFeePerGas: bufferedMaxFee,
      };

      console.log(
        `🔼 Optimized gas overrides set: priority=${ethers.formatUnits(finalPriorityFee, "gwei")} gwei, ` +
          `maxFee=${ethers.formatUnits(bufferedMaxFee, "gwei")} gwei`
      );
    } else if (feeData.gasPrice) {
      // Legacy transaction with minimal increase
      const minGasPrice = ethers.parseUnits("1", "gwei"); // 1 gwei minimum (very low)
      const increasedGasPrice = (feeData.gasPrice * BigInt(105)) / BigInt(100); // Only 5% increase
      const finalGasPrice =
        increasedGasPrice > minGasPrice ? increasedGasPrice : minGasPrice;

      gasOverrides = {
        type: 0,
        gasPrice: finalGasPrice,
      };

      console.log(
        `💰 Optimized gas override set: gasPrice=${ethers.formatUnits(finalGasPrice, "gwei")} gwei`
      );
    } else {
      // Fallback with much lower fees
      gasOverrides = {
        type: 0,
        gasPrice: ethers.parseUnits("1.5", "gwei"), // Much lower fallback
      };
      console.log("💰 Using optimized fallback gas override: 1.5 gwei");
    }

    // Execute EVM swap using SDK with correct parameter order and gas overrides
    // swapFromEvm(quote, swapperAddress, destinationAddress, referrerAddresses, signer, permit, overrides, payload)
    try {
      const swapResult = await swapFromEvm(
        quote,
        originAddress, // swapperAddress (origin address)
        destinationAddress,
        referrerAddresses, // ReferrerAddresses object
        customSigner as any, // Custom signer object
        null, // permit - implement if needed for ERC20 tokens
        gasOverrides, // overrides with proper gas fees
        null // payload
      );

      console.log("✅ EVM swap completed:", swapResult);

      // Handle gasless vs regular transaction response
      if (typeof swapResult === "string") {
        // Gasless transaction - returns order hash
        return {
          success: true,
          orderHash: swapResult,
          isGasless: true,
        };
      } else {
        // Regular transaction - returns transaction response
        const txHash = swapResult.hash;

        // Start monitoring transaction status in the background
        // Don't await this to prevent blocking the response
        setTimeout(() => {
          monitorTransactionStatus(txHash, quote.fromChain, userOrganizationId);
        }, 15000); // Increased delay to ensure transaction is broadcasted and indexed

        return {
          success: true,
          transactionHash: txHash,
          transactionResponse: swapResult,
          statusCheckEnabled: true,
          explorerUrl: getExplorerUrl(quote.fromChain, txHash),
        };
      }
    } catch (error) {
      console.error("❌ EVM swap inner catch error:", error);

      // Check for specific errors related to gas fees or nonce issues
      let errorMessage =
        error instanceof Error ? error.message : "EVM swap failed";

      // Check for nonce-related errors
      if (
        errorMessage.includes("nonce too low") ||
        errorMessage.includes("nonce has already been used") ||
        errorMessage.includes("NONCE_EXPIRED")
      ) {
        errorMessage = "Transaction nonce error. Please try again.";

        console.log("🔄 Nonce error detected, transaction needs to be retried");

        // Log detailed error information for debugging
        console.error("Transaction nonce error details:", {
          error: errorMessage,
          fromChain: quote.fromChain,
          originAddress,
        });
      }
      // Check for gas price errors
      else if (
        errorMessage.includes("priority fee") ||
        errorMessage.includes("underpriced") ||
        errorMessage.includes("gas price")
      ) {
        errorMessage =
          "Transaction failed due to network congestion. Please try again with higher gas fees.";

        console.log(
          "⚠️ Gas price error detected, transaction needs higher fees"
        );
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  } catch (error) {
    console.error("❌ EVM swap outer catch error:", error);

    // Check for specific errors related to gas fees or nonce issues
    let errorMessage =
      error instanceof Error ? error.message : "EVM swap failed";

    // Check for nonce-related errors
    if (
      errorMessage.includes("nonce too low") ||
      errorMessage.includes("nonce has already been used") ||
      errorMessage.includes("NONCE_EXPIRED")
    ) {
      // Use a simplified approach that doesn't require provider
      try {
        console.log(`🔄 Detected nonce issue for address: ${originAddress}`);
        // Reset nonce in next transaction attempt
        errorMessage = "Transaction nonce error. Please try again in a moment.";
      } catch (resetError) {
        console.error("Error during nonce reset:", resetError);
      }
    }
    // Check for gas price errors
    else if (
      errorMessage.includes("priority fee") ||
      errorMessage.includes("underpriced") ||
      errorMessage.includes("gas price")
    ) {
      errorMessage =
        "Transaction failed due to network congestion. Please try again with higher gas fees.";
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Get supported chains
export async function getSupportedChains() {
  try {
    const mayanSwap = new MayanFinanceSwap();
    const chains = await mayanSwap.getSupportedChains();

    return NextResponse.json({ success: true, chains });
  } catch (error) {
    console.error("Get chains error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Get tokens by chain (updated to use cache)
export async function getTokensByChain(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get("chain");
    const refresh = searchParams.get("refresh") === "true";

    if (!chain) {
      return NextResponse.json(
        { error: "Chain parameter is required" },
        { status: 400 }
      );
    }

    console.log(`Getting tokens for chain: ${chain}, refresh: ${refresh}`);

    const mayanSwap = new MayanFinanceSwap();

    // Use refresh method if requested, otherwise use cached
    const tokens = refresh
      ? await mayanSwap.refreshTokens(chain)
      : await mayanSwap.getTokens(chain);

    console.log(`Returning ${tokens.length} tokens for ${chain}`);

    return NextResponse.json({
      success: true,
      tokens,
      count: tokens.length,
      cached: !refresh,
    });
  } catch (error) {
    console.error("Get tokens error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
        tokens: [],
      },
      { status: 500 }
    );
  }
}

// Get cache statistics
export async function getCacheStats() {
  try {
    const mayanSwap = new MayanFinanceSwap();
    const stats = mayanSwap.getTokenCacheStats();

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Get cache stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Preload all chains
export async function preloadTokens() {
  try {
    await tokenCacheService.preloadAllChains();
    return NextResponse.json({
      success: true,
      message: "Tokens preloaded for all chains",
    });
  } catch (error) {
    console.error("Preload tokens error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Get transaction status
export async function getTransactionStatus(request: NextRequest) {
  try {
    const { params } = request as any;
    const { txHash } = params;
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get("chain");

    if (!txHash || !chain) {
      return NextResponse.json(
        { error: "Transaction hash and chain are required" },
        { status: 400 }
      );
    }

    const mayanSwap = new MayanFinanceSwap();
    const status = await mayanSwap.getTransactionStatus(txHash);

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Get transaction status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Estimate gas
export async function estimateGas(request: NextRequest) {
  try {
    const body = await request.json();
    const { quote, fromAddress, toAddress, userOrganizationId } = body;

    if (!quote || !fromAddress || !toAddress || !userOrganizationId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get user wallet info from database (avoids rate limiting)
    const user =
      await turnkeyService.getUserByOrganizationId(userOrganizationId);
    if (!user || !user.wallets || user.wallets.length === 0) {
      throw new Error(
        `No wallets found for user organization: ${userOrganizationId}`
      );
    }

    const wallet = user.wallets[0];
    const walletAccounts = await turnkeyService.getWalletAccountsByWalletId(
      wallet.walletId
    );

    const evmAccount = walletAccounts.find(
      (account) => account.addressFormat === "ADDRESS_FORMAT_ETHEREUM"
    );

    const walletConnections = {
      evmProvider: turnkeyService.getEvmProvider(),
      evmAddress: evmAccount?.address,
      walletId: wallet.walletId,
      userOrganizationId: userOrganizationId,
    };

    const mayanSwap = new MayanFinanceSwap(walletConnections);
    const gasEstimate = await mayanSwap.estimateGas(
      quote,
      fromAddress,
      toAddress
    );

    return NextResponse.json({ success: true, gasEstimate });
  } catch (error) {
    console.error("Estimate gas error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Validate address
export async function validateAddress(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, chain } = body;

    if (!address || !chain) {
      return NextResponse.json(
        { error: "Address and chain are required" },
        { status: 400 }
      );
    }

    const mayanSwap = new MayanFinanceSwap();
    const isValid = mayanSwap.validateAddress(address, chain);

    return NextResponse.json({ success: true, isValid });
  } catch (error) {
    console.error("Validate address error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Monitor transaction status and notify user
async function monitorTransactionStatus(
  txHash: string,
  chain: string,
  userOrganizationId: string
) {
  if (!txHash || !chain) {
    console.error("Missing transaction hash or chain for monitoring");
    return;
  }

  console.log(
    `🔍 Starting transaction monitoring for ${txHash} on ${chain} for user ${userOrganizationId}`
  );

  const mayanSwap = new MayanFinanceSwap();
  const maxAttempts = 20;
  const checkInterval = 20000; // 20 seconds between subsequent checks
  let attempts = 0;
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 3;

  // For Ethereum and other EVM chains, also use a direct provider check as fallback
  let provider: ethers.JsonRpcProvider | null = null;
  if (chain.toLowerCase() !== "solana") {
    try {
      const chainId = getChainId(chain);
      provider = turnkeyService.getEvmProvider(chainId);
      console.log(
        `📡 Created fallback provider for chain ${chain} (ID: ${chainId})`
      );
    } catch (error) {
      console.warn(
        `⚠️ Could not create fallback provider for ${chain}:`,
        error
      );
    }
  }

  const checkStatus = async () => {
    try {
      if (attempts >= maxAttempts) {
        console.log(`⏱️ Max monitoring attempts reached for tx ${txHash}`);

        // Notify user that transaction status is unknown after monitoring period
        await notifyUserOfTxStatus(userOrganizationId, txHash, {
          status: "unknown",
          message: `Transaction status could not be determined after ${Math.round((maxAttempts * checkInterval) / 60000)} minutes. Please check the explorer at ${getExplorerUrl(chain, txHash)}`,
          txHash,
          chain,
          explorerUrl: getExplorerUrl(chain, txHash),
        });

        return;
      }

      attempts++;
      console.log(
        `🔄 Checking status for ${txHash} (attempt ${attempts}/${maxAttempts})`
      );

      // Try using Mayan API first
      let status;
      try {
        status = await mayanSwap.getTransactionStatus(txHash);
        consecutiveErrors = 0; // Reset error counter on success
      } catch (apiError) {
        console.error(
          `Error getting transaction status from Mayan API:`,
          apiError
        );

        // Create a basic pending status if Mayan API fails
        status = {
          pending: true,
          confirmed: false,
          failed: false,
          hash: txHash,
        };

        // If Mayan API fails but we have a provider for EVM chains, try direct provider check
        if (provider && chain.toLowerCase() !== "solana") {
          try {
            console.log(`🔍 Trying direct provider check for tx ${txHash}`);
            const receipt = await provider.getTransactionReceipt(txHash);

            if (receipt) {
              // Transaction found - determine if successful
              const success = receipt.status === 1;
              console.log(
                `📑 Got receipt directly from chain: status=${receipt.status}, confirmations=${receipt.confirmations}`
              );

              status = {
                confirmed: success,
                failed: !success,
                hash: txHash,
                receipt: receipt,
              };

              consecutiveErrors = 0; // Reset error counter on success
            } else {
              // Transaction pending
              console.log(`⏳ No receipt yet from direct provider check`);
              status = { confirmed: false, failed: false, pending: true };
              // Don't increment error counter here
            }
          } catch (providerError) {
            console.error(
              `Error checking transaction with direct provider:`,
              providerError
            );
            consecutiveErrors++;

            // If both methods failed, decide whether to continue based on error count
            if (consecutiveErrors >= maxConsecutiveErrors) {
              console.log(
                `⚠️ ${maxConsecutiveErrors} consecutive errors, waiting longer before retry`
              );
              setTimeout(checkStatus, checkInterval * 2); // Double the wait time
              return;
            }

            // No valid status available, schedule next check
            setTimeout(checkStatus, checkInterval);
            return;
          }
        } else {
          // If provider not available or is Solana
          consecutiveErrors++;

          // If API failed multiple times in a row, wait longer
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.log(
              `⚠️ ${maxConsecutiveErrors} consecutive errors, waiting longer before retry`
            );
            setTimeout(checkStatus, checkInterval * 2); // Double the wait time
            return;
          }

          // No valid status available, schedule next check
          setTimeout(checkStatus, checkInterval);
          return;
        }
      }

      // Process the status (whether from API or direct provider)
      if (status.confirmed) {
        console.log(`✅ Transaction ${txHash} confirmed!`);

        // Notify user of successful transaction
        await notifyUserOfTxStatus(userOrganizationId, txHash, {
          status: "success",
          message: "Your transaction was successful!",
          txHash,
          chain,
          explorerUrl: getExplorerUrl(chain, txHash),
          ...status,
        });

        return;
      } else if (status.failed) {
        console.log(`❌ Transaction ${txHash} failed!`);

        // Notify user of failed transaction
        await notifyUserOfTxStatus(userOrganizationId, txHash, {
          status: "failed",
          message: "Your transaction failed. Please try again.",
          txHash,
          chain,
          explorerUrl: getExplorerUrl(chain, txHash),
          ...status,
        });

        return;
      }

      // Transaction still pending, schedule another check
      console.log(
        `⏳ Transaction ${txHash} still pending, checking again in ${checkInterval / 1000}s`
      );
      setTimeout(checkStatus, checkInterval);
    } catch (error) {
      console.error(`Error checking transaction status for ${txHash}:`, error);
      consecutiveErrors++;

      // On error, continue monitoring unless max attempts reached
      if (attempts < maxAttempts) {
        // Increase delay if we're having consistent errors
        const nextCheckDelay =
          consecutiveErrors >= maxConsecutiveErrors
            ? checkInterval * 2
            : checkInterval;

        console.log(
          `⚠️ Error during status check, will retry in ${nextCheckDelay / 1000}s`
        );
        setTimeout(checkStatus, nextCheckDelay);
      } else {
        // Notify user of error in monitoring
        await notifyUserOfTxStatus(userOrganizationId, txHash, {
          status: "error",
          message: `Error monitoring transaction status. Please check manually at ${getExplorerUrl(chain, txHash)}`,
          txHash,
          chain,
          explorerUrl: getExplorerUrl(chain, txHash),
        });
      }
    }
  };

  // Start the first check after a delay (transactions take time to propagate and be indexed)
  const firstCheckDelay = 30000; // 30 seconds for first check
  console.log(`⏳ First status check scheduled in ${firstCheckDelay / 1000}s`);
  setTimeout(checkStatus, firstCheckDelay);
}

// Notify user of transaction status
async function notifyUserOfTxStatus(
  userOrganizationId: string,
  txHash: string,
  statusInfo: any
) {
  try {
    console.log(
      `📢 Notifying user ${userOrganizationId} about tx ${txHash} status:`,
      statusInfo.status
    );

    // In a real implementation, this would update a database record
    // and/or send a notification to the user via WebSocket, push notification, etc.

    // For example, this could call your API to update the transaction status:
    // await fetch(`/api/transactions/${txHash}/status`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userOrganizationId, status: statusInfo })
    // });

    // For now, just log the notification
    console.log(`📨 Would notify user ${userOrganizationId}:`, {
      title: `Transaction ${statusInfo.status === "success" ? "Successful" : "Status Update"}`,
      message: statusInfo.message,
      data: statusInfo,
    });
  } catch (error) {
    console.error(
      `Failed to notify user ${userOrganizationId} about tx ${txHash}:`,
      error
    );
  }
}

// Health check
export async function getMayanHealthCheck() {
  try {
    const mayanSwap = new MayanFinanceSwap();
    const health = await mayanSwap.healthCheck();

    return NextResponse.json({ success: true, health });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
