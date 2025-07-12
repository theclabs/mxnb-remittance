import { NextResponse, type NextRequest } from "next/server"

// Define the request body type for quote requests
interface QuoteRequest {
  from_currency: "ARS" | "MXN"
  to_currency: "ARS" | "MXN"
  amount: number
}

// Define Bitso API response types
interface BitsoTicker {
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

interface BitsoTickerResponse {
  success: boolean
  payload: BitsoTicker[]
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

// Helper function to fetch Bitso market data
async function fetchBitsoTickers(): Promise<BitsoTicker[]> {
  try {
    const response = await fetch("https://api.bitso.com/v3/ticker/", {
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

// Helper function to find ticker by book name
function findTicker(tickers: BitsoTicker[], book: string): BitsoTicker | null {
  return tickers.find((ticker) => ticker.book.toLowerCase() === book.toLowerCase()) || null
}

// Helper function to calculate cross rate
function calculateCrossRate(
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

// POST /api/bitso/quote
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body: QuoteRequest = await request.json()

    // Validate required fields
    const { from_currency, to_currency, amount } = body

    if (!from_currency || !to_currency || amount === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          required: ["from_currency", "to_currency", "amount"],
        },
        { status: 400 },
      )
    }

    // Validate amount is positive
    if (amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Amount must be greater than 0",
        },
        { status: 400 },
      )
    }

    // Validate currencies
    const validCurrencies = ["ARS", "MXN"]
    if (!validCurrencies.includes(from_currency) || !validCurrencies.includes(to_currency)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid currency. Only ARS and MXN are supported",
          validCurrencies,
        },
        { status: 400 },
      )
    }

    // Validate that currencies are different
    if (from_currency === to_currency) {
      return NextResponse.json(
        {
          success: false,
          error: "From and to currencies must be different",
        },
        { status: 400 },
      )
    }

    console.log("Fetching quote for:", { from_currency, to_currency, amount })

    // Fetch market data from Bitso
    const tickers = await fetchBitsoTickers()

    // Find USD/ARS and USD/MXN rates
    const usdArsTicker = findTicker(tickers, "usd_ars")
    const usdMxnTicker = findTicker(tickers, "usd_mxn")

    if (!usdArsTicker) {
      return NextResponse.json(
        {
          success: false,
          error: "USD/ARS market data not available",
        },
        { status: 503 },
      )
    }

    if (!usdMxnTicker) {
      return NextResponse.json(
        {
          success: false,
          error: "USD/MXN market data not available",
        },
        { status: 503 },
      )
    }

    // Use the mid price (average of bid and ask) for more accurate quotes
    const usdArsRate = (Number.parseFloat(usdArsTicker.bid) + Number.parseFloat(usdArsTicker.ask)) / 2
    const usdMxnRate = (Number.parseFloat(usdMxnTicker.bid) + Number.parseFloat(usdMxnTicker.ask)) / 2

    console.log("Market rates:", { usdArsRate, usdMxnRate })

    // Calculate cross rate
    const { toAmount, exchangeRate, calculationMethod } = calculateCrossRate(
      from_currency,
      to_currency,
      amount,
      usdArsRate,
      usdMxnRate,
    )

    // Prepare response
    const quoteResponse: QuoteResponse = {
      success: true,
      payload: {
        from_currency,
        to_currency,
        from_amount: amount,
        to_amount: Number.parseFloat(toAmount.toFixed(6)), // Round to 6 decimal places
        exchange_rate: Number.parseFloat(exchangeRate.toFixed(8)), // Round to 8 decimal places
        usd_ars_rate: Number.parseFloat(usdArsRate.toFixed(6)),
        usd_mxn_rate: Number.parseFloat(usdMxnRate.toFixed(6)),
        calculation_method: calculationMethod,
        timestamp: new Date().toISOString(),
      },
    }

    console.log("Quote response:", quoteResponse)

    return NextResponse.json(quoteResponse, { status: 200 })
  } catch (error) {
    console.error("Quote operation failed:", error)

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body",
        },
        { status: 400 },
      )
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}

// GET /api/bitso/quote - Get current market rates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromCurrency = searchParams.get("from")?.toUpperCase()
    const toCurrency = searchParams.get("to")?.toUpperCase()
    const amount = Number.parseFloat(searchParams.get("amount") || "1")

    // If specific currencies are requested, return a quote
    if (fromCurrency && toCurrency) {
      // Validate currencies
      const validCurrencies = ["ARS", "MXN"]
      if (!validCurrencies.includes(fromCurrency) || !validCurrencies.includes(toCurrency)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid currency. Only ARS and MXN are supported",
            validCurrencies,
          },
          { status: 400 },
        )
      }

      if (fromCurrency === toCurrency) {
        return NextResponse.json(
          {
            success: false,
            error: "From and to currencies must be different",
          },
          { status: 400 },
        )
      }

      // Fetch market data
      const tickers = await fetchBitsoTickers()
      const usdArsTicker = findTicker(tickers, "usd_ars")
      const usdMxnTicker = findTicker(tickers, "usd_mxn")

      if (!usdArsTicker || !usdMxnTicker) {
        return NextResponse.json(
          {
            success: false,
            error: "Market data not available",
          },
          { status: 503 },
        )
      }

      const usdArsRate = (Number.parseFloat(usdArsTicker.bid) + Number.parseFloat(usdArsTicker.ask)) / 2
      const usdMxnRate = (Number.parseFloat(usdMxnTicker.bid) + Number.parseFloat(usdMxnTicker.ask)) / 2

      const { toAmount, exchangeRate, calculationMethod } = calculateCrossRate(
        fromCurrency,
        toCurrency,
        amount,
        usdArsRate,
        usdMxnRate,
      )

      return NextResponse.json({
        success: true,
        payload: {
          from_currency: fromCurrency,
          to_currency: toCurrency,
          from_amount: amount,
          to_amount: Number.parseFloat(toAmount.toFixed(6)),
          exchange_rate: Number.parseFloat(exchangeRate.toFixed(8)),
          usd_ars_rate: Number.parseFloat(usdArsRate.toFixed(6)),
          usd_mxn_rate: Number.parseFloat(usdMxnRate.toFixed(6)),
          calculation_method: calculationMethod,
          timestamp: new Date().toISOString(),
        },
      })
    }

    // Otherwise, return current market rates
    const tickers = await fetchBitsoTickers()
    const usdArsTicker = findTicker(tickers, "usd_ars")
    const usdMxnTicker = findTicker(tickers, "usd_mxn")

    const marketRates = {
      success: true,
      payload: {
        usd_ars: usdArsTicker
          ? {
              bid: Number.parseFloat(usdArsTicker.bid),
              ask: Number.parseFloat(usdArsTicker.ask),
              last: Number.parseFloat(usdArsTicker.last),
              volume: Number.parseFloat(usdArsTicker.volume),
              updated_at: usdArsTicker.created_at,
            }
          : null,
        usd_mxn: usdMxnTicker
          ? {
              bid: Number.parseFloat(usdMxnTicker.bid),
              ask: Number.parseFloat(usdMxnTicker.ask),
              last: Number.parseFloat(usdMxnTicker.last),
              volume: Number.parseFloat(usdMxnTicker.volume),
              updated_at: usdMxnTicker.created_at,
            }
          : null,
        cross_rates: {
          ars_to_mxn:
            usdArsTicker && usdMxnTicker
              ? Number.parseFloat(
                  (
                    (Number.parseFloat(usdMxnTicker.bid) + Number.parseFloat(usdMxnTicker.ask)) /
                    2 /
                    ((Number.parseFloat(usdArsTicker.bid) + Number.parseFloat(usdArsTicker.ask)) / 2)
                  ).toFixed(8),
                )
              : null,
          mxn_to_ars:
            usdArsTicker && usdMxnTicker
              ? Number.parseFloat(
                  (
                    (Number.parseFloat(usdArsTicker.bid) + Number.parseFloat(usdArsTicker.ask)) /
                    2 /
                    ((Number.parseFloat(usdMxnTicker.bid) + Number.parseFloat(usdMxnTicker.ask)) / 2)
                  ).toFixed(8),
                )
              : null,
        },
        timestamp: new Date().toISOString(),
      },
    }

    return NextResponse.json(marketRates)
  } catch (error) {
    console.error("Failed to fetch market rates:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch market rates",
      },
      { status: 500 },
    )
  }
}
