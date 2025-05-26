import { NextRequest } from 'next/server';
import { destroyAdminSession } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  return destroyAdminSession();
}