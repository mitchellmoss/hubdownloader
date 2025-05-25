import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            © 2024 HubDownloader. For educational purposes only.
          </div>
          
          <div className="flex items-center gap-6 text-sm">
            <Link href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/dmca" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              DMCA
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}