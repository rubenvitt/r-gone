import { NextResponse } from 'next/server'
import { authService } from '@/services/auth-service'

export async function GET() {
  try {
    const rateLimitInfo = await authService.getRateLimitInfo('default')

    return NextResponse.json({
      success: true,
      rateLimit: rateLimitInfo
    })
  } catch (error) {
    console.error('Rate limit check error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check rate limit' },
      { status: 500 }
    )
  }
}