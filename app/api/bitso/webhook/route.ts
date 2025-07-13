import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(req: NextRequest) {
  const { email, transactionId} = await req.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email inválido o faltante' }, { status: 400 });
  }

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/signup?transactionId=${transactionId}&email=${email}`,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ error: 'NO AUTORIZO' }, { status: 401 });
}
