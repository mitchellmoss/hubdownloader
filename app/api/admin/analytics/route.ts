import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAdminAuth } from '@/lib/admin-auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  // Check admin authentication
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  try {
    // Get date range from query params (default: last 30 days)
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch various analytics
    const [
      totalExtractions,
      recentExtractions,
      extractionsByDay,
      extractionsByDomain,
      extractionsByFormat,
      rateLimitStats,
      failedExtractions
    ] = await Promise.all([
      // Total extractions
      prisma.extraction.count(),

      // Recent extractions
      prisma.extraction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          sourceUrl: true,
          format: true,
          videoCount: true,
          success: true,
          error: true,
          createdAt: true,
          userIp: true
        }
      }),

      // Extractions by day
      prisma.$queryRaw`
        SELECT 
          DATE(createdAt) as date,
          COUNT(*) as count,
          COUNT(CASE WHEN success = 1 THEN 1 END) as successful,
          COUNT(CASE WHEN success = 0 THEN 1 END) as failed
        FROM Extraction
        WHERE createdAt >= ${startDate}
        GROUP BY DATE(createdAt)
        ORDER BY date DESC
      `,

      // Top domains
      prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN sourceUrl LIKE '%youtube.com%' THEN 'youtube.com'
            WHEN sourceUrl LIKE '%pornhub.com%' THEN 'pornhub.com'
            WHEN sourceUrl LIKE '%xvideos.com%' THEN 'xvideos.com'
            WHEN sourceUrl LIKE '%xhamster.com%' THEN 'xhamster.com'
            ELSE 'other'
          END as domain,
          COUNT(*) as count,
          COUNT(CASE WHEN success = 1 THEN 1 END) as successful
        FROM Extraction
        WHERE createdAt >= ${startDate}
        GROUP BY domain
        ORDER BY count DESC
        LIMIT 10
      `,

      // Format distribution
      prisma.$queryRaw`
        SELECT 
          format,
          COUNT(*) as count
        FROM Extraction
        WHERE createdAt >= ${startDate} AND format IS NOT NULL
        GROUP BY format
        ORDER BY count DESC
      `,

      // Current rate limit stats
      prisma.rateLimit.findMany({
        where: {
          expiresAt: { gt: new Date() }
        },
        orderBy: { count: 'desc' },
        take: 20
      }),

      // Failed extractions
      prisma.extraction.count({
        where: {
          success: false,
          createdAt: { gte: startDate }
        }
      })
    ]);

    // Calculate summary stats
    const totalCount = (totalExtractions as number) || 0;
    const successCount = await prisma.extraction.count({ where: { success: true } });
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

    // Get unique IPs count
    const uniqueIps = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT userIp) as count
      FROM Extraction
      WHERE createdAt >= ${startDate}
    ` as any[];

    // Convert BigInt values to numbers in raw query results
    const convertBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return Number(obj);
      if (Array.isArray(obj)) return obj.map(convertBigInt);
      if (typeof obj === 'object') {
        const converted: any = {};
        for (const key in obj) {
          converted[key] = convertBigInt(obj[key]);
        }
        return converted;
      }
      return obj;
    };

    return NextResponse.json({
      summary: {
        totalExtractions,
        successRate: successRate.toFixed(2),
        failedExtractions,
        uniqueUsers: convertBigInt(uniqueIps[0])?.count || 0,
        dateRange: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
          days
        }
      },
      recentExtractions,
      extractionsByDay: convertBigInt(extractionsByDay),
      extractionsByDomain: convertBigInt(extractionsByDomain),
      extractionsByFormat: convertBigInt(extractionsByFormat),
      rateLimitStats: {
        activeRateLimits: rateLimitStats.length,
        details: rateLimitStats
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}