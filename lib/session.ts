import { NextResponse } from 'next/server'

export type SessionRole = 'Investigator' | 'Supervisor' | 'Auditor'
export type RequestSession = { userId: string; role: SessionRole }

const validRoles: SessionRole[] = ['Investigator', 'Supervisor', 'Auditor']

export function getRequestSession(request: Request): RequestSession {
  const headerRole = request.headers.get('x-evidencegraph-role')
  const cookieRole = request.headers.get('cookie')?.match(/(?:^|;\s*)evidencegraph_role=([^;]+)/)?.[1]
  const role = [headerRole, cookieRole].find((value): value is SessionRole => validRoles.includes(value as SessionRole)) || 'Investigator'
  return { userId: request.headers.get('x-evidencegraph-user') || 'demo-investigator', role }
}

export function denyAuditorMutation(request: Request) {
  if (getRequestSession(request).role !== 'Auditor') return null
  return NextResponse.json({ error: 'Auditor sessions are read-only' }, { status: 403 })
}

export function sessionCookie(role: SessionRole, userId = 'demo-investigator') {
  return `evidencegraph_role=${role}; evidencegraph_user=${userId}; Path=/; SameSite=Lax`
}
