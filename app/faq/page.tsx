import { Metadata } from 'next'
import AdUnit from '@/components/AdUnit'

export const metadata: Metadata = {
  title: 'FAQ - Video Downloader Questions & Answers',
  description: 'Frequently asked questions about downloading videos online. Learn about supported formats, legal considerations, and troubleshooting video extraction.',
  keywords: ['video downloader faq', 'how to download videos', 'video download questions', 'video extraction help'],
}

export default function FAQPage() {
  const faqs = [
    {
      question: "Is Lyricless free to use?",
      answer: "Yes, Lyricless is completely free to use. We support the service through non-intrusive advertising."
    },
    {
      question: "What websites does Lyricless work with?",
      answer: "Lyricless works with most websites that host video content directly. However, it may not work with sites that use advanced DRM protection or require authentication."
    },
    {
      question: "Why can't I download videos from YouTube or Netflix?",
      answer: "Major streaming platforms like YouTube, Netflix, and similar services use advanced protection methods and terms of service that prohibit downloading. We respect these restrictions."
    },
    {
      question: "Is it legal to download videos?",
      answer: "The legality depends on the content and how you use it. Always respect copyright laws and only download content you have permission to access. Check the website's terms of service before downloading."
    },
    {
      question: "What video formats are supported?",
      answer: "We support MP4, WebM, HLS (.m3u8), and DASH (.mpd) formats. The available formats depend on what the source website provides."
    },
    {
      question: "How do I download HLS or DASH streams?",
      answer: "HLS and DASH are streaming formats. You'll need a specialized downloader like FFmpeg or a browser extension that supports these formats. We provide the direct URLs for you to use with these tools."
    },
    {
      question: "Why does extraction sometimes fail?",
      answer: "Extraction can fail for several reasons: the website might be using protection methods, the video might require login, or there might be geographic restrictions. Try refreshing and extracting again."
    },
    {
      question: "Is my data private?",
      answer: "We only store minimal analytics data for service improvement. We don't store the videos you extract or any personal information beyond basic usage statistics."
    },
    {
      question: "Can I extract multiple videos at once?",
      answer: "Currently, you need to extract one page at a time. However, if a page contains multiple videos, we'll detect and list all of them."
    },
    {
      question: "Do you have an API?",
      answer: "We don't currently offer a public API. This service is intended for personal use through our web interface."
    }
  ]

  const jsonLdFAQ = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFAQ) }}
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Frequently Asked Questions</h1>
      
      <AdUnit slot="6789012345" format="horizontal" className="mb-8" />
      
      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-3">{faq.question}</h2>
            <p className="text-gray-600 dark:text-gray-400">{faq.answer}</p>
          </div>
        ))}
      </div>
      
      <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Still have questions?</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Check out our <a href="/how-to" className="text-blue-600 hover:text-blue-700 underline">How-To Guide</a> for 
          detailed instructions, or <a href="/about" className="text-blue-600 hover:text-blue-700 underline">contact us</a> for 
          further assistance.
        </p>
      </div>
      
      <AdUnit slot="7890123456" format="rectangle" className="mt-8" />
      </div>
    </>
  )
}