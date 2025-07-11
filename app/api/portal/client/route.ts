import { NextResponse, type NextRequest } from "next/server"

// Define the expected response type from Portal API
interface PortalClientResponse {
  id: string
  amount: number
  currency: string
  transaction_type: string
  method: string
  summary_status: string
  created_at: string
  updated_at: string
}

interface PortalApiResponse {
  success: boolean
  payload: PortalClientResponse
}

export async function GET(req: NextRequest) {
  try {
    const requestBody = {
      isAccountAbstracted: true,
    }

    const response = await fetch("https://api.portalhq.io/api/v3/custodians/me/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PORTAL_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`Portal API responded with status: ${response.status}`)
    }

    const data: PortalApiResponse = await response.json()

    console.log("Portal API Response:", JSON.stringify(data))

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Portal API Error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
