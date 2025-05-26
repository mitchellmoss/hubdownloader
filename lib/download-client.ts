/**
 * Client-side utility to handle downloads with the new presigned URL system
 */

export interface DownloadResponse {
  downloadUrl: string;
  expires: number;
  size: number;
  filename: string;
  method: 'direct' | 'tunnel';
  isHLS?: boolean;
  segments?: number;
  playlistUrl?: string;
}

/**
 * Initiates a download based on the response from the API
 */
export async function initiateDownload(response: DownloadResponse) {
  const { downloadUrl, filename, method, expires } = response;
  
  // Check if URL has expired
  if (Date.now() > expires) {
    throw new Error('Download URL has expired. Please request a new one.');
  }
  
  if (method === 'direct') {
    // For direct downloads, simply open the URL in a new tab or trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // For tunnel downloads, the downloadUrl is already a streaming endpoint
    // Handle it the same way as before
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Handles the new API response format
 */
export async function handleDownloadResponse(apiResponse: Response): Promise<DownloadResponse> {
  if (!apiResponse.ok) {
    const error = await apiResponse.json();
    throw new Error(error.error || 'Download failed');
  }
  
  const contentType = apiResponse.headers.get('content-type');
  
  // Check if response is JSON (new format) or stream (legacy format)
  if (contentType?.includes('application/json')) {
    // New presigned URL format
    return await apiResponse.json() as DownloadResponse;
  } else {
    // Legacy streaming format - convert to new format
    // This maintains backwards compatibility
    const blob = await apiResponse.blob();
    const url = URL.createObjectURL(blob);
    
    return {
      downloadUrl: url,
      expires: Date.now() + 3600000, // 1 hour
      size: blob.size,
      filename: extractFilenameFromHeaders(apiResponse) || 'download',
      method: 'tunnel'
    };
  }
}

/**
 * Extracts filename from Content-Disposition header
 */
function extractFilenameFromHeaders(response: Response): string | null {
  const disposition = response.headers.get('content-disposition');
  if (!disposition) return null;
  
  const filenameMatch = disposition.match(/filename="(.+)"/);
  return filenameMatch ? filenameMatch[1] : null;
}

/**
 * Checks if a download URL is still valid
 */
export function isDownloadUrlValid(response: DownloadResponse): boolean {
  return Date.now() < response.expires;
}

/**
 * Gets remaining time for download URL in human-readable format
 */
export function getDownloadUrlTimeRemaining(response: DownloadResponse): string {
  const remaining = response.expires - Date.now();
  
  if (remaining <= 0) return 'Expired';
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  
  return `${seconds}s`;
}