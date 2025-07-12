// Shared types for the withdrawal endpoint
export interface WithdrawalRequest {
    currency: "ars"
    amount: string // Bitso expects string
    asset: "ars"
    method: "bind"
    network: "coelsa"
    protocol: "cvu"
    recipient_name: string
    cvu: string
    max_fee?: string
    origin_id: string // Required for idempotency
    description?: string
    contact_id?: number // For existing accounts
  }
  
  export interface BitsoWithdrawalResponse {
    success: boolean
    payload: {
      wid: string
      status: "pending" | "processing" | "complete" | "failed"
      created_at: string
      currency: "ars"
      method: "bind"
      method_name: string
      amount: string
      asset: "ars"
      network: "coelsa"
      protocol: "cvu"
      integration: "bind"
      details: {
        origin_id: string
        cvu: string
        description: string
      }
      legal_operation_entity?: {
        name: string
        country_code_iso_2: string
        image_id: string
      }
    }
  }
  
  export interface WithdrawalMethodsResponse {
    success: boolean
    payload: Array<{
      integration: string
      method: string
      method_description: string
      name: string
      network: string
      network_description: string
      network_name: string
      optional_fields: string[]
      protocol: string
      required_fields: string[]
    }>
  }
  
  export interface WithdrawalResponse {
    success: boolean
    payload: {
      withdrawal_id: string
      currency: "ARS"
      amount: number
      net_amount: number
      fee: number
      status: "pending" | "processing" | "completed" | "failed"
      bank_account: {
        account_holder_name: string
        masked_account: string
        account_type: string
      }
      estimated_completion: string
      created_at: string
      notes?: string
    }
  }
  
  export interface BankAccount {
    id: string
    account_holder_name: string
    account_holder_document: string
    bank_code: string
    bank_name: string
    cvu?: string
    cbu?: string
    alias?: string
    account_type: "savings" | "checking" | "cvu"
    is_verified: boolean
    created_at: string
  }
  
  export interface WithdrawalLimits {
    currency: "ARS"
    minimum_amount: number
    maximum_amount: number
    daily_limit: number
    monthly_limit: number
    fee_percentage: number
    fixed_fee: number
    processing_time: string
  }
  