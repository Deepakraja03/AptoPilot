import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  PortfolioData,
  IntentsData,
  TransactionsData,
  TokensChainsData,
  CrossChainOpportunitiesData,
} from "@/lib/hooks/use-dashboard-data";
import { OpportunityFilters } from "@/lib/services/cross-chain-opportunities-service";

// Dashboard state interface
export interface DashboardState {
  portfolio: PortfolioData | null;
  intents: IntentsData | null;
  transactions: TransactionsData | null;
  tokensChains: TokensChainsData | null;
  crossChainOpportunities: CrossChainOpportunitiesData | null;
  loading: {
    portfolio: boolean;
    intents: boolean;
    transactions: boolean;
    tokensChains: boolean;
    crossChainOpportunities: boolean;
  };
  error: {
    portfolio: string | null;
    intents: string | null;
    transactions: string | null;
    tokensChains: string | null;
    crossChainOpportunities: string | null;
  };
  lastFetch: {
    portfolio: string | null;
    intents: string | null;
    transactions: string | null;
    tokensChains: string | null;
    crossChainOpportunities: string | null;
  };
}

const initialState: DashboardState = {
  portfolio: null,
  intents: null,
  transactions: null,
  tokensChains: null,
  crossChainOpportunities: null,
  loading: {
    portfolio: false,
    intents: false,
    transactions: false,
    tokensChains: false,
    crossChainOpportunities: false,
  },
  error: {
    portfolio: null,
    intents: null,
    transactions: null,
    tokensChains: null,
    crossChainOpportunities: null,
  },
  lastFetch: {
    portfolio: null,
    intents: null,
    transactions: null,
    tokensChains: null,
    crossChainOpportunities: null,
  },
};

// Generic fetch function
const fetchData = async <T>(endpoint: string, organizationId: string): Promise<T> => {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-organization-id": organizationId,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
};

// Async thunks for each data type
export const fetchPortfolioData = createAsyncThunk(
  "dashboard/fetchPortfolioData",
  async (organizationId: string) => {
    return await fetchData<PortfolioData>("/api/dashboard/portfolio", organizationId);
  }
);

export const fetchIntentsData = createAsyncThunk(
  "dashboard/fetchIntentsData",
  async (organizationId: string) => {
    return await fetchData<IntentsData>("/api/dashboard/intents", organizationId);
  }
);

export const fetchTransactionsData = createAsyncThunk(
  "dashboard/fetchTransactionsData",
  async (params: { organizationId: string; limit?: number }) => {
    const { organizationId, limit = 5 } = params;
    return await fetchData<TransactionsData>(
      `/api/dashboard/transactions?limit=${limit}`,
      organizationId
    );
  }
);

export const fetchTokensChainsData = createAsyncThunk(
  "dashboard/fetchTokensChainsData",
  async (organizationId: string) => {
    return await fetchData<TokensChainsData>("/api/dashboard/tokens-chains", organizationId);
  }
);

export const fetchCrossChainOpportunitiesData = createAsyncThunk(
  "dashboard/fetchCrossChainOpportunitiesData",
  async (params: { organizationId: string; filters?: OpportunityFilters }) => {
    const { organizationId, filters } = params;
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (filters?.minApy) queryParams.append("minApy", filters.minApy.toString());
    if (filters?.maxRisk) queryParams.append("maxRisk", filters.maxRisk);
    if (filters?.categories) queryParams.append("categories", filters.categories.join(","));
    if (filters?.chains) queryParams.append("chains", filters.chains.join(","));
    if (filters?.minAmount) queryParams.append("minAmount", filters.minAmount.toString());
    if (filters?.maxGasFees) queryParams.append("maxGasFees", filters.maxGasFees.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/dashboard/cross-chain-opportunities${queryString ? `?${queryString}` : ""}`;
    
    return await fetchData<CrossChainOpportunitiesData>(endpoint, organizationId);
  }
);

// Thunk to fetch all dashboard data
export const fetchAllDashboardData = createAsyncThunk(
  "dashboard/fetchAllData",
  async (organizationId: string, { dispatch }) => {
    const promises = [
      dispatch(fetchPortfolioData(organizationId)),
      dispatch(fetchIntentsData(organizationId)),
      dispatch(fetchTransactionsData({ organizationId })),
      dispatch(fetchTokensChainsData(organizationId)),
      dispatch(fetchCrossChainOpportunitiesData({ organizationId })),
    ];

    await Promise.allSettled(promises);
    return true;
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboardData: () => {
      return { ...initialState };
    },
    setDashboardError: (state, action: PayloadAction<{ 
      dataType: keyof DashboardState["error"]; 
      error: string 
    }>) => {
      const { dataType, error } = action.payload;
      state.error[dataType] = error;
      state.loading[dataType] = false;
    },
    clearDashboardError: (state, action: PayloadAction<keyof DashboardState["error"]>) => {
      state.error[action.payload] = null;
    },
  },
  extraReducers: (builder) => {
    // Portfolio data
    builder
      .addCase(fetchPortfolioData.pending, (state) => {
        state.loading.portfolio = true;
        state.error.portfolio = null;
      })
      .addCase(fetchPortfolioData.fulfilled, (state, action) => {
        state.loading.portfolio = false;
        state.portfolio = action.payload;
        state.lastFetch.portfolio = new Date().toISOString();
      })
      .addCase(fetchPortfolioData.rejected, (state, action) => {
        state.loading.portfolio = false;
        state.error.portfolio = action.error.message || "Failed to fetch portfolio data";
      });

    // Intents data
    builder
      .addCase(fetchIntentsData.pending, (state) => {
        state.loading.intents = true;
        state.error.intents = null;
      })
      .addCase(fetchIntentsData.fulfilled, (state, action) => {
        state.loading.intents = false;
        state.intents = action.payload;
        state.lastFetch.intents = new Date().toISOString();
      })
      .addCase(fetchIntentsData.rejected, (state, action) => {
        state.loading.intents = false;
        state.error.intents = action.error.message || "Failed to fetch intents data";
      });

    // Transactions data
    builder
      .addCase(fetchTransactionsData.pending, (state) => {
        state.loading.transactions = true;
        state.error.transactions = null;
      })
      .addCase(fetchTransactionsData.fulfilled, (state, action) => {
        state.loading.transactions = false;
        state.transactions = action.payload;
        state.lastFetch.transactions = new Date().toISOString();
      })
      .addCase(fetchTransactionsData.rejected, (state, action) => {
        state.loading.transactions = false;
        state.error.transactions = action.error.message || "Failed to fetch transactions data";
      });

    // Tokens chains data
    builder
      .addCase(fetchTokensChainsData.pending, (state) => {
        state.loading.tokensChains = true;
        state.error.tokensChains = null;
      })
      .addCase(fetchTokensChainsData.fulfilled, (state, action) => {
        state.loading.tokensChains = false;
        state.tokensChains = action.payload;
        state.lastFetch.tokensChains = new Date().toISOString();
      })
      .addCase(fetchTokensChainsData.rejected, (state, action) => {
        state.loading.tokensChains = false;
        state.error.tokensChains = action.error.message || "Failed to fetch tokens chains data";
      });

    // Cross-chain opportunities data
    builder
      .addCase(fetchCrossChainOpportunitiesData.pending, (state) => {
        state.loading.crossChainOpportunities = true;
        state.error.crossChainOpportunities = null;
      })
      .addCase(fetchCrossChainOpportunitiesData.fulfilled, (state, action) => {
        state.loading.crossChainOpportunities = false;
        state.crossChainOpportunities = action.payload;
        state.lastFetch.crossChainOpportunities = new Date().toISOString();
      })
      .addCase(fetchCrossChainOpportunitiesData.rejected, (state, action) => {
        state.loading.crossChainOpportunities = false;
        state.error.crossChainOpportunities = action.error.message || "Failed to fetch cross-chain opportunities data";
      });
  },
});

export const { 
  clearDashboardData, 
  setDashboardError, 
  clearDashboardError 
} = dashboardSlice.actions;

export default dashboardSlice.reducer;