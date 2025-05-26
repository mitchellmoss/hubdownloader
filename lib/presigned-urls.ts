import crypto from 'crypto';

interface PresignedUrlParams {
  filePath: string;
  fileSize: number;
  originalDomain?: string;
  expiryHours?: number;
}

interface PresignedUrlData {
  filePath: string;
  fileSize: number;
  originalDomain: string;
  expires: number;
  signature?: string;
}

const PRESIGNED_URL_SECRET = process.env.PRESIGNED_URL_SECRET || 'default-secret-change-in-production';
const DIRECT_DOWNLOAD_DOMAIN = process.env.DIRECT_DOWNLOAD_DOMAIN || 'dl.lyricless.com';

/**
 * Generates a presigned URL with HMAC signature for secure file downloads
 */
export function generatePresignedUrl({
  filePath,
  fileSize,
  originalDomain = '',
  expiryHours = 1
}: PresignedUrlParams): string {
  const expires = Date.now() + (expiryHours * 60 * 60 * 1000);
  
  const data: PresignedUrlData = {
    filePath,
    fileSize,
    originalDomain,
    expires
  };
  
  // Create signature from all data fields
  const dataString = `${filePath}:${fileSize}:${originalDomain}:${expires}`;
  const signature = crypto
    .createHmac('sha256', PRESIGNED_URL_SECRET)
    .update(dataString)
    .digest('hex');
  
  // Create URL with query parameters
  const params = new URLSearchParams({
    path: filePath,
    size: fileSize.toString(),
    domain: originalDomain,
    expires: expires.toString(),
    signature
  });
  
  // Use HTTPS protocol
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://${DIRECT_DOWNLOAD_DOMAIN}/api/download/presigned?${params.toString()}`;
}

/**
 * Validates a presigned URL by checking signature and expiry
 */
export function validatePresignedUrl(url: string): {
  valid: boolean;
  data?: PresignedUrlData;
  error?: string;
} {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    // Extract parameters
    const filePath = params.get('path');
    const fileSize = params.get('size');
    const originalDomain = params.get('domain') || '';
    const expires = params.get('expires');
    const signature = params.get('signature');
    
    // Validate required parameters
    if (!filePath || !fileSize || !expires || !signature) {
      return {
        valid: false,
        error: 'Missing required parameters'
      };
    }
    
    const expiresNum = parseInt(expires, 10);
    const fileSizeNum = parseInt(fileSize, 10);
    
    // Check if URL has expired
    if (Date.now() > expiresNum) {
      return {
        valid: false,
        error: 'URL has expired'
      };
    }
    
    // Verify signature
    const dataString = `${filePath}:${fileSizeNum}:${originalDomain}:${expiresNum}`;
    const expectedSignature = crypto
      .createHmac('sha256', PRESIGNED_URL_SECRET)
      .update(dataString)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return {
        valid: false,
        error: 'Invalid signature'
      };
    }
    
    return {
      valid: true,
      data: {
        filePath,
        fileSize: fileSizeNum,
        originalDomain,
        expires: expiresNum,
        signature
      }
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid URL format'
    };
  }
}

/**
 * Extracts referer domain from URL for validation
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Creates a presigned URL response object for API responses
 */
export function createPresignedUrlResponse(
  filePath: string,
  fileSize: number,
  originalUrl?: string,
  suggestedFilename?: string
) {
  const originalDomain = originalUrl ? extractDomain(originalUrl) : '';
  const downloadUrl = generatePresignedUrl({
    filePath,
    fileSize,
    originalDomain
  });
  
  return {
    downloadUrl,
    expires: Date.now() + (60 * 60 * 1000), // 1 hour
    size: fileSize,
    filename: suggestedFilename || filePath.split('/').pop() || 'download',
    method: 'direct' as const
  };
}