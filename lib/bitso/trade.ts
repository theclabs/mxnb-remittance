import {
    getBitsoBalances,
    placeBitsoOrder,
    waitForBitsoOrderCompletion,
    waitForBitsoOrderTrades,
    type BitsoOrder,
    type BitsoTrade
} from "@/lib/bitso/bitso"

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

export async function executeCrossCurrencyTrade(
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