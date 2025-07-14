import { makeBitsoRequest } from "@/lib/bitso/bitso"

// Types for Bitso withdrawal requests
export interface BitsoWithdrawalRequest {
  currency: string
  amount: string
  asset: string
  method: string
  network?: string
  protocol?: string
  recipient_name?: string
  cvu?: string
  cbu?: string
  address?: string
  destination_tag?: string
  max_fee?: string
  origin_id: string
  description?: string
  contact_id?: number
}

export interface BitsoWithdrawalResponse {
  success: boolean
  payload: {
    wid: string
    status: "pending" | "processing" | "complete" | "failed"
    created_at: string
    currency: string
    method: string
    method_name: string
    amount: string
    asset: string
    network?: string
    protocol?: string
    integration: string
    details: {
      origin_id: string
      [key: string]: any
    }
    legal_operation_entity?: {
      name: string
      country_code_iso_2: string
      image_id: string
    }
  }
}

// Generate unique origin ID for withdrawal requests
function generateOriginId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 9)
  return `bitso_${timestamp}_${random}`.substr(0, 40) // Max 40 chars
}

/**
 * Withdraw cryptocurrency from Bitso to an external wallet address
 */
export async function withdrawCrypto(params: {
  asset: "mxnbj"
  currency: "mxnb" | "mxnbj"
  amount: number
  walletAddress: string
  method: string
  network?: string
  destinationTag?: string
  description?: string
  maxFee?: number
}): Promise<BitsoWithdrawalResponse> {
  const { asset, currency, amount, walletAddress, network, destinationTag, description, maxFee, method } = params

  console.log("Initiating crypto withdrawal:", { currency, amount, walletAddress, network })

  // Validate wallet address format (basic validation)
  if (!walletAddress || walletAddress.length < 10) {
    throw new Error("Invalid wallet address provided")
  }

  // Determine network and method based on currency
  let withdrawalNetwork = network

  if (currency === "mxnb" || currency === "mxnbj") {
    withdrawalNetwork = withdrawalNetwork || "arbitrum" // or polygon, ethereum
  }

  const withdrawalRequest: BitsoWithdrawalRequest = {
    currency: currency.toLowerCase(),
    amount: amount.toString(),
    asset: asset,
    method: method,
    network: withdrawalNetwork,
    protocol: "erc20",
    address: walletAddress,
    destination_tag: destinationTag,
    max_fee: maxFee?.toString() || "0",
    origin_id: generateOriginId(),
    description: description || `Crypto withdrawal to ${walletAddress.slice(0, 8)}...`,
  }

  console.log("Crypto withdrawal request:", withdrawalRequest)

  try {
    const response = await makeBitsoRequest<BitsoWithdrawalResponse>("withdrawals", {
      method: "POST",
      body: withdrawalRequest,
    })

    console.log("Crypto withdrawal response:", response)

    if (!response.success) {
      throw new Error("Bitso withdrawal request failed")
    }

    return response
  } catch (error) {
    console.error("Crypto withdrawal failed:", error)
    throw new Error(`Crypto withdrawal failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Withdraw fiat currency from Bitso to a bank account
 */
export async function withdrawFiat(params: {
  currency: "ars" | "mxn"
  amount: number
  recipientName: string
  bankAccount: {
    cvu?: string
    cbu?: string
    clabe?: string
    accountType?: "cvu" | "cbu" | "clabe"
  }
  description?: string
  maxFee?: number
}): Promise<BitsoWithdrawalResponse> {
  const { currency, amount, recipientName, bankAccount, description, maxFee } = params

  console.log("Initiating fiat withdrawal:", { currency, amount, recipientName, bankAccount })

  // Validate bank account information
  const { cvu, cbu, clabe, accountType } = bankAccount

  if (!cvu && !cbu && !clabe) {
    throw new Error("Bank account information is required (CVU, CBU, or CLABE)")
  }

  // Determine method, network, and protocol based on currency and account type
  let method: string
  let network: string
  let protocol: string
  let accountNumber: string

  if (currency === "ars") {
    // Argentine Peso withdrawal
    method = "bind"
    network = "coelsa"
    protocol = "cvu"
    accountNumber = cvu || cbu || ""

    if (!accountNumber) {
      throw new Error("CVU or CBU is required for ARS withdrawals")
    }

    // Validate CVU/CBU format (22 digits)
    if (!/^\d{22}$/.test(accountNumber)) {
      throw new Error("Invalid CVU/CBU format. Must be 22 digits")
    }
  } else if (currency === "mxn") {
    // Mexican Peso withdrawal
    method = "spei"
    network = "spei"
    protocol = "clabe"
    accountNumber = clabe || ""

    if (!accountNumber) {
      throw new Error("CLABE is required for MXN withdrawals")
    }

    // Validate CLABE format (18 digits)
    if (!/^\d{18}$/.test(accountNumber)) {
      throw new Error("Invalid CLABE format. Must be 18 digits")
    }
  } else {
    throw new Error(`Unsupported fiat currency: ${currency}`)
  }

  const withdrawalRequest: BitsoWithdrawalRequest = {
    currency: currency.toLowerCase(),
    amount: amount.toString(),
    asset: currency.toLowerCase(),
    method,
    network,
    protocol,
    recipient_name: recipientName,
    max_fee: maxFee?.toString() || "0",
    origin_id: generateOriginId(),
    description: description || `Fiat withdrawal to ${accountNumber.slice(0, 8)}...`,
  }

  // Add the appropriate account field based on currency
  if (currency === "ars") {
    withdrawalRequest.cvu = accountNumber
  } else if (currency === "mxn") {
    withdrawalRequest.cbu = accountNumber // Bitso might use 'cbu' field for CLABE
  }

  console.log("Fiat withdrawal request:", withdrawalRequest)

  try {
    const response = await makeBitsoRequest<BitsoWithdrawalResponse>("withdrawals", {
      method: "POST",
      body: withdrawalRequest,
    })

    console.log("Fiat withdrawal response:", response)

    if (!response.success) {
      throw new Error("Bitso withdrawal request failed")
    }

    return response
  } catch (error) {
    console.error("Fiat withdrawal failed:", error)
    throw new Error(`Fiat withdrawal failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Get withdrawal status by withdrawal ID
 */
export async function getWithdrawalStatus(withdrawalId: string): Promise<BitsoWithdrawalResponse> {
  try {
    console.log("Fetching withdrawal status for:", withdrawalId)

    const response = await makeBitsoRequest<BitsoWithdrawalResponse>(`withdrawals/${withdrawalId}`)

    console.log("Withdrawal status response:", response)

    if (!response.success) {
      throw new Error("Failed to fetch withdrawal status")
    }

    return response
  } catch (error) {
    console.error("Failed to get withdrawal status:", error)
    throw new Error(`Failed to get withdrawal status: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Get available withdrawal methods for a specific currency
 */
export async function getWithdrawalMethods(currency: string): Promise<any> {
  try {
    console.log("Fetching withdrawal methods for:", currency)

    const response = await makeBitsoRequest(`withdrawal_methods/${currency.toLowerCase()}`)

    console.log("Withdrawal methods response:", response)

    return response
  } catch (error) {
    console.error("Failed to get withdrawal methods:", error)
    throw new Error(`Failed to get withdrawal methods: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Helper function to validate withdrawal parameters
 */
export function validateWithdrawalParams(params: {
  currency: string
  amount: number
  destination: string
}): { isValid: boolean; error?: string } {
  const { currency, amount, destination } = params

  // Validate amount
  if (amount <= 0) {
    return { isValid: false, error: "Amount must be greater than 0" }
  }

  // Validate currency
  const supportedCurrencies = ["mxnbj", "mxnb", "ars", "mxn"]
  if (!supportedCurrencies.includes(currency.toLowerCase())) {
    return { isValid: false, error: `Unsupported currency: ${currency}` }
  }

  // Validate destination
  if (!destination || destination.length < 10) {
    return { isValid: false, error: "Invalid destination address/account" }
  }

  return { isValid: true }
}

/**
 * Helper function to estimate withdrawal fees
 */
export async function estimateWithdrawalFee(params: {
  currency: string
  amount: number
  method: string
}): Promise<{ estimatedFee: number; currency: string }> {
  const { currency, amount, method } = params

  try {
    // This would typically call Bitso's fee estimation endpoint
    // For now, returning estimated fees based on currency and method
    let estimatedFee = 0

    if (method === "crypto") {
      // Crypto withdrawal fees
      switch (currency.toLowerCase()) {
        case "mxnb":
        case "mxnbj":
          estimatedFee = 10 // MXNB
          break
        default:
          estimatedFee = 0
      }
    } else {
      // Fiat withdrawal fees (usually percentage-based)
      const feePercentage = currency === "ars" ? 0.005 : 0.003 // 0.5% for ARS, 0.3% for MXN
      const minimumFee = currency === "ars" ? 50 : 20
      estimatedFee = Math.max(amount * feePercentage, minimumFee)
    }

    return {
      estimatedFee,
      currency: method === "crypto" ? currency : "usd", // Fees usually in USD for fiat
    }
  } catch (error) {
    console.error("Failed to estimate withdrawal fee:", error)
    throw new Error("Failed to estimate withdrawal fee")
  }
}
