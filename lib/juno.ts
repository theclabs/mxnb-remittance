import crypto from "crypto"

interface JunoAuthParams {
  method: string
  pathname: string
  search?: string
  payload?: string
}

/**
 * Generates HMAC-based authorization header for Juno API requests
 */
export function generateJunoAuthHeader({ method, pathname, search = "", payload = "" }: JunoAuthParams): string {
  // Get environment variables
  const junoToken = process.env.JUNO_TOKEN
  const junoSecret = process.env.JUNO_SECRET

  if (!junoToken || !junoSecret) {
    throw new Error("JUNO_TOKEN and JUNO_SECRET environment variables are required")
  }

  // Generate nonce (timestamp in milliseconds)
  const nonce = Date.now()

  // Construct request path with query parameters
  const requestPath = pathname + (search || "")

  // Create the data string to sign: nonce + method + requestPath + payload
  const dataToSign = `${nonce}${method.toUpperCase()}${requestPath}${payload}`

  // Generate HMAC-SHA256 signature
  const signature = crypto.createHmac("sha256", junoSecret).update(dataToSign).digest("hex")

  // Construct authorization header: 'Bitso TOKEN:NONCE:SIGNATURE'
  const authHeader = `Bitso ${junoToken}:${nonce}:${signature}`

  return authHeader
}

/**
 * Helper function to generate auth header from a full URL and request details
 */
export function generateJunoAuthFromUrl(url: string, method: string, payload = ""): string {
  const urlObj = new URL(url)

  return generateJunoAuthHeader({
    method,
    pathname: urlObj.pathname,
    search: urlObj.search,
    payload,
  })
}

/**
 * Type-safe wrapper for making authenticated Juno API requests
 */
export async function makeJunoRequest<T = any>(
  url: string,
  options: {
    method: string
    body?: any
    headers?: Record<string, string>
  },
): Promise<T> {
  const { method, body, headers = {} } = options

  // Serialize body if it's an object
  const payload = body ? JSON.stringify(body) : ""

  // Generate auth header
  const authHeader = generateJunoAuthFromUrl(url, method, payload)

  // Make the request
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      ...headers,
    },
    body: payload || undefined,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Juno API error (${response.status}): ${errorText}`)
  }

  return response.json()
}


  /**
   * LOCAL API - Calculate total amount received from an order's trades
   */
export async function getNewUserClabe (): Promise<UserClabeResult> {
    try {
      const response = await fetch('/api/juno/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Error ${response.status}: ${errorBody}`);
      }

      const resp = await response.json();
      
      return { data: resp.payload , error: null }

    } catch (error) {
      console.error('Error fetching quote:', error);
      return { data: null , error }
    }
}