import { NextRequest, NextResponse } from 'next/server';
import {makeMockRequest} from '@/lib/bitso/bitso'

export async function POST(req: NextRequest) {
  const body = await req.json();
    const mockData =  {
      "amount": "101",
      "receiver_clabe": body.sender_clabe,
      "receiver_name": "Anchor test",
      "sender_clabe": body.sender_clabe,
      "sender_name": body.sender_email,
      "skip_validation": true
    }
      const response = await makeMockRequest("spei/test/deposits", {
        method: "POST",
        body: mockData,
      })
      console.log(response)
  return NextResponse.json(response, { status: 200 });
}
