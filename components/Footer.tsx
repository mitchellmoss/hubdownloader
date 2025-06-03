import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-3">About Lyricless</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              The most private video downloader. All processing happens in your browser using WebAssembly technology.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">Quick Links</h3>
            <nav className="space-y-2 text-sm">
              <div><Link href="/how-to" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">How to Download Videos</Link></div>
              <div><Link href="/faq" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">FAQ</Link></div>
              <div><Link href="/examples" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">Examples</Link></div>
              <div><Link href="/hls-guide" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">HLS Guide</Link></div>
            </nav>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">Legal</h3>
            <nav className="space-y-2 text-sm">
              <div><Link href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">Terms of Service</Link></div>
              <div><Link href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">Privacy Policy</Link></div>
              <div><Link href="/dmca" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">DMCA Policy</Link></div>
              <div><Link href="/about" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">About Us</Link></div>
            </nav>
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-600 dark:text-gray-400 text-sm">
              © {currentYear} Lyricless. For educational purposes only.
            </div>
            
            <div className="text-gray-600 dark:text-gray-400 text-sm">
              Made with ❤️ using Next.js and WebAssembly
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}