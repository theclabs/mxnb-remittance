import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(req: NextRequest) {
  const secretHeader = req.headers.get('Authorization'); // o el nombre que quieras
  const expectedSecret = process.env.MY_SECRET_HEADER;

  if (secretHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { type, table, record, schema, old_record} = await req.json();
  if (table != "transactions" || type != "UPDATE" ){
    return NextResponse.json({},{status:201});
  }
  
  var request:TradeRequest = {
    amount : 10,
    from_currency : "ARS",
    to_currency : "MXN",
    type : 'limit',
    limit_price: 1
  }
  return NextResponse.json({ success: true });
}



