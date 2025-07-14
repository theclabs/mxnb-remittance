// Webhook payload types for Juno events
export interface JunoWebhookPayload {
    fid: string
    status: "pending" | "complete" | "failed" | "processing"
    created_at: string
    currency: string
    method: string
    method_name: string
    amount: string
    asset: string
    network: string
    protocol: string
    integration: string
    details: {
      sender_name?: string
      sender_clabe?: string
      receive_clabe?: string
      sender_bank?: string
      clave?: string
      clave_rastreo?: string
      numeric_reference?: string
      concepto?: string
      cep_link?: string
      sender_rfc_curp?: string
      deposit_type?: string
      // For crypto withdrawals
      transaction_hash?: string
      from_address?: string
      to_address?: string
      confirmations?: number
    }
  }
  
  export interface JunoWebhookRequest {
    event: "funding" | "withdrawal"
    payload: JunoWebhookPayload
    timestamp?: string
    signature?: string
  }
  
  // Database types for Supabase
  export interface UserProfile {
    id: string
    wallet_address?: string
    clabe?: string
    email?: string
    created_at: string
    updated_at: string
  }
  
  export interface Transaction {
    id: string
    user_id: string
    amount: string
    currency: string
    protocol: string
    status: string
    type: "funding" | "withdrawal"
    external_id?: string
    transaction_hash?: string
    from_address?: string
    to_address?: string
    clabe?: string
    metadata?: Record<string, any>
    created_at: string
    updated_at: string
  }

  // Supabase Auth User type
export interface AuthUser {
    id: string
    email?: string
    user_metadata: {
      clabe?: string
      wallet_address?: string
      [key: string]: any
    }
    created_at: string
    updated_at: string
  }
  