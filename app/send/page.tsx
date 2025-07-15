"use client"

import type React from "react"

import { usePortalWalletContext } from "@/app/context/PortalWalletContext"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { User } from "@/lib/auth"
import { checkUserExistsByEmail, getCurrentUser, inviteUserForTransaction } from "@/lib/auth"
import { localGetQuote } from "@/lib/bitso/bitso"
import { supabase } from "@/lib/supabase"
import type { TransactionStatus } from "@/lib/transaction-status"
import { AlertTriangle, ArrowLeft, Loader2, Send } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function SendMoneyPage() {
    const {
    sendTokens,
    eip155Address,
    mxnBalance   
  } = usePortalWalletContext()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true) // Initial loading for user check
  const [formSubmitting, setFormSubmitting] = useState(false) // Separate loading for form submission
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const [recipientRegistered, setRecipientRegistered] = useState(false) // Declare recipientRegistered variable
  const [quote, setQuote] = useState<QuoteResponse>()

  const [formData, setFormData] = useState({
    recipientName: "",
    recipientEmail: "",
    amount: "",
    currency: "MXN",
    notes: "",
  })

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(()=>{
    if (formData.amount && formData.currency){
      const to_currency: "MXN" | "ARS" = formData.currency === "MXN" ? "ARS" : "MXN";
      localGetQuote(formData.currency, to_currency, Number(formData.amount))
      .then((resp)=>{
        console.log(resp)
        setQuote(resp)
      })
      .catch((e)=>{
        console.error('Error Quote', e)
      })
    }
  }, [formData.amount])


  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/auth/login")
        return
      }
      setUser(currentUser)
    } catch (error) {
      router.push("/auth/login")
    } finally {
      setLoading(false) // Set loading to false after user check
    }
  }

  const generateReferenceNumber = () => {
    return (
      "TXN" +
      Date.now().toString().slice(-8) +
      Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true) // Use formSubmitting for this action
    setError("")

    try {
      // Ensure user is logged in before proceeding
      if (!user) {
        setError("You must be logged in to send money.")
        router.push("/auth/login")
        return
      }

      const recipientUser = await checkUserExistsByEmail(formData.recipientEmail)
      const isRecipientRegistered = !!recipientUser

      setRecipientRegistered(isRecipientRegistered) // Set recipientRegistered state

      const referenceNumber = generateReferenceNumber()
      let initialStatus: TransactionStatus
      const recipientUserId = recipientUser?.id || null

      if (isRecipientRegistered) {
        initialStatus = "pending_user_start" // Recipient exists, ready for claim
      } else {
        initialStatus = "pending_invite" // Recipient does not exist, needs invite
      }

      // Insert transaction into database with initial status
      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .insert([
          {
            sender_id: user.id,
            recipient_name: formData.recipientName,
            recipient_email: formData.recipientEmail,
            recipient_user_id: recipientUserId,
            amount: Number.parseFloat(formData.amount),
            currency: formData.currency,
            status: initialStatus,
            reference_number: referenceNumber,
            notes: formData.notes || null,
          },
        ])
        .select()
        .single()

      if (transactionError) throw transactionError


      
      else if (initialStatus === "pending_user_start") {
        // If recipient is registered, immediately transition to pendin_deposits  on (simulating backend)
        var wallet_to = "0xE41Bd5013654846C791B1e8245007372AcB8da4e";
        var set_claim = false;
        if (recipientUser && recipientUser.wallet) {
          wallet_to = recipientUser.wallet;
          set_claim = true;
        }
        // send blockchain tokens
        const txHash = await sendTokens({
          to: wallet_to,
          amount : formData.amount,
          tokenMint: "0x82B9e52b26A2954E113F94Ff26647754d5a4247D"
        })
        console.log(txHash)
        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            deposit_reference: txHash,
            status: (set_claim ? "pending_claim" : "pending_deposit"),
            updated_at: new Date().toISOString(),
          })
          .eq("id", transactionData.id)

          // Handle post-creation actions based on initial status
          if (!set_claim) {
            // If recipient is not registered, send an invitation email
            await inviteUserForTransaction(formData.recipientEmail, transactionData.id)
            // /setSuccess(true) // Indicate success for invitation
          } 

        if (updateError) {
          console.error("Error updating transaction status to pending_deposit:", updateError)
          setError("Transaction created, but failed to update status. Please contact support.")
          return
        }
        setSuccess(true) // Indicate success for direct claim
      }

      setTimeout(() => {
        router.push("/dashboard")
      }, 5000)
    } catch (err: any) {
      setError(err.message || "Failed to send money")
    } finally {
      setFormSubmitting(false) // Reset formSubmitting
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="bg-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Send className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Transfer Initiated!</h2>
              <p className="text-gray-600 mb-4">
                Your money transfer has been successfully initiated. You'll be redirected to your dashboard.
              </p>
              <Alert>
                <AlertDescription>
                  {recipientRegistered
                    ? "The recipient can now claim the funds."
                    : "An invitation has been sent to the recipient to register and claim the funds."}
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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
            <h1 className="text-xl font-semibold text-gray-900 ml-4">Send Money</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Send Money Transfer</CardTitle>
            <CardDescription>Send money to anyone, anywhere in the world</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Recipient Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Recipient Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipientName">Full Name</Label>
                    <Input
                      id="recipientName"
                      type="text"
                      placeholder="John Doe"
                      value={formData.recipientName}
                      onChange={(e) => handleInputChange("recipientName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipientEmail">Email Address</Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.recipientEmail}
                      onChange={(e) => handleInputChange("recipientEmail", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Transfer Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Transfer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="1"
                      max={mxnBalance}
                      placeholder={mxnBalance}
                      value={formData.amount}
                      onChange={(e) => handleInputChange("amount", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => handleInputChange("currency", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                        <SelectItem disabled value="ARS">ARS - Argentinian Peso ( coming soon! )</SelectItem>
                        <SelectItem disabled value="USD">USD - US Dollar ( coming soon! ) </SelectItem>
                        <SelectItem disabled value="EUR">EUR - Euro ( coming soon! )</SelectItem>
                        <SelectItem disabled value="BRL">BRL - Brazilian real ( coming soon! )</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add a message for the recipient..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Transfer Summary */}
              {formData.amount && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Transfer Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span>
                        {formData.amount} {formData.currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Recipient:</span>
                      <span>{formData.recipientName || "Not specified"}</span>
                    </div>
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total:</span>
                      <span>
                        {formData.amount} {formData.currency}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>APROX:</span>
                      <span>
                        {quote?.payload.to_amount} {quote?.payload.to_currency}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <div className="px-6 pb-6">
              <Button type="submit" className="w-full" disabled={formSubmitting}>
                {formSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Send Money
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
