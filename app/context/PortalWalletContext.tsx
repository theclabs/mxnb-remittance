"use client";

// context/PortalWalletContext.tsx
import { createContext, useContext, ReactNode } from "react";
import { usePortalWallet, UsePortalWalletReturn } from "@/app/hooks/usePortalWallet";

const PortalWalletContext = createContext<UsePortalWalletReturn | null>(null);

export const PortalWalletProvider = ({children } : { children: ReactNode }) => {
  const wallet = usePortalWallet();
  return (
    <PortalWalletContext.Provider value={wallet}>
      {children}
    </PortalWalletContext.Provider>
  );
};

export const usePortalWalletContext = () => {
  const context = useContext(PortalWalletContext);
  if (!context) throw new Error("usePortalWalletContext must be used within PortalWalletProvider");
  return context;
};