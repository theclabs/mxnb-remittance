import { makeJunoRequest } from "@/lib/juno"
import { NextResponse, type NextRequest } from "next/server"

// Define the request body type for burn/redemption
interface BurnRequest {
  amount: number
  destination_bank_account_id: string | null
  asset: string
}

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

// POST /api/bitso/burn
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body: BurnRequest = await request.json()

    // Validate required fields
    const { amount, destination_bank_account_id, asset } = body

    if (!amount || !asset) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          required: ["amount", "asset"],
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

    // Validate asset
    const validAssets = ["mxn", "usd", "usdt", "usdc"]
    if (!validAssets.includes(asset.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid asset",
          validAssets,
        },
        { status: 400 },
      )
    }

    // Prepare the request data for Juno Redemptions API
    const requestData = {
      amount,
      destination_bank_account_id,
      asset: asset.toLowerCase(),
    }

    console.log("Making burn/redemption request to Juno API:", requestData)

    // Make the request to Juno Redemptions API using the auth utility
    const data: JunoApiResponse = await makeJunoRequest<JunoApiResponse>(
      "https://stage.buildwithjuno.com/mint_platform/v1/redemptions",
      {
        method: "POST",
        body: requestData,
      },
    )

    console.log("Juno Redemptions API Response:", JSON.stringify(data))

    // Return the actual response from Juno API
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Burn/redemption operation failed:", error)

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

// GET /api/bitso/burn - Get burn/redemption history or status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get("id")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    if (transactionId) {
      // Get specific transaction status
      // This would typically call another Juno API endpoint
      const mockTransaction: JunoRedemptionResponse = {
        id: transactionId,
        amount: 101,
        currency: "MXN",
        transaction_type: "REDEMPTION",
        method: "BITSO_TRANSFER",
        summary_status: "COMPLETED",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      return NextResponse.json({
        success: true,
        payload: mockTransaction,
      })
    }

    // Get redemption history (mock data for now)
    const burnHistory = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `22183e8a-d2ce-41a8-80c0-617263b5efc${i}`,
      amount: Math.floor(Math.random() * 500) + 50,
      currency: "MXN",
      transaction_type: "REDEMPTION",
      method: "BITSO_TRANSFER",
      summary_status: ["IN_PROGRESS", "COMPLETED", "FAILED"][Math.floor(Math.random() * 3)],
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: new Date(Date.now() - i * 86400000 + 3600000).toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: burnHistory,
      total: burnHistory.length,
    })
  } catch (error) {
    console.error("Failed to fetch burn/redemption data:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch burn/redemption data",
      },
      { status: 500 },
    )
  }
}
