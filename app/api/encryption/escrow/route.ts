import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { keyEscrowService } from '@/services/key-escrow-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const requestId = searchParams.get('requestId')
    
    if (requestId) {
      // Get specific request
      const request = keyEscrowService.getRequestStatus(requestId)
      if (!request) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 })
      }
      return NextResponse.json({ request })
    }

    // List all requests
    const requests = keyEscrowService.listRequests({
      requesterId: session.user?.id
    })
    
    return NextResponse.json({ requests })
  } catch (error) {
    console.error('Error fetching escrow requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch escrow requests' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { keyIds, reason, timeDelayHours = 24 } = body

    if (!keyIds || !reason) {
      return NextResponse.json(
        { error: 'Key IDs and reason are required' },
        { status: 400 }
      )
    }

    // Create escrow request
    const escrowRequest = await keyEscrowService.requestKeyRecovery(
      session.user?.id || '',
      session.user?.email || '',
      keyIds,
      reason,
      timeDelayHours
    )
    
    return NextResponse.json({ 
      request: escrowRequest,
      message: 'Escrow request created successfully' 
    })
  } catch (error) {
    console.error('Error creating escrow request:', error)
    return NextResponse.json(
      { error: 'Failed to create escrow request' },
      { status: 500 }
    )
  }
}