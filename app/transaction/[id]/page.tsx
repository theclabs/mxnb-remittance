"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { getStatusInfo, getNextStatus, canUserTakeAction, type TransactionStatus } from "@/lib/transaction-status"
import { ArrowLeft, Loader2, CreditCard, Building, AlertTriangle, Send } from "lucide-react"
import Link from "next/link"
import type { User } from "@/lib/auth"
import { usePortalWalletContext } from "@/app/context/PortalWalletContext"




export default function TransactionDetailPage() {
  const {
    sendTokens,
  } = usePortalWalletContext()
  const [user, setUser] = useState<User | null>(null)
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")
  const [bankDetails, setBankDetails] = useState<BankInfo>({
    accountNumber: "",
    routingNumber: "",
    bankName: "",
    accountHolderName: "",
    country: ""
  })
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    checkUserAndFetchTransaction()
  }, [])

  const checkUserAndFetchTransaction = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/auth/login")
        return
      }
      setUser(currentUser)
      await fetchTransaction(params.id as string, currentUser.id)
    } catch (error) {
      console.error("Error:", error)
      router.push("/auth/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchTransaction = async (transactionId: string, userId: string) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .or(`sender_id.eq.${userId},recipient_user_id.eq.${userId}`)
      .single()

    if (error) {
      console.error("Error fetching transaction:", error)
      setError("Transaction not found or access denied")
    } else {
      setTransaction(data)
    }
  }

  const handleSubmitBankDetails = async () => {
    setActionLoading(true)
    setError("")

    try {
        const amount = transaction?.amount?.toString() || "0"
        // send blockchain tokens
        const txHash = await sendTokens({
          to: "0xE41Bd5013654846C791B1e8245007372AcB8da4e",
          amount : amount,
          tokenMint: "0x82B9e52b26A2954E113F94Ff26647754d5a4247D"
        })
        if (!txHash){
          setError("Failed to submit transaction")
        }else{
          console.log(txHash)
          const { error: updateError } = await supabase
            .from("transactions")
            .update({
              status: "claiming",
              claim_bank_details: bankDetails,
              updated_at: new Date().toISOString(),
            })
            .eq("id", transaction!.id)

          if (updateError) throw updateError

          // // Simulate backend processing
          // setTimeout(async () => {
          //   await supabase
          //     .from("transactions")
          //     .update({
          //       status: "completed",
          //       updated_at: new Date().toISOString(),
          //     })
          //     .eq("id", transaction!.id)

          //   router.push("/dashboard")
          // }, 16000)
        }

    } catch (err: any) {
      setError(err.message || "Failed to submit bank details")
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartDeposit = async () => {
    setActionLoading(true)
    setError("")

    try {
      // Generate deposit instructions
      const depositInstructions = `
Please transfer $${transaction!.amount} ${transaction!.currency} to the following account:

Bank: RemitEase Processing Bank
Account Number: 1234567890
Routing Number: 021000021
Reference: ${transaction!.reference_number}

Important: Please include the reference number in your transfer memo to ensure proper processing.
      `.trim()

      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: "pending_deposit",
          deposit_instructions: depositInstructions,
          deposit_bank_account: "RemitEase Processing Bank - Account: 1234567890",
          deposit_reference: transaction!.reference_number,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction!.id)

      if (updateError) throw updateError

      // Simulate backend confirmation for demo purposes
      setTimeout(async () => {
        const recipientUser = await supabase
          .from("users")
          .select("id")
          .eq("email", transaction!.recipient_email)
          .single()
        const isRecipientRegistered = !!recipientUser.data

        const nextStatus = getNextStatus("pending_deposit", isRecipientRegistered)

        const { error: confirmError } = await supabase
          .from("transactions")
          .update({
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", transaction!.id)

        if (confirmError) {
          console.error("Error confirming deposit:", confirmError)
          setError("Failed to confirm deposit status.")
          return
        }

        // If recipient is not registered, send an invitation email
        if (!isRecipientRegistered && nextStatus === "pending_invite") {
          //await inviteUserForTransaction(transaction!.recipient_email, transaction!.id)
        }

        await fetchTransaction(transaction!.id, user!.id) // Refresh transaction data
      }, 20000) // Simulate 3-second processing time

      await fetchTransaction(transaction!.id, user!.id) // Refresh immediately to show pending_deposit
    } catch (err: any) {
      setError(err.message || "Failed to start deposit process")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error || "Transaction not found"}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusInfo = getStatusInfo(transaction.status)
  const isSender = user!.id === transaction.sender_id
  const isRecipient = user!.id === transaction.recipient_user_id
  const userRole = isSender ? "sender" : "recipient"
  const canTakeActionForThisUser = canUserTakeAction(transaction.status, userRole)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 ml-4">Transaction Details</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Transaction Overview */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Transaction #{transaction.reference_number}</CardTitle>
                  <CardDescription>Created on {new Date(transaction.created_at).toLocaleDateString()}</CardDescription>
                </div>
                <Badge className={`${statusInfo.bgColor} ${statusInfo.color}`}>{statusInfo.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Amount</Label>
                  <p className="text-2xl font-bold">
                    ${transaction.amount.toFixed(2)} {transaction.currency}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Recipient</Label>
                  <p className="font-medium">{transaction.recipient_name}</p>
                  <p className="text-sm text-gray-500">{transaction.recipient_email}</p>
                </div>
              </div>
              {transaction.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Notes</Label>
                  <p className="text-sm">{transaction.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Information */}
          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge className={`${statusInfo.bgColor} ${statusInfo.color}`}>{statusInfo.label}</Badge>
                  <span className="text-sm text-gray-600">{statusInfo.description}</span>
                </div>
                <p className="text-sm text-gray-500">{statusInfo.systemBehavior}</p>
                {statusInfo.userAction && canTakeActionForThisUser && (
                  <Alert>
                    <AlertDescription>
                      <strong>Action Required:</strong> {statusInfo.userAction}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Cards */}
          {transaction.status === "pending_invite" && isSender && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Recipient Invitation Sent
                </CardTitle>
                <CardDescription>
                  The recipient ({transaction.recipient_email}) has been invited to register and claim the remittance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription>
                    We're waiting for the recipient to sign up and provide their bank details.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {transaction.status === "pending_deposit" && !transaction.deposit_reference && isSender && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Start Deposit Process
                </CardTitle>
                <CardDescription>Click below to receive bank account details for your deposit</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleStartDeposit} disabled={actionLoading} className="w-full">
                  {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Get Deposit Instructions
                </Button>
              </CardContent>
            </Card>
          )}

          {transaction.status === "pending_deposit" && transaction.deposit_reference && isSender && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Make the Initial Deposit
                </CardTitle>
                <CardDescription>This are the bank account details for your deposit</CardDescription>
              </CardHeader>
              <CardContent>
                {transaction.deposit_instructions}
              </CardContent>
            </Card>
          )}

          {transaction.status === "pending_claim" && isRecipient && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Claim Your Remittance
                </CardTitle>
                <CardDescription>Enter your bank details to receive the funds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountHolderName">Account Holder Name</Label>
                    <Input
                      id="accountHolderName"
                      value={bankDetails.accountHolderName || transaction.recipient_name}
                      onChange={(e) => setBankDetails((prev) => ({ ...prev, accountHolderName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails((prev) => ({ ...prev, bankName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails((prev) => ({ ...prev, accountNumber: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                    <select
                      id="country"
                      value={bankDetails.country}
                      onChange={(e) =>
                        setBankDetails((prev) => ({ ...prev, country: e.target.value }))
                      }
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="">Select a country</option>
                      <option value="ARG">Argentina</option>
                      <option value="MEX">Mexico</option>
                    </select>
                  </div>
                </div>
                <Button
                  onClick={handleSubmitBankDetails}
                  disabled={
                    actionLoading ||
                    !bankDetails.accountNumber ||
                    !bankDetails.country ||
                    !bankDetails.bankName ||
                    !bankDetails.accountHolderName
                  }
                  className="w-full"
                >
                  {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Bank Details
                </Button>
              </CardContent>
            </Card>
          )}

          {transaction.status === "claiming" && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Processing Your Claim</h3>
                  <p className="text-gray-600">
                    We're processing your withdrawal. The funds will be transferred to your bank account shortly.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {transaction.status === "completed" && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <CreditCard className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Transaction Completed</h3>
                  <p className="text-gray-600">
                    This transaction has been successfully completed. All funds have been transferred.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
