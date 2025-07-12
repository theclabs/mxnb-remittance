import { getBitsoBalances, makeBitsoRequest } from "@/lib/bitso"
import { NextResponse, type NextRequest } from "next/server"
import type { BitsoWithdrawalResponse, WithdrawalMethodsResponse, WithdrawalRequest, WithdrawalResponse } from "./types"

// Withdrawal limits for ARS (these would come from Bitso API in production)
const ARS_WITHDRAWAL_LIMITS = {
  minimum_amount: 100,
  maximum_amount: 500000,
  daily_limit: 1000000,
  monthly_limit: 10000000,
  fee_percentage: 0.5,
  fixed_fee: 50,
  processing_time: "Up to 24 business hours",
}

function validateCVU(cvu: string): boolean {
  return /^\d{22}$/.test(cvu)
}

function generateOriginId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 9)
  return `bitso_${timestamp}_${random}`.substr(0, 40) // Max 40 chars
}

function calculateWithdrawalFee(amount: number): number {
  const percentageFee = amount * (ARS_WITHDRAWAL_LIMITS.fee_percentage / 100)
  return Math.max(percentageFee, ARS_WITHDRAWAL_LIMITS.fixed_fee)
}

function maskCVU(cvu: string): string {
  if (cvu.length <= 8) return cvu
  return cvu.slice(0, 4) + "*".repeat(cvu.length - 8) + cvu.slice(-4)
}

// POST /api/bitso/withdrawal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { currency, amount, bank_account, notes } = body

    // Validate required fields
    if (!currency || !amount || !bank_account) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          required: ["currency", "amount", "bank_account"],
        },
        { status: 400 },
      )
    }

    // Validate currency
    if (currency !== "ARS") {
      return NextResponse.json(
        {
          success: false,
          error: "Only ARS withdrawals are supported",
        },
        { status: 400 },
      )
    }

    // Validate amount
    const numericAmount = Number.parseFloat(amount.toString())
    if (numericAmount < ARS_WITHDRAWAL_LIMITS.minimum_amount) {
      return NextResponse.json(
        {
          success: false,
          error: `Amount must be at least ${ARS_WITHDRAWAL_LIMITS.minimum_amount} ARS`,
        },
        { status: 400 },
      )
    }

    if (numericAmount > ARS_WITHDRAWAL_LIMITS.maximum_amount) {
      return NextResponse.json(
        {
          success: false,
          error: `Amount cannot exceed ${ARS_WITHDRAWAL_LIMITS.maximum_amount} ARS`,
        },
        { status: 400 },
      )
    }

    // Validate bank account
    const { account_holder_name, cvu, cbu } = bank_account
    const accountNumber = cvu || cbu

    if (!account_holder_name || !accountNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing account holder name or CVU/CBU",
        },
        { status: 400 },
      )
    }

    if (!validateCVU(accountNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid CVU/CBU format. Must be 22 digits",
        },
        { status: 400 },
      )
    }

    console.log("Processing ARS withdrawal:", { currency, amount: numericAmount, account_holder_name })

    // Check if user has sufficient ARS balance
    try {
      console.log("Checking ARS balance...")
      const balances = await getBitsoBalances()
      const arsBalance = balances.find((b) => b.currency.toLowerCase() === "ars")

      if (!arsBalance) {
        return NextResponse.json(
          {
            success: false,
            error: "No ARS balance found in account",
          },
          { status: 400 },
        )
      }

      const availableBalance = Number.parseFloat(arsBalance.available)
      console.log(`Available ARS balance: ${availableBalance}, Requested: ${numericAmount}`)

      if (availableBalance < numericAmount) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient ARS balance. Available: ${availableBalance.toLocaleString()} ARS, Requested: ${numericAmount.toLocaleString()} ARS`,
            available_balance: availableBalance,
            requested_amount: numericAmount,
          },
          { status: 400 },
        )
      }

      console.log("Balance check passed")
    } catch (error) {
      console.error("Error checking balance:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify account balance. Please try again later.",
        },
        { status: 500 },
      )
    }

    // First, get withdrawal methods to ensure we have the correct taxonomy
    let withdrawalMethods: WithdrawalMethodsResponse
    try {
      withdrawalMethods = await makeBitsoRequest<WithdrawalMethodsResponse>("withdrawal_methods/ars")
      console.log("Withdrawal methods:", withdrawalMethods)
    } catch (error) {
      console.error("Failed to get withdrawal methods:", error)
      // Continue with default values if the call fails
    }

    // Prepare withdrawal request for Bitso API
    const originId = generateOriginId()
    const withdrawalRequest: WithdrawalRequest = {
      asset: "ars",
      currency: "ars",
      method: "bind",
      network: "coelsa",
      protocol: "cvu",
      amount: numericAmount.toString(),
      max_fee: "0", // Let Bitso calculate the fee
      recipient_name: account_holder_name,
      cvu: accountNumber,
      origin_id: originId,
      description: notes || "Withdrawal from Bitso account",
    }

    console.log("Submitting withdrawal to Bitso:", withdrawalRequest)

    // Submit withdrawal to Bitso API
    let bitsoResponse: BitsoWithdrawalResponse
    try {
      bitsoResponse = await makeBitsoRequest<BitsoWithdrawalResponse>("withdrawals", {
        method: "POST",
        body: withdrawalRequest,
      })
      console.log("Bitso withdrawal response:", bitsoResponse)
    } catch (error) {
      console.error("Bitso withdrawal failed:", error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Withdrawal failed",
        },
        { status: 500 },
      )
    }

    // Calculate fee for display (this would ideally come from Bitso response)
    const fee = calculateWithdrawalFee(numericAmount)
    const netAmount = numericAmount - fee

    // Transform Bitso response to our format
    const withdrawalResponse: WithdrawalResponse = {
      success: true,
      payload: {
        withdrawal_id: bitsoResponse.payload.wid,
        currency: "ARS",
        amount: numericAmount,
        net_amount: netAmount,
        fee,
        status:
          bitsoResponse.payload.status === "pending"
            ? "pending"
            : bitsoResponse.payload.status === "processing"
              ? "processing"
              : bitsoResponse.payload.status === "complete"
                ? "completed"
                : "failed",
        bank_account: {
          account_holder_name,
          masked_account: maskCVU(accountNumber),
          account_type: "CVU",
        },
        estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: bitsoResponse.payload.created_at,
        notes,
      },
    }

    console.log("Withdrawal processed successfully:", withdrawalResponse)
    return NextResponse.json(withdrawalResponse, { status: 200 })
  } catch (error) {
    console.error("Withdrawal operation failed:", error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body",
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}

// GET /api/bitso/withdrawal - Get withdrawal status or limits
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const withdrawalId = searchParams.get("id")

    if (withdrawalId) {
      // Get specific withdrawal status from Bitso
      try {
        const withdrawal: BitsoWithdrawalResponse = await makeBitsoRequest(`withdrawals/${withdrawalId}`)
        return NextResponse.json({
          success: true,
          payload: withdrawal.payload,
        })
      } catch (error) {
        console.error("Failed to fetch withdrawal:", error)
        return NextResponse.json(
          {
            success: false,
            error: "Withdrawal not found",
          },
          { status: 404 },
        )
      }
    }

    // Get withdrawal methods and limits
    try {
      const withdrawalMethods: WithdrawalMethodsResponse = await makeBitsoRequest("withdrawal_methods/ars")

      return NextResponse.json({
        success: true,
        payload: {
          currency: "ARS",
          limits: ARS_WITHDRAWAL_LIMITS,
          methods: withdrawalMethods.payload,
          supported_account_types: ["cvu"],
          processing_entity: {
            name: "Nvio Argentina",
            country: "AR",
          },
        },
      })
    } catch (error) {
      console.error("Failed to fetch withdrawal methods:", error)

      // Return basic limits if API call fails
      return NextResponse.json({
        success: true,
        payload: {
          currency: "ARS",
          limits: ARS_WITHDRAWAL_LIMITS,
          supported_account_types: ["cvu"],
          processing_entity: {
            name: "Nvio Argentina",
            country: "AR",
          },
        },
      })
    }
  } catch (error) {
    console.error("Failed to fetch withdrawal information:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch withdrawal information",
      },
      { status: 500 },
    )
  }
}
