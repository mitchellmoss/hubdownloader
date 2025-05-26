import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { headers } from 'next/headers';

const prisma = new PrismaClient();

// Admin PIN from environment variable
const ADMIN_PIN = process.env.ADMIN_PIN || '';

// Rate limiting configuration for admin routes
const ADMIN_RATE_LIMIT = {
  maxAttempts: 3, // Only 3 attempts
  windowMs: 15 * 60 * 1000, // 15 minute window
  blockDurationMs: 60 * 60 * 1000, // 1 hour block after exceeding
};

// Generate a secure session token
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Hash the PIN for comparison (constant time)
export function hashPin(pin: string): string {
  return crypto
    .createHash('sha256')
    .update(pin + (process.env.ADMIN_SALT || 'default-salt'))
    .digest('hex');
}

// Constant-time string comparison to prevent timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Check if IP is blocked
export async function isIpBlocked(ip: string): Promise<boolean> {
  const blockKey = `admin_block_${ip}`;
  const blockRecord = await prisma.rateLimit.findUnique({
    where: { key: blockKey }
  });

  if (!blockRecord) return false;

  const blockExpiry = blockRecord.expiresAt.getTime();
  if (Date.now() < blockExpiry) {
    return true;
  }

  // Clean up expired block
  await prisma.rateLimit.delete({
    where: { key: blockKey }
  });

  return false;
}

// Track failed attempts
async function trackFailedAttempt(ip: string): Promise<boolean> {
  const attemptKey = `admin_attempts_${ip}`;
  const blockKey = `admin_block_${ip}`;

  // Check if already blocked
  if (await isIpBlocked(ip)) {
    return true;
  }

  // Get or create attempt record
  const attemptRecord = await prisma.rateLimit.findUnique({
    where: { key: attemptKey }
  });

  const now = Date.now();
  let attempts = 1;

  if (attemptRecord) {
    // Check if window has expired
    if (now < attemptRecord.expiresAt.getTime()) {
      attempts = attemptRecord.count + 1;
    }
  }

  // Update attempt count
  await prisma.rateLimit.upsert({
    where: { key: attemptKey },
    update: {
      count: attempts,
      expiresAt: new Date(now + ADMIN_RATE_LIMIT.windowMs)
    },
    create: {
      key: attemptKey,
      count: attempts,
      expiresAt: new Date(now + ADMIN_RATE_LIMIT.windowMs)
    }
  });

  // Block if exceeded attempts
  if (attempts >= ADMIN_RATE_LIMIT.maxAttempts) {
    await prisma.rateLimit.create({
      data: {
        key: blockKey,
        count: 1,
        expiresAt: new Date(now + ADMIN_RATE_LIMIT.blockDurationMs)
      }
    });
    return true;
  }

  return false;
}

// Clear attempts on successful auth
async function clearAttempts(ip: string): Promise<void> {
  const attemptKey = `admin_attempts_${ip}`;
  await prisma.rateLimit.deleteMany({
    where: { key: attemptKey }
  });
}

// Validate admin PIN
export async function validateAdminPin(pin: string, ip: string): Promise<boolean> {
  // Check if PIN is configured
  if (!ADMIN_PIN || ADMIN_PIN.length !== 16) {
    console.error('Admin PIN not properly configured');
    return false;
  }

  // Check if IP is blocked
  if (await isIpBlocked(ip)) {
    return false;
  }

  // Validate PIN format (16 digits)
  if (!/^\d{16}$/.test(pin)) {
    await trackFailedAttempt(ip);
    return false;
  }

  // Constant-time comparison
  const isValid = constantTimeCompare(pin, ADMIN_PIN);

  if (isValid) {
    await clearAttempts(ip);
    return true;
  } else {
    await trackFailedAttempt(ip);
    return false;
  }
}

// Middleware to check admin authentication
export async function requireAdminAuth(req: NextRequest): Promise<NextResponse | null> {
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim() || 
             headersList.get('x-real-ip') || 
             'unknown';

  // Check if IP is blocked
  if (await isIpBlocked(ip)) {
    return NextResponse.json(
      { error: 'Too many failed attempts. Try again later.' },
      { status: 429 }
    );
  }

  // Check session token
  const sessionToken = req.cookies.get('admin_session')?.value;
  if (!sessionToken) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Validate session (you could store these in DB for better security)
  const validToken = process.env.ADMIN_SESSION_TOKEN;
  if (!validToken || !constantTimeCompare(sessionToken, validToken)) {
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
  }

  // Valid session
  return null;
}

// Create admin session
export function createAdminSession(): NextResponse {
  const token = generateSessionToken();
  
  // In production, store this in database
  // For now, we'll use environment variable (restart will invalidate sessions)
  process.env.ADMIN_SESSION_TOKEN = token;

  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/'
  });

  return response;
}

// Destroy admin session
export function destroyAdminSession(): NextResponse {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_session');
  delete process.env.ADMIN_SESSION_TOKEN;
  return response;
}