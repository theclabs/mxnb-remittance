"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser } from "@/lib/auth"
import { ArrowLeft, Copy, ExternalLink, Wallet, QrCode } from "lucide-react"
import QRCode from "react-qr-code";
import Link from "next/link"
import type { User } from "@/lib/auth"
import { usePortalWalletContext } from "@/app/context/PortalWalletContext"


export default function DepositPage() {
  const {
    clientApiKey,
    setClientApiKey,
    initializeWallet,
    eip155Address,
  } = usePortalWalletContext()
  const [user, setUser] = useState<User | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  // useEffect(()=>{
  //   initializeWallet()
  // },[clientApiKey])

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/auth/login")
        return
      }
      // if (currentUser?.cli_id){
      //   setClientApiKey(currentUser?.cli_id)
      // }
      setUser(currentUser)
    } catch (error) {
      router.push("/auth/login")
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  if (!user) {
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
          <div className="flex items-center h-16">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 ml-4">Deposit MXNB / MXN</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Deposit Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Deposit MXNB to Your Wallet
              </CardTitle>
              <CardDescription>Get discound this week starting from 10MXNB!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertDescription>
                  <strong>Important:</strong> Only send MXNB on the Arbitrum Sepolia network to this address. Sending from
                  other networks may result in loss of funds.
                </AlertDescription>
              </Alert>

              {/* Network Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  Network Information
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Arbitrum Sepolia
                  </Badge>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Block Explorer:</span>
                    <a
                      href="https://sepolia.arbiscan.io/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Arbiscan.io
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Wallet Address */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Your Wallet Address</Label>
                <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                  <code className="flex-1 text-sm font-mono break-all">{eip155Address}</code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard("user.wallet_address")}>
                    {copied ? (
                      <span className="text-green-600">Copied!</span>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* QR Code Placeholder */}
              <div className="text-center">
                <div className="bg-gray-100 p-8 rounded-lg inline-block">
                  {eip155Address ? (
                    <QRCode value={eip155Address} size={96} className="mx-auto mb-2" />
                  ) : (
                    <QrCode className="h-24 w-24 text-gray-400 mx-auto mb-2" />
                  )}

                  <p className="text-sm text-gray-500">QR Code</p>
                  <p className="text-xs text-gray-400">
                    {eip155Address ? "Scan to get verdadero address" : "Scan to get wallet address"}
                  </p>
                </div>
              </div>

              {/* Deposit Methods */}
              <div className="space-y-4">
                <h4 className="font-medium">How to Deposit MXNB</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="bg-blue-100 p-1 rounded-full">
                      <span className="text-blue-600 text-sm font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-medium">From Another Wallet</p>
                      <p className="text-sm text-gray-600">
                        Send MXNB from MetaMask, Trust Wallet, or any other wallet that supports Arbitrum
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="bg-blue-100 p-1 rounded-full">
                      <span className="text-blue-600 text-sm font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-medium">From an Exchange</p>
                      <p className="text-sm text-gray-600">
                        Withdraw MXNB from Bitso, or other exchanges directly to Arbitrum
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="bg-blue-100 p-1 rounded-full">
                      <span className="text-blue-600 text-sm font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-medium">From bank transfers</p>
                      <p className="text-sm text-gray-600">
                        Use CLABE to transfer MXN to your wallet to instan mint MXNB.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="flex gap-2">
                <a
                  href={`https://sepolia.arbiscan.io/address/${eip155Address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Arbiscan
                  </Button>
                </a>
                <a href="https://bridge.arbitrum.io" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Arbitrum Bridge
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Safety Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Safety Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  Always double-check the wallet address before sending
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  Only send MXNB on the Arbitrum Sepolia
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  Start with a small test transaction if you're unsure
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600">✗</span>
                  Never share your private keys or seed phrase
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>
}
