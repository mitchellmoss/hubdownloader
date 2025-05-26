import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Lyricless',
  description: 'Privacy policy for Lyricless video downloader service',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-gray-300">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="text-gray-300 mb-4">
              When you use Lyricless, we collect minimal information necessary to provide our service:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>The URLs you submit for video extraction</li>
              <li>Your IP address for rate limiting and security purposes</li>
              <li>Basic browser information (user agent)</li>
              <li>Extraction success/failure metrics for service improvement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-300 mb-4">
              We use the collected information solely for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Processing your video extraction requests</li>
              <li>Preventing abuse through rate limiting</li>
              <li>Improving our service reliability and performance</li>
              <li>Generating anonymous usage statistics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Data Storage and Retention</h2>
            <p className="text-gray-300 mb-4">
              We store minimal data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Extraction records are kept for 30 days for analytics</li>
              <li>Rate limit data expires after 1 hour</li>
              <li>We do not store or host any video content</li>
              <li>We do not create user accounts or profiles</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services</h2>
            <p className="text-gray-300 mb-4">
              We may use the following third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Google Analytics for anonymous usage statistics</li>
              <li>Google AdSense for displaying advertisements</li>
              <li>Cloudflare for security and performance</li>
            </ul>
            <p className="text-gray-300 mt-4">
              These services may collect their own data according to their respective privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Cookies</h2>
            <p className="text-gray-300">
              We use minimal cookies for essential functionality:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300 mt-4">
              <li>Session cookies for rate limiting</li>
              <li>Admin authentication cookies (if applicable)</li>
              <li>Third-party cookies from Google Analytics and AdSense</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
            <p className="text-gray-300">
              We implement reasonable security measures to protect your data, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300 mt-4">
              <li>HTTPS encryption for all communications</li>
              <li>Regular security updates and monitoring</li>
              <li>Limited data retention periods</li>
              <li>No storage of sensitive personal information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
            <p className="text-gray-300">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300 mt-4">
              <li>Use our service anonymously (no account required)</li>
              <li>Block cookies through your browser settings</li>
              <li>Request information about data we have collected</li>
              <li>Request deletion of your data (contact us below)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
            <p className="text-gray-300">
              Our service is not intended for children under 13. We do not knowingly collect 
              personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
            <p className="text-gray-300">
              We may update this privacy policy from time to time. We will notify you of any 
              changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p className="text-gray-300">
              If you have questions about this privacy policy or our data practices, please contact us at:
            </p>
            <p className="text-gray-300 mt-4">
              Email: privacy@lyricless.app<br />
              Website: https://lyricless.app
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}