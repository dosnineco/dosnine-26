export default function Footer() {
  return (
    <footer className="bg-gray-50 text-gray-800 py-8 mt-12 border-t border-gray-200">
      
      
      <div className="container mx-auto px-4">
        {/* Footer Links */}

          <div className="bg-red-50 border-l-4 border-red-600 p-4 mt-4 mb-4">
          <p className="text-gray-700 mb-2">
            <strong>Important:</strong> Dosnine.com does not act as an agent. We only display user-submitted listings and verify authenticity where possible.
          </p>
        
        </div> 
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          {/* Company */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/about" className="text-gray-600 hover:text-blue-600 transition">
                  About Us
                </a>
              </li>
              <li>
                <a href="/contact" className="text-gray-600 hover:text-blue-600 transition">
                  Contact
                </a>
              </li>
              <li>
                <a href="/blog" className="text-gray-600 hover:text-blue-600 transition">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* For Landlords */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">For Landlords</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/landlord/dashboard" className="text-gray-600 hover:text-blue-600 transition">
                  Post Property
                </a>
              </li>
              <li>
                <a href="/landlord/boost-property" className="text-gray-600 hover:text-blue-600 transition">
                  Boost Listing
                </a>
              </li>
              <li>
                <a href="/pro" className="text-gray-600 hover:text-blue-600 transition">
                  Premium Plans
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/privacy-policy" className="text-gray-600 hover:text-blue-600 transition">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms-of-service" className="text-gray-600 hover:text-blue-600 transition">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/refund-policy" className="text-gray-600 hover:text-blue-600 transition">
                  Refund Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a href="mailto:info@dosnine.com" className="hover:text-blue-600 transition">
                  info@dosnine.com
                </a>
              </li>
              <li>
                <a href="tel:+18765551234" className="hover:text-blue-600 transition">
                  +1 (876) 555-1234
                </a>
              </li>
              <li>Kingston, Jamaica</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-300 pt-4 text-center text-sm">
          <p className="text-gray-600">
            &copy; {new Date().getFullYear()} Dosnine Properties. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
