interface Assets {
  nativeBalance: {
    balance: string;
    decimals: number;
    name: string;
    rawBalance: string;
    symbol: string;
    metadata: Record<string, string | number | boolean | undefined | null>;
  };
  tokenBalances: {
    balance: string;
    decimals: number;
    name: string;
    rawBalance: string;
    symbol: string;
    metadata: {
      tokenAddress?: string;
    };
  }[];
}


interface getPortalCliApiResponse {
  id: string
  clientApiKey: number
  clientSessionToken: string
  isAccountAbstracted: boolean
}