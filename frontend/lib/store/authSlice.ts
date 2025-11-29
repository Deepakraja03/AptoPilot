import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import Cookies from "js-cookie";
import { Network } from "@/lib/networks";

interface Wallet {
  id: string;
  name: string;
  walletId: string;
  accounts: {
    id: string;
    name: string;
    publicKey: string;
    type: string;
  }[];
}

interface User {
  username: string;
  email: string;
  publicKey: string;
  organizationId: string;
  userId: string;
  organizationName: string;
  activity: {
    intent: {
      createReadWriteSessionIntentV2: {
        targetPublicKey: string;
      };
    };
  };
  wallets?: Wallet[];
  sessionTimestamp?: number;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  selectedNetwork: Network | null;
  selectedAddress: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  error: null,
  selectedNetwork: null,
  selectedAddress: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      if (action.payload) {
        const userWithTimestamp = {
          ...action.payload,
          sessionTimestamp: Date.now(),
        };
        state.user = userWithTimestamp;

        Cookies.set("auth_session", JSON.stringify(userWithTimestamp), {
          expires: 8 / 24,
          sameSite: "strict",
          secure: process.env.NODE_ENV === "production",
          path: "/",
        });
        try {
          localStorage.setItem(
            "auth_session",
            JSON.stringify(userWithTimestamp)
          );
        } catch (error) {
          console.error("Failed to set localStorage:", error);
        }
      } else {
        Cookies.remove("auth_session", { path: "/" });
        try {
          localStorage.removeItem("auth_session");
        } catch (error) {
          console.error("Failed to remove from localStorage:", error);
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setSelectedNetwork: (state, action: PayloadAction<Network | null>) => {
      state.selectedNetwork = action.payload;
    },
    setSelectedAddress: (state, action: PayloadAction<string | null>) => {
      state.selectedAddress = action.payload;
    },
    updateWallets: (state, action: PayloadAction<Wallet[]>) => {
      if (state.user) {
        state.user.wallets = action.payload;
        const updatedUser = {
          ...state.user,
          wallets: action.payload,
          sessionTimestamp: state.user.sessionTimestamp || Date.now(),
        };
        Cookies.set("auth_session", JSON.stringify(updatedUser), {
          expires: 2 / 24,
          sameSite: "strict",
          secure: process.env.NODE_ENV === "production",
          path: "/",
        });
        try {
          localStorage.setItem("auth_session", JSON.stringify(updatedUser));
        } catch (error) {
          console.error("Failed to update localStorage:", error);
        }
      }
    },
    logout: (state) => {
      state.user = null;
      state.error = null;
      state.selectedNetwork = null;
      Cookies.remove("auth_session", { path: "/" });
      try {
        localStorage.removeItem("auth_session");
      } catch (error) {
        console.error("Failed to remove from localStorage:", error);
      }
    },
    initializeFromStorage: (state) => {
      try {
        const EIGHT_HOURS_IN_MS = 8 * 60 * 60 * 1000; // Match cookie expiry

        const checkSessionExpiry = (userData: User | null): boolean => {
          if (!userData || !userData.sessionTimestamp) {
            return false;
          }

          const now = Date.now();
          const sessionAge = now - userData.sessionTimestamp;
          return sessionAge < EIGHT_HOURS_IN_MS;
        };

        // First check cookies (primary storage)
        const cookieSession = Cookies.get("auth_session");
        if (cookieSession) {
          try {
            const userData = JSON.parse(cookieSession);
            if (checkSessionExpiry(userData)) {
              state.user = userData;
              state.isLoading = false;
              return;
            } else {
              // Cookie expired, clean up
              Cookies.remove("auth_session", { path: "/" });
            }
          } catch (parseError) {
            console.error("Failed to parse cookie session:", parseError);
            Cookies.remove("auth_session", { path: "/" });
          }
        }

        // Fallback to localStorage
        const localSession = localStorage.getItem("auth_session");
        if (localSession) {
          try {
            const userData = JSON.parse(localSession);
            if (checkSessionExpiry(userData)) {
              state.user = userData;
              // Restore to cookie as well
              Cookies.set("auth_session", localSession, {
                expires: 8 / 24, // 8 hours
                sameSite: "strict",
                secure: process.env.NODE_ENV === "production",
                path: "/",
              });
            } else {
              // LocalStorage expired, clean up
              localStorage.removeItem("auth_session");
            }
          } catch (parseError) {
            console.error("Failed to parse localStorage session:", parseError);
            localStorage.removeItem("auth_session");
          }
        }

        // If no valid session found, ensure user is null
        if (!state.user) {
          state.user = null;
        }
      } catch (error) {
        console.error("Failed to initialize from storage:", error);
        // Clean up corrupted data
        Cookies.remove("auth_session", { path: "/" });
        try {
          localStorage.removeItem("auth_session");
        } catch (clearError) {
          console.error("Failed to clear corrupted session:", clearError);
        }
        state.user = null;
      }
      state.isLoading = false;
    },
  },
});

export const {
  setUser,
  setLoading,
  setError,
  setSelectedNetwork,
  setSelectedAddress,
  updateWallets,
  logout,
  initializeFromStorage,
} = authSlice.actions;

export default authSlice.reducer;
