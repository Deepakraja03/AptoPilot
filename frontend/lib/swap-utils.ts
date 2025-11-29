/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";

interface TransactionResult {
  txHash: string;
  status: "pending" | "success" | "failed" | "not_found";
  blockNumber?: number;
  gasUsed?: string;
  timestamp: string;
}

const RPC_PROVIDERS = {
  1: `https://ethereum.publicnode.com`, // Ethereum
  56: `https://bsc-dataseed1.binance.org/`, // BSC
  8453: `https://mainnet.base.org`, // BASE
  103: `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`, // Solana
};

export const addHexPrefix = (tx: string): string => {
  return tx.startsWith("0x") ? tx : `0x${tx}`;
};

// Validate and fix gas fees to prevent "Priority fee too low" errors
export const validateAndFixGasFees = (transaction: any): any => {
  const minPriorityFee = ethers.parseUnits("2", "gwei"); // 2 gwei minimum (increased)
  const minMaxFee = ethers.parseUnits("15", "gwei"); // 15 gwei minimum (increased)

  const fixedTx = { ...transaction };

  if (fixedTx.maxPriorityFeePerGas) {
    let priorityFeeBigInt: bigint;

    try {
      // Handle different input formats
      if (typeof fixedTx.maxPriorityFeePerGas === "string") {
        if (fixedTx.maxPriorityFeePerGas.includes(".")) {
          // Convert from gwei to wei
          priorityFeeBigInt = ethers.parseUnits(
            fixedTx.maxPriorityFeePerGas,
            "gwei"
          );
        } else {
          priorityFeeBigInt = BigInt(fixedTx.maxPriorityFeePerGas);
        }
      } else {
        priorityFeeBigInt = BigInt(fixedTx.maxPriorityFeePerGas);
      }

      if (priorityFeeBigInt < minPriorityFee) {
        console.warn(
          `⚠️ Priority fee too low (${ethers.formatUnits(priorityFeeBigInt, "gwei")} gwei), increasing to 2 gwei`
        );
        fixedTx.maxPriorityFeePerGas = minPriorityFee;
      } else {
        fixedTx.maxPriorityFeePerGas = priorityFeeBigInt;
      }
    } catch {
      console.warn("⚠️ Invalid priority fee format, using minimum 2 gwei");
      fixedTx.maxPriorityFeePerGas = minPriorityFee;
    }
  }

  if (fixedTx.maxFeePerGas) {
    let maxFeeBigInt: bigint;

    try {
      // Handle different input formats
      if (typeof fixedTx.maxFeePerGas === "string") {
        if (fixedTx.maxFeePerGas.includes(".")) {
          // Convert from gwei to wei
          maxFeeBigInt = ethers.parseUnits(fixedTx.maxFeePerGas, "gwei");
        } else {
          maxFeeBigInt = BigInt(fixedTx.maxFeePerGas);
        }
      } else {
        maxFeeBigInt = BigInt(fixedTx.maxFeePerGas);
      }

      if (maxFeeBigInt < minMaxFee) {
        console.warn(
          `⚠️ Max fee too low (${ethers.formatUnits(maxFeeBigInt, "gwei")} gwei), increasing to 15 gwei`
        );
        fixedTx.maxFeePerGas = minMaxFee;
      } else {
        fixedTx.maxFeePerGas = maxFeeBigInt;
      }
    } catch {
      console.warn("⚠️ Invalid max fee format, using minimum 15 gwei");
      fixedTx.maxFeePerGas = minMaxFee;
    }
  }

  // Ensure max fee is at least priority fee + some base fee
  if (fixedTx.maxPriorityFeePerGas && fixedTx.maxFeePerGas) {
    const priorityFee = BigInt(fixedTx.maxPriorityFeePerGas);
    const maxFee = BigInt(fixedTx.maxFeePerGas);
    const minRequiredMaxFee = priorityFee + ethers.parseUnits("10", "gwei"); // priority + 10 gwei base

    if (maxFee < minRequiredMaxFee) {
      console.warn(
        `⚠️ Max fee (${ethers.formatUnits(maxFee, "gwei")} gwei) too low for priority fee, adjusting to ${ethers.formatUnits(minRequiredMaxFee, "gwei")} gwei`
      );
      fixedTx.maxFeePerGas = minRequiredMaxFee;
    }
  }

  return fixedTx;
};

export const getChainConfig = (chain: string) => {
  const chainMap: Record<
    string,
    { chainId: number; dexName: string; version: string }
  > = {
    BASE_MAINNET: { chainId: 8453, dexName: "mayanfinance", version: "3" },
    ETH_MAINNET: { chainId: 1, dexName: "mayanfinance", version: "3" },
    BSC_MAINNET: { chainId: 56, dexName: "mayanfinance", version: "2" },
    SOLANA_MAINNET: { chainId: 103, dexName: "mayanfinance", version: "1" },
  };

  return chainMap[chain] || chainMap["ETH_MAINNET"];
};

export const getApiKeyForChain = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || "";
    case 56:
      return process.env.NEXT_PUBLIC_BSCSCAN_API_KEY || "";
    case 8453:
      return process.env.NEXT_PUBLIC_BASESCAN_API_KEY || "";
    default:
      console.warn(`No API key configured for chain ID ${chainId}`);
      return "";
  }
};

export const submitTransactionViaAPI = async (
  signedTxHex: string,
  apiKey: string = ""
): Promise<{ success: boolean; hash?: string; error?: string }> => {
  try {
    const hexValue = signedTxHex.startsWith("0x")
      ? signedTxHex
      : `0x${signedTxHex}`;

    console.log("Submitting transaction via BaseScan API");

    const effectiveApiKey =
      apiKey || process.env.NEXT_PUBLIC_BASESCAN_API_KEY || "";

    const response = await fetch(`https://api.basescan.org/api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        module: "proxy",
        action: "eth_sendRawTransaction",
        hex: hexValue,
        apikey: effectiveApiKey,
      }).toString(),
    });

    const data = await response.json();

    if (data && data.result) {
      console.log(
        `Transaction submitted successfully via BaseScan API: ${data.result}`
      );
      return { success: true, hash: data.result };
    } else if (data && data.error) {
      console.error(
        `BaseScan API submission error: ${JSON.stringify(data.error)}`
      );
      return {
        success: false,
        error: data.error.message || "Unknown error from BaseScan API",
      };
    } else {
      console.error("Unexpected response from BaseScan API:", data);
      return { success: false, error: "Unexpected response format" };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Error submitting via BaseScan API: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
};

export const sendTransaction = async (
  signedTx: string,
  chain: string,
  useMevProtection: boolean = true
): Promise<TransactionResult> => {
  try {
    const prefixedTx = addHexPrefix(signedTx);

    const parsedTx = ethers.Transaction.from(prefixedTx);

    if (!parsedTx.to || !parsedTx.data) {
      throw new Error("Invalid transaction format");
    }
    const chainConfig = getChainConfig(chain);
    const chainId = chainConfig.chainId;

    if (Number(parsedTx.chainId) !== chainId) {
      console.error(
        `Chain ID mismatch in signed transaction! Found ${parsedTx.chainId}, expected ${chainId}`
      );
      throw new Error(
        `Chain ID mismatch: Transaction has chainId ${parsedTx.chainId} but should be ${chainId}`
      );
    }

    console.log(`Sending transaction with chainId: ${parsedTx.chainId}`);

    if (useMevProtection) {
      try {
        const { submitMevProtectedTransaction } = await import(
          "./mev-protection"
        );
        console.log("Attempting MEV protected transaction submission...");

        const mevResult = await submitMevProtectedTransaction(
          prefixedTx,
          chainId,
          "swap"
        );

        if (mevResult.success && mevResult.transactionHash) {
          console.log(
            `MEV protected transaction submitted: ${mevResult.transactionHash}`
          );
          return {
            txHash: mevResult.transactionHash,
            status: "pending",
            timestamp: new Date().toISOString(),
          };
        } else {
          console.log(
            "MEV protection failed, falling back to regular submission"
          );
        }
      } catch (mevError) {
        console.warn(
          "MEV protection error, falling back to regular submission:",
          mevError
        );
      }
    }

    const rpcUrl = RPC_PROVIDERS[chainId as keyof typeof RPC_PROVIDERS];
    if (!rpcUrl) {
      throw new Error(`No RPC provider available for chain ID ${chainId}`);
    }
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    let tx;
    let txHash;

    try {
      tx = await provider.broadcastTransaction(prefixedTx);
      txHash = tx.hash;
      console.log(`Transaction sent via standard RPC method: ${txHash}`);
    } catch (broadcastError: any) {
      if (chainId === 8453) {
        console.log(
          "Standard broadcast failed on Base network, trying BaseScan API..."
        );

        const apiKey = getApiKeyForChain(chainId);

        const apiResult = await submitTransactionViaAPI(prefixedTx, apiKey);

        if (apiResult.success && apiResult.hash) {
          const txHash: string = apiResult.hash;
          console.log("Transaction sent via BaseScan API:", txHash);

          tx = {
            hash: txHash,
            wait: async () => {
              let attempts = 0;
              while (attempts < 20) {
                try {
                  const receipt = await provider.getTransactionReceipt(txHash);
                  if (receipt && receipt.blockNumber) {
                    return receipt;
                  }
                } catch (e) {
                  console.warn("Error checking receipt:", e);
                }

                await new Promise((resolve) => setTimeout(resolve, 5000));
                attempts++;
              }
              throw new Error("Transaction confirmation timeout");
            },
          };
        } else {
          throw new Error(
            `BaseScan API submission failed: ${
              apiResult.error || "Unknown error"
            }`
          );
        }
      } else {
        throw broadcastError;
      }
    }

    const result: TransactionResult = {
      txHash: tx.hash,
      status: "pending",
      timestamp: new Date().toISOString(),
    };

    try {
      console.log(
        `Waiting for transaction ${tx.hash} to be confirmed on chain ${chainId}...`
      );

      const receipt = (await Promise.race([
        tx.wait(1),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Transaction confirmation timeout")),
            60000
          )
        ),
      ])) as ethers.TransactionReceipt;

      if (!receipt) {
        console.warn(`No receipt received for transaction ${tx.hash}`);
        return {
          ...result,
          status: "pending",
        };
      }

      return {
        ...result,
        status: receipt.status === 1 ? "success" : "failed",
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (waitError) {
      console.warn(`Error waiting for transaction: ${waitError}`);

      try {
        const txStatus = await provider.getTransaction(tx.hash);

        if (!txStatus || !txStatus.blockNumber) {
          console.log(`Transaction ${tx.hash} is still pending or not found`);

          if (chainId === 8453) {
            console.log("Base network transactions may take longer to confirm");
          }

          return {
            ...result,
            status: "pending",
          };
        }
      } catch (statusError) {
        console.error(`Failed to get transaction status: ${statusError}`);
        return {
          ...result,
          status: "not_found",
        };
      }

      return result;
    }
  } catch (error: any) {
    console.error("Transaction failed:", error);

    if (
      error.message.includes("not found") ||
      error.message.includes("could not be found")
    ) {
      return {
        txHash: error.transactionHash || "unknown",
        status: "not_found",
        timestamp: new Date().toISOString(),
      };
    }

    throw new Error(`Transaction failed: ${error.message}`);
  }
};
export const serializeTransaction = async (
  transaction: any
): Promise<string> => {
  // Helper function to convert values to proper format for ethers v6
  const toBigInt = (value: string | number | bigint): bigint => {
    if (typeof value === "bigint") {
      return value;
    }
    if (typeof value === "number") {
      return BigInt(value);
    }
    if (typeof value === "string") {
      if (value.startsWith("0x")) {
        return BigInt(value);
      }
      // Handle very small decimal numbers like "0.002" - convert to wei first
      if (value.includes(".")) {
        try {
          // Assume it's in gwei and convert to wei
          return ethers.parseUnits(value, "gwei");
        } catch {
          return BigInt(value);
        }
      }
      return BigInt(value);
    }
    return BigInt(String(value));
  };

  // Validate gas fees before proceeding using the global validation function
  const validatedTx = validateAndFixGasFees(transaction);

  // Create transaction object compatible with ethers v6
  const txData = {
    to: validatedTx.to,
    nonce: validatedTx.nonce,
    gasLimit: toBigInt(validatedTx.gasLimit),
    maxPriorityFeePerGas: validatedTx.maxPriorityFeePerGas
      ? toBigInt(validatedTx.maxPriorityFeePerGas)
      : undefined,
    maxFeePerGas: validatedTx.maxFeePerGas
      ? toBigInt(validatedTx.maxFeePerGas)
      : undefined,
    value: toBigInt(validatedTx.value || "0x0"),
    data: validatedTx.data,
    chainId: validatedTx.chainId,
    type: 2, // EIP-1559
  };

  console.log(`Serializing transaction with chainId: ${validatedTx.chainId}`);
  console.log(
    `Gas fees: maxFee=${ethers.formatUnits(txData.maxFeePerGas || BigInt(0), "gwei")} gwei, priorityFee=${ethers.formatUnits(txData.maxPriorityFeePerGas || BigInt(0), "gwei")} gwei`
  );

  try {
    // Create the transaction and get unsigned serialized form
    const tx = ethers.Transaction.from(txData);
    return tx.unsignedSerialized;
  } catch (error) {
    console.error("Transaction serialization error:", error);
    console.error("Transaction data:", txData);
    throw error;
  }
};
