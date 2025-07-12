// Shared types for the deposit endpoint
export interface DepositRequest {
    currency: "ARS"
    amount?: number // Optional, for reference only
  }
  
  export interface ArgentinianBankData {
    bank_name: string
    bank_code: string
    account_holder: string
    cvu: string
    alias: string
    account_type: "CVU"
    currency: "ARS"
    instructions: string[]
    important_notes: string[]
    processing_time: string
    minimum_amount: number
    maximum_amount: number
  }
  
  export interface DepositResponse {
    success: boolean
    payload: {
      deposit_method: "bank_transfer"
      currency: "ARS"
      bank_data: ArgentinianBankData
      reference_amount?: number
      expires_at: string
      created_at: string
    }
  }
  