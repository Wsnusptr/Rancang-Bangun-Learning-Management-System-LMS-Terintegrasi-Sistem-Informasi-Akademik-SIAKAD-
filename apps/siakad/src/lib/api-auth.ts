import { NextRequest, NextResponse } from 'next/server'

export function requireSiakadAuth(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  
  if (!apiKey || apiKey !== process.env.SIAKAD_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or missing API Key' },
      { status: 401 }
    )
  }
  
  return null // null means auth passed
}
