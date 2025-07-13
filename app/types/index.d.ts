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

interface BankInfo {
  accountNumber: string
  routingNumber: string
  bankName: string
  accountHolderName: string
  country: string
}
interface Transaction {
  id: string
  sender_id: string
  recipient_name: string
  recipient_email: string
  recipient_user_id?: string
  amount: number
  currency: string
  status: TransactionStatus
  reference_number: string
  notes?: string
  deposit_instructions?: string
  deposit_bank_account?: string
  deposit_reference?: string
  claim_bank_details?: any
  created_at: string
}


// Define the request body type for trade requests
interface TradeRequest {
  from_currency: "ARS" | "MXN"
  to_currency: "ARS" | "MXN"
  amount: number
  type: "market" | "limit"
  limit_price?: number // Only for limit orders
}

// Define our quote response type
interface QuoteResponse {
  success: boolean
  payload: {
    from_currency: string
    to_currency: string
    from_amount: number
    to_amount: number
    exchange_rate: number
    usd_ars_rate: number
    usd_mxn_rate: number
    calculation_method: string
    timestamp: string
  }
}



type ClabeData = {
  clabe: string;
  type: "AUTO_PAYMENT";
};

type UserClabeResult = 
  | { data: ClabeData; error: null }
  | { data: null; error: any };

type getPortalCliApiResponse = {
  id: string
  clientApiKey: number
  clientSessionToken: string
  isAccountAbstracted: boolean
}

type newPortalCliResult = 
 | {data: getPortalCliApiResponse, error: null}
 | {data: null, error: any}