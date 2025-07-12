import { useState, useEffect } from "react";
import Portal from "@portal-hq/web";


const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || "eip155:421614";
const nativeTokenSymbol = process.env.NEXT_PUBLIC_NATIVE_TOKEN_SYMBOL || "MXNB";
const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://sepolia.arbiscan.io/tx/";
const rpcConfig = {
    "eip155:421614": `https://arb-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    "eip155:42161": `https://arb-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
  }


export interface UsePortalWalletReturn {
  portal: Portal | undefined;
  eip155Address: string;
  assets: Assets | undefined;
  error: string | undefined;
  clientApiKey: string;
  setClientApiKey: (key: string) => void;
  initializeWallet: () => Promise<void>;
  disconnectWallet: () => void;
  getAssets: () => Promise<Assets | undefined>;
  handleFundWallet: () => Promise<void>;
  sendTokens: (params: {
    to: string;
    tokenMint: string;
    amount: string;
  }) => Promise<string | undefined>;
}

export function usePortalWallet(): UsePortalWalletReturn {
  // State
  const [assets, setAssets] = useState<Assets | undefined>(undefined);
  const [portal, setPortal] = useState<Portal | undefined>(undefined);
  const [eip155Address, setEip155Address] = useState<string>("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [clientApiKey, setClientApiKey] = useState<string>("");

  // Check configuration on load
  useEffect(() => {
    isConfigValid();
  }, []);

  const isConfigValid = (): boolean => {
    if (!chainId) {
      console.error("Chain ID is missing in config");
      return false;
    }

    return true;
  };

  const getEip155AddressFrom = async (portalInstance: Portal) => {
    const eip155Address = await portalInstance.getEip155Address();
    setEip155Address(eip155Address);
    return eip155Address;
  };

  const getAssetsFrom = async (portalInstance: Portal) => {
    const assets = (await portalInstance.getAssets(
      chainId
    )) as unknown as Assets;
    setAssets(assets);
    return assets;
  };

  const getAssets = async () => {
    if (!portal) return;
    const assets = (await portal.getAssets(
      chainId
    )) as unknown as Assets;
    setAssets(assets);
    return assets;
  };

  const initializeWallet = async () => {
    if (!clientApiKey) {
      console.error("Please enter a Portal Client API Key");
      return;
    }

    const portalInstance = new Portal({
      apiKey: clientApiKey,
      autoApprove: true,
      rpcConfig: rpcConfig,
    });
    setPortal(portalInstance);

    portalInstance.onReady(async () => {
      try {
        // Check if wallet exists
        const client = await portalInstance.getClient();

        // Create wallet if it doesn't exist
        if (client?.wallets?.length === 0) {
          await portalInstance.createWallet();
          await getEip155AddressFrom(portalInstance);
          await getAssetsFrom(portalInstance);
          console.log("Wallet created successfully!");
          return;
        }

        // Wallet exists - check if it's on device
        const isOnDevice = await portalInstance.isWalletOnDevice();
        if (!isOnDevice) {
          const errorMessage =
            "Your wallet exists but is not on this device. You need to create a new Test Portal Client API Key from the Portal Dashboard and update your config.";
          alert(errorMessage);
          setError(errorMessage);
          return;
        }

        // Wallet exists and is on device - get wallet details
        await getEip155AddressFrom(portalInstance);
        await getAssetsFrom(portalInstance);
      } catch (error) {
        console.error(`Error: ${error}`);
        setError(`Error: ${error}`);
      }
    });
  };

  const disconnectWallet = () => {
    setPortal(undefined);
    setEip155Address("");
    setAssets(undefined);
  };

  const handleFundWallet = async () => {
    if (!portal) return;

    try {
      console.info(`Requesting testnet ${nativeTokenSymbol}...`);
      await portal.receiveTestnetAsset(chainId, {
        amount: "0.1",
        token: nativeTokenSymbol,
      });
      console.log(
        `Wallet funded with testnet ${nativeTokenSymbol}!`
      );
    } catch (error) {
      console.error(`Failed to fund wallet: ${error}`);
    }
  };

  const sendTokens = async ({
    to,
    tokenMint,
    amount,
  }: {
    to: string;
    tokenMint: string;
    amount: string;
  }) => {
    if (!portal) return;

    if (!to || !tokenMint || !amount) {
      console.error("Please fill in all fields");
      return;
    }

    try {
      console.info("Sending tokens...");
      const transactionHash = (await portal.sendAsset(chainId, {
        to,
        token: tokenMint,
        amount,
      })) as unknown as string;

      // Check if transactionHash failed
      if (!transactionHash) {
        console.error("Failed to send tokens");
        return;
      }

      console.log(`Sent tokens successfully!`, {
        duration: 10000,
        action: {
          label: "View on Explorer",
          onClick: () => {
            window.open(`${explorerUrl}${transactionHash}`, "_blank");
          },
        },
      });

      // Refresh assets
      await getAssets();
      return transactionHash;
    } catch (error) {
      console.error(`Failed to send tokens: ${error}`);
    }
  };

  return {
    portal,
    eip155Address,
    assets,
    error,
    clientApiKey,
    setClientApiKey,
    initializeWallet,
    disconnectWallet,
    getAssets,
    handleFundWallet,
    sendTokens,
  };
}
