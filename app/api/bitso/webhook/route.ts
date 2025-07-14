import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(req: NextRequest) {
  const { payload, event} = await req.json();
  // validar y siempre responder status 204 / 201 y continuar.

  // verificar type y status: 
  // type SPEI / blockchain 

  // SPEI - obtener usuario asociado. -. obtener wallet blockchain, enviar monto fin

  // blockchain -- obtener wallet remitente -. obtener usuario asociado:

  // si tiene una transaccion saliente por el monto indicado, asociar y cambiar stado de tx - . iniciar remesa
  // supabase.admin....

  // si no hay nada a que asociar,  es retiro a cuenta propia -- inciar retiro a su clabe asociada.

  // https://webhook.site/#!/view/eddef20e-2c47-40e7-84d9-07159d92d3e2/

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ error: 'NO AUTORIZO' }, { status: 401 });
}
