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
            "id": "22183e8a-d2ce-41a8-80c0-617263b5efbc",
            "amount": 100,
            "currency": "MXN",
            "transaction_type": "REDEMPTION",
            "method": "BITSO_TRANSFER",
            "summary_status": "IN_PROGRESS",
            "created_at": "2025-07-10T12:04:20.33654403Z",
            "updated_at": "2025-07-10T12:04:25.8267322Z"
        }
    }
    return NextResponse.json(payload, { status: 200 });
  }
