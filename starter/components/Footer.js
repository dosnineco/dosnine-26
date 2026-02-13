export default function Footer() {
  return (
    <footer className="bg-gray-50 text-gray-800 py-8 mt-12 border-t border-gray-200">
      
      
      <div className="container mx-auto px-4">
        {/* Footer Links */}

       
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
                <a href="https://www.expensegoose.com" rel="dofollow" className="text-gray-600 hover:text-blue-600 transition">
                  Expensegoose.com
                </a>
              </li>
            </ul>
          </div>

          {/* For Landlords */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">For Property Owners</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/landlord/dashboard" className="text-gray-600 hover:text-blue-600 transition">
                  Post Property
                </a>
              </li>
              <li>
                <a href="/pro" className="text-gray-600 hover:text-blue-600 transition">
                  Premium Plans
                </a>
              </li>
              <li>
                <a href="/market" className="text-gray-600 hover:text-blue-600 transition">
                  Market Analytics
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
                <a href="mailto:dosnineco@gmail.com" className="hover:text-blue-600 transition">
                  dosnineco@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:+18763369045" className="hover:text-blue-600 transition">
                  +1 (876) 336-9045
                </a>
              </li>
              <li>Kingston, Jamaica</li>
            </ul>
          </div>
        </div>

      
        <div className="bg-red-50 border-l-4 border-red-600 p-4 mt-4 mb-4">
          <p className="text-gray-700 text-xs leading-relaxed">
            <strong>Disclaimer:</strong> Dosnine Ltd (dosnine.com) is an independent property listing and discovery platform. 
            Dosnine Ltd does not act as a real estate agent, broker, intermediary, negotiator, or representative for buyers, sellers, landlords, tenants, or agents. By using this platform, users acknowledge that Dosnine Ltd's role is limited to providing visibility and facilitating direct connections only.
          </p>
        </div> 
      </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-300 pt-4 text-center text-sm">
          <p className="text-gray-600">
            &copy; {new Date().getFullYear()} Dosnine Ltd. All rights reserved.
          </p>
        </div>
      
    </footer>
  );
}
