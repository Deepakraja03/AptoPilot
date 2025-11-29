"use client";

import React from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./store";

// Loading component for better reusability and consistency
const LoadingScreen = ({ message = "Loading..." }: { message?: string }) => (
  <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      {/* Spinner */}
      <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin" />

      {/* Loading text */}
      <div className="text-white text-lg font-light tracking-wide">
        {message}
      </div>

      {/* Optional subtle glow effect */}
      <div className="absolute w-32 h-32 bg-gradient-to-r from-[#FA4C15]/10 to-orange-500/10 rounded-full blur-3xl -z-10" />
    </div>
  </div>
);

// Error boundary for Redux Provider
class ReduxErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Redux Provider Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-red-400 text-xl font-medium">
              Something went wrong
            </div>
            <div className="text-gray-400 text-sm max-w-md">
              There was an error loading the application. Please refresh the
              page.
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#FA4C15] text-white rounded-lg hover:bg-[#FA4C15]/90 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ReduxErrorBoundary>
      <Provider store={store}>
        <PersistGate
          loading={<LoadingScreen message="Initializing app..." />}
          persistor={persistor}
          onBeforeLift={() => {
            // Optional: Add any pre-hydration logic here
            console.log("Redux store hydration starting...");
          }}
        >
          {children}
        </PersistGate>
      </Provider>
    </ReduxErrorBoundary>
  );
}

// Export the loading screen for reuse in other parts of the app
export { LoadingScreen };
