import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { validateAdminPin, createAdminSession, isIpBlocked } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim() || 
               headersList.get('x-real-ip') || 
               'unknown';

    // Parse request body
    const body = await req.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json(
        { error: 'PIN required' },
        { status: 400 }
      );
    }

    // Validate PIN and check rate limits
    const isValid = await validateAdminPin(pin, ip);

    if (!isValid) {
      // Check if now blocked
      const blocked = await isIpBlocked(ip);
      return NextResponse.json(
        { 
          error: blocked 
            ? 'Too many failed attempts. Try again in 1 hour.' 
            : 'Invalid PIN' 
        },
        { status: blocked ? 429 : 401 }
      );
    }

    // Create session
    return createAdminSession();

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}