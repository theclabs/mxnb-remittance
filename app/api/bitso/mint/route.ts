import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET(req: NextRequest) {
  const payload = {
    "success": true,
    "payload": {
      "id": "eb3590e8-668a-4a4c-9751-c3e639fc28df",
      "amount": 112,
      "currency": "mxn",
      "transaction_type": "ISSUANCE",
      "method": "BITSO_TRANSFER",
      "summary_status": "IN_PROGRESS",
      "created_at": null,
      "updated_at": null
    }
  }
  return NextResponse.json(payload, { status: 200 });
}
