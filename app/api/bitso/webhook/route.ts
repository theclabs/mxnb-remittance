import { withdrawCrypto } from "@/lib/bitso/withdraw"
import { createServerClient } from "@/lib/supabase"
import { NextResponse, type NextRequest } from "next/server"
import type { AuthUser, JunoWebhookPayload, JunoWebhookRequest, Transaction } from "./types"

const supabase = createServerClient()


export async function POST(req: NextRequest) {
  try {
    const { payload, event }: JunoWebhookRequest = await req.json()

    console.log("Received Juno webhook:", { event, payload })

    // Always respond with success first to acknowledge webhook
    const response = NextResponse.json({ success: true }, { status: 200 })

    // Process webhook asynchronously
    processWebhookAsync(event, payload).catch((error) => {
      console.error("Webhook processing failed:", error)
    })

    return response
  } catch (error) {
    console.error("Webhook parsing failed:", error)
    // Still return success to avoid webhook retries for malformed requests
    return NextResponse.json({ success: true }, { status: 200 })
  }
}

async function processWebhookAsync(event: string, payload: JunoWebhookPayload) {
  try {
    console.log(`Processing ${event} event for protocol: ${payload.protocol}`)

    // Only process completed transactions
    if (payload.status !== "complete") {
      console.log(`Skipping webhook processing for status: ${payload.status}`)
      return
    }

    // Determine if this is Fiat or blockchain transaction
    const isFiat = payload.protocol === "clabe" || payload.protocol === "coelsa"
    const isBlockchain = payload.protocol === "erc20" || payload.protocol === "solana"

    if (event === "funding" && isFiat) {
      // Handle fiat deposit (MXN via CLABE)
      await handleFiatFunding(payload)
    } else if (event === "withdrawal" && isBlockchain) {
      // Handle crypto withdrawal confirmation
      await handleCryptoWithdrawal(payload)
    } else {
      console.log(`Unhandled event type: ${event} with protocol: ${payload.protocol}`)
    }
  } catch (error) {
    console.error("Webhook processing error:", error)
    throw error
  }
}

async function handleFiatFunding(payload: JunoWebhookPayload) {
  try {
    console.log("Processing fiat funding:", payload.fid)

    // Find user by the receive_clabe
    const receiveClabe = payload.details.receive_clabe
    if (!receiveClabe) {
      console.warn("No receive_clabe found in payload:", payload.fid)
      return
    }

    const user = await findUserByClabe(receiveClabe)
    if (!user) {
      console.warn("No user found for CLABE:", receiveClabe)
      return
    }

    console.log("Found user for fiat funding:", user.id)

    // If user has a wallet address, initiate MXNB withdrawal
    if (user.user_metadata.wallet) {
      console.log("User has wallet address, initiating MXNB withdrawal:", user.user_metadata.wallet)

      await initiateMxnbWithdrawal(user, payload)
    } else {
      console.log("User has no wallet address, MXNB withdrawal skipped")
    }

    console.log("Fiat funding processed successfully")
  } catch (error) {
    console.error("Fiat funding processing failed:", error)
    throw error
  }
}

async function handleCryptoWithdrawal(payload: JunoWebhookPayload) {
  try {
    console.log("Processing crypto withdrawal confirmation:", payload.fid)

    // Find user by wallet address (from_address or to_address)
    const walletAddress = payload.details.from_address || payload.details.to_address
    if (!walletAddress) {
      console.warn("No wallet address found in crypto withdrawal:", payload.fid)
      return
    }

    const user = await findUserByWallet(walletAddress)
    if (!user) {
      console.warn("No user found for wallet:", walletAddress)
      return
    }

    console.log("Found user for crypto withdrawal:", user.id)

    console.log("Crypto withdrawal processed successfully")
  } catch (error) {
    console.error("Crypto withdrawal processing failed:", error)
    throw error
  }
}

async function initiateMxnbWithdrawal(user: AuthUser, payload: JunoWebhookPayload) {
  try {
    console.log("Initiating MXNB withdrawal for user:", user.id)

    // Convert MXN amount to MXNB (1:1 ratio)
    const mxnbAmount = Number.parseFloat(payload.amount)

    // Withdraw MXNB to user's wallet using Bitso
    const withdrawalResponse = await withdrawCrypto({
      asset: "mxnbj",
      currency: "mxnbj",
      amount: mxnbAmount,
      walletAddress: user.user_metadata.wallet!,
      method: "arb_erc20",
      network: "arbitrum", // or "ethereum", "polygon" based on your preference
      description: `MXNB withdrawal for MXN deposit ${payload.fid}`,
    })

    console.log("MXNB withdrawal initiated:", withdrawalResponse.payload.wid)

    console.log("MXNB withdrawal process completed successfully")
  } catch (error) {
    console.error("MXNB withdrawal failed:", error)

    throw error
  }
}

async function findUserByClabe(clabe: string): Promise<AuthUser | null> {
  if (!clabe) return null

  try {
    // Get all users and filter by CLABE in user_metadata
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error("Error listing users:", error)
      return null
    }

    // Find user with matching CLABE in user_metadata
    console.dir("listUsers() data")
    console.dir(data)
    console.dir(clabe)
    const user = data.users.find((user) => user.user_metadata?.clabe === clabe)

    if (!user) {
      console.log("No user found with CLABE:", clabe)
      return null
    }

    return user as AuthUser
  } catch (error) {
    console.error("Error finding user by CLABE:", error)
    return null
  }
}

async function findUserByWallet(walletAddress: string): Promise<AuthUser | null> {
  if (!walletAddress) return null

  try {
    // Get all users and filter by wallet_address in user_metadata
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error("Error listing users:", error)
      return null
    }

    // Find user with matching wallet_address in user_metadata
    const user = data.users.find((user) => user.user_metadata?.wallet === walletAddress)

    if (!user) {
      console.log("No user found with wallet address:", walletAddress)
      return null
    }

    return user as AuthUser
  } catch (error) {
    console.error("Error finding user by wallet:", error)
    return null
  }
}

async function recordTransaction(transaction: Omit<Transaction, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      ...transaction,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("Error recording transaction:", error)
    throw error
  }

  console.log("Transaction recorded:", data.id)
  return data
}

async function updateTransactionStatus(
  transactionId: string,
  status: string,
  additionalMetadata: Record<string, any> = {},
) {
  try {
    // First get the current transaction to preserve existing metadata
    const { data: currentTx, error: fetchError } = await supabase
      .from("transactions")
      .select("metadata")
      .eq("id", transactionId)
      .single()

    if (fetchError) {
      console.error("Error fetching current transaction:", fetchError)
      throw fetchError
    }

    // Merge existing metadata with new metadata
    const updatedMetadata = {
      ...(currentTx.metadata || {}),
      ...additionalMetadata,
      status_updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from("transactions")
      .update({
        status,
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)

    if (error) {
      console.error("Error updating transaction status:", error)
      throw error
    }

    console.log(`Transaction ${transactionId} status updated to: ${status}`)
  } catch (error) {
    console.error("Failed to update transaction status:", error)
    throw error
  }
}
