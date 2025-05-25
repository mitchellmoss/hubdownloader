import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Lyricless - Extract Video URLs Instantly'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 700 }}>🎬 Lyricless</div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textAlign: 'center',
              maxWidth: 900,
            }}
          >
            Extract Video URLs Instantly
          </div>
          <div
            style={{
              fontSize: 24,
              color: '#94a3b8',
              textAlign: 'center',
              maxWidth: 800,
              lineHeight: 1.4,
            }}
          >
            Paste any webpage URL to extract direct video links. Support for MP4, WebM, HLS, and DASH streams.
          </div>
          <div
            style={{
              display: 'flex',
              gap: 60,
              marginTop: 40,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 36 }}>⬇️</div>
              <div style={{ fontSize: 20, color: '#cbd5e1' }}>Direct Links</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 36 }}>🔗</div>
              <div style={{ fontSize: 20, color: '#cbd5e1' }}>Multiple Formats</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 36 }}>⚡</div>
              <div style={{ fontSize: 20, color: '#cbd5e1' }}>Fast & Free</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}