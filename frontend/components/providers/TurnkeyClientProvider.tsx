"use client";

import { TurnkeyProvider } from "@turnkey/react-wallet-kit";
import { turnkeyConfig } from "@/config/turnkey";

interface TurnkeyClientProviderProps {
  children: React.ReactNode;
}

export default function TurnkeyClientProvider({ children }: TurnkeyClientProviderProps) {
  const handleSessionExpired = () => {
    console.log("Session expired. Please log in again.");
    // Optionally, you can redirect the user to the login page or show a modal
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <TurnkeyProvider
      config={turnkeyConfig}
      callbacks={{
        onSessionExpired: handleSessionExpired,
      }}
    >
      {children}
    </TurnkeyProvider>
  );
}
