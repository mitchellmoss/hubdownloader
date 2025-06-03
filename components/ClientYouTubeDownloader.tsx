'use client';

import { useState, useCallback } from 'react';
import { Search, Download, AlertCircle, Loader2, Film, Music, Layers } from 'lucide-react';
import { UnifiedExtractor, ExtractedVideo } from '@/lib/client/unified-extractor';

export default function ClientYouTubeDownloader() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videos, setVideos] = useState<ExtractedVideo[]>([]);
  const [extractionTitle, setExtractionTitle] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  const [extractor, setExtractor] = useState<UnifiedExtractor | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError('');
    setVideos([]);
    setExtractionTitle('');
    setDownloadProgress({});

    try {
      // Initialize extractor if needed
      let ext = extractor;
      if (!ext) {
        ext = new UnifiedExtractor();
        setExtractor(ext);
        
        // Load FFmpeg in background
        ext.ensureFFmpegLoaded().catch(console.error);
      }

      // Extract videos
      console.log('Starting extraction for:', url);
      const result = await ext.extract(url);
      
      if (result.error) {
        setError(result.error);
      } else if (result.videos.length === 0) {
        setError('No videos found on this page');
      } else {
        console.log('Found videos:', result.videos);
        setVideos(result.videos);
        setExtractionTitle(result.title || 'Unknown');
      }
    } catch (err) {
      console.error('Extraction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract videos');
    } finally {
      setLoading(false);
    }
  }, [url, extractor]);

  const handleDownload = useCallback(async (video: ExtractedVideo, index: number) => {
    if (!extractor) return;

    const progressKey = `${index}-${video.url}`;
    setDownloadProgress(prev => ({ ...prev, [progressKey]: 0 }));

    try {
      // Ensure FFmpeg is loaded for conversions
      if (video.needsMerging || video.isHLS) {
        await extractor.ensureFFmpegLoaded();
      }

      // Download video
      const blob = await extractor.downloadVideo(video, (progress) => {
        setDownloadProgress(prev => ({ ...prev, [progressKey]: progress }));
      });

      // Generate filename
      const quality = video.quality || 'unknown';
      const format = video.isHLS ? 'mp4' : video.format;
      const title = extractionTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${title}_${quality}.${format}`;

      // Save file
      extractor.saveBlob(blob, filename);
      
      // Clean up progress
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[progressKey];
          return newProgress;
        });
      }, 2000);
    } catch (err) {
      console.error('Download error:', err);
      setError(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[progressKey];
        return newProgress;
      });
    }
  }, [extractor, extractionTitle]);

  const getIcon = (video: ExtractedVideo) => {
    if (!video.hasVideo && video.hasAudio) return <Music className="w-4 h-4" />;
    if (video.needsMerging) return <Layers className="w-4 h-4" />;
    return <Film className="w-4 h-4" />;
  };

  const getDownloadText = (video: ExtractedVideo, index: number) => {
    const progressKey = `${index}-${video.url}`;
    const progress = downloadProgress[progressKey];
    
    if (progress !== undefined) {
      return `${Math.round(progress * 100)}%`;
    }
    
    if (video.needsMerging) return 'Download & Merge';
    if (video.isHLS) return 'Download & Convert';
    return 'Download';
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Client-Side Video Downloader</h1>
        <p className="text-lg opacity-90">
          Extract and download videos directly in your browser - no server processing needed!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste video URL here (YouTube, etc.)"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Extract
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </form>

      {videos.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              {extractionTitle}
            </h2>
            <p className="text-sm text-gray-600">
              Found {videos.length} video{videos.length > 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-3">
            {videos.map((video, index) => {
              const progressKey = `${index}-${video.url}`;
              const progress = downloadProgress[progressKey];
              const isDownloading = progress !== undefined;

              return (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-md p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getIcon(video)}
                        <span className="font-medium text-gray-900">
                          {video.quality || 'Unknown Quality'}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({video.format.toUpperCase()})
                        </span>
                      </div>
                      
                      {video.needsMerging && (
                        <p className="text-sm text-amber-600">
                          Requires merging audio and video
                        </p>
                      )}
                      
                      {video.isHLS && (
                        <p className="text-sm text-blue-600">
                          HLS stream - will be converted to MP4
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDownload(video, index)}
                      disabled={isDownloading}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {getDownloadText(video, index)}
                    </button>
                  </div>

                  {isDownloading && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Processing happens in your browser!</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>No data is sent to our servers for processing</li>
              <li>Video conversion uses WebAssembly (FFmpeg.wasm)</li>
              <li>Downloads may take longer for large files or conversions</li>
              <li>Some sites may require visiting the page directly</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}