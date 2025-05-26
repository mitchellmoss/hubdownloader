import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - Lyricless',
  description: 'Terms of service and conditions for using Lyricless video downloader',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-gray-300">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-300">
              By accessing or using Lyricless ("the Service"), you agree to be bound by these 
              Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-gray-300 mb-4">
              Lyricless is a technical tool that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Identifies publicly accessible video URLs from web pages</li>
              <li>Provides technical information about video formats and qualities</li>
              <li>Does not host, store, or distribute any video content</li>
              <li>Does not bypass any access controls or encryption</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Obligations</h2>
            <p className="text-gray-300 mb-4">
              By using the Service, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Use the Service only for lawful purposes</li>
              <li>Respect all applicable copyright and intellectual property laws</li>
              <li>Not use the Service to infringe on the rights of others</li>
              <li>Not attempt to circumvent any security measures or access controls</li>
              <li>Not use the Service for any commercial purposes without permission</li>
              <li>Not abuse, harass, or harm the Service or other users</li>
              <li>Comply with the terms of service of any third-party websites</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Prohibited Uses</h2>
            <p className="text-gray-300 mb-4">
              You may not use the Service to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Download or distribute copyrighted content without permission</li>
              <li>Access content you are not authorized to view</li>
              <li>Violate any laws or regulations</li>
              <li>Transmit malware, viruses, or harmful code</li>
              <li>Overwhelm or attempt to overwhelm our servers</li>
              <li>Scrape or harvest data from the Service</li>
              <li>Resell or commercialize the Service without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
            <p className="text-gray-300">
              The Service does not claim ownership of any content accessed through it. All content 
              remains the property of its respective owners. Users are responsible for ensuring 
              they have the right to access and use any content obtained through the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Disclaimer of Warranties</h2>
            <p className="text-gray-300 mb-4">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL 
              WARRANTIES, EXPRESS OR IMPLIED, INCLUDING:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Warranties of merchantability or fitness for a particular purpose</li>
              <li>Warranties that the Service will be uninterrupted or error-free</li>
              <li>Warranties regarding the accuracy or completeness of content</li>
              <li>Warranties that the Service will meet your requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-gray-300">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, 
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS 
              OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, 
              GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Indemnification</h2>
            <p className="text-gray-300">
              You agree to indemnify, defend, and hold harmless Lyricless and its operators from 
              any claims, damages, losses, liabilities, costs, and expenses arising from your use 
              of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Privacy</h2>
            <p className="text-gray-300">
              Your use of the Service is also governed by our <a href="/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</a>, 
              which describes how we collect, use, and protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
            <p className="text-gray-300">
              We reserve the right to terminate or suspend access to the Service immediately, 
              without prior notice or liability, for any reason, including breach of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Changes to Terms</h2>
            <p className="text-gray-300">
              We may modify these Terms at any time. We will notify users of any material changes 
              by posting the new Terms on this page. Your continued use of the Service after 
              changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
            <p className="text-gray-300">
              These Terms shall be governed by and construed in accordance with the laws of the 
              United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact Information</h2>
            <p className="text-gray-300">
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="text-gray-300 mt-4">
              Email: legal@lyricless.app<br />
              Website: https://lyricless.app
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Severability</h2>
            <p className="text-gray-300">
              If any provision of these Terms is found to be unenforceable or invalid, that 
              provision will be limited or eliminated to the minimum extent necessary so that 
              these Terms will otherwise remain in full force and effect.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}