import {
    getBitsoBalances,
    placeBitsoOrder,
    waitForBitsoOrderCompletion,
    waitForBitsoOrderTrades,
    type BitsoOrder,
    type BitsoTrade
} from "@/lib/bitso/bitso"
import { NextResponse, type NextRequest } from "next/server"



// Define our trade response type
interface TradeResponse {
  success: boolean
  payload: {
    trade_id: string
    from_currency: string
    to_currency: string
    from_amount: number
    to_amount: number
    executed_rate: number
    orders: {
      first_leg: {
        order_id: string
        book: string
        side: string
        amount: number
        price: number
        status: string
      }
      second_leg: {
        order_id: string
        book: string
        side: string
        amount: number
        price: number
        status: string
      }
    }
    fees: {
      first_leg_fee: number
      second_leg_fee: number
      total_fee: number
    }
    execution_time: string
    timestamp: string
  }
}

// Helper function to calculate the total amount received for an order
function calculateOrderReceived(trades: any[], currency: string): number {
  return trades.reduce((sum, trade) => {
    if (trade.minor_currency.toLowerCase() === currency) {
      return sum + Math.abs(Number.parseFloat(trade.minor))
    } else if (trade.major_currency.toLowerCase() === currency) {
      return sum + Math.abs(Number.parseFloat(trade.major))
    }
    return sum
  }, 0)
}

// Main trade execution function
async function executeCrossCurrencyTrade(
  fromCurrency: string,
  toCurrency: string,
  amount: number,
  type: "market" | "limit",
  limitPrice?: number,
): Promise<TradeResponse["payload"]> {
  const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    // Check balances first
    const balances = await getBitsoBalances()
    const fromBalance = balances.find((b) => b.currency.toLowerCase() === fromCurrency.toLowerCase())

    if (!fromBalance || Number.parseFloat(fromBalance.available) < amount) {
      throw new Error(
        `Insufficient ${fromCurrency} balance. Available: ${fromBalance?.available || 0}, Required: ${amount}`,
      )
    }

    let firstLegOrder: BitsoOrder
    let secondLegOrder: BitsoOrder
    let intermediateAmount: number
    let firstLegTrades: BitsoTrade[]

    if (fromCurrency === "ARS" && toCurrency === "MXN") {
      // ARS -> USD -> MXN
      console.log(`Executing ARS -> USD -> MXN trade for ${amount} ARS`)

      // First leg: Buy USD with ARS (we have ARS, want USD)
      firstLegOrder = await placeBitsoOrder("usd_ars", "buy", type, amount, limitPrice, "minor")
      console.log("First leg order placed:", firstLegOrder.oid)

      // Wait for first order to complete
      const completedFirstOrder = await waitForBitsoOrderCompletion(firstLegOrder.oid)

      if (completedFirstOrder.status !== "completed") {
        throw new Error(`First leg order failed with status: ${completedFirstOrder.status}`)
      }

      // Get the actual trades to see how much USD we received
      firstLegTrades = await waitForBitsoOrderTrades(completedFirstOrder.oid)
      intermediateAmount = calculateOrderReceived(firstLegTrades, "usd")

      console.log(`First leg completed: Sold ${amount} ARS, got ${intermediateAmount} USD`)

      if (intermediateAmount <= 0) {
        throw new Error("No USD received from first leg trade")
      }

      // Second leg: Sell USD for MXN (we have USD, want MXN)
      secondLegOrder = await placeBitsoOrder("usd_mxn", "sell", "market", intermediateAmount, undefined, "major")
      console.log("Second leg order placed:", secondLegOrder.oid)

      // Wait for second order to complete
      const completedSecondOrder = await waitForBitsoOrderCompletion(secondLegOrder.oid)

      if (completedSecondOrder.status !== "completed") {
        throw new Error(`Second leg order failed with status: ${completedSecondOrder.status}`)
      }

      // Update references to use completed orders
      firstLegOrder = completedFirstOrder
      secondLegOrder = completedSecondOrder
    } else if (fromCurrency === "MXN" && toCurrency === "ARS") {
      // MXN -> USD -> ARS
      console.log(`Executing MXN -> USD -> ARS trade for ${amount} MXN`)

      // First leg: Buy USD with MXN (we have MXN, want USD)
      firstLegOrder = await placeBitsoOrder("usd_mxn", "buy", type, amount, limitPrice, "minor")
      console.log("First leg order placed:", firstLegOrder.oid)

      // Wait for first order to complete
      const completedFirstOrder = await waitForBitsoOrderCompletion(firstLegOrder.oid)

      if (completedFirstOrder.status !== "completed") {
        throw new Error(`First leg order failed with status: ${completedFirstOrder.status}`)
      }

      // Get the actual trades to see how much USD we received
      firstLegTrades = await waitForBitsoOrderTrades(completedFirstOrder.oid)
      intermediateAmount = calculateOrderReceived(firstLegTrades, "usd")

      console.log(`First leg completed: Sold ${amount} MXN, got ${intermediateAmount} USD`)

      if (intermediateAmount <= 0) {
        throw new Error("No USD received from first leg trade")
      }

      // Second leg: Sell USD for ARS (we have USD, want ARS)
      secondLegOrder = await placeBitsoOrder("usd_ars", "sell", "market", intermediateAmount, undefined, "major")
      console.log("Second leg order placed:", secondLegOrder.oid)

      // Wait for second order to complete
      const completedSecondOrder = await waitForBitsoOrderCompletion(secondLegOrder.oid)

      if (completedSecondOrder.status !== "completed") {
        throw new Error(`Second leg order failed with status: ${completedSecondOrder.status}`)
      }

      // Update references to use completed orders
      firstLegOrder = completedFirstOrder
      secondLegOrder = completedSecondOrder
    } else {
      throw new Error("Invalid currency pair")
    }

    // Get final amount received from second leg trades
    const secondLegTrades = await waitForBitsoOrderTrades(secondLegOrder.oid)
    const finalAmount = calculateOrderReceived(secondLegTrades, toCurrency.toLowerCase())
    const executedRate = finalAmount / amount

    // Calculate fees from trades
    const firstLegFee = firstLegTrades.reduce((sum, trade) => sum + Math.abs(Number.parseFloat(trade.fees_amount)), 0)
    const secondLegFee = secondLegTrades.reduce((sum, trade) => sum + Math.abs(Number.parseFloat(trade.fees_amount)), 0)
    const totalFee = firstLegFee + secondLegFee

    return {
      trade_id: tradeId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      from_amount: amount,
      to_amount: finalAmount,
      executed_rate: executedRate,
      orders: {
        first_leg: {
          order_id: firstLegOrder.oid,
          book: firstLegOrder.book,
          side: firstLegOrder.side,
          amount: Number.parseFloat(firstLegOrder.original_amount || "0"),
          price: Number.parseFloat(firstLegOrder.price || "0"),
          status: firstLegOrder.status,
        },
        second_leg: {
          order_id: secondLegOrder.oid,
          book: secondLegOrder.book,
          side: secondLegOrder.side,
          amount: Number.parseFloat(secondLegOrder.original_amount || "0"),
          price: Number.parseFloat(secondLegOrder.price || "0"),
          status: secondLegOrder.status,
        },
      },
      fees: {
        first_leg_fee: firstLegFee,
        second_leg_fee: secondLegFee,
        total_fee: totalFee,
      },
      execution_time: `${Date.now() - Number.parseInt(tradeId.split("_")[1])}ms`,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Trade execution failed:", error)
    throw error
  }
}

// POST /api/bitso/trade
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body: TradeRequest = await request.json()

    // Validate required fields
    const { from_currency, to_currency, amount, type, limit_price } = body

    if (!from_currency || !to_currency || !amount || !type) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          required: ["from_currency", "to_currency", "amount", "type"],
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

    // Validate limit price for limit orders
    if (type === "limit" && (!limit_price || limit_price <= 0)) {
      return NextResponse.json(
        {
          success: false,
          error: "Limit price is required for limit orders and must be greater than 0",
        },
        { status: 400 },
      )
    }

    console.log("Executing cross-currency trade:", { from_currency, to_currency, amount, type })

    // Execute the trade
    const tradeResult = await executeCrossCurrencyTrade(from_currency, to_currency, amount, type, limit_price)

    const response: TradeResponse = {
      success: true,
      payload: tradeResult,
    }

    console.log("Trade executed successfully:", response)

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Trade operation failed:", error)

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

// GET /api/bitso/trade - Get trade history or status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tradeId = searchParams.get("id")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    if (tradeId) {
      // For now, return a mock response
      return NextResponse.json({
        success: true,
        payload: {
          trade_id: tradeId,
          status: "completed",
          from_currency: "ARS",
          to_currency: "MXN",
          from_amount: 1000,
          to_amount: 45.67,
          executed_rate: 0.04567,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
      })
    }

    // Return trade history (mock data)
    const tradeHistory = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      trade_id: `trade_${Date.now() - i * 86400000}_${Math.random().toString(36).substr(2, 9)}`,
      from_currency: i % 2 === 0 ? "ARS" : "MXN",
      to_currency: i % 2 === 0 ? "MXN" : "ARS",
      from_amount: Math.floor(Math.random() * 10000) + 1000,
      to_amount: Math.floor(Math.random() * 500) + 50,
      executed_rate: Math.random() * 0.1,
      status: ["completed", "pending", "failed"][Math.floor(Math.random() * 3)],
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      completed_at: new Date(Date.now() - i * 86400000 + 3600000).toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: tradeHistory,
      total: tradeHistory.length,
    })
  } catch (error) {
    console.error("Failed to fetch trade data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch trade data",
      },
      { status: 500 },
    )
  }
}
