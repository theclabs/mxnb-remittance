"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser, signOut } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { ArrowUpRight, DollarSign, Send, User, LogOut, Plus } from "lucide-react"
import Link from "next/link"
import type { User as UserType } from "@/lib/auth"
// Import the transaction status utilities at the top:
import { getStatusInfo, canUserTakeAction, type TransactionStatus } from "@/lib/transaction-status"
import { usePortalWalletContext } from "@/app/context/PortalWalletContext"

// Update the Transaction interface to include new fields:
interface Transaction {
  id: string
  sender_id: string // Added sender_id to interface
  recipient_name: string
  recipient_email: string
  amount: number
  currency: string
  status: TransactionStatus
  reference_number: string
  created_at: string
  deposit_instructions?: string
  deposit_bank_account?: string
  claim_bank_details?: any
  recipient_user_id?: string // Added recipient_user_id
}

export default function DashboardPage() {
  const {
    initializeWallet,
    disconnectWallet,
    assets,
    getAssets,
    portal
    
  } = usePortalWalletContext()
  const [user, setUser] = useState<UserType | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<String | undefined>("0")
  const router = useRouter()

  useEffect(() => {
    checkUser()
    setBalance('0')
  }, [])

  useEffect(()=>{
    if (!assets) {
      return;
    }
    const mxnBalance = assets?.tokenBalances?.find(token => token.symbol === "MXNB")?.balance;
    setBalance(mxnBalance)
  }, [assets])

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/auth/login")
        return
      }
      setUser(currentUser) 
      if (!portal){
        await initializeWallet()
      }
      // Fetch transactions where current user is either sender or recipient
      await fetchTransactions(currentUser.id)
    } catch (error) {
      console.error("Error:", error)
      router.push("/auth/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async (userId: string) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .or(`sender_id.eq.${userId},recipient_user_id.eq.${userId}`) // Fetch as sender or recipient
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Error fetching transactions:", error)
    } else {
      setTransactions(data || [])
    }
  }

  const handleSignOut = async () => {
    disconnectWallet()
    await signOut()
    setTimeout(() => {
      router.push("/auth/login")
    }, 500);
  }

  const getStatusBadgeProps = (status: TransactionStatus) => {
    const info = getStatusInfo(status)
    return {
      className: `${info.bgColor} ${info.color}`,
      children: info.label,
    }
  }

  const totalSent = transactions
    .filter((t) => t.status === "completed" || t.status === "claiming") // Only count completed/claiming for total sent
    .reduce((sum, t) => sum + Number(t.amount), 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">RemitEase</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user?.full_name || user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MXNB Wallet balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${balance ?  balance : 0}</div>
              <p className="text-xs text-muted-foreground">
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSent.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Across {transactions.filter((t) => t.status === "completed" || t.status === "claiming").length}{" "}
                completed transfers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transactions.length}</div>
              <p className="text-xs text-muted-foreground">
                {transactions.filter((t) => t.status !== "completed").length} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Status</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground">Verified account</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex justify-between">
          <Link href="/send">
            <Button size="lg" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Send Money
            </Button>
          </Link>

          <Link href="/deposit">
            <Button size="lg" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Deposit!
            </Button>
          </Link>
        </div>
        

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest money transfers</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <Send className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                <p className="text-gray-500 mb-4">Start by sending your first money transfer</p>
                <Link href="/send">
                  <Button>Send Money</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => {
                  const statusInfo = getStatusInfo(transaction.status)
                  const isSender = user!.id === transaction.sender_id
                  const isRecipient = user!.id === transaction.recipient_user_id
                  const userRole = isSender ? "sender" : "recipient"
                  const canTakeActionForThisUser = canUserTakeAction(transaction.status, userRole)

                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <ArrowUpRight className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{transaction.recipient_name}</p>
                          <p className="text-sm text-gray-500">{transaction.recipient_email}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                          {statusInfo.userAction && canTakeActionForThisUser && (
                            <p className="text-xs text-blue-600 mt-1">{statusInfo.userAction}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ${Number(transaction.amount).toFixed(2)} {transaction.currency}
                        </p>
                        <Badge {...getStatusBadgeProps(transaction.status)} />
                        <p className="text-xs text-gray-400 mt-1">{transaction.reference_number}</p>
                        {canTakeActionForThisUser && (
                          <Link href={`/transaction/${transaction.id}`}>
                            <Button size="sm" variant="outline" className="mt-2 bg-transparent">
                              Take Action
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
