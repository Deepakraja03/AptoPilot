import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "./store";

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Unified dashboard selectors
export const useUnifiedDashboardData = () => useAppSelector((state) => state.unifiedDashboard);
export const useUnifiedDashboardLoading = () => useAppSelector((state) => state.unifiedDashboard.loading);
export const useUnifiedDashboardError = () => useAppSelector((state) => state.unifiedDashboard.error);

// Wallet data from unified dashboard
export const useWalletData = () => useAppSelector((state) => state.unifiedDashboard.walletData);

// Individual data sections
export const usePortfolioData = () => useAppSelector((state) => state.unifiedDashboard.portfolio);
export const useIntentsData = () => useAppSelector((state) => state.unifiedDashboard.intents);
export const useTransactionsData = () => useAppSelector((state) => state.unifiedDashboard.transactions);
export const useTokensChainsData = () => useAppSelector((state) => state.unifiedDashboard.tokensChains);
export const useCrossChainOpportunitiesData = () => useAppSelector((state) => state.unifiedDashboard.crossChainOpportunities);

// Combined selectors
export const useIsAnyLoading = () => {
  const dashboardLoading = useUnifiedDashboardLoading();
  return dashboardLoading;
};

export const useHasAnyError = () => {
  const dashboardError = useUnifiedDashboardError();
  return !!dashboardError;
};