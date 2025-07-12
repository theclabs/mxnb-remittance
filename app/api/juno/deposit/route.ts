import { makeJunoRequest } from "@/lib/juno"
import { NextResponse, type NextRequest } from "next/server"
import type {
  ClabeDetailsResponse,
  ClabeResponse,
  CreateClabeRequest,
  JunoClabeDetailsResponse,
  JunoClabeResponse,
} from "./types"

// POST /api/juno/clabe - Create a new CLABE
export async function POST(request: NextRequest) {
  try {
    // Parse request body (optional parameters for future extensions)
    const body: CreateClabeRequest = await request.json().catch(() => ({}))

    console.log("Creating new CLABE...")

    // Make request to Juno API to create CLABE
    let junoResponse: JunoClabeResponse
    try {
      junoResponse = await makeJunoRequest<JunoClabeResponse>(
        "https://stage.buildwithjuno.com/mint_platform/v1/clabes",
        {
          method: "POST",
          body: {}, // Empty body as per documentation
        },
      )
      console.log("Juno CLABE creation response:", junoResponse)
    } catch (error) {
      console.error("Juno CLABE creation failed:", error)

      // Handle specific Juno API errors
      if (error instanceof Error) {
        if (error.message.includes("Multiple User CLABEs")) {
          return NextResponse.json(
            {
              success: false,
              error: "Multiple User CLABEs feature is not enabled for your account",
              details: "Contact Juno support to enable this feature",
            },
            { status: 403 },
          )
        }

        if (error.message.includes("limit")) {
          return NextResponse.json(
            {
              success: false,
              error: "CLABE creation limit reached",
              details: "You have reached the maximum number of CLABEs for your account",
            },
            { status: 429 },
          )
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "CLABE creation failed",
        },
        { status: 500 },
      )
    }

    // Validate response
    if (!junoResponse.success || !junoResponse.payload?.clabe) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid response from Juno API",
        },
        { status: 500 },
      )
    }

    // Transform response to our format
    const clabeResponse: ClabeResponse = {
      success: true,
      payload: {
        clabe: junoResponse.payload.clabe,
        type: junoResponse.payload.type,
        created_at: new Date().toISOString(),
        status: "ENABLED",
      },
    }

    console.log("CLABE created successfully:", clabeResponse)

    return NextResponse.json(clabeResponse, { status: 201 })
  } catch (error) {
    console.error("CLABE creation operation failed:", error)

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

// GET /api/juno/clabe - Get specific CLABE details using Juno API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clabeNumber = searchParams.get("clabe")

    if (!clabeNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "CLABE number is required",
          usage: "Use ?clabe=XXXXXXXXXXXXXXXXXX to get CLABE details",
        },
        { status: 400 },
      )
    }

    // Validate CLABE format (18 digits)
    if (!/^\d{18}$/.test(clabeNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid CLABE format. Must be 18 digits",
        },
        { status: 400 },
      )
    }

    console.log("Fetching CLABE details for:", clabeNumber)

    // Get specific CLABE information from Juno API
    try {
      const junoResponse: JunoClabeDetailsResponse = await makeJunoRequest<JunoClabeDetailsResponse>(
        `https://stage.buildwithjuno.com/spei/v1/clabes/${clabeNumber}`,
        {
          method: "GET",
        },
      )

      console.log("Juno CLABE details response:", junoResponse)

      // Validate response
      if (!junoResponse.success || !junoResponse.payload) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid response from Juno API",
          },
          { status: 500 },
        )
      }

      // Return the response in our format (which matches Juno's format)
      const clabeDetails: ClabeDetailsResponse = {
        success: true,
        payload: junoResponse.payload,
      }

      return NextResponse.json(clabeDetails)
    } catch (error) {
      console.error("Failed to fetch CLABE details:", error)

      // Handle specific Juno API errors
      if (error instanceof Error) {
        if (error.message.includes("404") || error.message.includes("not found")) {
          return NextResponse.json(
            {
              success: false,
              error: "CLABE not found",
              details: "The specified CLABE does not exist or does not belong to your account",
            },
            { status: 404 },
          )
        }

        if (error.message.includes("403") || error.message.includes("forbidden")) {
          return NextResponse.json(
            {
              success: false,
              error: "Access denied",
              details: "You don't have permission to access this CLABE",
            },
            { status: 403 },
          )
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch CLABE details",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Failed to process CLABE request:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 },
    )
  }
}
