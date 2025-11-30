/**
 * Aptos Strategy Executor
 * Executes strategies on the Aptos blockchain using Turnkey signing
 */

import { 
  Aptos,
  Network,
  AptosConfig,
  AccountAuthenticatorEd25519,
  Ed25519PublicKey,
  Ed25519Signature
} from "@aptos-labs/ts-sdk";
import { AptosIntent } from "./intent-parser";

// Configuration
const APTOS_NETWORK = (process.env.NEXT_PUBLIC_APTOS_NETWORK || 'testnet') as Network;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x123';

// Type for the signRawPayload function
type SignRawPayload = (payload: {
  signWith: string;
  payload: string;
  encoding: string;
  hashFunction: string;
}) => Promise<{ signature: string }>;

// Hex utility
function hexToUint8Array(hexString: string): Uint8Array {
  const hex = hexString.startsWith("0x") ? hexString.slice(2) : hexString;
  const pairs = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)));
}

// Helper function to sign and submit transaction
async function signAndSubmitTransaction(
  client: Aptos,
  transaction: SimpleTxnType | MultiTxnType,
  publicKey: Uint8Array,
  signature: Uint8Array
) {
  const publicKeyObj = new Ed25519PublicKey(publicKey);
  const signatureObj = new Ed25519Signature(signature);
  const authenticator = new AccountAuthenticatorEd25519(publicKeyObj, signatureObj);

  // Submit the transaction object directly (SDK accepts Simple/MultiAgent transaction objects)
  if ((transaction as unknown as { secondarySignerAddresses?: unknown[] })?.secondarySignerAddresses?.length) {
    return client.transaction.submit.multiAgent({
      transaction: transaction as MultiTxnType,
      senderAuthenticator: authenticator,
      additionalSignersAuthenticators: []
    });
  }
  return client.transaction.submit.simple({
    transaction: transaction as SimpleTxnType,
    senderAuthenticator: authenticator,
  });
}

// Input entry function data type (what the SDK build.simple expects)
type InputEntryFunctionData = {
  function: `${string}::${string}::${string}`;
  typeArguments: string[];
  functionArguments: (string | number | boolean)[];
};

// Initialize Aptos client
const aptosConfig = new AptosConfig({
  network: APTOS_NETWORK,
  fullnode: APTOS_NETWORK === 'mainnet' 
    ? 'https://fullnode.mainnet.aptoslabs.com'
    : 'https://fullnode.testnet.aptoslabs.com',
  faucet: APTOS_NETWORK === 'testnet' 
    ? 'https://faucet.testnet.aptoslabs.com'
    : undefined
});

const aptosClient = new Aptos(aptosConfig);

// Derive SDK parameter types to avoid explicit any
type TxnPayload = Parameters<typeof aptosClient.transaction.build.simple>[0]["data"];
type SimpleTxnType = Parameters<typeof aptosClient.transaction.submit.simple>[0]["transaction"];
type MultiTxnType = Parameters<typeof aptosClient.transaction.submit.multiAgent>[0]["transaction"];

// Define APTOS_CONFIG constant
const APTOS_CONFIG = {
  network: APTOS_NETWORK,
  fullnode: APTOS_NETWORK === 'mainnet' 
    ? 'https://fullnode.mainnet.aptoslabs.com' 
    : 'https://fullnode.testnet.aptoslabs.com',
  faucet: APTOS_NETWORK === 'mainnet' 
    ? undefined 
    : 'https://faucet.testnet.aptoslabs.com',
  strategyTypes: {
    yield: 'yield',
    liquidity: 'liquidity',
    arbitrage: 'arbitrage',
    YIELD_OPT: 'YIELD_OPT',
    DCA: 'DCA'
  } as const,
  tokens: {
    APT: { 
      type: '0x1::aptos_coin::AptosCoin',
      decimals: 8
    } as const,
    USDC: { 
      type: '0x1::coin::T',
      decimals: 6
    } as const,
    USDT: { 
      type: '0x1::coin::T',
      decimals: 6
    } as const,
    DAI: { 
      type: '0x1::coin::T',
      decimals: 18
    } as const
  }
} as const;

// Payload builders for strategy management
function buildPauseStrategyPayload(strategyId: number): InputEntryFunctionData {
  return {
    function: `${CONTRACT_ADDRESS}::strategy::pause_strategy`,
    typeArguments: [],
    functionArguments: [strategyId.toString()]
  };
}

function buildResumeStrategyPayload(strategyId: number): InputEntryFunctionData {
  return {
    function: `${CONTRACT_ADDRESS}::strategy::resume_strategy`,
    typeArguments: [],
    functionArguments: [strategyId.toString()]
  };
}

function buildCancelStrategyPayload(strategyId: number): InputEntryFunctionData {
  return {
    function: `${CONTRACT_ADDRESS}::strategy::cancel_strategy`,
    typeArguments: [],
    functionArguments: [strategyId.toString()]
  };
}

// Generic strategy creation payload
function buildCreateStrategyPayload(
  strategyType: string,
  paramsJson: string,
  intervalSeconds: number,
  maxExecutions: number
): InputEntryFunctionData {
  return {
    function: `${CONTRACT_ADDRESS}::strategy::create_strategy`,
    typeArguments: [],
    functionArguments: [strategyType, paramsJson, intervalSeconds, maxExecutions]
  };
}

// Lending helpers
function buildSupplyPayload(coinType: string, amount: number | bigint): InputEntryFunctionData {
  return {
    function: `${CONTRACT_ADDRESS}::lending::supply`,
    typeArguments: [coinType],
    functionArguments: [amount.toString()]
  };
}

function buildBorrowPayload(coinType: string, amount: number | bigint): InputEntryFunctionData {
  return {
    function: `${CONTRACT_ADDRESS}::lending::borrow`,
    typeArguments: [coinType],
    functionArguments: [amount.toString()]
  };
}

function buildSwapPayload(
  fromType: string,
  toType: string,
  amountIn: number | bigint,
  minAmountOut: number | bigint
): InputEntryFunctionData {
  return {
    function: `${CONTRACT_ADDRESS}::dex::swap_exact_tokens_for_tokens`,
    typeArguments: [fromType, toType],
    functionArguments: [amountIn.toString(), minAmountOut.toString()]
  };
}

// Result type for execution
type ExecutionResult = {
  success: boolean;
  transactionHash?: string;
  error?: string;
  message?: string;
};

// (removed duplicate snake_case InputEntryFunctionData definition)

// Note: Named exports are provided at function declarations below.

/**
 * Execute an Aptos intent with Turnkey signing
 */
export async function executeAptosIntent(
    intent: AptosIntent,
    userAddress: string,
    userPublicKeyHex: string,
    signRawPayload: SignRawPayload
): Promise<ExecutionResult> {
    try {
        let payload: InputEntryFunctionData;

        switch (intent.type) {
            case "yield":
                payload = await buildYieldStrategyPayload(intent);
                break;

            case "dca":
                payload = await buildDCAStrategyPayload(intent);
                break;

            case "lending":
                payload = buildLendingPayload(intent);
                break;

            case "borrow":
                payload = buildBorrowingPayload(intent);
                break;

            case "swap":
                payload = buildSwappingPayload(intent);
                break;

            default:
                return {
                    success: false,
                    error: `Unsupported intent type: ${intent.type}`,
                };
        }

        // Build transaction
        const transaction = await aptosClient.transaction.build.simple({
            sender: userAddress,
            data: payload as TxnPayload,
        });

        // Get the signing message from the original built transaction
        const message = await aptosClient.transaction.getSigningMessage({ transaction });
        const txnHex = Buffer.from(message).toString("hex");

        console.log("Signing Aptos transaction with Turnkey...");
        console.log("Transaction hex:", txnHex.substring(0, 100) + "...");

        // Sign with Turnkey using raw payload signing
        const signResult = await signRawPayload({
            signWith: userAddress,
            payload: txnHex,
            encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
            hashFunction: "HASH_FUNCTION_NOT_APPLICABLE", // Correct for Ed25519
        });

        if (!signResult.signature) {
            throw new Error("Failed to sign transaction with Turnkey");
        }

        console.log("Transaction signed successfully");

        // Create Ed25519 public key and signature
        const publicKeyBytes = Buffer.from(userPublicKeyHex, "hex");
        const signatureBytes = Buffer.from(signResult.signature, "hex");

        const publicKey = new Ed25519PublicKey(publicKeyBytes);
        const signature = new Ed25519Signature(signatureBytes);

        // Create authenticator
        const authenticator = new AccountAuthenticatorEd25519(publicKey, signature);

        console.log("Submitting transaction to Aptos...");

        // Submit transaction
        const pendingTxn = await aptosClient.transaction.submit.simple({
            transaction,
            senderAuthenticator: authenticator,
        });

        console.log("Transaction submitted:", pendingTxn.hash);

        // Wait for confirmation
        await aptosClient.waitForTransaction({
            transactionHash: pendingTxn.hash,
        });

        console.log("Transaction confirmed!");

        return {
            success: true,
            transactionHash: pendingTxn.hash,
            message: `Transaction confirmed: ${pendingTxn.hash}`,
        };
    } catch (error) {
        console.error("Error executing Aptos intent:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Build payload for yield optimization strategy
 */
async function buildYieldStrategyPayload(
    intent: AptosIntent
): Promise<InputEntryFunctionData> {
    const params = {
        token: intent.token || "APT",
        amount: intent.amount,
        minApy: intent.parameters?.minApy || 5,
        riskLevel: intent.parameters?.riskLevel || "medium",
        autoMove: intent.parameters?.autoMove || false,
    };

    // Check interval: daily for yield optimization
    const intervalSeconds = 86400; // 24 hours

    return buildCreateStrategyPayload(
        APTOS_CONFIG.strategyTypes.YIELD_OPT,
        JSON.stringify(params),
        intervalSeconds,
        0 // unlimited executions
    );
}

/**
 * Build payload for DCA strategy
 */
async function buildDCAStrategyPayload(
    intent: AptosIntent
): Promise<InputEntryFunctionData> {
    const params = {
        fromToken: intent.token || "APT",
        toToken: intent.targetToken || "USDC",
        amountPerExecution: intent.amount,
        frequency: intent.parameters?.frequency || "daily",
    };

    const intervalSeconds = intent.parameters?.interval || 86400;

    return buildCreateStrategyPayload(
        APTOS_CONFIG.strategyTypes.DCA,
        JSON.stringify(params),
        intervalSeconds,
        0 // unlimited executions
    );
}

/**
 * Build payload for lending (supply)
 */
function buildLendingPayload(intent: AptosIntent): InputEntryFunctionData {
    const coinType = APTOS_CONFIG.tokens.APT.type; // Default to APT
    const amount = (intent.amount || 0) * 100000000; // Convert to smallest unit (8 decimals)

    return buildSupplyPayload(coinType, amount);
}

/**
 * Build payload for borrowing
 */
function buildBorrowingPayload(intent: AptosIntent): InputEntryFunctionData {
    const coinType = APTOS_CONFIG.tokens.APT.type; // Default to APT
    const amount = (intent.amount || 0) * 100000000; // Convert to smallest unit

    return buildBorrowPayload(coinType, amount);
}

/**
 * Build payload for swapping
 */
function buildSwappingPayload(intent: AptosIntent): InputEntryFunctionData {
    const coinTypeIn = APTOS_CONFIG.tokens.APT.type;
    const coinTypeOut = APTOS_CONFIG.tokens.APT.type; // TODO: Add more token types
    const amountIn = (intent.amount || 0) * 100000000;
    const minAmountOut = amountIn * 0.99; // 1% slippage

    return buildSwapPayload(coinTypeIn, coinTypeOut, amountIn, minAmountOut);
}

/**
 * Helper function to execute strategy actions
 */
async function executeStrategyAction(
    payload: InputEntryFunctionData,
    userAddress: string,
    userPublicKeyHex: string,
    signRawPayload: SignRawPayload,
    actionName: string
): Promise<ExecutionResult> {
    try {
        // Build the transaction
        const rawTxn = await aptosClient.transaction.build.simple({
            sender: userAddress,
            data: payload,
        });

        // Get the signing message
        const signingMessage = await aptosClient.transaction.getSigningMessage({
            transaction: rawTxn,
        });

        // Convert the signing message to a hex string
        const message = typeof signingMessage === 'string' 
            ? signingMessage
            : Buffer.from(signingMessage).toString('hex');

        // Sign with Turnkey using raw payload signing
        const signResult = await signRawPayload({
            signWith: userAddress,
            payload: message,
            encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
            hashFunction: "HASH_FUNCTION_NOT_APPLICABLE",
        });

        if (!signResult.signature) {
            throw new Error("Failed to sign transaction");
        }

        // Convert hex strings to Uint8Array
        const publicKey = hexToUint8Array(userPublicKeyHex);
        const signature = hexToUint8Array(signResult.signature);

        // Submit the transaction
        const pendingTxn = await signAndSubmitTransaction(
            aptosClient,
            rawTxn,
            publicKey,
            signature
        );

        // Wait for transaction confirmation
        await aptosClient.waitForTransaction({
            transactionHash: pendingTxn.hash,
        });

        return {
            success: true,
            transactionHash: pendingTxn.hash,
            message: `${actionName} successful: ${pendingTxn.hash}`,
        };
    } catch (error) {
        console.error(`Error ${actionName}:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Pause a strategy
 */
export async function pauseStrategy(
    strategyId: number,
    userAddress: string,
    userPublicKeyHex: string,
    signRawPayload: SignRawPayload
): Promise<ExecutionResult> {
    const payload = buildPauseStrategyPayload(strategyId);
    return executeStrategyAction(
        payload,
        userAddress,
        userPublicKeyHex,
        signRawPayload,
        "Pause strategy"
    );
}

/**
 * Resume a strategy
 */
export async function resumeStrategy(
    strategyId: number,
    userAddress: string,
    userPublicKeyHex: string,
    signRawPayload: SignRawPayload
): Promise<ExecutionResult> {
    const payload = buildResumeStrategyPayload(strategyId);
    return executeStrategyAction(
        payload,
        userAddress,
        userPublicKeyHex,
        signRawPayload,
        "Resume strategy"
    );
}

/**
 * Cancel a strategy
 */
export async function cancelStrategy(
    strategyId: number,
    userAddress: string,
    userPublicKeyHex: string,
    signRawPayload: SignRawPayload
): Promise<ExecutionResult> {
    const payload = buildCancelStrategyPayload(strategyId);
    return executeStrategyAction(
        payload,
        userAddress,
        userPublicKeyHex,
        signRawPayload,
        "Cancel strategy"
    );
}
