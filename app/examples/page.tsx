import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Example Sites - Lyricless',
  description: 'Example websites that work well with Lyricless video extraction',
}

export default function ExamplesPage() {
  const examples = [
    {
      category: "Direct Video Files",
      sites: [
        "Pages with direct .mp4 or .webm links",
        "Archive.org video pages",
        "University lecture pages",
        "Open source video hosting"
      ]
    },
    {
      category: "HTML5 Video Players",
      sites: [
        "News websites with video content",
        "Educational platforms (without DRM)",
        "Blog posts with embedded videos",
        "Documentation sites with video tutorials"
      ]
    },
    {
      category: "Adult Sites (18+)",
      sites: [
        "PornHub video pages",
        "Basic adult video sites",
        "Sites without heavy DRM",
        "Direct video hosting"
      ]
    },
    {
      category: "Won't Work",
      sites: [
        "YouTube (protected)",
        "Netflix (DRM protected)",
        "Vimeo (varies by privacy settings)",
        "Most major streaming platforms"
      ]
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Example Sites</h1>
      
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-2">Important Note</h2>
        <p className="text-gray-700 dark:text-gray-300">
          Lyricless works best with sites that use standard HTML5 video players or direct video file links.
          It cannot bypass DRM protection or terms of service restrictions.
        </p>
      </div>

      <div className="space-y-8">
        {examples.map((example, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">{example.category}</h2>
            <ul className="space-y-2">
              {example.sites.map((site, siteIndex) => (
                <li key={siteIndex} className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  <span className="text-gray-600 dark:text-gray-400">{site}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="text-xl font-semibold mb-3">Test URL</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Try this test URL with a public domain video:
        </p>
        <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded text-sm">
          https://archive.org/details/BigBuckBunny_124
        </code>
      </div>
    </div>
  )
}