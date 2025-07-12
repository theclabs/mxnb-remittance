// Shared types for the CLABE endpoint
export type CreateClabeRequest = {}

export interface JunoClabeResponse {
  success: boolean
  payload: {
    clabe: string
    type: "AUTO_PAYMENT"
  }
}

export interface ClabeResponse {
  success: boolean
  payload: {
    clabe: string
    type: "AUTO_PAYMENT"
    created_at: string
    status: "ENABLED" | "DISABLED"
    description?: string
  }
}

export interface JunoClabeDetailsResponse {
  success: boolean
  payload: {
    clabe: string
    type: "AUTO_PAYMENT"
    status: "ENABLED" | "DISABLED"
    deposit_minimum_amount: number | null
    deposit_maximum_amounts: {
      operation: number | null
      daily: number | null
      weekly: number | null
      monthly: number | null
    }
    created_at: string
    updated_at: string | null
  }
}

export interface ClabeDetailsResponse {
  success: boolean
  payload: {
    clabe: string
    type: "AUTO_PAYMENT"
    status: "ENABLED" | "DISABLED"
    deposit_minimum_amount: number | null
    deposit_maximum_amounts: {
      operation: number | null
      daily: number | null
      weekly: number | null
      monthly: number | null
    }
    created_at: string
    updated_at: string | null
  }
}
