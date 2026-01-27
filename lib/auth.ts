import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const COOKIE_NAME = 'quest_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type UserRole = 'mentee' | 'mentor';

interface SessionData {
  role: UserRole;
  timestamp: number;
}

// Hash a token for comparison (never store raw tokens)
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Create a signed session value
function createSessionValue(role: UserRole): string {
  const secret = process.env.COOKIE_SECRET || 'fallback-secret-change-me';
  const data: SessionData = { role, timestamp: Date.now() };
  const payload = JSON.stringify(data);
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64')}.${signature}`;
}

// Verify and parse a session value
function parseSessionValue(value: string): SessionData | null {
  try {
    const secret = process.env.COOKIE_SECRET || 'fallback-secret-change-me';
    const [payloadB64, signature] = value.split('.');
    if (!payloadB64 || !signature) return null;
    
    const payload = Buffer.from(payloadB64, 'base64').toString('utf-8');
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    
    // Timing-safe comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    
    return JSON.parse(payload) as SessionData;
  } catch {
    return null;
  }
}

// Validate an access token and return the role
export function validateToken(token: string): UserRole | null {
  const menteeToken = process.env.MENTEE_TOKEN;
  const mentorToken = process.env.MENTOR_TOKEN;
  
  if (!menteeToken || !mentorToken) {
    console.error('Missing MENTEE_TOKEN or MENTOR_TOKEN environment variables');
    return null;
  }
  
  // Timing-safe comparison
  const tokenBuffer = Buffer.from(token);
  
  try {
    if (tokenBuffer.length === Buffer.from(menteeToken).length &&
        crypto.timingSafeEqual(tokenBuffer, Buffer.from(menteeToken))) {
      return 'mentee';
    }
  } catch {}
  
  try {
    if (tokenBuffer.length === Buffer.from(mentorToken).length &&
        crypto.timingSafeEqual(tokenBuffer, Buffer.from(mentorToken))) {
      return 'mentor';
    }
  } catch {}
  
  return null;
}

// Set the session cookie
export function setSessionCookie(role: UserRole): void {
  const cookieStore = cookies();
  const value = createSessionValue(role);
  
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

// Get the current user role from cookie
export function getCurrentRole(): UserRole | null {
  const cookieStore = cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  
  if (!cookie) return null;
  
  const session = parseSessionValue(cookie.value);
  return session?.role || null;
}

// Clear the session cookie
export function clearSessionCookie(): void {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Middleware helper to require authentication
export function requireRole(allowedRoles: UserRole[]): UserRole | NextResponse {
  const role = getCurrentRole();
  
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  return role;
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}
