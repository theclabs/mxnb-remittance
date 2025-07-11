import { makeJunoRequest } from "@/lib/juno"
import { NextResponse, type NextRequest } from "next/server"

// Define the request body type
interface MintRequest {
  amount: number
  network: string
  asset: string
}

// Define the expected response type from Juno API
interface JunoIssuanceResponse {
  id: string
  amount: number
  currency: string
  transaction_type: string
  method: string
  summary_status: string
  created_at: string | null
  updated_at: string | null
}

interface JunoApiResponse {
  success: boolean
  payload: JunoIssuanceResponse
}

// POST /api/bitso/burn
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body: MintRequest = await request.json()

    // Validate required fields
    const { amount, network, asset } = body

    if (!amount || !network || !asset) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          required: ["amount", "network", "asset"],
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

    // Prepare the request data for Juno API
    const requestData = {
      amount,
      network,
      asset,
    }

    console.log("Making mint request to Juno API:", requestData)

    // Make the request to Juno API using the auth utility
    const data: JunoApiResponse = await makeJunoRequest<JunoApiResponse>(
      "https://stage.buildwithjuno.com/mint_platform/v1/issuance",
      {
        method: "POST",
        body: requestData,
      },
    )

    console.log("Juno API Response:", JSON.stringify(data))

    // Return the actual response from Juno API
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Mint operation failed:", error)

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

// GET /api/bitso/burn - Get burn history or status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get("id")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    if (transactionId) {
      // Get specific transaction status
      // This would typically call another Juno API endpoint
      const mockTransaction: JunoIssuanceResponse = {
        id: transactionId,
        amount: 112,
        currency: "mxn",
        transaction_type: "ISSUANCE",
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

    // Get transaction history (mock data for now)
    const mintHistory = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `eb3590e8-668a-4a4c-9751-c3e639fc28d${i}`,
      amount: Math.floor(Math.random() * 1000) + 100,
      currency: "mxn",
      transaction_type: "ISSUANCE",
      method: "BITSO_TRANSFER",
      summary_status: ["IN_PROGRESS", "COMPLETED", "FAILED"][Math.floor(Math.random() * 3)],
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: new Date(Date.now() - i * 86400000 + 3600000).toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: mintHistory,
      total: mintHistory.length,
    })
  } catch (error) {
    console.error("Failed to fetch mint data:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch mint data",
      },
      { status: 500 },
    )
  }
}
