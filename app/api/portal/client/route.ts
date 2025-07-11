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
        "id": "cmcz57g020b34afbf1mnjhywi",
        "clientApiKey": "39a45344-47ab-4530-9812-32045661a9f8",
        "clientSessionToken": "c918630b-5643-4e79-bdf9-4aa9af5ef31a",
        "isAccountAbstracted": true
    }
  }
  return NextResponse.json(payload, { status: 200 });
}
