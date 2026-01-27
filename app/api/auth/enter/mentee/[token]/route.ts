import { NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import crypto from 'crypto';

const COOKIE_NAME = 'quest_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function createSessionValue(role: string): string {
  const secret = process.env.COOKIE_SECRET || 'fallback-secret-change-me';
  const data = { role, timestamp: Date.now() };
  const payload = JSON.stringify(data);
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64')}.${signature}`;
}

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const role = validateToken(params.token);
  
  if (role === 'mentee') {
    const sessionValue = createSessionValue('mentee');
    const response = NextResponse.redirect(new URL('/app', request.url));
    
    response.cookies.set(COOKIE_NAME, sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    
    return response;
  }
  
  return NextResponse.redirect(new URL('/invalid-link', request.url));
}