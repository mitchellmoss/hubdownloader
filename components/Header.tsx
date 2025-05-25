import Link from 'next/link'
import { Download } from 'lucide-react'

export default function Header() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <Download className="w-6 h-6 text-blue-600" />
            <span>HubDownloader</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link href="/examples" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              Examples
            </Link>
            <Link href="/how-to" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              How To
            </Link>
            <Link href="/hls-guide" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              HLS Guide
            </Link>
            <Link href="/faq" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              FAQ
            </Link>
            <Link href="/about" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              About
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}