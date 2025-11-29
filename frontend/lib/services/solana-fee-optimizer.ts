import { Connection, ComputeBudgetProgram, TransactionInstruction } from "@solana/web3.js";

export interface SolanaFeeConfig {
  computeUnitPrice: number; // micro-lamports per compute unit
  computeUnitLimit: number; // max compute units
}

export class SolanaFeeOptimizer {
  private static readonly DEFAULT_COMPUTE_UNIT_LIMIT = 200_000; // Conservative limit
  private static readonly MIN_COMPUTE_UNIT_PRICE = 1; // 1 micro-lamport (very low)
  private static readonly MAX_COMPUTE_UNIT_PRICE = 1000; // 1000 micro-lamports (reasonable max)

  /**
   * Get optimized fee configuration for Solana transactions
   * Aims for very low fees while ensuring transaction success
   */
  static async getOptimizedFees(
    connection: Connection,
    recentPriorityFees?: number[]
  ): Promise<SolanaFeeConfig> {
    try {
      // Get recent priority fees if not provided
      if (!recentPriorityFees) {
        try {
          const recentPriorityFeesResponse = await connection.getRecentPrioritizationFees();
          recentPriorityFees = recentPriorityFeesResponse
            .map(fee => fee.prioritizationFee)
            .filter(fee => fee > 0)
            .slice(0, 20); // Take last 20 samples
        } catch (error) {
          console.warn("Could not fetch recent priority fees, using minimum:", error);
          recentPriorityFees = [];
        }
      }

      let computeUnitPrice = this.MIN_COMPUTE_UNIT_PRICE;

      if (recentPriorityFees.length > 0) {
        // Calculate a very conservative priority fee
        const avgFee = recentPriorityFees.reduce((sum, fee) => sum + fee, 0) / recentPriorityFees.length;
        const medianFee = recentPriorityFees.sort((a, b) => a - b)[Math.floor(recentPriorityFees.length / 2)];
        
        // Use the lower of average or median, with a small buffer
        const baseFee = Math.min(avgFee, medianFee);
        computeUnitPrice = Math.max(
          this.MIN_COMPUTE_UNIT_PRICE,
          Math.min(
            Math.ceil(baseFee * 1.1), // Only 10% buffer
            this.MAX_COMPUTE_UNIT_PRICE
          )
        );

        console.log(`📊 Solana fee analysis: avg=${avgFee}, median=${medianFee}, selected=${computeUnitPrice} micro-lamports`);
      } else {
        console.log(`💰 Using minimum Solana priority fee: ${computeUnitPrice} micro-lamports`);
      }

      return {
        computeUnitPrice,
        computeUnitLimit: this.DEFAULT_COMPUTE_UNIT_LIMIT,
      };
    } catch (error) {
      console.error("Error optimizing Solana fees, using minimum:", error);
      return {
        computeUnitPrice: this.MIN_COMPUTE_UNIT_PRICE,
        computeUnitLimit: this.DEFAULT_COMPUTE_UNIT_LIMIT,
      };
    }
  }

  /**
   * Create compute budget instructions for optimized fees
   */
  static createComputeBudgetInstructions(config: SolanaFeeConfig): TransactionInstruction[] {
    const instructions: TransactionInstruction[] = [];

    // Set compute unit limit
    instructions.push(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: config.computeUnitLimit,
      })
    );

    // Set compute unit price (priority fee)
    if (config.computeUnitPrice > 0) {
      instructions.push(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: config.computeUnitPrice,
        })
      );
    }

    return instructions;
  }

  /**
   * Calculate estimated fee in SOL
   */
  static calculateEstimatedFee(config: SolanaFeeConfig): number {
    const priorityFeeInLamports = (config.computeUnitPrice * config.computeUnitLimit) / 1_000_000;
    const baseFeeInLamports = 5000; // Base transaction fee
    const totalFeeInLamports = priorityFeeInLamports + baseFeeInLamports;
    return totalFeeInLamports / 1_000_000_000; // Convert to SOL
  }

  /**
   * Get fee estimate in USD (requires SOL price)
   */
  static calculateEstimatedFeeUSD(config: SolanaFeeConfig, solPriceUSD: number): number {
    const feeInSOL = this.calculateEstimatedFee(config);
    return feeInSOL * solPriceUSD;
  }
}