import crypto from "crypto"

interface BitsoAuthParams {
  method: string
  pathname: string
  payload?: string
}

// Define Bitso API response types
export interface BitsoOrder {
  oid: string
  book: string
  original_amount: string
  unfilled_amount: string
  original_value: string
  created_at: string
  updated_at: string
  price: string
  side: "buy" | "sell"
  status: "partial-fill" | "completed" | "open" | "cancelled"
  type: "market" | "limit"
}

export interface BitsoOrderResponse {
    success: boolean
    payload: BitsoOrder
  }
  
  export interface BitsoOrderStatusResponse {
    success: boolean
    payload: BitsoOrder[]
  }

export interface BitsoBalanceItem {
  currency: string
  available: string
  locked: string
  total: string
}

export interface BitsoBalanceResponse {
  success: boolean
  payload: {
    balances: BitsoBalanceItem[]
  }
}

export interface BitsoTicker {
  book: string
  volume: string
  high: string
  last: string
  low: string
  vwap: string
  ask: string
  bid: string
  created_at: string
}

export interface BitsoTickerResponse {
  success: boolean
  payload: BitsoTicker[]
}

/**
 * Generates HMAC-based authorization header for Bitso API requests
 */
export function generateBitsoAuthHeader({ method, pathname, payload = "" }: BitsoAuthParams): string {
  // Get environment variables
  const bitsoKey = process.env.JUNO_TOKEN;
  const bitsoSecret = process.env.JUNO_SECRET;

  if (!bitsoKey || !bitsoSecret) {
    throw new Error("BITSO_API_KEY and BITSO_API_SECRET environment variables are required")
  }

  // Generate nonce (timestamp in milliseconds)
  const nonce = Date.now()

  // Create the data string to sign: nonce + method + pathname + payload
  const dataToSign = `${nonce}${method.toUpperCase()}${pathname}${payload}`

  // Generate HMAC-SHA256 signature
  const signature = crypto.createHmac("sha256", bitsoSecret).update(dataToSign).digest("hex")

  // Construct authorization header: 'Bitso KEY:NONCE:SIGNATURE'
  const authHeader = `Bitso ${bitsoKey}:${nonce}:${signature}`

  return authHeader
}

/**
 * Helper function to generate auth header from a full URL and request details
 */
export function generateBitsoAuthFromUrl(url: string, method: string, payload = ""): string {
  const urlObj = new URL(url)

  return generateBitsoAuthHeader({
    method,
    pathname: urlObj.pathname,
    payload,
  })
}

/**
 * Type-safe wrapper for making authenticated Bitso API requests
 */
export async function makeBitsoRequest<T = any>(
  endpoint: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
    useStaging?: boolean
  } = {},
): Promise<T> {
  const { method = "GET", body, headers = {}, useStaging = true } = options

  // Use staging or production API
//   const baseUrl = useStaging ? "https://api-dev.bitso.com" : "https://api.bitso.com"
  const baseUrl = useStaging ? "https://stage.bitso.com" : "https://api.bitso.com"
  const url = `${baseUrl}/v3/${endpoint}`

  // Serialize body if it's an object
  const payload = body ? JSON.stringify(body) : ""

  // Generate auth header
  const authHeader = generateBitsoAuthFromUrl(url, method, payload)

  // Make the request
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      ...headers,
    },
    body: payload || undefined,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Bitso API error (${response.status}): ${errorText}`)
  }

  return response.json()
}


/**
 * Type-safe wrapper for making authenticated Bitso API requests MOCK ONLY
 */
export async function makeMockRequest<T = any>(
  endpoint: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
    useStaging?: boolean
  } = {},
): Promise<T> {
  const { method = "GET", body, headers = {}, useStaging = true } = options

  // Use staging or production API
//   const baseUrl = useStaging ? "https://api-dev.bitso.com" : "https://api.bitso.com"
  const baseUrl = useStaging ? "https://stage.bitso.com" : "https://api.bitso.com"
  const url = `${baseUrl}/${endpoint}`

  // Serialize body if it's an object
  const payload = body ? JSON.stringify(body) : ""

  // Generate auth header
  const authHeader = generateBitsoAuthFromUrl(url, method, payload)

  // Make the request
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      ...headers,
    },
    body: payload || undefined,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Bitso API error (${response.status}): ${errorText}`)
  }

  return response.json()
}

/**
 * Get account balances
 */
export async function getBitsoBalances(): Promise<BitsoBalanceItem[]> {
  const response: BitsoBalanceResponse = await makeBitsoRequest("balance")
  return response.payload.balances
}

/**
 * Place an order on Bitso with proper major/minor specification
 */
export async function placeBitsoOrder(
  book: string,
  side: "buy" | "sell",
  type: "market" | "limit",
  amount: number,
  price?: number,
  amountType: "major" | "minor" = "minor",
): Promise<BitsoOrder> {
  const orderData: any = {
    book,
    side,
    type,
  }

  // Specify whether the amount is in major or minor currency
  if (amountType === "major") {
    orderData.major = amount.toString()
  } else {
    orderData.minor = amount.toString()
  }

  if (type === "limit" && price) {
    orderData.price = price.toString()
  }

  console.log("Placing Bitso order:", orderData)

  const response: BitsoOrderResponse = await makeBitsoRequest("orders", {
    method: "POST",
    body: orderData,
  })

  return response.payload
}

/**
 * Get order status by ID
 */
export async function getBitsoOrderStatus(orderId: string): Promise<BitsoOrder> {
  const response: BitsoOrderStatusResponse = await makeBitsoRequest(`orders/${orderId}`)
  console.dir(response)
  return response.payload[0]
}

/**
 * Wait for order completion with timeout
 */
export async function waitForBitsoOrderCompletion(orderId: string, maxWaitTime = 30000): Promise<BitsoOrder> {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const order = await getBitsoOrderStatus(orderId)

      if (order.status === "completed" || order.status === "cancelled") {
        return order
      }

      // Wait 1 second before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error("Error checking order status:", error)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  throw new Error(`Order ${orderId} did not complete within ${maxWaitTime}ms`)
}

/**
 * Wait for order trades to be available with retry logic
 */
export async function waitForBitsoOrderTrades(
    orderId: string,
    maxWaitTime = 30000,
    maxRetries = 10,
  ): Promise<BitsoTrade[]> {
    const startTime = Date.now()
    let retryCount = 0
  
    while (Date.now() - startTime < maxWaitTime && retryCount < maxRetries) {
      try {
        const trades = await getBitsoOrderTrades(orderId)
  
        if (trades && trades.length > 0) {
          console.log(`Found ${trades.length} trades for order ${orderId} after ${retryCount} retries`)
          return trades
        }
  
        // No trades found yet, wait before retrying
        retryCount++
        const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000) // Exponential backoff, max 5s
        console.log(`No trades found for order ${orderId}, retry ${retryCount}/${maxRetries} in ${waitTime}ms`)
  
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      } catch (error) {
        console.error(`Error fetching trades for order ${orderId}, retry ${retryCount}:`, error)
        retryCount++
  
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to fetch trades for order ${orderId} after ${maxRetries} retries: ${error}`)
        }
  
        // Wait before retrying on error
        const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  
    throw new Error(`Trades for order ${orderId} not available within ${maxWaitTime}ms after ${retryCount} retries`)
  }

/**
 * Fetch Bitso market tickers (public endpoint, no auth required)
 */
export async function fetchBitsoTickers(useStaging = true): Promise<BitsoTicker[]> {
//   const baseUrl = useStaging ? "https://api-dev.bitso.com" : "https://api.bitso.com"
  const baseUrl = useStaging ? "https://stage.bitso.com" : "https://api.bitso.com"
  const url = `${baseUrl}/v3/ticker/`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Bitso API error: ${response.status}`)
    }

    const data: BitsoTickerResponse = await response.json()

    if (!data.success) {
      throw new Error("Bitso API returned unsuccessful response")
    }

    return data.payload
  } catch (error) {
    console.error("Failed to fetch Bitso tickers:", error)
    throw new Error("Failed to fetch market data from Bitso")
  }
}

/**
 * Find ticker by book name
 */
export function findBitsoTicker(tickers: BitsoTicker[], book: string): BitsoTicker | null {
  return tickers.find((ticker) => ticker.book.toLowerCase() === book.toLowerCase()) || null
}

/**
 * Calculate cross rate between two currencies using USD as intermediary
 */
export function calculateBitsoCrossRate(
  fromCurrency: string,
  toCurrency: string,
  amount: number,
  usdArsRate: number,
  usdMxnRate: number,
): { toAmount: number; exchangeRate: number; calculationMethod: string } {
  let toAmount: number
  let exchangeRate: number
  let calculationMethod: string

  if (fromCurrency === "ARS" && toCurrency === "MXN") {
    // ARS -> USD -> MXN
    // 1 ARS = 1/usdArsRate USD
    // 1 USD = usdMxnRate MXN
    // So 1 ARS = (1/usdArsRate) * usdMxnRate MXN
    exchangeRate = usdMxnRate / usdArsRate
    toAmount = amount * exchangeRate
    calculationMethod = "ARS -> USD -> MXN"
  } else if (fromCurrency === "MXN" && toCurrency === "ARS") {
    // MXN -> USD -> ARS
    // 1 MXN = 1/usdMxnRate USD
    // 1 USD = usdArsRate ARS
    // So 1 MXN = (1/usdMxnRate) * usdArsRate ARS
    exchangeRate = usdArsRate / usdMxnRate
    toAmount = amount * exchangeRate
    calculationMethod = "MXN -> USD -> ARS"
  } else {
    throw new Error("Invalid currency pair")
  }

  return { toAmount, exchangeRate, calculationMethod }
}

export interface BitsoTrade {
    book: string
    major: string
    major_currency: string
    created_at: string
    minor: string
    minor_currency: string
    fees_amount: string
    fees_currency: string
    price: string
    tid: string
    oid: string
    origin_id: string
    side: "buy" | "sell"
    maker_side: "buy" | "sell"
  }
  
  export interface BitsoTradesResponse {
    success: boolean
    payload: BitsoTrade[]
  }
  
  /**
   * Get user trades for a specific order
   */
  export async function getBitsoOrderTrades(orderId: string): Promise<BitsoTrade[]> {
    const response: BitsoTradesResponse = await makeBitsoRequest(`order_trades/${orderId}`)
    // console.log("Order trades response:", response)
    return response.payload
  }
  
  /**
   * Calculate total amount received from an order's trades
   */
  export function calculateOrderReceived(trades: BitsoTrade[], currency: string): number {
    let totalReceived = 0
  
    for (const trade of trades) {
      if (trade.side === "buy") {
        // When buying, we receive the major currency
        if (trade.major_currency.toLowerCase() === currency.toLowerCase()) {
          totalReceived += Math.abs(Number.parseFloat(trade.major))
        }
      } else {
        // When selling, we receive the minor currency
        if (trade.minor_currency.toLowerCase() === currency.toLowerCase()) {
          totalReceived += Math.abs(Number.parseFloat(trade.minor))
        }
      }
    }
  
    return totalReceived
  }


  /**
   * LOCAL API - Calculate total amount received from an order's trades
   */
export async function localGetQuote (from_currency:string, to_currency:string, amount:number): Promise<QuoteResponse> {
    try {
      const response = await fetch('/api/bitso/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_currency, to_currency, amount }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Error ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Error fetching quote:', error);
      throw error;
    }
}