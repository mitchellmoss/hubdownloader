#!/usr/bin/env python3
import json
import sys
import yt_dlp
from urllib.parse import urlparse

class VideoExtractor:
    def __init__(self):
        self.ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'force_generic_extractor': False,
            'skip_download': True,
            'format': 'best',
            'nocheckcertificate': True,
            'ignoreerrors': True,
        }
    
    def extract_info(self, url):
        """Extract video information from URL"""
        try:
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if not info:
                    return {'error': 'No video information found'}
                
                # Extract video URLs
                videos = []
                
                # Check for direct URL
                if info.get('url'):
                    videos.append({
                        'url': info['url'],
                        'format': info.get('ext', 'unknown'),
                        'quality': info.get('format_note', 'unknown'),
                        'type': 'direct',
                        'title': info.get('title', 'Untitled')
                    })
                
                # Check for format list
                if info.get('formats'):
                    for fmt in info['formats']:
                        if fmt.get('url'):
                            quality = fmt.get('format_note') or fmt.get('height', '')
                            if isinstance(quality, int):
                                quality = f"{quality}p"
                            
                            videos.append({
                                'url': fmt['url'],
                                'format': fmt.get('ext', 'unknown'),
                                'quality': str(quality),
                                'type': 'format',
                                'filesize': fmt.get('filesize', None),
                                'title': info.get('title', 'Untitled')
                            })
                
                # Remove duplicates
                seen = set()
                unique_videos = []
                for video in videos:
                    url_key = video['url']
                    if url_key not in seen:
                        seen.add(url_key)
                        unique_videos.append(video)
                
                return {
                    'success': True,
                    'videos': unique_videos,
                    'title': info.get('title', 'Untitled'),
                    'duration': info.get('duration', None),
                    'thumbnail': info.get('thumbnail', None)
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'videos': []
            }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No URL provided'}))
        sys.exit(1)
    
    url = sys.argv[1]
    extractor = VideoExtractor()
    result = extractor.extract_info(url)
    
    print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()