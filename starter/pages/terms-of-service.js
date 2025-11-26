import Head from 'next/head';

export default function TermsOfService() {
  return (
    <>
      <Head>
        <title>Terms of Service | Dosnine Properties</title>
        <meta name="description" content="Terms of Service for Dosnine Properties. Read our terms and conditions for using our rental property platform." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.dosnine.com/terms-of-service" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-gray-600 mb-8">Last Updated: November 25, 2025</p>

            <div className="prose prose-lg max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
                <p className="text-gray-700 mb-4">
                  Welcome to Dosnine Properties. By accessing or using our website and services, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our services.
                </p>
                <p className="text-gray-700 mb-6">
                  These Terms constitute a legally binding agreement between you and Dosnine Properties ("we," "us," or "our"). We reserve the right to update these Terms at any time, and your continued use constitutes acceptance of such changes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
                <p className="text-gray-700 mb-4">
                  Dosnine Properties provides an online platform that connects property owners (landlords) with potential renters in Jamaica. Our services include:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>Property listing and search functionality</li>
                  <li>Property boost advertising services</li>
                  <li>User account management</li>
                  <li>Communication tools between landlords and renters</li>
                  <li>Analytics and tracking for property listings</li>
                </ul>
                <p className="text-gray-700">
                  Dosnine Properties acts as a platform facilitator only. We are not a party to any rental agreements between landlords and renters.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Account Creation</h3>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>You must be at least 18 years old to create an account</li>
                  <li>You must provide accurate and complete information</li>
                  <li>You are responsible for maintaining account security</li>
                  <li>You must not share your account credentials</li>
                  <li>One person may not maintain multiple accounts</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Account Termination</h3>
                <p className="text-gray-700 mb-4">
                  We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or misuse our platform. You may delete your account at any time through your account settings.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Property Listings</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Landlord Responsibilities</h3>
                <p className="text-gray-700 mb-4">If you list a property, you agree to:</p>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>Provide accurate and truthful information</li>
                  <li>Use real, current photos of the property</li>
                  <li>Update listings when information changes</li>
                  <li>Respond promptly to inquiries</li>
                  <li>Comply with all applicable laws and regulations</li>
                  <li>Own or have authority to list the property</li>
                  <li>Not engage in discriminatory practices</li>
                  <li>Honor quoted prices and availability</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Prohibited Listings</h3>
                <p className="text-gray-700 mb-4">You may not list properties that:</p>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>You do not have legal authority to rent</li>
                  <li>Violate local zoning or rental laws</li>
                  <li>Are unsafe or uninhabitable</li>
                  <li>Are fraudulent or misleading</li>
                  <li>Contain false or stolen photos</li>
                  <li>Are duplicates of existing listings</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Content License</h3>
                <p className="text-gray-700 mb-4">
                  By posting property content, you grant Dosnine Properties a non-exclusive, worldwide, royalty-free license to use, display, and promote your listings on our platform and marketing materials.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Boost Advertising Service</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">5.1 Boost Terms</h3>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>Boost service costs JMD $2,500 for 10 days</li>
                  <li>Maximum of 20 active boosts at any time</li>
                  <li>Featured properties appear in rotating banner</li>
                  <li>Boosts rotate every 10 minutes</li>
                  <li>Boost duration is fixed at 10 days</li>
                  <li>Payment is processed through PayPal</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">5.2 Boost Limitations</h3>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>We do not guarantee specific results or rental success</li>
                  <li>Placement may vary based on available boost slots</li>
                  <li>Boosts expire automatically after 10 days</li>
                  <li>We reserve the right to remove boosts that violate terms</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">5.3 Cancellations</h3>
                <p className="text-gray-700 mb-4">
                  See our <a href="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</a> for information about boost cancellations and refunds.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. User Conduct</h2>
                <p className="text-gray-700 mb-4">You agree NOT to:</p>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>Post false, misleading, or fraudulent content</li>
                  <li>Harass, threaten, or abuse other users</li>
                  <li>Engage in discriminatory practices</li>
                  <li>Attempt to hack or compromise security</li>
                  <li>Scrape or copy content without permission</li>
                  <li>Use bots or automated systems</li>
                  <li>Spam users or post irrelevant content</li>
                  <li>Impersonate others or misrepresent identity</li>
                  <li>Violate intellectual property rights</li>
                  <li>Use the platform for illegal activities</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Payment Terms</h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>All payments are processed through PayPal</li>
                  <li>Prices are displayed in Jamaican Dollars (JMD)</li>
                  <li>Payment must be received before boost activation</li>
                  <li>You are responsible for any payment processing fees</li>
                  <li>Pricing is subject to change with notice</li>
                  <li>We do not store your payment information</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Intellectual Property</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">8.1 Our Property</h3>
                <p className="text-gray-700 mb-4">
                  All content on Dosnine Properties, including text, graphics, logos, code, and design, is owned by us or our licensors and protected by intellectual property laws.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">8.2 User Content</h3>
                <p className="text-gray-700 mb-4">
                  You retain ownership of content you post but grant us a license to use it. You represent that you have all necessary rights to the content you post.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Disclaimers and Limitations</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">9.1 Platform Facilitator Only</h3>
                <p className="text-gray-700 mb-4">
                  Dosnine Properties is a platform that connects landlords and renters. We are NOT:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>A real estate agent or broker</li>
                  <li>A property management company</li>
                  <li>A party to rental agreements</li>
                  <li>Responsible for property condition or quality</li>
                  <li>Liable for disputes between users</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">9.2 No Warranties</h3>
                <p className="text-gray-700 mb-4">
                  Our services are provided "AS IS" without warranties of any kind. We do not guarantee:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>Accuracy or reliability of listings</li>
                  <li>Availability or uninterrupted service</li>
                  <li>That properties meet your requirements</li>
                  <li>Successful rental outcomes</li>
                  <li>Error-free operation</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">9.3 Limitation of Liability</h3>
                <p className="text-gray-700 mb-4">
                  To the maximum extent permitted by law, Dosnine Properties shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services. Our total liability shall not exceed the amount you paid for boost services in the past 12 months.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Indemnification</h2>
                <p className="text-gray-700">
                  You agree to indemnify and hold harmless Dosnine Properties from any claims, damages, losses, or expenses (including legal fees) arising from your use of our services, violation of these Terms, or infringement of any rights of another person or entity.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Dispute Resolution</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">11.1 User Disputes</h3>
                <p className="text-gray-700 mb-4">
                  Disputes between users (landlords and renters) must be resolved directly between the parties. Dosnine Properties is not responsible for mediating or resolving such disputes.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">11.2 Governing Law</h3>
                <p className="text-gray-700 mb-4">
                  These Terms are governed by the laws of Jamaica. Any disputes shall be resolved in the courts of Jamaica.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Privacy</h2>
                <p className="text-gray-700">
                  Your use of our services is also governed by our <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>. Please review it to understand how we collect and use your information.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Modifications to Service</h2>
                <p className="text-gray-700">
                  We reserve the right to modify, suspend, or discontinue any part of our services at any time without notice. We are not liable for any modifications, suspensions, or discontinuations.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Termination</h2>
                <p className="text-gray-700 mb-4">
                  We may terminate or suspend your access immediately, without notice, for:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>Violation of these Terms</li>
                  <li>Fraudulent activity</li>
                  <li>Abusive or harassing behavior</li>
                  <li>Legal requirements</li>
                  <li>Extended inactivity</li>
                </ul>
                <p className="text-gray-700">
                  Upon termination, your right to use our services ceases immediately.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Severability</h2>
                <p className="text-gray-700">
                  If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Entire Agreement</h2>
                <p className="text-gray-700">
                  These Terms, along with our Privacy Policy and Refund Policy, constitute the entire agreement between you and Dosnine Properties regarding our services.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">17. Contact Information</h2>
                <p className="text-gray-700 mb-4">
                  For questions about these Terms of Service, please contact us:
                </p>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-gray-700 mb-2"><strong>Dosnine Properties</strong></p>
                  <p className="text-gray-700 mb-2">Email: <a href="mailto:info@dosnine.com" className="text-blue-600 hover:underline">info@dosnine.com</a></p>
                  <p className="text-gray-700 mb-2">Phone: <a href="tel:+18765551234" className="text-blue-600 hover:underline">+1 (876) 555-1234</a></p>
                  <p className="text-gray-700">Location: Kingston, Jamaica</p>
                </div>
              </section>

              <div className="bg-yellow-50 border-l-4 border-yellow-600 p-6 mt-8">
                <p className="text-gray-700 mb-2">
                  <strong>Important:</strong> By using Dosnine Properties, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                </p>
                <p className="text-gray-700">
                  If you do not agree to these Terms, you must not use our services.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
