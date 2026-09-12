import { NextResponse } from 'next/server'
import { sessionCookie, type SessionRole } from '@/lib/session'

const roles = new Set<SessionRole>(['Investigator', 'Supervisor', 'Auditor'])

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { role?: SessionRole; userId?: string } | null
  if (!body?.role || !roles.has(body.role)) return NextResponse.json({ error: 'A valid role is required' }, { status: 400 })
  const response = NextResponse.json({ userId: body.userId || 'demo-investigator', role: body.role })
  response.headers.set('Set-Cookie', sessionCookie(body.role, body.userId))
  return response
}
