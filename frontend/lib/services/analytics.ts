// Shared analytics data storage
// In production, this would be replaced with actual database operations

export interface FaucetAccessData {
  country: string;
  city: string;
  countryCode: string;
  timestamp: string;
  userAgent: string;
  id: string;
}

export interface FaucetSpinData {
  walletAddress: string;
  country: string;
  city: string;
  countryCode: string;
  prizeAmount: string;
  timestamp: string;
  id: string;
}

// In-memory storage (replace with database in production)
let faucetAccessLog: FaucetAccessData[] = [];
let faucetSpinLog: FaucetSpinData[] = [];

export class AnalyticsService {
  // Faucet Access Methods
  static addFaucetAccess(data: Omit<FaucetAccessData, "id">): FaucetAccessData {
    const record: FaucetAccessData = {
      ...data,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    faucetAccessLog.push(record);

    // Keep only last 10000 records to prevent memory issues
    if (faucetAccessLog.length > 10000) {
      faucetAccessLog = faucetAccessLog.slice(-10000);
    }

    return record;
  }

  static getFaucetAccesses(): FaucetAccessData[] {
    return faucetAccessLog;
  }

  // Faucet Spin Methods
  static addFaucetSpin(data: Omit<FaucetSpinData, "id">): FaucetSpinData {
    const record: FaucetSpinData = {
      ...data,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    faucetSpinLog.push(record);

    // Keep only last 10000 records to prevent memory issues
    if (faucetSpinLog.length > 10000) {
      faucetSpinLog = faucetSpinLog.slice(-10000);
    }

    return record;
  }

  static getFaucetSpins(): FaucetSpinData[] {
    return faucetSpinLog;
  }

  // Analytics Calculations
  static getAccessAnalytics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayAccess = faucetAccessLog.filter(
      (record) => new Date(record.timestamp) >= today
    );

    const countryStats = faucetAccessLog.reduce(
      (acc, record) => {
        acc[record.country] = (acc[record.country] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const topCountries = Object.entries(countryStats)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      accessesToday: todayAccess.length,
      totalAccesses: faucetAccessLog.length,
      uniqueCountries: Object.keys(countryStats).length,
      topCountries,
      lastUpdated: new Date().toISOString(),
    };
  }

  static getSpinAnalytics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todaySpins = faucetSpinLog.filter(
      (record) => new Date(record.timestamp) >= today
    );

    const countryStats = faucetSpinLog.reduce(
      (acc, record) => {
        acc[record.country] = (acc[record.country] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const topCountries = Object.entries(countryStats)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate unique users (by wallet address)
    const uniqueWallets = new Set(
      faucetSpinLog.map((record) => record.walletAddress)
    );

    return {
      spinsToday: todaySpins.length,
      totalSpins: faucetSpinLog.length,
      uniqueUsers: uniqueWallets.size,
      topCountries,
      lastUpdated: new Date().toISOString(),
    };
  }

  static getCombinedAnalytics() {
    const accessAnalytics = this.getAccessAnalytics();
    const spinAnalytics = this.getSpinAnalytics();

    // Combine country data from both accesses and spins
    const combinedCountryStats: Record<string, number> = {};

    // Add access data
    accessAnalytics.topCountries.forEach(({ country, count }) => {
      combinedCountryStats[country] =
        (combinedCountryStats[country] || 0) + count;
    });

    // Add spin data (weighted more heavily since these are actual usage)
    spinAnalytics.topCountries.forEach(({ country, count }) => {
      combinedCountryStats[country] =
        (combinedCountryStats[country] || 0) + count * 2;
    });

    const combinedTopCountries = Object.entries(combinedCountryStats)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      spinsToday: spinAnalytics.spinsToday,
      totalSpins: spinAnalytics.totalSpins,
      uniqueUsers: spinAnalytics.uniqueUsers,
      accessesToday: accessAnalytics.accessesToday,
      totalAccesses: accessAnalytics.totalAccesses,
      topCountries: combinedTopCountries,
      lastUpdated: new Date().toISOString(),
    };
  }
}
