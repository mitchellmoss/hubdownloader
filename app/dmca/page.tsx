import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DMCA Policy - Lyricless',
  description: 'DMCA compliance and copyright information for Lyricless',
}

export default function DMCAPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">DMCA Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <section className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-3 text-yellow-400">Important Notice</h2>
            <p className="text-gray-300">
              Lyricless is a technical service that helps users extract publicly accessible video URLs 
              from web pages. We do not host, store, or distribute any video content. We respect 
              intellectual property rights and comply with the Digital Millennium Copyright Act (DMCA).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. No Content Hosting</h2>
            <p className="text-gray-300 mb-4">
              Lyricless does not host any video content. Our service:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Does not upload, store, or distribute video files</li>
              <li>Only identifies publicly accessible video URLs already present on third-party websites</li>
              <li>Acts as a technical tool similar to a web browser's developer tools</li>
              <li>Does not modify or re-encode video content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. User Responsibility</h2>
            <p className="text-gray-300">
              Users of Lyricless are solely responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300 mt-4">
              <li>Ensuring they have the right to access and download content</li>
              <li>Complying with the terms of service of third-party websites</li>
              <li>Respecting copyright and intellectual property rights</li>
              <li>Using extracted content only for lawful purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. DMCA Compliance</h2>
            <p className="text-gray-300 mb-4">
              While we do not host content, we take copyright concerns seriously. If you believe 
              that your copyrighted work is being infringed through the use of our service, 
              please provide us with the following information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>A physical or electronic signature of the copyright owner or authorized agent</li>
              <li>Identification of the copyrighted work claimed to have been infringed</li>
              <li>Identification of the material that is claimed to be infringing, including the URL</li>
              <li>Your contact information (address, telephone number, and email address)</li>
              <li>A statement that you have a good faith belief that the use is not authorized</li>
              <li>A statement that the information in the notification is accurate, and under penalty 
                  of perjury, that you are authorized to act on behalf of the copyright owner</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Designated DMCA Agent</h2>
            <p className="text-gray-300 mb-4">
              DMCA notices should be sent to our designated agent:
            </p>
            <div className="bg-gray-800 rounded-lg p-6 text-gray-300">
              <p className="font-semibold">Lyricless DMCA Agent</p>
              <p>Email: dmca@lyricless.app</p>
              <p>Subject Line: DMCA Takedown Notice</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Counter-Notification</h2>
            <p className="text-gray-300 mb-4">
              If you believe your content was wrongly identified as infringing, you may submit 
              a counter-notification containing:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Your physical or electronic signature</li>
              <li>Identification of the material and its location before removal</li>
              <li>A statement under penalty of perjury that you believe the material was removed by mistake</li>
              <li>Your name, address, telephone number, and email address</li>
              <li>A statement consenting to jurisdiction in your federal judicial district</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Repeat Infringers</h2>
            <p className="text-gray-300">
              In accordance with the DMCA and other applicable laws, we will terminate access to 
              our service for users who are repeat infringers, at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Good Faith Actions</h2>
            <p className="text-gray-300">
              We will respond to clear notices of alleged infringement and take appropriate actions 
              under the DMCA and applicable laws. However, we are not obligated to adjudicate 
              copyright disputes between third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. No Legal Advice</h2>
            <p className="text-gray-300">
              This DMCA policy is provided for informational purposes only and does not constitute 
              legal advice. We recommend consulting with legal counsel for specific questions about 
              copyright law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Modifications</h2>
            <p className="text-gray-300">
              We reserve the right to modify this DMCA policy at any time. Changes will be posted 
              on this page with an updated revision date.
            </p>
          </section>

          <section>
            <p className="text-gray-400 text-sm mt-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}