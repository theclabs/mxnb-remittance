import { NextResponse, type NextRequest } from "next/server"
import type { ArgentinianBankData, DepositRequest, DepositResponse } from "./types"

// Mock Argentinian bank data for Bitso deposits
// In a real implementation, this would come from Bitso's API or your database
const ARGENTINIAN_BANK_DATA: ArgentinianBankData = {
  bank_name: "Banco Galicia",
  bank_code: "007",
  account_holder: "Bitso Argentina S.A.",
  cvu: "0000007900000000123456", // 22-digit CVU format
  alias: "BITSO.ARS.DEPOSIT",
  account_type: "CVU",
  currency: "ARS",
  instructions: [
    "Realiza una transferencia bancaria a la CVU proporcionada",
    "Incluye tu ID de usuario de Bitso en el concepto de la transferencia",
    "El depósito será acreditado automáticamente una vez confirmado",
    "Conserva el comprobante de transferencia para cualquier consulta",
  ],
  important_notes: [
    "Solo se aceptan transferencias desde cuentas a tu nombre",
    "El monto mínimo de depósito es $1,000 ARS",
    "El monto máximo diario es $500,000 ARS",
    "Los depósitos se procesan de lunes a viernes de 9:00 a 18:00 hs",
    "Las transferencias realizadas fuera del horario bancario se procesarán el siguiente día hábil",
  ],
  processing_time: "Inmediato durante horario bancario (9:00-18:00 hs)",
  minimum_amount: 1000,
  maximum_amount: 500000,
}

// POST /api/bitso/deposit
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body: DepositRequest = await request.json()

    // Validate required fields
    const { currency, amount } = body

    if (!currency) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: currency",
          required: ["currency"],
        },
        { status: 400 },
      )
    }

    // Validate currency (only ARS supported for now)
    if (currency !== "ARS") {
      return NextResponse.json(
        {
          success: false,
          error: "Only ARS deposits are supported",
          supported_currencies: ["ARS"],
        },
        { status: 400 },
      )
    }

    // Validate amount if provided
    if (amount !== undefined) {
      if (amount < ARGENTINIAN_BANK_DATA.minimum_amount) {
        return NextResponse.json(
          {
            success: false,
            error: `Amount must be at least ${ARGENTINIAN_BANK_DATA.minimum_amount} ARS`,
            minimum_amount: ARGENTINIAN_BANK_DATA.minimum_amount,
          },
          { status: 400 },
        )
      }

      if (amount > ARGENTINIAN_BANK_DATA.maximum_amount) {
        return NextResponse.json(
          {
            success: false,
            error: `Amount cannot exceed ${ARGENTINIAN_BANK_DATA.maximum_amount} ARS`,
            maximum_amount: ARGENTINIAN_BANK_DATA.maximum_amount,
          },
          { status: 400 },
        )
      }
    }

    console.log("Generating deposit instructions for:", { currency, amount })

    // Generate deposit response
    const depositResponse: DepositResponse = {
      success: true,
      payload: {
        deposit_method: "bank_transfer",
        currency: "ARS",
        bank_data: ARGENTINIAN_BANK_DATA,
        reference_amount: amount,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        created_at: new Date().toISOString(),
      },
    }

    console.log("Deposit instructions generated:", depositResponse)

    return NextResponse.json(depositResponse, { status: 200 })
  } catch (error) {
    console.error("Deposit instruction generation failed:", error)

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

// GET /api/bitso/deposit - Get deposit methods and information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const currency = searchParams.get("currency")?.toUpperCase()

    // If specific currency is requested
    if (currency) {
      if (currency !== "ARS") {
        return NextResponse.json(
          {
            success: false,
            error: "Only ARS deposits are supported",
            supported_currencies: ["ARS"],
          },
          { status: 400 },
        )
      }

      // Return deposit information for ARS
      return NextResponse.json({
        success: true,
        payload: {
          currency: "ARS",
          available_methods: ["bank_transfer"],
          bank_data: ARGENTINIAN_BANK_DATA,
          limits: {
            minimum_amount: ARGENTINIAN_BANK_DATA.minimum_amount,
            maximum_amount: ARGENTINIAN_BANK_DATA.maximum_amount,
            daily_limit: ARGENTINIAN_BANK_DATA.maximum_amount,
          },
          processing_time: ARGENTINIAN_BANK_DATA.processing_time,
        },
      })
    }

    // Return all available deposit methods
    return NextResponse.json({
      success: true,
      payload: {
        supported_currencies: ["ARS"],
        methods: {
          ARS: {
            available_methods: ["bank_transfer"],
            bank_data: ARGENTINIAN_BANK_DATA,
            limits: {
              minimum_amount: ARGENTINIAN_BANK_DATA.minimum_amount,
              maximum_amount: ARGENTINIAN_BANK_DATA.maximum_amount,
              daily_limit: ARGENTINIAN_BANK_DATA.maximum_amount,
            },
            processing_time: ARGENTINIAN_BANK_DATA.processing_time,
          },
        },
      },
    })
  } catch (error) {
    console.error("Failed to fetch deposit information:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch deposit information",
      },
      { status: 500 },
    )
  }
}
