import { createPresignedUrlResponse } from './presigned-urls';

// 10MB threshold for large files
export const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;

export type DownloadMethod = 'direct' | 'tunnel';

interface FileRoutingDecision {
  method: DownloadMethod;
  reason: string;
}

interface DirectDownloadResponse {
  method: 'direct';
  downloadUrl: string;
  expires: number;
  size: number;
  filename: string;
}

interface TunnelDownloadResponse {
  method: 'tunnel';
  stream?: ReadableStream<Uint8Array>;
  data?: Uint8Array;
}

export type DownloadResponse = DirectDownloadResponse | TunnelDownloadResponse;

/**
 * Determines the download method based on file size and other factors
 */
export function determineDownloadMethod(
  fileSize: number,
  fileType?: string,
  isHLS?: boolean
): FileRoutingDecision {
  // Always use direct method for large files
  if (fileSize > LARGE_FILE_THRESHOLD) {
    return {
      method: 'direct',
      reason: `File size (${formatBytes(fileSize)}) exceeds threshold (${formatBytes(LARGE_FILE_THRESHOLD)})`
    };
  }
  
  // HLS segments should use direct method for better performance
  if (isHLS || fileType?.includes('mpegts') || fileType?.includes('x-mpegURL')) {
    return {
      method: 'direct',
      reason: 'HLS content benefits from direct download'
    };
  }
  
  // Video files above 5MB should use direct method
  const videoThreshold = 5 * 1024 * 1024;
  if (fileType?.startsWith('video/') && fileSize > videoThreshold) {
    return {
      method: 'direct',
      reason: `Video file (${formatBytes(fileSize)}) exceeds video threshold (${formatBytes(videoThreshold)})`
    };
  }
  
  // Small files and metadata can go through tunnel
  return {
    method: 'tunnel',
    reason: `File size (${formatBytes(fileSize)}) is below threshold`
  };
}

/**
 * Creates appropriate download response based on routing decision
 */
export function createDownloadResponse(
  fileSize: number,
  filePath: string,
  originalUrl?: string,
  suggestedFilename?: string,
  fileType?: string,
  isHLS?: boolean,
  stream?: ReadableStream<Uint8Array>,
  data?: Uint8Array
): DownloadResponse {
  const decision = determineDownloadMethod(fileSize, fileType, isHLS);
  
  if (decision.method === 'direct') {
    return createPresignedUrlResponse(
      filePath,
      fileSize,
      originalUrl,
      suggestedFilename
    );
  }
  
  // Return tunnel response with stream or data
  return {
    method: 'tunnel',
    stream,
    data
  };
}

/**
 * Formats bytes into human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Checks if a file should be routed directly based on extension
 */
export function shouldRouteDirectByExtension(filename: string): boolean {
  const directExtensions = [
    '.mp4', '.webm', '.avi', '.mov', '.mkv', '.flv',
    '.m3u8', '.mpd', '.ts', '.m4s',
    '.zip', '.rar', '.7z',
    '.iso', '.dmg', '.exe', '.msi'
  ];
  
  const lowerFilename = filename.toLowerCase();
  return directExtensions.some(ext => lowerFilename.endsWith(ext));
}

/**
 * Estimates file size from content headers
 */
export function estimateFileSize(headers: Headers): number {
  const contentLength = headers.get('content-length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }
  
  // For chunked transfer encoding, we can't know the size upfront
  const transferEncoding = headers.get('transfer-encoding');
  if (transferEncoding?.includes('chunked')) {
    // Assume it's large enough for direct routing
    return LARGE_FILE_THRESHOLD + 1;
  }
  
  return 0;
}

/**
 * Creates a file routing decision for API responses
 */
export function createFileRoutingDecision(
  fileSize: number,
  filePath: string,
  headers?: Headers
): { 
  shouldUseDirect: boolean; 
  decision: FileRoutingDecision;
  estimatedSize: number;
} {
  // If we don't have file size, try to estimate from headers
  let estimatedSize = fileSize;
  if (fileSize === 0 && headers) {
    estimatedSize = estimateFileSize(headers);
  }
  
  // Check file extension for direct routing
  if (shouldRouteDirectByExtension(filePath)) {
    return {
      shouldUseDirect: true,
      decision: {
        method: 'direct',
        reason: 'File type requires direct download'
      },
      estimatedSize
    };
  }
  
  // Use standard routing logic
  const decision = determineDownloadMethod(estimatedSize);
  return {
    shouldUseDirect: decision.method === 'direct',
    decision,
    estimatedSize
  };
}