/**
 * Dedicated YouTube video proxy endpoint
 * Handles YouTube-specific requirements for video downloads
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url');

    if (!videoUrl || !videoUrl.includes('googlevideo.com')) {
      return NextResponse.json(
        { error: 'Invalid YouTube video URL' },
        { status: 400 }
      );
    }

    console.log('YouTube proxy request for:', videoUrl.substring(0, 100) + '...');

    // YouTube-specific headers
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.youtube.com',
      'Referer': 'https://www.youtube.com/',
      'Sec-Ch-Ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'video',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
    };

    // Handle range requests
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
      console.log('Range request:', rangeHeader);
    }

    // Make the request
    const response = await fetch(videoUrl, { 
      headers,
      // Important: don't follow redirects automatically
      redirect: 'manual'
    });

    console.log('YouTube response:', {
      status: response.status,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      location: response.headers.get('location')
    });

    // Handle redirects
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('location');
      if (location) {
        console.log('Following redirect to:', location.substring(0, 100) + '...');
        // Recursively proxy the redirect
        return GET(new NextRequest(`${request.url.split('?')[0]}?url=${encodeURIComponent(location)}`));
      }
    }

    // Check if we got an error
    if (!response.ok && response.status !== 206) { // 206 is partial content for range requests
      const text = await response.text();
      console.error('YouTube error response:', text.substring(0, 200));
      return NextResponse.json(
        { error: `YouTube returned ${response.status}`, details: text },
        { status: response.status }
      );
    }

    // Get the video data
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const contentLength = response.headers.get('content-length');
    
    // For large files, we should stream the response
    const stream = response.body;
    if (!stream) {
      return NextResponse.json(
        { error: 'No response body' },
        { status: 500 }
      );
    }

    // Prepare response headers
    const responseHeaders: HeadersInit = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    };

    // Forward important headers
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    const contentRange = response.headers.get('content-range');
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    const acceptRanges = response.headers.get('accept-ranges');
    if (acceptRanges) {
      responseHeaders['Accept-Ranges'] = acceptRanges;
    }

    // Return streamed response
    return new NextResponse(stream, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('YouTube proxy error:', error);
    return NextResponse.json(
      { error: 'YouTube proxy error', details: error instanceof Error ? error.message : 'Unknown error' },
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