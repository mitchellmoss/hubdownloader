/**
 * Minimal CORS proxy for client-side video extraction
 * This is the only server-side component needed for the client-side architecture
 */

import { NextRequest, NextResponse } from 'next/server';

// Allowed domains for security
const ALLOWED_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'googlevideo.com',
  'ytimg.com',
  'pornhub.com',
  'phncdn.com',
  'xvideos.com',
  'xhamster.com',
  'yt3.ggpht.com',
  'yt3.googleusercontent.com',
  // Add more as needed
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Validate URL
    const url = new URL(targetUrl);
    const hostname = url.hostname.replace('www.', '');
    
    // Check if domain is allowed
    const isAllowed = ALLOWED_DOMAINS.some(domain => 
      hostname.includes(domain)
    ) || hostname.includes('googlevideo.com'); // Always allow googlevideo.com

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Domain not allowed' },
        { status: 403 }
      );
    }

    // Prepare headers
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };

    // Forward range header if present
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    // Add referer for specific sites
    if (hostname.includes('googlevideo.com')) {
      headers['Referer'] = 'https://www.youtube.com/';
      headers['Origin'] = 'https://www.youtube.com';
    } else if (hostname.includes('pornhub.com') || hostname.includes('phncdn.com')) {
      headers['Referer'] = 'https://www.pornhub.com/';
    } else if (hostname.includes('xvideos.com')) {
      headers['Referer'] = 'https://www.xvideos.com/';
    } else if (hostname.includes('xhamster.com')) {
      headers['Referer'] = 'https://xhamster.com/';
    }

    // Log for debugging
    console.log('CORS Proxy Request:', {
      url: targetUrl,
      hostname,
      headers
    });

    // Fetch the resource
    const response = await fetch(targetUrl, { headers });

    console.log('CORS Proxy Response:', {
      status: response.status,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upstream error:', errorText);
      return NextResponse.json(
        { error: `Upstream error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    // Get content type
    const contentType = response.headers.get('content-type') || 'text/plain';
    
    // Handle different content types
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data);
    } else if (contentType.includes('text/') || contentType.includes('application/x-mpegURL')) {
      const text = await response.text();
      return new NextResponse(text, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    } else {
      // Binary content (video, audio, images)
      const buffer = await response.arrayBuffer();
      
      // Prepare response headers
      const responseHeaders: HeadersInit = {
        'Content-Type': contentType,
        'Content-Length': buffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
        'Cache-Control': 'public, max-age=3600'
      };
      
      // Forward content-range header if present
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        responseHeaders['Content-Range'] = contentRange;
      }
      
      // Forward accept-ranges header
      const acceptRanges = response.headers.get('accept-ranges');
      if (acceptRanges) {
        responseHeaders['Accept-Ranges'] = acceptRanges;
      }
      
      return new NextResponse(buffer, {
        status: response.status,
        headers: responseHeaders
      });
    }
  } catch (error) {
    console.error('CORS proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      'Access-Control-Max-Age': '86400',
    },
  });
}