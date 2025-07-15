import { makeBitsoRequest } from "@/lib/bitso/bitso"
import { makeJunoRequest } from "@/lib/juno"
import { createServerClient } from "@/lib/supabase"

const supabase = createServerClient()

// Types for the claiming process
export interface ClaimTransaction {
  id: string
  user_id: string
  amount: string
  currency: "MXN" | "ARS"
  status: string
  bank_details?: {
    accountHolderName: string
    cvu?: string
    cbu?: string
    accountNumber?: string
    bank_code?: string
    account_type: string
  }
  metadata?: Record<string, any>
}

export interface BurnMxnbRequest {
  amount: number
  destination_bank_account_id?: string | null
  asset: "mxn"
}

export interface JunoRedemptionResponse {
  success: boolean
  payload: {
    id: string
    amount: number
    currency: string
    transaction_type: "REDEMPTION"
    method: string
    summary_status: "IN_PROGRESS" | "COMPLETED" | "FAILED"
    created_at: string
    updated_at: string
  }
}

export interface BitsoWithdrawalRequest {
  currency: string
  amount: string
  asset: string
  method?: string
  network?: string
  protocol?: string
  integration?: string
  beneficiary?: string
  recipient_name?: string
  cvu?: string
  cbu?: string
  clabe?: string
  max_fee?: string
  origin_id: string
  description?: string
}

export interface BitsoWithdrawalResponse {
  success: boolean
  payload: {
    wid: string
    status: "pending" | "processing" | "complete" | "failed"
    created_at: string
    currency: string
    method: string
    amount: string
    asset: string
    details: {
      origin_id: string
      [key: string]: any
    }
  }
}

export interface CrossCurrencyTradeResult {
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

/**
 * Step 1: Burn MXNB tokens through Juno redemption
 */
export async function burnMxnbTokens(amount: number): Promise<JunoRedemptionResponse> {
  console.log("Burning MXNB tokens:", amount)

  const burnRequest: BurnMxnbRequest = {
    amount,
    destination_bank_account_id: null,
    asset: "mxn",
  }

  try {
    const response = await makeJunoRequest<JunoRedemptionResponse>(
      "https://stage.buildwithjuno.com/mint_platform/v1/redemptions",
      {
        method: "POST",
        body: burnRequest,
      },
    )

    console.log("MXNB burn response:", response)

    if (!response.success) {
      throw new Error("Failed to burn MXNB tokens")
    }

    return response
  } catch (error) {
    console.error("MXNB burn failed:", error)
    throw new Error(`MXNB burn failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Step 2a: Execute ARS to MXN cross-currency trade
 */
export async function executeMxnArsTrade(amount: number): Promise<CrossCurrencyTradeResult> {
  console.log("Executing MXN to ARS trade:", amount)

  // Import the trade logic from the existing trade endpoint
  const { executeCrossCurrencyTrade } = await import("@/lib/bitso/trade")

  try {
    const tradeResult = await executeCrossCurrencyTrade("MXN", "ARS", amount, "market")
    console.log("MXN to ARS trade completed:", tradeResult)
    return tradeResult
  } catch (error) {
    console.error("MXN to ARS trade failed:", error)
    throw new Error(`MXN to ARS trade failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Step 2b: Withdraw MXN to bank account
 */
export async function withdrawMxnToBank(
  amount: number,
  bankDetails: ClaimTransaction["bank_details"],
): Promise<BitsoWithdrawalResponse> {
  console.log("Withdrawing MXN to bank:", { amount, bankDetails })

  if (!bankDetails) {
    throw new Error("Bank details are required for MXN withdrawal")
  }

  const { accountHolderName, accountNumber } = bankDetails

  const clabe = accountNumber

  if (!accountHolderName || !clabe) {
    throw new Error("Account holder name and CLABE are required for MXN withdrawal")
  }

  // Validate CLABE format (18 digits)
  if (!/^\d{18}$/.test(clabe)) {
    throw new Error("Invalid CLABE format. Must be 18 digits")
  }

  const originId = `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`.substr(0, 40)

  const withdrawalRequest: BitsoWithdrawalRequest = {
    currency: "mxn",
    amount: amount.toString(),
    asset: "mxn",
    // method: "spei",
    network: "spei",
    protocol: "clabe",
    integration: "praxis",
    beneficiary: accountHolderName,
    clabe: clabe,
    max_fee: "0",
    origin_id: originId,
    description: `MXN withdrawal for claim`,
  }

  try {
    const response = await makeBitsoRequest<BitsoWithdrawalResponse>("withdrawals", {
      method: "POST",
      body: withdrawalRequest,
    })

    console.log("MXN withdrawal response:", response)

    if (!response.success) {
      throw new Error("Bitso MXN withdrawal request failed")
    }

    return response
  } catch (error) {
    console.error("MXN withdrawal failed:", error)
    throw new Error(`MXN withdrawal failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Step 2c: Withdraw ARS to bank account
 */
export async function withdrawArsToBank(
  amount: number,
  bankDetails: ClaimTransaction["bank_details"],
): Promise<BitsoWithdrawalResponse> {
  console.log("Withdrawing ARS to bank:", { amount, bankDetails })

  if (!bankDetails) {
    throw new Error("Bank details are required for ARS withdrawal")
  }

  const { accountHolderName, cvu, cbu } = bankDetails
  const accountNumber = cvu || cbu

  if (!accountHolderName || !accountNumber) {
    throw new Error("Account holder name and CVU/CBU are required for ARS withdrawal")
  }

  // Validate CVU/CBU format (22 digits)
  if (!/^\d{22}$/.test(accountNumber)) {
    throw new Error("Invalid CVU/CBU format. Must be 22 digits")
  }

  const originId = `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`.substr(0, 40)

  const withdrawalRequest: BitsoWithdrawalRequest = {
    currency: "ars",
    amount: amount.toString(),
    asset: "ars",
    method: "bind",
    network: "coelsa",
    protocol: "cvu",
    recipient_name: accountHolderName,
    cvu: accountNumber,
    // max_fee: "0",
    origin_id: originId,
    description: `ARS withdrawal for claim`,
  }

  try {
    // MOCK IT FOR NOW BECAUSE BITSO HASNT ENABLED ARS IN STAGE
    // const response = await makeBitsoRequest<BitsoWithdrawalResponse>("withdrawals", {
    //   method: "POST",
    //   body: withdrawalRequest,
    // })

    const response: BitsoWithdrawalResponse = {
        success: true,
        payload: {
            wid: "widMock",
            status: "complete",
            created_at: new Date().toISOString(),
            currency: "ars",
            method: "coealsa",
            amount: amount.toString(),
            asset: "ars",
            details: {
              origin_id: originId
            }
          }
    }

    console.log("ARS withdrawal response:", response)

    if (!response.success) {
      throw new Error("Bitso ARS withdrawal request failed")
    }

    return response
  } catch (error) {
    console.error("ARS withdrawal failed:", error)
    throw new Error(`ARS withdrawal failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Step 3: Update transaction status in Supabase
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: string,
  additionalData: Record<string, any> = {},
): Promise<void> {
  console.log("Updating transaction status:", { transactionId, status })

  try {
    const { error } = await supabase
      .from("transactions")
      .update({
        status,
        ...additionalData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)

    if (error) {
      console.error("Error updating transaction:", error)
      throw error
    }

    console.log(`Transaction ${transactionId} updated to status: ${status}`)
  } catch (error) {
    console.error("Failed to update transaction status:", error)
    throw new Error(`Failed to update transaction: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Main claim processing function
 */
export async function processClaim(transaction: ClaimTransaction): Promise<void> {
  const { id, amount, currency, bank_details } = transaction
  const numericAmount = Number.parseFloat(amount)

  console.log("Processing claim:", { id, amount, currency })

  try {
    // Step 1: Burn MXNB tokens
    console.log("Step 1: Burning MXNB tokens...")
    const burnResponse = await burnMxnbTokens(numericAmount)

    await updateTransactionStatus(id, "processing", {
    //   id: burnResponse.payload.id,
    })

    // Step 2: Handle currency-specific processing
    let finalAmount = numericAmount
    let withdrawalResponse: BitsoWithdrawalResponse

    if (currency === "ARS") {
      console.log("Step 2a: Trading MXN to ARS...")
      const tradeResult = await executeMxnArsTrade(numericAmount)
      finalAmount = tradeResult.to_amount

      console.log("Step 2b: Withdrawing ARS to bank...")
      withdrawalResponse = await withdrawArsToBank(finalAmount, bank_details)
    } else if (currency === "MXN") {
      console.log("Step 2: Withdrawing MXN to bank...")
      withdrawalResponse = await withdrawMxnToBank(numericAmount, bank_details)
    } else {
      throw new Error(`Unsupported currency: ${currency}`)
    }

    // Step 3: Mark as completed
    console.log("Step 3: Marking transaction as completed...")
    await updateTransactionStatus(id, "completed", {
    //   id: burnResponse.payload.id,
      updated_at: new Date().toISOString(),
    //   final_amount: finalAmount.toString(),
    //   processing_step: "completed",
    })

    console.log("Claim processing completed successfully")
  } catch (error) {
    console.error("Claim processing failed:", error)

    // Update transaction status to failed
    await updateTransactionStatus(id, "failed", {
    })

    throw error
  }
}
