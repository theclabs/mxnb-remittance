import { makeJunoRequest } from "@/lib/juno"
import { NextResponse, type NextRequest } from "next/server"


// Define the expected response type from Juno Redemptions API
interface JunoRedemptionResponse {
  id: string
  amount: number
  currency: string
  transaction_type: string
  method: string
  summary_status: string
  created_at: string
  updated_at: string
}

interface JunoApiResponse {
  success: boolean
  payload: JunoRedemptionResponse
}

// GET /api/bitso/transactions - Get burn/mint transaction history
export async function GET(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url)
      const transactionId = searchParams.get("id")
      const limit = Number.parseInt(searchParams.get("limit") || "10")
      const offset = Number.parseInt(searchParams.get("offset") || "0")
      const status = searchParams.get("status") // IN_PROGRESS, COMPLETED, FAILED
      const startDate = searchParams.get("start_date") // ISO date string
      const endDate = searchParams.get("end_date") // ISO date string
  
      if (transactionId) {
        // Get specific transaction by ID
        try {
          const transaction = await makeJunoRequest<JunoApiResponse>(
            `https://stage.buildwithjuno.com/mint_platform/v1/transactions/${transactionId}`,
            {
              method: "GET",
            },
          )
  
          return NextResponse.json(transaction)
        } catch (error) {
          console.error("Failed to fetch specific transaction:", error)
          return NextResponse.json(
            {
              success: false,
              error: "Transaction not found",
            },
            { status: 404 },
          )
        }
      }
  
      // Build query parameters for list transactions
      const queryParams = new URLSearchParams()
      queryParams.append("limit", limit.toString())
      queryParams.append("offset", offset.toString())
      queryParams.append("transaction_type", "REDEMPTION") // Filter for burn transactions only
  
      if (status) {
        queryParams.append("status", status)
      }
      if (startDate) {
        queryParams.append("start_date", startDate)
      }
      if (endDate) {
        queryParams.append("end_date", endDate)
      }
  
      // Get transaction list from Juno API
      const transactionList = await makeJunoRequest<{
        success: boolean
        payload: {
          transactions: JunoRedemptionResponse[]
          total: number
          limit: number
          offset: number
        }
      }>(`https://stage.buildwithjuno.com/mint_platform/v1/transactions?${queryParams.toString()}`, {
        method: "GET",
      })
  
      console.log("Juno Burn Transactions Response:", JSON.stringify(transactionList))
  
      return NextResponse.json(transactionList)
    } catch (error) {
      console.error("Failed to fetch burn transactions:", error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch burn transactions",
        },
        { status: 500 },
      )
    }
  }