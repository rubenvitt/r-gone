import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { triggerTestingService } from '@/services/trigger-testing-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const scenarioId = searchParams.get('scenarioId')
    const format = searchParams.get('format') as 'json' | 'csv' | null
    
    // Get results
    const results = triggerTestingService.getResults(scenarioId || undefined)
    
    // Export if format specified
    if (format) {
      const exported = triggerTestingService.exportResults(format)
      
      if (format === 'csv') {
        return new Response(exported, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="trigger-test-results-${Date.now()}.csv"`
          }
        })
      }
      
      return new Response(exported, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="trigger-test-results-${Date.now()}.json"`
        }
      })
    }
    
    // Calculate statistics
    const stats = {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      averageDuration: results.length > 0 
        ? Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length)
        : 0,
      recentTests: results.filter(r => 
        r.executedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length
    }
    
    return NextResponse.json({
      success: true,
      results: results.slice(-50), // Last 50 results
      stats
    })
  } catch (error) {
    console.error('Error fetching test results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test results' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const scenarioId = searchParams.get('scenarioId')
    
    // Clear results
    triggerTestingService.clearResults(scenarioId || undefined)
    
    return NextResponse.json({
      success: true,
      message: scenarioId 
        ? `Cleared results for scenario ${scenarioId}`
        : 'Cleared all test results'
    })
  } catch (error) {
    console.error('Error clearing test results:', error)
    return NextResponse.json(
      { error: 'Failed to clear test results' },
      { status: 500 }
    )
  }
}