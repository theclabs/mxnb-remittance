import { processClaim, type ClaimTransaction } from "@/lib/bitso/claims"
import { createClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string)

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secretHeader = req.headers.get("Authorization")
  const expectedSecret = process.env.MY_SECRET_HEADER

  // if (secretHeader !== expectedSecret) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // }

  try {
    const { type, table, record, schema, old_record } = await req.json()

    // Only process transaction table updates where status changed to 'claiming'
    if (table !== "transactions" || type !== "UPDATE" || record.status !== "claiming") {
      return NextResponse.json({}, { status: 200 })
    }

    console.log("Supabase webhook received, processing claim...")
    console.log("Transaction record:", record)

    // Validate required fields
    if (!record.id || !record.amount || !record.currency) {
      console.error("Missing required fields in transaction record")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate currency
    if (!["MXN", "ARS"].includes(record.currency)) {
      console.error("Unsupported currency:", record.currency)
      return NextResponse.json({ error: "Unsupported currency" }, { status: 400 })
    }

    // Validate bank details if present
    if (!record.claim_bank_details) {
      console.error("Missing bank details for claim")
      return NextResponse.json({ error: "Missing bank details" }, { status: 400 })
    }

    const transaction: ClaimTransaction = {
      id: record.id,
      user_id: record.user_id,
      amount: record.amount,
      currency: record.currency,
      status: record.status,
      bank_details: record.claim_bank_details,
      metadata: record.metadata || {},
    }

    // Process the claim asynchronously
    processClaimAsync(transaction).catch((error) => {
      console.error("Claim processing failed:", error)
    })

    // Return success immediately to acknowledge webhook
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function processClaimAsync(transaction: ClaimTransaction) {
  try {
    console.log("Starting claim processing for transaction:", transaction.id)
    await processClaim(transaction)
    console.log("Claim processing completed successfully for transaction:", transaction.id)
  } catch (error) {
    console.error("Claim processing failed for transaction:", transaction.id, error)

    // You might want to implement retry logic or send notifications here
    // For now, we'll just log the error
  }
}
